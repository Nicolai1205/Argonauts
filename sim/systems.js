// One sim day. Order of systems is fixed; every random draw comes from stream(seed, day, system).
import { BLOODS, DISTRICTS, D, GOODS, BASE_PRICE, TARGET, YIELD, JOBS, J, JOB_GOOD, ST, THOUGHTS, TH, OFFICES, SPLINTERS, SPLINTER_COLORS,
  COGNOMENS, BEAM, INCIDENTS, dayOfTs, PYRE_SECONDS } from "./lore.js";
import { stream, hash32 } from "./rng.js";
import { TIES, THS, BIO } from "./world.js";

// event types (also bio codes)
export const EV = ["", "death", "return", "burn", "ostologia", "sold", "xenia", "gold", "beam", "ruling", "deed", "star", "toll",
  "riot", "defect", "schism", "dissolve", "election", "law", "office", "ostracism", "funeral", "unburied", "break", "brawl", "robbery",
  "pall", "harpies", "plague", "sirens", "sirens_sung", "talos", "doliones", "featherbolts", "ghost", "lemnian", "bounty", "prometheus",
  "famine", "crash", "boom", "fleece", "exile_end", "budget", "cognomen", "hostage", "starved", "kinslayer", "migrate", "dole"];
export const E = Object.fromEntries(EV.map((e, i) => [e, i]));
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const isqrt = (n) => Math.floor(Math.sqrt(n));       // sqrt is exactly rounded in IEEE, safe for replay

export function tick(w, omens = []) {
  const day = w.day, ev = [];
  const ctx = { w, day, ev, A: w.A, N: w.N, r: (sys) => stream(w.seed, day, sys) };
  ctx.log = (t, a = -1, b = -1, x = -1, v = 0, s = "") => { const e = { i: ++w.eventSeq, d: day, t: EV[t], a, b, x, v, s }; ev.push(e); if (a >= 0) bio(ctx, a, t, b); if (b >= 0 && b !== a) bio(ctx, b, t, a); return e; };
  applyOmens(ctx, omens); chk(ctx, 'applyOmens');
  scheduled(ctx); chk(ctx, 'scheduled');
  index(ctx); chk(ctx, 'index');
  production(ctx); chk(ctx, 'production');
  consumption(ctx); chk(ctx, 'consumption');
  market(ctx); chk(ctx, 'market');
  social(ctx); chk(ctx, 'social');
  moodStress(ctx); chk(ctx, 'moodStress');
  unrest(ctx); chk(ctx, 'unrest');
  if (day % 7 === 0) { centroids(ctx); defection(ctx); migration(ctx); } chk(ctx, '');
  if (day % 30 === 0) politics(ctx); chk(ctx, '');
  director(ctx); chk(ctx, 'director');
  funerals(ctx); chk(ctx, 'funerals');
  stats(ctx); chk(ctx, 'stats');
  invariant(ctx);
  w.day++;
  return ev;
}

// ---------------------------------------------------------------- helpers
function bio(ctx, i, t, arg) { const A = ctx.A, p = A.bioPos[i]; A.bioDay[i * BIO + p] = ctx.day; A.bioType[i * BIO + p] = t; A.bioArg[i * BIO + p] = arg; A.bioPos[i] = (p + 1) % BIO; }
export function think(ctx, i, th) {
  const A = ctx.A, [, , dur, stacks] = THOUGHTS[th]; let n = 0, free = -1, oldest = -1, oldU = 1e9;
  for (let k = 0; k < THS; k++) { const s = i * THS + k; if (A.thType[s] === th) n++; if (A.thType[s] === 0 && free < 0) free = k; if (A.thUntil[s] < oldU) { oldU = A.thUntil[s]; oldest = k; } }
  if (n >= stacks) { for (let k = 0; k < THS; k++) if (A.thType[i * THS + k] === th) { A.thUntil[i * THS + k] = ctx.day + dur; break; } return; }
  const k = free >= 0 ? free : oldest; A.thType[i * THS + k] = th; A.thUntil[i * THS + k] = ctx.day + dur;
}
function tie(ctx, i, j, delta) {
  if (i === j || i < 0 || j < 0) return;
  const A = ctx.A; let weak = -1, wv = 1e9;
  for (let k = 0; k < TIES; k++) { const s = i * TIES + k; if (A.tieTo[s] === j) { A.tieVal[s] = clamp(A.tieVal[s] + delta, -100, 100); return; } const v = A.tieTo[s] < 0 ? -1 : Math.abs(A.tieVal[s]); if (v < wv) { wv = v; weak = k; } }
  if (wv < Math.abs(delta) + 2) { A.tieTo[i * TIES + weak] = j; A.tieVal[i * TIES + weak] = clamp(delta, -100, 100); }
}
const living = (A, i) => A.status[i] === ST.living;
export const homeFaction = (w, i) => w.static.bones[i] === 0 ? w.houseFaction[hash32(i + 1, "house") % 5] : w.static.bones[i];
const P = (A, i, k) => A.pers[i * 6 + k];          // 0 H,1 E,2 X,3 A,4 C,5 O
function setCognomen(ctx, i, c) { if (ctx.A.cognomen[i] !== c) { ctx.A.cognomen[i] = c; bio(ctx, i, E.cognomen, c); } }
export function kill(ctx, i, cause, by = -1) {
  const { A, w, day } = ctx; if (A.status[i] !== ST.living && A.status[i] !== ST.exiled) return;
  A.status[i] = ST.shade; A.died[i] = day; A.until[i] = day + 20 + (hash32(w.seed, i, day) % 41); A.unburied[i] = 1; A.district[i] = D.asphodel; A.hunger[i] = 0; A.sick[i] = 0; A.jail[i] = 0;
  A.inv[i * 5] = 0;
  for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k]; if (j >= 0 && A.tieVal[i * TIES + k] > 30 && living(A, j)) think(ctx, j, TH.mourning_kin); }
  if (A.office[i] >= 0) { delete w.offices[OFFICES[A.office[i]].key]; A.office[i] = -1; }
  w.director.lastDeath = day; w.director.adapt = Math.max(0.4, w.director.adapt - 0.25);
  ctx.log(E.death, i, by, -1, 0, cause);
  if (i === w.fleece) ctx.log(E.fleece, i, by, -1, 0, "the Fleece-bearer has fallen");
}

