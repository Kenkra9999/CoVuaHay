import test from "node:test";
import assert from "node:assert/strict";
import { roomApiUrl, ROOM_SERVER } from "../lib/room-api.ts";
import { roomCorsHeaders } from "../lib/room-cors.ts";

test("Pages uses the room server while local and hosted sites use their own API", () => {
  assert.equal(roomApiUrl("/api/rooms/ABC234/start", "kenkra9999.github.io"), ROOM_SERVER + "/api/rooms/ABC234/start");
  assert.equal(roomApiUrl("/api/rooms", "localhost"), "/api/rooms");
  assert.equal(roomApiUrl("/api/rooms", new URL(ROOM_SERVER).hostname), "/api/rooms");
});

test("room CORS admits the Pages frontend, with seat token headers, without cookie credentials", () => {
  const headers = roomCorsHeaders("https://kenkra9999.github.io");
  assert.equal(headers["Access-Control-Allow-Origin"], "https://kenkra9999.github.io");
  assert.match(headers["Access-Control-Allow-Headers"], /X-Player-Token/);
  assert.equal(headers["Access-Control-Allow-Credentials"], undefined);
  assert.equal(roomCorsHeaders("https://untrusted.example"), null);
  assert.equal(roomCorsHeaders(null), null);
});
