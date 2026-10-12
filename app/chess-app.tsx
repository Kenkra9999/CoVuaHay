"use client";
/* eslint-disable @next/next/no-img-element -- Local vector pieces stay crisp at every board size. */

import { Chess, type Square } from "chess.js";
import { ArrowRight, ArrowUpDown, Bot, Check, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Clock3, Copy, Crown, Download, Flag, Flame, Hash, History, Link2, LoaderCircle, Music2, Palette, Pause, Play, Plus, RotateCcw, ShieldCheck, Sparkles, Swords, Users, Volume2, VolumeX, X } from "lucide-react";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
import type { MoveRecord, RoomStatus, RoomView } from "@/lib/rooms";
import { chessClock } from "@/lib/chess-clock";
import { ChessAudio, DEFAULT_AUDIO, restoreAudio, type AudioChannel, type AudioSettings } from "@/lib/chess-audio";
import { DEFAULT_PIECE_SET, PIECE_SETS, pieceImage, validPieceSet, type PieceSetId } from "@/lib/chess-pieces";
import { ATMOSPHERES, BOARD_STYLES, STANDARD_BOARDS, VIP_BOARDS, COVER_SCENES, DEFAULT_VISUALS, restoreVisuals, realmBoardInset, type Atmosphere, type BoardStyle, type CoverScene, type VisualAppearance } from "@/lib/chess-appearance";
import { ChessAtmosphere } from "./chess-atmosphere";
import { BoardEnchantments, QueenAura, SovereignAura } from "./board-enchantments";
import { DragonFrame } from "./dragon-frame";
import { PieceMotion } from "./piece-motion";
import { pieceTravelMs } from "@/lib/chess-motion";
import { VisualPerformance } from "./visual-performance";
import { ChessInspiration } from "./chess-inspiration";
import type { Difficulty } from "@/lib/chess-ai";
import { describeMove, parseUciMove, principalVariation, searchStockfish, type EngineAnalysis, type EngineLine } from "@/lib/stockfish";
import { assetUrl } from "../lib/asset-url";
import { roomFetch } from "@/lib/room-api";

type Color = "w" | "b";
type Mode = "ai" | "local";
type LocalGame = { fen: string; moves: MoveRecord[]; status: RoomStatus; version: number };
type Piece = { id: string; square: Square; color: Color; type: string };
type OnlineGame = RoomView & { receivedAt: number };
type Modal = "menu" | "create" | "join" | "appearance" | "effects" | "pieces" | "audio" | "help" | null;
type Appearance = VisualAppearance & { pieceSet: PieceSetId };
type RecentRoom = { code: string; color: Color | null; name: string; savedAt: number };
type ApiData = { room?: RoomView; token?: string; error?: string };
const files = "abcdefgh";
const names: Record<string, string> = { p: "Tốt", n: "Mã", b: "Tượng", r: "Xe", q: "Hậu", k: "Vua" };
const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const DEFAULT_GAME: LocalGame = { fen: new Chess().fen(), moves: [], status: "playing", version: 0 };
const DEFAULT_APPEARANCE: Appearance = { ...DEFAULT_VISUALS, pieceSet: DEFAULT_PIECE_SET };
function stored(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function remember(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Device storage is optional. */ } }
function forget(key: string) { try { localStorage.removeItem(key); } catch { /* Device storage is optional. */ } }
function normalizeCode(value: string) { return value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6); }
function buildGame(moves: MoveRecord[]) {
  const game = new Chess();
  for (const move of moves) game.move({ from: move.from, to: move.to, promotion: move.promotion });
  return game;
}
function resultStatus(game: Chess): RoomStatus {
  if (game.isCheckmate()) return game.turn() === "w" ? "black_won" : "white_won";
  return game.isGameOver() ? "draw" : "playing";
}
function getPieces(moves: MoveRecord[]): Piece[] {
  const game = new Chess();
  const pieces: Piece[] = [];
  game.board().forEach((row, rank) => row.forEach((piece, file) => {
    if (piece) pieces.push({ id: files[file] + (8 - rank), square: (files[file] + (8 - rank)) as Square, type: piece.type, color: piece.color });
  }));
  for (const move of moves) {
    const mover = pieces.find(p => p.square === move.from);
    if (!mover) continue;
    const capturedSquare = move.flags.includes("e") ? move.to[0] + move.from[1] : move.to;
    const index = pieces.findIndex(p => p.square === capturedSquare && p.id !== mover.id);
    if (index !== -1) pieces.splice(index, 1);
    if (move.flags.includes("k") || move.flags.includes("q")) {
      const rook = pieces.find(p => p.square === (move.flags.includes("k") ? "h" : "a") + move.from[1]);
      if (rook) rook.square = ((move.flags.includes("k") ? "f" : "d") + move.from[1]) as Square;
    }
    mover.square = move.to;
    if (move.promotion) mover.type = move.promotion;
  }
  return pieces;
}
function clockText(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}
function evaluation(line: EngineLine) { return line.mate !== null ? "M" + Math.abs(line.mate) : (line.score >= 0 ? "+" : "") + line.score.toFixed(2); }
function errorText(error: unknown) { return error instanceof Error ? error.message : "Chưa thực hiện được. Hãy thử lại."; }