// ---------------------------------------------------------------- omens from the chain
function oikosOf(w, addr) { let k = w.oikosIx[addr]; if (k === undefined) { k = w.oikoi.length; w.oikoi.push({ addr, name: null }); w.oikosIx[addr] = k; } return k; }
function applyOmens(ctx, omens) {
  const { w, A, day } = ctx; let looms = 0, members = null;
  const membersOf = (o) => { if (!members) { members = {}; for (let i = 0; i < ctx.N; i++) if (living(A, i)) (members[A.oikos[i]] || (members[A.oikos[i]] = [])).push(i); } return members[o] || []; };
  const r = ctx.r("omens");
  for (const o of omens) {
    if (o.k === "burn" && o.tok) {
      const i = o.tok - 1; if (A.status[i] === ST.pyre || A.status[i] === ST.asphodel) continue;
      if (A.office[i] >= 0) { delete w.offices[OFFICES[A.office[i]].key]; A.office[i] = -1; }
      A.status[i] = ST.pyre; A.district[i] = D.pyra; A.oikos[i] = 0; A.unburied[i] = 0; A.hunger[i] = 0;
      A.until[i] = Math.max(day + 1, dayOfTs(o.ts + PYRE_SECONDS)); w.burnTs[i] = o.ts;
      let heir = -1, best = 0; for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k]; if (j >= 0 && A.tieVal[i * TIES + k] > best && living(A, j)) { best = A.tieVal[i * TIES + k]; heir = j; } if (j >= 0 && living(A, j) && A.tieVal[i * TIES + k] > 15) think(ctx, j, TH.a_friend_went_to_the_pyre); }
      if (heir >= 0) A.obols[heir] += A.obols[i]; else w.treasury += A.obols[i];
      A.obols[i] = 0; for (let g = 0; g < 5; g++) A.inv[i * 5 + g] = 0;
      ctx.log(E.burn, i, heir, D.pyra);
    } else if (o.k === "transfer" && o.tok) {
      const i = o.tok - 1, to = oikosOf(w, o.to); if (A.oikos[i] === to) continue;
      const from = A.oikos[i]; A.oikos[i] = to;
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
      think(ctx, i, TH.touched_by_the_maker); A.stress[i] = 0; A.cognomen[i] = 13;
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
      A.status[i] = ST.living; A.deaths[i]++; A.district[i] = BLOODS[w.static.bones[i]].home; A.inv[i * 5] = 6; A.stress[i] = 50; A.unburied[i] = 0;
      think(ctx, i, TH.twice_born); if (A.deaths[i] === 1) A.cognomen[i] = 1;
      ctx.log(E.return, i, -1, A.district[i], A.deaths[i]);
    } else if (s === ST.exiled && day >= A.until[i]) { A.status[i] = ST.living; A.district[i] = BLOODS[w.static.bones[i]].home; ctx.log(E.exile_end, i, -1, A.district[i]); }
    if (A.jail[i] > 0) A.jail[i]--;
  }
  if (w.director.active.talos && day >= w.director.active.talos) { w.priceMult = 1; delete w.director.active.talos; }
}

function index(ctx) {
  const { A, N } = ctx; const live = [], byDist = DISTRICTS.map(() => []);
  for (let i = 0; i < N; i++) if (A.status[i] === ST.living) { live.push(i); byDist[A.district[i]].push(i); }
  ctx.live = live; ctx.byDist = byDist;
}

// ---------------------------------------------------------------- economy
function production(ctx) {
  const { A, w, day } = ctx, r = ctx.r("production"), dark = w.director.active.pall === day, out = new Int32Array(DISTRICTS.length);
  const prom = (w.director.active.prometheus || -1) >= day;
  for (const i of ctx.live) {
    if (A.jail[i] || A.sick[i] || dark) continue;
    const job = JOBS[A.job[i]], good = JOB_GOOD[job]; if (!good) continue;
    const g = GOODS.indexOf(good), d = A.district[i];
    let q = job === "servant" || job === "rower" ? 2 : job === "merchant" ? 1 : (YIELD[good] || 1);
    q *= (0.8 + P(A, i, 4) / 250) * (w.fertility[d] / 1000) * (A.inv[i * 5 + 3] > 0 ? 1.4 : 1) * (A.mood[i] < -30 ? 0.6 : 1);
    if (prom && g === 4) q *= 2;
    const n = Math.floor(q) + (r.next() < q - Math.floor(q) ? 1 : 0);
    A.inv[i * 5 + g] = Math.min(400, A.inv[i * 5 + g] + n); out[d] += n;
    if (A.inv[i * 5 + 3] > 0 && r.chance(1 / 8)) A.inv[i * 5 + 3]--;
  }
  // soil and sea: regrow toward full, deplete with harvest relative to the district's working population
  for (let d = 0; d < DISTRICTS.length; d++) {
    const cap = Math.max(20, ctx.byDist[d].length * 2.2);
    w.fertility[d] = clamp(Math.round(w.fertility[d] + (1000 - w.fertility[d]) * 0.06 - out[d] * 30 / cap), 150, 1000);
  }
}

