# The Argo: roadmap

North star: the most compelling simulation to *watch*. Every system has to produce stories a spectator can read on the map, in the chronicle or on a Legends page, and every story must trace back to mechanics and real on-chain events.

## Done (2026-10-06)
- **Engine:** deterministic and replayable, with the money invariant checked daily. Systems: economy and market, needs, ties, opinions, mood and stress, Epstein riots, politics (D'Hondt, coalitions, ADICO laws, Baron-Ferejohn), offices, ostracism, schisms, a director, funerals.
- **Chain omens:** sales, burns, rulings, renderer changes and deeds, synced hourly.
- **Square world map:** biomes, cities, roads, streets and households.
- **Walking skeletons** drawn from their traits, each with a personal daily rhythm.
- **Encounters, coworkers, love, heartbreak.**
- **Hosting:** live on GitHub Pages, advanced by an hourly Action.

## Canon decided now
- **Argonauts are deathless bone.** Wounds, famine and plague *break* them: they fall to Asphodel and re-knit after 20–60 days. Only fire unmakes them, and fire comes only from an on-chain burn.
- **The Phylla, "the Leaves"** (Iliad 6.146): the mortal children of the Minyai. They are born, age about 12 sim-days per year (one year every 12 real hours), love, bear children, grow old and die for good. They are cremated on the Pyra and buried in Asphodel.

## Plan, in build order

### Phase 1: The Leaves (demography)  ✅ live (rules v3)
- **Engine:** a growable entity store. Tokens are indices 0–9998; the Leaves are appended after them. Index arrays become Int32, and appearance genes become per-entity arrays.
- **Births:** couples (`lover`) sow a child. The chance depends on prosperity (food and mood), whether the household is full, and a world logistic capacity.
- **Genetics:** bones and palette come from one parent each, with rare mutation to a neighbouring tier. Personality is the mean of both parents plus noise. Beliefs and faction come from the parents (cultural inheritance).
- **Life stages:**
  - infant, 0–4: eats, does not work;
  - child, 5–13: does half work and learns the family trade;
  - adult, 14–59: works, loves, votes, bears children;
  - elder, 60+: works less and gains prestige.
- **Mortality:** Gompertz hazard (built from multiplications only, so it replays exactly), plus infant risk, famine and plague.
- **Names:** a Greek name plus a patronymic: "Nikias Glaukphonides", child of Glaukphon. Lineages are named after their founding Argonaut.
- **Death of a Leaf:** wealth is split among the children, family grieves, the body burns on the Pyra for 3 days, then is buried in Asphodel.
- **Viewer:** smaller figures for children, stooped elders, tunics in the faction's colour; family trees on Legends pages; a births and deaths chart.

### Phase 2: The front page (story sifting)  ✅ live
Pattern queries over the event log, after James Ryan and Kreminski's Felt:
- revenge;
- rise and fall;
- the twice-broken;
- feuds across generations;
- the last of a line;
- a love outlasting death;
- first-born of a new dynasty;
- prophecy fulfilled.

Each match is scored by salience × rarity. A daily front page shows the top stories, plus an Ages view (eras named after their dominant event).

### Phase 3: Gods and faiths (emergent religion)  ✅ live (v4)
- **Prophets** arise after catastrophes: a burn, plague, massacre or famine. The doctrine is the prophet's ideology plus a deity drawn from the catastrophe: the Fire-that-Unmakes, the Gorgon's Kin, the Hungry Mouth.
- **Spread** along ties (Stark), helped by insecurity (MODRN).
- **Schisms** when doctrine drifts apart.
- **Ritual cost** (Sosis) buys cohesion.
- **Temples** stand on the map, and religion feeds into votes and wars.

### Phase 4: Memory, calendar and festivals  ✅ live (v4)
- A 360-day year of 12 months named after the voyage (Pagasaion, Lemnion, Kyzikion …).
- Anniversaries of salient events become festivals (two-stage memory decay), as do the Anthesteria, when the dead walk the city, and harvest games.
- Monuments fix memory and appear on the map; wars can tear them down or rededicate them.

### Phase 5: Cities and wars  ✅ live (v5)
- Each city has asabiya (cohesion), which grows on frontiers with a different faith or culture (Turchin).
- Leagues, raids and sieges. The defender gets a terrain bonus from the map.
- War weariness for a generation; treaties as ADICO laws between cities; vassals.
- Pirates become a real faction at sea.

### Phase 6: Culture drift  ✅ live (v6)
- Henrich crafts per city (shipbuilding, bronze, healing, song). A city can lose a craft, and its productivity falls with it.
- Fashion drift (Bentley).
- Dialects: names drift by city over generations.
- Laws spread between cities by imitation of richer neighbours (Ober).

### Phase 7: Rumour and myth  ✅ live (v7)
- Daley–Kendall rumours that mutate as they spread.
- Each faction retells key events its own way (Caves of Qud style); the official account sits next to the chronicled fact.

### Phase 8: Map and city life  ✅ rivers, ships, seasons, events drawn on the map (trunk roads, caravans, weather still open)
- Rivers from rainfall and runoff, rain shadows, roads that merge into trunks.
- Cities visibly grow and shrink with households.
- Ships on sea lanes; caravans; weather.

### Phase 9: Lore codex  ✅ live
An in-site Codex:
- the Bloods, the Places, the Maker, the Calendar, the Ages;
- every faith and dynasty, written from the chronicle;
- a collection-level history of the real chain.

### Phase 10: Engineering  ✅ self-test, current actions, heartbeat, RSS (Web Worker and save compaction still open)
- Web Worker catch-up.
- A compact save (archive long-dead Leaves out of the state).
- A determinism test in CI.
- Up-to-date action versions; a keep-alive for the 60-day cron rule.
- A daily digest feed (RSS).

## Next wave (after 2026-10-06)
1. **Legends of every character, written in full:** a biography generated from bio, ties, family, faith, wars and rumours, plus how each faith tells *that* character's life.
2. **Heirlooms and the Fleece quest:** relics with provenance pass down lines. Factions mount expeditions to take the Golden Fleece; the bearer is hunted.
3. **Trade caravans and a sea economy:** goods move between cities along roads and lanes, so famine in one city can be relieved by another. Prices differ by city.
4. **Elections with candidates and speeches:** the Boule's choices show as named orators and procedural speeches, with votes by faction.
5. **Art from the real renderer:** Leaves inherit real Argonaut-style pixel portraits composed from their parents' traits with `report/remix/compose.js`.
6. **Weather systems:** storms, droughts and floods, driven by seasons and the director.
7. **Spectator tools:** follow a character or a family, time-lapse replay of the last N days, and shareable deep links to a character or a story.
8. **Performance:** Web Worker catch-up, compact saves (archive long-dead Leaves), faster world-gen.
