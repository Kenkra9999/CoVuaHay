import { mkdir, writeFile } from "node:fs/promises";

// Hand-drawn silhouettes: each collection has its own six shapes, not a recolor.
// Both sides share the same silhouette so the chess role stays recognizable.
const path = (d, fill = "body", extra = "") => `<path d="${d}" fill="url(#${fill})" ${extra}/>`;
const line = (d, extra = "") => `<path d="${d}" fill="none" ${extra.includes("stroke=") ? "" : 'stroke="var(--accent)"'} ${extra.includes("stroke-width=") ? "" : 'stroke-width="2"'} ${extra}/>`;
const orb = (x, y, r, fill = "trim") => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${fill})"/>`;

const collections = {
  royal: {
    white: ["#fffdf3", "#f6efdd", "#c7b796", "#8b7554", "#766044", "#e9c476", "#fff3cc", "#b27a32"],
    black: ["#65717f", "#28323e", "#141c27", "#080e18", "#c6a271", "#deb46f", "#fae2ad", "#826139"],
    base: path("M30 76Q29 81 23 83L19 89Q17 91 19 95H81Q83 91 81 89L77 83Q71 81 70 76Z") + path("M22 86H78L81 90H19Z", "trim") + line("M28 93H72", 'stroke-width="1"'),
    shapes: {
      k: path("M39 39Q36 33 32 32L35 49Q40 53 41 59L39 69Q35 74 31 77H69Q65 74 61 69L59 59Q60 53 65 49L68 32Q64 33 61 39Z") + path("M46 5H54V15H64V23H54V36H46V23H36V15H46Z", "trim") + path("M34 45H66V50H34ZM39 64H61V69H39Z", "trim") + line("M45 54L43 62M44 73H56", 'stroke="var(--shine)" stroke-width="1.5"') + orb(50, 44, 3),
      q: path("M25 24L36 34L42 20L50 34L58 20L64 34L75 24L67 47H33Z", "trim") + path("M35 47H65L61 56Q57 64 61 69L69 77H31L39 69Q43 64 39 56Z") + path("M34 47H66V52H34ZM37 67H63V72H37Z", "trim") + [orb(25, 22, 3), orb(42, 18, 3), orb(58, 18, 3), orb(75, 22, 3)].join("") + line("M44 57L43 64M43 74H57", 'stroke="var(--shine)" stroke-width="1.5"'),
      r: path("M26 20H36V30H45V20H55V30H64V20H74V43H26Z") + path("M29 40H71V47H29Z", "trim") + path("M35 47H65L62 67L70 77H30L38 67Z") + path("M33 68H67V73H33Z", "trim") + line("M41 50L40 64M31 24V35", 'stroke="var(--shine)" stroke-width="1.5"') + path("M47 52H53V62H47Z", "trim"),
      b: path("M50 10C47 19 32 27 34 37Q35 48 45 50L43 62Q42 69 32 77H68Q58 69 57 62L55 50Q65 48 66 37C68 27 53 19 50 10Z") + orb(50, 10, 3) + line("M51 22L59 35", 'stroke="var(--cut)" stroke-width="4"') + path("M38 49H62V55H38ZM39 66H61V71H39Z", "trim") + line("M40 33Q37 41 44 44M46 59L45 64", 'stroke="var(--shine)" stroke-width="1.5"'),
      n: path("M28 77Q34 69 41 59L31 61L20 55Q17 52 20 47L27 37L41 26L45 13L54 23L63 10L65 28Q79 39 80 56Q81 68 76 77Z") + path("M65 29Q82 42 76 72L69 76H56Q68 55 58 36Z", "trim") + line("M28 45L40 34L50 32M24 52L34 54", 'stroke="var(--cut)"') + orb(46, 34, 2.5, "trim") + line("M54 42Q53 56 43 68", 'stroke="var(--shine)" stroke-width="2"'),
      p: orb(50, 30, 12, "body") + path("M40 44H60L56 51Q53 58 57 65L65 77H35L43 65Q47 58 44 51Z") + path("M37 43H63V48H37ZM38 70H62V75H38Z", "trim") + line("M45 23Q39 27 42 32M47 52L46 61", 'stroke="var(--shine)" stroke-width="1.5"'),
    },
  },
  elemental: {
    white: ["#ffffff", "#d6f8ff", "#75c8df", "#347e9d", "#4d8ba3", "#75e9ff", "#ecffff", "#378ba4"],
    black: ["#635961", "#312833", "#191923", "#100f19", "#f2a373", "#ff7e39", "#ffd093", "#a63b1e"],
    base: path("M30 75L23 82L28 86L17 92V95H83V92L72 86L77 82L70 75Z") + path("M23 82L50 86L77 82L70 89H30Z", "trim") + line("M25 93H75", 'stroke-width="1.2"'),
    shapes: {
      k: path("M33 35L43 41L50 35L57 41L67 35L70 50L59 58L63 69L70 76H30L37 69L41 58L30 50Z") + path("M46 4H54V16H65V24H54V35H46V24H35V16H46Z", "trim") + path("M50 44L41 58L50 69L59 58Z", "trim") + line("M34 43L43 48L39 54M63 41L59 49L63 54M48 8V20", 'stroke="var(--shine)" stroke-width="1.3"'),
      q: path("M24 20L35 29L40 10L50 28L60 10L65 29L76 20L68 45L58 55L62 67L71 76H29L38 67L42 55L32 45Z") + path("M32 43L50 49L68 43L61 53H39Z", "trim") + path("M50 29L45 41L50 46L55 41Z", "trim") + line("M39 56L50 61L61 56M40 68L50 61L60 69", 'stroke-width="1.3"'),
      r: path("M23 17L31 10L37 20V31H44V16L50 10L56 16V31H63V20L69 10L77 17V42L67 49V65L74 76H26L33 65V49L23 42Z") + path("M27 39H73L67 48H33Z", "trim") + path("M49 50L43 61L50 68L57 61L53 50Z", "trim") + line("M29 21V34M37 51V61M63 51V61", 'stroke="var(--shine)" stroke-width="1.2"'),
      b: path("M50 8L69 34L65 47L55 53L58 65L68 76H32L42 65L45 53L35 47L31 34Z") + path("M50 12L39 36L50 47L61 36Z", "trim") + line("M51 23L61 36", 'stroke="var(--cut)" stroke-width="3.5"') + path("M38 50H62L59 56H41Z", "trim") + line("M50 59L45 67L50 73L55 67Z", 'stroke-width="1.2"'),
      n: path("M27 76L39 56L28 61L16 54L19 43L40 25L44 10L53 21L67 9L66 29L78 39L85 58L77 76Z") + path("M66 29L74 38L70 47L78 54L71 65L75 73L60 76L61 55L54 39Z", "trim") + path("M39 34L48 30L51 34L43 40Z", "trim") + line("M24 48L34 52M49 45L43 59L37 69M75 43L80 54", 'stroke="var(--shine)" stroke-width="1.3"'),
      p: path("M50 21L62 30L60 42L50 48L40 42L38 30Z") + path("M41 48H59L55 60L60 69L65 76H35L40 69L45 60Z") + path("M50 24L44 33L50 44L56 33Z", "trim") + line("M41 51L50 55L59 51M46 63L50 70L54 63", 'stroke-width="1.2"'),
    },
  },
  nebula: {
    white: ["#ffffff", "#e3eaff", "#b0bce7", "#566eac", "#7386b7", "#8be4ff", "#eeffff", "#6979c5"],
    black: ["#ac86cd", "#654491", "#362653", "#191731", "#d1b7fa", "#bf8bff", "#eee1ff", "#7650b7"],
    base: path("M32 77Q28 80 26 85H74Q72 80 68 77Z") + `<ellipse cx="50" cy="88" rx="33" ry="7" fill="url(#body)"/>` + `<ellipse cx="50" cy="87" rx="33" ry="4" fill="none" stroke="var(--accent)" stroke-width="2"/>`,
    shapes: {
      k: path("M34 33Q50 47 66 33Q73 47 59 56Q54 64 66 78H34Q46 64 41 56Q27 47 34 33Z") + path("M47 6H53V17H64V23H53V37H47V23H36V17H47Z", "trim") + `<ellipse cx="50" cy="46" rx="23" ry="6" fill="none" stroke="var(--accent)" stroke-width="2.5"/>` + orb(50, 51, 4) + line("M43 61Q40 70 37 73", 'stroke="var(--shine)" stroke-width="1.5"'),
      q: path("M28 22Q35 44 41 27L50 9L59 27Q65 44 72 22L67 48Q57 56 58 62Q58 71 66 78H34Q42 71 42 62Q43 56 33 48Z") + line("M31 43Q50 57 69 43", 'stroke-width="3"') + orb(50, 10, 4) + orb(29, 21, 3) + orb(71, 21, 3) + path("M50 30L45 39L50 45L55 39Z", "trim") + line("M47 58Q43 69 41 71", 'stroke="var(--shine)" stroke-width="1.5"'),
      r: path("M30 17H40V27H46V12H54V27H60V17H70V40L62 48L62 67L68 78H32L38 67V48L30 40Z") + `<ellipse cx="50" cy="43" rx="29" ry="7" fill="url(#trim)"/>` + path("M39 43H61V67H39Z") + line("M42 46V62M49 20V30", 'stroke="var(--shine)" stroke-width="1.5"') + orb(50, 54, 4) + line("M34 72H66"),
      b: path("M50 7Q48 16 40 24Q24 39 42 48Q47 53 44 64Q41 73 34 78H66Q59 73 56 64Q53 53 58 48Q76 39 60 24Q52 16 50 7Z") + line("M50 22L60 32", 'stroke="var(--cut)" stroke-width="3.5"') + `<ellipse cx="50" cy="42" rx="24" ry="5" fill="none" stroke="var(--accent)" stroke-width="2" transform="rotate(-16 50 42)"/>` + line("M44 52Q48 60 44 70", 'stroke="var(--shine)" stroke-width="1.5"'),
      n: path("M29 78Q33 67 40 58Q29 65 19 54Q15 50 22 43L38 29L46 15L51 24L65 12L66 27Q82 38 82 55Q83 69 75 78Z") + path("M65 28Q77 45 64 62L57 76H68Q84 63 77 44Z", "trim") + orb(44, 36, 3) + line("M23 50Q29 54 36 50M54 43Q51 56 41 69", 'stroke="var(--shine)" stroke-width="1.5"') + `<ellipse cx="64" cy="62" rx="18" ry="5" fill="none" stroke="var(--accent)" stroke-width="1.6" transform="rotate(-32 64 62)"/>`,
      p: orb(50, 29, 12, "body") + `<ellipse cx="50" cy="31" rx="20" ry="4" fill="none" stroke="var(--accent)" stroke-width="2" transform="rotate(-20 50 31)"/>` + path("M44 46H56Q50 61 63 78H37Q50 61 44 46Z") + line("M47 50Q43 62 42 70", 'stroke="var(--shine)" stroke-width="1.5"') + path("M39 71H61L64 78H36Z", "trim"),
    },
  },
  jade: {
    white: ["#fffff2", "#e6f2df", "#aecbb7", "#608d7c", "#587e67", "#ceb16c", "#ffedac", "#9b7b3d"],
    black: ["#91d2ad", "#387e62", "#18503e", "#0b2d27", "#a4d8b2", "#dfbc71", "#fff0b2", "#98703d"],
    base: path("M29 77Q23 78 18 85Q23 90 34 90H66Q77 90 82 85Q77 78 71 77Z", "trim") + path("M50 78Q36 85 35 91H65Q64 85 50 78Z") + path("M25 90H75L79 95H21Z", "trim") + line("M28 85Q36 86 41 88M72 85Q64 86 59 88", 'stroke="var(--shine)" stroke-width="1"'),
    shapes: {
      k: path("M32 37Q50 44 68 37L62 52Q55 61 59 69L68 79H32L41 69Q45 61 38 52Z") + path("M47 6H53V17Q60 18 66 15V23H53V36H47V23H34V15Q40 18 47 17Z", "trim") + path("M32 35Q50 27 68 35L74 42Q50 47 26 42Z", "trim") + path("M43 47Q50 52 57 47L55 60H45Z", "trim") + line("M44 63Q43 69 38 73", 'stroke="var(--shine)" stroke-width="1.5"'),
      q: path("M26 22Q32 26 38 36Q36 20 42 16Q48 24 50 31Q52 24 58 16Q64 20 62 36Q68 26 74 22Q75 41 63 48H37Q25 41 26 22Z", "trim") + path("M38 47H62Q58 53 57 61Q57 69 67 79H33Q43 69 43 61Q42 53 38 47Z") + path("M38 47H62V53H38Z", "trim") + orb(50, 14, 3) + line("M45 55Q48 63 42 73M43 36L50 43L57 36", 'stroke="var(--shine)" stroke-width="1.5"'),
      r: path("M32 27H68V68L72 79H28L32 68Z") + path("M26 20H37V26H45V17H55V26H63V20H74V30H26Z") + path("M26 30Q37 28 50 23Q63 28 74 30Q78 35 83 37Q50 44 17 37Q22 35 26 30Z", "trim") + path("M31 57Q50 51 69 57L77 64Q50 68 23 64Z", "trim") + line("M40 43V52M60 43V52", 'stroke="var(--shine)" stroke-width="1.5"') + path("M46 69H54V79H46Z", "trim"),
      b: path("M50 9Q36 20 35 31Q31 43 44 50L42 61Q42 70 32 79H68Q58 70 58 61L56 50Q69 43 65 31Q64 20 50 9Z") + path("M50 13Q44 27 43 40L50 47L57 40Q56 27 50 13Z", "trim") + line("M50 23L59 35", 'stroke="var(--cut)" stroke-width="3.5"') + path("M36 48H64Q61 55 50 55Q39 55 36 48Z", "trim") + line("M45 59Q47 68 41 73", 'stroke="var(--shine)" stroke-width="1.5"'),
      n: path("M27 79Q30 68 39 59L27 63L16 57Q12 52 19 45L36 32L43 16L51 26L60 13L63 30Q78 31 82 49Q86 68 76 79Z") + path("M63 30L73 28L71 38L81 38L77 47L85 50L78 59L82 65L73 72L73 79H60Q70 55 60 37Z", "trim") + line("M28 46Q40 34 50 36M21 54L31 57", 'stroke="var(--cut)"') + orb(44, 39, 2.5) + line("M53 44Q52 59 41 72", 'stroke="var(--shine)" stroke-width="1.5"'),
      p: `<ellipse cx="50" cy="29" rx="11" ry="13" fill="url(#body)"/>` + path("M38 43Q50 38 62 43L57 49Q51 59 59 70L64 79H36L41 70Q49 59 43 49Z") + path("M37 43Q50 39 63 43L60 49H40Z", "trim") + line("M45 22Q41 28 44 35M47 53Q45 63 44 66", 'stroke="var(--shine)" stroke-width="1.5"') + path("M36 73Q50 77 64 73L67 79H33Z", "trim"),
    },
  },
  mecha: {
    white: ["#ffffff", "#d9e5f1", "#92aabe", "#45647e", "#587189", "#6cceff", "#dcf6ff", "#4183b3"],
    black: ["#747784", "#343b4a", "#1c2532", "#0f1726", "#b0b7c4", "#ff7181", "#ffd8db", "#a73c56"],
    base: path("M28 76H72L77 83L74 87L83 92V95H17V92L26 87L23 83Z") + path("M24 83H76L72 89H28Z", "trim") + line("M23 93H36M64 93H77", 'stroke-width="2.5"'),
    shapes: {
      k: path("M30 35L40 30L50 37L60 30L70 35L73 48L62 56L60 67L68 76H32L40 67L38 56L27 48Z") + path("M45 5H55V16H66V25H55V35H45V25H34V16H45Z", "trim") + path("M39 40H61L58 50H42Z", "trim") + path("M44 57H56V66H44Z", "trim") + line("M31 40L34 46M69 40L66 46M35 71H65", 'stroke="var(--shine)" stroke-width="1.3"'),
      q: path("M24 19L35 31L39 12L50 28L61 12L65 31L76 19L70 42L60 49L58 63L68 76H32L42 63L40 49L30 42Z") + path("M34 39H66L60 47H40Z", "trim") + path("M50 50L44 56L50 64L56 56Z", "trim") + line("M29 22L31 30M71 22L69 30M38 70H62", 'stroke="var(--shine)" stroke-width="1.3"'),
      r: path("M23 16H35V27H43V16H57V27H65V16H77V42L67 51V65L73 76H27L33 65V51L23 42Z") + path("M26 37H74L67 45H33Z", "trim") + path("M39 49H61V66H39Z", "trim") + path("M45 51H55V64H45Z") + line("M27 21V30M73 21V30M32 72H43M57 72H68", 'stroke="var(--shine)" stroke-width="1.5"'),
      b: path("M50 7L67 27L70 39L60 50L57 63L67 76H33L43 63L40 50L30 39L33 27Z") + path("M50 15L39 31L41 42L50 48L59 42L61 31Z", "trim") + line("M50 21L60 32", 'stroke="var(--cut)" stroke-width="4"') + path("M43 54H57L54 64H46Z", "trim") + line("M36 70L42 74M64 70L58 74", 'stroke="var(--shine)" stroke-width="1.5"'),
      n: path("M27 76L40 57L29 62L15 55L18 42L38 27L42 10L54 22L68 10V29L81 42L86 60L77 76Z") + path("M64 30L75 40L69 48L79 56L73 66L75 74H58L62 55L55 40Z", "trim") + path("M31 39L47 31L56 35L48 45L32 49Z", "trim") + line("M36 41L47 37", 'stroke="var(--cut)" stroke-width="2.5"') + orb(58, 58, 5) + line("M22 50L30 54M74 42L78 47M47 62L41 70", 'stroke="var(--shine)" stroke-width="1.5"'),
      p: path("M43 18H57L65 26V38L57 46H43L35 38V26Z") + path("M41 47H59L56 58L59 68L66 76H34L41 68L44 58Z") + path("M39 28H61V35H39Z", "trim") + path("M46 50H54V62H46Z", "trim") + line("M39 24L43 21M39 39L43 43M38 72H46M54 72H62", 'stroke="var(--shine)" stroke-width="1.3"'),
    },
  },
};

