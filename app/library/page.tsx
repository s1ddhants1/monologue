"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { Library, Compass, Trash2 } from "@/components/icons";
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
  getLibraryBooksSnapshot,
  getLibraryServerSnapshot,
  subscribeLibraryBooks,
  clearLibrary,
} from "@/features/audiobooks";
import { hapticLight, hapticSuccess } from "@/lib/capacitor";

export default function LibraryPage() {
  const books = useSyncExternalStore(
    subscribeLibraryBooks,
    getLibraryBooksSnapshot,
    getLibraryServerSnapshot,
  );
  const { isOpen: isConfirmOpen, open: openConfirm, close: closeConfirm } = useDisclosure();

  const handleOpenConfirm = () => {
    void hapticLight();
    openConfirm();
  };

  const handleConfirmClear = () => {
    void hapticSuccess();
    clearLibrary();
    closeConfirm();
  };

  return (
    <div id="page-library">
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Your Library
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Audiobooks saved to your personal listening collection.
          </p>
        </div>

        {books.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenConfirm}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            title="Clear all saved books"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear Library</span>
          </Button>
        )}
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={(open) => !open && closeConfirm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-foreground">
              Clear Library Collection
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove all saved audiobooks from your library? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleConfirmClear}>
              Clear Library
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
              <Library size={28} />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold">Your library is empty</EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              Save audiobooks to your library from any book page to easily access them anytime.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              asChild
              variant="default"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
            >
              <Link href="/explore" onClick={() => void hapticLight()}>
                <Compass size={16} />
                <span>Explore Audiobooks</span>
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span>
              {books.length} {books.length === 1 ? "audiobook" : "audiobooks"} saved
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
