export type StreamingMode = "browser" | "bridge" | "external";

export interface StreamStatus {
  state: "idle" | "connecting" | "downloading" | "ready" | "error";
  peers: number;
  downloadSpeed: number;
  progress: number;
  errorMessage?: string;
  activeFileName?: string;
}

export interface PlayerSettings {
  streamingMode: StreamingMode;
  bridgeUrl: string;
  defaultPlaybackRate: number;
  skipForwardSeconds: number;
  skipBackwardSeconds: number;
  autoAdvanceTracks: boolean;
  theme: string;
  disableBlur: boolean;
  hapticsEnabled: boolean;
  compactCards: boolean;
  defaultSleepTimer: number;
  showFeatured: boolean;
  showRecent: boolean;
  showRecommended: boolean;
  generateM3U: boolean;
  maxPeers: number;
  aiProvider: AIProvider;
  aiApiKey: string;
  aiModel: string;
  aiBaseUrl: string;
}

export type AIProvider = "openai" | "groq" | "custom";

export const DEFAULT_SETTINGS: PlayerSettings = {
  streamingMode: "browser",
  bridgeUrl: "http://localhost:8888",
  defaultPlaybackRate: 1.0,
  skipForwardSeconds: 30,
  skipBackwardSeconds: 15,
  autoAdvanceTracks: true,
  theme: "monochrome",
  disableBlur: false,
  hapticsEnabled: true,
  compactCards: false,
  defaultSleepTimer: 0,
  showFeatured: true,
  showRecent: true,
  showRecommended: true,
  generateM3U: true,
  maxPeers: 50,
  aiProvider: "openai",
  aiApiKey: "",
  aiModel: "whisper-1",
  aiBaseUrl: "",
};