function consumption(ctx) {
  const { A, day } = ctx, r = ctx.r("consume"); let starving = 0;
  for (const i of ctx.live) {
    const b = i * 5;
    if (A.inv[b] > 0) { A.inv[b]--; A.hunger[i] = 0; if (A.inv[b] > 20) think(ctx, i, TH.well_fed); }
    else if (r.chance(DISTRICTS[A.district[i]].res === "food" || DISTRICTS[A.district[i]].res === "fish" ? 0.65 : 0.35)) A.hunger[i] = 0;   // forage, glean, beg a fish
    else { A.hunger[i] = Math.min(255, A.hunger[i] + 1); think(ctx, i, A.hunger[i] > 4 ? TH.starving : TH.hungry); if (A.hunger[i] > 4) starving++;
      if (A.hunger[i] >= 10 && r.chance((A.hunger[i] - 9) * 0.03)) { kill(ctx, i, "starved"); setCognomen(ctx, i, 2); continue; } }
    if (A.vice[i] && r.chance(A.vice[i] === 2 ? 0.6 : 0.5)) { if (A.inv[b + 1] > 0) A.inv[b + 1]--; else think(ctx, i, TH.craving_smoke); }
    if (A.inv[b + 2] > 0 && r.chance(1 / 10)) A.inv[b + 2]--;
    if (A.inv[b + 4] > 0 && P(A, i, 4) > 50 && r.chance(1 / 30)) A.inv[b + 4]--;
    if (A.inv[b] > 30 && r.chance(0.3)) A.inv[b] -= Math.ceil(A.inv[b] / 10);       // grain rots, fish stinks
    if (A.sick[i]) {
      think(ctx, i, TH.sick);
      if (A.inv[b + 4] > 0) { A.inv[b + 4]--; A.sick[i] = Math.max(0, A.sick[i] - 3); }
      else if (r.chance(0.12)) A.sick[i] = 0; else A.sick[i] = Math.min(60, A.sick[i] + 1);
      if (A.sick[i] >= 6 && r.chance(0.035)) kill(ctx, i, "plague");
    }
  }
  if (starving > ctx.live.length * 0.05 && day % 5 === 0) ctx.log(E.famine, -1, -1, -1, starving);
}

function services(ctx) {
  const { A, w } = ctx, r = ctx.r("services"), SERV = new Set([J.priest, J.reaper, J.servant, J.rower, J.augur, J.merchant]);
  const workers = DISTRICTS.map(() => []), all = [];
  for (const i of ctx.live) if (!A.status[i] && !A.jail[i] && SERV.has(A.job[i])) { workers[A.district[i]].push(i); all.push(i); }
  if (!all.length) return;
  for (const i of ctx.live) {
    if (A.status[i]) continue;
    const exp = BLOODS[w.static.bones[i]].wealth, floor = exp >> 1, spare = A.obols[i] - floor; if (spare < 40) continue;
    if (A.obols[i] > exp * 5) { const lit = Math.floor((A.obols[i] - exp * 5) / 400); if (lit > 0) { A.obols[i] -= lit; w.treasury += lit; } }   // leitourgia: the rich fund the city
    const pay = Math.max(1, Math.floor(spare / 80));
    const pool = workers[A.district[i]].length ? workers[A.district[i]] : all, j = pool[r.int(pool.length)];
    if (j === i) continue; A.obols[i] -= pay; A.obols[j] += pay;
    if (A.job[j] === J.priest && A.ideo[i * 3 + 2] > 20) tie(ctx, i, j, 1);
  }
}
function market(ctx) {
  services(ctx);
  const { A, w } = ctx, r = ctx.r("market");
  for (let g = 0; g < 5; g++) {
    const sellers = [], buyers = []; let S = 0, Dm = 0;
    for (const i of ctx.live) {
      if (A.jail[i] || A.status[i]) continue;
      const have = A.inv[i * 5 + g], need = g === 1 ? (A.vice[i] ? TARGET[1] : 0) : g === 3 ? (JOB_GOOD[JOBS[A.job[i]]] ? 1 : 0) : g === 4 ? (A.sick[i] ? 2 : P(A, i, 4) > 50 ? 1 : 0) : TARGET[g];
      if (have > need + 2) { const q = Math.min(have - need - 1, 25); sellers.push(i, q); S += q; }
      else if (have < need) {
        // willingness to pay, as a multiple of the base price: urgency and wealth (demand answers price)
        let wmax = g === 0 ? (A.hunger[i] ? 6 : 2.5) : g === 1 ? 3 : g === 2 ? 1.6 : g === 3 ? 1.4 : (A.sick[i] ? 6 : 1.3);
        if (A.obols[i] > BLOODS[w.static.bones[i]].wealth * 4) wmax *= 2;
        if (w.prices[g] * w.priceMult <= BASE_PRICE[g] * wmax) { buyers.push(i, need - have); Dm += need - have; }
      }
    }
    const old = w.prices[g];
    let p = old * (1 + 0.06 * clamp((Dm - S) / Math.max(Dm, S, 1), -1, 1));
    p = clamp(p, BASE_PRICE[g] * 0.3, BASE_PRICE[g] * 6); w.prices[g] = Math.round(p * 1000) / 1000;
    if (g === 0 && w.prices[0] > BASE_PRICE[0] * 3 && old <= BASE_PRICE[0] * 3) ctx.log(E.crash, -1, -1, D.agora, Math.round(w.prices[0] * 100), "food");
    const pe = w.prices[g] * w.priceMult; if (!sellers.length || !buyers.length) continue;
    // match in a seeded order
    const bo = []; for (let k = 0; k < buyers.length; k += 2) bo.push(k); r.shuffle(bo);
    const so = []; for (let k = 0; k < sellers.length; k += 2) so.push(k); r.shuffle(so);
    let sp = 0;
    for (const bk of bo) {
      const i = buyers[bk]; let want = Math.min(buyers[bk + 1], Math.floor(A.obols[i] / Math.max(1, Math.ceil(pe))));
      while (want > 0 && sp < so.length) {
        const sk = so[sp], j = sellers[sk], q = Math.min(want, sellers[sk + 1]);
        if (q <= 0) { sp++; continue; }
        const pay = Math.max(1, Math.round(pe * q)); if (pay > A.obols[i]) break;
        const tax = Math.floor(pay * w.taxPermille / 1000);
        A.obols[i] -= pay; A.obols[j] += pay - tax; w.treasury += tax;
        A.inv[i * 5 + g] += q; A.inv[j * 5 + g] -= q; sellers[sk + 1] -= q; want -= q;
        if (sellers[sk + 1] <= 0) sp++;
      }
    }
    // the grain dole: when the Boule leans to the Commons, the treasury buys bread for the hungry poor
    if (g === 0 && w.grainDole && w.treasury > 0) {
      let fed = 0;
      for (const bk of bo) {
        const i = buyers[bk]; if (!A.hunger[i] || A.obols[i] >= Math.ceil(pe)) continue;
        while (sp < so.length && sellers[so[sp] + 1] <= 0) sp++; if (sp >= so.length) break;
        const sk = so[sp], j = sellers[sk], q = Math.min(3, sellers[sk + 1]), pay = Math.max(1, Math.round(pe * q)); if (pay > w.treasury) break;
        w.treasury -= pay; A.obols[j] += pay; A.inv[i * 5] += q; A.inv[j * 5] -= q; sellers[sk + 1] -= q; fed++;
      }
      if (fed > 50 && ctx.day % 10 === 0) ctx.log(E.dole, -1, -1, D.agora, fed);
    }
  }
}

