// World state: struct-of-arrays over typed arrays (index = tokenId - 1), plus small JSON globals.
import { BLOODS, SPARTOI_HOUSES, DISTRICTS, D, J, JOBS, GOODS, TARGET, BASE_PRICE, ST, PREHISTORY_DAYS } from "./lore.js";
import { unit, stream, hash32 } from "./rng.js";
import { initCulture } from "./culture.js";
import { initWar } from "./war.js";
import { initDrift } from "./drift.js";
import { initRumors } from "./rumor.js";
import { initQuest } from "./fleece.js";
import { initTrade } from "./trade.js";
import { initMiasma } from "./miasma.js";

export const TIES = 8;      // social ties per character
export const THS = 6;       // thought slots
export const BIO = 10;      // remembered life events (ring)
export const VERSION = 11;
export const ARGO = 9999;   // entity indices 0..9998 are the tokens; the Leaves (mortal children) are appended after  // bump when the state layout or rules change incompatibly: the world is re-dreamed from genesis

// dynamic arrays: [name, type, per-agent width]
const LAYOUT = [
  ["status", Uint8Array, 1], ["district", Uint8Array, 1], ["faction", Uint8Array, 1], ["job", Uint8Array, 1], ["oikos", Int32Array, 1],
  ["pers", Uint8Array, 6], ["ideo", Int8Array, 3], ["identity", Uint8Array, 1], ["radical", Int8Array, 1],
  ["obols", Int32Array, 1], ["inv", Int16Array, 5], ["hunger", Uint8Array, 1], ["sick", Uint8Array, 1], ["stress", Int16Array, 1], ["mood", Int16Array, 1],
  ["thType", Uint8Array, THS], ["thUntil", Int32Array, THS], ["tieTo", Int32Array, TIES], ["tieVal", Int8Array, TIES],
  ["until", Int32Array, 1], ["deaths", Uint8Array, 1], ["cognomen", Uint8Array, 1], ["jail", Uint16Array, 1], ["unburied", Uint8Array, 1],
  ["bioDay", Int32Array, BIO], ["bioType", Uint8Array, BIO], ["bioArg", Int32Array, BIO], ["bioPos", Uint8Array, 1], ["office", Int8Array, 1], ["vice", Uint8Array, 1], ["died", Int32Array, 1],
  ["met", Int32Array, 1], ["metKind", Uint8Array, 1], ["lover", Int32Array, 1],
  // genes and lineage (tokens: genes from their traits, generation 0, lineage = themselves)
  ["kind", Uint8Array, 1], ["bones", Uint8Array, 1], ["palette", Uint8Array, 1], ["cloak", Uint8Array, 1], ["crown", Uint8Array, 1], ["sight", Uint8Array, 1], ["artifact", Uint8Array, 1],
  ["faith", Uint8Array, 1], ["devotion", Uint8Array, 1], ["style", Uint16Array, 1], ["dialect", Uint8Array, 1], ["rumor", Uint8Array, 6],
  ["miasma", Uint8Array, 1], ["fury", Uint8Array, 1], ["avenge", Int32Array, 1],
  ["born", Int32Array, 1], ["p1", Int32Array, 1], ["p2", Int32Array, 1], ["gen", Uint16Array, 1], ["lineage", Int32Array, 1], ["birthFac", Uint8Array, 1],
];
const HEXACO = ["H", "E", "X", "A", "C", "O"];
const DEMAND_GOODS = ["food", "smoke", "cloth", "ore", "pharmaka"], DEMAND_W = [0.40, 0.26, 0.08, 0.16, 0.10];
const pickW = (u, ws) => { let t = 0; for (let k = 0; k < ws.length; k++) { t += ws[k]; if (u < t) return k; } return ws.length - 1; };

