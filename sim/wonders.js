// Horrors and Wonders: the Dragon's Teeth sown again, the Kēres on the battlefield, the Empusa lover, Lamia blamed in famine,
// the body the Pyra will not take, the Bouphonia, Trophonius' cave, Cleomedes and the statue of Theagenes, the Cattle of the Sun.
// Sources (docs/research/MYTH.md §1.2, 2.1, 3.10, 3.13, 3.16): Ap. 3.1354ff (the earthborn); Il. 18.535-538 and Shield 248-257
// (the Kēres drink the blood of the fallen); Philostratus, VA 4.25 (the Empusa bride of Menippus) [late]; Diodorus 20.41 (Lamia);
// Leo Allatius on the vrykolakas [late]; Paus. 1.24.4 and Porphyry (the Bouphonia); Paus. 9.39 (Trophonius: "he never laughs
// again"); Paus. 6.9.6-8 (Cleomedes of Astypalaea) and 6.11.6-9 (Theagenes' statue); Od. 12.260-419 (the Cattle of Helios).
import { DISTRICTS, D, ST, TH, J } from "./lore.js";
import { nameOf } from "./narrate.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
const QUARTERS = DISTRICTS.map((d, k) => k).filter((k) => DISTRICTS[k].kind === "quarter");

export function initWonders(w) { w.empusai = []; w.unburnt = []; w.statues = []; w.sunEaters = []; w.teeth = -999; w.trophonius = -999; w.sunHerd = 300; }

