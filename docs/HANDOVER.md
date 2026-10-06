# The Argo: handover

Status on 2026-10-06. **Rules v9**, live at https://nicolai1205.github.io/Argonauts/ (repo: github.com/Nicolai1205/Argonauts).
An autonomous, deterministic society simulation of the 9,999 Argonauts NFTs and their mortal children. **One real hour is one sim day.** Day 0 is 2026-10-06 00:00 UTC.

## 1. How it runs (nothing to babysit)
- **`.github/workflows/world.yml`** runs every hour at :03, on every push to `main`, and on demand. It does the following, in order:
  1. Checks out `main` plus the `world` branch, into `world/`.
  2. `tools/sync.mjs`: keyless chain sync. RPC `eth_getLogs` for Transfer/MetadataUpdate/BatchMetadataUpdate on the collection, plus the Blockscout API for every deployer transaction (`setTraits` is decoded to its token).
  3. `tools/advance.mjs`: loads the checkpoint, dates late omens, runs days up to now, narrates, sifts stories, and writes `state.json.gz`, `meta.json`, `chronicle/c*.json`, `sift.json`, `omens.json` and `feed.xml`.
  4. `tools/selftest.mjs`: resuming from the checkpoint must equal continuing in memory. **The job refuses to publish otherwise.**
  5. Force-pushes `world/` as a single commit to the `world` branch, so history doesn't grow.
  6. `tools/build_site.mjs` assembles `web/`, `sim/`, `data/` and `world/` into `_site/`. Every module import is cache-busted.
  7. Deploys to Pages.
  8. Weekly heartbeat commit (Mondays 00:xx UTC), so GitHub doesn't pause the schedule after 60 quiet days.
- **The browser** loads the checkpoint and catches up to the current hour with the same engine (at most 48 days, labelled "provisional"). It then draws the world.

