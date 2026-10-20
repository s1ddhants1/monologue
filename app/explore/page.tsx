import React from "react";
import type { Metadata } from "next";
import {
  getLatestAudiobooks,
  searchAudiobooks,
  CategoryPills,
  SortableBookGrid,
  SortOption,
  SortDirection,
  PaginationControls,
} from "@/features/audiobooks";

export const dynamic = "force-dynamic";

interface ExplorePageProps {
  searchParams?: Promise<{ sort?: string; dir?: string; page?: string; q?: string }>;
}

export async function generateMetadata({ searchParams }: ExplorePageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  const q = params?.q?.trim();
  if (q) {
    return {
      title: `"${q}" · Audiobook Search · Monologue`,
      description: `Search results for "${q}" across unabridged audiobooks.`,
    };
  }
  return {
    title: "Explore Audiobooks · Monologue",
    description: "Browse by genre or discover unabridged audiobooks across all categories.",
  };
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const q = params?.q?.trim() || "";
  const pageNum = parseInt(params?.page || "1", 10) || 1;
  const initialSort = params?.sort as SortOption | undefined;
  const initialDirection = params?.dir as SortDirection | undefined;

  const { results: books, totalPages = 1 } = q
    ? await searchAudiobooks(q, pageNum)
    : await getLatestAudiobooks(pageNum);

  return (
    <div id="page-explore">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {q ? `Search: "${q}"` : "Explore Audiobooks"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {q
              ? `Audiobooks matching "${q}" across the catalog.`
              : "Browse by genre or discover unabridged audiobooks across all categories."}
          </p>
        </div>
      </div>

      <CategoryPills activeSlug="all" />

      <section className="mt-6 mb-10">
        <SortableBookGrid
          books={books}
          initialSort={initialSort}
          initialDirection={initialDirection}
        />
        <PaginationControls
          currentPage={pageNum}
          totalPages={totalPages}
          baseUrl="/explore"
          queryParams={{ q: q || undefined, sort: initialSort, dir: initialDirection }}
        />
      </section>
    </div>
  );
}
