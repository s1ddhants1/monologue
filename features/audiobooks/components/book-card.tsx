"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AudiobookSummary } from "@/types";
import { useOptionalAudioPlayback, getBookProgress } from "@/features/player";
import { cn } from "@/lib/utils";

export interface BookCardProps {
  book: AudiobookSummary;
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function BookCard({ book }: BookCardProps) {
  const playback = useOptionalAudioPlayback();

  const isCurrentBook = playback?.currentBook?.id === book.id;
  const isPlayingCurrent = Boolean(isCurrentBook && playback?.isPlaying);

  const hasSavedProgress = useSyncExternalStore(
    subscribeToStorage,
    () => {
      const saved = getBookProgress(book.id);
      return Boolean(saved && (saved.currentTime > 0 || saved.trackIndex > 0));
    },
    () => false,
  );

  const isResume = isCurrentBook || hasSavedProgress;
  const coverSrc = book.cover || "/placeholder-cover.svg";
  const authorOrCategory = book.author || book.categories?.[0] || "Audiobook";

  const handlePlayClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!playback) return;

    if (isCurrentBook) {
      playback.togglePlayPause();
      return;
    }

    playback.playBook(book);
  };

  return (
    <Card className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-2.5 transition-colors hover:border-border">
      <AspectRatio
        ratio={1}
        className="relative flex items-center justify-center overflow-hidden rounded-xl bg-muted/40"
      >
        <Image
          src={coverSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 240px"
          className="pointer-events-none scale-110 object-cover opacity-25 blur-xl"
          aria-hidden="true"
        />
        <Link
          href={`/book/${book.id}`}
          className="relative z-10 flex h-full w-full items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`View details for ${book.title}`}
        >
          <Image
            src={coverSrc}
            alt={book.title}
            fill
            sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 240px"
            className="size-full object-contain p-1 drop-shadow-sm"
            loading="lazy"
          />
        </Link>

        <Button
          type="button"
          size="icon"
          variant="default"
          onClick={handlePlayClick}
          aria-label={
            isPlayingCurrent
              ? `Pause ${book.title}`
              : isResume
                ? `Resume ${book.title}`
                : `Play ${book.title}`
          }
          title={isPlayingCurrent ? "Pause" : isResume ? "Resume" : "Play"}
          className={cn(
            "absolute right-2.5 bottom-2.5 z-20 size-9 rounded-full shadow-md transition-all duration-200",
            isPlayingCurrent
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100",
          )}
        >
          {isPlayingCurrent ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" className="ml-0.5" />
          )}
        </Button>
      </AspectRatio>

      <CardContent className="flex flex-1 flex-col justify-between px-0.5 pt-2.5 pb-0">
        <div>
          <div className="line-clamp-1 text-xs font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-sm">
            <Link href={`/book/${book.id}`} title={book.title}>
              {book.title}
            </Link>
          </div>
          <div className="mt-0.5 line-clamp-1 text-[11px] font-medium text-muted-foreground">
            {authorOrCategory}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