## 2. Repository map
| Path | What |
|---|---|
| `sim/engine.js` | Public API: `createWorld`, `runUntil`, `omensByDay`, `serialize` / `deserialize`, `stateHash` |
| `sim/world.js` | State (struct-of-arrays, growable entity store, `VERSION`, `ARGO = 9999`) and serialization |
| `sim/systems.js` | The daily tick and most systems: omens, scheduled transitions, production, consumption, per-city markets, social, mood, unrest, defection, migration, love, politics, director, funerals, lifecycle (births, ageing, death), stats, money invariant |
| `sim/culture.js` | Faiths and prophets, calendar, memory, festivals, monuments |
| `sim/war.js` | City-states, asabiya, relations, border incidents, wars, vassals, weekly timeline |
| `sim/drift.js` | Crafts (Henrich), fashion (Bentley), dialects, deterministic `ln()` |
| `sim/rumor.js` | Daley–Kendall rumours with mutation; faith myth templates |
| `sim/fleece.js` | The Golden Fleece quest (bearer = token #5266), relics with provenance |
| `sim/trade.js` | Inter-city trade flows at landed prices, pirate skimming, visual caravans |
| `sim/sift.js` | Story sifter → front page (patterns, salience × rarity, era names) |
| `sim/narrate.js` | Procedural prose for every event; names (`displayName`, patronymics, dialects) |
| `sim/lore.js` | Canon constants: clock, bloods, Spartoi houses, districts, goods, jobs, thoughts, offices, incidents |
| `web/` | Viewer: `app.js` (map, panels, follow, time-lapse, links), `map.js` (terrain, biomes, rivers, roads), `figures.js` (stick skeletons), `portrait.js` + `compose.js` (on-chain renderer port), `biography.js`, `codex.js` |
| `tools/py/compile_seed.py` | Builds `data/seed.json`, `data/history.json` and `data/fleet.bin.gz` from the parent research DB (`../data/argonauts.db`) |
| `data/art.json` | Renderer blobs and names (from `report/pix/remix.json`) |
| `docs/` | RESEARCH, DESIGN, LORE, FEASIBILITY, CULTURE, ROADMAP, this file |

## 3. Rules that must not be broken
1. **Determinism.**
   - Inside `sim/`, use only `+ - * /`, `Math.floor/round/sqrt/abs/min/max`, integer ops and seeded `stream(seed, day, system)`.
   - **Never** use `Math.random`, `Date`, `Math.exp/log/pow/sin` in state updates. Use `ln()` in `drift.js` and multiplication tables (Gompertz `HAZ`).
   - Iterate in index order.
   - Visual-only code in `web/` may use anything.
2. **Money is conserved.** `invariant()` throws if Σobols + treasury ≠ m0 + minted − destroyed. Only these may change the total:
   - chain sales mint "gold from Colchis";
   - Charon's obol and monuments destroy money.
   Run with `w.debug = true` to check after every system.
3. **The chain is canon.**
   - Replaying history must put every token in its real current owner's household. This was verified (0 mismatches) at the time of writing.
   - Argonauts die only by an on-chain burn. Everything else *breaks* them, and they re-knit 20–60 days later. Leaves are truly mortal.
4. **Changing the state layout or rules?** Bump `VERSION` in `sim/world.js`.
   - The job then re-dreams the world from genesis and resets the chronicle.
   - It reads `version` **before** decoding. Decoding an old layout crashed the job for 40 minutes once.
5. **New per-agent arrays** go in `LAYOUT` (world.js) and must be initialised for newborns in `bear()` (systems.js).
6. **Dead entities stay in the arrays**, and `ctx.live` is built once per day and goes stale after deaths. Every system must skip `A.status[i] !== 0`. A dead agent in a later system once caused a money leak through an empty pool.

## 4. Operating it
- **Local full tick:** `npm run tick` (sync, advance, site), or step by step:
  ```
  node tools/sync.mjs world data/history.json && node tools/advance.mjs world && node tools/selftest.mjs world && node tools/build_site.mjs world _site
  ```
- **Fresh world-gen** (360-day prehistory): about 10–15 s. Delete `world/` first.
- **Preview:** `python3 -m http.server -d _site 8777`. Load with a fresh query (`?v=N`); browsers cache modules.
- **Refresh the seed** after the parent DB updates:
  1. `python tools/py/compile_seed.py` from the parent repo root.
  2. Commit `data/`.
  3. Bump `VERSION` if the history should be replayed again.
- **Parent project:** `python -m argonauts persist` (in `..`) stores every game script, doc and seed output in the research DB (globs in `argonauts/persist.py`).

## 5. Systems at a glance (daily order)
1. omens
2. scheduled transitions
3. production
4. consumption
5. markets (per city), then trade flows, then city prices
6. caravans
7. social: encounters, conversion, gossip
8. mood and stress
9. unrest (Epstein)
10. weekly: centroids, defection, migration, love
11. monthly: politics (D'Hondt, coalition, ADICO laws, Baron-Ferejohn, offices, ostracism, schisms)
12. director
13. culture: prophets, faiths, festivals
14. war: cities, vassals, quest
15. crafts, fashion, dialects, rumours
16. lifecycle
17. funerals
18. stats
19. invariant

## 6. Current balance (v9 prehistory, end values)
- About 10,950 alive, of which about 1,000 are Leaves.
- About 400–900 hungry; Gini about 0.6–0.7.
- Leaves: a year every 12 sim days; adult at 14; fertile 16–45; logistic cap 16,000.
- About 19% of people have a beloved: love needs a mutual best bond of 69 or more, it ends below 30, and bonds decay weekly.
- Faiths: base conversion 0.16 × zeal; prophets after catastrophes, with a 20-day cooldown and at most 12 alive.
- Wars: rel < −30, cohesion > 0.25, power > 1.15× the defender's (with terrain), at most 650 units away.

## 7. Watch items and known gaps
- **Inequality** rose to about 0.7 once haulers earn carriage. Consider a carriage tax or guild dues.
- **Lemnos and the Chalybes forges** can sit at famine bread prices (poor producers can't afford imports).
- **World-gen speed** (about 14 s) and the state size (about 4.4 MB raw, about 1 MB gzipped) grow with dead Leaves. Archive long-dead Leaves out of the state eventually.
- **Browser catch-up runs on the main thread** (fine for ≤48 days); a Web Worker is still open.
- **The 60-day cron rule:** the heartbeat is in place but not yet proven over two months.
- **Not built yet** (`docs/ROADMAP.md`): elections with candidates and speeches, weather, trunk-road merging, the Web Worker, save compaction.

## 8. Canon (short)
- **The Maker** (alphacentaurikid / ACK) sowed the Minyai on 26 Aug 2026 (the Sowing). The Minyai are bone and only fire unmakes them.
- **Factions by Bones:** Spartoi (five Theban houses), Gegeneis, Argyreoi, Gorgonides, Anthemoessans, Laoi Lithinoi, Chryseoi, Phaethontes, Ouranidai. Their mortal children are **the Leaves**.
- **Places:**
  - Pagasae and the Agora, the Field of Ares, Bear Mountain, Anthemoessa, the Reef, the Burning Lake of Eridanus, Drepane, the Mist-terraces, Deucalion's Strand, Iolcus, the Grove of Ares, Lemnos and the Chalybes forges;
  - the **Pyra**: on-chain burns for the 5 days their art shows fire, Leaves for 3;
  - the **Asphodel Meadow**: graves with oars, and broken Argonauts mending.
- **The Argo's speaking beam** speaks the visor phrases whenever the renderer changes.
- **The Golden Fleece** is worn by #5266.
- Sources for everything are in `docs/LORE.md`.
