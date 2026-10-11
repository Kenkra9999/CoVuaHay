import { Chess } from "chess.js";
import { validTimeControl } from "@/lib/chess-clock";
import { database, error, getRoom, playerName, reply, requestBody, roomCode, roomView, tokenHash } from "@/lib/rooms";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await requestBody(request); } catch { return error("Dữ liệu tạo phòng không hợp lệ."); }
  const totalMinutes = body.totalMinutes ?? 15;
  const moveSeconds = body.moveSeconds ?? 120;
  if (!validTimeControl(totalMinutes, moveSeconds)) return error("Chọn 5–100 phút mỗi bên và 60–300 giây mỗi lượt.");
  const name = body.name === undefined ? "Kỳ thủ Trắng" : playerName(body.name);
  if (!name) return error("Tên cần từ 1 đến 24 ký tự.");
  try {
    let code = roomCode();
    for (let tries = 0; tries < 5 && await getRoom(code); tries++) code = roomCode();
    if (await getRoom(code)) return error("Chưa tạo được mã phòng. Hãy thử lại.", 503);
    const token = crypto.randomUUID();
    const now = Date.now();
    const seconds = Number(totalMinutes) * 60;
    await database().prepare(
      "INSERT INTO rooms (code, white_token, black_token, fen, moves_json, status, version, created_at, updated_at, white_name, total_seconds, move_limit_seconds, white_remaining_ms, black_remaining_ms, white_seen_at) VALUES (?, ?, NULL, ?, '[]', 'waiting', 0, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(code, await tokenHash(token), new Chess().fen(), now, now, name, seconds, moveSeconds, seconds * 1000, seconds * 1000, now).run();
    const room = await getRoom(code);
    if (!room) return error("Không thể tạo phòng.", 500);
    return reply({ room: await roomView(room, token), token }, 201);
  } catch { return error("Không thể tạo phòng lúc này. Hãy thử lại.", 500); }
}
