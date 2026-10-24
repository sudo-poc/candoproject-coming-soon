/* v1 — playground */
gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);

const SPRITE = "assets/icons.svg";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const SHAPES = ["quatrefoil", "sparkle", "pillow", "burst", "heart", "dot-ring", "drop", "hourglass", "rainbow", "flower", "clover", "split", "bowtie", "peanut"];
// toolkit "recommended pairs"
const PAIRS = [
  ["--rose", "--blush"], ["--sky", "--sun"], ["--teal", "#f48fa7"], ["--tangerine", "--beige"],
  ["--cobalt", "--bubblegum"], ["--plum", "--cherry"], ["--leaf", "--blush"], ["--olive", "--beige"],
  ["--cherry", "--blush"], ["--slate", "--candy"],
];
const cssVar = (v) => (v.startsWith("--") ? `var(${v})` : v);
const coinHTML = (shape, [bg, fg]) =>
  `<span class="coin" style="--bg:${cssVar(bg)};--fg:${cssVar(fg)}"><svg class="icon"><use href="${SPRITE}#i-${shape}"/></svg></span>`;

/* ---------- marquee ribbons (built from data so both copies stay identical) ---------- */
const PRODUCTS = ["playing cards", "the anything journal", "horn OK please", "lasting impressions", "serving good vibes", "the everything tote", "no rush darling"];
$$(".ribbon__track").forEach((track, t) => {
  const items = (t ? PRODUCTS : [...PRODUCTS].reverse())
    .map((p, i) => `<span class="ribbon__item">${p}${coinHTML(SHAPES[(i + t * 3) % SHAPES.length], PAIRS[(i + t * 2) % PAIRS.length])}</span>`)
    .join("");
  // two sets per track so a -50% loop is seamless; repeat items inside a set to cover wide screens
  const set = `<div class="ribbon__set">${items}${items}</div>`;
  track.innerHTML = set + set;
});

/* ---------- header: frosted bar once off the top (styled on small screens only) ---------- */
(() => {
  const header = $(".site-header");
  const update = () => header.classList.toggle("is-scrolled", scrollY > 40);
  addEventListener("scroll", update, { passive: true });
  update();
})();

/* ---------- signup form ---------- */
(() => {
  const form = $(".signup__form");
  const input = $("#email", form);
  const msg = $(".signup__msg");
  const btn = $("button", form);
  const card = $(".signup__card");

  input.addEventListener("input", () => { msg.textContent = ""; input.removeAttribute("aria-invalid"); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email || !input.checkValidity()) {
      msg.textContent = email ? "Hmm, that email looks a little wonky." : "We'll need your email for this bit.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1.2, 0.3)" });
      return;
    }

    const endpoint = form.dataset.endpoint;
    btn.setAttribute("aria-busy", "true");
    try {
      if (endpoint) {
        const res = await fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(res.status);
      } else {
        console.info("[can do project] no form endpoint configured — captured locally:", email);
        await new Promise((r) => setTimeout(r, 450));
      }
      showDone();
    } catch (err) {
      msg.textContent = "Something went sideways. Mind trying again?";
      console.error(err);
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });

  function showDone() {
    const content = $(".signup__content");
    const done = $(".signup__done");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const swap = () => {
      content.hidden = true;
      done.hidden = false;
      $("h2", done).focus();
    };
    if (reduce) return swap();

    gsap.timeline()
      .to(content, { autoAlpha: 0, y: -20, duration: 0.3, ease: "power2.in", onComplete: swap })
      .from(done.children, { y: 30, opacity: 0, stagger: 0.08, duration: 0.6, ease: "back.out(2)" })
      .from($(".signup__done-coin"), { rotation: -180, scale: 0, duration: 0.9, ease: "elastic.out(1, 0.5)" }, "<");

    // coin confetti
    const burst = $(".signup__burst");
    burst.innerHTML = Array.from({ length: 16 }, (_, i) => coinHTML(SHAPES[i % SHAPES.length], PAIRS[i % PAIRS.length])).join("");
    $$(".coin", burst).forEach((c) => {
      const a = Math.random() * Math.PI * 2;
      const d = gsap.utils.random(140, Math.min(card.offsetWidth * 0.75, 380));
      gsap.timeline()
        .fromTo(c, { scale: 0, x: 0, y: 0 }, { scale: gsap.utils.random(0.6, 1.3), x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, rotation: gsap.utils.random(-360, 360), duration: 1, ease: "power3.out" })
        .to(c, { y: "+=120", autoAlpha: 0, duration: 0.8, ease: "power1.in" }, "-=0.2");
    });
  }
})();

/* ---------- motion ---------- */
document.fonts.ready.then(() => {
  const mm = gsap.matchMedia();

  // always: draggable coins (fun, and user-initiated so fine under reduced motion)
  initCoins();

  mm.add(
    {
      motion: "(prefers-reduced-motion: no-preference)",
      desktop: "(min-width: 900px) and (min-height: 620px)",
    },
    (ctx) => {
      const { motion, desktop } = ctx.conditions;
      if (!motion) return;

      // Create ScrollTriggers in page order: the deck's pin adds scroll height, so anything
      // below it (manifesto, signup, footer) must be measured after it or it fires ~2000px early.
      const cleanups = [heroIntro(), badge(), ribbons(), desktop ? deck() : mobileCards(), manifesto(desktop), footerMark()];
      ScrollTrigger.refresh();
      return () => cleanups.forEach((fn) => fn && fn());
    }
  );
});

