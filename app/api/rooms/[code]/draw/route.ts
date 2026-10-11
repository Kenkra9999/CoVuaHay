import { database, error, getRoom, playerColor, reply, requestBody, roomClock, roomView, validCode } from "@/lib/rooms";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  let body: Record<string, unknown>;
  try { body = await requestBody(request); } catch { return error("Dữ liệu không hợp lệ."); }
  if (!["offer", "accept", "decline", "cancel"].includes(String(body.action))) return error("Yêu cầu hòa không hợp lệ.");
  try {
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng.", 404);
    const token = request.headers.get("x-player-token");
    const color = await playerColor(room, token);
    if (!color) return error("Bạn không giữ ghế trong phòng.", 403);
    if (room.status !== "playing") return error("Trận chưa bắt đầu hoặc đã kết thúc.", 409);
    if (body.action === "offer" && room.draw_offer) return error("Đã có một lời đề nghị hòa.", 409);
    if ((body.action === "accept" || body.action === "decline") && (!room.draw_offer || room.draw_offer === color)) return error("Chưa có lời đề nghị từ đối thủ.", 409);
    if (body.action === "cancel" && room.draw_offer !== color) return error("Bạn chưa đề nghị hòa.", 409);
    const now = Date.now();
    const clock = roomClock(room, now);
    if (clock.expired) {
      const ended = await getRoom(code);
      return reply({ error: "Trận đã kết thúc do quá giờ.", room: ended ? await roomView(ended, token) : undefined }, 409);
    }
    const accepted = body.action === "accept";
    const result = await database().prepare("UPDATE rooms SET status = ?, end_reason = ?, draw_offer = ?, white_remaining_ms = ?, black_remaining_ms = ?, turn_started_at = ?, version = version + 1, updated_at = ? WHERE code = ? AND version = ? AND status = 'playing'")
      .bind(accepted ? "draw" : "playing", accepted ? "agreement" : null, body.action === "offer" ? color : null,
        accepted ? clock.whiteMs : room.white_remaining_ms, accepted ? clock.blackMs : room.black_remaining_ms,
        accepted ? null : room.turn_started_at, now, code, room.version).run();
    if (result.meta.changes !== 1) return error("Trận vừa cập nhật. Hãy thử lại.", 409);
    const updated = await getRoom(code);
    return reply({ room: updated ? await roomView(updated, token) : null });
  } catch { return error("Chưa gửi được lời đề nghị hòa.", 500); }
}
