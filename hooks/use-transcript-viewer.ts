"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

export interface CharacterAlignmentResponseModel {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

export type ComposeSegmentsOptions = {
  hideAudioTags?: boolean;
};

export type BaseSegment = {
  segmentIndex: number;
  text: string;
};

export type TranscriptWord = BaseSegment & {
  kind: "word";
  wordIndex: number;
  startTime: number;
  endTime: number;
};

export type GapSegment = BaseSegment & {
  kind: "gap";
};

export type TranscriptSegment = TranscriptWord | GapSegment;

export type ComposeSegmentsResult = {
  segments: TranscriptSegment[];
  words: TranscriptWord[];
};

export type SegmentComposer = (
  alignment: CharacterAlignmentResponseModel,
  options?: ComposeSegmentsOptions,
) => ComposeSegmentsResult;

export function composeSegments(
  alignment: CharacterAlignmentResponseModel,
  options: ComposeSegmentsOptions = {},
): ComposeSegmentsResult {
  const {
    characters,
    characterStartTimesSeconds: starts,
    characterEndTimesSeconds: ends,
  } = alignment;

  const segments: TranscriptSegment[] = [];
  const words: TranscriptWord[] = [];

  let wordBuffer = "";
  let whitespaceBuffer = "";
  let wordStart = 0;
  let wordEnd = 0;
  let segmentIndex = 0;
  let wordIndex = 0;
  let insideAudioTag = false;

  const hideAudioTags = options.hideAudioTags ?? false;

  const flushWhitespace = () => {
    if (!whitespaceBuffer) return;
    segments.push({
      kind: "gap",
      segmentIndex: segmentIndex++,
      text: whitespaceBuffer,
    });
    whitespaceBuffer = "";
  };

  const flushWord = () => {
    if (!wordBuffer) return;
    const word: TranscriptWord = {
      kind: "word",
      segmentIndex: segmentIndex++,
      wordIndex: wordIndex++,
      text: wordBuffer,
      startTime: wordStart,
      endTime: wordEnd,
    };
    segments.push(word);
    words.push(word);
    wordBuffer = "";
  };

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const start = starts[i] ?? 0;
    const end = ends[i] ?? start;

    if (hideAudioTags) {
      if (char === "[") {
        flushWord();
        whitespaceBuffer = "";
        insideAudioTag = true;
        continue;
      }

      if (insideAudioTag) {
        if (char === "]") insideAudioTag = false;
        continue;
      }
    }

    if (/\s/.test(char)) {
      flushWord();
      whitespaceBuffer += char;
      continue;
    }

    if (whitespaceBuffer) {
      flushWhitespace();
    }

    if (!wordBuffer) {
      wordStart = start;
    }
    wordBuffer += char;
    wordEnd = end;
  }

  flushWord();
  flushWhitespace();

  return { segments, words };
}

export interface UseTranscriptViewerProps {
  alignment: CharacterAlignmentResponseModel;
  hideAudioTags?: boolean;
  segmentComposer?: SegmentComposer;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onDurationChange?: (duration: number) => void;
  audioRef?: RefObject<HTMLAudioElement | null>;
}

export interface UseTranscriptViewerResult {
  segments: TranscriptSegment[];
  words: TranscriptWord[];
  spokenSegments: TranscriptSegment[];
  unspokenSegments: TranscriptSegment[];
  currentWord: TranscriptWord | null;
  currentSegmentIndex: number;
  currentWordIndex: number;
  seekToTime: (time: number) => void;
  seekToWord: (word: number | TranscriptWord) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  isScrubbing: boolean;
  duration: number;
  currentTime: number;
  play: () => void;
  pause: () => void;
  startScrubbing: () => void;
  endScrubbing: () => void;
}

