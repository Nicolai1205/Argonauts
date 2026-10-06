# The Argo: handover

Status on 2026-10-06 (afternoon). **Rules v24**, live at https://nicolai1205.github.io/Argonauts/ (repo: github.com/Nicolai1205/Argonauts).
An autonomous, deterministic society simulation of the 9,999 Argonauts NFTs and their mortal children. **One real hour is one sim day.** Day 0 is 2026-10-06 00:00 UTC.

## 1. How it runs (nothing to babysit)
- **`.github/workflows/world.yml`** runs every hour at :03, on every push to `main`, and on demand. It does the following, in order:
  1. Checks out `main` plus the `world` branch, into `world/`.
  2. `tools/sync.mjs`: keyless chain sync. RPC `eth_getLogs` for Transfer/MetadataUpdate/BatchMetadataUpdate on the collection, plus the Blockscout API for every deployer transaction (`setTraits` is decoded to its token).
  3. `tools/advance.mjs`: loads the checkpoint, dates late omens, runs days up to now, narrates, sifts stories, and writes `state.json.gz`, `meta.json`, `chronicle/c*.json`, `sift.json`, `omens.json` and `feed.xml`.
  4. `tools/selftest.mjs`: 35 days, resuming after every day, must produce exactly the same save as continuing in memory (whole serialized state, not just the hash). **The job refuses to publish otherwise.**
  5. Force-pushes `world/` as a single commit to the `world` branch, so history doesn't grow.
  6. `tools/build_site.mjs` assembles `web/`, `sim/`, `data/` and `world/` into `_site/`. Every module import is cache-busted.
  7. Deploys to Pages.
  8. Weekly heartbeat commit (Mondays 00:xx UTC), so GitHub doesn't pause the schedule after 60 quiet days.
- **The browser** paints the checkpoint at once, then catches up to the current hour with the same engine in a module Web Worker (`web/catchup.worker.js`; at most 48 days, labelled "provisional"; one or two days run on the main thread).

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
| `sim/miasma.js` | v11 The Unclean City: miasma and katharsis, the Erinyes, blood-price vs vengeance, supplication, restless dead, the pharmakos, feuds |
| `sim/gift.js` | v12 The Gift and the Duty: liturgies and antidosis, the Boule's grain fleet, inherited xenia (seeded by every real sale), theoxenia |
| `sim/memory.js` | v13 Long Memory: Lethe/Mnemosyne at the re-knit, long-term and core memories, the weight of leaves, oaths and line curses, scars, the Samothracian mysteries |
| `sim/oracle.js` | v14 Oracles: Dodona on beam days, Delphic prophecy by ambiguity grammar (resolved by the first fitting event), Phineus, stolen hero bones |
| `sim/heroes.js` | v15 Beasts and Heroes: five beasts with lairs/hunger/radius, hunts, the Pagasaean and funeral games, strange moods and named relics, house renown and legacies |
| `sim/iron.js` | v16 The Stone in Their Midst: Sown tension and the stone, the spear-mark, the Iron clock, hubris/nemesis, the Agrionia, Demophon, Theoclymenus' doom, the Lemnian New Fire |
| `sim/hidden.js` | v17 What Is Hidden: unwitnessed killings and cases, belief, the Areopagus, secrets and blackmail, embezzling office-holders, reputation, curse tablets |
| `sim/threads.js` | v19 Songs, Threads and Hooks: the Orpheus' songs as world objects, blame-songs, blackmail in the vote, encounter intents, cadet houses, movements |
| `sim/wonders.js` | v20 Horrors and Wonders (see backlog A) |
| `sim/voyage.js` | v21 The Voyage and the Household (see backlog A) |
| `sim/discord.js` | v18 Discord: weather (rain, drought, flood, storm), colonies by lot, orators before the vote, Turchin's political stress index, offices vacated for ever by on-chain burns |
| `sim/poetics.js` | Text layer (no rules): domains and fixed epithets, situational asides in the chronicle, dawn lines, the Orpheus' poems, city song-forms |
| `sim/sift.js` | Story sifter → front page (patterns, salience × rarity, era names) |
| `sim/narrate.js` | Procedural prose for every event; names (`displayName`, patronymics, dialects) |
| `sim/lore.js` | Canon constants: clock, bloods, Spartoi houses, districts, goods, jobs, thoughts, offices, incidents |
| `web/` | Viewer: `app.js` (map, panels, follow, time-lapse, links), `map.js` (terrain, biomes, rivers, roads), `figures.js` (stick skeletons), `portrait.js` + `compose.js` (on-chain renderer port), `biography.js`, `codex.js` |
| `tools/py/compile_seed.py` | Builds `data/seed.json`, `data/history.json` and `data/fleet.bin.gz` from the parent research DB (`../data/argonauts.db`) |
| `data/art.json` | Renderer blobs and names (from `report/pix/remix.json`) |
| `docs/` | RESEARCH, DESIGN, LORE, FEASIBILITY, CULTURE, ROADMAP, this file; `docs/research/` has SIMULATIONS.md, MYTH.md (sources for v11–v18) and AUDIT.md (the v9 engine audit) |

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
7. **Negative days.** The prehistory runs on negative days, and JS `%` keeps the sign. Use `((day % n) + n) % n` for anything but `=== 0`, and never use `-1` as an "unset day" sentinel (use `null`). Both bugs happened in this wave.
8. **Event payloads.** `s` fields are `kind|detail|…`; narrate looks up a line set by the full `s`, then by the part before the first `:` or `|`, then `_`. Hidden traces (`ctx.trace`) reach the sifter with `h: 1`; sifter cases that should only fire on real events must check `!e.h`.
9. **Killings.** Call `kill(ctx, i, cause, by, hidden)`. A known killer (`by >= 0`) pollutes and opens a blood-debt; `hidden = true` stains the killer in secret, opens a case and logs only "found dead at dawn".
10. **Patch scripts.** Python patch files with JS containing apostrophes must use triple quotes; a syntax error aborts the whole patch (nothing applied), which is safe but easy to miss.

