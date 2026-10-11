import { Chess, type Move, type Square } from "chess.js";

export type Difficulty = "easy" | "medium" | "hard" | "master";
export type AiMove = { from: Square; to: Square; promotion?: string };
const value: Record<string, number> = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
const limits: Record<Difficulty, { depth: number; ms: number }> = {
  easy: { depth: 1, ms: 220 },
  medium: { depth: 3, ms: 750 },
  hard: { depth: 4, ms: 1600 },
  master: { depth: 5, ms: 2400 }
};

const pstPawn = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 26, 26, 10,  5,  5,
   0,  0,  0, 22, 22,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-24,-24, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const pstKnight = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const pstBishop = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const pstRook = [
   0,  0,  0,  5,  5,  0,  0,  0,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   5, 12, 12, 12, 12, 12, 12,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const pstQueen = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -10,  5,  5,  5,  5,  5,  0,-10,
    0,  0,  5,  5,  5,  5,  0, -5,
   -5,  0,  5,  5,  5,  5,  0, -5,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const pstKing = [
   20, 30, 10,  0,  0, 10, 30, 20,
   20, 20,  0,  0,  0,  0, 20, 20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30
];

const pstMap: Record<string, number[]> = {
  p: pstPawn,
  n: pstKnight,
  b: pstBishop,
  r: pstRook,
  q: pstQueen,
  k: pstKing
};

function evaluate(game: Chess) {
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const file = piece.square.charCodeAt(0) - 97;
      const rank = Number(piece.square[1]) - 1;
      const table = pstMap[piece.type];
      const tableIdx = piece.color === "w" ? (7 - rank) * 8 + file : rank * 8 + file;
      const positional = table ? table[tableIdx] : 0;
      score += (piece.color === "w" ? 1 : -1) * (value[piece.type] + positional);
    }
  }
  return score * (game.turn() === "w" ? 1 : -1);
}

function ordered(game: Chess): Move[] {
  return game.moves({ verbose: true }).sort((a, b) => priority(b) - priority(a));
}

function priority(move: Move) {
  return (move.captured ? 15 * value[move.captured] - value[move.piece] : 0)
    + (move.promotion ? value[move.promotion] + 200 : 0)
    + (move.san.includes("+") ? 45 : 0)
    + (move.san.includes("#") ? 10000 : 0);
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
