"use client";

import React from "react";
import { Volume2, VolumeX } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  className?: string;
  sliderClassName?: string;
  buttonSize?: "icon" | "icon-sm";
  iconSize?: number;
}

export function VolumeControl({
  volume,
  isMuted,
  onToggleMute,
  onVolumeChange,
  className,
  sliderClassName = "w-20 cursor-pointer",
  buttonSize = "icon-sm",
  iconSize = 14,
}: VolumeControlProps) {
  const isSilent = isMuted || volume === 0;

  const handleValueChange = (val: number | readonly number[]) => {
    const numericValue = Array.isArray(val) ? val[0] : val;
    if (typeof numericValue === "number") {
      onVolumeChange(numericValue / 100);
    }
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        type="button"
        id="volume-btn"
        variant="ghost"
        size={buttonSize}
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isSilent ? <VolumeX size={iconSize} /> : <Volume2 size={iconSize} />}
      </Button>
      <Slider
        id="volume-bar"
        value={[isSilent ? 0 : volume * 100]}
        max={100}
        step={1}
        onValueChange={handleValueChange}
        className={sliderClassName}
        aria-label="Volume slider"
      />
    </div>
  );
}
