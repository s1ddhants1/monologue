import { create } from "zustand";
import type { CachedTranscript, TranscriptionResponse } from "../types";

interface OpenTranscriptParams {
  trackKey: string;
  audioUrl: string;
  bookTitle?: string;
  trackName?: string;
  infoHash?: string;
  trackIndex?: number;
}

interface TranscriptionState {
  isOpen: boolean;
  activeTrackKey: string | null;
  activeAudioUrl: string | null;
  activeBookTitle: string | null;
  activeTrackName: string | null;
  activeInfoHash: string | null;
  activeTrackIndex: number | null;
  transcripts: Record<string, CachedTranscript>;
  isLoading: boolean;
  error: string | null;

  openTranscript: (params: OpenTranscriptParams) => void;
  closeTranscript: () => void;
  setTranscript: (
    trackKey: string,
    transcript: TranscriptionResponse,
    audioUrl: string,
    bookTitle?: string,
    trackName?: string,
  ) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  getTranscript: (trackKey: string) => CachedTranscript | undefined;
}

const MAX_CACHED_TRANSCRIPTS = 20;

function isCachedTranscript(value: unknown): value is CachedTranscript {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<CachedTranscript>;
  return (
    typeof entry.trackKey === "string" &&
    typeof entry.audioUrl === "string" &&
    typeof entry.createdAt === "number" &&
    Boolean(entry.transcript) &&
    typeof entry.transcript?.text === "string"
  );
}

function loadInitialTranscripts(): Record<string, CachedTranscript> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("monologue_transcripts");
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed)
          .filter((entry): entry is [string, CachedTranscript] => isCachedTranscript(entry[1]))
          .sort(([, left], [, right]) => right.createdAt - left.createdAt)
          .slice(0, MAX_CACHED_TRANSCRIPTS),
      ) as Record<string, CachedTranscript>;
    }
  } catch {}
  return {};
}

function persistTranscripts(transcripts: Record<string, CachedTranscript>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("monologue_transcripts", JSON.stringify(transcripts));
  } catch {}
}

export const useTranscriptionStore = create<TranscriptionState>((set, get) => ({
  isOpen: false,
  activeTrackKey: null,
  activeAudioUrl: null,
  activeBookTitle: null,
  activeTrackName: null,
  activeInfoHash: null,
  activeTrackIndex: null,
  transcripts: loadInitialTranscripts(),
  isLoading: false,
  error: null,

  openTranscript: ({ trackKey, audioUrl, bookTitle, trackName, infoHash, trackIndex }) => {
    set({
      isOpen: true,
      activeTrackKey: trackKey,
      activeAudioUrl: audioUrl,
      activeBookTitle: bookTitle ?? null,
      activeTrackName: trackName ?? null,
      activeInfoHash: infoHash ?? null,
      activeTrackIndex: trackIndex ?? null,
      error: null,
    });
  },

  closeTranscript: () => {
    set({ isOpen: false });
  },

  setTranscript: (trackKey, transcript, audioUrl, bookTitle, trackName) => {
    set((state) => {
      const updated = Object.fromEntries(
        Object.entries({
          ...state.transcripts,
          [trackKey]: {
            trackKey,
            transcript,
            audioUrl,
            bookTitle,
            trackName,
            createdAt: Date.now(),
          },
        })
          .sort(([, left], [, right]) => right.createdAt - left.createdAt)
          .slice(0, MAX_CACHED_TRANSCRIPTS),
      ) as Record<string, CachedTranscript>;
      persistTranscripts(updated);
      return {
        transcripts: updated,
        isLoading: false,
        error: null,
      };
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  getTranscript: (trackKey) => get().transcripts[trackKey],
}));
