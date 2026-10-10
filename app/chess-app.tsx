"use client";
/* eslint-disable @next/next/no-img-element -- Native images preserve local SVG chess assets and animated overlays without an image service. */

import { Chess, type Square } from "chess.js";
import { ArrowRight, ArrowUpDown, Bot, BrainCircuit, Check, ChevronRight, Crown, Eye, EyeOff, Flag, Hash, Link2, LoaderCircle, Maximize2, Menu, Minimize2, Plus, RotateCcw, Share2, Sparkles, Swords, Users, Volume2, VolumeX, Wifi, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { MoveRecord, RoomStatus, RoomView } from "@/lib/rooms";
import type { Difficulty } from "@/lib/chess-ai";
import { describeMove, parseUciMove, principalVariation, searchStockfish, type EngineAnalysis, type EngineLine } from "@/lib/stockfish";

type BoardPiece = { id: string; square: Square; type: string; color: "w" | "b" };
type LocalGame = { fen: string; moves: MoveRecord[]; status: RoomStatus; version: number };
type Promotion = { from: Square; to: Square } | null;
type DragState = { from: Square; x: number; y: number; size: number } | null;
type ApiData = { error?: string; room: RoomView; token: string };

const files = "abcdefgh";
const pieceNames: Record<string, string> = { p: "Tốt", n: "Mã", b: "Tượng", r: "Xe", q: "Hậu", k: "Vua" };
const startFen = new Chess().fen();
const initialLocal: LocalGame = { fen: startFen, moves: [], status: "playing", version: 0 };

function buildGame(moves: MoveRecord[]) {
  const game = new Chess();
  for (const move of moves) game.move({ from: move.from, to: move.to, promotion: move.promotion });
  return game;
}

function resultStatus(game: Chess): RoomStatus {
  if (game.isCheckmate()) return game.turn() === "w" ? "black_won" : "white_won";
  if (game.isGameOver()) return "draw";
  return "playing";
}

function getPieces(moves: MoveRecord[]): BoardPiece[] {
  const game = new Chess();
  const pieces: BoardPiece[] = [];
  game.board().forEach((row, rank) => row.forEach((piece, file) => {
    if (piece) pieces.push({ id: `${files[file]}${8 - rank}`, square: `${files[file]}${8 - rank}` as Square, type: piece.type, color: piece.color });
  }));
  for (const move of moves) {
    const mover = pieces.find((piece) => piece.square === move.from);
    if (!mover) continue;
    const capturedSquare = move.flags.includes("e") ? `${move.to[0]}${move.from[1]}` : move.to;
    const captured = pieces.findIndex((piece) => piece.square === capturedSquare && piece.id !== mover.id);
    if (captured !== -1) pieces.splice(captured, 1);
    if (move.flags.includes("k") || move.flags.includes("q")) {
      const rank = move.from[1];
      const rookFrom = `${move.flags.includes("k") ? "h" : "a"}${rank}`;
      const rook = pieces.find((piece) => piece.square === rookFrom);
      if (rook) rook.square = `${move.flags.includes("k") ? "f" : "d"}${rank}` as Square;
    }
    mover.square = move.to;
    if (move.promotion) mover.type = move.promotion;
  }
  return pieces;
}

function pieceImage(piece: Pick<BoardPiece, "color" | "type">) {
  return `/pieces/${piece.color}${piece.type.toUpperCase()}.svg`;
}

function statusCopy(status: RoomStatus, turn: "w" | "b", check: boolean) {
  if (status === "waiting") return "Đang chờ bạn bè tham gia";
  if (status === "white_won") return "Quân trắng thắng cuộc";
  if (status === "black_won") return "Quân đen thắng cuộc";
  if (status === "draw") return "Ván cờ hòa";
  return `${check ? "Chiếu tướng · " : ""}Lượt của quân ${turn === "w" ? "trắng" : "đen"}`;
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6);
}

