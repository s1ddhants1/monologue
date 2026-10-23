"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
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
  Download,
  Check,
  FileText,
  Maximize2,
  AudioLines,
} from "@/components/icons";
import { useAudioPlayer } from "../context";
import { formatTime } from "@/lib/utils/format";
import { useUIStore } from "@/stores/ui-store";
import { useSettingsStore } from "@/features/settings";
import { TranscriptButton } from "@/features/transcription";
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

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

export function BottomAudioBar() {
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
  const setTracklistOpen = useUIStore((s) => s.setTracklistOpen);
  const setFullscreenOpen = useUIStore((s) => s.setFullscreenOpen);
  const settings = useSettingsStore((s) => s.settings);
  const isTranscriptConfigured = Boolean(settings.aiApiKey && settings.aiApiKey.trim().length > 0);
  const [isSleepMenuOpen, setIsSleepMenuOpen] = React.useState(false);

  const handleToggleFullscreen = React.useCallback(() => {
    void hapticLight();
    const nextState = !isFullscreenOpen;
    setFullscreenOpen(nextState);
    if (nextState) {
      if (
        typeof document !== "undefined" &&
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (
        typeof document !== "undefined" &&
        document.fullscreenElement &&
        document.exitFullscreen
      ) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isFullscreenOpen, setFullscreenOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        const activeEl = document.activeElement;
        const isInput =
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement ||
          activeEl?.getAttribute("contenteditable") === "true";
        if (!isInput && currentBook) {
          e.preventDefault();
          handleToggleFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentBook, handleToggleFullscreen]);

  if (!currentBook) return null;

  const totalFiles = currentBook.files?.length || 1;
  const isMultiPart = totalFiles > 1;

  const handleDownloadCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentBook) return;
    void hapticSuccess();
    const track = currentTrack || currentBook.files?.[0];
    const fileName = track?.name || `${currentBook.title}.mp3`;
    const trackerParams =
      currentBook.trackers && currentBook.trackers.length > 0
        ? "&" + currentBook.trackers.map((tr) => `tr=${encodeURIComponent(tr)}`).join("&")
        : "";
    const streamEndpoint =
      settings.streamingMode === "bridge" && settings.bridgeUrl
        ? `${settings.bridgeUrl}/stream?infoHash=${currentBook.infoHash}&file=${encodeURIComponent(fileName)}&track=${currentTrackIndex}${trackerParams}`
        : `/api/stream?infoHash=${currentBook.infoHash}&file=${encodeURIComponent(fileName)}&track=${currentTrackIndex}${trackerParams}`;

    const link = document.createElement("a");
    link.href = streamEndpoint;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <footer
      className="fixed inset-x-3 bottom-3 z-40 flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-background/95 backdrop-blur-2xl transition-all duration-200 sm:inset-x-6 sm:bottom-4 md:right-6 md:bottom-5 md:left-[calc(var(--sidebar-width,15rem)+1.5rem)] lg:mx-auto lg:max-w-5xl"
      role="region"
      aria-label="Audio player"
    >
      <div className="flex h-[76px] w-full items-center justify-between gap-3 px-3.5 sm:h-[80px] sm:px-5">
        <div
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 select-none sm:w-60 sm:flex-none md:w-64"
          onClick={() => {
            void hapticLight();
            setFullscreenOpen(true);
          }}
        >
          <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-muted/30 sm:size-12">
            <Image
              src={currentBook.cover || "/placeholder-cover.svg"}
              alt={currentBook.title}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            <Link
              href={`/book/${currentBook.id}`}
              className="truncate text-xs font-bold tracking-tight text-foreground transition-colors hover:text-primary hover:underline sm:text-sm"
              title={currentBook.title}
              onClick={(e) => {
                e.stopPropagation();
                void hapticLight();
              }}
            >
              {currentBook.title}
            </Link>
            <div className="mt-0.5 flex min-h-[16px] min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className="truncate"
                title={
                  isMultiPart && currentTrack
                    ? `Part ${currentTrackIndex + 1}/${totalFiles}: ${currentTrack.name}`
                    : currentBook.author || "Audiobook"
                }
              >
                {isMultiPart && currentTrack
                  ? `Part ${currentTrackIndex + 1}/${totalFiles} · ${currentTrack.name}`
                  : currentBook.author || "Audiobook"}
              </span>
              <div
                className={`hidden h-2.5 w-4 shrink-0 items-center justify-center transition-opacity duration-200 sm:inline-flex ${
                  !isLoading && isPlaying ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <AudioLines className="size-3.5 animate-pulse text-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-center sm:mx-auto sm:max-w-md sm:flex-1 sm:flex-col">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              type="button"
              id="seek-back-btn"
              variant="ghost"
              size="icon"
              onClick={() => skipBackward(15)}
              title="Jump back 15s"
              className="hidden sm:inline-flex"
            >
              <RotateCcw size={15} />
            </Button>

            <Button
              type="button"
              id="prev-btn"
              variant="ghost"
              size="icon"
              onClick={prevTrack}
              disabled={!isMultiPart || currentTrackIndex === 0}
              title="Previous Chapter"
              className="hidden sm:inline-flex"
            >
              <SkipBack size={15} />
            </Button>

            <Button
              type="button"
              id="play-pause-btn"
              variant="default"
              size="icon"
              onClick={togglePlayPause}
              disabled={isLoading}
              title={isPlaying ? "Pause" : "Play"}
              className="rounded-full"
            >
              <span className="inline-flex size-5 shrink-0 items-center justify-center">
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                )}
              </span>
            </Button>

            <Button
              type="button"
              id="next-btn"
              variant="ghost"
              size="icon"
              onClick={nextTrack}
              disabled={!isMultiPart || currentTrackIndex >= totalFiles - 1}
              title="Next Chapter"
              className="hidden sm:inline-flex"
            >
              <SkipForward size={15} />
            </Button>

            <Button
              type="button"
              id="seek-fwd-btn"
              variant="ghost"
              size="icon"
              onClick={() => skipForward(30)}
              title="Jump forward 30s"
              className="hidden sm:inline-flex"
            >
              <RotateCw size={15} />
            </Button>
          </div>

          <div className="hidden w-full items-center gap-2 font-mono text-[11px] text-muted-foreground select-none md:flex">
            <span id="current-time" className="w-10 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>
            <Slider
              id="progress-bar"
              value={[currentTime]}
              max={duration > 0 ? duration : 100}
              min={0}
              step={1}
              onValueChange={([val]) => seekTo(val)}
              className="group/player relative flex h-3 flex-1 cursor-pointer touch-none items-center select-none"
              aria-label="Progress scrubber"
            />
            <span id="total-duration" className="w-10 text-left tabular-nums">
              {duration > 0 ? formatTime(duration) : "--:--"}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 items-center justify-end gap-1 sm:flex sm:w-60 sm:flex-col sm:items-end sm:justify-center md:w-64">
          <div className="flex items-center justify-end gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  id="speed-btn"
                  variant="ghost"
                  size="icon-sm"
                  title={`Speed: ${playbackRate}x`}
                  className="font-mono text-xs"
                >
                  {playbackRate}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuGroup>
                  {SPEED_OPTIONS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => {
                        void hapticLight();
                        setPlaybackRate(speed);
                      }}
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

            {isTranscriptConfigured && (
              <TranscriptButton
                trackKey={`${currentBook.infoHash}-${currentTrackIndex}`}
                audioUrl={
                  settings.streamingMode === "bridge" && settings.bridgeUrl
                    ? `${settings.bridgeUrl}/stream?infoHash=${currentBook.infoHash}&file=${encodeURIComponent(
                        (currentTrack || currentBook.files?.[0])?.name ||
                          `${currentBook.title}.mp3`,
                      )}&track=${currentTrackIndex}`
                    : `/api/stream?infoHash=${currentBook.infoHash}&file=${encodeURIComponent(
                        (currentTrack || currentBook.files?.[0])?.name ||
                          `${currentBook.title}.mp3`,
                      )}&track=${currentTrackIndex}`
                }
                bookTitle={currentBook.title}
                trackName={
                  (currentTrack || currentBook.files?.[0])?.name || `Track ${currentTrackIndex + 1}`
                }
                infoHash={currentBook.infoHash}
                trackIndex={currentTrackIndex}
                variant="ghost"
                size="icon-sm"
              >
                <FileText size={16} />
              </TranscriptButton>
            )}

            <Button
              type="button"
              id="download-current-btn"
              variant="ghost"
              size="icon-sm"
              onClick={handleDownloadCurrent}
              title={`Download ${currentTrack?.name || currentBook.title}`}
              aria-label="Download audio file"
            >
              <Download size={16} />
            </Button>

            <DropdownMenu open={isSleepMenuOpen} onOpenChange={setIsSleepMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  id="sleep-timer-btn"
                  variant={sleepTimerRemaining || sleepOnChapterEnd ? "secondary" : "ghost"}
                  size="icon-sm"
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
                >
                  <Clock size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs">Sleep Timer</DropdownMenuLabel>
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
                        className="text-destructive focus:text-destructive"
                      >
                        <span>Turn off</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              id="queue-btn"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                void hapticLight();
                setTracklistOpen(true);
              }}
              title="Chapters & Queue"
            >
              <List size={18} />
            </Button>

            <Button
              type="button"
              id="fullscreen-btn"
              variant="ghost"
              size="icon-sm"
              onClick={handleToggleFullscreen}
              title="Fullscreen (F)"
              aria-label="Toggle fullscreen"
            >
              <Maximize2 size={16} />
            </Button>
          </div>

          <div className="hidden w-full items-center justify-end gap-1.5 sm:flex">
            <Button
              type="button"
              id="volume-btn"
              variant="ghost"
              size="icon-sm"
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </Button>
            <Slider
              id="volume-bar"
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={([val]) => setVolume(val / 100)}
              className="w-20 cursor-pointer"
              aria-label="Volume slider"
            />
          </div>
        </div>
      </div>

      <div
        id="mobile-progress-bar"
        className="relative h-1 w-full cursor-pointer overflow-hidden bg-white/10 md:hidden"
        role="progressbar"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration > 0 ? duration : 100)}
        aria-label="Playback progress"
        onClick={(e) => {
          e.stopPropagation();
          if (duration > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            seekTo(pct * duration);
          }
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          if (duration > 0 && e.touches[0]) {
            const rect = e.currentTarget.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            const pct = Math.max(0, Math.min(1, touchX / rect.width));
            seekTo(pct * duration);
          }
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
          if (duration > 0 && e.touches[0]) {
            const rect = e.currentTarget.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            const pct = Math.max(0, Math.min(1, touchX / rect.width));
            seekTo(pct * duration);
          }
        }}
      >
        <div
          className="h-full bg-primary transition-all duration-150 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </footer>
  );
}
