// The Boule, each season (30 days): clout by franchise, D'Hondt seats, the minimal connected coalition, ADICO laws, the
// budget (Baron-Ferejohn), orators, bought and blackmailed votes, the watch posted to angry quarters, offices (and the bow
// contest), ostracism and schisms. Split out of systems.js; behaviour is identical.
import { BLOODS, DISTRICTS, D, J, ST, TH, OFFICES, SPLINTERS, SPLINTER_COLORS, COGNOMENS } from "./lore.js";
import { TIES } from "./world.js";
import { E, index, centroids, think, bio, setCognomen, isAdult, living, P, clamp, isqrt, idist, tieIndex, homeFaction } from "./systems.js";
import { remember } from "./culture.js";
import { hookVotes } from "./threads.js";
import { orators } from "./discord.js";
import { renown } from "./heroes.js";
import { bowContest } from "./voyage.js";

// ---------------------------------------------------------------- the Boule (each season = 30 days)
export function politics(ctx) {
  const { A, w, day } = ctx, r = ctx.r("politics");
  index(ctx); centroids(ctx);
  // political strength by franchise law (Victoria: wealth buys clout)
  const sorted = ctx.live.map((i) => A.obols[i]).sort((a, b) => a - b), top = sorted[Math.floor(sorted.length * 0.9)] || 0;
  w.factions.forEach((f) => (f.clout = 0));
  for (const i of ctx.live) {
    if (A.status[i] || !isAdult(A, i, day)) continue;
    const o = A.obols[i]; const s = w.franchise === "headcount" ? 4 : w.franchise === "property" ? 4 + isqrt(Math.max(0, o)) / 2 : (o >= top ? isqrt(o) : 0);
    w.factions[A.faction[i]].clout += s;
  }
  if (w.quest && w.factions[w.quest.faction]) w.factions[w.quest.faction].clout *= 1.15;   // the Fleece gives its holders a voice
  const voteWeight = (i) => { const o = A.obols[i]; return w.franchise === "headcount" ? 4 : w.franchise === "property" ? 4 + isqrt(Math.max(0, o)) / 2 : (o >= top ? isqrt(o) : 0); };
  hookVotes(ctx, voteWeight);
  for (const [v, fk] of w.bought || []) if (!A.status[v] && w.factions[fk] && w.factions[fk].alive && A.faction[v] !== fk) { const wt = voteWeight(v); w.factions[A.faction[v]].clout -= wt; w.factions[fk].clout += wt; }   // bought voices
  orators(ctx, r);
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
  const grown = (i) => !A.status[i] && isAdult(A, i, ctx.day), reapers = ctx.live.filter((i) => A.job[i] === J.reaper && grown(i)), priests = ctx.live.filter((i) => A.job[i] === J.priest && grown(i)), augurs = ctx.live.filter((i) => A.job[i] === J.augur && grown(i));
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
  postWatch(ctx, r);
  offices(ctx, proposer);
  ostracism(ctx);
  schisms(ctx, r);
}

