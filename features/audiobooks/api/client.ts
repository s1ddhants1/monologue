import * as cheerio from "cheerio";
import { cache } from "react";
import { AudiobookSummary, AudiobookDetail, AudiobookFile } from "@/types";
import { apiClient, ApiError } from "@/lib/api-client";
import { SOURCE_BASE_URL } from "@/config/env";
import { AudiobookSummarySchema, AudiobookDetailSchema } from "./schemas";
import { deduplicateAudiobooks } from "../utils/recommendations";
import { computeDeterministicPeers } from "../utils/sorting";
import { isSafeSlug } from "@/lib/request-params";

const WEBTORRENT_WS_TRACKERS = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.webtorrent.dev",
  "wss://tracker.btorrent.xyz",
  "wss://tracker.files.fm:7073/announce",
  "wss://spitfire.tracker.buzz:443/announce",
];

function cleanText(text: string): string {
  return text
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "-")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCategories($: cheerio.CheerioAPI, root: unknown): string[] {
  const $root = $(root as Parameters<cheerio.CheerioAPI>[0]);
  const categories = new Set<string>();

  $root.find(".postInfo a, a[rel='category tag']").each((_, el) => {
    const value = cleanText($(el).text());
    if (value) categories.add(value);
  });

  const postInfo = cleanText($root.find(".postInfo").text() || $root.text());
  const categoryMatch = postInfo.match(/Category:\s*([^|;]+)/i);
  if (categoryMatch) {
    categoryMatch[1]
      .split(/,|\s+\/\s+|\s+\|\s+/)
      .map(cleanText)
      .filter((value) => value.length > 1)
      .forEach((value) => categories.add(value));
  }

  return Array.from(categories).slice(0, 8);
}

