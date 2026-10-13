import { mkdir, writeFile } from "node:fs/promises";

// Recognizable chess silhouettes first; collection detail stays inside the body.
const body = d => `<path d="${d}" fill="url(#body)"/>`;
const band = d => `<path d="${d}" fill="url(#trim)"/>`;
const detail = d => `<path d="${d}" fill="none" stroke="var(--detail)" stroke-width="1.6"/>`;
const ball = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#body)"/>`;
const base = body("M31 77Q28 82 23 85L20 90V95H80V90L77 85Q72 82 69 77Z")
  + band("M24 85H76L79 90H21Z") + detail("M25 93H75");
const stem = body("M38 47H62L58 57Q55 67 66 78H34Q45 67 42 57Z")
  + band("M36 47H64V52H36ZM33 74H67V79H33Z");
const designs = {
  k: body("M32 32L40 39L50 34L60 39L68 32L65 48H35Z")
    + body("M46 5H54V16H65V24H54V36H46V24H35V16H46Z") + stem,
  q: body("M25 24L36 37L41 19L50 35L59 19L64 37L75 24L67 47H33Z")
    + [ball(25, 22, 3), ball(41, 17, 3), ball(50, 12, 3.5), ball(59, 17, 3), ball(75, 22, 3)].join("") + stem,
  r: body("M25 15H36V27H44V15H56V27H64V15H75V41H25Z")
    + band("M26 38H74V45H26Z") + body("M34 45H66L64 67L71 78H29L36 67Z")
    + band("M31 73H69V79H31Z") + detail("M41 49V67M59 49V67"),
  b: body("M50 12Q31 26 33 37Q34 46 43 50L42 59Q42 69 32 78H68Q58 69 58 59L57 50Q66 46 67 37Q69 26 50 12Z")
    + ball(50, 10, 3) + `<path d="M53 23L43 38" fill="none" stroke="var(--cut)" stroke-width="4.5"/>`
    + band("M37 47H63V53H37ZM32 73H68V79H32Z"),
  n: body("M28 78Q31 66 43 54L32 59L19 53Q16 50 20 44L38 29L42 13L52 24L62 14L65 31Q81 41 81 57Q82 69 74 78Z")
    + band("M63 32Q75 44 70 59L61 78H72Q83 62 75 45Z")
    + `<circle cx="44" cy="37" r="2.6" fill="var(--cut)" stroke="none"/>`
    + detail("M23 48L32 51M53 46Q51 60 41 71") + band("M28 74H74V79H28Z"),
  p: ball(50, 29, 12) + body("M41 43H59L56 53Q53 64 63 78H37Q47 64 44 53Z")
    + band("M38 42H62V48H38ZM35 73H65V79H35Z"),
};

const collections = {
  sakura: { accent: "#c27b91", motif: "M50 59Q41 53 44 62Q41 69 50 65Q59 69 56 62Q59 53 50 59Z" },
  elemental: { accent: "#72a6b8", motif: "M50 56L56 63L50 70L44 63Z" },
  royal: { accent: "#b59b65", motif: "M44 58L46 65H54L56 58L52 61L50 57L48 61Z" },
  nebula: { accent: "#9494bf", motif: "M50 56L52 61L58 63L52 65L50 70L48 65L42 63L48 61Z" },
  jade: { accent: "#81a28c", motif: "M50 69Q40 64 43 57Q50 58 50 69Q50 58 57 57Q60 64 50 69Z" },
  mecha: { accent: "#839cb4", motif: "M45 58H55V68H45ZM48 61V65H52V61Z" },
  "dragon-abyss": { accent: "#7598b0", motif: "M44 58L49 61L56 57L53 64L56 69L48 66L44 69L46 63Z" },
  celestial: { accent: "#b29b76", motif: "M50 68Q39 63 42 58L50 63L58 58Q61 63 50 68Z" },
};
const roles = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };

export async function generateReadablePieces(sets) {
  for (const set of sets) {
    const { accent, motif } = collections[set];
    const directory = new URL(`../public/pieces/lite/${set}/`, import.meta.url);
    await mkdir(directory, { recursive: true });
    for (const color of ["w", "b"]) {
      const white = color === "w";
      // The entire silhouette, including crown and base, keeps its side's value.
      const palette = white ? ["#ffffff", "#f5f6f8", "#e2e5eb", "#cbd1db"] : ["#343d4c", "#202734", "#111722", "#080c13"];
      const trim = white ? ["#ffffff", "#e8eaf0", "#b9c1ce"] : ["#3e4859", "#252e3c", "#0b111c"];
      const edge = white ? "#475569" : "#8e9caf";
      for (const [type, shape] of Object.entries(designs)) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="${white ? "white" : "black"} ${set} ${roles[type]}"><defs><linearGradient id="body" x1="0" x2="1" y1="0" y2=".35"><stop stop-color="${palette[0]}"/><stop offset=".32" stop-color="${palette[1]}"/><stop offset=".72" stop-color="${palette[2]}"/><stop offset="1" stop-color="${palette[3]}"/></linearGradient><linearGradient id="trim" x2=".9" y2=".4"><stop stop-color="${trim[0]}"/><stop offset=".55" stop-color="${trim[1]}"/><stop offset="1" stop-color="${trim[2]}"/></linearGradient></defs><ellipse cx="50" cy="96" rx="30" ry="2" fill="#030711" opacity=".25"/><g style="--detail:${white ? "#9ca8b9" : "#65738a"};--cut:${white ? "#475569" : "#c5cedb"}" stroke="${edge}" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round">${base}${shape}${type !== "p" && type !== "n" ? `<path d="${motif}" fill="${accent}" stroke="none" opacity=".8"/>` : ""}<path d="M28 88H72" stroke="${accent}" stroke-width="1.25"/></g></svg>\n`;
        await writeFile(new URL(`${color}${type.toUpperCase()}.svg`, directory), svg);
      }
    }
  }
  console.log(`Generated ${sets.length * 12} readable chess pieces.`);
}
