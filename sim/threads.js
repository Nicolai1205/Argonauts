// Songs, Threads and Hooks: the Orpheus' songs as things in the world, blackmail that moves votes, intents in encounters,
// cadet houses that split from great ones, and movements of the disappointed when the age turns hard.
// Sources (docs/research/SIMULATIONS.md #9, #13, #17, #20, #25; MYTH.md §5): Dwarf Fortress poetic forms (sung events
// remembered longer); Archilochus' iambic blame; CK3 hooks and cadet branches; Comme il Faut's social exchanges (McCoy et al.);
// Turchin and Victoria 3 movements (petition, agitation, revolt).
import { DISTRICTS, D, ST, TH } from "./lore.js";
import { TIES } from "./world.js";
import { nameOf } from "./narrate.js";

const YEAR = 12, adult = (A, i, day) => !A.kind[i] || day - A.born[i] >= 14 * YEAR;
const alive = (A, i) => i >= 0 && A.status[i] === ST.living;
const P = (A, i, k) => A.pers[i * 6 + k];
const FORMS = { burn: "lament", lemnian: "lament", riot: "blame", war: "praise", prophet: "hymn", plague: "lament" };

export function initThreads(w) { w.songs = []; w.movements = []; w.cadets = []; }

export function threadsDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("threads"), E = ctx.E, dm = ((day % 30) + 30) % 30;
  const orph = w.offices && w.offices.orpheus, singer = alive(A, orph) ? orph : -1;

  // ---- songs: each week the Orpheus (or a wandering singer) puts the city's heaviest memory into verse; sung, it lasts
  if (((day % 7) + 7) % 7 === 3 && (w.memory || []).length) {
    let s = singer; if (s < 0) { for (let t = 0; t < 50; t++) { const i = ctx.live[r.int(ctx.live.length)]; if (alive(A, i) && adult(A, i, day) && P(A, i, 2) + P(A, i, 5) > 130) { s = i; break; } } }
    const fresh = w.memory.filter((m) => !m.sung && day - m.day < 120).sort((a, b) => b.s0 - a.s0 || a.day - b.day)[0];
    if (s >= 0 && fresh) {
      fresh.sung = (fresh.sung || 0) + 1; fresh.s0 = Math.round(fresh.s0 * 1.3);
      const form = FORMS[fresh.kind] || "praise";
      w.songs.push({ day, by: s, about: fresh.name, form }); if (w.songs.length > 60) w.songs.shift();
      ctx.log(E.song, s, fresh.who, A.district[s], fresh.sung, form + "|" + fresh.name);
    }
  }
  // praise for the slayers of beasts and the winners of games: renown that travels
  for (const e of ctx.ev) if (!e.h && ((e.t === "hunt" && (e.s || "").startsWith("slain")) || (e.t === "games" && (e.s || "").startsWith("held"))) && e.a >= 0 && singer >= 0) { ctx.renown(e.a, 20); A.fame[e.a] = Math.min(100, A.fame[e.a] + 5); }
  // blame-song (Archilochus): once a month the singer turns on the worst-named office-holder
  if (dm === 12 && singer >= 0) {
    let tgt = -1, lo = 1e9; for (const k of Object.keys(w.offices || {}).sort()) { const i = w.offices[k]; if (alive(A, i) && i !== singer && A.fame[i] < lo) { lo = A.fame[i]; tgt = i; } }
    if (tgt >= 0 && lo < 10) { A.fame[tgt] = Math.max(-100, A.fame[tgt] - 15); A.stress[tgt] = Math.min(600, A.stress[tgt] + 80); const f = w.factions[A.faction[tgt]]; f.legit = Math.max(0, f.legit - 3); ctx.tie(tgt, singer, -30); ctx.log(E.song, singer, tgt, A.district[singer], 0, "blame|"); }
  }

  // ---- cadet houses: a famous, restless Leaf of a great house founds a branch of its own (CK3)
  if (dm === 22) {
    const size = new Map(); for (let c = 9999; c < w.N; c++) if (alive(A, c) && adult(A, c, day)) size.set(A.lineage[c], (size.get(A.lineage[c]) || 0) + 1);
    const great = [...size.entries()].filter(([L, n]) => n >= 4 || (w.houses[L] && w.houses[L].r >= 120)).map(([L]) => L).sort((a, b) => a - b);
    for (const L of great) {
    const h = w.houses[L] || (w.houses[L] = { r: 50, legacies: [] }); if (h.cadetOf !== undefined || !r.chance(0.1)) continue;
    const founder = Number(L); let head = -1;
    for (let c = 9999; c < w.N; c++) if (A.lineage[c] === founder && alive(A, c) && adult(A, c, day) && (A.fame[c] > 0 || A.office[c] >= 0 || A.obols[c] > 500) && (A.radical[c] > 35 || A.faith[c] !== A.faith[founder] || A.avenge[c])) { head = c; break; }
    if (head < 0) continue;
    // the head and every living descendant take the head as the root of their line
    const line = new Set([head]); let moved = 1;
    for (let c = head + 1; c < w.N; c++) if (A.kind[c] && (line.has(A.p1[c]) || line.has(A.p2[c]))) { line.add(c); if (alive(A, c)) moved++; }
    for (const c of line) A.lineage[c] = head;
    w.houses[head] = { r: Math.round(h.r / 4), legacies: [], cadetOf: founder }; h.r = Math.round(h.r * 0.85);
    const key = Math.min(founder, head) + ":" + Math.max(founder, head); w.feuds[key] = w.feuds[key] || { a: founder, b: head, n: 0, since: day, last: day, paid: 0 };
    w.cadets.push({ day, head, from: founder }); if (w.cadets.length > 40) w.cadets.shift();
    ctx.log(E.cadet, head, founder, A.district[head], moved, `the house of ${nameOf(head + 1)}`);
  }
  }

  // ---- movements: when the age is hard, the would-be great gather the hungry behind a demand
  const hard = w.psi && (w.psi.phase === "crisis" || w.psi.phase === "stagflation" || w.psi.phase === "depression");
  if (dm === 5 && hard && w.movements.length < 3) {
    const demands = [["dole", "bread from the treasury for every hungry house", () => w.grainDole], ["franchise", "one Minyan, one vote", () => w.franchise === "headcount"], ["guards", "the Reapers off the streets", () => w.guardLevel === 0]];
    const open = demands.filter(([k, , met]) => !met() && !w.movements.some((m) => m.k === k));
    if (open.length) {
      let lead = -1, best = -1; for (let t = 0; t < 300; t++) { const i = ctx.live[r.int(ctx.live.length)]; if (!alive(A, i) || !adult(A, i, day) || !A.kind[i]) continue; const v = A.obols[i] / 50 + P(A, i, 2) + A.radical[i]; if (v > best) { best = v; lead = i; } }
      if (lead >= 0) { const [k, what] = open[r.int(open.length)]; w.movements.push({ k, what, lead, day, stage: 0, n: 0 }); ctx.log(E.movement, lead, -1, A.district[lead], 0, "petition|" + what); }
    }
  }
  for (const m of w.movements.slice()) {
    const done = { dole: () => w.grainDole, franchise: () => w.franchise === "headcount", guards: () => w.guardLevel === 0 }[m.k];
    if (done()) { w.movements.splice(w.movements.indexOf(m), 1); ctx.log(E.movement, m.lead, -1, D.agora, m.n, "won|" + m.what); if (alive(A, m.lead)) { ctx.renown(m.lead, 60); A.fame[m.lead] = Math.min(100, A.fame[m.lead] + 20); } continue; }
    if (!alive(A, m.lead) || day - m.day > 120) { w.movements.splice(w.movements.indexOf(m), 1); ctx.log(E.movement, m.lead, -1, D.agora, m.n, "faded|" + m.what); continue; }
    if (dm !== 6) continue;
    const d = A.district[m.lead], pool = (ctx.byDist[d] || []).filter((i) => alive(A, i) && adult(A, i, day) && (A.hunger[i] || A.radical[i] > 30));
    m.n = pool.length;
    if (m.stage === 0 && m.n > 40) { m.stage = 1; for (const i of pool) A.radical[i] = Math.min(100, A.radical[i] + 5); for (const k of w.boule.coalition) w.factions[k].legit = Math.max(0, w.factions[k].legit - 4); ctx.log(E.movement, m.lead, -1, d, m.n, "agitation|" + m.what); }
    else if (m.stage === 1 && m.n > 80) { m.stage = 2; for (const i of pool) A.radical[i] = Math.min(100, A.radical[i] + 20); if (w.riotCool) w.riotCool[d] = 0; ctx.log(E.movement, m.lead, -1, d, m.n, "rising|" + m.what); }
  }
}

