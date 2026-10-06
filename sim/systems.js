// One sim day. Order of systems is fixed; every random draw comes from stream(seed, day, system).
import { BLOODS, DISTRICTS, D, GOODS, BASE_PRICE, TARGET, YIELD, JOBS, J, JOB_GOOD, ST, THOUGHTS, TH, OFFICES, SPLINTERS, SPLINTER_COLORS,
  COGNOMENS, BEAM, INCIDENTS, dayOfTs, PYRE_SECONDS, monthOf, FIELD_SEASON, SEA_SEASON } from "./lore.js";
import { stream, hash32 } from "./rng.js";
import { TIES, THS, BIO, ARGO, ensureCap } from "./world.js";
import { prophets, convert, faithDaily, festivals, iconoclasm, remember } from "./culture.js";
import { nameOf } from "./narrate.js";
import { cities, vassals } from "./war.js";
import { crafts, craftBoost, fashion, dialects } from "./drift.js";
import { seedRumor, gossip, rumorsDaily } from "./rumor.js";
import { quest, forgeRelic, passRelic, relicsOf, inheritRelics, captureRelics, champion, cityOf } from "./fleece.js";
import { caravans, tradeFlows } from "./trade.js";
import { miasmaDaily, onKilling, onUntimely, onBurn, shun } from "./miasma.js";
import { giftMonthly, bindXenia } from "./gift.js";
import { oracleDaily } from "./oracle.js";
import { heroesDaily, renown, legacy } from "./heroes.js";
import { ironDaily, onSale, birthMarks } from "./iron.js";
import { hiddenDaily } from "./hidden.js";
import { discordDaily, orators, vacate } from "./discord.js";
import { threadsDaily, hookVotes, intent } from "./threads.js";
import { politics } from "./politics.js";
import { production, consumption, market, love, migration } from "./economy.js";
import { social, moodStress, unrest, centroids, defection } from "./society.js";
export { tieIndex, idist, centroids, guardCount } from "./society.js";
import { wondersDaily } from "./wonders.js";
import { voyageDaily, lendGrain, strife, weddingGifts, bowContest } from "./voyage.js";
import { depthDaily, quarantined, skillMult, recover, guardianOf } from "./depth.js";
import { statecraftDaily, fishMult } from "./statecraft.js";
import { memoryDaily, memorize, onReknit, swear, oathEnds, cursed, onLeafDeath, scarOf } from "./memory.js";

// event types (also bio codes)
export const EV = ["", "death", "return", "burn", "ostologia", "sold", "xenia", "gold", "beam", "ruling", "deed", "star", "toll",
  "riot", "defect", "schism", "dissolve", "election", "law", "office", "ostracism", "funeral", "unburied", "break", "brawl", "robbery",
  "pall", "harpies", "plague", "sirens", "sirens_sung", "talos", "doliones", "featherbolts", "ghost", "lemnian", "bounty", "prometheus",
  "famine", "crash", "boom", "fleece", "exile_end", "budget", "cognomen", "hostage", "starved", "kinslayer", "migrate", "dole", "love", "heartbreak", "birth", "comeofage", "lineage_end", "orphan", "prophet", "convert", "faithdies", "temple", "faithschism", "festival", "monument", "iconoclasm", "war", "battle", "peace", "revolt", "incident", "craft", "craftlost", "dialect", "rumor", "rumorend", "relic", "relicpass", "expedition", "fleecetaken", "caravan", "raid", "watch", "katharsis", "erinyes", "poine", "vendetta", "supplication", "restless", "shadenames", "pharmakos", "blight", "feudend", "liturgy", "antidosis", "xenoi", "theoxenia", "wreck", "lethe", "oath", "curse", "weight", "memory", "scar", "mysteries", "dodona", "oracle", "phineus", "bones", "beast", "hunt", "games", "mood", "legacy", "stone", "iron", "nemesis", "agrionia", "demophon", "doom", "newfire", "case", "trial", "secret", "tablet", "weather", "colony", "psi", "speech", "vacant", "song", "cadet", "movement", "hook", "wonder", "voyage", "contest", "craftsman", "quarantine", "ward", "ecology", "bribe", "treaty"];
export const E = Object.fromEntries(EV.map((e, i) => [e, i]));
export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
export const isqrt = (n) => Math.floor(Math.sqrt(n));       // sqrt is exactly rounded in IEEE, safe for replay

