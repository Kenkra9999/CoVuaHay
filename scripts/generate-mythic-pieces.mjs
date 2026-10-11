import { mkdir, writeFile } from "node:fs/promises";

// Original vector silhouettes: dragon armour and two distinct celestial factions.
const shape = (d, fill = "body", extra = "") => `<path d="${d}" fill="url(#${fill})" ${extra}/>`;
const line = (d, width = 1.4, extra = "") => `<path d="${d}" fill="none" stroke="var(--spark)" stroke-width="${width}" ${extra}/>`;
const gem = (x, y, s = 4) => shape(`M${x} ${y-s}L${x+s*.7} ${y}L${x} ${y+s}L${x-s*.7} ${y}Z`, "energy");
const wings = (demonic, small = false) => `<g ${small ? 'transform="translate(15 15) scale(.7)"' : ""}>${demonic
  ? shape("M40 51Q23 27 9 25L15 43L10 58L24 50L28 64L39 58ZM60 51Q77 27 91 25L85 43L90 58L76 50L72 64L61 58Z", "body") + line("M38 53L17 34L22 46M62 53L83 34L78 46")
  : shape("M41 51Q24 46 7 23Q8 43 19 51L12 49Q19 62 31 61L25 62Q32 69 41 63ZM59 51Q76 46 93 23Q92 43 81 51L88 49Q81 62 69 61L75 62Q68 69 59 63Z", "feather") + line("M12 34Q22 50 38 55M15 43Q25 57 39 58M88 34Q78 50 62 55M85 43Q75 57 61 58", 1, 'opacity=".65"')
}</g>`;
const horns = (y = 21) => shape(`M36 ${y+16}Q20 ${y+7} 25 ${y-9}Q29 ${y+2} 41 ${y+5}ZM64 ${y+16}Q80 ${y+7} 75 ${y-9}Q71 ${y+2} 59 ${y+5}Z`, "trim");
const halo = (y = 17, r = 18) => `<ellipse cx="50" cy="${y}" rx="${r}" ry="5" fill="none" stroke="var(--spark)" stroke-width="2.3"/><ellipse cx="50" cy="${y}" rx="${r-3}" ry="3" fill="none" stroke="#fff" stroke-width=".65" opacity=".8"/>`;
const dragonScales = Array.from({length: 3}, (_, row) => Array.from({length: 3}, (_, col) => line(`M${40+col*7} ${54+row*6}l3.5 3l3.5 -3`, .9, 'opacity=".7"')).join("")).join("");
const dragonBase = shape("M29 77L22 83L24 88L15 94H85L76 88L78 83L71 77Z") + shape("M22 83L50 87L78 83L74 90H26Z", "trim") + line("M22 93H78", 1.8) + gem(50, 86, 3);
const celestialBase = shape("M32 78L24 82L21 89L15 94H85L79 89L76 82L68 78Z") + shape("M23 85Q50 92 77 85L79 90Q50 98 21 90Z", "trim") + line("M29 82Q50 87 71 82", 1.8);
const dragonShapes = {
  k: shape("M31 37L39 44L50 39L61 44L69 37L73 49L62 57L61 67L70 78H30L39 67L38 57L27 49Z") + horns(18) + shape("M46 5H54V17H63V24H54V38H46V24H37V17H46Z", "trim") + shape("M31 43L50 49L69 43L64 53H36Z", "trim") + dragonScales + gem(50, 45, 5) + line("M43 64L39 74M57 64L61 74"),
  q: shape("M25 23L36 34L40 10L50 29L60 10L64 34L75 23L70 43L61 52L59 66L70 78H30L41 66L39 52L30 43Z") + shape("M23 19Q15 14 19 5Q23 15 33 19L36 33ZM77 19Q85 14 81 5Q77 15 67 19L64 33Z", "trim") + shape("M31 42L50 48L69 42L64 52H36Z", "trim") + dragonScales + gem(50, 31, 6) + gem(50, 65, 4) + line("M38 73L50 77L62 73"),
  r: shape("M23 25L23 13L32 9L34 25H42V15L50 9L58 15V25H66L68 9L77 13V25L81 39L68 49L66 66L74 78H26L34 66L32 49L19 39Z") + shape("M20 36L35 40L50 35L65 40L80 36L71 47H29Z", "trim") + shape("M20 30L10 19L12 37L26 45ZM80 30L90 19L88 37L74 45Z", "trim") + shape("M41 54L50 48L59 54V70H41Z", "energy") + line("M44 58L50 53L56 58M38 52L36 70M62 52L64 70"),
  b: shape("M50 8L63 23L69 36L63 48L55 53L58 66L68 78H32L42 66L45 53L37 48L31 36L37 23Z") + shape("M37 28L27 14L28 34L39 45ZM63 28L73 14L72 34L61 45Z", "trim") + shape("M50 17L42 32L50 45L58 32Z", "energy") + line("M52 24L60 37", 3) + shape("M39 49H61L59 56H41Z", "trim") + dragonScales,
  n: shape("M27 78L38 61L29 64L12 54L15 43L33 32L42 20L40 7L51 18L65 9L64 29L78 37L85 54L82 67L73 78Z") + shape("M64 29L77 27L73 38L84 38L79 49L88 53L80 64L82 70L69 78H57Q72 56 58 36Z", "trim") + shape("M28 32L23 19L40 26ZM51 21L50 8L61 19Z", "trim") + gem(42, 38, 3.5) + line("M18 48L30 53L38 48M18 54L25 56M51 47Q50 62 39 73", 2) + line("M65 42L70 47L65 53L71 57L65 65", 1),
  p: shape("M50 18L62 27L61 39L54 46L57 60L65 78H35L43 60L46 46L39 39L38 27Z") + shape("M40 29L31 19L33 36L41 41ZM60 29L69 19L67 36L59 41Z", "trim") + gem(50, 32, 7) + shape("M39 44L50 48L61 44L58 52H42Z", "trim") + line("M45 56L50 61L55 56M43 67L50 72L57 67", 1.2),
};
function celestialShapes(demonic) {
  const crest = (y, r) => demonic ? horns(y) : halo(y, r);
  return {
    k: wings(demonic) + shape("M35 38Q50 46 65 38L68 49L59 58L60 67L70 78H30L40 67L41 58L32 49Z") + crest(17, 22) + shape("M47 5H53V18H63V24H53V38H47V24H37V18H47Z", "trim") + shape("M34 44L50 49L66 44L63 53H37Z", "trim") + gem(50, 61, 7) + line("M44 55L42 71M56 55L58 71"),
    q: wings(demonic) + shape("M27 26L37 34L42 18L50 31L58 18L63 34L73 26L66 47L58 56L60 67L69 78H31L40 67L42 56L34 47Z") + crest(12, 18) + shape("M32 42L50 46L68 42L64 51H36Z", "trim") + gem(50, 27, 6) + gem(50, 61, 6) + line("M43 55L40 72M57 55L60 72"),
    r: wings(demonic, true) + shape("M26 17H36V27H44V14H56V27H64V17H74V42L64 50L63 65L73 78H27L37 65L36 50L26 42Z") + shape("M25 37H75L67 47H33Z", "trim") + (demonic ? shape("M24 21L19 7L33 17ZM76 21L81 7L67 17Z", "trim") : halo(12, 23)) + shape("M41 55L50 48L59 55V72H41Z", "energy") + line("M45 57L50 53L55 57M32 72H38M62 72H68"),
    b: wings(demonic, true) + shape("M50 13Q68 28 66 40Q64 49 56 52L57 63L68 78H32L43 63L44 52Q36 49 34 40Q32 28 50 13Z") + (demonic ? horns(25) : halo(11, 15)) + line("M54 24L43 41", 3.5) + shape("M38 48L50 53L62 48L60 57H40Z", "trim") + gem(50, 65, 5),
    n: wings(demonic) + shape("M27 78L39 59L28 62L15 53L19 42L38 28L43 13L53 25L63 17L65 32Q79 40 80 55Q82 69 73 78Z") + shape("M64 33Q80 49 70 68L63 78H55Q65 57 56 38Z", "trim") + (demonic ? shape("M43 27L34 8L51 19ZM64 31L68 9L73 29Z", "trim") : halo(10, 16)) + gem(44, 38, 3) + line("M24 47L33 51M49 48Q47 64 38 72", 1.6),
    p: wings(demonic, true) + shape("M50 22Q63 22 63 34Q63 44 55 47L56 60L65 78H35L44 60L45 47Q37 44 37 34Q37 22 50 22Z") + (demonic ? shape("M40 29L33 15L45 23ZM60 29L67 15L55 23Z", "trim") : halo(18, 15)) + gem(50, 34, 5) + shape("M40 46L50 50L60 46L58 54H42Z", "trim") + line("M46 58L43 71M54 58L57 71"),
  };
}
const palettes = {
  "dragon-abyss": {
    w: ["#f3ffff", "#b4e6f3", "#3b718a", "#162b47", "#baf9ff", "#61ddff", "#143b61"],
    b: ["#697085", "#28233c", "#0c101e", "#030611", "#c991ff", "#ad45ff", "#492074"],
  },
  celestial: {
    w: ["#ffffff", "#e3f7ff", "#8bacbf", "#38546a", "#fff2b0", "#c5f8ff", "#a77835"],
    b: ["#71616a", "#29232b", "#11131d", "#050711", "#ffbd68", "#ff4d25", "#7d241c"],
  },
};
const roles = {k:"king",q:"queen",r:"rook",b:"bishop",n:"knight",p:"pawn"};
for (const [set, sides] of Object.entries(palettes)) {
  const directory = new URL(`../public/pieces/${set}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const [side, colors] of Object.entries(sides)) {
    const [light, mid, dark, shade, trim, energy, edge] = colors;
    const designs = set === "dragon-abyss" ? dragonShapes : celestialShapes(side === "b");
    for (const [role, design] of Object.entries(designs)) {
      const cracks = side === "b" ? line("M45 52L49 58L46 65L51 71M57 57L54 63L58 69", .9, 'opacity=".95"') : line("M44 53L42 67M56 53L58 67", .9, 'opacity=".7"');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="${side === "w" ? "white" : "black"} ${set} ${roles[role]}"><defs><linearGradient id="body" x1="0" y1=".1" x2="1" y2=".6"><stop stop-color="${light}"/><stop offset=".24" stop-color="${mid}"/><stop offset=".52" stop-color="${dark}"/><stop offset=".76" stop-color="${mid}"/><stop offset="1" stop-color="${shade}"/></linearGradient><linearGradient id="trim"><stop stop-color="#fff5d8"/><stop offset=".35" stop-color="${trim}"/><stop offset=".72" stop-color="${edge}"/><stop offset="1" stop-color="${trim}"/></linearGradient><linearGradient id="energy" x2=".7" y2="1"><stop stop-color="#fff"/><stop offset=".3" stop-color="${energy}"/><stop offset="1" stop-color="${edge}"/></linearGradient><linearGradient id="feather" x2=".6" y2="1"><stop stop-color="#fff"/><stop offset=".6" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><ellipse cx="50" cy="96" rx="33" ry="2" fill="#030611" opacity=".4"/><g style="--spark:${energy}" stroke="${edge}" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round">${design}${cracks}${set === "dragon-abyss" ? dragonBase : celestialBase}</g></svg>\n`;
      await writeFile(new URL(`${side}${role.toUpperCase()}.svg`, directory), svg);
    }
  }
}
console.log("Generated 24 mythic pieces across Dragon Abyss and Angel & Demon collections.");
