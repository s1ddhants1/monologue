"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  List,
  Clock,
  Loader2,
  FileText,
  Check,
  Sparkles,
} from "@/components/icons";
import { useAudioPlayer } from "../context";
import { formatTime } from "@/lib/utils/format";
import { useUIStore } from "@/stores/ui-store";
import { useSettingsStore } from "@/features/settings";
import { useTranscriptionStore, transcribeAudio } from "@/features/transcription";
import { composeSegments, type TranscriptWord } from "@/hooks/use-transcript-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { hapticLight, hapticSuccess } from "@/lib/capacitor";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

export function FullscreenPlayer() {
  const {
    currentBook,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    sleepTimerRemaining,
    sleepOnChapterEnd,
    togglePlayPause,
    seekTo,
    skipForward,
    skipBackward,
    nextTrack,
    prevTrack,
    setPlaybackRate,
    setVolume,
    toggleMute,
    startSleepTimer,
    cancelSleepTimer,
  } = useAudioPlayer();

  const isFullscreenOpen = useUIStore((s) => s.isFullscreenOpen);
  const setFullscreenOpen = useUIStore((s) => s.setFullscreenOpen);
  const isTracklistOpen = useUIStore((s) => s.isTracklistOpen);
  const setTracklistOpen = useUIStore((s) => s.setTracklistOpen);
  const settings = useSettingsStore((s) => s.settings);
  const isTranscriptConfigured = Boolean(settings.aiApiKey && settings.aiApiKey.trim().length > 0);

  const transcripts = useTranscriptionStore((s) => s.transcripts);
  const openTranscript = useTranscriptionStore((s) => s.openTranscript);
  const setCachedTranscript = useTranscriptionStore((s) => s.setTranscript);

  const [sidePanel, setSidePanel] = useState<"transcript" | "none">("none");
  const [isSleepMenuOpen, setIsSleepMenuOpen] = useState(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => {
    void hapticLight();
    setFullscreenOpen(false);
    if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [setFullscreenOpen]);

  const resetIdleTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isFullscreenOpen) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreenOpen) {
        setFullscreenOpen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isFullscreenOpen, setFullscreenOpen]);

  useEffect(() => {
    if (!isFullscreenOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute("contenteditable") === "true";

      if (isInput) return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleClose();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipBackward(15);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skipForward(30);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (isTranscriptConfigured && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        setSidePanel((prev) => (prev === "transcript" ? "none" : "transcript"));
      } else if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        void hapticLight();
        setTracklistOpen(!isTracklistOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isFullscreenOpen,
    handleClose,
    togglePlayPause,
    skipBackward,
    skipForward,
    setVolume,
    volume,
    toggleMute,
    isTranscriptConfigured,
    isTracklistOpen,
    setTracklistOpen,
  ]);

  useEffect(() => {
    if (!isFullscreenOpen) return;

    const handleMouseMove = () => resetIdleTimer();
    const handleTouchStart = () => resetIdleTimer();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchStart);

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isFullscreenOpen, resetIdleTimer, isPlaying]);

  const activeTrackKey = currentBook ? `${currentBook.infoHash}-${currentTrackIndex}` : "";
  const currentTranscript = transcripts[activeTrackKey];

  const { segments, words } = useMemo(() => {
    if (!currentTranscript?.transcript?.alignment) {
      return { segments: [], words: [] };
    }
    return composeSegments(currentTranscript.transcript.alignment, { hideAudioTags: true });
  }, [currentTranscript]);

  const activeWordIndex = useMemo(() => {
    if (!words.length) return -1;
    return words.findIndex((w) => currentTime >= w.startTime && currentTime < w.endTime);
  }, [words, currentTime]);

  useEffect(() => {
    if (activeWordRef.current && transcriptScrollRef.current && isPlaying) {
      const container = transcriptScrollRef.current;
      const word = activeWordRef.current;
      const targetTop =
        word.offsetTop - container.offsetTop - container.clientHeight / 2 + word.clientHeight / 2;
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    }
  }, [activeWordIndex, isPlaying]);

  if (!isFullscreenOpen || !currentBook) return null;

  const totalFiles = currentBook.files?.length || 1;
  const isMultiPart = totalFiles > 1;

  const trackerParams =
    currentBook.trackers && currentBook.trackers.length > 0
      ? "&" + currentBook.trackers.map((tr) => `tr=${encodeURIComponent(tr)}`).join("&")
      : "";

  const currentAudioUrl =
    settings.streamingMode === "bridge" && settings.bridgeUrl
      ? `${settings.bridgeUrl}/stream?infoHash=${currentBook.infoHash}&file=${encodeURIComponent(
          (currentTrack || currentBook.files?.[0])?.name || `${currentBook.title}.mp3`,
        )}&track=${currentTrackIndex}${trackerParams}`
      : `/api/stream?infoHash=${currentBook.infoHash}&file=${encodeURIComponent(
          (currentTrack || currentBook.files?.[0])?.name || `${currentBook.title}.mp3`,
        )}&track=${currentTrackIndex}${trackerParams}`;

  const handleTranscribeSide = async () => {
    if (!settings.aiApiKey) {
      openTranscript({
        trackKey: activeTrackKey,
        audioUrl: currentAudioUrl,
        bookTitle: currentBook.title,
        trackName: (currentTrack || currentBook.files?.[0])?.name,
        infoHash: currentBook.infoHash,
        trackIndex: currentTrackIndex,
      });
      return;
    }

    void hapticLight();
    setIsTranscribing(true);
    setTranscribeError(null);

    try {
      const result = await transcribeAudio({
        infoHash: currentBook.infoHash,
        trackIndex: currentTrackIndex,
        audioUrl: currentAudioUrl,
        byok: {
          provider: settings.aiProvider,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
          baseURL: settings.aiBaseUrl || undefined,
        },
      });

      void hapticSuccess();
      setCachedTranscript(
        activeTrackKey,
        result,
        currentAudioUrl,
        currentBook.title,
        (currentTrack || currentBook.files?.[0])?.name,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to transcribe audio";
      setTranscribeError(message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const isSidePanelActive = sidePanel !== "none";

  return (
    <div
      id="full-screen-player-root"
      className="fixed inset-0 z-[45] flex flex-col overflow-hidden bg-black font-sans text-foreground select-none"
      onMouseMove={resetIdleTimer}
    >
      <header
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-end px-5 transition-opacity duration-300 ease-in-out sm:px-8",
          showControls ? "opacity-100" : "opacity-0 hover:opacity-100",
        )}
      >
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2 py-1 backdrop-blur-xl">
          {isTranscriptConfigured && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                void hapticLight();
                setSidePanel((prev) => (prev === "transcript" ? "none" : "transcript"));
              }}
              title="Transcription on the side (L)"
              className={cn(
                "h-8 w-8 cursor-pointer rounded-full transition-colors",
                sidePanel === "transcript"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
              )}
            >
              <FileText size={16} />
            </Button>
          )}

          {isMultiPart && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                void hapticLight();
                setTracklistOpen(!isTracklistOpen);
              }}
              title="Chapter Queue on the side (Q)"
              className={cn(
                "h-8 w-8 cursor-pointer rounded-full transition-colors",
                isTracklistOpen
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
              )}
            >
              <List size={16} />
            </Button>
          )}

          <Button
            type="button"
            id="close-fullscreen-btn"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            title="Exit Fullscreen (Esc or F)"
          >
            <Minimize2 size={16} />
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
        <div
          className={cn(
            "mx-auto flex h-full min-h-0 w-full max-w-7xl items-center justify-center gap-8 lg:gap-14",
            isSidePanelActive ? "flex-col lg:flex-row" : "flex-col",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-col items-center justify-center space-y-4 text-center transition-all duration-300 sm:space-y-5",
              isSidePanelActive
                ? "w-full shrink-0 lg:w-[420px] xl:w-[460px]"
                : "mx-auto w-full max-w-[460px]",
            )}
          >
            <div className="group relative shrink-0">
              <Image
                src={currentBook.cover || "/placeholder-cover.svg"}
                alt={currentBook.title}
                width={400}
                height={400}
                priority
                className={cn(
                  "rounded-3xl border border-white/15 object-cover",
                  isSidePanelActive
                    ? "size-44 sm:size-52 lg:size-56 xl:size-60"
                    : "size-56 sm:size-64 md:size-72 lg:size-80",
                )}
              />
            </div>

            <div className="w-full max-w-md space-y-1">
              <h1 className="line-clamp-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                <Link
                  href={`/book/${currentBook.id}`}
                  onClick={() => {
                    handleClose();
                  }}
                  className="transition-colors hover:text-primary hover:underline"
                >
                  {currentBook.title}
                </Link>
              </h1>
              <p className="truncate text-sm font-medium text-muted-foreground sm:text-base">
                {currentBook.author || "Audiobook"}
              </p>
              {isMultiPart && currentTrack && (
                <p className="truncate font-mono text-xs text-primary">
                  Part {currentTrackIndex + 1}: {currentTrack.name}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => skipBackward(15)}
                title="Jump back 15s (Left Arrow)"
              >
                <RotateCcw size={18} />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={prevTrack}
                disabled={!isMultiPart || currentTrackIndex === 0}
                title="Previous Chapter"
              >
                <SkipBack size={20} />
              </Button>

              <Button
                type="button"
                variant="default"
                size="icon"
                onClick={togglePlayPause}
                disabled={isLoading}
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                className="size-12 rounded-full"
              >
                <span className="inline-flex size-6 shrink-0 items-center justify-center">
                  {isLoading ? (
                    <Loader2 size={22} className="animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={22} fill="currentColor" />
                  ) : (
                    <Play size={22} fill="currentColor" className="ml-0.5" />
                  )}
                </span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={nextTrack}
                disabled={!isMultiPart || currentTrackIndex >= totalFiles - 1}
                title="Next Chapter"
              >
                <SkipForward size={20} />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => skipForward(30)}
                title="Jump forward 30s (Right Arrow)"
              >
                <RotateCw size={18} />
              </Button>
            </div>

            <div className="w-full max-w-md space-y-1.5">
              <Slider
                value={[currentTime]}
                max={duration > 0 ? duration : 100}
                min={0}
                step={1}
                onValueChange={([val]) => seekTo(val)}
                className="group/fs relative flex h-4 cursor-pointer touch-none items-center select-none"
                aria-label="Fullscreen progress scrubber"
              />
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground select-none">
                <span className="w-16 min-w-[56px] shrink-0 text-left tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <span className="w-16 min-w-[56px] shrink-0 text-right tabular-nums">
                  {duration > 0 ? formatTime(duration) : "--:--"}
                </span>
              </div>
            </div>

            <div className="flex w-full max-w-md items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title={`Speed: ${playbackRate}x`}
                      className="h-8 cursor-pointer rounded-lg px-2.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                    >
                      {playbackRate}x
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="min-w-[120px] border-border bg-card"
                  >
                    <DropdownMenuGroup>
                      {SPEED_OPTIONS.map((speed) => (
                        <DropdownMenuItem
                          key={speed}
                          onClick={() => {
                            void hapticLight();
                            setPlaybackRate(speed);
                          }}
                          className="flex cursor-pointer items-center justify-between text-xs"
                        >
                          <span className={speed === 1.0 ? "" : "font-mono"}>
                            {speed === 1.0 ? "Normal" : `${speed}x`}
                          </span>
                          {playbackRate === speed && <Check className="size-3.5 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu open={isSleepMenuOpen} onOpenChange={setIsSleepMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      id="sleep-timer-btn-fs"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void hapticLight();
                        setIsSleepMenuOpen((prev) => !prev);
                      }}
                      title={
                        sleepOnChapterEnd
                          ? "Sleep: End of Chapter"
                          : sleepTimerRemaining
                            ? `Sleep in ${Math.ceil(sleepTimerRemaining / 60)}m`
                            : "Sleep Timer"
                      }
                      className={cn(
                        "h-8 cursor-pointer rounded-lg px-2.5 text-xs transition-colors",
                        sleepTimerRemaining || sleepOnChapterEnd
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
                      )}
                    >
                      <Clock
                        size={14}
                        className={sleepTimerRemaining || sleepOnChapterEnd ? "mr-1.5" : ""}
                      />
                      {sleepOnChapterEnd ? (
                        <span>End of Ch.</span>
                      ) : sleepTimerRemaining ? (
                        <span>{Math.ceil(sleepTimerRemaining / 60)}m</span>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="min-w-[150px] border-border bg-card"
                  >
                    <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                      Sleep Timer
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {[15, 30, 45, 60].map((mins) => (
                        <DropdownMenuItem
                          key={mins}
                          onClick={() => {
                            void hapticLight();
                            setIsSleepMenuOpen(false);
                            startSleepTimer(mins);
                            toast.info("Sleep Timer", {
                              description: `Audio will pause in ${mins} minutes.`,
                            });
                          }}
                          className="flex cursor-pointer items-center justify-between text-xs"
                        >
                          <span>{mins} minutes</span>
                          {!sleepOnChapterEnd &&
                            sleepTimerRemaining !== null &&
                            Math.ceil(sleepTimerRemaining / 60) === mins && (
                              <Check className="size-3.5 text-primary" />
                            )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        onClick={() => {
                          void hapticLight();
                          setIsSleepMenuOpen(false);
                          startSleepTimer("chapter");
                          toast.info("Sleep Timer", {
                            description: "Audio will pause at the end of the current chapter.",
                          });
                        }}
                        className="flex cursor-pointer items-center justify-between text-xs"
                      >
                        <span>End of Chapter</span>
                        {sleepOnChapterEnd && <Check className="size-3.5 text-primary" />}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    {(sleepTimerRemaining !== null || sleepOnChapterEnd) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => {
                              void hapticLight();
                              setIsSleepMenuOpen(false);
                              cancelSleepTimer();
                              toast.info("Sleep Timer", {
                                description: "Sleep timer turned off.",
                              });
                            }}
                            className="flex cursor-pointer items-center justify-between text-xs text-rose-400 focus:text-rose-400"
                          >
                            <span>Turn off</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                  className="size-8 cursor-pointer rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
                >
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={([val]) => setVolume(val / 100)}
                  className="w-24 cursor-pointer"
                  aria-label="Volume slider"
                />
              </div>
            </div>
          </div>

          {isTranscriptConfigured && sidePanel === "transcript" && (
            <div
              id="fad-lyrics-plus-container"
              className="flex h-full max-h-[50vh] min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:p-7 lg:max-h-full lg:w-auto"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                    <Sparkles size={15} className="text-primary" />
                    Transcription
                  </span>
                  {currentTranscript && (
                    <Badge
                      variant="outline"
                      className="border-primary/20 bg-primary/10 py-0 text-[10px] text-primary"
                    >
                      Live Sync
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void hapticLight();
                      openTranscript({
                        trackKey: activeTrackKey,
                        audioUrl: currentAudioUrl,
                        bookTitle: currentBook.title,
                        trackName: (currentTrack || currentBook.files?.[0])?.name,
                        infoHash: currentBook.infoHash,
                        trackIndex: currentTrackIndex,
                      });
                    }}
                    className="h-7 cursor-pointer rounded-lg px-2.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    Full Dialog
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      void hapticLight();
                      setSidePanel("none");
                    }}
                    title="Hide Transcriptions (L)"
                    className="h-7 w-7 cursor-pointer rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    <Minimize2 size={13} />
                  </Button>
                </div>
              </div>

              <div
                ref={transcriptScrollRef}
                className="mt-4 min-h-0 flex-1 overflow-y-auto pr-3 select-text"
              >
                {currentTranscript && segments.length > 0 ? (
                  <div className="space-y-1 py-4 text-lg leading-relaxed font-bold tracking-normal sm:text-xl lg:text-2xl">
                    {segments.map((segment) => {
                      if (segment.kind === "gap") {
                        return (
                          <span
                            key={`gap-${segment.segmentIndex}`}
                            className="whitespace-pre text-white/20"
                          >
                            {segment.text}
                          </span>
                        );
                      }

                      const word = segment as TranscriptWord;
                      const isSpoken = currentTime >= word.endTime;
                      const isCurrent = currentTime >= word.startTime && currentTime < word.endTime;

                      return (
                        <span
                          key={`word-${word.segmentIndex}`}
                          ref={isCurrent ? activeWordRef : undefined}
                          onClick={() => {
                            void hapticLight();
                            seekTo(word.startTime);
                          }}
                          className={cn(
                            "inline-block cursor-pointer rounded-md px-1 py-0.5 transition-colors duration-150 select-text",
                            isCurrent && "bg-primary/20 font-bold text-primary",
                            isSpoken &&
                              !isCurrent &&
                              "text-foreground/90 hover:bg-white/5 hover:text-foreground",
                            !isSpoken && !isCurrent && "text-white/35 hover:text-white/70",
                          )}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="my-auto flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      {isTranscribing ? (
                        <Loader2 size={26} className="animate-spin" />
                      ) : (
                        <Sparkles size={26} />
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {isTranscribing
                        ? "Transcribing Audio..."
                        : "No Transcription on the Side Yet"}
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      {isTranscribing
                        ? `Processing speech segments with ${settings.aiProvider.toUpperCase()} (${settings.aiModel}).`
                        : "Generate real-time word-synchronized transcriptions for this chapter powered by AI SDK."}
                    </p>
                    {transcribeError && (
                      <p className="mt-2 max-w-xs text-xs text-destructive">{transcribeError}</p>
                    )}
                    {!isTranscribing && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTranscribeSide}
                        className="mt-5 flex cursor-pointer items-center gap-2 rounded-full border-primary/40 text-xs text-primary hover:bg-primary/15"
                      >
                        <Sparkles size={14} />
                        <span>Transcribe Chapter</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