export default function ChessApp() {
  const [local, setLocal] = useState<LocalGame>(initialLocal);
  const [online, setOnline] = useState<RoomView | null>(null);
  const [playerToken, setPlayerToken] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<Promotion>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [boardTheme, setBoardTheme] = useState<"walnut" | "midnight">("walnut");
  const [flipped, setFlipped] = useState(false);
  const [localMode, setLocalMode] = useState<"local" | "ai">("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [humanColor, setHumanColor] = useState<"w" | "b">("w");
  const [aiFailed, setAiFailed] = useState(false);
  const [aiRetry, setAiRetry] = useState(0);
  const [joinOpen, setJoinOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [analysisState, setAnalysisState] = useState<{ key: string; result?: EngineAnalysis; lines: EngineLine[]; loading: boolean; error?: string } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [activeLine, setActiveLine] = useState(1);
  const analysisAbort = useRef<AbortController | null>(null);
  const menuDialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const inviteDialog = useRef<HTMLDialogElement>(null);
  const inviteInput = useRef<HTMLInputElement>(null);
  const promotionDialog = useRef<HTMLDialogElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ from: Square; x: number; y: number; moved: boolean } | null>(null);
  const soundRef = useRef<AudioContext | null>(null);
  const current = online || local;
  const game = useMemo(() => buildGame(current.moves), [current.moves]);
  const pieces = useMemo(() => getPieces(current.moves), [current.moves]);
  const aiMode = !online && localMode === "ai";
  const seatOrientation = online ? online.color === "b" ? "b" : "w" : aiMode ? humanColor : "w";
  const orientation = flipped ? (seatOrientation === "w" ? "b" : "w") : seatOrientation;
  const turn = game.turn();
  const aiThinking = aiMode && local.status === "playing" && turn !== humanColor && !aiFailed;
  const onlineCode = online?.code;
  const canMove = !busy && current.status === "playing" && (online ? online.hasBlack && online.color === turn : !aiMode || turn === humanColor);
  const legal = useMemo(() => selected && canMove ? game.moves({ square: selected, verbose: true }).map((move) => move.to) : [], [selected, canMove, game]);
  const lastMove = current.moves.at(-1);
  const captures = useMemo(() => game.history({ verbose: true }).filter((move) => move.captured), [game]);
  const positionKey = `${online?.code || localMode}:${current.version}:${game.fen()}`;
  const analysis = analysisState?.key === positionKey ? analysisState : null;
  const bestLine = analysis?.lines.find((line) => line.rank === activeLine) || analysis?.lines[0];
  const hintMove = bestLine ? parseUciMove(bestLine.pv[0]) : analysis?.result?.move;
  const hasHint = showHint && Boolean(hintMove) && current.status === "playing";
  const canAnalyze = current.status === "playing" && !aiThinking && !busy && (!online || !online.color || online.color === turn);

  useEffect(() => {
    analysisAbort.current?.abort();
    return () => analysisAbort.current?.abort();
  }, [positionKey]);

  useEffect(() => {
    const dialog = menuDialog.current;
    if (menuOpen && dialog && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog?.open) { dialog.close(); menuButton.current?.focus(); }
  }, [menuOpen]);

  async function requestAnalysis(deep = false) {
    if (!canAnalyze) return;
    analysisAbort.current?.abort();
    const controller = new AbortController();
    analysisAbort.current = controller;
    const key = positionKey;
    setShowHint(true);
    setActiveLine(1);
    setAnalysisState({ key, lines: [], loading: true });
    try {
      const result = await searchStockfish(current.moves, {
        analysis: true, deep, signal: controller.signal,
        onInfo: (lines) => { if (!controller.signal.aborted) setAnalysisState({ key, lines, loading: true }); },
      });
      if (!controller.signal.aborted) setAnalysisState({ key, result, lines: result.lines, loading: false });
    } catch (error) {
      if (!controller.signal.aborted) setAnalysisState({ key, lines: [], loading: false, error: error instanceof Error ? error.message : "Không thể phân tích. Hãy thử lại." });
    }
  }

  function boardPoint(square: Square) {
    const file = files.indexOf(square[0]);
    const rank = 8 - Number(square[1]);
    return { x: (orientation === "w" ? file : 7 - file) * 100 + 50, y: (orientation === "w" ? rank : 7 - rank) * 100 + 50 };
  }

  function evaluationCopy(line: EngineLine) {
    if (line.mate !== null) return `M${Math.abs(line.mate)}`;
    return `${line.score >= 0 ? "+" : ""}${line.score.toFixed(2)}`;
  }

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [current.moves.length]);
  const checkKing = useMemo(() => {
    if (!game.isCheck()) return null;
    for (const row of game.board()) for (const piece of row) if (piece?.type === "k" && piece.color === turn) return piece.square;
    return null;
  }, [game, turn]);

  const playSound = useCallback((capture: boolean) => {
    if (!soundOn) return;
    try {
      soundRef.current ??= new AudioContext();
      const context = soundRef.current;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(capture ? 310 : 450, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(capture ? 190 : 330, context.currentTime + 0.09);
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.11);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
    } catch { /* Audio is optional. */ }
  }, [soundOn]);

  useEffect(() => {
    if (!aiMode || local.status !== "playing" || game.turn() === humanColor) return;
    const controller = new AbortController();
    const version = local.version;
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchStockfish(local.moves, { difficulty, signal: controller.signal });
        if (controller.signal.aborted) return;
        const nextGame = buildGame(local.moves);
        const moved = nextGame.move(result.move);
        const record: MoveRecord = { from: moved.from, to: moved.to, san: moved.san, flags: moved.flags, ...(moved.promotion ? { promotion: moved.promotion } : {}) };
        setLocal((previous) => previous.version === version ? { fen: nextGame.fen(), moves: [...previous.moves, record], status: resultStatus(nextGame), version: version + 1 } : previous);
        playSound(Boolean(moved.captured));
      } catch {
        if (controller.signal.aborted) return;
        setAiFailed(true);
        setMessage("AI chưa thể tính nước đi. Mở menu và nhấn ‘Thử lại AI’ để tiếp tục.");
      }
    }, 280);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [aiMode, local, humanColor, difficulty, aiRetry, playSound, game]);

  useEffect(() => {
    const dialog = inviteDialog.current;
    if (joinOpen && dialog && !dialog.open) { dialog.showModal(); inviteInput.current?.focus(); }
    if (!joinOpen && dialog?.open) dialog.close();
  }, [joinOpen]);

  useEffect(() => {
    const dialog = promotionDialog.current;
    if (promotion && dialog && !dialog.open) dialog.showModal();
    if (!promotion && dialog?.open) dialog.close();
  }, [promotion]);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else setMessage("Trình duyệt này chưa hỗ trợ nút toàn màn hình. Bàn cờ vẫn tự co giãn theo màn hình của bạn.");
    } catch { setMessage("Không thể bật toàn màn hình trên trình duyệt này."); }
  }

  function openInvite() { setMenuOpen(false); setJoinCode(""); setMessage(""); setJoinOpen(true); }

  const fetchRoom = useCallback(async (code: string, token = "") => {
    const response = await fetch(`/api/rooms/${code}`, { headers: token ? { "x-player-token": token } : {} });
    const data = await response.json() as ApiData;
    if (!response.ok) throw new Error(data.error || "Không thể tải phòng.");
    return data.room as RoomView;
  }, []);

  useEffect(() => {
    const code = normalizeCode(new URLSearchParams(window.location.search).get("room") || "");
    if (code.length !== 6) return;
    const token = localStorage.getItem(`nuocco:${code}`) || "";
    fetchRoom(code, token).then((room) => {
      setJoinCode(code);
      setOnline(room);
      setPlayerToken(token);
      if (!room.color && !room.hasBlack) setJoinOpen(true);
    }).catch((error) => setMessage(error.message));
  }, [fetchRoom]);

  useEffect(() => {
    if (!onlineCode) return;
    const code = onlineCode;
    const timer = window.setInterval(() => {
      fetchRoom(code, playerToken).then((room) => setOnline((previous) => {
        if (!previous || previous.code !== code) return previous;
        return room.version > previous.version || room.color !== previous.color ? room : previous;
      })).catch(() => {});
    }, 1300);
    return () => window.clearInterval(timer);
  }, [onlineCode, playerToken, fetchRoom]);

  async function createRoom() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/rooms", { method: "POST" });
      const data = await response.json() as ApiData;
      if (!response.ok) throw new Error(data.error || "Không thể tạo phòng.");
      const room = data.room as RoomView;
      localStorage.setItem(`nuocco:${room.code}`, data.token);
      window.history.replaceState({}, "", `?room=${room.code}`);
      setOnline(room);
      setPlayerToken(data.token);
      setMenuOpen(false);
      setJoinCode(room.code);
      setSelected(null);
      setPromotion(null);
      setDrag(null);
      setFlipped(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tạo phòng."); }
    finally { setBusy(false); }
  }

  async function joinRoom() {
    const code = normalizeCode(joinCode);
    if (code.length !== 6 || busy) {
      if (code.length !== 6) setMessage("Hãy nhập mã phòng gồm 6 ký tự.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const saved = localStorage.getItem(`nuocco:${code}`);
      let room: RoomView;
      let token: string;
      if (saved) {
        room = await fetchRoom(code, saved);
        token = room.color ? saved : "";
      } else {
        token = "";
        room = await fetchRoom(code);
      }
      if (!token && !room.hasBlack) {
        const response = await fetch(`/api/rooms/${code}/join`, { method: "POST" });
        const data = await response.json() as ApiData;
        if (!response.ok) throw new Error(data.error || "Không thể tham gia phòng.");
        room = data.room;
        token = data.token;
        localStorage.setItem(`nuocco:${code}`, token);
      }
      window.history.replaceState({}, "", `?room=${code}`);
      setOnline(room);
      setPlayerToken(token);
      setSelected(null);
      setPromotion(null);
      setDrag(null);
      setFlipped(false);
      setJoinOpen(false);
      setMenuOpen(false);
      if (!token) setMessage("Phòng đã đủ hai người. Bạn đang xem ván cờ.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tham gia phòng."); }
    finally { setBusy(false); }
  }

  function playLocally(mode: "local" | "ai" = localMode, color = humanColor) {
    analysisAbort.current?.abort();
    setAnalysisState(null);
    setMenuOpen(false);
    window.history.replaceState({}, "", window.location.pathname);
    setOnline(null);
    setPlayerToken("");
    setLocal(initialLocal);
    setLocalMode(mode);
    setHumanColor(color);
    setSelected(null);
    setPromotion(null);
    setDrag(null);
    setAiFailed(false);
    setJoinOpen(false);
    setFlipped(false);
    setMessage("");
  }

  async function copyInvite(link = false) {
    if (!online) return;
    try {
      await navigator.clipboard.writeText(link ? `${window.location.origin}${window.location.pathname}?room=${online.code}` : online.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setMessage(`Bạn có thể sao chép mã này để gửi cho bạn bè: ${online.code}`); }
  }

  async function commitMove(from: Square, to: Square, choice?: string) {
    if (!canMove) return;
    const newGame = buildGame(current.moves);
    let moved;
    try { moved = newGame.move({ from, to, promotion: choice }); }
    catch { setSelected(null); return; }
    const record: MoveRecord = { from: moved.from, to: moved.to, san: moved.san, flags: moved.flags, ...(moved.promotion ? { promotion: moved.promotion } : {}) };
    const previous = current;
    const next = { ...current, fen: newGame.fen(), moves: [...current.moves, record], status: resultStatus(newGame), version: current.version + 1 };
    setSelected(null);
    setPromotion(null);
    setAiFailed(false);
    playSound(Boolean(moved.captured));
    if (!online) { setLocal(next); return; }
    setOnline(next as RoomView);
    setBusy(true);
    try {
      const response = await fetch(`/api/rooms/${online.code}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-player-token": playerToken },
        body: JSON.stringify({ from, to, promotion: choice, version: previous.version }),
      });
      const data = await response.json() as ApiData;
      if (!response.ok) throw new Error(data.error || "Không thể gửi nước đi.");
      setOnline(data.room);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể gửi nước đi.");
      try { setOnline(await fetchRoom(online.code, playerToken)); }
      catch { setOnline(previous as RoomView); }
    } finally { setBusy(false); }
  }

  function attemptMove(from: Square, to: Square) {
    if (!canMove || !game.moves({ square: from, verbose: true }).some((move) => move.to === to)) { setSelected(null); return; }
    const piece = game.get(from);
    if (piece?.type === "p" && (to[1] === "1" || to[1] === "8")) {
      setPromotion({ from, to });
      return;
    }
    void commitMove(from, to);
  }

  function onSquareClick(square: Square) {
    const piece = game.get(square);
    if (!canMove) return;
    if (selected && selected !== square && legal.includes(square)) { attemptMove(selected, square); return; }
    setSelected(piece?.color === turn ? square : null);
  }

  function onPieceDown(event: PointerEvent<HTMLDivElement>, piece: BoardPiece) {
    if (!canMove || piece.color !== turn) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { from: piece.square, x: event.clientX, y: event.clientY, moved: false };
    setSelected(piece.square);
  }

  function onPieceMove(event: PointerEvent<HTMLDivElement>, piece: BoardPiece) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.from !== piece.square) return;
    if (!pointer.moved && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 7) return;
    pointer.moved = true;
    const size = (boardRef.current?.getBoundingClientRect().width || 480) / 8;
    setDrag({ from: piece.square, x: event.clientX, y: event.clientY, size });
  }

  function onPieceUp(event: PointerEvent<HTMLDivElement>, piece: BoardPiece) {
    const pointer = pointerRef.current;
    pointerRef.current = null;
    setDrag(null);
    if (!pointer || pointer.from !== piece.square || !pointer.moved) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor((event.clientX - rect.left) / (rect.width / 8));
    const y = Math.floor((event.clientY - rect.top) / (rect.height / 8));
    if (x < 0 || x > 7 || y < 0 || y > 7) return;
    const square = `${files[orientation === "w" ? x : 7 - x]}${orientation === "w" ? 8 - y : y + 1}` as Square;
    if (square !== piece.square) attemptMove(piece.square, square);
  }

  async function resign() {
    if (!online || !playerToken || !window.confirm("Bạn chắc chắn muốn xin thua ván này?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/rooms/${online.code}/resign`, { method: "POST", headers: { "x-player-token": playerToken } });
      const data = await response.json() as ApiData;
      if (!response.ok) throw new Error(data.error || "Không thể xin thua.");
      setOnline(data.room);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể xin thua."); }
    finally { setBusy(false); }
  }

  const pairMoves = Array.from({ length: Math.ceil(current.moves.length / 2) }, (_, index) => current.moves.slice(index * 2, index * 2 + 2));
  const opponentColor = orientation === "w" ? "b" : "w";
  const ownColor = orientation;

  function playerName(color: "w" | "b") {
    if (aiMode) return color === humanColor ? "Bạn" : `Nước Cờ AI · ${difficulty === "easy" ? "Dễ" : difficulty === "medium" ? "Vừa" : "Khó"}`;
    if (!online) return `Người chơi ${color === "w" ? "trắng" : "đen"}`;
    if (online.color === color) return "Bạn";
    if (color === "b" && !online.hasBlack) return "Đang chờ kỳ thủ";
    return online.color ? "Bạn bè" : `Quân ${color === "w" ? "trắng" : "đen"}`;
  }

  function capturedPieces(color: "w" | "b") {
    return <span className="captured-pieces" aria-label="Quân đã bắt">{captures.filter((move) => move.color === color).map((move, index) => <img key={index} src={pieceImage({ color: color === "w" ? "b" : "w", type: move.captured! })} alt={pieceNames[move.captured!]} />)}</span>;
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <button ref={menuButton} className={`menu-toggle ${menuOpen ? "menu-toggle-active" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Đóng menu chức năng" : "Mở menu chức năng"} aria-expanded={menuOpen} aria-controls="game-menu"><Menu size={22} /></button>
        <button className="brand" onClick={() => playLocally()} aria-label="Nước Cờ - Ván mới">
          <span className="brand-icon"><img src="/pieces/wN.svg" alt="" /></span><span>Nước Cờ<span className="brand-subtitle">THE ART OF CHESS</span></span>
        </button>
        <span className="header-caption">TRÍ TUỆ LÀ VŨ KHÍ CỦA BẠN.</span>
        <div className="header-right"><button className="header-link" onClick={openInvite} disabled={busy}><Hash size={16} /><span>Nhập mã mời</span></button><button className="header-share" onClick={() => online ? void copyInvite() : void createRoom()} disabled={busy}>{copied ? <Check size={16} /> : <Share2 size={16} />}<span>{copied ? "Đã sao chép" : online ? "Chia sẻ mã" : "Mời bạn chơi"}</span></button><button className="icon-button fullscreen-button" onClick={toggleFullscreen} aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} title={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>{fullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</button></div>
      </header>

      <main className="workspace">
        <dialog id="game-menu" ref={menuDialog} className="menu-drawer" onCancel={() => setMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setMenuOpen(false); } }} aria-labelledby="menu-title">
        <aside className="club-rail">
          <div className="drawer-head"><span className="section-overline"><Swords size={15} /> BỘ CHỈ HUY</span><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Đóng menu chức năng"><X size={21} /></button></div>
          <div className="rail-heading"><h2 id="menu-title">Chọn chiến trường<br /><em>của bạn.</em></h2></div>
          <nav className="mode-nav" aria-label="Chế độ chơi"><button className={aiMode ? "mode-active" : ""} onClick={() => playLocally("ai")} disabled={busy}><Bot size={20} /><span>Đấu với AI<small>Rèn luyện từng ngày</small></span>{aiMode && <span className="mode-dot" />}</button><button className={!online && !aiMode ? "mode-active" : ""} onClick={() => playLocally("local")} disabled={busy}><Users size={20} /><span>Cùng thiết bị<small>Hai người, một bàn cờ</small></span></button><button className={online ? "mode-active" : ""} onClick={createRoom} disabled={busy}><Wifi size={20} /><span>Chơi online<small>Tạo phòng cho bạn bè</small></span></button></nav>
          <div className="drawer-settings">
            {aiMode && <div className="ai-settings"><span className="setting-label">Độ khó</span><div className="segmented" id="difficulty" role="group" aria-label="Độ khó AI">{(["easy", "medium", "hard"] as const).map((level) => <button key={level} className={difficulty === level ? "segment-active" : ""} aria-pressed={difficulty === level} onClick={() => { setDifficulty(level); setAiFailed(false); }}>{level === "easy" ? "Dễ" : level === "medium" ? "Vừa" : "Khó"}</button>)}</div><span className="setting-label">Bạn cầm quân <small>Chọn màu sẽ bắt đầu ván mới</small></span><div className="color-choice"><button className={humanColor === "w" ? "color-active" : ""} onClick={() => playLocally("ai", "w")} aria-pressed={humanColor === "w"}><img src="/pieces/wK.svg" alt="" />Trắng</button><button className={humanColor === "b" ? "color-active" : ""} onClick={() => playLocally("ai", "b")} aria-pressed={humanColor === "b"}><img src="/pieces/bK.svg" alt="" />Đen</button></div><p className="ai-hint"><span className="live-dot" /> AI chạy trên thiết bị · Không cần tài khoản</p>{!aiThinking && turn !== humanColor && current.status === "playing" && <button className="secondary-button" onClick={() => { setMessage(""); setAiFailed(false); setAiRetry((value) => value + 1); }}><RotateCcw size={15} /> Thử lại AI</button>}</div>}
          </div>
          <div className="rail-invite"><span className="section-overline">CÓ LỜI MỜI TỪ BẠN BÈ?</span><button className="secondary-button" onClick={openInvite} disabled={busy}><Hash size={17} /> Nhập mã mời <ChevronRight size={16} /></button></div>
          <div className="club-art"><img src="/chess-battlefield.png" alt="Hai đội quân cờ trên chiến trường" /><div><span>EVERY MOVE MATTERS.</span><p>Nghĩ sâu hơn.<br />Đi xa hơn.</p></div></div>
          <span className="rail-footnote">MỘT BÀN CỜ. VÔ VÀN CHIẾN THUẬT.</span>
        </aside>
        </dialog>
        <div className="arena-heading"><div><span className="section-overline"><Swords size={14} /> THE CHESS BATTLEFIELD</span><h1>Làm chủ <em>chiến cuộc.</em></h1></div><div className="arena-meta"><span className="mode-pill">{online ? <Wifi size={14} /> : aiMode ? <Bot size={14} /> : <Users size={14} />}{online ? `Phòng ${online.code}` : aiMode ? "Đấu với AI" : "Cùng thiết bị"}<span className="live-dot" /></span><button className="text-action" onClick={() => setMenuOpen(true)}>Đổi chế độ <ChevronRight size={13} /></button></div></div>
        <section className="game-layout" aria-label="Bàn cờ vua">
          <div className={`board-column theme-${boardTheme}`}>
            <div className={`player-row opponent-row ${turn === opponentColor && current.status === "playing" ? "player-active" : ""}`}><span className={`player-avatar ${opponentColor === "w" ? "avatar-white" : "avatar-black"}`}><img src={pieceImage({ color: opponentColor, type: "k" })} alt="" /></span><span className="player-text"><strong>{playerName(opponentColor)}</strong><small>{opponentColor === "b" && online && !online.hasBlack ? "Chia sẻ mã phòng để mời bạn" : `Quân ${opponentColor === "w" ? "trắng" : "đen"}`}</small></span>{capturedPieces(opponentColor)}<span className={`turn-badge ${turn === opponentColor && current.status === "playing" ? "turn-active" : ""}`}>{aiThinking && opponentColor !== humanColor ? <><span className="thinking-dot" /> ĐANG TÍNH</> : turn === opponentColor && current.status === "playing" ? "ĐANG ĐI" : "CHỜ LƯỢT"}</span></div>

            <div className="board-frame"><div className="board" ref={boardRef}>
              {Array.from({ length: 8 }, (_, rankIndex) => Array.from({ length: 8 }, (_, fileIndex) => {
                const square = `${files[orientation === "w" ? fileIndex : 7 - fileIndex]}${orientation === "w" ? 8 - rankIndex : rankIndex + 1}` as Square;
                const light = (fileIndex + rankIndex) % 2 === 0;
                const piece = pieces.find((item) => item.square === square);
                const isLegal = legal.includes(square);
                return <button key={square} type="button" data-square={square} className={`square ${light ? "square-light" : "square-dark"} ${selected === square ? "square-selected" : ""} ${lastMove?.from === square || lastMove?.to === square ? "square-last" : ""} ${checkKing === square ? "square-check" : ""}`} onClick={() => onSquareClick(square)} aria-label={`${square}${piece ? `, ${pieceNames[piece.type]} ${piece.color === "w" ? "trắng" : "đen"}` : ""}`}>
                  {fileIndex === 0 && <span className="rank-label">{square[1]}</span>}
                  {rankIndex === 7 && <span className="file-label">{square[0]}</span>}
                  {isLegal && <span className={piece ? "legal-capture" : "legal-dot"} />}
                  {lastMove?.to === square && <span key={current.moves.length} className="landing-pulse" />}
                </button>;
              }))}
              {pieces.map((piece) => {
                const file = files.indexOf(piece.square[0]);
                const rank = 8 - Number(piece.square[1]);
                const x = orientation === "w" ? file : 7 - file;
                const y = orientation === "w" ? rank : 7 - rank;
                const pickable = canMove && piece.color === turn;
                return <div key={piece.id} className={`piece piece-${piece.color} ${pickable ? "piece-pickable" : ""} ${selected === piece.square ? "piece-selected" : ""} ${drag?.from === piece.square ? "piece-dragging" : ""}`} style={{ transform: `translate3d(${x * 100}%, ${y * 100}%, 0)`, pointerEvents: pickable ? "auto" : "none" }} onPointerDown={(event) => onPieceDown(event, piece)} onPointerMove={(event) => onPieceMove(event, piece)} onPointerUp={(event) => onPieceUp(event, piece)} onPointerCancel={() => { pointerRef.current = null; setDrag(null); }}><img src={pieceImage(piece)} alt="" draggable={false} /></div>;
              })}
              {hasHint && hintMove && (() => {
                const from = boardPoint(hintMove.from);
                const to = boardPoint(hintMove.to);
                const distance = Math.hypot(to.x - from.x, to.y - from.y);
                const start = { x: from.x + (to.x - from.x) * 32 / distance, y: from.y + (to.y - from.y) * 32 / distance };
                const end = { x: to.x - (to.x - from.x) * 20 / distance, y: to.y - (to.y - from.y) * 20 / distance };
                return <svg className="hint-overlay" viewBox="0 0 800 800" role="img" aria-label={`Gợi ý: đi ${hintMove.from} đến ${hintMove.to}`}><defs><marker id="hint-arrowhead" markerWidth="3.5" markerHeight="3.5" refX="2.5" refY="1.75" orient="auto"><path d="M0,0 L3.5,1.75 L0,3.5 Z" fill="currentColor" /></marker></defs><circle className="hint-origin" cx={from.x} cy={from.y} r="41" /><circle className="hint-target" cx={to.x} cy={to.y} r="32" /><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} markerEnd="url(#hint-arrowhead)" /></svg>;
              })()}
            </div></div>

            <div className={`player-row own-row ${turn === ownColor && current.status === "playing" ? "player-active" : ""}`}><span className={`player-avatar ${ownColor === "w" ? "avatar-white" : "avatar-black"}`}><img src={pieceImage({ color: ownColor, type: "k" })} alt="" /></span><span className="player-text"><strong>{playerName(ownColor)}</strong><small>{online && !online.color ? "Bạn đang xem ván đấu" : "Chạm hoặc kéo quân để đi"}</small></span>{capturedPieces(ownColor)}<span className={`turn-badge ${turn === ownColor && current.status === "playing" ? "turn-active" : ""}`}>{turn === ownColor && current.status === "playing" ? "ĐANG ĐI" : "CHỜ LƯỢT"}</span></div>
            <div className="board-footer"><span className="game-status"><span className="status-pulse" /> {aiThinking ? "AI đang suy nghĩ…" : statusCopy(current.status, turn, game.isCheck())}</span><div className="board-tools"><div className="theme-picker" aria-label="Màu bàn cờ"><button className={`theme-swatch swatch-walnut ${boardTheme === "walnut" ? "swatch-active" : ""}`} onClick={() => setBoardTheme("walnut")} aria-label="Bàn cờ gỗ óc chó" aria-pressed={boardTheme === "walnut"} title="Gỗ óc chó" /><button className={`theme-swatch swatch-midnight ${boardTheme === "midnight" ? "swatch-active" : ""}`} onClick={() => setBoardTheme("midnight")} aria-label="Bàn cờ đá đêm" aria-pressed={boardTheme === "midnight"} title="Đá đêm" /></div><button className="icon-button" onClick={() => { setFlipped(!flipped); setSelected(null); }} aria-label="Xoay bàn cờ" title="Xoay bàn cờ"><ArrowUpDown size={17} /></button><button className="icon-button" onClick={() => setSoundOn(!soundOn)} aria-label={soundOn ? "Tắt âm thanh" : "Bật âm thanh"} title={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div></div>
          </div>

          <aside className="side-panel">
            <div className="panel-top"><div><div className="panel-kicker"><BrainCircuit size={15} /> CỐ VẤN CHIẾN THUẬT</div><h2>Nhìn trước một bước.</h2></div><span className="engine-badge"><span className="live-dot" /> STOCKFISH 19</span></div>
            <section className="analysis-card" aria-label="Gợi ý và phân tích AI">
              <div className="analysis-actions"><button className="primary-button hint-button" onClick={() => void requestAnalysis()} disabled={!canAnalyze || analysis?.loading}>{analysis?.loading ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}{analysis?.loading ? "Đang tính chiến thuật…" : "Gợi ý nước đi"}</button><button className="hint-visibility" onClick={() => setShowHint(!showHint)} disabled={!hintMove} aria-label={showHint ? "Ẩn mũi tên gợi ý" : "Hiện mũi tên gợi ý"} aria-pressed={showHint} title={showHint ? "Ẩn mũi tên" : "Hiện mũi tên"}>{showHint ? <Eye size={18} /> : <EyeOff size={18} />}</button></div>
              {analysis?.error && <div className="analysis-error" role="alert">{analysis.error}<button className="text-action" onClick={() => void requestAnalysis()} disabled={!canAnalyze}>Thử lại</button></div>}
              {analysis && bestLine && hintMove ? <div className="analysis-result">
                <div className="suggested-move"><span className="suggested-piece"><img src={pieceImage({ color: turn, type: game.get(hintMove.from)?.type || "p" })} alt="" /></span><div><span className="section-overline">{activeLine === 1 ? "NƯỚC ĐI ĐỀ XUẤT" : `PHƯƠNG ÁN ${activeLine}`}</span><strong>{hintMove.from}<ArrowRight size={17} />{hintMove.to}{hintMove.promotion && <small>Phong {pieceNames[hintMove.promotion]}</small>}</strong></div><span className="suggested-san">{principalVariation(game, [bestLine.pv[0]], 1)[0]}</span></div>
                <p className="move-explanation">{describeMove(game, hintMove, bestLine)}</p>
                <div className="evaluation-heading"><span>Đánh giá thế cờ</span><strong>{evaluationCopy(analysis.lines[0])}</strong></div>
                <div className="evaluation-bar" role="img" aria-label={`Đánh giá theo quân trắng: ${evaluationCopy(analysis.lines[0])}`}><span style={{ width: `${50 + 46 * Math.tanh(analysis.lines[0].score / 4)}%` }} /></div>
                <div className="evaluation-caption"><span>Trắng</span><span>{Math.abs(analysis.lines[0].score) < .35 ? "Thế trận cân bằng" : analysis.lines[0].score > 0 ? "Trắng có lợi thế" : "Đen có lợi thế"}</span><span>Đen</span></div>
                <div className="variation-heading"><span className="section-overline">CÁC BIẾN DỰ KIẾN</span><span>Độ sâu {bestLine.depth}</span></div>
                <div className="candidate-lines">{analysis.lines.map((line) => <button key={line.rank} className={`candidate-line ${activeLine === line.rank ? "candidate-active" : ""}`} onClick={() => { setActiveLine(line.rank); setShowHint(true); }} aria-pressed={activeLine === line.rank}><span className="candidate-rank">{line.rank === 1 ? <Sparkles size={12} /> : line.rank}</span><span className="candidate-pv">{principalVariation(game, line.pv).map((san, index) => <span key={index}>{san}</span>)}</span><strong>{evaluationCopy(line)}</strong></button>)}</div>
                <div className="analysis-footnote"><span>{analysis.loading ? "Đang tìm sâu hơn…" : "Đánh giá từ góc nhìn quân trắng"}</span><button className="text-action" onClick={() => void requestAnalysis(true)} disabled={!canAnalyze || analysis.loading}><BrainCircuit size={13} /> Phân tích sâu</button></div>
              </div> : !analysis?.error && <div className="analysis-intro"><div className="analysis-intro-icon"><BrainCircuit size={26} /></div><strong>Một nước đi. Một lợi thế.</strong><p>{current.status === "waiting" ? "Chờ đối thủ tham gia để bắt đầu phân tích." : current.status !== "playing" ? "Ván đấu đã kết thúc. Bắt đầu ván mới để tiếp tục." : aiThinking ? "Đợi AI đi xong để phân tích lượt của bạn." : !canAnalyze ? "Chờ đến lượt của bạn để nhận gợi ý." : "Nhờ AI đọc thế trận, tìm nước đi tốt và vạch ra chiến thuật trên bàn cờ."}</p><span><span className="legend-ring" /> Khoanh quân <span className="legend-arrow">↗</span> Chỉ hướng đi</span></div>}
            </section>

            {online ? <div className="room-card"><div className="room-card-head"><span><Wifi size={14} /> MÃ PHÒNG</span><span className="room-live">{online.hasBlack ? "ĐÃ KẾT NỐI" : "ĐANG CHỜ"}</span></div><div className="room-code">{online.code}</div><button className="primary-button" onClick={() => void copyInvite()}>{copied ? <Check size={16} /> : <Share2 size={16} />}{copied ? "Đã sao chép" : "Chia sẻ mã phòng"}</button><div className="invite-tools"><button onClick={() => void copyInvite(true)}><Link2 size={14} /> Sao chép link</button><button onClick={openInvite} disabled={busy}><Hash size={14} /> Nhập mã mời</button></div></div> : <div className="friend-actions"><button className="secondary-button" onClick={createRoom} disabled={busy}><Plus size={16} /> Tạo phòng với bạn bè</button><button className="text-action" onClick={openInvite} disabled={busy}><Hash size={15} /> Nhập mã mời của người khác <ChevronRight size={14} /></button></div>}

            {message && <div className="message" role="status">{message}<button onClick={() => setMessage("")} aria-label="Đóng thông báo">×</button></div>}

            {current.status !== "playing" && current.status !== "waiting" && <div className="result-banner"><Crown size={23} /><div><strong>{statusCopy(current.status, turn, false)}</strong><small>Một ván đấu đáng nhớ. Sẵn sàng cho ván tiếp theo?</small></div></div>}

            <div className="panel-divider" />
            <div className="history-head"><div><span className="section-overline">DIỄN BIẾN VÁN ĐẤU</span><h3>Các nước đã đi</h3></div><span className="move-count">{current.moves.length} nước</span></div>
            <div className="history-columns"><span>#</span><span>TRẮNG</span><span>ĐEN</span></div>
            <div className="move-list" ref={historyRef} aria-live="polite">{pairMoves.length ? pairMoves.map((pair, index) => <div className="move-pair" key={index}><span className="move-number">{String(index + 1).padStart(2, "0")}</span>{[0, 1].map((offset) => <span key={offset} className={`move-cell ${index * 2 + offset === current.moves.length - 1 ? "move-latest" : ""}`}>{pair[offset]?.san || "—"}</span>)}</div>) : <div className="empty-history"><img src="/pieces/wP.svg" alt="" /><strong>Mọi ván cờ đều bắt đầu<br />từ một nước đi.</strong><p>Chọn quân và tạo khai cuộc của bạn.</p></div>}</div>
            <div className="last-move-card"><span>{lastMove ? "NƯỚC GẦN NHẤT" : "SẴN SÀNG KHAI CUỘC"}</span><strong>{lastMove ? <>{lastMove.from}<ArrowRight size={13} />{lastMove.to}<b>{lastMove.san}</b></> : <><span className="live-dot" /> Quân trắng đi trước</>}</strong></div>
            <div className="panel-bottom"><button className="text-action" disabled={busy} onClick={() => playLocally()}><RotateCcw size={16} /> {online ? "Rời phòng · Chơi trên máy" : "Ván mới"}</button>{online?.color && online.status === "playing" && <button className="resign-action" onClick={resign} disabled={busy}><Flag size={14} /> Xin thua</button>}</div>
          </aside>
        </section>

      </main>

      <footer className="footer"><span>NƯỚC CỜ / EVERY MOVE MATTERS</span><span><a href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1" target="_blank" rel="noreferrer">Stockfish 19</a> · <a href="/engine/COPYING.txt" target="_blank" rel="noreferrer">GPL v3</a> · Quân cờ <a href="https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces/Standard" target="_blank" rel="noreferrer">Cburnett</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a></span></footer>

      <dialog className="invite-modal" ref={inviteDialog} onCancel={() => setJoinOpen(false)}><button className="modal-close icon-button" onClick={() => setJoinOpen(false)} aria-label="Đóng cửa sổ nhập mã"><X size={20} /></button><span className="promotion-crown"><Hash size={25} /></span><span className="section-overline">MỘT LỜI MỜI. MỘT VÁN ĐẤU.</span><h2>Nhập mã mời.</h2><p>Nhập 6 ký tự bạn nhận được để vào bàn cờ.<br />Người tham gia cầm quân đen.</p><form onSubmit={(event) => { event.preventDefault(); void joinRoom(); }}><input className="invite-code-input" value={joinCode} onChange={(event) => setJoinCode(normalizeCode(event.target.value))} placeholder="A7K9P2" aria-label="Mã mời gồm 6 ký tự" maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false} ref={inviteInput} /><button className="primary-button" type="submit" disabled={busy || joinCode.length !== 6}>{busy ? "Đang kết nối…" : "Tham gia bàn cờ"}<ArrowRight size={17} /></button></form>{message && <p className="invite-error" role="status">{message}</p>}<small>Mã phòng khác? Bạn vẫn có thể nhập khi đang ở một phòng.</small></dialog>

      {drag && <img className="drag-ghost" src={pieceImage(pieces.find((piece) => piece.square === drag.from) || { color: turn, type: "p" })} alt="" style={{ left: drag.x - drag.size / 2, top: drag.y - drag.size / 2, width: drag.size, height: drag.size }} />}
      {promotion && <dialog className="promotion-modal" ref={promotionDialog} onCancel={() => setPromotion(null)} aria-label="Chọn quân phong cấp"><span className="promotion-crown"><Crown size={28} /></span><div className="modal-overline">MỘT BƯỚC TIẾN. MỘT QUYỀN LỰC MỚI.</div><h2>Thời khắc phong cấp.</h2><p>Chọn quân cờ để viết tiếp ván đấu của bạn.</p><div className="promotion-options">{(["q", "r", "b", "n"] as const).map((type) => <button key={type} onClick={() => void commitMove(promotion.from, promotion.to, type)} aria-label={`Phong cấp thành ${pieceNames[type]}`}><img src={pieceImage({ color: turn, type })} alt="" /><span>{pieceNames[type]}</span></button>)}</div><button className="modal-cancel" onClick={() => setPromotion(null)}>Quay lại bàn cờ</button></dialog>}
    </div>
  );
}
