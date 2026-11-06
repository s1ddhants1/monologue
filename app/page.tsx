import React from "react";
import Link from "next/link";
import { Flame, Compass } from "@/components/icons";
import { getLatestAudiobooks, BookCard, RecentSection } from "@/features/audiobooks";
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
  const latestData = await getLatestAudiobooks(1);
  const latestBooks = latestData.results;

  return (
    <div className="pb-6" id="page-home">
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
            render={
              <Link
                href="/explore"
                title="View All Latest Additions"
                aria-label="View All Latest Additions"
              />
            }
            variant="outline"
            className="cursor-pointer"
          >
            All
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
              <Button render={<Link href="/" />} nativeButton={false} variant="default" size="sm">
                Refresh Feed
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
