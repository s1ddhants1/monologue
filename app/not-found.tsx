import React from "react";
import Link from "next/link";
import { Headphones, Home, Compass } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="bg-chrome-control h-16 w-16 rounded-2xl border border-border"
          >
            <Headphones size={32} className="text-primary" />
          </EmptyMedia>
          <EmptyTitle className="text-2xl font-bold">Audiobook Not Found</EmptyTitle>
          <EmptyDescription>
            The requested audiobook could not be found. Please check the title or search for another
            release.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row gap-3">
          <Button asChild variant="default" className="inline-flex items-center gap-2">
            <Link href="/">
              <Home size={16} />
              <span>Back to Catalog</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="inline-flex items-center gap-2">
            <Link href="/explore">
              <Compass size={16} />
              <span>Explore Audiobooks</span>
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
