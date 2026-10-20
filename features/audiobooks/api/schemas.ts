import { z } from "zod";

export const AudiobookFileSchema = z.object({
  name: z.string(),
  size: z.string().optional(),
  duration: z.string().optional(),
  trackNumber: z.number().optional(),
  downloadUrl: z.string().optional(),
  index: z.number().optional(),
  extension: z.string().optional(),
  isAudio: z.boolean().optional(),
});

export const AudiobookSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().optional(),
  narrator: z.string().optional(),
  cover: z.string(),
  format: z.enum(["M4B", "MP3", "Mixed", "Unknown"]).optional(),
  bitrate: z.string().optional(),
  fileSize: z.string().optional(),
  postedDate: z.string().optional(),
  url: z.string(),
  categories: z.array(z.string()),
  seeders: z.number().optional(),
  leechers: z.number().optional(),
});

export const AudiobookDetailSchema = AudiobookSummarySchema.extend({
  description: z.string(),
  duration: z.string().optional(),
  files: z.array(AudiobookFileSchema),
  trackers: z.array(z.string()),
  infoHash: z.string().optional(),
  torrentUrl: z.string().optional(),
  magnetUrl: z.string().optional(),
  magnetUri: z.string().optional(),
  isAbridged: z.boolean().optional(),
  totalAudioFiles: z.number().optional(),
  isMultiPart: z.boolean().optional(),
});

export type ValidatedAudiobookSummary = z.infer<typeof AudiobookSummarySchema>;
export type ValidatedAudiobookDetail = z.infer<typeof AudiobookDetailSchema>;
