// Households, Crafts and Contagion: immunity and quarantine (SIR), skill learned at work and passed to apprentices, guardians
// for orphaned Leaves, the household's common jar, and Solon's shaking-off of burdens when debts crush the poor.
// Sources: Kermack and McKendrick (SIR, 1927) and Thucydides 2.47-54 (the plague at Athens: survivors were not taken twice);
// Henrich (skill transmitted by imitation of the best, in RESEARCH.md); WD 376-377 (one son to feed the father's house);
// Aristotle, Ath. Pol. 6 (the seisachtheia: Solon cancels debts); the Athenian orphan law (the archon guards orphans).
import { DISTRICTS, D, ST, TH, J } from "./lore.js";
import { TIES } from "./world.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];

export function initDepth(w) { w.quarantine = DISTRICTS.map(() => -999); w.debtLaw = -999; }
export const quarantined = (w, d) => w.quarantine && w.quarantine[d] >= w.day;
/** production multiplier from skill: a master works half again as well as a novice */
export const skillMult = (A, i) => 0.8 + A.skill[i] / 250;

export function depthDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("depth"), E = ctx.E, nD = DISTRICTS.length;
  const pop = new Int32Array(nD), sick = new Int32Array(nD);
  for (const i of ctx.live) { if (A.status[i]) continue; pop[A.district[i]]++; if (A.sick[i]) sick[A.district[i]]++;
    if (A.immune[i]) A.immune[i]--;                                             // immunity wanes over a season
    // skill grows at work, fastest for the conscientious, slower toward mastery
    if (adult(A, i, day) && A.skill[i] < 100 && r.chance((0.04 + P(A, i, 4) / 2000) * (1 - A.skill[i] / 110))) { A.skill[i]++; if (A.skill[i] === 95 && r.chance(0.3)) ctx.log(E.craftsman, i, -1, A.district[i], A.job[i], "master"); }
  }
  // ---- quarantine: an epidemic district is closed; nobody travels, the caravans stop, fewer meet
  for (let d = 0; d < nD; d++) {
    if (pop[d] < 50) continue;
    if (sick[d] > pop[d] * 0.08 && w.quarantine[d] < day) { w.quarantine[d] = day + 15; ctx.log(E.quarantine, -1, -1, d, sick[d], "closed"); }
    else if (w.quarantine[d] === day && sick[d] > pop[d] * 0.05) w.quarantine[d] = day + 10;
  }
  // ---- guardians for orphans: a child with no living parent is taken in by kin, a friend of the dead, or a childless Argonaut
  if (day % 7 === 0) for (let c = 9999; c < w.N; c++) {
    if (!alive(A, c) || adult(A, c, day) || A.guard[c]) continue;
    if (alive(A, A.p1[c]) || alive(A, A.p2[c]) || A.status[A.p1[c]] === ST.shade || A.status[A.p2[c]] === ST.shade) continue;
    let g = -1, best = -1;
    for (const p of [A.p1[c], A.p2[c]]) if (p >= 0) for (let t = 0; t < TIES; t++) { const j = A.tieTo[p * TIES + t], v = A.tieVal[p * TIES + t]; if (alive(A, j) && adult(A, j, day) && v > best && j !== c) { best = v; g = j; } }
    if (g < 0) { const pool = ctx.byDist[A.district[c]] || []; for (let t = 0; t < 30; t++) { const j = pool[r.int(pool.length)]; if (alive(A, j) && !A.kind[j] && A.lover[j] < 0 && P(A, j, 3) > 55) { g = j; break; } } }
    if (g < 0) continue;
    A.guard[c] = g + 1; ctx.tie(c, g, 40); ctx.tie(g, c, 50); ctx.log(E.ward, g, c, A.district[c], 0, A.kind[g] ? "kin" : "sown");
  }
  // ---- the common jar: each week the households of a city even out their grain (WD 376: feed the father's house)
  if (day % 7 === 3) {
    const byHouse = new Map(); for (const i of ctx.live) { if (A.status[i]) continue; const k = A.oikos[i] * 32 + A.district[i]; (byHouse.get(k) || byHouse.set(k, []).get(k)).push(i); }
    for (const mem of byHouse.values()) { if (mem.length < 2) continue; let rich = -1, poor = -1; for (const i of mem) { if (rich < 0 || A.inv[i * 5] > A.inv[rich * 5]) rich = i; if (poor < 0 || A.inv[i * 5] < A.inv[poor * 5]) poor = i; }
      if (rich !== poor && A.inv[rich * 5] > 14 && A.inv[poor * 5] < 3) { const q = Math.min(6, (A.inv[rich * 5] - A.inv[poor * 5]) >> 2); A.inv[rich * 5] -= q; A.inv[poor * 5] += q; } }
  }
  // ---- the seisachtheia: when unpaid debts pile up and the Boule leans to the commons, Solon's law cancels them
  if (day % 30 === 20 && w.loans && w.loans.length > 250 && day - w.debtLaw > 180) {
    const lean = w.boule.coalition.reduce((s, k) => s + w.factions[k].ideo[1] * w.factions[k].seats, 0) / Math.max(1, w.boule.coalition.reduce((s, k) => s + w.factions[k].seats, 0));
    if (lean < 0) { const n = w.loans.length; for (const L of w.loans) if (alive(A, L.to)) ctx.think(L.to, TH.feasted); w.loans = []; w.debtLaw = day; w.laws.unshift({ day, key: "debts", from: n, to: 0, adico: `[Every debt in grain] [must] [be forgiven] [this day] [or the stones of the field be torn up]` }); ctx.log(E.quarantine, -1, -1, D.agora, n, "seisachtheia"); }
  }
}

/** a recovered body is not taken twice for a season (Thuc. 2.51) */
export function recover(A, i) { A.sick[i] = 0; A.immune[i] = 90; }
/** children feed from a guardian if they have one */
export const guardianOf = (A, c) => (A.guard[c] ? A.guard[c] - 1 : -1);
