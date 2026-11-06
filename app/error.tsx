"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
          <Alert variant="destructive" className="py-2 text-left">
            <AlertDescription className="font-mono text-xs">{error.message}</AlertDescription>
          </Alert>
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
