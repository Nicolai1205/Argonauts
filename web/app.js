// The Argo: live viewer. Loads the latest checkpoint, catches the world up to the current hour in the browser
// (same engine as the hourly GitHub job, so it is the same world), and draws it.
import { deserialize, runUntil, omensByDay, dayNow, stateHash } from "./sim/engine.js";
import { narrate, nameOf, VOICE } from "./sim/narrate.js";
import { homeFaction } from "./sim/systems.js";
import { BLOODS, DISTRICTS, D, GOODS, JOBS, OFFICES, COGNOMENS, THOUGHTS, AXES, ST, GENESIS, PREHISTORY_DAYS } from "./sim/lore.js";
import { TIES, THS, BIO } from "./sim/world.js";
import { EV } from "./sim/systems.js";

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

// ------------------------------------------------------------------ layout: hex-pack each district, grouped by faction (quarters emerge)
const K = 9, CELL = 22;
function layout() {
  const A = w.A, groups = DISTRICTS.map(() => []);
  for (let i = 0; i < w.N; i++) groups[A.district[i]].push(i);
  const pos = new Float32Array(w.N * 2), radius = [];
  DISTRICTS.forEach((d, k) => {
    const g = groups[k].sort((a, b) => (A.status[a] - A.status[b]) || (A.faction[a] - A.faction[b]) || a - b);
    const cx = d.x * K, cy = d.y * K, r = Math.max(d.r * 2.2, Math.sqrt(g.length * CELL * CELL * 0.866 / Math.PI) * 1.12 + 40); radius[k] = r;
    // spiral of hex cells from the centre outward
    const cells = hexSpiral(g.length, CELL);
    g.forEach((i, n) => { pos[i * 2] = cx + cells[n * 2]; pos[i * 2 + 1] = cy + cells[n * 2 + 1]; });
  });
  S.pos = pos; S.radius = radius;
}
const spiralCache = {};
function hexSpiral(n, s) {
  if (spiralCache[n]) return spiralCache[n];
  const out = [], rows = Math.ceil(Math.sqrt(n)) + 4, cand = [];
  for (let q = -rows; q <= rows; q++) for (let r = -rows; r <= rows; r++) { const x = s * (q + r / 2), y = s * r * 0.866; cand.push([x * x + y * y, x, y]); }
  cand.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  for (let k = 0; k < n; k++) out.push(cand[k][1], cand[k][2]);
  return (spiralCache[n] = out);
}

// ------------------------------------------------------------------ chart rendering
const cv = $("#chart"), cx = cv.getContext("2d");
function resize() { const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); S.dpr = dpr; }
addEventListener("resize", () => { resize(); render(); });
function fit() { resize(); const r = cv.getBoundingClientRect(); S.scale = Math.min(r.width / 9400, r.height / 6600); S.x = r.width / 2 - 4600 * S.scale; S.y = r.height / 2 - 3300 * S.scale; }
let blobCache = {};
function blob(k, r) {
  const key = k + ":" + Math.round(r); if (blobCache[key]) return blobCache[key];
  const pts = []; for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2, n = 1 + 0.08 * Math.sin(t * 3 + k) + 0.05 * Math.sin(t * 7 + k * 2); pts.push([Math.cos(t) * r * n, Math.sin(t) * r * n]); }
  return (blobCache[key] = pts);
}
let tAnim = 0;
function render() {
  if (!w || !S.pos) return;
  const r = cv.getBoundingClientRect(), A = w.A, sc = S.scale;
  cx.clearRect(0, 0, r.width, r.height);
  cx.save(); cx.translate(S.x, S.y); cx.scale(sc, sc);
  // islands
  DISTRICTS.forEach((d, k) => {
    const R = S.radius[k] + 60, pts = blob(k, R);
    cx.beginPath(); pts.forEach(([x, y], n) => (n ? cx.lineTo(d.x * K + x, d.y * K + y) : cx.moveTo(d.x * K + x, d.y * K + y))); cx.closePath();
    cx.fillStyle = d.kind === "pyra" ? "#2a1610" : d.kind === "asphodel" ? "#1c2230" : d.kind === "grove" ? "#14281c" : d.key === "eridanus" ? "#1f2a12" : "#1b2a40"; cx.fill();
    cx.lineWidth = 6 / Math.max(sc, 0.05) * 0.15; cx.strokeStyle = "#2c4266"; cx.stroke();
  });
  // pyre glow
  const pd = DISTRICTS[D.pyra], fl = 0.6 + 0.4 * Math.sin(tAnim / 220) * Math.sin(tAnim / 97);
  const grd = cx.createRadialGradient(pd.x * K, pd.y * K, 10, pd.x * K, pd.y * K, S.radius[D.pyra] + 140);
  grd.addColorStop(0, `rgba(255,170,60,${0.55 * fl})`); grd.addColorStop(1, "rgba(255,80,20,0)"); cx.fillStyle = grd; cx.beginPath(); cx.arc(pd.x * K, pd.y * K, S.radius[D.pyra] + 140, 0, 7); cx.fill();
  // characters
  const vx0 = -S.x / sc - 30, vy0 = -S.y / sc - 30, vx1 = (r.width - S.x) / sc + 30, vy1 = (r.height - S.y) / sc + 30, big = sc * 20 >= 6;
  for (let i = 0; i < w.N; i++) {
    const x = S.pos[i * 2], y = S.pos[i * 2 + 1]; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    const st = A.status[i];
    if (st === ST.asphodel) { cx.fillStyle = "#c9c3b4"; cx.fillRect(x - 6, y - 9, 12, 16); cx.fillStyle = "#6e6a62"; cx.fillRect(x - 1, y - 16, 2, 9); continue; }   // headstone + oar
    cx.globalAlpha = st === ST.shade ? 0.28 : st === ST.exiled ? 0.5 : 1;
    if (big) { const [sx, sy] = spriteAt(i); cx.imageSmoothingEnabled = false; cx.drawImage(sprites.canvas, sx, sy, 24, 24, x - 10, y - 10, 20, 20); }
    else { cx.fillStyle = w.factions[A.faction[i]].color; cx.fillRect(x - 9, y - 9, 18, 18); }
    if (st === ST.pyre) { cx.globalAlpha = 0.5 + 0.5 * fl; cx.fillStyle = "#ff7a1a"; cx.beginPath(); cx.moveTo(x - 10, y + 10); cx.quadraticCurveTo(x, y - 30 * fl, x + 10, y + 10); cx.fill(); }
    if (i === S.sel || i === S.hover) { cx.globalAlpha = 1; cx.strokeStyle = "#e3b341"; cx.lineWidth = 3; cx.strokeRect(x - 12, y - 12, 24, 24); }
  }
  cx.globalAlpha = 1;
  // labels
  DISTRICTS.forEach((d, k) => {
    const n = countIn(k), fs = Math.max(13, 15) / sc;
    cx.font = `700 ${fs}px "Cormorant Garamond", serif`; cx.textAlign = "center"; cx.fillStyle = "#e9e1cfcc";
    cx.fillText(d.name, d.x * K, d.y * K - S.radius[k] - 70 - fs * 0.2);
    cx.font = `${fs * 0.75}px "IBM Plex Mono", monospace`; cx.fillStyle = "#9aa4b5cc"; cx.fillText(labelCount(k, n), d.x * K, d.y * K - S.radius[k] - 70 + fs * 0.75);
  });
  cx.restore();
}
function countIn(k) { let n = 0; for (let i = 0; i < w.N; i++) if (w.A.district[i] === k) n++; return n; }
function labelCount(k, n) { const d = DISTRICTS[k]; if (d.kind === "pyra") return `${n} burning`; if (d.kind === "asphodel") { let a = 0; for (let i = 0; i < w.N; i++) if (w.A.status[i] === ST.asphodel) a++; return `${a} graves · ${n - a} shades`; } return `${n} souls`; }
function frame(t) { tAnim = t; const pd = DISTRICTS[D.pyra]; if (inView(pd.x * K, pd.y * K)) render(); setTimeout(() => requestAnimationFrame(frame), 90); }
const inView = (x, y) => { const r = cv.getBoundingClientRect(), sx = x * S.scale + S.x, sy = y * S.scale + S.y; return sx > -300 && sy > -300 && sx < r.width + 300 && sy < r.height + 300; };

