// The Voyage and the Household: places from the voyage that change the world once (the Clashing Rocks, Talos), Alcinous'
// arbitration, pilgrimage to Circe; and the household's law: wedding gifts, grain loans between neighbours, good strife,
// the grain wardens, and names of fire for children born on the day of a burn.
// Sources (docs/research/MYTH.md §1.1, 1.9, 2.3, 3.7, 4.3): Ap. 2.549-606 (the dove sent first through the Symplegades, which
// then stand fixed for ever); Ap. 4.1638-1688 (Talos, the bronze man, brought down by Medea through the nail at his ankle);
// Ap. 4.1068-1169 (Alcinous' conditional ruling and Arete's message in the night); Ap. 4.659-752 (Circe purifies Jason and
// Medea); WD 349-351 ("measure back with the same measure, or better if you can"), WD 11-26 (the two Strifes); the Athenian
// sitophylakes; Pyrrha and Pyrrhos (fire names).
import { DISTRICTS, D, ST, TH, J, BASE_PRICE } from "./lore.js";
import { TIES } from "./world.js";
import { CITIES } from "./war.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
const cityOf = (d) => (CITIES.includes(d) ? d : D.agora);
export const ROCKS = [D.reef, D.drepane];   // the lane the Clashing Rocks shut

export function initVoyage(w) { w.trips = []; w.rocks = { open: false, tries: 0 }; w.talos = { alive: true }; w.loans = []; w.aeaea = []; }
/** is the lane between a and b shut by the Clashing Rocks? */
export const rocksShut = (w, a, b) => w.rocks && !w.rocks.open && ((a === ROCKS[0] && b === ROCKS[1]) || (a === ROCKS[1] && b === ROCKS[0]));

export function voyageDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("voyage"), E = ctx.E, dm = ((day % 30) + 30) % 30;

  // ---- the Symplegades: until a crew runs the Clashing Rocks, the lane from the Reef to Drepane is shut; after, it is open for ever
  if (!w.rocks.open && dm === 18 && r.chance(0.35)) {
    const crew = (ctx.byDist[D.reef] || []).filter((i) => alive(A, i) && adult(A, i, day) && (A.job[i] === J.rower || A.job[i] === J.pirate)).sort((x, y) => (P(A, y, 4) + (100 - P(A, y, 1))) - (P(A, x, 4) + (100 - P(A, x, 1))) || x - y).slice(0, 12);
    if (crew.length >= 6) {
      w.rocks.tries++; const helm = crew[0], ok = r.chance(0.25 + w.rocks.tries * 0.05);
      if (ok) { w.rocks.open = true; w.rocks.day = day; w.rocks.by = helm; ctx.cognomen(helm, 27); ctx.renown(helm, 120); for (const i of crew) ctx.memorize(i, 5, helm, 70); ctx.log(E.voyage, helm, -1, D.reef, crew.length, "rocks-open"); }
      else { let n = 0; for (const i of crew) if (r.chance(0.3)) { ctx.kill(i, "crushed between the Clashing Rocks"); n++; } ctx.log(E.voyage, helm, -1, D.reef, n, "rocks-fail"); }
    }
  }

  // ---- Talos: the bronze man walks the harbour, stoning pirates, until the Medea pulls the nail from his ankle
  if (w.talos.alive) {
    if (r.chance(0.02)) { const pir = (ctx.byDist[D.agora] || []).concat(ctx.byDist[D.reef] || []).filter((i) => alive(A, i) && A.job[i] === J.pirate); if (pir.length) { const v = pir[r.int(pir.length)]; ctx.kill(v, "stoned by Talos from the cliffs"); ctx.log(E.voyage, v, -1, D.agora, 0, "talos-stones"); } }
    const medea = w.offices && w.offices.medea;
    if (alive(A, medea) && dm === 9 && r.chance(0.04)) { w.talos.alive = false; w.talos.day = day; ctx.renown(medea, 100); ctx.log(E.voyage, medea, -1, D.agora, 0, "talos-falls"); }
  }

  // ---- Alcinous' ruling: an old feud is put before one of the sky-blooded, who rules on a condition; a message in the night finds the loophole
  if (dm === 27 && w.feuds) {
    const old = Object.entries(w.feuds).filter(([, f]) => f.n >= 3).sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1))[0];
    const judges = ctx.live.filter((i) => alive(A, i) && A.bones[i] === 8 && adult(A, i, day));
    if (old && judges.length && r.chance(0.5)) {
      const [key, f] = old, judge = judges[r.int(judges.length)], loophole = r.chance(0.3);
      delete w.feuds[key]; for (const i of ctx.live) if (A.avenge[i] && (A.lineage[i] === f.a || A.lineage[i] === f.b) && (!loophole || r.chance(0.5))) A.avenge[i] = 0;
      ctx.renown(judge, 40); ctx.log(E.voyage, judge, f.a, A.district[judge] < D.pyra ? A.district[judge] : D.agora, f.n, (loophole ? "alcinous-loophole|" : "alcinous|") + f.b);
    }
  }

  // ---- Aeaea: the hounded sail to Circe, sit silent at her hearth, and come back clean
  for (const i of ctx.live) {
    if (A.status[i] || A.fury[i] < 20 || A.obols[i] < 60 || !r.chance(0.03)) continue;
    A.obols[i] -= 60; w.treasury += 60; ctx.trip(i, A.district[i], D.agora, "aeaea"); A.status[i] = ST.exiled; A.until[i] = day + 20; w.aeaea.push({ i, back: day + 20 }); ctx.log(E.voyage, i, -1, A.district[i], 0, "aeaea-go");
  }
  for (const x of w.aeaea.slice()) if (day >= x.back && A.status[x.i] === ST.living) { w.aeaea.splice(w.aeaea.indexOf(x), 1); A.fury[x.i] = 0; A.miasma[x.i] = 0; ctx.think(x.i, TH.katharsis); ctx.memorize(x.i, 9, -1, 80); ctx.log(E.voyage, x.i, -1, A.district[x.i], 0, "aeaea-back"); }
    else if (A.status[x.i] === 2 || A.status[x.i] === 3) w.aeaea.splice(w.aeaea.indexOf(x), 1);

  // ---- grain loans fall due: measure back with the same measure, or better (WD 349)
  if (w.loans.length) for (const L of w.loans.slice()) {
    if (day < L.due) continue; w.loans.splice(w.loans.indexOf(L), 1);
    if (!alive(A, L.to) || !alive(A, L.from)) continue;
    if (A.inv[L.to * 5] >= L.q + 4) { A.inv[L.to * 5] -= L.q + 1; A.inv[L.from * 5] += L.q + 1; ctx.tie(L.from, L.to, 8); ctx.tie(L.to, L.from, 6); }
    else { ctx.tie(L.from, L.to, -12); A.fame[L.to] = Math.max(-100, A.fame[L.to] - 2); }
  }

  // ---- the grain wardens: in a famine city, a hoarder's stores are opened to the hungry at the old price
  if (day % 5 === 0) for (const c of CITIES) {
    if (w.cprices[c][0] < BASE_PRICE[0] * 3) continue;
    const pool = ctx.live.filter((i) => alive(A, i) && cityOf(A.district[i]) === c), hoard = pool.filter((i) => A.inv[i * 5] > 50).sort((x, y) => A.inv[y * 5] - A.inv[x * 5] || x - y)[0];
    if (hoard === undefined) continue;
    const hungry = pool.filter((i) => A.hunger[i] && A.obols[i] >= BASE_PRICE[0] * 2); let sold = 0;
    for (const i of hungry) { if (A.inv[hoard * 5] <= 20) break; const p = Math.ceil(BASE_PRICE[0] * 2); A.obols[i] -= p; A.obols[hoard] += p; A.inv[i * 5] += 2; A.inv[hoard * 5] -= 2; sold += 2; }
    if (sold >= 20) { A.fame[hoard] = Math.max(-100, A.fame[hoard] - 10); ctx.log(E.voyage, hoard, -1, c, sold, "wardens"); }
  }
}