// weekly: hands leave trades that no longer feed them (Songs of Syx: migration is the release valve)
function migration(ctx) {
  const { A, w } = ctx, r = ctx.r("migrate"); let n = 0;
  const ratio = w.prices.map((p, g) => p / BASE_PRICE[g]);
  let best = 0; for (let g = 1; g < 5; g++) if (ratio[g] > ratio[best]) best = g;
  const where = DISTRICTS.map((d, k) => k).filter((k) => DISTRICTS[k].res === GOODS[best] || (best === 0 && DISTRICTS[k].res === "fish"));
  for (const i of ctx.live) {
    if (A.status[i] || A.jail[i]) continue;
    const good = JOB_GOOD[JOBS[A.job[i]]]; if (!good || JOBS[A.job[i]] === "servant" || JOBS[A.job[i]] === "rower") continue;
    const g = GOODS.indexOf(good); if (ratio[best] < 1.4 || g === best || ratio[g] > 0.7 || A.obols[i] > BLOODS[w.static.bones[i]].wealth / 2 || !r.chance(0.08 + P(A, i, 5) / 600)) continue;
    const d = where[r.int(where.length)], res = DISTRICTS[d].res;
    A.district[i] = d; A.job[i] = res === "food" ? J.farmer : res === "fish" ? J.fisher : res === "ore" ? J.miner : res === "cloth" ? J.weaver : res === "smoke" ? J.grower : J.herbalist; n++;
    bio(ctx, i, E.migrate, d);
  }
  if (n > 40) ctx.log(E.migrate, -1, -1, where[0], n, GOODS[best]);
}

// ---------------------------------------------------------------- society
function social(ctx) {
  const { A, w } = ctx, r = ctx.r("social"), guards = guardCount(ctx);
  for (const i of ctx.live) {
    if (A.status[i] || A.jail[i] || !r.chance(0.45 + P(A, i, 2) / 220)) continue;
    let j = -1;
    if (r.chance(0.55)) { const k = r.int(TIES), t = A.tieTo[i * TIES + k]; if (t >= 0 && living(A, t)) j = t; }
    if (j < 0) { const pool = ctx.byDist[A.district[i]]; if (!pool.length) continue; j = pool[r.int(pool.length)]; }
    if (j === i || j < 0 || A.jail[j] || A.status[j]) continue;
    let dist = 0; for (let k = 0; k < 3; k++) dist += Math.abs(A.ideo[i * 3 + k] - A.ideo[j * 3 + k]);
    const same = A.faction[i] === A.faction[j], kin = A.oikos[i] === A.oikos[j];
    const score = (P(A, i, 3) + P(A, j, 3)) / 2 - dist / 6 + (same ? 15 : -4) + (kin ? 12 : 0) + r.next() * 40 - 20;
    if (score > 45) {
      tie(ctx, i, j, 6); tie(ctx, j, i, 6); think(ctx, i, TH.a_good_talk); think(ctx, j, TH.a_good_talk);
      const eps = 20 + P(A, i, 5) / 2;
      for (let k = 0; k < 3; k++) { const a = A.ideo[i * 3 + k], b = A.ideo[j * 3 + k]; if (Math.abs(a - b) < eps) { const m = Math.round((b - a) * 0.15); A.ideo[i * 3 + k] = clamp(a + m, -100, 100); A.ideo[j * 3 + k] = clamp(b - m, -100, 100); } }
    } else if (score > 20) { tie(ctx, i, j, 2); tie(ctx, j, i, 2); }
    else if (score > 0) {
      tie(ctx, i, j, -3); tie(ctx, j, i, -3);
      if (!same) { let ax = 0, mx = -1; for (let k = 0; k < 3; k++) { const dd = Math.abs(A.ideo[i * 3 + k] - A.ideo[j * 3 + k]); if (dd > mx) { mx = dd; ax = k; } }
        if (mx > 60) { const s = A.ideo[i * 3 + ax] > A.ideo[j * 3 + ax] ? 3 : -3; A.ideo[i * 3 + ax] = clamp(A.ideo[i * 3 + ax] + s, -100, 100); } }   // repulsion from the out-group
    } else {
      tie(ctx, i, j, -8); tie(ctx, j, i, -10); think(ctx, j, TH.insulted);
      if (r.chance(0.04 * (100 - P(A, i, 3)) / 50)) {
        A.sick[i] = Math.max(A.sick[i], 2); A.sick[j] = Math.max(A.sick[j], 2); tie(ctx, i, j, -20); tie(ctx, j, i, -20);
        if (r.chance(0.03)) ctx.log(E.brawl, i, j, A.district[i]);
        if (r.chance(0.01)) { kill(ctx, j, "brawl", i); setCognomen(ctx, i, 9); }
      }
    }
    // plague jumps between bodies; the fed feed their friends
    if (A.sick[i] > 2 && !A.sick[j] && r.chance(0.06)) A.sick[j] = 1;
    if (A.hunger[i] > 1 && A.inv[j * 5] > 10) { const k = tieIndex(A, j, i); if (k >= 0 && A.tieVal[j * TIES + k] > 25) { A.inv[j * 5] -= 3; A.inv[i * 5] += 3; tie(ctx, i, j, 5); } }
    // pirates take
    if (A.job[i] === J.pirate && !same && A.obols[j] > A.obols[i] * 2 && r.chance(0.12 * (100 - P(A, i, 0)) / 100)) {
      const take = Math.max(1, Math.floor(A.obols[j] / 10)); A.obols[j] -= take; A.obols[i] += take; think(ctx, j, TH.robbed); tie(ctx, j, i, -40);
      A.radical[j] = clamp(A.radical[j] + 5, -100, 100);
      if (r.chance(Math.min(0.8, guards[A.district[i]] * 0.08))) { A.jail[i] = 8; if (take > 250 || r.chance(0.004)) ctx.log(E.robbery, i, j, A.district[i], take, "caught"); else bio(ctx, i, E.robbery, j); }
      else if (take > 250 || r.chance(0.004)) ctx.log(E.robbery, i, j, A.district[i], take, ""); else bio(ctx, j, E.robbery, i);
    }
  }
}
const tieIndex = (A, i, j) => { for (let k = 0; k < TIES; k++) if (A.tieTo[i * TIES + k] === j) return k; return -1; };

