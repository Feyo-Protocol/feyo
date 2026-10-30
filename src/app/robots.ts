import type { MetadataRoute } from "next";
import { createRobots } from "../lib/seo/routes";

export default function robots(): MetadataRoute.Robots {
  return createRobots();
}
