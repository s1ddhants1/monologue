"use client";

import React from "react";
import { Slider } from "@/components/ui/slider";
import { formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface TrackScrubberProps {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  layout?: "inline" | "stacked";
  className?: string;
  sliderClassName?: string;
}

export function TrackScrubber({
  currentTime,
  duration,
  onSeek,
  layout = "inline",
  className,
  sliderClassName,
}: TrackScrubberProps) {
  const max = duration > 0 ? duration : 100;

  const handleValueChange = (val: number | readonly number[]) => {
    const v = Array.isArray(val) ? val[0] : val;
    if (typeof v === "number") onSeek(v);
  };

  if (layout === "stacked") {
    return (
      <div className={cn("flex w-full flex-col gap-1.5", className)}>
        <Slider
          value={[currentTime]}
          max={max}
          min={0}
          step={1}
          onValueChange={handleValueChange}
          className={cn(
            "group/fs relative flex h-4 cursor-pointer touch-none items-center select-none",
            sliderClassName,
          )}
          aria-label="Progress scrubber"
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
    );
  }

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 font-mono text-[11px] text-muted-foreground select-none",
        className,
      )}
    >
      <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
      <Slider
        value={[currentTime]}
        max={max}
        min={0}
        step={1}
        onValueChange={handleValueChange}
        className={cn(
          "group/player relative flex h-3 flex-1 cursor-pointer touch-none items-center select-none",
          sliderClassName,
        )}
        aria-label="Progress scrubber"
      />
      <span className="w-10 text-left tabular-nums">
        {duration > 0 ? formatTime(duration) : "--:--"}
      </span>
    </div>
  );
}
