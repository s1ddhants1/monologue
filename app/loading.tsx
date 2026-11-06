import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading audiobooks">
      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>

        <div className="-mx-0.5 -my-0.5 no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-0.5 pt-0.5 pb-2.5 sm:gap-3.5 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[136px] flex-none snap-start sm:w-[152px] md:w-[164px]">
              <Card className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-2.5">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40">
                  <Skeleton className="size-full rounded-xl" />
                </div>
                <CardContent className="flex flex-1 flex-col justify-between px-0.5 pt-2.5 pb-0">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="mt-1.5 h-3 w-1/2 rounded" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 sm:mb-8 md:mb-10">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-5 w-36 rounded-md" />
          </div>
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>

        <div className="-mx-0.5 -my-0.5 no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-0.5 pt-0.5 pb-2.5 sm:gap-3.5 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[136px] flex-none snap-start sm:w-[152px] md:w-[164px]">
              <Card className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-2.5">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40">
                  <Skeleton className="size-full rounded-xl" />
                </div>
                <CardContent className="flex flex-1 flex-col justify-between px-0.5 pt-2.5 pb-0">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="mt-1.5 h-3 w-1/2 rounded" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
