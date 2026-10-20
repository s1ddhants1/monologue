import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  queryParams?: Record<string, string | number | undefined>;
}

function buildPageUrl(
  baseUrl: string,
  page: number,
  queryParams?: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== "" && key !== "page") {
        searchParams.set(key, String(value));
      }
    }
  }
  if (page > 1) {
    searchParams.set("page", String(page));
  }
  const qs = searchParams.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

export function PaginationControls({
  currentPage,
  totalPages,
  baseUrl,
  queryParams,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const prevUrl = currentPage > 1 ? buildPageUrl(baseUrl, currentPage - 1, queryParams) : null;
  const nextUrl =
    currentPage < totalPages ? buildPageUrl(baseUrl, currentPage + 1, queryParams) : null;

  return (
    <Pagination className="pagination-controls mt-8 border-t border-white/5 pt-4 select-none">
      <PaginationContent className="w-full justify-between sm:justify-center">
        <PaginationItem>
          <PaginationPrevious
            href={prevUrl ?? undefined}
            text="Prev"
            aria-label="Previous Page"
            aria-disabled={!prevUrl ? "true" : undefined}
            className={!prevUrl ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>

        <div className="hidden items-center gap-1.5 sm:flex">
          {pageNumbers.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <PaginationItem key={p}>
                <PaginationLink
                  href={buildPageUrl(baseUrl, p, queryParams)}
                  isActive={isCurrent}
                  aria-label={String(p)}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            );
          })}
        </div>

        <div className="px-2 text-xs font-medium text-muted-foreground sm:hidden">
          Page {currentPage} of {totalPages}
        </div>

        <PaginationItem>
          <PaginationNext
            href={nextUrl ?? undefined}
            text="Next"
            aria-label="Next Page"
            aria-disabled={!nextUrl ? "true" : undefined}
            className={!nextUrl ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