/** blackmail moves votes: a hooked citizen's voice counts for the faction of the one who holds the hook */
export function hookVotes(ctx, weight) {
  const { A, w } = ctx; let moved = 0, office = -1;
  for (const s of w.secrets || []) {
    if (s.out || s.hook === undefined || !alive(A, s.owner) || !alive(A, s.hook) || A.faction[s.owner] === A.faction[s.hook]) continue;
    const v = weight(s.owner); w.factions[A.faction[s.owner]].clout -= v; w.factions[A.faction[s.hook]].clout += v; moved++;
    if (A.office[s.owner] >= 0 && office < 0) office = s.owner;
  }
  if (office >= 0) { const s = w.secrets.find((x) => x.owner === office && x.hook !== undefined); ctx.log(ctx.E.hook, office, s.hook, D.agora, moved, w.factions[A.faction[s.hook]].name); }
}

/** what someone means to do in an encounter (Comme il Faut, cut down): returns a score adjustment and applies small effects */
export function intent(ctx, i, j, r) {
  const A = ctx.A, day = ctx.day; let tij = 0; for (let t = 0; t < TIES; t++) if (A.tieTo[i * TIES + t] === j) { tij = A.tieVal[i * TIES + t]; break; }
  const u = r.next();
  if (tij > 40 && A.lover[i] < 0 && A.lover[j] < 0 && adult(A, i, day) && adult(A, j, day) && u < 0.35) return 6;                  // flirt
  if (P(A, i, 2) > 70 && u < 0.3) { A.fame[i] = Math.min(100, A.fame[i] + 1); return -3; }                                           // boast
  if (tij > 60 && u < 0.25 && ctx.w.secrets) { const s = ctx.w.secrets.find((x) => !x.out && x.knowers.includes(i) && x.owner !== j && x.knowers.length < 4 && !x.knowers.includes(j)); if (s) s.knowers.push(j); return 4; }   // confide
  if (A.devotion[i] > 60 && A.faith[i] !== A.faith[j] && u < 0.3) return 2;                                                           // preach
  if (tij < -20 && P(A, i, 3) < 40 && u < 0.4) return -15;                                                                             // pick a fight
  return 0;
}