// persona -> personality offsets (H,E,X,A,C,O) and job hints
const PERSONA = {
  "The Reaper": [[0, -10, -5, -10, 10, 0]], "The Priest": [[10, 0, 0, 5, 10, -5]], "The Royal": [[-15, 0, 10, -5, 10, 0]], "The Devotee": [[10, 5, -5, 15, 5, 0]],
  "The Pirate": [[-20, -10, 10, -10, -10, 10]], "The Cyborg": [[0, -10, -10, 0, 10, 15]], "The Influencer": [[-15, 5, 20, 0, -5, 5]], "The Socialite": [[-10, 5, 15, 5, 0, 0]],
  "The Old Salt": [[5, -15, 5, 0, 10, -5]], "The Rower": [[5, -5, 0, 5, 10, -5]], "The Rebel": [[0, 0, 5, -15, -10, 15]], "The Gardener": [[5, 10, 0, 15, 0, 5]],
  "The Ancient": [[5, -10, -10, 5, 15, -15]], "The Daydreamer": [[0, 5, -5, 5, -15, 20]], "The Hipster": [[0, 0, 5, 0, -5, 15]], "The Thinker": [[5, 0, -15, 0, 5, 15]],
  "The Purist": [[15, 0, -5, 5, 5, 0]], "The King": [[-10, -10, 15, -5, 10, 0]], "The Mutant": [[0, 10, -5, -10, -10, 15]], "The Visitor": [[10, -15, -10, 5, 0, 25]],
  "The Prize": [[10, 0, 10, 10, 10, 10]], "The Deckhand": [[0, 0, 0, 0, 0, 0]],
};
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

