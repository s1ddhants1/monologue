import type { MetadataRoute } from "next";
import { POPULAR_CATEGORIES } from "@/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://monologue.app";

  return [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...POPULAR_CATEGORIES.map((category) => ({
      url: `${baseUrl}/category/${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
