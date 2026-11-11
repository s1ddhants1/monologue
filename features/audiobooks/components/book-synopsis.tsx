"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

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
    <p key={pIdx} className="text-pretty wrap-anywhere">
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
                className="inline font-medium wrap-anywhere text-primary hover:underline"
              >
                <span>{seg.content}</span>
                <ExternalLink size={12} className="ml-1 inline shrink-0 align-baseline" />
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

  const rawParagraphs = description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  let paragraphs = rawParagraphs;
  if (rawParagraphs.length === 1 && description.length > 350) {
    const splitIndex = description.lastIndexOf(". ", 300);
    if (splitIndex > 50) {
      paragraphs = [description.slice(0, splitIndex + 1), description.slice(splitIndex + 2)];
    }
  }

  const isLong = description.length > 350 || paragraphs.length > 1;

  if (!isLong || paragraphs.length === 0) {
    return (
      <div className="max-w-3xl text-sm leading-relaxed text-foreground/90">
        <div className="flex flex-col gap-3">
          {paragraphs.map((para, idx) => renderParagraph(para, idx))}
        </div>
      </div>
    );
  }

  const firstParagraph = paragraphs[0];
  const remainingParagraphs = paragraphs.slice(1);

  return (
    <div className="max-w-3xl text-sm leading-relaxed text-foreground/90">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex flex-col gap-3">
          {renderParagraph(firstParagraph, 0)}
          {remainingParagraphs.length > 0 && (
            <CollapsibleContent className="flex flex-col gap-3 overflow-hidden data-[ending-style]:animate-collapsible-up data-[starting-style]:animate-collapsible-down">
              {remainingParagraphs.map((para, idx) => renderParagraph(para, idx + 1))}
            </CollapsibleContent>
          )}
        </div>

        {remainingParagraphs.length > 0 && (
          <CollapsibleTrigger
            render={<Button type="button" variant="link" size="sm" className="mt-2 h-auto p-0" />}
          >
            <span>{isExpanded ? "Show less" : "Read more..."}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </CollapsibleTrigger>
        )}
      </Collapsible>
    </div>
  );
}
