/* v3 — ripple. Coin grid that cycles through waves on its own; clicks send a wave out. Signup. */
gsap.registerPlugin(SplitText);

const SPRITE = "../assets/icons.svg#i-";

// Toolkit "recommended pairs": saturated circle, lighter shape
const PAIRS = [
  ["--rose", "--blush"],
  ["--sky", "--sun"],
  ["--teal", "--candy"],
  ["--tangerine", "--beige"],
  ["--cobalt", "--bubblegum"],
  ["--cherry", "--blush"],
  ["--plum", "--cherry"],
  ["--leaf", "--beige"],
  ["--slate", "--candy"],
  ["--red", "--beige"],
  ["--olive", "--beige"],
  ["--mauve", "--plum"],
];
const SHAPES = [
  "quatrefoil", "sparkle", "pillow", "burst", "heart", "dot-ring", "stairs", "peanut", "quarter",
  "clover", "rainbow", "plus-flower", "arch", "pill", "ring", "flower", "hourglass", "drop",
  "bowtie", "split", "bars",
];
const MAX_COINS = 240;
const CYCLE_MS = 3200;      // one automatic wave per beat
const CLICK_QUIET_MS = 2600; // the cycle holds off this long after a click wave

const $ = (s) => document.querySelector(s);
const pick = (a) => a[(Math.random() * a.length) | 0];

const coinsEl = $("#coins");

let coins = [];
let grid = { cols: 0, rows: 0, cell: 0, ox: 0, oy: 0 };
let motionOK = true;
let lastClick = 0;

/* ---------- coin grid ---------- */

function cellSize() {
  const w = innerWidth, h = innerHeight;
  if (w < 640) return Math.max(58, Math.round(w / 6.2));
  return Math.min(132, Math.max(84, Math.round(Math.min(w / 13, h / 7.5))));
}

function styleCoin(el, { pair = pick(PAIRS), shape = pick(SHAPES) } = {}) {
  el.style.setProperty("--bg", `var(${pair[0]})`);
  el.style.setProperty("--fg", `var(${pair[1]})`);
  el.firstChild.firstChild.setAttribute("href", SPRITE + shape);
}

function buildGrid() {
  const cell = cellSize();
  let cols = Math.ceil(innerWidth / cell) + 1;
  let rows = Math.ceil(innerHeight / cell) + 1;
  if (cols * rows > MAX_COINS) rows = Math.floor(MAX_COINS / cols);
  grid = { cols, rows, cell, ox: Math.round((innerWidth - cols * cell) / 2), oy: Math.round((innerHeight - rows * cell) / 2) };

  const root = document.documentElement.style;
  root.setProperty("--cell", cell + "px");
  coinsEl.style.setProperty("--cols", cols);
  coinsEl.style.setProperty("--ox", grid.ox + "px");
  coinsEl.style.setProperty("--oy", grid.oy + "px");

  const total = cols * rows;
  const frag = document.createDocumentFragment();
  // reuse existing coins where possible
  while (coinsEl.children.length > total) coinsEl.lastChild.remove();
  for (let i = coinsEl.children.length; i < total; i++) {
    const c = document.createElement("span");
    c.className = "coin";
    c.innerHTML = '<svg class="icon"><use/></svg>';
    styleCoin(c);
    c._rot = 90 * ((Math.random() * 4) | 0);
    gsap.set(c.firstChild, { rotation: c._rot });
    frag.appendChild(c);
  }
  coinsEl.appendChild(frag);
  coins = [...coinsEl.children];
}

function indexAt(x, y) {
  const col = Math.min(grid.cols - 1, Math.max(0, Math.floor((x - grid.ox) / grid.cell)));
  const row = Math.min(grid.rows - 1, Math.max(0, Math.floor((y - grid.oy) / grid.cell)));
  return row * grid.cols + col;
}

const randomIndex = () => (Math.random() * coins.length) | 0;

// Big wave: coins pop out and come back with a new shape + colour pair
function ripple(from, { amount = 0.9 } = {}) {
  if (!motionOK) {
    coins.forEach((c) => styleCoin(c));
    return;
  }
  gsap.to(coins, {
    scale: 0,
    duration: 0.2,
    ease: "power2.in",
    overwrite: "auto",
    stagger: {
      grid: [grid.rows, grid.cols],
      from,
      amount,
      onComplete() {
        const el = this.targets()[0];
        styleCoin(el);
        el._rot += 90;
        gsap.set(el.firstChild, { rotation: el._rot });
        gsap.to(el, { scale: 1, duration: 0.55, ease: "back.out(2.6)", overwrite: "auto" });
      },
    },
  });
}

