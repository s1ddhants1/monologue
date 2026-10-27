const MAX_PAGE = 1000;

export function parsePage(value: string | null | undefined): number {
  const page = Number(value || 1);
  return Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
}

export function parseBoundedText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  const text = value?.trim() || "";
  return text && text.length <= maxLength ? text : null;
}

export function isSafeSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value) && value.length <= 200;
}