export function useTranscriptViewer({
  alignment,
  hideAudioTags = true,
  segmentComposer = composeSegments,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
  onDurationChange,
  audioRef: externalAudioRef,
}: UseTranscriptViewerProps): UseTranscriptViewerResult {
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = externalAudioRef ?? internalAudioRef;

  const { segments, words } = useMemo(
    () => segmentComposer(alignment, { hideAudioTags }),
    [alignment, hideAudioTags, segmentComposer],
  );

  const guessedDuration = useMemo(() => {
    if (!words.length) return 0;
    return words[words.length - 1].endTime;
  }, [words]);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(guessedDuration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(words.length ? 0 : -1);

  const rafRef = useRef<number | null>(null);
  const handleTimeUpdateRef = useRef<(time: number) => void>(() => {});
  const onDurationChangeRef = useRef<(duration: number) => void>(() => {});

  const [prevAlignment, setPrevAlignment] = useState(alignment);
  if (prevAlignment !== alignment) {
    setPrevAlignment(alignment);
    setCurrentTime(0);
    setDuration(guessedDuration);
    setIsPlaying(false);
    setCurrentWordIndex(words.length ? 0 : -1);
  }

  const findWordIndex = useCallback(
    (time: number) => {
      if (!words.length) return -1;
      let lo = 0;
      let hi = words.length - 1;
      let answer = -1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const word = words[mid];
        if (time >= word.startTime && time < word.endTime) {
          answer = mid;
          break;
        }
        if (time < word.startTime) {
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      return answer;
    },
    [words],
  );

  const handleTimeUpdate = useCallback(
    (time: number) => {
      if (!words.length) return;

      const currentWord =
        currentWordIndex >= 0 && currentWordIndex < words.length
          ? words[currentWordIndex]
          : undefined;

      if (!currentWord) {
        const found = findWordIndex(time);
        if (found !== -1) setCurrentWordIndex(found);
        return;
      }

      let next = currentWordIndex;
      if (time >= currentWord.endTime && currentWordIndex + 1 < words.length) {
        while (next + 1 < words.length && time >= words[next + 1].startTime) {
          next++;
        }
        if (time < words[next].endTime) {
          setCurrentWordIndex(next);
          return;
        }
        setCurrentWordIndex(next);
        return;
      }

      if (time < currentWord.startTime) {
        const found = findWordIndex(time);
        if (found !== -1) setCurrentWordIndex(found);
        return;
      }

      const found = findWordIndex(time);
      if (found !== -1 && found !== currentWordIndex) {
        setCurrentWordIndex(found);
      }
    },
    [findWordIndex, currentWordIndex, words],
  );

  useEffect(() => {
    handleTimeUpdateRef.current = handleTimeUpdate;
  }, [handleTimeUpdate]);

  useEffect(() => {
    onDurationChangeRef.current = onDurationChange ?? (() => {});
  }, [onDurationChange]);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startRaf = useCallback(() => {
    if (rafRef.current != null) return;
    const tick = () => {
      const node = audioRef.current;
      if (!node) {
        rafRef.current = null;
        return;
      }
      const time = node.currentTime;
      setCurrentTime(time);
      handleTimeUpdateRef.current(time);
      if (Number.isFinite(node.duration) && node.duration > 0) {
        setDuration((prev) => {
          if (!prev) {
            onDurationChangeRef.current(node.duration);
            return node.duration;
          }
          return prev;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncPlayback = () => setIsPlaying(!audio.paused);
    const syncTime = () => setCurrentTime(audio.currentTime);
    const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

    const handlePlay = () => {
      syncPlayback();
      startRaf();
      onPlay?.();
    };
    const handlePause = () => {
      syncPlayback();
      syncTime();
      stopRaf();
      onPause?.();
    };
    const handleEnded = () => {
      syncPlayback();
      syncTime();
      stopRaf();
      onEnded?.();
    };
    const handleTime = () => {
      syncTime();
      onTimeUpdate?.(audio.currentTime);
    };
    const handleSeeked = () => {
      syncTime();
      handleTimeUpdateRef.current(audio.currentTime);
    };
    const handleDuration = () => {
      syncDuration();
      onDurationChange?.(audio.duration);
    };

    syncPlayback();
    syncTime();
    syncDuration();
    if (!audio.paused) {
      startRaf();
    } else {
      stopRaf();
    }

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("seeked", handleSeeked);
    audio.addEventListener("durationchange", handleDuration);
    audio.addEventListener("loadedmetadata", handleDuration);

    return () => {
      stopRaf();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("seeked", handleSeeked);
      audio.removeEventListener("durationchange", handleDuration);
      audio.removeEventListener("loadedmetadata", handleDuration);
    };
  }, [audioRef, startRaf, stopRaf, onPlay, onPause, onEnded, onTimeUpdate, onDurationChange]);

  const seekToTime = (time: number) => {
    const node = audioRef.current;
    if (!node) return;
    setCurrentTime(time);
    node.currentTime = time;
    handleTimeUpdateRef.current(time);
  };

  const seekToWord = (word: number | TranscriptWord) => {
    const target = typeof word === "number" ? words[word] : word;
    if (!target) return;
    seekToTime(target.startTime);
  };

  const play = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    }
  };

  const pause = () => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
    }
  };

  const startScrubbing = () => {
    setIsScrubbing(true);
    stopRaf();
  };

  const endScrubbing = () => {
    setIsScrubbing(false);
    const node = audioRef.current;
    if (node && !node.paused) {
      startRaf();
    }
  };

  const currentWord =
    currentWordIndex >= 0 && currentWordIndex < words.length ? words[currentWordIndex] : null;
  const currentSegmentIndex = currentWord?.segmentIndex ?? -1;

  const spokenSegments = useMemo(() => {
    if (!segments.length || currentSegmentIndex <= 0) return [];
    return segments.slice(0, currentSegmentIndex);
  }, [segments, currentSegmentIndex]);

  const unspokenSegments = useMemo(() => {
    if (!segments.length) return [];
    if (currentSegmentIndex === -1) return segments;
    if (currentSegmentIndex + 1 >= segments.length) return [];
    return segments.slice(currentSegmentIndex + 1);
  }, [segments, currentSegmentIndex]);

  return {
    segments,
    words,
    spokenSegments,
    unspokenSegments,
    currentWord,
    currentSegmentIndex,
    currentWordIndex,
    seekToTime,
    seekToWord,
    audioRef,
    isPlaying,
    isScrubbing,
    duration,
    currentTime,
    play,
    pause,
    startScrubbing,
    endScrubbing,
  };
}
