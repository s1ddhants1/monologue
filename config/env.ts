const DEFAULT_SOURCE_BASE_URL = "https://audiobookbay.lu";

function getSourceBaseUrl(): string {
  try {
    const url = new URL(process.env.SOURCE_BASE_URL || DEFAULT_SOURCE_BASE_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") return DEFAULT_SOURCE_BASE_URL;
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SOURCE_BASE_URL;
  }
}

export const SOURCE_BASE_URL = getSourceBaseUrl();
export const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:8888";
