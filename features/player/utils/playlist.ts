import { AudiobookDetail, PlayerSettings } from "@/types";

export function generateM3UPlaylist(book: AudiobookDetail, settings: PlayerSettings): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const audioFiles =
    book.files && book.files.length > 0
      ? book.files
      : [
          {
            index: 0,
            name: `${book.title}.mp3`,
            extension: "mp3" as const,
            isAudio: true,
          },
        ];

  let m3u = "#EXTM3U\n";
  audioFiles.forEach((track, idx) => {
    const streamUrl =
      settings.streamingMode === "bridge" && settings.bridgeUrl
        ? `${settings.bridgeUrl}/stream?infoHash=${book.infoHash}&file=${encodeURIComponent(track.name)}&track=${idx}`
        : `${origin}/api/stream?infoHash=${book.infoHash}&file=${encodeURIComponent(track.name)}&track=${idx}`;

    const trackTitle = track.name.replace(/\.(mp3|m4b|m4a|flac|ogg)$/i, "");
    m3u += `#EXTINF:-1,${book.author ? `${book.author} - ` : ""}${trackTitle}\n`;
    m3u += `${streamUrl}\n`;
  });

  return m3u;
}

export function downloadM3UPlaylist(book: AudiobookDetail, settings: PlayerSettings): void {
  const m3uContent = generateM3UPlaylist(book, settings);
  const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = (book.title || "audiobook").replace(/[/\\?%*:|"<>]/g, "_").slice(0, 80);
  a.href = url;
  a.download = `${safeTitle}.m3u`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