function moodStress(ctx) {
  const { A, w, day } = ctx, r = ctx.r("mood");
  for (const i of ctx.live) {
    if (A.status[i]) continue;
    let m = 0; const seen = {};
    for (let k = 0; k < THS; k++) {
      const s = i * THS + k, t = A.thType[s]; if (!t) continue;
      if (A.thUntil[s] < day) { A.thType[s] = 0; continue; }
      seen[t] = (seen[t] || 0) + 1; m += THOUGHTS[t][1] * (seen[t] > 1 ? 0.6 : 1);
    }
    const exp = BLOODS[w.static.bones[i]].wealth;       // Victoria-style expected standard of living per blood
    m += clamp((A.obols[i] / exp - 1) * 12, -20, 15);
    m += A.office[i] >= 0 ? 10 : 0;
    A.mood[i] = clamp(Math.round(m), -100, 100);
    const st = A.stress[i] + (m < 0 ? -m / 8 : -m / 12) - 2;
    A.stress[i] = clamp(Math.round(st), 0, 600);
    // radical / loyal ledger with a deadband
    if (m < -25) A.radical[i] = clamp(A.radical[i] + 1, -100, 100); else if (m > 25) A.radical[i] = clamp(A.radical[i] - 1, -100, 100);
    if (A.stress[i] > 420) breakdown(ctx, i, r);
  }
}
function breakdown(ctx, i, r) {
  const { A, w } = ctx; A.stress[i] = 220; think(ctx, i, TH.katharsis);
  if (P(A, i, 1) > 65) {
    A.district[i] = D.anthemoessa;
    if (!w.offices.orpheus && r.chance(0.3)) { kill(ctx, i, "answered the Sirens"); return; }
    ctx.log(E.break, i, -1, D.anthemoessa, 0, "walked into the Siren meadow");
  } else if (P(A, i, 3) < 35) {
    const k = r.int(TIES), j = A.tieTo[i * TIES + k]; if (j >= 0 && living(A, j)) { A.sick[j] = Math.max(A.sick[j], 3); tie(ctx, j, i, -50); }
    if (r.chance(0.25)) ctx.log(E.break, i, j, A.district[i], 0, "rampaged"); else bio(ctx, i, E.break, j);
  } else if (P(A, i, 0) < 35) {
    const pool = ctx.byDist[A.district[i]].filter((x) => !A.status[x]); if (!pool.length) return; const j = pool[r.int(pool.length)]; const take = Math.floor(A.obols[j] / 5); A.obols[j] -= take; A.obols[i] += take;
    ctx.log(E.break, i, j, A.district[i], take, "stole from a neighbour");
  } else { A.sick[i] = Math.max(A.sick[i], 3); bio(ctx, i, E.break, -1); }
}

// ---------------------------------------------------------------- unrest (Epstein civil violence)
function guardCount(ctx) {
  const { A, w } = ctx; const g = new Int32Array(DISTRICTS.length);
  if (w.guardLevel === 0) return g;
  for (const i of ctx.live) if (A.job[i] === J.reaper && !A.jail[i]) g[A.district[i]] += w.guardLevel;
  return g;
}
function unrest(ctx) {
  const { A, w } = ctx, r = ctx.r("unrest"), guards = guardCount(ctx), prev = w.activePrev || [];
  const active = DISTRICTS.map(() => []);
  for (const i of ctx.live) {
    if (A.jail[i] || A.status[i]) continue;
    const H = clamp((A.hunger[i] * 12 + Math.max(0, -A.mood[i])) / 100, 0, 1);
    const L = w.factions[A.faction[i]].legit / 100;
    const G = H * (1 - L) + A.radical[i] / 400;
    const R = (P(A, i, 1) * 0.6 + P(A, i, 4) * 0.4) / 100, d = A.district[i];
    const Pa = Math.min(1, 2.3 * guards[d] / ((prev[d] || 0) + 1));
    if (G - R * Pa > 0.1) active[d].push(i);
  }
  w.activePrev = active.map((a) => a.length);
  for (let d = 0; d < DISTRICTS.length; d++) {
    const a = active[d], pop = ctx.byDist[d].length;
    if (a.length < 15 || a.length < pop * 0.1 || (w.riotCool && w.riotCool[d] > ctx.day)) continue;
    (w.riotCool || (w.riotCool = DISTRICTS.map(() => 0)))[d] = ctx.day + 10;
    w.unrestSeason = (w.unrestSeason || 0) + 1;
    let dead = 0, jailed = 0, looted = 0;
    for (const i of a) {
      A.radical[i] = clamp(A.radical[i] + 8, -100, 100);
      const v = ctx.byDist[d][r.int(pop)]; if (A.inv[v * 5] > 4 && A.obols[v] > A.obols[i]) { const q = Math.ceil(A.inv[v * 5] / 3); A.inv[v * 5] -= q; A.inv[i * 5] += q; looted += q; }
      if (r.chance(0.004)) { kill(ctx, i, "cut down in the riot"); dead++; }
      else if (jailed < guards[d] * 3 && r.chance(0.5)) { A.jail[i] = 10; jailed++; }
    }
    const inA = new Set(a); for (const i of ctx.byDist[d]) if (!inA.has(i) && r.chance(0.5)) think(ctx, i, TH.fear_of_the_mob);
    const lead = a.reduce((b, i) => (A.radical[i] > A.radical[b] ? i : b), a[0]); setCognomen(ctx, lead, 8);
    ctx.log(E.riot, lead, -1, d, a.length, JSON.stringify({ dead, jailed, looted }));
  }
}

