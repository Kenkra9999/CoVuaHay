import { database, error, getRoom, playerColor, playerName, reply, requestBody, roomView, validCode } from "@/lib/rooms";

export async function PATCH(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  let body: Record<string, unknown>;
  try { body = await requestBody(request); } catch { return error("Dữ liệu đổi tên không hợp lệ."); }
  const name = playerName(body.name);
  if (!name) return error("Tên cần từ 1 đến 24 ký tự.");
  try {
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng này.", 404);
    const token = request.headers.get("x-player-token");
    const color = await playerColor(room, token);
    if (!color) return error("Bạn không thể đổi tên người chơi khác.", 403);
    const sql = color === "w"
      ? "UPDATE rooms SET white_name = ?, updated_at = ? WHERE code = ? AND white_token = ?"
      : "UPDATE rooms SET black_name = ?, updated_at = ? WHERE code = ? AND black_token = ?";
    await database().prepare(sql).bind(name, Date.now(), code, color === "w" ? room.white_token : room.black_token).run();
    const updated = await getRoom(code);
    if (!updated) return error("Không thể tải phòng.", 500);
    return reply({ room: await roomView(updated, token) });
  } catch { return error("Chưa lưu được tên. Hãy thử lại.", 500); }
}
