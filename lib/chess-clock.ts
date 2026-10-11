export type ClockPosition = {
  fen: string;
  status: string;
  whiteMs: number;
  blackMs: number;
  turnStartedAt: number | null;
  moveLimitSeconds: number;
};

// Clocks are anchored to server timestamps, never to a browser timer.
export function chessClock(position: ClockPosition, now: number) {
  const turn = position.fen.split(" ")[1] === "b" ? "b" : "w";
  const running = position.status === "playing" && position.turnStartedAt !== null;
  const elapsed = running ? Math.max(0, now - position.turnStartedAt!) : 0;
  const whiteMs = Math.max(0, position.whiteMs - (turn === "w" ? elapsed : 0));
  const blackMs = Math.max(0, position.blackMs - (turn === "b" ? elapsed : 0));
  const available = turn === "w" ? position.whiteMs : position.blackMs;
  const moveRemainingMs = Math.max(0, Math.min(available, position.moveLimitSeconds * 1000) - elapsed);
  const expired = running && moveRemainingMs <= 0;
  return { turn, whiteMs, blackMs, moveRemainingMs, expired,
    reason: expired ? (elapsed >= available ? "timeout" : "move_timeout") : null,
  };
}

export function validTimeControl(totalMinutes: unknown, moveSeconds: unknown) {
  return typeof totalMinutes === "number" && Number.isInteger(totalMinutes) && totalMinutes >= 5 && totalMinutes <= 100
    && typeof moveSeconds === "number" && Number.isInteger(moveSeconds) && moveSeconds >= 60 && moveSeconds <= 300;
}