const A_ = (w) => w.A;
export function tick(w, omens = []) {
  const day = w.day, ev = [];
  const ctx = { w, day, ev, A: w.A, N: w.N, r: (sys) => stream(w.seed, day, sys) }; ctx.rr = ctx.r("misc"); ctx.E = E; ctx.TH = TH; ctx.think = (i, th) => think(ctx, i, th); ctx.kill = (i, c, by, hid) => kill(ctx, i, c, by, hid); ctx.remember = remember;
  ctx.remember = remember; ctx.trip = (i, from, to, k) => { if (from === to || from < 0 || to < 0) return; w.trips.push({ i, from, to, d: day, k }); }; ctx.cognomen = (i, c) => setCognomen(ctx, i, c); ctx.renown = (i, n) => renown(w, A_(w), i, n); ctx.tie = (i, j, d) => tie(ctx, i, j, d); ctx.memorize = (i, k, who, s) => memorize(ctx, i, k, who, s); ctx.oathEnds = (i, k, kept) => oathEnds(ctx, i, k, kept); ctx.swear = (i, j, k, d) => swear(ctx, i, j, k, d); ctx.forgeRelic = (...a) => forgeRelic(ctx, ...a); ctx.captureRelics = (...a) => captureRelics(ctx, ...a); ctx.champion = (c) => champion(ctx, c);
  ctx.trace = (t, a, b, x = -1) => ev.push({ i: -1, d: day, t: EV[t], a, b, x, v: 0, s: "", h: 1 });   // seen by the story sifter, not the chronicle
  ctx.log = (t, a = -1, b = -1, x = -1, v = 0, s = "") => { const e = { i: ++w.eventSeq, d: day, t: EV[t], a, b, x, v, s }; ev.push(e); if (a >= 0) bio(ctx, a, t, b); if (b >= 0 && b !== a) bio(ctx, b, t, a); return e; };
  applyOmens(ctx, omens); chk(ctx, 'applyOmens');
  scheduled(ctx); chk(ctx, 'scheduled');
  index(ctx); chk(ctx, 'index');
  production(ctx); chk(ctx, 'production');
  consumption(ctx); chk(ctx, 'consumption');
  market(ctx); caravans(ctx); chk(ctx, 'market');
  social(ctx); chk(ctx, 'social');
  moodStress(ctx); chk(ctx, 'moodStress');
  unrest(ctx); chk(ctx, 'unrest');
  if (day % 7 === 0) { centroids(ctx); defection(ctx); migration(ctx); love(ctx); } chk(ctx, '');
  if (day % 30 === 0) politics(ctx); chk(ctx, '');
  if (((day % 30) + 30) % 30 === 15) { index(ctx); giftMonthly(ctx); } chk(ctx, 'gift');
  director(ctx); chk(ctx, 'director');
  index(ctx); miasmaDaily(ctx); memoryDaily(ctx); oracleDaily(ctx); heroesDaily(ctx); ironDaily(ctx); hiddenDaily(ctx); discordDaily(ctx); threadsDaily(ctx); wondersDaily(ctx); voyageDaily(ctx); depthDaily(ctx); statecraftDaily(ctx); chk(ctx, 'miasma');
  index(ctx); prophets(ctx, ev); faithDaily(ctx); festivals(ctx); chk(ctx, 'culture');
  index(ctx); cities(ctx); vassals(ctx); quest(ctx); chk(ctx, 'war');
  crafts(ctx); fashion(ctx); dialects(ctx);
  for (const e of ev) { if (e.h) continue; const R = RUMOR_OF[e.t]; if (R && ctx.rr.chance(R[0])) seedRumor(ctx, e.t, e.a, e.x >= 0 ? e.x : D.agora, R[1](e), R[2]); }
  rumorsDaily(ctx);
  lifecycle(ctx); ctx.N = w.N; chk(ctx, 'lifecycle');
  funerals(ctx); chk(ctx, 'funerals');
  if (w.trips.length) { w.trips = w.trips.filter((t) => t.d > day - 3); if (w.trips.length > 600) w.trips.splice(0, w.trips.length - 600); }
  stats(ctx); chk(ctx, 'stats');
  invariant(ctx);
  w.day++;
  return ev;
}

// which facts become rumours: [chance, how it is first told, heat]
const RUMOR_OF = {
  burn: [1, (e) => `They say ${nameOf(e.a + 1)} went into the fire willingly.`, 60], lemnian: [1, (e) => `They say ${e.v} were murdered in their beds in ${DISTRICTS[e.x].name}.`, 90],
  riot: [0.5, (e) => `They say ${e.v} rose up in ${DISTRICTS[e.x].name} and the Reapers ran.`, 55], plague: [0.7, (e) => `They say the fever in ${DISTRICTS[e.x].name} was carried in on purpose.`, 65],
  battle: [0.5, (e) => `They say the field at ${DISTRICTS[e.x].name} ran with marrow.`, 50], ruling: [1, (e) => `They say the Maker touched ${nameOf(e.a + 1)} with a finger of light.`, 40],
  prophet: [0.8, (e) => `They say ${nameOf(e.a + 1)} spoke with a god on the road.`, 45], ostracism: [0.6, (e) => `They say ${nameOf(e.a + 1)} was cast out for a crime nobody will name.`, 45],
};

