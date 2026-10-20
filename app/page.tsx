import React from "react";
import Link from "next/link";
import { Flame, Compass } from "@/components/icons";
import {
  getLatestAudiobooks,
  getCuratedFallbackAudiobooks,
  BookCard,
  RecentSection,
  HeroSpotlight,
} from "@/features/audiobooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export const revalidate = 300;

export default async function HomePage() {
  const [latestData, fallbackBooks] = await Promise.all([
    getLatestAudiobooks(1),
    getCuratedFallbackAudiobooks(),
  ]);

  const latestBooks = latestData.results;
  const spotlightBooks = fallbackBooks.length > 0 ? fallbackBooks : latestBooks.slice(0, 5);

  return (
    <div className="pb-6" id="page-home">
      {spotlightBooks.length > 0 && <HeroSpotlight books={spotlightBooks} />}

      <RecentSection />

      <section className="mb-8" id="section-latest">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-primary" />
            <h2 className="m-0 text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Latest Additions
            </h2>
          </div>
          <Badge
            asChild
            variant="outline"
            className="cursor-pointer border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <Link
              href="/explore"
              title="View All Latest Additions"
              aria-label="View All Latest Additions"
            >
              All
            </Link>
          </Badge>
        </div>

        {latestBooks.length === 0 ? (
          <Empty className="border border-border/80 bg-card/60 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Compass size={24} className="text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No audiobooks available</EmptyTitle>
              <EmptyDescription>
                We could not load the latest additions right now. Try refreshing the feed.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="default" size="sm">
                <Link href="/">Refresh Feed</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-4 md:grid-cols-[repeat(auto-fill,minmax(164px,1fr))] md:gap-5">
            {latestBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
