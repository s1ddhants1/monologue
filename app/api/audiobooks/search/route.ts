import { NextRequest, NextResponse } from "next/server";
import { searchAudiobooks } from "@/features/audiobooks";
import { parseBoundedText, parsePage } from "@/lib/request-params";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = parseBoundedText(searchParams.get("q"), 200);
  const page = parsePage(searchParams.get("page"));

  if (!q) {
    return NextResponse.json({ error: "Missing search query parameter 'q'" }, { status: 400 });
  }

  try {
    const data = await searchAudiobooks(q, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API /api/audiobooks/search error:", error);
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 502 });
  }
}
