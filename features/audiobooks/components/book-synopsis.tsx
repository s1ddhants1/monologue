"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface BookSynopsisProps {
  description: string;
}

interface Segment {
  type: "text" | "link";
  content: string;
  url?: string;
  trailing?: string;
}

export function parseTextSegments(line: string): Segment[] {
  const tokenRegex = /(\[[^\]]+\]\(https?:\/\/[^\s\)]+\)|https?:\/\/[^\s<>)"\x27]+)/g;
  const parts = line.split(tokenRegex);
  const segments: Segment[] = [];

  for (const part of parts) {
    if (!part) continue;

    const mdMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)$/);
    if (mdMatch) {
      segments.push({
        type: "link",
        content: mdMatch[1],
        url: mdMatch[2],
      });
      continue;
    }

    if (part.startsWith("http://") || part.startsWith("https://")) {
      let url = part;
      let trailing = "";
      const trailingMatch = url.match(/[.,;:)]+$/);
      if (trailingMatch) {
        trailing = trailingMatch[0];
        url = url.slice(0, -trailing.length);
      }

      segments.push({
        type: "link",
        content: url,
        url,
        trailing,
      });
      continue;
    }

    segments.push({
      type: "text",
      content: part,
    });
  }

  return segments;
}

function renderParagraph(para: string, pIdx: number) {
  const segments = parseTextSegments(para);
  return (
    <p key={pIdx} className="break-words">
      {segments.map((seg, sIdx) => {
        if (seg.type === "link" && seg.url) {
          return (
            <React.Fragment key={sIdx}>
              <a
                href={seg.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`Open ${seg.url}`}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <span>{seg.content}</span>
                <ExternalLink size={12} className="inline shrink-0" />
              </a>
              {seg.trailing && <span>{seg.trailing}</span>}
            </React.Fragment>
          );
        }
        return <span key={sIdx}>{seg.content}</span>;
      })}
    </p>
  );
}

export function BookSynopsis({ description }: BookSynopsisProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const paragraphs = description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const isLong = description.length > 350 || paragraphs.length > 2;

  if (!isLong) {
    return (
      <div className="max-w-3xl text-sm leading-relaxed text-foreground/90">
        <div className="space-y-3">{paragraphs.map((para, idx) => renderParagraph(para, idx))}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl text-sm leading-relaxed text-foreground/90">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div
          className={`space-y-3 transition-[max-height] duration-300 ${
            !isExpanded ? "relative max-h-36 overflow-hidden" : "max-h-none"
          }`}
        >
          {paragraphs.map((para, idx) => renderParagraph(para, idx))}
          {!isExpanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background to-transparent" />
          )}
        </div>

        <CollapsibleTrigger
          render={<Button type="button" variant="link" size="sm" className="mt-2 h-auto p-0" />}
        >
          <span>{isExpanded ? "Show less" : "Read more..."}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  );
}
