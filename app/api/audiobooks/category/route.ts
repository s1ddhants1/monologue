import { NextRequest, NextResponse } from "next/server";
import { getCategoryAudiobooks } from "@/features/audiobooks";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!category || !category.trim()) {
    return NextResponse.json({ error: "Missing 'category' parameter" }, { status: 400 });
  }

  try {
    const data = await getCategoryAudiobooks(category.trim(), isNaN(page) ? 1 : page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API /api/audiobooks/category error:", error);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 502 });
  }
}
