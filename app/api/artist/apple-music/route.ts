import { NextRequest, NextResponse } from "next/server";
import { getAppleMusicArtist, AppleMusicApiError } from "@/lib/apple-music";
import { withCache } from "@/lib/api-cache";

/**
 * GET /api/artist/apple-music?name=Cher
 *
 * Thin wrapper around lib/apple-music.ts, mirroring the pattern in
 * app/api/concerts/route.ts. The iTunes Search API doesn't require a key,
 * but routing it through the server keeps the fetch/caching/normalization
 * logic in one place and consistent with the other artist-enrichment
 * endpoints.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Provide an artist name via ?name=" },
      { status: 400 }
    );
  }

  try {
    const artist = await withCache("apple-music", name, () => getAppleMusicArtist(name));
    return NextResponse.json({ artist });
  } catch (err) {
    if (err instanceof AppleMusicApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status ?? 502 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while fetching Apple Music artist" },
      { status: 500 }
    );
  }
}