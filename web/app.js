// The Argo: live viewer. Loads the latest checkpoint, catches the world up to the current hour in the browser
// (same engine as the hourly GitHub job, so it is the same world), and draws it.
import { deserialize, runUntil, omensByDay, dayNow, stateHash } from "./sim/engine.js";
import { narrate, nameOf, VOICE } from "./sim/narrate.js";
import { homeFaction } from "./sim/systems.js";
import { BLOODS, DISTRICTS, D, GOODS, JOBS, OFFICES, COGNOMENS, THOUGHTS, AXES, ST, GENESIS, PREHISTORY_DAYS } from "./sim/lore.js";
import { TIES, THS, BIO } from "./sim/world.js";
import { EV } from "./sim/systems.js";
import { generate, paint, SITES, SIZE, TILE } from "./map.js";
import { figure, lookOf } from "./figures.js";
import { hash32 } from "./sim/rng.js";

const $ = (s) => document.querySelector(s), esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const gunzip = async (url) => { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error(url + " " + r.status); return new Response(r.body.pipeThrough(new DecompressionStream("gzip"))); };
const json = async (url) => { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error(url + " " + r.status); return r.json(); };
const NFT = "0x387c41b0b2f1128de44db1bcf8baad085f26392c";

let seed, w, meta, sprites, checkpointDay, provisional = [], chron = [], byDay = {};
const S = { scale: 0.12, x: 0, y: 0, hover: -1, pos: null, sel: -1 };

// ------------------------------------------------------------------ boot
(async function boot() {
  try {
    [seed, meta] = await Promise.all([json("data/seed.json"), json("world/meta.json")]);
    const [stTxt, fleet, omens] = await Promise.all([(await gunzip("world/state.json.gz")).text(), (await gunzip("data/fleet.bin.gz")).arrayBuffer(), json("world/omens.json").catch(() => [])]);
    w = deserialize(stTxt, seed); checkpointDay = w.day;
    sprites = buildAtlas(new Uint8Array(fleet));
    byDay = omensByDay(omens.filter((o) => (o.ad ?? 0) >= checkpointDay - 1));
    const last = meta.chunks.at(-1), prev = meta.chunks.at(-2);
    for (const k of [prev, last]) if (k !== undefined) chron.push(...await json(`world/chronicle/c${k}.json`).catch(() => []));
    catchUp();
    layout(); fit(); render(); panels();
    $("#loading").remove();
    setInterval(liveTick, 15000); requestAnimationFrame(frame);
  } catch (e) { $("#loading").textContent = "The sea is fogged: " + e.message; console.error(e); }
})();

const view = {
  name: (i) => `${nameOf(i + 1)} #${i + 1}${w.A.cognomen[i] ? " " + COGNOMENS[w.A.cognomen[i]] : ""}`,
  faction: (i) => w.factions[w.A.faction[i]].name,
  blood: (i) => w.factions[homeFaction(w, i)].name,
};
function catchUp() {
  const target = dayNow(Date.now() / 1000) + 1; if (w.day >= target) return false;
  runUntil(w, target, byDay, (d, ev) => { for (const e of ev) provisional.push({ ...e, text: narrate(e, view), voice: VOICE[e.t] || "realism", prov: true }); });
  return true;
}
function liveTick() { if (catchUp()) { layout(); panels(); flash(); } updateClock(); }
function flash() { const c = $("#chart"); c.animate([{ filter: "brightness(1.6)" }, { filter: "brightness(1)" }], { duration: 1500 }); }

