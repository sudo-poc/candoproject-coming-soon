/* v2 — sleeves */
gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);

const SPRITE = "../assets/icons.svg";
const root = document.documentElement;
const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="${SPRITE}#i-${id}"/></svg>`;

/* ───────── pattern bands ─────────
   <div class="band" data-pattern="coin|checker|stripes|dots" data-colors="a/b,c/d" data-icons="x,y">
   Cells are laid out column-first, 3 rows high, wide enough for ultrawide screens. */
function buildBand(band) {
  const type = band.dataset.pattern;
  const colors = band.dataset.colors.split(",");
  const icons = (band.dataset.icons || "").split(",");
  const rows = 3;
  const cols = type === "stripes" ? 72 : 36;
  // seeded so every visit gets the same, packaging-like "random" layout
  let seed = band.dataset.colors.length * 9301 + icons.length * 49297;
  const rand = (n) => ((seed = (seed * 16807) % 2147483647) % n);
  let html = "";
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (type === "coin") {
        const [bg, fg] = colors[rand(colors.length)].split("/");
        html += `<span class="cell coin" style="--bg:${bg};--fg:${fg}">${icon(icons[rand(icons.length)])}</span>`;
      } else if (type === "checker") {
        html += `<span class="cell cell--square" style="--c:${colors[(r + c) % 2]}"></span>`;
      } else if (type === "stripes") {
        html += `<span class="cell cell--square" style="--c:${colors[c % 2]}"></span>`;
      } else {
        html += `<span class="cell cell--dot" style="--c:${colors[(c + r * 2) % colors.length]}"></span>`;
      }
    }
  }
  band.innerHTML = html;
}
document.querySelectorAll(".band").forEach(buildBand);

const popCells = (band, vars = {}) =>
  gsap.from(band.querySelectorAll(".cell"), {
    scale: 0,
    rotation: () => gsap.utils.random(-120, 120),
    duration: 0.7,
    ease: "back.out(1.8)",
    stagger: { amount: 0.8, grid: "auto", from: "start" },
    ...vars,
  });

/* ───────── shared morphing band (desktop conveyor) ─────────
   One band sits still under the sliding sleeves. Every cell is a square backing (the
   sleeve colour that shows round a circle) holding a shape with two halves (so stripes
   fit), a corner radius, a scale and an icon. Scrolling between two sleeves morphs each
   shape — shrink, round off, grow back — in a wave from the right; colours swap while the
   shape is smallest so they never blend through muddy in-betweens. */
function cellState(band, r, c, rand) {
  const type = band.dataset.pattern;
  const colors = band.dataset.colors.split(",");
  const icons = (band.dataset.icons || "").split(",");
  if (type === "coin") {
    const [bg, fg] = colors[rand(colors.length)].split("/");
    return { l: bg, r: bg, fg, radius: 50, scale: 1, icon: icons[rand(icons.length)] };
  }
  if (type === "checker") { const k = colors[(r + c) % 2]; return { l: k, r: k, fg: k, radius: 0, scale: 1, icon: null }; }
  if (type === "stripes") return { l: colors[0], r: colors[1], fg: colors[0], radius: 0, scale: 1, icon: null };
  const k = colors[(c + r * 2) % colors.length];
  return { l: k, r: k, fg: k, radius: 50, scale: 0.86, icon: null };
}

function buildMorphBand(host, panels) {
  const rows = 3;
  const cell = (innerHeight * 0.4) / rows;
  const cols = Math.ceil(innerWidth / cell) + 1;
  const bands = panels.map((p) => p.querySelector(".band"));
  // per sleeve: band background (shows behind circles) + one state per cell
  const states = bands.map((band) => {
    let seed = band.dataset.colors.length * 9301 + (band.dataset.icons || "").length * 49297;
    const rand = (n) => ((seed = (seed * 16807) % 2147483647) % n);
    const cells = [];
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) cells.push(cellState(band, r, c, rand));
    return cells;
  });
  const backs = bands.map((band, i) => (band.classList.contains("band--sun") ? "#ffdd00" : panels[i].dataset.bg));

  let html = "";
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    html += '<span class="mcell cell"><span class="mshape"><i></i><i></i><svg class="icon" aria-hidden="true"><use/></svg></span></span>';
  }
  host.innerHTML = html;
  const els = [...host.children].map((el, k) => {
    const shape = el.firstChild;
    return {
      el, shape, l: shape.children[0], r: shape.children[1], svg: shape.children[2], use: shape.querySelector("use"),
      col: Math.floor(k / rows), row: k % rows, href: "",
    };
  });

  const lerp = gsap.utils.interpolate;
  const clamp01 = gsap.utils.clamp(0, 1);
  const ease = gsap.parseEase("sine.inOut");
  const WAVE = 0.7; // how much of the slide the wave takes to cross the band
  let last = -1;

  // p runs 0 → panels.length - 1 across the conveyor
  return function apply(p) {
    if (p === last) return;
    last = p;
    const i = Math.min(Math.floor(p), panels.length - 2);
    const f = p - i;
    for (let k = 0; k < els.length; k++) {
      const e = els[k], A = states[i][k], B = states[i + 1][k];
      // new sleeves come in from the right, so the right-hand cells change first
      const delay = (WAVE * (cols - 1 - e.col)) / (cols - 1) + e.row * 0.04;
      const t = ease(clamp01((f * (1 + WAVE + 0.08) - delay)));
      const bump = Math.sin(Math.PI * t);
      const tc = clamp01((t - 0.48) / 0.04); // near-instant colour swap at the midpoint, while the shape is smallest
      e.el.style.backgroundColor = lerp(backs[i], backs[i + 1], tc);
      e.l.style.backgroundColor = lerp(A.l, B.l, tc);
      e.r.style.backgroundColor = lerp(A.r, B.r, tc);
      e.shape.style.borderRadius = lerp(A.radius, B.radius, t) + "%";
      e.shape.style.scale = lerp(A.scale, B.scale, t) * (1 - 0.34 * bump);
      // icon: shrink the old one away, then grow the new one in
      const name = t < 0.5 ? A.icon : B.icon;
      const href = name ? `${SPRITE}#i-${name}` : "";
      if (href !== e.href) { e.href = href; e.use.setAttribute("href", href); }
      e.svg.style.color = t < 0.5 ? A.fg : B.fg;
      e.svg.style.scale = name ? (t < 0.5 ? 1 - 2 * t : 2 * t - 1) : 0;
      e.svg.style.rotate = 180 * t + "deg";
    }
  };
}

