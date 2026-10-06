// Tiny stick skeletons drawn from each Argonaut's real traits, cached per look (5 frames: 4 walking + idle).
const BONE = { Bone: "#ece4cc", Prehistoric: "#b8925e", Silver: "#c9d1d9", Coral: "#ef8a73", Floral: "#e3b4dc", Petrified: "#8f8f87", Gold: "#f2c14e", Radioactive: "#a6ff63", Alien: "#86dcff" };
const CLOAK = { Death: "#141418", Clergy: "#e9e6dc", Royalty: "#6b2d8f", Servant: "#7c7c74", Ivory: "#efe6cf" };
const W = 18, H = 28, PX = 2;                    // design box (units) and cache pixels per unit
const cache = new Map();

export function lookOf(seed, A, i, job, tunic, stage) {
  const d = seed.dicts;
  return { bones: d.Bones[A.bones[i]], cloak: d.Cloak[A.cloak[i]], crown: d.Crown[A.crown[i]], sight: d.Sight[A.sight[i]], art: d.Artifact[A.artifact[i]], breath: i < 9999 ? seed.breath[i] : 0, job, tunic: A.kind[i] ? tunic : null, stage: A.kind[i] ? stage : 2 };
}
const keyOf = (L) => `${L.bones}|${L.cloak}|${L.crown}|${L.sight}|${L.art}|${L.breath}|${L.job}|${L.tunic}|${L.stage}`;

/** returns {canvas, w, h} holding 5 frames side by side */
export function figure(L) {
  const k = keyOf(L); let f = cache.get(k); if (f) return f;
  const c = document.createElement("canvas"); c.width = W * PX * 5; c.height = H * PX;
  const g = c.getContext("2d"); g.scale(PX, PX); g.lineCap = "round"; g.lineJoin = "round";
  for (let fr = 0; fr < 5; fr++) { g.save(); g.translate(fr * W, 0); draw(g, L, fr); g.restore(); }
  f = { canvas: c, w: W * PX, h: H * PX }; cache.set(k, f); return f;
}

