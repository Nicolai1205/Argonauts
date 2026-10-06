// Faith, calendar, memory, festivals and monuments: the slow layer of the world.
import { DISTRICTS, D, BEAM } from "./lore.js";
import { hash32 } from "./rng.js";

// ------------------------------------------------------------------ calendar: 360 days, 12 months named for the voyage
export const MONTHS = ["Pagasaion", "Lemnion", "Kyzikion", "Bebrykion", "Phineion", "Symplegadion", "Anthesterion", "Aretion", "Kolchion", "Drakonion", "Aiaion", "Iolkion"];
export const yearOf = (day) => (day < 0 ? 0 : Math.floor(day / 360) + 1);
export function dateOf(day) { if (day < 0) return `the Sowing, ${360 + day} days in`; const d = day % 360; return `${(d % 30) + 1} ${MONTHS[Math.floor(d / 30)]}, Year ${yearOf(day)}`; }

// ------------------------------------------------------------------ faiths
export const DEITIES = {
  burn: { god: "Pyrphoros, the Fire that Unmakes", people: "the Pyrphoroi", color: "#ff7a1a", cost: 0.7, zeal: 1.3 },
  plague: { god: "the Mother of Snakes", people: "the Ophites", color: "#6fbf73", cost: 0.4, zeal: 1.1 },
  famine: { god: "the Hungry Mouth", people: "the Peinontes", color: "#c9a227", cost: 0.2, zeal: 1.2 },
  sirens: { god: "the Singing Meadow", people: "the Seirenids", color: "#d98ad1", cost: 0.5, zeal: 1.0 },
  lemnian: { god: "the Knife at Night", people: "the Lemnian Mystery", color: "#8b1e2e", cost: 0.9, zeal: 0.8 },
  riot: { god: "the Stone Among Us", people: "the Lithoboloi", color: "#9aa0a8", cost: 0.3, zeal: 1.4 },
  beam: { god: "the Oak of Dodona", people: "the Dodonaioi", color: "#7fb069", cost: 0.5, zeal: 1.0 },
  ruling: { god: "the Maker", people: "the Poietai", color: "#e9e1cf", cost: 0.6, zeal: 1.1 },
  doliones: { god: "the Dark that Blinds Friends", people: "the Skotioi", color: "#3d4a6b", cost: 0.4, zeal: 0.9 },
};
// sects that can break from the old cult (real Greek mystery religions), and adjectives for splinters of new faiths
const OLD_SECTS = [["the Orphics", "Orpheus who went down and came back", "#b48ad6"], ["the Eleusinians", "the Two Goddesses of the hidden grain", "#d6b25e"], ["the Kabeiroi", "the smith-gods of Lemnos", "#a0522d"],
  ["the Hecateans", "Hecate of the crossroads", "#5b4a7a"], ["the Heliads", "Helios who sees all", "#ffd166"], ["the Dionysiacs", "the god who comes from outside", "#9b2d5c"], ["the Samothracians", "the Great Gods of the island", "#4a7a8c"]];
const SPLIT = ["Hidden", "True", "Ash", "Night", "Northern", "Second", "Barefoot", "Silent", "Burning", "Bone"];
export function initCulture(w) {
  w.faiths = [{ id: 0, name: "the Olympians", god: "the Twelve of Olympus", color: "#c8d0dc", founder: -1, born: -99999, alive: true, doctrine: [10, 10, 60], cost: 0.1, zeal: 0.6, origin: "old", members: 0, temple: D.agora, parent: -1 }];
  const A = w.A; for (let i = 0; i < w.N; i++) { A.faith[i] = 0; A.devotion[i] = Math.max(5, Math.min(100, 40 + A.ideo[i * 3 + 2] / 2)); }
  w.memory = []; w.monuments = []; w.lastProphet = -99999; w.festivals = [];
}

