// Story sifting (James Ryan's "curating simulated storyworlds", Kreminski's Felt): patterns over the event stream
// become front-page stories. Memory lives in world/sift.json so arcs can span seasons and generations.
import { hash32 } from "./rng.js";
import { DISTRICTS } from "./lore.js";

const HARM = new Set(["brawl", "robbery", "death", "lemnian"]);
const PROPHECY = { "SIRENS": ["sirens", "sirens_sung"], "DO NOT LISTEN": ["sirens"], "LEMNOS": ["lemnian"], "CLASHING ROCKS": ["talos"], "MEDEA": ["plague"], "STARS FELL": ["star", "pall"],
  "MAX PAIN": ["riot", "famine"], "SOWN MEN": ["riot", "doliones"], "ORIGINAL SIN": ["lemnian", "ostracism"], "BUTES": ["sirens"], "THE DRAGON SLEEPS": ["fleece"], "ESCAPING MY DEMONS": ["return"], "GREAT RESTORATION": ["bounty", "return"] };
const BASE = { revenge: 70, risefall: 65, thricebroken: 55, widowed: 50, lastline: 60, feud: 75, street: 70, prophecy: 85, turncoat: 45, generation: 90, burn: 95, ruling: 90, fleece: 80, schism: 60,
  lemnian: 85, dissolve: 50, bigfamily: 40, doliones: 70, election: 45, firstleaf: 55, riot: 55, plague: 60, sirens: 65, talos: 40, pall: 45, bounty: 35, ostracism: 55, law: 30, famine: 50, harpies: 45, beam: 70, prophet: 90, temple: 50, monument: 60, iconoclasm: 75, festival: 55, faithdies: 55 };

export function emptySift() { return { harm: {}, office: {}, riot: {}, love: {}, breaks: {}, defect: {}, feud: {}, beams: [], gen: { max: 1 }, freq: {}, firstLeaf: {}, stories: [] }; }