export function createWorld(seed, seedHash = "argo") {
  const N = seed.n, d = seed.dicts, w = { N, version: VERSION, seed: seedHash, day: -PREHISTORY_DAYS, A: {} };
  w.cap = N + 2048; w.widths = {};
  for (const [name, T, k] of LAYOUT) { w.A[name] = new T(w.cap * k); w.widths[name] = k; }
  const A = w.A, name = (dict, i) => d[dict][i];
  const rng = stream(seedHash, "genesis");
  w.oikoi = seed.oikoi.map((o) => ({ addr: o.addr, name: o.name || null }));
  w.oikosIx = Object.fromEntries(w.oikoi.map((o, i) => [o.addr, i]));
  w.factions = BLOODS.map((b, i) => ({ id: i, key: b.key, name: b.name, title: b.title, color: b.color, blood: i, founder: -1, born: w.day, alive: true,
    legit: 60, clout: 0, seats: 0, inCoalition: false, ideo: b.ideo.slice(), members: 0 }));
  // the Sown are not one people: faction 0 is the House of Echion, the other four houses follow the bloods
  Object.assign(w.factions[0], { key: "echion", name: SPARTOI_HOUSES[0].name, title: SPARTOI_HOUSES[0].title, color: SPARTOI_HOUSES[0].color, ideo: SPARTOI_HOUSES[0].ideo.slice() });
  w.houseFaction = [0];
  for (let h = 1; h < 5; h++) { const H = SPARTOI_HOUSES[h]; w.houseFaction.push(w.factions.length);
    w.factions.push({ id: w.factions.length, key: H.name.split(" ").pop().toLowerCase(), name: H.name, title: H.title, color: H.color, blood: 0, founder: -1, born: w.day, alive: true,
      legit: 60, clout: 0, seats: 0, inCoalition: false, ideo: H.ideo.slice(), members: 0 }); }
  w.baseFactions = w.factions.length;
  const towns = [D.ares, D.reef, D.bear, D.forges, D.strand, D.lemnos, D.anthemoessa, D.iolcus, D.agora];
  for (let i = 0; i < N; i++) {
    const tok = i + 1, blood = seed.bones[i], B = BLOODS[blood], persona = name("persona", seed.persona[i]);
    const cloak = name("Cloak", seed.cloak[i]), crown = name("Crown", seed.crown[i]), sight = name("Sight", seed.sight[i]), art = name("Artifact", seed.artifact[i]);
    // personality: neutral-heavy bell + blood + persona + palette emotion (Ou et al. colour scores)
    const po = (PERSONA[persona] || [[0, 0, 0, 0, 0, 0]])[0];
    const pal = [0, -seed.heat[i] * 6, seed.activity[i] * 8, seed.heat[i] * 6, seed.weight[i] * 6, 0];
    for (let k = 0; k < 6; k++) {
      const r = (unit(tok, "p", k) + unit(tok, "q", k) + unit(tok, "r", k) - 1.5) * 40;
      A.pers[i * 6 + k] = clamp(Math.round(50 + r + B.hexaco[k] + po[k] + pal[k]), 0, 100);
    }
    const bi = blood === 0 ? SPARTOI_HOUSES[hash32(tok, "house") % 5].ideo : B.ideo;
    for (let k = 0; k < 3; k++) A.ideo[i * 3 + k] = clamp(Math.round(bi[k] + (unit(tok, "i", k) - 0.5) * 70 + (A.pers[i * 6 + 5] - 50) * (k === 0 ? -0.4 : k === 2 ? -0.5 : 0)), -100, 100);
    A.identity[i] = clamp(Math.round(55 + (unit(tok, "id") - 0.5) * 50 + (50 - A.pers[i * 6 + 5]) * 0.3), 5, 100);
    const house = blood === 0 ? hash32(tok, "house") % 5 : -1;
    A.faction[i] = blood === 0 ? w.houseFaction[house] : blood;
    // vocation from outfit; else by home soil, with some drift to other trades
    let job;
    if (cloak === "Death") job = J.reaper; else if (cloak === "Clergy") job = J.priest; else if (cloak === "Royalty") job = J.noble;
    else if (cloak === "Servant" || cloak === "Ivory") job = J.servant; else if (crown === "Corsair" || persona === "The Pirate") job = J.pirate;
    else if (crown === "Oarsman's Band") job = J.rower; else if (sight === "Digital" || sight === "3D Glasses") job = unit(tok, "aug") < 0.25 ? J.augur : -1;
    else if (persona === "The Influencer" || persona === "The Socialite") job = unit(tok, "mer") < 0.4 ? J.merchant : -1; else job = -1;
    let dist = B.home;
    if (job === -1) {
      // free hands take up a trade in proportion to what the city needs; most stay on home soil if it yields that
      const good = DEMAND_GOODS[pickW(unit(tok, "trade"), DEMAND_W)];
      const homeRes = DISTRICTS[B.home].res, homeGood = homeRes === "fish" ? "food" : homeRes;
      if (homeGood !== good || unit(tok, "stay") > 0.7) { const opts = DISTRICTS.map((x, k) => k).filter((k) => (DISTRICTS[k].res === good || (good === "food" && DISTRICTS[k].res === "fish")) && DISTRICTS[k].kind !== "agora"); dist = opts[hash32(tok, "where") % opts.length]; }
      const res = DISTRICTS[dist].res;
      job = res === "food" ? J.farmer : res === "fish" ? J.fisher : res === "ore" ? J.miner : res === "cloth" ? J.weaver : res === "smoke" ? J.grower : res === "pharmaka" ? J.herbalist : J.farmer;
    }
    A.job[i] = job; A.district[i] = dist; A.office[i] = -1;
    A.oikos[i] = seed.oikosStart[i];
    // endowment: blood wealth, relic gold, royalty; skewed by a per-token draw (long tail)
    const u = unit(tok, "w");
    A.obols[i] = Math.round((40 + B.wealth * (0.4 + u * u * 2.2)) * (seed.relic[i] ? 1.6 : 1) + (job === J.noble ? 250 : 0) + (job === J.merchant ? 60 : 0));
    A.inv[i * 5 + 0] = 10; A.inv[i * 5 + 1] = art === "none" ? 0 : 4; A.inv[i * 5 + 2] = 2; A.inv[i * 5 + 3] = 1; A.inv[i * 5 + 4] = 1;
    A.vice[i] = art === "none" ? 0 : (seed.breath[i] ? 2 : 1);
    A.met[i] = -1; A.lover[i] = -1; A.p1[i] = -1; A.p2[i] = -1; A.lineage[i] = i; A.born[i] = -100000; A.birthFac[i] = A.faction[i];
    A.bones[i] = blood; A.palette[i] = seed.palette[i]; A.cloak[i] = seed.cloak[i]; A.crown[i] = seed.crown[i]; A.sight[i] = seed.sight[i]; A.artifact[i] = seed.artifact[i];
    for (let k = 0; k < TIES; k++) A.tieTo[i * TIES + k] = -1;
    for (let k = 0; k < THS; k++) A.thType[i * THS + k] = 0;
  }
  // initial ties: shipmates (shared past holders) + a few of the same blood and same district
  const byDist = groupBy(N, (i) => A.district[i]);
  for (let i = 0; i < N; i++) {
    let k = 0;
    for (const m of seed.mates[i]) if (k < 4) { A.tieTo[i * TIES + k] = m - 1; A.tieVal[i * TIES + k] = 20 + (hash32(i, m) % 25); k++; }
    const pool = byDist[A.district[i]];
    for (let t = 0; t < 3 && k < TIES; t++) { const j = pool[hash32(i, "tie", t) % pool.length]; if (j !== i && !hasTie(w, i, j)) { A.tieTo[i * TIES + k] = j; A.tieVal[i * TIES + k] = 10 + (hash32(j, i) % 20); k++; } }
  }
  w.static = { persona: seed.persona, relic: seed.relic };
  w.none = { cloak: d.Cloak.indexOf("none"), crown: d.Crown.indexOf("none"), sight: d.Sight.indexOf("none"), artifact: d.Artifact.indexOf("none") };
  w.births = 0; w.leafDeaths = 0;
  w.dictIx = { cloak: Object.fromEntries(d.Cloak.map((n, k) => [n, k])), crown: Object.fromEntries(d.Crown.map((n, k) => [n, k])), artifact: Object.fromEntries(d.Artifact.map((n, k) => [n, k])) };
  w.prices = BASE_PRICE.slice();
  w.priceMult = 1;            // Talos at the strait raises everything
  w.fertility = DISTRICTS.map(() => 1000);
  w.treasury = 0; w.taxPermille = 60; w.franchise = "property"; w.guardLevel = 1; w.titheLevel = 1;
  w.laws = [];
  w.boule = { seats: 60, coalition: [], proposer: -1, since: w.day };
  w.offices = {};
  w.director = { points: 0, adapt: 1, lastDeath: w.day, active: {} };
  w.minted = 0; w.destroyed = 0;
  w.m0 = 0; for (let i = 0; i < N; i++) w.m0 += A.obols[i];
  w.stats = []; w.eventSeq = 0;
  w._digital = d.Sight.indexOf("Digital");
  initCulture(w); initWar(w); initDrift(w); initRumors(w); initTrade(w); initMiasma(w);
  w.fleece = seed.crown.indexOf(d.Crown.indexOf("Golden Fleece"));  // the single Golden Fleece bearer (index)
  initQuest(w);
  w.burnTs = seed.burnTs.slice();
  return w;
}

