"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause, Headphones } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AudiobookSummary } from "@/types";
import { useOptionalAudioPlayback, getBookProgress } from "@/features/player";

export interface HeroSpotlightProps {
  books?: AudiobookSummary[];
  book?: AudiobookSummary;
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

interface HeroSpotlightSlideProps {
  item: AudiobookSummary;
  index: number;
  onPlay: (item: AudiobookSummary) => void;
}

function HeroSpotlightSlide({ item, index, onPlay }: HeroSpotlightSlideProps) {
  const playback = useOptionalAudioPlayback();
  const coverSrc = item.cover || "/placeholder-cover.svg";
  const primaryCategory = item.categories?.[0] || "Audiobook";

  const isCurrent = playback?.currentBook?.id === item.id;
  const isPlayingCurrent = Boolean(isCurrent && playback?.isPlaying);

  const hasSavedProgress = useSyncExternalStore(
    subscribeToStorage,
    () => {
      const saved = getBookProgress(item.id);
      return Boolean(saved && (saved.currentTime > 0 || saved.trackIndex > 0));
    },
    () => false,
  );

  const isResume = isCurrent || hasSavedProgress;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-card/90 via-card/50 to-background p-6 shadow-2xl backdrop-blur-2xl sm:p-8 md:p-10">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col-reverse items-center justify-between gap-6 sm:gap-8 md:flex-row md:gap-12">
        <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
          <h1 className="max-w-2xl text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
            {item.title}
          </h1>

          <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-base">
            {item.author ? `By ${item.author}` : `Genre: ${primaryCategory}`}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Button
              type="button"
              size="lg"
              onClick={() => onPlay(item)}
              aria-label={
                isPlayingCurrent
                  ? `Pause ${item.title}`
                  : isResume
                    ? `Resume ${item.title}`
                    : `Listen now to ${item.title}`
              }
            >
              {isPlayingCurrent ? (
                <Pause size={18} fill="currentColor" className="mr-1.5" />
              ) : (
                <Play size={18} fill="currentColor" className="mr-1.5" />
              )}
              <span>{isPlayingCurrent ? "Pause" : isResume ? "Resume" : "Listen Now"}</span>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/book/${item.id}`}>
                <Headphones size={18} className="mr-1.5 text-muted-foreground" />
                <span>View Details</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative shrink-0">
          <Link
            href={`/book/${item.id}`}
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`View details for ${item.title}`}
          >
            <div className="relative size-44 overflow-hidden rounded-2xl border border-white/15 bg-muted/30 shadow-2xl shadow-black/80 transition-transform duration-500 hover:scale-[1.02] sm:size-56 md:size-64">
              <Image
                src={coverSrc}
                alt={item.title}
                width={320}
                height={320}
                priority={index === 0}
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HeroSpotlight({ books, book }: HeroSpotlightProps) {
  const playback = useOptionalAudioPlayback();

  const displayBooks = useMemo(() => {
    if (books && books.length > 0) return books;
    if (book) return [book];
    return [];
  }, [books, book]);

  const handlePlay = (item: AudiobookSummary) => {
    if (!playback) return;

    if (playback.currentBook?.id === item.id) {
      playback.togglePlayPause();
      return;
    }

    playback.playBook(item);
  };

  if (displayBooks.length === 0) {
    return null;
  }

  return (
    <div className="relative mx-auto mb-8 w-full px-12 sm:px-14" id="section-hero-spotlight">
      <Carousel
        opts={{
          loop: true,
          align: "start",
        }}
        className="w-full"
      >
        <CarouselContent>
          {displayBooks.map((item, index) => (
            <CarouselItem key={item.id}>
              <HeroSpotlightSlide item={item} index={index} onPlay={handlePlay} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
