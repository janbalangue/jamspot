import { NextRequest, NextResponse } from "next/server";
import { getArtistBio, LastfmApiError } from "@/lib/lastfm";

/**
 * GET /api/artist/lastfm?name=Cher
 *
 * Thin wrapper around lib/lastfm.ts so LASTFM_API_KEY never reaches the
 * browser, mirroring the pattern in app/api/concerts/route.ts.
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
    const bio = await getArtistBio(name);
    return NextResponse.json({ bio });
  } catch (err) {
    if (err instanceof LastfmApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status ?? 502 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while fetching artist bio" },
      { status: 500 }
    );
  }
}
