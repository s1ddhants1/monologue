import { NextRequest, NextResponse } from "next/server";
import { getAudiobookDetail } from "@/features/audiobooks";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug || !slug.trim()) {
    return NextResponse.json({ error: "Missing 'slug' parameter" }, { status: 400 });
  }

  try {
    const data = await getAudiobookDetail(slug.trim());
    if (!data) {
      return NextResponse.json({ error: "Audiobook not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("API /api/audiobooks/book error:", error);
    return NextResponse.json({ error: "Failed to fetch book detail" }, { status: 502 });
  }
}
