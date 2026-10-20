"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";

const TracklistInspector = dynamic(
  () =>
    import("@/features/audiobooks").then((mod) => ({
      default: mod.TracklistInspector,
    })),
  { ssr: false },
);

const TranscriptDialog = dynamic(
  () =>
    import("@/features/transcription").then((mod) => ({
      default: mod.TranscriptDialog,
    })),
  { ssr: false },
);

const FullscreenPlayer = dynamic(
  () =>
    import("@/features/player").then((mod) => ({
      default: mod.FullscreenPlayer,
    })),
  { ssr: false },
);

export function AppOverlays() {
  return (
    <>
      <TracklistInspector isDrawer={true} />
      <TranscriptDialog />
      <FullscreenPlayer />
      <Toaster position="bottom-right" />
    </>
  );
}
