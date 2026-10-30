import type { MetadataRoute } from "next";
import { indexable, PUBLIC_ROUTES, siteOrigin } from "./site";

/** Pure builders, separate from Next's reserved metadata-route exports. */
export function createSitemap(origin = siteOrigin()): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({
    url: new URL(path, origin).toString(),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : path === "/docs" ? 0.8 : 0.6,
  }));
}

export function createRobots(
  publicUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
  environment: string | undefined = process.env.VERCEL_ENV
): MetadataRoute.Robots {
  if (!indexable(publicUrl, environment)) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/app/"] }],
    sitemap: new URL("/sitemap.xml", siteOrigin(publicUrl)).toString(),
  };
}
