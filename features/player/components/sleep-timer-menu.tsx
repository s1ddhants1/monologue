"use client";

import React from "react";
import { Clock, Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { hapticLight } from "@/lib/capacitor";
import { cn } from "@/lib/utils";

interface SleepTimerMenuProps {
  sleepTimerRemaining: number | null;
  sleepOnChapterEnd: boolean;
  isMultiPart: boolean;
  onStartTimer: (minutes: number | "chapter") => void;
  onCancelTimer: () => void;
  size?: "sm" | "icon" | "icon-sm";
  align?: "start" | "end" | "center";
  className?: string;
}

export function SleepTimerMenu({
  sleepTimerRemaining,
  sleepOnChapterEnd,
  isMultiPart,
  onStartTimer,
  onCancelTimer,
  size = "icon-sm",
  align = "end",
  className,
}: SleepTimerMenuProps) {
  const isTimerActive = sleepTimerRemaining !== null || sleepOnChapterEnd;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={size}
            title={
              isTimerActive
                ? `Sleep timer active (${sleepTimerRemaining !== null ? `${Math.ceil(sleepTimerRemaining / 60)}m` : "End of chapter"})`
                : "Set sleep timer"
            }
            className={cn(
              "cursor-pointer rounded-lg transition-colors",
              isTimerActive && "text-primary hover:text-primary",
              className,
            )}
          />
        }
      >
        <Clock size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {isTimerActive
              ? `Timer active: ${sleepTimerRemaining !== null ? `${Math.ceil(sleepTimerRemaining / 60)} min remaining` : "End of chapter"}`
              : "Sleep timer"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isMultiPart && (
            <DropdownMenuItem
              onClick={() => {
                void hapticLight();
                onStartTimer("chapter");
                toast.success("Sleep timer set", {
                  description: "Playback will pause when this chapter ends",
                });
              }}
              className="flex cursor-pointer items-center justify-between text-xs"
            >
              <span>End of chapter</span>
              {sleepOnChapterEnd && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          )}
          {[15, 30, 45, 60].map((mins) => (
            <DropdownMenuItem
              key={mins}
              onClick={() => {
                void hapticLight();
                onStartTimer(mins);
                toast.success("Sleep timer set", {
                  description: `Playback will pause in ${mins} minutes`,
                });
              }}
              className="flex cursor-pointer items-center justify-between text-xs"
            >
              <span>{mins} minutes</span>
              {sleepTimerRemaining !== null && Math.ceil(sleepTimerRemaining / 60) === mins && (
                <Check className="size-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          {isTimerActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void hapticLight();
                  onCancelTimer();
                  toast.info("Sleep timer turned off");
                }}
                className="cursor-pointer text-xs text-destructive focus:text-destructive"
              >
                Turn off timer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