// ---------------------------------------------------------------- allegiance
function centroids(ctx) {
  const { A, w } = ctx; const sum = w.factions.map(() => [0, 0, 0, 0]);
  for (const i of ctx.live) { if (A.status[i]) continue; const f = sum[A.faction[i]]; f[0] += A.ideo[i * 3]; f[1] += A.ideo[i * 3 + 1]; f[2] += A.ideo[i * 3 + 2]; f[3]++; }
  w.factions.forEach((f, k) => { f.members = sum[k][3]; if (sum[k][3]) f.ideo = [0, 1, 2].map((x) => Math.round(sum[k][x] / sum[k][3])); });
}
function defection(ctx) {
  const { A, w } = ctx, r = ctx.r("defect"); let n = 0;
  const cnt = new Int32Array(w.factions.length);
  for (const i of ctx.live) {
    if (A.status[i]) continue;
    cnt.fill(0); let pos = 0;
    for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k]; if (j >= 0 && A.tieVal[i * TIES + k] >= 15 && living(A, j)) { cnt[A.faction[j]]++; pos++; } }
    if (pos < 3) continue;
    const own = A.faction[i]; let g = -1, c = 0;
    for (let f = 0; f < cnt.length; f++) if (f !== own && w.factions[f].alive && cnt[f] > c) { c = cnt[f]; g = f; }
    if (g < 0) continue;
    let theta = A.identity[i] / 100 * 0.6 + 0.25; if (A.radical[i] > 30) theta -= 0.15; if (w.factions[own].legit < 30) theta -= 0.1;
    const dOwn = idist(A, i, w.factions[own].ideo), dNew = idist(A, i, w.factions[g].ideo);
    if (c / pos > theta && dNew + 10 < dOwn && r.chance(0.5)) {
      A.faction[i] = g; A.identity[i] = Math.max(5, A.identity[i] - 20); n++;
      if (w.factions[g].blood !== w.static.bones[i] && g < w.baseFactions && r.chance(0.35)) ctx.log(E.defect, i, -1, A.district[i], g, w.factions[g].name);
      else if (g >= w.baseFactions) ctx.log(E.defect, i, -1, A.district[i], g, w.factions[g].name);
      if (w.factions[g].blood !== w.static.bones[i] && A.cognomen[i] === 0 && r.chance(0.1)) A.cognomen[i] = 15;
    }
  }
}
const idist = (A, i, c) => Math.abs(A.ideo[i * 3] - c[0]) + Math.abs(A.ideo[i * 3 + 1] - c[1]) + Math.abs(A.ideo[i * 3 + 2] - c[2]);

// ---------------------------------------------------------------- the Boule (each season = 30 days)
function politics(ctx) {
  const { A, w, day } = ctx, r = ctx.r("politics");
  index(ctx); centroids(ctx);
  // political strength by franchise law (Victoria: wealth buys clout)
  const sorted = ctx.live.map((i) => A.obols[i]).sort((a, b) => a - b), top = sorted[Math.floor(sorted.length * 0.9)] || 0;
  w.factions.forEach((f) => (f.clout = 0));
  for (const i of ctx.live) {
    const o = A.obols[i]; const s = w.franchise === "headcount" ? 4 : w.franchise === "property" ? 4 + isqrt(Math.max(0, o)) / 2 : (o >= top ? isqrt(o) : 0);
    w.factions[A.faction[i]].clout += s;
  }
  // D'Hondt
  const seats = w.factions.map(() => 0);
  for (let s = 0; s < w.boule.seats; s++) { let best = -1, bv = -1; w.factions.forEach((f, k) => { if (!f.alive) return; const v = f.clout / (seats[k] + 1); if (v > bv) { bv = v; best = k; } }); if (best >= 0) seats[best]++; }
  w.factions.forEach((f, k) => (f.seats = seats[k]));
  // minimal connected winning coalition along Order<->Liberty
  const order = w.factions.map((f, k) => k).filter((k) => w.factions[k].alive && seats[k] > 0).sort((a, b) => w.factions[a].ideo[0] - w.factions[b].ideo[0] || a - b);
  let coal = order, cs = 1e9;
  for (let s = 0; s < order.length; s++) { let t = 0; for (let e = s; e < order.length; e++) { t += seats[order[e]]; if (t > w.boule.seats / 2) { if (t < cs) { cs = t; coal = order.slice(s, e + 1); } break; } } }
  const prevCoal = w.boule.coalition.join(",");
  w.boule.coalition = coal; w.factions.forEach((f, k) => (f.inCoalition = coal.includes(k)));
  if (coal.join(",") !== prevCoal) ctx.log(E.election, -1, -1, D.agora, 0, coal.map((k) => w.factions[k].name).join(" + "));
  // laws follow the coalition's seat-weighted ideology
  const m = [0, 0, 0]; let ts = 0; for (const k of coal) { for (let x = 0; x < 3; x++) m[x] += w.factions[k].ideo[x] * seats[k]; ts += seats[k]; }
  for (let x = 0; x < 3; x++) m[x] = Math.round(m[x] / Math.max(1, ts));
  const law = (key, from, to, adico) => { if (from === to) return; w.laws.unshift({ day, key, from, to, adico }); w.laws = w.laws.slice(0, 40); ctx.log(E.law, -1, -1, D.agora, 0, adico); };
  const taxT = clamp(70 - m[1], 20, 200), tax = clamp(w.taxPermille + clamp(taxT - w.taxPermille, -25, 25), 20, 200);
  law("tax", w.taxPermille, tax, `[Every seller in the Agora] [must] [give ${(tax / 10).toFixed(1)}% of each sale to the Boule] [at every trade] [or be fined double]`); w.taxPermille = tax;
  const gl = m[0] > 20 ? 2 : m[0] < -20 ? 0 : 1;
  law("guards", w.guardLevel, gl, gl === 0 ? "[The Reapers] [must not] [bear arms in the quarters] [in peacetime] [or lose their office]" : `[The Reapers] [must] [keep the watch at ${gl === 2 ? "double" : "single"} strength] [every night] [or answer to the Tiphys]`); w.guardLevel = gl;
  const tl = m[2] > 20 ? 2 : m[2] < -20 ? 0 : 1;
  law("tithe", w.titheLevel, tl, tl === 0 ? "[The temples] [may not] [take a share of the treasury] [this season] [or be stripped]" : `[The Boule] [must] [give the temples ${tl === 2 ? "a double" : "a"} tithe] [each season] [or the gods turn away]`); w.titheLevel = tl;
  const gd = m[1] < -10; law("dole", !!w.grainDole, gd, gd ? "[The Boule] [must] [buy bread for every hungry Minyan without obols] [each day] [or the Tiphys answers for it]" : "[No Minyan] [may] [eat at the Boule's expense] [this season] [or repay it twice]"); w.grainDole = gd;
  const riots = w.unrestSeason || 0, F = ["oligarchy", "property", "headcount"]; let fr = F.indexOf(w.franchise);
  if (riots >= 3 && fr < 2) fr++; else if (riots === 0 && m[1] > 30 && fr > 0) fr--;
  law("franchise", w.franchise, F[fr], ["[Only the richest tenth] [may] [vote in the Boule] [each season] [or their votes are void]", "[Every Minyan] [may] [vote with weight by their obols] [each season] [or be struck from the rolls]", "[Every living Minyan] [may] [cast one vote] [each season] [or the Boule is unlawful]"][fr]); w.franchise = F[fr];
  w.unrestSeason = 0;
  // budget: guards, temples, then a Baron-Ferejohn split of the dole inside the coalition
  let T = w.treasury; const pay = (ids, amount) => { if (!ids.length || amount <= 0) return 0; const each = Math.floor(amount / ids.length); for (const i of ids) A.obols[i] += each; return each * ids.length; };
  const reapers = ctx.live.filter((i) => A.job[i] === J.reaper), priests = ctx.live.filter((i) => A.job[i] === J.priest), augurs = ctx.live.filter((i) => A.job[i] === J.augur);
  T -= pay(reapers, Math.floor(w.treasury * 0.12 * w.guardLevel));
  T -= pay(priests.concat(augurs), Math.floor(w.treasury * 0.1 * w.titheLevel));
  const dole = Math.floor(T * 0.9), proposer = coal.length ? r.weighted(coal, coal.map((k) => seats[k])) : -1, n = coal.length, delta = 0.9;
  const shares = {}; if (proposer >= 0) { shares[proposer] = n > 1 ? 1 - delta * (n - 1) / (2 * n) : 1; const rest = 1 - shares[proposer], os = coal.filter((k) => k !== proposer), ss = os.reduce((a, k) => a + seats[k], 0); for (const k of os) shares[k] = rest * seats[k] / Math.max(1, ss); }
  const byF = {}; for (const i of ctx.live) (byF[A.faction[i]] || (byF[A.faction[i]] = [])).push(i);
  for (const k of Object.keys(shares)) T -= pay(byF[k] || [], Math.floor(dole * shares[k]));
  w.treasury = T; w.boule.proposer = proposer;
  if (proposer >= 0) ctx.log(E.budget, -1, -1, D.agora, dole, w.factions[proposer].name);
  // legitimacy and thoughts
  const hungry = w.factions.map(() => [0, 0]); for (const i of ctx.live) { const h = hungry[A.faction[i]]; h[1]++; if (A.hunger[i] || A.mood[i] < -30) h[0]++; }
  w.factions.forEach((f, k) => { const hs = hungry[k][1] ? hungry[k][0] / hungry[k][1] : 0;
    const target = 50 + (f.inCoalition ? 15 : -10) + (k === proposer ? 10 : 0) - hs * 60 - Math.min(20, riots * 2);
    f.legit = clamp(Math.round(f.legit + (target - f.legit) * 0.35), 0, 100); });
  for (const i of ctx.live) think(ctx, i, w.factions[A.faction[i]].inCoalition ? TH.our_blood_holds_the_boule : TH.our_blood_shut_out);
  offices(ctx, proposer);
  ostracism(ctx);
  schisms(ctx, r);
}

