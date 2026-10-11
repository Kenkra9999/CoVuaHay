"use client";
/* eslint-disable @next/next/no-img-element -- Local vector pieces stay crisp at every board size. */

import { Chess, type Square } from "chess.js";
import { ArrowRight, ArrowUpDown, Bot, Check, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Clock3, Copy, Crown, Download, Flag, Flame, Hash, History, Link2, LoaderCircle, Maximize2, Minimize2, Palette, Play, Plus, RotateCcw, ShieldCheck, Sparkles, Swords, Undo2, Users, Volume2, VolumeX, Wifi, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { MoveRecord, RoomStatus, RoomView } from "@/lib/rooms";
import { chessClock } from "@/lib/chess-clock";
import type { Difficulty } from "@/lib/chess-ai";
import { describeMove, parseUciMove, principalVariation, searchStockfish, type EngineAnalysis, type EngineLine } from "@/lib/stockfish";

export type BattlefieldTheme = "citadel" | "blood" | "inferno" | "frost" | "royal" | "marble";
export type BoardThemeColor = "walnut" | "midnight" | "crimson" | "frost";
type Color = "w" | "b";
type Mode = "ai" | "local";
type LocalGame = { fen: string; moves: MoveRecord[]; status: RoomStatus; version: number };
type Piece = { id: string; square: Square; color: Color; type: string };
type OnlineGame = RoomView & { receivedAt: number };
type Modal = "create" | "join" | "appearance" | "help" | null;
type Appearance = { battlefield: BattlefieldTheme; boardTheme: BoardThemeColor; particlesOn: boolean };
type RecentRoom = { code: string; color: Color | null; name: string; savedAt: number };
type ApiData = { room?: RoomView; token?: string; error?: string };
const files = "abcdefgh";
const names: Record<string, string> = { p: "Tốt", n: "Mã", b: "Tượng", r: "Xe", q: "Hậu", k: "Vua" };
const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const DEFAULT_GAME: LocalGame = { fen: new Chess().fen(), moves: [], status: "playing", version: 0 };
const DEFAULT_APPEARANCE: Appearance = { battlefield: "citadel", boardTheme: "midnight", particlesOn: true };
const BATTLEFIELDS: { id: BattlefieldTheme; name: string; caption: string; defaultBoard: BoardThemeColor }[] = [
  { id: "citadel", name: "Obsidian", caption: "Đá đêm · đồng cổ", defaultBoard: "midnight" },
  { id: "frost", name: "Băng ngọc", caption: "Bạc lạnh · xanh sương", defaultBoard: "frost" },
  { id: "royal", name: "Hoàng kim", caption: "Gỗ óc chó · vàng ấm", defaultBoard: "walnut" },
  { id: "blood", name: "Hồng ngọc", caption: "Đỏ rượu · than đen", defaultBoard: "crimson" },
  { id: "inferno", name: "Dung nham", caption: "Hổ phách · tro lửa", defaultBoard: "crimson" },
  { id: "marble", name: "Cẩm thạch", caption: "Đá ngọc · ánh ngà", defaultBoard: "walnut" },
];
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
function pieceImage(piece: { color: string; type: string }) { return "/pieces/" + piece.color + piece.type.toUpperCase() + ".svg"; }
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

function BattlefieldParticles({ theme, enabled }: { theme: BattlefieldTheme; enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const points = Array.from({ length: 22 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: .12 + Math.random() * .25, size: .5 + Math.random() * 1.2 }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = theme === "frost" ? "rgba(155,218,230,.3)" : "rgba(208,180,135,.2)";
      for (const point of points) {
        point.y -= point.speed;
        if (point.y < 0) point.y = canvas.height;
        ctx.beginPath(); ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2); ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, [theme, enabled]);
  return enabled ? <canvas ref={canvasRef} className="battlefield-canvas" aria-hidden="true" /> : null;
}

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
  const [joinCode, setJoinCode] = useState("");
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "moves" | "room">("ai");
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [aiFailed, setAiFailed] = useState(false);
  const [aiRetry, setAiRetry] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [activeLine, setActiveLine] = useState(1);
  const [analysisState, setAnalysisState] = useState<{ key: string; lines: EngineLine[]; result?: EngineAnalysis; loading: boolean; error?: string } | null>(null);
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number; size: number } | null>(null);
  const sessionRef = useRef({ code: "", token: "", epoch: 0 });
  const boardRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const promotionRef = useRef<HTMLDialogElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const pointerRef = useRef<{ from: Square; x: number; y: number; moved: boolean } | null>(null);
  const analysisAbort = useRef<AbortController | null>(null);
  const current = online || local;
  const liveGame = useMemo(() => buildGame(current.moves), [current.moves]);
  const displayMoves = useMemo(() => reviewPly === null ? current.moves : current.moves.slice(0, reviewPly), [current.moves, reviewPly]);
  const game = useMemo(() => buildGame(displayMoves), [displayMoves]);
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
  const hintMove = bestLine ? parseUciMove(bestLine.pv[0]) : analysis?.result?.move;
  const canAnalyze = !aiThinking && !busy && ready && !restoring;
  const currentBattlefield = BATTLEFIELDS.find(item => item.id === appearance.battlefield)!;

  const applyRoom = useCallback((room: RoomView) => {
    if (sessionRef.current.code !== room.code) return;
    const receivedAt = Date.now();
    setOnline(previous => previous && previous.code === room.code &&
      (previous.version > room.version || (previous.version === room.version && previous.updatedAt > room.updatedAt))
      ? previous : { ...room, receivedAt });
    setConnection("live");
  }, []);

  const fetchRoom = useCallback(async (code: string, token = "", signal?: AbortSignal) => {
    const response = await fetch("/api/rooms/" + code, { headers: token ? { "x-player-token": token } : {}, signal, cache: "no-store" });
    const data: ApiData = await response.json();
    if (!response.ok || !data.room) throw new Error(data.error || "Không tìm thấy phòng.");
    return data.room;
  }, []);

  const adoptRoom = useCallback((room: RoomView, token: string) => {
    sessionRef.current = { code: room.code, token, epoch: sessionRef.current.epoch + 1 };
    setOnline({ ...room, receivedAt: Date.now() });
    setConnection("live");
    setSelected(null); setPromotion(null); setFlipped(false); setReviewPly(null); setModal(null); setAnalysisState(null);
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
    const battlefield = BATTLEFIELDS.find(item => item.id === stored("nuocco:battlefield"))?.id || "citadel";
    const board = stored("nuocco:boardTheme");
    setAppearance({ battlefield, boardTheme: board === "walnut" || board === "midnight" || board === "crimson" || board === "frost" ? board : "midnight", particlesOn: stored("nuocco:particles") !== "false" });
    const savedName = stored("nuocco:playerName") || "Kỳ thủ";
    setProfileName(savedName); setNameDraft(savedName); setSoundOn(stored("nuocco:sound") !== "false");
    try {
      const recent: unknown = JSON.parse(stored("nuocco:recentRooms") || "[]");
      if (Array.isArray(recent)) setRecentRooms(recent.filter(item => item && typeof item.code === "string" && normalizeCode(item.code).length === 6).slice(0, 6));
      const saved = JSON.parse(stored("nuocco:local:v2") || "null");
      if (saved && Array.isArray(saved.game?.moves) && saved.game.moves.length <= 5000) {
        const restored = buildGame(saved.game.moves);
        setLocal({ fen: restored.fen(), moves: saved.game.moves, status: resultStatus(restored), version: Number(saved.game.version) || 0 });
        setLocalMode(saved.mode === "local" ? "local" : "ai");
        if (["easy", "medium", "hard", "master"].includes(saved.difficulty)) setDifficulty(saved.difficulty);
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

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 200);
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => { window.clearInterval(timer); document.removeEventListener("fullscreenchange", onFullscreen); };
  }, []);

  const onlineCode = online?.code;
  useEffect(() => {
    if (!onlineCode) return;
    const session = sessionRef.current;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    let inFlight = false;
    const poll = async () => {
      if (stopped || inFlight) return;
      inFlight = true; controller = new AbortController();
      try {
        const room = await fetchRoom(session.code, session.token, controller.signal);
        if (!stopped && session.epoch === sessionRef.current.epoch) applyRoom(room);
      } catch { if (!stopped) setConnection("retrying"); }
      finally {
        inFlight = false;
        if (!stopped) timer = setTimeout(poll, document.hidden ? 2500 : 500);
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
        const response = await fetch("/api/rooms/" + session.code + "/player", { method: "PATCH", signal: controller.signal,
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

  const playSound = useCallback((capture = false) => {
    if (!soundOn) return;
    try {
      const context = audioRef.current || (audioRef.current = new AudioContext());
      void context.resume();
      const osc = context.createOscillator(), gain = context.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(capture ? 420 : 650, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, context.currentTime + .09);
      gain.gain.setValueAtTime(.055, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .12);
      osc.connect(gain).connect(context.destination); osc.start(); osc.stop(context.currentTime + .12);
    } catch { /* Audio is optional. */ }
  }, [soundOn]);

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
        playSound(Boolean(move.captured));
      } catch { if (!controller.signal.aborted) { setAiFailed(true); setMessage("AI chưa tính được nước đi. Bạn có thể thử lại."); } }
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [ready, restoring, aiMode, aiFailed, local, turn, humanColor, difficulty, aiRetry, playSound]);

  async function requestAnalysis(deep = false) {
    if (!canAnalyze) return;
    analysisAbort.current?.abort();
    const controller = new AbortController(); analysisAbort.current = controller;
    const key = positionKey;
    setShowHint(true); setActiveLine(1); setActiveTab("ai"); setAnalysisState({ key, lines: [], loading: true });
    try {
      const result = await searchStockfish(displayMoves, { analysis: true, deep, signal: controller.signal,
        onInfo: lines => { if (!controller.signal.aborted) setAnalysisState({ key, lines, loading: true }); } });
      if (!controller.signal.aborted) setAnalysisState({ key, lines: result.lines, result, loading: false });
    } catch (error) { if (!controller.signal.aborted) setAnalysisState({ key, lines: [], loading: false, error: errorText(error) }); }
  }

  async function createRoom() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" },
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
          const response = await fetch("/api/rooms/" + code + "/join", { method: "POST", headers: { "Content-Type": "application/json" },
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
  function newLocal(mode: Mode = localMode, color: Color = humanColor) {
    if (online?.status === "playing" && !window.confirm("Rời phòng không dừng đồng hồ. Bạn vẫn có thể vào lại bằng mã. Tiếp tục?")) return;
    analysisAbort.current?.abort();
    sessionRef.current = { code: "", token: "", epoch: sessionRef.current.epoch + 1 };
    setOnline(null); setLocal({ ...DEFAULT_GAME, version: local.version + 1 }); setLocalMode(mode); setHumanColor(color);
    setSelected(null); setPromotion(null); setReviewPly(null); setFlipped(false); setAiFailed(false); setAnalysisState(null); setMessage("");
    forget("nuocco:lastRoom"); window.history.replaceState({}, "", window.location.pathname); setActiveTab("ai");
  }
  function undoMove() {
    if (online || !current.moves.length || busy) return;
    analysisAbort.current?.abort();
    const count = aiMode && turn === humanColor ? Math.min(2, local.moves.length) : 1;
    const moves = local.moves.slice(0, -count), restored = buildGame(moves);
    setLocal({ fen: restored.fen(), moves, status: resultStatus(restored), version: local.version + 1 });
    setSelected(null); setReviewPly(null); setAiFailed(false); setAnalysisState(null);
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
      playSound(Boolean(moved.captured)); return;
    }
    const session = { ...sessionRef.current };
    setBusy(true);
    try {
      const response = await fetch("/api/rooms/" + session.code + "/move", { method: "POST",
        headers: { "Content-Type": "application/json", "x-player-token": session.token },
        body: JSON.stringify({ from, to, promotion: choice, version: online.version }) });
      const data: ApiData = await response.json();
      if (session.epoch !== sessionRef.current.epoch) return;
      if (data.room) applyRoom(data.room);
      if (!response.ok) throw new Error(data.error || "Không thể gửi nước đi.");
      playSound(Boolean(moved.captured));
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
    else setSelected(game.get(square)?.color === turn ? square : null);
  }
  function onPieceDown(event: PointerEvent<HTMLDivElement>, piece: Piece) {
    if (!canMove || piece.color !== turn || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { from: piece.square, x: event.clientX, y: event.clientY, moved: false };
    setSelected(piece.square);
  }
  function onPieceMove(event: PointerEvent<HTMLDivElement>, piece: Piece) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.from !== piece.square) return;
    if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) pointer.moved = true;
    if (pointer.moved) setDrag({ from: piece.square, x: event.clientX, y: event.clientY, size: (boardRef.current?.getBoundingClientRect().width || 480) / 8 });
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
    if (action === "resign" && !window.confirm("Bạn muốn xin thua trận này?")) return;
    const session = { ...sessionRef.current }; setBusy(true);
    try {
      const response = await fetch("/api/rooms/" + session.code + "/" + (action === "resign" ? "resign" : "draw"),
        { method: "POST", headers: { "Content-Type": "application/json", "x-player-token": session.token }, body: JSON.stringify({ action }) });
      const data: ApiData = await response.json();
      if (session.epoch !== sessionRef.current.epoch) return;
      if (data.room) applyRoom(data.room);
      if (!response.ok) throw new Error(data.error || "Chưa gửi được yêu cầu.");
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
  function changeBattlefield(theme: BattlefieldTheme) {
    const config = BATTLEFIELDS.find(item => item.id === theme)!;
    setAppearance(previous => ({ ...previous, battlefield: theme, boardTheme: config.defaultBoard }));
    remember("nuocco:battlefield", theme); remember("nuocco:boardTheme", config.defaultBoard);
  }
  function changeBoardTheme(boardTheme: BoardThemeColor) { setAppearance(previous => ({ ...previous, boardTheme })); remember("nuocco:boardTheme", boardTheme); }
  function changeParticles(enabled: boolean) { setAppearance(previous => ({ ...previous, particlesOn: enabled })); remember("nuocco:particles", String(enabled)); }
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { setMessage("Trình duyệt chưa hỗ trợ toàn màn hình."); }
  }
  function point(square: Square) {
    const file = files.indexOf(square[0]), rank = 8 - Number(square[1]);
    return { x: (orientation === "w" ? file : 7 - file) * 100 + 50, y: (orientation === "w" ? rank : 7 - rank) * 100 + 50 };
  }
  const winner: Color | null = current.status === "white_won" ? "w" : current.status === "black_won" ? "b" : null;
  const draggedPiece = drag ? pieces.find(piece => piece.square === drag.from) : null;
  const ended = current.status !== "waiting" && current.status !== "playing";
  const timeout = online?.endReason === "timeout" || online?.endReason === "move_timeout";
  const statusLabel = restoring ? "Đang khôi phục trận…" : reviewPly !== null ? "Đang xem lại nước " + reviewPly
    : current.status === "waiting" ? "Chờ người bạn cùng chơi"
    : ended ? current.status === "draw" ? "Một ván cờ hòa đẹp" : timeout && online?.color && winner !== online.color ? "Bạn đã thua do quá giờ" : playerLabel(winner!) + " chiến thắng"
    : aiThinking ? "Stockfish đang suy nghĩ…" : liveGame.isCheck() ? "Chiếu tướng · Hãy bảo vệ Vua" : (online?.color === turn ? "Đến lượt bạn" : turn === "w" ? "Lượt quân Trắng" : "Lượt quân Đen");
  const checkKing = game.isCheck() ? pieces.find(piece => piece.type === "k" && piece.color === game.turn())?.square : null;
  const captures = game.history({ verbose: true }).filter(move => move.captured);
  const material = game.board().flat().reduce((sum, piece) => sum + (piece ? values[piece.type] * (piece.color === "w" ? 1 : -1) : 0), 0);
  function playerBar(color: Color) {
    const own = online ? online.color === color : !aiMode || humanColor === color;
    const editable = own && !restoring;
    const player = online?.players[color === "w" ? "white" : "black"];
    const connected = player?.seenAt ? serverNow - player.seenAt < 15000 : false;
    const milliseconds = clock ? color === "w" ? clock.whiteMs : clock.blackMs : null;
    return <div className={"player-card " + (turn === color && current.status === "playing" ? "player-active" : "")} data-color={color}>
      <div className={"player-avatar avatar-" + color}><img src={pieceImage({ color, type: "k" })} alt="" /></div>
      <div className="player-info">
        <div className="player-name-line">{editable
          ? <input className="player-name" aria-label={"Tên người chơi " + (color === "w" ? "Trắng" : "Đen")} maxLength={24}
              value={online ? nameDraft : localNames[color]} onChange={event => changeName(color, event.target.value)}
              onBlur={() => { if (online) setNameDraft(value => value.trim() || ownServerName); }} title="Bấm vào tên để đổi · tự động lưu" />
          : <strong className="player-name-static">{!online?.hasBlack && online && color === "b" ? "Chờ đối thủ…" : playerLabel(color)}</strong>}
          {own && <span className="you-tag">BẠN</span>}
        </div>
        <div className="player-detail"><span className={"presence-dot " + (online && !connected ? "presence-away" : "")} />
          {online ? (color === "b" && !online.hasBlack ? "Ghế Đen đang trống" : connected ? "Đang kết nối" : "Tạm ngoại tuyến") : aiMode && color !== humanColor ? difficulty === "master" ? "Đại kiện tướng · Engine WASM" : "Engine WASM · " + ({ easy: "Dễ", medium: "Vừa", hard: "Khó", master: "Tối đa" }[difficulty]) : "Nhấn vào tên để chỉnh sửa"}
          <span className="captured-pieces">{captures.filter(move => move.color === color).map((move, index) => <img key={index} src={pieceImage({ color: color === "w" ? "b" : "w", type: move.captured! })} alt={names[move.captured!]} />)}
            {(color === "w" ? material : -material) > 0 && <b>+{color === "w" ? material : -material}</b>}</span>
        </div>
      </div>
      <div className={"player-clock " + (milliseconds !== null && milliseconds <= 30000 ? "clock-low" : "")}>
        <span>{milliseconds === null ? "∞" : clockText(milliseconds)}</span><small>{turn === color && current.status === "playing" ? "ĐANG ĐI" : color === "w" ? "QUÂN TRẮNG" : "QUÂN ĐEN"}</small>
      </div>
    </div>;
  }

  return <div className={"site-shell battlefield-" + appearance.battlefield}>
    <BattlefieldParticles theme={appearance.battlefield} enabled={appearance.particlesOn} />
    <header className="topbar">
      <button className="brand" onClick={() => newLocal()} aria-label="Nước Cờ - Ván mới"><span className="brand-mark"><img src="/pieces/wN.svg" alt="" /></span><span>Nước Cờ<small>THE CHESS ATELIER</small></span></button>
      <nav className="header-nav" aria-label="Chế độ chơi"><span className="nav-current"><span className="live-dot" /> {online ? "Đấu trường online" : aiMode ? "Không gian luyện tập" : "Cùng một bàn cờ"}</span><button onClick={() => setModal("help")}>Cách chơi</button></nav>
      <div className="header-actions"><button className="header-join" onClick={() => { setModal("join"); setMessage(""); }}><Hash size={16} /><span>Nhập mã mời</span></button><button className="primary-button header-create" onClick={() => setModal("create")}><Plus size={17} /><span>Tạo phòng</span></button></div>
    </header>
    <main className="arena-layout">
      <aside className="left-rail">
        <div className="atelier-intro"><span className="eyebrow">MỖI NƯỚC ĐI, MỘT DẤU ẤN</span><h1>Làm chủ<br />thế cờ.</h1><p>Một bàn cờ. Vô vàn khả năng.</p><div className="intro-knight"><img src="/pieces/wN.svg" alt="Quân mã thiết kế ánh kim" /><span>ATELIER COLLECTION<small>BỘ QUÂN CỜ ĐỘC BẢN</small></span></div></div>
        <section className="rail-card"><div className="section-label">CHỌN CUỘC CHƠI <Swords size={14} /></div>
          <div className="mode-list"><button className={!online && aiMode ? "mode-active" : ""} onClick={() => newLocal("ai")}><Bot size={20} /><span>Đấu với AI<small>Thử sức cùng Stockfish 19</small></span><ChevronRight size={15} /></button><button className={online ? "mode-active" : ""} onClick={() => setModal("create")}><Users size={20} /><span>Đấu cùng bạn<small>Hai thiết bị, một trận cờ</small></span><ChevronRight size={15} /></button><button className={!online && !aiMode ? "mode-active" : ""} onClick={() => newLocal("local")}><Crown size={20} /><span>Cùng thiết bị<small>Luân phiên Trắng và Đen</small></span><ChevronRight size={15} /></button></div>
          {!online && aiMode && <div className="ai-options"><span className="small-label">ĐỘ KHÓ</span><div className="difficulty-options">{(["easy", "medium", "hard", "master"] as const).map(level => <button key={level} onClick={() => setDifficulty(level)} className={difficulty === level ? "selected-option" : ""}>{({ easy: "Dễ", medium: "Vừa", hard: "Khó", master: "Master" })[level]}</button>)}</div><div className="color-options"><span>Cầm quân</span><button className={humanColor === "w" ? "selected-color" : ""} onClick={() => newLocal("ai", "w")}><i className="color-chip chip-white" /> Trắng</button><button className={humanColor === "b" ? "selected-color" : ""} onClick={() => newLocal("ai", "b")}><i className="color-chip chip-black" /> Đen</button></div></div>}
        </section>
        <button className="appearance-button battlefield-badge-btn" onClick={() => setModal("appearance")}><span className={"theme-mini theme-mini-" + appearance.battlefield} /><span>{currentBattlefield.name}<small>Không gian & màu bàn cờ</small></span><Palette size={16} /></button>
        {recentRooms.length > 0 && <section className="recent-card"><div className="section-label">TRẬN GẦN ĐÂY <History size={14} /></div>{recentRooms.slice(0, 3).map(room => <button key={room.code} onClick={() => void joinRoom(room.code)} disabled={busy}><span><b>{room.code}</b><small>{room.color === "w" ? "Ghế Trắng" : room.color === "b" ? "Ghế Đen" : "Khán giả"}</small></span><ArrowRight size={14} /></button>)}</section>}
        <div className="rail-foot"><ShieldCheck size={15} /><span>Luật chuẩn. Nước đi được kiểm tra.<br />Ván online luôn được lưu.</span></div>
      </aside>
      <section className={"board-column theme-" + appearance.boardTheme} aria-label="Bàn cờ vua">
        <div className="board-heading"><div><span className="eyebrow">{online ? "PHÒNG " + online.code : aiMode ? "LUYỆN TẬP CÙNG AI" : "CHƠI CÙNG THIẾT BỊ"}</span><span className="board-session-title">{online ? "Một trận đấu. Hai kỳ thủ." : "Nước đi của riêng bạn."}</span></div><span className={"session-pill " + (online && connection !== "live" ? "session-reconnecting" : "")}>{online ? connection === "live" ? <><Wifi size={12} /> Đã đồng bộ</> : <><WifiOff size={12} /> Đang kết nối lại</> : <><Check size={12} /> {ready ? "Đã lưu trên máy" : "Sẵn sàng"}</>}</span></div>
        <div className="board-stage">
          {playerBar(topColor)}
          <div className="board-frame"><div className="board" ref={boardRef}>
            {Array.from({ length: 8 }, (_, rank) => Array.from({ length: 8 }, (_, file) => {
              const square = (files[orientation === "w" ? file : 7 - file] + (orientation === "w" ? 8 - rank : rank + 1)) as Square;
              const piece = pieces.find(item => item.square === square), last = displayMoves.at(-1);
              return <button type="button" key={square} data-square={square}
                className={"square " + ((rank + file) % 2 === 0 ? "square-light" : "square-dark") + (selected === square ? " square-selected" : "") + (last?.from === square || last?.to === square ? " square-last" : "") + (square === checkKing ? " square-check" : "")}
                aria-label={square + (piece ? ", " + names[piece.type] + " " + (piece.color === "w" ? "trắng" : "đen") : "")} onClick={() => onSquareClick(square)}>
                {file === 0 && <span className="rank-label">{square[1]}</span>}{rank === 7 && <span className="file-label">{square[0]}</span>}
                {legal.includes(square) && <span className={piece ? "legal-capture" : "legal-dot"} />}
              </button>;
            }))}
            {pieces.map(piece => {
              const file = files.indexOf(piece.square[0]), rank = 8 - Number(piece.square[1]);
              const x = orientation === "w" ? file : 7 - file, y = orientation === "w" ? rank : 7 - rank;
              return <div key={piece.id} className={"piece piece-" + piece.color + (selected === piece.square ? " piece-selected" : "") + (drag?.from === piece.square ? " piece-dragging" : "")}
                style={{ transform: "translate3d(" + x * 100 + "%," + y * 100 + "%,0)", pointerEvents: canMove && piece.color === turn ? "auto" : "none" }}
                onPointerDown={event => onPieceDown(event, piece)} onPointerMove={event => onPieceMove(event, piece)} onPointerUp={event => onPieceUp(event, piece)} onPointerCancel={() => { pointerRef.current = null; setDrag(null); }}>
                <img src={pieceImage(piece)} alt="" draggable={false} /></div>;
            })}
            {showHint && hintMove && (() => {
              const from = point(hintMove.from), to = point(hintMove.to);
              return <svg className="hint-overlay" viewBox="0 0 800 800" role="img" aria-label={"Gợi ý: đi " + hintMove.from + " đến " + hintMove.to}><defs><marker id="hint-arrow" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5Z" fill="currentColor" /></marker></defs><circle cx={from.x} cy={from.y} r="30" /><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd="url(#hint-arrow)" /></svg>;
            })()}
          </div></div>
          {playerBar(orientation)}
          <div className={"game-status " + (ended ? "game-ended" : "")} role="status"><span>{aiThinking || restoring ? <LoaderCircle size={15} className="spin" /> : ended ? <Crown size={15} /> : <span className="status-dot" />}{statusLabel}</span>{online && current.status === "playing" && clock && <span className={"move-clock " + (clock.moveRemainingMs <= 15000 ? "clock-low" : "")}><Clock3 size={13} /> Lượt này {clockText(clock.moveRemainingMs)}</span>}</div>
          {online?.color && online.status === "playing" && online.drawOffer && <div className="draw-notice">{online.drawOffer === online.color ? <><span>Đã gửi đề nghị hòa</span><button onClick={() => void roomAction("cancel")}>Thu hồi</button></> : <><span>Đối thủ đề nghị hòa</span><button onClick={() => void roomAction("accept")}>Đồng ý</button><button onClick={() => void roomAction("decline")}>Tiếp tục</button></>}</div>}
          <div className="board-toolbar"><div><button onClick={() => setFlipped(value => !value)} title="Xoay bàn cờ" aria-label="Xoay bàn cờ"><ArrowUpDown size={17} /></button><button onClick={undoMove} disabled={Boolean(online) || !current.moves.length || busy} title="Đi lại nước cờ" aria-label="Đi lại nước cờ"><Undo2 size={17} /></button><button onClick={() => { setSoundOn(value => !value); remember("nuocco:sound", String(!soundOn)); }} title={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><button onClick={() => void toggleFullscreen()} title={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>{fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button></div><button className="new-game-button" onClick={() => online ? setModal("create") : newLocal()}><RotateCcw size={14} /> Ván mới</button></div>
          {reviewPly !== null && <div className="replay-controls"><button onClick={() => setReviewPly(0)} aria-label="Về đầu ván"><ChevronFirst size={16} /></button><button onClick={() => setReviewPly(Math.max(0, reviewPly - 1))} aria-label="Nước trước"><ChevronLeft size={16} /></button><span>{reviewPly} / {current.moves.length}</span><button onClick={() => setReviewPly(Math.min(current.moves.length, reviewPly + 1))} aria-label="Nước tiếp"><ChevronRight size={16} /></button><button onClick={() => { setReviewPly(null); setSelected(null); }}><ChevronLast size={16} /> Trở lại trận</button></div>}
        </div>
        <div className="board-caption"><span>ATELIER No. 01</span><span>QUÂN ÁNH KIM · BÀN CỜ THỦ CÔNG</span><span>64 Ô. VÔ VÀN CÂU CHUYỆN.</span></div>
      </section>
      <aside className="right-rail">
        <div className="tools-panel"><div className="tools-tabs" role="tablist" aria-label="Công cụ trận đấu">{(["ai", "moves", "room"] as const).map(tab => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "tab-active" : ""} onClick={() => setActiveTab(tab)}>{tab === "ai" ? <Sparkles size={15} /> : tab === "moves" ? <History size={15} /> : <Users size={15} />}{tab === "ai" ? "Trợ lý AI" : tab === "moves" ? "Biên bản" : "Phòng đấu"}</button>)}</div>
          {activeTab === "ai" && <section className="analysis-panel"><div className="engine-heading"><span className="engine-icon"><Sparkles size={22} /></span><div><h2>Một góc nhìn đi trước.</h2><span>STOCKFISH 19 <i /> CHẠY TRÊN THIẾT BỊ</span></div></div>
            {!analysis?.lines.length && <div className="analysis-empty"><div className="analysis-orbit"><img src="/pieces/wN.svg" alt="" /><span>✦</span></div><h3>Nước hay bắt đầu<br />từ một ý tưởng.</h3><p>Khám phá ba phương án, hiểu thế cờ và nhìn thấy đường đi ngay trên bàn.</p></div>}
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
            <div className="room-save-note"><ShieldCheck size={18} /><p>{online.status === "waiting" ? "Đồng hồ chỉ bắt đầu khi người thứ hai vào phòng." : "Trận được lưu tự động. Đồng hồ vẫn chạy khi bạn rời trang."}<small>Nhập lại mã trên trình duyệt này để trở về đúng ghế.</small></p></div>
            {online.color && online.status === "playing" && <div className="room-actions"><button disabled={busy || Boolean(online.drawOffer)} onClick={() => void roomAction("offer")}><Users size={15} /> Đề nghị hòa</button><button disabled={busy} className="danger-action" onClick={() => void roomAction("resign")}><Flag size={15} /> Xin thua</button></div>}
            {ended && <div className="result-card"><Crown size={26} /><h3>{current.status === "draw" ? "Hòa cờ" : winner === online.color ? "Bạn đã chiến thắng!" : online.color ? timeout ? "Bạn đã thua do quá giờ" : "Một ván đấu đáng nhớ" : playerLabel(winner!) + " chiến thắng"}</h3><p>{timeout ? online.endReason === "move_timeout" ? "Thời gian dành cho một lượt đã hết." : "Tổng thời gian của kỳ thủ đã hết." : online.endReason === "resign" ? "Một kỳ thủ đã xin thua." : online.endReason === "agreement" ? "Hai kỳ thủ đồng ý hòa." : "Biên bản trận đấu vẫn được lưu."}</p><button className="primary-button full-width" onClick={() => setModal("create")}>Tạo một trận mới <ArrowRight size={15} /></button></div>}
          </> : <><div className="room-welcome"><Users size={36} /><h2>Khoảng cách không<br />ngăn một ván cờ.</h2><p>Tạo phòng, gửi mã 6 ký tự. Người bạn nhận quân Đen và bắt đầu chơi ngay.</p></div><button className="primary-button full-width" onClick={() => setModal("create")}><Plus size={17} /> Tạo phòng cùng bạn</button><button className="secondary-button full-width" onClick={() => setModal("join")}><Hash size={17} /> Nhập mã hoặc trở lại trận</button><div className="room-save-note"><ShieldCheck size={20} /><p>Tên, biên bản và đồng hồ được lưu trên server.<small>Cả hai kỳ thủ đều có đầy đủ công cụ bàn cờ và trợ lý AI.</small></p></div></>}
          </section>}
        </div>
        <div className="thought-card"><span>GÓC NHÌN KỲ THỦ</span><p>“Một nước đi hay không chỉ thay đổi bàn cờ. Nó mở ra một khả năng mới.”</p><div><span /> NƯỚC CỜ ATELIER</div></div>
        <div className="right-foot"><span><i /> STOCKFISH 19</span><button onClick={() => setModal("help")}>Luật & hướng dẫn <ArrowRight size={12} /></button></div>
      </aside>
    </main>
    {message && <div className="toast" role="alert"><span>{message}</span><button onClick={() => setMessage("")} aria-label="Đóng thông báo"><X size={16} /></button></div>}
    {drag && draggedPiece && <div className="drag-piece" style={{ left: drag.x, top: drag.y, width: drag.size, height: drag.size }}><img src={pieceImage(draggedPiece)} alt="" /></div>}
    <dialog className="atelier-modal" ref={modalRef} onCancel={() => setModal(null)}>
      <div className="modal-inner"><div className="modal-top"><span className="eyebrow">{modal === "create" ? "HẸN NHAU TRÊN 64 Ô" : modal === "join" ? "BẠN ĐÃ CÓ LỜI MỜI" : modal === "appearance" ? "KHÔNG GIAN CỦA RIÊNG BẠN" : "CHƠI HAY, CHƠI ĐÚNG"}</span><button onClick={() => setModal(null)} aria-label="Đóng"><X size={19} /></button></div>
      {modal === "create" && <><h2>Thiết lập một cuộc đấu.</h2><p className="modal-description">Chọn nhịp chơi. Gửi lời mời. Phần còn lại là những nước cờ.</p><label className="form-label" htmlFor="creator-name">Tên của bạn</label><input id="creator-name" className="text-input" maxLength={24} value={profileName} onChange={event => { setProfileName(event.target.value); remember("nuocco:playerName", event.target.value); }} placeholder="Tên hiển thị trên bàn cờ" />
        <div className="slider-setting"><label htmlFor="total-time"><span>Thời gian mỗi bên<small>Tổng ngân sách cho toàn ván</small></span><b>{totalMinutes}<em>phút</em></b></label><input id="total-time" type="range" min="5" max="100" step="1" value={totalMinutes} onChange={event => setTotalMinutes(Number(event.target.value))} /><div className="range-labels"><span>5 phút</span><span>100 phút</span></div></div>
        <div className="slider-setting"><label htmlFor="move-time"><span>Giới hạn mỗi lượt<small>Phải đi trước khi đồng hồ lượt hết</small></span><b>{moveSeconds}<em>giây</em></b></label><input id="move-time" type="range" min="60" max="300" step="15" value={moveSeconds} onChange={event => setMoveSeconds(Number(event.target.value))} /><div className="range-labels"><span>60 giây</span><span>300 giây</span></div></div>
        <div className="preset-buttons">{[[5,60,"Nhanh"],[15,120,"Cân bằng"],[30,180,"Thư thái"]].map(([minutes, seconds, label]) => <button key={label} className={totalMinutes === minutes && moveSeconds === seconds ? "preset-active" : ""} onClick={() => { setTotalMinutes(Number(minutes)); setMoveSeconds(Number(seconds)); }}>{label}</button>)}</div><div className="modal-note"><ShieldCheck size={16} /><span>Bạn cầm Trắng. Đồng hồ bắt đầu khi đối thủ vào phòng. Đóng trang không dừng thời gian.</span></div><button className="primary-button full-width modal-submit" disabled={busy} onClick={() => void createRoom()}>{busy ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />} Tạo phòng & nhận mã mời</button></>}
      {modal === "join" && <><h2>Một mã mời.<br />Một người bạn cùng chơi.</h2><p className="modal-description">Nhập mã để nhận quân Đen, hoặc trở lại ghế của bạn trong trận đã lưu.</p><label className="form-label" htmlFor="guest-name">Tên của bạn</label><input id="guest-name" className="text-input" value={profileName} maxLength={24} onChange={event => { setProfileName(event.target.value); remember("nuocco:playerName", event.target.value); }} /><label className="form-label" htmlFor="invite-code">Mã mời 6 ký tự</label><input id="invite-code" className="code-input" placeholder="ABC234" autoComplete="off" value={joinCode} onChange={event => setJoinCode(normalizeCode(event.target.value))} onKeyDown={event => { if (event.key === "Enter") void joinRoom(); }} /><button className="primary-button full-width modal-submit" disabled={busy || joinCode.length !== 6} onClick={() => void joinRoom()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />} Vào bàn cờ</button><p className="modal-footnote">Ghế đã đầy? Bạn vẫn có thể xem trận. Mã mời không thay thế quyền của người đang chơi.</p></>}
      {modal === "appearance" && <><h2>Đổi không khí. Giữ cuộc chơi.</h2><p className="modal-description">Sáu sắc thái cho một bộ quân ánh kim.</p><div className="battlefield-grid">{BATTLEFIELDS.map(item => <button className={"battlefield-card " + (appearance.battlefield === item.id ? "card-selected" : "")} key={item.id} onClick={() => changeBattlefield(item.id)}><span className={"theme-preview theme-mini-" + item.id}><img src="/pieces/wN.svg" alt="" /><img src="/pieces/bR.svg" alt="" /></span><strong>{item.name}{appearance.battlefield === item.id && <Check size={15} />}</strong><small>{item.caption}</small></button>)}</div><div className="board-color-choice"><span>Màu mặt bàn</span><div>{(["midnight","frost","crimson","walnut"] as const).map(theme => <button key={theme} className={"theme-swatch swatch-" + theme + (appearance.boardTheme === theme ? " swatch-active" : "")} onClick={() => changeBoardTheme(theme)} aria-label={"Màu bàn " + theme} />)}</div></div><button className={"particle-toggle-btn " + (appearance.particlesOn ? "pt-active" : "")} onClick={() => changeParticles(!appearance.particlesOn)}><Flame size={17} /> Hạt sáng trong không gian <span>{appearance.particlesOn ? "Đang bật" : "Đã tắt"}</span></button></>}
      {modal === "help" && <><h2>Mỗi người một màu.<br />Cùng một nhịp chơi.</h2><div className="help-steps"><p><b>01 · Di chuyển</b>Chạm quân rồi ô đích, kéo thả, hoặc dùng Tab và Enter. Các ô hợp lệ được đánh dấu.</p><p><b>02 · Đấu cùng bạn</b>Thiết lập thời gian, tạo phòng và gửi mã. Người thứ hai nhận quân Đen. Tên được sửa ngay trên thẻ người chơi.</p><p><b>03 · Thời gian</b>Tổng thời gian chỉ trừ vào bên đang đi. Giới hạn lượt được đặt lại sau mỗi nước. Hết một trong hai là thua.</p><p><b>04 · Trở lại trận</b>Trận online lưu trên server. Trình duyệt này giữ quyền ghế của bạn; tải lại hoặc nhập lại mã để tiếp tục. Đồng hồ vẫn chạy khi đóng trang.</p><p><b>05 · Khám phá</b>Trợ lý AI tìm ba phương án. Biên bản cho phép xem lại, xuất PGN và sao chép FEN. Khi xem lại, bấm “Trở lại trận” để đi tiếp.</p></div></>}
      </div></dialog>
    <dialog className="atelier-modal promotion-modal" ref={promotionRef} onCancel={() => setPromotion(null)}><div className="modal-inner"><span className="eyebrow">MỘT QUÂN TỐT, MỘT KHỞI ĐẦU MỚI</span><h2>Chọn quân phong cấp.</h2><div className="promotion-options">{["q", "r", "b", "n"].map(type => <button key={type} onClick={() => { if (promotion) void commitMove(promotion.from, promotion.to, type); }}><img src={pieceImage({ color: turn, type })} alt={names[type]} /><span>{names[type]}</span></button>)}</div></div></dialog>
    <footer className="site-footer"><span>NƯỚC CỜ <i>ATELIER</i></span><span>Đẹp trong từng nước đi.</span><button onClick={() => setModal("help")}>Hướng dẫn</button></footer>
  </div>;
}
