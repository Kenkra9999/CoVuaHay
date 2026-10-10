import test from "node:test";
import assert from "node:assert/strict";

// Run separately against a local server: this creates disposable test rooms in local D1.
const base = "http://localhost:3000";
async function request(path, method = "GET", token, body) {
  const response = await fetch(`${base}/api/rooms${path}`, {
    method,
    headers: { ...(token ? { "x-player-token": token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

test("room invitations, legal moves, authentication and switching rooms", async () => {
  const first = await request("", "POST");
  assert.equal(first.status, 201);
  const { code } = first.data.room;
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  const white = first.data.token;
  const joined = await request(`/${code}/join`, "POST");
  assert.equal(joined.status, 200);
  assert.equal(joined.data.room.color, "b");
  const black = joined.data.token;
  assert.equal((await request(`/${code}/join`, "POST")).status, 409);
  assert.equal((await request(`/${code}/move`, "POST", undefined, { from: "e2", to: "e4", version: 1 })).status, 403);
  assert.equal((await request(`/${code}/move`, "POST", black, { from: "e7", to: "e5", version: 1 })).status, 409);
  assert.equal((await request(`/${code}/move`, "POST", white, { from: "e2", to: "e5", version: 1 })).status, 400);
  const e4 = await request(`/${code}/move`, "POST", white, { from: "e2", to: "e4", version: 1 });
  assert.equal(e4.status, 200);
  const e5 = await request(`/${code}/move`, "POST", black, { from: "e7", to: "e5", version: e4.data.room.version });
  assert.equal(e5.status, 200);
  assert.deepEqual((await request(`/${code}`, "GET", white)).data.room.moves.map((move) => move.san), ["e4", "e5"]);
  assert.equal((await request(`/${code}`, "GET", "invalid-token")).data.room.color, null);
  const second = await request("", "POST");
  const secondCode = second.data.room.code;
  assert.notEqual(secondCode, code);
  assert.equal((await request(`/${secondCode}/join`, "POST")).data.room.color, "b");
  assert.equal((await request(`/${code}`, "GET", black)).data.room.color, "b", "joining another room does not invalidate the original seat");
});
