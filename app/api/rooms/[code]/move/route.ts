import type { Square } from "chess.js";
import { database, ensureRoomsTable, error, gameFromMoves, gameStatus, getRoom, reply, roomMoves, roomView, tokenHash, validCode, type MoveRecord } from "@/lib/rooms";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  try {
    await ensureRoomsTable();
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng này.", 404);
    const token = request.headers.get("x-player-token") || "";
    const hash = await tokenHash(token);
    const color = hash === room.white_token ? "w" : hash === room.black_token ? "b" : null;
    if (!color) return error("Bạn không phải người chơi trong phòng này.", 403);
    if (room.status !== "playing") return error("Ván cờ chưa bắt đầu hoặc đã kết thúc.", 409);

    const body = await request.json() as { from?: string; to?: string; promotion?: string; version?: number };
    if (body.version !== room.version) return error("Ván cờ đã cập nhật. Vui lòng thử lại.", 409);
    if (!/^[a-h][1-8]$/.test(body.from || "") || !/^[a-h][1-8]$/.test(body.to || "")) return error("Nước đi không hợp lệ.");
    if (body.promotion && !/^[qrbn]$/.test(body.promotion)) return error("Quân phong cấp không hợp lệ.");

    const moves = roomMoves(room);
    const game = gameFromMoves(moves);
    if (game.turn() !== color) return error("Chưa đến lượt của bạn.", 409);
    let move;
    try {
      move = game.move({ from: body.from as Square, to: body.to as Square, promotion: body.promotion });
    } catch {
      return error("Nước đi không hợp lệ.");
    }
    const record: MoveRecord = { from: move.from, to: move.to, san: move.san, flags: move.flags, ...(move.promotion ? { promotion: move.promotion } : {}) };
    moves.push(record);
    const result = await database().prepare(`
      UPDATE rooms SET fen = ?, moves_json = ?, status = ?, version = version + 1, updated_at = ?
      WHERE code = ? AND version = ? AND status = 'playing'
    `).bind(game.fen(), JSON.stringify(moves), gameStatus(game), Date.now(), code, room.version).run();
    if (result.meta.changes !== 1) return error("Ván cờ vừa cập nhật. Vui lòng thử lại.", 409);
    const updated = await getRoom(code);
    if (!updated) return error("Không thể tải ván cờ.", 500);
    return reply({ room: await roomView(updated, token) });
  } catch {
    return error("Không thể gửi nước đi lúc này.", 500);
  }
}
