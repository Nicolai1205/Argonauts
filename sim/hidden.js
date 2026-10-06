// What Is Hidden: unwitnessed killings that open cases, belief that gathers on suspects (true or not), the Areopagus,
// secrets and blackmail, embezzling office-holders, reputation carried by gossip, and curse tablets in restless graves.
// Sources (docs/research/SIMULATIONS.md #9, #10, #22; MYTH.md §3.12): James Ryan's Talk of the Town (beliefs, evidence
// types, lies); Shadows of Doubt (witnesses by routine); Aeschylus' Eumenides (the Areopagus; Athena's vote acquits on a tie);
// CK3 secrets and hooks; Comme il Faut's social facts; Gager, Curse Tablets and Binding Spells (1992): "I bind X, his tongue,
// his hands, his work."
import { DISTRICTS, D, ST, TH, J } from "./lore.js";
import { TIES } from "./world.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
const tieOf = (A, i, j) => { for (let t = 0; t < TIES; t++) if (A.tieTo[i * TIES + t] === j) return A.tieVal[i * TIES + t]; return 0; };
export const fame = (A, i, n) => { if (i >= 0) A.fame[i] = Math.max(-100, Math.min(100, A.fame[i] + n)); };

export function initHidden(w) { w.cases = []; w.secrets = []; w.tablets = []; w.caseSeq = 0; }

/** a killing nobody saw: the killer is stained in secret, and the city opens a case */
export function openCase(ctx, v, k) {
  const { A, w, day } = ctx; if (w.cases.length >= 32) return;
  const d = A.district[k] < D.pyra ? A.district[k] : A.district[v] < D.pyra ? A.district[v] : D.agora, r = ctx.rr;
  const c = { id: ++w.caseSeq, v, k, day, d, sus: {}, open: true };
  // witnesses: a few who were out at night; some saw true, some saw who they already hated
  const pool = (ctx.byDist[d] || []).filter((i) => alive(A, i) && i !== k && i !== v && adult(A, i, day));
  for (let t = 0; t < 3 && pool.length; t++) {
    const x = pool[r.int(pool.length)];
    if (r.chance(0.35)) c.sus[k] = (c.sus[k] || 0) + 1;
    else { let hate = -1, hv = 0; for (let u = 0; u < TIES; u++) { const j = A.tieTo[x * TIES + u], tv = A.tieVal[x * TIES + u]; if (alive(A, j) && j !== v && tv < hv) { hv = tv; hate = j; } } if (hate >= 0) c.sus[hate] = (c.sus[hate] || 0) + 0.6; }
  }
  // the guilty lie, and point at someone of a distrusted faith
  if (P(A, k, 0) < 45 && pool.length) { const s = pool.filter((j) => A.faith[j] !== A.faith[k]); const g = s.length ? s[r.int(s.length)] : pool[r.int(pool.length)]; c.sus[g] = (c.sus[g] || 0) + 0.6; }
  if (!Object.keys(c.sus).length && pool.length) { const g = pool[r.int(pool.length)]; c.sus[g] = 0.3; }
  w.cases.push(c);
  w.secrets.push({ owner: k, kind: "blood", about: v, day, knowers: [], out: false });
  ctx.log(ctx.E.case, v, -1, d, c.id, "opened");
}

const top2 = (sus) => { const e = Object.entries(sus).map(([k, v]) => [Number(k), v]).sort((a, b) => b[1] - a[1] || a[0] - b[0]); return [e[0] || [-1, 0], e[1] || [-1, 0]]; };

