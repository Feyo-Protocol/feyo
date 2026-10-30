import type { MetadataRoute } from "next";
import { indexable, siteOrigin } from "@/lib/seo/site";

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
export default function robots(): MetadataRoute.Robots {
  return createRobots();
}
