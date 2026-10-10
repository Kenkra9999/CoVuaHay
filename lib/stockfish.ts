import { Chess, type Square } from "chess.js";
import type { AiMove, Difficulty } from "./chess-ai";

export type EngineLine = { rank: number; depth: number; nodes: number; score: number; mate: number | null; pv: string[] };
export type EngineAnalysis = { move: AiMove; lines: EngineLine[] };
export type EngineOptions = { difficulty?: Difficulty; analysis?: boolean; deep?: boolean; signal?: AbortSignal; onInfo?: (lines: EngineLine[]) => void };

export function parseUciMove(uci: string): AiMove | null {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  return { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, ...(uci[4] ? { promotion: uci[4] } : {}) };
}

// Every evaluation is normalized to White's perspective, including mate scores.
export function parseEngineLine(text: string, turn: "w" | "b"): EngineLine | null {
  if (!text.startsWith("info ") || /\b(lowerbound|upperbound)\b/.test(text)) return null;
  const score = text.match(/\bscore (cp|mate) (-?\d+)/);
  const pv = text.match(/\bpv (.+)$/);
  const depth = text.match(/\bdepth (\d+)/);
  if (!score || !pv || !depth) return null;
  const signed = Number(score[2]) * (turn === "w" ? 1 : -1);
  return { rank: Number(text.match(/\bmultipv (\d+)/)?.[1] || 1), depth: Number(depth[1]), nodes: Number(text.match(/\bnodes (\d+)/)?.[1] || 0), score: score[1] === "cp" ? signed / 100 : Math.sign(signed) * 100, mate: score[1] === "mate" ? signed : null, pv: pv[1].trim().split(/\s+/) };
}

export function principalVariation(game: Chess, pv: string[], limit = 6): string[] {
  const preview = new Chess(game.fen());
  const moves: string[] = [];
  for (const uci of pv.slice(0, limit)) {
    const move = parseUciMove(uci);
    if (!move) break;
    try { moves.push(preview.move(move).san); } catch { break; }
  }
  return moves;
}

export function describeMove(game: Chess, move: AiMove, line?: EngineLine): string {
  const preview = new Chess(game.fen());
  const played = preview.move(move);
  const names: Record<string, string> = { p: "tốt", n: "mã", b: "tượng", r: "xe", q: "hậu", k: "vua" };
  if (preview.isCheckmate()) return "Nước đi kết thúc ván đấu bằng chiếu hết.";
  if (line?.mate && line.mate * (game.turn() === "w" ? 1 : -1) > 0) return `Tạo thế chiếu hết dự kiến trong ${Math.abs(line.mate)} nước nếu hai bên đi tối ưu.`;
  if (played.promotion) return `Phong tốt thành ${names[played.promotion]} để tăng sức mạnh tấn công.`;
  if (played.flags.includes("k") || played.flags.includes("q")) return "Nhập thành để bảo vệ vua và đưa xe vào cuộc.";
  if (played.captured) return `Bắt ${names[played.captured]} của đối phương${preview.isCheck() ? " đồng thời chiếu vua" : ""}. Xem biến dự kiến để theo dõi nước đáp trả.`;
  if (preview.isCheck()) return "Chiếu vua, buộc đối phương xử lý mối đe dọa trước khi tiếp tục kế hoạch.";
  if (game.isCheck()) return "Hóa giải chiếu và tiếp tục duy trì thế trận.";
  if (game.history().length < 16 && ["n", "b"].includes(played.piece)) return "Phát triển quân nhẹ để tranh quyền kiểm soát trung tâm.";
  if (["d4", "e4", "d5", "e5"].includes(played.to)) return "Đưa quân vào trung tâm để gia tăng sức ép và không gian hoạt động.";
  return `Đi ${names[played.piece]} từ ${played.from} đến ${played.to}. Stockfish đánh giá nước này tốt nhất trong các biến đã tìm kiếm.`;
}

// A dedicated single-thread WASM worker keeps the board responsive and works
// without cross-origin isolation. Abort terminates searches on stale positions.
export function searchStockfish(moves: AiMove[], options: EngineOptions = {}): Promise<EngineAnalysis> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    let worker: Worker;
    try { worker = new Worker("/engine/stockfish-19-lite-single.js"); }
    catch (error) { reject(error); return; }
    const game = new Chess();
    try { for (const move of moves) game.move(move); }
    catch (error) { worker.terminate(); reject(error); return; }
    const lines = new Map<number, EngineLine>();
    let settled = false;
    const cleanup = () => { window.clearTimeout(timeout); options.signal?.removeEventListener("abort", abort); worker.terminate(); };
    const fail = (error: unknown) => { if (settled) return; settled = true; cleanup(); reject(error); };
    const abort = () => fail(new DOMException("Cancelled", "AbortError"));
    const timeout = window.setTimeout(() => fail(new Error("Stockfish mất quá lâu để phản hồi. Hãy thử lại.")), 25000);
    options.signal?.addEventListener("abort", abort, { once: true });
    worker.onerror = () => fail(new Error("Không thể tải Stockfish. Hãy tải lại trang và thử lại."));
    worker.onmessageerror = () => fail(new Error("Không thể đọc kết quả từ Stockfish."));
    worker.onmessage = (event: MessageEvent<string>) => {
      for (const text of String(event.data).split(/\r?\n/)) {
        if (settled) return;
        if (text === "uciok") {
          const skill = options.analysis ? 20 : ({ easy: 0, medium: 6, hard: 20 }[options.difficulty || "hard"]);
          worker.postMessage("setoption name Hash value 16");
          worker.postMessage(`setoption name Skill Level value ${skill}`);
          worker.postMessage(`setoption name MultiPV value ${options.analysis ? 3 : 1}`);
          worker.postMessage("isready");
        } else if (text === "readyok") {
          const uci = moves.map((move) => `${move.from}${move.to}${move.promotion || ""}`).join(" ");
          worker.postMessage(`position startpos${uci ? ` moves ${uci}` : ""}`);
          const ms = options.analysis ? options.deep ? 4500 : 1800 : ({ easy: 350, medium: 900, hard: 2400 }[options.difficulty || "hard"]);
          worker.postMessage(`go movetime ${ms}`);
        } else if (text.startsWith("info ")) {
          const info = parseEngineLine(text, game.turn());
          if (info && info.depth >= (lines.get(info.rank)?.depth || 0)) {
            lines.set(info.rank, info);
            options.onInfo?.([...lines.values()].sort((a, b) => a.rank - b.rank));
          }
        } else if (text.startsWith("bestmove ")) {
          const move = parseUciMove(text.split(" ")[1]);
          if (!move || !game.moves({ verbose: true }).some((legal) => legal.from === move.from && legal.to === move.to && legal.promotion === move.promotion)) { fail(new Error("Stockfish không tìm thấy nước đi hợp lệ.")); return; }
          settled = true;
          cleanup();
          resolve({ move, lines: [...lines.values()].sort((a, b) => a.rank - b.rank) });
        }
      }
    };
    worker.postMessage("uci");
  });
}
