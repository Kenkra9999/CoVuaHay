export function roomCorsHeaders(origin: string | null): Record<string, string> | null {
  if (origin !== "https://kenkra9999.github.io") return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Player-Token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
