import type { MetadataRoute } from "next";
import { createSitemap } from "../lib/seo/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return createSitemap();
}
