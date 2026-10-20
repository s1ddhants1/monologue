import { AudiobookDetail } from "@/types";

export interface StoredProgress {
  trackIndex: number;
  currentTime: number;
  duration?: number;
  updatedAt: number;
}

export interface LastActiveBookData {
  book: AudiobookDetail;
  trackIndex: number;
  currentTime: number;
  updatedAt: number;
}

const STORAGE_PREFIX = "monologue_progress_";
const LEGACY_PREFIX = "voxbay_progress_";
const FALLBACK_PREFIX = "abb_progress_";
const LAST_ACTIVE_KEY = "monologue_last_active_book";

export function saveBookProgress(
  bookId: string,
  trackIndex: number,
  currentTime: number,
  duration?: number,
): void {
  if (typeof window === "undefined" || !bookId) return;
  const safeTime = Math.max(0, currentTime);
  const safeIndex = Math.max(0, trackIndex);

  const payload: StoredProgress = {
    trackIndex: safeIndex,
    currentTime: safeTime,
    duration: duration && isFinite(duration) && duration > 0 ? duration : undefined,
    updatedAt: Date.now(),
  };

  try {
    const serialized = JSON.stringify(payload);
    localStorage.setItem(`${STORAGE_PREFIX}${bookId}`, serialized);
    localStorage.setItem(`${LEGACY_PREFIX}${bookId}`, serialized);
  } catch {}
}

export function getBookProgress(bookId: string): StoredProgress | null {
  if (typeof window === "undefined" || !bookId) return null;

  try {
    const raw =
      localStorage.getItem(`${STORAGE_PREFIX}${bookId}`) ||
      localStorage.getItem(`${LEGACY_PREFIX}${bookId}`) ||
      localStorage.getItem(`${FALLBACK_PREFIX}${bookId}`);

    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;

    if (
      typeof parsed?.trackIndex === "number" &&
      typeof parsed?.currentTime === "number" &&
      !isNaN(parsed.currentTime)
    ) {
      return {
        trackIndex: Math.max(0, parsed.trackIndex),
        currentTime: Math.max(0, parsed.currentTime),
        duration: parsed.duration,
        updatedAt: parsed.updatedAt || Date.now(),
      };
    }
  } catch {}

  return null;
}

export function clearBookProgress(bookId: string): void {
  if (typeof window === "undefined" || !bookId) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${bookId}`);
    localStorage.removeItem(`${LEGACY_PREFIX}${bookId}`);
  } catch {}
}

export function saveLastActiveBook(
  book: AudiobookDetail,
  trackIndex: number,
  currentTime: number,
): void {
  if (typeof window === "undefined" || !book?.id) return;

  const payload: LastActiveBookData = {
    book,
    trackIndex: Math.max(0, trackIndex),
    currentTime: Math.max(0, currentTime),
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(LAST_ACTIVE_KEY, JSON.stringify(payload));
  } catch {}
}

export function getLastActiveBook(): LastActiveBookData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastActiveBookData>;
    if (parsed?.book?.id) {
      return {
        book: parsed.book as AudiobookDetail,
        trackIndex: typeof parsed.trackIndex === "number" ? Math.max(0, parsed.trackIndex) : 0,
        currentTime: typeof parsed.currentTime === "number" ? Math.max(0, parsed.currentTime) : 0,
        updatedAt: parsed.updatedAt || Date.now(),
      };
    }
  } catch {}

  return null;
}

export function clearAllPlaybackData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_ACTIVE_KEY);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(STORAGE_PREFIX) ||
          key.startsWith(LEGACY_PREFIX) ||
          key.startsWith(FALLBACK_PREFIX))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
