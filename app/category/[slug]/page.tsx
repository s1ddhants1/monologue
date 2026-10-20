import React from "react";
import type { Metadata } from "next";
import {
  getCategoryAudiobooks,
  POPULAR_CATEGORIES,
  CategoryPills,
  SortableBookGrid,
  SortOption,
  SortDirection,
  PaginationControls,
} from "@/features/audiobooks";

export const revalidate = 600;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ sort?: string; dir?: string; page?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const categoryMeta = POPULAR_CATEGORIES.find((c) => c.slug === slug);
  const displayName = categoryMeta ? categoryMeta.name : slug.replace(/-/g, " ");

  return {
    title: `${displayName} Audiobooks · Monologue`,
    description: `Discover and stream top ${displayName} audiobooks on Monologue.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const urlParams = searchParams ? await searchParams : undefined;
  const pageNum = parseInt(urlParams?.page || "1", 10) || 1;
  const initialSort = urlParams?.sort as SortOption | undefined;
  const initialDirection = urlParams?.dir as SortDirection | undefined;

  const categoryMeta = POPULAR_CATEGORIES.find((c) => c.slug === slug);
  const displayName = categoryMeta ? categoryMeta.name : slug.replace(/-/g, " ");

  const { results: books, totalPages = 1 } = await getCategoryAudiobooks(slug, pageNum);

  return (
    <div id="page-category">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground capitalize sm:text-3xl">
            {displayName} Audiobooks
          </h1>
          <p className="text-xs text-muted-foreground">
            Curated collection of unabridged {displayName.toLowerCase()} audiobooks.
          </p>
        </div>
      </div>

      <CategoryPills activeSlug={slug} />

      <section className="mt-6 mb-10">
        <SortableBookGrid
          books={books}
          initialSort={initialSort}
          initialDirection={initialDirection}
        />
        <PaginationControls
          currentPage={pageNum}
          totalPages={totalPages}
          baseUrl={`/category/${slug}`}
          queryParams={{ sort: initialSort, dir: initialDirection }}
        />
      </section>
    </div>
  );
}