// ---------------------------------------------------------------- helpers
export function bio(ctx, i, t, arg) { const A = ctx.A, p = A.bioPos[i]; A.bioDay[i * BIO + p] = ctx.day; A.bioType[i * BIO + p] = t; A.bioArg[i * BIO + p] = arg; A.bioPos[i] = (p + 1) % BIO; }
export function think(ctx, i, th) {
  const A = ctx.A, [, , dur, stacks] = THOUGHTS[th]; let n = 0, free = -1, oldest = -1, oldU = 1e9;
  for (let k = 0; k < THS; k++) { const s = i * THS + k; if (A.thType[s] === th) n++; if (A.thType[s] === 0 && free < 0) free = k; if (A.thUntil[s] < oldU) { oldU = A.thUntil[s]; oldest = k; } }
  if (n >= stacks) { for (let k = 0; k < THS; k++) if (A.thType[i * THS + k] === th) { A.thUntil[i * THS + k] = ctx.day + dur; break; } return; }
  const k = free >= 0 ? free : oldest; A.thType[i * THS + k] = th; A.thUntil[i * THS + k] = ctx.day + dur;
}
export function tie(ctx, i, j, delta) {
  if (i === j || i < 0 || j < 0) return;
  const A = ctx.A; let weak = -1, wv = 1e9;
  for (let k = 0; k < TIES; k++) { const s = i * TIES + k; if (A.tieTo[s] === j) { const v = A.tieVal[s]; A.tieVal[s] = clamp(v + (delta > 0 && v > 0 ? Math.max(delta > 2 ? 1 : 0, Math.round(delta * (100 - v) / 90)) : delta), -100, 100); return; } const t = A.tieTo[s], v = t < 0 || (A.kind[t] && (A.status[t] === 2 || A.status[t] === 3)) ? -1 : Math.abs(A.tieVal[s]); if (v < wv) { wv = v; weak = k; } }
  if (wv < Math.abs(delta) + 2) { A.tieTo[i * TIES + weak] = j; A.tieVal[i * TIES + weak] = clamp(delta, -100, 100); }
}
export const living = (A, i) => A.status[i] === ST.living;
// the Leaves age one year every 12 sim days (one year per 12 real hours)
export const YEAR = 12;
export const ageOf = (A, i, day) => (A.kind[i] ? Math.floor((day - A.born[i]) / YEAR) : 999);
export const isAdult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
// Gompertz mortality per year, built by repeated multiplication so every engine replays it bit-for-bit
const HAZ = (() => { const h = []; let g = 0.0004; for (let a = 0; a <= 130; a++) { h.push(Math.min(0.9, g + (a < 5 ? 0.02 / (a + 1) : 0))); g *= 1.0887; } return h; })();
export const homeFaction = (w, i) => w.A.birthFac[i];
export const P = (A, i, k) => A.pers[i * 6 + k];          // 0 H,1 E,2 X,3 A,4 C,5 O
export function setCognomen(ctx, i, c) { if (ctx.A.cognomen[i] !== c) { ctx.A.cognomen[i] = c; bio(ctx, i, E.cognomen, c); } }
export function kill(ctx, i, cause, by = -1, hidden = false) {
  const { A, w, day } = ctx; if (A.status[i] !== ST.living && A.status[i] !== ST.exiled) return;
  if (by >= 0) onKilling(ctx, i, by, hidden);
  if (hidden) { cause = A.kind[i] ? "found dead at dawn" : "found broken at dawn"; by = -1; }
  if (A.kind[i]) return leafDies(ctx, i, cause, by, hidden);
  A.status[i] = ST.shade; A.died[i] = day; A.until[i] = day + 20 + (hash32(w.seed, i, day) % 41); A.unburied[i] = 1; A.district[i] = D.asphodel; A.hunger[i] = 0; A.sick[i] = 0; A.jail[i] = 0;
  A.inv[i * 5] = 0;
  for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k]; if (j >= 0 && A.tieVal[i * TIES + k] > 30 && living(A, j)) think(ctx, j, TH.mourning_kin); }
  const lv = A.lover[i]; if (lv >= 0) { if (living(A, lv)) { think(ctx, lv, TH.lost_a_beloved); A.stress[lv] = Math.min(600, A.stress[lv] + 150); } A.lover[lv] = -1; A.lover[i] = -1; }
  if (A.office[i] >= 0) { delete w.offices[OFFICES[A.office[i]].key]; A.office[i] = -1; }
  w.director.lastDeath = day; w.director.toll = (w.director.toll || 0) + 1;
  ctx.log(E.death, i, by, -1, 0, cause);
  if (i === w.fleece) ctx.log(E.fleece, i, by, -1, 0, "the Fleece-bearer has fallen");
}

// a Leaf dies for good: grief, inheritance, three days on the Pyra, then a grave in Asphodel
function leafDies(ctx, i, cause, by, hidden = false) {
  const { A, w, day } = ctx;
  for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k]; if (j >= 0 && A.tieVal[i * TIES + k] > 30 && living(A, j)) think(ctx, j, TH.mourning_kin); }
  const lv = A.lover[i]; if (lv >= 0) { if (living(A, lv)) { think(ctx, lv, TH.lost_a_beloved); A.stress[lv] = Math.min(600, A.stress[lv] + 150); memorize(ctx, lv, 2, i, 100); } A.lover[lv] = -1; A.lover[i] = -1; }
  const heldOffice = A.office[i] >= 0;
  if (A.office[i] >= 0) { delete w.offices[OFFICES[A.office[i]].key]; A.office[i] = -1; }
  // the estate goes to living children, else the beloved, else the Boule
  const heirs = []; for (let c = ARGO; c < w.N; c++) if ((A.p1[c] === i || A.p2[c] === i) && living(A, c)) heirs.push(c);
  if (!heirs.length && lv >= 0 && living(A, lv)) heirs.push(lv);
  if (heirs.length) { const each = Math.floor(A.obols[i] / heirs.length); for (const h of heirs) A.obols[h] += each; w.treasury += A.obols[i] - each * heirs.length; } else w.treasury += A.obols[i];
  inheritRelics(ctx, i);
  A.obols[i] = 0; for (let g = 0; g < 5; g++) A.inv[i * 5 + g] = 0;
  A.status[i] = ST.pyre; A.district[i] = D.pyra; A.died[i] = day; A.until[i] = day + 3; A.hunger[i] = 0; A.sick[i] = 0; A.jail[i] = 0;
  w.leafDeaths++;
  const age = ageOf(A, i, day);
  onLeafDeath(ctx, i, age, by >= 0);
  if (by < 0 && !hidden && age < 14 && !A.mystes[i] && ctx.rr.chance(0.35)) onUntimely(ctx, i);
  const notable = age >= 60 || heldOffice || !A.kind[A.p1[i]] || ctx.rr.chance(0.25);
  if (notable) ctx.log(E.death, i, by, -1, age, cause); else { bio(ctx, i, E.death, by); ctx.trace(E.death, i, by); }
}

