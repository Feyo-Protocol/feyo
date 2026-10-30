/** The public origin is explicitly configured; no deployment hostname is guessed. */
export const LOCAL_ORIGIN = "http://localhost:3000";
export const PUBLIC_ROUTES = [
  "/", "/docs", "/docs/getting-started", "/docs/architecture",
  "/docs/stellar", "/docs/payments", "/docs/api", "/docs/mcp",
  "/docs/contributing", "/docs/roadmap",
] as const;

export function parseSiteOrigin(value: string | undefined): string | null {
  if (!value || value.trim() !== value) return null;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.origin;
  } catch {
    return null;
  }
}
export function siteOrigin(value: string | undefined = process.env.NEXT_PUBLIC_SITE_URL) {
  return parseSiteOrigin(value) ?? LOCAL_ORIGIN;
}
export function indexable(
  value: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
  deployment: string | undefined = process.env.VERCEL_ENV
): boolean {
  const parsed = parseSiteOrigin(value);
  return parsed !== null && parsed.startsWith("https://") && deployment !== "preview";
}
