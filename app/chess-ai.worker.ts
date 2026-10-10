import { Chess } from "chess.js";
import { findBestMove, type AiMove, type Difficulty } from "../lib/chess-ai";

self.onmessage = (event: MessageEvent<{ moves: AiMove[]; difficulty: Difficulty }>) => {
  try {
    const game = new Chess();
    for (const move of event.data.moves) game.move(move);
    self.postMessage({ move: findBestMove(game, event.data.difficulty) });
  } catch {
    self.postMessage({ error: "AI chưa thể tính nước đi. Hãy thử lại." });
  }
};
