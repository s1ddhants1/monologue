"use client";

import React from "react";
import { Button } from "@/components/ui/button";

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
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0b] p-8 text-center font-sans text-[#f2f2f0]">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="mb-2 text-xl font-bold text-[#f2f2f0]">Application Error</h2>
        <p className="mb-4 max-w-md text-sm text-[#999995]">
          A critical error occurred in the application shell.
        </p>
        {error.message && (
          <p className="mb-4 max-w-md rounded-lg border border-[#292929] bg-[#141414] px-4 py-2 font-mono text-xs text-[#999995]">
            {error.message}
          </p>
        )}
        <Button type="button" variant="default" onClick={reset}>
          Try Again
        </Button>
      </body>
    </html>
  );
}
