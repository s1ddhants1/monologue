import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, BookOpen, ListMusic } from "@/components/icons";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getAudiobookDetail,
  BookSynopsis,
  TracklistInspector,
  BookmarkButton,
  BookActionsMenu,
} from "@/features/audiobooks";
import { PlayBookButton } from "@/features/player";

export const revalidate = 1800;

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await getAudiobookDetail(slug);
  if (!book) {
    return {
      title: "Audiobook Not Found · Monologue",
    };
  }

  const descSnippet = book.description
    ? book.description.slice(0, 160).replace(/\s+/g, " ").trim()
    : `Stream ${book.title} by ${book.author || "Audiobook"} on Monologue.`;

  return {
    title: `${book.title} · Monologue Player`,
    description: descSnippet,
    openGraph: {
      title: `${book.title} · Monologue`,
      description: book.author ? `By ${book.author}` : descSnippet,
      images: book.cover ? [{ url: book.cover }] : undefined,
    },
  };
}

export default async function BookDetailPage({ params }: BookPageProps) {
  const { slug } = await params;
  const book = await getAudiobookDetail(slug);

  if (!book) {
    notFound();
  }

  return (
    <div className="pb-8" id="page-album">
      <Card className="relative my-4 overflow-clip rounded-3xl border border-border/80 bg-card p-5 sm:p-8 md:p-10">
        <div className="relative z-10 flex w-full min-w-0 flex-col items-center gap-6 sm:gap-8 md:flex-row md:items-end md:gap-10">
          <div className="relative shrink-0">
            <div className="w-44 sm:w-52 md:w-60">
              <AspectRatio
                ratio={1}
                className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/30"
              >
                <Image
                  src={book.cover || "/placeholder-cover.svg"}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 176px, (max-width: 768px) 208px, 240px"
                  className="pointer-events-none scale-110 object-cover opacity-25 blur-2xl"
                  aria-hidden="true"
                />
                <Image
                  src={book.cover || "/placeholder-cover.svg"}
                  alt={book.title}
                  fill
                  sizes="(max-width: 640px) 176px, (max-width: 768px) 208px, 240px"
                  priority
                  className="relative z-10 size-full object-contain p-1.5 drop-shadow-md"
                />
              </AspectRatio>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col items-center gap-2.5 text-center md:w-auto md:flex-1 md:items-start md:text-left">
            <h1 className="w-full max-w-full text-2xl font-black tracking-tight text-balance wrap-anywhere text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
              {book.title}
            </h1>

            <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm wrap-anywhere text-muted-foreground md:justify-start">
              {book.author && (
                <Link
                  href={`/explore?q=${encodeURIComponent(book.author)}`}
                  className="max-w-full font-semibold wrap-anywhere text-foreground transition-colors hover:text-primary"
                >
                  By {book.author}
                </Link>
              )}
              {book.narrator && (
                <>
                  <span>•</span>
                  <span className="max-w-full wrap-anywhere">Read by {book.narrator}</span>
                </>
              )}
              {book.files && book.files.length > 0 && (
                <>
                  <span>•</span>
                  <span className="shrink-0">
                    {book.files.length} {book.files.length === 1 ? "track" : "tracks"}
                  </span>
                </>
              )}
              {book.duration && (
                <>
                  <span>•</span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono">
                    <Clock size={13} /> {book.duration}
                  </span>
                </>
              )}
            </div>

            {book.categories && book.categories.length > 0 && (
              <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1.5 pt-1 md:justify-start">
                {book.categories.map((cat) => (
                  <Badge
                    key={cat}
                    render={<Link href={`/category/${cat.toLowerCase().replace(/\s+/g, "-")}`} />}
                    variant="secondary"
                    className="h-auto min-h-5 max-w-full shrink cursor-pointer rounded-full py-0.5 text-center wrap-anywhere whitespace-normal transition-colors hover:bg-secondary/80"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-3 flex w-full min-w-0 flex-wrap items-center justify-center gap-3 md:justify-start">
              <PlayBookButton book={book} trailingActions={<BookActionsMenu book={book} />}>
                <BookmarkButton book={book} />
              </PlayBookButton>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 flex flex-col gap-10">
        <Tabs defaultValue="tracks" className="w-full">
          <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="tracks" className="cursor-pointer gap-2">
              <ListMusic size={15} />
              <span>Tracks ({book.files?.length || 1})</span>
            </TabsTrigger>
            <TabsTrigger value="synopsis" className="cursor-pointer gap-2">
              <BookOpen size={15} />
              <span>Synopsis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="flex flex-col gap-4">
            <section className="track-list-section" id="album-section-tracks">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Chapters &amp; Audio Tracks
                </h2>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {book.files?.length || 1} {book.files?.length === 1 ? "part" : "parts"}
                </span>
              </div>
              <TracklistInspector book={book} />
            </section>
          </TabsContent>

          <TabsContent value="synopsis" className="flex flex-col gap-4">
            <section className="content-section" id="album-section-synopsis">
              <h2 className="mb-3 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Synopsis &amp; Details
              </h2>
              {book.description ? (
                <BookSynopsis description={book.description} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No synopsis provided for this release.
                </p>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
