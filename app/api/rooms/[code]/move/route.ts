import type { Square } from "chess.js";
import { database, error, gameFromMoves, gameStatus, getRoom, playerColor, reply, requestBody, roomClock, roomMoves, roomView, validCode, type MoveRecord } from "@/lib/rooms";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  let body: Record<string, unknown>;
  try { body = await requestBody(request); } catch { return error("Dữ liệu nước đi không hợp lệ."); }
  try {
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng này.", 404);
    const token = request.headers.get("x-player-token");
    const color = await playerColor(room, token);
    if (!color) return error("Bạn không giữ ghế trong phòng này.", 403);
    if (room.status !== "playing") return reply({ error: room.end_reason?.includes("timeout") ? "Ván đấu kết thúc do quá giờ." : "Ván đấu chưa bắt đầu hoặc đã kết thúc.", room: await roomView(room, token) }, 409);
    if (body.version !== room.version) return reply({ error: "Thế cờ vừa cập nhật. Hãy đi lại.", room: await roomView(room, token) }, 409);
    if (typeof body.from !== "string" || typeof body.to !== "string" || !/^[a-h][1-8]$/.test(body.from) || !/^[a-h][1-8]$/.test(body.to)) return error("Ô đi không hợp lệ.");
    if (body.promotion !== undefined && (typeof body.promotion !== "string" || !/^[qrbn]$/.test(body.promotion))) return error("Quân phong cấp không hợp lệ.");
    const moves = roomMoves(room);
    const game = gameFromMoves(moves);
    if (game.turn() !== color) return error("Chưa đến lượt bạn.", 409);
    let move;
    try { move = game.move({ from: body.from as Square, to: body.to as Square, promotion: body.promotion as string | undefined }); }
    catch { return error("Nước đi không đúng luật."); }
    const now = Date.now();
    const clock = roomClock(room, now);
    if (clock.expired) {
      const ended = await getRoom(code);
      return reply({ error: "Bạn đã thua do quá giờ.", room: ended ? await roomView(ended, token) : undefined }, 409);
    }
    const record: MoveRecord = { from: move.from, to: move.to, san: move.san, flags: move.flags, ...(move.promotion ? { promotion: move.promotion } : {}) };
    moves.push(record);
    const status = gameStatus(game);
    const reason = status === "draw" ? "draw" : status === "playing" ? null : "checkmate";
    const result = await database().prepare(
      "UPDATE rooms SET fen = ?, moves_json = ?, status = ?, end_reason = ?, white_remaining_ms = ?, black_remaining_ms = ?, turn_started_at = ?, draw_offer = NULL, version = version + 1, updated_at = ? WHERE code = ? AND version = ? AND status = 'playing' AND turn_started_at = ?")
      .bind(game.fen(), JSON.stringify(moves), status, reason, clock.whiteMs, clock.blackMs, status === "playing" ? now : null, now, code, room.version, room.turn_started_at).run();
    if (result.meta.changes !== 1) return error("Thế cờ vừa cập nhật. Hãy thử lại.", 409);
    const updated = await getRoom(code);
    if (!updated) return error("Không thể tải ván cờ.", 500);
    return reply({ room: await roomView(updated, token) });
  } catch { return error("Chưa gửi được nước đi. Hãy thử lại.", 500); }
}
