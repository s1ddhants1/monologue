import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/settings", "/library", "/recent"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://monologue.app"}/sitemap.xml`,
  };
}
