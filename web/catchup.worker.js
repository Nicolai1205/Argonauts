// Catch-up off the main thread: replay the days since the checkpoint with the same engine, narrate and sift them,
// and hand back the world, the provisional chronicle and the stories. The page stays responsive meanwhile.
import { deserialize, serialize, runUntil, omensByDay } from "./sim/engine.js";
import { narrate, displayName, VOICE } from "./sim/narrate.js";
import { homeFaction } from "./sim/systems.js";
import { sift } from "./sim/sift.js";
import { COGNOMENS } from "./sim/lore.js";

self.onmessage = (msg) => {
  try {
    const { stTxt, seed, omens, target, M } = msg.data;
    const w = deserialize(JSON.parse(stTxt), seed); displayName.dialects = w.dialect;
    const view = { name: (i) => displayName(w.A, i, COGNOMENS), faction: (i) => w.factions[w.A.faction[i]].name, blood: (i) => w.factions[homeFaction(w, i)].name, world: () => w };
    const provisional = [];
    runUntil(w, target, omensByDay(omens), (d, ev) => {
      for (const e of ev) if (!e.h) provisional.push({ ...e, text: narrate(e, view), voice: VOICE[e.t] || "realism", prov: true });
      for (const st of sift(M, d, ev, w, view.name)) st.prov = true;
    });
    self.postMessage({ ok: true, state: serialize(w), provisional, M });
  } catch (e) { self.postMessage({ ok: false, error: String(e && e.stack || e) }); }
};
