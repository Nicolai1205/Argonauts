# The Argo: engineering and design audit (rules v9)

Audited 2026-10-06 against `sim/*.js`, `web/*.js` and `tools/*.mjs`. No game files were modified. Every measurement was made in a scratch copy.

**What was measured**
- **Live world:** day 11, N = 11,100, the published `world/` files.
- **Fresh world-gen:** 360-day prehistory to day 0 (seed hash `a69f8a58`).
- **Long run:** day 0 to day 2,160, about 90 real days ahead. It uses history omens only, so no new chain events arrive after day ~10.
- **Determinism:** a 40-day resume-vs-continue run with `w.debug = true`.
- **Counterfactuals:** three 360-day runs with single-line patches.

File:line references are to the unmodified sources.

---

## 0. Top 10 findings, in priority order

| # | Finding | Severity | Where |
|---|---|---|---|
| 1 | **Time-bomb:** `love()` stores agent indices in an `Int16Array`, so it breaks once N > 32,767. At the measured +7.4 N/day, that is around **sim day 2,900, about 2027-02-04**. After that, no one with an index ≥ 32,768 can fall in love, so births stop for every later generation. The viewer's `S.eveWith` has the same bug. | Critical (silent) | `sim/systems.js:386`, `web/app.js:148` |
| 2 | **"Unrest 2,101" is an artefact.** It mostly counts radicals who live in quarters with no Reapers, not hungry people. Rumours ratchet `radical` up on every hearing, and it only decays when mood > 25 (8% of agents). Reef, Lemnos, the Forges and Drepane have 0 guards, so arrest probability is 0. 88% of agents reach radical > 40 within a year. | High (balance) | `sim/rumor.js:43`, `sim/systems.js:485,508,518-521` |
| 3 | **The director is degenerate.** Every death cuts `adapt` by 0.25, and deaths happen daily, so `adapt` is pinned at 0.42. The director then spends its points the moment it reaches 10, on the cheapest incident. In 2,160 days: 79 ghosts and 9 palls. Plague, harpies, sirens, Lemnian nights, doliones, bounty, talos and featherbolts: **0**. | High (story) | `sim/systems.js:94,691-697` |
| 4 | **Prophecy can never fire.** A duplicate `case "beam"` in the sifter means `M.beams` is never filled; it is `[]` in the live `sift.json`. | High (story) | `sim/sift.js:82` vs `:91` |
| 5 | **Memory, anniversaries and monuments are effectively dead.** Two-stage decay leaves 12.7% of salience after 360 days, and the festival threshold is 12. A burn (s0 = 90) scores 11.4 on its first anniversary. Result: 1 monument and about 7 anniversaries in 2,160 days. | High (story) | `sim/culture.js:117,133,137` |
| 6 | **Devotion decays 4–10× faster than designed.** `Uint8Array` truncates `x − 0.25` to `x − 1`. 82% of the living sit at devotion 0–9, and ritual cost and apostasy barely matter. Newborns also never inherit their parents' faith (faith 0, devotion 0). | High | `sim/culture.js:83`, `sim/systems.js:162-185` |
| 7 | **The religion and faction layers freeze.** Prophets need catastrophes, which the director never produces, so only 2 prophets appear in 2,160 days. Splinters hit the cap of 24 alive factions by about day 300, while every faction's legitimacy sinks to 4–21. Schism pressure is maximal but can't release. | High (design) | `sim/culture.js:35-38`, `sim/systems.js:669` |
| 8 | **Chronicle and front page are flooded by one event type each.** `convert` is logged for every Argonaut with a cognomen, and 6,301 Argonauts become "Twice-Born". That makes conversions **40.9% of visible events** in the long run (69.6 events a day). Revenge is **48%** of all front-page stories, fed by 105k hidden brawl traces. Riots fire on a 10-day metronome per quarter. | Medium-high | `sim/culture.js:70`, `sim/sift.js:36-42`, `sim/systems.js:526-527` |
| 9 | **The economy inverts its own lore.** Nobles have no income at all; their median is 0–1 obols and 39–47% are hungry. Pirates' median is 1 obol and ~33% are hungry. Children inherit jobs at birth: 131 child Reapers count as guards and draw wages, and 32 child pirates rob people. Lemnos' "famine price" of 12 is the price cap, held there by penniless buyers rather than missing supply. | Medium | `sim/systems.js:173,301,328,376,457,508` |
| 10 | **State grows without bound, and the self-test is narrow.** The checkpoint grows from 4.4 MB to 10.9 MB raw (1.15 to 3.0 MB gzipped) by day 2,160; 47.7% of entities are dead Leaves. `w.styles` (467 KB) and `sift.json` (0.94 MB) never shrink. The self-test covers 2 days and hashes arrays plus 7 globals only. `Math.hypot` and `Math.log2` remain in `sim/`; V8's `hypot` differs from `sqrt` on **84 of 225** district pairs. | Medium | `sim/world.js:173-180`, `tools/selftest.mjs`, `sim/war.js:7,38`, `sim/trade.js:7`, `sim/fleece.js:5` |

---

## 1. Bugs and determinism risks

### 1.1 Determinism (resume must equal continue)
**Verified OK.** Over 40 days from the day-0 world (crossing 6 weekly and 2 monthly ticks), resuming every day matches continuous play:
- the money invariant held after every system (`w.debug = true`);
- the hash matched (`44abcf58` both ways);
- the full `serialize()` output was identical except for `cap` (13,066 continuous vs 13,409 resumed). `cap` is serialized but overwritten on load (`sim/world.js:164`). Drop it from the JSON so byte-equality checks become possible.

