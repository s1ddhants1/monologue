import { AudiobookSummary, CategoryInfo, POPULAR_CATEGORIES } from "@/types";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "sci-fi": ["sci-fi", "science fiction", "scifi", "doctor who", "space opera", "cyberpunk"],
  fantasy: ["fantasy", "magic", "sword", "epic fantasy"],
  thriller: ["thriller", "suspense", "crime"],
  mystery: ["mystery", "detective"],
  horror: ["horror", "paranormal"],
  history: ["history", "historical"],
  biography: ["biography", "biographies", "autobiography", "memoir"],
  business: ["business", "economics", "finance"],
  romance: ["romance", "romantic"],
  "general-fiction": ["fiction", "literature", "general-fiction", "novel"],
  "non-fiction": ["non-fiction", "nonfiction", "general-non-fiction"],
  "young-adult": ["young adult", "ya"],
};

export function getDominantCategory(books: AudiobookSummary[]): CategoryInfo | null {
  if (!books || books.length === 0) return null;

  const scoreMap = new Map<string, number>();

  for (const book of books) {
    if (!book.categories || !Array.isArray(book.categories)) continue;

    for (const rawCat of book.categories) {
      const lower = rawCat.toLowerCase().trim();
      if (!lower) continue;

      for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some((kw) => lower.includes(kw))) {
          scoreMap.set(slug, (scoreMap.get(slug) || 0) + 1);
        }
      }
    }
  }

  if (scoreMap.size === 0) return null;

  let bestSlug = "";
  let highestCount = 0;

  for (const [slug, count] of scoreMap.entries()) {
    if (count > highestCount) {
      highestCount = count;
      bestSlug = slug;
    }
  }

  return POPULAR_CATEGORIES.find((cat) => cat.slug === bestSlug) || null;
}

export function deduplicateAudiobooks(
  books: AudiobookSummary[],
  maxItems = 10,
): AudiobookSummary[] {
  if (!books || !Array.isArray(books)) return [];

  const result: AudiobookSummary[] = [];
  const seenAuthors = new Set<string>();
  const seenFranchises = new Set<string>();

  const FRANCHISE_PATTERNS = [
    { key: "dune", test: /\bdune\b/i },
    { key: "doctor-who", test: /doctor\s+who/i },
    { key: "tolkien", test: /tolkien|hobbit|lord\s+of\s+the\s+rings/i },
    { key: "star-wars", test: /star\s+wars/i },
    { key: "star-trek", test: /star\s+trek/i },
    { key: "sanderson", test: /sanderson|mistborn|stormlight/i },
  ];

  for (const book of books) {
    if (!book || !book.id || !book.title) continue;

    const lowerTitle = book.title.toLowerCase();
    const matchedFranchise = FRANCHISE_PATTERNS.find(
      (f) => f.test.test(lowerTitle) || (book.author && f.test.test(book.author)),
    );

    if (matchedFranchise) {
      if (seenFranchises.has(matchedFranchise.key)) {
        continue;
      }
      seenFranchises.add(matchedFranchise.key);
    }

    if (book.author) {
      const cleanAuthor = book.author
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
      if (cleanAuthor.length > 2) {
        if (seenAuthors.has(cleanAuthor)) {
          continue;
        }
        seenAuthors.add(cleanAuthor);
      }
    }

    result.push(book);
    if (result.length >= maxItems) break;
  }

  return result;
}
