"use client";

import React from "react";
import { Play, Pause, RotateCcw, RotateCw, SkipBack, SkipForward } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  isMultiPart: boolean;
  canPrevTrack: boolean;
  canNextTrack: boolean;
  onTogglePlayPause: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  size?: "compact" | "large";
  className?: string;
}

export function PlayerControls({
  isPlaying,
  isLoading,
  isMultiPart,
  canPrevTrack,
  canNextTrack,
  onTogglePlayPause,
  onSkipBackward,
  onSkipForward,
  onPrevTrack,
  onNextTrack,
  size = "compact",
  className,
}: PlayerControlsProps) {
  const isLarge = size === "large";

  return (
    <div
      className={cn("flex items-center", isLarge ? "gap-4 sm:gap-6" : "gap-1 sm:gap-2", className)}
    >
      <Button
        type="button"
        id="seek-back-btn"
        variant="ghost"
        size="icon"
        onClick={onSkipBackward}
        title="Jump back 15s"
        className={cn(isLarge ? "size-10" : "hidden sm:inline-flex")}
      >
        <RotateCcw size={isLarge ? 18 : 15} />
      </Button>

      <Button
        type="button"
        id="prev-btn"
        variant="ghost"
        size="icon"
        onClick={onPrevTrack}
        disabled={!isMultiPart || !canPrevTrack}
        title="Previous Chapter"
        className={cn(isLarge ? "size-10" : "hidden sm:inline-flex")}
      >
        <SkipBack size={isLarge ? 20 : 15} />
      </Button>

      <Button
        type="button"
        id="play-pause-btn"
        variant="default"
        size="icon"
        onClick={onTogglePlayPause}
        disabled={isLoading}
        title={isPlaying ? "Pause" : "Play"}
        className={cn("rounded-full", isLarge ? "size-12" : "size-9 sm:size-10")}
      >
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center",
            isLarge ? "size-6" : "size-5",
          )}
        >
          {isLoading ? (
            <Spinner className={cn(isLarge ? "size-5" : "size-4")} />
          ) : isPlaying ? (
            <Pause size={isLarge ? 22 : 18} fill="currentColor" />
          ) : (
            <Play size={isLarge ? 22 : 18} fill="currentColor" className="ml-0.5" />
          )}
        </span>
      </Button>

      <Button
        type="button"
        id="next-btn"
        variant="ghost"
        size="icon"
        onClick={onNextTrack}
        disabled={!isMultiPart || !canNextTrack}
        title="Next Chapter"
        className={cn(isLarge ? "size-10" : "hidden sm:inline-flex")}
      >
        <SkipForward size={isLarge ? 20 : 15} />
      </Button>

      <Button
        type="button"
        id="seek-fwd-btn"
        variant="ghost"
        size="icon"
        onClick={onSkipForward}
        title="Jump forward 15s"
        className={cn(isLarge ? "size-10" : "hidden sm:inline-flex")}
      >
        <RotateCw size={isLarge ? 18 : 15} />
      </Button>
    </div>
  );
}
