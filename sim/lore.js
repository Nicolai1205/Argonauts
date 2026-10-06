// World canon: names from the Argonautica and Greek myth (sources in docs/LORE.md).

/** Real time -> sim time. 1 real hour = 1 sim day. Pre-genesis chain history is compressed into a prehistory. */
export const GENESIS = Date.UTC(2026, 9, 6, 0, 0, 0) / 1000;   // 2026-10-06 00:00 UTC = day 0
export const HOUR = 3600;
export const PREHISTORY_DAYS = 360;
export const HISTORY_START = 1787724480;                      // collection deployed 2026-08-26 06:08 UTC
export const PYRE_SECONDS = 5 * 86400;                        // burn art shows fire for 5 real days
export function dayOfTs(ts) {
  if (ts >= GENESIS) return Math.floor((ts - GENESIS) / HOUR);
  const f = (Math.max(ts, HISTORY_START) - HISTORY_START) / (GENESIS - HISTORY_START);
  return -PREHISTORY_DAYS + Math.min(PREHISTORY_DAYS - 1, Math.floor(f * PREHISTORY_DAYS));
}
export const dayNow = (nowSec) => Math.floor((nowSec - GENESIS) / HOUR);

// ideology axes (-100..100): 0 Order(+) / Liberty(-), 1 Hierarchy(+) / Commons(-), 2 Old Gods(+) / New Ways(-)
export const AXES = [["Order", "Liberty"], ["Hierarchy", "Commons"], ["Old Gods", "New Ways"]];

// the nine bloods, index = Bones trait index in seed.dicts.Bones
export const BLOODS = [
  { key: "spartoi", name: "Spartoi", title: "the Sown", bones: "Bone", home: 1, color: "#d8cfb8", ideo: [10, -20, 10], wealth: 80, hexaco: [0, 0, 5, 0, 5, -5],
    houses: ["Echion", "Udaeus", "Chthonius", "Hyperenor", "Pelorus"] },
  { key: "gegeneis", name: "Gegeneis", title: "the Earth-born", bones: "Prehistoric", home: 2, color: "#9a6b3f", ideo: [25, 0, 45], wealth: 120, hexaco: [0, -5, -5, -5, 5, -15] },
  { key: "argyreoi", name: "Argyreoi", title: "the Silver Race", bones: "Silver", home: 9, color: "#b9c3cc", ideo: [-5, 35, -25], wealth: 300, hexaco: [-15, 5, 10, -10, -10, 5] },
  { key: "gorgonides", name: "Gorgonides", title: "the Gorgon-born", bones: "Coral", home: 4, color: "#e2735f", ideo: [-15, -30, 5], wealth: 200, hexaco: [5, -5, 0, 0, 10, 0] },
  { key: "anthemoessans", name: "Anthemoessans", title: "of the Siren isle", bones: "Floral", home: 3, color: "#c486c9", ideo: [-25, -15, 15], wealth: 250, hexaco: [5, 15, 0, 15, -5, 10] },
  { key: "lithinoi", name: "Laoi Lithinoi", title: "the Stone People", bones: "Petrified", home: 8, color: "#8c8c84", ideo: [45, 15, 25], wealth: 400, hexaco: [10, -15, -10, 5, 20, -15] },
  { key: "chryseoi", name: "Chryseoi", title: "the Golden Race", bones: "Gold", home: 7, color: "#e3b341", ideo: [30, 60, 20], wealth: 2000, hexaco: [-5, -10, 10, 0, 10, 0] },
  { key: "phaethontes", name: "Phaethontes", title: "the Blazing Ones", bones: "Radioactive", home: 5, color: "#9bff57", ideo: [-35, 0, -50], wealth: 800, hexaco: [-10, 10, -10, -15, 0, 25] },
  { key: "ouranidai", name: "Ouranidai", title: "the Sky-blooded", bones: "Alien", home: 6, color: "#7fd3ff", ideo: [0, 0, -10], wealth: 1500, hexaco: [15, -10, -15, 10, 0, 30] },
];

