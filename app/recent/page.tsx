"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { History, Compass, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { useDisclosure } from "@/hooks";
import {
  BookCard,
  getRecentBooksSnapshot,
  getServerSnapshot,
  subscribeRecentBooks,
  clearRecentBooks,
} from "@/features/audiobooks";
import { hapticLight, hapticSuccess } from "@/lib/capacitor";

export default function RecentPage() {
  const books = useSyncExternalStore(
    subscribeRecentBooks,
    getRecentBooksSnapshot,
    getServerSnapshot,
  );
  const { isOpen: isConfirmOpen, open: openConfirm, close: closeConfirm } = useDisclosure();

  const handleOpenConfirm = () => {
    void hapticLight();
    openConfirm();
  };

  const handleConfirmClear = () => {
    void hapticSuccess();
    clearRecentBooks();
    closeConfirm();
  };

  return (
    <div id="page-recent">
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Recent Listening
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Audiobooks you recently listened to or explored.
          </p>
        </div>

        {books.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenConfirm}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            title="Clear listening history"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear History</span>
          </Button>
        )}
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={(open) => !open && closeConfirm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-foreground">
              Clear Listening History
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to clear your listening history? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleConfirmClear}>
              Clear History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {books.length === 0 ? (
        <Empty className="my-12 max-w-md">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="h-14 w-14 rounded-2xl border border-white/10 bg-white/5 text-muted-foreground"
            >
              <History size={28} />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold">No listening history</EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              When you play an audiobook, it will automatically appear here so you can pick up right
              where you left off.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              render={<Link href="/explore" onClick={() => void hapticLight()} />}
              nativeButton={false}
              variant="default"
              className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
            >
              <Compass size={16} />
              <span>Discover Audiobooks</span>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span>
              {books.length} {books.length === 1 ? "title" : "titles"} played
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-4 md:grid-cols-[repeat(auto-fill,minmax(164px,1fr))] md:gap-5">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
