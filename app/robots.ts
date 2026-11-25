import type { MetadataRoute } from "next";
import { siteURL } from "@/src/api/config";

export default function robots(): MetadataRoute.Robots {
  const site = siteURL();
  return site
    ? {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/sign-in", "/more", "/saved", "/list-property"],
        },
        sitemap: new URL("/sitemap.xml", site).href,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
