"use client";

import { memo, type CSSProperties } from "react";
import type { BoardStyle } from "@/lib/chess-appearance";
import { DragonBoardSpirit } from "./dragon-frame";

// Each board has its own choreography; these layers never receive pointer events.
const enchantments: Record<BoardStyle, { motif: string; color: string; secondary: string; glyph: string }> = {
  sakura: { motif: "petals", color: "#ff9abb", secondary: "#ffd4e2", glyph: "❀" },
  lava: { motif: "magma", color: "#ff8b45", secondary: "#ffd488", glyph: "✦" },
  royal: { motif: "regalia", color: "#e9cb82", secondary: "#fff2cc", glyph: "◇" },
  frost: { motif: "crystal", color: "#8ee6ff", secondary: "#e5faff", glyph: "❄" },
  nebula: { motif: "astral", color: "#c69aff", secondary: "#b6eaff", glyph: "✧" },
  "vip-icefire": { motif: "confluence", color: "#a0edff", secondary: "#ff9c54", glyph: "✧" },
  "vip-celestial": { motif: "eclipse", color: "#ffe9ab", secondary: "#ff7954", glyph: "✧" },
  "vip-sovereign": { motif: "sovereign", color: "#eac674", secondary: "#fff3c7", glyph: "♛" },
  "vip-cosmos": { motif: "galaxy", color: "#be8aff", secondary: "#9bf6ff", glyph: "✦" },
  "vip-neon": { motif: "circuit", color: "#6df7f3", secondary: "#d78aff", glyph: "ϟ" },
  "vip-dragon": { motif: "dragon", color: "#74eeb7", secondary: "#edda99", glyph: "龍" },
  "vip-imperial": { motif: "phoenix", color: "#ff7865", secondary: "#ffd187", glyph: "✦" },
};

export const BoardEnchantments = memo(function BoardEnchantments({ theme }: { theme: BoardStyle }) {
  const effect = enchantments[theme];
  return <span className={"board-enchantments enchant-" + effect.motif} data-board-effect={theme}
    style={{ "--enchant-color": effect.color, "--enchant-secondary": effect.secondary } as CSSProperties} aria-hidden="true">
    <span className="enchant-veil" /><span className="enchant-ring ring-outer" /><span className="enchant-ring ring-inner" />
    <svg className="enchant-currents" viewBox="0 0 800 800" preserveAspectRatio="none">
      {effect.motif === "circuit" ? <>
        <path d="M0 150H175V275H300V425H500V600H800" />
        <path d="M800 200H650V350H525V525H325V700H0" />
        <path d="M75 0V75H400V160H725V0M75 800V725H400V640H725V800" />
      </> : <>
        <path d="M-80 610C120 390 170 750 400 540S690 280 880 410" />
        <path d="M-80 220C160 410 200 40 420 240S680 600 880 180" />
        <path d="M100 850C-40 580 250 650 160 400S300 120 600-40" />
      </>}
    </svg>
    {Array.from({ length: 24 }, (_, i) => <i key={theme + i} className="enchant-mote" style={{
      left: (4 + i * 37 % 92) + "%", top: (5 + i * 23 % 90) + "%",
      "--mote-i": i, "--enchant-delay": -i * .61 + "s", "--enchant-time": (6 + i % 5 * 1.3) + "s",
      "--enchant-drift": (i % 2 ? 1 : -1) * (10 + i % 4 * 6) + "px",
    } as CSSProperties}>{effect.glyph}</i>)}
    <span className="enchant-emblem">{effect.glyph}</span>
    {theme === "vip-dragon" && <DragonBoardSpirit />}
  </span>;
});

export const QueenAura = memo(function QueenAura({ color, pieceSet }: { color: "w" | "b"; pieceSet: string }) {
  return <span className={"royal-aura aura-queen aura-" + color + " aura-set-" + pieceSet} aria-hidden="true">
    <span className="queen-silk-halo" /><span className="queen-crescent" /><span className="queen-corona" /><span className="queen-sacred-halo" />
    <span className="queen-life-wisp life-wisp-one" /><span className="queen-life-wisp life-wisp-two" /><span className="queen-life-wisp life-wisp-three" />
    <svg className="queen-spirit-trails" viewBox="0 0 100 100" fill="none">
      <path d="M4 68C30 90 20 14 56 25S68 81 96 48" />
      <path d="M96 35C68 9 80 86 45 76S29 19 4 52" />
    </svg>
    <span className="queen-pressure-wave" /><span className="queen-crown-star">✦</span>
    <svg className="queen-qi-streams" viewBox="0 0 100 100" fill="none">
      <path d="M50 92C7 82 6 35 34 14M50 92C93 82 94 35 66 14" />
      <path d="M18 75C-2 47 31 17 65 23S99 65 77 82" />
      <path d="M30 86C4 64 36 38 50 8C64 38 96 64 70 86" />
    </svg>
    {[0, 1, 2, 3].map(i => <i key={i} className="queen-orbit-spark" style={{ "--queen-angle": i * 90 + "deg", "--queen-delay": -i * .7 + "s" } as CSSProperties} />)}
  </span>;
});

export function SovereignAura({ color, pieceSet }: { color: "w" | "b"; pieceSet: string }) {
  return <span className={"royal-aura aura-king sovereign-aura aura-" + color + " aura-set-" + pieceSet} aria-hidden="true">
    <span className="sovereign-mantle" />
    <span className="sovereign-qi-column" />
    <span className="sovereign-pressure-ring" />
    <span className="sovereign-seal"><span /><i /><i /></span>
    <svg className="sovereign-meridians" viewBox="0 0 100 100">
      <path d="M50 87C4 76 11 27 38 15M50 87C96 76 89 27 62 15" />
      <path d="M50 88C24 68 26 39 43 26M50 88C76 68 74 39 57 26" />
      <path className="sovereign-power-stream" d="M12 86C6 54 24 30 50 9M88 86C94 54 76 30 50 9" />
    </svg>
    {/* All eight piece families place the top of the cross at y=4–6 in a 100-unit SVG. */}
    <span className="sovereign-apex">
      <span className="sovereign-apex-glow" /><span className="sovereign-apex-shock" />
      <span className="sovereign-halo" /><span className="sovereign-star" />
      <span className="sovereign-cross-glint" />
      {Array.from({ length: 10 }, (_, i) => <span className="sovereign-gather-ray" key={i}
        style={{ "--gather-angle": i * 36 + "deg", "--gather-delay": -i * .31 + "s" } as CSSProperties}><i /></span>)}
    </span>
  </span>;
}
