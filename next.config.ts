import type { NextConfig } from "next";

const sourceUrl = (() => {
  try {
    const url = new URL(process.env.SOURCE_BASE_URL || "https://audiobookbay.lu");
    return url.protocol === "http:" || url.protocol === "https:"
      ? url
      : new URL("https://audiobookbay.lu");
  } catch {
    return new URL("https://audiobookbay.lu");
  }
})();
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
