import { ensureRoomsTable, error, getRoom, reply, roomView, validCode } from "@/lib/rooms";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  try {
    await ensureRoomsTable();
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng này.", 404);
    return reply({ room: await roomView(room, request.headers.get("x-player-token")) });
  } catch {
    return error("Không thể tải phòng lúc này.", 500);
  }
}
