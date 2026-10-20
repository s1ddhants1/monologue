"use client";

import React, { useState } from "react";
import { MoreVertical, Activity, Copy, Check, HardDrive, Users } from "@/components/icons";
import { AudiobookDetail } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { hapticLight } from "@/lib/capacitor";

export interface BookActionsMenuProps {
  book: AudiobookDetail;
  className?: string;
}

export function BookActionsMenu({ book, className = "" }: BookActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);
  const [magnetCopied, setMagnetCopied] = useState(false);

  const handleToggleMenu = () => {
    void hapticLight();
    setIsOpen((prev) => !prev);
  };

  const handleOpenMetrics = () => {
    void hapticLight();
    setIsOpen(false);
    setIsMetricsOpen(true);
  };

  const handleCopyHash = () => {
    if (book.infoHash) {
      void hapticLight();
      void navigator.clipboard.writeText(book.infoHash);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2000);
    }
  };

  const handleCopyMagnet = () => {
    if (book.magnetUri) {
      void hapticLight();
      void navigator.clipboard.writeText(book.magnetUri);
      setMagnetCopied(true);
      setTimeout(() => {
        setMagnetCopied(false);
        setIsOpen(false);
      }, 1500);
    }
  };

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleToggleMenu}
              title="More options"
              aria-label="More options"
              id="book-actions-menu-btn"
            >
              <MoreVertical size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuItem id="menu-item-show-metrics" onClick={handleOpenMetrics}>
                <Activity size={15} className="shrink-0 text-primary" />
                <span>Show Metrics</span>
              </DropdownMenuItem>

              {book.magnetUri && (
                <DropdownMenuItem id="menu-item-copy-magnet" onClick={handleCopyMagnet}>
                  {magnetCopied ? (
                    <>
                      <Check size={15} className="shrink-0 text-emerald-400" />
                      <span className="text-emerald-400">Copied Magnet!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} className="shrink-0 text-muted-foreground" />
                      <span>Copy Magnet Link</span>
                    </>
                  )}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isMetricsOpen} onOpenChange={setIsMetricsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="border-b border-border pb-3 text-left">
            <DialogTitle className="text-base font-semibold text-foreground">
              Audiobook Metrics
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-muted-foreground">
              {book.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-border bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <Users size={14} className="text-primary" />
                <span>Swarm Activity</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <div className="text-[11px] text-muted-foreground">Seeders</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-emerald-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    {book.seeders ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <div className="text-[11px] text-muted-foreground">Leechers</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-sky-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
                    {book.leechers ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <div className="text-[11px] text-muted-foreground">Audio Size</div>
                  <div className="mt-0.5 truncate font-mono text-base font-bold text-foreground sm:text-lg">
                    {book.fileSize || "Unknown"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                  <div className="text-[11px] text-muted-foreground">Total Peers</div>
                  <div className="mt-0.5 text-lg font-bold text-foreground">
                    {(book.seeders ?? 0) + (book.leechers ?? 0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <HardDrive size={14} className="text-primary" />
                <span>Media &amp; Audio Specs</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-mono font-medium text-foreground">
                    {book.format || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-muted-foreground">Bitrate</span>
                  <span className="font-mono font-medium text-foreground">
                    {book.bitrate || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-muted-foreground">Audio Files</span>
                  <span className="font-mono font-medium text-foreground">
                    {book.files?.length || 1} tracks
                  </span>
                </div>
                {book.duration && (
                  <div className="col-span-2 flex justify-between border-b border-white/5 py-1">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-mono font-medium text-foreground">{book.duration}</span>
                  </div>
                )}
              </div>
            </div>

            {book.infoHash && (
              <div className="space-y-2 rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Info Hash
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyHash}
                    className="flex h-auto cursor-pointer items-center gap-1 p-0 text-xs text-primary hover:bg-transparent hover:underline"
                  >
                    {hashCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{hashCopied ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
                <div className="rounded-lg border border-white/5 bg-black/40 p-2.5 font-mono text-[11px] break-all text-muted-foreground select-all">
                  {book.infoHash}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