export function wondersDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("wonders"), E = ctx.E, dy = ((day % 360) + 360) % 360;
  const pop = DISTRICTS.map(() => 0), hungry = DISTRICTS.map(() => 0);
  for (const i of ctx.live) if (!A.status[i]) { pop[A.district[i]]++; if (A.hunger[i]) hungry[A.district[i]]++; }

  // ---- the Kēres: after a lost battle, the wounded of the losing city die in the night
  for (const e of ctx.ev) {
    if (e.h || e.t !== "battle") continue;
    const parts = (e.s || "").split("|"), win = e.v, field = e.x, war = (w.war.wars || []).find((x) => parts[0] === x.name); const lose = war ? (war.a === win ? war.b : war.a) : -1; if (lose < 0) continue;
    let n = 0; for (const i of ctx.byDist[lose] || []) if (alive(A, i) && A.kind[i] && A.sick[i] && r.chance(0.12)) { ctx.kill(i, "taken by the Kēres in the night"); n++; }
    if (n) ctx.log(E.wonder, -1, -1, lose, n, "keres");
  }

  // ---- the Dragon's Teeth: a Leaf who cannot bear to be mortal sows teeth in the Field of Ares; what rises fights and crumbles
  if (day - w.teeth > 90 && r.chance(0.01)) {
    const cands = ctx.live.filter((i) => alive(A, i) && A.kind[i] && adult(A, i, day) && A.bones[i] === 0 && A.devotion[i] > 40 && P(A, i, 5) > 60 && (day - A.born[i]) / YEAR > 40);
    if (cands.length) {
      const s = cands[r.int(cands.length)], field = D.ares; w.teeth = day; let n = 0;
      for (const i of ctx.byDist[field] || []) if (alive(A, i) && A.kind[i] && r.chance(0.004)) { ctx.kill(i, "cut down by the half-risen earthborn"); n++; }
      for (const i of ctx.byDist[field] || []) if (alive(A, i) && r.chance(0.3)) ctx.think(i, TH.terror_at_an_omen);
      A.miasma[s] = Math.min(9, A.miasma[s] + 2); ctx.cognomen(s, 26);
      ctx.log(E.wonder, s, -1, field, n, "teeth");
    }
  }

  // ---- the Empusa: a lonely Leaf takes a lover too perfect to be true, and grows thin
  if (w.empusai.length < 3 && r.chance(0.03)) {
    const lonely = ctx.live.filter((i) => alive(A, i) && A.kind[i] && adult(A, i, day) && A.lover[i] < 0 && A.mood[i] < 0 && !w.empusai.some((x) => x.i === i));
    if (lonely.length) { const i = lonely[r.int(lonely.length)]; w.empusai.push({ i, day }); ctx.think(i, TH.in_love); ctx.log(E.wonder, i, -1, A.district[i], 0, "empusa"); }
  }
  for (const x of w.empusai.slice()) {
    const i = x.i; if (!alive(A, i)) { w.empusai.splice(w.empusai.indexOf(x), 1); continue; }
    A.sick[i] = Math.min(60, A.sick[i] + (r.chance(0.3) ? 1 : 0)); A.inv[i * 5] = Math.max(0, A.inv[i * 5] - 1);
    const seers = (ctx.byDist[A.district[i]] || []).filter((j) => alive(A, j) && (A.job[j] === J.augur || A.office[j] >= 0) && P(A, j, 5) > 55);
    if (seers.length && r.chance(0.035)) { const s = seers[r.int(seers.length)]; w.empusai.splice(w.empusai.indexOf(x), 1); ctx.tie(i, s, 30); ctx.memorize(i, 5, s, 70); ctx.log(E.wonder, s, i, A.district[i], day - x.day, "empusa-unmasked"); continue; }
    if (day - x.day > 30) { w.empusai.splice(w.empusai.indexOf(x), 1); ctx.kill(i, "drained by the Empusa"); ctx.log(E.wonder, i, -1, A.district[i], 30, "empusa-fed"); }
  }

  // ---- Lamia: in a starving quarter, the mothers blame the infant deaths on the childless queen
  for (const e of ctx.ev) {
    if (e.h || e.t !== "death" || e.s !== "died in infancy" || e.a < 0) continue;
    const d = A.district[A.p1[e.a]] ?? -1; if (d < 0 || pop[d] < 50 || hungry[d] < pop[d] * 0.15 || (w.lamiaAt && w.lamiaAt[d] > day - 20)) continue;
    (w.lamiaAt || (w.lamiaAt = {}))[d] = day; for (const i of ctx.byDist[d] || []) if (alive(A, i) && A.kind[i] && r.chance(0.1)) ctx.think(i, TH.haunted);
    ctx.log(E.wonder, e.a, -1, d, 0, "lamia");
  }

  // ---- the body the Pyra will not take: a Leaf of a cursed line who died by violence does not burn, and walks
  for (const e of ctx.ev) {
    if (e.h || e.t !== "death" || e.a < 9999 || e.b < 0 || !w.curses || !w.curses[A.lineage[e.a]] || w.unburnt.length >= 3 || !r.chance(0.4)) continue;
    w.unburnt.push({ i: e.a, day, d: A.district[e.a] < D.pyra ? A.district[e.a] : D.agora }); ctx.log(E.wonder, e.a, e.b, D.pyra, 0, "unburnt");
  }
  for (const u of w.unburnt.slice()) {
    for (const p of [A.p1[u.i], A.p2[u.i], A.lover[u.i]]) if (alive(A, p) && r.chance(0.25)) { A.sick[p] = Math.max(A.sick[p], 2); ctx.think(p, TH.haunted); }
    const priests = (ctx.byDist[u.d] || []).filter((j) => alive(A, j) && A.job[j] === J.priest && A.devotion[j] > 50);
    if ((priests.length && r.chance(0.05)) || day - u.day > 40) { w.unburnt.splice(w.unburnt.indexOf(u), 1); ctx.log(E.wonder, priests.length ? priests[0] : -1, u.i, u.d, day - u.day, "laid"); }
  }

  // ---- the Bouphonia (in Iolkion): the ox is slain, the knife is tried for murder and thrown into the sea; the city is clean
  if (day >= -360 && dy === 340) { let n = 0; for (const i of ctx.live) if (alive(A, i) && A.miasma[i] && r.chance(0.3)) { A.miasma[i]--; n++; } ctx.log(E.wonder, -1, -1, D.agora, n, "bouphonia"); }

  // ---- Trophonius: someone with an unanswered question goes down into the cave feet first, and comes back knowing, and never laughs again
  if (day - w.trophonius > 30 && r.chance(0.05)) {
    const c = (w.cases || []).find((x) => x.open && day - x.day > 10);
    const asker = c ? [A.p1[c.v], A.p2[c.v], A.lover[c.v]].find((p) => alive(A, p) && adult(A, p, day)) : undefined;
    if (asker !== undefined) {
      w.trophonius = day; c.sus[c.k] = (c.sus[c.k] || 0) + 3; A.scar[asker] = A.scar[asker] || 3; A.stress[asker] = Math.min(600, A.stress[asker] + 150);
      ctx.log(E.wonder, asker, c.v, D.bear, 0, "trophonius");
    }
  }

  // ---- Cleomedes: a champion who killed in the boxing is denied the prize, goes mad, and vanishes; the god says honour him
  for (const e of ctx.ev) {
    if (e.h || e.t !== "death" || e.s !== "died in the boxing at the games") continue;
    const champ = ctx.ev.find((x) => x.t === "games" && !x.h && (x.s || "").includes("held"));
    const boxer = champ ? Number(((champ.s || "").split("|")[2] || "").split(",").map((p) => p.split(":")).find(([ev]) => ev === "the boxing")?.[1] ?? -1) : -1;
    if (!alive(A, boxer) || !r.chance(0.5)) continue;
    let n = 0; for (const i of ctx.byDist[A.district[boxer]] || []) if (i !== boxer && alive(A, i) && A.kind[i] && day - A.born[i] < 14 * YEAR && r.chance(0.01) && n < 6) { ctx.kill(i, "crushed when Cleomedes' madness pulled down the school roof", boxer, false); n++; }
    A.status[boxer] = ST.exiled; A.until[boxer] = day + 90; A.district[boxer] = D.agora; ctx.renown(boxer, 60);
    ctx.log(E.wonder, boxer, e.a, D.agora, n, "cleomedes");
  }
  // statues of champions; one falls on the man who flogs it, is tried, thrown into the sea, and the fields fail until it is fished up
  for (const e of ctx.ev) if (!e.h && e.t === "games" && (e.s || "").startsWith("held") && e.a >= 0) { w.statues.push({ who: e.a, d: A.district[e.a] < D.pyra ? A.district[e.a] : D.agora, day, sea: false }); if (w.statues.length > 20) w.statues.shift(); }
  for (const st of w.statues) {
    if (st.sea) { w.fertility[st.d] = Math.min(w.fertility[st.d], 600); if (day - st.sea > 45 && r.chance(0.1)) { st.sea = false; st.back = day; ctx.log(E.wonder, st.who, -1, st.d, 0, "statue-back"); } continue; }
    if (st.back || !r.chance(0.0015)) continue;
    let foe = -1; for (let t = 0; t < 8; t++) { const j = A.tieTo[st.who * 8 + t]; if (alive(A, j) && A.tieVal[st.who * 8 + t] < -40) { foe = j; break; } }
    if (foe < 0) continue;
    ctx.kill(foe, "crushed by the statue he was flogging"); st.sea = day; ctx.log(E.wonder, st.who, foe, st.d, 0, "statue");
  }

  // ---- the Cattle of the Sun: in a starving sea-quarter, the hungry kill the god's herd; the sea takes them for it
  for (const d of [D.drepane, D.anthemoessa, D.reef]) {
    if (pop[d] < 50 || hungry[d] < pop[d] * 0.2 || w.sunHerd < 20 || !r.chance(0.03)) continue;
    const eaters = (ctx.byDist[d] || []).filter((i) => alive(A, i) && A.hunger[i] && adult(A, i, day)).slice(0, 12);
    for (const i of eaters) { A.inv[i * 5] += 6; A.hunger[i] = 0; w.sunEaters.push({ i, until: day + 10 + r.int(30) }); }
    w.sunHerd -= eaters.length * 3; ctx.log(E.wonder, eaters[0] ?? -1, -1, d, eaters.length, "sun-cattle");
  }
  for (const x of w.sunEaters.slice()) { if (day < x.until) continue; w.sunEaters.splice(w.sunEaters.indexOf(x), 1); if (alive(A, x.i)) ctx.kill(x.i, "drowned by Helios' anger for the cattle"); }
  if (dy === 0) w.sunHerd = Math.min(300, w.sunHerd + 60);
}
