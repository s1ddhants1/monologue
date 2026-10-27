#!/usr/bin/env node

import http from "node:http";
import url from "node:url";

const PORT = parseInt(process.env.PORT || process.argv[2] || "8888", 10);
const HOST = process.env.BRIDGE_HOST || "127.0.0.1";
const MAX_ACTIVE_ENGINES = 5;
const MAX_CONCURRENT_STREAMS = 32;
const MAX_TRACKERS = 16;
const ALLOWED_ORIGINS = new Set(
  (process.env.BRIDGE_ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

console.log(`\n🎧 Audio Stream Bridge initializing on port ${PORT}...`);

let torrentStream;
try {
  torrentStream = (await import("torrent-stream")).default;
} catch {
  console.log("ℹ️  Note: For local high-speed TCP/UDP BitTorrent streaming, run:");
  console.log("    pnpm add torrent-stream\n");
}

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

const activeEngines = new Map();
let activeStreamCount = 0;

function isPrivateHost(hostname) {
  const lower = hostname.toLowerCase().replace(/\.$/, "");
  if (lower === "localhost" || lower.endsWith(".local") || lower.endsWith(".internal")) return true;
  if (/^10\.|^127\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  return false;
}

function sanitizeTrackers(trackers) {
  return Array.from(new Set(trackers))
    .filter((tracker) => tracker.length > 0 && tracker.length <= 512)
    .filter((tracker) => {
      try {
        const trackerUrl = new URL(tracker);
        return (
          ["udp:", "http:", "https:"].includes(trackerUrl.protocol) &&
          !trackerUrl.username &&
          !trackerUrl.password &&
          !isPrivateHost(trackerUrl.hostname)
        );
      } catch {
        return false;
      }
    })
    .slice(0, MAX_TRACKERS);
}

function parseByteRange(value, totalSize) {
  if (!value) return { start: 0, end: totalSize - 1 };
  if (!value.startsWith("bytes=") || value.includes(",")) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match) return null;

  const [, startText, endText] = match;
  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, totalSize - suffixLength), end: totalSize - 1 };
  }

  const start = Number(startText);
  const end = endText ? Number(endText) : totalSize - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= totalSize ||
    end < start
  ) {
    return null;
  }
  return { start, end: Math.min(end, totalSize - 1) };
}

function getOrCreateEngine(infoHash, customTrackers = []) {
  if (!torrentStream) return null;
  const hash = infoHash.toLowerCase();
  if (activeEngines.has(hash)) {
    return activeEngines.get(hash);
  }

  if (activeEngines.size >= MAX_ACTIVE_ENGINES) return null;

  const allTrackers = Array.from(
    new Set([...DEFAULT_TRACKERS, ...sanitizeTrackers(customTrackers)]),
  );
  const engine = torrentStream(`magnet:?xt=urn:btih:${hash}`, {
    trackers: allTrackers,
  });

  const entry = {
    engine,
    lastUsed: Date.now(),
    files: [],
  };

  engine.on("ready", () => {
    entry.files = engine.files;
    console.log(`✅ [Torrent Ready] ${hash} (${engine.files.length} files found)`);
  });

  activeEngines.set(hash, entry);
  return entry;
}

