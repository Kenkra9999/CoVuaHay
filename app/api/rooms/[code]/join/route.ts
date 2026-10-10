import { database, ensureRoomsTable, error, getRoom, reply, roomView, tokenHash, validCode } from "@/lib/rooms";

export async function POST(_request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  try {
    await ensureRoomsTable();
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng này.", 404);
    if (room.black_token) return error("Phòng này đã đủ hai người chơi.", 409);

    const token = crypto.randomUUID();
    const result = await database().prepare(`
      UPDATE rooms SET black_token = ?, status = 'playing', version = version + 1, updated_at = ?
      WHERE code = ? AND black_token IS NULL
    `).bind(await tokenHash(token), Date.now(), code).run();
    if (result.meta.changes !== 1) return error("Phòng này vừa có người tham gia.", 409);
    const joined = await getRoom(code);
    if (!joined) return error("Không thể tham gia phòng.", 500);
    return reply({ room: await roomView(joined, token), token });
  } catch {
    return error("Không thể tham gia phòng lúc này.", 500);
  }
}
