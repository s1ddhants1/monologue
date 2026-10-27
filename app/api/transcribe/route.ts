import { NextRequest, NextResponse } from "next/server";
import { transcribe } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { isIP } from "node:net";
import { buildCharacterAlignment } from "@/features/transcription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 18 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_AUDIO_BYTES * 4) / 3);
const MAX_REQUEST_BODY_BYTES = MAX_BASE64_LENGTH + 1024 * 1024;
const HASH_REGEX = /^[a-fA-F0-9]{40}$|^[a-zA-Z2-7]{32}$/;
const PROVIDER_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
} as const;

type JsonObject = Record<string, unknown>;

async function readJsonBody(request: NextRequest): Promise<JsonObject> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BODY_BYTES) {
    throw new Error("Request body exceeds the maximum allowed size");
  }

  if (!request.body) {
    const parsed = (await request.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid JSON request body");
    }
    return parsed as JsonObject;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel();
        throw new Error("Request body exceeds the maximum allowed size");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new Error("Invalid JSON request body");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid JSON request body");
  }
  return parsed as JsonObject;
}

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isPrivateIpOrHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/\.$/, "");
  if (
    lower === "localhost" ||
    lower === "metadata.google.internal" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }

  const ipVersion = isIP(lower);
  if (ipVersion === 6) {
    return (
      lower === "::1" ||
      lower === "::" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb")
    );
  }
  if (ipVersion !== 4) return false;

  const octets = lower.split(".").map(Number);
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    (first === 100 && second >= 64 && second <= 127) ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && second >= 18 && second <= 19) ||
    (first === 198 && second === 51) ||
    (first === 203 && second === 0) ||
    first >= 224
  );
}

function normalizeProviderBaseUrl(provider: string, requestedBaseUrl?: string): string | undefined {
  const defaultBaseUrl = provider === "groq" ? PROVIDER_BASE_URLS.groq : PROVIDER_BASE_URLS.openai;
  if (!requestedBaseUrl) return defaultBaseUrl;

  let url: URL;
  try {
    url = new URL(requestedBaseUrl);
  } catch {
    throw new Error("Invalid AI provider URL");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    isPrivateIpOrHost(url.hostname)
  ) {
    throw new Error("AI provider URL must be a public HTTPS endpoint");
  }

  return url.toString().replace(/\/$/, "");
}