**Risks, in descending order:**
1. **Non-correctly-rounded math in `sim/`:**
   - `Math.hypot`: `sim/war.js:7`, `sim/trade.js:7`, `sim/fleece.js:5`;
   - `Math.log2`: `sim/war.js:38`.

   In Node, `Math.hypot(240, 70)` (reef–drepane) returns `250.00000000000003`, and 84 of 225 pairs differ from `Math.sqrt(dx*dx+dy*dy)`. SpiderMonkey and JSC use different `hypot` code, so the browser's provisional catch-up can differ by 1 ulp. That feeds `carriage()` and then `Math.round(landed*q)`, which moves money (`sim/trade.js:12,29`), and also the war-reach and asabiya comparisons. The chance of a flip per operation is tiny, but it breaks rule 1 and costs one line to fix. **Fix:**
   - precompute an integer distance table in `lore.js`: `Math.round(Math.sqrt(dx*dx+dy*dy))`;
   - replace `log2` with `ln()` from `drift.js` divided by a `LN2` constant.
2. **Locale-dependent strings in state.** `paid.toLocaleString()` is written into `W.history[].terms` and the `peace` event (`sim/war.js:111`). A browser with a German locale writes "1.234" where Node writes "1,234". It is cosmetic (not in `stateHash`), but the serialized state diverges. Use a fixed formatter.
3. **The self-test is narrow** (`tools/selftest.mjs:15-19`):
   - only 2 days, so weekly and monthly systems run only if the checkpoint day happens to land on one;
   - `stateHash` covers typed arrays plus `[day, treasury, prices, faction seats/legit, tax, minted, destroyed]` (`sim/world.js:177`). It ignores `w.war`, `w.faiths`, `w.rumors`, `w.cprices`, `w.memory`, `w.director`, `w.quest` and `w.relics`, so a divergence there goes unseen until it leaks into the arrays;
   - there is no cross-engine test (Chrome, Firefox and WebKit headless catch-up compared to the Node hash).

   **Fix:** hash the canonical serialize output minus `cap`, run 35 days to cover a weekly and a monthly tick, and add a Playwright job that runs `runUntil` +48 days in three engines.
4. **The self-test's omen set differs from advance's.**
   - `advance.mjs:29-31` drops late omens already present in `history.json` (`histIds`).
   - `selftest.mjs:10` does not.
   - The browser also uses all late omens (`web/app.js:37`).

   No duplicates exist today (0), but they will appear after a seed refresh. Most omen handlers are idempotent; `ruling` writes a second bio entry. Share one `loadOmens()` helper.
5. **Omen sort key.** `(block, tok, k)` collides for 86 omens, so their order relies on stable sort plus file order (`sim/engine.js:12`). Two transfers of the same token in one block then depend on JSON order. Add `logIndex` to the omen record and to the key.
6. **Fragile payloads.** Event payloads are strings split on `|` (battle, peace, raid, relicpass…), plus one JSON string for riots (`sim/systems.js:538`). A relic or faction name containing `|` would break the narrator and sifter. This is not a determinism issue, but it is.

### 1.2 Overflow and typed-array truncation
| Array | Type | Problem | When |
|---|---|---|---|
| `best` in `love()` | `Int16Array(ctx.N)` (`systems.js:386`) | Indices ≥ 32,768 wrap negative (40000 → −25536), so those agents never pair | N reaches 32,767 at about day 2,900, about **2027-02-04** (N grows 7.4/day: 11,023 → 26,886 over days 0–2,100) |
| `S.eveWith` | `Int16Array(N)` (`web/app.js:148`) | Evening companion links point at wrong people | same date |
| `devotion` | `Uint8Array` | `49.75 → 49`: the intended −0.25/−0.1 per day becomes −1, and `+0.4 − 0.25` gives +0, not +0.15 (`culture.js:83`) | now (82% at 0–9) |
| `deaths` | `Uint8Array` | wraps at 256 breaks (`systems.js:240`); Argonauts break about 7 times a real year | decades, low |
| `style` | `Uint16Array` | wraps at 65,535 styles; 2.2 new styles a day | about 3.3 real years |
| `faction`, `faith` | `Uint8Array` | 255 ids ever. Factions are never removed (27 after 2,160 days; capped at 24 alive). Faiths: 11 | low today, real if the caps are raised |
| `inv` | `Int16Array` | Only production caps at 400 (`systems.js:268`). Market, trade, pirate skims (`trade.js:40`), bounty and child-feeding add without a cap | low |

### 1.3 Dead agents and stale `ctx.live`
Most systems check `A.status[i]` correctly. The exceptions:
- **`guardCount()`** (`systems.js:505-510`) has no status check, so Reapers killed earlier the same day still count as guards for unrest. It also has no adult check, so 131 child Reapers count as guards by day 2,160.
- **`rumorsDaily()`** (`rumor.js:57`) counts spreaders over a stale `ctx.live` without a status check, so dead spreaders keep a rumour alive.
- **`unrest()`:** the looting victim `ctx.byDist[d][r.int(pop)]` can be dead or jailed (`systems.js:532`). The "fear of the mob" thought is pushed onto dead agents (`:536`).
- **Ties are never cleared on death.** By day 2,160, 13,367 of 111,305 tie slots (12%) point at non-living agents. They decay by 1–2 a week and block new friendships, because `tie()` only replaces the weakest slot (`systems.js:70-75`).
- **`leafDies()` clears the office before checking it.** It deletes the office (`systems.js:104`) and then computes `notable = … || A.office[i] >= 0` (`:113`), which is always false. Office-holding Leaves die unlogged 75% of the time.
- **`dissolve` reassigns members to `homeFaction()` = `birthFac`** (`systems.js:685`). Leaves born into a splinter have `birthFac` = that splinter, so on dissolve they are "returned" to the dead faction itself. It hasn't happened yet (only 3 dissolves), but it is latent.

