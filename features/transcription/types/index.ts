import type { AIProvider } from "@/types";
import type { CharacterAlignmentResponseModel } from "@/hooks/use-transcript-viewer";

export type { CharacterAlignmentResponseModel };

export interface ByokConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseURL?: string;
}

export interface TranscriptionSegment {
  text: string;
  startSecond: number;
  endSecond: number;
}

export interface TranscriptionRequest {
  infoHash?: string;
  file?: string;
  trackIndex?: number;
  audioUrl?: string;
  audioBase64?: string;
  durationSeconds?: number;
  byok: ByokConfig;
}

export interface TranscriptionResponse {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
  durationInSeconds?: number;
  alignment: CharacterAlignmentResponseModel;
}

export interface CachedTranscript {
  trackKey: string;
  bookTitle?: string;
  trackName?: string;
  audioUrl: string;
  transcript: TranscriptionResponse;
  createdAt: number;
}
