import { Chess } from "chess.js";
import { database, error, getRoom, playerColor, reply, roomView, validCode } from "@/lib/rooms";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  try {
    const token = request.headers.get("x-player-token");
    for (let attempt = 0; attempt < 4; attempt++) {
      const room = await getRoom(code);
      if (!room) return error("Không tìm thấy phòng này.", 404);
      const color = await playerColor(room, token);
      if (!color) return error("Bạn không giữ ghế trong phòng này.", 403);
      if (room.status === "playing") return reply({ room: await roomView(room, token) });
      if (!room.black_token) return error("Đang chờ kỳ thủ thứ hai vào phòng.", 409);
      if (!["white_won", "black_won", "draw"].includes(room.status)) return error("Chỉ có thể đấu lại sau khi ván đã kết thúc.", 409);

      const now = Date.now();
      const mark = color === "w" ? "white_rematch_ready" : "black_rematch_ready";
      const saved = await database().prepare(`UPDATE rooms SET ${mark} = 1, version = version + 1, updated_at = ? WHERE code = ? AND version = ? AND status IN ('white_won','black_won','draw')`)
        .bind(now, code, room.version).run();
      if (saved.meta.changes !== 1) continue;

      let updated = await getRoom(code);
      if (!updated) return error("Không thể tải phòng.", 500);
      if (updated.white_rematch_ready && updated.black_rematch_ready) {
        const started = await database().prepare("UPDATE rooms SET fen = ?, moves_json = '[]', status = 'playing', end_reason = NULL, draw_offer = NULL, white_remaining_ms = total_seconds * 1000, black_remaining_ms = total_seconds * 1000, turn_started_at = ?, white_rematch_ready = 0, black_rematch_ready = 0, version = version + 1, updated_at = ? WHERE code = ? AND version = ? AND status IN ('white_won','black_won','draw') AND white_rematch_ready = 1 AND black_rematch_ready = 1")
          .bind(new Chess().fen(), now, now, code, updated.version).run();
        if (started.meta.changes === 1) updated = await getRoom(code);
      }
      return reply({ room: updated ? await roomView(updated, token) : null });
    }
    const latest = await getRoom(code);
    return reply({ error: "Phòng vừa cập nhật. Trạng thái mới nhất đã được tải.", room: latest ? await roomView(latest, token) : undefined }, 409);
  } catch { return error("Chưa thể sẵn sàng đấu lại. Hãy thử lại.", 500); }
}