/** a catastrophe may raise a prophet: called by the engine with the day's events */
export function prophets(ctx, events, kill) {
  const { A, w, day } = ctx, r = ctx.r("prophets");
  if (day - w.lastProphet < 20 || w.faiths.filter((f) => f.alive).length >= 12) return;
  for (const e of events) {
    const kind = e.t === "death" ? null : e.t === "riot" ? "riot" : e.t === "plague" ? "plague" : e.t === "famine" ? "famine" : e.t === "sirens" ? "sirens" : e.t === "lemnian" ? "lemnian" : e.t === "burn" ? "burn" : e.t === "beam" ? "beam" : e.t === "ruling" ? "ruling" : e.t === "doliones" ? "doliones" : null;
    if (!kind || w.faiths.some((f) => f.alive && f.origin === kind) || !r.chance(kind === "burn" || kind === "ruling" ? 0.6 : 0.25)) continue;
    // the prophet: a shaken, open, well-connected adult near the catastrophe (for a burn: the one who loved the burned most)
    let near = e.x >= 0 ? ctx.byDist[e.x] : ctx.live;
    if ((kind === "burn" || kind === "ruling") && e.a >= 0) { const t = []; for (let k = 0; k < 8; k++) { const j = A.tieTo[e.a * 8 + k]; if (j >= 0 && !A.status[j]) t.push(j); } if (t.length) near = t; }
    let best = -1, bv = -1e9;
    for (const i of near) { if (A.status[i] || A.cognomen[i] === 18 || (A.kind[i] && day - A.born[i] < 20 * 12)) continue; const v = A.stress[i] / 4 + A.pers[i * 6 + 5] + (100 - A.pers[i * 6 + 4]) / 2 + (A.cognomen[i] ? 20 : 0) + (hash32(i, day) % 30); if (v > bv) { bv = v; best = i; } }
    if (best < 0) continue;
    const De = DEITIES[kind], id = w.faiths.length, again = w.faiths.some((f) => f.origin === kind);
    w.faiths.push({ id, name: again ? De.people.replace(/^the /, "the New ") : De.people, god: De.god, color: De.color, founder: best, born: day, alive: true, doctrine: [0, 1, 2].map((x) => A.ideo[best * 3 + x]), cost: De.cost, zeal: De.zeal, origin: kind, members: 1, temple: A.district[best], parent: -1, event: e.t });
    A.faith[best] = id; A.devotion[best] = 100; A.cognomen[best] = 18; w.lastProphet = day;
    // the first congregation: the prophet's bonds and the most shaken souls nearby
    let flock = 0;
    for (let k = 0; k < 8; k++) { const j = A.tieTo[best * 8 + k]; if (j >= 0 && !A.status[j] && A.tieVal[best * 8 + k] > 20 && r.chance(0.6)) { A.faith[j] = id; A.devotion[j] = 70; flock++; } }
    const pool = ctx.byDist[A.district[best]].filter((i) => !A.status[i] && A.stress[i] > 200).slice(0, 40);
    for (const i of pool) if (r.chance(0.5)) { A.faith[i] = id; A.devotion[i] = 55; flock++; }
    ctx.log(ctx.E.prophet, best, e.a, A.district[best], id, De.people + "|" + De.god);
    if (ctx.forgeRelic) ctx.forgeRelic(`the first tooth of ${De.god}`, "sacred", best, "given in the vision");
    remember(w, day, "prophet", best, 70, `the calling of ${De.people}`, id);
    return;
  }
}

/** conversion between two Minyans who just spoke warmly (Stark: faith travels along ties) */
export function convert(ctx, i, j, warm) {
  const { A, w } = ctx; const fi = A.faith[i], fj = A.faith[j];
  if (!warm || fi === fj) return;
  const F = w.faiths[fj]; if (!F.alive) return;
  const insecure = Math.min(1, A.stress[i] / 400 + (A.hunger[i] ? 0.3 : 0) + (A.mood[i] < -20 ? 0.3 : 0));
  let dd = 0; for (let k = 0; k < 3; k++) dd += Math.abs(A.ideo[i * 3 + k] - F.doctrine[k]);
  const p = 0.16 * F.zeal * (A.devotion[j] / 100) * (1 - A.devotion[i] / 140) * (0.4 + insecure) * Math.max(0.1, 1 - dd / 300);
  if (ctx.rr.next() < p) {
    A.faith[i] = fj; A.devotion[i] = 35;
    if ((i < 9999 && A.office[i] >= 0) || ctx.rr.chance(0.002)) ctx.log(ctx.E.convert, i, j, A.district[i], fj, F.name); else ctx.trace(ctx.E.convert, i, j, A.district[i]);
  }
}

