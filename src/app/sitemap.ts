import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, siteOrigin } from "../lib/seo/site";

export function createSitemap(origin = siteOrigin()): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({
    url: new URL(path, origin).toString(),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : path === "/docs" ? 0.8 : 0.6,
  }));
}
export default function sitemap(): MetadataRoute.Sitemap {
  return createSitemap();
}
