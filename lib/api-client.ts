import { SOURCE_BASE_URL } from "@/config/env";

const DEFAULT_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiClient(
  urlOrPath: string,
  init?: RequestInit & { next?: { revalidate?: number | false } },
): Promise<Response> {
  const url = urlOrPath.startsWith("/") ? `${SOURCE_BASE_URL}${urlOrPath}` : urlOrPath;
  const timeout = init?.signal ? undefined : AbortSignal.timeout(15000);

  const res = await fetch(url, {
    ...init,
    signal: timeout,
    headers: {
      ...DEFAULT_HEADERS,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(`Request failed: ${res.status} ${res.statusText}`, res.status, url);
  }

  return res;
}