function postWatch(ctx, r) {
  const { A, w } = ctx; if (!w.guardLevel) return;
  const act = w.activePrev || [], reap = DISTRICTS.map(() => []);
  for (const i of ctx.live) if (!A.status[i] && !A.jail[i] && A.job[i] === J.reaper && isAdult(A, i, ctx.day) && A.office[i] < 0) reap[A.district[i]].push(i);
  const need = DISTRICTS.map((x, d) => (act[d] || 0) / Math.max(1, reap[d].length));
  const hot = DISTRICTS.map((x, d) => d).filter((d) => (act[d] || 0) >= 40 && need[d] > 6).sort((a, b) => need[b] - need[a] || a - b);
  const cold = DISTRICTS.map((x, d) => d).filter((d) => reap[d].length > 20 && need[d] < 1).sort((a, b) => need[a] - need[b] || a - b);
  for (const h of hot.slice(0, 2)) {
    const src = cold.find((c) => reap[c].length > 20); if (src === undefined) break;
    const n = Math.min(Math.floor(reap[src].length / 4), Math.ceil((act[h] || 0) / 8)); if (n < 5) continue;
    for (let t = 0; t < n; t++) { const i = reap[src].splice(r.int(reap[src].length), 1)[0]; ctx.trip(i, src, h, "watch"); A.district[i] = h; reap[h].push(i); bio(ctx, i, E.watch, h); }
    ctx.log(E.watch, -1, -1, h, n, DISTRICTS[src].name);
  }
}
function offices(ctx, proposer) {
  const { A, w } = ctx;
  const contested = {}, rb = ctx.r("bow");
  const best = (key, pred, score) => { let b = -1, bv = -1e9, b2 = -1, v2 = -1e9, b3 = -1; for (const i of ctx.live) if (!A.jail[i] && !A.status[i] && !A.miasma[i] && isAdult(A, i, ctx.day) && pred(i)) { const v = score(i); if (v > bv) { b3 = b2; b2 = b; v2 = bv; bv = v; b = i; } else if (v > v2) { b3 = b2; b2 = i; v2 = v; } }
    if (b2 >= 0 && bv > 0 && v2 >= bv * 0.97 && (w.offices[key] === undefined || A.status[w.offices[key]] !== ST.living)) { const win = bowContest(ctx, [b, b2, b3].filter((x) => x >= 0), rb); contested[key] = [b, b2, b3].filter((x) => x >= 0 && x !== win); return win; }   // too close to call: the bow decides (Od. 21)
    return b; };
  const want = {
    tiphys: best("tiphys", (i) => A.faction[i] === proposer, (i) => isqrt(A.obols[i]) + P(A, i, 2) / 4 + A.tieVal.subarray(i * TIES, i * TIES + TIES).reduce((a, v) => a + Math.max(0, v), 0) / 20),
    lynceus: best("lynceus", (i) => A.sight[i] === w._digital, (i) => P(A, i, 4) + P(A, i, 5)),
    orpheus: best("orpheus", (i) => true, (i) => P(A, i, 2) + P(A, i, 5) - P(A, i, 1) / 2 + (i % 97) / 100),
    aethalides: best("aethalides", (i) => A.job[i] === J.reaper, (i) => P(A, i, 4) - P(A, i, 1) / 3),
    medea: best("medea", (i) => A.job[i] === J.herbalist, (i) => A.obols[i] + P(A, i, 5)),
    mopsus: best("mopsus", (i) => A.job[i] === J.augur, (i) => P(A, i, 5) + A.deaths[i] * 20),
    boread: best("boread", (i) => A.job[i] === J.reaper, (i) => 100 - P(A, i, 1) + P(A, i, 2) / 2),
    argus: best("argus", (i) => A.job[i] === J.weaver || A.job[i] === J.miner, (i) => A.obols[i]),
  };
  OFFICES.forEach((o, k) => {
    if (w.vacant && w.vacant[o.key] !== undefined) return;   // burned on the chain: the seat stays empty for ever
    const i = want[o.key], cur = w.offices[o.key];
    if (i < 0 || i === cur) return;
    if (cur !== undefined) A.office[cur] = -1;
    w.offices[o.key] = i; A.office[i] = k; renown(w, A, i, 20); if (contested[o.key]) ctx.log(E.contest, i, contested[o.key][0], D.agora, contested[o.key].length + 1, o.title); ctx.log(E.office, i, cur === undefined ? -1 : cur, A.district[i], k, o.title);
  });
}

function ostracism(ctx) {
  const { A, w, day } = ctx; const hate = new Int32Array(ctx.N);
  for (const i of ctx.live) for (let k = 0; k < TIES; k++) { const j = A.tieTo[i * TIES + k], v = A.tieVal[i * TIES + k]; if (j >= 0 && v < 0) hate[j] -= v; }
  let worst = -1, hv = 260; for (const i of ctx.live) if (hate[i] > hv) { hv = hate[i]; worst = i; }
  if (worst < 0) return;
  ctx.trip(worst, A.district[worst], D.agora, "exile"); A.status[worst] = ST.exiled; A.until[worst] = day + 60; A.district[worst] = D.agora; think(ctx, worst, TH.exiled);
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
    setCognomen(ctx, founder, 16); ctx.log(E.schism, founder, -1, A.district[founder], id, nm); remember(w, day, "schism", founder, 40, `the founding of ${nm.replace(/^the /, "")}`, A.faith[founder]);
  }
  // splinters with almost nobody left dissolve back into their blood
  w.factions.forEach((F, k) => { if (k < w.baseFactions || !F.alive) return; let n = 0; for (const i of ctx.live) if (A.faction[i] === k) n++;
    if (n < 5) { F.alive = false; for (let i = 0; i < ctx.N; i++) if (A.faction[i] === k) A.faction[i] = homeFaction(w, i); ctx.log(E.dissolve, -1, -1, -1, k, F.name); } });
}