## 4. Operating it
- **Local full tick:** `npm run tick` (sync, advance, site), or step by step:
  ```
  node tools/sync.mjs world data/history.json && node tools/advance.mjs world && node tools/selftest.mjs world && node tools/build_site.mjs world _site
  ```
- **Fresh world-gen** (360-day prehistory): about 10–15 s. Delete `world/` first.
- **Preview:** `python3 -m http.server -d _site 8777`. Load with a fresh query (`?v=N`); browsers cache modules.
- **Benchmark and health:** `node tools/bench.mjs <dir or state.json.gz> [days] [out.json.gz]` (ms/day, three hashes, a trend, an event histogram).
- **Browser determinism:** open `/?xtest=N`; the page title shows the hash after N days from the checkpoint.
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
13. the Unclean City, Long Memory, oracles, beasts and games, the stone and the Iron clock, the hidden, weather and colonies (`miasmaDaily` → `memoryDaily` → `oracleDaily` → `heroesDaily` → `ironDaily` → `hiddenDaily` → `discordDaily`); monthly on day 15 the liturgies (`giftMonthly`)
14. culture: prophets, faiths, festivals
15. war: cities, vassals, quest (battles pause during the games' truce)
16. crafts, fashion, dialects, rumours
17. lifecycle (births, ageing, death; Leaves dead a year are blanked weekly)
18. funerals
19. stats
20. invariant

## 6. Current balance (v18; measured over a fresh prehistory plus a two-year forward run)
- About 10,800 alive at day 0, of which about 900 are Leaves; Leaves grow to ~4,400 by day 730 and flatten toward the logistic cap.
- Hunger swings with Hesiod's year and the droughts: 1–15% (mostly 2–6%). Gini 0.67–0.73. Unrest (active Epstein rebels) 30–190, down from 2,101 in v9.
- Tick ~40 ms/day; fresh world-gen ~13 s; state ~1.2 MB gzipped at day 0, ~1.9 MB at day 730.
- Per sim-year, roughly: 70–130 vendettas, 15–35 blood-prices, 5–20 supplications, 5–15 scapegoats, ~100 liturgies, 20–50 antidosis challenges, ~70 oracles, 5–6 beast attacks and as many hunts, 8 Pagasaean Games, ~40 strange moods, a few stones among the Sown, ~25 curse tablets, ~5 trials, ~20 weather events, a colony or two.
- Leaves: a year every 12 sim days; adult at 14; fertile 16–45; logistic cap 16,000.
- About 19% of people have a beloved: love needs a mutual best bond of 69 or more, it ends below 30, and bonds decay weekly.
- Faiths: base conversion 0.16 × zeal; prophets after catastrophes, with a 20-day cooldown and at most 12 alive.
- Wars: rel < −30, cohesion > 0.25, power > 1.15× the defender's (with terrain), at most 650 units away.

## 7. Watch items and known gaps
- **State growth:** ~0.35 MB gzipped per sim-year (13 KB/real day). Dead Leaves are blanked after a year; a true archive (renumbering) would break links, so if it matters, move dead rows' bio/genes into a side file.
- **Herbalists** nearly die out (the pharmaka trade is tiny), so plague kills more than it should. Consider seeding herbalists from Anthemoessa births.
- **Beasts** only attack 5–6 times a sim-year; prey regrows fast. Tune `heroes.js` hunger if they feel absent.
- **Prophecies** mostly lapse when there is no war; fine as flavour, but the fit rules could be broadened.
- **Xenia** sits at its 4,000 cap from history alone; oldest bonds lapse first.
- **Inequality** holds near 0.7 despite liturgies and guild dues (a quarter of carriage goes to the Boule); rowers and weavers are the rich trades.
- **Lemnos** is poor (a smoke-only island) and hungriest in winter; the liturgies' grain and the Boule's grain fleet relieve it but don't fix it.
- **World-gen speed** (about 14 s) and the state size (about 4.4 MB raw, about 1 MB gzipped) grow with dead Leaves. Archive long-dead Leaves out of the state eventually.
- **Browser catch-up runs on the main thread** (fine for ≤48 days); a Web Worker is still open.
- **The 60-day cron rule:** the heartbeat is in place but not yet proven over two months.
- **Not built yet** (`docs/ROADMAP.md`): trunk-road merging. Determinism check in a browser: open `/?xtest=N` and compare the page title's hash with Node (`runUntil` N days from the same checkpoint and omens).

## 8. Learnings (2026-10-06)
- **Profile the page, not just the engine.** The road A* in `web/map.js` cost ~17 s on every page load for weeks; the engine was never the bottleneck. `performance.mark("argo-ready")` marks first paint. Boot is ~1 s now.
- **Refactor with proof.** `node tools/bench.mjs <state.json.gz> 150` prints the state hash, a hash of the whole save and a hash of the event stream. A pure refactor must reproduce all three; this is how the v18 optimisation was verified.
- **Health over time.** The same tool prints a hunger/Gini/unrest/Leaves trend and an event histogram. Run 360–720 days after any balance change; several bugs (winter famine, jar-hoarding price shocks, monuments every 15 days) only showed over a year.
- **Test in a scratch world** (`node tools/advance.mjs /tmp/x`), never in `world/`. A fresh prehistory takes ~13 s.
- **Determinism traps hit this wave:** JS `%` on negative days; `-1` as an unset day; `Math.hypot`/`log2`; locale number formatting in state; module-level `day % 30 === 15` never matching in prehistory.
- **Balance traps:** a single global seasonal multiplier plus market hoarding produced famines; sea closure starved an island; penniless buyers ratcheted prices to the cap; any "per death" penalty starves the director.
- **Browser checks** use the Playwright browser already installed; do not download other engines locally. `/?xtest=N` puts the N-day hash in the page title to compare with Node.

## 9. Backlog: not done, should do, could do
### A. Planned but not built
- ✅ Trunk-road merging on the map.
- ✅ Poems as world objects (v19 `sim/threads.js`: sung memories last longer, blame-songs, praise for slayers).
- ✅ v19: story-aware director (strikes where avengers and open cases are; vows falling due press harder); blackmail hooks move Boule votes; encounter intents; cadet houses; aspirant movements.
- ✅ v20 `sim/wonders.js`: the Dragon's Teeth, the Kēres, the Empusa, Lamia, the body the Pyra refuses, the Bouphonia, Trophonius, Cleomedes, Theagenes' statue, the Cattle of the Sun.
- ✅ v21 `sim/voyage.js`: the Symplegades (the Reef–Drepane lane opens for ever), Talos (guards the harbour until the Medea pulls the nail), Alcinous' arbitration by the Ouranidai, pilgrimage to Circe's Aeaea, the bow contest for vacant offices (the spear-mark helps), wedding gifts, grain loans repaid with the same measure or better, the two Strifes, the grain wardens, fire names for burn-day births.
- Still not built from the research: epiklēros inheritance (needs gender, deliberately not modelled).
### B. Should do (risks, correctness, balance)
- ✅ (recovered to ~130–160 by v22 via inheritance and adult trades; keep watching) **Herbalists** nearly die out, so plague over-kills. Seed herbalists from Anthemoessa births or let the Medea office train them.
- ✅ v22: imperial overreach, tribute solidarity, relative-cohesion revolts (≈45 battles, 7 revolts a sim-year). **War:** the audit saw Ares become lord of 8 cities and city cohesion pinned at 0.86–0.98. Not revisited this wave.
- ✅ (legitimacy now 17–60; 17–22 alive) **Factions:** capped at 24 alive and legitimacy collapses to 4–21, so schisms stall (audit §3). Revisit.
- ✅ v22 almanac on quiet days. **Front page on quiet days** still leads with small revenge brawls. Add a quiet-day edition (dawn, the Orpheus, an almanac of the city) and weight arcs with stakes.
- ✅ v22: half of lapsed oracles are reread against the city's memory. **Prophecies** lapse ~70% in peacetime; broaden the fit rules or reinterpret lapsed ones (Croesus-style "it was fulfilled after all").
- ✅ v22 theorika: the treasury's excess goes monthly to the poorer half; Gini drifts to ~0.68–0.70. **Inequality** holds near 0.7. Options: progressive liturgies, eisphora war-tax, Solon-style debt relief law in the Boule.
- **Faith monoculture** (found in v21 long runs: one faith held 98%): ✅ v22 regional heresies and Weber's routinization (big faiths cool, small sects burn hot) now give a handful of regional churches.
- **State growth** ~0.35 MB gzipped per sim-year. Move dead rows' genes and bio to a side file loaded on demand.
- ✅ v22. **Infants carry their parent's job label** (effects are gated by age, but the panel says "pirate" for a baby). Show "child of a pirate".
- ✅ v22: the sim's districts use the map's coordinates. **Geography mismatch:** the sim's district coordinates differ from the map's sites; travel times and beast radii are in sim units.
- **Cross-engine determinism** is only checked by hand in Chromium. A CI job could run `/?xtest` in Firefox and WebKit.
### C. Better pathing and map  ✅ v23
- ✅ Walkers take L-shaped street paths instead of cutting through houses.
- ✅ Journeys between cities are drawn during the hour they happen, chained over the road and sea network (`w.trips`, kept 3 days): migrants, colonists, avengers tracking a target, the Reapers' watch, exiles and scapegoats, Argonauts walking home from Asphodel, pilgrims to the Pythia, hunting parties (there and back), war levies, the hounded sailing off-map to Aeaea.
- ✅ Wrecks marked on the lane, convoy escorts beside ships, stolen bones in the thief city, beasts prowling their circle, shrines at slain beasts' lairs, local rain, drought cracks, fog on the Mist-terraces, the Pyra glowing with the number it holds.
- Still open: a real street graph inside cities; beasts drawn as creatures instead of glyphs; rivers that widen in flood.
- **State growth (measured, v22):** the save is dominated by tie indices (random, so they barely compress), dead Leaves' life records (needed for their pages) and holder addresses. A binary save would save ~13%; not worth it yet.
### D. Engagement (spectators and holders)  ✅ mostly built
- ✅ Holder view: search by wallet or house name; `#/h/<address>` opens the house (its Sown and Leaves, guest-friends from real sales, feuds, curses, relics, good name).
- ✅ Watchlist (browser-local): watch characters and houses; toasts when they appear; a "since you were last here" digest on the front page.
- ✅ Share cards: "Save as a card" draws the lead story (portrait, title, text, the Orpheus' poem) as a 1200x630 PNG.
- ✅ Brewing with stakes: oaths falling due, which way the city leans in open cases, hungry beasts, movements.
- ✅ Charts: one series per chart with crosshair tooltips and a table view (Leaves, food price, hunger, Gini, shades, unrest, the stress index, the Iron clock).
- ✅ Arcs tab: the lives the front page keeps returning to this month, in order. ✅ Mobile checked at 400px (no overflow).
- Still open: RSS per character or house (needs server-side files per entity; could generate for watched-popular houses only); a family-tree graphic; a map layer of feuds and guest-friendships.
### E. Lore and story  ✅ v24 (most)
- ✅ Every faith retells riots, revolts, schisms, temples, beast attacks, hunts, the stone and colonies (they are now remembered and shown in the Codex).
- ✅ A beast that eats a city can become a god (the Theriodai, "the Hunger in the Hills"); it grew to a major faith in test runs.
- ✅ The month in song: the Orpheus' catalogue in the manner of the Ships (Codex).
- ✅ Leaves born from day 20 sometimes carry Leaf-names (Phyll-, Oste-, Spart-, Chthon-); burn-day births carry fire names (v21).
- ✅ The Hero of Temesa: a murdered shade unavenged for 60 days takes a youth every 120 days until a Monster-slayer or champion beats it.
- Still open: off-map places as expedition goals (Crete, Phaeacia, Colchis itself); a faith that resists the Maker; Codex chapters per system.
### F. Simulation depth
- Households (oikoi) as economic units: shared stores, dowries, inheritance and adoption of Leaves by the Sown.
- Individual skill and apprenticeship (Henrich at the person level), and personal projects (build a ship, found a temple, write a law).
- Credit and grain loans with interest; debt and a Solon-style relief law.
- Disease as SIR per district with immunity and quarantine.
- Politics: candidates, campaigns, orators moving individual voters, bribes and hooks.
- War: supply and famine in sieges, raids for loot, treaties sworn as oaths (and broken).
- Ecology: prey tied to weather; overfishing; felling forests for ships.
- The director reads the Brewing threads and nudges toward resolution.
### G. Engineering
- Weekly CI run of `tools/bench.mjs` over 360 days, posting a health report.
- Typed event payloads instead of `|`-joined strings.
- Split `sim/systems.js` (900+ lines); a system registry and typed event bus (audit §6).
- A test that every event type has a narration line and a biography phrase.
- Cache the checkpoint in IndexedDB; run larger live catch-ups in the worker too.

## 10. Canon (short)
- **The Maker** (alphacentaurikid / ACK) sowed the Minyai on 26 Aug 2026 (the Sowing). The Minyai are bone and only fire unmakes them.
- **Factions by Bones:** Spartoi (five Theban houses), Gegeneis, Argyreoi, Gorgonides, Anthemoessans, Laoi Lithinoi, Chryseoi, Phaethontes, Ouranidai. Their mortal children are **the Leaves**.
- **Places:**
  - Pagasae and the Agora, the Field of Ares, Bear Mountain, Anthemoessa, the Reef, the Burning Lake of Eridanus, Drepane, the Mist-terraces, Deucalion's Strand, Iolcus, the Grove of Ares, Lemnos and the Chalybes forges;
  - the **Pyra**: on-chain burns for the 5 days their art shows fire, Leaves for 3;
  - the **Asphodel Meadow**: graves with oars, and broken Argonauts mending.
- **The Argo's speaking beam** speaks the visor phrases whenever the renderer changes.
- **The Golden Fleece** is worn by #5266.
- Sources for everything are in `docs/LORE.md`.
