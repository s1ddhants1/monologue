import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock, BookOpen, ListMusic, Sparkles } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getAudiobookDetail,
  getCategoryAudiobooks,
  BookSynopsis,
  TracklistInspector,
  BookmarkButton,
  BookActionsMenu,
  BookCard,
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

  const primaryCategory = book.categories?.[0];
  const categoryData = primaryCategory
    ? await getCategoryAudiobooks(primaryCategory.toLowerCase().replace(/\s+/g, "-"), 1).catch(
        () => ({
          results: [],
        }),
      )
    : { results: [] };

  const similarBooks = (categoryData.results || [])
    .filter((b) => b.id !== book.id && b.title.toLowerCase() !== book.title.toLowerCase())
    .slice(0, 6);

  return (
    <div className="pb-8" id="page-album">
      <header className="relative my-4 overflow-hidden rounded-3xl border border-white/10 bg-card p-6 sm:p-8 md:p-10">
        <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 md:flex-row md:items-end md:gap-10">
          <div className="relative shrink-0">
            <div className="size-44 overflow-hidden rounded-2xl border border-white/15 bg-muted/30 sm:size-52 md:size-60">
              <Image
                src={book.cover || "/placeholder-cover.svg"}
                alt={book.title}
                width={300}
                height={300}
                priority
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 text-center md:items-start md:text-left">
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
              {book.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground md:justify-start">
              {book.author && (
                <Link
                  href={`/explore?q=${encodeURIComponent(book.author)}`}
                  className="font-semibold text-foreground transition-colors hover:text-primary"
                >
                  By {book.author}
                </Link>
              )}
              {book.narrator && (
                <>
                  <span>•</span>
                  <span>Read by {book.narrator}</span>
                </>
              )}
              {book.files && book.files.length > 0 && (
                <>
                  <span>•</span>
                  <span>
                    {book.files.length} {book.files.length === 1 ? "track" : "tracks"}
                  </span>
                </>
              )}
              {book.duration && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Clock size={13} /> {book.duration}
                  </span>
                </>
              )}
            </div>

            {book.categories && book.categories.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 md:justify-start">
                {book.categories.map((cat) => (
                  <Badge
                    key={cat}
                    render={<Link href={`/category/${cat.toLowerCase().replace(/\s+/g, "-")}`} />}
                    variant="outline"
                    className="rounded-full border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <PlayBookButton book={book} trailingActions={<BookActionsMenu book={book} />}>
                <BookmarkButton book={book} />
              </PlayBookButton>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-8 space-y-10">
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

          <TabsContent value="tracks" className="space-y-4">
            <section className="track-list-section" id="album-section-tracks">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Chapters &amp; Audio Tracks
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {book.files?.length || 1} {book.files?.length === 1 ? "part" : "parts"}
                </span>
              </div>
              <TracklistInspector book={book} />
            </section>
          </TabsContent>

          <TabsContent value="synopsis" className="space-y-4">
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

        {similarBooks.length > 0 && (
          <section className="content-section pt-4" id="album-section-similar-albums">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Similar Audiobooks
                </h2>
              </div>
              {primaryCategory && (
                <Link
                  href={`/category/${primaryCategory.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  Explore {primaryCategory} &rarr;
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {similarBooks.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
