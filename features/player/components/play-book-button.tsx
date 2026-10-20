"use client";

import React from "react";
import { Play, Pause, Download, Magnet } from "@/components/icons";
import { AudiobookDetail } from "@/types";
import { useAudioPlayback } from "../context";
import { getBookProgress } from "../utils";
import { useSettingsStore } from "@/features/settings";
import { Button } from "@/components/ui/button";
import { hapticLight } from "@/lib/capacitor";

export interface PlayBookButtonProps {
  book: AudiobookDetail;
  children?: React.ReactNode;
  trailingActions?: React.ReactNode;
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function PlayBookButtonComponent({ book, children, trailingActions }: PlayBookButtonProps) {
  const { currentBook, isPlaying, playBook, togglePlayPause } = useAudioPlayback();
  const settings = useSettingsStore((s) => s.settings);

  const isCurrentBook = currentBook?.id === book.id;
  const hasSavedProgress = React.useSyncExternalStore(
    subscribeToStorage,
    () => {
      const saved = getBookProgress(book.id);
      return Boolean(saved && (saved.currentTime > 0 || saved.trackIndex > 0));
    },
    () => false,
  );

  const isResume = isCurrentBook || hasSavedProgress;

  const handlePlayClick = () => {
    if (isCurrentBook) {
      togglePlayPause();
    } else {
      playBook(book);
    }
  };

  const handleDownload = () => {
    const track = book.files?.[0];
    const fileName = track?.name || `${book.title}.mp3`;
    const streamEndpoint =
      settings.streamingMode === "bridge" && settings.bridgeUrl
        ? `${settings.bridgeUrl}/stream?infoHash=${book.infoHash}&file=${encodeURIComponent(fileName)}&track=0`
        : `/api/stream?infoHash=${book.infoHash}&file=${encodeURIComponent(fileName)}&track=0`;

    const link = document.createElement("a");
    link.href = streamEndpoint;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const magnetUri =
    book.magnetUri ||
    (book.infoHash
      ? `magnet:?xt=urn:btih:${book.infoHash}&dn=${encodeURIComponent(book.title)}`
      : undefined);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={handlePlayClick}
        type="button"
        variant="default"
        size="default"
        className="w-[114px] min-w-[114px]"
        title={isCurrentBook && isPlaying ? "Pause" : isResume ? "Resume" : "Play"}
      >
        <span className="inline-flex size-4 shrink-0 items-center justify-center">
          {isCurrentBook && isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" />
          )}
        </span>
        <span>{isCurrentBook && isPlaying ? "Pause" : isResume ? "Resume" : "Play"}</span>
      </Button>

      {children}

      <Button
        onClick={handleDownload}
        type="button"
        variant="outline"
        size="default"
        title="Download audio file"
      >
        <Download size={15} />
        <span>Download</span>
      </Button>

      {magnetUri && (
        <Button asChild variant="outline" size="default">
          <a
            href={magnetUri}
            onClick={() => {
              void hapticLight();
            }}
            title="Open in Torrent Client"
          >
            <Magnet size={15} />
            <span>Magnet</span>
          </a>
        </Button>
      )}

      {trailingActions}
    </div>
  );
}

export const PlayBookButton = React.memo(PlayBookButtonComponent);
