export function getStreamUrl(
  infoHash: string = "",
  fileName: string = "",
  trackIndex: number = 0,
  trackers: string[] = [],
): string {
  const trackerParams =
    trackers.length > 0 ? "&" + trackers.map((tr) => `tr=${encodeURIComponent(tr)}`).join("&") : "";
  return `/api/stream?infoHash=${infoHash}&file=${encodeURIComponent(fileName)}&track=${trackIndex}${trackerParams}`;
}
