"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { Clock } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { subscribeRecentBooks, getRecentBooksSnapshot, getServerSnapshot } from "../utils/recent";
import { BookCard } from "./book-card";

export function RecentSection() {
  const recentBooks = useSyncExternalStore(
    subscribeRecentBooks,
    getRecentBooksSnapshot,
    getServerSnapshot,
  );

  if (recentBooks.length === 0) {
    return null;
  }

  return (
    <section
      className="mb-6 animate-in duration-300 fade-in slide-in-from-bottom-2 sm:mb-8 md:mb-10"
      id="section-recent"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          <h2 className="m-0 text-base font-bold tracking-tight text-foreground sm:text-lg md:text-xl">
            Recently Played
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Badge asChild variant="outline" className="cursor-pointer">
            <Link
              href="/recent"
              title="View All Recently Played"
              aria-label="View All Recently Played"
            >
              All
            </Link>
          </Badge>
        </div>
      </div>

      <div className="-mx-0.5 -my-0.5 no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-0.5 pt-0.5 pb-2.5 sm:gap-3.5 md:gap-4">
        {recentBooks.map((book) => (
          <div key={book.id} className="w-[136px] flex-none snap-start sm:w-[152px] md:w-[164px]">
            <BookCard book={book} />
          </div>
        ))}
      </div>
    </section>
  );
}