// ---------------------------------------------------------------- the generation of leaves: birth, growing up, old age
function lifecycle(ctx) {
  const { A, w, day } = ctx, r = ctx.r("life");
  let leaves = 0; for (const i of ctx.live) if (A.kind[i]) leaves++;
  w.leafCount = leaves;
  // ageing and death
  for (const i of ctx.live) {
    if (!A.kind[i] || A.status[i]) continue;
    const d = day - A.born[i], age = Math.floor(d / YEAR);
    if (d === 14 * YEAR) {
      A.job[i] = adultJob(ctx, i, r); bio(ctx, i, E.comeofage, A.job[i]);
      { const mentor = [A.p1[i], A.p2[i], guardianOf(A, i)].filter((p) => p >= 0 && A.job[p] === A.job[i]).sort((x, y) => A.skill[y] - A.skill[x])[0]; A.skill[i] = mentor !== undefined ? A.skill[mentor] >> 1 : 8; }   // the apprentice learns from the best at the trade
      // heirlooms: a crown, a pair of eyes or a vice taken up from a parent; the cloak of one's trade
      const par = [A.p1[i], A.p2[i]].filter((p) => p >= 0), pick = () => par[r.int(par.length)], X = w.dictIx;
      if (par.length && r.chance(0.45)) { const c = A.crown[pick()]; if (c !== X.crown["Golden Fleece"]) A.crown[i] = c; }
      if (par.length && r.chance(0.45)) A.sight[i] = A.sight[pick()];
      if (par.length && r.chance(0.4)) { A.artifact[i] = A.artifact[pick()]; A.vice[i] = A.artifact[i] === X.artifact.none ? 0 : 1; }
      const jc = { [J.reaper]: "Death", [J.priest]: "Clergy", [J.servant]: "Servant", [J.noble]: "Royalty" }[A.job[i]]; if (jc && X.cloak[jc] !== undefined) A.cloak[i] = X.cloak[jc];
    }
    let hz = HAZ[Math.min(130, age)] / YEAR * (legacy(w, A, i, "Blood of the Sown") ? 0.85 : 1); if (A.sick[i]) hz *= 4; if (age >= 60 && (monthOf(day) === 11 || monthOf(day) === 0)) hz *= 1.2; if (A.hunger[i] > 3) hz *= 3;
    if (r.chance(hz)) kill(ctx, i, age < 5 ? "died in infancy" : age >= 60 ? "died of old age" : A.sick[i] ? "plague" : A.hunger[i] > 3 ? "starved" : "a sudden fever");
  }
  // children are fed by their parents
  for (const i of ctx.live) {
    if (!A.kind[i] || A.status[i] || isAdult(A, i, day) || A.inv[i * 5] > 1) continue;
    for (const p of [A.p1[i], A.p2[i], guardianOf(A, i)]) if (p >= 0 && living(A, p) && A.inv[p * 5] > 2) { A.inv[p * 5] -= 2; A.inv[i * 5] += 2; break; }
  }
  if (day % 7 === 0) for (let c = ARGO; c < w.N; c++) {
    if (A.status[c] !== ST.asphodel || day - A.died[c] < 360 || A.tieTo[c * TIES] === -2) continue;
    A.tieTo.fill(-1, c * TIES, c * TIES + TIES); A.tieTo[c * TIES] = -2; A.tieVal.fill(0, c * TIES, c * TIES + TIES); A.thType.fill(0, c * THS, c * THS + THS); A.thUntil.fill(0, c * THS, c * THS + THS);
    A.rumor.fill(0, c * 6, c * 6 + 6); A.ltmKind.fill(0, c * 3, c * 3 + 3); A.ltmWho.fill(0, c * 3, c * 3 + 3); A.ltmDay.fill(0, c * 3, c * 3 + 3); A.ltmStr.fill(0, c * 3, c * 3 + 3);
    A.stress[c] = 0; A.mood[c] = 0; A.radical[c] = 0; A.style[c] = 0; A.met[c] = -1; A.until[c] = 0;
  }
  // couples sow children: prosperity, a household that is not yet full, and the world's carrying capacity
  const K = 16000, room = Math.max(0, 1 - leaves / K), N0 = w.N, kidsOf = new Map();
  for (let c = ARGO; c < N0; c++) if (living(A, c)) { const key = A.p1[c] * 65536 + A.p2[c]; kidsOf.set(key, (kidsOf.get(key) || 0) + 1); }
  for (let i = 0; i < N0; i++) {
    const j = A.lover[i]; if (j < i || A.status[i] || A.status[j] || A.district[i] !== A.district[j]) continue;
    if (!fertile(A, i, day) || !fertile(A, j, day)) continue;
    if (A.inv[i * 5] + A.inv[j * 5] < 6 || A.mood[i] + A.mood[j] < -30) continue;
    const kids = (kidsOf.get(i * 65536 + j) || 0) + (kidsOf.get(j * 65536 + i) || 0);
    if (kids >= 5 || !r.chance(0.018 * room * (kids ? 0.7 : 1) * (cursed(w, A, i) || cursed(w, A, j) ? 0.6 : 1) * (legacy(w, A, i, "the Feasting House") ? 1.15 : 1))) continue;
    bear(ctx, i, j, r);
  }
}
const fertile = (A, i, day) => !A.kind[i] || (day - A.born[i] >= 16 * YEAR && day - A.born[i] < 46 * YEAR);
function adultJob(ctx, i, r) {
  const { A } = ctx, par = [A.p1[i], A.p2[i]].filter((p) => p >= 0);
  if (par.length && r.chance(0.6)) return A.job[par[r.int(par.length)]];               // the family trade
  const res = DISTRICTS[A.district[i]].res;
  return res === "food" ? J.farmer : res === "fish" ? J.fisher : res === "ore" ? J.miner : res === "cloth" ? J.weaver : res === "smoke" ? J.grower : res === "pharmaka" ? J.herbalist : J.servant;
}
function bear(ctx, a, b, r) {
  const { A, w, day } = ctx, c = w.N; ensureCap(w, c + 1); w.N++;
  const B = w.A, first = r.chance(0.5) ? a : b, other = first === a ? b : a;
  B.kind[c] = 1; B.status[c] = ST.living; B.born[c] = day; B.p1[c] = a; B.p2[c] = b; B.gen[c] = Math.max(B.gen[a], B.gen[b]) + 1;
  B.lineage[c] = B.kind[a] ? B.lineage[a] : a;
  // genes: bones from one parent (rarely drifting a tier), palette from the other; Leaves are born bare
  let bones = B.bones[first]; if (r.chance(0.03)) bones = Math.max(0, Math.min(5, bones + (r.chance(0.5) ? 1 : -1))); if (bones > 5 && r.chance(0.5)) bones = B.bones[other] <= 5 ? B.bones[other] : 0;
  B.bones[c] = bones; B.palette[c] = B.palette[other]; B.cloak[c] = w.none.cloak; B.crown[c] = w.none.crown; B.sight[c] = w.none.sight; B.artifact[c] = w.none.artifact;
  for (let k = 0; k < 6; k++) B.pers[c * 6 + k] = clamp(Math.round((B.pers[a * 6 + k] + B.pers[b * 6 + k]) / 2 + (r.next() - 0.5) * 30), 0, 100);
  for (let k = 0; k < 3; k++) B.ideo[c * 3 + k] = clamp(Math.round((B.ideo[a * 3 + k] + B.ideo[b * 3 + k]) / 2 + (r.next() - 0.5) * 30), -100, 100);
  B.identity[c] = clamp(Math.round((B.identity[a] + B.identity[b]) / 2 + (r.next() - 0.5) * 20), 5, 100);
  B.faction[c] = B.faction[first]; B.birthFac[c] = B.faction[first]; B.district[c] = B.district[a]; B.oikos[c] = B.oikos[a]; B.job[c] = B.job[first];
  B.style[c] = B.style[first]; B.dialect[c] = B.district[a];
  birthMarks(w, B, c, a, b); if (ctx.ev.some((e) => e.t === "burn")) B.mark[c] |= 8;
  B.faith[c] = B.faith[first]; B.devotion[c] = (B.devotion[a] + B.devotion[b]) >> 2;
  B.miasma[c] = 0; B.fury[c] = 0; B.avenge[c] = 0; B.fame[c] = 0; B.skill[c] = 0; B.immune[c] = 0; B.guard[c] = 0;
  B.obols[c] = 0; B.inv[c * 5] = 4; B.vice[c] = 0; B.office[c] = -1; B.met[c] = -1; B.lover[c] = -1; B.until[c] = 0;
  for (let k = 0; k < TIES; k++) { B.tieTo[c * TIES + k] = -1; B.tieVal[c * TIES + k] = 0; }
  for (let k = 0; k < THS; k++) B.thType[c * THS + k] = 0;
  B.mystes[c] = 0; B.lethe[c] = 0; B.buried[c] = 0; B.scar[c] = 0; B.ltmCore[c] = 0; for (let k = 0; k < 3; k++) { B.ltmKind[c * 3 + k] = 0; B.ltmWho[c * 3 + k] = -1; B.ltmDay[c * 3 + k] = 0; B.ltmStr[c * 3 + k] = 0; }
  tie(ctx, c, a, 80); tie(ctx, c, b, 80); tie(ctx, a, c, B.scar[a] === 7 ? 30 : 85); tie(ctx, b, c, B.scar[b] === 7 ? 30 : 85);
  for (let s = ARGO; s < c; s++) if (B.p1[s] === a && B.p2[s] === b && living(B, s)) { tie(ctx, c, s, 50); tie(ctx, s, c, 50); }
  w.births++;
  if (B.gen[c] > (w.genMax || 1)) { w.genMax = B.gen[c]; forgeRelic(ctx, `the cradle-tooth of the ${["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh"][B.gen[c]] || B.gen[c] + "th"} generation`, "cradle", c, "born with it in their fist"); }
  const firstOfLine = !B.kind[a] && !B.kind[b] ? true : false;
  if ((!B.kind[a] || !B.kind[b]) && ctx.rr.chance(0.35)) ctx.log(E.birth, a, b, B.district[c], c, firstOfLine ? "first" : "");
  else { bio(ctx, a, E.birth, c); bio(ctx, b, E.birth, c); }
}
export const isKin = (A, i, j) => A.p1[i] === j || A.p2[i] === j || A.p1[j] === i || A.p2[j] === i || (A.kind[i] && A.kind[j] && (A.p1[i] === A.p1[j] || A.p1[i] === A.p2[j] || A.p2[i] === A.p1[j] || A.p2[i] === A.p2[j]));

