import { isNativePlatform, isAndroid } from "./platform";

export interface AudiobookMediaMetadata {
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
}

export interface MediaSessionHandlers {
  onPlay: () => void;
  onPause: () => void;
  onSeekBackward?: (seconds?: number) => void;
  onSeekForward?: (seconds?: number) => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  onSeekTo?: (seconds: number) => void;
}

let capMediaSession: typeof import("@capgo/capacitor-media-session").MediaSession | null = null;
let bgAudioPlugin: { start: () => Promise<void>; stop: () => Promise<void> } | null = null;
let isBgAudioPending = false;

async function withNativeMediaSession<T>(
  action: (plugin: typeof import("@capgo/capacitor-media-session").MediaSession) => Promise<T>,
): Promise<T | null> {
  if (typeof window === "undefined" || !isNativePlatform()) return null;

  if (!capMediaSession) {
    try {
      const mod = await import("@capgo/capacitor-media-session");
      capMediaSession = mod.MediaSession;
    } catch {
      return null;
    }
  }

  if (!capMediaSession) return null;

  try {
    return await action(capMediaSession);
  } catch (err) {
    console.warn("[Capacitor MediaSession] Native call notice:", err);
    return null;
  }
}

async function updateBackgroundAudioService(isPlaying: boolean) {
  if (typeof window === "undefined" || !isNativePlatform() || !isAndroid()) return;
  if (isBgAudioPending) return;
  isBgAudioPending = true;

  try {
    const { registerPlugin } = await import("@capacitor/core");
    if (!bgAudioPlugin) {
      bgAudioPlugin = registerPlugin<{
        start: () => Promise<void>;
        stop: () => Promise<void>;
      }>("BackgroundAudio");
    }
    if (isPlaying) {
      await bgAudioPlugin?.start?.();
    } else {
      await bgAudioPlugin?.stop?.();
    }
  } catch {
  } finally {
    isBgAudioPending = false;
  }
}

export async function setupMediaSession(handlers: MediaSessionHandlers): Promise<() => void> {
  if (typeof window === "undefined") return () => {};

  await withNativeMediaSession(async (plugin) => {
    await plugin.setActionHandler({ action: "play" }, () => handlers.onPlay());
    await plugin.setActionHandler({ action: "pause" }, () => handlers.onPause());

    if (handlers.onSeekBackward) {
      await plugin.setActionHandler({ action: "seekbackward" }, () => handlers.onSeekBackward?.());
    }
    if (handlers.onSeekForward) {
      await plugin.setActionHandler({ action: "seekforward" }, () => handlers.onSeekForward?.());
    }
    if (handlers.onPreviousTrack) {
      await plugin.setActionHandler({ action: "previoustrack" }, () =>
        handlers.onPreviousTrack?.(),
      );
    }
    if (handlers.onNextTrack) {
      await plugin.setActionHandler({ action: "nexttrack" }, () => handlers.onNextTrack?.());
    }
    if (handlers.onSeekTo) {
      await plugin.setActionHandler({ action: "seekto" }, (details) => {
        if (details?.seekTime !== undefined && details.seekTime !== null) {
          handlers.onSeekTo?.(details.seekTime);
        }
      });
    }
  });

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", handlers.onPlay);
      navigator.mediaSession.setActionHandler("pause", handlers.onPause);

      if (handlers.onSeekBackward) {
        navigator.mediaSession.setActionHandler("seekbackward", () => handlers.onSeekBackward?.());
      }
      if (handlers.onSeekForward) {
        navigator.mediaSession.setActionHandler("seekforward", () => handlers.onSeekForward?.());
      }
      if (handlers.onPreviousTrack) {
        navigator.mediaSession.setActionHandler("previoustrack", handlers.onPreviousTrack);
      }
      if (handlers.onNextTrack) {
        navigator.mediaSession.setActionHandler("nexttrack", handlers.onNextTrack);
      }
      if (handlers.onSeekTo) {
        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            handlers.onSeekTo?.(details.seekTime);
          }
        });
      }
    } catch (err) {
      console.warn("[MediaSession] Browser action handler setup:", err);
    }
  }

  return () => {
    void withNativeMediaSession(async (plugin) => {
      await plugin.setActionHandler({ action: "play" }, null);
      await plugin.setActionHandler({ action: "pause" }, null);
      await plugin.setActionHandler({ action: "previoustrack" }, null);
      await plugin.setActionHandler({ action: "nexttrack" }, null);
      await plugin.setActionHandler({ action: "seekbackward" }, null);
      await plugin.setActionHandler({ action: "seekforward" }, null);
      await plugin.setActionHandler({ action: "seekto" }, null);
    });

    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekto", null);
    }
  };
}

export async function updateMediaMetadata(metadata: AudiobookMediaMetadata | null): Promise<void> {
  if (typeof window === "undefined") return;

  if (!metadata) {
    await withNativeMediaSession(async (plugin) => {
      await plugin.setMetadata({});
    });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
    }
    return;
  }

  const artworkList = metadata.artworkUrl
    ? [
        {
          src: metadata.artworkUrl,
          sizes: "512x512",
          type: "image/jpeg",
        },
      ]
    : undefined;

  await withNativeMediaSession(async (plugin) => {
    await plugin.setMetadata({}).catch(() => {});
    await plugin.setMetadata({
      title: metadata.title || "Unknown Title",
      artist: metadata.artist || "Unknown Author",
      album: metadata.album || "Monologue",
      artwork: artworkList,
    });
  });

  if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      artwork: artworkList,
    });
  }
}

export async function updateMediaPlaybackState(isPlaying: boolean): Promise<void> {
  if (typeof window === "undefined") return;

  const state = isPlaying ? "playing" : "paused";

  await withNativeMediaSession(async (plugin) => {
    await plugin.setPlaybackState({ playbackState: state });
  });

  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = state;
  }

  void updateBackgroundAudioService(isPlaying);
}

export async function updateMediaPositionState(
  duration: number,
  playbackRate: number,
  position: number,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!duration || isNaN(duration) || !isFinite(duration) || duration <= 0) return;

  const safePosition = Math.max(0, Math.min(position, duration));
  const safeRate = playbackRate > 0 ? playbackRate : 1.0;

  await withNativeMediaSession(async (plugin) => {
    await plugin.setPositionState({
      duration,
      playbackRate: safeRate,
      position: safePosition,
    });
  });

  if (
    "mediaSession" in navigator &&
    typeof navigator.mediaSession.setPositionState === "function"
  ) {
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: safeRate,
        position: safePosition,
      });
    } catch {}
  }
}
