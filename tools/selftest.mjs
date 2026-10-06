// Guard for the hourly job: the world must replay. Resume-from-checkpoint and in-memory continuation must agree,
// money must balance (checked inside every tick), and a fresh world must build. Exit 1 blocks publishing.
import fs from "node:fs";
import zlib from "node:zlib";
import { createWorld, serialize, deserialize, stateHash, runUntil, omensByDay } from "../sim/engine.js";
import { VERSION } from "../sim/world.js";
const W = process.argv[2] || "world";
const seed = JSON.parse(fs.readFileSync("data/seed.json")), hist = JSON.parse(fs.readFileSync("data/history.json"));
const late = fs.existsSync(`${W}/omens.json`) ? JSON.parse(fs.readFileSync(`${W}/omens.json`)) : [];
const by = omensByDay(hist.omens.concat(late.filter((o) => o.ad !== undefined)));
let base;
const f = `${W}/state.json.gz`;
if (fs.existsSync(f)) { const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString()); if (raw.version === VERSION) base = deserialize(raw, seed); }
if (!base) { base = createWorld(seed); runUntil(base, base.day + 3, by); }
const a = deserialize(serialize(base), seed), b = deserialize(serialize(base), seed);
runUntil(a, a.day + 2, by);
runUntil(b, b.day + 1, by); const c = deserialize(serialize(b), seed); runUntil(c, c.day + 1, by);
const ha = stateHash(a), hc = stateHash(c);
if (ha !== hc) { console.error(`selftest FAILED: continuous ${ha} vs resumed ${hc}`); process.exit(1); }
console.log(`selftest ok: day ${a.day}, hash ${ha}`);
