import { database, error, getRoom, playerColor, reply, roomView, validCode } from "@/lib/rooms";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  try {
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng này.", 404);
    const token = request.headers.get("x-player-token");
    const color = await playerColor(room, token);
    const now = Date.now();
    if (color === "w" && (room.white_seen_at === null || now - room.white_seen_at > 5000)) {
      await database().prepare("UPDATE rooms SET white_seen_at = ? WHERE code = ?").bind(now, code).run();
      room.white_seen_at = now;
    }
    if (color === "b" && (room.black_seen_at === null || now - room.black_seen_at > 5000)) {
      await database().prepare("UPDATE rooms SET black_seen_at = ? WHERE code = ?").bind(now, code).run();
      room.black_seen_at = now;
    }
    return reply({ room: await roomView(room, token) });
  } catch { return error("Chưa kết nối được phòng. Hãy thử lại.", 503); }
}
