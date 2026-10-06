// The Codex: the canon of the world, written once, with the living world's numbers woven in.
import { BLOODS, SPARTOI_HOUSES, DISTRICTS, OFFICES, BEAM, ST } from "./sim/lore.js";
import { MONTHS, dateOf } from "./sim/culture.js";
import { CITIES } from "./sim/war.js";
import { CRAFTS } from "./sim/drift.js";
import { myths } from "./sim/rumor.js";

const BLOOD_LORE = {
  spartoi: ["Apollodorus 3.4.1; Apollonius 3.1354ff", "Dragon's teeth sown in the Field of Ares. Jason threw a stone among the first crop and they killed each other until five were left: Echion, Udaeus, Chthonius, Hyperenor, Pelorus. Their houses still quarrel.", "The many. Farmers, rowers, soldiers: fashionable, quarrelsome, the backbone of every vote."],
  gegeneis: ["Apollonius 1.936-1011", "Six-armed Earthborn of Bear Mountain, cut down at Chytus harbour and stacked on the shore like timber. The city is built from their bodies.", "Old, stubborn, quarrymen and wall-builders, keepers of death-cloaks and the Reapers' trade."],
  argyreoi: ["Hesiod, Works and Days 127-142", "Hesiod's Silver Race: a hundred years of childhood, then a short, foolish adulthood of insult and impiety. After death they became the blessed spirits under the earth.", "Pampered gentry of Iolcus with long memories and short tempers."],
  gorgonides: ["Ovid, Metamorphoses 4.740-752", "When Perseus set Medusa's severed head on seaweed, the weed drank her poison and hardened into coral. Alive below the water, stone above it.", "Divers and reef-builders who go bare-headed and mistrust the land."],
  anthemoessans: ["Apollonius 3.844-868, 4.892; Odyssey 12.45", "From the Sirens' flowery isle, where the meadow is a heap of bones, and from the Prometheion, the flower that grew from the Titan's dripping ichor and screams when cut.", "Gardeners, herbalists and the Siren-haunted; their medicine is made from suffering."],
  lithinoi: ["Apollodorus 1.7.2; Pindar, Olympian 9.43-46", "After the flood Deucalion and Pyrrha threw stones over their shoulders, and the stones became a people: laas, stone; laos, people.", "Few, patient, aristocratic; in the art they never move. They keep the law of the flood."],
  chryseoi: ["Hesiod, Works and Days 109-126", "The Golden Race lived without toil and died as if falling asleep. Afterwards they became spirits clothed in mist, who watch judgements and cruel deeds and give wealth.", "The richest blood: watchers on the Mist-terraces, judges and lenders."],
  phaethontes: ["Apollonius 4.596-626, 4.727ff", "Phaethon fell burning into the Eridanus, and the lake still smoulders; birds that fly over it plunge into the flame. Helios' line, whose eyes shoot a golden gleam.", "Twenty-five, feared, glowing; alchemists of the forbidden lake."],
  ouranidai: ["Apollonius 4.990; Odyssey 8.555", "Of the blood of Uranus, like the Phaeacians whose ships steer themselves and know men's thoughts.", "Nine strangers on Drepane: serene, prophetic, unreadable."],
};
const PLACE_LORE = {
  agora: "The launch harbour where the Argo was first pushed into the sea; now the market and the seat of the Boule.", ares: "Where the dragon's teeth were sown. The largest city, and the hungriest.",
  bear: "Arkton Oros, home of the six-armed Earthborn; mines, snow and grudges.", anthemoessa: "The Sirens' isle. Flowers grow from the dead here; DO NOT LISTEN.",
  reef: "Coral born of the Gorgon's blood, and the Gorgonides who dive it.", eridanus: "Phaethon's lake, still burning. An exclusion zone of glowing people.",
  drepane: "The Sickle, far island of the self-steering ships.", mist: "Terraces wrapped in Hesiod's mist, where the Golden Race keeps watch.",
  strand: "Where Deucalion threw the stones that became people.", iolcus: "Pelias' city, where the voyage began with one sandal; now the Silver Race's halls.",
  grove: "The Grove of Ares, where the Fleece once hung and THE DRAGON SLEEPS.", lemnos: "Hephaestus' smoking island, where the women once murdered their men in a night and told visitors they had gone away.",
  forges: "The Chalybes, most wretched of men, who work iron in the dark.", pyra: "The pyre on the headland. Burned tokens lie here five real days, while their art still shows fire; mortal Leaves burn for three.",
  asphodel: "The Asphodel Meadow. Graves with oars planted on them, the unmade among them, and broken Argonauts waiting for their bones to knit.",
};