const flower = (x, y, size = 5) => `<g transform="translate(${x} ${y})" stroke-width=".7">${Array.from({ length: 5 }, (_, i) => `<path transform="rotate(${i * 72})" d="M0 0Q${-size} ${-size * 1.3} 0 ${-size * 2}Q${size} ${-size * 1.3} 0 0Z" fill="var(--accent)"/>`).join("")}<circle r="1.5" fill="url(#trim)"/></g>`;
collections.sakura = {
  white: ["#fff8f0", "#f2e3dd", "#ceaaa7", "#765563", "#795b61", "#d95776", "#ffe9c2", "#a56c52"],
  black: ["#65616e", "#302b3c", "#171727", "#0c0c1a", "#ae7b72", "#f0657c", "#f8d7a0", "#9d614f"],
  base: path("M29 78Q50 71 71 78L75 83L72 88Q80 89 83 94H17Q20 89 28 88L25 83Z") + path("M25 83Q50 88 75 83L72 89H28Z", "trim") + line("M22 93H78", 'stroke="var(--accent)" stroke-width="1.3"'),
  shapes: {
    k: path("M33 35Q50 44 67 35L70 46L61 53Q53 65 67 79H33Q47 65 39 53L30 46Z") + path("M45 5H55V15H64V24H55V36H45V24H36V15H45Z", "trim") + path("M31 43Q50 48 69 43L65 50H35Z", "trim") + line("M43 55Q45 67 40 73M57 55Q55 67 60 73", 'stroke="var(--shine)" stroke-width="1.2"') + flower(50, 63, 3.2),
    q: path("M24 23Q30 18 34 31L39 14Q45 13 50 31Q55 13 61 14L66 31Q70 18 76 23L68 43L60 49Q53 65 67 79H33Q47 65 40 49L32 43Z") + path("M32 40Q50 44 68 40L65 48H35Z", "trim") + flower(50, 16, 3.8) + orb(26, 21, 2.5) + orb(74, 21, 2.5) + line("M45 52L43 71M55 52L57 71", 'stroke="var(--shine)" stroke-width="1.2"') + flower(50, 62, 3.4),
    r: path("M28 26H72V40L65 47L63 67L70 79H30L37 67L35 47L28 40Z") + path("M21 22Q30 24 35 16H65Q70 24 79 22L75 30H25Z", "trim") + path("M34 10H43V19H57V10H66V25H34Z") + path("M29 37H71L66 44H34Z", "trim") + path("M43 56Q50 48 57 56V73H43Z", "trim") + line("M37 48L40 71M63 48L60 71", 'stroke="var(--shine)" stroke-width="1.2"') + flower(50, 59, 2.5),
    b: path("M50 12Q68 27 66 40Q64 47 56 51L58 64L67 79H33L42 64L44 51Q36 47 34 40Q32 27 50 12Z") + orb(50, 9, 3) + line("M55 23L44 40", 'stroke="var(--cut)" stroke-width="4"') + path("M37 45Q50 50 63 45L60 53H40Z", "trim") + path("M36 73Q50 77 64 73L68 79H32Z", "trim") + flower(50, 64, 3.3),
    n: path("M26 79Q30 67 40 55L29 59L17 52L20 40L38 28L43 11L54 22L62 13L65 32Q79 37 82 52Q85 67 75 79Z") + path("M62 30L72 31L69 40L78 43L73 51L82 56L74 62L79 68L70 76L69 79H58Q68 57 57 37Z", "trim") + path("M34 28L43 19L50 27L47 33Z", "trim") + line("M27 44L39 36L47 37M21 50L30 53", 'stroke="var(--cut)" stroke-width="2"') + orb(45, 38, 2.4) + flower(58, 61, 3.6) + line("M49 48Q47 62 38 73", 'stroke="var(--shine)" stroke-width="1.4"'),
    p: `<ellipse cx="50" cy="29" rx="11" ry="12" fill="url(#body)"/>` + path("M38 41Q50 46 62 41L59 48L56 54Q53 65 63 78H37Q47 65 44 54L41 48Z") + path("M38 42Q50 45 62 42L60 49H40Z", "trim") + flower(50, 29, 3.3) + line("M46 53Q44 65 43 69", 'stroke="var(--shine)" stroke-width="1.4"') + path("M35 73Q50 77 65 73L68 79H32Z", "trim"),
  },
};