// the five Spartoi houses (the survivors of the first sowing, Apollodorus 3.4.1); Bone-blood characters belong to one
export const SPARTOI_HOUSES = [
  { name: "House of Echion", title: "the snake-man's Sown", color: "#e6dcc3", ideo: [-25, -15, 0] },
  { name: "House of Udaeus", title: "the Sown of the ground", color: "#cbbf9f", ideo: [30, -35, 10] },
  { name: "House of Chthonius", title: "the earthen Sown", color: "#b7a47c", ideo: [15, -10, 45] },
  { name: "House of Hyperenor", title: "the overbearing Sown", color: "#f0e6cf", ideo: [25, 30, 5] },
  { name: "House of Pelorus", title: "the monstrous Sown", color: "#a8987a", ideo: [-30, -20, -25] },
];

// districts: x,y on a 1000x700 sea chart; res = what the land yields
export const DISTRICTS = [
  { key: "agora", name: "Pagasae & the Agora", x: 500, y: 350, r: 70, res: "fish", kind: "agora" },
  { key: "ares", name: "the Field of Ares", x: 330, y: 250, r: 120, res: "food", kind: "quarter" },
  { key: "bear", name: "Bear Mountain", x: 180, y: 150, r: 100, res: "ore", kind: "quarter" },
  { key: "anthemoessa", name: "Anthemoessa", x: 760, y: 560, r: 70, res: "pharmaka", kind: "quarter" },
  { key: "reef", name: "the Reef", x: 680, y: 160, r: 75, res: "fish", kind: "quarter" },
  { key: "eridanus", name: "the Burning Lake of Eridanus", x: 905, y: 330, r: 45, res: "pharmaka", kind: "quarter" },
  { key: "drepane", name: "Drepane", x: 920, y: 90, r: 35, res: "fish", kind: "quarter" },
  { key: "mist", name: "the Mist-terraces", x: 520, y: 110, r: 45, res: "none", kind: "quarter" },
  { key: "strand", name: "Deucalion's Strand", x: 120, y: 470, r: 55, res: "cloth", kind: "quarter" },
  { key: "iolcus", name: "Iolcus", x: 470, y: 520, r: 85, res: "cloth", kind: "quarter" },
  { key: "grove", name: "the Grove of Ares", x: 300, y: 600, r: 40, res: "none", kind: "grove" },
  { key: "lemnos", name: "Lemnos", x: 620, y: 640, r: 60, res: "smoke", kind: "quarter" },
  { key: "forges", name: "the Chalybes forges", x: 90, y: 300, r: 40, res: "ore", kind: "forge" },
  { key: "pyra", name: "the Pyra", x: 640, y: 420, r: 32, res: "none", kind: "pyra" },
  { key: "asphodel", name: "the Asphodel Meadow", x: 840, y: 470, r: 55, res: "none", kind: "asphodel" },
];
export const D = Object.fromEntries(DISTRICTS.map((d, i) => [d.key, i]));

export const GOODS = ["food", "smoke", "cloth", "ore", "pharmaka"];
export const G = { food: 0, smoke: 1, cloth: 2, ore: 3, pharmaka: 4 };
export const BASE_PRICE = [2, 3, 8, 6, 10];
export const TARGET = [7, 4, 1, 1, 1];          // reserve each agent tries to hold
// daily output of a producer of that good, before modifiers
export const YIELD = { food: 3, fish: 3, smoke: 2, cloth: 1, ore: 1, pharmaka: 2 };

export const JOBS = ["farmer", "fisher", "miner", "weaver", "grower", "herbalist", "priest", "reaper", "noble", "servant", "rower", "pirate", "merchant", "augur"];
export const J = Object.fromEntries(JOBS.map((j, i) => [j, i]));
export const JOB_GOOD = { farmer: "food", fisher: "food", miner: "ore", weaver: "cloth", grower: "smoke", herbalist: "pharmaka", servant: "food", rower: "food" };

// status of a character
export const ST = { living: 0, shade: 1, pyre: 2, asphodel: 3, exiled: 4 };