export function renderCodex(w, seed, view, esc, dayLabel, linkify) {
  const A = w.A, alive = (i) => A.status[i] === ST.living, bloodCount = BLOODS.map(() => 0); let leaves = 0, graves = 0, unmade = 0;
  for (let i = 0; i < w.N; i++) { if (alive(i)) { if (i < 9999) bloodCount[A.bones[i]]++; else leaves++; } if (A.status[i] === ST.asphodel) { graves++; if (i < 9999) unmade++; } }
  const deeds = (w.maker || {}), S = [];
  S.push(`<h3>I. The voyage</h3>
  <p>Before the world there was the <b>Maker</b>, whom the chain knows as alphacentaurikid and the visors call ACK. On the twenty-sixth day of the month the chain calls August, the Maker sowed ten thousand dragon's teeth, and out of the furrows came the <b>Minyai</b>: skeletons, already past death, each with its own bones, cloak, crown and sight. That was <b>the Sowing</b>, and everything that happened between it and the first day of the Reckoning is remembered as prehistory.</p>
  <p>The Minyai are bone. Wounds, plague and hunger only <i>break</i> them; their pieces are carried to the Asphodel Meadow and knit again. <b>Only fire unmakes them</b>, and fire comes only from the chain: when a holder sends an Argonaut to the dead address, it burns on the Pyra for as long as its art shows flame and is then buried with an oar on its mound. So far ${unmade} have been unmade.</p>
  <p>The Minyai cannot age, but they can love, and lovers sow children. The children are <b>the Leaves</b>, after Homer: <i>"As is the generation of leaves, so is that of men"</i> (Iliad 6.146). Leaves are born, grow old within days and truly die. ${leaves.toLocaleString()} live now; ${graves - unmade} lie in the meadow.</p>
  <p>Above it all hangs the <b>Argo</b>, whose prow holds a beam cut from Dodona's oak that speaks with a human voice. When the Maker changes the renderer, the beam speaks one of the visor phrases (${BEAM.slice(0, 8).join(", ")} …) and the whole city's mind turns. And somewhere in the Grove of Ares there is still one <b>Golden Fleece</b>, worn by a single Argonaut: the prize every faction covets.</p>
  <p>Nothing in the world is steered. The chain is <b>Moira</b>, fate: sales move an Argonaut to a new house and bring gold from Colchis, swaps exchange hostages under the law of xenia, rulings of the Maker remake a character, burns light the Pyra. Everything else the Minyai do themselves.</p>`);
  S.push(`<h3>II. The bloods</h3><p class="muted">Each Argonaut belongs to a blood by its Bones trait. The Sown are divided further into the five houses of the first sowing.</p>` +
    BLOODS.map((B, k) => { const L = BLOOD_LORE[B.key]; return `<div class="law"><b style="color:${B.color}">${esc(B.name)}</b>, ${esc(B.title)} <span class="num">${B.bones} bones · ${bloodCount[k].toLocaleString()} living</span><p>${esc(L[1])}</p><p class="muted">${esc(L[2])} <i>Source: ${esc(L[0])}.</i></p></div>`; }).join("") +
    `<p class="muted">The five houses of the Sown: ${SPARTOI_HOUSES.map((h) => `${esc(h.name)} (${esc(h.title)})`).join(", ")}.</p>`);
  S.push(`<h3>III. The places</h3>` + DISTRICTS.map((d, k) => {
    const c = CITIES.includes(k) && w.war ? w.war : null, dm = c ? c.dom[k] : null;
    const crafts = w.crafts ? CRAFTS.map((cr, ci) => ({ n: cr.name, v: w.crafts[k][ci] })).filter((x) => x.v >= 70).map((x) => x.n) : [];
    return `<div class="law"><b>${esc(d.name)}</b>${c && c.lord[k] !== k ? ` <span class="num">vassal of ${esc(DISTRICTS[c.lord[k]].name)}</span>` : ""}<p>${esc(PLACE_LORE[d.key] || "")}</p>${dm ? `<p class="muted">${dm.pop} adults · ${esc(w.factions[dm.faction] ? w.factions[dm.faction].name : "")} · ${esc(w.faiths[dm.faith] ? w.faiths[dm.faith].name : "")}${crafts.length ? " · masters of " + esc(crafts.join(", ")) : ""} · cohesion ${Math.round(c.S[k] * 100)}</p>` : ""}</div>`; }).join(""));
  S.push(`<h3>IV. The powers and offices</h3>
  <p><b>The Maker</b> acts only through the chain: setTraits remakes a character (it has touched #8393 and #7920), setRenderer makes the Argo speak, new contracts become new stars, and the DeadClock's notice tolls over Asphodel. On the fifth day of October the Maker built a barrel of oil for #8985 alone, thirty-five minutes after its holder burned it.</p>
  <p><b>Charon</b> takes two obols from every funeral, which is how money leaves the world. <b>The Reapers</b> (the Death-cloaked) carry the broken to Asphodel, bury the dead and keep the watch when the Boule pays them.</p>
  <p><b>Offices</b> are named for the crew of the Argo: ${OFFICES.map((o) => `${esc(o.title)}, ${esc(o.role)}`).join("; ")}.</p>`);
  S.push(`<h3>V. The calendar</h3><p>${MONTHS.map((m, k) => `${k + 1}. ${m}`).join(" · ")}. Each month is thirty days and the year 360: one sim day for every real hour, so a year passes in fifteen real days. The Pagasaia opens the year; on 11 Anthesterion the dead walk the city for three days; the Games of Kolchis close the harvest. Any memory still strong after a year becomes a festival of its own.</p>`);
  // the ages: thirty-day eras named by their most salient story
  const st = (w.storyLog || []), eras = [];
  for (let d0 = -360; d0 < w.day; d0 += 30) { const win = st.filter((x) => x.day >= d0 && x.day < d0 + 30).sort((a, b) => b.score - a.score)[0]; if (win) eras.push({ d0, title: win.era || ("the Age of " + win.title), text: win.text }); }
  S.push(`<h3>VI. The ages</h3>${eras.length ? eras.map((e) => `<div class="law"><b>${esc(e.title.charAt(0).toUpperCase() + e.title.slice(1))}</b><span class="num">${dayLabel(e.d0)}</span><p>${linkify(e.text)}</p></div>`).join("") : '<p class="muted">The ages are named from the front page; open it once and return.</p>'}`);
  // dynasties
  const lines = {}; for (let i = 9999; i < w.N; i++) { const L = A.lineage[i]; const o = lines[L] || (lines[L] = { n: 0, alive: 0, gen: 0 }); o.n++; if (alive(i)) o.alive++; o.gen = Math.max(o.gen, A.gen[i]); }
  const top = Object.entries(lines).sort((a, b) => b[1].alive - a[1].alive || b[1].n - a[1].n).slice(0, 12);
  S.push(`<h3>VII. Dynasties</h3><p class="muted">Lines are named for the Argonaut who sowed them; the founders never age, so the oldest houses are watched over by their own beginning.</p>${top.map(([L, o]) => `<div class="law"><a class="who" data-i="${L}">${esc(view.name(Number(L)))}</a><span class="num">${o.alive} living of ${o.n} ever born · ${o.gen} generations</span></div>`).join("") || '<p class="muted">No lines yet.</p>'}`);
  // faiths and their accounts of the great memories
  const mem = (w.memory || []).filter((m) => ["burn", "war", "lemnian", "prophet"].includes(m.kind)).slice(-6).reverse();
  S.push(`<h3>VIII. How the faiths tell it</h3>${mem.map((m) => `<div class="law"><b>${esc(m.name.charAt(0).toUpperCase() + m.name.slice(1))}</b><span class="num">${dayLabel(m.day)}</span>${myths(w, m, view.name).map((x) => `<p><span style="color:${x.color}">${esc(x.faith)}:</span> ${linkify(x.text)}</p>`).join("")}</div>`).join("") || '<p class="muted">No great memories yet.</p>'}`);
  S.push(`<h3>IX. Relics</h3><p class="muted">Things that remember every hand they passed through: spears raised over victories, the first teeth of new gods, the cradle-teeth of each new generation, the shears that cut the Fleece.</p>${(w.relics || []).slice().reverse().slice(0, 30).map((r) => `<div class="law"><b>${esc(r.name.charAt(0).toUpperCase() + r.name.slice(1))}</b><span class="num">made ${dayLabel(r.born)} · ${r.history.length} hands</span><p>${r.history.map(([d, h, how]) => `<a class="who" data-i="${h}">${esc(view.name(h).split(" ").slice(0, 2).join(" "))}</a> (${esc(how)})`).join(" → ")}</p></div>`).join("") || '<p class="muted">None yet.</p>'}`);
  S.push(`<h3>X. The chain beneath</h3><p>The world is computed from the real Argonauts collection (contract 0x387c…392c) by a deterministic engine: every Argonaut's traits, every transfer since the Sowing (replayed as prehistory), and every new block since. Twenty-two tokens had been burned by the sixth of October, twenty-one of them by one wallet in two days of September; #8985 burned on the fifth of October. The art has changed eight times, rulings have touched two tokens, and the visors carry forty-one phrases from the Argonautica and the Maker's own world.</p>`);
  return S.join("");
}
