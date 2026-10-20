import type { TranscriptionRequest, TranscriptionResponse } from "../types";

export async function transcribeAudio(
  request: TranscriptionRequest,
): Promise<TranscriptionResponse> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.error || `Transcription request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as TranscriptionResponse;
  return data;
}

export async function validateByokKey(byok: {
  provider: string;
  apiKey: string;
  model?: string;
  baseURL?: string;
}): Promise<{ ok: boolean; message: string }> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "validate",
      byok,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      message: data?.error || "Key validation failed",
    };
  }

  return {
    ok: true,
    message: data?.message || "AI credentials validated successfully!",
  };
}
