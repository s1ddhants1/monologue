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
    console.error("[RootGlobalError]", error);
  }, [error]);

  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center bg-background p-6 font-sans text-foreground">
        <Empty className="max-w-md">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
              <AlertCircle size={28} />
            </EmptyMedia>
            <EmptyTitle>Application Error</EmptyTitle>
            <EmptyDescription>A critical error occurred in the application shell.</EmptyDescription>
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
      </body>
    </html>
  );
}