// Gentle wave: shapes turn a quarter, colours stay
function turnRipple(from) {
  const icons = coins.map((c) => {
    c._rot += 90;
    return c.firstChild;
  });
  gsap.to(icons, {
    rotation: (i) => coins[i]._rot,
    duration: 0.7,
    ease: "back.out(2)",
    overwrite: "auto",
    stagger: { grid: [grid.rows, grid.cols], from, amount: 1.4 },
  });
}

/* ---------- input ---------- */

const UI = ".card-wrap, .strip, a, button, input, label, form";

document.addEventListener("click", (e) => {
  if (e.target.closest(UI)) return;
  lastClick = performance.now();
  ripple(indexAt(e.clientX, e.clientY), { amount: 0.75 });
});

/* ---------- signup ---------- */

const form = $("#signup");
const msg = $("#signup-msg");
const input = $("#email");

input.addEventListener("input", () => {
  if (form.dataset.state === "error") {
    form.dataset.state = "";
    msg.textContent = "";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!input.checkValidity()) {
    form.dataset.state = "error";
    msg.textContent = input.value ? "hmm, that email looks a little off." : "we'll need an email to save your seat.";
    input.setAttribute("aria-invalid", "true");
    input.focus();
    if (motionOK) gsap.fromTo(".signup__row", { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    return;
  }
  input.removeAttribute("aria-invalid");
  const btn = form.querySelector("button");
  btn.disabled = true;

  const endpoint = form.dataset.endpoint;
  try {
    if (endpoint) {
      const res = await fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(res.status);
    } else {
      console.info("[Can Do Project] signup (no endpoint set yet):", input.value);
    }
    showSuccess();
  } catch (err) {
    form.dataset.state = "error";
    msg.textContent = "something went sideways — try again in a moment?";
    btn.disabled = false;
  }
});

function showSuccess() {
  const success = $("#success");
  const done = () => {
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    if (!motionOK) return;
    gsap.from(success.children, { y: 16, opacity: 0, duration: 0.5, stagger: 0.08, ease: "back.out(2)" });
    gsap.from(".success__coins .coin", { scale: 0, rotation: -90, duration: 0.6, stagger: 0.1, ease: "back.out(3)", delay: 0.1 });
    const r = $("#card").getBoundingClientRect();
    lastClick = performance.now();
    ripple(indexAt(r.left + r.width / 2, r.top + r.height / 2), { amount: 1.1 });
  };
  motionOK ? gsap.to(form, { opacity: 0, y: -10, duration: 0.25, onComplete: done }) : done();
}

/* ---------- boot ---------- */

buildGrid();

let resizeTimer;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildGrid, 150);
});

const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  motionOK = true;

  // intro: coins deal out from the centre, card rises, title words pop
  gsap.from(coins, {
    scale: 0,
    duration: 0.6,
    ease: "back.out(2)",
    stagger: { grid: [grid.rows, grid.cols], from: "center", amount: 1 },
  });
  gsap.from(".card-wrap", { y: 80, opacity: 0, rotation: -2, duration: 1, ease: "back.out(1.4)", delay: 0.25 });
  // split only once the brand fonts are in, so word boxes are measured correctly
  let split;
  gsap.set("#title", { autoAlpha: 0 });
  document.fonts.ready.then(() => {
    split = SplitText.create("#title .line", { type: "words", mask: "words" });
    gsap.set("#title", { autoAlpha: 1 });
    gsap.from(split.words, { yPercent: 110, duration: 0.8, ease: "back.out(1.8)", stagger: 0.07, delay: 0.35 });
  });
  gsap.from(".badge", { scale: 0, rotation: -180, duration: 1, ease: "back.out(2)", delay: 0.9 });
  gsap.from(".strip", { y: 30, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.8 });

  // the cycle: alternate a colour wave and a quarter-turn wave from a random spot;
  // it gives way for a moment after a click so the two waves don't collide
  let beat = 0;
  const cycle = setInterval(() => {
    if (document.hidden || performance.now() - lastClick < CLICK_QUIET_MS) return;
    beat++ % 2 ? turnRipple(randomIndex()) : ripple(randomIndex(), { amount: 1.2 });
  }, CYCLE_MS);

  return () => {
    clearInterval(cycle);
    split?.revert();
    gsap.set("#title", { autoAlpha: 1 });
  };
});

mm.add("(prefers-reduced-motion: reduce)", () => {
  motionOK = false;
  return () => (motionOK = true);
});
