import type { CharacterAlignmentResponseModel, TranscriptionSegment } from "../types";

export function buildCharacterAlignment(
  text: string,
  segments: TranscriptionSegment[],
): CharacterAlignmentResponseModel {
  const characters: string[] = [];
  const characterStartTimesSeconds: number[] = [];
  const characterEndTimesSeconds: number[] = [];

  if (!segments || segments.length === 0) {
    const chars = Array.from(text.trim() || "No transcript available");
    const fallbackDuration = 1;
    for (let i = 0; i < chars.length; i++) {
      characters.push(chars[i]);
      characterStartTimesSeconds.push(
        Math.round((i / Math.max(1, chars.length)) * fallbackDuration * 1000) / 1000,
      );
      characterEndTimesSeconds.push(
        Math.round(((i + 1) / Math.max(1, chars.length)) * fallbackDuration * 1000) / 1000,
      );
    }
    return {
      characters,
      characterStartTimesSeconds,
      characterEndTimesSeconds,
    };
  }

  for (let sIndex = 0; sIndex < segments.length; sIndex++) {
    const segment = segments[sIndex];
    const segText = segment.text.trim();
    if (!segText) continue;

    if (characters.length > 0) {
      const prevEnd = characterEndTimesSeconds[characterEndTimesSeconds.length - 1] ?? 0;
      const gapStart = prevEnd;
      const gapEnd = Math.max(gapStart, segment.startSecond);
      characters.push(" ");
      characterStartTimesSeconds.push(gapStart);
      characterEndTimesSeconds.push(gapEnd);
    }

    const segChars = Array.from(segText);
    const segDuration = Math.max(0.05, segment.endSecond - segment.startSecond);
    const charStep = segDuration / segChars.length;

    for (let cIndex = 0; cIndex < segChars.length; cIndex++) {
      const char = segChars[cIndex];
      const start = segment.startSecond + cIndex * charStep;
      const end = segment.startSecond + (cIndex + 1) * charStep;

      characters.push(char);
      characterStartTimesSeconds.push(Math.round(start * 1000) / 1000);
      characterEndTimesSeconds.push(Math.round(end * 1000) / 1000);
    }
  }

  return {
    characters,
    characterStartTimesSeconds,
    characterEndTimesSeconds,
  };
}