/* ───────── signup ───────── */
async function submitSignup(form, email) {
  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    // No backend yet: point data-endpoint at Klaviyo (client subscriptions API),
    // a Formspree form URL, or a Shopify customer form proxy when the store is live.
    console.info("[Can Do Project] signup (no endpoint configured):", email);
    await new Promise((r) => setTimeout(r, 450));
    return;
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new FormData(form),
  });
  if (!res.ok) throw new Error(`Signup failed: ${res.status}`);
}

function confetti(fromEl) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = fromEl.getBoundingClientRect();
  const shapes = ["quatrefoil", "sparkle", "heart", "flower", "drop", "burst"];
  const pairs = [["#ed3e74", "#f7abad"], ["#35a2d2", "#ffdd00"], ["#2a897a", "#f8c1d9"], ["#f16530", "#f1eacf"], ["#5d2c86", "#f0a2c7"]];
  for (let i = 0; i < 16; i++) {
    const [bg, fg] = pairs[i % pairs.length];
    const el = document.createElement("span");
    el.className = "coin confetti";
    el.style.cssText = `--bg:${bg};--fg:${fg};left:${box.left + box.width / 2 - 13}px;top:${box.top + box.height / 2 - 13}px`;
    el.innerHTML = icon(shapes[i % shapes.length]);
    document.body.appendChild(el);
    const angle = (i / 16) * Math.PI * 2;
    const dist = gsap.utils.random(90, 220);
    gsap.timeline({ onComplete: () => el.remove() })
      .fromTo(el, { scale: 0 }, { scale: gsap.utils.random(0.8, 1.5), duration: 0.35, ease: "back.out(3)" })
      .to(el, {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 60,
        rotation: gsap.utils.random(-260, 260),
        duration: 1.1,
        ease: "power3.out",
      }, 0)
      .to(el, { y: "+=160", opacity: 0, duration: 0.7, ease: "power2.in" }, 0.75);
  }
}