/** daily: devotion, ritual cost (Sosis), apostasy; weekly: doctrine drift, schism, temples, dead faiths */
export function faithDaily(ctx) {
  const { A, w, day } = ctx, r = ctx.r("faith"), cnt = new Int32Array(w.faiths.length), dsum = w.faiths.map(() => [0, 0, 0]), where = w.faiths.map(() => new Int32Array(DISTRICTS.length));
  for (const i of ctx.live) {
    if (A.status[i]) continue;
    const f = A.faith[i], F = w.faiths[f]; if (!F.alive) { A.faith[i] = 0; continue; }
    cnt[f]++; where[f][A.district[i]]++; for (let k = 0; k < 3; k++) dsum[f][k] += A.ideo[i * 3 + k];
    // ritual: the costly faiths take time and coin, and give back devotion and solidarity
    if (f > 0 && r.chance(F.cost * 0.2)) { if (A.obols[i] > 2) { A.obols[i]--; w.treasury++; } A.devotion[i] = Math.min(100, A.devotion[i] + 3); }
    else { const dd = (A.stress[i] > 250 ? 0.4 : 0) - (f > 0 ? 0.25 : 0.1); if (r.next() < Math.abs(dd)) A.devotion[i] = Math.max(0, Math.min(100, A.devotion[i] + (dd > 0 ? 1 : -1))); }
    // apostasy: the comfortable and the lukewarm drift back to the old gods (high-cost faiths hold their own better)
    if (f > 0 && A.devotion[i] < 12 && A.mood[i] > 10 && r.chance(0.02 * (1 - F.cost * 0.8))) { A.faith[i] = 0; A.devotion[i] = 30; }
  }
  w.faiths.forEach((F, k) => { F.members = cnt[k]; });
  if (day % 7) return;
  w.faiths.forEach((F, k) => {
    if (!F.alive) return;
    if (k > 0 && cnt[k] === 0 && day - F.born > 10) { F.alive = false; ctx.log(ctx.E.faithdies, -1, -1, -1, k, F.name); return; }
    if (cnt[k]) for (let x = 0; x < 3; x++) F.doctrine[x] = Math.round(F.doctrine[x] * 0.9 + (dsum[k][x] / cnt[k]) * 0.1);
    let best = 0; for (let d = 1; d < DISTRICTS.length; d++) if (where[k][d] > where[k][best]) best = d;
    if (k > 0 && cnt[k] >= 80 && !F.templeBuilt) { F.templeBuilt = day; F.temple = best; ctx.log(ctx.E.temple, F.founder, -1, best, k, F.name); remember(w, day, "temple", F.founder, 45, `the raising of the temple of ${F.god}`, k); }
    // schism: a cluster that has drifted far from the doctrine breaks away under a charismatic voice
    const alive = w.faiths.filter((f) => f.alive).length;
    if (cnt[k] >= 300 && day - F.born > 60 && alive < 10 && r.chance(k === 0 ? 0.05 : 0.08)) {
      // the dissenters: devout members far from the doctrine on order or the gods (a high bar for the diffuse old cult)
      const far = ctx.live.filter((i) => !A.status[i] && A.faith[i] === k && A.devotion[i] > (k === 0 ? 55 : 30) && Math.abs(A.ideo[i * 3 + 2] - F.doctrine[2]) + Math.abs(A.ideo[i * 3] - F.doctrine[0]) > (k === 0 ? 120 : 90));
      if (far.length >= 60) {
        const lead = far.reduce((b, i) => (A.pers[i * 6 + 2] + A.devotion[i] > A.pers[b * 6 + 2] + A.devotion[b] ? i : b), far[0]), id = w.faiths.length;
        let nm, god = F.god, color = shade(F.color);
        if (k === 0) { const used = new Set(w.faiths.map((f) => f.name)), sct = OLD_SECTS.find((x) => !used.has(x[0])); if (!sct) return; [nm, god, color] = sct; }
        else { const adj = SPLIT[hash32(id, day) % SPLIT.length]; nm = `the ${adj} ${F.name.replace(/^the /, "")}`; }
        w.faiths.push({ ...F, id, name: nm, god, founder: lead, born: day, doctrine: [0, 1, 2].map((x) => A.ideo[lead * 3 + x]), members: far.length, parent: k, templeBuilt: 0, color, origin: F.origin + ":" + id });
        for (const i of far) A.faith[i] = id; A.cognomen[lead] = 18;
        ctx.log(ctx.E.faithschism, lead, F.founder, A.district[lead], id, `${nm}|${F.name}`); remember(w, day, "schism", lead, 50, `the breaking of ${F.name}`, id);
      }
    }
  });
}
const shade = (hex) => "#" + [1, 3, 5].map((p) => Math.min(255, Math.max(0, parseInt(hex.slice(p, p + 2), 16) + 40 - (parseInt(hex.slice(p, p + 2), 16) > 200 ? 80 : 0))).toString(16).padStart(2, "0")).join("");

