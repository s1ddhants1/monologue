"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { AlertCircle } from "@/components/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
            <AlertCircle size={28} />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            An unexpected error occurred. Please try again or refresh the page.
          </EmptyDescription>
        </EmptyHeader>
        {error.message && (
          <p className="bg-chrome-subtle rounded-lg border border-border px-4 py-2 font-mono text-xs text-muted-foreground">
            {error.message}
          </p>
        )}
        <EmptyContent>
          <Button type="button" variant="default" onClick={reset}>
            Try Again
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
