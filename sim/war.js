// City-states, asabiya and war (Turchin's metaethnic frontier theory; Turchin et al. 2013 for power and terrain).
import { DISTRICTS, D } from "./lore.js";

// the cities that can make war; terrain makes some hard to take
export const CITIES = ["agora", "ares", "bear", "anthemoessa", "reef", "eridanus", "drepane", "mist", "strand", "iolcus", "lemnos", "forges"].map((k) => D[k]);
const DEF = { bear: 1.5, mist: 1.6, forges: 1.3, drepane: 1.45, lemnos: 1.3, anthemoessa: 1.3, eridanus: 1.25, reef: 1.1, strand: 1.05, iolcus: 1.1, ares: 1.0, agora: 1.15 };
const dist = (a, b) => Math.hypot(DISTRICTS[a].x - DISTRICTS[b].x, DISTRICTS[a].y - DISTRICTS[b].y);

export function initWar(w) {
  const n = DISTRICTS.length;
  w.war = { S: DISTRICTS.map((d, k) => 0.3 + ((k * 37) % 20) / 100), rel: Array.from({ length: n }, () => new Array(n).fill(0)), lord: DISTRICTS.map((d, k) => k),
    wars: [], truce: {}, grudge: {}, history: [], power: DISTRICTS.map(() => 0), dom: DISTRICTS.map(() => ({ faith: 0, faction: 0, pop: 0 })) };
}