document.querySelectorAll(".signup").forEach((form) => {
  const input = form.querySelector("input");
  const msg = form.querySelector(".signup__msg");
  const btn = form.querySelector("button");
  input.addEventListener("input", () => {
    msg.textContent = "";
    msg.classList.remove("is-error");
    input.removeAttribute("aria-invalid");
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      msg.textContent = email ? "hmm, that email looks a little off." : "pop your email in first.";
      msg.classList.add("is-error");
      input.setAttribute("aria-invalid", "true");
      input.focus();
      gsap.fromTo(form.querySelector(".signup__row"), { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1.2, 0.3)" });
      return;
    }
    btn.disabled = true;
    try {
      await submitSignup(form, email);
      confetti(btn);
      form.classList.add("is-done");
      msg.textContent = "you're on the list! we'll write when the box opens.";
    } catch (err) {
      console.error(err);
      msg.textContent = "something went wrong — try again in a sec?";
      msg.classList.add("is-error");
    } finally {
      btn.disabled = false;
    }
  });
});

/* ───────── community frame: whole squares only ───────── */
const frame = document.querySelector(".community__frame");
const card = frame.querySelector(".community__card");
new ResizeObserver(() => {
  const w = frame.clientWidth;
  // target square size — keep in step with --sq in style.css
  const sq = w / Math.round(w / gsap.utils.clamp(18, 44, innerWidth * 0.03));
  frame.style.setProperty("--sq", `${sq}px`);
  card.style.minHeight = "";
  // same value as before → no size change → observer doesn't loop
  card.style.minHeight = `${Math.ceil((card.offsetHeight - 0.5) / sq) * sq}px`;
}).observe(card);

/* ───────── motion ───────── */
const mm = gsap.matchMedia();
const intro = document.querySelector(".intro");
const sleeve = document.querySelector(".sleeve");
const shelf = document.querySelector(".shelf");
const track = shelf.querySelector(".shelf__track");
const panels = gsap.utils.toArray(".panel");
const dotsWrap = shelf.querySelector(".shelf__dots");
const countEl = shelf.querySelector(".shelf__count b");
dotsWrap.innerHTML = panels.map(() => "<i></i>").join("");
const dots = [...dotsWrap.children];

