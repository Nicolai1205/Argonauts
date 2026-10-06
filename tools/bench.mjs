// Benchmark and long-run health check. Runs N days from a checkpoint with the chain history as omens and prints
// ms/day, the state hash, a hash of the whole serialized state, a hash of the event stream, a stats trend, and the
// event histogram. A pure refactor must reproduce all three hashes exactly.
// Usage: node tools/bench.mjs <dir with state.json.gz | file.json.gz> [days=150] [out.json.gz]
import fs from "node:fs";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { deserialize, serialize, runUntil, omensByDay, stateHash } from "../sim/engine.js";
const src = process.argv[2] || "world", n = Number(process.argv[3] || 150), out = process.argv[4];
const file = src.endsWith(".gz") ? src : `${src}/state.json.gz`;
const seed = JSON.parse(fs.readFileSync("data/seed.json")), hist = JSON.parse(fs.readFileSync("data/history.json"));
const w = deserialize(JSON.parse(zlib.gunzipSync(fs.readFileSync(file))), seed), by = omensByDay(hist.omens), evs = crypto.createHash("sha1"), count = {};
const t = performance.now();
runUntil(w, w.day + n, by, (d, ev) => { evs.update(JSON.stringify(ev)); for (const e of ev) if (!e.h) count[e.t] = (count[e.t] || 0) + 1; });
const ms = (performance.now() - t) / n, json = serialize(w);
console.log(`ms/day ${ms.toFixed(1)}  N ${w.N}  hash ${stateHash(w)}  full ${crypto.createHash("sha1").update(json).digest("hex").slice(0, 12)}  events ${evs.digest("hex").slice(0, 12)}  gz ${(zlib.gzipSync(json).length / 1e6).toFixed(2)} MB`);
console.log(w.stats.filter((s, k) => k % 30 === 0).slice(-Math.ceil(n / 30)).map((s) => `${s.d}: hungry ${s.hungry} gini ${s.gini} unrest ${s.unrest} leaves ${s.leaves}`).join("\n"));
console.log(Object.entries(count).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
if (out) fs.writeFileSync(out, zlib.gzipSync(json));
