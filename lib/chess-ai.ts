import { Chess, type Move, type Square } from "chess.js";

export type Difficulty = "easy" | "medium" | "hard";
export type AiMove = { from: Square; to: Square; promotion?: string };
const value: Record<string, number> = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
const limits = { easy: { depth: 1, ms: 180 }, medium: { depth: 3, ms: 650 }, hard: { depth: 4, ms: 1500 } };

function evaluate(game: Chess) {
  let score = 0;
  for (const row of game.board()) for (const piece of row) {
    if (!piece) continue;
    const file = piece.square.charCodeAt(0) - 97;
    const rank = Number(piece.square[1]) - 1;
    const progress = piece.color === "w" ? rank : 7 - rank;
    const center = 7 - Math.abs(file - 3.5) - Math.abs(rank - 3.5);
    const positional = piece.type === "p" ? progress * 9 + center * 3
      : piece.type === "n" ? center * 15
      : piece.type === "b" ? center * 8
      : piece.type === "k" ? (progress < 2 && (file < 3 || file > 4) ? 25 : -center * 3)
      : piece.type === "r" ? progress * 2 : center * 3;
    score += (piece.color === "w" ? 1 : -1) * (value[piece.type] + positional);
  }
  return score * (game.turn() === "w" ? 1 : -1);
}

function ordered(game: Chess): Move[] {
  return game.moves({ verbose: true }).sort((a, b) => priority(b) - priority(a));
}
function priority(move: Move) {
  return (move.captured ? 10 * value[move.captured] - value[move.piece] : 0)
    + (move.promotion ? value[move.promotion] : 0) + (move.san.includes("+") ? 35 : 0);
}

// Iterative deepening retains the last complete result when the time budget expires.
// Call in a Web Worker: no search work runs on the board's animation thread.
export function findBestMove(game: Chess, difficulty: Difficulty): AiMove | null {
  if (game.isGameOver()) return null;
  const config = limits[difficulty];
  const deadline = performance.now() + config.ms;
  const timeout = Symbol("search-timeout");
  let nodes = 0;
  const rootMoves = ordered(game);
  let best = rootMoves[0];
  const search = (depth: number, alpha: number, beta: number, ply: number): number => {
    if ((++nodes & 31) === 0 && performance.now() >= deadline) throw timeout;
    if (game.isCheckmate()) return -100000 + ply;
    if (game.isDraw()) return 0;
    if (depth === 0) return evaluate(game);
    let score = -Infinity;
    for (const move of ordered(game)) {
      game.move(move);
      let child: number;
      try { child = -search(depth - 1, -beta, -alpha, ply + 1); }
      finally { game.undo(); }
      score = Math.max(score, child);
      alpha = Math.max(alpha, child);
      if (alpha >= beta) break;
    }
    return score;
  };
  for (let depth = 1; depth <= config.depth; depth++) {
    let roundBest = best;
    let roundScore = -Infinity;
    // Explore the previous principal move first.
    rootMoves.sort((a, b) => Number(b === best) - Number(a === best));
    try {
      for (const move of rootMoves) {
        if (performance.now() >= deadline) throw timeout;
        game.move(move);
        let score: number;
        try { score = -search(depth - 1, -Infinity, -roundScore, 1); }
        finally { game.undo(); }
        if (score > roundScore) { roundScore = score; roundBest = move; }
      }
      best = roundBest;
      if (roundScore > 99000) break;
    } catch (error) {
      if (error !== timeout) throw error;
      break;
    }
  }
  return { from: best.from, to: best.to, ...(best.promotion ? { promotion: best.promotion } : {}) };
}
