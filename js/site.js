import { joinAlphaWaitlist } from "./waitlist.js";

// Resolve site files from this script, so the page works at a subpath such as /sable-site/.
const siteRoot = new URL("../", import.meta.url);
function assetUrl(path) {
  return new URL(path, siteRoot).href;
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SCALE = 2;
const LAYER_W = 640 * SCALE;
const LAYER_H = 360 * SCALE;

const layers = [
  [document.querySelector(".layer-nebula"), 0.15],
  [document.querySelector(".layer-dim"), 0.35],
  [document.querySelector(".layer-bright"), 0.6],
  [document.querySelector(".layer-dust"), 0.85],
];

const canvas = document.getElementById("twinkles");
const ctx = canvas.getContext("2d", { alpha: true });
ctx.imageSmoothingEnabled = false;

let twinkles = [];
let strip = null;
let scrollY = window.scrollY;
let running = true;

function resizeTwinkles() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;
  }
}

function frameFor(twinkle, now) {
  if (reduceMotion) return 3;
  const cycle = (now / 1000) / twinkle.period + twinkle.phase;
  const frame = Math.floor(cycle * 8) % 8;
  return frame < 0 ? frame + 8 : frame;
}

function drawTwinkles(now) {
  if (!strip) return;
  resizeTwinkles();
  const w = canvas.width;
  const h = canvas.height;
  const offY = reduceMotion ? 0 : scrollY * 0.6;
  ctx.clearRect(0, 0, w, h);
  const y0 = Math.floor(offY / LAYER_H) - 1;
  const y1 = Math.floor((offY + h) / LAYER_H) + 1;
  const x1 = Math.ceil(w / LAYER_W) + 1;
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = -1; tx <= x1; tx += 1) {
      for (let i = 0; i < twinkles.length; i += 1) {
        const tw = twinkles[i];
        const dx = tx * LAYER_W + tw.x * SCALE - 4 * SCALE;
        const dy = ty * LAYER_H + tw.y * SCALE - 4 * SCALE - offY;
        if (dx > w || dy > h || dx + 18 < 0 || dy + 18 < 0) continue;
        const frame = frameFor(tw, now);
        ctx.drawImage(strip, frame * 9, tw.tint * 9, 9, 9, dx, dy, 18, 18);
      }
    }
  }
}

function applyParallax(now) {
  const drift = reduceMotion ? 0 : (now / 1000) * 6;
  for (let i = 0; i < layers.length; i += 1) {
    const el = layers[i][0];
    const factor = layers[i][1];
    if (!el) continue;
    const y = reduceMotion ? 0 : -scrollY * factor;
    const x = el.classList.contains("layer-dust") ? drift : 0;
    el.style.backgroundPosition = `${x}px ${y}px`;
  }
}

function tick(now) {
  if (!running) return;
  scrollY = window.scrollY;
  applyParallax(now);
  drawTwinkles(now);
  if (!reduceMotion) requestAnimationFrame(tick);
}

window.addEventListener("resize", () => {
  resizeTwinkles();
  if (reduceMotion) {
    applyParallax(0);
    drawTwinkles(0);
  }
}, { passive: true });

document.addEventListener("visibilitychange", () => {
  running = document.visibilityState !== "hidden";
  if (running && !reduceMotion) requestAnimationFrame(tick);
});

fetch(assetUrl("assets/sky/sky_twinkles.json"))
  .then((res) => res.json())
  .then((data) => {
    twinkles = data.twinkles || [];
    strip = new Image();
    strip.onload = () => {
      if (reduceMotion) {
        applyParallax(0);
        drawTwinkles(0);
      }
    };
    strip.src = assetUrl("assets/sky/sky_twinkle_strip.png");
  })
  .catch(() => {});

if (reduceMotion) {
  applyParallax(0);
} else {
  requestAnimationFrame(tick);
}

const navLinks = [...document.querySelectorAll("[data-nav]")];
const sections = navLinks
  .map((link) => document.getElementById(link.dataset.nav))
  .filter(Boolean);

function setCurrent(id) {
  navLinks.forEach((link) => {
    const on = link.dataset.nav === id;
    link.classList.toggle("is-you", on);
    if (on) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

const seen = new Set();
const spy = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-lit");
    seen.add(entry.target.id);
    const link = document.querySelector(`[data-nav="${entry.target.id}"]`);
    if (link) link.classList.add("is-lit");
  });
  if (visible[0]) setCurrent(visible[0].target.id);
}, { rootMargin: "-35% 0px -45% 0px", threshold: [0.15, 0.35, 0.6] });

sections.forEach((section) => spy.observe(section));
const top = document.getElementById("top");
if (top) {
  top.classList.add("is-lit");
  const home = document.querySelector('[data-nav="top"]');
  if (home) home.classList.add("is-lit");
  setCurrent("top");
}

const dialog = document.getElementById("lightbox");
const dialogImg = document.getElementById("lightbox-img");
document.querySelectorAll(".shot").forEach((button) => {
  button.addEventListener("click", () => {
    const img = button.querySelector("img");
    dialogImg.src = button.dataset.full || img.src;
    dialogImg.alt = img.alt;
    if (typeof dialog.showModal === "function") dialog.showModal();
  });
});
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

const skyStage = document.getElementById("skill-sky");
const skyVideo = document.getElementById("skill-video");
const skyCtx = skyStage?.getContext("2d", { alpha: true });
let skyMap = null;

