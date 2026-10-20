export interface AudiobookFile {
  name: string;
  size?: string;
  duration?: string;
  trackNumber?: number;
  downloadUrl?: string;
  index?: number;
  extension?: string;
  isAudio?: boolean;
}

export interface AudiobookSummary {
  id: string;
  title: string;
  author?: string;
  narrator?: string;
  cover: string;
  format?: "M4B" | "MP3" | "Mixed" | "Unknown";
  bitrate?: string;
  fileSize?: string;
  postedDate?: string;
  url: string;
  categories: string[];
  seeders?: number;
  leechers?: number;
}

export interface AudiobookDetail extends AudiobookSummary {
  description: string;
  duration?: string;
  files: AudiobookFile[];
  trackers: string[];
  infoHash?: string;
  torrentUrl?: string;
  magnetUrl?: string;
  magnetUri?: string;
  isAbridged?: boolean;
  totalAudioFiles?: number;
  isMultiPart?: boolean;
}

export interface CategoryInfo {
  name: string;
  slug: string;
  count?: number;
}

export const POPULAR_CATEGORIES: CategoryInfo[] = [
  { name: "Sci-Fi", slug: "sci-fi" },
  { name: "Fantasy", slug: "fantasy" },
  { name: "Thriller", slug: "thriller" },
  { name: "Mystery", slug: "mystery" },
  { name: "Horror", slug: "horror" },
  { name: "History", slug: "history" },
  { name: "Biography", slug: "biography" },
  { name: "Business", slug: "business" },
  { name: "Romance", slug: "romance" },
  { name: "Fiction", slug: "general-fiction" },
  { name: "Non-Fiction", slug: "non-fiction" },
  { name: "Young Adult", slug: "young-adult" },
];
