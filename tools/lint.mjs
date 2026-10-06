// Coverage lint: every event type must have a chronicle line, a voice, and a biography phrase in the viewer.
// Usage: node tools/lint.mjs   (exit 1 on gaps)
import fs from "node:fs";
import { EV } from "../sim/systems.js";
import { narrate, VOICE } from "../sim/narrate.js";
const fakeW = { A: new Proxy({}, { get: () => new Proxy([], { get: (t, k) => (k === "length" ? 0 : 0) }) }), N: 0, day: 0 };
const view = { name: (i) => `Name${i}`, faction: () => "the House", blood: () => "the Blood" };
const bio = fs.readFileSync("web/app.js", "utf8"), bioStart = bio.indexOf("function bioText"), bioBody = bio.slice(bioStart, bio.indexOf("}[t] || t;", bioStart));
const SKIP = new Set(["", "boom", "starved", "lineage_end", "orphan", "hostage", "sold"]);   // declared or bio-only, never chronicle events   // declared, never emitted as chronicle events
const gaps = [];
for (const t of EV) {
  if (SKIP.has(t)) continue;
  const out = narrate({ i: 1, d: 0, t, a: 1, b: 2, x: 1, v: 1, s: "x|y|z" }, view);
  if (/^\S+ \(/.test(out) && out.startsWith(t + " (")) gaps.push(`${t}: no chronicle line`);
  if (!VOICE[t]) gaps.push(`${t}: no voice`);
  if (!new RegExp(`(^|[\\s,{])${t}:`).test(bioBody) && !new RegExp(`(^|[\\s,{])"${t}":`).test(bioBody)) gaps.push(`${t}: no biography phrase`);
}
if (gaps.length) { console.log(gaps.join("\n")); console.log(`lint: ${gaps.length} gaps`); process.exit(1); }
console.log(`lint ok: ${EV.length} event types covered`);
