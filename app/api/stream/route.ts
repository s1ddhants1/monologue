import { NextRequest } from "next/server";
import torrentStream from "torrent-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TorrentFile {
  name: string;
  path: string;
  length: number;
  select: () => void;
  deselect: () => void;
  createReadStream: (range?: { start: number; end: number }) => NodeJS.ReadableStream;
}

interface TorrentEngine {
  files: TorrentFile[];
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  destroy: (cb?: () => void) => void;
}

interface TorrentEntry {
  engine: TorrentEngine;
  lastUsed: number;
  files: TorrentFile[];
}

const HASH_REGEX = /^[a-fA-F0-9]{40}$|^[a-zA-Z2-7]{32}$/;
const MAX_CONCURRENT_ENGINES = 5;

const DEFAULT_TRACKERS = [
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://bittorrent-tracker.encrypt.net:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://tracker.dler.org:6969/announce",
  "udp://tracker.openbittorrent.com:6969/announce",
  "udp://tracker.tiny-vps.com:6969/announce",
  "udp://p4p.arenabg.com:1337/announce",
  "http://ipv4announce.sktorrent.eu:6969/announce",
  "http://tracker.bt4g.com:2095/announce",
  "http://tracker.mywaifu.best:6969/announce",
  "udp://bittorrent-tracker.e-n-c-r-y-p-t.net:1337/announce",
  "http://bt.okmp3.ru:2710/announce",
];

declare global {
  var __activeTorrentEngines: Map<string, TorrentEntry> | undefined;
  var __pendingTorrentPromises: Map<string, Promise<TorrentEntry>> | undefined;
  var __torrentCleanupInterval: NodeJS.Timeout | undefined;
}

const globalEngines = globalThis.__activeTorrentEngines || new Map<string, TorrentEntry>();
globalThis.__activeTorrentEngines = globalEngines;

const pendingPromises =
  globalThis.__pendingTorrentPromises || new Map<string, Promise<TorrentEntry>>();
globalThis.__pendingTorrentPromises = pendingPromises;

if (!globalThis.__torrentCleanupInterval) {
  globalThis.__torrentCleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [hash, entry] of globalEngines.entries()) {
        if (now - entry.lastUsed > 15 * 60 * 1000) {
          entry.engine.destroy(() => {});
          globalEngines.delete(hash);
        }
      }
    },
    10 * 60 * 1000,
  );
}

function evictOldestEngineIfNeeded(): void {
  if (globalEngines.size < MAX_CONCURRENT_ENGINES) return;

  let oldestHash: string | null = null;
  let oldestTime = Infinity;

  for (const [hash, entry] of globalEngines.entries()) {
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestHash = hash;
    }
  }

  if (oldestHash) {
    const oldestEntry = globalEngines.get(oldestHash);
    oldestEntry?.engine.destroy(() => {});
    globalEngines.delete(oldestHash);
  }
}

function getOrCreateTorrentEngine(
  infoHash: string,
  customTrackers: string[] = [],
): Promise<TorrentEntry> {
  const hash = infoHash.toLowerCase();

  if (globalEngines.has(hash)) {
    const entry = globalEngines.get(hash)!;
    entry.lastUsed = Date.now();
    if (entry.files && entry.files.length > 0) {
      return Promise.resolve(entry);
    }
  }

  if (pendingPromises.has(hash)) {
    return pendingPromises.get(hash)!;
  }

  evictOldestEngineIfNeeded();

  const allTrackers = Array.from(new Set([...DEFAULT_TRACKERS, ...customTrackers]));

  const promise = new Promise<TorrentEntry>((resolve, reject) => {
    let finished = false;

    const engine = torrentStream(`magnet:?xt=urn:btih:${hash}`, {
      trackers: allTrackers,
    }) as unknown as TorrentEngine;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      pendingPromises.delete(hash);
      try {
        engine.destroy(() => {});
      } catch {}
      reject(new Error(`Timeout connecting to swarm for hash: ${hash}`));
    }, 30000);

    const entry: TorrentEntry = {
      engine,
      lastUsed: Date.now(),
      files: [],
    };

    engine.on("ready", () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      pendingPromises.delete(hash);
      entry.files = engine.files;
      globalEngines.set(hash, entry);
      resolve(entry);
    });

    engine.on("error", (err: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      pendingPromises.delete(hash);
      globalEngines.delete(hash);
      try {
        engine.destroy(() => {});
      } catch {}
      reject(err);
    });
  });

  promise.catch(() => {
    pendingPromises.delete(hash);
  });

  pendingPromises.set(hash, promise);
  return promise;
}

function getAudioMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".m4b") || lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".wav")) return "audio/wav";
  return "audio/mpeg";
}

