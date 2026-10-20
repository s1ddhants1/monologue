import { NextRequest, NextResponse } from "next/server";
import { searchAudiobooks } from "@/features/audiobooks";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!q || !q.trim()) {
    return NextResponse.json({ error: "Missing search query parameter 'q'" }, { status: 400 });
  }

  try {
    const data = await searchAudiobooks(q.trim(), isNaN(page) ? 1 : page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API /api/audiobooks/search error:", error);
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 502 });
  }
}
