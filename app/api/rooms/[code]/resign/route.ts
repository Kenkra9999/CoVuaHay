import { database, ensureRoomsTable, error, getRoom, reply, roomView, tokenHash, validCode } from "@/lib/rooms";

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
    const status = color === "w" ? "black_won" : "white_won";
    const result = await database().prepare(`
      UPDATE rooms SET status = ?, version = version + 1, updated_at = ?
      WHERE code = ? AND version = ? AND status = 'playing'
    `).bind(status, Date.now(), code, room.version).run();
    if (result.meta.changes !== 1) return error("Ván cờ vừa cập nhật. Vui lòng thử lại.", 409);
    const updated = await getRoom(code);
    if (!updated) return error("Không thể tải ván cờ.", 500);
    return reply({ room: await roomView(updated, token) });
  } catch {
    return error("Không thể xin thua lúc này.", 500);
  }
}