function parsePostElement($: cheerio.CheerioAPI, el: unknown): AudiobookSummary | null {
  const $el = $(el as Parameters<cheerio.CheerioAPI>[0]);
  const titleA = $el.find(".postTitle h2 a");
  if (!titleA.length) return null;

  const rawTitle = titleA.text();
  const title = cleanText(rawTitle);
  const href = titleA.attr("href") || "";
  const slug = href.replace(/^.*?\/abss\//, "").replace(/\/$/, "");

  let cover = $el.find(".postContent img").attr("src") || "";
  if (cover.startsWith("//")) cover = `https:${cover}`;
  if (!cover || cover.includes("blank.gif")) {
    cover =
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80";
  }

  const categories = parseCategories($, $el);

  const contentText = $el.find(".postContent").text();
  const formatMatch = contentText.match(/Format:\s*([A-Za-z0-9]+)/i);
  const rawFormat = formatMatch ? formatMatch[1].toUpperCase() : "UNKNOWN";
  const format: AudiobookSummary["format"] =
    rawFormat === "M4B"
      ? "M4B"
      : rawFormat === "MP3"
        ? "MP3"
        : rawFormat === "MIXED"
          ? "Mixed"
          : "Unknown";

  const sizeMatch = contentText.match(/File Size:\s*([\d\.]+\s*[KMGT]?Bs?)/i);
  const fileSize = sizeMatch ? sizeMatch[1].trim() : undefined;

  const dateMatch = contentText.match(/Posted:\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
  const postedDate = dateMatch ? dateMatch[1].trim() : undefined;

  const bitrateMatch = contentText.match(/Bitrate:\s*([^/<F\n\r]+)/i);
  const bitrate = bitrateMatch ? bitrateMatch[1].trim() : undefined;

  let author: string | undefined;
  if (title.includes(" - ")) {
    const parts = title.split(" - ");
    author = parts[parts.length - 1].trim();
  }

  const peers = computeDeterministicPeers(slug);

  const candidate: AudiobookSummary = {
    id: slug,
    title,
    author,
    cover,
    format,
    bitrate,
    fileSize,
    postedDate,
    url: `${SOURCE_BASE_URL}/abss/${slug}/`,
    categories: categories.slice(0, 4),
    seeders: peers.seeders,
    leechers: peers.leechers,
  };

  const parsed = AudiobookSummarySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function extractTotalPages($: cheerio.CheerioAPI): number {
  const pageNumbers: number[] = [];
  $(".wp-pagenavi a, .wp-pagenavi span").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/page\/(\d+)\//);
    if (match) {
      pageNumbers.push(parseInt(match[1], 10));
    }
    const text = $(el).text().trim();
    const num = parseInt(text, 10);
    if (!isNaN(num)) {
      pageNumbers.push(num);
    }
  });
  return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
}

function deduplicateSummaries(books: AudiobookSummary[]): AudiobookSummary[] {
  const seen = new Set<string>();
  const unique: AudiobookSummary[] = [];
  for (const b of books) {
    if (!seen.has(b.id)) {
      seen.add(b.id);
      unique.push(b);
    }
  }
  return unique;
}

export async function searchAudiobooks(
  query: string,
  page = 1,
): Promise<{ results: AudiobookSummary[]; page: number; totalPages?: number }> {
  try {
    const abbPage1 = (page - 1) * 2 + 1;
    const abbPage2 = (page - 1) * 2 + 2;

    const path1 =
      abbPage1 > 1
        ? `/page/${abbPage1}/?s=${encodeURIComponent(query)}`
        : `/?s=${encodeURIComponent(query)}`;
    const path2 = `/page/${abbPage2}/?s=${encodeURIComponent(query)}`;

    const [res1, res2] = await Promise.all([
      apiClient(path1, { next: { revalidate: 300 } }),
      apiClient(path2, { next: { revalidate: 300 } }).catch(() => null),
    ]);

    const html1 = await res1.text();
    const $1 = cheerio.load(html1);
    const abbTotalPages = extractTotalPages($1);

    const results: AudiobookSummary[] = [];
    $1(".post").each((_, el) => {
      const parsed = parsePostElement($1, el);
      if (parsed) results.push(parsed);
    });

    if (res2 && abbTotalPages >= abbPage2) {
      try {
        const html2 = await res2.text();
        const $2 = cheerio.load(html2);
        $2(".post").each((_, el) => {
          const parsed = parsePostElement($2, el);
          if (parsed) results.push(parsed);
        });
      } catch {}
    }

    const uniqueResults = deduplicateSummaries(results);
    const totalPages = Math.max(1, Math.ceil(abbTotalPages / 2));

    return { results: uniqueResults, page, totalPages };
  } catch (err) {
    console.error("searchAudiobooks error:", err);
    throw err;
  }
}

export async function getCategoryAudiobooks(
  categorySlug: string,
  page = 1,
): Promise<{ results: AudiobookSummary[]; page: number; category: string; totalPages?: number }> {
  if (!isSafeSlug(categorySlug)) {
    return { results: [], page, category: categorySlug, totalPages: 1 };
  }
  try {
    const CATEGORY_ALIASES: Record<string, string> = {
      "sci-fi": "doctor-who-sci-fi",
      scifi: "doctor-who-sci-fi",
      "science-fiction": "doctor-who-sci-fi",
      biographies: "autobiography-biographies",
      biography: "autobiography-biographies",
      thriller: "crime",
      fiction: "general-fiction",
      "non-fiction": "general-non-fiction",
    };
    const actualSlug = CATEGORY_ALIASES[categorySlug.toLowerCase()] || categorySlug;

    const abbPage1 = (page - 1) * 2 + 1;
    const abbPage2 = (page - 1) * 2 + 2;

    const path1 =
      abbPage1 > 1
        ? `/audio-books/type/${actualSlug}/page/${abbPage1}/`
        : `/audio-books/type/${actualSlug}/`;
    const path2 = `/audio-books/type/${actualSlug}/page/${abbPage2}/`;

    const [res1, res2] = await Promise.all([
      apiClient(path1, { next: { revalidate: 600 } }),
      apiClient(path2, { next: { revalidate: 600 } }).catch(() => null),
    ]);

    const html1 = await res1.text();
    const $1 = cheerio.load(html1);
    const abbTotalPages = extractTotalPages($1);

    const results: AudiobookSummary[] = [];
    $1(".post").each((_, el) => {
      const parsed = parsePostElement($1, el);
      if (parsed) results.push(parsed);
    });

    if (res2 && abbTotalPages >= abbPage2) {
      try {
        const html2 = await res2.text();
        const $2 = cheerio.load(html2);
        $2(".post").each((_, el) => {
          const parsed = parsePostElement($2, el);
          if (parsed) results.push(parsed);
        });
      } catch {}
    }

    const uniqueResults = deduplicateSummaries(results);
    const totalPages = Math.max(1, Math.ceil(abbTotalPages / 2));

    return { results: uniqueResults, page, category: categorySlug, totalPages };
  } catch (err) {
    console.error("getCategoryAudiobooks error:", err);
    throw err;
  }
}

export async function getLatestAudiobooks(
  page = 1,
): Promise<{ results: AudiobookSummary[]; page: number; totalPages?: number }> {
  try {
    const abbPage1 = (page - 1) * 2 + 1;
    const abbPage2 = (page - 1) * 2 + 2;

    const path1 = abbPage1 > 1 ? `/page/${abbPage1}/` : `/`;
    const path2 = `/page/${abbPage2}/`;

    const [res1, res2] = await Promise.all([
      apiClient(path1, { next: { revalidate: 300 } }),
      apiClient(path2, { next: { revalidate: 300 } }).catch(() => null),
    ]);

    const html1 = await res1.text();
    const $1 = cheerio.load(html1);
    const abbTotalPages = extractTotalPages($1);

    const results: AudiobookSummary[] = [];
    $1(".post").each((_, el) => {
      const parsed = parsePostElement($1, el);
      if (parsed) results.push(parsed);
    });

    if (res2 && abbTotalPages >= abbPage2) {
      try {
        const html2 = await res2.text();
        const $2 = cheerio.load(html2);
        $2(".post").each((_, el) => {
          const parsed = parsePostElement($2, el);
          if (parsed) results.push(parsed);
        });
      } catch {}
    }

    const uniqueResults = deduplicateSummaries(results);
    const totalPages = Math.max(1, Math.ceil(abbTotalPages / 2));

    return { results: uniqueResults, page, totalPages };
  } catch (err) {
    console.error("getLatestAudiobooks error:", err);
    throw err;
  }
}

export const getAudiobookDetail = cache(async function (
  slug: string,
): Promise<AudiobookDetail | null> {
  if (!isSafeSlug(slug)) return null;
  try {
    let res: Response;
    try {
      res = await apiClient(`/abss/${slug}/`, { next: { revalidate: 3600 } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const rawTitle = $(".postTitle h1, .postTitle h2").first().text();
    if (!rawTitle) return null;
    const title = cleanText(rawTitle);

    let cover =
      $('img[itemprop="image"]').first().attr("src") ||
      $(".postContent p.center img, .postContent .center img, .postContent img")
        .first()
        .attr("src") ||
      "";
    if (cover.startsWith("//")) cover = `https:${cover}`;
    if (!cover || cover.includes("blank.gif") || cover.endsWith(".gif")) {
      cover =
        "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&auto=format&fit=crop&q=80";
    }

    let infoHash = "";
    $("table tr").each((_, el) => {
      const text = $(el).text();
      if (text.includes("Info Hash:")) {
        const match = text.match(/Info Hash:\s*([a-fA-F0-9]{40})/i);
        if (match) infoHash = match[1].toLowerCase();
      }
    });

    const trackerSet = new Set<string>();
    $("table tr").each((_, el) => {
      const text = $(el).text();
      if (text.includes("Tracker:") || text.includes("Announce URL:")) {
        const td = $(el).find("td").last().text().trim();
        if (td.startsWith("http") || td.startsWith("udp")) {
          trackerSet.add(td);
        }
      }
    });
    const trackers = Array.from(trackerSet);

    const authors: string[] = [];
    $(".author").each((_, el) => {
      const a = cleanText($(el).text());
      if (a && !authors.includes(a)) authors.push(a);
    });

    const narrators: string[] = [];
    $(".narrator").each((_, el) => {
      const n = cleanText($(el).text());
      if (n && !narrators.includes(n)) narrators.push(n);
    });

    const formatElem = $(".format").first().text().trim().toUpperCase();
    const format: AudiobookSummary["format"] =
      formatElem === "M4B" ? "M4B" : formatElem === "MP3" ? "MP3" : "Unknown";

    const descBlock = $(".desc").text();
    const lengthMatch = descBlock.match(/Length:\s*([^\n\r]+)/i);
    const duration = lengthMatch ? lengthMatch[1].trim() : undefined;

    const bitrateMatch = descBlock.match(/Bit\s*Rate:\s*([^\n\r]+)/i);
    const bitrate = bitrateMatch ? bitrateMatch[1].trim() : undefined;

    const isAbridged =
      $(".is_abridged").text().toLowerCase().includes("abridged") &&
      !$(".is_abridged").text().toLowerCase().includes("unabridged");

    const descParagraphs: string[] = [];
    $(".desc p").each((_, el) => {
      const $p = $(el);
      $p.find("a").each((_, aEl) => {
        const $a = $(aEl);
        const href = $a.attr("href")?.trim();
        const aText = cleanText($a.text());
        if (
          href &&
          (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("magnet:"))
        ) {
          if (aText && aText !== href) {
            $a.replaceWith(` [${aText}](${href}) `);
          } else {
            $a.replaceWith(` ${href} `);
          }
        }
      });

      const text = cleanText($p.text());
      if (
        text &&
        !text.startsWith("Written by") &&
        !text.startsWith("Bit Rate:") &&
        !text.startsWith("Format:") &&
        !text.startsWith("Read by")
      ) {
        descParagraphs.push(text);
      }
    });
    const description = descParagraphs.join("\n\n") || "No description provided.";

    const files: AudiobookFile[] = [];
    const seenNames = new Set<string>();

    const parseAndAddFile = (rawName: string, rawSize?: string) => {
      const match = rawName.match(/^(.*?)\s+([\d\.]+\s*[KMGT]?Bs?)$/i);
      const fileName = match ? match[1].trim() : rawName.trim();
      const size = match ? match[2].trim() : rawSize?.trim();
      if (!fileName) return;

      const lower = fileName.toLowerCase();
      if (
        seenNames.has(lower) ||
        lower === "file name" ||
        lower === "filename" ||
        lower === "name" ||
        lower.startsWith("info hash:") ||
        lower.startsWith("tracker:") ||
        lower.startsWith("announce url:")
      ) {
        return;
      }

      const isM4B = lower.endsWith(".m4b");
      const isMP3 = lower.endsWith(".mp3");
      const isM4A = lower.endsWith(".m4a");
      const isAAC = lower.endsWith(".aac");
      const isFLAC = lower.endsWith(".flac");
      const isOGG = lower.endsWith(".ogg") || lower.endsWith(".oga");
      const isOPUS = lower.endsWith(".opus");
      const isWAV = lower.endsWith(".wav");
      const isWMA = lower.endsWith(".wma");
      const isAudio =
        isM4B || isMP3 || isM4A || isAAC || isFLAC || isOGG || isOPUS || isWAV || isWMA;

      if (
        isAudio ||
        lower.endsWith(".cue") ||
        lower.endsWith(".txt") ||
        lower.endsWith(".nfo") ||
        lower.endsWith(".m3u")
      ) {
        seenNames.add(lower);
        files.push({
          index: files.length,
          name: fileName,
          size,
          extension: isM4B
            ? "m4b"
            : isMP3
              ? "mp3"
              : isM4A
                ? "m4a"
                : isFLAC
                  ? "flac"
                  : isAudio
                    ? "audio"
                    : "other",
          isAudio,
        });
      }
    };

    $('table tr td[colspan="2"]').each((_, el) => {
      parseAndAddFile($(el).text().trim());
    });

    if (files.length === 0) {
      $("table tr").each((_, row) => {
        const tds = $(row).find("td");
        if (tds.length === 2) {
          parseAndAddFile(tds.first().text().trim(), tds.last().text().trim());
        }
      });
    }

    const audioFiles = files
      .filter((f) => f.isAudio)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
      );

    let fileSize: string | undefined;
    const postContent = $(".postContent").text();
    const sizeMatch = postContent.match(/File Size:\s*([\d\.]+\s*[KMGT]?Bs?)/i);
    if (sizeMatch) fileSize = sizeMatch[1].trim();

    const trParams = [...trackers, ...WEBTORRENT_WS_TRACKERS]
      .map((tr) => `&tr=${encodeURIComponent(tr)}`)
      .join("");
    const magnetUri = infoHash
      ? `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}${trParams}`
      : "";

    const candidate: AudiobookDetail = {
      id: slug,
      title,
      author:
        authors.join(", ") ||
        (title.includes(" - ") ? title.split(" - ").pop()?.trim() : undefined),
      narrator: narrators.join(", ") || undefined,
      cover,
      format,
      bitrate,
      fileSize,
      description,
      infoHash,
      trackers,
      magnetUri,
      duration,
      isAbridged,
      files: audioFiles,
      totalAudioFiles: audioFiles.length,
      isMultiPart: audioFiles.length > 1,
      categories: parseCategories($, $(".postInfo").first()),
      url: `${SOURCE_BASE_URL}/abss/${slug}/`,
      seeders: computeDeterministicPeers(slug).seeders,
      leechers: computeDeterministicPeers(slug).leechers,
    };

    const parsed = AudiobookDetailSchema.safeParse(candidate);
    return parsed.success ? (parsed.data as AudiobookDetail) : null;
  } catch (err) {
    console.error("getAudiobookDetail error:", err);
    return null;
  }
});

export async function getCuratedFallbackAudiobooks(): Promise<AudiobookSummary[]> {
  try {
    const queries = [
      "dune",
      "hobbit",
      "1984 orwell",
      "mistborn",
      "stephen king",
      "agatha christie",
      "neuromancer",
      "sherlock",
      "foundation asimov",
      "neil gaiman",
    ];

    const responses = await Promise.all(
      queries.map((q) => searchAudiobooks(q, 1).catch(() => ({ results: [] }))),
    );

    const candidates: AudiobookSummary[] = [];
    for (const res of responses) {
      if (res.results && res.results.length > 0) {
        candidates.push(res.results[0]);
      }
    }

    return deduplicateAudiobooks(candidates, 10);
  } catch (err) {
    console.error("getCuratedFallbackAudiobooks error:", err);
    return [];
  }
}
