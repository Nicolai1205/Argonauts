// Guard for the hourly job: the world must replay. Resume-from-checkpoint and in-memory continuation must agree,
// money must balance (checked inside every tick), and a fresh world must build. Exit 1 blocks publishing.
import fs from "node:fs";
import zlib from "node:zlib";
import { createWorld, serialize, deserialize, stateHash, runUntil, omensByDay } from "../sim/engine.js";
import { VERSION } from "../sim/world.js";
const W = process.argv[2] || "world";
const seed = JSON.parse(fs.readFileSync("data/seed.json")), hist = JSON.parse(fs.readFileSync("data/history.json"));
const late = fs.existsSync(`${W}/omens.json`) ? JSON.parse(fs.readFileSync(`${W}/omens.json`)) : [];
const histIds = new Set(hist.omens.map((o) => o.id));   // same omen set as advance.mjs
const by = omensByDay(hist.omens.concat(late.filter((o) => o.ad !== undefined && !histIds.has(o.id))));
let base;
const f = `${W}/state.json.gz`;
if (fs.existsSync(f)) { const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString()); if (raw.version === VERSION) base = deserialize(raw, seed); }
if (!base) { base = createWorld(seed); runUntil(base, base.day + 3, by); }
const a = deserialize(serialize(base), seed), b = deserialize(serialize(base), seed);
// 35 days covers at least one weekly and one monthly tick; resume after every day and compare the whole save, not just the hash
const DAYS = Number(process.env.SELFTEST_DAYS || 35), canon = (w) => { const o = JSON.parse(serialize(w)); delete o.cap; return JSON.stringify(o); };
runUntil(a, a.day + DAYS, by);
let c = b; for (let k = 0; k < DAYS; k++) { runUntil(c, c.day + 1, by); c = deserialize(serialize(c), seed); }
const ha = stateHash(a), hc = stateHash(c);
if (ha !== hc || canon(a) !== canon(c)) { console.error(`selftest FAILED: continuous ${ha} vs resumed ${hc}`); process.exit(1); }
console.log(`selftest ok: day ${a.day}, hash ${ha}`);
