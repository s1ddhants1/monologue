import { NextRequest, NextResponse } from "next/server";
import { transcribe } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { buildCharacterAlignment } from "@/features/transcription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BASE64_LENGTH = 35 * 1024 * 1024;
const HASH_REGEX = /^[a-fA-F0-9]{40}$|^[a-zA-Z2-7]{32}$/;

function isPrivateIpOrHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }
  if (
    /^10\./.test(lower) ||
    /^192\.168\./.test(lower) ||
    /^169\.254\./.test(lower) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)
  ) {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.mode === "validate") {
      const apiKey = body.byok?.apiKey?.trim();
      if (!apiKey) {
        return NextResponse.json({ error: "API key is required" }, { status: 400 });
      }

      const provider = body.byok?.provider || "openai";
      let baseURL = body.byok?.baseURL?.trim();
      if (!baseURL && provider === "groq") {
        baseURL = "https://api.groq.com/openai/v1";
      }

      const validationUrl = baseURL ? `${baseURL}/models` : "https://api.openai.com/v1/models";

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

    const apiKey =
      body.byok?.apiKey?.trim() || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No AI API key configured. Please enter your BYOK (Bring Your Own Key) in Settings.",
        },
        { status: 400 },
      );
    }

    const provider = body.byok?.provider || "openai";
    const defaultModel = provider === "groq" ? "whisper-large-v3" : "whisper-1";
    const modelId = body.byok?.model?.trim() || defaultModel;

    let baseURL = body.byok?.baseURL?.trim();
    if (!baseURL && provider === "groq") {
      baseURL = "https://api.groq.com/openai/v1";
    }

    let audioBuffer: Buffer | Uint8Array | null = null;

    if (body.audioBase64) {
      if (typeof body.audioBase64 !== "string" || body.audioBase64.length > MAX_BASE64_LENGTH) {
        return NextResponse.json(
          { error: "Audio payload exceeds maximum size limit of 25MB" },
          { status: 413 },
        );
      }
      audioBuffer = Buffer.from(body.audioBase64, "base64");
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

      if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
        return NextResponse.json({ error: "Unsupported URL protocol" }, { status: 400 });
      }

      const reqUrl = new URL(req.url);
      const isInternalToApp =
        targetUrl.hostname === reqUrl.hostname && targetUrl.port === reqUrl.port;

      if (!isInternalToApp && isPrivateIpOrHost(targetUrl.hostname)) {
        return NextResponse.json({ error: "Restricted network destination" }, { status: 403 });
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
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    } else if (body.infoHash) {
      if (typeof body.infoHash !== "string" || !HASH_REGEX.test(body.infoHash.trim())) {
        return NextResponse.json({ error: "Invalid infoHash format" }, { status: 400 });
      }

      const streamUrl = new URL(
        `/api/stream?infoHash=${encodeURIComponent(body.infoHash.trim())}&file=${encodeURIComponent(
          body.file || "",
        )}&track=${body.trackIndex ?? 0}`,
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

      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
