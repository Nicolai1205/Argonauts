// The Argo: live viewer. Loads the latest checkpoint, catches the world up to the current hour in the browser
// (same engine as the hourly GitHub job, so it is the same world), and draws it.
import { deserialize, runUntil, omensByDay, dayNow, stateHash } from "./sim/engine.js";
import { narrate, nameOf, displayName, VOICE } from "./sim/narrate.js";
import { homeFaction, ageOf, YEAR } from "./sim/systems.js";
import { BLOODS, DISTRICTS, D, GOODS, JOBS, OFFICES, COGNOMENS, THOUGHTS, AXES, ST, GENESIS, PREHISTORY_DAYS } from "./sim/lore.js";
import { TIES, THS, BIO, VERSION } from "./sim/world.js";
import { EV } from "./sim/systems.js";
import { generate, paint, SITES, SIZE, TILE } from "./map.js";
import { sift, emptySift } from "./sim/sift.js";
import { dateOf, MONTHS } from "./sim/culture.js";
import { CITIES } from "./sim/war.js";
import { CRAFTS } from "./sim/drift.js";
import { renderCodex } from "./codex.js";
import { portrait, loadArt } from "./portrait.js";
import { biography } from "./biography.js";
import { poem, dawn, cityForm } from "./sim/poetics.js";
import { figure, lookOf } from "./figures.js";
import { hash32 } from "./sim/rng.js";

const $ = (s) => document.querySelector(s), esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const gunzip = async (url) => { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error(url + " " + r.status); return new Response(r.body.pipeThrough(new DecompressionStream("gzip"))); };
const json = async (url) => { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error(url + " " + r.status); return r.json(); };
const NFT = "0x387c41b0b2f1128de44db1bcf8baad085f26392c";

let seed, w, meta, sprites, checkpointDay, provisional = [], chron = [], byDay = {}, M = emptySift();
const S = { scale: 0.12, x: 0, y: 0, hover: -1, pos: null, sel: -1 };

// ------------------------------------------------------------------ boot
(async function boot() {
  try {
    [seed, meta] = await Promise.all([json("data/seed.json"), json("world/meta.json")]);
    const [stTxt, fleet, omens, sm] = await Promise.all([(await gunzip("world/state.json.gz")).text(), (await gunzip("data/fleet.bin.gz")).arrayBuffer(), json("world/omens.json").catch(() => []), json("world/sift.json").catch(() => null)]);
    if (sm) M = sm;
    const raw = JSON.parse(stTxt); if (raw.version !== VERSION) throw new Error("the world is being re-dreamed under new rules; try again in a minute");
    w = deserialize(raw, seed); checkpointDay = w.day; displayName.dialects = w.dialect;
    sprites = buildAtlas(new Uint8Array(fleet));
    byDay = omensByDay(omens.filter((o) => (o.ad ?? 0) >= checkpointDay - 1));
    // cross-engine determinism check (tools/xengine.mjs): ?xtest=N runs N days from the checkpoint and publishes the hash
    const xt = Number(new URLSearchParams(location.search).get("xtest") || 0);
    if (xt > 0) { runUntil(w, checkpointDay + xt, byDay); window.__xtest = stateHash(w); document.title = "XTEST " + window.__xtest; $("#loading").textContent = "xtest " + window.__xtest; return; }
    const last = meta.chunks.at(-1), prev = meta.chunks.at(-2);
    for (const k of [prev, last]) if (k !== undefined) chron.push(...await json(`world/chronicle/c${k}.json`).catch(() => []));
    // paint the checkpoint at once; replay the missed days in a worker when there are more than a couple
    const ahead = Math.min(dayNow(Date.now() / 1000) + 1, checkpointDay + 48) - w.day;
    if (ahead <= 2) catchUp();
    layout(); fit(); render(); panels();
    $("#loading").remove();
    setInterval(liveTick, 15000); requestAnimationFrame(frame); loadArt(); route(); addEventListener("hashchange", route);
    if (ahead > 2) { S.catching = true; $("#dawn").textContent = `catching up ${ahead} days…`;
      workerCatchUp(stTxt, omens.filter((o) => (o.ad ?? 0) >= checkpointDay - 1)).then((ok) => { S.catching = false; if (!ok) catchUp(); layout(); panels(); flash(); }); }
  } catch (e) { $("#loading").textContent = "The sea is fogged: " + e.message; console.error(e); }
})();

const view = {
  name: (i) => displayName(w.A, i, COGNOMENS),
  faction: (i) => w.factions[w.A.faction[i]].name,
  blood: (i) => w.factions[homeFaction(w, i)].name,
  world: () => w,
};
function catchUp() {
  const target = Math.min(dayNow(Date.now() / 1000) + 1, checkpointDay + 48); if (w.day >= target) return false;   // a long outage: show the last 48 hours, not a frozen page
  runUntil(w, target, byDay, (d, ev) => { for (const e of ev) if (!e.h) provisional.push({ ...e, text: narrate(e, view), voice: VOICE[e.t] || "realism", prov: true }); for (const st of sift(M, d, ev, w, view.name)) st.prov = true; });
  return true;
}
function liveTick() { if (!S.catching && catchUp()) { layout(); panels(); flash(); } updateClock(); }
/** replay in a module worker; resolves false if workers are unavailable so the caller can fall back to the main thread */
function workerCatchUp(stTxt, omens) {
  return new Promise((resolve) => {
    let wk; try { wk = new Worker(new URL("./catchup.worker.js" + new URL(import.meta.url).search, import.meta.url), { type: "module" }); } catch (e) { resolve(false); return; }
    const target = Math.min(dayNow(Date.now() / 1000) + 1, checkpointDay + 48);
    wk.onmessage = (m) => { wk.terminate(); if (!m.data.ok) { console.error(m.data.error); resolve(false); return; }
      const sel = S.sel; w = deserialize(JSON.parse(m.data.state), seed); displayName.dialects = w.dialect; provisional = m.data.provisional; M = m.data.M; S.sel = sel; resolve(true); };
    wk.onerror = (e) => { console.error(e); wk.terminate(); resolve(false); };
    wk.postMessage({ stTxt, seed, omens, target, M });
  });
}
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
const RIVERS = (() => { const p = new Path2D(); for (const [a, b] of MAP.rivers) { p.moveTo((a % SIZE) * TILE + TILE / 2, Math.floor(a / SIZE) * TILE + TILE / 2); p.lineTo((b % SIZE) * TILE + TILE / 2, Math.floor(b / SIZE) * TILE + TILE / 2); } return p; })();
// sea lanes as point lists, for ships
const ROUTE = {}; MAP.roads.forEach((r) => { const pts = r.path.map(([x, y]) => [x * TILE + TILE / 2, y * TILE + TILE / 2]); ROUTE[r.a + ">" + r.b] = pts; ROUTE[r.b + ">" + r.a] = pts.slice().reverse(); });
const routeOf = (a, b) => ROUTE[DISTRICTS[a].key + ">" + DISTRICTS[b].key] || [[SITE[a].x, SITE[a].y], [SITE[b].x, SITE[b].y]];
const along = (pts, u) => { const t = Math.max(0, Math.min(0.999, u)) * (pts.length - 1), k = Math.floor(t), f = t - k, [x0, y0] = pts[k], [x1, y1] = pts[k + 1] || pts[k]; return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]; };
const LANES = MAP.roads.map((r) => r.path.filter((p) => p[2]).map(([x, y]) => [x * TILE + TILE / 2, y * TILE + TILE / 2])).filter((l) => l.length > 6);

// ------------------------------------------------------------------ cities: streets, houses by household, workplaces, venues
const LOT = 26, SPEED = 30000;                          // world units per lot; walking speed in world units per sim day
const tileAt = (x, y) => MAP.biome[Math.max(0, Math.min(SIZE - 1, Math.floor(y / TILE))) * SIZE + Math.max(0, Math.min(SIZE - 1, Math.floor(x / TILE)))];
function nearestTile(cx0, cy0, pred, maxR) {
  const tx = Math.floor(cx0 / TILE), ty = Math.floor(cy0 / TILE);
  for (let r = 1; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
    if (pred(MAP.biome[y * SIZE + x])) return [x * TILE + TILE / 2, y * TILE + TILE / 2];
  }
  return null;
}
const WET = (b) => b === "sea" || b === "shallow" || b === "coral" || b === "deep";
function layout() {
  const A = w.A, N = w.N, home = new Float32Array(N * 2), city = [];
  const groups = DISTRICTS.map(() => []); for (let i = 0; i < N; i++) groups[A.district[i]].push(i);
  DISTRICTS.forEach((d, k) => {
    const c = SITE[k], g = groups[k];
    if (d.kind === "asphodel") {
      const graves = g.filter((i) => A.status[i] === ST.asphodel).sort((a, b) => (a < 9999 ? 0 : 1) - (b < 9999 ? 0 : 1) || A.died[a] - A.died[b] || a - b), rest = g.filter((i) => A.status[i] !== ST.asphodel), cols = Math.max(12, Math.ceil(Math.sqrt(graves.length) * 1.6));
      graves.forEach((i, n) => { home[i * 2] = c.x - cols * 9 + (n % cols) * 18; home[i * 2 + 1] = c.y - 40 + Math.floor(n / cols) * 22; });
      rest.forEach((i) => { const a = (hash32("sh", i) % 6283) / 1000, r = 60 + hash32("sr", i) % 140; home[i * 2] = c.x + Math.cos(a) * r; home[i * 2 + 1] = c.y + 60 + Math.sin(a) * r * 0.6; });
      city[k] = { R: 200, houses: [], venues: {} }; return;
    }
    if (d.kind === "pyra") { g.forEach((i, n) => { const a = n * 2.4; home[i * 2] = c.x + Math.cos(a) * 12 * Math.min(1, n); home[i * 2 + 1] = c.y + Math.sin(a) * 8 * Math.min(1, n); }); city[k] = { R: 60, houses: [], venues: {} }; return; }
    // households: members of the same wallet live together, up to five to a house; richer houses near the agora
    const dwellers = g.filter((i) => A.status[i] === ST.living || A.status[i] === ST.exiled).sort((a, b) => A.oikos[a] - A.oikos[b] || a - b);
    const hh = []; let cur = null;
    for (const i of dwellers) { if (!cur || A.oikos[cur[0]] !== A.oikos[i] || cur.length >= 5) { cur = [i]; hh.push(cur); } else cur.push(i); }
    const wealth = (h) => h.reduce((s, i) => s + A.obols[i], 0); hh.sort((a, b) => wealth(b) - wealth(a) || a[0] - b[0]);
    // lots on a street grid (every 4th row and column is a street), spiralling out from the agora
    const need = hh.length + 12, side = Math.ceil(Math.sqrt(need * 1.6)) + 4, lots = [];
    for (let gy = -side; gy <= side; gy++) for (let gx = -side; gx <= side; gx++) { if (gx % 4 === 0 || gy % 4 === 0) continue; if (Math.abs(gx) <= 1 && Math.abs(gy) <= 1) continue; lots.push([gx * gx + gy * gy + (hash32("lot", k, gx, gy) % 100) / 200, gx * LOT, gy * LOT]); }
    lots.sort((a, b) => a[0] - b[0]);
    const venues = { market: [c.x, c.y], temple: [c.x, c.y - LOT * 2.5] }, houses = [];
    let li = 0; const take = () => { const L = lots[li++]; return [c.x + L[1], c.y + L[2]]; };
    venues.gaol = take(); venues.workshop = take(); const nt = Math.max(1, Math.round(dwellers.length / 160)); venues.taverns = []; for (let t = 0; t < nt; t++) { li += 3; venues.taverns.push(take()); }
    li = 2; const used = new Set([0, 1]); const taken = new Set(); [venues.gaol, venues.workshop, ...venues.taverns].forEach((v) => taken.add(v.join()));
    let R = LOT * 3;
    for (const h of hh) {
      let pos; do { pos = take(); } while (taken.has(pos.join()));
      houses.push({ x: pos[0], y: pos[1], f: A.faction[h[0]], n: h.length });
      h.forEach((i, m) => { home[i * 2] = pos[0] - 6 + (m % 3) * 6; home[i * 2 + 1] = pos[1] + 4; });
      R = Math.max(R, Math.hypot(pos[0] - c.x, pos[1] - c.y));
    }
    for (const i of g) if (A.status[i] === ST.shade) { home[i * 2] = c.x; home[i * 2 + 1] = c.y; }
    R += LOT;
    venues.docks = nearestTile(c.x, c.y, WET, Math.ceil(R / TILE) + 8);
    venues.shore = nearestTile(c.x, c.y, (b) => b === "beach" || b === "coral", Math.ceil(R / TILE) + 10) || venues.docks;
    venues.mine = nearestTile(c.x, c.y, (b) => b === "mountain" || b === "hills" || b === "snow", 30);
    venues.wild = nearestTile(c.x, c.y, (b) => b === "forest" || b === "darkforest" || b === "flowers" || b === "grass", Math.ceil(R / TILE) + 6);
    city[k] = { R, houses, venues };
  });
  S.home = home; S.city = city; S.cur = new Float32Array(N * 2); S.frame = new Uint8Array(N); S.vis = new Uint8Array(N);
  S.looks = []; for (let i = 0; i < N; i++) S.looks.push(figure(lookOf(seed, A, i, JOBS[A.job[i]], w.factions[A.faction[i]].color, stageOf(i))));
  S.lookDay = w.day;
  plans();
}

