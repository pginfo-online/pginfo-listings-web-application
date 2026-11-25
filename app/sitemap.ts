import type { MetadataRoute } from "next";
import { siteURL } from "@/src/api/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteURL();
  return site
    ? ["/", "/explore", "/meetups"].map((path) => ({
        url: new URL(path, site).href,
      }))
    : [];
}
