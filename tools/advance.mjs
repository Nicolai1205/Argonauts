// Advance the world to the current hour (1 real hour = 1 sim day) and write the published world files:
//   world/state.json.gz   checkpoint (whole world)            world/meta.json   day, hash, summary for the page
//   world/chronicle/c<k>.json  narrated events, 30 days per chunk     world/omens.json  chain omens after the seed (with applied day)
// Usage: node tools/advance.mjs [worldDir] [--until=<day>]
import fs from "node:fs";
import zlib from "node:zlib";
import { createWorld, serialize, deserialize, stateHash, runUntil, omensByDay, dayNow, dayOfTs, GENESIS, PREHISTORY_DAYS } from "../sim/engine.js";
import { VERSION } from "../sim/world.js";
import { narrate, nameOf, displayName, VOICE } from "../sim/narrate.js";
import { homeFaction } from "../sim/systems.js";
import { sift, emptySift } from "../sim/sift.js";
import { BLOODS, DISTRICTS, COGNOMENS, OFFICES, ST } from "../sim/lore.js";

const W = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "world";
const untilArg = process.argv.find((a) => a.startsWith("--until="));
const seed = JSON.parse(fs.readFileSync("data/seed.json")), hist = JSON.parse(fs.readFileSync("data/history.json"));
fs.mkdirSync(`${W}/chronicle`, { recursive: true });
const stateFile = `${W}/state.json.gz`, omensFile = `${W}/omens.json`;
// read the checkpoint's rules version before decoding it: older layouts cannot be decoded by newer code
const raw = fs.existsSync(stateFile) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(stateFile)).toString()) : null;
let w = raw && raw.version === VERSION ? deserialize(raw, seed) : null;
if (raw && raw.version !== VERSION) { console.log(`rules changed (v${raw.version} -> v${VERSION}): the world is re-dreamed from genesis`); fs.rmSync(`${W}/chronicle`, { recursive: true, force: true }); fs.mkdirSync(`${W}/chronicle`, { recursive: true }); }
w ??= createWorld(seed);
displayName.dialects = w.dialect;
// omens after the seed: an omen that arrives after its day has passed lands on the first unsimulated day (recorded, so replays agree)
const late = fs.existsSync(omensFile) ? JSON.parse(fs.readFileSync(omensFile)) : [];
const histIds = new Set(hist.omens.map((o) => o.id)); let assigned = 0;
for (const o of late) if (o.ad === undefined) { o.ad = Math.max(dayOfTs(o.ts), w.day); assigned++; }
const fresh = late.filter((o) => !histIds.has(o.id));
fs.writeFileSync(omensFile, JSON.stringify(late));
const byDay = omensByDay(hist.omens.concat(fresh));
const target = untilArg ? Number(untilArg.split("=")[1]) : dayNow(Date.now() / 1000) + 1;   // include the current hour's day

const view = {
  name: (i) => displayName(w.A, i, COGNOMENS),
  faction: (i) => w.factions[w.A.faction[i]].name,
  blood: (i) => w.factions[homeFaction(w, i)].name,
};
const chunks = {}; const chunkOf = (d) => Math.floor((d + PREHISTORY_DAYS) / 30);
const loadChunk = (k) => (chunks[k] ??= fs.existsSync(`${W}/chronicle/c${k}.json`) ? JSON.parse(fs.readFileSync(`${W}/chronicle/c${k}.json`)) : []);
const siftFile = `${W}/sift.json`;
const M = w.day > -PREHISTORY_DAYS && fs.existsSync(siftFile) ? JSON.parse(fs.readFileSync(siftFile)) : emptySift();
const t0 = Date.now(), from = w.day;
runUntil(w, target, byDay, (d, ev) => {
  const out = loadChunk(chunkOf(d));
  for (const e of ev) if (!e.h) out.push({ ...e, text: narrate(e, view), voice: VOICE[e.t] || "realism" });
  sift(M, d, ev, w, view.name);
});
for (const [k, arr] of Object.entries(chunks)) fs.writeFileSync(`${W}/chronicle/c${k}.json`, JSON.stringify(arr));
fs.writeFileSync(stateFile, zlib.gzipSync(serialize(w), { level: 9 }));
const A = w.A, hash = stateHash(w);
const meta = {
  version: VERSION, day: w.day, hash, genesis: GENESIS, prehistory: PREHISTORY_DAYS, updated: new Date().toISOString(), chunks: Object.keys(chunks).map(Number).concat(fs.readdirSync(`${W}/chronicle`).map((f) => Number(f.slice(1, -5)))).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b),
  omens: { history: hist.omens.length, after: fresh.length }, stats: w.stats.at(-1),
  factions: w.factions.map((f) => ({ id: f.id, name: f.name, title: f.title, color: f.color, alive: f.alive, members: f.members, seats: f.seats, legit: f.legit, inCoalition: f.inCoalition, ideo: f.ideo, founder: f.founder, born: f.born })),
  laws: w.laws.slice(0, 12), offices: Object.fromEntries(Object.entries(w.offices).map(([k, i]) => [k, { i, name: view.name(i) }])),
  leaves: w.leafCount || 0, births: w.births, leafDeaths: w.leafDeaths, N: w.N, treasury: w.treasury, tax: w.taxPermille, franchise: w.franchise, prices: w.prices, coalition: w.boule.coalition,
};
fs.writeFileSync(`${W}/meta.json`, JSON.stringify(meta));
fs.writeFileSync(siftFile, JSON.stringify(M));
console.log(`advance: day ${from} -> ${w.day} in ${Date.now() - t0} ms, hash ${hash}, omens after seed ${fresh.length} (${assigned} newly dated)`);
