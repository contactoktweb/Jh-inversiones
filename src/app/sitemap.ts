import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/terminos", "/privacidad"].map((route) => ({ url: `${siteUrl}${route}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: route ? 0.4 : 1 }));
}
