// Long Memory: Lethe and Mnemosyne at the re-knit, long-term and core memories, the weight of the Leaves,
// oaths on the Styx and the curses of oath-breakers, the scars of breakdowns, the Samothracian mysteries.
// Sources (docs/research/MYTH.md §3.4, 3.9; SIMULATIONS.md #3, #4, #14): the Orphic gold tablets (the spring of Memory and
// the white cypress); Ap. 1.915-921 (the crew initiated at Samothrace); Hdt. 6.86 (Glaucus: "there is no descendant of
// Glaucus, nor any hearth"); the Cyrene founders' oath (wax images melted); Dwarf Fortress memories (8+8 slots, 1-in-3 core
// memories that change personality); CK3 coping traits.
import { DISTRICTS, D, ST, TH, J } from "./lore.js";
import { TIES } from "./world.js";

export const LTM = 3;
const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
const bump = (A, i, k, d) => { A.pers[i * 6 + k] = Math.max(0, Math.min(100, A.pers[i * 6 + k] + d)); };

// memory kinds: [name, thought on recall, core personality shift [k, delta]...]
export const MEM = [
  ["", 0, []],
  ["a child's death", "mourning_kin", [[1, 3], [2, -3]]],
  ["a beloved's death", "lost_a_beloved", [[1, 4], [3, -2]]],
  ["kin on the Pyra", "a_friend_went_to_the_pyre", [[5, -3], [1, 3]]],
  ["a betrayal", "heartbroken", [[3, -6]]],
  ["being spared", "katharsis", [[3, 5]]],
  ["a broken oath", "hounded_by_the_furies", [[0, -4]]],
  ["vengeance", "vengeance_taken", [[3, -3], [0, -2]]],
  ["being driven out", "exiled", [[3, -5]]],
  ["the cleansing", "katharsis", [[0, 4]]],
  ["being forgotten", "heartbroken", [[1, 5], [2, -2]]],
  ["a stranger's gift", "touched_by_the_maker", [[3, 4], [0, 2]]],
];
export const SCARS = ["", "the smoke-eater", "the mourner", "the silent", "the cruel", "the wanderer", "the oath-maker", "the unnaming", "the bone-breaker"];

export function initMemory(w) { w.oaths = []; w.curses = {}; }

/** keep a heavy memory if it outweighs the weakest slot */
export function memorize(ctx, i, kind, who, str) {
  const A = ctx.A; if (i < 0 || A.status[i] >= 2 && A.status[i] <= 3) return;
  let k = -1, low = 256;
  for (let s = 0; s < LTM; s++) { const x = i * LTM + s; if (!A.ltmKind[x]) { k = s; break; } if (!(A.ltmCore[i] >> s & 1) && A.ltmStr[x] < low) { low = A.ltmStr[x]; k = s; } }
  if (k < 0 || (A.ltmKind[i * LTM + k] && low >= str)) return;
  const x = i * LTM + k; A.ltmKind[x] = kind; A.ltmWho[x] = who; A.ltmDay[x] = ctx.day; A.ltmStr[x] = str; A.ltmCore[i] &= ~(1 << k);
}

/** the re-knit: the shade drinks from Lethe, unless it knows the password of the spring of Memory */
export function onReknit(ctx, i) {
  const { A, w, day } = ctx, r = ctx.rr;
  if (A.mystes[i]) { if (r.chance(0.1)) ctx.log(ctx.E.lethe, i, -1, A.district[i], A.mystes[i], "memory"); return; }
  A.lethe[i] = Math.min(255, A.lethe[i] + 1);
  let lost = 0;
  for (let t = 0; t < TIES; t++) { const s = i * TIES + t; if (A.tieTo[s] >= 0 && r.chance(0.35)) { A.tieTo[s] = -1; A.tieVal[s] = 0; lost++; } }
  for (let s = 0; s < LTM; s++) if (!(A.ltmCore[i] >> s & 1) && r.chance(0.5)) A.ltmKind[i * LTM + s] = 0;
  const lv = A.lover[i];
  if (lv >= 0 && r.chance(0.3)) {   // she came back and did not know him
    A.lover[i] = -1; if (A.lover[lv] === i) A.lover[lv] = -1; oathEnds(ctx, i, "love", true); oathEnds(ctx, lv, "love", true);   // Lethe excuses
    if (alive(A, lv)) { ctx.think(lv, TH.lost_a_beloved); memorize(ctx, lv, 10, i, 95); A.stress[lv] = Math.min(600, A.stress[lv] + 120); }
    ctx.log(ctx.E.lethe, i, lv, A.district[i], lost, "beloved"); return;
  }
  // its own Leaves: a child it no longer knows
  for (let t = 0; t < TIES; t++) { const c = A.tieTo[i * TIES + t]; if (c >= 0 && (A.p1[c] === i || A.p2[c] === i) && alive(A, c) && r.chance(0.25)) {
    A.tieTo[i * TIES + t] = -1; A.tieVal[i * TIES + t] = 0; ctx.think(c, TH.heartbroken); memorize(ctx, c, 10, i, 85);
    ctx.log(ctx.E.lethe, i, c, A.district[i], lost, "child"); break; } }
  if (A.lethe[i] === 3) ctx.cognomen(i, 22);
}

