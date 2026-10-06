// The Unclean City: pollution, purification, blood-feud, supplication, the restless dead and the scapegoat.
// Sources (docs/research/MYTH.md §3.2-3.5, 3.11, 3.13): Parker, *Miasma* (1983); Draco's homicide law (IG I³ 104);
// Aesch. *Eumenides*; Il. 9.632-636 and 18.497-508 (blood-price); Gould, "Hiketeia" (JHS 1973); Johnston, *Restless Dead* (1999);
// Bremmer on the pharmakos. Canon: killing a Minyas only breaks it, so its blood-price is half a Leaf's.
import { DISTRICTS, D, ST, TH, J } from "./lore.js";
import { TIES } from "./world.js";
import { xeniaViolated } from "./gift.js";
import { openCase } from "./hidden.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
const kin = (A, i, j) => A.p1[i] === j || A.p2[i] === j || A.p1[j] === i || A.p2[j] === i || A.lover[i] === j ||
  (A.kind[i] && A.kind[j] && A.p1[i] >= 0 && (A.p1[i] === A.p1[j] || A.p1[i] === A.p2[j] || A.p2[i] === A.p1[j] || A.p2[i] === A.p2[j]));
const lineKey = (a, b) => Math.min(a, b) + ":" + Math.max(a, b);
export const PRICE_LEAF = 120, PRICE_BONE = 60;   // poinē in obols: bone knits again, so it is worth half

export function initMiasma(w) { w.blood = []; w.feuds = {}; w.restless = []; w.pollution = DISTRICTS.map(() => 0); w.scapegoat = DISTRICTS.map(() => -999); }

/** stain someone; a stain of 3 or more on a kin-slayer wakes the Erinyes */
export function pollute(ctx, i, n) {
  const A = ctx.A; A.miasma[i] = Math.min(9, A.miasma[i] + n);
  if (n >= 3 && !A.fury[i]) { A.fury[i] = 1; ctx.think(i, TH.hounded_by_the_furies); ctx.log(ctx.E.erinyes, i, -1, A.district[i]); }
}

/** every killing with a known hand: pollution, a blood-debt to settle, and for a Leaf cut off young or by violence, a restless shade */
export function onKilling(ctx, v, k, hidden = false) {
  const { A, w, day } = ctx; if (k < 0 || k === v || k >= ctx.w.N) return;
  const kinslayer = kin(A, v, k) || (A.lineage[v] === A.lineage[k] && A.kind[v]);
  const guest = xeniaViolated(ctx, v, k);
  pollute(ctx, k, kinslayer || guest ? 3 : A.kind[v] ? 2 : 1);
  if (guest && !hidden) ctx.log(ctx.E.xenoi, k, v, A.district[k], 0, "violated");
  if (kinslayer && !hidden) { ctx.log(ctx.E.kinslayer, k, v, A.district[k]); ctx.cognomen(k, 21); ctx.renown(k, -60); }
  if (hidden) openCase(ctx, v, k); else { w.blood.push({ v, k, day, d: A.district[k] }); if (w.blood.length > 200) w.blood.shift(); }
  if (A.kind[v] && !A.mystes[v] && w.restless.length < 60) w.restless.push({ i: v, k, day, d: A.district[v] < D.pyra ? A.district[v] : A.district[k] });
}

/** a Leaf who dies before its time without a hand to blame still walks a while (aōros) */
export function onUntimely(ctx, v) {
  const { A, w, day } = ctx; if (w.restless.length >= 60) return;
  w.restless.push({ i: v, k: -1, day, d: A.district[v] < D.pyra ? A.district[v] : D.agora });
}

/** a real burn on the chain: fire cleanses the house of every feud its line was in */
export function onBurn(ctx, i) {
  const { A, w } = ctx, L = A.lineage[i];
  for (const key of Object.keys(w.feuds)) { const f = w.feuds[key]; if (f.a !== L && f.b !== L) continue; delete w.feuds[key]; ctx.log(ctx.E.feudend, i, f.a === L ? f.b : f.a, D.pyra, f.n, "fire"); }
  A.miasma[i] = 0; A.fury[i] = 0;
}