export function hiddenDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("hidden"), E = ctx.E;

  // ---- cases: talk gathers belief on whoever is already suspected; sometimes the truth surfaces
  for (const c of w.cases.slice()) {
    if (!c.open) continue;
    for (const s of Object.keys(c.sus)) if (!alive(A, Number(s)) && A.status[Number(s)] !== ST.shade) delete c.sus[s];
    const ks = Object.keys(c.sus).map(Number); const tot = ks.reduce((a, k) => a + c.sus[k], 0);
    if (ks.length && tot > 0) { let u = r.next() * tot, pick = ks[0]; for (const k of ks) { u -= c.sus[k]; if (u <= 0) { pick = k; break; } } c.sus[pick] = Math.round((c.sus[pick] + 0.3 + (A.fame[pick] < -20 ? 0.15 : 0)) * 100) / 100; }
    if (r.chance(0.04)) c.sus[c.k] = Math.round(((c.sus[c.k] || 0) + 1) * 100) / 100;   // a bloodied cloak, a boast in drink
    for (const g of w.restless) if (g.i === c.v && g.named === day) c.sus[c.k] = (c.sus[c.k] || 0) + 3;   // the shade has spoken
    const [[s1, v1], [, v2]] = top2(c.sus), age = day - c.day;
    if (s1 >= 0 && alive(A, s1) && ((v1 >= 3 && v1 >= v2 * 2) || (age >= 30 && v1 >= 2))) trial(ctx, c, s1, r);
    else if (age > 90) { c.open = false; ctx.log(E.case, c.v, -1, c.d, c.id, "cold"); }
    // the victim's people will not wait for the court forever: they take vengeance on whom they believe
    if (c.open && age === 20 && s1 >= 0) { for (const p of [A.p1[c.v], A.p2[c.v], A.lover[c.v]]) if (alive(A, p) && !A.avenge[p] && adult(A, p, day) && P(A, p, 3) < 55) { A.avenge[p] = s1 + 1; ctx.log(E.vendetta, p, s1, A.district[p], 1, s1 === c.k ? "sworn" : "belief"); break; } }
  }
  w.cases = w.cases.filter((c) => c.open || day - c.day < 120);

  // ---- secrets: those who know talk to those they trust; the honest expose, the greedy blackmail
  if (day % 3 === 0) for (const s of w.secrets.slice()) {
    if (s.out || !alive(A, s.owner)) { if (day - s.day > 200) w.secrets.splice(w.secrets.indexOf(s), 1); continue; }
    if (s.knowers.length < 4 && r.chance(0.05)) { const pool = ctx.byDist[A.district[s.owner]] || []; const x = pool[r.int(pool.length)]; if (alive(A, x) && x !== s.owner && !s.knowers.includes(x)) s.knowers.push(x); }
    for (const x of s.knowers) {
      if (!alive(A, x)) continue;
      if (P(A, x, 0) > 65 && r.chance(0.04)) { expose(ctx, s, x); break; }
      if (P(A, x, 0) < 35 && r.chance(0.08) && A.obols[s.owner] > 40) {
        if (P(A, s.owner, 4) > 70 && r.chance(0.5)) { expose(ctx, s, x); break; }   // refused, and exposed for it
        const t = Math.floor(A.obols[s.owner] * 0.05); A.obols[s.owner] -= t; A.obols[x] += t; s.paid = (s.paid || 0) + t;
        if (!s.hook) { s.hook = x; ctx.log(E.secret, x, s.owner, A.district[x], t, "blackmail|" + s.kind); }
        ctx.tie(s.owner, x, -10);
      }
    }
  }
  // office-holders with light fingers take from the treasury; someone usually notices
  if (((day % 30) + 30) % 30 === 10) for (const k of Object.keys(w.offices || {}).sort()) {
    const i = w.offices[k]; if (!alive(A, i) || P(A, i, 0) > 35 || !r.chance(0.3)) continue;
    const t = Math.min(400, Math.floor(w.treasury * 0.005)); if (t <= 0) continue; w.treasury -= t; A.obols[i] += t;
    let s = w.secrets.find((x) => x.owner === i && x.kind === "theft" && !x.out); if (!s && w.secrets.length < 200) { s = { owner: i, kind: "theft", about: -1, day, knowers: [], out: false, sum: 0 }; w.secrets.push(s); }
    if (s) s.sum = (s.sum || 0) + t;
  }
  if (w.secrets.length > 200) w.secrets.splice(0, w.secrets.length - 200);

  // ---- curse tablets: the bitter write a name on lead and drop it in the grave of a restless child
  if (r.chance(0.08) && w.restless.length && w.tablets.length < 40) {
    const g = w.restless[r.int(w.restless.length)], pool = (ctx.byDist[g.d] || []).filter((i) => alive(A, i) && adult(A, i, day));
    for (let t = 0; t < 30 && pool.length; t++) {
      const x = pool[r.int(pool.length)]; let tgt = -1; for (let u = 0; u < TIES; u++) if (A.tieVal[x * TIES + u] < -70 && alive(A, A.tieTo[x * TIES + u])) { tgt = A.tieTo[x * TIES + u]; break; }
      if (tgt < 0) continue;
      const kind = ["tongue", "work", "love", "body"][r.int(4)];
      w.tablets.push({ by: x, target: tgt, day, d: g.d, kind, grave: g.i });
      if (kind === "body") A.sick[tgt] = Math.max(A.sick[tgt], 4); else if (kind === "love" && A.lover[tgt] >= 0) ctx.tie(tgt, A.lover[tgt], -40); else if (kind === "tongue") fame(A, tgt, -15); else A.stress[tgt] = Math.min(600, A.stress[tgt] + 100);
      ctx.trace(E.tablet, x, tgt, g.d); break;
    }
  }
  const lyn = w.offices && w.offices.lynceus;
  for (const tb of w.tablets.slice()) {
    if (A.cognomen[tb.target] === 13 && day - tb.day < 2) { w.tablets.splice(w.tablets.indexOf(tb), 1); ctx.log(E.tablet, tb.by, tb.target, tb.d, 0, "cut"); continue; }   // the Maker cut the knot
    if (alive(A, lyn) && r.chance(0.02)) { w.tablets.splice(w.tablets.indexOf(tb), 1); A.miasma[tb.by] = Math.min(9, A.miasma[tb.by] + 1); fame(A, tb.by, -25); ctx.tie(tb.target, tb.by, -40); ctx.log(E.tablet, tb.by, tb.target, tb.d, lyn, "found|" + tb.kind); continue; }
    if (day - tb.day > 120) w.tablets.splice(w.tablets.indexOf(tb), 1);
  }

  // ---- reputation fades toward nothing; deeds keep it alive
  if (day % 7 === 0) for (const i of ctx.live) if (A.fame[i]) A.fame[i] = A.fame[i] > 0 ? A.fame[i] - Math.max(1, A.fame[i] >> 4) : A.fame[i] + Math.max(1, (-A.fame[i]) >> 4);
  // deeds write reputation
  for (const e of ctx.ev) {
    if (e.h) continue;
    switch (e.t) {
      case "liturgy": if (e.s === "refused") fame(A, e.a, -20); else fame(A, e.a, 6); break;
      case "kinslayer": fame(A, e.a, -40); break;
      case "theoxenia": fame(A, e.b, e.s === "blessed" ? 15 : -15); break;
      case "supplication": if (e.s === "spared") fame(A, e.b, 12); else if (e.s === "altar") fame(A, e.b, -20); break;
      case "hunt": if ((e.s || "").startsWith("slain")) fame(A, e.a, 30); break;
      case "oath": if (e.s === "broken") fame(A, e.a, -20); break;
      case "robbery": fame(A, e.a, -6); break;
      case "games": if ((e.s || "").startsWith("held")) fame(A, e.a, 15); break;
    }
  }
}