/** sift one day's events (all, including hidden traces); returns new stories */
export function sift(M, day, events, w, name) {
  const A = w.A, out = [], who = (i) => (i >= 0 ? name(i) : "someone"), where = (x) => (x >= 0 ? DISTRICTS[x].name : "the archipelago");
  const add = (kind, actors, title, text, extra = 1) => {
    const f = (M.freq[kind] || []).filter((d) => d > day - 30); M.freq[kind] = f;
    const rarity = 1 / (1 + f.length / 4), famous = actors.some((i) => i >= 0 && i < 9999 && (A.office[i] >= 0 || A.cognomen[i])) ? 1.2 : 1;
    const score = Math.round(BASE[kind] * rarity * famous * extra * (0.9 + (hash32(kind, day, actors[0]) % 20) / 100));
    f.push(day); out.push({ id: `${day}:${kind}:${actors.join(",")}`, day, kind, title: title.charAt(0).toUpperCase() + title.slice(1), text, actors, score });
  };
  for (const e of events) {
    const a = e.a, b = e.b;
    // harms: remember who wronged whom; strike back = revenge; lines that wrong each other across generations = feud
    if (HARM.has(e.t) && a >= 0 && b >= 0 && a !== b) {
      const [doer, victim] = e.t === "death" ? [b, a] : [a, b];
      const wr = M.harm[doer] && M.harm[doer][victim];
      const pairKey = doer + ">" + victim; M.avenged = M.avenged || {};
      if (wr && day - wr >= 10 && day - wr < 150 && !(M.avenged[pairKey] > day - 120)) { M.avenged[pairKey] = day; add("revenge", [doer, victim], `Revenge in ${where(e.x)}`, `${who(victim)} wronged ${who(doer)} ${day - wr} days ago. Today ${who(doer)} answered${e.t === "death" ? " with death" : e.t === "robbery" ? " by taking their purse" : " with fists"}.`); delete M.harm[doer][victim]; }
      (M.harm[victim] || (M.harm[victim] = {}))[doer] = day;
      const ks = Object.keys(M.harm[victim]); if (ks.length > 4) delete M.harm[victim][ks.sort((p, q) => M.harm[victim][p] - M.harm[victim][q])[0]];
      const la = A.lineage[doer], lb = A.lineage[victim];
      if (la !== lb && (A.kind[doer] || A.kind[victim])) {
        const key = Math.min(la, lb) + ":" + Math.max(la, lb), fd = M.feud[key];
        if (fd && fd.last !== day && (A.gen[doer] > fd.gen || A.gen[victim] > fd.gen)) { const g = Math.max(A.gen[doer], A.gen[victim]); add("feud", [doer, victim, la, lb], `A feud reaches generation ${g + 1}`, `The houses of ${who(la)} and ${who(lb)} have hurt each other since their founders did. Now their grandchildren carry it on: ${who(doer)} against ${who(victim)} in ${where(e.x)}.`, 1 + g * 0.3); fd.gen = g; }
        M.feud[key] = fd ? { ...fd, last: day } : { gen: Math.max(A.gen[doer], A.gen[victim]), last: day, since: day };
      }
    }
    switch (e.t) {
      case "office": M.office[a] = day; if (M.riot[a] && day - M.riot[a] < 240) add("street", [a], "From the street to the Boule", `${who(a)} led a riot ${day - M.riot[a]} days ago. Today they took office as ${e.s}.`); break;
      case "riot": M.riot[a] = day; { let x = {}; try { x = JSON.parse(e.s); } catch { } add("riot", [a], `${where(e.x)} rises`, `${e.v} took to the streets of ${where(e.x)} behind ${who(a)}. ${x.dead ? x.dead + " fell. " : ""}${x.jailed ? x.jailed + " were dragged to the gaol" : "No Reaper stood in their way"}, and ${x.looted || 0} rations were looted.`, Math.min(2, e.v / 60)); } break;
      case "plague": add("plague", [a], `Plague in ${where(e.x)}`, `The Gorgon-snake's sickness is loose in ${where(e.x)}; ${e.v} have the fever. The herbalists' prices climb.`); break;
      case "sirens": add("sirens", [], "The Sirens sang", `No Orpheus answered the song from Anthemoessa. ${e.v} went into the meadow of bones.`, 1 + e.v / 10); break;
      case "sirens_sung": add("sirens", [a], "Out-sung", `The Sirens sang, and ${who(a)} sang louder. ${e.v} who would have leapt stayed aboard.`); break;
      case "talos": add("talos", [], "Talos walks the strait", "The bronze guardian is back on the Clashing Rocks. Every price in the Agora rises a third."); break;
      case "pall": add("pall", [], "A Pall of Darkness", "Black chaos from heaven: no stars, no fire, no work tomorrow."); break;
      case "bounty": add("bounty", [], `A fat season in ${where(e.x)}`, `The soil of ${where(e.x)} gave double; for once nobody there went hungry.`); break;
      case "harpies": add("harpies", [], `Harpies over ${where(e.x)}`, `Winged thieves fouled the stores of ${where(e.x)}: ${e.v} rations ruined.`); break;
      case "famine": add("famine", [], "Famine", `${e.v} Minyans are hungry while the granaries stand full.`, Math.min(2, e.v / 800)); break;
      case "ostracism": add("ostracism", [a], `${who(a).split(" ")[0]} is cast out`, `The ekklesia scratched ${who(a)}'s name on bone shards. Sixty days of exile.`); break;
      case "election": add("election", [], "A new helm for the Boule", `The coalition is now ${e.s}.`); break;
      case "prophet": { const [people, god] = (e.s || "").split("|"); add("prophet", [a], `A prophet of ${god}`, `${who(a)} has begun to preach ${god}. The faithful call themselves ${people}.`, 1.2); break; }
      case "faithschism": { const [nf, of] = (e.s || "").split("|"); add("schism", [a], `${nf} breaks with ${of}`, `${who(a)} led the dissenters out of ${of}. They pray apart now.`); break; }
      case "temple": add("temple", [a], `A temple for ${e.s}`, `${e.s} raised a house of stone for their god in ${where(e.x)}.`); break;
      case "monument": add("monument", [a], `A stele in ${where(e.x)}`, `The Boule raised ${e.s} so no one forgets.`); break;
      case "iconoclasm": add("iconoclasm", [a], `${e.s} torn down`, `Rioters led by ${who(a)} broke ${e.s} in ${where(e.x)}. What it remembered is now disputed.`, 1.2); break;
      case "festival": if (/remembrance/.test(e.s)) add("festival", [], e.s.charAt(0).toUpperCase() + e.s.slice(1), `${e.v} Minyans kept the day.`); break;
      case "faithdies": add("faithdies", [], `${e.s} is no more`, `The last believer of ${e.s} has gone. Their god goes unworshipped.`); break;
      case "beam": add("beam", [], "The Argo speaks", `The speaking oak in the prow said "${e.s}". The augurs are already arguing about what it means.`); break;
      case "ostracism": case "exile_end": break;
      case "death":
        if (a >= 0 && a < 9999) { M.breaks[a] = (M.breaks[a] || 0) + 1; if (M.breaks[a] === 3) add("thricebroken", [a], "Thrice broken, thrice risen", `${who(a)} has been broken three times now (${e.s}). Each time the bones knit again. The Reapers have started to leave a little room by the gate.`); }
        if (a >= 0 && M.office[a] && day - M.office[a] < 90) add("risefall", [a], "A short reign", `${who(a)} held office only ${day - M.office[a]} days before falling (${e.s}).`);
        break;
      case "love": M.love[a] = [b, day]; M.love[b] = [a, day]; break;
      case "heartbreak": delete M.love[a]; delete M.love[b]; break;
      case "defect": { const prev = M.defect[a]; if (prev && prev.from === e.v) add("turncoat", [a], "The turncoat returns", `${who(a)} left their faction ${day - prev.day} days ago, and now crawls back.`); M.defect[a] = { from: A.birthFac[a], day }; break; }
      case "beam": M.beams.push({ day, phrase: e.s }); M.beams = M.beams.filter((x) => x.day > day - 20); break;
      case "burn": add("burn", [a], `${who(a).split(" ")[0]} is unmade by fire`, `On the chain, ${who(a)} was sent to the dead address. In the world, the only true death the Sown can die: the Pyra.`); break;
      case "ruling": add("ruling", [a], "The Maker's hand", `The Maker reached into the world and remade ${who(a)}.`); break;
      case "fleece": add("fleece", [a], "News of the Fleece", `${e.s}: ${who(a)}.`); break;
      case "schism": add("schism", [a], `Schism: ${e.s}`, `${who(a)} broke away and founded ${e.s}.`); break;
      case "lemnian": add("lemnian", [a], "A Lemnian night", `In ${where(e.x)}, ${e.s} murdered ${e.v} of their neighbours in one night.`); break;
      case "doliones": add("doliones", [], "Allies in the dark", `In ${where(e.x)}, two allied factions fought each other by night: ${(e.s || "").replace("|", " against ")}. ${e.v} fell.`); break;
      case "dissolve": add("dissolve", [], `${e.s} is no more`, `The last members of ${e.s} drifted back to their blood.`); break;
      case "birth": {
        const c = e.v; if (c >= 0 && A.gen[c] > M.gen.max) { M.gen.max = A.gen[c]; add("generation", [c, a, b], `The ${["", "first", "second", "third", "fourth", "fifth", "sixth"][A.gen[c]] || A.gen[c] + "th"} generation`, `${who(c)} is the first Minyan of generation ${A.gen[c]}: born to ${who(a)} and ${who(b)}, descended from ${who(A.lineage[c])}.`, 1.3); }
        if (a >= 0 && a < 9999 && !M.firstLeaf[a]) { M.firstLeaf[a] = day; if (A.office[a] >= 0 || A.cognomen[a]) add("firstleaf", [a, c], `A child for ${who(a).split(" ")[0]}`, `${who(a)} has sown their first Leaf: ${who(c)}. It will age; its parent will not.`); }
        break;
      }
    }
    // the beloved dies: love that lasted
    if (e.t === "death" && a >= 0 && M.love[a]) {
      const [p, d0] = M.love[a]; delete M.love[a]; delete M.love[p];
      if (day - d0 > 40) add("widowed", [a, p], A.kind[a] ? "A love ends at the Pyra" : "A love interrupted", A.kind[a] ? `${who(a)} and ${who(p)} loved for ${day - d0} days. Now one is ash and the other must learn to be alone.` : `${who(a)} is broken, and ${who(p)}, who has loved them for ${day - d0} days, sits by the bones in Asphodel waiting for them to knit.`);
    }
    // prophecy fulfilled: an event the Argo's beam foretold
    for (const bm of M.beams) { const kinds = PROPHECY[bm.phrase]; if (kinds && kinds.includes(e.t) && !bm.done) { bm.done = true; add("prophecy", [a], "The beam spoke true", `${day - bm.day} days ago the Argo's oak said "${bm.phrase}". Today: ${e.t === "riot" ? "riot in " + where(e.x) : e.t === "sirens" || e.t === "sirens_sung" ? "the Sirens sang" : e.t === "lemnian" ? "the night of knives" : e.t === "plague" ? "plague in " + where(e.x) : e.t === "talos" ? "Talos walks the strait" : e.t}.`); } }
  }
  // last of a line: a lineage with descendants that now has none alive (checked weekly)
  if (day % 7 === 0) {
    const alive = {}, ever = {}; for (let i = 9999; i < w.N; i++) { const L = A.lineage[i]; ever[L] = (ever[L] || 0) + 1; if (A.status[i] === 0) alive[L] = (alive[L] || 0) + 1; }
    M.lines = M.lines || {};
    for (const [L, n] of Object.entries(ever)) { if (n >= 3 && !alive[L] && !M.lines[L]) { M.lines[L] = day; add("lastline", [Number(L)], `The line of ${who(Number(L)).split(" ")[0]} has no living Leaves`, `${n} children and grandchildren of ${who(Number(L))} were born. None still lives. The Argonaut walks on alone.`); } if (alive[L]) delete M.lines[L]; }
  }
  out.sort((p, q) => q.score - p.score || (p.id < q.id ? -1 : 1));
  const keep = out.filter((x) => x.score >= 15).slice(0, 6);
  M.stories = M.stories.concat(keep.length ? keep : out.slice(0, 1)).slice(-600);
  // prune memory
  for (const k of Object.keys(M.riot)) if (day - M.riot[k] > 240) delete M.riot[k];
  for (const k of Object.keys(M.office)) if (day - M.office[k] > 120) delete M.office[k];
  for (const k of Object.keys(M.defect)) if (day - M.defect[k].day > 200) delete M.defect[k];
  for (const k of Object.keys(M.feud)) if (day - M.feud[k].last > 400) delete M.feud[k];
  return out;
}
