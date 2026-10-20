#!/usr/bin/env node

import http from "node:http";
import url from "node:url";

const PORT = parseInt(process.env.PORT || process.argv[2] || "8888", 10);

console.log(`\n🎧 Audio Stream Bridge initializing on port ${PORT}...`);

let torrentStream;
try {
  torrentStream = (await import("torrent-stream")).default;
} catch {
  console.log("ℹ️  Note: For local high-speed TCP/UDP BitTorrent streaming, run:");
  console.log("    pnpm add torrent-stream\n");
}

const activeEngines = new Map();

function getOrCreateEngine(infoHash) {
  if (!torrentStream) return null;
  const hash = infoHash.toLowerCase();
  if (activeEngines.has(hash)) {
    return activeEngines.get(hash);
  }

  const engine = torrentStream(`magnet:?xt=urn:btih:${hash}`, {
    trackers: [
      "udp://tracker.opentrackr.org:1337/announce",
      "udp://tracker.openbittorrent.com:6969/announce",
      "udp://tracker.tiny-vps.com:6969/announce",
      "udp://p4p.arenabg.com:1337/announce",
      "http://tracker.bt4g.com:2095/announce",
      "http://bt.okmp3.ru:2710/announce",
    ],
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");

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
    const infoHash = parsedUrl.query.infoHash;
    const requestedFile = parsedUrl.query.file;

    const trackParam = parsedUrl.query.track;
    const trackIndex = trackParam !== undefined ? parseInt(trackParam, 10) : undefined;

    const HASH_REGEX = /^[a-fA-F0-9]{40}$|^[a-zA-Z2-7]{32}$/;
    if (!infoHash || !HASH_REGEX.test(infoHash.trim())) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Invalid or missing infoHash query param");
      return;
    }

    if (!torrentStream) {
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("torrent-stream package not installed. Run: pnpm add torrent-stream");
      return;
    }

    const entry = getOrCreateEngine(infoHash.trim());
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

      const totalSize = file.length;
      const range = req.headers.range;
      const mime = getAudioMimeType(file.name);

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (isNaN(start) || start < 0 || start >= totalSize || end < start) {
          res.writeHead(416, {
            "Content-Range": `bytes */${totalSize}`,
            "Access-Control-Allow-Origin": "*",
          });
          res.end();
          return;
        }

        const chunksize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mime,
        });

        const stream = file.createReadStream({ start, end });
        req.on("close", () => {
          try {
            stream.destroy?.();
          } catch {}
        });
        stream.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": totalSize,
          "Content-Type": mime,
          "Accept-Ranges": "bytes",
        });
        const stream = file.createReadStream();
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

server.listen(PORT, () => {
  console.log(`🚀 Bridge listening at: http://localhost:${PORT}`);
  console.log(`🔗 Health check:        http://localhost:${PORT}/health`);
  console.log(
    `🎧 Audio stream path:   http://localhost:${PORT}/stream?infoHash=<hash>&file=<filename>\n`,
  );
});