function trial(ctx, c, accused, r) {
  const { A, w, day } = ctx, E = ctx.E;
  // twelve jurors from the Boule's factions; they weigh the talk, the accused's name, their faith and their friendships
  const [[, v1], [, v2]] = top2(c.sus), share = v1 / Math.max(0.1, v1 + v2);
  const pool = ctx.live.filter((i) => alive(A, i) && adult(A, i, day) && i !== accused && i !== c.k);
  let guilty = 0;
  for (let t = 0; t < 12 && pool.length; t++) {
    const j = pool[r.int(pool.length)];
    const p = 0.3 + 0.35 * share + (A.faith[j] !== A.faith[accused] ? 0.1 : 0) - (tieOf(A, j, accused) > 30 ? 0.3 : 0) - A.fame[accused] / 400 + (A.miasma[accused] ? 0.1 : 0);
    if (r.next() < p) guilty++;
  }
  c.open = false; c.accused = accused; c.votes = guilty;
  const truth = accused === c.k;
  if (guilty > 6) {   // a tie acquits: Athena's vote
    c.verdict = "guilty"; fame(A, accused, -30);
    const kin = [A.p1[c.v], A.p2[c.v], A.lover[c.v]].find((p) => alive(A, p)), price = A.kind[c.v] ? 120 : 60;
    if (kin !== undefined && A.obols[accused] >= price) { A.obols[accused] -= price; A.obols[kin] += price; }
    A.status[accused] = ST.exiled; A.until[accused] = day + 60; A.district[accused] = D.agora; ctx.think(accused, TH.exiled);
    if (!truth) w.secrets.push({ owner: c.k, kind: "framed", about: accused, day, knowers: [], out: false });
  } else c.verdict = guilty === 6 ? "tie" : "acquitted";
  ctx.log(E.trial, accused, c.v, c.d, guilty, c.verdict + "|" + (truth ? "true" : "false") + "|" + c.id);
}

function expose(ctx, s, by) {
  const { A, w, day } = ctx, E = ctx.E; s.out = true;
  fame(A, s.owner, -35); for (let t = 0; t < 12; t++) { const pool = ctx.byDist[A.district[s.owner]] || []; const j = pool[ctx.rr.int(pool.length)]; if (alive(A, j) && j !== s.owner) ctx.tie(j, s.owner, -20); }
  if (s.kind === "theft") { const back = Math.min(A.obols[s.owner], s.sum || 0); A.obols[s.owner] -= back; w.treasury += back; if (A.office[s.owner] >= 0) { delete w.offices[Object.keys(w.offices).find((k) => w.offices[k] === s.owner)]; A.office[s.owner] = -1; } }
  if (s.kind === "blood" || s.kind === "framed") { const c = w.cases.find((x) => x.k === s.owner && x.open); if (c) c.sus[s.owner] = (c.sus[s.owner] || 0) + 5; }
  ctx.log(E.secret, by, s.owner, A.district[s.owner], s.kind === "theft" ? s.sum || 0 : 0, "exposed|" + s.kind + "|" + (s.about >= 0 ? s.about : ""));
}
