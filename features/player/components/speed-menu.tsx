"use client";

import React from "react";
import { Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hapticLight } from "@/lib/capacitor";

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

interface SpeedMenuProps {
  playbackRate: number;
  onSelectRate: (rate: number) => void;
  align?: "start" | "end" | "center";
  size?: "sm" | "icon-sm" | "default";
  className?: string;
}

export function SpeedMenu({
  playbackRate,
  onSelectRate,
  align = "end",
  size = "icon-sm",
  className = "font-mono text-xs",
}: SpeedMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            id="speed-btn"
            variant="ghost"
            size={size}
            title={`Speed: ${playbackRate}x`}
            className={className}
          />
        }
      >
        {playbackRate}x
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-32">
        <DropdownMenuGroup>
          {SPEED_OPTIONS.map((speed) => (
            <DropdownMenuItem
              key={speed}
              onClick={() => {
                void hapticLight();
                onSelectRate(speed);
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
  );
}
