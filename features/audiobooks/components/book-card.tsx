"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause } from "@/components/icons";
import { Card, CardContent } from "@/components/ui/card";
import { AudiobookSummary } from "@/types";
import { useOptionalAudioPlayback, getBookProgress } from "@/features/player";

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
    <Card className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-2.5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card/90 hover:shadow-xl">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40">
        <Link
          href={`/book/${book.id}`}
          className="block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`View details for ${book.title}`}
        >
          <Image
            src={coverSrc}
            alt={book.title}
            width={320}
            height={320}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Link>

        <button
          type="button"
          onClick={handlePlayClick}
          aria-label={
            isPlayingCurrent
              ? `Pause ${book.title}`
              : isResume
                ? `Resume ${book.title}`
                : `Play ${book.title}`
          }
          title={isPlayingCurrent ? "Pause" : isResume ? "Resume" : "Play"}
          className={`absolute right-2.5 bottom-2.5 z-10 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 ${
            isPlayingCurrent
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100"
          }`}
        >
          {isPlayingCurrent ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

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