### 1.4 Logic bugs (non-numeric)
- **The prophecy pattern is unreachable.** There are duplicate `case "beam"` labels (`sift.js:82,91`); the first wins, so `M.beams` is always empty.
- **Faith is not inherited.** `bear()` never sets `faith` or `devotion`, so every Leaf starts as an Olympian with devotion 0. This contradicts ROADMAP Phase 1 ("beliefs … from the parents").
- **Jobs are inherited at birth** (`systems.js:173`). Infants are pirates, Reapers and nobles:
  - `social()` lets child pirates rob (`:457`: no `isAdult`);
  - `politics()` pays child Reapers (`:613`);
  - `guardCount` counts them as guards.
- **Unused content:**
  - thought `a fine trade` is never thought;
  - cognomens 4 (Oath-breaker), 5 (Thrice-Robbed), 6 (Exile), 11 (Rich), 12 (Ruined) and 14 (Plague-spared) are never awarded;
  - event types `boom`, `starved`, `kinslayer`, `lineage_end` and `orphan` are declared but never emitted (`systems.js:18`).
- **Dead code in the sifter:**
  - `BASE.bigfamily` and `BASE.law` have no pattern;
  - `revenge` decrements `M.harm`, but `M.avenged` is never pruned (123 KB by day 2,160).
- **`fashion()` stub:** `if (w.styles.length > 600) w.styles = w.styles.map((s) => s)` is a no-op that was meant as a cap (`drift.js:62`).
- **Hard-coded tie width:** `prophets()`, `fashion()` and `inheritRelics()` use `* 8` instead of `TIES` (`culture.js:41,50`, `drift.js:57`, `fleece.js:31`).
- **Geography mismatch:** the map uses its own `SITES` coordinates (`web/map.js`), while the sim uses `DISTRICTS.x/y` (`lore.js:43-59`). Caravan durations, war reach and expedition days come from a different geometry than the one drawn.

### 1.5 Money invariant
No leaks found. The debug run over 40 days checked the invariant after every system. All transfers are pairwise or go through the treasury:
- inheritance remainders go to the treasury (`systems.js:108`);
- tribute rounding goes to the treasury (`war.js:123`);
- trade fee rounding goes to the treasury (`trade.js:36`);
- monuments and Charon's obol are the only sinks.

**Watch:** the treasury rises to 169,507 by day 2,160, after 23k at day 0. The budget spends only `0.12·guard + 0.1·tithe + 0.9·rest` of the treasury once a season, while tax runs at 9.9% daily. It is a slow hoarding sink that isn't counted as "destroyed".

### 1.6 Unbounded growth in state and in `sift.json`
| Field | Day 0 | Day 2,160 | Bound |
|---|---|---|---|
| `w.styles` | 50 KB (520) | **467 KB (4,794)** | none |
| `w.war.timeline` | 12 KB | 84 KB | 400 entries |
| `w.stats` | 107 KB | 313 KB | 900 entries |
| `w.relics` | 2 KB (12) | 20 KB (98) | none (history ≤ 40 each) |
| `w.factions` / `w.faiths` / `w.monuments` | 20 / 5 / 0 | 27 / 11 / 1 | none (slow) |
| typed arrays (dead rows) | 0.7% dead | **47.7% dead (13,016 graves)** | none |
| `sift.json` | 4 KB | **937 KB**: `harm` 412 KB, `avenged` 123 KB, `feud` 87 KB, `love` 66 KB, `breaks` 62 KB | `stories` ≤ 600 only |
| chronicle | 216 B/event, 14.8 events/day (prehistory) | **69.6 events/day**, about 15 KB/day, about 130 MB per real year | none (the world branch is force-pushed, but the tree grows) |

---

## 2. Shallow or stubbed systems

Each entry gives what the system does now, then what it would need to generate stories.

