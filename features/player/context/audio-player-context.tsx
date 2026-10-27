"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { AudiobookDetail, AudiobookFile, AudiobookSummary, StreamStatus } from "@/types";
import { downloadM3UPlaylist } from "../utils/playlist";
import {
  saveBookProgress,
  getBookProgress,
  saveLastActiveBook,
  getLastActiveBook,
} from "../utils/progress";
import { addRecentBook } from "@/features/audiobooks";
import { useSettingsStore } from "@/features/settings";
import { toast } from "sonner";
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  setupMediaSession,
  updateMediaMetadata,
  updateMediaPlaybackState,
  updateMediaPositionState,
} from "@/lib/capacitor";

export interface PlayerPlaybackContextType {
  currentBook: AudiobookDetail | null;
  currentTrack: AudiobookFile | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  streamStatus: StreamStatus;
  sleepTimerRemaining: number | null;
  sleepOnChapterEnd: boolean;
  playBook: (book: AudiobookDetail | AudiobookSummary, trackIndex?: number) => void;
  launchExternalPlayer: (book?: AudiobookDetail | null) => boolean;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setTrack: (index: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  startSleepTimer: (minutes: number | "chapter") => void;
  cancelSleepTimer: () => void;
}

export interface PlayerTimeContextType {
  currentTime: number;
  duration: number;
}

export interface PlayerContextType extends PlayerPlaybackContextType, PlayerTimeContextType {}

const PlayerPlaybackContext = createContext<PlayerPlaybackContextType | null>(null);
const PlayerTimeContext = createContext<PlayerTimeContextType | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentBook, setCurrentBook] = useState<AudiobookDetail | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRateState] = useState<number>(
    () => useSettingsStore.getState().settings.defaultPlaybackRate,
  );
  const [volume, setVolumeState] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [sleepOnChapterEnd, setSleepOnChapterEnd] = useState<boolean>(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>({
    state: "idle",
    peers: 0,
    downloadSpeed: 0,
    progress: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const loadRequestIdRef = useRef(0);

  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    queueMicrotask(() => {
      const lastActive = getLastActiveBook();
      if (lastActive?.book) {
        const book = lastActive.book;
        const saved = getBookProgress(book.id);
        const trackIndex = saved?.trackIndex ?? lastActive.trackIndex ?? 0;
        const initialTime = saved?.currentTime ?? lastActive.currentTime ?? 0;
        const initialDur = saved?.duration ?? 0;

        setCurrentBook(book);
        setCurrentTrackIndex(
          trackIndex >= 0 && trackIndex < (book.files?.length || 1) ? trackIndex : 0,
        );
        setCurrentTime(initialTime);
        if (initialDur > 0) {
          setDuration(initialDur);
        }
      }
    });
  }, []);

  const hasSleepTimer = sleepTimerRemaining !== null;

  useEffect(() => {
    if (!hasSleepTimer) {
      if (sleepTimerIntervalRef.current) {
        clearInterval(sleepTimerIntervalRef.current);
        sleepTimerIntervalRef.current = null;
      }
      return;
    }

    if (!sleepTimerIntervalRef.current) {
      sleepTimerIntervalRef.current = setInterval(() => {
        setSleepTimerRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (sleepTimerIntervalRef.current) {
        clearInterval(sleepTimerIntervalRef.current);
        sleepTimerIntervalRef.current = null;
      }
    };
  }, [hasSleepTimer]);

  const currentTrack = currentBook?.files?.[currentTrackIndex] || null;

  useEffect(() => {
    const handlePageExit = () => {
      if (currentBook && audioRef.current) {
        saveBookProgress(
          currentBook.id,
          currentTrackIndex,
          audioRef.current.currentTime,
          audioRef.current.duration,
        );
        saveLastActiveBook(currentBook, currentTrackIndex, audioRef.current.currentTime);
      }
    };

    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);

    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
    };
  }, [currentBook, currentTrackIndex]);

  const loadAndStreamTrack = useCallback(
    async (book: AudiobookDetail, trackIdx: number, startSeekSeconds = 0) => {
      if (!audioRef.current) return;
      const audio = audioRef.current;

      const track = book.files?.[trackIdx];
      if (!track) return;
      const requestId = ++loadRequestIdRef.current;

      setIsLoading(true);
      setCurrentTime(startSeekSeconds);
      setDuration(0);
      pendingSeekRef.current = startSeekSeconds > 0 ? startSeekSeconds : null;

      setStreamStatus({
        state: "connecting",
        peers: 0,
        downloadSpeed: 0,
        progress: 0,
        activeFileName: track.name,
      });

      const trackerParams =
        book.trackers && book.trackers.length > 0
          ? "&" + book.trackers.map((tr) => `tr=${encodeURIComponent(tr)}`).join("&")
          : "";

      const streamEndpoint =
        settings.streamingMode === "bridge" && settings.bridgeUrl
          ? `${settings.bridgeUrl}/stream?infoHash=${book.infoHash}&file=${encodeURIComponent(track.name)}&track=${trackIdx}${trackerParams}`
          : `/api/stream?infoHash=${book.infoHash}&file=${encodeURIComponent(track.name)}&track=${trackIdx}${trackerParams}`;

      audio.src = streamEndpoint;
      audio.load();

      let seekApplied = false;
      const applyInitialSeek = () => {
        if (seekApplied || startSeekSeconds <= 0) return;
        try {
          if (Math.abs(audio.currentTime - startSeekSeconds) > 0.5) {
            audio.currentTime = startSeekSeconds;
            setCurrentTime(startSeekSeconds);
          }
          seekApplied = true;
          pendingSeekRef.current = null;
        } catch {}
      };

      if (startSeekSeconds > 0) {
        audio.addEventListener("loadedmetadata", applyInitialSeek, { once: true });
        audio.addEventListener("canplay", applyInitialSeek, { once: true });
      }

      audio
        .play()
        .then(() => {
          if (requestId !== loadRequestIdRef.current) return;
          setIsPlaying(true);
          setIsLoading(false);
          setStreamStatus({
            state: "ready",
            peers: 1,
            downloadSpeed: 0,
            progress: 1,
            activeFileName: track.name,
          });
          applyInitialSeek();
        })
        .catch(() => {
          if (requestId !== loadRequestIdRef.current) return;
          setIsLoading(false);
          setStreamStatus((prev) => ({
            ...prev,
            state: "error",
            errorMessage: "Audio playback could not be started",
          }));
        });
    },
    [settings],
  );

  const currentLoadingBookIdRef = useRef<string | null>(null);

  const playBook = useCallback(
    (book: AudiobookDetail | AudiobookSummary, requestedTrackIndex?: number) => {
      if (currentBook && currentBook.id !== book.id && audioRef.current) {
        saveBookProgress(
          currentBook.id,
          currentTrackIndex,
          audioRef.current.currentTime,
          audioRef.current.duration,
        );
      }

      const hasFiles = "files" in book && Array.isArray(book.files) && book.files.length > 0;
      const initialBook: AudiobookDetail = hasFiles
        ? (book as AudiobookDetail)
        : {
            ...book,
            description: (book as AudiobookDetail).description || "",
            files: (book as AudiobookDetail).files || [],
            trackers: (book as AudiobookDetail).trackers || [],
          };

      let targetIndex = requestedTrackIndex ?? 0;
      let resumeTime = 0;

      const saved = getBookProgress(book.id);
      if (requestedTrackIndex === undefined) {
        if (saved) {
          if (saved.trackIndex >= 0 && saved.trackIndex < (initialBook.files?.length || 1)) {
            targetIndex = saved.trackIndex;
            resumeTime = saved.currentTime;
          }
        }
      } else if (saved && saved.trackIndex === requestedTrackIndex) {
        resumeTime = saved.currentTime;
      }

      currentLoadingBookIdRef.current = book.id;
      setCurrentBook(initialBook);
      setCurrentTrackIndex(targetIndex);
      setCurrentTime(resumeTime);
      setIsPlaying(false);
      setIsLoading(true);

      if (hasFiles) {
        currentLoadingBookIdRef.current = null;
        addRecentBook(initialBook);
        saveLastActiveBook(initialBook, targetIndex, resumeTime);
        saveBookProgress(initialBook.id, targetIndex, resumeTime);
        loadAndStreamTrack(initialBook, targetIndex, resumeTime);
        return;
      }

      void (async () => {
        try {
          const res = await fetch(`/api/audiobooks/book?slug=${encodeURIComponent(book.id)}`);
          if (!res.ok) {
            throw new Error("Failed to load audiobook detail");
          }
          const fullDetail = (await res.json()) as AudiobookDetail;
          if (currentLoadingBookIdRef.current !== book.id) {
            return;
          }
          currentLoadingBookIdRef.current = null;
          let finalTargetIndex = targetIndex;
          let finalResumeTime = resumeTime;
          if (saved) {
            if (saved.trackIndex >= 0 && saved.trackIndex < (fullDetail.files?.length || 1)) {
              finalTargetIndex = saved.trackIndex;
              finalResumeTime = saved.currentTime;
            }
          }
          setCurrentBook(fullDetail);
          setCurrentTrackIndex(finalTargetIndex);
          setCurrentTime(finalResumeTime);
          addRecentBook(fullDetail);
          saveLastActiveBook(fullDetail, finalTargetIndex, finalResumeTime);
          saveBookProgress(fullDetail.id, finalTargetIndex, finalResumeTime);
          loadAndStreamTrack(fullDetail, finalTargetIndex, finalResumeTime);
        } catch {
          if (currentLoadingBookIdRef.current === book.id) {
            currentLoadingBookIdRef.current = null;
            setIsLoading(false);
            toast.error("Failed to load audiobook", {
              description: "Could not retrieve audio tracks. Please try again.",
            });
          }
        }
      })();
    },
    [currentBook, currentTrackIndex, loadAndStreamTrack],
  );

  const launchExternalPlayer = useCallback(
    (targetBook?: AudiobookDetail | null) => {
      const book = targetBook || currentBook;
      if (!book) return false;
      void hapticSuccess();
      downloadM3UPlaylist(book, settings);
      return true;
    },
    [currentBook, settings],
  );

  const togglePlayPause = useCallback(() => {
    if (!currentBook) return;
    void hapticMedium();
    if (isLoading) {
      currentLoadingBookIdRef.current = null;
      setIsLoading(false);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      if (
        !audioRef.current.src ||
        audioRef.current.src === "" ||
        audioRef.current.src === window.location.href
      ) {
        loadAndStreamTrack(currentBook, currentTrackIndex, currentTime);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      saveBookProgress(
        currentBook.id,
        currentTrackIndex,
        audioRef.current.currentTime,
        audioRef.current.duration,
      );
      saveLastActiveBook(currentBook, currentTrackIndex, audioRef.current.currentTime);
    }
  }, [currentBook, currentTrackIndex, currentTime, isLoading, loadAndStreamTrack]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (!audioRef.current) return;
      void hapticLight();
      const clamped = Math.max(0, seconds);
      audioRef.current.currentTime = clamped;
      setCurrentTime(clamped);
      if (currentBook) {
        saveBookProgress(currentBook.id, currentTrackIndex, clamped, duration);
        saveLastActiveBook(currentBook, currentTrackIndex, clamped);
      }
    },
    [currentBook, currentTrackIndex, duration],
  );

  const skipForward = useCallback(
    (seconds = settings.skipForwardSeconds) => {
      if (!audioRef.current) return;
      void hapticMedium();
      const target = Math.min(
        audioRef.current.duration || 999999,
        audioRef.current.currentTime + seconds,
      );
      audioRef.current.currentTime = target;
      setCurrentTime(target);
      if (currentBook) {
        saveBookProgress(currentBook.id, currentTrackIndex, target, duration);
        saveLastActiveBook(currentBook, currentTrackIndex, target);
      }
    },
    [settings.skipForwardSeconds, currentBook, currentTrackIndex, duration],
  );

  const skipBackward = useCallback(
    (seconds = settings.skipBackwardSeconds) => {
      if (!audioRef.current) return;
      void hapticMedium();
      const target = Math.max(0, audioRef.current.currentTime - seconds);
      audioRef.current.currentTime = target;
      setCurrentTime(target);
      if (currentBook) {
        saveBookProgress(currentBook.id, currentTrackIndex, target, duration);
        saveLastActiveBook(currentBook, currentTrackIndex, target);
      }
    },
    [settings.skipBackwardSeconds, currentBook, currentTrackIndex, duration],
  );

  const setTrack = useCallback(
    (index: number) => {
      if (!currentBook) return;
      if (index < 0 || index >= currentBook.files.length) return;
      setCurrentTrackIndex(index);
      saveBookProgress(currentBook.id, index, 0);
      saveLastActiveBook(currentBook, index, 0);
      loadAndStreamTrack(currentBook, index, 0);
    },
    [currentBook, loadAndStreamTrack],
  );

  const nextTrack = useCallback(() => {
    if (!currentBook) return;
    if (currentTrackIndex < currentBook.files.length - 1) {
      void hapticMedium();
      setTrack(currentTrackIndex + 1);
    }
  }, [currentBook, currentTrackIndex, setTrack]);

  const prevTrack = useCallback(() => {
    if (!currentBook) return;
    if (currentTrackIndex > 0) {
      void hapticMedium();
      setTrack(currentTrackIndex - 1);
    }
  }, [currentBook, currentTrackIndex, setTrack]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      setVolumeState(clamped);
      if (audioRef.current) {
        audioRef.current.volume = clamped;
      }
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
      }
    },
    [isMuted],
  );

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    void hapticLight();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  }, [isMuted]);

  const startSleepTimer = useCallback((minutes: number | "chapter") => {
    void hapticSuccess();
    if (sleepTimerIntervalRef.current) {
      clearInterval(sleepTimerIntervalRef.current);
      sleepTimerIntervalRef.current = null;
    }
    if (minutes === "chapter") {
      setSleepOnChapterEnd(true);
      setSleepTimerRemaining(null);
    } else {
      setSleepOnChapterEnd(false);
      setSleepTimerRemaining(minutes * 60);
    }
  }, []);

  const cancelSleepTimer = useCallback(() => {
    void hapticLight();
    if (sleepTimerIntervalRef.current) {
      clearInterval(sleepTimerIntervalRef.current);
      sleepTimerIntervalRef.current = null;
    }
    setSleepTimerRemaining(null);
    setSleepOnChapterEnd(false);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let lastSaved = 0;
    const onTimeUpdate = () => {
      const cur = audio.currentTime;
      if (pendingSeekRef.current !== null) {
        if (Math.abs(cur - pendingSeekRef.current) < 1 || cur >= pendingSeekRef.current) {
          pendingSeekRef.current = null;
        }
      }
      setCurrentTime(cur);

      if (currentBook && cur > 0 && Math.abs(cur - lastSaved) >= 10) {
        lastSaved = cur;
        saveBookProgress(currentBook.id, currentTrackIndex, cur, audio.duration);
        saveLastActiveBook(currentBook, currentTrackIndex, cur);
      }
    };

    const onDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      if (currentBook) {
        saveBookProgress(currentBook.id, currentTrackIndex, audio.currentTime, audio.duration);
        saveLastActiveBook(currentBook, currentTrackIndex, audio.currentTime);
      }
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setStreamStatus((prev) => ({
        ...prev,
        state: "error",
        errorMessage: "Failed to stream audio track",
      }));
      toast.error("Streaming Error", {
        description:
          "Failed to stream audio track from swarm. Check connection or try another chapter.",
      });
    };

    const onEnded = () => {
      if (sleepOnChapterEnd) {
        setIsPlaying(false);
        setSleepOnChapterEnd(false);
        return;
      }

      if (
        settings.autoAdvanceTracks &&
        currentBook &&
        currentTrackIndex < currentBook.files.length - 1
      ) {
        const nextIdx = currentTrackIndex + 1;
        setCurrentTrackIndex(nextIdx);
        saveBookProgress(currentBook.id, nextIdx, 0);
        saveLastActiveBook(currentBook, nextIdx, 0);
        loadAndStreamTrack(currentBook, nextIdx, 0);
      } else {
        setIsPlaying(false);
        if (currentBook) {
          saveBookProgress(currentBook.id, currentTrackIndex, audio.currentTime, audio.duration);
        }
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [
    currentBook,
    currentTrackIndex,
    settings.autoAdvanceTracks,
    sleepOnChapterEnd,
    loadAndStreamTrack,
  ]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    void setupMediaSession({
      onPlay: togglePlayPause,
      onPause: togglePlayPause,
      onSeekBackward: () => skipBackward(),
      onSeekForward: () => skipForward(),
      onPreviousTrack: prevTrack,
      onNextTrack: nextTrack,
      onSeekTo: (seconds) => seekTo(seconds),
    }).then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      cleanup?.();
    };
  }, [togglePlayPause, skipBackward, skipForward, prevTrack, nextTrack, seekTo]);

  useEffect(() => {
    if (!currentBook) {
      void updateMediaMetadata(null);
      return;
    }

    const trackTitle = currentTrack?.name.replace(/\.(mp3|m4b)$/i, "") || currentBook.title;

    void updateMediaMetadata({
      title: trackTitle,
      artist: currentBook.author || "Unknown Author",
      album: currentBook.title,
      artworkUrl: currentBook.cover,
    });
  }, [currentBook, currentTrack]);

  useEffect(() => {
    void updateMediaPlaybackState(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    if (duration > 0) {
      void updateMediaPositionState(duration, playbackRate, currentTime);
    }
  }, [duration, playbackRate, currentTime]);

  const playbackValue = useMemo<PlayerPlaybackContextType>(
    () => ({
      currentBook,
      currentTrack,
      currentTrackIndex,
      isPlaying,
      isLoading,
      playbackRate,
      volume,
      isMuted,
      streamStatus,
      sleepTimerRemaining,
      sleepOnChapterEnd,
      playBook,
      launchExternalPlayer,
      togglePlayPause,
      seekTo,
      skipForward,
      skipBackward,
      setTrack,
      nextTrack,
      prevTrack,
      setPlaybackRate,
      setVolume,
      toggleMute,
      startSleepTimer,
      cancelSleepTimer,
    }),
    [
      currentBook,
      currentTrack,
      currentTrackIndex,
      isPlaying,
      isLoading,
      playbackRate,
      volume,
      isMuted,
      streamStatus,
      sleepTimerRemaining,
      sleepOnChapterEnd,
      playBook,
      launchExternalPlayer,
      togglePlayPause,
      seekTo,
      skipForward,
      skipBackward,
      setTrack,
      nextTrack,
      prevTrack,
      setPlaybackRate,
      setVolume,
      toggleMute,
      startSleepTimer,
      cancelSleepTimer,
    ],
  );

  const timeValue = useMemo<PlayerTimeContextType>(
    () => ({
      currentTime,
      duration,
    }),
    [currentTime, duration],
  );

  return (
    <PlayerPlaybackContext.Provider value={playbackValue}>
      <PlayerTimeContext.Provider value={timeValue}>
        {children}
        <audio ref={audioRef} preload="metadata" />
      </PlayerTimeContext.Provider>
    </PlayerPlaybackContext.Provider>
  );
}

export function useOptionalAudioPlayback(): PlayerPlaybackContextType | null {
  return useContext(PlayerPlaybackContext);
}

export function useAudioPlayback(): PlayerPlaybackContextType {
  const context = useContext(PlayerPlaybackContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return context;
}

export function useAudioTime(): PlayerTimeContextType {
  const context = useContext(PlayerTimeContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return context;
}

export function useAudioPlayer(): PlayerContextType {
  const playback = useAudioPlayback();
  const time = useAudioTime();
  return useMemo(
    () => ({
      ...playback,
      ...time,
    }),
    [playback, time],
  );
}
