"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minimize2, List, FileText, Sparkles } from "@/components/icons";
import { useAudioPlayer } from "../context";
import { useUIStore } from "@/stores/ui-store";
import { useSettingsStore } from "@/features/settings";
import { useTranscriptionStore, transcribeAudio } from "@/features/transcription";
import { composeSegments } from "@/hooks/use-transcript-viewer";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { hapticLight, hapticSuccess } from "@/lib/capacitor";
import { cn } from "@/lib/utils";
import { getStreamUrl } from "../utils/stream-url";
import { PlayerControls } from "./player-controls";
import { TrackScrubber } from "./track-scrubber";
import { SpeedMenu } from "./speed-menu";
import { SleepTimerMenu } from "./sleep-timer-menu";
import { VolumeControl } from "./volume-control";

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
  const setTracklistOpen = useUIStore((s) => s.setTracklistOpen);
  const settings = useSettingsStore((s) => s.settings);

  const { transcripts, setTranscript, openTranscript } = useTranscriptionStore();
  const [sidePanel, setSidePanel] = useState<"none" | "transcript">("none");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  const activeTrackKey = currentBook?.infoHash
    ? `${currentBook.infoHash}-${currentTrackIndex}`
    : "";
  const currentTranscript = activeTrackKey ? transcripts[activeTrackKey] : null;

  const handleClose = useCallback(() => {
    void hapticLight();
    setFullscreenOpen(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [setFullscreenOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreenOpen) return;

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      switch (e.code) {
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
        case "Space":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipBackward(15);
          break;
        case "ArrowRight":
          e.preventDefault();
          skipForward(15);
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        case "KeyF":
          e.preventDefault();
          handleClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenOpen, handleClose, togglePlayPause, skipBackward, skipForward, toggleMute]);

  const { words } = useMemo(() => {
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

  const currentAudioUrl = currentBook.infoHash
    ? getStreamUrl(
        currentBook.infoHash,
        (currentTrack || currentBook.files?.[0])?.name || `${currentBook.title}.mp3`,
        currentTrackIndex,
        currentBook.trackers,
      )
    : "";

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
        byok: {
          provider: settings.aiProvider,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
          baseURL: settings.aiBaseUrl || undefined,
        },
      });

      void hapticSuccess();
      setTranscript(
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
      id="fullscreen-player"
      className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur-2xl transition-all duration-300 ease-out"
    >
      <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-border/60 px-5 pt-[env(safe-area-inset-top)] sm:px-8">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-semibold">
            Now Playing
          </Badge>
          {isMultiPart && (
            <span className="text-xs text-muted-foreground">
              Part {currentTrackIndex + 1} of {totalFiles}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentBook.infoHash && (
            <Button
              type="button"
              variant={sidePanel === "transcript" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                void hapticLight();
                setSidePanel((p) => (p === "transcript" ? "none" : "transcript"));
              }}
              className="gap-1.5 text-xs"
            >
              <FileText size={15} />
              <span className="hidden sm:inline">Transcript</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void hapticLight();
              setTracklistOpen(true);
            }}
            className="gap-1.5 text-xs"
          >
            <List size={15} />
            <span className="hidden sm:inline">Tracklist</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            title="Minimize (Esc)"
            className="size-9 rounded-full"
          >
            <Minimize2 size={18} />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center [justify-content:safe_center] overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-10 lg:flex-row lg:gap-12">
        <div
          className={cn(
            "flex w-full flex-col items-center justify-center transition-all duration-300",
            isSidePanelActive ? "lg:max-w-md xl:max-w-lg" : "max-w-xl",
          )}
        >
          <div className="relative mb-8 w-48 shrink-0 sm:w-64 md:w-72 lg:w-80">
            <AspectRatio
              ratio={1}
              className="relative flex items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-muted/40 shadow-2xl"
            >
              <Image
                src={currentBook.cover || "/placeholder-cover.svg"}
                alt=""
                fill
                sizes="(max-width: 640px) 192px, (max-width: 768px) 256px, 320px"
                className="pointer-events-none scale-110 object-cover opacity-25 blur-2xl"
                aria-hidden="true"
              />
              <Image
                src={currentBook.cover || "/placeholder-cover.svg"}
                alt={currentBook.title}
                fill
                sizes="(max-width: 640px) 192px, (max-width: 768px) 256px, 320px"
                className="relative z-10 size-full object-contain p-2 drop-shadow-xl"
                priority
              />
            </AspectRatio>
          </div>

          <div className="mb-8 w-full max-w-md text-center">
            <Link
              href={`/book/${currentBook.id}`}
              onClick={handleClose}
              className="block truncate text-lg font-bold tracking-tight text-foreground transition-colors hover:text-primary sm:text-2xl"
              title={currentBook.title}
            >
              {currentBook.title}
            </Link>
            <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
              {currentBook.author || "Audiobook"}
            </p>
            {isMultiPart && currentTrack && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                {currentTrack.name}
              </p>
            )}
          </div>

          <div className="flex w-full max-w-md flex-col items-center gap-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <SpeedMenu
                playbackRate={playbackRate}
                onSelectRate={setPlaybackRate}
                align="start"
                size="sm"
                className="h-9 rounded-xl px-2.5 font-mono text-xs text-muted-foreground"
              />

              <PlayerControls
                isPlaying={isPlaying}
                isLoading={isLoading}
                isMultiPart={isMultiPart}
                canPrevTrack={currentTrackIndex > 0}
                canNextTrack={currentTrackIndex < totalFiles - 1}
                onTogglePlayPause={togglePlayPause}
                onSkipBackward={() => skipBackward(15)}
                onSkipForward={() => skipForward(15)}
                onPrevTrack={prevTrack}
                onNextTrack={nextTrack}
                size="large"
              />

              <SleepTimerMenu
                sleepTimerRemaining={sleepTimerRemaining}
                sleepOnChapterEnd={sleepOnChapterEnd}
                isMultiPart={isMultiPart}
                onStartTimer={startSleepTimer}
                onCancelTimer={cancelSleepTimer}
                size="sm"
                align="end"
                className="h-9 rounded-xl px-2.5 text-xs text-muted-foreground"
              />
            </div>

            <TrackScrubber
              currentTime={currentTime}
              duration={duration}
              onSeek={seekTo}
              layout="stacked"
              className="max-w-md"
            />

            <div className="flex w-full max-w-md items-center justify-center pt-1">
              <VolumeControl
                volume={volume}
                isMuted={isMuted}
                onToggleMute={toggleMute}
                onVolumeChange={setVolume}
                sliderClassName="w-32 cursor-pointer sm:w-44"
                buttonSize="icon"
                iconSize={16}
                className="gap-2.5 text-muted-foreground"
              />
            </div>

            <div className="hidden items-center justify-center gap-3 pt-2 text-xs text-muted-foreground/70 sm:flex">
              <span className="inline-flex items-center gap-1">
                <Kbd>Space</Kbd> Play/Pause
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd>&larr;</Kbd>
                <Kbd>&rarr;</Kbd> Seek
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd>M</Kbd> Mute
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd>Esc</Kbd> Minimize
              </span>
            </div>
          </div>
        </div>

        {currentBook.infoHash && sidePanel === "transcript" && (
          <Card className="flex h-full max-h-[50vh] min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-5 backdrop-blur-xl sm:p-7 lg:max-h-full lg:w-auto">
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 pb-3.5">
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
                  className="text-xs"
                >
                  Modal View
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    void hapticLight();
                    setSidePanel("none");
                  }}
                  className="size-7 rounded-full text-muted-foreground"
                >
                  <Minimize2 size={14} />
                </Button>
              </div>
            </div>

            <div
              ref={transcriptScrollRef}
              className="relative min-h-0 flex-1 overflow-y-auto pt-6 pr-3 pb-12 select-text"
            >
              {currentTranscript ? (
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-2 leading-relaxed">
                  {words.length > 0 ? (
                    words.map((w, idx) => {
                      const isActive = idx === activeWordIndex;
                      const isPast = currentTime >= w.endTime;
                      return (
                        <span
                          key={w.segmentIndex}
                          ref={isActive ? activeWordRef : undefined}
                          onClick={() => {
                            void hapticLight();
                            seekTo(w.startTime);
                          }}
                          className={cn(
                            "cursor-pointer rounded px-0.5 text-sm transition-all sm:text-base",
                            isActive
                              ? "bg-primary font-bold text-primary-foreground shadow-sm"
                              : isPast
                                ? "font-medium text-foreground"
                                : "text-muted-foreground/50 hover:text-foreground",
                          )}
                        >
                          {w.text}
                        </span>
                      );
                    })
                  ) : (
                    <p className="text-sm leading-relaxed text-foreground">
                      {currentTranscript.transcript.text}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center">
                  <Empty className="border-0 bg-transparent py-4">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FileText className="size-6 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm">No Transcript Available</EmptyTitle>
                      <EmptyDescription className="text-xs">
                        Generate synchronized captions for this chapter using your AI API key.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        type="button"
                        onClick={handleTranscribeSide}
                        disabled={isTranscribing}
                        size="sm"
                        className="gap-2 text-xs"
                      >
                        {isTranscribing ? (
                          <>
                            <Spinner className="size-3.5" />
                            Transcribing...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            {settings.aiApiKey ? "Transcribe Now" : "Configure AI Key"}
                          </>
                        )}
                      </Button>
                      {transcribeError && (
                        <p className="mt-2 text-center text-xs text-destructive">
                          {transcribeError}
                        </p>
                      )}
                    </EmptyContent>
                  </Empty>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
