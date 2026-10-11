import { env } from "cloudflare:workers";
import { Chess, type Square } from "chess.js";
import { chessClock } from "./chess-clock";

export type MoveRecord = { from: Square; to: Square; san: string; promotion?: string; flags: string };
export type RoomStatus = "waiting" | "playing" | "white_won" | "black_won" | "draw";
export type EndReason = "checkmate" | "draw" | "agreement" | "resign" | "timeout" | "move_timeout" | null;
export type RoomRow = {
  code: string; white_token: string; black_token: string | null;
  fen: string; moves_json: string; status: RoomStatus; version: number;
  created_at: number; updated_at: number;
  white_name: string; black_name: string;
  total_seconds: number; move_limit_seconds: number;
  white_remaining_ms: number; black_remaining_ms: number; turn_started_at: number | null;
  end_reason: EndReason; draw_offer: "w" | "b" | null;
  white_seen_at: number | null; black_seen_at: number | null;
};
export type RoomView = {
  code: string; fen: string; moves: MoveRecord[]; status: RoomStatus; version: number;
  hasBlack: boolean; color: "w" | "b" | null; updatedAt: number; serverNow: number;
  players: { white: { name: string; seenAt: number | null }; black: { name: string; seenAt: number | null } };
  clock: { totalSeconds: number; moveLimitSeconds: number; whiteMs: number; blackMs: number; turnStartedAt: number | null };
  endReason: EndReason; drawOffer: "w" | "b" | null;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function database(): D1Database {
  if (!env.DB) throw new Error("D1 database binding is missing");
  return env.DB;
}
export function roomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => alphabet[byte % alphabet.length]).join("");
}
export function validCode(value: string) { return /^[A-HJ-NP-Z2-9]{6}$/.test(value); }
export async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function playerColor(room: RoomRow, token?: string | null): Promise<"w" | "b" | null> {
  if (!token) return null;
  const hash = await tokenHash(token);
  return hash === room.white_token ? "w" : hash === room.black_token ? "b" : null;
}
export function playerName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = Array.from(value).filter(character => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127).join("").replace(/\s+/g, " ").trim();
  return name && Array.from(name).length <= 24 ? name : null;
}
export async function requestBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  const body: unknown = JSON.parse(text);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  return body as Record<string, unknown>;
}

export function roomClock(room: RoomRow, now = Date.now()) {
  return chessClock({ fen: room.fen, status: room.status, whiteMs: room.white_remaining_ms,
    blackMs: room.black_remaining_ms, turnStartedAt: room.turn_started_at, moveLimitSeconds: room.move_limit_seconds }, now);
}

export async function getRoom(code: string): Promise<RoomRow | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const room = await database().prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
    if (!room || room.status !== "playing") return room;
    const now = Date.now();
    // Existing games from before the clock migration begin their clock on first access.
    if (room.turn_started_at === null) {
      const result = await database().prepare("UPDATE rooms SET turn_started_at = ?, updated_at = ?, version = version + 1 WHERE code = ? AND version = ? AND status = 'playing' AND turn_started_at IS NULL")
        .bind(now, now, code, room.version).run();
      if (result.meta.changes === 1) return { ...room, turn_started_at: now, updated_at: now, version: room.version + 1 };
      continue;
    }
    const clock = roomClock(room, now);
    if (!clock.expired) return room;
    const status = clock.turn === "w" ? "black_won" : "white_won";
    const result = await database().prepare(
      "UPDATE rooms SET status = ?, end_reason = ?, white_remaining_ms = ?, black_remaining_ms = ?, turn_started_at = NULL, draw_offer = NULL, version = version + 1, updated_at = ? WHERE code = ? AND version = ? AND status = 'playing' AND turn_started_at = ?")
      .bind(status, clock.reason, clock.whiteMs, clock.blackMs, now, code, room.version, room.turn_started_at).run();
    if (result.meta.changes === 1) return { ...room, status, end_reason: clock.reason as EndReason,
      white_remaining_ms: clock.whiteMs, black_remaining_ms: clock.blackMs, turn_started_at: null,
      draw_offer: null, version: room.version + 1, updated_at: now };
  }
  throw new Error("Room changed repeatedly; retry");
}
export function roomMoves(room: RoomRow): MoveRecord[] { return JSON.parse(room.moves_json) as MoveRecord[]; }
export function gameFromMoves(moves: MoveRecord[]) {
  const game = new Chess();
  for (const move of moves) game.move({ from: move.from, to: move.to, promotion: move.promotion });
  return game;
}
export function gameStatus(game: Chess): RoomStatus {
  if (game.isCheckmate()) return game.turn() === "w" ? "black_won" : "white_won";
  return game.isGameOver() ? "draw" : "playing";
}
export async function roomView(room: RoomRow, token?: string | null): Promise<RoomView> {
  return { code: room.code, fen: room.fen, moves: roomMoves(room), status: room.status, version: room.version,
    hasBlack: Boolean(room.black_token), color: await playerColor(room, token), updatedAt: room.updated_at, serverNow: Date.now(),
    players: { white: { name: room.white_name, seenAt: room.white_seen_at }, black: { name: room.black_name, seenAt: room.black_seen_at } },
    clock: { totalSeconds: room.total_seconds, moveLimitSeconds: room.move_limit_seconds, whiteMs: room.white_remaining_ms,
      blackMs: room.black_remaining_ms, turnStartedAt: room.turn_started_at }, endReason: room.end_reason, drawOffer: room.draw_offer };
}
export function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function error(message: string, status = 400) { return reply({ error: message }, status); }