/** oaths: sworn, kept, broken (a broken oath curses the swearer's line for three generations) */
export function swear(ctx, i, to, kind, days) {
  const { A, w, day } = ctx; if (w.oaths.length >= 600 || w.oaths.some((o) => o.who === i && o.kind === kind)) return;
  w.oaths.push({ who: i, to, kind, day, until: day + days });
  if (kind !== "love" || ctx.rr.chance(0.15)) ctx.log(ctx.E.oath, i, to, A.district[i], 0, kind); else ctx.trace(ctx.E.oath, i, to, A.district[i]);
}
export function oathEnds(ctx, i, kind, kept) {
  const { A, w, day } = ctx, k = w.oaths.findIndex((o) => o.who === i && o.kind === kind); if (k < 0) return;
  const o = w.oaths.splice(k, 1)[0];
  if (kept) { if (kind === "vengeance") ctx.trace(ctx.E.oath, i, o.to, A.district[i]); return; }
  memorize(ctx, i, 6, o.to, 80); ctx.cognomen(i, 4); ctx.renown(i, -50);
  const L = A.lineage[i]; let gen = 0; for (let c = 9999; c < w.N; c++) if (A.lineage[c] === L && A.gen[c] > gen) gen = A.gen[c];
  if (!w.curses[L] && Object.keys(w.curses).length < 40) w.curses[L] = { since: day, gen, by: i, kind, n: 0 };
  ctx.log(ctx.E.oath, i, o.to, A.district[i], gen, "broken");
}
export const cursed = (w, A, i) => w.curses[A.lineage[i]] !== undefined;

/** a Leaf of a cursed line dies: the curse is counted, and noticed */
export function onLeafDeath(ctx, i, age, violent) {
  const { A, w } = ctx, c = w.curses[A.lineage[i]];
  for (const p of [A.p1[i], A.p2[i]]) if (p >= 0 && A.status[p] !== 2 && A.status[p] !== 3) {
    memorize(ctx, p, 1, i, 90);
    if (!A.kind[p]) { A.buried[p] = Math.min(65535, A.buried[p] + 1); const b = A.buried[p];
      if (b === 5 || b === 10 || b === 25 || b === 50 || b === 100) ctx.log(ctx.E.weight, p, i, A.district[p], b, "");
      if (b === 10 && !A.scar[p]) A.scar[p] = 7; }
  }
  const lv = A.lover[i]; if (lv >= 0) memorize(ctx, lv, 2, i, 100);
  if (c && (age < 30 || violent)) { c.n++; if (c.n === 1 || c.n % 3 === 0) ctx.log(ctx.E.curse, i, c.by, A.district[i] < D.pyra ? A.district[i] : D.agora, c.n, "fulfilled"); }
}

/** the first breakdown leaves a mark that never leaves */
export function scarOf(ctx, i) {
  const A = ctx.A; if (A.scar[i] || !ctx.rr.chance(0.5)) return;
  const s = P(A, i, 1) > 65 ? 2 : P(A, i, 2) < 35 ? 3 : P(A, i, 3) < 35 ? 4 : P(A, i, 5) > 65 ? 5 : P(A, i, 4) < 35 ? 1 : P(A, i, 0) > 65 ? 6 : A.kind[i] ? 2 : 8;
  A.scar[i] = s; if (s === 1) A.vice[i] = 2;
  ctx.log(ctx.E.scar, i, -1, A.district[i], s, SCARS[s]);
}