document.fonts.ready.then(() => {
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    root.classList.add("motion");

    /* intro: sleeve pops on → wiggles → slides off to reveal the label */
    const label = intro.querySelector(".label-wrap");
    const title = SplitText.create(".intro__title", { type: "words,chars" });
    const reveal = gsap.timeline({ paused: true })
      .from(label, { y: 70, rotation: -2, duration: 0.9, ease: "power3.out" })
      .from(title.chars, { yPercent: 70, rotation: () => gsap.utils.random(-25, 25), opacity: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.022 }, 0.1)
      .from(".label__lede, .label .signup, .label .bullets li", { y: 24, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" }, 0.35)
      .from(".snap", { x: 120, y: 60, rotation: "+=18", opacity: 0, duration: 0.9, stagger: 0.12, ease: "back.out(1.3)" }, 0.15)
      .from(".sticker", { scale: 0, rotation: -180, duration: 0.8, ease: "back.out(2.2)" }, 0.7);

    let opened = false;
    const openSleeve = () => {
      if (opened) return;
      opened = true;
      gsap.killTweensOf(sleeve);
      gsap.to(sleeve, {
        x: sleeve.offsetWidth * 1.08,
        rotation: 3,
        duration: 1,
        ease: "power3.inOut",
        onComplete: () => sleeve.classList.add("is-gone"),
      });
      reveal.delay(0.35).play();
    };

    const sleeveTitle = SplitText.create(".sleeve__title", { type: "words,chars" });
    const sleeveIn = gsap.timeline({ delay: 0.15 })
      .from(".sleeve__tag", { y: -40, opacity: 0, duration: 0.6, ease: "back.out(2)" })
      .from(sleeveTitle.chars, { yPercent: 120, opacity: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.03 }, 0.1)
      .add(popCells(sleeve.querySelector(".band"), { duration: 0.55, stagger: { amount: 0.6, grid: "auto", from: "start" } }), 0.2)
      .from(".sleeve__hint, .sleeve__pull", { opacity: 0, duration: 0.4 }, 0.9)
      .to(sleeve, { x: 26, duration: 0.25, ease: "power2.out", repeat: 3, yoyo: true }, 1.4);

    const pullNudge = gsap.to(".sleeve__pull", { x: 10, duration: 0.6, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 1.2 });
    const auto = gsap.delayedCall(3.4, openSleeve);

    const [drag] = Draggable.create(sleeve, {
      type: "x",
      bounds: { minX: 0, maxX: innerWidth * 1.2 },
      allowNativeTouchScrolling: true,
      onPress() { auto.kill(); sleeveIn.progress(1); },
      onDragEnd() {
        if (this.x > sleeve.offsetWidth * 0.22) openSleeve();
        else gsap.to(sleeve, { x: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
      },
    });
    const pullBtn = sleeve.querySelector(".sleeve__pull");
    const onPull = (e) => { e.stopPropagation(); openSleeve(); };
    pullBtn.addEventListener("click", onPull);
    const onScroll = () => openSleeve();
    addEventListener("scroll", onScroll, { once: true, passive: true });
    const onFocus = (e) => { if (label.contains(e.target)) openSleeve(); };
    document.addEventListener("focusin", onFocus);

    /* brand line: words ink in as you read, badge spins faster with scroll */
    const statement = SplitText.create(".brand__statement", { type: "words" });
    gsap.fromTo(statement.words, { opacity: 0.14 }, {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: ".brand__statement", start: "top 80%", end: "bottom 45%", scrub: true },
    });
    gsap.from(".brand__aside", { y: 30, opacity: 0, duration: 0.8, scrollTrigger: { trigger: ".brand__aside", start: "top 90%" } });
    const badge = gsap.to(".brand__badge svg", { rotation: 360, duration: 16, ease: "none", repeat: -1 });
    gsap.from(".brand__badge", {
      scale: 0.4, rotation: -90, duration: 1.1, ease: "back.out(1.6)",
      scrollTrigger: { trigger: ".brand", start: "top 70%" },
    });

    const marquee = document.querySelector(".marquee__inner");
    const marqueeHTML = marquee.innerHTML;
    marquee.innerHTML += marqueeHTML;
    const loop = gsap.to(marquee, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      trigger: ".brand",
      start: "top bottom",
      endTrigger: ".marquee",
      end: "bottom top",
      onUpdate(self) {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 5);
        gsap.timeline({ overwrite: true })
          .to([loop, badge], { timeScale: boost * self.direction, duration: 0.15 })
          .to([loop, badge], { timeScale: self.direction, duration: 1.2, ease: "power2.out" });
      },
    });

    gsap.from(".community__card > *", {
      y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: ".community", start: "top 65%" },
    });

    return () => {
      root.classList.remove("motion");
      pullBtn.removeEventListener("click", onPull);
      removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocus);
      drag.kill();
      auto.kill();
      pullNudge.kill();
      title.revert();
      sleeveTitle.revert();
      statement.revert();
      marquee.innerHTML = marqueeHTML;
      sleeve.classList.remove("is-gone");
    };
  });

  /* shelf — desktop: pinned horizontal conveyor of sleeves */
  mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
    shelf.classList.add("is-h");
    let active = -1;
    // each panel paints its own sleeve colour (see .shelf.is-h .panel), so only the HUD updates here
    const setActive = (i) => {
      if (i === active) return;
      active = i;
      countEl.textContent = String(i + 1).padStart(2, "0");
      dots.forEach((d, j) => d.classList.toggle("on", j === i));
    };
    setActive(0);

    // one band under all the sleeves that morphs pattern-to-pattern (per-panel bands are hidden in CSS)
    const morph = document.createElement("div");
    morph.className = "shelf__band";
    morph.setAttribute("aria-hidden", "true");
    shelf.appendChild(morph);
    const sizeKey = () => `${innerWidth}x${innerHeight}`;
    let builtFor = sizeKey();
    let applyMorph = buildMorphBand(morph, panels);

    const distance = () => track.scrollWidth - innerWidth;
    const conveyor = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      // the tween's own (scrub-smoothed) progress, so the morph moves exactly with the sleeves
      onUpdate() { applyMorph(this.progress() * (panels.length - 1)); },
      scrollTrigger: {
        trigger: shelf,
        pin: true,
        scrub: 0.8,
        start: "top top",
        end: () => "+=" + distance(),
        invalidateOnRefresh: true,
        snap: { snapTo: 1 / (panels.length - 1), inertia: false, duration: { min: 0.2, max: 0.6 }, delay: 0.12, ease: "power2.inOut" },
        onUpdate: (self) => setActive(Math.round(self.progress * (panels.length - 1))),
      },
    });

    panels.forEach((panel, i) => {
      // first panel plays as the shelf scrolls into view; the rest build in with the scroll as they
      // slide in from the right edge — a time-based play here left an empty screen, then a sudden pop
      const st = i === 0
        ? { trigger: shelf, start: "top 55%", toggleActions: "play none none reverse" }
        : { trigger: panel, containerAnimation: conveyor, start: "left right", end: "left 40%", scrub: true };
      gsap.timeline({ scrollTrigger: st })
        .add(i === 0 ? popCells(morph) : gsap.timeline())
        .from(panel.querySelector(".panel__label-wrap"), { y: 90, rotation: -4, opacity: 0, duration: 0.8, ease: "back.out(1.4)" }, 0.05)
        .from(panel.querySelector(".panel__photo"), { scale: 0.6, rotation: 18, opacity: 0, duration: 0.9, ease: "back.out(1.7)" }, 0.2);

      gsap.fromTo(panel.querySelector(".panel__photo-wrap"), { xPercent: 14 }, {
        xPercent: -14,
        ease: "none",
        scrollTrigger: { trigger: panel, containerAnimation: conveyor, start: "left right", end: "right left", scrub: true },
      });
    });

    applyMorph(0);
    // rebuild only when the viewport really changed (refresh also fires once on load)
    const rebuild = () => {
      if (sizeKey() === builtFor) return;
      builtFor = sizeKey();
      applyMorph = buildMorphBand(morph, panels);
      applyMorph(conveyor.progress() * (panels.length - 1));
    };
    ScrollTrigger.addEventListener("refresh", rebuild);

    return () => {
      ScrollTrigger.removeEventListener("refresh", rebuild);
      morph.remove();
      shelf.classList.remove("is-h");
    };
  });

  /* shelf — mobile: stacked sleeves with reveals */
  mm.add("(max-width: 899px) and (prefers-reduced-motion: no-preference)", () => {
    panels.forEach((panel) => {
      gsap.from(panel.querySelector(".panel__label-wrap"), {
        y: 70, rotation: -3, opacity: 0, duration: 0.8, ease: "back.out(1.4)",
        scrollTrigger: { trigger: panel, start: "top 75%" },
      });
      gsap.from(panel.querySelector(".panel__photo"), {
        scale: 0.7, rotation: 14, opacity: 0, duration: 0.8, ease: "back.out(1.6)",
        scrollTrigger: { trigger: panel.querySelector(".panel__photo-wrap"), start: "top 85%" },
      });
      const band = panel.querySelector(".band");
      popCells(band, { scrollTrigger: { trigger: band, start: "top 95%" } });
    });
  });
});
