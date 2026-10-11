import { database, error, getRoom, playerColor, playerName, reply, requestBody, roomView, tokenHash, validCode } from "@/lib/rooms";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase();
  if (!validCode(code)) return error("Mã phòng không hợp lệ.");
  let body: Record<string, unknown>;
  try { body = await requestBody(request); } catch { return error("Dữ liệu tham gia không hợp lệ."); }
  const name = body.name === undefined ? "Kỳ thủ Đen" : playerName(body.name);
  if (!name) return error("Tên cần từ 1 đến 24 ký tự.");
  try {
    const room = await getRoom(code);
    if (!room) return error("Không tìm thấy phòng này.", 404);
    const savedToken = request.headers.get("x-player-token");
    if (await playerColor(room, savedToken)) return reply({ room: await roomView(room, savedToken) });
    if (room.black_token) return error("Phòng đã đủ hai người. Bạn có thể theo dõi trận.", 409);
    if (room.status !== "waiting") return error("Trận này đã kết thúc.", 409);
    const token = crypto.randomUUID();
    const now = Date.now();
    const result = await database().prepare(
      "UPDATE rooms SET black_token = ?, black_name = ?, black_seen_at = ?, status = 'playing', turn_started_at = ?, version = version + 1, updated_at = ? WHERE code = ? AND black_token IS NULL AND status = 'waiting'")
      .bind(await tokenHash(token), name, now, now, now, code).run();
    if (result.meta.changes !== 1) return error("Một người khác vừa nhận ghế. Hãy vào lại.", 409);
    const joined = await getRoom(code);
    if (!joined) return error("Không thể tham gia phòng.", 500);
    return reply({ room: await roomView(joined, token), token });
  } catch { return error("Không thể tham gia phòng lúc này.", 500); }
}
