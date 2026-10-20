"use client";

import React, { useSyncExternalStore } from "react";
import { Bookmark, BookmarkCheck } from "@/components/icons";
import { AudiobookSummary } from "@/types";
import { Button } from "@/components/ui/button";
import {
  toggleLibraryBook,
  subscribeLibraryBooks,
  getLibraryBooksSnapshot,
  getLibraryServerSnapshot,
} from "../utils/library";
import { hapticLight } from "@/lib/capacitor";

export interface BookmarkButtonProps {
  book: AudiobookSummary;
  className?: string;
}

export function BookmarkButton({ book, className = "" }: BookmarkButtonProps) {
  const libraryBooks = useSyncExternalStore(
    subscribeLibraryBooks,
    getLibraryBooksSnapshot,
    getLibraryServerSnapshot,
  );

  const isSaved = libraryBooks.some((b) => b.id === book.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void hapticLight();
    toggleLibraryBook(book);
  };

  return (
    <Button
      type="button"
      variant={isSaved ? "secondary" : "outline"}
      onClick={handleToggle}
      className={className}
      title={isSaved ? "Remove from Library" : "Save to Library"}
      aria-label={isSaved ? "Remove from Library" : "Save to Library"}
    >
      <span className="inline-flex size-4 shrink-0 items-center justify-center">
        {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      </span>
      <span>{isSaved ? "Saved" : "Save to Library"}</span>
    </Button>
  );
}
