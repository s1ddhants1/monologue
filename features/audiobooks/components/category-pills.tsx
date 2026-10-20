import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { POPULAR_CATEGORIES } from "@/types";
import { cn } from "@/lib/utils";

export interface CategoryPillsProps {
  activeSlug?: string;
}

export function CategoryPills({ activeSlug }: CategoryPillsProps) {
  const isAllActive = !activeSlug || activeSlug === "all";

  return (
    <div
      className="-mx-0.5 -my-1 no-scrollbar flex snap-x items-center gap-2 overflow-x-auto px-0.5 pt-1 pb-3"
      role="tablist"
      aria-label="Browse by genre"
    >
      <Badge
        asChild
        variant={isAllActive ? "default" : "secondary"}
        className={cn(
          "cursor-pointer snap-start rounded-full px-3 py-1 text-xs whitespace-nowrap",
          isAllActive && "active",
        )}
      >
        <Link href="/explore" role="tab" aria-selected={isAllActive}>
          All
        </Link>
      </Badge>
      {POPULAR_CATEGORIES.map((cat) => {
        const isActive = activeSlug === cat.slug;
        return (
          <Badge
            key={cat.slug}
            asChild
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "cursor-pointer snap-start rounded-full px-3 py-1 text-xs whitespace-nowrap",
              isActive && "active",
            )}
          >
            <Link href={`/category/${cat.slug}`} role="tab" aria-selected={isActive}>
              {cat.name}
            </Link>
          </Badge>
        );
      })}
    </div>
  );
}