setInterval(
  () => {
    const now = Date.now();
    for (const [hash, entry] of activeEngines.entries()) {
      if (now - entry.lastUsed > 15 * 60 * 1000) {
        console.log(`🧹 Evicting idle torrent engine: ${hash}`);
        entry.engine.destroy();
        activeEngines.delete(hash);
      }
    }
  },
  10 * 60 * 1000,
);

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
  const requestOrigin = req.headers.origin;
  if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ready",
        torrentsActive: activeEngines.size,
        torrentStreamAvailable: !!torrentStream,
      }),
    );
    return;
  }

  if (parsedUrl.pathname === "/stream") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD, OPTIONS" });
      res.end();
      return;
    }
    const infoHashValue = parsedUrl.query.infoHash;
    const fileValue = parsedUrl.query.file;
    const infoHash = Array.isArray(infoHashValue) ? infoHashValue[0] : infoHashValue;
    const requestedFile = Array.isArray(fileValue) ? fileValue[0] : fileValue;

    const trackValue = parsedUrl.query.track;
    const trackParam = Array.isArray(trackValue) ? trackValue[0] : trackValue;
    const trackIndex = trackParam !== undefined ? Number(trackParam) : undefined;

    const HASH_REGEX = /^[a-fA-F0-9]{40}$|^[a-zA-Z2-7]{32}$/;
    if (
      !infoHash ||
      !HASH_REGEX.test(infoHash.trim()) ||
      (trackParam !== undefined &&
        (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex > 10000))
    ) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Invalid or missing infoHash query param");
      return;
    }

    if (!torrentStream) {
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("torrent-stream package not installed. Run: pnpm add torrent-stream");
      return;
    }

    const trackerValue = parsedUrl.query.tr;
    const customTrackers = Array.isArray(trackerValue)
      ? trackerValue
      : trackerValue
        ? [trackerValue]
        : [];

    const entry = getOrCreateEngine(infoHash.trim(), customTrackers);
    if (!entry) {
      res.writeHead(503, { "Content-Type": "text/plain", "Retry-After": "30" });
      res.end("Bridge capacity is temporarily unavailable");
      return;
    }
    entry.lastUsed = Date.now();

    const getAudioMimeType = (fileName) => {
      const l = fileName.toLowerCase();
      if (l.endsWith(".m4b") || l.endsWith(".m4a")) return "audio/mp4";
      if (l.endsWith(".flac")) return "audio/flac";
      if (l.endsWith(".ogg")) return "audio/ogg";
      if (l.endsWith(".aac")) return "audio/aac";
      if (l.endsWith(".wav")) return "audio/wav";
      return "audio/mpeg";
    };

    const resolveFile = (files) => {
      const audioFiles = files
        .filter((f) => {
          const l = f.name.toLowerCase();
          return (
            l.endsWith(".mp3") ||
            l.endsWith(".m4b") ||
            l.endsWith(".m4a") ||
            l.endsWith(".flac") ||
            l.endsWith(".ogg") ||
            l.endsWith(".aac") ||
            l.endsWith(".wav")
          );
        })
        .sort((a, b) =>
          a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }),
        );

      if (audioFiles.length === 0) return null;

      if (requestedFile) {
        const reqClean = requestedFile.trim().toLowerCase();
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
      }

      if (typeof trackIndex === "number" && !isNaN(trackIndex)) {
        if (trackIndex >= 0 && trackIndex < audioFiles.length) {
          return audioFiles[trackIndex];
        }
      }

      return audioFiles[0];
    };

    const serveStream = () => {
      const file = resolveFile(entry.engine.files);

      if (!file) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Audio file not found in torrent swarm");
        return;
      }

      file.select();

      const totalSize = file.length;
      const range = req.headers.range;
      const mime = getAudioMimeType(file.name);

      if (req.method === "HEAD") {
        if (range) {
          const parsedRange = parseByteRange(range, totalSize);
          if (!parsedRange) {
            res.writeHead(416, { "Content-Range": `bytes */${totalSize}` });
            res.end();
            return;
          }
          const chunksize = parsedRange.end - parsedRange.start + 1;
          res.writeHead(206, {
            "Content-Range": `bytes ${parsedRange.start}-${parsedRange.end}/${totalSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": mime,
          });
        } else {
          res.writeHead(200, {
            "Content-Length": totalSize,
            "Content-Type": mime,
            "Accept-Ranges": "bytes",
          });
        }
        res.end();
        return;
      }

      if (range) {
        const parsedRange = parseByteRange(range, totalSize);
        if (!parsedRange) {
          res.writeHead(416, {
            "Content-Range": `bytes */${totalSize}`,
          });
          res.end();
          return;
        }

        const chunksize = parsedRange.end - parsedRange.start + 1;
        if (activeStreamCount >= MAX_CONCURRENT_STREAMS) {
          res.writeHead(429, { "Retry-After": "10" });
          res.end("Bridge stream capacity is temporarily unavailable");
          return;
        }
        activeStreamCount += 1;
        let released = false;
        const release = () => {
          if (released) return;
          released = true;
          activeStreamCount = Math.max(0, activeStreamCount - 1);
        };

        res.writeHead(206, {
          "Content-Range": `bytes ${parsedRange.start}-${parsedRange.end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mime,
        });

        const stream = file.createReadStream({ start: parsedRange.start, end: parsedRange.end });
        stream.on("error", () => {
          release();
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
        stream.on("close", release);
        req.on("close", () => {
          try {
            stream.destroy?.();
          } catch {}
        });
        stream.pipe(res);
      } else {
        if (activeStreamCount >= MAX_CONCURRENT_STREAMS) {
          res.writeHead(429, { "Retry-After": "10" });
          res.end("Bridge stream capacity is temporarily unavailable");
          return;
        }
        activeStreamCount += 1;
        let released = false;
        const release = () => {
          if (released) return;
          released = true;
          activeStreamCount = Math.max(0, activeStreamCount - 1);
        };
        res.writeHead(200, {
          "Content-Length": totalSize,
          "Content-Type": mime,
          "Accept-Ranges": "bytes",
        });
        const stream = file.createReadStream();
        stream.on("error", () => {
          release();
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
        stream.on("close", release);
        req.on("close", () => {
          try {
            stream.destroy?.();
          } catch {}
        });
        stream.pipe(res);
      }
    };

    if (entry.engine.files && entry.engine.files.length > 0) {
      serveStream();
    } else {
      let isHandled = false;
      const timeoutTimer = setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          res.writeHead(504, { "Content-Type": "text/plain" });
          res.end("Gateway timeout: torrent swarm did not respond in time");
        }
      }, 25000);

      entry.engine.once("ready", () => {
        if (!isHandled) {
          isHandled = true;
          clearTimeout(timeoutTimer);
          serveStream();
        }
      });
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Bridge listening at: http://${HOST}:${PORT}`);
  console.log(`🔗 Health check:        http://localhost:${PORT}/health`);
  console.log(
    `🎧 Audio stream path:   http://localhost:${PORT}/stream?infoHash=<hash>&file=<filename>\n`,
  );
});
