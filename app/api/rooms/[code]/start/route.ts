import { database, error, getRoom, playerColor, reply, roomView, validCode } from "@/lib/rooms";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  try {
    const token = request.headers.get("x-player-token");
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng này.", 404);
    if (!await playerColor(room, token)) return error("Chỉ người chơi trong phòng mới được bắt đầu.", 403);
    if (!room.black_token) return error("Hãy chờ người bạn vào phòng trước.", 409);
    if (room.status === "playing") return reply({ room: await roomView(room, token) });
    if (room.status !== "waiting") return error("Ván này đã kết thúc.", 409);
    const now = Date.now();
    await database().prepare("UPDATE rooms SET status = 'playing', turn_started_at = ?, updated_at = ?, version = version + 1 WHERE code = ? AND status = 'waiting' AND black_token IS NOT NULL")
      .bind(now, now, code).run();
    const started = await getRoom(code);
    if (!started) return error("Không thể tải phòng.", 500);
    return reply({ room: await roomView(started, token) });
  } catch { return error("Chưa bắt đầu được ván. Hãy thử lại.", 500); }
}
