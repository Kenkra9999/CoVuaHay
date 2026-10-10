import { Chess } from "chess.js";
import { database, ensureRoomsTable, error, getRoom, reply, roomCode, roomView, tokenHash } from "@/lib/rooms";

export async function POST() {
  try {
    await ensureRoomsTable();
    let code = roomCode();
    for (let tries = 0; tries < 5 && await getRoom(code); tries++) code = roomCode();
    if (await getRoom(code)) return error("Không thể tạo mã phòng. Vui lòng thử lại.", 503);

    const token = crypto.randomUUID();
    const now = Date.now();
    await database().prepare(`
      INSERT INTO rooms (code, white_token, black_token, fen, moves_json, status, version, created_at, updated_at)
      VALUES (?, ?, NULL, ?, '[]', 'waiting', 0, ?, ?)
    `).bind(code, await tokenHash(token), new Chess().fen(), now, now).run();
    const room = await getRoom(code);
    if (!room) return error("Không thể tạo phòng.", 500);
    return reply({ room: await roomView(room, token), token }, 201);
  } catch {
    return error("Không thể tạo phòng lúc này.", 500);
  }
}
