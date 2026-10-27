"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, RotateCcw, Home } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export default function BookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[BookError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
            <BookOpen size={28} />
          </EmptyMedia>
          <EmptyTitle>Failed to load audiobook</EmptyTitle>
          <EmptyDescription>
            We couldn&apos;t fetch the audiobook details. The source may be temporarily unavailable.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row gap-3">
          <Button type="button" onClick={reset} variant="default">
            <RotateCcw size={16} className="mr-1.5" />
            <span>Retry</span>
          </Button>
          <Button render={<Link href="/" />} nativeButton={false} variant="outline">
            <Home size={16} className="mr-1.5" />
            <span>Back to Catalog</span>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