/** make room for at least n entities (arrays are reallocated in place on w.A) */
export function ensureCap(w, n) {
  if (n <= w.cap) return;
  const cap = Math.max(n, Math.ceil(w.cap * 1.5));
  for (const [name, A] of Object.entries(w.A)) { const k = w.widths[name] || A.length / w.cap, B = new A.constructor(cap * k); B.set(A); w.A[name] = B; w.widths[name] = k; }
  w.cap = cap;
}

export function groupBy(N, key) { const g = {}; for (let i = 0; i < N; i++) { const k = key(i); (g[k] || (g[k] = [])).push(i); } return g; }
export function hasTie(w, i, j) { const A = w.A; for (let k = 0; k < TIES; k++) if (A.tieTo[i * TIES + k] === j) return true; return false; }

// ---------- (de)serialisation: JSON globals + base64 typed arrays ----------
const B64 = typeof Buffer !== "undefined"
  ? { enc: (u8) => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString("base64"), dec: (s) => new Uint8Array(Buffer.from(s, "base64")) }
  : { enc: (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); },
      dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) };

export function serialize(w) {
  const arrays = {};
  for (const [name, A] of Object.entries(w.A)) { const k = w.widths[name], used = A.subarray(0, w.N * k); arrays[name] = [A.constructor.name, B64.enc(new Uint8Array(used.buffer, used.byteOffset, used.byteLength)), k]; }
  const { A, oikosIx, static: st, cap, ...rest } = w;
  return JSON.stringify({ ...rest, arrays });
}
const CTORS = { Uint8Array, Int8Array, Int16Array, Uint16Array, Int32Array, Float64Array };
export function deserialize(json, seed) {
  const o = typeof json === "string" ? JSON.parse(json) : json;
  const w = { ...o, A: {} };
  w.cap = o.N + 2048;
  for (const [name, [ctor, b64, k]] of Object.entries(o.arrays)) { const u8 = B64.dec(b64), T = CTORS[ctor], src = new T(u8.buffer, u8.byteOffset, u8.byteLength / T.BYTES_PER_ELEMENT), A = new T(w.cap * k); A.set(src); w.A[name] = A; w.widths[name] = k; }
  delete w.arrays;
  w.oikosIx = Object.fromEntries(w.oikoi.map((x, i) => [x.addr, i]));
  w.static = { persona: seed.persona, relic: seed.relic };
  return w;
}

/** FNV-1a over every array and the JSON globals: the world's fingerprint for a given day */
export function stateHash(w) {
  let h = 0x811c9dc5;
  const mix = (u8) => { for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 16777619); } };
  for (const name of Object.keys(w.A).sort()) { const A = w.A[name].subarray(0, w.N * w.widths[name]); mix(new Uint8Array(A.buffer, A.byteOffset, A.byteLength)); }
  const g = JSON.stringify([w.day, w.treasury, w.prices, w.factions.map((f) => [f.name, f.seats, f.legit]), w.taxPermille, w.minted, w.destroyed]);
  for (let i = 0; i < g.length; i++) { h ^= g.charCodeAt(i) & 255; h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, "0");
}
