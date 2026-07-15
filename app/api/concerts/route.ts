import { NextRequest, NextResponse } from "next/server";
import { searchConcerts, TicketmasterApiError } from "@/lib/ticketmaster";

/**
 * GET /api/concerts?city=Dallas&stateCode=TX&startDateTime=...&endDateTime=...
 *
 * Thin wrapper around lib/ticketmaster.ts so the Ticketmaster API key never
 * reaches the browser (it's a plain, non-NEXT_PUBLIC env var) and both the
 * home page and future preference-matching logic can hit one endpoint.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  function normalizeCity(city: string) {
    return city
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function normalizeStateCode(state: string) {
    return state.trim().toUpperCase();
  }

  const cityParam = searchParams.get("city");
  const stateCodeParam = searchParams.get("stateCode");

  const city = cityParam ? normalizeCity(cityParam) : undefined;
  const stateCode = stateCodeParam ? normalizeStateCode(stateCodeParam) : undefined;
  const postalCode = searchParams.get("postalCode") ?? undefined;
  const keyword = searchParams.get("keyword") ?? undefined;
  const startDateTime = searchParams.get("startDateTime") ?? undefined;
  const endDateTime = searchParams.get("endDateTime") ?? undefined;

  if (!city && !stateCode && !postalCode && !keyword) {
    return NextResponse.json(
      {
        error:
          "Provide at least one of: city, stateCode, postalCode, keyword",
      },
      { status: 400 }
    );
  }

  try {
    const concerts = await searchConcerts({
      city,
      stateCode,
      postalCode,
      keyword,
      startDateTime,
      endDateTime,
    });

    return NextResponse.json({ concerts });
  } catch (err) {
    if (err instanceof TicketmasterApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status ?? 502 }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while fetching concerts" },
      { status: 500 }
    );
  }
}
