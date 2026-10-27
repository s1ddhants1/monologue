import { describe, expect, it } from "vitest";
import { isSafeSlug, parseBoundedText, parsePage } from "./request-params";

describe("request parameter parsing", () => {
  it("normalizes invalid and oversized pages", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("10000")).toBe(1000);
    expect(parsePage("4")).toBe(4);
  });

  it("bounds text values", () => {
    expect(parseBoundedText("  dune  ", 10)).toBe("dune");
    expect(parseBoundedText(" ", 10)).toBeNull();
    expect(parseBoundedText("12345", 4)).toBeNull();
  });

  it("accepts only URL-safe slugs", () => {
    expect(isSafeSlug("science-fiction")).toBe(true);
    expect(isSafeSlug("../etc/passwd")).toBe(false);
    expect(isSafeSlug("science fiction")).toBe(false);
  });
});