// ---------------------------------------------------------------- omens from the chain
function oikosOf(w, addr) { let k = w.oikosIx[addr]; if (k === undefined) { k = w.oikoi.length; w.oikoi.push({ addr, name: null }); w.oikosIx[addr] = k; } return k; }
function applyOmens(ctx, omens) {
  const { w, A, day } = ctx; let looms = 0, members = null;
  const membersOf = (o) => { if (!members) { members = {}; for (let i = 0; i < ctx.N; i++) if (living(A, i)) (members[A.oikos[i]] || (members[A.oikos[i]] = [])).push(i); } return members[o] || []; };
  const r = ctx.r("omens");
  for (const o of omens) {
    if (o.k === "burn" && o.tok) {
      const i = o.tok - 1; if (A.status[i] === ST.pyre || A.status[i] === ST.asphodel) continue;
      if (A.office[i] >= 0) { vacate(ctx, OFFICES[A.office[i]].key); delete w.offices[OFFICES[A.office[i]].key]; A.office[i] = -1; }
      A.status[i] = ST.pyre; A.district[i] = D.pyra; A.oikos[i] = 0; A.unburied[i] = 0; A.hunger[i] = 0;
      onBurn(ctx, i);
      A.until[i] = Math.max(day + 1, dayOfTs(o.ts + PYRE_SECONDS)); w.burnTs[i] = o.ts;
      let heir = -1, best = 0; for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k]; if (j >= 0 && A.tieVal[i * TIES + k] > best && living(A, j)) { best = A.tieVal[i * TIES + k]; heir = j; } if (j >= 0 && living(A, j) && A.tieVal[i * TIES + k] > 40) memorize(ctx, j, 3, i, 100); if (j >= 0 && living(A, j) && A.tieVal[i * TIES + k] > 15) think(ctx, j, TH.a_friend_went_to_the_pyre); }
      if (heir >= 0) A.obols[heir] += A.obols[i]; else w.treasury += A.obols[i];
      A.obols[i] = 0; for (let g = 0; g < 5; g++) A.inv[i * 5 + g] = 0;
      ctx.log(E.burn, i, heir, D.pyra); remember(w, day, "burn", i, 90, `the burning of ${nameOf(i + 1)}`, A.faith[heir >= 0 ? heir : i]);
    } else if (o.k === "transfer" && o.tok) {
      const i = o.tok - 1, to = oikosOf(w, o.to); if (A.oikos[i] === to) continue;
      const from = A.oikos[i]; A.oikos[i] = to; bindXenia(w, from, to, day); onSale(ctx, i, o.eth);
      const escrow = /escrow/i.test(w.oikoi[to].name || "");
      if (o.eth > 0) { const g = Math.round(o.eth * 200); A.obols[i] += g; w.minted += g; if (living(A, i)) think(ctx, i, o.eth >= 0.2 ? TH.gold_from_colchis : TH.sold_into_a_new_house); }
      else if (!escrow && living(A, i)) think(ctx, i, TH.sold_into_a_new_house);
      const mates = membersOf(to); for (let t = 0; t < 2 && mates.length; t++) { const j = mates[r.int(mates.length)]; tie(ctx, i, j, 15); tie(ctx, j, i, 10); }
      if (o.venue === "Trade") ctx.log(E.xenia, i, -1, A.district[i], 0, w.oikoi[to].name || "");
      else if (escrow) bio(ctx, i, E.hostage, to);
      else if (o.eth >= 1.5) ctx.log(E.gold, i, -1, A.district[i], Math.round(o.eth * 100), w.oikoi[to].name || "");
      else bio(ctx, i, E.sold, to);
      if (i === w.fleece) ctx.log(E.fleece, i, -1, A.district[i], 0, "the Fleece passes to a new house");
    } else if ((o.k === "metadata" && o.batch) || (o.k === "deed" && o.method === "setRenderer")) {
      if (ctx._beam) continue; ctx._beam = 1;
      const phrase = BEAM[hash32(w.seed, day, "beam") % BEAM.length], ax = hash32(day, "axis") % 3, dir = hash32(day, "dir") % 2 ? 6 : -6;
      for (let i = 0; i < ctx.N; i++) if (living(A, i)) { A.ideo[i * 3 + ax] = clamp(A.ideo[i * 3 + ax] + dir, -100, 100); think(ctx, i, P(A, i, 5) > 55 ? TH.awe_at_an_omen : TH.terror_at_an_omen); }
      ctx.log(E.beam, -1, -1, -1, ax * 2 + (dir > 0 ? 0 : 1), phrase);
    } else if ((o.k === "metadata" && !o.batch && o.tok) || (o.k === "deed" && o.method === "setTraits" && o.tok)) {
      const i = o.tok - 1; if (A.status[i] === ST.pyre || A.status[i] === ST.asphodel) continue;
      const first = A.cognomen[i] !== 13;
      think(ctx, i, TH.touched_by_the_maker); A.stress[i] = 0; A.cognomen[i] = 13; A.mystes[i] = 2;
      if (first) ctx.log(E.ruling, i, -1, A.district[i]); else bio(ctx, i, E.ruling, 0);
    } else if (o.k === "deed" && o.method === "create") ctx.log(E.star, -1, -1, -1, 0, o.to);
    else if (o.k === "deed" && o.method === "notice") ctx.log(E.toll, -1, -1, D.asphodel);
    else if (o.k === "deed") looms++;
  }
  if (looms) ctx.log(E.deed, -1, -1, -1, looms);
}