// ------------------------------------------------------------------ sprites: 'ARGP' | u16 n | u16 P | P*3 RGB | n*576 u16 idx
function buildAtlas(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset), n = dv.getUint16(4, true), P = dv.getUint16(6, true), pal = u8.subarray(8, 8 + P * 3);
  const idx = new Uint16Array(u8.buffer.slice(u8.byteOffset + 8 + P * 3, u8.byteOffset + 8 + P * 3 + n * 576 * 2));
  const cols = 100, c = document.createElement("canvas"); c.width = cols * 24; c.height = Math.ceil(n / cols) * 24;
  const ctx = c.getContext("2d"), img = ctx.createImageData(c.width, c.height), px = img.data;
  for (let t = 0; t < n; t++) {
    const ox = (t % cols) * 24, oy = Math.floor(t / cols) * 24;
    for (let p = 0; p < 576; p++) { const k = idx[t * 576 + p] * 3, o = ((oy + (p / 24 | 0)) * c.width + ox + (p % 24)) * 4; px[o] = pal[k]; px[o + 1] = pal[k + 1]; px[o + 2] = pal[k + 2]; px[o + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0); return { canvas: c, cols };
}
const spriteAt = (i) => [(i % sprites.cols) * 24, Math.floor(i / sprites.cols) * 24];

// ------------------------------------------------------------------ the world map: square, biomes, cities, roads (web/map.js)
const MAP = generate(), TERRAIN = paint(MAP), WORLD = SIZE * TILE;
const ROADS = MAP.roads.map((r) => { const land = new Path2D(), sea = new Path2D(); let prevSea = null;
  r.path.forEach(([x, y, wet], n) => { const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2, P = wet ? sea : land; if (n === 0 || wet !== prevSea) P.moveTo(px, py); else P.lineTo(px, py); if (n > 0 && wet !== prevSea) (wet ? sea : land).moveTo(px, py); prevSea = wet; });
  return { land, sea }; });
const SITE = DISTRICTS.map((d) => { const s = SITES[d.key]; return { x: s.x * TILE + TILE / 2, y: s.y * TILE + TILE / 2, r: s.r * TILE }; });

// ------------------------------------------------------------------ where everyone lives, works and gathers
const CELL = 11;
function layout() {
  const A = w.A, groups = DISTRICTS.map(() => []);
  for (let i = 0; i < w.N; i++) groups[A.district[i]].push(i);
  const home = new Float32Array(w.N * 2), work = new Float32Array(w.N * 2), plaza = new Float32Array(w.N * 2), houses = [], cityR = [];
  DISTRICTS.forEach((d, k) => {
    const g = groups[k].sort((a, b) => (A.status[a] - A.status[b]) || (A.oikos[a] - A.oikos[b]) || a - b), c = SITE[k];
    if (d.kind === "asphodel") {   // graves in rows; shades drift among them
      const graves = g.filter((i) => A.status[i] === ST.asphodel), rest = g.filter((i) => A.status[i] !== ST.asphodel), cols = 12;
      graves.forEach((i, n) => { home[i * 2] = c.x - cols * 9 + (n % cols) * 18; home[i * 2 + 1] = c.y - 40 + Math.floor(n / cols) * 22; });
      const cells = hexSpiral(rest.length, CELL * 1.6); rest.forEach((i, n) => { home[i * 2] = c.x + cells[n * 2]; home[i * 2 + 1] = c.y + 70 + cells[n * 2 + 1]; });
      cityR[k] = 160;
    } else if (d.kind === "pyra") { g.forEach((i, n) => { const a = n / Math.max(1, g.length) * 6.283; home[i * 2] = c.x + Math.cos(a) * 14 * Math.min(1, n); home[i * 2 + 1] = c.y + Math.sin(a) * 10 * Math.min(1, n); }); cityR[k] = 60; }
    else {
      const cells = hexSpiral(g.length, CELL); let R = 40;
      g.forEach((i, n) => { const x = cells[n * 2], y = cells[n * 2 + 1]; home[i * 2] = c.x + x; home[i * 2 + 1] = c.y + y; R = Math.max(R, Math.hypot(x, y)); if (n % 4 === 0) houses.push(c.x + x, c.y + y); });
      cityR[k] = R + 14;
    }
    for (const i of g) {
      const h = hash32("work", i), job = JOBS[A.job[i]], service = ["priest", "reaper", "noble", "servant", "merchant", "augur"].includes(job);
      const ang = (A.job[i] * 0.9 + (h % 1000) / 1000 * 0.8) * 1.0, rad = service ? (h % 100) / 100 * cityR[k] * 0.4 : cityR[k] + 30 + (h % 997) / 997 * Math.max(120, cityR[k] * 0.7);
      work[i * 2] = c.x + Math.cos(ang) * rad; work[i * 2 + 1] = c.y + Math.sin(ang) * rad;
      const pa = (hash32("pz", i) % 6283) / 1000, pr = ((hash32("pr", i) % 1000) / 1000) * Math.min(90, cityR[k] * 0.35);
      plaza[i * 2] = c.x + Math.cos(pa) * pr; plaza[i * 2 + 1] = c.y + Math.sin(pa) * pr;
    }
  });
  S.home = home; S.work = work; S.plaza = plaza; S.houses = houses; S.cityR = cityR; S.cur = new Float32Array(w.N * 2); S.frame = new Uint8Array(w.N);
  S.looks = []; for (let i = 0; i < w.N; i++) S.looks.push(figure(lookOf(seed, i, JOBS[A.job[i]])));
}
const spiralCache = {};
function hexSpiral(n, s) {
  const key = n + ":" + s; if (spiralCache[key]) return spiralCache[key];
  const out = [], rows = Math.ceil(Math.sqrt(n)) + 4, cand = [];
  for (let q = -rows; q <= rows; q++) for (let r = -rows; r <= rows; r++) { const x = s * (q + r / 2), y = s * r * 0.866; cand.push([x * x + y * y, x, y]); }
  cand.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  for (let k = 0; k < n; k++) out.push(cand[k][1], cand[k][2]);
  return (spiralCache[key] = out);
}
// a sim day is one real hour: night, walk to work, work, walk to the plaza, gather, walk home, night
const ease = (t) => t * t * (3 - 2 * t);
function positions(now) {
  const A = w.A, f0 = (((now - GENESIS) % 3600) + 3600) % 3600 / 3600, P = S.cur;
  for (let i = 0; i < w.N; i++) {
    const st = A.status[i]; let x, y, fr = 4;
    const hx = S.home[i * 2], hy = S.home[i * 2 + 1];
    if (st === ST.asphodel) { x = hx; y = hy; }
    else if (st === ST.shade) { const a = now / 9 + i; x = hx + Math.cos(a) * 6; y = hy + Math.sin(a * 0.7) * 4; }
    else if (st === ST.pyre || A.jail[i]) { x = hx; y = hy; }
    else {
      const f = (f0 + (hash32("o", i) % 100) / 1000) % 1, wx = S.work[i * 2], wy = S.work[i * 2 + 1], px = S.plaza[i * 2], py = S.plaza[i * 2 + 1];
      const L = (ax, ay, bx, by, t) => { const e = ease(t); x = ax + (bx - ax) * e; y = ay + (by - ay) * e; fr = Math.floor(now * 6 + i) % 4; };
      if (f < 0.2 || f >= 0.86) { x = hx; y = hy; }
      else if (f < 0.28) L(hx, hy, wx, wy, (f - 0.2) / 0.08);
      else if (f < 0.58) { x = wx + Math.sin(now / 3 + i) * 3; y = wy; }
      else if (f < 0.64) L(wx, wy, px, py, (f - 0.58) / 0.06);
      else if (f < 0.8) { const a = now / 7 + i * 0.37; x = px + Math.cos(a) * 9; y = py + Math.sin(a) * 6; fr = Math.floor(now * 3 + i) % 4; }
      else L(px, py, hx, hy, (f - 0.8) / 0.06);
    }
    P[i * 2] = x; P[i * 2 + 1] = y; S.frame[i] = fr;
  }
  return f0;
}

// ------------------------------------------------------------------ rendering
const cv = $("#chart"), cx = cv.getContext("2d");
function resize() { const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); S.dpr = dpr; }
addEventListener("resize", () => { resize(); render(); });
function fit() { resize(); const r = cv.getBoundingClientRect(); S.scale = Math.min(r.width, r.height) / WORLD * 1.02; S.x = r.width / 2 - WORLD / 2 * S.scale; S.y = r.height / 2 - WORLD / 2 * S.scale; }
let tAnim = 0;
function render() {
  if (!w || !S.home) return;
  const r = cv.getBoundingClientRect(), A = w.A, sc = S.scale, now = Date.now() / 1000, f = positions(now);
  cx.fillStyle = "#0b1a33"; cx.fillRect(0, 0, r.width, r.height);
  cx.save(); cx.translate(S.x, S.y); cx.scale(sc, sc);
  cx.imageSmoothingEnabled = false; cx.drawImage(TERRAIN, 0, 0, SIZE, SIZE, 0, 0, WORLD, WORLD);
  // roads and sea lanes
  cx.lineCap = "round"; cx.lineJoin = "round";
  for (const R of ROADS) { cx.strokeStyle = "#a08a62"; cx.lineWidth = Math.max(5, 1.6 / sc); cx.stroke(R.land); cx.setLineDash([18, 22]); cx.strokeStyle = "#9fc3e6aa"; cx.lineWidth = Math.max(3, 1.2 / sc); cx.stroke(R.sea); cx.setLineDash([]); }
  // city grounds and houses
  DISTRICTS.forEach((d, k) => {
    if (d.kind === "pyra" || d.kind === "asphodel" || d.kind === "grove") return;
    const c = SITE[k]; cx.fillStyle = "rgba(60,48,36,.55)"; cx.beginPath(); cx.arc(c.x, c.y, S.cityR[k] + 10, 0, 6.283); cx.fill();
    cx.strokeStyle = "rgba(200,180,140,.5)"; cx.lineWidth = Math.max(3, 1 / sc); cx.stroke();
  });
  const night = f < 0.2 || f >= 0.86;
  if (sc > 0.25) { cx.fillStyle = "#7d6a55"; for (let k = 0; k < S.houses.length; k += 2) cx.fillRect(S.houses[k] - 7, S.houses[k + 1] + 3, 14, 7); }
  // the Pyra
  const pd = SITE[D.pyra], fl = 0.6 + 0.4 * Math.sin(tAnim / 220) * Math.sin(tAnim / 97);
  const grd = cx.createRadialGradient(pd.x, pd.y, 4, pd.x, pd.y, 150); grd.addColorStop(0, `rgba(255,170,60,${0.75 * fl})`); grd.addColorStop(1, "rgba(255,80,20,0)");
  cx.fillStyle = grd; cx.beginPath(); cx.arc(pd.x, pd.y, 150, 0, 6.283); cx.fill();
  // characters
  const vx0 = -S.x / sc - 40, vy0 = -S.y / sc - 40, vx1 = (r.width - S.x) / sc + 40, vy1 = (r.height - S.y) / sc + 40, P = S.cur;
  const figH = 16, figPx = figH * sc, mode = figPx < 4 ? 0 : 1, label = figPx > 34;
  for (let i = 0; i < w.N; i++) {
    const x = P[i * 2], y = P[i * 2 + 1]; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    const st = A.status[i];
    if (st === ST.asphodel) { cx.fillStyle = "#cfc9ba"; cx.fillRect(x - 4, y - 7, 8, 11); cx.fillStyle = "#7a6e5e"; cx.fillRect(x - 0.8, y - 15, 1.6, 9); continue; }
    cx.globalAlpha = st === ST.shade ? 0.3 : 1;
    if (mode === 0) { cx.fillStyle = w.factions[A.faction[i]].color; cx.fillRect(x - 3, y - 3, 6, 6); }
    else { const L = S.looks[i]; cx.imageSmoothingEnabled = true; cx.drawImage(L.canvas, S.frame[i] * L.w, 0, L.w, L.h, x - figH * 0.32, y - figH, figH * 0.64, figH); }
    if (st === ST.pyre) { cx.globalAlpha = 0.6 + 0.4 * fl; cx.fillStyle = "#ff7a1a"; cx.beginPath(); cx.moveTo(x - 7, y + 2); cx.quadraticCurveTo(x, y - 26 * fl, x + 7, y + 2); cx.fill();
      if (i === 8984) { cx.globalAlpha = 1; cx.fillStyle = "#2b2b2b"; cx.fillRect(x + 10, y - 9, 8, 11); } }
    if (i === S.sel || i === S.hover) { cx.globalAlpha = 1; cx.strokeStyle = "#e3b341"; cx.lineWidth = Math.max(1.5, 1.5 / sc); cx.strokeRect(x - 7, y - figH - 2, 14, figH + 4); }
    if (label && st !== ST.asphodel) { cx.globalAlpha = 0.9; cx.font = `${Math.max(3, 9 / sc * 0.5)}px "IBM Plex Mono", monospace`; cx.textAlign = "center"; cx.fillStyle = "#e9e1cf"; cx.fillText(`#${i + 1}`, x, y + 6); }
  }
  cx.globalAlpha = 1;
  // night falls each hour; windows light up
  if (night) { const depth = f < 0.2 ? 1 - Math.max(0, f - 0.12) / 0.08 : Math.min(1, (f - 0.86) / 0.06);
    cx.fillStyle = `rgba(4,8,24,${0.45 * depth})`; cx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    if (sc > 0.25) { cx.fillStyle = `rgba(255,200,110,${0.8 * depth})`; for (let k = 0; k < S.houses.length; k += 6) cx.fillRect(S.houses[k] - 2, S.houses[k + 1] + 4, 3, 3); } }
  // labels
  DISTRICTS.forEach((d, k) => {
    const c = SITE[k], fs = (cv.clientWidth < 600 ? 11 : 14) / sc, n = countIn(k);
    cx.font = `700 ${fs}px "Cormorant Garamond", serif`; cx.textAlign = "center"; cx.fillStyle = "#f3ecdacc"; cx.strokeStyle = "#0b1220aa"; cx.lineWidth = fs / 5;
    const ly = c.y - Math.max(S.cityR[k], 30) - 26 - fs * 0.3; cx.strokeText(d.name, c.x, ly); cx.fillText(d.name, c.x, ly);
    cx.font = `${fs * 0.72}px "IBM Plex Mono", monospace`; cx.fillStyle = "#c8d0dccc"; cx.strokeText(labelCount(k, n), c.x, ly + fs * 0.85); cx.fillText(labelCount(k, n), c.x, ly + fs * 0.85);
  });
  cx.restore();
  S.f = f;
}
function countIn(k) { let n = 0; for (let i = 0; i < w.N; i++) if (w.A.district[i] === k) n++; return n; }
function labelCount(k, n) { const d = DISTRICTS[k]; if (d.kind === "pyra") return `${n} burning`; if (d.kind === "asphodel") { let a = 0; for (let i = 0; i < w.N; i++) if (w.A.status[i] === ST.asphodel) a++; return `${a} graves · ${n - a} shades`; } return `${n} souls`; }
let lastFrame = 0;
function frame(t) { tAnim = t; if (t - lastFrame > 45 && !document.hidden) { lastFrame = t; render(); } requestAnimationFrame(frame); }

