import { AudiobookFile, AudiobookDetail } from "@/types";
import { formatTime } from "@/lib/utils/format";

export function parseSizeToBytes(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d\.]+)\s*([KMGT]?B)/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit.startsWith("G")) return num * 1024 * 1024 * 1024;
  if (unit.startsWith("M")) return num * 1024 * 1024;
  if (unit.startsWith("K")) return num * 1024;
  return num;
}

export function parseBitrateToBps(bitrateStr?: string): number {
  if (!bitrateStr) return 0;
  const match = bitrateStr.match(/(\d+)\s*k/i);
  if (!match) return 0;
  return parseInt(match[1], 10) * 1000;
}

export function parseDurationToSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  let total = 0;
  const hrsMatch = durationStr.match(/(\d+)\s*(?:hrs?|hours?)/i);
  if (hrsMatch) total += parseInt(hrsMatch[1], 10) * 3600;
  const minsMatch = durationStr.match(/(\d+)\s*(?:mins?|minutes?)/i);
  if (minsMatch) total += parseInt(minsMatch[1], 10) * 60;
  const secsMatch = durationStr.match(/(\d+)\s*(?:secs?|seconds?)/i);
  if (secsMatch) total += parseInt(secsMatch[1], 10);
  if (total > 0) return total;

  const colonParts = durationStr
    .trim()
    .split(":")
    .map((p) => parseInt(p, 10));
  if (colonParts.every((n) => !isNaN(n))) {
    if (colonParts.length === 3) {
      return colonParts[0] * 3600 + colonParts[1] * 60 + colonParts[2];
    }
    if (colonParts.length === 2) {
      return colonParts[0] * 60 + colonParts[1];
    }
  }
  return 0;
}

export function getTrackDuration(
  file: AudiobookFile,
  book?: AudiobookDetail,
  isCurrent?: boolean,
  activePlaybackDuration?: number,
): string {
  if (isCurrent && activePlaybackDuration && activePlaybackDuration > 0) {
    return formatTime(activePlaybackDuration);
  }

  if (file.duration) {
    const parsed = parseDurationToSeconds(file.duration);
    if (parsed > 0) {
      return formatTime(parsed);
    }
    return file.duration;
  }

  const fileBytes = parseSizeToBytes(file.size);

  if (fileBytes > 0 && book?.bitrate) {
    const bps = parseBitrateToBps(book.bitrate);
    if (bps > 0) {
      const estimatedSecs = Math.round((fileBytes * 8) / bps);
      if (estimatedSecs > 0) {
        return formatTime(estimatedSecs);
      }
    }
  }

  const bookTotalSecs = parseDurationToSeconds(book?.duration);
  if (bookTotalSecs > 0) {
    const audioFiles = book?.files || [];
    if (audioFiles.length <= 1) {
      return formatTime(bookTotalSecs);
    }
    const totalBytes = audioFiles.reduce((acc, f) => acc + parseSizeToBytes(f.size), 0);
    if (totalBytes > 0 && fileBytes > 0) {
      const propSecs = Math.round(bookTotalSecs * (fileBytes / totalBytes));
      if (propSecs > 0) {
        return formatTime(propSecs);
      }
    }
  }

  return "—";
}
