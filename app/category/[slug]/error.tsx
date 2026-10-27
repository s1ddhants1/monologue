"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export default function CategoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[CategoryError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
            <AlertCircle size={28} />
          </EmptyMedia>
          <EmptyTitle>Failed to load category</EmptyTitle>
          <EmptyDescription>
            We couldn&apos;t fetch audiobooks for this category. Please try again.
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