function offices(ctx, proposer) {
  const { A, w } = ctx;
  const best = (pred, score) => { let b = -1, bv = -1e9; for (const i of ctx.live) if (!A.jail[i] && pred(i)) { const v = score(i); if (v > bv) { bv = v; b = i; } } return b; };
  const want = {
    tiphys: best((i) => A.faction[i] === proposer, (i) => isqrt(A.obols[i]) + P(A, i, 2) / 4 + A.tieVal.subarray(i * TIES, i * TIES + TIES).reduce((a, v) => a + Math.max(0, v), 0) / 20),
    lynceus: best((i) => w.static.sight[i] === w._digital, (i) => P(A, i, 4) + P(A, i, 5)),
    orpheus: best((i) => true, (i) => P(A, i, 2) + P(A, i, 5) - P(A, i, 1) / 2 + (i % 97) / 100),
    aethalides: best((i) => A.job[i] === J.reaper, (i) => P(A, i, 4) - P(A, i, 1) / 3),
    medea: best((i) => A.job[i] === J.herbalist, (i) => A.obols[i] + P(A, i, 5)),
    mopsus: best((i) => A.job[i] === J.augur, (i) => P(A, i, 5) + A.deaths[i] * 20),
    boread: best((i) => A.job[i] === J.reaper, (i) => 100 - P(A, i, 1) + P(A, i, 2) / 2),
    argus: best((i) => A.job[i] === J.weaver || A.job[i] === J.miner, (i) => A.obols[i]),
  };
  OFFICES.forEach((o, k) => {
    const i = want[o.key], cur = w.offices[o.key];
    if (i < 0 || i === cur) return;
    if (cur !== undefined) A.office[cur] = -1;
    w.offices[o.key] = i; A.office[i] = k; ctx.log(E.office, i, cur === undefined ? -1 : cur, A.district[i], k, o.title);
  });
}

function ostracism(ctx) {
  const { A, w, day } = ctx; const hate = new Int32Array(ctx.N);
  for (const i of ctx.live) for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k], v = A.tieVal[i * TIES + k]; if (j >= 0 && v < 0) hate[j] -= v; }
  let worst = -1, hv = 260; for (const i of ctx.live) if (hate[i] > hv) { hv = hate[i]; worst = i; }
  if (worst < 0) return;
  A.status[worst] = ST.exiled; A.until[worst] = day + 60; A.district[worst] = D.agora; think(ctx, worst, TH.exiled);
  if (A.office[worst] >= 0) { delete w.offices[OFFICES[A.office[worst]].key]; A.office[worst] = -1; }
  setCognomen(ctx, worst, 17); ctx.log(E.ostracism, worst, -1, D.agora, hv);
}

