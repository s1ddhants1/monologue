"use client";

import React from "react";
import { FileText } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useTranscriptionStore } from "../stores";
import { hapticLight } from "@/lib/capacitor";
import { cn } from "@/lib/utils";

export interface TranscriptButtonProps {
  trackKey: string;
  audioUrl: string;
  bookTitle?: string;
  trackName?: string;
  infoHash?: string;
  trackIndex?: number;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-sm" | "icon-xs";
  className?: string;
  children?: React.ReactNode;
}

export function TranscriptButton({
  trackKey,
  audioUrl,
  bookTitle,
  trackName,
  infoHash,
  trackIndex,
  variant = "outline",
  size = "sm",
  className,
  children,
}: TranscriptButtonProps) {
  const openTranscript = useTranscriptionStore((s) => s.openTranscript);
  const transcripts = useTranscriptionStore((s) => s.transcripts);
  const hasTranscript = Boolean(transcripts[trackKey]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    void hapticLight();
    openTranscript({
      trackKey,
      audioUrl,
      bookTitle,
      trackName,
      infoHash,
      trackIndex,
    });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      title={hasTranscript ? "View AI Transcript" : "Transcribe Audio with AI"}
      aria-label="Open Audio Transcript"
      className={cn("cursor-pointer", className)}
    >
      {children ?? (
        <>
          <FileText size={14} className={hasTranscript ? "text-primary" : undefined} />
          <span>{hasTranscript ? "Transcript" : "Transcribe"}</span>
        </>
      )}
    </Button>
  );
}