/** a neighbour asks for grain: a loan, not a gift (called from the encounter) */
export function lendGrain(ctx, lender, borrower, q) {
  const { A, w } = ctx; if (w.loans.length >= 800) return false;
  A.inv[lender * 5] -= q; A.inv[borrower * 5] += q; w.loans.push({ from: lender, to: borrower, q, due: ctx.day + 30 }); return true;
}

/** the two Strifes: a rival at the same trade next door makes you work harder; hatred makes you worse */
export function strife(A, i) {
  let m = 1; const d = A.district[i], job = A.job[i];
  for (let t = 0; t < TIES; t++) { const j = A.tieTo[i * TIES + t]; if (j < 0 || A.job[j] !== job || A.district[j] !== d) continue; const v = A.tieVal[i * TIES + t]; if (v <= -10 && v > -60) { m = 1.05; break; } if (v <= -60) { m = 0.95; break; } }
  return m;
}

/** wedding gifts: when two Leaves fall in love, their living parents give from their purses */
export function weddingGifts(ctx, a, b) {
  const A = ctx.A; let g = 0;
  for (const x of [a, b]) for (const p of [A.p1[x], A.p2[x]]) if (alive(A, p) && A.obols[p] > 100) { const t = Math.floor(A.obols[p] * 0.05); A.obols[p] -= t; A.obols[x] += t; g += t; }
  return g;
}

/** the contest of the bow (Od. 21): when claimants to an office are close, they string the bow and shoot through the axes */
export function bowContest(ctx, cands, r) {
  const A = ctx.A; let best = -1, bv = -1;
  for (const i of cands) { const v = P(A, i, 4) + (100 - P(A, i, 1)) / 2 + P(A, i, 2) / 3 + ((A.mark[i] & 1) ? 25 : 0) + r.int(60); if (v > bv) { bv = v; best = i; } }
  return best;
}