type BoardActions = {
  click: (square: Square) => void;
  down: (event: PointerEvent<HTMLDivElement>, piece: Piece) => void;
  move: (event: PointerEvent<HTMLDivElement>, piece: Piece) => void;
  up: (event: PointerEvent<HTMLDivElement>, piece: Piece) => void;
  cancel: () => void;
};
const QueenMetalGlint = memo(function QueenMetalGlint({ color, pieceSet }: { color: Color; pieceSet: PieceSetId }) {
  return <span className="queen-metal-body" style={{ "--queen-mask": 'url("' + pieceImage({ color, type: "q" }, pieceSet) + '")' } as CSSProperties} aria-hidden="true"><i /></span>;
});
const RoyalAura = memo(function RoyalAura({ type, color, pieceSet }: { type: string; color: Color; pieceSet: PieceSetId }) {
  const gradientId = useId().replace(/:/g, "");
  if (type !== "k" && type !== "q" && type !== "r") return null;
  const isKing = type === "k";
  const isRook = type === "r";
  if (isKing) return <SovereignAura color={color} pieceSet={pieceSet} />;
  if (type === "q") return <QueenAura color={color} pieceSet={pieceSet} />;
  return (
    <span className={"royal-aura aura-" + (isKing ? "king" : isRook ? "rook" : "queen") + " aura-" + color + " aura-set-" + pieceSet} aria-hidden="true">
      {(pieceSet === "dragon-abyss" || pieceSet === "celestial") && <span className="mythic-aura">
        <span className="mythic-seal" /><span className="mythic-orbit" />
        <svg className="mythic-wings" viewBox="0 0 120 120"><path d={pieceSet === "dragon-abyss"
          ? "M53 67Q20 60 13 29L30 37L26 18L44 36L45 22L56 47M67 67Q100 60 107 29L90 37L94 18L76 36L75 22L64 47"
          : color === "w" ? "M52 70Q18 62 8 30Q28 48 45 42M48 61Q21 55 14 43M68 70Q102 62 112 30Q92 48 75 42M72 61Q99 55 106 43"
          : "M52 70L14 51L9 24L30 35L37 20L52 47M68 70L106 51L111 24L90 35L83 20L68 47"} /></svg>
        <i className="mythic-satellite satellite-one" /><i className="mythic-satellite satellite-two" />
      </span>}
      <span className="aura-layer-back">
        <span className="aura-core-glow" />
        <span className="aura-base-array" />
        {!isRook && <span className="aura-base-runes" />}
        <span className="aura-cyclone cyclone-cw" />
        {!isRook && <span className="aura-cyclone cyclone-ccw" />}
        <svg className="aura-streams-svg" viewBox="0 0 120 120">
          <defs>
            <linearGradient id={gradientId + "-g1"} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="30%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="70%" stopColor="currentColor" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
            <linearGradient id={gradientId + "-g2"} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="35%" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="75%" stopColor="currentColor" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <path
            className="aura-stream-ribbon ribbon-1"
            d="M 60 12 C 86 12, 108 34, 108 60 C 108 86, 86 108, 60 108 C 34 108, 12 86, 12 60 C 12 38, 30 20, 52 16"
            stroke={"url(#" + gradientId + "-g1)"}
          />
          {!isRook && <path
            className="aura-stream-ribbon ribbon-2"
            d="M 60 18 C 38 18, 20 36, 20 60 C 20 84, 38 102, 60 102 C 82 102, 100 84, 100 60 C 100 40, 84 24, 64 22"
            stroke={"url(#" + gradientId + "-g2)"}
          />}
          {!isRook && <path
            className={"aura-stream-ribbon ribbon-3" + (isKing ? "" : " ribbon-queen")}
            d={isKing
              ? "M 60 8 C 88 8, 112 32, 112 60 C 112 88, 88 112, 60 112 C 32 112, 8 88, 8 60 C 8 32, 32 8, 60 8"
              : "M 60 22 C 80 22, 98 40, 98 60 C 98 80, 80 98, 60 98 C 40 98, 22 80, 22 60 C 22 40, 40 22, 60 22"}
            stroke={"url(#" + gradientId + "-g1)"}
          />}
          {!isRook && <path className="aura-stream-ribbon ribbon-4"
            d="M 22 84 C 7 61, 20 32, 48 20 C 70 10, 102 27, 105 51 C 114 76, 89 108, 61 105 C 42 104, 26 91, 22 84"
            stroke={"url(#" + gradientId + "-g2)"} />}
        </svg>
      </span>
      <span className="aura-layer-front">
        <span className="aura-front-current" />
        <span className="aura-wisp wisp-left" />
        {!isRook && <span className="aura-wisp wisp-right" />}
        {!isRook && <span className="aura-crown-flare">
          <span className="flare-core" />
          <span className="flare-rays" />
        </span>}
        {Array.from({ length: isRook ? 2 : 6 }, (_, i) => (
          <i key={i} className="aura-ember" style={{ "--ember-idx": i } as CSSProperties} />
        ))}
      </span>
    </span>
  );
});
const VipFrameEffects = memo(function VipFrameEffects() {
  return <span className="vip-frame-effects" aria-hidden="true"><span className="vip-rim" />
    {Array.from({ length: 16 }, (_, i) => {
      const side = Math.floor(i / 4), offset = 15 + (i % 4) * 23;
      return <i key={i} style={{ left: (side === 0 || side === 2 ? offset : side === 1 ? 96 : 4) + "%", top: (side === 1 || side === 3 ? offset : side === 0 ? 4 : 96) + "%", "--spark-delay": -i * .43 + "s" } as CSSProperties} />;
    })}
  </span>;
});
const CelestialFrameWings = memo(function CelestialFrameWings() {
  return <span className="celestial-frame-wings" aria-hidden="true">
    {/* Each raster wing pivots at its original attachment to the central crest. */}
    {["left", "right"].map(side => <img key={side} className={"celestial-original-wing original-wing-" + side} src={assetUrl("/boards/vip/celestial-wings.webp")} width={1254} height={1254} alt="" draggable={false} />)}
    <span className="celestial-crest-light" />
    {Array.from({ length: 14 }, (_, i) => <i className="celestial-wing-dust" key={i} style={{ left: (28 + i * 17 % 45) + "%", top: (2 + i % 4 * 1.8) + "%", "--wing-delay": -i * .37 + "s" } as CSSProperties} />)}
  </span>;
});
function IceWindEffects() {
  return <span className="ice-weather" aria-hidden="true">
    <svg className="ice-wind-trails" viewBox="0 0 800 400" preserveAspectRatio="none">
      <path d="M-100 100C100 0 185 180 390 100S650 15 900 90M-80 240C120 310 190 160 400 240S670 335 900 235" />
      <path className="ice-wind-curl" d="M-80 340C90 260 290 390 485 295C620 230 580 145 520 155C470 165 490 220 545 203C675 162 700 240 900 160" />
    </svg>
    <span className="ice-bloom bloom-one" /><span className="ice-bloom bloom-two" />
    {Array.from({ length: 18 }, (_, i) => <span className="ice-snowflake" key={"snow" + i} style={{ left: (i * 31 % 96) + "%", "--snow-size": (14 + i % 4 * 4) + "px", "--snow-delay": -i * .59 + "s", "--snow-speed": (4.8 + i % 5 * .7) + "s", "--snow-drift": (i % 2 ? 12 : -9) + "cqw" } as CSSProperties}>
      <svg viewBox="0 0 32 32"><g>{Array.from({ length: 6 }, (_, ray) => <path key={ray} transform={"rotate(" + ray * 60 + " 16 16)"} d="M16 16V2M16 8L11 4M16 8L21 4M16 12L12 9M16 12L20 9" />)}</g></svg>
    </span>)}
    {Array.from({ length: 7 }, (_, i) => <span key={"prism" + i} className="ice-prism" style={{ left: (8 + i * 13) + "%", top: (14 + i * 19 % 72) + "%", "--ice-delay": -i * .83 + "s", "--ice-speed": (5 + i % 3) + "s" } as CSSProperties} />)}
    {Array.from({ length: 9 }, (_, i) => <span key={"glint" + i} className="ice-glint" style={{ left: (12 + i * 37 % 78) + "%", top: (8 + i * 23 % 78) + "%", "--ice-delay": -i * .71 + "s", "--ice-speed": (4.5 + i % 4 * .7) + "s" } as CSSProperties} />)}
  </span>;
}
function CelestialHeavenEffects() {
  return <span className="celestial-heaven-effects" aria-hidden="true">
    {["left", "right"].map(side => <span key={side} className={"heaven-gold-rail rail-" + side}><span className="heaven-gold-current" />{Array.from({ length: 5 }, (_, i) => <i key={i} style={{ top: (8 + i * 19) + "%", "--gold-delay": -i * .67 + "s" } as CSSProperties} />)}</span>)}
    {Array.from({ length: 12 }, (_, i) => <span className="heaven-feather" key={i} style={{ left: (5 + i * 29 % 88) + "%", "--feather-delay": -i * .71 + "s", "--feather-speed": (5.4 + i % 4 * .75) + "s" } as CSSProperties}><svg viewBox="0 0 24 48"><path d="M12 44C-2 32 3 11 20 2C23 20 20 35 12 44Z" /><path className="feather-quill" d="M12 46L18 8M14 35L5 29M15 27L7 21M16 19L11 13" /></svg></span>)}
    <span className="heaven-gold-sweep sweep-left" /><span className="heaven-gold-sweep sweep-right" />
  </span>;
}
function CelestialInfernoEffects() {
  return <span className="celestial-inferno-effects" aria-hidden="true">
    <svg className="inferno-hot-current" viewBox="0 0 800 400" preserveAspectRatio="none"><path d="M-40 350C100 270 170 400 340 310S540 195 690 285S780 370 850 220M-50 160C100 220 170 90 340 160S570 260 690 150S780 55 850 130" /><path className="inferno-hot-core" d="M-40 350C100 270 170 400 340 310S540 195 690 285S780 370 850 220M-50 160C100 220 170 90 340 160S570 260 690 150S780 55 850 130" /></svg>
    {Array.from({ length: 5 }, (_, i) => <span key={i} className="inferno-molten-pool" style={{ left: (8 + i * 19) + "%", top: (30 + i * 23 % 49) + "%", "--inferno-delay": -i * .83 + "s" } as CSSProperties}><i /><i /></span>)}
    <span className="inferno-heat-wave" /><span className="inferno-heat-wave heat-wave-two" />
  </span>;
}
const SplitRealmEffects = memo(function SplitRealmEffects({ icefire }: { icefire: boolean }) {
  return <span className="split-realm-effects" aria-hidden="true">
    <span className="realm-atmosphere realm-light"><span className="realm-mist" /><span className="realm-radiance" /><span className="realm-halo" />
      {icefire && <IceWindEffects />}
      {!icefire && <CelestialHeavenEffects />}
      <span className="realm-icicles">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ left: (i * 8.5) + "%", "--crystal-delay": -i * .48 + "s", height: (9 + i % 4 * 4) + "%" } as CSSProperties} />)}</span>
      {Array.from({ length: 36 }, (_, i) => <i key={i} style={{ "--mote-x": (i * 37 % 97) + "%", "--mote-delay": -i * .71 + "s", "--mote-speed": (3.5 + i % 5 * .6) + "s", "--mote-size": (3 + i % 4 * 1.4) + "px" } as CSSProperties} />)}</span>
    <span className="realm-atmosphere realm-dark"><span className="realm-mist" /><span className="realm-radiance" />
      {!icefire && <CelestialInfernoEffects />}
      <svg className="realm-lava-rivers" viewBox="0 0 800 400" preserveAspectRatio="none"><path d="M-40 280Q70 220 170 255T370 245T570 260T840 190M-30 85Q90 150 190 100T430 125T660 90T850 130" /><path className="lava-river-core" d="M-40 280Q70 220 170 255T370 245T570 260T840 190M-30 85Q90 150 190 100T430 125T660 90T850 130" /></svg>
      <span className="realm-flames">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: (i * 7.4 - 2) + "%", "--flame-delay": -i * .37 + "s", "--flame-height": (18 + i % 5 * 5) + "%", "--flame-speed": (1.4 + i % 4 * .35) + "s" } as CSSProperties} />)}</span>
      {Array.from({ length: 36 }, (_, i) => <i key={i} style={{ "--mote-x": (i * 43 % 97) + "%", "--mote-delay": -i * .63 + "s", "--mote-speed": (2.5 + i % 5 * .55) + "s", "--mote-size": (2 + i % 4) + "px" } as CSSProperties} />)}</span>
    <span className="realm-collision" /><span className="realm-collision collision-echo" />
  </span>;
});
const RealmTileEffects = memo(function RealmTileEffects({ light, celestial, variant }: { light: boolean; celestial: boolean; variant: number }) {
  return <span className={"realm-tile-effects " + (light ? celestial ? "tile-heaven" : "tile-freeze" : "tile-magma")} aria-hidden="true">
    <span className="realm-tile-surface" />
    {light && !celestial && <span className="ice-tile-flash" />}
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ transform: "rotate(" + variant * 90 + "deg)" }}>
      {light ? <>
        <path className="crystal-branch" d="M0 95L24 70L42 54L59 36L78 15L94 0M24 70L10 49M24 70L47 78M42 54L25 32M42 54L67 62M59 36L46 16M59 36L84 41M78 15L66 0" />
        <path className="crystal-tip" d="M25 32L12 26M25 32L23 16M67 62L78 72M67 62L82 59M46 16L34 10M84 41L94 33M10 49L0 42M47 78L56 91" />
        {celestial && <path className="heaven-star" d="M70 16L74 27L86 31L74 35L70 47L66 35L54 31L66 27ZM25 64L28 72L36 75L28 78L25 86L22 78L14 75L22 72Z" />}
      </> : <>
        <path className="magma-crack" d="M-5 12L24 25L20 42L48 52L58 72L81 79L102 100M20 42L2 61M48 52L67 33L89 38L101 22M58 72L42 91L45 104" />
        <path className="magma-core" d="M-5 12L24 25L20 42L48 52L58 72L81 79L102 100M48 52L67 33L89 38L101 22" />
      </>}
    </svg>
  </span>;
});
const ChessBoard = memo(function ChessBoard({ pieces, moves, orientation, selected, legal, checkKing, canMove, pieceSet, boardTheme, splitTheme, dragFrom, boardRef, showHint, hintMove, actions }: {
  pieces: Piece[]; moves: MoveRecord[]; orientation: Color; selected: Square | null; legal: Square[];
  checkKing?: Square | null; canMove: boolean; pieceSet: PieceSetId; boardTheme: BoardStyle; splitTheme: "icefire" | "celestial" | null; dragFrom?: Square;
  boardRef: RefObject<HTMLDivElement | null>; showHint: boolean; hintMove?: { from: Square; to: Square } | null; actions: BoardActions;
}) {
  const last = moves.at(-1);
  const coordinates = (square: Square) => {
    const file = files.indexOf(square[0]), rank = 8 - Number(square[1]);
    return { x: (orientation === "w" ? file : 7 - file) * 100 + 50, y: (orientation === "w" ? rank : 7 - rank) * 100 + 50 };
  };
  return <div className="board" ref={boardRef} data-piece-set={pieceSet}>
    {Array.from({ length: 8 }, (_, rank) => Array.from({ length: 8 }, (_, file) => {
      const square = (files[orientation === "w" ? file : 7 - file] + (orientation === "w" ? 8 - rank : rank + 1)) as Square;
      const piece = pieces.find(item => item.square === square);
      return <button type="button" key={square} data-square={square} data-realm={Number(square[1]) <= 4 ? "light" : "dark"}
        className={"square " + ((rank + file) % 2 === 0 ? "square-light" : "square-dark") + (selected === square ? " square-selected" : "") + (last?.from === square || last?.to === square ? " square-last" : "") + (square === checkKing ? " square-check" : "")}
        style={{ "--tile-delay": -((rank * 8 + file) % 13) * .47 + "s" } as CSSProperties}
        aria-label={square + (piece ? ", " + names[piece.type] + " " + (piece.color === "w" ? "trắng" : "đen") : "")} onClick={() => actions.click(square)}>
        {splitTheme && <RealmTileEffects light={Number(square[1]) <= 4} celestial={splitTheme === "celestial"} variant={(file + rank * 3) % 4} />}
        {file === 0 && <span className="rank-label">{square[1]}</span>}{rank === 7 && <span className="file-label">{square[0]}</span>}
        {legal.includes(square) && <span className={piece ? "legal-capture" : "legal-dot"} />}
      </button>;
    }))}
    {splitTheme && <SplitRealmEffects icefire={splitTheme === "icefire"} />}
    <BoardEnchantments theme={boardTheme} />
    {pieces.map(piece => {
      const file = files.indexOf(piece.square[0]), rank = 8 - Number(piece.square[1]);
      const x = orientation === "w" ? file : 7 - file, y = orientation === "w" ? rank : 7 - rank;
      return <div key={piece.id} data-piece-type={piece.type} className={"piece piece-" + piece.color + (selected === piece.square ? " piece-selected" : "") + (dragFrom === piece.square ? " piece-dragging" : "")}
        style={{ transform: "translate3d(" + x * 100 + "%," + y * 100 + "%,0)", "--piece-travel-time": pieceTravelMs(piece.type) + "ms", pointerEvents: canMove && piece.color === liveTurn(moves) ? "auto" : "none" } as CSSProperties}
        onPointerDown={event => actions.down(event, piece)} onPointerMove={event => actions.move(event, piece)} onPointerUp={event => actions.up(event, piece)} onPointerCancel={actions.cancel}>
        <RoyalAura type={piece.type} color={piece.color} pieceSet={pieceSet} /><img src={pieceImage(piece, pieceSet)} alt="" draggable={false} decoding="async" />{piece.type === "q" && <QueenMetalGlint color={piece.color} pieceSet={pieceSet} />}</div>;
    })}
    <PieceMotion pieces={pieces} orientation={orientation} />
    {showHint && hintMove && (() => {
      const from = coordinates(hintMove.from), to = coordinates(hintMove.to);
      return <svg className="hint-overlay" viewBox="0 0 800 800" aria-hidden="true"><defs><marker id="hint-arrow" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5Z" fill="currentColor" /></marker></defs><circle cx={from.x} cy={from.y} r="30" /><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd="url(#hint-arrow)" /></svg>;
    })()}
  </div>;
});
function liveTurn(moves: MoveRecord[]): Color { return moves.length % 2 === 0 ? "w" : "b"; }

export default function ChessApp() {
  const [local, setLocal] = useState<LocalGame>(DEFAULT_GAME);
  const [online, setOnline] = useState<OnlineGame | null>(null);
  const [localMode, setLocalMode] = useState<Mode>("ai");
  const [difficulty, setDifficulty] = useState<Difficulty | "master">("hard");
  const [humanColor, setHumanColor] = useState<Color>("w");
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [profileName, setProfileName] = useState("Kỳ thủ");
  const [localNames, setLocalNames] = useState({ w: "Kỳ thủ", b: "Bạn cùng bàn" });
  const [nameDraft, setNameDraft] = useState("Kỳ thủ");
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(15);
  const [moveSeconds, setMoveSeconds] = useState(120);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [connection, setConnection] = useState<"live" | "retrying" | "connecting">("connecting");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const openMenu = useCallback(() => setModal("menu"), []);
  const openCollection = useCallback(() => setModal("pieces"), []);
  const [joinCode, setJoinCode] = useState("");
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_AUDIO);
  const [audioStarted, setAudioStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "moves" | "room">("ai");
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [aiFailed, setAiFailed] = useState(false);
  const [aiRetry, setAiRetry] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [activeLine, setActiveLine] = useState(1);
  const [analysisState, setAnalysisState] = useState<{ key: string; lines: EngineLine[]; result?: EngineAnalysis; loading: boolean; error?: string } | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<boolean | null>(null);
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number; size: number } | null>(null);
  const sessionRef = useRef({ code: "", token: "", epoch: 0 });
  const boardRef = useRef<HTMLDivElement>(null);
  const dragPieceRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const promotionRef = useRef<HTMLDialogElement>(null);
  const audioRef = useRef<ChessAudio | null>(null);
  const pointerRef = useRef<{ from: Square; x: number; y: number; moved: boolean } | null>(null);
  const analysisAbort = useRef<AbortController | null>(null);
  const current = online || local;
  const liveGame = useMemo(() => buildGame(current.moves), [current.moves]);
  const displayMoves = useMemo(() => reviewPly === null ? current.moves : current.moves.slice(0, reviewPly), [current.moves, reviewPly]);
  const game = useMemo(() => displayMoves === current.moves ? liveGame : buildGame(displayMoves), [displayMoves, current.moves, liveGame]);
  const pieces = useMemo(() => getPieces(displayMoves), [displayMoves]);
  const aiMode = !online && localMode === "ai";
  const ownColor = online?.color || (aiMode ? humanColor : "w");
  const orientation: Color = flipped ? (ownColor === "w" ? "b" : "w") : ownColor;
  const topColor: Color = orientation === "w" ? "b" : "w";
  const turn = liveGame.turn();
  const aiThinking = aiMode && local.status === "playing" && turn !== humanColor && !aiFailed;
  const serverNow = online ? online.serverNow + Math.max(0, tick - online.receivedAt) : tick;
  const clock = online ? chessClock({ fen: online.fen, status: online.status, whiteMs: online.clock.whiteMs, blackMs: online.clock.blackMs,
    turnStartedAt: online.clock.turnStartedAt, moveLimitSeconds: online.clock.moveLimitSeconds }, serverNow) : null;
  const canMove = ready && !restoring && !busy && reviewPly === null && current.status === "playing" && !clock?.expired
    && (online ? online.hasBlack && online.color === turn && connection === "live" : !aiMode || turn === humanColor);
  const legal = useMemo(() => selected && canMove ? game.moves({ square: selected, verbose: true }).map(move => move.to) : [], [selected, canMove, game]);
  const positionKey = (online?.code || localMode) + ":" + current.version + ":" + game.fen();
  const analysis = analysisState?.key === positionKey ? analysisState : null;
  const bestLine = analysis?.lines.find(line => line.rank === activeLine) || analysis?.lines[0];
  const hintMove = useMemo(() => bestLine ? parseUciMove(bestLine.pv[0]) : analysis?.result?.move, [bestLine, analysis?.result?.move]);
  const canAnalyze = !busy && ready && !restoring && !game.isGameOver();
  const currentBoardStyle = BOARD_STYLES.find(item => item.id === appearance.boardTheme)!;
  const vipBoard = VIP_BOARDS.find(item => item.id === appearance.boardTheme);
  const splitRealms = Boolean(vipBoard && "splitRealms" in vipBoard && vipBoard.splitRealms);
  const currentCover = COVER_SCENES.find(item => item.id === appearance.cover)!;
  const currentEffect = ATMOSPHERES.find(item => item.id === appearance.effect)!;
  const currentPieceSet = PIECE_SETS.find(item => item.id === appearance.pieceSet)!;

  const applyRoom = useCallback((room: RoomView) => {
    if (sessionRef.current.code !== room.code) return;
    const receivedAt = Date.now();
    setOnline(previous => previous && previous.code === room.code &&
      (previous.version > room.version || (previous.version === room.version && previous.updatedAt > room.updatedAt))
      ? previous : { ...room, receivedAt, moves: previous?.code === room.code && previous.fen === room.fen && previous.moves.length === room.moves.length ? previous.moves : room.moves });
    setConnection("live");
  }, []);

  const fetchRoom = useCallback(async (code: string, token = "", signal?: AbortSignal) => {
    const response = await roomFetch("/api/rooms/" + code, { headers: token ? { "x-player-token": token } : {}, signal, cache: "no-store" });
    const data: ApiData = await response.json();
    if (!response.ok || !data.room) throw new Error(data.error || "Không tìm thấy phòng.");
    return data.room;
  }, []);

  const adoptRoom = useCallback((room: RoomView, token: string) => {
    sessionRef.current = { code: room.code, token, epoch: sessionRef.current.epoch + 1 };
    setOnline({ ...room, receivedAt: Date.now() });
    setConnection("live");
    setSelected(null); setPromotion(null); setFlipped(false); setReviewPly(null); setModal(null); setAnalysisState(null); setPendingAnalysis(null);
    setJoinCode(room.code); setNameDraft(room.color ? room.players[room.color === "w" ? "white" : "black"].name : "Kỳ thủ");
    setActiveTab("room");
    remember("nuocco:lastRoom", room.code);
    if (token) remember("nuocco:" + room.code, token);
    window.history.replaceState({}, "", "?room=" + room.code);
    let old: RecentRoom[] = [];
    try { const saved = JSON.parse(stored("nuocco:recentRooms") || "[]"); if (Array.isArray(saved)) old = saved.filter(item => item && typeof item.code === "string"); } catch { /* Ignore malformed recent rooms. */ }
    const recent: RecentRoom[] = [{ code: room.code, color: room.color, name: room.players.white.name + " · " + room.players.black.name, savedAt: Date.now() },
      ...old.filter(item => item.code !== room.code)].slice(0, 6);
    setRecentRooms(recent); remember("nuocco:recentRooms", JSON.stringify(recent));
  }, []);

  useEffect(() => {
    // Browser data is intentionally restored only after the shared SSR render.
    /* eslint-disable react-hooks/set-state-in-effect -- One-time restoration of device preferences and saved games after hydration. */
    const pieceSet = stored("nuocco:pieceSet");
    setAppearance({ ...restoreVisuals(stored), pieceSet: validPieceSet(pieceSet) ? pieceSet : DEFAULT_PIECE_SET });
    const savedName = stored("nuocco:playerName") || "Kỳ thủ";
    setProfileName(savedName); setNameDraft(savedName); setAudioSettings(restoreAudio(stored("nuocco:audio:v1")));
    try {
      const recent: unknown = JSON.parse(stored("nuocco:recentRooms") || "[]");
      if (Array.isArray(recent)) setRecentRooms(recent.filter(item => item && typeof item.code === "string" && normalizeCode(item.code).length === 6).slice(0, 6));
      const saved = JSON.parse(stored("nuocco:local:v2") || "null");
      if (saved && Array.isArray(saved.game?.moves) && saved.game.moves.length <= 5000) {
        const restored = buildGame(saved.game.moves);
        setLocal({ fen: restored.fen(), moves: saved.game.moves, status: resultStatus(restored), version: Number(saved.game.version) || 0 });
        setLocalMode(saved.mode === "local" ? "local" : "ai");
        if (["easy", "medium", "hard"].includes(saved.difficulty)) setDifficulty(saved.difficulty);
        else if (saved.difficulty === "master") setDifficulty("hard");
        setHumanColor(saved.humanColor === "b" ? "b" : "w");
        if (saved.localNames && typeof saved.localNames.w === "string" && typeof saved.localNames.b === "string") setLocalNames(saved.localNames);
      } else setLocalNames({ w: savedName, b: "Bạn cùng bàn" });
    } catch { /* Corrupt device data never blocks the board. */ }
    setReady(true); setTick(Date.now());
    const code = normalizeCode(new URLSearchParams(window.location.search).get("room") || stored("nuocco:lastRoom") || "");
    if (code.length !== 6) return;
    setRestoring(true);
    const token = stored("nuocco:" + code) || "";
    const controller = new AbortController();
    fetchRoom(code, token, controller.signal).then(room => {
      if (controller.signal.aborted) return;
      if (room.color) adoptRoom(room, token);
      else { setJoinCode(code); setModal("join"); setMessage("Nhập tên rồi tham gia để nhận quân Đen."); }
    }).catch(error => { if (!controller.signal.aborted) { setMessage(errorText(error)); forget("nuocco:lastRoom"); } })
      .finally(() => { if (!controller.signal.aborted) setRestoring(false); });
    return () => controller.abort();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchRoom, adoptRoom]);

  useEffect(() => {
    if (!ready || online || restoring) return;
    remember("nuocco:local:v2", JSON.stringify({ game: local, mode: localMode, difficulty, humanColor, localNames }));
  }, [ready, online, restoring, local, localMode, difficulty, humanColor, localNames]);

  const onlineCode = online?.code;
  useEffect(() => {
    if (!onlineCode) return;
    const pulse = () => { if (!document.hidden) setTick(Date.now()); };
    const timer = window.setInterval(pulse, 1000);
    document.addEventListener("visibilitychange", pulse);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", pulse); };
  }, [onlineCode]);
  useEffect(() => {
    if (!onlineCode) return;
    const session = sessionRef.current;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    let inFlight = false;
    let failures = 0;
    const poll = async () => {
      if (stopped || inFlight) return;
      inFlight = true; controller = new AbortController();
      try {
        const room = await fetchRoom(session.code, session.token, controller.signal);
        failures = 0;
        if (!stopped && session.epoch === sessionRef.current.epoch) applyRoom(room);
      } catch { failures++; if (!stopped) setConnection("retrying"); }
      finally {
        inFlight = false;
        if (!stopped) timer = setTimeout(poll, failures ? Math.min(8000, 1000 * 2 ** Math.min(failures - 1, 3)) : document.hidden ? 5000 : 750);
      }
    };
    const resume = () => { clearTimeout(timer); void poll(); };
    void poll();
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  }, [onlineCode, applyRoom, fetchRoom]);

  const ownServerName = online?.color ? online.players[online.color === "w" ? "white" : "black"].name : "";
  useEffect(() => {
    const session = sessionRef.current;
    const clean = nameDraft.replace(/\s+/g, " ").trim();
    if (!onlineCode || !session.token || !clean || Array.from(clean).length > 24 || clean === ownServerName) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await roomFetch("/api/rooms/" + session.code + "/player", { method: "PATCH", signal: controller.signal,
          headers: { "Content-Type": "application/json", "x-player-token": session.token }, body: JSON.stringify({ name: clean }) });
        const data: ApiData = await response.json();
        if (!response.ok) throw new Error(data.error || "Chưa lưu được tên.");
        if (data.room && session.epoch === sessionRef.current.epoch) applyRoom(data.room);
        remember("nuocco:playerName", clean); setProfileName(clean);
      } catch (error) { if (!controller.signal.aborted) setMessage(errorText(error)); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [nameDraft, ownServerName, onlineCode, applyRoom]);

  useEffect(() => {
    const dialog = modalRef.current;
    if (modal && dialog && !dialog.open) dialog.showModal();
    if (!modal && dialog?.open) dialog.close();
  }, [modal]);
  useEffect(() => {
    const dialog = promotionRef.current;
    if (promotion && dialog && !dialog.open) dialog.showModal();
    if (!promotion && dialog?.open) dialog.close();
  }, [promotion]);
  useEffect(() => {
    analysisAbort.current?.abort();
    return () => analysisAbort.current?.abort();
  }, [positionKey]);

  useEffect(() => {
    const audio = new ChessAudio();
    audioRef.current = audio;
    audio.setHidden(document.hidden);
    let mounted = true;
    const unlock = () => { void audio.unlock().then(started => { if (mounted && started) setAudioStarted(true); }); };
    const visibility = () => audio.setHidden(document.hidden);
    document.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted = false;
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("visibilitychange", visibility);
      audio.dispose(); audioRef.current = null;
    };
  }, []);
  useEffect(() => { audioRef.current?.configure(audioSettings); }, [audioSettings]);
  function changeAudio(channel: AudioChannel | "musicEnabled", value: number | boolean) {
    const next = restoreAudio(JSON.stringify({ ...audioSettings, [channel]: value }));
    setAudioSettings(next); audioRef.current?.configure(next);
    remember("nuocco:audio:v1", JSON.stringify(next));
  }
  const playSound = useCallback((capture = false, san = "") => { audioRef.current?.move(capture, san); }, []);
  const heardOnlineMove = useRef({ code: "", count: 0 });
  useEffect(() => {
    const previous = heardOnlineMove.current;
    const count = online?.moves.length || 0, code = online?.code || "";
    heardOnlineMove.current = { code, count };
    if (!online || !ready || restoring || previous.code !== code || count !== previous.count + 1) return;
    const last = online.moves.at(-1)!;
    const mover = count % 2 === 1 ? "w" : "b";
    if (mover !== online.color) playSound(last.flags.includes("c") || last.flags.includes("e"), last.san);
  }, [online, ready, restoring, playSound]);

  useEffect(() => {
    if (!ready || restoring || !aiMode || aiFailed || local.status !== "playing" || turn === humanColor) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await searchStockfish(local.moves, { difficulty, signal: controller.signal });
        if (controller.signal.aborted) return;
        const nextGame = buildGame(local.moves), move = nextGame.move(result.move);
        const record: MoveRecord = { from: move.from, to: move.to, san: move.san, flags: move.flags, ...(move.promotion ? { promotion: move.promotion } : {}) };
        setLocal(previous => previous.version === local.version ? { fen: nextGame.fen(), moves: [...previous.moves, record], status: resultStatus(nextGame), version: previous.version + 1 } : previous);
        playSound(Boolean(move.captured), move.san);
      } catch { if (!controller.signal.aborted) { setAiFailed(true); setMessage("AI chưa tính được nước đi. Bạn có thể thử lại."); } }
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [ready, restoring, aiMode, aiFailed, local, turn, humanColor, difficulty, aiRetry, playSound]);

  const requestAnalysis = useCallback(async (deep = false) => {
    if (!canAnalyze) return;
    if (aiThinking) {
      setPendingAnalysis(deep);
      setAnalysisState({ key: positionKey, lines: [], loading: true });
      return;
    }
    analysisAbort.current?.abort();
    const controller = new AbortController(); analysisAbort.current = controller;
    const key = positionKey;
    setShowHint(true); setActiveLine(1); setActiveTab("ai"); setAnalysisState({ key, lines: [], loading: true });
    try {
      const result = await searchStockfish(displayMoves, { analysis: true, deep, signal: controller.signal,
        onInfo: lines => { if (!controller.signal.aborted) setAnalysisState({ key, lines, loading: true }); } });
      if (!controller.signal.aborted) setAnalysisState({ key, lines: result.lines, result, loading: false });
    } catch (error) { if (!controller.signal.aborted) setAnalysisState({ key, lines: [], loading: false, error: errorText(error) }); }
  }, [canAnalyze, aiThinking, positionKey, displayMoves]);

  useEffect(() => {
    if (pendingAnalysis === null || aiThinking || !canAnalyze) return;
    // Run the queued request on the human's new position after the AI finishes.
    /* eslint-disable react-hooks/set-state-in-effect -- Resolving an explicit queued user action. */
    setPendingAnalysis(null);
    void requestAnalysis(pendingAnalysis);
  }, [pendingAnalysis, aiThinking, canAnalyze, requestAnalysis]);

  async function createRoom() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await roomFetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim() || "Kỳ thủ", totalMinutes, moveSeconds }) });
      const data: ApiData = await response.json();
      if (!response.ok || !data.room || !data.token) throw new Error(data.error || "Không thể tạo phòng.");
      adoptRoom(data.room, data.token);
    } catch (error) { setMessage(errorText(error)); }
    finally { setBusy(false); }
  }
  async function joinRoom(value = joinCode) {
    const code = normalizeCode(value);
    if (code.length !== 6 || busy) { setMessage("Mã mời gồm đúng 6 ký tự."); return; }
    setBusy(true); setMessage("");
    try {
      let token = stored("nuocco:" + code) || "";
      let room = await fetchRoom(code, token);
      if (!room.color) {
        token = "";
        if (!room.hasBlack && room.status === "waiting") {
          const response = await roomFetch("/api/rooms/" + code + "/join", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: profileName.trim() || "Kỳ thủ" }) });
          const data: ApiData = await response.json();
          if (!response.ok || !data.room || !data.token) throw new Error(data.error || "Không thể vào phòng.");
          room = data.room; token = data.token;
        } else setMessage("Hai ghế đã có người giữ. Bạn đang xem trận đấu.");
      }
      adoptRoom(room, token);
    } catch (error) { setMessage(errorText(error)); }
    finally { setBusy(false); }
  }
  function newLocal(mode: Mode = localMode, color?: Color) {
    if (online?.status === "playing" && !window.confirm("Rời phòng không dừng đồng hồ. Bạn vẫn có thể vào lại bằng mã. Tiếp tục?")) return;
    analysisAbort.current?.abort();
    sessionRef.current = { code: "", token: "", epoch: sessionRef.current.epoch + 1 };
    const nextColor: Color = color ?? (humanColor === "w" ? "b" : "w");
    setOnline(null); setLocal({ ...DEFAULT_GAME, version: local.version + 1 }); setLocalMode(mode); setHumanColor(nextColor);
    let nextWhiteName = localNames.w;
    if (mode === "local") {
      setLocalNames(previous => {
        nextWhiteName = previous.b;
        return { w: previous.b, b: previous.w };
      });
    }
    setSelected(null); setPromotion(null); setReviewPly(null); setFlipped(false); setAiFailed(false); setAnalysisState(null); setPendingAnalysis(null);
    if (mode === "ai") {
      setMessage("Ván mới: Bạn cầm quân " + (nextColor === "w" ? "Trắng (đi trước)." : "Đen. Stockfish cầm quân Trắng và đi trước."));
    } else if (mode === "local") {
      setMessage("Ván mới: " + nextWhiteName + " cầm quân Trắng và đi trước.");
    } else {
      setMessage("");
    }
    forget("nuocco:lastRoom"); window.history.replaceState({}, "", window.location.pathname); setActiveTab("ai");
  }
  async function commitMove(from: Square, to: Square, choice?: string) {
    if (!canMove) return;
    const nextGame = buildGame(current.moves);
    let moved;
    try { moved = nextGame.move({ from, to, promotion: choice }); } catch { setSelected(null); return; }
    const record: MoveRecord = { from: moved.from, to: moved.to, san: moved.san, flags: moved.flags, ...(moved.promotion ? { promotion: moved.promotion } : {}) };
    setSelected(null); setPromotion(null); setAiFailed(false); setReviewPly(null);
    if (!online) {
      setLocal({ fen: nextGame.fen(), moves: [...local.moves, record], status: resultStatus(nextGame), version: local.version + 1 });
      playSound(Boolean(moved.captured), moved.san); return;
    }
    const session = { ...sessionRef.current };
    setBusy(true);
    try {
      const response = await roomFetch("/api/rooms/" + session.code + "/move", { method: "POST",
        headers: { "Content-Type": "application/json", "x-player-token": session.token },
        body: JSON.stringify({ from, to, promotion: choice, version: online.version }) });
      const data: ApiData = await response.json();
      if (session.epoch !== sessionRef.current.epoch) return;
      if (data.room) applyRoom(data.room);
      if (!response.ok) throw new Error(data.error || "Không thể gửi nước đi.");
      playSound(Boolean(moved.captured), moved.san);
    } catch (error) {
      if (session.epoch !== sessionRef.current.epoch) return;
      setMessage(errorText(error));
      try { applyRoom(await fetchRoom(session.code, session.token)); } catch { setConnection("retrying"); }
    } finally { setBusy(false); }
  }
  function attemptMove(from: Square, to: Square) {
    if (!canMove || !liveGame.moves({ square: from, verbose: true }).some(move => move.to === to)) { setSelected(null); return; }
    if (liveGame.get(from)?.type === "p" && (to[1] === "1" || to[1] === "8")) setPromotion({ from, to });
    else void commitMove(from, to);
  }
  function onSquareClick(square: Square) {
    if (!canMove) return;
    if (selected && legal.includes(square)) attemptMove(selected, square);
    else {
      if (game.get(square)?.color === turn && selected !== square) audioRef.current?.effect("pickup");
      setSelected(game.get(square)?.color === turn ? square : null);
    }
  }
  function onPieceDown(event: PointerEvent<HTMLDivElement>, piece: Piece) {
    if (!canMove || piece.color !== turn || event.button !== 0) return;
    audioRef.current?.effect("pickup");
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { from: piece.square, x: event.clientX, y: event.clientY, moved: false };
    setSelected(piece.square);
  }
  function onPieceMove(event: PointerEvent<HTMLDivElement>, piece: Piece) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.from !== piece.square) return;
    if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) pointer.moved = true;
    if (pointer.moved) {
      if (dragPieceRef.current) {
        dragPieceRef.current.style.transform = "translate3d(" + event.clientX + "px," + event.clientY + "px,0) translate(-50%,-50%)";
      } else {
        setDrag({ from: piece.square, x: event.clientX, y: event.clientY, size: (boardRef.current?.getBoundingClientRect().width || 480) / 8 });
      }
    }
  }
  function onPieceUp(event: PointerEvent<HTMLDivElement>, piece: Piece) {
    const pointer = pointerRef.current; pointerRef.current = null; setDrag(null);
    if (!pointer?.moved) return;
    const rect = boardRef.current?.getBoundingClientRect(); if (!rect) return;
    const x = Math.floor((event.clientX - rect.left) / (rect.width / 8)), y = Math.floor((event.clientY - rect.top) / (rect.height / 8));
    if (x < 0 || x > 7 || y < 0 || y > 7) return;
    const square = (files[orientation === "w" ? x : 7 - x] + (orientation === "w" ? 8 - y : y + 1)) as Square;
    if (square !== piece.square) attemptMove(piece.square, square);
  }
  async function roomAction(action: "resign" | "offer" | "accept" | "decline" | "cancel") {
    if (!online?.color || busy) return;
    const confirmation = { resign: "Bạn có chắc muốn đầu hàng? Đối thủ sẽ thắng ván này.", offer: "Bạn có chắc muốn gửi lời cầu hòa? Ván chỉ hòa khi đối thủ đồng ý.", accept: "Bạn có chắc chấp nhận cầu hòa? Ván đấu sẽ kết thúc hòa.", decline: "Bạn có chắc từ chối cầu hòa và tiếp tục đấu?", cancel: "Bạn có chắc muốn thu hồi lời cầu hòa?" };
    if (!window.confirm(confirmation[action])) return;
    const session = { ...sessionRef.current }; setBusy(true);
    try {
      const response = await roomFetch("/api/rooms/" + session.code + "/" + (action === "resign" ? "resign" : "draw"),
        { method: "POST", headers: { "Content-Type": "application/json", "x-player-token": session.token }, body: JSON.stringify({ action }) });
      const data: ApiData = await response.json();
      if (session.epoch !== sessionRef.current.epoch) return;
      if (data.room) applyRoom(data.room);
      if (!response.ok) throw new Error(data.error || "Chưa gửi được yêu cầu.");
    } catch (error) { setMessage(errorText(error)); }
    finally { setBusy(false); }
  }
  async function startRoom() {
    if (!online?.color || busy || online.status !== "waiting" || !online.hasBlack) return;
    const session = { ...sessionRef.current }; setBusy(true);
    try {
      const response = await roomFetch("/api/rooms/" + session.code + "/start", {
        method: "POST", headers: { "Content-Type": "application/json", "x-player-token": session.token }, body: "{}",
      });
      const data: ApiData = await response.json();
      if (session.epoch !== sessionRef.current.epoch) return;
      if (data.room) applyRoom(data.room);
      if (!response.ok) throw new Error(data.error || "Chưa thể bắt đầu ván.");
    } catch (error) { setMessage(errorText(error)); }
    finally { setBusy(false); }
  }
  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setMessage("Sao chép: " + text); }
  }
  function playerLabel(color: Color) {
    if (online) return online.players[color === "w" ? "white" : "black"].name;
    if (aiMode && color !== humanColor) return "Stockfish 19";
    return localNames[color];
  }
  function changeName(color: Color, value: string) {
    if (online) setNameDraft(value);
    else {
      setLocalNames(previous => ({ ...previous, [color]: value }));
      if (color === humanColor || localMode === "local") { setProfileName(value); remember("nuocco:playerName", value); }
    }
  }
  function exportGame() {
    const exported = buildGame(current.moves);
    exported.header("Event", online ? "Nước Cờ Online " + online.code : "Nước Cờ Atelier", "White", playerLabel("w"), "Black", playerLabel("b"),
      "Result", current.status === "white_won" ? "1-0" : current.status === "black_won" ? "0-1" : current.status === "draw" ? "1/2-1/2" : "*");
    const url = URL.createObjectURL(new Blob([exported.pgn()], { type: "application/x-chess-pgn;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nuoc-co-" + (online?.code || "luyen-tap") + ".pgn"; anchor.click(); URL.revokeObjectURL(url);
  }
  function changeBoardTheme(boardTheme: BoardStyle) { setAppearance(previous => ({ ...previous, boardTheme })); remember("nuocco:boardTheme", boardTheme); }
  function changePieceSet(pieceSet: PieceSetId) { setAppearance(previous => ({ ...previous, pieceSet })); remember("nuocco:pieceSet", pieceSet); }
  function changeEffect(effect: Atmosphere) { setAppearance(previous => ({ ...previous, effect, particlesOn: true })); remember("nuocco:effect", effect);  }
  function changeCover(cover: CoverScene) { setAppearance(previous => ({ ...previous, cover })); remember("nuocco:cover", cover); }
  function changeMotion(motionOn: boolean) { setAppearance(previous => ({ ...previous, motionOn })); remember("nuocco:coverMotion", String(motionOn)); }
  const winner: Color | null = current.status === "white_won" ? "w" : current.status === "black_won" ? "b" : null;
  const draggedPiece = drag ? pieces.find(piece => piece.square === drag.from) : null;
  const ended = current.status !== "waiting" && current.status !== "playing";
  const timeout = online?.endReason === "timeout" || online?.endReason === "move_timeout";
  const resultTitle = current.status === "draw" ? "Hòa cờ" : online
    ? winner === online.color ? "Bạn đã chiến thắng!" : online.color ? timeout ? "Bạn đã thua do quá giờ" : "Bạn đã thua" : playerLabel(winner!) + " chiến thắng"
    : aiMode ? winner === humanColor ? "Bạn đã chiến thắng!" : "Bạn đã thua" : playerLabel(winner!) + " chiến thắng";
  const resultDetail = current.status === "draw" ? online ? "Ván đấu đã kết thúc hòa." : "Một thế cờ cân bằng. Cùng bắt đầu ván mới nhé."
    : current.status === "playing" ? "" : online?.endReason === "checkmate" || (!online && liveGame.isCheckmate()) ? "Chiếu bí. Ván đấu đã khép lại." : timeout ? "Thời gian của kỳ thủ đã hết." : online?.endReason === "resign" ? "Một kỳ thủ đã xin thua." : "Ván đấu đã kết thúc.";
  const statusLabel = restoring ? "Đang khôi phục trận…" : reviewPly !== null ? "Đang xem lại nước " + reviewPly
    : current.status === "waiting" ? online?.hasBlack ? "Đủ hai người · Bấm bắt đầu" : "Chờ người bạn cùng chơi"
    : ended ? current.status === "draw" ? "Một ván cờ hòa đẹp" : timeout && online?.color && winner !== online.color ? "Bạn đã thua do quá giờ" : playerLabel(winner!) + " chiến thắng"
    : aiThinking ? "Stockfish đang suy nghĩ…" : liveGame.isCheck() ? "Chiếu tướng · Hãy bảo vệ Vua" : (online?.color === turn ? "Đến lượt bạn" : turn === "w" ? "Lượt quân Trắng" : "Lượt quân Đen");
  const checkKing = game.isCheck() ? pieces.find(piece => piece.type === "k" && piece.color === game.turn())?.square : null;
  const captures = useMemo(() => game.history({ verbose: true }).filter(move => move.captured), [game]);
  const material = useMemo(() => game.board().flat().reduce((sum, piece) => sum + (piece ? values[piece.type] * (piece.color === "w" ? 1 : -1) : 0), 0), [game]);
  const boardActionsRef = useRef<BoardActions>(null);
  useEffect(() => {
    boardActionsRef.current = { click: onSquareClick, down: onPieceDown, move: onPieceMove, up: onPieceUp,
      cancel: () => { pointerRef.current = null; setDrag(null); } };
  });
  const stableBoardActions = useMemo<BoardActions>(() => ({
    click: square => boardActionsRef.current?.click(square),
    down: (event, piece) => boardActionsRef.current?.down(event, piece),
    move: (event, piece) => boardActionsRef.current?.move(event, piece),
    up: (event, piece) => boardActionsRef.current?.up(event, piece),
    cancel: () => boardActionsRef.current?.cancel(),
  }), []);
  function playerBar(color: Color) {
    const own = online ? online.color === color : !aiMode || humanColor === color;
    const editable = own && !restoring;
    const player = online?.players[color === "w" ? "white" : "black"];
    const connected = player?.seenAt ? serverNow - player.seenAt < 15000 : false;
    const milliseconds = clock ? color === "w" ? clock.whiteMs : clock.blackMs : null;
    return <div className={"player-card " + (turn === color && current.status === "playing" ? "player-active" : "")} data-color={color}>
      <div className={"player-avatar avatar-" + color}><img src={pieceImage({ color, type: "k" }, appearance.pieceSet)} alt="" /></div>
      <div className="player-info">
        <div className="player-name-line">{editable
          ? <input className="player-name" aria-label={"Tên người chơi " + (color === "w" ? "Trắng" : "Đen")} maxLength={24}
              value={online ? nameDraft : localNames[color]} onChange={event => changeName(color, event.target.value)}
              onBlur={() => { if (online) setNameDraft(value => value.trim() || ownServerName); }} title="Bấm vào tên để đổi · tự động lưu" />
          : <strong className="player-name-static">{!online?.hasBlack && online && color === "b" ? "Chờ đối thủ…" : playerLabel(color)}</strong>}
          {own && <span className="you-tag">BẠN</span>}
        </div>
        <div className="player-detail"><span className={"presence-dot " + (online && !connected ? "presence-away" : "")} />
          {online ? (color === "b" && !online.hasBlack ? "Ghế Đen đang trống" : connected ? "Đang kết nối" : "Tạm ngoại tuyến") : aiMode && color !== humanColor ? "Engine WASM · " + ({ easy: "Thấp", medium: "Khá", hard: "Giỏi", master: "Giỏi" }[difficulty]) : "Nhấn vào tên để chỉnh sửa"}
          {!online && aiMode && color !== humanColor && aiThinking && <span className={"thinking-indicator difficulty-" + difficulty} role="status"><span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>AI đang tính nước đi</span>}
          <span className="captured-pieces">{captures.filter(move => move.color === color).map((move, index) => <img key={index} src={pieceImage({ color: color === "w" ? "b" : "w", type: move.captured! }, appearance.pieceSet)} alt={names[move.captured!]} />)}
            {(color === "w" ? material : -material) > 0 && <b>+{color === "w" ? material : -material}</b>}</span>
        </div>
      </div>
      <div className={"player-clock " + (milliseconds !== null && milliseconds <= 30000 ? "clock-low" : "")}>
        <span>{milliseconds === null ? "∞" : clockText(milliseconds)}</span><small>{turn === color && current.status === "playing" ? "ĐANG ĐI" : color === "w" ? "QUÂN TRẮNG" : "QUÂN ĐEN"}</small>
      </div>
    </div>;
  }

  return <div className={"site-shell battlefield-" + currentBoardStyle.world + " piece-style-" + appearance.pieceSet + (appearance.motionOn ? "" : " motion-off")}>
    <VisualPerformance /><ChessAtmosphere effect={appearance.effect} />
    <header className="topbar">
      <button className="brand" onClick={() => online ? setActiveTab("room") : newLocal()} aria-label={online ? "Nước Cờ - Phòng đấu" : "Nước Cờ - Ván mới"}><span className="brand-mark"><img src={pieceImage({ color: "w", type: "n" }, appearance.pieceSet)} alt="" /></span><span>Nước Cờ<small>THE CHESS ATELIER</small></span></button>
      <nav className="header-style-controls" aria-label="Tùy chỉnh bàn cờ">
        <button onClick={() => setModal("appearance")} aria-label={"Chọn bàn cờ: " + currentBoardStyle.name}>{vipBoard ? <Crown size={17} /> : <Palette size={17} />}<span><strong>Bàn cờ</strong><small>{currentBoardStyle.name}</small></span></button>
        <button onClick={() => setModal("effects")} aria-label={"Chọn hiệu ứng: " + currentEffect.name}><Sparkles size={17} /><span><strong>Hiệu ứng</strong><small>{currentEffect.name}</small></span></button>
        <button onClick={() => setModal("pieces")} aria-label={"Chọn bộ quân cờ: " + currentPieceSet.name}><Crown size={17} /><span><strong>Bộ quân</strong><small>{currentPieceSet.name}</small></span></button>
      </nav>
      <div className="header-actions"><button className="header-music" aria-label="Âm nhạc và âm thanh" aria-haspopup="dialog" onClick={() => setModal("audio")}><Music2 size={18} /><span>Âm nhạc</span></button><button className="header-join" aria-label="Nhập mã mời" onClick={() => { setModal("join"); setMessage(""); }}><Hash size={16} /><span>Nhập mã mời</span></button><button className="primary-button header-create" onClick={() => setModal("create")}><Plus size={17} /><span>Tạo phòng</span></button></div>
    </header>
    <main className="arena-layout">
      <div className="side-player side-player-left">{playerBar(topColor)}</div>
      <ChessInspiration knight={pieceImage({ color: "w", type: "n" }, appearance.pieceSet)} scene={currentCover.image} motion={appearance.motionOn} menuOpen={modal === "menu"} onMenu={openMenu} onCollection={openCollection} />

      <section className={"board-column theme-" + appearance.boardTheme + (vipBoard ? " board-vip" : "") + (splitRealms ? " board-split-realms realm-" + (orientation === "w" ? "white-bottom" : "white-top") : "")} aria-label="Bàn cờ vua">
        <div className="board-stage">
          <div className={"board-frame" + (vipBoard ? " vip-frame" : "")} style={vipBoard ? { "--vip-inset": splitRealms ? realmBoardInset(vipBoard.inset, orientation) : vipBoard.inset } as CSSProperties : undefined}>
            {vipBoard && <>{appearance.boardTheme === "vip-dragon" ? <DragonFrame /> : <img className="vip-board-art" src={assetUrl(vipBoard.art)} width={1254} height={1254} alt="" draggable={false} />}<VipFrameEffects />{appearance.boardTheme === "vip-celestial" && <CelestialFrameWings />}</>}
            <ChessBoard pieces={pieces} moves={displayMoves} orientation={orientation} selected={selected} legal={legal}
            checkKing={checkKing} canMove={canMove} pieceSet={appearance.pieceSet} boardTheme={appearance.boardTheme} splitTheme={appearance.boardTheme === "vip-icefire" ? "icefire" : appearance.boardTheme === "vip-celestial" ? "celestial" : null} dragFrom={drag?.from} boardRef={boardRef}
            showHint={showHint} hintMove={hintMove} actions={stableBoardActions} />
          {ended && <div className="result-overlay" role="dialog" aria-labelledby="result-title" aria-describedby="result-detail"><div className="result-panel"><span className="result-crown"><Crown size={22} /></span><span className="eyebrow">KẾT THÚC VÁN ĐẤU</span><h2 id="result-title">{resultTitle}</h2><p id="result-detail">{resultDetail}</p>
            {!online && <button className="primary-button" onClick={() => newLocal(localMode)}><RotateCcw size={16} /> Đấu lại</button>}
          </div></div>}
          </div>
          <div className={"game-status " + (ended ? "game-ended" : "") + (aiThinking ? " thinking-status difficulty-" + difficulty : "")} role="status"><span>{aiThinking || restoring ? <LoaderCircle size={15} className="spin" /> : ended ? <Crown size={15} /> : <span className="status-dot" />}{statusLabel}{aiThinking && <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>}</span>{online && current.status === "playing" && clock && <span className={"move-clock " + (clock.moveRemainingMs <= 15000 ? "clock-low" : "")}><Clock3 size={13} /> Lượt này {clockText(clock.moveRemainingMs)}</span>}{!online && <button className="status-new-game" onClick={() => newLocal()}><RotateCcw size={14} /> Ván mới</button>}</div>
          {online?.color && online.status === "playing" && online.drawOffer && <div className="draw-notice">{online.drawOffer === online.color ? <><span>Đã gửi đề nghị hòa</span><button onClick={() => void roomAction("cancel")}>Thu hồi</button></> : <><span>Đối thủ đề nghị hòa</span><button onClick={() => void roomAction("accept")}>Đồng ý</button><button onClick={() => void roomAction("decline")}>Tiếp tục</button></>}</div>}
          {reviewPly !== null && <div className="replay-controls"><button onClick={() => setReviewPly(0)} aria-label="Về đầu ván"><ChevronFirst size={16} /></button><button onClick={() => setReviewPly(Math.max(0, reviewPly - 1))} aria-label="Nước trước"><ChevronLeft size={16} /></button><span>{reviewPly} / {current.moves.length}</span><button onClick={() => setReviewPly(Math.min(current.moves.length, reviewPly + 1))} aria-label="Nước tiếp"><ChevronRight size={16} /></button><button onClick={() => { setReviewPly(null); setSelected(null); }}><ChevronLast size={16} /> Trở lại trận</button></div>}
        </div>
        <div className="board-quick-controls" aria-label="Đổi chế độ chơi nhanh">
          <button className={!online && aiMode ? "quick-control-active" : ""} aria-label="Chơi với AI" onClick={() => newLocal("ai")}><Bot size={18} /> Đấu AI</button>
          <button className={!online && !aiMode ? "quick-control-active" : ""} aria-label="Chơi hai người cùng máy" onClick={() => newLocal("local")}><Crown size={18} /> Cùng máy</button>
          <button className={online ? "quick-control-active" : ""} aria-label="Tạo trận online" onClick={() => setModal("create")}><Users size={18} /> Online</button>
        </div>
        <div className="board-caption"><span>ATELIER No. {currentPieceSet.number}</span><span>TÁM BỘ QUÂN · MỘT DẤU ẤN RIÊNG</span><span>64 Ô. VÔ VÀN CÂU CHUYỆN.</span></div>
      </section>
      <div className="side-player side-player-right">{playerBar(orientation)}</div>
      <aside className="right-rail">
        <div className="tools-panel"><div className="tools-tabs" role="tablist" aria-label="Công cụ trận đấu">{(["ai", "moves", "room"] as const).map(tab => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "tab-active" : ""} onClick={() => setActiveTab(tab)}>{tab === "ai" ? <Sparkles size={15} /> : tab === "moves" ? <History size={15} /> : <Users size={15} />}{tab === "ai" ? "Trợ lý AI" : tab === "moves" ? "Biên bản" : "Phòng đấu"}</button>)}</div>
          {activeTab === "ai" && <section className="analysis-panel"><div className="engine-heading"><span className="engine-icon"><Sparkles size={22} /></span><div><h2>Một góc nhìn đi trước.</h2><span>STOCKFISH 19 <i /> CHẠY TRÊN THIẾT BỊ</span></div></div>
            {!analysis?.lines.length && <div className="analysis-empty"><div className="analysis-orbit"><img src={pieceImage({ color: "w", type: "n" }, appearance.pieceSet)} alt="" /><span>✦</span></div><h3>Nước hay bắt đầu<br />từ một ý tưởng.</h3><p>Khám phá ba phương án, hiểu thế cờ và nhìn thấy đường đi ngay trên bàn.</p></div>}
            <button className="primary-button analyze-button" disabled={!canAnalyze || analysis?.loading} onClick={() => void requestAnalysis()}>{analysis?.loading ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}{analysis?.loading ? "Đang tìm nước hay…" : "Tìm nước đi hay"}</button>
            <div className="analysis-subactions"><button disabled={!canAnalyze || analysis?.loading} onClick={() => void requestAnalysis(true)}>Phân tích sâu <ArrowRight size={13} /></button><button disabled={!hintMove} onClick={() => setShowHint(value => !value)}>{showHint ? "Ẩn" : "Hiện"} mũi tên</button></div>
            {analysis?.error && <p className="inline-error">{analysis.error}</p>}
            {analysis?.lines.map(line => <button key={line.rank} className={"analysis-line " + (activeLine === line.rank ? "line-active" : "")} onClick={() => { setActiveLine(line.rank); setShowHint(true); }}><span className="line-number">0{line.rank}</span><span><strong>{principalVariation(game, line.pv, 2).join(" · ")}</strong><small>{principalVariation(game, line.pv, 6).join("  ")} · sâu {line.depth}</small></span><b>{evaluation(line)}</b></button>)}
            {hintMove && <div className="strategy-note"><span className="small-label">Ý TƯỞNG CHIẾN THUẬT</span><p>{describeMove(game, hintMove, bestLine)}</p></div>}
            {aiFailed && <button className="secondary-button" onClick={() => { setAiFailed(false); setAiRetry(value => value + 1); setMessage(""); }}>Thử lại lượt AI</button>}
            <div className="engine-foot"><ShieldCheck size={13} /><span>Ba biến hợp lệ · Không gửi bàn cờ lên dịch vụ AI.</span></div>
          </section>}
          {activeTab === "moves" && <section className="moves-panel"><div className="panel-heading"><h2>Chuyện của ván cờ.</h2><button onClick={exportGame} title="Tải biên bản PGN"><Download size={16} /></button></div><p className="panel-description">Chọn một nước để xem lại. Trận thật vẫn tiếp tục.</p>
            <div className="moves-table"><div className="moves-table-head"><span>#</span><span>Trắng</span><span>Đen</span></div>{!current.moves.length ? <div className="moves-empty"><History size={30} /><p>Biên bản sẽ xuất hiện<br />sau nước đi đầu tiên.</p></div> : Array.from({ length: Math.ceil(current.moves.length / 2) }, (_, index) => <div className="move-pair" key={index}><span>{index + 1}.</span>{[0, 1].map(side => <button key={side} disabled={!current.moves[index * 2 + side]} className={reviewPly === index * 2 + side + 1 ? "move-reviewed" : ""} onClick={() => { setReviewPly(index * 2 + side + 1); setSelected(null); }}>{current.moves[index * 2 + side]?.san || "—"}</button>)}</div>)}</div>
            <div className="export-actions"><button onClick={exportGame}><Download size={14} /> Xuất PGN</button><button onClick={() => void copyText(game.fen())}><Copy size={14} /> Sao chép FEN</button></div>
          </section>}
          {activeTab === "room" && <section className="room-panel">{online ? <><div className="room-heading"><span className="eyebrow">MÃ TRẬN ĐẤU</span><div className="room-code">{online.code}<button aria-label="Sao chép mã phòng" onClick={() => void copyText(online.code)}>{copied ? <Check size={18} /> : <Copy size={18} />}</button></div><p>{online.color ? "Bạn giữ quân " + (online.color === "w" ? "Trắng" : "Đen") + ". Mời người bạn cùng chơi." : "Bạn đang theo dõi trận đấu."}</p></div>
            <button className="secondary-button full-width" onClick={() => void copyText(window.location.origin + window.location.pathname + "?room=" + online.code)}><Link2 size={16} /> {copied ? "Đã sao chép" : "Sao chép liên kết mời"}</button>
            <div className="room-time-summary"><div><Clock3 size={17} /><strong>{online.clock.totalSeconds / 60}<small>PHÚT / BÊN</small></strong></div><div><Play size={16} /><strong>{online.clock.moveLimitSeconds}<small>GIÂY / LƯỢT</small></strong></div></div>
            <div className="room-save-note"><ShieldCheck size={18} /><p>{online.status === "waiting" ? "Đồng hồ chỉ chạy sau khi đủ hai người và bấm Bắt đầu." : "Trận được lưu tự động. Đồng hồ vẫn chạy khi bạn rời trang."}<small>Nhập lại mã trên trình duyệt này để trở về đúng ghế.</small></p></div>
            {online.color && online.status === "waiting" && <button className="primary-button full-width" disabled={busy || !online.hasBlack || connection !== "live"} onClick={() => void startRoom()}><Play size={16} /> {online.hasBlack ? "Bắt đầu ván đấu" : "Đang chờ bạn vào phòng"}</button>}
            {online.color && online.status === "playing" && <div className="room-actions"><button disabled={busy || Boolean(online.drawOffer)} onClick={() => void roomAction("offer")}><Users size={15} /> Cầu hòa</button><button disabled={busy} className="danger-action" onClick={() => void roomAction("resign")}><Flag size={15} /> Đầu hàng</button></div>}
          </> : <><div className="room-welcome"><Users size={36} /><h2>Khoảng cách không<br />ngăn một ván cờ.</h2><p>Tạo phòng, gửi mã 6 ký tự. Người bạn nhận quân Đen. Đủ hai người, bấm Bắt đầu để chơi.</p></div><button className="primary-button full-width" onClick={() => setModal("create")}><Plus size={17} /> Tạo phòng cùng bạn</button><button className="secondary-button full-width" onClick={() => setModal("join")}><Hash size={17} /> Nhập mã hoặc trở lại trận</button><div className="room-save-note"><ShieldCheck size={20} /><p>Tên, biên bản và đồng hồ được lưu trên server.<small>Cả hai kỳ thủ đều có đầy đủ công cụ bàn cờ và trợ lý AI.</small></p></div></>}
          </section>}
        </div>
        <div className="thought-card"><span>GÓC NHÌN KỲ THỦ</span><p>“Một nước đi hay không chỉ thay đổi bàn cờ. Nó mở ra một khả năng mới.”</p><div><span /> NƯỚC CỜ ATELIER</div></div>
        <div className="right-foot"><span><i /> STOCKFISH 19</span><button onClick={() => setModal("help")}>Luật & hướng dẫn <ArrowRight size={12} /></button></div>
      </aside>
    </main>
    {message && <div className="toast" role="alert"><span>{message}</span><button onClick={() => setMessage("")} aria-label="Đóng thông báo"><X size={16} /></button></div>}
    {drag && draggedPiece && <div ref={dragPieceRef} className={"drag-piece piece-" + draggedPiece.color} data-piece-type={draggedPiece.type} data-piece-set={appearance.pieceSet} style={{ left: 0, top: 0, transform: "translate3d(" + drag.x + "px," + drag.y + "px,0) translate(-50%,-50%)", width: drag.size, height: drag.size }}><span className="drag-flight-light" /><RoyalAura type={draggedPiece.type} color={draggedPiece.color} pieceSet={appearance.pieceSet} /><img src={pieceImage(draggedPiece, appearance.pieceSet)} alt="" />{draggedPiece.type === "q" && <QueenMetalGlint color={draggedPiece.color} pieceSet={appearance.pieceSet} />}</div>}
    <dialog id="game-menu-dialog" aria-label={modal === "menu" ? "Chọn cuộc chơi" : modal === "audio" ? "Âm nhạc và âm thanh" : modal === "effects" ? "Chọn hiệu ứng" : undefined} className={"atelier-modal " + (modal === "menu" ? "game-menu-modal" : modal === "pieces" ? "collection-modal" : modal === "appearance" || modal === "effects" ? "appearance-modal" : modal === "audio" ? "audio-modal" : "")} ref={modalRef} onCancel={() => setModal(null)}>
      <div className="modal-inner"><div className="modal-top"><span className="eyebrow">{modal === "menu" ? "NƯỚC CỜ · CUỘC CHƠI" : modal === "audio" ? "NƯỚC CỜ · ÂM THANH" : modal === "create" ? "HẸN NHAU TRÊN 64 Ô" : modal === "join" ? "BẠN ĐÃ CÓ LỜI MỜI" : modal === "pieces" ? "BỘ SƯU TẬP · NƯỚC CỜ" : modal === "appearance" ? "KHÔNG GIAN CỦA RIÊNG BẠN" : modal === "effects" ? "HIỆU ỨNG CHO CUỘC CHƠI" : "CHƠI HAY, CHƠI ĐÚNG"}</span><button onClick={() => setModal(null)} aria-label="Đóng"><X size={19} /></button></div>
      {modal === "audio" && <div className="audio-studio">
        <h2>Một chút jazz.<br /><em>Một nhịp cờ riêng.</em></h2>
        <p className="modal-description">Piano êm, bass ấm và chổi trống nhẹ. Một góc quán cà phê, ngay trên bàn cờ.</p>
        <div className="audio-now-playing"><span className={"audio-record " + (audioStarted && audioSettings.musicEnabled && audioSettings.music > 0 ? "record-playing" : "")}><Music2 size={23} /></span><span><strong>Café jazz</strong><small>{!audioSettings.musicEnabled || audioSettings.music === 0 ? "Nhạc nền đang tắt" : audioStarted ? "Đang phát · Nhẹ nhàng & thư thái" : "Chạm vào trang để bắt đầu nghe"}</small></span><button className="audio-play" aria-label={audioSettings.musicEnabled ? "Tạm dừng nhạc nền" : "Phát nhạc nền"} aria-pressed={audioSettings.musicEnabled} onClick={() => changeAudio("musicEnabled", !audioSettings.musicEnabled)}>{audioSettings.musicEnabled ? <Pause size={18} /> : <Play size={18} />}</button></div>
        <div className="audio-channels">{([
          { id: "music", title: "Nhạc nền", detail: "Jazz chill · Không gian cà phê", icon: <Music2 size={18} /> },
          { id: "pickup", title: "Nhấc quân", detail: "Một tiếng chạm thanh, mềm và nhẹ", icon: <ArrowUpDown size={18} /> },
          { id: "placement", title: "Đặt quân", detail: "Âm gỗ ấm, gọn và có chiều sâu", icon: <Crown size={18} /> },
        ] as const).map(channel => <section className="audio-channel" key={channel.id}>
          <div className="audio-channel-heading"><span className="audio-channel-icon">{channel.icon}</span><label htmlFor={"audio-" + channel.id}><strong>{channel.title}</strong><small>{channel.detail}</small></label>{channel.id !== "music" && <button className="audio-preview" aria-label={"Nghe thử tiếng " + channel.title.toLowerCase()} onClick={() => audioRef.current?.effect(channel.id as "pickup" | "placement")}><Play size={12} /> Nghe thử</button>}</div>
          <div className="audio-volume"><VolumeX size={15} /><input id={"audio-" + channel.id} type="range" min="0" max="100" step="1" value={audioSettings[channel.id]} aria-label={"Âm lượng " + channel.title.toLowerCase()} onChange={event => changeAudio(channel.id, Number(event.target.value))} style={{ "--volume": audioSettings[channel.id] + "%" } as React.CSSProperties} /><Volume2 size={15} /><output htmlFor={"audio-" + channel.id}>{audioSettings[channel.id]}%</output></div>
        </section>)}</div>
        <button className="audio-preview check-audio-preview" aria-label="Nghe thử tiếng chiếu tướng" onClick={() => audioRef.current?.effect("check")}><Crown size={15} /> Nghe tiếng chiếu tướng</button><p className="audio-note">Chiếu tướng dùng âm lượng đặt quân. Âm lượng được lưu trên máy. Kéo về 0 để tắt riêng từng âm thanh.</p>
      </div>}
      {modal === "menu" && <div className="game-menu-content">
<h2 id="game-menu-title">Nước đi của bạn.<small>Chọn cuộc chơi của bạn.</small></h2>
        <section className="rail-card"><div className="section-label">CHỌN CUỘC CHƠI <Swords size={14} /></div>
          <div className="mode-list"><button className={!online && aiMode ? "mode-active" : ""} onClick={() => { newLocal("ai"); setModal(null); }}><Bot size={20} /><span>Đấu với AI<small>Thử sức cùng Stockfish 19</small></span><ChevronRight size={15} /></button><button className={online ? "mode-active" : ""} onClick={() => setModal("create")}><Users size={20} /><span>Đấu cùng bạn<small>Hai thiết bị, một trận cờ</small></span><ChevronRight size={15} /></button><button className={!online && !aiMode ? "mode-active" : ""} onClick={() => { newLocal("local"); setModal(null); }}><Crown size={20} /><span>Cùng thiết bị<small>Luân phiên Trắng và Đen</small></span><ChevronRight size={15} /></button></div>
          {!online && aiMode && <div className="ai-options"><span className="small-label">ĐỘ KHÓ</span><div className="difficulty-options">{(["easy", "medium", "hard"] as const).map(level => <button key={level} onClick={() => setDifficulty(level)} aria-pressed={difficulty === level} className={"difficulty-" + level + (difficulty === level ? " selected-option" : "")}>{({ easy: "Thấp", medium: "Khá", hard: "Giỏi" })[level]}</button>)}</div><div className="color-options"><span>Cầm quân</span><button className={humanColor === "w" ? "selected-color" : ""} onClick={() => newLocal("ai", "w")}><i className="color-chip chip-white" /> Trắng</button><button className={humanColor === "b" ? "selected-color" : ""} onClick={() => newLocal("ai", "b")}><i className="color-chip chip-black" /> Đen</button></div></div>}
        </section>
        <button className="appearance-button battlefield-badge-btn" onClick={() => setModal("appearance")}><span className={"theme-mini mini-" + appearance.boardTheme} /><span>{currentBoardStyle.name}<small>Bàn cờ · hiệu ứng · bìa</small></span><Palette size={16} /></button>
        {recentRooms.length > 0 && <section className="recent-card"><div className="section-label">TRẬN GẦN ĐÂY <History size={14} /></div>{recentRooms.slice(0, 3).map(room => <button key={room.code} onClick={() => void joinRoom(room.code)} disabled={busy}><span><b>{room.code}</b><small>{room.color === "w" ? "Ghế Trắng" : room.color === "b" ? "Ghế Đen" : "Khán giả"}</small></span><ArrowRight size={14} /></button>)}</section>}
        <div className="rail-foot"><ShieldCheck size={15} /><span>Luật chuẩn. Nước đi được kiểm tra.<br />Ván online luôn được lưu.</span></div>
      </div>}
      {modal === "create" && <><h2>Thiết lập một cuộc đấu.</h2><p className="modal-description">Chọn nhịp chơi. Gửi lời mời. Phần còn lại là những nước cờ.</p><label className="form-label" htmlFor="creator-name">Tên của bạn</label><input id="creator-name" className="text-input" maxLength={24} value={profileName} onChange={event => { setProfileName(event.target.value); remember("nuocco:playerName", event.target.value); }} placeholder="Tên hiển thị trên bàn cờ" />
        <div className="slider-setting"><label htmlFor="total-time"><span>Thời gian mỗi bên<small>Tổng ngân sách cho toàn ván</small></span><b>{totalMinutes}<em>phút</em></b></label><input id="total-time" type="range" min="5" max="100" step="1" value={totalMinutes} onChange={event => setTotalMinutes(Number(event.target.value))} /><div className="range-labels"><span>5 phút</span><span>100 phút</span></div></div>
        <div className="slider-setting"><label htmlFor="move-time"><span>Giới hạn mỗi lượt<small>Phải đi trước khi đồng hồ lượt hết</small></span><b>{moveSeconds}<em>giây</em></b></label><input id="move-time" type="range" min="60" max="300" step="15" value={moveSeconds} onChange={event => setMoveSeconds(Number(event.target.value))} /><div className="range-labels"><span>60 giây</span><span>300 giây</span></div></div>
        <div className="preset-buttons">{[[5,60,"Nhanh"],[15,120,"Cân bằng"],[30,180,"Thư thái"]].map(([minutes, seconds, label]) => <button key={label} className={totalMinutes === minutes && moveSeconds === seconds ? "preset-active" : ""} onClick={() => { setTotalMinutes(Number(minutes)); setMoveSeconds(Number(seconds)); }}>{label}</button>)}</div><div className="modal-note"><ShieldCheck size={16} /><span>Bạn cầm Trắng. Đủ hai người, bấm Bắt đầu để chạy đồng hồ. Khi đã chơi, đóng trang không dừng thời gian.</span></div><button className="primary-button full-width modal-submit" disabled={busy} onClick={() => void createRoom()}>{busy ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />} Tạo phòng & nhận mã mời</button></>}
      {modal === "join" && <><h2>Một mã mời.<br />Một người bạn cùng chơi.</h2><p className="modal-description">Nhập mã để nhận quân Đen, hoặc trở lại ghế của bạn trong trận đã lưu.</p><label className="form-label" htmlFor="guest-name">Tên của bạn</label><input id="guest-name" className="text-input" value={profileName} maxLength={24} onChange={event => { setProfileName(event.target.value); remember("nuocco:playerName", event.target.value); }} /><label className="form-label" htmlFor="invite-code">Mã mời 6 ký tự</label><input id="invite-code" className="code-input" placeholder="ABC234" autoComplete="off" value={joinCode} onChange={event => setJoinCode(normalizeCode(event.target.value))} onKeyDown={event => { if (event.key === "Enter") void joinRoom(); }} /><button className="primary-button full-width modal-submit" disabled={busy || joinCode.length !== 6} onClick={() => void joinRoom()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />} Vào bàn cờ</button><p className="modal-footnote">Ghế đã đầy? Bạn vẫn có thể xem trận. Mã mời không thay thế quyền của người đang chơi.</p></>}
      {modal === "pieces" && <><h2>Tám cá tính.<br />Vô vàn nước đi.</h2><p className="modal-description">Sáu dáng quân riêng trong mỗi bộ, từ vương miện của Vua đến đầu ngựa của Mã. Khám phá long hồn Hắc Long và đôi cánh Thiên thần & Ác quỷ. Chọn để đổi ngay trên bàn và lưu trên thiết bị.</p>
        <p className="style-hint">Giao diện chỉ đổi trên thiết bị của bạn. Đối thủ giữ lựa chọn riêng; nước đi, đồng hồ và kết quả không thay đổi.</p><div className="piece-collection-grid">{PIECE_SETS.map(set => <button key={set.id} className={"piece-set-card set-" + set.id + (appearance.pieceSet === set.id ? " set-selected" : "")} aria-pressed={appearance.pieceSet === set.id} onClick={() => changePieceSet(set.id)}>
          <span className="set-card-top"><span>COLLECTION {set.number}</span>{appearance.pieceSet === set.id ? <span className="set-active-label"><Check size={14} /> Đang dùng</span> : <span>Chọn bộ này <ArrowRight size={14} /></span>}</span>
          <span className="set-showcase">{(["w", "b"] as const).map(color => <span key={color} className="set-lineup">{["k", "q", "r", "b", "n", "p"].map(type => <span key={type} className="set-piece"><img src={pieceImage({ color, type }, set.id)} width={100} height={100} loading="lazy" alt={names[type] + (color === "w" ? " trắng" : " đen")} />{color === "w" && <small>{names[type]}</small>}</span>)}</span>)}</span>
          <strong>{set.name}</strong><span className="set-subtitle">{set.subtitle}</span><span className="set-description">{set.caption}</span>
          <span className="set-sides"><span><i /> Trắng · {set.white}</span><span><i /> Đen · {set.black}</span></span>
        </button>)}</div><p className="collection-note"><ShieldCheck size={16} /> Hình vector sắc nét · Đổi bộ quân không làm mất ván đang chơi.</p></>}
      {(modal === "appearance" || modal === "effects") && <><h2>{modal === "effects" ? <>Chuyển động theo<br /><em>nhịp cờ của bạn.</em></> : <>Thế giới trên<br /><em>64 ô cờ.</em></>}</h2><p className="modal-description">{modal === "effects" ? "Chọn bầu không khí bạn thích. Hiệu ứng đổi ngay trong ván cờ." : "Phối bàn cờ, bìa và chuyển động theo phong cách của bạn. Đổi ngay trong ván; nước đi và đồng hồ vẫn tiếp tục."}</p>
        {modal === "appearance" && <>
        <section className="style-section vip-style-section"><div className="style-section-heading"><span><Crown size={16} /> BÀN VIP</span><small>{VIP_BOARDS.length} phong cách · Viền & ô chuyển động</small></div>
          <div className="board-style-grid vip-style-grid">{VIP_BOARDS.map(item => <button key={item.id} className={"board-style-card vip-style-card theme-" + item.id} aria-label={"Bàn VIP " + item.name} aria-pressed={appearance.boardTheme === item.id} onClick={() => changeBoardTheme(item.id)}>
            <span className="board-sample vip-sample"><img src={assetUrl(item.id === "vip-celestial" ? "/boards/vip/celestial.webp" : item.art)} width={1254} height={1254} loading="lazy" alt="" /><span className="vip-preview-shine" /><span className="vip-badge"><Crown size={10} /> VIP</span>{appearance.boardTheme === item.id && <span className="style-check"><Check size={14} /></span>}</span>
            <strong>{item.name}</strong><small>{item.subtitle}</small><span className="vip-motion-label"><Sparkles size={11} /> Chuyển động riêng</span>
          </button>)}</div>
        </section>
        <section className="style-section"><div className="style-section-heading"><span>BÀN THƯỜNG</span><small>Chuyển động riêng · 5 phong cách</small></div><div className="board-style-grid">{STANDARD_BOARDS.map(item => <button key={item.id} className={"board-style-card theme-" + item.id} aria-label={"Bàn cờ " + item.name} aria-pressed={appearance.boardTheme === item.id} onClick={() => changeBoardTheme(item.id)}><span className="board-sample"><span className="sample-tiles">{Array.from({ length: 16 }, (_, i) => <i key={i} className={(Math.floor(i / 4) + i) % 2 === 0 ? "sample-light" : "sample-dark"} />)}</span><img src={pieceImage({ color: "w", type: "n" }, appearance.pieceSet)} alt="" /><span className="sample-mark">{item.mark}</span>{appearance.boardTheme === item.id && <span className="style-check"><Check size={14} /></span>}</span><strong>{item.name}</strong><small>{item.subtitle}</small></button>)}</div></section>
        </>}
        <section className="style-section"><div className="style-section-heading"><span><b>02</b> CHUYỂN ĐỘNG TRONG KHÔNG GIAN</span><small>Chọn hiệu ứng cho cuộc chơi</small></div><div className="effect-grid">{ATMOSPHERES.map(item => <button key={item.id} className={"effect-card effect-" + item.id} aria-label={"Hiệu ứng " + item.name} aria-pressed={appearance.effect === item.id} onClick={() => changeEffect(item.id)}><span className="effect-mark">{item.mark}</span><span><strong>{item.name}</strong><small>{item.subtitle}</small></span>{appearance.effect === item.id && <Check size={14} />}</button>)}</div><p className="style-hint"><Flame size={13} /> Anh đào đỏ & tàn lửa là mặc định. Chọn một hiệu ứng khác để đổi không khí.</p></section>
        {modal === "appearance" &&
        <section className="style-section"><div className="style-section-heading"><span><b>03</b> BÌA CỦA CUỘC ĐẤU</span><button className="style-switch" role="switch" aria-checked={appearance.motionOn} aria-label="Bật chuyển động bìa" onClick={() => changeMotion(!appearance.motionOn)}>{appearance.motionOn ? "Chuyển động" : "Ảnh tĩnh"}<i className={appearance.motionOn ? "switch-on" : ""} /></button></div><div className="cover-scene-grid">{COVER_SCENES.map(item => <button key={item.id} className="cover-scene-card" aria-label={"Chọn bìa " + item.name} aria-pressed={appearance.cover === item.id} onClick={() => changeCover(item.id)}><span><img src={assetUrl(item.image)} width={400} height={180} loading="lazy" alt="" />{appearance.cover === item.id && <i className="style-check"><Check size={14} /></i>}</span><strong>{item.name}</strong><small>{item.subtitle}</small></button>)}</div></section>
        }
        <div className="studio-footer"><span><ShieldCheck size={16} /> Tự lưu trên thiết bị · Ván đấu giữ nguyên</span><button className="primary-button" onClick={() => setModal(null)}>Trở lại bàn cờ <ArrowRight size={15} /></button></div>
      </>}
      {modal === "help" && <><h2>Mỗi người một màu.<br />Cùng một nhịp chơi.</h2><div className="help-steps"><p><b>01 · Di chuyển</b>Chạm quân rồi ô đích, kéo thả, hoặc dùng Tab và Enter. Các ô hợp lệ được đánh dấu.</p><p><b>02 · Đấu cùng bạn</b>Thiết lập thời gian, tạo phòng và gửi mã. Người thứ hai nhận quân Đen. Tên được sửa ngay trên thẻ người chơi.</p><p><b>03 · Thời gian</b>Tổng thời gian chỉ trừ vào bên đang đi. Giới hạn lượt được đặt lại sau mỗi nước. Hết một trong hai là thua.</p><p><b>04 · Trở lại trận</b>Trận online lưu trên server. Trình duyệt này giữ quyền ghế của bạn; tải lại hoặc nhập lại mã để tiếp tục. Đồng hồ vẫn chạy khi đóng trang.</p><p><b>05 · Khám phá</b>Trợ lý AI tìm ba phương án. Biên bản cho phép xem lại, xuất PGN và sao chép FEN. Khi xem lại, bấm “Trở lại trận” để đi tiếp.</p></div></>}
      </div></dialog>
    <dialog className="atelier-modal promotion-modal" ref={promotionRef} onCancel={() => setPromotion(null)}><div className="modal-inner"><span className="eyebrow">MỘT QUÂN TỐT, MỘT KHỞI ĐẦU MỚI</span><h2>Chọn quân phong cấp.</h2><div className="promotion-options">{["q", "r", "b", "n"].map(type => <button key={type} onClick={() => { if (promotion) void commitMove(promotion.from, promotion.to, type); }}><img src={pieceImage({ color: turn, type }, appearance.pieceSet)} alt={names[type]} /><span>{names[type]}</span></button>)}</div></div></dialog>
    <footer className="site-footer"><span>NƯỚC CỜ <i>ATELIER</i></span><span>Đẹp trong từng nước đi.</span><button onClick={() => setModal("help")}>Hướng dẫn</button></footer>
  </div>;
}
