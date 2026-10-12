export type MotionPiece = { id: string; square: string; type: string; color: "w" | "b" };

export function pieceTravelMs(type: string) {
  return type === "k" ? 560 : type === "q" ? 520 : 380;
}

export function squarePoint(square: string, orientation: "w" | "b") {
  const file = square.charCodeAt(0) - 97, rank = 8 - Number(square[1]);
  return { x: (orientation === "w" ? file : 7 - file) * 100 + 50, y: (orientation === "w" ? rank : 7 - rank) * 100 + 50 };
}

// Stable piece IDs preserve captures, promotions and both halves of castling.
// A reset or a large replay jump must not emit thirty-two simultaneous trails.
export function pieceTravels(previous: MotionPiece[] | null, current: MotionPiece[]) {
  if (!previous || current.length > previous.length) return [];
  const old = new Map(previous.map(piece => [piece.id, piece]));
  const changed = current.flatMap(piece => {
    const before = old.get(piece.id);
    return before && before.square !== piece.square ? [{ piece, from: before.square, to: piece.square }] : [];
  });
  return changed.length <= 2 ? changed : [];
}
