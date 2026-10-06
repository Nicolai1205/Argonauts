// Public entry points shared by the GitHub job (Node) and the browser.
import { createWorld, serialize, deserialize, stateHash } from "./world.js";
import { tick } from "./systems.js";
import { dayOfTs, dayNow, GENESIS, PREHISTORY_DAYS } from "./lore.js";

export { createWorld, serialize, deserialize, stateHash, tick, dayOfTs, dayNow, GENESIS, PREHISTORY_DAYS };

/** bucket chain omens by the sim day they land on */
export function omensByDay(omens) {
  const by = {};
  for (const o of omens) { const d = o.ad ?? dayOfTs(o.ts); (by[d] || (by[d] = [])).push(o); }   // ad = day assigned when an omen arrived late
  for (const k of Object.keys(by)) by[k].sort((a, b) => a.block - b.block || (a.tok || 0) - (b.tok || 0) || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  return by;
}

/** advance the world to `target` (exclusive), calling onDay(day, events) after each day */
export function runUntil(w, target, byDay, onDay) {
  while (w.day < target) { const d = w.day; const ev = tick(w, byDay[d] || []); if (onDay) onDay(d, ev); }
  return w;
}
