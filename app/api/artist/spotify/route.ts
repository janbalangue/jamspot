import { NextRequest, NextResponse } from "next/server";
import { getSpotifyArtist, SpotifyApiError } from "@/lib/spotify";

/**
 * GET /api/artist/spotify?name=Cher
 *
 * Thin wrapper around lib/spotify.ts so SPOTIFY_CLIENT_ID /
 * SPOTIFY_CLIENT_SECRET never reach the browser, mirroring the pattern in
 * app/api/concerts/route.ts.
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
    const artist = await getSpotifyArtist(name);
    return NextResponse.json({ artist });
  } catch (err) {
    if (err instanceof SpotifyApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status ?? 502 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while fetching Spotify artist" },
      { status: 500 }
    );
  }
}