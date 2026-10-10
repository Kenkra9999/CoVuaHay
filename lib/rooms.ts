import { env } from "cloudflare:workers";
import { Chess, type Square } from "chess.js";

export type MoveRecord = {
  from: Square;
  to: Square;
  san: string;
  promotion?: string;
  flags: string;
};

export type RoomStatus = "waiting" | "playing" | "white_won" | "black_won" | "draw";

export type RoomRow = {
  code: string;
  white_token: string;
  black_token: string | null;
  fen: string;
  moves_json: string;
  status: RoomStatus;
  version: number;
  created_at: number;
  updated_at: number;
};

export type RoomView = {
  code: string;
  fen: string;
  moves: MoveRecord[];
  status: RoomStatus;
  version: number;
  hasBlack: boolean;
  color: "w" | "b" | null;
  updatedAt: number;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function database(): D1Database {
  if (!env.DB) throw new Error("D1 database binding is missing");
  return env.DB;
}

export async function ensureRoomsTable() {
  await database().prepare(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY NOT NULL,
      white_token TEXT NOT NULL,
      black_token TEXT,
      fen TEXT NOT NULL,
      moves_json TEXT NOT NULL,
      status TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();
}

export function roomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function validCode(value: string) {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(value);
}

export async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getRoom(code: string): Promise<RoomRow | null> {
  return database().prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
}

export function roomMoves(room: RoomRow): MoveRecord[] {
  return JSON.parse(room.moves_json) as MoveRecord[];
}

export function gameFromMoves(moves: MoveRecord[]) {
  const game = new Chess();
  for (const move of moves) game.move({ from: move.from, to: move.to, promotion: move.promotion });
  return game;
}

export function gameStatus(game: Chess): RoomStatus {
  if (game.isCheckmate()) return game.turn() === "w" ? "black_won" : "white_won";
  if (game.isGameOver()) return "draw";
  return "playing";
}

export async function roomView(room: RoomRow, token?: string | null): Promise<RoomView> {
  const hash = token ? await tokenHash(token) : null;
  const color = hash === room.white_token ? "w" : hash && hash === room.black_token ? "b" : null;
  return {
    code: room.code,
    fen: room.fen,
    moves: roomMoves(room),
    status: room.status,
    version: room.version,
    hasBlack: Boolean(room.black_token),
    color,
    updatedAt: room.updated_at,
  };
}

export function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function error(message: string, status = 400) {
  return reply({ error: message }, status);
}