function drawSkillSky(now) {
  if (!skyStage || !skyCtx || !skyMap) return;
  const { size, schools, nodes, edges, lodestar } = skyMap;
  skyCtx.clearRect(0, 0, size[0], size[1]);
  skyCtx.imageSmoothingEnabled = false;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const colors = schools.map((school) => school.color);
  skyCtx.lineWidth = 2;
  edges.forEach(([a, b]) => {
    const na = byId.get(a);
    const nb = byId.get(b);
    if (!na || !nb) return;
    skyCtx.strokeStyle = colors[na.s] || "#4c376a";
    skyCtx.globalAlpha = 0.85;
    skyCtx.beginPath();
    skyCtx.moveTo(na.x, na.y);
    skyCtx.lineTo(nb.x, nb.y);
    skyCtx.stroke();
  });
  skyCtx.globalAlpha = 1;
  nodes.forEach((node) => {
    const color = colors[node.s] || "#e5dfce";
    const r = node.root ? 5 : 2;
    skyCtx.fillStyle = color;
    skyCtx.fillRect(node.x - r, node.y - r, r * 2, r * 2);
  });
  schools.forEach((school) => {
    skyCtx.fillStyle = school.color;
    skyCtx.font = "600 18px Alegreya, Palatino, serif";
    skyCtx.textAlign = "center";
    skyCtx.fillText(school.label, school.labelAt[0], school.labelAt[1]);
  });
  if (lodestar) {
    const pulse = reduceMotion ? 1 : 0.72 + 0.28 * Math.sin(now / 520);
    skyCtx.save();
    skyCtx.translate(lodestar.x, lodestar.y);
    skyCtx.rotate(Math.PI / 4);
    skyCtx.globalAlpha = pulse;
    skyCtx.fillStyle = "#e6c98a";
    skyCtx.fillRect(-7, -7, 14, 14);
    skyCtx.restore();
    skyCtx.globalAlpha = 1;
    skyCtx.fillStyle = "#f3e2b8";
    skyCtx.font = "700 18px Alegreya, Palatino, serif";
    skyCtx.textAlign = "center";
    skyCtx.fillText(lodestar.name, lodestar.x, lodestar.y + 28);
  }
}

if (skyStage) {
  fetch(assetUrl("assets/skill_sky_map.json"))
    .then((res) => res.json())
    .then(async (map) => {
      skyMap = map;
      skyStage.width = map.size[0];
      skyStage.height = map.size[1];
      try {
        await document.fonts.load("600 18px Alegreya");
      } catch (_) { /* still draw nodes */ }
      const paint = (now) => {
        if (skyVideo && !skyVideo.hidden) return;
        drawSkillSky(now || 0);
        if (!reduceMotion && running) requestAnimationFrame(paint);
      };
      if (reduceMotion) paint(0);
      else requestAnimationFrame(paint);
    })
    .catch(() => {});
}

if (skyVideo) {
  const revealVideo = () => {
    if (skyVideo.videoWidth > 0) {
      skyVideo.hidden = false;
      if (skyStage) skyStage.hidden = true;
      if (!reduceMotion) skyVideo.play().catch(() => {});
    }
  };
  skyVideo.addEventListener("loadeddata", revealVideo);
  skyVideo.addEventListener("error", () => {
    skyVideo.hidden = true;
    if (skyStage) skyStage.hidden = false;
  });
  const source = skyVideo.querySelector("source");
  if (source) source.src = assetUrl("assets/skill_sky_full.mp4");
  skyVideo.load();
}

const form = document.getElementById("alpha-form");
const emailInput = document.getElementById("email");
const status = document.getElementById("form-status");
const fieldError = document.getElementById("email-error");
const submitBtn = document.getElementById("alpha-submit");
const retryBtn = document.getElementById("alpha-retry");

function isValidEmail(value) {
  const email = value.trim();
  if (email.length < 3 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFormState(state) {
  form.dataset.state = state;
  submitBtn.disabled = state === "submitting";
  emailInput.disabled = state === "submitting" || state === "success";
  retryBtn.hidden = state !== "error";
  if (state === "idle" || state === "full") submitBtn.textContent = "Request Alpha Access";
  if (state === "submitting") submitBtn.textContent = "Sending…";
  if (state === "success") submitBtn.textContent = "Request Alpha Access";
}

function showInvalidEmail() {
  setFormState("idle");
  fieldError.hidden = false;
  fieldError.textContent = "Enter a valid email.";
  emailInput.setAttribute("aria-invalid", "true");
  emailInput.focus();
}

emailInput.addEventListener("input", () => {
  fieldError.hidden = true;
  emailInput.removeAttribute("aria-invalid");
  if (form.dataset.state === "error" || form.dataset.state === "full") {
    status.textContent = "";
    setFormState("idle");
  }
});

retryBtn.addEventListener("click", () => {
  form.requestSubmit();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (form.dataset.state === "submitting" || form.dataset.state === "success") return;

  const email = emailInput.value.trim();
  const data = new FormData(form);
  const source = String(data.get("source") || "site");

  if (!isValidEmail(email)) {
    showInvalidEmail();
    return;
  }

  fieldError.hidden = true;
  emailInput.removeAttribute("aria-invalid");
  status.textContent = "";
  setFormState("submitting");

  try {
    const result = await joinAlphaWaitlist(email, source);
    if (result && result.ok === true) {
      setFormState("success");
      status.textContent = "You're on the list";
      return;
    }
    if (result && result.ok === false && result.error === "invalid_email") {
      showInvalidEmail();
      return;
    }
    if (result && result.ok === false && result.error === "full") {
      setFormState("full");
      status.textContent = "Alpha is full right now, try again soon";
      return;
    }
  } catch (_) {
    /* generic error below */
  }

  setFormState("error");
  status.textContent = "Something went wrong.";
  retryBtn.focus();
});