// ------------------------------------------------------------------ interaction
let drag = null, pinch = null;
cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, sx: S.x, sy: S.y, moved: false }; cv.classList.add("drag"); });
cv.addEventListener("pointermove", (e) => {
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; S.x = drag.sx + dx; S.y = drag.sy + dy; return; }
  const i = pick(e); S.hover = i;
  const tip = $("#tip"); if (i >= 0) { const b = cv.getBoundingClientRect(); tip.style.display = "block"; tip.style.left = Math.min(e.clientX - b.left + 14, b.width - 260) + "px"; tip.style.top = e.clientY - b.top + 14 + "px"; tip.textContent = `${view.name(i)} · ${view.faction(i)} · ${JOBS[w.A.job[i]]}`; } else tip.style.display = "none";
});
cv.addEventListener("pointerup", (e) => { cv.classList.remove("drag"); if (drag && !drag.moved) { const i = pick(e); if (i >= 0) openLegends(i); } drag = null; });
cv.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.2 : 1 / 1.2); }, { passive: false });
cv.addEventListener("touchstart", (e) => { if (e.touches.length === 2) { drag = null; pinch = dist(e); } }, { passive: true });
cv.addEventListener("touchmove", (e) => { if (e.touches.length === 2 && pinch) { const d = dist(e), b = cv.getBoundingClientRect(); const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - b.left, my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - b.top; zoomAt(mx, my, d / pinch); pinch = d; } }, { passive: true });
const dist = (e) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
function zoomAt(px, py, f) { const ns = Math.max(0.05, Math.min(8, S.scale * f)); S.x = px - (px - S.x) * ns / S.scale; S.y = py - (py - S.y) * ns / S.scale; S.scale = ns; }
$("#zin").onclick = () => { const b = cv.getBoundingClientRect(); zoomAt(b.width / 2, b.height / 2, 1.6); };
$("#zout").onclick = () => { const b = cv.getBoundingClientRect(); zoomAt(b.width / 2, b.height / 2, 1 / 1.6); };
$("#zfit").onclick = () => fit();
function pick(e) {
  const b = cv.getBoundingClientRect(), x = (e.clientX - b.left - S.x) / S.scale, y = (e.clientY - b.top - S.y) / S.scale, P = S.cur; let best = -1, bd = Math.max(10, 6 / S.scale) ** 2;
  for (let i = 0; i < w.N; i++) { const dx = P[i * 2] - x, dy = P[i * 2 + 1] - 8 - y, d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = i; } }
  return best;
}
function focus(i) { const b = cv.getBoundingClientRect(); S.scale = Math.max(S.scale, 3); S.x = b.width / 2 - S.cur[i * 2] * S.scale; S.y = b.height / 2 - S.cur[i * 2 + 1] * S.scale; S.sel = i; }