// ------------------------------------------------------------------ memory, anniversaries, festivals, monuments
/** salience decays in two stages (fast communicative memory, slow cultural memory: Candia et al. 2019) */
export function remember(w, day, kind, who, salience, name, owner = -1) { w.memory.push({ day, kind, who, s0: salience, name, owner }); if (w.memory.length > 400) w.memory.sort((a, b) => sal(b, day) - sal(a, day)).length = 300; }
const sal = (m, day) => { const t = day - m.day; let a = 1; for (let k = 0; k < Math.min(400, t); k += 30) a *= k < 90 ? 0.7 : 0.97; return m.s0 * a; };
export function festivals(ctx) {
  const { A, w, day } = ctx, r = ctx.r("festival"), dy = ((day % 360) + 360) % 360;
  const feast = (name, kind, dist, moodTh, cost) => {
    let n = 0; for (const i of ctx.live) { if (A.status[i] || (dist >= 0 && A.district[i] !== dist)) continue; if (A.inv[i * 5] > 6 + cost) { A.inv[i * 5] -= cost; n++; } ctx.think(i, moodTh); }
    w.festivals.unshift({ day, name, kind, n }); w.festivals = w.festivals.slice(0, 60); ctx.log(ctx.E.festival, -1, -1, dist, n, name);
  };
  if (day >= 0 && dy === 0) feast(`the Pagasaia of Year ${yearOf(day)}`, "newyear", -1, ctx.TH.feasted, 2);
  if (day >= 0 && dy === 190) {   // 11 Anthesterion: the dead walk for three days; the broken and the buried are remembered
    feast("the Anthesteria: the dead walk the city", "anthesteria", -1, ctx.TH.haunted, 1);
    for (const i of ctx.live) if (!A.status[i] && A.faith[i] === 0) A.devotion[i] = Math.min(100, A.devotion[i] + 5);
  }
  if (day >= 0 && dy === 255) feast("the Games of Kolchis, for the harvest", "harvest", -1, ctx.TH.feasted, 1);
  // anniversaries: a memory still strong a year later becomes a festival kept by its owner
  for (const m of w.memory) {
    if (m.kept === day || day - m.day < 360 || ((day - m.day) % 360) !== 0) continue;
    const s = sal(m, day); if (s < 12) continue;
    const years = (day - m.day) / 360, nm = `the ${["", "first", "second", "third", "fourth", "fifth"][years] || years + "th"} remembrance of ${m.name}`;
    feast(nm, "anniversary", m.who >= 0 ? A.district[m.who] : -1, ctx.TH.awe_at_an_omen, 1); m.kept = day; m.s0 *= 1.6;   // keeping a festival keeps the memory
    // a great memory and a rich treasury raise a monument
    if (s > 20 && w.treasury > 3000 && !w.monuments.some((x) => x.mem === m.day + ":" + m.name)) {
      const dist = m.who >= 0 && A.district[m.who] < DISTRICTS.length ? A.district[m.who] : D.agora; w.treasury -= 1500; w.destroyed += 1500;
      w.monuments.push({ name: `the Stele of ${m.name.replace(/^the /, "")}`, district: dist, day, mem: m.day + ":" + m.name, owner: m.owner, standing: true, seed: hash32(m.name, day) });
      ctx.log(ctx.E.monument, m.who, -1, dist, w.monuments.length - 1, `the Stele of ${m.name.replace(/^the /, "")}`);
    }
  }
}
/** rioters of another faith may tear down a monument in their district */
export function iconoclasm(ctx, district, leader) {
  const { A, w } = ctx;
  for (const m of w.monuments) {
    if (!m.standing || m.district !== district) continue;
    if (m.owner >= 0 && A.faith[leader] !== m.owner && ctx.rr.chance(0.35)) { m.standing = false; m.fell = ctx.day; ctx.log(ctx.E.iconoclasm, leader, -1, district, 0, m.name); remember(w, ctx.day, "iconoclasm", leader, 40, `the toppling of ${m.name.replace(/^the /, "")}`, A.faith[leader]); }
  }
}
export { BEAM };