export function miasmaDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("miasma"), E = ctx.E, nD = DISTRICTS.length;
  const pol = new Int32Array(nD), pop = new Int32Array(nD), priests = DISTRICTS.map(() => []), sick = new Int32Array(nD), hungry = new Int32Array(nD);
  const altar = new Uint8Array(nD); altar[D.agora] = 1; altar[D.grove] = 1; for (const F of w.faiths) if (F.alive && F.temple >= 0) altar[F.temple] = 1;
  for (const i of ctx.live) {
    if (A.status[i]) continue; const d = A.district[i]; pop[d]++; pol[d] += A.miasma[i]; if (A.sick[i]) sick[d]++; if (A.hunger[i]) hungry[d]++;
    if (A.job[i] === J.priest && !A.miasma[i] && !A.jail[i] && adult(A, i, day)) priests[d].push(i);
  }
  w.pollution = Array.from(pol);

  // 1. the god's anger: a city that does not cleanse its killers sickens (Oedipus; WD 240)
  for (let d = 0; d < nD; d++) {
    if (pop[d] < 30 || pol[d] < 8 + pop[d] / 60 || !r.chance(0.04)) continue;
    let n = 0; const pool = ctx.byDist[d];
    for (let t = 0; t < 12 && pool.length; t++) { const i = pool[r.int(pool.length)]; if (!A.status[i] && !A.immune[i]) { A.sick[i] = Math.max(A.sick[i], 1); ctx.think(i, TH.plague_dread); n++; } }
    ctx.log(E.blight, -1, -1, d, pol[d]);
  }

  // 2. the Erinyes, purification, and time
  for (const i of ctx.live) {
    if (A.status[i] || (!A.miasma[i] && !A.fury[i])) continue;
    if (A.fury[i]) {
      A.fury[i] = Math.min(255, A.fury[i] + 1); A.stress[i] = Math.min(600, A.stress[i] + 18); if (r.chance(0.3)) ctx.think(i, TH.hounded_by_the_furies);
      if (A.fury[i] > 90 && r.chance(0.04)) { A.fury[i] = 0; ctx.log(E.katharsis, i, -1, A.district[i], A.miasma[i], "kindly"); A.miasma[i] = 0; continue; }   // the Kindly Ones relent
    }
    if (A.jail[i] || !adult(A, i, day) || !r.chance(0.15)) { if (!A.fury[i] && r.chance(0.01)) A.miasma[i]--; continue; }
    const ps = priests[A.district[i]]; if (!ps.length) continue;
    const fee = Math.ceil((A.miasma[i] * 4 + (A.fury[i] ? 30 : 0)) * (w.houses && w.houses[A.lineage[i]] && w.houses[A.lineage[i]].legacies.includes("the Pyre-keepers") ? 0.5 : 1)), p = ps[r.int(ps.length)];
    if (A.obols[i] < fee) continue;
    A.obols[i] -= fee; A.obols[p] += fee; const was = A.miasma[i], hounded = A.fury[i] > 0; if (hounded) ctx.memorize(i, 9, p, 70); A.miasma[i] = 0; A.fury[i] = 0; ctx.think(i, TH.katharsis);
    if (hounded || was >= 3) ctx.log(E.katharsis, i, p, A.district[i], was, hounded ? "furies" : ""); else ctx.trace(E.katharsis, i, p, A.district[i]);
  }

  // 3. blood-debts: after three days the dead one's people choose blood-price, or vengeance (Il. 18.497-508)
  const due = w.blood.filter((b) => day - b.day >= 3); w.blood = w.blood.filter((b) => day - b.day < 3);
  for (const b of due) {
    const { v, k } = b; if (!alive(A, k) && A.status[k] !== ST.exiled) continue;
    let av = -1, best = -1;
    for (let t = 0; t < TIES; t++) { const j = A.tieTo[v * TIES + t], tv = A.tieVal[v * TIES + t]; if (!alive(A, j) || j === k || !adult(A, j, day)) continue;
      const s = tv + (kin(A, v, j) ? 60 : A.lineage[j] === A.lineage[v] ? 30 : 0); if (s > best && s > 40) { best = s; av = j; } }
    if (av < 0) continue;
    const La = A.lineage[av], Lk = A.lineage[k], key = lineKey(La, Lk), f = w.feuds[key] || (La !== Lk ? (w.feuds[key] = { a: La, b: Lk, n: 0, since: day, last: day, paid: 0 }) : null);
    if (f) { f.n++; f.last = day; }
    // the killer may clasp the avenger's knees; at an altar a refusal stains the one who refuses (Gould 1973)
    if (A.district[k] === A.district[av] && r.chance(0.2 + P(A, k, 1) / 300)) {
      const yes = r.chance(P(A, av, 3) / 160 + (altar[A.district[k]] ? 0.15 : 0) + (A.faith[av] === A.faith[k] ? 0.1 : 0));
      if (yes) { if (A.obols[k] >= 10) { A.obols[k] -= 10; A.obols[av] += 10; } ctx.memorize(k, 5, av, 70); ctx.log(E.supplication, k, av, A.district[k], 1, "spared"); continue; }
      if (altar[A.district[k]]) pollute(ctx, av, 2);
      ctx.log(E.supplication, k, av, A.district[k], 0, altar[A.district[k]] ? "altar" : "refused");
    }
    const price = A.kind[v] ? PRICE_LEAF : PRICE_BONE;
    const takes = r.chance(0.2 + P(A, av, 3) / 220 + P(A, av, 0) / 400 - Math.max(0, A.radical[av]) / 300 - (f ? f.n * 0.08 : 0));
    if (takes && A.obols[k] >= price) {
      A.obols[k] -= price; A.obols[av] += price; if (f) f.paid++; ctx.log(E.poine, k, av, A.district[av], price, A.kind[v] ? "leaf" : "bone"); continue;
    }
    if (!A.avenge[av]) { A.avenge[av] = k + 1; ctx.log(E.vendetta, av, k, A.district[av], f ? f.n : 1, f && f.n > 1 ? "feud" : "sworn"); if (r.chance(0.5)) ctx.swear(av, k, "vengeance", 150); }
  }

  // 4. vendettas: the avenger goes looking (Draco: unpurged blood runs in families)
  for (const i of ctx.live) {
    if (!A.avenge[i] || A.status[i] || A.jail[i]) continue;
    const t = A.avenge[i] - 1;
    if (A.status[t] === ST.pyre || A.status[t] === ST.asphodel) { A.avenge[i] = 0; ctx.oathEnds(i, "vengeance", true); continue; }   // dead for good: the vow is discharged
    if (r.chance(0.006)) { A.avenge[i] = 0; ctx.oathEnds(i, "vengeance", false); continue; }                                     // the grief is spent; the vow is broken
    if (A.status[t] !== ST.living) continue;                                                                       // broken bone: wait for it to knit
    if (A.district[t] !== A.district[i]) { if (A.district[t] < D.pyra && r.chance(0.04)) { ctx.trip(i, A.district[i], A.district[t], "hunt-man"); A.district[i] = A.district[t]; } continue; }
    const due = w.oaths && w.oaths.find((o) => o.who === i && o.kind === "vengeance"), urgent = due && due.until - day < 15;   // an oath falling due presses the hand
    if (!r.chance(urgent ? 0.14 : 0.07)) continue;
    A.avenge[i] = 0; ctx.think(i, TH.vengeance_taken);
    if (r.chance(0.55)) { ctx.kill(t, "vengeance", i, r.chance(0.35)); ctx.cognomen(i, 20); ctx.renown(i, 10); ctx.oathEnds(i, "vengeance", true); ctx.memorize(i, 7, t, 60); }
    else { A.sick[t] = Math.max(A.sick[t], 3); A.stress[t] = Math.min(600, A.stress[t] + 120); ctx.log(E.vendetta, i, t, A.district[i], 0, "wounded"); }
  }

  // 5. the restless dead: shades of the untimely and the murdered walk; some name their killers (Johnston 1999)
  if (day >= 0 && ((day % 360) + 360) % 360 === 192 && w.restless.length) { ctx.log(E.restless, -1, -1, D.asphodel, w.restless.length, "anthesteria"); w.restless = []; }   // Chytroi: "out, Keres, the Anthesteria is over"
  const keep = [];
  for (const g of w.restless) {
    const age = day - g.day, k = g.k;
    const avenged = k >= 0 && (A.status[k] === ST.pyre || A.status[k] === ST.asphodel);
    if (age > (k >= 0 ? 90 : 30) || avenged) { if (age > 3) ctx.trace(E.restless, g.i, k, g.d); continue; }
    if (age === 4) { if (k >= 0 || r.chance(0.3)) ctx.log(E.restless, g.i, k, g.d, k >= 0 ? 1 : 0, k >= 0 ? "murdered" : "untimely"); else ctx.trace(E.restless, g.i, k, g.d); }
    for (const p of [A.p1[g.i], A.p2[g.i], A.lover[g.i]]) if (alive(A, p) && r.chance(0.2)) ctx.think(p, TH.haunted);
    if (k >= 0 && alive(A, k) && age > 4 && r.chance(0.03)) {
      A.stress[k] = Math.min(600, A.stress[k] + 80); ctx.think(k, TH.haunted); A.miasma[k] = Math.min(9, A.miasma[k] + 1);
      let heir = -1; for (const p of [A.p1[g.i], A.p2[g.i], A.lover[g.i]]) if (alive(A, p) && adult(A, p, day) && !A.avenge[p]) { heir = p; break; }
      if (heir >= 0) A.avenge[heir] = k + 1;
      ctx.log(E.shadenames, g.i, k, A.district[k], heir, ""); keep.push({ ...g, named: day }); continue;
    }
    keep.push(g);
  }
  w.restless = keep;

  // 6. the pharmakos (Thargelia): a city in plague, blight or famine drives out two of its least
  for (let d = 0; d < nD; d++) {
    if (DISTRICTS[d].kind !== "quarter" || pop[d] < 100 || day - w.scapegoat[d] < 60) continue;
    const crisis = sick[d] > pop[d] * 0.08 || hungry[d] > pop[d] * 0.25 || pol[d] > 10 + pop[d] / 40; if (!crisis || !r.chance(0.08)) continue;
    const pool = ctx.byDist[d].filter((i) => !A.status[i] && adult(A, i, day) && A.office[i] < 0 && i !== w.fleece);
    const worth = (i) => { let s = A.obols[i] + A.fame[i] * 3; for (let t = 0; t < TIES; t++) if (A.tieVal[i * TIES + t] > 0) s += A.tieVal[i * TIES + t]; return s; };
    pool.sort((x, y) => worth(x) - worth(y) || x - y); const goats = pool.slice(0, 2); if (goats.length < 2) continue;
    w.scapegoat[d] = day;
    for (const g of goats) { ctx.memorize(g, 8, -1, 90); ctx.trip(g, d, D.agora, "exile"); A.status[g] = ST.exiled; A.until[g] = day + 60; A.district[g] = D.agora; ctx.think(g, TH.exiled); ctx.cognomen(g, 19); }
    for (const i of ctx.byDist[d]) if (!A.status[i] && A.miasma[i]) A.miasma[i]--;
    ctx.log(E.pharmakos, goats[0], goats[1], d, pop[d], sick[d] > pop[d] * 0.08 ? "plague" : hungry[d] > pop[d] * 0.25 ? "famine" : "blight");
  }

  // feuds cool when no blood has run for a year
  if (day % 30 === 0) for (const key of Object.keys(w.feuds)) if (day - w.feuds[key].last > 360) delete w.feuds[key];
}

/** shunning: the polluted are avoided at the well and the table */
export const shun = (A, i, j) => (A.miasma[i] + A.miasma[j]) * 6;