const names = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
const silhouettes = new Set();
for (const [set, collection] of Object.entries(collections)) {
  const directory = new URL(`../public/pieces/${set}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const [type, shape] of Object.entries(collection.shapes)) {
    if (silhouettes.has(shape)) throw new Error(`Duplicate design: ${set}/${type}`);
    silhouettes.add(shape);
    for (const [side, color] of [["white", "w"], ["black", "b"]]) {
      // Keep the original sculpted forms and collection accents, with clear side values.
      const white = color === "w";
      const [, , , , , accent, trimLight, trimDark] = collection[side];
      const [light, middle, dark, shade, outline] = white
        ? ["#ffffff", "#f3f3ee", "#d9dfe5", "#9cabbc", "#43546b"]
        : ["#3a4050", "#202432", "#10131f", "#04060d", "#8794a9"];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="${side} ${set} ${names[type]}"><defs><linearGradient id="body" x1="0" x2="1" y1="0.2" y2="0.7"><stop stop-color="${light}"/><stop offset=".28" stop-color="${middle}"/><stop offset=".55" stop-color="${dark}"/><stop offset=".8" stop-color="${middle}"/><stop offset="1" stop-color="${shade}"/></linearGradient><linearGradient id="trim" x1="0" x2="1" y2=".6"><stop stop-color="${trimLight}"/><stop offset=".5" stop-color="${accent}"/><stop offset="1" stop-color="${trimDark}"/></linearGradient></defs><ellipse cx="50" cy="96" rx="31" ry="2" fill="#030711" opacity=".28"/><g style="--accent:${accent};--shine:${light};--cut:${shade}" stroke="${outline}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${collection.base}${shape}</g></svg>\n`;
      await writeFile(new URL(`${color}${type.toUpperCase()}.svg`, directory), svg);
    }
  }
}
console.log(`Generated ${silhouettes.size * 2} SVG pieces with ${silhouettes.size} distinct designs.`);