function resolveAudioFile(
  torrentFiles: TorrentFile[],
  requestedFileName?: string | null,
  trackIndex?: number,
): TorrentFile | null {
  const audioFiles = torrentFiles
    .filter((f) => {
      const lower = f.name.toLowerCase();
      return (
        lower.endsWith(".mp3") ||
        lower.endsWith(".m4b") ||
        lower.endsWith(".m4a") ||
        lower.endsWith(".flac") ||
        lower.endsWith(".ogg") ||
        lower.endsWith(".aac") ||
        lower.endsWith(".wav")
      );
    })
    .sort((a, b) =>
      a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }),
    );

  if (audioFiles.length === 0) return null;

  if (requestedFileName) {
    const reqClean = requestedFileName.trim().toLowerCase();

    let match = audioFiles.find((f) => f.name.trim().toLowerCase() === reqClean);
    if (match) return match;

    match = audioFiles.find((f) => f.path.trim().toLowerCase() === reqClean);
    if (match) return match;

    match = audioFiles.find((f) => reqClean.endsWith(f.name.trim().toLowerCase()));
    if (match) return match;

    match = audioFiles.find((f) => {
      const flat = f.path.toLowerCase().replace(/[\/\\]+/g, " ");
      return flat.includes(reqClean) || reqClean.includes(flat);
    });
    if (match) return match;

    const normReq = reqClean.replace(/[^a-z0-9]/g, "");
    if (normReq.length > 3) {
      match = audioFiles.find((f) => {
        const normPath = f.path.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normName = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normPath.includes(normReq) || normReq.includes(normName);
      });
      if (match) return match;
    }
  }

  if (typeof trackIndex === "number" && !isNaN(trackIndex)) {
    if (trackIndex >= 0 && trackIndex < audioFiles.length) {
      return audioFiles[trackIndex];
    }
  }

  return audioFiles[0];
}

function createWebStream(nodeStream: NodeJS.ReadableStream): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      });
      nodeStream.on("end", () => {
        try {
          controller.close();
        } catch {}
      });
      nodeStream.on("error", (err) => {
        try {
          controller.error(err);
        } catch {}
      });
      nodeStream.on("close", () => {
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      try {
        (nodeStream as { destroy?: () => void }).destroy?.();
      } catch {}
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function HEAD(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const infoHash = searchParams.get("infoHash");
  const requestedFile = searchParams.get("file");
  const trackParam = searchParams.get("track");
  const trackIndex = trackParam !== null ? parseInt(trackParam, 10) : undefined;
  const customTrackers = searchParams.getAll("tr");

  if (!infoHash || !HASH_REGEX.test(infoHash.trim())) {
    return new Response("Invalid or missing 'infoHash' parameter", { status: 400 });
  }

  try {
    const entry = await getOrCreateTorrentEngine(infoHash.trim(), customTrackers);
    entry.lastUsed = Date.now();

    const file = resolveAudioFile(entry.files, requestedFile, trackIndex);
    if (!file) {
      return new Response("Audio file not found in torrent swarm", { status: 404 });
    }

    file.select();

    const totalSize = file.length;
    const rangeHeader = request.headers.get("range");
    const mime = getAudioMimeType(file.name);

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || start < 0 || start >= totalSize || end < start) {
        return new Response("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const chunkSize = end - start + 1;
      return new Response(null, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mime,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(null, {
      status: 200,
      headers: {
        "Content-Length": totalSize.toString(),
        "Content-Type": mime,
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(`Stream error: ${err instanceof Error ? err.message : String(err)}`, {
      status: 504,
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const infoHash = searchParams.get("infoHash");
  const requestedFile = searchParams.get("file");
  const trackParam = searchParams.get("track");
  const trackIndex = trackParam !== null ? parseInt(trackParam, 10) : undefined;
  const customTrackers = searchParams.getAll("tr");

  if (!infoHash || !HASH_REGEX.test(infoHash.trim())) {
    return new Response("Invalid or missing 'infoHash' parameter", { status: 400 });
  }

  try {
    const entry = await getOrCreateTorrentEngine(infoHash.trim(), customTrackers);
    entry.lastUsed = Date.now();

    const file = resolveAudioFile(entry.files, requestedFile, trackIndex);
    if (!file) {
      return new Response("Audio file not found in torrent swarm", { status: 404 });
    }

    file.select();

    const totalSize = file.length;
    const rangeHeader = request.headers.get("range");
    const mime = getAudioMimeType(file.name);

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || start < 0 || start >= totalSize || end < start) {
        return new Response("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const chunkSize = end - start + 1;
      const nodeStream = file.createReadStream({ start, end });

      if (request.signal) {
        request.signal.addEventListener("abort", () => {
          try {
            (nodeStream as { destroy?: () => void }).destroy?.();
          } catch {}
        });
      }

      const webStream = createWebStream(nodeStream);

      return new Response(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mime,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const nodeStream = file.createReadStream();
    if (request.signal) {
      request.signal.addEventListener("abort", () => {
        try {
          (nodeStream as { destroy?: () => void }).destroy?.();
        } catch {}
      });
    }

    const webStream = createWebStream(nodeStream);

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Length": totalSize.toString(),
        "Content-Type": mime,
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(`Stream error: ${err instanceof Error ? err.message : String(err)}`, {
      status: 504,
    });
  }
}