async function readAudioResponse(response: Response): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_AUDIO_BYTES) {
    throw new Error("Audio payload exceeds the maximum size limit");
  }

  if (!response.body) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_AUDIO_BYTES)
      throw new Error("Audio payload exceeds the maximum size limit");
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_AUDIO_BYTES) {
        await reader.cancel();
        throw new Error("Audio payload exceeds the maximum size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = Buffer.allocUnsafe(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req);
    const byok = (body.byok && typeof body.byok === "object" ? body.byok : {}) as JsonObject;
    const provider = asTrimmedString(byok.provider) || "openai";
    if (provider !== "openai" && provider !== "groq" && provider !== "custom") {
      return NextResponse.json({ error: "Unsupported AI provider" }, { status: 400 });
    }

    const requestedBaseUrl = asTrimmedString(byok.baseURL);
    if (provider === "custom" && !requestedBaseUrl) {
      return NextResponse.json({ error: "A custom provider URL is required" }, { status: 400 });
    }

    let baseURL: string | undefined;
    try {
      baseURL = normalizeProviderBaseUrl(provider, requestedBaseUrl);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid AI provider URL" },
        { status: 400 },
      );
    }

    if (body.mode === "validate") {
      const apiKey = asTrimmedString(byok.apiKey);
      if (!apiKey) {
        return NextResponse.json({ error: "API key is required" }, { status: 400 });
      }

      const validationUrl = `${baseURL}/models`;

      try {
        const verifyRes = await fetch(validationUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!verifyRes.ok) {
          return NextResponse.json(
            { error: `API key validation failed with status ${verifyRes.status}` },
            { status: 401 },
          );
        }

        return NextResponse.json({
          ok: true,
          message: "AI credentials validated successfully!",
        });
      } catch {
        return NextResponse.json(
          { error: "Could not reach AI provider endpoint to validate key" },
          { status: 502 },
        );
      }
    }

    const suppliedApiKey = asTrimmedString(byok.apiKey);
    if (suppliedApiKey && suppliedApiKey.length > 4096) {
      return NextResponse.json({ error: "API key is too long" }, { status: 400 });
    }
    const usesCustomEndpoint = Boolean(requestedBaseUrl) || provider === "custom";
    const apiKey =
      suppliedApiKey ||
      (!usesCustomEndpoint && provider === "openai" ? process.env.OPENAI_API_KEY : undefined) ||
      (!usesCustomEndpoint && provider === "groq" ? process.env.GROQ_API_KEY : undefined);

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No AI API key configured. Please enter your BYOK (Bring Your Own Key) in Settings.",
        },
        { status: 400 },
      );
    }

    const defaultModel = provider === "groq" ? "whisper-large-v3" : "whisper-1";
    const modelId = asTrimmedString(byok.model) || defaultModel;
    if (modelId.length > 200) {
      return NextResponse.json({ error: "Model name is too long" }, { status: 400 });
    }

    let audioBuffer: Buffer | Uint8Array | null = null;

    if (body.audioBase64) {
      if (
        typeof body.audioBase64 !== "string" ||
        body.audioBase64.length > MAX_BASE64_LENGTH ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(body.audioBase64)
      ) {
        return NextResponse.json({ error: "Invalid or oversized audio payload" }, { status: 413 });
      }
      audioBuffer = Buffer.from(body.audioBase64, "base64");
      if (audioBuffer.length > MAX_AUDIO_BYTES) {
        return NextResponse.json(
          { error: "Audio payload exceeds maximum size limit" },
          { status: 413 },
        );
      }
    } else if (body.audioUrl) {
      if (typeof body.audioUrl !== "string") {
        return NextResponse.json({ error: "Invalid audio URL format" }, { status: 400 });
      }

      let targetUrl: URL;
      if (body.audioUrl.startsWith("/")) {
        targetUrl = new URL(body.audioUrl, req.url);
      } else {
        try {
          targetUrl = new URL(body.audioUrl);
        } catch {
          return NextResponse.json({ error: "Malformed audio URL" }, { status: 400 });
        }
      }

      const reqUrl = new URL(req.url);
      if (targetUrl.origin !== reqUrl.origin) {
        return NextResponse.json(
          { error: "External audio URLs are not accepted; provide an infoHash instead" },
          { status: 400 },
        );
      }

      const response = await fetch(targetUrl.toString(), {
        headers: {
          Range: "bytes=0-18000000",
        },
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok && response.status !== 206) {
        return NextResponse.json(
          { error: `Failed to fetch audio stream: ${response.statusText}` },
          { status: 400 },
        );
      }
      audioBuffer = await readAudioResponse(response);
    } else if (body.infoHash) {
      if (typeof body.infoHash !== "string" || !HASH_REGEX.test(body.infoHash.trim())) {
        return NextResponse.json({ error: "Invalid infoHash format" }, { status: 400 });
      }

      const trackIndex = body.trackIndex === undefined ? 0 : Number(body.trackIndex);
      if (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex > 10000) {
        return NextResponse.json({ error: "Invalid trackIndex" }, { status: 400 });
      }
      const file = typeof body.file === "string" ? body.file.slice(0, 1024) : "";
      const streamUrl = new URL(
        `/api/stream?infoHash=${encodeURIComponent(body.infoHash.trim())}&file=${encodeURIComponent(
          file,
        )}&track=${trackIndex}`,
        req.url,
      ).toString();

      const response = await fetch(streamUrl, {
        headers: {
          Range: "bytes=0-18000000",
        },
        signal: AbortSignal.timeout(25000),
      });

      if (!response.ok && response.status !== 206) {
        return NextResponse.json(
          { error: "Unable to retrieve audio stream from torrent engine" },
          { status: 400 },
        );
      }

      audioBuffer = await readAudioResponse(response);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json(
        { error: "No audio data could be retrieved for transcription" },
        { status: 400 },
      );
    }

    const customOpenAI = createOpenAI({
      apiKey,
      baseURL: baseURL || undefined,
    });

    const transcriptionModel = customOpenAI.transcription(modelId);

    const result = await transcribe({
      model: transcriptionModel,
      audio: audioBuffer,
      providerOptions: {
        openai: {
          timestampGranularities: ["word", "segment"],
        },
      },
    });

    const alignment = buildCharacterAlignment(result.text, result.segments || []);

    return NextResponse.json({
      text: result.text,
      segments: result.segments || [],
      language: result.language,
      durationInSeconds: result.durationInSeconds,
      alignment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to transcribe audio";
    const status =
      message.includes("maximum") || message.includes("body exceeds")
        ? 413
        : message.includes("Invalid JSON")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