/** weekly: who dominates each city, how cities feel about each other, cohesion, and whether to fight */
export function cities(ctx) {
  const { A, w, day } = ctx, W = w.war, r = ctx.r("war");
  if (day % 7) return;
  // census per city
  const pop = DISTRICTS.map(() => 0), argo = DISTRICTS.map(() => 0), mood = DISTRICTS.map(() => 0), fa = DISTRICTS.map(() => ({})), fc = DISTRICTS.map(() => ({}));
  const levy = DISTRICTS.map(() => 0), wealth = DISTRICTS.map(() => 0);
  for (const i of ctx.live) {
    if (A.status[i] || (A.kind[i] && day - A.born[i] < 14 * 12)) continue;
    const d = A.district[i]; pop[d]++; mood[d] += A.mood[i]; wealth[d] += A.obols[i]; if (!A.kind[i]) argo[d]++;
    fa[d][A.faith[i]] = (fa[d][A.faith[i]] || 0) + 1; fc[d][A.faction[i]] = (fc[d][A.faction[i]] || 0) + 1;
    const job = A.job[i]; levy[d] += (job === 7 ? 2 : job === 11 ? 1.5 : job === 10 ? 1.2 : 1) * (A.kind[i] ? 1 : 1.5) * (0.8 + (w.crafts ? w.crafts[d][1] : 50) / 250);
  }
  const top = (o) => { let b = 0, bv = -1; for (const [k, v] of Object.entries(o)) if (v > bv) { bv = v; b = Number(k); } return b; };
  for (const c of CITIES) W.dom[c] = { faith: top(fa[c]), faction: top(fc[c]), pop: pop[c] };
  for (const c of CITIES) W.power[c] = Math.round(levy[c] * 0.2 * (0.4 + W.S[c]) * (1 + Math.max(-0.3, Math.min(0.3, mood[c] / Math.max(1, pop[c]) / 100))));
  // relations drift toward what faith, blood, trade, lordship and war make them
  for (const a of CITIES) for (const b of CITIES) {
    if (a >= b) continue;
    const da = W.dom[a], db = W.dom[b];
    let T = 0;
    T += da.faith === db.faith ? 20 : da.faith && db.faith ? -30 : -12;
    T += da.faction === db.faction ? 15 : w.factions[da.faction] && w.factions[db.faction] && w.factions[da.faction].blood === w.factions[db.faction].blood ? -5 : -25;   // kin houses squabble; other bloods are strangers
    const wa = wealth[a] / Math.max(1, pop[a]), wb = wealth[b] / Math.max(1, pop[b]); T -= Math.min(25, Math.abs(Math.log2((wa + 1) / (wb + 1))) * 10);   // envy between rich and poor neighbours
    T -= (W.grudge[key(a, b)] || 0);
    T += Math.min(20, (Math.sqrt(pop[a] * pop[b]) / Math.max(60, dist(a, b))) * 2);       // gravity trade
    if (W.lord[a] === W.lord[b]) T += 25;
    if (atWar(W, a, b)) T -= 50;
    const nv = W.rel[a][b] + (T - W.rel[a][b]) * 0.2 + (r.next() - 0.5) * 8;
    W.rel[a][b] = W.rel[b][a] = Math.round(Math.max(-100, Math.min(100, nv)));
  }
  // border incidents between neighbours feed a grudge that fades slowly
  W.grudge = W.grudge || {};
  for (const k of Object.keys(W.grudge)) { W.grudge[k] = Math.round(W.grudge[k] * 0.9); if (!W.grudge[k]) delete W.grudge[k]; }
  for (const a of CITIES) for (const b of CITIES) if (a < b && dist(a, b) < 400 && pop[a] > 20 && pop[b] > 20 && r.chance(0.05)) {
    const what = INCIDENTS[r.int(INCIDENTS.length)], k = key(a, b); W.grudge[k] = (W.grudge[k] || 0) + 25;
    ctx.log(ctx.E.incident, -1, -1, a, b, what.replace("{A}", short(a)).replace("{B}", short(b)));
  }
  // asabiya: grows on a hostile frontier, decays in safety
  for (const a of CITIES) {
    const other = (b) => W.dom[a].faith !== W.dom[b].faith || (w.factions[W.dom[a].faction] || {}).blood !== (w.factions[W.dom[b].faction] || {}).blood;
    const frontier = CITIES.some((b) => b !== a && W.rel[a][b] < -40 && dist(a, b) < 450 && other(b));   // a metaethnic frontier: hostile AND different
    W.S[a] = Math.max(0.02, Math.min(0.98, frontier ? W.S[a] + 0.06 * W.S[a] * (1 - W.S[a]) : W.S[a] - 0.05 * W.S[a]));
  }
  // a weekly page of the city-level history, for the time-lapse
  W.timeline = W.timeline || [];
  W.timeline.push({ d: day, lord: W.lord.slice(), faith: CITIES.map((c) => W.dom[c].faith), fac: CITIES.map((c) => W.dom[c].faction), pop: CITIES.map((c) => W.dom[c].pop), S: CITIES.map((c) => Math.round(W.S[c] * 100)), wars: W.wars.map((x) => [x.a, x.target]) });
  if (W.timeline.length > 400) W.timeline.shift();
  // battles in the wars already running
  for (const war of W.wars.slice()) battle(ctx, war, r);
  // declarations: a cohesive, stronger city that hates a reachable neighbour
  for (const a of CITIES) {
    if (W.lord[a] !== a || W.wars.some((x) => x.a === a || x.b === a) || pop[a] < 40) continue;
    for (const b of CITIES) {
      if (a === b || W.lord[b] === a || W.lord[a] === b || pop[b] < 20 || (W.truce[key(a, b)] ?? -1e9) > day || dist(a, b) > 650) continue;
      const def = DEF[DISTRICTS[b].key] || 1, Pb = W.power[W.lord[b]] + (W.lord[b] !== b ? W.power[b] : 0);
      if (W.rel[a][b] < -30 && W.S[a] > 0.25 && W.power[a] > 1.15 * Pb * def && r.chance(0.35)) {
        const name = `the war of ${short(a)} and ${short(b)}`, war = { a, b: W.lord[b], target: b, since: day, score: 0, battles: 0, name, dead: 0, broken: 0 };
        W.wars.push(war); ctx.log(ctx.E.war, -1, -1, a, b, name);
        for (const i of ctx.live) if (!A.status[i] && (A.district[i] === a || A.district[i] === b)) ctx.think(i, ctx.TH.terror_at_an_omen);
        break;
      }
    }
  }
}
const INCIDENTS = ["A shepherd of {A} was found dead at the boundary stone of {B}.", "Men of {B} poisoned a well that {A} drinks from, or so {A} says.", "Fishers of {A} and {B} fought over the same shoal; one boat came home empty and one did not come home.",
  "A bride promised from {A} to {B} was taken back; both cities call it an insult.", "Merchants of {B} were robbed on the road to {A}.", "A herd of {A} strayed into {B} and was eaten.", "Boys of {A} broke the herm at the border of {B}."];
const key = (a, b) => (a < b ? a + ":" + b : b + ":" + a);
const short = (k) => DISTRICTS[k].name.replace(/^the /, "").replace(/ & the Agora/, "");
export const atWar = (W, a, b) => W.wars.some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));