// ---------------------------------------------------------------- scheduled transitions
function scheduled(ctx) {
  const { A, w, day } = ctx;
  for (let i = 0; i < ctx.N; i++) {
    const s = A.status[i];
    if (s === ST.pyre && day >= A.until[i]) { A.status[i] = ST.asphodel; A.district[i] = D.asphodel; ctx.log(E.ostologia, i, -1, D.asphodel); }
    else if (s === ST.shade && day >= A.until[i]) {
      A.status[i] = ST.living; A.deaths[i]++; A.district[i] = BLOODS[A.bones[i]].home; ctx.trip(i, D.asphodel, A.district[i], "return"); A.inv[i * 5] = 6; A.stress[i] = 50; A.unburied[i] = 0;
      think(ctx, i, TH.twice_born); if (A.deaths[i] === 1) A.cognomen[i] = 1;
      onReknit(ctx, i);
      ctx.log(E.return, i, -1, A.district[i], A.deaths[i]);
    } else if (s === ST.exiled && day >= A.until[i]) { A.status[i] = ST.living; A.district[i] = BLOODS[A.bones[i]].home; ctx.log(E.exile_end, i, -1, A.district[i]); }
    if (A.jail[i] > 0) A.jail[i]--;
  }
  if (w.director.active.talos && day >= w.director.active.talos) { w.priceMult = 1; delete w.director.active.talos; }
}