// thoughts: [label, mood value, duration days, max stacks]
export const THOUGHTS = [
  ["", 0, 0, 0], ["hungry", -15, 1, 1], ["starving", -35, 1, 1], ["well fed", 5, 1, 1], ["craving smoke", -8, 1, 1],
  ["a good talk", 4, 3, 4], ["insulted", -6, 3, 4], ["mourning kin", -20, 20, 3], ["a friend went to the pyre", -25, 30, 2],
  ["feasted", 8, 2, 1], ["sold into a new house", -10, 15, 1], ["touched by the Maker", 30, 30, 1], ["terror at an omen", -10, 5, 1],
  ["robbed", -15, 10, 2], ["fear of the mob", -12, 7, 1], ["our blood holds the Boule", 6, 30, 1], ["our blood shut out", -8, 30, 1],
  ["haunted", -10, 5, 2], ["katharsis", 30, 3, 1], ["plague dread", -10, 3, 1], ["gold from Colchis", 15, 10, 1], ["exiled", -30, 30, 1],
  ["twice-born", 10, 10, 1], ["darkness", -6, 2, 1], ["sick", -12, 1, 1], ["awe at an omen", 8, 5, 1], ["a fine trade", 3, 2, 2],
  ["in love", 12, 8, 1], ["lost a beloved", -40, 40, 1], ["heartbroken", -18, 15, 1],
];
export const TH = Object.fromEntries(THOUGHTS.map((t, i) => [t[0].replace(/[^a-z]+/gi, "_").replace(/^_|_$/g, "").toLowerCase() || "none", i]));

// offices from the crew of the Argo
export const OFFICES = [
  { key: "tiphys", title: "the Tiphys", role: "helmsman of the Boule" },
  { key: "lynceus", title: "the Lynceus", role: "watchman who sees beneath the earth" },
  { key: "orpheus", title: "the Orpheus", role: "bard who sings down the Sirens" },
  { key: "aethalides", title: "the Aethalides", role: "archivist of the dead" },
  { key: "medea", title: "the Medea", role: "mistress of the pharmakon guild" },
  { key: "mopsus", title: "the Mopsus", role: "augur of birds and omens" },
  { key: "boread", title: "the Boread", role: "winged enforcer" },
  { key: "argus", title: "the Argus", role: "master of the shipwrights" },
];

// splinter faction names for blood-schisms
export const SPLINTERS = ["the Stone-throwers", "Sons of Talos", "the Butes Choir", "the Harpy-chasers", "the Hecate Pit", "the Ostraka", "the Second Sowing",
  "the Fleece-seekers", "the Kēres", "the Clashing Rocks", "the Ash-born", "the Chalkeioi Revenant", "the Lemnian Sisterhood", "the Doliones' Widows",
  "the Thetes' Oar", "the Ivory Gate", "Children of Phaethon", "the Helmless", "the Twice-Born", "the Pall", "the Eagle's Liver", "the Dove's Tail"];
export const SPLINTER_COLORS = ["#ff6b6b", "#4ecdc4", "#f7d794", "#a29bfe", "#fd79a8", "#55efc4", "#fab1a0", "#74b9ff", "#e17055", "#00cec9", "#ffeaa7", "#b2bec3"];

// cognomens earned by deeds (Caves of Qud style)
export const COGNOMENS = ["", "the Twice-Born", "the Hungry", "the Unburied", "the Oath-breaker", "the Thrice-Robbed", "the Exile", "the Fleece-touched",
  "the Mob-leader", "the Blood-handed", "Siren-deaf", "the Rich", "the Ruined", "Maker-touched", "Plague-spared", "the Turncoat", "the Founder", "the Ostracized", "the Prophet"];

// the Argo's speaking beam quotes the collection's own visor phrases
export const BEAM = ["SOWN MEN", "THE DRAGON SLEEPS", "CLASHING ROCKS", "KEEP ROWING", "DO NOT LISTEN", "ONE SANDAL", "LEMNOS", "HYLAS", "BUTES", "SIRENS",
  "MEDEA", "ORPHEUS", "SON OF HELIOS", "ARGO NAVIS", "IOLCUS", "STARS FELL", "MAX PAIN", "ORIGINAL SIN", "VOID ENGINE", "ESCAPING MY DEMONS", "GREAT RESTORATION"];

// director incidents: key, cost, weight
export const INCIDENTS = [
  ["pall", 12, 3], ["harpies", 22, 3], ["plague", 45, 2], ["sirens", 28, 2], ["talos", 16, 2], ["doliones", 38, 1.5],
  ["featherbolts", 16, 2], ["ghost", 10, 2], ["lemnian", 80, 0.6], ["bounty", 18, 2.5], ["prometheus", 14, 1.5],
];
