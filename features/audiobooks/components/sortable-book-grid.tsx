"use client";

import React, { useState, useMemo } from "react";
import { ArrowDown, ArrowUp, SlidersHorizontal } from "@/components/icons";
import { AudiobookSummary } from "@/types";
import { hapticLight } from "@/lib/capacitor";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BookCard } from "./book-card";
import {
  SortOption,
  SortDirection,
  getDefaultSortDirection,
  sortAudiobooks,
} from "../utils/sorting";

export interface SortableBookGridProps {
  books: AudiobookSummary[];
  initialSort?: SortOption;
  initialDirection?: SortDirection;
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "popularity", label: "Popularity" },
  { key: "title", label: "Title" },
  { key: "size", label: "File Size" },
];

export function SortableBookGrid({
  books,
  initialSort = "newest",
  initialDirection,
}: SortableBookGridProps) {
  const [sortOption, setSortOption] = useState<SortOption>(initialSort);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initialDirection ?? getDefaultSortDirection(initialSort),
  );

  const handleSortChange = (newOption: SortOption) => {
    void hapticLight();
    let nextDirection: SortDirection;

    if (newOption === sortOption) {
      nextDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      nextDirection = getDefaultSortDirection(newOption);
    }

    setSortOption(newOption);
    setSortDirection(nextDirection);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("sort", newOption);
      if (nextDirection !== getDefaultSortDirection(newOption)) {
        url.searchParams.set("dir", nextDirection);
      } else {
        url.searchParams.delete("dir");
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  const sortedBooks = useMemo(() => {
    return sortAudiobooks(books, sortOption, sortDirection);
  }, [books, sortOption, sortDirection]);

  if (books.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed border-border bg-card/60 p-12 text-center text-muted-foreground">
        <EmptyHeader>
          <EmptyTitle>No audiobooks found.</EmptyTitle>
          <EmptyDescription>No results match the selected category or filters.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 pt-1 pb-2 sm:flex-row sm:items-center">
        <div className="font-mono text-xs text-muted-foreground">
          {sortedBooks.length} {sortedBooks.length === 1 ? "release" : "releases"}
        </div>

        <div className="no-scrollbar flex snap-x items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="mr-1 hidden items-center gap-1 text-xs text-muted-foreground/80 sm:inline-flex">
            <SlidersHorizontal size={13} />
            Sort:
          </span>

          <ToggleGroup
            value={[sortOption]}
            variant="outline"
            size="sm"
            aria-label="Sort audiobooks"
            className="flex items-center gap-1.5"
          >
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortOption === opt.key;
              return (
                <ToggleGroupItem
                  key={opt.key}
                  value={opt.key}
                  role="button"
                  id={`sort-btn-${opt.key}`}
                  onClick={() => handleSortChange(opt.key)}
                  className="rounded-full"
                  aria-pressed={isActive}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`inline-flex size-3 shrink-0 items-center justify-center transition-opacity duration-150 ${
                      isActive ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                    aria-hidden={!isActive}
                  >
                    {sortDirection === "asc" ? (
                      <ArrowUp size={12} className="shrink-0" />
                    ) : (
                      <ArrowDown size={12} className="shrink-0" />
                    )}
                  </span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-4 md:grid-cols-[repeat(auto-fill,minmax(164px,1fr))] md:gap-5">
        {sortedBooks.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
}
