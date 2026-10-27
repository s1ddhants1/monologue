"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { hapticLight } from "@/lib/capacitor";

export function AppHeader() {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const handleClear = () => {
    setSearchVal("");
  };

  return (
    <header className="sticky top-0 z-20 mb-3 flex min-h-[50px] w-full items-center justify-between gap-2 bg-background py-1.5 md:mb-4 md:min-h-[56px] md:gap-4 md:py-2">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 cursor-pointer" />
        <Separator orientation="vertical" className="hidden h-4 sm:block" />
        <div className="hidden items-center gap-1.5 md:flex">
          <Button
            id="nav-back"
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            title="Go Back"
            aria-label="Go Back"
            onClick={() => {
              void hapticLight();
              router.back();
            }}
            type="button"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            id="nav-forward"
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            title="Go Forward"
            aria-label="Go Forward"
            onClick={() => {
              void hapticLight();
              router.forward();
            }}
            type="button"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[480px] flex-1 justify-center">
        <form className="flex w-full items-center" id="search-form" onSubmit={handleSearchSubmit}>
          <InputGroup className="h-9 w-full rounded-lg border-transparent bg-white/5 transition-all focus-within:border-white/15 focus-within:bg-white/10 hover:bg-white/8">
            <InputGroupAddon align="inline-start">
              <Search size={15} className="text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              id="search-input"
              aria-label="Search audiobooks"
              placeholder="Search for audiobooks, authors, narrators..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="text-xs text-foreground placeholder:text-muted-foreground md:text-sm"
            />
            {searchVal && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  onClick={handleClear}
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </form>
      </div>
    </header>
  );
}
