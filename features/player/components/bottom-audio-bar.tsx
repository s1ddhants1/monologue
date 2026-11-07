"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { List, Download, Maximize2, AudioLines, FileText } from "@/components/icons";
import { useAudioPlayer } from "../context";
import { useUIStore } from "@/stores/ui-store";
import { TranscriptButton } from "@/features/transcription";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { hapticLight, hapticSuccess } from "@/lib/capacitor";
import { getStreamUrl } from "../utils/stream-url";
import { PlayerControls } from "./player-controls";
import { TrackScrubber } from "./track-scrubber";
import { SpeedMenu } from "./speed-menu";
import { SleepTimerMenu } from "./sleep-timer-menu";
import { VolumeControl } from "./volume-control";

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

  const handleToggleFullscreen = React.useCallback(() => {
    void hapticLight();
    const nextState = !isFullscreenOpen;
    setFullscreenOpen(nextState);

    if (nextState) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isFullscreenOpen, setFullscreenOpen]);

  if (!currentBook) return null;

  const totalFiles = currentBook.files?.length || 1;
  const isMultiPart = totalFiles > 1;

  const handleDownloadCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentBook) return;
    void hapticSuccess();
    const track = currentTrack || currentBook.files?.[0];
    const fileName = track?.name || `${currentBook.title}.mp3`;
    const streamEndpoint = getStreamUrl(
      currentBook.infoHash,
      fileName,
      currentTrackIndex,
      currentBook.trackers,
    );

    const link = document.createElement("a");
    link.href = streamEndpoint;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const currentAudioUrl = currentBook.infoHash
    ? getStreamUrl(
        currentBook.infoHash,
        (currentTrack || currentBook.files?.[0])?.name || `${currentBook.title}.mp3`,
        currentTrackIndex,
        currentBook.trackers,
      )
    : "";

  return (
    <footer
      className="fixed inset-x-3 bottom-3 z-40 flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-background/95 backdrop-blur-2xl transition-all duration-200 sm:inset-x-6 sm:bottom-4 md:right-6 md:bottom-5 md:left-[calc(var(--sidebar-width,15rem)+1.5rem)] lg:mx-auto lg:max-w-5xl"
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
          <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 sm:size-12">
            <Image
              src={currentBook.cover || "/placeholder-cover.svg"}
              alt=""
              fill
              sizes="48px"
              className="pointer-events-none scale-125 object-cover opacity-25 blur-md"
              aria-hidden="true"
            />
            <Image
              src={currentBook.cover || "/placeholder-cover.svg"}
              alt={currentBook.title}
              fill
              sizes="48px"
              className="relative z-10 size-full object-contain p-0.5"
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
            <SpeedMenu
              playbackRate={playbackRate}
              onSelectRate={setPlaybackRate}
              align="start"
              size="icon-sm"
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
              size="compact"
            />
            <SleepTimerMenu
              sleepTimerRemaining={sleepTimerRemaining}
              sleepOnChapterEnd={sleepOnChapterEnd}
              isMultiPart={isMultiPart}
              onStartTimer={startSleepTimer}
              onCancelTimer={cancelSleepTimer}
              size="icon-sm"
              align="end"
            />
          </div>
          <div className="hidden w-full md:block">
            <TrackScrubber
              currentTime={currentTime}
              duration={duration}
              onSeek={seekTo}
              layout="inline"
            />
          </div>
        </div>

        <div className="hidden shrink-0 items-center justify-end gap-1 sm:flex sm:w-60 sm:flex-col sm:items-end sm:justify-center md:w-64">
          <div className="flex items-center justify-end gap-1">
            {currentBook.infoHash && (
              <TranscriptButton
                trackKey={`${currentBook.infoHash}-${currentTrackIndex}`}
                audioUrl={currentAudioUrl}
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

          <div className="hidden w-full items-center justify-end sm:flex">
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onVolumeChange={setVolume}
              sliderClassName="w-20 cursor-pointer"
              buttonSize="icon-sm"
              iconSize={14}
            />
          </div>
        </div>
      </div>

      <Progress
        id="mobile-progress-bar"
        value={progressPercent}
        className="h-1 w-full cursor-pointer gap-0 rounded-none md:hidden"
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
      />
    </footer>
  );
}
