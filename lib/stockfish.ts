import { Chess, type Square } from "chess.js";
import type { AiMove, Difficulty } from "./chess-ai";

export type EngineLine = { rank: number; depth: number; nodes: number; score: number; mate: number | null; pv: string[] };
export type EngineAnalysis = { move: AiMove; lines: EngineLine[] };
export type EngineOptions = { difficulty?: Difficulty | "master"; analysis?: boolean; deep?: boolean; multiPv?: number; signal?: AbortSignal; onInfo?: (lines: EngineLine[]) => void };

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
  const names: Record<string, string> = { p: "Tốt", n: "Mã", b: "Tượng", r: "Xe", q: "Hậu", k: "Vua" };
  if (preview.isCheckmate()) return "Nước đi kết liễu trận chiến bằng chiếu hết!";
  if (line?.mate && line.mate * (game.turn() === "w" ? 1 : -1) > 0) return `Tạo thế chiếu hết tất thắng trong ${Math.abs(line.mate)} nước nếu hai bên đi tối ưu.`;
  if (played.promotion) return `Phong ${names[played.piece] || "Tốt"} thành ${names[played.promotion]} gia tăng sức mạnh công kích áp đảo.`;
  if (played.flags.includes("k") || played.flags.includes("q")) return "Nhập thành kiên cố bảo vệ hoàng đế và kết nối liên hoàn hai Xe.";
  if (played.captured) return `Chém rụng ${names[played.captured]} đối phương${preview.isCheck() ? " đồng thời xuất kích chiếu vua" : ""}. Đem lại ưu thế quân số vượt trội.`;
  if (preview.isCheck()) return "Xuất đòn chiếu vua, phá vỡ nhịp độ và ép đối phương phải vào thế bị động chống đỡ.";
  if (game.isCheck()) return "Hóa giải nguy cơ bị chiếu, củng cố phòng tuyến và xoay chuyển cục diện.";
  if (played.piece === "r" && (played.to[1] === "7" || played.to[1] === "2")) return `Đưa Xe đột nhập hàng ${played.to[1]} hiểm hóc, khống chế hoàn toàn phòng tuyến đối phương.`;
  if (game.history().length < 16 && ["n", "b"].includes(played.piece)) return `Phát triển ${names[played.piece]} tranh quyền kiểm soát trung tâm chiến lược và mở đường cho đại quân.`;
  if (["d4", "e4", "d5", "e5"].includes(played.to)) return `Chiếm lĩnh vị trí trung tâm ${played.to.toUpperCase()}, gia tăng không gian tác chiến và bẻ gãy cấu trúc đối phương.`;
  if (line && Math.abs(line.score) > 2) return `Nước đi chiến lược chuẩn xác (${played.from.toUpperCase()} ➔ ${played.to.toUpperCase()}). Tạo ưu thế thế trận ${line.score > 0 ? "áp đảo cho Trắng" : "áp đảo cho Đen"}.`;
  return `Di chuyển ${names[played.piece]} từ ${played.from.toUpperCase()} tới ${played.to.toUpperCase()}. Stockfish 19 đánh giá đây là phương án tối ưu nhất.`;
}

// A dedicated single-thread WASM worker keeps the board responsive and works
// without cross-origin isolation. Abort terminates searches on stale positions.
export function searchStockfish(moves: AiMove[], options: EngineOptions = {}): Promise<EngineAnalysis> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    let worker: Worker;
    const basePath = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH : "";
    try { worker = new Worker(`${basePath}/engine/stockfish-19-lite-single.js`); }
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
          const skillLevelMap: Record<string, number> = { easy: 3, medium: 10, hard: 18, master: 20 };
          const skill = options.analysis ? 20 : (skillLevelMap[options.difficulty || "hard"] ?? 18);
          const multiPvCount = options.analysis ? (options.multiPv || 3) : 1;
          worker.postMessage("setoption name Hash value 32");
          worker.postMessage(`setoption name Skill Level value ${skill}`);
          worker.postMessage(`setoption name MultiPV value ${multiPvCount}`);
          worker.postMessage("isready");
        } else if (text === "readyok") {
          const uci = moves.map((move) => `${move.from}${move.to}${move.promotion || ""}`).join(" ");
          worker.postMessage(`position startpos${uci ? ` moves ${uci}` : ""}`);
          const moveTimeMap: Record<string, number> = { easy: 400, medium: 1000, hard: 2200, master: 3200 };
          const ms = options.analysis ? (options.deep ? 4500 : 2000) : (moveTimeMap[options.difficulty || "hard"] ?? 2000);
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