// ------------------------------------------------------------------ everyone's day: rooted in the sim (job, today's encounter, beloved, sickness, gaol, hunger)
function plans() {
  const A = w.A, N = w.N, P = new Float32Array(N * 12);   // [wake, atWork, leaveWork, atEve, leaveEve, atHome] + work xy, eve xy, flags
  S.plan = P; S.planFlags = new Uint8Array(N); S.eveWith = new Int32Array(N).fill(-1); S.where = new Array(N);
  for (let i = 0; i < N; i++) {
    if (A.status[i] !== ST.living) continue;
    const k = A.district[i], c = SITE[k], C = S.city[k], V = C.venues || {}, job = JOBS[A.job[i]], h = hash32("day", i, w.day), u = (n) => ((h >>> n) & 1023) / 1023;
    const hx = S.home[i * 2], hy = S.home[i * 2 + 1], ang = (A.job[i] * 0.83 + u(3) * 0.9);
    const ring = (rad) => [c.x + Math.cos(ang) * rad, c.y + Math.sin(ang) * rad];
    // where the work is
    let wk, desc;
    if (A.jail[i]) { wk = V.gaol || [c.x, c.y]; desc = "sits in the gaol"; }
    else if (A.sick[i]) { wk = [hx, hy]; desc = "lies sick at home"; }
    else if (A.kind[i] && stageOf(i) === 0) { wk = [hx + (u(5) - 0.5) * 8, hy + 6]; desc = "is carried about the house"; }
    else if (A.kind[i] && stageOf(i) === 1) { wk = [hx + (u(5) - 0.5) * 70, hy + (u(7) - 0.5) * 50]; desc = "plays in the street and learns the family trade"; }
    else if (A.hunger[i] > 1) { wk = [c.x + (u(5) - 0.5) * 60, c.y + (u(7) - 0.5) * 40]; desc = "begs in the market"; }
    else if (job === "farmer" || job === "grower" || job === "herbalist") { wk = ring(C.R + 40 + u(1) * 220); desc = job === "herbalist" ? "gathers herbs in the meadows" : job === "grower" ? "tends the smoke-leaf fields" : "works the fields"; }
    else if (job === "fisher" || job === "rower" || job === "pirate") { const d0 = V.docks || ring(C.R + 60); wk = [d0[0] + (u(2) - 0.5) * 120, d0[1] + (u(4) - 0.5) * 120]; desc = job === "pirate" ? "lurks at the docks" : job === "rower" ? "pulls an oar in the harbour" : "fishes off the docks"; }
    else if (job === "miner") { const m0 = V.mine || ring(C.R + 200); wk = [m0[0] + (u(2) - 0.5) * 160, m0[1] + (u(4) - 0.5) * 160]; desc = "digs in the mountain"; }
    else if (job === "weaver") { wk = [V.workshop[0] + (u(2) - 0.5) * 30, V.workshop[1] + (u(4) - 0.5) * 20]; desc = "weaves in the workshop"; }
    else if (job === "priest" || job === "augur") { wk = [V.temple[0] + (u(2) - 0.5) * 40, V.temple[1] + (u(4) - 0.5) * 20]; desc = job === "augur" ? "reads the birds from the temple steps" : "keeps the temple"; }
    else if (job === "merchant") { wk = [c.x + (u(2) - 0.5) * 70, c.y + (u(4) - 0.5) * 50]; desc = "sells in the market"; }
    else if (job === "reaper") { wk = ring(C.R + 10); desc = "walks the watch around the walls"; S.planFlags[i] |= 4; }
    else if (job === "servant") { const H = C.houses[u(6) * Math.min(20, C.houses.length) | 0]; wk = H ? [H.x + 8, H.y + 4] : [hx, hy]; desc = "serves in a great house"; }
    else if (job === "noble") { wk = [c.x + (u(2) - 0.5) * 50, c.y - 20 + (u(4) - 0.5) * 30]; desc = "holds court in the agora"; }
    else { wk = ring(C.R + 50); desc = "works outside the walls"; }
    // where the evening goes: the beloved, today's encounter, temperament
    let ev = [hx, hy], comp = -1, edesc = "stays home";
    const lover = A.lover[i], met = A.met[i], X = A.pers[i * 6 + 2], gods = A.ideo[i * 3 + 2];
    const tav = (a, b) => { const T = V.taverns || [[c.x, c.y]]; return T[hash32("tav", Math.min(a, b), Math.max(a, b)) % T.length]; };
    if (A.kind[i] && stageOf(i) <= 1) { ev = [hx + (u(8) - 0.5) * 10, hy + 5]; edesc = "is put to bed early"; }
    else if (A.jail[i] || A.sick[i]) { ev = wk; edesc = A.jail[i] ? "stays there through the night" : "does not rise all day"; }
    else if (lover >= 0 && A.status[lover] === ST.living && A.district[lover] === k) { const host = Math.min(i, lover); ev = [S.home[host * 2] + (i === host ? -5 : 5), S.home[host * 2 + 1] + 6]; comp = lover; edesc = "spends the evening with their beloved"; }
    else if (met >= 0 && A.status[met] === ST.living && A.district[met] === k) { const t = tav(i, met), kind = A.metKind[i]; ev = [t[0] + (i < met ? -5 : 5), t[1] + 8]; comp = met; edesc = kind === 1 ? "talks deep into the night with" : kind === 2 ? "shares a cup with" : kind === 3 ? "argues with" : "trades insults with"; }
    else if (X > 62) { const t = tav(i, i); ev = [t[0] + (u(8) - 0.5) * 30, t[1] + 8 + (u(9) - 0.5) * 16]; edesc = "drinks at the tavern"; }
    else if (gods > 35) { ev = [V.temple[0] + (u(8) - 0.5) * 40, V.temple[1] + 14]; edesc = "prays at the temple"; }
    else if (X < 38 && V.shore) { ev = [V.shore[0] + (u(8) - 0.5) * 80, V.shore[1] + (u(9) - 0.5) * 80]; edesc = "walks alone by the shore"; }
    else if (X < 45 && V.wild) { ev = [V.wild[0] + (u(8) - 0.5) * 80, V.wild[1] + (u(9) - 0.5) * 80]; edesc = "wanders in the wild"; }
    else { ev = [c.x + (u(8) - 0.5) * 120, c.y + (u(9) - 0.5) * 80]; edesc = "idles in the agora"; }
    // personal rhythm: the conscientious rise early, the sociable stay out late, pirates and half the Reapers work nights
    const Cn = A.pers[i * 6 + 4], night = job === "pirate" || (job === "reaper" && (i & 1));
    const wake = 0.16 + (60 - Cn) / 900 + u(10) * 0.04, d1 = Math.hypot(wk[0] - hx, wk[1] - hy) / SPEED, d2 = Math.hypot(ev[0] - wk[0], ev[1] - wk[1]) / SPEED, d3 = Math.hypot(hx - ev[0], hy - ev[1]) / SPEED;
    const leave = 0.56 + u(11) * 0.05, bed = 0.8 + (X - 50) / 600 + u(12) * 0.03;
    const t = [wake, wake + Math.min(0.08, d1), leave, leave + Math.min(0.08, d2), bed, bed + Math.min(0.08, d3)];
    if (night) for (let q = 0; q < 6; q++) t[q] = (t[q] + 0.5) % 1;
    P.set([...t, wk[0], wk[1], ev[0], ev[1], hx, hy], i * 12);
    if (night) S.planFlags[i] |= 1;
    S.eveWith[i] = comp; S.where[i] = { work: desc, eve: edesc };
  }
  S.planDay = w.day;
  if (S.lookDay !== w.day) { for (let i = 0; i < w.N; i++) S.looks[i] = figure(lookOf(seed, A, i, JOBS[A.job[i]], w.factions[A.faction[i]].color, stageOf(i))); S.lookDay = w.day; }
}
const stageOf = (i) => { const a = ageOf(w.A, i, w.day); return a < 5 ? 0 : a < 14 ? 1 : a < 60 ? 2 : 3; };
const ease = (t) => t * t * (3 - 2 * t);
function positions(now) {
  const A = w.A, f0 = (((now - GENESIS) % 3600) + 3600) % 3600 / 3600, Pp = S.plan, out = S.cur;
  if (S.planDay !== w.day) plans();
  for (let i = 0; i < w.N; i++) {
    const st = A.status[i], hx = S.home[i * 2], hy = S.home[i * 2 + 1]; let x = hx, y = hy, fr = 4, vis = 1;
    if (st === ST.shade) { const a = now / 9 + i; x = hx + Math.cos(a) * 8; y = hy + Math.sin(a * 0.7) * 5; }
    else if (st === ST.living) {
      const b = i * 12, t = Pp, night = S.planFlags[i] & 1; let f = f0; if (night) f = (f0 + 0.5) % 1;
      const T = night ? [0, 1, 2, 3, 4, 5].map((q) => (t[b + q] + 0.5) % 1) : [t[b], t[b + 1], t[b + 2], t[b + 3], t[b + 4], t[b + 5]];
      const wx = t[b + 6], wy = t[b + 7], ex = t[b + 8], ey = t[b + 9];
      const go = (ax, ay, bx, by, s, e) => { const k = e > s ? ease(Math.min(1, (f - s) / (e - s))) : 1; x = ax + (bx - ax) * k; y = ay + (by - ay) * k; fr = Math.floor(now * 6 + i) % 4; };
      if (f < T[0] || f >= T[5]) { vis = A.sick[i] ? 1 : 0; }                              // asleep indoors
      else if (f < T[1]) go(hx, hy, wx, wy, T[0], T[1]);
      else if (f < T[2]) { x = wx; y = wy; if (S.planFlags[i] & 4) { const a = f * 40 + i; x = SITE[A.district[i]].x + Math.cos(a) * (S.city[A.district[i]].R + 10); y = SITE[A.district[i]].y + Math.sin(a) * (S.city[A.district[i]].R + 10); fr = Math.floor(now * 4 + i) % 4; } else { x += Math.sin(now / 2 + i) * 2; } }
      else if (f < T[3]) go(wx, wy, ex, ey, T[2], T[3]);
      else if (f < T[4]) { x = ex + Math.sin(now / 4 + i) * 2; y = ey; }
      else go(ex, ey, hx, hy, T[4], T[5]);
    }
    out[i * 2] = x; out[i * 2 + 1] = y; S.frame[i] = fr; S.vis[i] = vis;
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
  const r = cv.getBoundingClientRect(), A = w.A, now = Date.now() / 1000, f = positions(now);
  if (S.follow >= 0) { const tx = r.width / 2 - S.cur[S.follow * 2] * S.scale, ty = r.height / 2 - (S.cur[S.follow * 2 + 1] - 8) * S.scale; S.x += (tx - S.x) * 0.2; S.y += (ty - S.y) * 0.2; S.sel = S.follow; }
  const sc = S.scale;
  cx.fillStyle = "#0b1a33"; cx.fillRect(0, 0, r.width, r.height);
  cx.save(); cx.translate(S.x, S.y); cx.scale(sc, sc);
  cx.imageSmoothingEnabled = false; cx.drawImage(TERRAIN, 0, 0, SIZE, SIZE, 0, 0, WORLD, WORLD);
  // rivers
  cx.strokeStyle = "#2f6a9a"; cx.lineWidth = Math.max(5, 1.4 / sc); cx.lineCap = "round"; cx.stroke(RIVERS);
  // seasons: winter whitens the land, high summer bleaches it
  { const month = Math.floor(((w.day % 360) + 360) % 360 / 30), wint = month === 10 || month === 11 || month === 0 ? (month === 11 ? 0.22 : 0.12) : 0, summer = month >= 4 && month <= 6 ? 0.06 : 0;
    if (wint) { cx.fillStyle = `rgba(235,240,250,${wint})`; cx.fillRect(0, 0, WORLD, WORLD); } if (summer) { cx.fillStyle = `rgba(255,220,140,${summer})`; cx.fillRect(0, 0, WORLD, WORLD); } }
  // roads and sea lanes
  cx.lineCap = "round"; cx.lineJoin = "round";
  for (const R of ROADS) { cx.strokeStyle = "#a08a62"; cx.lineWidth = Math.max(5, 1.6 / sc); cx.stroke(R.land); cx.setLineDash([18, 22]); cx.strokeStyle = "#9fc3e6aa"; cx.lineWidth = Math.max(3, 1.2 / sc); cx.stroke(R.sea); cx.setLineDash([]); }
  // cities: paved ground, houses (roof tinted by the household's faction), venues
  const night = f < 0.18 || f >= 0.84;
  DISTRICTS.forEach((d, k) => {
    const C = S.city[k]; if (!C || !C.houses.length) return; const c = SITE[k];
    cx.fillStyle = "rgba(70,60,48,.6)"; cx.beginPath(); cx.arc(c.x, c.y, C.R + 6, 0, 6.283); cx.fill(); cx.strokeStyle = "rgba(205,190,150,.55)"; cx.lineWidth = Math.max(3, 1 / sc); cx.stroke();
    if (sc < 0.12) return;
    for (const H of C.houses) { cx.fillStyle = "#4a3f33"; cx.fillRect(H.x - 10, H.y - 8, 20, 16); cx.fillStyle = w.factions[H.f].color; cx.globalAlpha = 0.55; cx.fillRect(H.x - 10, H.y - 8, 20, 5); cx.globalAlpha = 1;
      if (night) { cx.fillStyle = "rgba(255,196,100,.9)"; cx.fillRect(H.x - 2, H.y, 4, 4); } }
    const V = C.venues, box = (p, col, wd, ht) => { cx.fillStyle = col; cx.fillRect(p[0] - wd / 2, p[1] - ht / 2, wd, ht); };
    box(V.market, "#8c7650", 46, 30); box(V.temple, "#e9e1cf", 40, 18); cx.fillStyle = "#b8b0a0"; for (let q = -2; q <= 2; q++) cx.fillRect(V.temple[0] + q * 8 - 1.5, V.temple[1] - 9, 3, 18);
    box(V.gaol, "#25252b", 20, 16); box(V.workshop, "#6b5a46", 24, 16); for (const T of V.taverns) { box(T, "#9a5b2a", 22, 16); if (night) box(T, "rgba(255,170,70,.9)", 6, 6); }
    w.faiths.forEach((F, fk) => { if (!F.alive || !F.templeBuilt || F.temple !== k) return; const tx = V.temple[0] + (fk % 4 - 1.5) * 34, ty = V.temple[1] - 26 - Math.floor(fk / 4) * 22; cx.fillStyle = F.color; cx.fillRect(tx - 12, ty - 6, 24, 12); cx.fillStyle = "#0b1220"; cx.fillRect(tx - 9, ty - 2, 3, 8); cx.fillRect(tx - 1.5, ty - 2, 3, 8); cx.fillRect(tx + 6, ty - 2, 3, 8); });
    (w.monuments || []).forEach((m, mk) => { if (m.district !== k) return; const mx = c.x + 50 + (mk % 5) * 16, my = c.y + 34; if (m.standing) { cx.fillStyle = "#e9e1cf"; cx.fillRect(mx - 3, my - 16, 6, 18); cx.fillStyle = "#b8b0a0"; cx.fillRect(mx - 5, my, 10, 3); } else { cx.fillStyle = "#8a8478"; cx.fillRect(mx - 8, my - 2, 7, 4); cx.fillRect(mx + 1, my, 6, 3); } });
    if (V.docks) { cx.strokeStyle = "#8a6a44"; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(V.docks[0] - 20, V.docks[1]); cx.lineTo(V.docks[0] + 20, V.docks[1]); cx.stroke(); }
  });
  // weather: drought browns a district, a flood blues it; winter storms streak the sea
  if (w.dry) DISTRICTS.forEach((d, k) => { const c = SITE[k]; if (w.dry[k] >= 20) { cx.fillStyle = `rgba(160,110,50,${Math.min(0.35, 0.12 + w.dry[k] / 400)})`; cx.beginPath(); cx.arc(c.x, c.y, c.r * 1.25, 0, 6.283); cx.fill(); } else if (w.rain && w.rain[k] > 200) { cx.fillStyle = "rgba(80,140,220,.22)"; cx.beginPath(); cx.arc(c.x, c.y, c.r * 1.25, 0, 6.283); cx.fill(); } });
  if (w.storm === w.day - 1) { cx.strokeStyle = "rgba(200,220,255,.25)"; cx.lineWidth = Math.max(2, 1 / sc); for (let q = 0; q < 160; q++) { const x = (q * 977) % WORLD, y = (q * 571 + tAnim / 4) % WORLD; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - 30, y + 60); cx.stroke(); } }
  // beasts at their lairs, with the reach of their hunting
  for (const b of w.beasts || []) { if (!b.alive) continue; const c = SITE[b.lair]; const R = b.radius / 1000 * WORLD; cx.strokeStyle = `rgba(200,60,50,${0.15 + b.hunger / 300})`; cx.setLineDash([12, 18]); cx.lineWidth = Math.max(3, 1.5 / sc); cx.beginPath(); cx.arc(c.x, c.y, R, 0, 6.283); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle = "#c8463a"; cx.font = `${16 / sc}px serif`; cx.textAlign = "center"; cx.fillText(`☠ ${b.name}`, c.x, c.y + c.r + 30 / sc); }
  // colonies: the road from the old hearth to the new
  for (const col of (w.colonies || []).slice(-6)) { const a = SITE[col.from], b = SITE[col.to]; cx.strokeStyle = "rgba(127,180,255,.45)"; cx.setLineDash([6, 14]); cx.lineWidth = Math.max(3, 1.2 / sc); cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); cx.setLineDash([]); }
  // banners of lordship and lines of war
  for (const k of CITIES) { const L = w.war.lord[k]; if (L !== k) { cx.strokeStyle = "rgba(227,179,65,.55)"; cx.setLineDash([30, 20]); cx.lineWidth = Math.max(4, 2 / sc); cx.beginPath(); cx.moveTo(SITE[k].x, SITE[k].y); cx.lineTo(SITE[L].x, SITE[L].y); cx.stroke(); cx.setLineDash([]); } }
  for (const x of w.war.wars) { const a = SITE[x.a], b = SITE[x.target]; cx.strokeStyle = `rgba(224,90,70,${0.5 + 0.4 * Math.sin(tAnim / 300)})`; cx.lineWidth = Math.max(8, 3 / sc); cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; cx.fillStyle = "#e05a46"; cx.font = `${18 / sc}px serif`; cx.textAlign = "center"; cx.fillText("⚔", mx, my); }
  // ships on the sea lanes: fishers and rowers put out by day; black sails at night
  { const sailors = w.stats.length ? Math.min(40, Math.round((w.stats.at(-1).live || 0) / 400)) : 10, tday = (now / 3600 % 1);
    for (let k = 0; k < sailors; k++) { const L = LANES[k % LANES.length]; if (!L) break; const u = ((now / (90 + (k % 7) * 20)) + k * 0.137) % 1, p = Math.floor(u * (L.length - 1)), f = u * (L.length - 1) - p, [x0, y0] = L[p], [x1, y1] = L[p + 1] || L[p];
      const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, pirate = (night && k % 3 === 0); cx.fillStyle = "#5a3d22"; cx.beginPath(); cx.moveTo(x - 14, y); cx.lineTo(x + 14, y); cx.lineTo(x + 9, y + 6); cx.lineTo(x - 9, y + 6); cx.closePath(); cx.fill();
      cx.fillStyle = pirate ? "#111" : "#efe6cf"; cx.beginPath(); cx.moveTo(x, y - 20); cx.lineTo(x + 10, y - 2); cx.lineTo(x, y - 2); cx.closePath(); cx.fill(); } }
  // what happened today, drawn where it happened
  { const today = w.day - 1, evs = chron.concat(provisional).filter((e) => e.d === today);
    for (const e of evs) { if (e.x < 0 || !SITE[e.x]) continue; const c = SITE[e.x], R = (S.city[e.x] ? S.city[e.x].R : 120) + 40;
      if (e.t === "riot" || e.t === "iconoclasm") { for (let k = 0; k < 6; k++) { const a = k * 1.05 + tAnim / 900, rr = R * 0.5; const fx = c.x + Math.cos(a) * rr, fy = c.y + Math.sin(a) * rr * 0.6; const g = cx.createRadialGradient(fx, fy, 2, fx, fy, 60); g.addColorStop(0, `rgba(255,120,40,${0.5 + 0.3 * Math.sin(tAnim / 150 + k)})`); g.addColorStop(1, "rgba(255,80,20,0)"); cx.fillStyle = g; cx.beginPath(); cx.arc(fx, fy, 60, 0, 6.283); cx.fill(); } }
      if (e.t === "plague") { const g = cx.createRadialGradient(c.x, c.y, 10, c.x, c.y, R * 1.3); g.addColorStop(0, "rgba(120,200,90,.28)"); g.addColorStop(1, "rgba(120,200,90,0)"); cx.fillStyle = g; cx.beginPath(); cx.arc(c.x, c.y, R * 1.3, 0, 6.283); cx.fill(); }
      if (e.t === "battle") { for (let k = 0; k < 5; k++) { const sx = c.x + (k - 2) * 40, sy = c.y - R * 0.6 - ((tAnim / 40 + k * 37) % 120); cx.fillStyle = `rgba(90,90,90,${0.35 - ((tAnim / 40 + k * 37) % 120) / 400})`; cx.beginPath(); cx.arc(sx, sy, 30, 0, 6.283); cx.fill(); } }
      if (e.t === "festival") { for (let k = 0; k < 14; k++) { const a = k * 0.45, lx = c.x + Math.cos(a) * R * 0.7, ly = c.y + Math.sin(a) * R * 0.5; cx.fillStyle = `hsla(${(k * 40) % 360},90%,65%,${0.6 + 0.4 * Math.sin(tAnim / 200 + k)})`; cx.fillRect(lx - 4, ly - 4, 8, 8); } }
    }
    if (w.director.active && w.director.active.pall === w.day - 1) { cx.fillStyle = "rgba(0,0,0,.55)"; cx.fillRect(0, 0, WORLD, WORLD); } }
  // the Golden Fleece shines over the city that holds it
  if (w.quest) { const q = SITE[w.quest.city], R = (S.city[w.quest.city] ? S.city[w.quest.city].R : 120) + 70, gl = 0.35 + 0.15 * Math.sin(tAnim / 400);
    cx.strokeStyle = `rgba(242,193,78,${gl})`; cx.lineWidth = Math.max(14, 5 / sc); cx.beginPath(); cx.arc(q.x, q.y, R, 0, 6.283); cx.stroke();
    cx.fillStyle = "#f2c14e"; cx.font = `700 ${15 / sc}px "Cormorant Garamond", serif`; cx.textAlign = "center"; cx.fillText("✦ the Golden Fleece ✦", q.x, q.y + R + 24 / sc); }
  // caravans and war-bands on the roads and sea lanes
  { const simNow = (now - GENESIS) / 3600, GC = ["#d9b25c", "#9fbf6f", "#c7a6e0", "#9aa0a8", "#7fd3a8"];
    for (const c of w.caravans || []) { const u = (simNow - c.left) / Math.max(1, c.arrive - c.left); if (u < 0 || u > 1) continue; const [x, y] = along(routeOf(c.from, c.to), u), z = Math.max(1, 1 / sc / 3);
      if (c.sea) { cx.fillStyle = "#5a3d22"; cx.fillRect(x - 12 * z, y, 24 * z, 6 * z); cx.fillStyle = GC[c.g]; cx.beginPath(); cx.moveTo(x, y - 16 * z); cx.lineTo(x + 9 * z, y); cx.lineTo(x, y); cx.fill(); }
      else { cx.fillStyle = "#6b5a46"; cx.fillRect(x - 8 * z, y - 4 * z, 16 * z, 8 * z); cx.fillStyle = GC[c.g]; cx.fillRect(x - 6 * z, y - 10 * z, 12 * z, 6 * z); } }
    for (const x of (w.quest && w.quest.expeditions) || []) { const u = (simNow - x.left) / Math.max(1, x.arrive - x.left); const [ex, ey] = along(routeOf(x.from, x.target), Math.min(1, u)), z = Math.max(1, 1 / sc / 2.5);
      cx.fillStyle = "#e05a46"; cx.fillRect(ex - 2 * z, ey - 30 * z, 3 * z, 30 * z); cx.beginPath(); cx.moveTo(ex + z, ey - 30 * z); cx.lineTo(ex + 18 * z, ey - 24 * z); cx.lineTo(ex + z, ey - 18 * z); cx.fill();
      cx.fillStyle = "#f2c14e"; cx.font = `${12 * z}px serif`; cx.fillText("✦", ex + 9 * z, ey - 21 * z); } }
  // the Pyra
  const pd = SITE[D.pyra], fl = 0.6 + 0.4 * Math.sin(tAnim / 220) * Math.sin(tAnim / 97);
  const grd = cx.createRadialGradient(pd.x, pd.y, 4, pd.x, pd.y, 150); grd.addColorStop(0, `rgba(255,170,60,${0.75 * fl})`); grd.addColorStop(1, "rgba(255,80,20,0)");
  cx.fillStyle = grd; cx.beginPath(); cx.arc(pd.x, pd.y, 150, 0, 6.283); cx.fill();
  if (R.on) { drawReplay(sc); cx.restore(); return; }
  // characters
  const vx0 = -S.x / sc - 40, vy0 = -S.y / sc - 40, vx1 = (r.width - S.x) / sc + 40, vy1 = (r.height - S.y) / sc + 40, P = S.cur;
  const figH = 16, figPx = figH * sc, mode = figPx < 4 ? 0 : 1, label = figPx > 34;
  for (let i = 0; i < w.N; i++) {
    const x = P[i * 2], y = P[i * 2 + 1]; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    const st = A.status[i]; if (!S.vis[i]) continue;
    if (st === ST.asphodel) { cx.fillStyle = "#cfc9ba"; cx.fillRect(x - 4, y - 7, 8, 11); cx.fillStyle = "#7a6e5e"; cx.fillRect(x - 0.8, y - 15, 1.6, 9); continue; }
    cx.globalAlpha = st === ST.shade ? 0.3 : 1;
    if (mode === 0) { cx.fillStyle = w.factions[A.faction[i]].color; cx.fillRect(x - 3, y - 3, 6, 6); }
    else { const L = S.looks[i], hh = A.kind[i] ? figH * [0.45, 0.68, 0.9, 0.86][stageOf(i)] : figH; cx.imageSmoothingEnabled = true; cx.drawImage(L.canvas, S.frame[i] * L.w, 0, L.w, L.h, x - hh * 0.32, y - hh, hh * 0.64, hh); }
    if (mode === 1 && A.style[i] && figPx > 8 && st === ST.living) { const hh = A.kind[i] ? figH * [0.45, 0.68, 0.9, 0.86][stageOf(i)] : figH; cx.fillStyle = w.styles[A.style[i]].color; cx.fillRect(x - hh * 0.2, y - hh * 0.6, hh * 0.4, hh * 0.09); }
    if (mode === 1 && A.faith[i] && A.devotion[i] > 60 && figPx > 10) { cx.fillStyle = w.faiths[A.faith[i]].color; cx.beginPath(); cx.arc(x, y - figH - 3, 2.2, 0, 6.283); cx.fill(); }
    if (st === ST.pyre) { cx.globalAlpha = 0.6 + 0.4 * fl; cx.fillStyle = "#ff7a1a"; cx.beginPath(); cx.moveTo(x - 7, y + 2); cx.quadraticCurveTo(x, y - 26 * fl, x + 7, y + 2); cx.fill();
      if (i === 8984) { cx.globalAlpha = 1; cx.fillStyle = "#2b2b2b"; cx.fillRect(x + 10, y - 9, 8, 11); } }
    if (i === S.sel || i === S.hover) { cx.globalAlpha = 1; cx.strokeStyle = "#e3b341"; cx.lineWidth = Math.max(1.5, 1.5 / sc); cx.strokeRect(x - 7, y - figH - 2, 14, figH + 4); }
    if (label && st !== ST.asphodel) { cx.globalAlpha = 0.9; cx.font = `${Math.max(3, 9 / sc * 0.5)}px "IBM Plex Mono", monospace`; cx.textAlign = "center"; cx.fillStyle = "#e9e1cf"; cx.fillText(`#${i + 1}`, x, y + 6); }
  }
  cx.globalAlpha = 1;
  // night falls each hour; windows light up
  if (night) { const depth = f < 0.18 ? 1 - Math.max(0, f - 0.1) / 0.08 : Math.min(1, (f - 0.84) / 0.06); cx.fillStyle = `rgba(4,8,24,${0.42 * depth})`; cx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0); }
  // labels
  DISTRICTS.forEach((d, k) => {
    const c = SITE[k], fs = (cv.clientWidth < 600 ? 11 : 14) / sc, n = countIn(k);
    cx.font = `700 ${fs}px "Cormorant Garamond", serif`; cx.textAlign = "center"; cx.fillStyle = "#f3ecdacc"; cx.strokeStyle = "#0b1220aa"; cx.lineWidth = fs / 5;
    const ly = c.y - Math.max(S.city[k].R, 30) - 26 - fs * 0.3; cx.strokeText(d.name, c.x, ly); cx.fillText(d.name, c.x, ly);
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
cv.addEventListener("pointerdown", (e) => { if (S.follow >= 0) unfollow(); cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, sx: S.x, sy: S.y, moved: false }; cv.classList.add("drag"); });
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
  return esc(text).replace(/([A-Z][a-z]+(?: [A-Z][a-z]+ides)?) ([#~])(\d{1,5})((?: the [A-Z][\w-]+(?:-[A-Za-z]+)?| Siren-deaf| Maker-touched| Plague-spared)?)/g, (m, n, mark, id, cog) => `<a class="who" data-i="${mark === "#" ? id - 1 : 9998 + Number(id)}">${n} ${mark}${id}${cog}</a>`);
}
function chronicle() {
  const on = new Set([...document.querySelectorAll(".voices input")].filter((x) => x.checked).map((x) => x.dataset.v));
  const all = chron.concat(provisional).filter((e) => on.has(e.voice)).slice(-400).reverse();
  let html = "", lastDay = null;
  for (const e of all) { if (e.d !== lastDay) { html += `<h4>${dayLabel(e.d)}${e.prov ? " · provisional" : ""}</h4>`; lastDay = e.d; } html += `<li class="${e.voice}${e.prov ? " prov" : ""}">${linkify(e.text)}</li>`; }
  $("#chron").innerHTML = html || "<li>The sea is quiet.</li>";
}
const dayLabel = (d) => d < 0 ? `The Sowing, day ${PREHISTORY_DAYS + d}` : dateOf(d);
function updateClock() {
  const now = Date.now() / 1000, d = dayNow(now), next = GENESIS + (d + 1) * 3600 - now;
  $("#day").textContent = `${dateOf(d)} · day ${d}`;
  $("#dawn").textContent = `next dawn in ${Math.floor(next / 60)}:${String(Math.floor(next % 60)).padStart(2, "0")} · world ${stateHash(w).slice(0, 6)}${w.day - 1 > checkpointDay ? " (provisional)" : ""}`;
}
setInterval(() => w && updateClock(), 1000);

function frontPage() {
  const st = M.stories || [], byD = {}; for (const x of st) (byD[x.day] || (byD[x.day] = [])).push(x);
  const days = Object.keys(byD).map(Number).sort((a, b) => b - a), today = days[0];
  if (today === undefined) { $("#p-front").innerHTML = '<p class="muted">No stories yet.</p>'; return; }
  const top = byD[today].sort((a, b) => b.score - a.score), [lead, ...rest] = top;
  let html = `<div class="gz-mast"><b>THE ARGO</b><span>${dayLabel(today)} · sung by the Orpheus · ${w.N.toLocaleString()} souls ever lived</span><i class="dawn">${esc(dawn(today))}…</i></div>`;
  const orph = w.offices && w.offices.orpheus, singer = orph !== undefined && w.A.status[orph] === ST.living ? orph : -1, ps = poem(lead, w, (i) => view.name(i).split(" ")[0]), cf = cityForm(singer >= 0 ? w.A.district[singer] : 0);
  html += `<div class="story lead"><span class="k">${esc(lead.kind)}</span><h2>${esc(lead.title)}</h2><p>${linkify(lead.text)}</p>
    <blockquote class="poem">${ps.lines.map((l) => `<span>${esc(l)}</span>`).join("")}<span class="refrain">${esc(cf.refrain)}</span><cite>${singer >= 0 ? `<a class="who" data-i="${singer}">${esc(view.name(singer))}</a>, the Orpheus` : "the Orpheus"}, ${esc({ lament: "a lament", praise: "a song of praise", hymn: "a hymn", blame: "a blame-song" }[ps.form])} in ${esc(cf.name)}, ${esc(cf.measure)}</cite></blockquote></div>`;
  for (const x of rest.slice(0, 5)) html += `<div class="story"><span class="k">${esc(x.kind)}</span><h4>${esc(x.title)}</h4><p>${linkify(x.text)}</p></div>`;
  html += brewing();
  html += `<div class="gz-old">` + days.slice(1, 40).map((d) => `<h5>${dayLabel(d)}</h5>` + byD[d].sort((a, b) => b.score - a.score).slice(0, 3).map((x) => `<div><b>${esc(x.title)}.</b> ${linkify(x.text)}</div>`).join("")).join("") + `</div>`;
  $("#p-front").innerHTML = html;
}
// threads still open: what the world has not finished yet (Kreminski's partial matches, surfaced as cliffhangers)
function brewing() {
  const A = w.A, a = (i) => `<a class="who" data-i="${i}">${esc(view.name(i))}</a>`, items = [], fame = (i) => (i < 9999 ? 2 : 0) + (A.cognomen[i] ? 2 : 0) + (A.office[i] >= 0 ? 3 : 0);
  const act = w.director && w.director.act; if (act) items.push(`<li><b>The storyteller</b> is in its ${esc(act)} act${w.director.next ? `, saving for ${esc(w.director.next)}` : ""}.</li>`);
  for (const war of (w.war && w.war.wars) || []) items.push(`<li><b>War:</b> ${esc(war.name)}, ${war.battles} battle${war.battles === 1 ? "" : "s"} so far.</li>`);
  for (const p of (w.prophecies || []).slice(-3)) items.push(`<li><b>Unfulfilled oracle</b> to ${a(p.who)}: “${esc(p.text)}” (${p.until - w.day} days left)</li>`);
  for (const h of w.heldBones || []) items.push(`<li><b>Stolen bones:</b> ${a(h.i)} lies in ${esc(DISTRICTS[h.city].name)}, ransom ${h.ransom} obols.</li>`);
  if (w.phineus >= 0) items.push(`<li><b>The Harpies</b> still foul the table of the blind seer ${a(w.phineus)}.</li>`);
  const feuds = Object.values(w.feuds || {}).filter((f) => f.n >= 2).sort((x, y) => y.n - x.n).slice(0, 3);
  for (const f of feuds) items.push(`<li><b>Feud:</b> the houses of ${a(f.a)} and ${a(f.b)}, ${f.n} blood-debts since ${dayLabel(f.since)}.</li>`);
  for (const [L, c] of Object.entries(w.curses || {}).sort((x, y) => y[1].n - x[1].n).slice(0, 3)) items.push(`<li><b>Curse:</b> the line of ${a(Number(L))}${Number(L) === c.by ? ", who broke an oath" : `, since ${a(c.by)} broke an oath`}${c.n ? `; ${c.n} dead since` : ""}.</li>`);
  const named = (w.restless || []).filter((g) => g.named && g.k >= 0 && A.status[g.k] === 0).slice(-2);
  for (const g of named) items.push(`<li><b>A shade walks:</b> ${a(g.i)} has named ${a(g.k)}.</li>`);
  const av = [], fu = []; for (let i = 0; i < w.N; i++) { if (A.status[i]) continue; if (A.avenge[i]) av.push(i); if (A.fury[i]) fu.push(i); }
  av.sort((x, y) => fame(y) - fame(x) || x - y); fu.sort((x, y) => fame(y) - fame(x) || x - y);
  if (av.length) items.push(`<li><b>Sworn to vengeance (${av.length}):</b> ${av.slice(0, 3).map((i) => `${a(i)} against ${a(A.avenge[i] - 1)}`).join("; ")}.</li>`);
  if (fu.length) items.push(`<li><b>Hounded by the Erinyes (${fu.length}):</b> ${fu.slice(0, 4).map(a).join(", ")}.</li>`);
  return items.length ? `<div class="brewing"><h4>Brewing</h4><ul>${items.join("")}</ul></div>` : "";
}
function panels() {
  updateClock(); chronicle(); frontPage(); w.storyLog = M.stories; $("#p-codex").innerHTML = renderCodex(w, seed, view, esc, dayLabel, linkify);
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
  // faiths
  const fc = w.faiths.map(() => 0); for (let i = 0; i < w.N; i++) if (A.status[i] === ST.living) fc[A.faith[i]]++;
  const fmax = Math.max(...fc);
  $("#p-faith").innerHTML = `<p class="muted">Faiths are born when a prophet rises from a catastrophe; they spread along friendships, fastest among the frightened, hungry and grieving, and split when believers drift from the doctrine.</p>` +
    w.faiths.map((F, k) => ({ F, k })).filter(({ F }) => F.alive).sort((a, b) => fc[b.k] - fc[a.k]).map(({ F, k }) => `<div class="fac"><i style="background:${F.color}"></i><div><b>${esc(F.name)}</b></div><div class="num">${fc[k].toLocaleString()}</div>
      <div class="t">worship ${esc(F.god)}${F.founder >= 0 ? ` · prophet <a class="who" data-i="${F.founder}">${esc(view.name(F.founder))}</a>` : ""}${F.parent >= 0 ? ` · broke from ${esc(w.faiths[F.parent].name)}` : ""}${F.templeBuilt ? ` · temple in ${esc(DISTRICTS[F.temple].name)}` : ""}</div>
      <div class="bar"><b style="width:${(fc[k] / fmax * 100).toFixed(1)}%;background:${F.color}"></b></div>
      <div class="t num">${F.born < -1000 ? "since time out of mind" : "since " + dayLabel(F.born)} · ritual cost ${Math.round(F.cost * 100)}% · ${AXES.map((a, x) => `${F.doctrine[x] >= 0 ? a[0] : a[1]} ${Math.abs(F.doctrine[x])}`).join(" · ")}</div></div>`).join("") +
    (w.faiths.some((F) => !F.alive) ? `<h3>Dead faiths</h3><p>${w.faiths.filter((F) => !F.alive).map((F) => `${esc(F.name)} (${esc(F.god)})`).join(", ")}</p>` : "") +
    `<h3>Calendar</h3><p class="muted">A year has 360 days in twelve months named for the voyage: ${MONTHS.join(", ")}. The Pagasaia opens each year; on 11 Anthesterion the dead walk; the Games of Kolchis close the harvest. A memory still strong after a year becomes a festival.</p>` +
    `<h3>Festivals</h3>${(w.festivals || []).slice(0, 12).map((f) => `<div class="law">${esc(f.name)}<span class="num">${dayLabel(f.day)} · ${f.n.toLocaleString()} kept it</span></div>`).join("") || '<p class="muted">None yet.</p>'}` +
    `<h3>Monuments</h3>${(w.monuments || []).map((m) => `<div class="law">${esc(m.name)}<span class="num">${esc(DISTRICTS[m.district].name)} · raised ${dayLabel(m.day)}${m.standing ? "" : " · torn down " + dayLabel(m.fell)}</span></div>`).join("") || '<p class="muted">None yet. A great memory and a rich treasury raise a stele on its first anniversary.</p>'}`;
  // cities
  const Wr = w.war, cname = (k) => DISTRICTS[k].name;
  const Q = w.quest, fb = w.fleece;
  const fleeceHtml = Q ? `<h3>The Golden Fleece</h3><p>Worn by <a class="who" data-i="${fb}">${esc(view.name(fb))}</a>, held by <b>${esc(cname(Q.city))}</b> and the ${esc(w.factions[Q.faction].name)} since ${dayLabel(Q.since)}. Holding it gives a city cohesion and its faction a louder voice in the Boule, and every other city wants it.</p>${Q.expeditions.length ? Q.expeditions.map((x) => `<div class="law">⚑ <b>${esc(cname(x.from))}</b> is on the road to ${esc(cname(x.target))} with ${x.party.length} led by <a class="who" data-i="${x.champion}">${esc(view.name(x.champion))}</a><span class="num">arrives ${dayLabel(x.arrive)}</span></div>`).join("") : ""}${Q.history.map((h) => `<div class="law">${esc(cname(h.from))} → <b>${esc(cname(h.to))}</b>, ${esc(h.how)} by <a class="who" data-i="${h.by}">${esc(view.name(h.by))}</a><span class="num">${dayLabel(h.day)}</span></div>`).join("")}` : "";
  $("#p-city").innerHTML = fleeceHtml + `<p class="muted">Each city's cohesion (asabiya) grows on a hostile frontier with people of another faith or blood and decays in safety. Cohesive, stronger cities make war; the beaten pay tribute or kneel as vassals, and resentful vassals revolt.</p>` +
    (Wr.wars.length ? `<h3>At war</h3>${Wr.wars.map((x) => `<div class="law"><b>${esc(x.name)}</b><span class="num">since ${dayLabel(x.since)} · ${x.battles} battles · ${x.dead} Leaves dead, ${x.broken} Argonauts broken · ${x.score > 0 ? esc(cname(x.a)) + " leads" : x.score < 0 ? esc(cname(x.b)) + " leads" : "even"}</span></div>`).join("")}` : "<h3>At peace</h3>") +
    `<h3>City-states</h3>` + CITIES.map((k) => ({ k, P: Wr.power[k] })).sort((a, b) => b.P - a.P).map(({ k }) => { const dm = Wr.dom[k] || {}; const foes = CITIES.filter((b) => b !== k && Wr.rel[k][b] < -30).map((b) => cname(b).replace(/^the /, "")); const lord = Wr.lord[k] !== k ? ` · vassal of ${esc(cname(Wr.lord[k]))}` : CITIES.some((b) => b !== k && Wr.lord[b] === k) ? ` · lord of ${CITIES.filter((b) => b !== k && Wr.lord[b] === k).map((b) => esc(cname(b).replace(/^the /, ""))).join(", ")}` : "";
      return `<div class="fac"><i style="background:${w.factions[dm.faction] ? w.factions[dm.faction].color : "#888"}"></i><div><b>${esc(cname(k))}</b>${lord}</div><div class="num">power ${Wr.power[k]}</div>
        <div class="bar" title="asabiya"><b style="width:${Math.round(Wr.S[k] * 100)}%;background:var(--blood)"></b></div>
        <div class="t num">${CRAFTS.map((c, ci) => ({ c, v: w.crafts[k][ci] })).sort((a, b) => b.v - a.v).slice(0, 3).map(({ c, v }) => `${c.name} ${Math.round(v)}`).join(" · ")}${w.fashion && w.fashion[k] && w.fashion[k].style ? ` · in fashion: <span style="color:${w.styles[w.fashion[k].style].color}">${esc(w.styles[w.fashion[k].style].name)}</span>` : ""}${w.dialect[k].length ? ` · they say ${esc(w.dialect[k].map((x) => x[0].replace(/[$^]/g, "") + "→" + x[1]).join(", "))}` : ""}</div>
        <div class="t num">cohesion ${Math.round(Wr.S[k] * 100)} · ${dm.pop || 0} adults · ${esc(w.factions[dm.faction] ? w.factions[dm.faction].name : "")} · ${esc(w.faiths[dm.faith] ? w.faiths[dm.faith].name : "")}${foes.length ? " · hates " + esc(foes.join(", ")) : ""}</div></div>`; }).join("") +
    `<h3>Wars remembered</h3>${Wr.history.map((x) => `<div class="law"><b>${esc(x.name)}</b>: ${esc(x.terms)}<span class="num">${dayLabel(x.from)} to ${dayLabel(x.to)} · ${x.dead} Leaves dead, ${x.broken} Argonauts broken</span></div>`).join("") || '<p class="muted">No wars yet.</p>'}`;
  // boule
  const off = Object.entries(w.offices).map(([k, i]) => { const o = OFFICES.find((x) => x.key === k); return `<div class="law"><b>${esc(o.title)}</b>, ${esc(o.role)}: <a class="who" data-i="${i}">${esc(view.name(i))}</a></div>`; }).join("");
  $("#p-boule").innerHTML = `<div class="kv"><b>Coalition</b><span>${w.boule.coalition.map((k) => esc(w.factions[k].name)).join(" + ") || "none"}</span><b>Treasury</b><span>${w.treasury.toLocaleString()} obols</span>
    <b>Market tax</b><span>${(w.taxPermille / 10).toFixed(1)}%</span><b>Franchise</b><span>${w.franchise}</span><b>Watch</b><span>${["disarmed", "single", "double"][w.guardLevel]}</span><b>Grain dole</b><span>${w.grainDole ? "yes" : "no"}</span></div>
    <h3>Offices</h3>${off}<h3>Laws (Ostrom grammar)</h3>${w.laws.slice(0, 10).map((l) => `<div class="law">${esc(l.adico)}<span class="num">${dayLabel(l.day)}</span></div>`).join("")}`;
  // economy
  const st = w.stats.slice(-240), last = st.at(-1);
  $("#p-econ").innerHTML = `<div class="kv"><b>Living</b><span>${last.live.toLocaleString()} (${(last.leaves || 0).toLocaleString()} Leaves)</span><b>Born / died</b><span>${(last.births || 0).toLocaleString()} Leaves born, ${(last.leafDeaths || 0).toLocaleString()} gone to the Pyra</span><b>Hungry</b><span>${last.hungry}</span><b>Sick</b><span>${last.sick}</span><b>Gini</b><span>${last.gini}</span><b>Mean mood</b><span>${last.mood}</span><b>Unrest</b><span>${last.unrest} ready to riot</span></div>
    <h3>Prices by city (obols)</h3><div style="overflow-x:auto"><table class="num" style="width:100%;border-collapse:collapse;font-size:12px"><tr><th style="text-align:left">city</th>${GOODS.map((g) => `<th>${g}</th>`).join("")}</tr>${CITIES.map((k) => `<tr><td style="text-align:left;font-family:'Cormorant Garamond',serif;font-size:14px">${esc(DISTRICTS[k].name.replace(/^the /, ""))}</td>${GOODS.map((g, gi) => { const v = w.cprices[k][gi], hi = v > [2, 3, 8, 6, 10][gi] * 2.5; return `<td style="text-align:right;${hi ? "color:var(--horror)" : ""}">${v.toFixed(1)}</td>`; }).join("")}</tr>`).join("")}</table></div><p class="muted">Each city keeps its own market; what it cannot settle at home goes on the roads and sea lanes to wherever it sells dearer, paying carriage. Red: more than 2.5 times the old price. ${(w.tradeLog.volume || 0).toLocaleString()} loads carried so far, ${(w.tradeLog.raided || 0).toLocaleString()} cargoes skimmed by pirates.</p>
    ${spark("Leaves alive", st.map((s) => s.leaves || 0), "#9be37f")}${spark("Food price", st.map((s) => s.prices[0]), "#c9b98f")}${spark("Hungry", st.map((s) => s.hungry), "#e06a5a")}${spark("Gini", st.map((s) => s.gini), "#7fb4ff")}${spark("Shades in Asphodel", st.map((s) => s.shade), "#9aa4b5")}`;
  // dead
  const pyre = [], graves = [], shades = []; for (let i = 0; i < w.N; i++) { const s = A.status[i]; if (s === ST.pyre) pyre.push(i); else if (s === ST.asphodel) graves.push(i); else if (s === ST.shade) shades.push(i); }
  const lst = (a) => a.map((i) => `<a class="who" data-i="${i}">${esc(view.name(i))}</a>`).join(", ") || "none";
  const unmade = graves.filter((i) => i < 9999), leafGraves = graves.filter((i) => i >= 9999).sort((x, y) => A.died[y] - A.died[x]);
  $("#p-dead").innerHTML = `<h3>On the Pyra (${pyre.length})</h3><p>${lst(pyre)}</p><p class="muted">Argonauts burned on-chain in the last five real days (their art still shows fire), and Leaves cremated in the last three days.</p>
    <h3>The unmade (${unmade.length})</h3><p>${lst(unmade)}</p><p class="muted">Argonauts burned on the chain. Fire is the only death the Sown can die; an oar is planted on each mound.</p>
    <h3>Leaves in the earth (${leafGraves.length})</h3><p>${lst(leafGraves.slice(0, 60))}${leafGraves.length > 60 ? " …" : ""}</p><p class="muted">The mortal children of the Minyai, most recent first.</p>
    <h3>Broken, mending (${shades.length})</h3><p class="muted">Argonauts broken by wounds, hunger or plague. Their bones re-knit in Asphodel after 20 to 60 days.</p><p>${lst(shades.slice(0, 120))}${shades.length > 120 ? " …" : ""}</p>`;
  $("#p-about").innerHTML = `<p><b>The Argo</b> is an autonomous world. Each of the 9,999 Argonauts lives on its own: it works, trades, eats, talks, holds grudges, votes, riots, defects, dies and sometimes returns. Nobody steers it.</p>
    <p>One real hour is one day of the voyage. The world is computed by a deterministic engine: the GitHub job and your browser run the same code from the same checkpoint and get the same world (fingerprint <code>${stateHash(w)}</code>).</p>
    <p><b>Watching:</b> ⚘ follows someone remarkable through their day; ⏵ plays the cities' history week by week; every character has a page with a link you can share (#/a/8985 for an Argonaut, #/l/12 for a Leaf, #/follow/a/8985 to follow one).</p>
    <p>The only outside force is the chain. Sales move an Argonaut to a new house, and the price arrives as gold from Colchis. Burns light the Pyra. The Maker's rulings remake a character. Renderer changes make the Argo's speaking beam speak.</p>
    <p>Names come from Apollonius' <i>Argonautica</i>, Hesiod and Ovid. Factions follow the Bones trait. Text is procedural, with no AI model; three voices, myth, horror and realism.</p>
    <p class="muted">Checkpoint day ${checkpointDay - 1}, written ${esc(meta.updated)}. Front page as RSS: <a class="who" href="world/feed.xml">feed.xml</a>. Source: <a class="who" href="https://github.com/Nicolai1205/Argonauts" target="_blank" rel="noopener" style="text-decoration:underline">github.com/Nicolai1205/Argonauts</a>.</p>`;
}
function spark(label, vals, color) {
  if (vals.length < 2) return ""; const lo = Math.min(...vals), hi = Math.max(...vals), W = 360, H = 60;
  const pts = vals.map((v, k) => `${(k / (vals.length - 1) * W).toFixed(1)},${(H - 4 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 10)).toFixed(1)}`).join(" ");
  return `<h3>${label}</h3><svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg><div class="num">${lo} – ${hi} over the last ${vals.length} days</div>`;
}

// ------------------------------------------------------------------ Legends page of one Argonaut
function openLegends(i) {
  const A = w.A, tok = i + 1, f = w.factions[A.faction[i]], d = seed.dicts, oik = w.oikoi[A.oikos[i]] || {};
  const status = (A.kind[i] ? ["living", "", "burning on the Pyra", "buried in the Asphodel Meadow", "in exile"] : ["living", "broken, mending in Asphodel", "burning on the Pyra: unmade", "unmade by fire, buried in Asphodel", "in exile"])[A.status[i]];
  const leaf = !!A.kind[i], key = { Bones: "bones", Palette: "palette", Cloak: "cloak", Crown: "crown", Sight: "sight", Artifact: "artifact" };
  const traits = (leaf ? ["Bones", "Palette"] : Object.keys(key)).map((t) => `<span class="pill">${t}: ${esc(d[t][A[key[t]][i]])}</span>`).join("") + (leaf ? '<span class="pill">a Leaf: mortal</span>' : '<span class="pill">Sown: deathless but for fire</span>');
  // family
  const kids = [], sibs = []; for (let c = 9999; c < w.N; c++) { if (A.p1[c] === i || A.p2[c] === i) kids.push(c); else if (leaf && c !== i && A.p1[c] === A.p1[i] && A.p2[c] === A.p2[i]) sibs.push(c); }
  const who = (j) => `<a class="who" data-i="${j}">${esc(view.name(j))}</a>${A.status[j] >= 2 && A.status[j] <= 3 ? " †" : ""}`;
  const age = leaf ? ageOf(A, i, w.day) : null, deadLeaf = leaf && A.status[i] >= 2;
  const family = (leaf ? `<div class="kv"><b>Born</b><span>${dayLabel(A.born[i])}${deadLeaf ? ` · died ${dayLabel(A.died[i])} aged ${Math.floor((A.died[i] - A.born[i]) / YEAR)}` : ` · ${age} years old`}</span><b>Parents</b><span>${who(A.p1[i])} and ${who(A.p2[i])}</span><b>Line</b><span>generation ${A.gen[i]} of the line of ${who(A.lineage[i])}</span>${sibs.length ? `<b>Siblings</b><span>${sibs.map(who).join(", ")}</span>` : ""}</div>` : "")
    + (kids.length ? `<div class="kv"><b>Children</b><span>${kids.map(who).join(", ")}</span></div>` : "");
  const famIds = [...(leaf ? [A.p1[i], A.p2[i]] : []), ...(A.lover[i] >= 0 ? [A.lover[i]] : []), ...kids.slice(0, 10)];
  const thumbs = famIds.length ? `<div class="thumbs">${famIds.map((j) => `<a data-i="${j}" class="${A.status[j] >= 2 && A.status[j] <= 3 ? "dead" : ""}"><img data-p="${j}" alt=""><span>${esc(view.name(j).split(" ")[0])}${j === A.lover[i] ? " ♥" : (leaf && (j === A.p1[i] || j === A.p2[i])) ? " (parent)" : ""}</span></a>`).join("")}</div>` : "";
  const hex = ["Honesty", "Emotionality", "Extraversion", "Agreeableness", "Conscientiousness", "Openness"].map((h, k) => `<div class="trait"><span>${h}</span><div class="bar"><b style="width:${A.pers[i * 6 + k]}%;background:var(--gold)"></b></div><span class="num">${A.pers[i * 6 + k]}</span></div>`).join("");
  const ideo = AXES.map((a, k) => { const v = A.ideo[i * 3 + k]; return `<div class="trait"><span>${v >= 0 ? a[0] : a[1]}</span><div class="bar"><b style="left:${50 + Math.min(0, v) / 2}%;width:${Math.abs(v) / 2}%;background:var(--myth)"></b></div><span class="num">${Math.abs(v)}</span></div>`; }).join("");
  const th = []; for (let k = 0; k < THS; k++) { const t = A.thType[i * THS + k]; if (t && A.thUntil[i * THS + k] >= w.day - 1) th.push(`<span class="pill">${THOUGHTS[t][0]} ${THOUGHTS[t][1] > 0 ? "+" : ""}${THOUGHTS[t][1]}</span>`); }
  const ties = []; for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k]; if (j >= 0) ties.push([A.tieVal[i * TIES + k], j]); } ties.sort((a, b) => b[0] - a[0]);
  const bio = []; for (let k = 0; k < BIO; k++) { const p = (A.bioPos[i] - 1 - k + BIO * 2) % BIO, t = A.bioType[i * BIO + p]; if (!t) continue; bio.push(`<li><span class="num">${dayLabel(A.bioDay[i * BIO + p])}</span> · ${esc(bioText(EV[t], A.bioArg[i * BIO + p]))}</li>`); }
  const recent = chron.concat(provisional).filter((e) => e.a === i || e.b === i).slice(-6).reverse().map((e) => `<li><span class="num">${dayLabel(e.d)}</span> · ${linkify(e.text)}</li>`).join("");
  $("#lgCard").innerHTML = `<button class="close" aria-label="Close">×</button>
   <div class="lg-head"><canvas id="lgArt" width="24" height="24"></canvas><div><h2>${esc(view.name(i))}</h2>
     <div class="t">${esc(f.name)}, ${esc(f.title)} · ${A.status[i] === ST.pyre || A.status[i] === ST.asphodel ? "once a " + JOBS[A.job[i]] : JOBS[A.job[i]] + " in " + esc(DISTRICTS[A.district[i]].name)} · ${status}${A.office[i] >= 0 ? " · " + OFFICES[A.office[i]].title : ""}</div>
     <div class="t">House: ${esc(oik.name || (oik.addr ? oik.addr.slice(0, 6) + "…" + oik.addr.slice(-4) : "?"))} · ${A.deaths[i] ? `died ${A.deaths[i]}× and returned · ` : ""}${i < 9999 ? `<a class="who" href="https://opensea.io/assets/ethereum/${NFT}/${tok}" target="_blank" rel="noopener">on-chain token</a>` : "born in the world, not on the chain"}</div>
     <div style="margin-top:6px">${traits}</div>
     <div class="lg-tools">${A.status[i] === ST.living ? '<button id="lgFollow">Follow</button>' : ""}<button id="lgShare">Copy link</button></div></div></div>
   <h3>A life</h3>${biography(w, seed, i, view, dayLabel, M.stories || [], chron.concat(provisional)).map((p) => `<p>${linkify(p)}</p>`).join("")}
   ${family || thumbs ? `<h3>Family</h3>${thumbs}${family}` : ""}
   <div class="cols"><div><h3>Temperament</h3>${hex}</div><div><h3>Beliefs</h3>${ideo}<h3>State</h3><div class="kv"><b>Obols</b><span>${A.obols[i].toLocaleString()}</span><b>Mood</b><span>${A.mood[i]}</span><b>Stress</b><span>${A.stress[i]}</span><b>Food</b><span>${A.inv[i * 5]} rations</span><b>Radical</b><span>${A.radical[i]}</span>${A.miasma && A.miasma[i] ? `<b>Miasma</b><span style="color:var(--horror)">${A.miasma[i]} stain${A.miasma[i] > 1 ? "s" : ""}${A.fury[i] ? ", hounded by the Erinyes" : ""}</span>` : ""}${A.fame && A.fame[i] ? `<b>Name</b><span>${A.fame[i] > 40 ? "famous" : A.fame[i] > 10 ? "well spoken of" : A.fame[i] < -40 ? "infamous" : "ill spoken of"} (${A.fame[i]})</span>` : ""}${A.mark && A.mark[i] ? `<b>Marks</b><span>${[A.mark[i] & 1 ? "the spear-mark of the Earth-born" : "", A.mark[i] & 2 ? "nursed in the fire" : "", A.mark[i] & 4 ? "born grey at the temples" : ""].filter(Boolean).join(", ")}</span>` : ""}${A.mystes && A.mystes[i] ? `<b>Initiate</b><span>${A.mystes[i] === 2 ? "given Memory by the Maker" : "of the Kabeiroi"}</span>` : ""}${A.lethe && A.lethe[i] ? `<b>Lethe</b><span>drank ${A.lethe[i]}×</span>` : ""}${A.buried && A.buried[i] ? `<b>Buried</b><span>${A.buried[i]} of their Leaves</span>` : ""}${A.scar && A.scar[i] ? `<b>Scar</b><span>${["", "the smoke-eater", "the mourner", "the silent", "the cruel", "the wanderer", "the oath-maker", "the unnaming", "the bone-breaker"][A.scar[i]]}</span>` : ""}${A.avenge && A.avenge[i] ? `<b>Sworn</b><span>vengeance on <a class="who" data-i="${A.avenge[i] - 1}">${esc(view.name(A.avenge[i] - 1))}</a></span>` : ""}<b>Faith</b><span style="color:${w.faiths[A.faith[i]].color}">${esc(w.faiths[A.faith[i]].name)}</span><b>Wears</b><span style="color:${w.styles[A.style[i]].color}">${esc(w.styles[A.style[i]].name)}</span><b>Devotion</b><span>${A.devotion[i]}</span></div></div></div>
   ${A.status[i] === ST.living && S.where && S.where[i] ? `<h3>Today</h3><p>${esc(view.name(i).split(' ')[0])} ${esc(S.where[i].work)}, then ${esc(S.where[i].eve)}${S.eveWith[i] >= 0 ? ` <a class="who" data-i="${S.eveWith[i]}">${esc(view.name(S.eveWith[i]))}</a>` : ""}.${A.lover[i] >= 0 ? ` Beloved: <a class="who" data-i="${A.lover[i]}">${esc(view.name(A.lover[i]))}</a>.` : ""}</p>` : ""}
   ${(w.relics || []).filter((r) => r.holder === i).map((r) => `<h3>Carries ${esc(r.name)}</h3><ol class="bio">${r.history.map(([d, h, how]) => `<li><span class="num">${dayLabel(d)}</span> · <a class="who" data-i="${h}">${esc(view.name(h))}</a>: ${esc(how)}</li>`).join("")}</ol>`).join("")}
   <h3>On their mind</h3><div>${th.join("") || '<span class="muted">nothing pressing</span>'}</div>
   <h3>Bonds</h3><div>${ties.map(([v, j]) => `<span class="pill" style="border-color:${v >= 0 ? "#3d6b4a" : "#7a3030"}">${v >= 0 ? "♥" : "✕"} <a class="who" data-i="${j}">${esc(view.name(j))}</a> ${v}</span>`).join("") || '<span class="muted">alone</span>'}</div>
   <h3>Life</h3><ol class="bio">${bio.join("") || '<li class="muted">Nothing remembered yet.</li>'}</ol>${recent ? `<h3>In the chronicle</h3><ol class="bio">${recent}</ol>` : ""}`;
  const c = $("#lgArt").getContext("2d");
  if (i < 9999) { const [sx, sy] = spriteAt(i); c.drawImage(sprites.canvas, sx, sy, 24, 24, 0, 0, 24, 24); }
  else portrait(seed, A, i).then((img) => { c.clearRect(0, 0, 24, 24); c.drawImage(img, 0, 0, 24, 24); if (A.status[i] >= 2 && A.status[i] <= 3) { c.globalCompositeOperation = "saturation"; c.fillStyle = "#888"; c.fillRect(0, 0, 24, 24); } });
  // family in pictures
  document.querySelectorAll("#lgCard .thumbs img[data-p]").forEach((im) => { const j = +im.dataset.p; if (j < 9999) { const cc = document.createElement("canvas"); cc.width = cc.height = 24; const [sx, sy] = spriteAt(j); cc.getContext("2d").drawImage(sprites.canvas, sx, sy, 24, 24, 0, 0, 24, 24); im.src = cc.toDataURL(); } else portrait(seed, A, j).then((pi) => (im.src = pi.src)); });
  history.replaceState(null, "", `#/${i < 9999 ? "a/" + (i + 1) : "l/" + (i - 9998)}`);
  if (A.status[i] === ST.asphodel || A.status[i] === ST.shade) { c.globalCompositeOperation = "saturation"; c.fillStyle = "#888"; c.fillRect(0, 0, 24, 24); }
  $("#legends").classList.add("on"); $("#legends").setAttribute("aria-hidden", "false"); $(".close").onclick = closeLegends; focus(i);
  if ($("#lgFollow")) $("#lgFollow").onclick = () => { closeLegends(); follow(i); };
  $("#lgShare").onclick = () => { const url = location.href.split("#")[0] + `#/${i < 9999 ? "a/" + (i + 1) : "l/" + (i - 9998)}`; navigator.clipboard.writeText(url).then(() => ($("#lgShare").textContent = "Link copied")).catch(() => prompt("Link", url)); };
}
function bioText(t, arg) {
  return { death: "died", return: "came back from Asphodel", burn: "went to the Pyra", ostologia: "bones gathered; an oar planted", sold: `passed to the house of ${w.oikoi[arg]?.name || "a stranger"}`,
    hostage: "held in escrow", xenia: "exchanged under xenia", gold: "sold for gold", ruling: "touched by the Maker", riot: "rioted", defect: "changed allegiance", schism: "founded a faction",
    office: "took office", ostracism: "ostracized", funeral: "a funeral", unburied: "lay unburied", break: "broke under the strain", brawl: "fought", robbery: arg >= 0 ? `robbery involving ${view.name(arg)}` : "robbery",
    cognomen: `became ${COGNOMENS[arg]}`, comeofage: `came of age and took up the trade of ${JOBS[arg] || "their family"}`, birth: arg >= 0 ? `a child was born: ${view.name(arg)}` : "a child was born", heartbreak: "a heart broke", love: arg >= 0 ? `fell in love with ${view.name(arg)}` : "fell in love", convert: "took a new faith", prophet: "heard a god", battle: "went to war", migrate: `moved to ${DISTRICTS[arg]?.name || "new work"}`, exile_end: "returned from exile", lemnian: "the night of knives", plague: "fell sick", fleece: "the Fleece", watch: `posted to keep the watch in ${DISTRICTS[arg]?.name || "another quarter"}`,
    kinslayer: arg >= 0 ? `spilled kindred blood: ${view.name(arg)}` : "spilled kindred blood", erinyes: "hounded by the Erinyes", katharsis: "purified of blood", poine: arg >= 0 ? `blood-price settled with ${view.name(arg)}` : "blood-price settled",
    vendetta: arg >= 0 ? `vengeance between them and ${view.name(arg)}` : "a vendetta", supplication: arg >= 0 ? `a supplication: ${view.name(arg)}` : "a supplication", restless: "walked as a restless shade", shadenames: arg >= 0 ? `a shade named ${view.name(arg)}` : "a shade spoke", pharmakos: "driven out as the pharmakos", blight: "the blight", feudend: "a feud ended",
    liturgy: "paid a liturgy for the city", dodona: "asked the oak at Dodona", weather: "the weather", colony: "went out with the colonists", psi: "the age turned", speech: "spoke before the Boule", vacant: "a seat left empty", case: "a death nobody saw", trial: "stood before the Areopagus", secret: "a secret", tablet: "a curse on lead", stone: "the stone among the Sown", iron: "the Iron clock", nemesis: "struck by Nemesis", agrionia: "the Agrionia", demophon: "the fire-nursing", doom: "a seer's vision", newfire: "the new fire", beast: "the beast came", hunt: "went on the hunt", games: "competed at the games", mood: "seized by a god", legacy: "the house won a name", oracle: "consulted the Pythia", phineus: "blinded for seeing too truly", bones: "bones stolen from Asphodel", lethe: arg >= 0 ? `came back from Asphodel and forgot ${view.name(arg)}` : "drank from Lethe or Memory", oath: arg >= 0 ? `an oath involving ${view.name(arg)}` : "an oath", curse: "the curse on the line", weight: arg >= 0 ? `buried ${view.name(arg)}` : "buried a Leaf", memory: "remembered", scar: "broke, and was marked by it", mysteries: "initiated in the mysteries", antidosis: arg >= 0 ? `antidosis with ${view.name(arg)}` : "antidosis", xenoi: arg >= 0 ? `guest-friendship with ${view.name(arg)}` : "guest-friendship", theoxenia: arg >= 0 ? `a stranger at the door: ${view.name(arg)}` : "a stranger at the door", wreck: "a ship lost" }[t] || t;
}
function closeLegends() { if (location.hash.startsWith("#/a/") || location.hash.startsWith("#/l/")) history.replaceState(null, "", location.pathname); $("#legends").classList.remove("on"); $("#legends").setAttribute("aria-hidden", "true"); S.sel = -1; render(); }
$("#legends").addEventListener("click", (e) => { if (e.target.id === "legends") closeLegends(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") closeLegends(); });

// ------------------------------------------------------------------ links: #/a/8985 (an Argonaut), #/l/12 (a Leaf), #/follow/a/8985, #/tab/cities
function route() {
  const h = location.hash.replace(/^#\/?/, "").split("/");
  const idOf = (k, n) => (k === "a" ? Number(n) - 1 : 9998 + Number(n));
  if ((h[0] === "a" || h[0] === "l") && h[1]) { const i = idOf(h[0], h[1]); if (i >= 0 && i < w.N) openLegends(i); }
  else if (h[0] === "follow" && h[2]) { const i = idOf(h[1], h[2]); if (i >= 0 && i < w.N) follow(i); }
  else if (h[0] === "tab" && h[1]) { const b = document.querySelector(`.tabs [data-tab="${h[1]}"]`); if (b) b.click(); }
}

// ------------------------------------------------------------------ follow one life: the camera stays with them through the day
function activityOf(i) {
  const A = w.A; if (A.status[i] !== ST.living) return "is not among the living";
  const f0 = (((Date.now() / 1000 - GENESIS) % 3600) + 3600) % 3600 / 3600, b = i * 12, P = S.plan, night = S.planFlags[i] & 1, f = night ? (f0 + 0.5) % 1 : f0;
  const T = [0, 1, 2, 3, 4, 5].map((q) => (night ? (P[b + q] + 0.5) % 1 : P[b + q])), wh = S.where[i] || { work: "works", eve: "rests" };
  if (f < T[0] || f >= T[5]) return A.sick[i] ? "lies sick at home" : "is asleep at home";
  if (f < T[1]) return "is on the way to work";
  if (f < T[2]) return wh.work;
  if (f < T[3]) return "is walking into the evening";
  if (f < T[4]) return wh.eve + (S.eveWith[i] >= 0 ? " " + view.name(S.eveWith[i]) : "");
  return "is walking home";
}
function follow(i) {
  S.follow = i; S.scale = Math.max(S.scale, 2.6); const bar = $("#followbar"); bar.classList.add("on");
  history.replaceState(null, "", `#/follow/${i < 9999 ? "a/" + (i + 1) : "l/" + (i - 9998)}`);
  const head = () => { bar.innerHTML = `<img id="fbImg" alt=""><div><b>${esc(view.name(i))}</b><br><span class="muted">${esc(activityOf(i))}</span></div><button id="fbOpen">Page</button><button id="fbStop">Stop</button>`;
    const im = $("#fbImg"); if (i < 9999) { const cc = document.createElement("canvas"); cc.width = cc.height = 24; const [sx, sy] = spriteAt(i); cc.getContext("2d").drawImage(sprites.canvas, sx, sy, 24, 24, 0, 0, 24, 24); im.src = cc.toDataURL(); } else portrait(seed, w.A, i).then((p) => (im.src = p.src));
    $("#fbStop").onclick = unfollow; $("#fbOpen").onclick = () => openLegends(i); };
  head(); clearInterval(S.followTimer); S.followTimer = setInterval(() => { if (S.follow === i) { const sp = bar.querySelector(".muted"); if (sp) sp.textContent = activityOf(i); } }, 2000);
}
function unfollow() { S.follow = -1; $("#followbar").classList.remove("on"); clearInterval(S.followTimer); if (location.hash.startsWith("#/follow")) history.replaceState(null, "", location.pathname); }
S.follow = -1;
$("#zluck").onclick = () => {
  // someone remarkable: an office holder, a prophet, a named survivor or someone in today's news; never the same twice in a row
  const A = w.A, pool = []; for (let i = 0; i < w.N; i++) if (A.status[i] === ST.living && (A.office[i] >= 0 || A.cognomen[i] || A.lover[i] >= 0 && A.kind[i])) pool.push(i);
  const today = (M.stories || []).filter((x) => x.day >= w.day - 2).flatMap((x) => x.actors).filter((i) => i >= 0 && i < w.N && A.status[i] === ST.living);
  const choice = today.length && Math.random() < 0.6 ? today[Math.floor(Math.random() * today.length)] : pool[Math.floor(Math.random() * pool.length)];
  if (choice !== undefined) follow(choice);
};

// ------------------------------------------------------------------ time-lapse: the cities' history, week by week
const R = { on: false, k: 0, playing: false, timer: null };
$("#zlapse").onclick = () => {
  const tl = w.war.timeline || []; if (!tl.length) return;
  if (S.follow >= 0) unfollow(); closeLegends(); fit(); R.on = true; R.k = 0; $("#replay").classList.add("on"); const sl = $("#rslider"); sl.max = tl.length - 1; sl.value = 0; showReplay(); play(true);
};
function showReplay() {
  const tl = w.war.timeline, t = tl[R.k]; $("#rslider").value = R.k; $("#rdate").textContent = dayLabel(t.d);
  const st = (M.stories || []).filter((x) => x.day >= t.d && x.day < t.d + 7).sort((a, b) => b.score - a.score)[0];
  $("#rstory").innerHTML = st ? `<b>${esc(st.title)}.</b> ${linkify(st.text)}` : '<span class="muted">A quiet week.</span>';
}
function play(on) { R.playing = on; $("#rplay").textContent = on ? "⏸" : "⏵"; clearInterval(R.timer); if (on) R.timer = setInterval(() => { if (R.k >= w.war.timeline.length - 1) return play(false); R.k++; showReplay(); }, 900); }
$("#rplay").onclick = () => play(!R.playing);
$("#rslider").oninput = (e) => { R.k = +e.target.value; showReplay(); };
$("#rclose").onclick = () => { R.on = false; play(false); $("#replay").classList.remove("on"); };
function drawReplay(sc) {
  const t = w.war.timeline[R.k]; if (!t) return;
  CITIES.forEach((c, n) => { const lord = t.lord[c]; if (lord !== c) { cx.strokeStyle = "rgba(227,179,65,.75)"; cx.setLineDash([30, 20]); cx.lineWidth = Math.max(6, 2.5 / sc); cx.beginPath(); cx.moveTo(SITE[c].x, SITE[c].y); cx.lineTo(SITE[lord].x, SITE[lord].y); cx.stroke(); cx.setLineDash([]); } });
  CITIES.forEach((c, n) => { const F = w.factions[t.fac[n]], Fa = w.faiths[t.faith[n]], r = 60 + Math.sqrt(t.pop[n] || 0) * 9;
    cx.fillStyle = F ? F.color + "cc" : "#888"; cx.beginPath(); cx.arc(SITE[c].x, SITE[c].y, r, 0, 6.283); cx.fill();
    cx.strokeStyle = Fa ? Fa.color : "#fff"; cx.lineWidth = Math.max(10, 4 / sc); cx.stroke();
    cx.fillStyle = "#0b1220"; cx.font = `700 ${16 / sc}px "Cormorant Garamond", serif`; cx.textAlign = "center"; cx.fillText(`${F ? F.name : ""}`, SITE[c].x, SITE[c].y + 5 / sc); });
  for (const [a, b] of t.wars) { cx.strokeStyle = "rgba(224,90,70,.9)"; cx.lineWidth = Math.max(10, 4 / sc); cx.beginPath(); cx.moveTo(SITE[a].x, SITE[a].y); cx.lineTo(SITE[b].x, SITE[b].y); cx.stroke(); cx.fillStyle = "#e05a46"; cx.font = `${22 / sc}px serif`; cx.fillText("⚔", (SITE[a].x + SITE[b].x) / 2, (SITE[a].y + SITE[b].y) / 2); }
}

// ------------------------------------------------------------------ search
$("#q").addEventListener("input", () => {
  const q = $("#q").value.trim().toLowerCase(), box = $("#qres"); if (!q) { box.style.display = "none"; return; }
  const out = []; const id = parseInt(q.replace("#", ""), 10);
  if (q.startsWith("~")) { const n = parseInt(q.slice(1), 10); if (n >= 1 && 9998 + n < w.N) out.push(9998 + n); } else if (id >= 1 && id <= 9999) out.push(id - 1);
  for (let i = 0; i < w.N && out.length < 12; i++) if (w.A.status[i] !== 3 && nameOf(i + 1).toLowerCase().startsWith(q) && !out.includes(i)) out.push(i);
  box.innerHTML = out.map((i) => `<div data-i="${i}">${esc(view.name(i))} · ${esc(view.faction(i))}</div>`).join(""); box.style.display = out.length ? "block" : "none";
});
document.addEventListener("click", (e) => { if (!e.target.closest(".search")) $("#qres").style.display = "none"; });
