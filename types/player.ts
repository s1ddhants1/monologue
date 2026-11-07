export interface StreamStatus {
  state: "idle" | "connecting" | "downloading" | "ready" | "error";
  peers: number;
  downloadSpeed: number;
  progress: number;
  errorMessage?: string;
  activeFileName?: string;
}

export type AIProvider = "openai" | "groq" | "custom";

export interface PlayerSettings {
  defaultPlaybackRate: number;
  skipForwardSeconds: number;
  skipBackwardSeconds: number;
  autoAdvanceTracks: boolean;
  theme: string;
  disableBlur: boolean;
  hapticsEnabled: boolean;
  defaultSleepTimer: number;
  aiProvider: AIProvider;
  aiApiKey: string;
  aiModel: string;
  aiBaseUrl: string;
  streamingMode?: string;
  bridgeUrl?: string;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  defaultPlaybackRate: 1.0,
  skipForwardSeconds: 15,
  skipBackwardSeconds: 15,
  autoAdvanceTracks: true,
  theme: "monochrome",
  disableBlur: false,
  hapticsEnabled: true,
  defaultSleepTimer: 0,
  aiProvider: "openai",
  aiApiKey: "",
  aiModel: "whisper-1",
  aiBaseUrl: "",
};