function schisms(ctx, r) {
  const { A, w, day } = ctx;
  const sorted = ctx.live.map((i) => A.obols[i]).sort((a, b) => b - a), eliteLine = sorted[Math.floor(sorted.length * 0.03)] || 1e9;
  const nf = w.factions.length;
  for (let f = 0; f < nf; f++) {
    const F = w.factions[f]; if (!F.alive || F.legit >= 35 || w.factions.filter((x) => x.alive).length >= 24) continue;
    const asp = ctx.live.filter((i) => A.faction[i] === f && A.obols[i] >= eliteLine && A.office[i] < 0 && (A.radical[i] > 0 || A.mood[i] < 0));
    if (asp.length < 4) continue;
    const founder = asp.reduce((b, i) => (A.obols[i] > A.obols[b] ? i : b), asp[0]);
    const id = w.factions.length, used = new Set(w.factions.map((x) => x.name));
    const nm = SPLINTERS.find((s) => !used.has(s)) || `the ${COGNOMENS[1 + (id % (COGNOMENS.length - 1))]} League`;
    const ideo = [0, 1, 2].map((x) => A.ideo[founder * 3 + x]);
    const recruits = ctx.live.filter((i) => A.faction[i] === f && (idist(A, i, ideo) + 20 < idist(A, i, F.ideo)) && (tieIndex(A, i, founder) >= 0 || A.radical[i] > 20));
    if (recruits.length < 5) continue;
    w.factions.push({ id, key: "s" + id, name: nm, title: `who broke from the ${F.name}`, color: SPLINTER_COLORS[id % SPLINTER_COLORS.length], blood: F.blood, founder, born: day, alive: true,
      legit: 40, clout: 0, seats: 0, inCoalition: false, ideo, members: recruits.length + 1 });
    for (const i of recruits.concat([founder])) A.faction[i] = id;
    setCognomen(ctx, founder, 16); ctx.log(E.schism, founder, -1, A.district[founder], id, nm);
  }
  // splinters with almost nobody left dissolve back into their blood
  w.factions.forEach((F, k) => { if (k < w.baseFactions || !F.alive) return; let n = 0; for (const i of ctx.live) if (A.faction[i] === k) n++;
    if (n < 5) { F.alive = false; for (let i = 0; i < ctx.N; i++) if (A.faction[i] === k) A.faction[i] = homeFaction(w, i); ctx.log(E.dissolve, -1, -1, -1, k, F.name); } });
}

// ---------------------------------------------------------------- director (RimWorld storyteller)
function director(ctx) {
  const { A, w, day } = ctx, r = ctx.r("director"), dir = w.director;
  dir.adapt = Math.min(2.2, dir.adapt + 0.02); dir.points += dir.adapt;
  if (dir.points < 10 || !r.chance(0.3)) return;
  index(ctx);
  const quarters = DISTRICTS.map((d, k) => k).filter((k) => DISTRICTS[k].kind === "quarter" && ctx.byDist[k].length > 20);
  const ok = INCIDENTS.filter(([k, cost]) => cost <= dir.points && (k !== "lemnian" || w.factions.some((f, i) => i >= w.baseFactions && f.alive && f.legit < 25)) && (k !== "ghost" || ctx.N && unburiedCount(ctx) > 0));
  if (!ok.length) return;
  const [key, cost] = r.weighted(ok, ok.map((x) => x[2]));
  dir.points -= cost; const d = r.pick(quarters);
  const pick = (pool, n) => { const out = []; for (let t = 0; t < n && pool.length; t++) out.push(pool[r.int(pool.length)]); return [...new Set(out)]; };
  switch (key) {
    case "pall": dir.active.pall = day + 1; for (const i of ctx.live) think(ctx, i, TH.darkness); ctx.log(E.pall); break;
    case "harpies": { let lost = 0; for (const i of ctx.byDist[d]) { const q = Math.floor(A.inv[i * 5] / 2); A.inv[i * 5] -= q; lost += q; } ctx.log(E.harpies, -1, -1, d, lost); break; }
    case "plague": { const v = pick(ctx.byDist[d], 10); for (const i of v) { A.sick[i] = 1; think(ctx, i, TH.plague_dread); } ctx.log(E.plague, v[0], -1, d, v.length); break; }
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
      for (const v of pick(victims, 5 + r.int(10))) { kill(ctx, v, "murdered in the night of knives", killers[r.int(killers.length)]); n++; }
      setCognomen(ctx, killers[0], 9); ctx.log(E.lemnian, killers[0], -1, where, n, w.factions[f].name); break; }
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
  const ob = ctx.live.map((i) => A.obols[i]).sort((a, b) => a - b); let cum = 0, tot = 0; for (let k = 0; k < ob.length; k++) { cum += (k + 1) * ob[k]; tot += ob[k]; }
  const gini = tot ? (2 * cum) / (ob.length * tot) - (ob.length + 1) / ob.length : 0;
  for (const i of ctx.live) { if (A.sick[i]) sick++; if (A.hunger[i]) hungry++; }
  let mood = 0; for (const i of ctx.live) mood += A.mood[i];
  w.stats.push({ d: day, live, shade, pyre, asph, exiled, sick, hungry, gini: Math.round(gini * 1000) / 1000, mood: Math.round(mood / Math.max(1, live)),
    prices: w.prices.map((p) => Math.round(p * 100) / 100), treasury: w.treasury, tax: w.taxPermille, unrest: (w.activePrev || []).reduce((a, b) => a + b, 0),
    fac: w.factions.map((f) => f.alive ? f.members : 0) });
  if (w.stats.length > 900) w.stats.splice(0, w.stats.length - 900);
}
function chk(ctx, where) { if (ctx.w.debug) invariant(ctx, where); }
function invariant(ctx, where = "end") {
  const { A, w } = ctx; let s = w.treasury; for (let i = 0; i < ctx.N; i++) s += A.obols[i];
  if (s !== w.m0 + w.minted - w.destroyed) throw new Error(`money leak on day ${ctx.day} after ${where}: ${s} vs ${w.m0 + w.minted - w.destroyed}`);
}
