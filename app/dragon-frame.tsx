"use client";

import { memo, useId, type CSSProperties } from "react";
import { assetUrl } from "@/lib/asset-url";

const headContour = "M0 0H194L217 31L241 59L266 83L284 100L280 128L258 153L236 146L215 134L191 128L166 122L139 129L109 149L78 168L23 153L0 125Z";

export const DragonFrame = memo(function DragonFrame() {
  const id = useId().replace(/:/g, "");
  const art = assetUrl("/boards/vip/dragon.png");
  return <>
    {/* Composite the original head separately so the dragon itself moves. The grid stays aligned. */}
    <svg className="dragon-living-art" viewBox="0 0 1254 1254" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <clipPath id={id + "-head"}><path d={headContour} /></clipPath>
        <mask id={id + "-body"} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">
          <rect width="1254" height="1254" fill="white" /><path d={headContour} fill="black" />
        </mask>
        <radialGradient id={id + "-mist"}><stop stopColor="#0f5741" /><stop offset="1" stopColor="#031a13" /></radialGradient>
      </defs>
      <path d={headContour} fill={"url(#" + id + "-mist)"} />
      <image href={art} width="1254" height="1254" mask={"url(#" + id + "-body)"} />
      <g className="dragon-head-motion"><image href={art} width="1254" height="1254" clipPath={"url(#" + id + "-head)"} /></g>
    </svg>
    <span className="dragon-frame-spirit" aria-hidden="true">
      <span className="dragon-neck-aura" /><span className="dragon-corner-aura" />
      <svg className="dragon-spirit-svg" viewBox="0 0 1254 1254" preserveAspectRatio="none">
        <defs>
          <radialGradient id={id + "-eye"}><stop stopColor="#f4ffe1" /><stop offset=".25" stopColor="#caff75" /><stop offset=".6" stopColor="#4dffb7" stopOpacity=".7" /><stop offset="1" stopColor="#23f59d" stopOpacity="0" /></radialGradient>
          <linearGradient id={id + "-breath"}><stop stopColor="#a3ffdb" stopOpacity=".7" /><stop offset="1" stopColor="#2fffad" stopOpacity="0" /></linearGradient>
        </defs>
        <g className="dragon-head-motion">
          <g className="dragon-divine-eye">
            <ellipse cx="225" cy="73" rx="18" ry="13" fill={"url(#" + id + "-eye)"} />
            <path d="M219 72Q225 69 231 75Q225 78 219 72Z" fill="#e3ffb1" />
            <path d="M225 71L226 76" stroke="#ffffff" strokeWidth="2" />
          </g>
          <g className="dragon-whiskers">
            <path d="M267 102Q330 67 403 102Q441 122 478 111M259 117Q325 154 372 129Q419 98 445 124" />
            <path d="M245 90Q290 37 299 21M259 121Q310 186 351 170" />
          </g>
          <g className="dragon-spirit-breath" fill="none" stroke={"url(#" + id + "-breath)"}>
            <path d="M270 128C350 93 350 177 452 141S587 185 669 152" />
            <path d="M266 133C338 189 419 164 441 208S560 258 625 205" />
          </g>
        </g>
        <g className="dragon-scale-light">
          <path d="M39 116Q13 175 30 248T66 351Q76 414 39 456" />
          <path d="M13 195L29 209L43 188M22 244L39 258L53 235M38 292L55 307L68 283M47 345L66 360L76 337" />
        </g>
        <g className="dragon-frame-current">
          <path d="M282 94H1135V1008M94 207V1157H973" />
          <path d="M315 116H1137M116 241V1137H939" />
        </g>
      </svg>
      {Array.from({ length: 18 }, (_, i) => <i className="dragon-spirit-mote" key={i} style={{
        left: (2 + i % 6 * 4.2) + "%", top: (2 + i * 17 % 40) + "%",
        "--dragon-delay": -i * .47 + "s", "--dragon-duration": (5.5 + i % 4) + "s",
      } as CSSProperties} />)}
    </span>
  </>;
});

export function DragonBoardSpirit() {
  return <span className="dragon-board-spirit" aria-hidden="true">
    <span className="dragon-soul-wave wave-one" /><span className="dragon-soul-wave wave-two" />
    <span className="dragon-jade-mist mist-one" /><span className="dragon-jade-mist mist-two" />
    <svg className="dragon-ley-lines" viewBox="0 0 800 800" preserveAspectRatio="none">
      <path d="M0 80C180 200 140 410 350 360S640 430 800 650" />
      <path d="M0 650C160 510 270 600 400 420S660 230 800 100" />
      <path d="M80 0C230 120 100 320 320 500S500 620 650 800" />
    </svg>
    {Array.from({ length: 20 }, (_, i) => <span className="dragon-soul-flame" key={i} style={{
      left: (5 + i * 31 % 90) + "%", top: (7 + i * 23 % 88) + "%",
      "--dragon-delay": -i * .67 + "s", "--dragon-duration": (6 + i % 5) + "s",
    } as CSSProperties}><i /></span>)}
  </span>;
}
