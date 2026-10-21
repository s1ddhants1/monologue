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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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

  const tableElement = (
    <Table className="w-full">
      <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
        <TableRow className="border-b border-border/40 hover:bg-transparent">
          <TableHead className="w-10 text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            #
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Title
          </TableHead>
          <TableHead className="w-20 text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Duration
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
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
            <TableRow
              key={file.name || idx}
              onClick={() => handleSelectTrack(idx)}
              className={cn(
                "group/song cursor-pointer transition-colors hover:bg-white/5",
                isCurrent &&
                  "border-l-2 border-primary bg-secondary/80 font-medium text-foreground",
              )}
            >
              <TableCell className="w-10 p-2 text-center">
                <div className="flex items-center justify-center">
                  {isCurrent && isPlaying ? (
                    <>
                      <AudioLines className="h-4 w-4 animate-pulse text-primary group-hover/song:invisible sm:h-3.5 sm:w-3.5" />
                      <Pause className="invisible absolute h-4 w-4 text-primary group-hover/song:visible sm:h-3.5 sm:w-3.5" />
                    </>
                  ) : isCurrent ? (
                    <Play className="h-4 w-4 text-primary sm:h-3.5 sm:w-3.5" fill="currentColor" />
                  ) : (
                    <>
                      <span className="font-mono text-xs text-muted-foreground/60 tabular-nums group-hover/song:invisible">
                        {idx + 1}
                      </span>
                      <Play className="invisible absolute h-4 w-4 text-foreground group-hover/song:visible sm:h-3.5 sm:w-3.5" />
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell
                className={cn(
                  "truncate p-2 text-sm",
                  isCurrent ? "font-medium text-primary" : "text-foreground",
                )}
              >
                {displayName}
              </TableCell>
              <TableCell className="w-20 p-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
                {trackDuration}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  if (!isDrawer) {
    return (
      <Card
        className="track-list gap-0 rounded-2xl border border-border/80 bg-card p-2 sm:p-3"
        id="album-detail-tracklist"
      >
        <ScrollArea className="max-h-[60vh] overflow-hidden pr-1 sm:max-h-[600px] [&_[data-slot=scroll-area-viewport]]:max-h-[60vh] [&_[data-slot=scroll-area-viewport]]:overscroll-contain sm:[&_[data-slot=scroll-area-viewport]]:max-h-[600px]">
          {tableElement}
        </ScrollArea>
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
            <ScrollArea className="h-[75vh] pr-1">{tableElement}</ScrollArea>
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
          <ScrollArea className="h-[calc(100vh-140px)] pr-1">{tableElement}</ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