export function memoryDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("memory"), E = ctx.E, slot = ((day % 7) + 7) % 7;
  const deathsToday = ctx.ev.some((e) => e.t === "death");
  for (const i of ctx.live) {
    if (A.status[i]) continue;
    // scars: the habits of the broken
    const sc = A.scar[i];
    if (sc === 2 && deathsToday) A.stress[i] = Math.max(0, A.stress[i] - 6);
    else if (sc === 8 && r.chance(1 / 7)) A.stress[i] = Math.max(0, A.stress[i] - 30);
    else if (sc === 5 && r.chance(0.01) && adult(A, i, day)) { const q = DISTRICTS.map((d, k) => k).filter((k) => DISTRICTS[k].kind === "quarter"); A.district[i] = q[r.int(q.length)]; }
    // recall: anniversaries always; otherwise a rotating seventh of the city remembers its heaviest day
    for (let s = 0; s < LTM; s++) {
      const x = i * LTM + s, kind = A.ltmKind[x]; if (!kind) continue;
      const since = day - A.ltmDay[x], anniv = since > 0 && since % 360 === 0;
      if (!anniv && (i % 7 !== slot || r.next() > A.ltmStr[x] / 400)) continue;
      ctx.think(i, TH[MEM[kind][1]] || TH.mourning_kin);
      if (anniv && A.ltmStr[x] >= 80 && (i < 9999 || r.chance(0.3))) ctx.log(E.memory, i, A.ltmWho[x], A.district[i], since / 360, MEM[kind][0]);
      A.ltmStr[x] = Math.max(1, A.ltmStr[x] - (A.ltmStr[x] >> 4));
      if (!(A.ltmCore[i] >> s & 1) && A.ltmStr[x] >= 50 && r.chance(1 / 3)) {
        A.ltmCore[i] |= 1 << s; for (const [k, d] of MEM[kind][2]) bump(A, i, k, d);
        if (kind === 5 && A.ltmWho[x] >= 0) ctx.tie(i, A.ltmWho[x], 20);
        if (i < 9999 && r.chance(0.2)) ctx.log(E.memory, i, A.ltmWho[x], A.district[i], 0, (kind === 5 || kind === 9 || kind === 11 ? "core+:" : "core-:") + MEM[kind][0]); else ctx.trace(E.memory, i, A.ltmWho[x], A.district[i]);
      }
      break;
    }
  }

  // oaths fall due: vengeance unpaid by its day is broken; love outlives its term and is kept
  if (day % 7 === 0 && w.oaths.length) {
    for (const o of w.oaths.slice()) {
      if (day < o.until && A.status[o.who] !== 2 && A.status[o.who] !== 3) continue;
      if (A.status[o.who] === 2 || A.status[o.who] === 3) { w.oaths.splice(w.oaths.indexOf(o), 1); continue; }
      if (o.kind === "vengeance" && A.avenge[o.who] === o.to + 1 && A.status[o.to] === ST.living) { A.avenge[o.who] = 0; oathEnds(ctx, o.who, o.kind, false); }
      else oathEnds(ctx, o.who, o.kind, true);
    }
  }
  // curses lift after three generations (or when the swearer burns)
  if (day % 30 === 0) for (const L of Object.keys(w.curses)) {
    const c = w.curses[L]; let gen = 0; for (let x = 9999; x < w.N; x++) if (A.lineage[x] === Number(L) && A.status[x] === 0 && A.gen[x] > gen) gen = A.gen[x];
    if (gen >= c.gen + 3 || A.status[c.by] === 2 || A.status[c.by] === 3 || day - c.since > 1440) { delete w.curses[L]; ctx.log(E.curse, Number(L), c.by, D.agora, c.n, "lifted"); }
  }

  // the mysteries of Samothrace, each year in Aretion: the uninitiated confess their worst deed and are given the password of Memory
  const dy = ((day % 360) + 360) % 360;
  if (day >= -360 && dy === 215) {
    const priests = ctx.live.filter((i) => !A.status[i] && A.job[i] === J.priest && adult(A, i, day));
    if (priests.length) {
      let n = 0, confessed = -1, worst = 0;
      for (const i of ctx.live) {
        if (A.status[i] || A.mystes[i] || !adult(A, i, day) || A.obols[i] < 20) continue;
        if (!r.chance(0.015 + (A.devotion[i] > 40 ? 0.05 : 0) + (A.deaths[i] ? 0.03 : 0) + (A.lethe[i] ? 0.08 : 0) + (A.buried[i] ? 0.05 : 0))) continue;
        const p = priests[r.int(priests.length)]; A.obols[i] -= 20; A.obols[p] += 20; A.mystes[i] = 1; ctx.think(i, TH.awe_at_an_omen); n++;
        const sin = (A.cognomen[i] === 21 ? 3 : 0) + (A.cognomen[i] === 9 ? 2 : 0) + (A.cognomen[i] === 4 ? 2 : 0) + (A.miasma[i] ? 1 : 0);
        if (sin > worst) { worst = sin; confessed = i; }
      }
      if (n) ctx.log(E.mysteries, confessed, -1, D.agora, n, worst ? (A.cognomen[confessed] === 21 ? "kin" : "blood") : "");
    }
  }
}