// ------------------------------------------------------------------ interaction
let drag = null, pinch = null;
cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, sx: S.x, sy: S.y, moved: false }; cv.classList.add("drag"); });
cv.addEventListener("pointermove", (e) => {
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; S.x = drag.sx + dx; S.y = drag.sy + dy; render(); return; }
  const i = pick(e); if (i !== S.hover) { S.hover = i; render(); }
  const tip = $("#tip"); if (i >= 0) { const b = cv.getBoundingClientRect(); tip.style.display = "block"; tip.style.left = Math.min(e.clientX - b.left + 14, b.width - 260) + "px"; tip.style.top = e.clientY - b.top + 14 + "px"; tip.textContent = `${view.name(i)} · ${view.faction(i)}`; } else tip.style.display = "none";
});
cv.addEventListener("pointerup", (e) => { cv.classList.remove("drag"); if (drag && !drag.moved) { const i = pick(e); if (i >= 0) openLegends(i); } drag = null; });
cv.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.18 : 1 / 1.18); }, { passive: false });
cv.addEventListener("touchstart", (e) => { if (e.touches.length === 2) { drag = null; pinch = dist(e); } }, { passive: true });
cv.addEventListener("touchmove", (e) => { if (e.touches.length === 2 && pinch) { const d = dist(e), b = cv.getBoundingClientRect(); const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - b.left, my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - b.top; zoomAt(mx, my, d / pinch); pinch = d; } }, { passive: true });
const dist = (e) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
function zoomAt(px, py, f) { const ns = Math.max(0.03, Math.min(3, S.scale * f)); S.x = px - (px - S.x) * ns / S.scale; S.y = py - (py - S.y) * ns / S.scale; S.scale = ns; render(); }
$("#zin").onclick = () => { const b = cv.getBoundingClientRect(); zoomAt(b.width / 2, b.height / 2, 1.5); };
$("#zout").onclick = () => { const b = cv.getBoundingClientRect(); zoomAt(b.width / 2, b.height / 2, 1 / 1.5); };
$("#zfit").onclick = () => { fit(); render(); };
function pick(e) {
  const b = cv.getBoundingClientRect(), x = (e.clientX - b.left - S.x) / S.scale, y = (e.clientY - b.top - S.y) / S.scale; let best = -1, bd = 14 * 14;
  for (let i = 0; i < w.N; i++) { const dx = S.pos[i * 2] - x, dy = S.pos[i * 2 + 1] - y, d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = i; } }
  return best;
}
function focus(i) { const b = cv.getBoundingClientRect(); S.scale = Math.max(S.scale, 0.9); S.x = b.width / 2 - S.pos[i * 2] * S.scale; S.y = b.height / 2 - S.pos[i * 2 + 1] * S.scale; S.sel = i; render(); }

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
