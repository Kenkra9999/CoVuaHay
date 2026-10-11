import { database, error, getRoom, playerColor, reply, roomClock, roomView, validCode } from "@/lib/rooms";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  try {
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng này.", 404);
    const token = request.headers.get("x-player-token");
    const color = await playerColor(room, token);
    if (!color) return error("Bạn không giữ ghế trong phòng này.", 403);
    if (room.status !== "playing") return error("Ván đấu đã kết thúc hoặc chưa bắt đầu.", 409);
    const now = Date.now();
    const clock = roomClock(room, now);
    if (clock.expired) {
      const ended = await getRoom(code);
      return reply({ error: "Ván đấu đã kết thúc do quá giờ.", room: ended ? await roomView(ended, token) : undefined }, 409);
    }
    const status = color === "w" ? "black_won" : "white_won";
    const result = await database().prepare(
      "UPDATE rooms SET status = ?, end_reason = 'resign', white_remaining_ms = ?, black_remaining_ms = ?, turn_started_at = NULL, draw_offer = NULL, version = version + 1, updated_at = ? WHERE code = ? AND version = ? AND status = 'playing'")
      .bind(status, clock.whiteMs, clock.blackMs, now, code, room.version).run();
    if (result.meta.changes !== 1) return error("Ván cờ vừa cập nhật. Hãy thử lại.", 409);
    const updated = await getRoom(code);
    if (!updated) return error("Không thể tải ván cờ.", 500);
    return reply({ room: await roomView(updated, token) });
  } catch { return error("Không thể xin thua lúc này.", 500); }
}
