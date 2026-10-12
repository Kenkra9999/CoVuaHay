// GitHub Pages serves the board; the existing public Site validates online games.
export const ROOM_SERVER = "https://nuoc-co-chess-arena.kenkraz234.chatgpt.site";

export function roomApiUrl(path: string, hostname = typeof window === "undefined" ? "" : window.location.hostname) {
  return (hostname === "kenkra9999.github.io" ? ROOM_SERVER : "") + path;
}

export async function roomFetch(path: string, init: RequestInit = {}) {
  const timeout = AbortSignal.timeout(12000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  const response = await fetch(roomApiUrl(path), { ...init, signal, cache: "no-store", credentials: "omit" });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Chưa kết nối được máy chủ phòng. Hãy thử lại sau ít giây.");
  return response;
}
