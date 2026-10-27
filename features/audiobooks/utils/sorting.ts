import { AudiobookSummary } from "@/types";

export type SortOption = "newest" | "popularity" | "title" | "size";
export type SortDirection = "asc" | "desc";

export function isSortOption(value: string | undefined): value is SortOption {
  return value === "newest" || value === "popularity" || value === "title" || value === "size";
}

export function isSortDirection(value: string | undefined): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function getDefaultSortDirection(option: SortOption): SortDirection {
  switch (option) {
    case "title":
      return "asc";
    case "newest":
    case "popularity":
    case "size":
    default:
      return "desc";
  }
}

export function computeDeterministicPeers(slug: string): { seeders: number; leechers: number } {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const seeders = (positive % 180) + 5;
  const leechers = (Math.floor(positive / 11) % 45) + 1;
  return { seeders, leechers };
}

export function parseFileSizeToBytes(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)\s*([KMGT]?B)/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  if (isNaN(value)) return 0;
  const unit = match[2].toUpperCase();
  if (unit.startsWith("G")) return value * 1024 * 1024 * 1024;
  if (unit.startsWith("M")) return value * 1024 * 1024;
  if (unit.startsWith("K")) return value * 1024;
  if (unit.startsWith("T")) return value * 1024 * 1024 * 1024 * 1024;
  return value;
}

export function parsePostedDateToTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const time = Date.parse(dateStr);
  return isNaN(time) ? 0 : time;
}

export function sortAudiobooks(
  books: AudiobookSummary[],
  sortOption: SortOption,
  direction: SortDirection = getDefaultSortDirection(sortOption),
): AudiobookSummary[] {
  const cloned = [...books];
  const factor = direction === "asc" ? 1 : -1;

  return cloned.sort((a, b) => {
    if (sortOption === "title") {
      return (
        factor * a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })
      );
    }

    if (sortOption === "popularity") {
      const aSeeders = a.seeders ?? 0;
      const bSeeders = b.seeders ?? 0;
      const aLeechers = a.leechers ?? 0;
      const bLeechers = b.leechers ?? 0;
      const aPeers = aSeeders + aLeechers;
      const bPeers = bSeeders + bLeechers;

      if (aPeers !== bPeers) {
        return factor * (aPeers - bPeers);
      }
      return factor * (aSeeders - bSeeders);
    }

    if (sortOption === "size") {
      const aSize = parseFileSizeToBytes(a.fileSize);
      const bSize = parseFileSizeToBytes(b.fileSize);
      return factor * (aSize - bSize);
    }

    if (sortOption === "newest") {
      const aDate = parsePostedDateToTimestamp(a.postedDate);
      const bDate = parsePostedDateToTimestamp(b.postedDate);
      if (aDate !== bDate) {
        return factor * (aDate - bDate);
      }
    }

    return 0;
  });
}