function draw(g, L, fr) {
  const bone = BONE[L.bones] || "#ece4cc", sw = fr === 4 ? 0 : [1, 0.35, -1, -0.35][fr];   // stride
  const cx = 9, neck = 10, hip = 18;
  // tool behind the body
  if (L.job === "reaper") { g.strokeStyle = "#5a4a3a"; g.lineWidth = 0.9; line(g, 14, 6, 14, 26); g.strokeStyle = "#c9ced6"; g.lineWidth = 1.1; g.beginPath(); g.moveTo(14, 6); g.quadraticCurveTo(9, 4, 6.5, 7.5); g.stroke(); }
  if (L.job === "miner") { g.strokeStyle = "#6b5a46"; g.lineWidth = 0.9; line(g, 13.5, 11, 16, 20); g.strokeStyle = "#9aa0a8"; line(g, 11.5, 11.5, 16, 9.5); }
  if (L.job === "fisher" || L.job === "rower") { g.strokeStyle = "#7a6342"; g.lineWidth = 0.7; line(g, 13, 14, 17.5, 4); }
  // legs
  g.strokeStyle = bone; g.lineWidth = 1.3;
  line(g, cx, hip, cx - 2 + sw * 2.2, 26.5); line(g, cx, hip, cx + 2 - sw * 2.2, 26.5);
  // Leaves wear a short tunic in their faction's colour; elders stoop on a staff
  if (L.tunic) { g.fillStyle = L.tunic; g.beginPath(); g.moveTo(cx - 3, neck + 0.5); g.lineTo(cx + 3, neck + 0.5); g.lineTo(cx + 4, 19.5); g.lineTo(cx - 4, 19.5); g.closePath(); g.fill(); }
  if (L.stage === 3) { g.strokeStyle = "#7a6342"; g.lineWidth = 0.8; line(g, cx + 5, 12, cx + 6.5, 26.5); }
  // robe over the legs
  if (L.cloak !== "none" && CLOAK[L.cloak]) {
    g.fillStyle = CLOAK[L.cloak]; g.beginPath(); g.moveTo(cx - 3, neck + 0.5); g.lineTo(cx + 3, neck + 0.5); g.lineTo(cx + 4.8, 23.5); g.lineTo(cx - 4.8, 23.5); g.closePath(); g.fill();
    if (L.cloak === "Royalty") { g.strokeStyle = "#e3b341"; g.lineWidth = 0.6; line(g, cx - 4.6, 23.2, cx + 4.6, 23.2); line(g, cx, neck + 1, cx, 23); }
    if (L.cloak === "Clergy") { g.strokeStyle = "#c9a227"; g.lineWidth = 0.6; line(g, cx, 12, cx, 16); line(g, cx - 1.5, 13.3, cx + 1.5, 13.3); }
  } else if (!L.tunic) {
    // spine and ribs
    g.strokeStyle = bone; g.lineWidth = 1.2; line(g, cx, neck, cx, hip);
    g.lineWidth = 0.7; line(g, cx - 2.2, 12.5, cx + 2.2, 12.5); line(g, cx - 2, 14.5, cx + 2, 14.5); line(g, cx - 1.6, 16.3, cx + 1.6, 16.3);
  }
  // arms swing opposite to legs
  g.strokeStyle = bone; g.lineWidth = 1.1;
  line(g, cx, neck + 1.5, cx - 3.5 - sw * 1.6, 17); line(g, cx, neck + 1.5, cx + 3.5 + sw * 1.6, 17);
  // the Golden Fleece hangs over the shoulders
  if (L.crown === "Golden Fleece") { g.fillStyle = "#f2c14e"; g.beginPath(); g.ellipse(cx, neck + 2.5, 5, 3, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,210,90,.35)"; g.beginPath(); g.arc(cx, 12, 9, 0, Math.PI * 2); g.fill(); }
  // skull
  g.fillStyle = bone; g.beginPath(); g.arc(cx, 6.2, 3.6, 0, Math.PI * 2); g.fill(); g.fillRect(cx - 2, 8.6, 4, 1.6);
  if (L.bones === "Radioactive") { g.fillStyle = "rgba(166,255,99,.25)"; g.beginPath(); g.arc(cx, 6.2, 6, 0, Math.PI * 2); g.fill(); }
  if (L.bones === "Floral") { g.fillStyle = "#ff8fb1"; g.beginPath(); g.arc(cx + 2.6, 3.4, 1.1, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#1a1410"; g.fillRect(cx - 2.1, 5.4, 1.4, 1.4); g.fillRect(cx + 0.7, 5.4, 1.4, 1.4); g.fillRect(cx - 0.3, 7.4, 0.6, 0.8);
  // death hood
  if (L.cloak === "Death") { g.fillStyle = "#141418"; g.beginPath(); g.arc(cx, 6, 4.4, Math.PI, 0); g.lineTo(cx + 4.4, 9); g.lineTo(cx + 3.6, 9); g.lineTo(cx + 3.6, 6.3); g.lineTo(cx - 3.6, 6.3); g.lineTo(cx - 3.6, 9); g.lineTo(cx - 4.4, 9); g.closePath(); g.fill(); }
  // eyes
  const s = L.sight;
  if (s === "3D Glasses") { g.fillStyle = "#e33"; g.fillRect(cx - 2.6, 5.1, 2, 1.8); g.fillStyle = "#39f"; g.fillRect(cx + 0.6, 5.1, 2, 1.8); }
  else if (s === "Digital") { g.fillStyle = "#3f3"; g.fillRect(cx - 3, 5.1, 6, 1.6); }
  else if (s === "Eye Patch") { g.fillStyle = "#000"; g.fillRect(cx - 2.4, 5, 2, 2); g.strokeStyle = "#000"; g.lineWidth = 0.4; line(g, cx - 3.6, 4.2, cx + 3.6, 6.4); }
  else if (s === "Shades") { g.fillStyle = "#050505"; g.fillRect(cx - 3, 5, 6, 1.8); }
  else if (s !== "none" && s) { const gold = s !== "Glasses"; g.strokeStyle = gold ? "#e3b341" : "#333"; g.lineWidth = 0.5; g.strokeRect(cx - 2.6, 5, 2, 1.8); g.strokeRect(cx + 0.6, 5, 2, 1.8); }
  // crowns
  const c = L.crown;
  if (c === "Oarsman's Band") { g.fillStyle = "#8a5a2b"; g.fillRect(cx - 3.7, 3.6, 7.4, 1.1); }
  else if (c === "Purphat") { g.fillStyle = "#7a2f9a"; g.fillRect(cx - 2.6, -0.8, 5.2, 4); g.fillRect(cx - 4, 3, 8, 0.9); }
  else if (c === "Bandana") { g.fillStyle = "#c0392b"; g.fillRect(cx - 3.8, 3, 7.6, 1.6); g.fillRect(cx + 3.5, 3.4, 2.2, 0.9); }
  else if (c === "Aegean Blue Beanie" || c === "Dawn Pink Beanie") { g.fillStyle = c[0] === "A" ? "#2f6fb5" : "#f2a7b8"; g.beginPath(); g.arc(cx, 4.2, 3.9, Math.PI, 0); g.fill(); g.fillRect(cx - 3.9, 3.8, 7.8, 1.1); }
  else if (c === "Corsair") { g.fillStyle = "#111"; g.beginPath(); g.moveTo(cx - 5, 3.6); g.lineTo(cx, -0.2); g.lineTo(cx + 5, 3.6); g.closePath(); g.fill(); g.fillStyle = "#e9e1cf"; g.fillRect(cx - 0.6, 1.4, 1.2, 1.2); }
  // vices
  if (L.art === "Woodpipe") { g.strokeStyle = "#6b4423"; g.lineWidth = 0.8; line(g, cx + 1, 8.6, cx + 4, 8.6); g.fillStyle = "#6b4423"; g.fillRect(cx + 3.6, 7.4, 1.3, 1.6); g.fillStyle = "rgba(220,220,220,.55)"; g.beginPath(); g.arc(cx + 5, 5.5 - (fr % 2), 1.2, 0, Math.PI * 2); g.fill(); }
  if (L.art === "Vape") { g.strokeStyle = "#ddd"; g.lineWidth = 0.6; line(g, cx + 1, 8.6, cx + 4.2, 8); g.fillStyle = L.breath ? "rgba(255,140,40,.6)" : "rgba(230,240,255,.55)"; g.beginPath(); g.arc(cx + 5.5, 6.5 - (fr % 2), 1.7, 0, Math.PI * 2); g.fill(); }
}
const line = (g, a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
export const FIG_W = W, FIG_H = H;
