// Statecraft and Ecology: bought votes, armies that march on their stomachs, loot, peace sworn as an oath; fish stocks that can
// be emptied, and prey that grows with the rain.
// Sources: [Xenophon] Ath. Pol. and Aristophanes on bribery in the assembly; Thucydides 1.11 (Troy took ten years because the
// Greeks had to farm for food); Il. 3.276-301 (a truce sworn over victims); WD on the sea's yield; Gordon (1954) and
// Ostrom on the commons (an open fishery is fished down).
import { DISTRICTS, D, ST, TH, J } from "./lore.js";
import { CITIES } from "./war.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
const SEA_D = ["agora", "reef", "drepane", "strand", "lemnos", "anthemoessa", "eridanus"].map((k) => D[k]);

export function initStatecraft(w) { w.fish = DISTRICTS.map(() => 1000); w.bought = []; w.treaties = []; }
/** fishing yields with the stock (1000 = a full sea) */
export const fishMult = (w, d) => (w.fish ? 0.35 + 0.65 * w.fish[d] / 1000 : 1);
/** an army fights on its stomach: the city's grain per head scales its power (0.7 to 1.1) */
export function supply(ctx, c) { const { A } = ctx; let n = 0, f = 0; for (const i of ctx.byDist[c] || []) if (!A.status[i]) { n++; f += A.inv[i * 5]; } return n ? Math.max(0.7, Math.min(1.1, 0.7 + (f / n) / 20)) : 1; }

export function statecraftDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("statecraft"), E = ctx.E, dm = ((day % 30) + 30) % 30;
  // ---- the sea: fishers take, the stock regrows logistically (an open commons is fished down)
  const catch_ = DISTRICTS.map(() => 0); for (const i of ctx.live) if (!A.status[i] && (A.job[i] === J.fisher || A.job[i] === J.pirate)) catch_[A.district[i]]++;
  for (const d of SEA_D) { const s = w.fish[d]; w.fish[d] = Math.max(50, Math.min(1000, Math.round(s + Math.max(20, s) * 0.08 * (1 - s / 1000) - catch_[d] * 0.025)));
    if (s >= 300 && w.fish[d] < 300) ctx.log(E.ecology, -1, -1, d, w.fish[d], "fished-out"); if (s < 600 && w.fish[d] >= 600) ctx.log(E.ecology, -1, -1, d, w.fish[d], "fish-back"); }
  // ---- prey follows the rain (read by the beasts)
  if (w.game && w.rain) for (let d = 0; d < w.game.length; d++) if (w.game[d] && w.rain[d] < 50) w.game[d] = Math.max(0, w.game[d] - 6);

  // ---- bought votes: the day before the Boule sits, the rich and shameless pay the poor of other bloods for their voice
  if (dm === 29) {
    w.bought = [];
    const buyers = ctx.live.filter((i) => alive(A, i) && adult(A, i, day) && A.obols[i] > 3000 && P(A, i, 0) < 30).sort((x, y) => A.obols[y] - A.obols[x] || x - y).slice(0, 6);
    let big = -1, bigN = 0;
    for (const b of buyers) {
      const pool = (ctx.byDist[A.district[b]] || []).filter((i) => alive(A, i) && adult(A, i, day) && A.faction[i] !== A.faction[b] && A.obols[i] < 60); let n = 0;
      for (let t = 0; t < 60 && pool.length && A.obols[b] > 200; t++) { const v = pool[r.int(pool.length)]; A.obols[b] -= 3; A.obols[v] += 3; w.bought.push([v, A.faction[b]]); n++; }
      if (n < 20) continue;
      const lyn = w.offices && w.offices.lynceus;
      if (alive(A, lyn) && r.chance(0.25)) { A.fame[b] = Math.max(-100, A.fame[b] - 30); const f = w.factions[A.faction[b]]; f.legit = Math.max(0, f.legit - 5); w.bought = w.bought.filter(([, fk]) => fk !== A.faction[b]); ctx.log(E.bribe, b, lyn, A.district[b], n, "caught"); }
      else if (n > bigN) { bigN = n; big = b; }
    }
    if (big >= 0 && r.chance(0.5)) ctx.log(E.bribe, big, -1, A.district[big], bigN, "bought");   // the month's biggest purse, sometimes noticed
  }
  // ---- treaties sworn as oaths: when a war ends, the two cities' first citizens swear peace for a year
  for (const e of ctx.ev) {
    if (e.h || e.t !== "peace") continue;
    const war = (w.war.history || [])[0]; if (!war || war.to !== day) continue;
    const first = (c) => { let b = -1, bv = -1; for (const i of ctx.byDist[c] || []) if (alive(A, i) && adult(A, i, day) && (A.office[i] >= 0 ? 1e6 : 0) + A.obols[i] > bv) { bv = (A.office[i] >= 0 ? 1e6 : 0) + A.obols[i]; b = i; } return b; };
    const sa = first(war.a), sb = first(war.b); if (sa < 0 || sb < 0) continue;
    w.treaties.push({ a: war.a, b: war.b, sa, sb, until: day + 360 }); if (w.treaties.length > 20) w.treaties.shift();
    ctx.log(E.treaty, sa, sb, war.a, 0, "sworn");
  }
  for (const e of ctx.ev) {
    if (e.h || e.t !== "war") continue;
    const ws = w.war.wars[w.war.wars.length - 1]; if (!ws || ws.since !== day) continue;
    const t = w.treaties.find((x) => day < x.until && ((x.a === ws.a && x.b === ws.b) || (x.a === ws.b && x.b === ws.a)));
    if (!t) continue; const breaker = ws.a === t.a ? t.sa : t.sb; w.treaties.splice(w.treaties.indexOf(t), 1);
    if (alive(A, breaker)) { ctx.swear(breaker, ws.a === t.a ? t.sb : t.sa, "peace", 0); ctx.oathEnds(breaker, "peace", false); }
    ctx.log(E.treaty, breaker, ws.a === t.a ? t.sb : t.sa, ws.a, 0, "broken");
  }
  w.treaties = w.treaties.filter((t) => t.until > day);
}

/** loot: after a battle, the winners strip the field (a share of the losing levy's purses, hand to hand) */
export function loot(ctx, win, lose, r) {
  const { A } = ctx, losers = (ctx.byDist[lose] || []).filter((i) => !A.status[i] && adult(A, i, ctx.day)), winners = (ctx.byDist[win] || []).filter((i) => !A.status[i] && adult(A, i, ctx.day));
  if (!losers.length || !winners.length) return 0; let pot = 0;
  for (let t = 0; t < 30; t++) { const i = losers[r.int(losers.length)], q = Math.floor(A.obols[i] * 0.05); A.obols[i] -= q; pot += q; }
  const each = Math.floor(pot / 10); for (let t = 0; t < 10; t++) A.obols[winners[r.int(winners.length)]] += each; ctx.w.treasury += pot - each * 10; return pot;
}