1. **Director** (`systems.js:689-726`)
   - *Now:* accumulates 0.42 points a day and fires on a 30% roll once points reach 10, so in practice it only ever fires ghost (10) or pall (12). Fixing just the death penalty (counterfactual, 360 days) raises incidents from 14 to 57, but plague, sirens, Lemnian nights and doliones still never fire, because it spends greedily.
   - *Missing:*
     - saving toward a chosen incident ("intent", as in RimWorld's storyteller);
     - tension measured from the world (deaths, hunger, unrest) rather than from death count;
     - cool-downs per incident;
     - incidents that target characters (a named victim or hero) instead of whole districts.
2. **Memory, festivals and monuments** (`culture.js:116-143`)
   - *Now:* the decay curve kills every memory below threshold before its first anniversary. Only the 3 fixed festivals happen.
   - *Missing:*
     - a salience curve that keeps the top 5–10 memories above threshold;
     - owners who actually keep the festival (participation by faith or faction members, skipped when there is famine);
     - festival outcomes such as games winners (see Games), marriages and brawls;
     - monuments that can be commissioned by rich individuals, not only the Boule.
3. **Faith** (`culture.js:33-111`)
   - *Now:* 11 faiths in 2,160 days. Conversion works along ties, but devotion collapses (the Uint8 bug) and faith isn't inherited. Temples are a flag, and doctrine drifts toward members' mean.
   - *Missing:*
     - inheritance;
     - working devotion;
     - prophets triggered by any personal catastrophe (lost lover, starvation, ruling), not only by world events with a unique-origin rule;
     - rites with costs and visible gatherings;
     - holy wars (faith currently feeds war relations only through the dominant faith);
     - persecution;
     - priests whose income depends on their flock.
4. **Factions and schisms** (`systems.js:664-686`)
   - *Now:* frozen at the cap of 24 alive since about day 300, while legitimacy collapses (4–21 for most factions).
   - *Missing:*
     - mergers, absorption and extinction of weak splinters (only `n < 5` dissolves);
     - splinter leaders acting (demands, coups);
     - a reason to cap at 24 other than the legend.
5. **Elections and offices** (`systems.js:573-652`)
   - *Now:* D'Hondt seats from clout, a minimal connected coalition, 5 binary laws, and offices by argmax score each season.
   - *Missing:* candidates, campaigns, speeches, votes per character, scandals, and office powers. The Orpheus is the only office with a mechanical effect, and that is on sirens, which never fire.
6. **Unrest and riots** (`systems.js:511-541`)
   - *Now:* the Epstein condition, then a riot every 10 days per qualifying quarter: 18.3 riots per 30 days in the long run, 36 of 40 prehistory riots in the Forges. Riots raise radical (+8) and jail people, which feeds the next riot.
   - *Missing:*
     - grievance that a riot can actually resolve (demands met, a dole, Reapers posted, a leader arrested or martyred);
     - Reapers redeployed to hot quarters;
     - riot size and outcome as a contest (rioters vs guards).
7. **Rumours** (`rumor.js`)
   - *Now:* Daley–Kendall spread with 6 global slots; a mutation once per 300 hearings; the blame always falls on the most distant faith. The main effect is a radical ratchet (88% radical > 40 within a year). Without that one line, it is 45%.
   - *Missing:*
     - per-agent belief (who did it), so rumours set up feuds between people rather than abstract radicalism;
     - rumours about individuals: affairs, debts, crimes;
     - rumours that can be true or false, with a truth test the sifter can use.
8. **Love** (`systems.js:385-396`)
   - *Now:* love forms between mutual best ties of 69 or more. In 2,160 days: 5,279 loves against 37 heartbreaks, so love is effectively permanent. 30% of adults have a beloved.
   - *Missing:* courtship, rivals and jealousy, infidelity, marriage contracts between households, love across feuding lines (a Romeo-and-Juliet sift pattern), widowhood rules.
9. **Fashion** (`drift.js:48-64`)
   - *Now:* neutral copying among ties plus 2.2 inventions a day. It has no effect on any other system.
   - *Missing:* status signalling (the rich adopt, the poor copy), sumptuary laws, a mood boost or envy, fashion as a faction marker. It also needs a cap or GC for `w.styles`.
10. **Dialects** (`drift.js:67-73`)
    - *Now:* 4% a week per city to add one regex sound change. It only changes Leaf names in the display.
    - *Missing:* mutual intelligibility affecting social scores, trade friction and xenia.
11. **Crafts** (`drift.js:26-43`)
    - *Now:* Henrich's dynamics with real productivity effects, but they saturate at the 0/100 bounds; Ares, for example, sits at 100/84/0/100/75/100. Only 11 craft and craftlost events happen in 2,160 days.
    - *Missing:* master–apprentice ties between named characters, so the loss of a master is a story; lower rates of change.
12. **The Fleece quest** (`fleece.js:46-88`)
    - *Now:* about one expedition a month, but only 2 Fleece captures in 2,160 days. The bearer is just teleported.
    - *Missing:* a bearer with agency (flight, betrayal, ransom), a heist plan with named party members' fates, the Fleece's effect on its holders' faith.
13. **Relics** (`fleece.js:16-38`)
    - *Now:* provenance chains only, with no mechanical effect.
    - *Missing:* each relic grants something (legitimacy, a prophet trigger, a war bonus), so relics get stolen, coveted and fought over.
14. **Exile** (`systems.js:654-662`)
    - *Now:* 60 days of stasis. Exiles are removed from `ctx.live`: they don't eat, age, act or remember.
    - *Missing:* exiles who live elsewhere (another city or the pirates), plot a return, and gather followers.
15. **Pirates**
    - *Now:* a job with no income except robbing richer non-kin (followed by jail), plus a skim on sea trade. Phase 5's "pirates become a real faction at sea" is not implemented.
16. **Seasons and weather**
    - *Now:* nothing in the sim. The viewer only tints the map in winter and summer (`app.js:239-240`).
17. **Space**
    - *Now:* districts are points; the map's roads and terrain are not read by the sim (`web/map.js` header).

---

## 3. Balance (code plus measured data)

### 3.1 Why unrest is 2,101 and hunger is about 908 (live, day 11)
**Unrest = active rebels**, counted by the Epstein condition `G − R·Pa > 0.1` (`systems.js:516-521`). I recomputed it from the live state and got **2,093** (the published stat is 2,101):

| District | Active | Guards | Population | Hungry % |
|---|---|---|---|---|
| Lemnos | **1,244** | 0 | 1,650 | 26.5% |
| Reef | **441** | 0 | 918 | 2.3% |
| Forges | **211** | 0 | 223 | 69.5% |
| Ares | 82 | 500 | 3,869 | 2.5% |
| Iolcus | 56 | 162 | 1,035 | 7.2% |

- Only 649 of the rebels are hungry. **1,119 (53%) would be inactive without the `radical/400` term.**
- With 0 guards, `Pa = 0`, so any adult with radical > 40 is "active".
- **Radical sources:**
  - every rumour heard that blames another faith: +1, or +2 when heat > 50 (`rumor.js:43`);
  - mood < −25: +1/day;
  - riot: +8;
  - robbed: +5.
- **The only decay** is −1/day when mood > 25, which applies to about 8% of agents.
- Live radical histogram: 1,663 agents at 100, and 4,882 at 50 or above.
- Long run: 8,780 of 13,924 (63%) sit at radical = 100.
- **Counterfactual** (360 days with the rumour radical line removed): radical > 40 falls from 11,317 to 5,748, and unrest falls from 2,929 to 2,347.
- **Reapers** are placed by outfit at genesis (`world.js:81`), so Lemnos, Reef, the Forges and Drepane have no watch at all. The Boule never posts any.

**Hunger, 908 live:**
- **Lemnos:** 438 hungry. It is a smoke-only island of 1,650 growers. Smoke is oversupplied (price 1.74, below the base of 3), so growers have a median of 66 obols. The food price there is **12.00, the hard cap** of 6× base (`systems.js:376`).
  - Imports are possible: landed from Ares ≈ 1.77 × 1.47 = 2.6.
  - But hungry buyers with too few obols are counted as "unmet" whenever price ≤ 6× base (`:374`), so the price is ratcheted to the cap and held there.
  - **The cap price is a symptom of poverty, not of missing supply.** Over the long run growers migrate away: Lemnos falls from 1,650 to 200 people, and the price is still 12.
- **Forges:** 155 of 223 miners are hungry, with food at 12.
- **Pirates:** 28% hungry, median 1 obol.
- **Nobles:** **39% hungry, median 1 obol.** Nobles produce nothing (`JOB_GOOD` lacks them, `lore.js:71`) and earn nothing (`services()` pays only `SERV`, `systems.js:301`). Their +250 endowment drains away. The richest caste in the lore is the poorest in the sim.
- **Children** are only 3.3% hungry, because they are fed by their parents (`systems.js:139-142`).

### 3.2 Gini drivers
- **Live Gini 0.709:**
  - top 10% hold 56.7% of obols, top 1% hold 14.7%;
  - 652 agents have 0 obols;
  - treasury 74,847.
- **Median obols by job:**

  | Job | Median obols |
  |---|---|
  | Weaver | 623 |
  | Rower | 455 |
  | Servant | 314 |
  | Augur | 167 |
  | Farmer, fisher | 141 |
  | Priest | 106 |
  | Grower | 66 |
  | Reaper | 62 |
  | Merchant | 55 |
  | Herbalist | 57 |
  | Pirate | 1 |
  | Noble | 1 |
- **Rowers hold the largest share** (1.24 M obols in total), because they collect trade carriage (`trade.js:36`: fees go to ≤ 5 random haulers of the selling city) and service pay. This matches the HANDOVER watch item.
- **Blood-endowment skew:** Chryseoi have 2,000 base wealth, Spartoi 80 (`lore.js:21-30`). The splinter elites' mean obols are 1,000–13,000.
- **Long run:** Gini falls to 0.54 by day 2,000, as the treasury absorbs coin (169k) and the dole (law `dole` = true) redistributes it.

### 3.3 Who ever does anything notable (live chronicle, days −360 to 10, 5,479 events)
- **4,403 distinct actors**, out of 11,100 entities ever (40%).
- 781 actors appear in ≥ 3 events, and 142 in ≥ 5. The top actor has 18.
- **Biographies rely on a 10-slot ring** (`BIO = 10`) plus the last 2 chronicle chunks that the viewer loads (`app.js:38-39`). Older deeds of any character are invisible in the viewer.

### 3.4 Event-type frequency
**Live (prehistory plus 11 days), top entries:**

| Event | Share |
|---|---|
| love | 18.9% |
| death | 18.0% |
| return | 14.0% |
| brawl | 8.1% |
| birth | 7.0% |
| gold | 5.9% |
| convert | 4.8% |
| defect | 4.0% |

**Long run (days 0–2,160), 69.6 visible events a day:**

| Event | Share |
|---|---|
| **convert** | **40.9%** |
| death (breaks) | 20.2% |
| return | 11.5% |
| ostologia | 8.6% |
| birth | 3.8% |
| love | 3.5% |

- **Never emitted in the live chronicle:**
  - `sold` and `hostage` (bio only);
  - `dissolve`, `unburied`, `harpies`, `plague`, `sirens`, `sirens_sung`, `doliones`, `featherbolts`, `lemnian`, `bounty`, `famine`;
  - `boom`, `cognomen`, `starved`, `kinslayer`, `dole`, `comeofage`, `lineage_end`, `orphan`;
  - `faithdies`, `faithschism`, `monument`, `iconoclasm`, `revolt`, `craft`.
- **Rates per 30 days in the long run:**

  | Event | Per 30 days |
  |---|---|
  | birth (logged) | 78.7 |
  | love | 73.3 |
  | riot | 18.3 |
  | battle | 4.3 |
  | caravan | 3.0 |
  | office | 2.2 |
  | raid | 2.1 |
  | relic | 1.2 |
  | peace | 1.15 |
  | ghost | 1.1 |
  | ostracism | 1.0 |
  | expedition | 0.94 |
  | revolt | 0.81 |
  | heartbreak | 0.51 |
  | law | 0.44 |
  | war | 0.35 |
  | festival | 0.35 |
  | election | 0.29 |
  | schism | 0.11 |
  | faithschism | 0.06 |
  | prophet | 0.03 |
  | fleecetaken | 0.03 |
  | monument | 0.01 |
- **Deaths by cause, live (Argonauts break; Leaves die):**

  | Cause | Count |
  |---|---|
  | plague (Argonauts) | 344 |
  | fell in wars | 302 |
  | brawl | 167 |
  | starved | 71 |
  | Leaf infancy | 53 |
  | riot | 30 |

  Plague is mostly seeded by brawls (`sick = 2` on both parties, `systems.js:448`) and spread socially, not by the director's plague incident, which never fires.

### 3.5 Love, births and Leaves
- **Births:** 1,101 in the prehistory. In the long run, 7.55 a day (1,024 → 16,887 over 2,100 days).
- **Leaf deaths:** about 6 a day.
- **Leaf population** plateaus at about 4,250–4,500 from day 600. The logistic K of 16,000 is never binding (`systems.js:144`); mortality is.
- **Lovers:** 20.1% of adults live, 30.0% at day 2,160.
- **Love vs heartbreak:** 37 heartbreaks against 5,279 loves.

### 3.6 War
- **Prehistory:** 6 wars, 5 of which ended in vassalage.
- **Long run:** 25 declared wars, 58 revolts and 83 peaces in 2,160 days.
- **End state:** two hegemons. The Field of Ares is lord of 8 cities and Bear Mountain of 2, with 0 active wars.
- **Asabiya saturates.** Most cities sit at S = 0.86–0.98. Relations are very negative, because faith, faction, envy and grudges all subtract, so every city has a "metaethnic frontier" (`war.js:54-58`). Cohesion stops differentiating cities.

### 3.7 Faiths
- **Live:** 5 faiths; Olympians 7,686, Pyrphoroi 2,882, Dodonaioi 183.
- **Long run:** 11 faiths (8 alive); the largest four have about 3,000–3,650 each.
- **Devotion:** 82% of the living at 0–9 (live).

### 3.8 Story-sifter pattern hits (long run, 21,994 stories)
| Pattern | Hits |
|---|---|
| revenge | **10,624 (48%)** |
| widowed | 3,161 |
| rumor | 2,294 |
| thricebroken | 1,984 |
| riot | 1,318 |
| lastline | 823 |
| firstleaf | 602 |
| battle | 309 |
| caravan | 215 |
| raid | 150 |
| relic | 123 |
| peace | 83 |
| ostracism | 72 |
| expedition | 68 |
| revolt | 58 |
| war | 25 |
| election | 21 |
| risefall | 16 |
| schism | 12 |
| pall | 9 |
| festival | 7 |
| temple, fleece, faithdies | 3–4 each |
| generation, feud, prophet | 2 each |
| monument | 1 |
| **prophecy, street, turncoat, bigfamily, law, famine, plague, sirens, lemnian, doliones, bounty, harpies, talos, iconoclasm** | **0** |

- **Revenge is cheap.** Any brawl or robbery after a prior harm within 10–150 days qualifies, and hidden traces count (105k brawl traces).
- **Feud almost never fires.** It requires a generation increase between harms. 1,860 feud keys are tracked, but only 2 stories appear.

---

## 4. Performance

**World-gen** (createWorld plus 360 days): **12.8 s**, 35.5 ms/day, N = 11,018. Over the long run the cost rises to 47–50 ms/day by day 2,000 (N = 26k).

**Per-system cost**, days −360 to 0 (share of tick time), with the long-run share at the end:

| System | Share | ms/day | Long-run share | Notes |
|---|---|---|---|---|
| market + trade (incl. services) | **44.4%** | 15.7 | 30.8% | 5 goods × all living; objects per city per good; `Object.keys({...sellers, ...buyers})`; `sl.some()`; pirate list rebuilt by `ctx.live.filter` inside the trade loop (`trade.js:39`) |
| social | **19.7%** | 7.0 | 26.0% | gossip loops 6 rumour slots per conversation; `A.met.fill` over the whole cap; string-keyed `crews` object |
| moodStress | 6.7% | 2.4 | 7.6% | a `seen = {}` object allocated per agent per day (`systems.js:472`) |
| stats | 4.4% | 1.6 | 5.3% | daily full sort for the Gini, plus an O(N_total) status loop |
| consumption / production | 3.3 / 2.9% | ~1 each | | |
| lifecycle | 1.0% | 0.4 | **4.7%** | O(N) scans per death (`systems.js:106`, `fleece.js:29`) and per birth (`systems.js:179`); `kidsOf` rebuilt daily over all Leaves |
| faithDaily, unrest, rumorsDaily, index, defection, politics, love | 1.3–3% each | | | |

- **Loops over all entities, including the dead,** grow as dead Leaves accumulate: `scheduled`, `funerals`, `unburiedCount`, `stats`, `seedRumor` (`rumor.js:25`) and the sifter's weekly `lastline` (`sift.js:115`).
- **Serialization at day 2,160:**
  - gunzip 32 ms, deserialize 28 ms, serialize 37 ms, hash 18 ms;
  - **gzip level 9: 1.31 s** (563 ms at day 0).
- **Checkpoint size:** 4.43 MB raw / 1.15 MB gzipped at day 0, 10.87 MB / 3.0 MB at day 2,160. That is about 3 KB raw and 0.87 KB gzipped per sim day.
- **Largest arrays** (base64, day 2,160):

  | Array | Size |
  |---|---|
  | `bioDay` | 1.46 MB |
  | `bioArg` | 1.46 MB |
  | `tieTo` | 1.17 MB |
  | `thUntil` | 0.87 MB |
  | `inv`, `bioType`, `tieVal`, `pers`, `thType`, `rumor` | 0.2–0.36 MB each |

- **The browser** downloads the state, `seed.json`, `fleet.bin.gz`, two chronicle chunks and `sift.json` (0.94 MB at day 2,160). It then runs up to 48 days on the main thread (about 2.3 s on desktop Node-equivalent; slower on mobile).

**Cheap wins:**
1. Precompute per-city typed-array order books.
2. Keep a maintained list of the living, and child lists per parent, to remove the O(N) scans.
3. Compute the Gini weekly.
4. Replace `seen{}` with a fixed Int8 scratch buffer.
5. Store `bioDay` and `thUntil` as Uint16 offsets from a base day.
6. Archive dead Leaves (§6).
7. Use gzip level 6. Brotli is the bigger change; it would need DecompressionStream to support "br".

---

## 5. Viewer gaps

**Computed but never shown** (good spectator content):
- **Rumours:** `w.rumors` holds 6 live stories with `versions[]` (the mutation chain), reach, the blamed faith and the district spread. No UI shows them. A "what the agora is whispering" ticker would be strong.
- **Unrest map:** `w.activePrev` (rebels per district) and `w.riotCool` would make a pressure heat-map: "the Reef is about to go". Only past riots are drawn.
- **Stress about to break:** agents with `stress > 400`, a "who is cracking" list.
- **City relations:** the `W.rel` matrix and `W.grudge` (border incidents). The viewer shows only "hates" lists. A relations chord or graph and a grudge ledger would explain the wars.
- **Sifter memory:**
  - `M.harm` (who wronged whom, recently);
  - `M.feud` (1,860 lineage feuds);
  - `M.love`, `M.breaks`.

  All of it lives in `sift.json` and only surfaces as finished stories.
- **Economy:**
  - per-city price history (only the current table is shown);
  - `w.tradeLog` volume and raid totals;
  - `w.fertility` (soil exhaustion);
  - who sells food at famine prices;
  - rich lists, the poorest, pirate kings;
  - the treasury's flow.
- **Director:** points, adapt and the last incident, as a "storyteller tension" meter.
- **Memory:** `w.memory` with live salience, i.e. what the city remembers and when it will fade. The Codex only shows myths for 4 kinds.
- **Laws:** shown, but not the coalition's ideology or the budget split per faction (the Baron–Ferejohn shares).
- **Faction ideology drift over time.** Only the current centroid is shown.
- **Personal state:**
  - `identity`, `vice` and cravings;
  - jail time;
  - `met` / `metKind` are only used for the evening walk;
  - the full tie list with kin, lover and rival labels;
  - family trees beyond parents and children (`lineage`, `gen`).
- **Wars:** the `war.score` trajectory per battle, and the war-weariness the roadmap promised (not implemented).

**UX holes:**
- **Chronicle drowned:** the panel shows the last 400 events (`app.js:362`). In the long run 41% of them are conversions and 20% are Argonaut breaks. It needs filtering by type or salience, and collapsing of repeats ("17 conversions to the Pyrphoroi today").
- **History is cut off:** only the last 2 chronicle chunks (60 days) load, so Legends pages and biographies lose a character's older deeds. A per-character index (event ids by actor) would fix this.
- **Front page:** when no story scores ≥ 15, it still prints the top story (`sift.js:121`). 148 of 519 live stories score below 15.
- **Search** matches only the given name (`app.js:578`); patronymics, cognomens, faction or office don't match.
- **Codex rebuilt every refresh:** `renderCodex()` and all panels rebuild on every catch-up, scanning the entities 5–8 times. `countIn()` and `labelCount()` loop over all N for every district on every frame (`app.js:316-325`).
- **Geography:** the map positions (`SITES`) and the sim positions (`DISTRICTS`) disagree, so caravan travel times don't match the drawn distance.
- **Provisional days:** shown with a tag, but the provisional days' sift stories mutate the shared `M` and stay until reload.
- **Wrong links after Feb 2027:** `S.eveWith` (Int16) will link the wrong people once N > 32,767.

---

## 6. Architecture readiness for about 15 new systems

**Today:**
- `tick()` is a hand-ordered list (`systems.js:29-49`), and systems talk through ad-hoc fields on `w`, often created lazily: `w.activePrev`, `w.riotCool`, `w.unrestSeason`, `w.grainDole`, `w.reliefLog`, `w.genMax`, `W.timeline`.
- Events carry positional `a, b, x, v, s` with string-encoded payloads.
- Per-agent state is fixed-width slots (8 ties, 6 thoughts, a bio ring of 10).
- The sim keeps **no queryable history**: events go to the chronicle and the sifter, both outside the deterministic state. So no system can ask "who killed my father?".

**Refactors, roughly in order of payoff:**

1. **System registry** (`sim/registry.js`). Each entry looks like `{ key, every: 1|7|30, phase, needs: ["live"], init(w), run(ctx), migrate?(w), hashSlice?(w) }`.
   - `tick()` iterates the registry, rebuilds `ctx.live` when a system declares `needs`, runs `chk()`, and times each system when `w.profile` is on.
   - `init()` is called by `createWorld`, so no `w.x || (w.x = …)` initialisation is scattered through the code.
   - New systems (weather, monsters, oracles, xenia, miasma, cults, games, colonies, schemes, elections) each become one file plus a registry line.
2. **Typed event bus.**
   - `ctx.emit(type, { actors:[…], place, data:{…}, salience, visibility })` with a schema per type, declared next to the system: narrate templates, a `VOICE`, rumour seeding and memory salience.
   - Subscribers run at the end of the day in registration order: rumours (replacing `RUMOR_OF`), prophets (replacing the scan in `culture.js:36`), memory, bio, the sifter, and new oracles.
   - This removes the `|`-split and JSON payloads, and the `EV` index limit on bio codes. `bioType` is Uint8, already 83 of 255.
3. **A deterministic in-state event store.** A ring buffer of the last N notable events, e.g. 4,096 entries of `{id, day, type, a, b, place, data}`, plus a per-agent index of the last K event ids.
   - Oracles, prophecy fulfilment, revenge, secrets, elections ("remember what the candidate did") and myths can then query history inside the sim.
   - The sifter's long-lived memory (`harm`, `feud`, `love`) should move into state, or the sifter should become a registry system, so arcs are deterministic and stories can feed back (a famous feud raising tension).
4. **Per-agent memory and thought ring buffers.**
   - Generalise `bio*` (10 slots) into a memory ring of `{eventId, valence, salience, about}`, e.g. 16 slots with Uint16 day offsets.
   - Thoughts reference memories: "remembers the night of knives −12".
   - This underpins memories/thoughts, grudges, secrets, speeches that cite deeds, and biographies beyond 60 days.
5. **A generic relationship store.** Replace `tieTo` / `tieVal` / `lover` / `p1` / `p2` semantics with typed edges:
   - either keep the 8 slots and add `tieKind` (friend, rival, kin, lover, xenos/guest-friend, patron/client, master/apprentice, co-conspirator) and `tieSince`;
   - or use a sparse edge list for rare kinds (secrets, oaths, xenia, debts).

   Clear or tombstone edges on death. Needed by: xenia (inherited guest-friendship), schemes/secrets (who knows what about whom), mystery cults (initiation ties), colonization (founders), and debt and patronage.
6. **A LAYOUT that carries behaviour.** Each entry becomes `[name, type, width, { genesis(i), born(c, a, b, r), died(i) }]`.
   - `bear()` and `kill()` call the hooks, so new arrays can't forget newborn initialisation (the faith-inheritance bug shows the risk).
   - Assert that every LAYOUT array has a `born` hook.
7. **A space model.** One source of geography: integer distance and road-time tables generated from `web/map.js` at build time and stored in `lore.js`, plus terrain tags per district (coast, mountain, marsh).
   - Weather and ecology, monsters (lairs on the map), colonization (new districts appended to `DISTRICTS` → `CITIES`), caravans and sea storms all need it.
   - Districts must become growable (Uint8 is fine up to 255).
8. **Entity archive and compaction.** Move Leaves dead for more than about 360 days out of the hot arrays.
   - Keep index stability: indices are used in links, `p1`/`p2`, `lineage`, relic holders and events.
   - **Option A:** serialize only living or recently dead rows plus a tombstone bitmap, and keep a static archive file of `{id, name, parents, born, died, lineage, faction, cause}`.
   - **Option B:** chunked typed arrays.

   Either way, add `w.live` (maintained incrementally) so no system loops over `N_total`.
9. **Calendar and season service.** `season(day)`, `month(day)`, `isFestival(day)` and moon phase in one module. Weather, harvests, games, the oracle consultation season and miasma all key off it. Today the season exists only in the viewer.
10. **Determinism guard-rails.**
    - Lint `sim/` in CI for `Math.(random|exp|log|log2|pow|sin|cos|hypot)`, `Date`, `toLocale*` and `for…in` over objects with non-integer keys.
    - Hash the full canonical state.
    - Run the cross-engine catch-up test.
    - Fuzz resume points across weekly and monthly ticks.
11. **Director as a consumer of world tension.** Give it a world-tension signal (hunger, unrest, recent salience) and incident cards registered by systems (monsters, plague, storms, oracle crises). Each card declares cost, cooldown, preconditions and a target selector, so new systems plug their catastrophes into one storyteller.
12. **Bounded collections by policy.** One helper `boundedPush(arr, item, max)` plus an LRU for keyed memory (`M.harm`, `M.avenged`, `w.styles` with GC of unused styles: a style used by nobody for 360 days drops to a tombstone name).

**Per new system: which refactor it depends on**

| New system | Needs |
|---|---|
| Weather / ecology | registry, calendar, space; plugs into production (`fertility`) and trade (lane closures) |
| Monsters | space (lairs), director cards, event bus (heroes), relationship store (monster-slayer fame) |
| Oracles | event store (prophecies checked against history), memory, director cards |
| Xenia | relationship store (typed, inheritable guest-friend edges), dialect intelligibility |
| Miasma | event store (kin-slaying, unburied), memory, faith (purification rites) |
| Mystery cults | relationship store (initiates), secrets, calendar (rites) |
| Games | calendar, festivals that work, fame/cognomens, rivals |
| Colonization | space (append districts), registry migrations, `CITIES` growable |
| Secrets / schemes | relationship store, memory, event store, rumours with truth values |
| Memories / thoughts | per-agent memory ring, event store |
| Elections with speeches | memory ("cites the riot of …"), event store, offices with powers, faction ideology |

---

## Appendix: method and reproduction
- **Scratch copy:** `/private/tmp/claude-501/-Users-nicolaisondergaard-signal-scripts-argonauts/e2e8f36e-e3cc-44d3-9593-3009b9840f05/scratchpad/audit`. It contains:
  - `an_state.mjs`: state breakdown, hunger, wealth, unrest recomputation;
  - `an_chron.mjs`: event histogram and actors;
  - `gen.mjs`: fresh world-gen with timers wrapped around each system call in a patched copy of `sim/systems.js`;
  - `long.mjs`: day 0 → 2,160 with the sifter;
  - `orig/det.mjs`: resume vs continue in debug mode;
  - `exp.mjs`: counterfactual runs (`exp_norumor` with the rumour radical line removed; `exp_nodirdrop` without the death penalty on the director's `adapt`).
- **Live world** measured at day 11 (`meta.json`: unrest 2,101, hungry 908, Gini 0.709, N 11,100).
