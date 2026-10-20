import { AudiobookSummary, AudiobookDetail } from "@/types";

export const LIBRARY_BOOKS_STORAGE_KEY = "monologue_library_audiobooks";
export const LIBRARY_UPDATED_EVENT = "monologue:library-updated";

const EMPTY_BOOKS: AudiobookSummary[] = [];
let cachedLibraryBooks: AudiobookSummary[] = EMPTY_BOOKS;
let isCacheLoaded = false;

function readFromStorage(): AudiobookSummary[] {
  if (typeof window === "undefined") return EMPTY_BOOKS;

  try {
    const raw = localStorage.getItem(LIBRARY_BOOKS_STORAGE_KEY);
    if (!raw) return EMPTY_BOOKS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_BOOKS;

    return parsed;
  } catch {
    return EMPTY_BOOKS;
  }
}

export function getLibraryBooks(): AudiobookSummary[] {
  return readFromStorage();
}

export function getLibraryBooksSnapshot(): AudiobookSummary[] {
  if (typeof window === "undefined") return EMPTY_BOOKS;
  if (!isCacheLoaded) {
    cachedLibraryBooks = readFromStorage();
    isCacheLoaded = true;
  }
  return cachedLibraryBooks;
}

export function getLibraryServerSnapshot(): AudiobookSummary[] {
  return EMPTY_BOOKS;
}

export function subscribeLibraryBooks(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => {
    cachedLibraryBooks = readFromStorage();
    isCacheLoaded = true;
    callback();
  };

  window.addEventListener(LIBRARY_UPDATED_EVENT, handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener(LIBRARY_UPDATED_EVENT, handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export function saveLibraryBook(book: AudiobookSummary | AudiobookDetail): void {
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
    const updated = [entry, ...deduped];

    localStorage.setItem(LIBRARY_BOOKS_STORAGE_KEY, JSON.stringify(updated));
    cachedLibraryBooks = updated;
    isCacheLoaded = true;
    window.dispatchEvent(new CustomEvent(LIBRARY_UPDATED_EVENT, { detail: updated }));
  } catch {}
}

export function removeLibraryBook(id: string): void {
  if (typeof window === "undefined" || !id) return;

  try {
    const current = readFromStorage();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(LIBRARY_BOOKS_STORAGE_KEY, JSON.stringify(updated));
    cachedLibraryBooks = updated;
    isCacheLoaded = true;
    window.dispatchEvent(new CustomEvent(LIBRARY_UPDATED_EVENT, { detail: updated }));
  } catch {}
}

export function isBookInLibrary(id: string): boolean {
  if (typeof window === "undefined" || !id) return false;
  const current = getLibraryBooksSnapshot();
  return current.some((item) => item.id === id);
}

export function toggleLibraryBook(book: AudiobookSummary | AudiobookDetail): boolean {
  if (typeof window === "undefined" || !book || !book.id) return false;
  if (isBookInLibrary(book.id)) {
    removeLibraryBook(book.id);
    return false;
  }
  saveLibraryBook(book);
  return true;
}

export function clearLibrary(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(LIBRARY_BOOKS_STORAGE_KEY);
    cachedLibraryBooks = EMPTY_BOOKS;
    isCacheLoaded = true;
    window.dispatchEvent(new CustomEvent(LIBRARY_UPDATED_EVENT, { detail: [] }));
  } catch {}
}
