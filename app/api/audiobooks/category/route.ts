import { NextRequest, NextResponse } from "next/server";
import { getCategoryAudiobooks } from "@/features/audiobooks";
import { isSafeSlug, parsePage } from "@/lib/request-params";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.trim() || "";
  const page = parsePage(searchParams.get("page"));

  if (!category || !isSafeSlug(category)) {
    return NextResponse.json({ error: "Missing 'category' parameter" }, { status: 400 });
  }

  try {
    const data = await getCategoryAudiobooks(category, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API /api/audiobooks/category error:", error);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 502 });
  }
}