export function index(ctx) {
  const { A, N } = ctx; const live = [], byDist = DISTRICTS.map(() => []);
  for (let i = 0; i < N; i++) if (A.status[i] === ST.living) { live.push(i); byDist[A.district[i]].push(i); }
  ctx.live = live; ctx.byDist = byDist;
}

// ---------------------------------------------------------------- director (RimWorld storyteller)
function director(ctx) {
  const { A, w, day } = ctx, r = ctx.r("director"), dir = w.director;
  // RimWorld-style storyteller: a smoothed toll of recent breakings sets the pace; it picks its next blow, then saves for it
  dir.heat = Math.round(((dir.heat || 0) * 0.9 + (dir.toll || 0) * 10) * 10) / 10; dir.toll = 0;
  dir.base = Math.round(((dir.base || dir.heat) * 0.98 + dir.heat * 0.02) * 10) / 10;   // what counts as a hard season is relative to the usual toll
  dir.adapt = Math.round(Math.max(0.4, Math.min(2.6, 1.3 * (dir.base + 50) / (dir.heat + 50) * (w.iron && w.iron.tier >= 3 ? 1.3 : 1))) * 100) / 100; dir.points = Math.round((dir.points + dir.adapt) * 100) / 100;
  const allowed = ([k]) => (k !== "lemnian" || w.factions.some((f, i) => i >= w.baseFactions && f.alive && f.legit < 25)) && (k !== "ghost" || unburiedCount(ctx) > 0);
  if (!dir.next || !allowed(INCIDENTS.find((x) => x[0] === dir.next))) { const ok = INCIDENTS.filter(allowed); dir.next = r.weighted(ok, ok.map((x) => x[2]))[0]; }
  // the act: quiet (points accrue slowly), rising (faster), climax (the biggest blow it can afford), aftermath (nothing)
  if (!dir.act || day >= dir.actUntil || (dir.heat > dir.base * 2 && dir.act !== "aftermath")) {
    const next = dir.heat > dir.base * 2 ? "aftermath" : { quiet: "rising", rising: "climax", climax: "aftermath", aftermath: "quiet" }[dir.act || "aftermath"];
    dir.act = next; dir.actUntil = day + { quiet: 6, rising: 5, climax: 3, aftermath: 5 }[next] + r.int(4);
  }
  if (dir.act === "aftermath") return;
  if (dir.act === "quiet") dir.points = Math.round((dir.points - dir.adapt * 0.5) * 100) / 100;
  if (dir.act === "rising") dir.points = Math.round((dir.points + dir.adapt * 0.5) * 100) / 100;
  if (dir.act === "climax") { const big = INCIDENTS.filter(allowed).filter((x) => x[1] <= dir.points).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)); if (big.length) dir.next = big[0][0]; }
  const inc = INCIDENTS.find((x) => x[0] === dir.next);
  if (dir.points < inc[1] || !r.chance(dir.act === "climax" ? 0.7 : 0.2)) return;
  index(ctx);
  const quarters = DISTRICTS.map((d, k) => k).filter((k) => DISTRICTS[k].kind === "quarter" && ctx.byDist[k].length > 20);
  const [key, cost] = inc; dir.next = null;
  const pull = DISTRICTS.map(() => 1); for (const i of ctx.live) if (A.avenge[i] && !A.status[i]) pull[A.district[i]] += 0.3; for (const c of w.cases || []) if (c.open) pull[c.d] += 2;
  dir.points -= cost; const d = r.weighted(quarters, quarters.map((k) => pull[k]));
  const pick = (pool, n) => { const out = []; for (let t = 0; t < n && pool.length; t++) out.push(pool[r.int(pool.length)]); return [...new Set(out)]; };
  switch (key) {
    case "pall": dir.active.pall = day + 1; for (const i of ctx.live) think(ctx, i, TH.darkness); ctx.log(E.pall); break;
    case "harpies": { let lost = 0; for (const i of ctx.byDist[d]) { const q = Math.floor(A.inv[i * 5] / 2); A.inv[i * 5] -= q; lost += q; } ctx.log(E.harpies, -1, -1, d, lost); break; }
    case "plague": { const v = pick(ctx.byDist[d], 10).filter((i) => !A.immune[i]); for (const i of v) { A.sick[i] = 1; think(ctx, i, TH.plague_dread); } ctx.log(E.plague, v[0], -1, d, v.length); break; }
    case "sirens": {
      const near = [D.anthemoessa, D.lemnos, D.reef, D.agora].flatMap((k) => ctx.byDist[k]).filter((i) => A.stress[i] > 150);
      if (w.offices.orpheus !== undefined && living(A, w.offices.orpheus)) { for (const i of near) setCognomen(ctx, i, 10); ctx.log(E.sirens_sung, w.offices.orpheus, -1, D.anthemoessa, near.length); }
      else { let n = 0; for (const i of near) if (r.chance(0.25)) { kill(ctx, i, "answered the Sirens"); n++; } ctx.log(E.sirens, -1, -1, D.anthemoessa, n); }
      break; }
    case "talos": w.priceMult = 1.3; dir.active.talos = day + 5; ctx.log(E.talos, -1, -1, D.agora); break;
    case "doliones": {
      const fs = w.boule.coalition.length >= 2 ? w.boule.coalition.slice(0, 2) : [0, 1];
      const a = ctx.byDist[d].filter((i) => A.faction[i] === fs[0]), b = ctx.byDist[d].filter((i) => A.faction[i] === fs[1]); let dead = 0;
      for (let t = 0; t < Math.min(30, a.length, b.length); t++) { const x = a[r.int(a.length)], y = b[r.int(b.length)]; tie(ctx, x, y, -15); tie(ctx, y, x, -15); A.sick[y] = Math.max(A.sick[y], 2); if (r.chance(0.04)) { kill(ctx, y, "slain by an ally in the dark", x); dead++; } }
      ctx.log(E.doliones, -1, -1, d, dead, `${w.factions[fs[0]].name}|${w.factions[fs[1]].name}`); break; }
    case "featherbolts": { const v = pick(ctx.byDist[D.bear].concat(ctx.byDist[D.forges]), 15); for (const i of v) A.sick[i] = Math.max(A.sick[i], 2); ctx.log(E.featherbolts, -1, -1, D.bear, v.length); break; }
    case "ghost": { const k = [D.ares, D.reef, D.iolcus][r.int(3)]; for (const i of ctx.byDist[k]) if (r.chance(0.4)) think(ctx, i, TH.haunted); ctx.log(E.ghost, -1, -1, k); break; }
    case "lemnian": {
      const sp = w.factions.map((f, i) => i).filter((i) => i >= w.baseFactions && w.factions[i].alive && w.factions[i].legit < 25);
      const f = r.pick(sp), killers = ctx.live.filter((i) => A.faction[i] === f); if (!killers.length) break;
      const where = A.district[killers[0]], victims = ctx.byDist[where].filter((i) => A.faction[i] !== f); let n = 0;
      for (const v of pick(victims, 5 + r.int(10))) { kill(ctx, v, "murdered in the night of knives", killers[r.int(killers.length)], true); n++; }
      setCognomen(ctx, killers[0], 9); ctx.log(E.lemnian, killers[0], -1, where, n, w.factions[f].name); remember(w, day, "lemnian", killers[0], 80, `the night of knives in ${DISTRICTS[where].name.replace(/^the /, "")}`, -1); break; }
    case "bounty": w.fertility[d] = 1000; for (const i of ctx.byDist[d]) { A.inv[i * 5] += 4; think(ctx, i, TH.feasted); } ctx.log(E.bounty, -1, -1, d); break;
    case "prometheus": dir.active.prometheus = day + 3; for (const i of ctx.byDist[D.bear].concat(ctx.byDist[D.forges])) think(ctx, i, TH.terror_at_an_omen); ctx.log(E.prometheus, -1, -1, D.bear); break;
  }
}
function unburiedCount(ctx) { let n = 0; for (let i = 0; i < ctx.N; i++) if (ctx.A.unburied[i]) n++; return n; }

