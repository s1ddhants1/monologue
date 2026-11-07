"use client";

import React from "react";
import { Play, Pause, AudioLines } from "@/components/icons";
import { AudiobookDetail } from "@/types";
import { useAudioPlayer } from "@/features/player";
import { useUIStore } from "@/stores/ui-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { getTrackDuration } from "../utils";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/capacitor";

export interface TracklistInspectorProps {
  book?: AudiobookDetail;
  isDrawer?: boolean;
}

export function TracklistInspector({ book: propBook, isDrawer = false }: TracklistInspectorProps) {
  const isMobile = useIsMobile();
  const {
    currentBook,
    currentTrackIndex,
    isPlaying,
    setTrack,
    playBook,
    togglePlayPause,
    duration: currentPlaybackDuration,
  } = useAudioPlayer();
  const isTracklistOpen = useUIStore((s) => s.isTracklistOpen);
  const setTracklistOpen = useUIStore((s) => s.setTracklistOpen);

  const targetBook = propBook || currentBook;

  if (!targetBook) return null;

  const audioFiles = targetBook.files || [];
  const isCurrentlyPlayingThisBook = currentBook?.id === targetBook.id;

  const handleSelectTrack = (index: number) => {
    void hapticLight();
    if (!isCurrentlyPlayingThisBook) {
      playBook(targetBook, index);
    } else if (currentTrackIndex === index) {
      togglePlayPause();
    } else {
      setTrack(index);
    }
    if (isDrawer) {
      setTracklistOpen(false);
    }
  };

  const trackListElement = (
    <div className="flex flex-col divide-y divide-border/30">
      {audioFiles.map((file, idx) => {
        const isCurrent = isCurrentlyPlayingThisBook && currentTrackIndex === idx;

        let displayName = file.name;
        displayName = displayName.replace(
          /\.(mp3|m4b|m4a|aac|flac|ogg|oga|opus|wav|wma|webm|alac|aiff)$/i,
          "",
        );

        const trackDuration = getTrackDuration(
          file,
          targetBook,
          isCurrent,
          currentPlaybackDuration,
        );

        return (
          <div
            key={file.name || idx}
            onClick={() => handleSelectTrack(idx)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelectTrack(idx);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`${isCurrent && isPlaying ? "Pause" : "Play"} ${displayName}`}
            className={cn(
              "group/song flex cursor-pointer items-center justify-between gap-3 rounded-xl p-2.5 transition-colors select-none hover:bg-muted/50 sm:p-3",
              isCurrent && "border-l-2 border-primary bg-secondary/80 font-medium text-foreground",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover/song:bg-primary group-hover/song:text-primary-foreground">
                {isCurrent && isPlaying ? (
                  <>
                    <AudioLines className="size-4 animate-pulse text-primary group-hover/song:invisible" />
                    <Pause className="invisible absolute size-4 group-hover/song:visible" />
                  </>
                ) : isCurrent ? (
                  <Play className="size-3.5 fill-current text-primary" />
                ) : (
                  <>
                    <span className="font-mono text-xs tabular-nums group-hover/song:invisible">
                      {idx + 1}
                    </span>
                    <Play className="invisible absolute size-3.5 fill-current group-hover/song:visible" />
                  </>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-sm leading-snug break-words",
                    isCurrent ? "font-semibold text-primary" : "text-foreground",
                  )}
                >
                  {displayName}
                </div>
              </div>
            </div>

            <div className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {trackDuration}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!isDrawer) {
    return (
      <Card
        className="track-list gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-1 sm:p-2"
        id="album-detail-tracklist"
      >
        {trackListElement}
      </Card>
    );
  }

  if (isMobile) {
    return (
      <Drawer open={isTracklistOpen} onOpenChange={setTracklistOpen}>
        <DrawerContent className="z-[70] max-h-[90vh] border-border bg-card p-4">
          <DrawerHeader className="border-b border-border/60 pb-3 text-left">
            <DrawerTitle className="text-sm font-semibold text-foreground">
              Chapter Queue
            </DrawerTitle>
            <DrawerDescription className="truncate text-xs text-muted-foreground">
              {targetBook.title}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden pt-2">
            <ScrollArea className="h-[75vh] pr-1">{trackListElement}</ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isTracklistOpen} onOpenChange={setTracklistOpen}>
      <SheetContent
        side="right"
        className="z-[70] flex flex-col gap-0 border-border bg-card p-4 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/60 pb-3 text-left">
          <SheetTitle className="text-sm font-semibold text-foreground">Chapter Queue</SheetTitle>
          <SheetDescription className="truncate text-xs text-muted-foreground">
            {targetBook.title}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden pt-2">
          <ScrollArea className="h-[calc(100vh-140px)] pr-1">{trackListElement}</ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