// ------------------------------------------------------------------ side panels
document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => { document.querySelectorAll(".tabs button,.panel").forEach((x) => x.classList.remove("on")); b.classList.add("on"); $("#p-" + b.dataset.tab).classList.add("on"); }));
document.querySelectorAll(".voices input").forEach((b) => (b.onchange = chronicle));
document.addEventListener("click", (e) => { const a = e.target.closest("[data-i]"); if (a) { e.preventDefault(); const i = +a.dataset.i; openLegends(i); } });
function linkify(text) {
  return esc(text).replace(/([A-Z][a-z]+) #(\d{1,4})((?: the [A-Z][\w-]+(?:-[A-Za-z]+)?| Siren-deaf| Maker-touched| Plague-spared)?)/g, (m, n, id, cog) => `<a class="who" data-i="${id - 1}">${n} #${id}${cog}</a>`);
}
function chronicle() {
  const on = new Set([...document.querySelectorAll(".voices input")].filter((x) => x.checked).map((x) => x.dataset.v));
  const all = chron.concat(provisional).filter((e) => on.has(e.voice)).slice(-400).reverse();
  let html = "", lastDay = null;
  for (const e of all) { if (e.d !== lastDay) { html += `<h4>${dayLabel(e.d)}${e.prov ? " · provisional" : ""}</h4>`; lastDay = e.d; } html += `<li class="${e.voice}${e.prov ? " prov" : ""}">${linkify(e.text)}</li>`; }
  $("#chron").innerHTML = html || "<li>The sea is quiet.</li>";
}
const dayLabel = (d) => d < 0 ? `Prehistory · ${PREHISTORY_DAYS + d} days after the sowing` : `Day ${d} of the voyage`;
function updateClock() {
  const now = Date.now() / 1000, d = dayNow(now), next = GENESIS + (d + 1) * 3600 - now;
  $("#day").textContent = `Day ${d} of the voyage`;
  $("#dawn").textContent = `next dawn in ${Math.floor(next / 60)}:${String(Math.floor(next % 60)).padStart(2, "0")} · world ${stateHash(w).slice(0, 6)}${w.day - 1 > checkpointDay ? " (provisional)" : ""}`;
}
setInterval(() => w && updateClock(), 1000);

function panels() {
  updateClock(); chronicle();
  const A = w.A, live = w.factions.map(() => 0); for (let i = 0; i < w.N; i++) if (A.status[i] === ST.living) live[A.faction[i]]++;
  const max = Math.max(...live);
  // legend
  $("#legend").innerHTML = w.factions.filter((f, k) => f.alive && live[k] > 0).sort((a, b) => live[b.id] - live[a.id]).slice(0, 14).map((f) => `<span><i style="background:${f.color}"></i>${esc(f.name)}</span>`).join("");
  // factions
  $("#p-fac").innerHTML = `<p class="muted">Bloods follow the Bones trait; the Sown are split into the five houses of Thebes. Splinters break off when a blood loses faith in the Boule and its elite has too few seats.</p>` +
    w.factions.map((f, k) => ({ f, k })).filter(({ f, k }) => f.alive && live[k] > 0).sort((a, b) => live[b.k] - live[a.k]).map(({ f, k }) =>
      `<div class="fac"><i style="background:${f.color}"></i><div><b>${esc(f.name)}</b> ${f.inCoalition ? '<span class="coal">◆ coalition</span>' : ""}</div><div class="num">${live[k]} · ${f.seats} seats</div>
       <div class="t">${esc(f.title)}${f.founder >= 0 ? ` · founded by <a class="who" data-i="${f.founder}">${esc(view.name(f.founder))}</a>` : ""}</div>
       <div class="bar" title="members"><b style="width:${(live[k] / max * 100).toFixed(1)}%;background:${f.color}"></b></div>
       <div class="t num">legitimacy ${f.legit} · ${AXES.map((a, x) => `${f.ideo[x] >= 0 ? a[0] : a[1]} ${Math.abs(f.ideo[x])}`).join(" · ")}</div></div>`).join("");
  // boule
  const off = Object.entries(w.offices).map(([k, i]) => { const o = OFFICES.find((x) => x.key === k); return `<div class="law"><b>${esc(o.title)}</b>, ${esc(o.role)}: <a class="who" data-i="${i}">${esc(view.name(i))}</a></div>`; }).join("");
  $("#p-boule").innerHTML = `<div class="kv"><b>Coalition</b><span>${w.boule.coalition.map((k) => esc(w.factions[k].name)).join(" + ") || "none"}</span><b>Treasury</b><span>${w.treasury.toLocaleString()} obols</span>
    <b>Market tax</b><span>${(w.taxPermille / 10).toFixed(1)}%</span><b>Franchise</b><span>${w.franchise}</span><b>Watch</b><span>${["disarmed", "single", "double"][w.guardLevel]}</span><b>Grain dole</b><span>${w.grainDole ? "yes" : "no"}</span></div>
    <h3>Offices</h3>${off}<h3>Laws (Ostrom grammar)</h3>${w.laws.slice(0, 10).map((l) => `<div class="law">${esc(l.adico)}<span class="num">${dayLabel(l.day)}</span></div>`).join("")}`;
  // economy
  const st = w.stats.slice(-240), last = st.at(-1);
  $("#p-econ").innerHTML = `<div class="kv"><b>Living</b><span>${last.live.toLocaleString()}</span><b>Hungry</b><span>${last.hungry}</span><b>Sick</b><span>${last.sick}</span><b>Gini</b><span>${last.gini}</span><b>Mean mood</b><span>${last.mood}</span><b>Unrest</b><span>${last.unrest} ready to riot</span></div>
    <h3>Prices (obols)</h3><div class="kv">${GOODS.map((g, k) => `<b>${g}</b><span>${w.prices[k].toFixed(2)}</span>`).join("")}</div>
    ${spark("Food price", st.map((s) => s.prices[0]), "#c9b98f")}${spark("Hungry", st.map((s) => s.hungry), "#e06a5a")}${spark("Gini", st.map((s) => s.gini), "#7fb4ff")}${spark("Shades in Asphodel", st.map((s) => s.shade), "#9aa4b5")}`;
  // dead
  const pyre = [], graves = [], shades = []; for (let i = 0; i < w.N; i++) { const s = A.status[i]; if (s === ST.pyre) pyre.push(i); else if (s === ST.asphodel) graves.push(i); else if (s === ST.shade) shades.push(i); }
  const lst = (a) => a.map((i) => `<a class="who" data-i="${i}">${esc(view.name(i))}</a>`).join(", ") || "none";
  $("#p-dead").innerHTML = `<h3>On the Pyra (${pyre.length})</h3><p>${lst(pyre)}</p><p class="muted">Burned on-chain in the last five real days; their art still shows fire.</p>
    <h3>Asphodel graves (${graves.length})</h3><p>${lst(graves)}</p><p class="muted">Burned tokens after the fire: bones gathered, an oar planted on each mound.</p>
    <h3>Shades (${shades.length})</h3><p class="muted">Died inside the world. Shades return after 20 to 60 days, changed; only burns are forever.</p><p>${lst(shades.slice(0, 120))}${shades.length > 120 ? " …" : ""}</p>`;
  $("#p-about").innerHTML = `<p><b>The Argo</b> is an autonomous world. Each of the 9,999 Argonauts lives on its own: it works, trades, eats, talks, holds grudges, votes, riots, defects, dies and sometimes returns. Nobody steers it.</p>
    <p>One real hour is one day of the voyage. The world is computed by a deterministic engine: the GitHub job and your browser run the same code from the same checkpoint and get the same world (fingerprint <code>${stateHash(w)}</code>).</p>
    <p>The only outside force is the chain. Sales move an Argonaut to a new house, and the price arrives as gold from Colchis. Burns light the Pyra. The Maker's rulings remake a character. Renderer changes make the Argo's speaking beam speak.</p>
    <p>Names come from Apollonius' <i>Argonautica</i>, Hesiod and Ovid. Factions follow the Bones trait. Text is procedural, with no AI model; three voices, myth, horror and realism.</p>
    <p class="muted">Checkpoint day ${checkpointDay - 1}, written ${esc(meta.updated)}. Source: <a class="who" href="https://github.com/Nicolai1205/Argonauts" target="_blank" rel="noopener" style="text-decoration:underline">github.com/Nicolai1205/Argonauts</a>.</p>`;
}
function spark(label, vals, color) {
  if (vals.length < 2) return ""; const lo = Math.min(...vals), hi = Math.max(...vals), W = 360, H = 60;
  const pts = vals.map((v, k) => `${(k / (vals.length - 1) * W).toFixed(1)},${(H - 4 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 10)).toFixed(1)}`).join(" ");
  return `<h3>${label}</h3><svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg><div class="num">${lo} – ${hi} over the last ${vals.length} days</div>`;
}

// ------------------------------------------------------------------ Legends page of one Argonaut
function openLegends(i) {
  const A = w.A, tok = i + 1, f = w.factions[A.faction[i]], d = seed.dicts, oik = w.oikoi[A.oikos[i]] || {};
  const status = ["living", "a shade in Asphodel", "burning on the Pyra", "buried in the Asphodel Meadow", "in exile"][A.status[i]];
  const traits = ["Bones", "Palette", "Cloak", "Crown", "Sight", "Artifact"].map((t) => `<span class="pill">${t}: ${esc(t === "Bones" ? d.Bones[seed.bones[i]] : d[t][seed[t.toLowerCase()][i]])}</span>`).join("");
  const hex = ["Honesty", "Emotionality", "Extraversion", "Agreeableness", "Conscientiousness", "Openness"].map((h, k) => `<div class="trait"><span>${h}</span><div class="bar"><b style="width:${A.pers[i * 6 + k]}%;background:var(--gold)"></b></div><span class="num">${A.pers[i * 6 + k]}</span></div>`).join("");
  const ideo = AXES.map((a, k) => { const v = A.ideo[i * 3 + k]; return `<div class="trait"><span>${v >= 0 ? a[0] : a[1]}</span><div class="bar"><b style="left:${50 + Math.min(0, v) / 2}%;width:${Math.abs(v) / 2}%;background:var(--myth)"></b></div><span class="num">${Math.abs(v)}</span></div>`; }).join("");
  const th = []; for (let k = 0; k < THS; k++) { const t = A.thType[i * THS + k]; if (t && A.thUntil[i * THS + k] >= w.day - 1) th.push(`<span class="pill">${THOUGHTS[t][0]} ${THOUGHTS[t][1] > 0 ? "+" : ""}${THOUGHTS[t][1]}</span>`); }
  const ties = []; for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k]; if (j >= 0) ties.push([A.tieVal[i * TIES + k], j]); } ties.sort((a, b) => b[0] - a[0]);
  const bio = []; for (let k = 0; k < BIO; k++) { const p = (A.bioPos[i] - 1 - k + BIO * 2) % BIO, t = A.bioType[i * BIO + p]; if (!t) continue; bio.push(`<li><span class="num">${dayLabel(A.bioDay[i * BIO + p])}</span> · ${esc(bioText(EV[t], A.bioArg[i * BIO + p]))}</li>`); }
  const recent = chron.concat(provisional).filter((e) => e.a === i || e.b === i).slice(-6).reverse().map((e) => `<li><span class="num">${dayLabel(e.d)}</span> · ${linkify(e.text)}</li>`).join("");
  $("#lgCard").innerHTML = `<button class="close" aria-label="Close">×</button>
   <div class="lg-head"><canvas id="lgArt" width="24" height="24"></canvas><div><h2>${esc(view.name(i))}</h2>
     <div class="t">${esc(f.name)}, ${esc(f.title)} · ${A.status[i] === ST.pyre || A.status[i] === ST.asphodel ? "once a " + JOBS[A.job[i]] : JOBS[A.job[i]] + " in " + esc(DISTRICTS[A.district[i]].name)} · ${status}${A.office[i] >= 0 ? " · " + OFFICES[A.office[i]].title : ""}</div>
     <div class="t">House: ${esc(oik.name || (oik.addr ? oik.addr.slice(0, 6) + "…" + oik.addr.slice(-4) : "?"))} · ${A.deaths[i] ? `died ${A.deaths[i]}× and returned · ` : ""}<a class="who" href="https://opensea.io/assets/ethereum/${NFT}/${tok}" target="_blank" rel="noopener">on-chain token</a></div>
     <div style="margin-top:6px">${traits}</div></div></div>
   <div class="cols"><div><h3>Temperament</h3>${hex}</div><div><h3>Beliefs</h3>${ideo}<h3>State</h3><div class="kv"><b>Obols</b><span>${A.obols[i].toLocaleString()}</span><b>Mood</b><span>${A.mood[i]}</span><b>Stress</b><span>${A.stress[i]}</span><b>Food</b><span>${A.inv[i * 5]} rations</span><b>Radical</b><span>${A.radical[i]}</span></div></div></div>
   <h3>On their mind</h3><div>${th.join("") || '<span class="muted">nothing pressing</span>'}</div>
   <h3>Bonds</h3><div>${ties.map(([v, j]) => `<span class="pill" style="border-color:${v >= 0 ? "#3d6b4a" : "#7a3030"}">${v >= 0 ? "♥" : "✕"} <a class="who" data-i="${j}">${esc(view.name(j))}</a> ${v}</span>`).join("") || '<span class="muted">alone</span>'}</div>
   <h3>Life</h3><ol class="bio">${bio.join("") || '<li class="muted">Nothing remembered yet.</li>'}</ol>${recent ? `<h3>In the chronicle</h3><ol class="bio">${recent}</ol>` : ""}`;
  const c = $("#lgArt").getContext("2d"), [sx, sy] = spriteAt(i); c.drawImage(sprites.canvas, sx, sy, 24, 24, 0, 0, 24, 24);
  if (A.status[i] === ST.asphodel || A.status[i] === ST.shade) { c.globalCompositeOperation = "saturation"; c.fillStyle = "#888"; c.fillRect(0, 0, 24, 24); }
  $("#legends").classList.add("on"); $("#legends").setAttribute("aria-hidden", "false"); $(".close").onclick = closeLegends; focus(i);
}
function bioText(t, arg) {
  return { death: "died", return: "came back from Asphodel", burn: "went to the Pyra", ostologia: "bones gathered; an oar planted", sold: `passed to the house of ${w.oikoi[arg]?.name || "a stranger"}`,
    hostage: "held in escrow", xenia: "exchanged under xenia", gold: "sold for gold", ruling: "touched by the Maker", riot: "rioted", defect: "changed allegiance", schism: "founded a faction",
    office: "took office", ostracism: "ostracized", funeral: "a funeral", unburied: "lay unburied", break: "broke under the strain", brawl: "fought", robbery: arg >= 0 ? `robbery involving ${view.name(arg)}` : "robbery",
    cognomen: `became ${COGNOMENS[arg]}`, migrate: `moved to ${DISTRICTS[arg]?.name || "new work"}`, exile_end: "returned from exile", lemnian: "the night of knives", plague: "fell sick", fleece: "the Fleece" }[t] || t;
}
function closeLegends() { $("#legends").classList.remove("on"); $("#legends").setAttribute("aria-hidden", "true"); S.sel = -1; render(); }
$("#legends").addEventListener("click", (e) => { if (e.target.id === "legends") closeLegends(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") closeLegends(); });

// ------------------------------------------------------------------ search
$("#q").addEventListener("input", () => {
  const q = $("#q").value.trim().toLowerCase(), box = $("#qres"); if (!q) { box.style.display = "none"; return; }
  const out = []; const id = parseInt(q.replace("#", ""), 10);
  if (id >= 1 && id <= 9999) out.push(id - 1);
  for (let i = 0; i < w.N && out.length < 12; i++) if (nameOf(i + 1).toLowerCase().startsWith(q) && !out.includes(i)) out.push(i);
  box.innerHTML = out.map((i) => `<div data-i="${i}">${esc(view.name(i))} · ${esc(view.faction(i))}</div>`).join(""); box.style.display = out.length ? "block" : "none";
});
document.addEventListener("click", (e) => { if (!e.target.closest(".search")) $("#qres").style.display = "none"; });
