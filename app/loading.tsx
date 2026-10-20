import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading audiobooks">
      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded-md bg-white/10" />
          <Skeleton className="h-5 w-10 rounded-full bg-white/10" />
        </div>

        <div className="-mx-0.5 -my-0.5 no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-0.5 pt-0.5 pb-2.5 sm:gap-3.5 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[136px] flex-none snap-start sm:w-[152px] md:w-[164px]">
              <div>
                <div className="relative mb-2 aspect-square overflow-hidden rounded-lg border border-border bg-card md:rounded-xl">
                  <Skeleton className="h-full w-full rounded-lg bg-white/10 md:rounded-xl" />
                </div>
                <Skeleton className="mt-1.5 h-3.5 w-3/4 rounded bg-white/10" />
                <Skeleton className="mt-1 h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full bg-white/10" />
            <Skeleton className="h-5 w-36 rounded-md bg-white/10" />
          </div>
          <Skeleton className="h-5 w-10 rounded-full bg-white/10" />
        </div>

        <div className="-mx-0.5 -my-0.5 no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-0.5 pt-0.5 pb-2.5 sm:gap-3.5 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[136px] flex-none snap-start sm:w-[152px] md:w-[164px]">
              <div>
                <div className="relative mb-2 aspect-square overflow-hidden rounded-lg border border-border bg-card md:rounded-xl">
                  <Skeleton className="h-full w-full rounded-lg bg-white/10 md:rounded-xl" />
                </div>
                <Skeleton className="mt-1.5 h-3.5 w-3/4 rounded bg-white/10" />
                <Skeleton className="mt-1 h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
