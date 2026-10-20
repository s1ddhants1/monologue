import { AudiobookSummary, AudiobookDetail } from "@/types";

export const RECENT_BOOKS_STORAGE_KEY = "monologue_recent_audiobooks";
const LEGACY_STORAGE_KEY = "voxbay_recent_audiobooks";
export const RECENT_UPDATED_EVENT = "monologue:recent-updated";
const MAX_RECENT_BOOKS = 12;

const EMPTY_BOOKS: AudiobookSummary[] = [];
let cachedRecentBooks: AudiobookSummary[] = EMPTY_BOOKS;
let isCacheLoaded = false;

function readFromStorage(): AudiobookSummary[] {
  if (typeof window === "undefined") return EMPTY_BOOKS;

  try {
    const raw =
      localStorage.getItem(RECENT_BOOKS_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return EMPTY_BOOKS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_BOOKS;

    return parsed;
  } catch {
    return EMPTY_BOOKS;
  }
}

export function getRecentBooks(): AudiobookSummary[] {
  return readFromStorage();
}

export function getRecentBooksSnapshot(): AudiobookSummary[] {
  if (typeof window === "undefined") return EMPTY_BOOKS;
  if (!isCacheLoaded) {
    cachedRecentBooks = readFromStorage();
    isCacheLoaded = true;
  }
  return cachedRecentBooks;
}

export function getServerSnapshot(): AudiobookSummary[] {
  return EMPTY_BOOKS;
}

export function subscribeRecentBooks(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => {
    cachedRecentBooks = readFromStorage();
    isCacheLoaded = true;
    callback();
  };

  window.addEventListener(RECENT_UPDATED_EVENT, handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener(RECENT_UPDATED_EVENT, handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export function saveRecentBook(book: AudiobookSummary | AudiobookDetail): void {
  if (typeof window === "undefined" || !book || !book.id) return;

  try {
    const current = readFromStorage();
    const entry: AudiobookSummary = {
      id: book.id,
      title: book.title,
      author: book.author,
      cover: book.cover,
      format: book.format,
      categories: book.categories || [],
      url: book.url,
      fileSize: book.fileSize,
      bitrate: book.bitrate,
      postedDate: book.postedDate,
      narrator: book.narrator,
    };

    const deduped = current.filter((item) => item.id !== book.id);
    const updated = [entry, ...deduped].slice(0, MAX_RECENT_BOOKS);

    localStorage.setItem(RECENT_BOOKS_STORAGE_KEY, JSON.stringify(updated));
    cachedRecentBooks = updated;
    isCacheLoaded = true;
    window.dispatchEvent(new CustomEvent(RECENT_UPDATED_EVENT, { detail: updated }));
  } catch {}
}

export const addRecentBook = saveRecentBook;

export function clearRecentBooks(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(RECENT_BOOKS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    cachedRecentBooks = EMPTY_BOOKS;
    isCacheLoaded = true;
    window.dispatchEvent(new CustomEvent(RECENT_UPDATED_EVENT, { detail: [] }));
  } catch {}
}

export function removeRecentBook(id: string): void {
  if (typeof window === "undefined" || !id) return;

  try {
    const current = readFromStorage();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(RECENT_BOOKS_STORAGE_KEY, JSON.stringify(updated));
    cachedRecentBooks = updated;
    isCacheLoaded = true;
    window.dispatchEvent(new CustomEvent(RECENT_UPDATED_EVENT, { detail: updated }));
  } catch {}
}
