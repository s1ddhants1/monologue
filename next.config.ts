import type { NextConfig } from "next";

const sourceUrl = new URL(process.env.SOURCE_BASE_URL || "https://audiobookbay.lu");
const sourceImagePattern = {
  protocol: sourceUrl.protocol === "http:" ? "http" : "https",
  hostname: sourceUrl.hostname,
  ...(sourceUrl.port ? { port: sourceUrl.port } : {}),
  pathname: "/**",
} as const;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      sourceImagePattern,
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/search",
        destination: "/explore",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