// ---------------------------------------------------------------- funerals (Charon's obol is the money sink)
function funerals(ctx) {
  const { A, w, day } = ctx, r = ctx.r("funeral");
  index(ctx); const reapers = ctx.live.filter((i) => A.job[i] === J.reaper && !A.jail[i]); if (!reapers.length) return;
  for (let i = 0; i < ctx.N; i++) {
    if (A.status[i] !== ST.shade || !A.unburied[i]) continue;
    const since = day - A.died[i];
    let payer = A.obols[i] >= 3 ? i : w.treasury >= 3 ? -2 : -1;
    if (payer === -1) { if (since === 9) { setCognomen(ctx, i, 3); ctx.log(E.unburied, i, -1, D.asphodel); } continue; }
    const rp = reapers[r.int(reapers.length)];
    if (payer === i) A.obols[i] -= 3; else w.treasury -= 3;
    A.obols[rp] += 1; w.destroyed += 2; A.unburied[i] = 0;
    if (r.chance(0.15)) ctx.log(E.funeral, i, rp, D.asphodel);
  }
}

// ---------------------------------------------------------------- bookkeeping
function stats(ctx) {
  const { A, w, day } = ctx; const live = ctx.live.length; let shade = 0, pyre = 0, asph = 0, exiled = 0, sick = 0, hungry = 0;
  for (let i = 0; i < ctx.N; i++) { const s = A.status[i]; if (s === ST.shade) shade++; else if (s === ST.pyre) pyre++; else if (s === ST.asphodel) asph++; else if (s === ST.exiled) exiled++; }
  const ob = new Float64Array(ctx.live.length); for (let k = 0; k < ob.length; k++) ob[k] = A.obols[ctx.live[k]]; ob.sort(); let cum = 0, tot = 0; for (let k = 0; k < ob.length; k++) { cum += (k + 1) * ob[k]; tot += ob[k]; }
  const gini = tot ? (2 * cum) / (ob.length * tot) - (ob.length + 1) / ob.length : 0;
  for (const i of ctx.live) { if (A.sick[i]) sick++; if (A.hunger[i]) hungry++; }
  let mood = 0; for (const i of ctx.live) mood += A.mood[i];
  w.stats.push({ d: day, live, shade, pyre, asph, exiled, sick, hungry, gini: Math.round(gini * 1000) / 1000, mood: Math.round(mood / Math.max(1, live)),
    prices: w.prices.map((p) => Math.round(p * 100) / 100), treasury: w.treasury, tax: w.taxPermille, unrest: (w.activePrev || []).reduce((a, b) => a + b, 0),
    fac: w.factions.map((f) => f.alive ? f.members : 0), leaves: w.leafCount || 0, births: w.births, leafDeaths: w.leafDeaths, N: w.N });
  if (w.stats.length > 900) w.stats.splice(0, w.stats.length - 900);
}
function chk(ctx, where) { if (ctx.w.debug) invariant(ctx, where); }
function invariant(ctx, where = "end") {
  const { A, w } = ctx; let s = w.treasury; for (let i = 0; i < ctx.N; i++) s += A.obols[i];
  if (s !== w.m0 + w.minted - w.destroyed) throw new Error(`money leak on day ${ctx.day} after ${where}: ${s} vs ${w.m0 + w.minted - w.destroyed}`);
}
