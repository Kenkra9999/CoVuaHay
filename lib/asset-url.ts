// Keep this direct access so the build replaces it in browser bundles.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function assetUrl(src: string, basePath: string = BASE_PATH): string {
  const base = basePath.replace(/\/+$/, "");
  if (!base || !src.startsWith("/") || src.startsWith("//") || src === base || src.startsWith(base + "/")) return src;
  return base + src;
}