function battle(ctx, war, r) {
  const { A, w, day } = ctx, W = w.war, a = war.a, b = war.b, field = war.target;
  const def = DEF[DISTRICTS[field].key] || 1, Pa = W.power[a], Pb = W.power[b] * def;
  const pa = Pa / Math.max(1, Pa + Pb), win = r.next() < pa ? a : b, lose = win === a ? b : a;
  war.battles++; war.score += win === a ? 1 : -1;
  // casualties among the levies: Leaves die, Argonauts break
  let dead = 0, broken = 0;
  for (const [city, frac] of [[lose, 0.06], [win, 0.02]]) {
    const pool = ctx.live.filter((i) => !A.status[i] && A.district[i] === city && (!A.kind[i] || day - A.born[i] >= 16 * 12) && r.chance(0.2));
    for (const i of pool) if (r.chance(frac)) { ctx.kill(i, `fell in ${war.name}`); if (A.kind[i]) dead++; else broken++; }
  }
  war.dead += dead; war.broken += broken;
  W.S[win] = Math.min(0.98, W.S[win] + 0.02); W.S[lose] = Math.max(0.02, W.S[lose] - 0.03);
  ctx.log(ctx.E.battle, -1, -1, field, win, `${war.name}|${short(win)}|${dead}|${broken}`);
  // ends: victory with terms, exhaustion, or time
  let end = null;
  if (war.score >= 3) end = W.power[a] > 2 * W.power[b] && W.lord[b] === b ? "vassal" : "tribute";
  else if (war.score <= -2) end = "repulsed";
  else if (war.battles >= 10) end = "white";
  if (!end) return;
  W.wars.splice(W.wars.indexOf(war), 1); W.truce[key(a, b)] = day + 90;
  let terms = "";
  const champ = ctx.champion(end === "repulsed" ? b : a), loser = end === "repulsed" ? a : b, winner = end === "repulsed" ? b : a;
  if (end !== "white" && champ >= 0) { ctx.forgeRelic(`the spear of ${short(winner)} that ${end === "repulsed" ? "threw back" : "bowed"} ${short(loser)}`, "trophy", champ, `raised over ${war.name}`); ctx.captureRelics(loser, champ); }
  if (end === "vassal") { W.lord[b] = a; for (let k = 0; k < W.lord.length; k++) if (W.lord[k] === b) W.lord[k] = a; terms = `${short(b)} kneels and becomes a vassal of ${short(a)}`; }
  else if (end === "tribute") { const paid = tribute(ctx, b, a, 0.08); terms = `${short(b)} pays ${paid.toLocaleString()} obols in tribute`; }
  else if (end === "repulsed") terms = `${short(b)} threw back the attack`;
  else terms = "both sides are spent; a white peace";
  W.history.unshift({ name: war.name, a, b, from: war.since, to: day, end, terms, dead: war.dead, broken: war.broken }); W.history = W.history.slice(0, 60);
  ctx.log(ctx.E.peace, -1, -1, end === "repulsed" ? b : a, end === "vassal" ? 1 : 0, `${war.name}|${terms}|${war.dead}|${war.broken}`);
  ctx.remember(w, day, "war", -1, 40 + Math.min(60, war.dead), war.name, -1);
}
/** move a share of the losing city's adult wealth to the winners, conserving every obol */
function tribute(ctx, from, to, share) {
  const { A } = ctx, payers = ctx.live.filter((i) => !A.status[i] && A.district[i] === from), recv = ctx.live.filter((i) => !A.status[i] && A.district[i] === to && A.obols[i] >= 0);
  let pot = 0; for (const i of payers) { const t = Math.floor(A.obols[i] * share); A.obols[i] -= t; pot += t; }
  if (!recv.length) { ctx.w.treasury += pot; return pot; }
  const each = Math.floor(pot / recv.length); for (const i of recv) A.obols[i] += each; ctx.w.treasury += pot - each * recv.length; return pot;
}
/** vassals pay their lord every season; cohesive, resentful vassals revolt */
export function vassals(ctx) {
  const { w, day } = ctx, W = w.war, r = ctx.r("vassal");
  if (day % 30) return;
  for (const c of CITIES) {
    const L = W.lord[c]; if (L === c) continue;
    tribute(ctx, c, L, 0.02);
    if (W.S[c] > 0.5 && W.rel[c][L] < -30 && r.chance(0.3)) { W.lord[c] = c; ctx.log(ctx.E.revolt, -1, -1, c, L, `${short(c)} throws off ${short(L)}`); ctx.remember(w, day, "revolt", -1, 55, `the freeing of ${short(c)}`, -1);
      W.wars.push({ a: L, b: c, target: c, since: day, score: 0, battles: 0, name: `the war of ${short(c)}'s freedom`, dead: 0, broken: 0 }); }
  }
}