function heroIntro() {
  const split = SplitText.create(".hero__title", { type: "chars", charsClass: "char" });
  const tl = gsap.timeline({ defaults: { ease: "back.out(2.2)" } });

  tl.from(split.chars, { yPercent: 120, rotation: () => gsap.utils.random(-25, 25), autoAlpha: 0, duration: 0.9, stagger: 0.045 })
    .from([".hero__lede", ".hero .btn"], { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" }, "-=0.55")
    .from(".drag", { scale: 0, rotation: -120, duration: 1, stagger: { each: 0.06, from: "random" }, ease: "elastic.out(1, 0.55)" }, 0.25)
    .from(".site-header > *", { y: -30, autoAlpha: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }, 0.2)
    .from(".badge", { scale: 0, rotation: -90, duration: 0.9, ease: "back.out(1.8)" }, "-=0.6")
    .from(".hero__hint", { autoAlpha: 0, y: 10, duration: 0.5 }, "-=0.3");

  // letters hop when you brush past them
  split.chars.forEach((ch) => {
    ch.addEventListener("pointerenter", () => {
      if (gsap.isTweening(ch)) return;
      gsap.timeline()
        .to(ch, { y: "-0.14em", rotation: gsap.utils.random(-12, 12), duration: 0.22, ease: "power2.out" })
        .to(ch, { y: 0, rotation: 0, duration: 0.7, ease: "bounce.out" });
    });
  });

  // gentle parallax as the hero leaves
  gsap.to(".hero__inner", {
    yPercent: 18, autoAlpha: 0.2, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  return () => split.revert();
}

function initCoins() {
  const hero = $(".hero");
  const hint = $(".hero__hint");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  $$(".drag").forEach((el, i) => {
    const coin = $(".coin", el);
    const use = $("use", coin);
    let shape = SHAPES.indexOf(use.getAttribute("href").split("#i-")[1]);

    // idle float lives on the inner coin so it never fights Draggable's transform
    if (!reduce) {
      gsap.to(coin, {
        y: gsap.utils.random(-10, 10), rotation: gsap.utils.random(-8, 8),
        duration: gsap.utils.random(2.2, 3.6), repeat: -1, yoyo: true, ease: "sine.inOut", delay: i * 0.15,
      });
    }

    const tilt = gsap.quickTo(el, "rotation", { duration: 0.5, ease: "power3.out" });

    Draggable.create(el, {
      type: "x,y",
      bounds: hero,
      inertia: true,
      edgeResistance: 0.7,
      zIndexBoost: true,
      onPress() { el.classList.add("is-dragging"); gsap.to(el, { scale: 1.1, duration: 0.3, ease: "back.out(3)" }); },
      onRelease() { el.classList.remove("is-dragging"); gsap.to(el, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" }); },
      onDrag() { tilt(gsap.utils.clamp(-35, 35, this.deltaX * 2.5)); },
      onThrowUpdate() { tilt(gsap.utils.clamp(-35, 35, this.deltaX * 2.5)); },
      onThrowComplete() { tilt(0); },
      onDragStart() { if (hint) gsap.to(hint, { autoAlpha: 0, duration: 0.3 }); },
      // a tap (no drag) swaps the shape — like flipping a coin
      onClick() {
        shape = (shape + 1) % SHAPES.length;
        gsap.timeline()
          .to(coin, { scaleX: 0, duration: 0.14, ease: "power2.in", onComplete: () => use.setAttribute("href", `${SPRITE}#i-${SHAPES[shape]}`) })
          .to(coin, { scaleX: 1, duration: 0.5, ease: "elastic.out(1.1, 0.45)" });
      },
    });
  });
}

function badge() {
  const spin = gsap.to(".badge__spin", { rotation: 360, duration: 14, repeat: -1, ease: "none", transformOrigin: "50% 50%" });
  // scroll velocity spins it faster, then it eases back
  ScrollTrigger.create({
    onUpdate(self) {
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 250, 8);
      gsap.to(spin, { timeScale: boost * self.direction, duration: 0.15, overwrite: true });
      gsap.to(spin, { timeScale: self.direction, duration: 1.2, delay: 0.15, ease: "power2.out" });
    },
  });
  gsap.to(".badge__arrow", { y: 6, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut" });

  const el = $(".badge");
  const grow = () => gsap.to(el, { scale: 1.1, duration: 0.4, ease: "back.out(3)" });
  const shrink = () => gsap.to(el, { scale: 1, duration: 0.4, ease: "power3.out" });
  el.addEventListener("pointerenter", grow);
  el.addEventListener("pointerleave", shrink);
  return () => { el.removeEventListener("pointerenter", grow); el.removeEventListener("pointerleave", shrink); };
}

function ribbons() {
  $$(".ribbon__track").forEach((track) => {
    const dir = +track.dataset.dir;
    const loop = gsap.fromTo(track, { xPercent: dir > 0 ? 0 : -50 }, { xPercent: dir > 0 ? -50 : 0, duration: 38, repeat: -1, ease: "none" });
    ScrollTrigger.create({
      trigger: ".ribbons", start: "top bottom", end: "bottom top",
      onUpdate(self) {
        const v = 1 + Math.min(Math.abs(self.getVelocity()) / 200, 10);
        gsap.to(loop, { timeScale: v * self.direction, duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: self.direction, duration: 1, delay: 0.2 });
      },
    });
  });
}

function deck() {
  const section = $(".products");
  const track = $(".products__track");
  const cards = $$(".easel", track);
  section.classList.add("is-deck");
  ScrollTrigger.refresh();

  // distance from each card's laid-out spot to a stacked deck in the middle of the screen
  const toDeckX = (i) => {
    const c = cards[i];
    return window.innerWidth / 2 - (c.offsetLeft + c.offsetWidth / 2);
  };
  const travel = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const rot = cards.map((_, i) => (i - (cards.length - 1) / 2) * 3.5 + gsap.utils.random(-3, 3));

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => `+=${window.innerHeight * 1.1 + travel()}`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: (self) => gsap.set(".products__progress span", { scaleX: self.progress }),
    },
  });

  tl.from(cards, {
    x: (i) => toDeckX(i),
    y: (i) => (cards.length - i) * -3,
    rotation: (i) => rot[i],
    duration: 1,
    ease: "power3.inOut",
    stagger: { each: 0.09, from: "end" },
  })
    .to(track, { x: () => -travel(), duration: () => Math.max(0.6, travel() / window.innerHeight), ease: "none" }, ">-0.1")
    // each card does a tiny wobble as it passes centre
    .to(cards, { rotation: (i) => (i % 2 ? 1.5 : -1.5), duration: 0.3, stagger: 0.12, ease: "sine.inOut" }, "<");

  // hover tilt (desktop only)
  const cleanups = cards.map((card) => {
    const enter = () => gsap.to(card, { y: -10, scale: 1.02, duration: 0.4, ease: "back.out(2)", overwrite: "auto" });
    const leave = () => gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: "power3.out", overwrite: "auto" });
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    return () => { card.removeEventListener("pointerenter", enter); card.removeEventListener("pointerleave", leave); };
  });

  return () => {
    cleanups.forEach((fn) => fn());
    section.classList.remove("is-deck");
  };
}

function mobileCards() {
  gsap.from(".easel", {
    y: 80, rotation: (i) => (i % 2 ? 6 : -6), autoAlpha: 0,
    duration: 0.9, stagger: 0.1, ease: "back.out(1.6)",
    scrollTrigger: { trigger: ".products__viewport", start: "top 85%" },
  });
}

// Word-by-word read-through, scrubbed to scroll. Words go faint → full in reading order with
// a few overlapping like a reading wave; coins pop exactly when the reading reaches them.
function manifesto(desktop) {
  const section = $(".manifesto");
  const split = SplitText.create(".manifesto__text", { type: "words", wordsClass: "word" });
  const bits = [...split.words, ...$$(".m-coin")];
  // document order, so coins sit in the sequence between the words around them
  bits.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  const STEP = 0.35; // gap between word starts, in word-durations (~3 words in motion at once)
  // pin while reading on desktop, as long as the whole section fits on screen
  const pin = desktop && section.offsetHeight <= window.innerHeight;
  const tl = gsap.timeline({
    defaults: { duration: 1 },
    scrollTrigger: pin
      ? { trigger: section, start: "center center", end: () => `+=${window.innerHeight * 1.4}`, pin: true, scrub: 0.6 }
      : { trigger: ".manifesto__text", start: "top 85%", end: "bottom 50%", scrub: 0.6 },
  });

  bits.forEach((el, i) => {
    if (el.classList.contains("m-coin")) {
      tl.fromTo(el, { scale: 0, rotation: -180 }, { scale: 1, rotation: 0, ease: "back.out(2.5)" }, i * STEP);
    } else {
      tl.fromTo(el, { opacity: 0.14, y: "0.18em" }, { opacity: 1, y: 0, ease: "power2.out" }, i * STEP);
    }
  });
  tl.fromTo(".manifesto__sub", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: "power3.out" }, "-=0.4");

  return () => split.revert();
}

function footerMark() {
  gsap.from(".site-footer__mark path", {
    yPercent: 100, rotation: () => gsap.utils.random(-20, 20), autoAlpha: 0,
    stagger: 0.035, duration: 0.8, ease: "back.out(2)",
    scrollTrigger: { trigger: ".site-footer__mark", start: "top 95%" },
  });
  gsap.from(".signup__card", {
    y: 80, rotation: -3, autoAlpha: 0, duration: 1, ease: "back.out(1.4)",
    scrollTrigger: { trigger: ".signup", start: "top 70%" },
  });
}
