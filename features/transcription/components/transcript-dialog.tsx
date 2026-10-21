"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  AlertCircle,
  Key,
  Settings,
  Play,
  Pause,
} from "@/components/icons";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useTranscriptionStore } from "../stores";
import { transcribeAudio } from "../api/transcribe-client";
import { useSettingsStore } from "@/features/settings";
import { useAudioPlayer } from "@/features/player";
import { composeSegments, type TranscriptWord } from "@/hooks/use-transcript-viewer";
import { formatTime } from "@/lib/utils/format";
import { hapticLight, hapticSuccess } from "@/lib/capacitor";
import { cn } from "@/lib/utils";

export function TranscriptDialog() {
  const router = useRouter();
  const isOpen = useTranscriptionStore((s) => s.isOpen);
  const closeTranscript = useTranscriptionStore((s) => s.closeTranscript);
  const activeTrackKey = useTranscriptionStore((s) => s.activeTrackKey);
  const activeAudioUrl = useTranscriptionStore((s) => s.activeAudioUrl);
  const activeBookTitle = useTranscriptionStore((s) => s.activeBookTitle);
  const activeTrackName = useTranscriptionStore((s) => s.activeTrackName);
  const activeInfoHash = useTranscriptionStore((s) => s.activeInfoHash);
  const activeTrackIndex = useTranscriptionStore((s) => s.activeTrackIndex);
  const transcripts = useTranscriptionStore((s) => s.transcripts);
  const isLoading = useTranscriptionStore((s) => s.isLoading);
  const setLoading = useTranscriptionStore((s) => s.setLoading);
  const error = useTranscriptionStore((s) => s.error);
  const setError = useTranscriptionStore((s) => s.setError);
  const setTranscript = useTranscriptionStore((s) => s.setTranscript);

  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const {
    currentBook,
    currentTrackIndex,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    seekTo,
    setTrack,
  } = useAudioPlayer();

  const [copied, setCopied] = useState(false);
  const [localApiKey, setLocalApiKey] = useState("");

  const cached = activeTrackKey ? transcripts[activeTrackKey] : undefined;

  const isCurrentTrack = Boolean(
    currentBook?.infoHash &&
    activeInfoHash &&
    currentBook.infoHash.toLowerCase() === activeInfoHash.toLowerCase() &&
    currentTrackIndex === (activeTrackIndex ?? 0),
  );

  const alignment = cached?.transcript?.alignment;
  const { segments } = useMemo(() => {
    if (!alignment) {
      return { segments: [] };
    }
    return composeSegments(alignment, { hideAudioTags: true });
  }, [alignment]);

  if (!isOpen) return null;

  const handleStartTranscription = async () => {
    if (!activeTrackKey) return;
    const apiKeyToUse = settings.aiApiKey || localApiKey.trim();

    if (!apiKeyToUse) {
      setError("Please provide an API key to proceed with transcription.");
      return;
    }

    if (localApiKey.trim() && !settings.aiApiKey) {
      updateSettings({ aiApiKey: localApiKey.trim() });
    }

    setLoading(true);
    setError(null);
    void hapticLight();

    try {
      const response = await transcribeAudio({
        infoHash: activeInfoHash ?? undefined,
        trackIndex: activeTrackIndex ?? 0,
        audioUrl: activeAudioUrl ?? undefined,
        byok: {
          provider: settings.aiProvider,
          apiKey: apiKeyToUse,
          model: settings.aiModel,
          baseURL: settings.aiBaseUrl || undefined,
        },
      });

      void hapticSuccess();
      setTranscript(
        activeTrackKey,
        response,
        activeAudioUrl || "",
        activeBookTitle || undefined,
        activeTrackName || undefined,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transcription failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!cached?.transcript?.text) return;
    void hapticLight();
    void navigator.clipboard.writeText(cached.transcript.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!cached?.transcript?.text) return;
    void hapticLight();
    const element = document.createElement("a");
    const file = new Blob([cached.transcript.text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${(activeBookTitle || "audiobook").replace(/\s+/g, "_")}_transcript.txt`;
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  const handleWordClick = (word: TranscriptWord) => {
    void hapticLight();
    if (isCurrentTrack) {
      seekTo(word.startTime);
    } else if (activeTrackIndex !== null && activeTrackIndex !== undefined) {
      setTrack(activeTrackIndex);
      setTimeout(() => seekTo(word.startTime), 300);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeTranscript()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="border-b border-border pb-3 text-left">
          <DialogTitle className="text-base font-semibold text-foreground">
            Audio Transcript
          </DialogTitle>
          <DialogDescription className="truncate text-xs text-muted-foreground">
            {activeBookTitle
              ? `${activeBookTitle}${activeTrackName ? ` · ${activeTrackName}` : ""}`
              : "Synchronized AI transcript"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {error && (
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertTitle>Transcription Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {cached ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <Sparkles size={14} className="text-primary" />
                  <span>
                    {cached.transcript.language
                      ? `Language: ${cached.transcript.language.toUpperCase()}`
                      : "AI Transcribed"}
                  </span>
                  {cached.transcript.durationInSeconds && (
                    <span>· {Math.round(cached.transcript.durationInSeconds)}s</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    size="sm"
                    className="h-8 cursor-pointer rounded-lg px-2.5 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="h-8 cursor-pointer rounded-lg px-2.5 text-xs"
                  >
                    <Download size={13} />
                    <span>Export</span>
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                <ScrollArea className="max-h-[46vh] pr-3 select-text">
                  <div className="space-y-1 text-base leading-relaxed tracking-normal">
                    {segments.map((segment) => {
                      if (segment.kind === "gap") {
                        return (
                          <span
                            key={`gap-${segment.segmentIndex}`}
                            className="whitespace-pre text-muted-foreground/30"
                          >
                            {segment.text}
                          </span>
                        );
                      }

                      const word = segment as TranscriptWord;
                      const isSpoken = isCurrentTrack && currentTime >= word.endTime;
                      const isCurrent =
                        isCurrentTrack &&
                        currentTime >= word.startTime &&
                        currentTime < word.endTime;

                      return (
                        <button
                          key={`word-${word.wordIndex}-${word.startTime}`}
                          type="button"
                          onClick={() => handleWordClick(word)}
                          className={cn(
                            "cursor-pointer rounded-sm px-0.5 py-0.5 text-left transition-colors duration-75",
                            isCurrent && "bg-primary/20 font-medium text-primary",
                            isSpoken && "text-foreground",
                            !isSpoken &&
                              !isCurrent &&
                              "text-muted-foreground hover:text-foreground",
                          )}
                          title={`${word.text} (${formatTime(word.startTime)})`}
                        >
                          {word.text}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      if (isCurrentTrack) {
                        togglePlayPause();
                      } else if (activeTrackIndex !== null && activeTrackIndex !== undefined) {
                        setTrack(activeTrackIndex);
                      }
                    }}
                    className="size-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    {isCurrentTrack && isPlaying ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} className="ml-0.5" />
                    )}
                  </Button>
                  <span className="w-12 font-mono text-xs text-muted-foreground tabular-nums">
                    {isCurrentTrack ? formatTime(currentTime) : "0:00"}
                  </span>
                  <Slider
                    value={[isCurrentTrack && duration > 0 ? (currentTime / duration) * 100 : 0]}
                    onValueChange={([val]) => {
                      if (isCurrentTrack && duration > 0) {
                        seekTo((val / 100) * duration);
                      }
                    }}
                    max={100}
                    step={0.1}
                    className="flex-1 cursor-pointer"
                    disabled={!isCurrentTrack || duration <= 0}
                  />
                  <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {isCurrentTrack && duration > 0 ? formatTime(duration) : "--:--"}
                  </span>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
              <div className="relative">
                <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <Sparkles className="size-7 text-primary" />
                </div>
                <Loader2 className="absolute -right-1 -bottom-1 size-6 animate-spin text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Transcribing Audio with AI...
                </h4>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Processing speech segments with your {settings.aiProvider.toUpperCase()} (
                  {settings.aiModel}) model.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-6">
              <Empty className="py-2">
                <EmptyHeader>
                  <EmptyMedia className="size-12 rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <Sparkles size={24} />
                  </EmptyMedia>
                  <EmptyTitle className="text-base font-bold text-foreground">
                    No Transcript Generated Yet
                  </EmptyTitle>
                  <EmptyDescription className="text-xs text-muted-foreground">
                    Use your BYOK (Bring Your Own Key) model to generate a synchronized, word-level
                    transcript powered by AI SDK and ElevenLabs UI.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>

              {!settings.aiApiKey && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <Field>
                    <div className="mb-2 flex items-center justify-between">
                      <FieldLabel className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        <Key size={13} className="text-primary" />
                        <span>Enter {settings.aiProvider.toUpperCase()} API Key (BYOK)</span>
                      </FieldLabel>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          closeTranscript();
                          router.push("/settings");
                        }}
                        className="h-6 cursor-pointer px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Settings size={12} className="mr-1" />
                        Configure in Settings
                      </Button>
                    </div>
                    <InputGroup className="font-mono text-xs">
                      <InputGroupInput
                        type="password"
                        placeholder="sk-..."
                        value={localApiKey}
                        onChange={(e) => setLocalApiKey(e.target.value)}
                      />
                    </InputGroup>
                    <FieldDescription className="mt-1 text-[11px] text-muted-foreground">
                      Your key is saved locally in your browser and used only to transcribe audio.
                    </FieldDescription>
                  </Field>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleStartTranscription}
                  variant="default"
                  disabled={isLoading || (!settings.aiApiKey && !localApiKey.trim())}
                  className="cursor-pointer"
                >
                  <Sparkles size={14} className="mr-1.5" />
                  <span>Start Transcription</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
