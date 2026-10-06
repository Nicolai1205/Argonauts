// Real Argonaut art for anyone: the on-chain renderer's own composition (ArgonautsRendererV5._render, ported in compose.js)
// applied to a character's traits. Tokens use their exact chain sprite; Leaves get their inherited and heirloom traits drawn.
import "./compose.js";
let ART = null, loading = null;
export const loadArt = () => (loading ??= fetch("data/art.json").then((r) => r.json()).then((j) => (ART = j)));
const cache = new Map();
export function traitsOf(seed, A, i) {
  const d = seed.dicts, nm = ART.names, ix = (slot, name) => Math.max(0, nm[slot].indexOf(name));
  const bones = d.Bones[A.bones[i]], cloak = d.Cloak[A.cloak[i]];
  return [ix(0, d.Palette[A.palette[i]]), ix(1, bones === "Floral" ? (cloak === "none" ? "Floral (bare)" : "Floral (dressed)") : bones), ix(2, cloak), i < 9999 && seed.relic[i] ? 1 : 0,
    ix(4, d.Sight[A.sight[i]]), ix(5, d.Artifact[A.artifact[i]]), ix(6, d.Crown[A.crown[i]])];
}
/** resolves to an <img> of the character's portrait (24x24 SVG) */
export async function portrait(seed, A, i) {
  await loadArt();
  const t = traitsOf(seed, A, i), key = i + ":" + t.join(",");
  if (cache.has(key)) return cache.get(key);
  const svg = globalThis.ArgCompose(ART.art, t, { dragon: i < 9999 && !!seed.breath[i], marks: globalThis.ArgMarks(ART.art, i + 1, t[1]) });
  const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const p = img.decode().then(() => img); cache.set(key, p); return p;
}
