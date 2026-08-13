import { NextRequest, NextResponse } from "next/server";
import { createReview, getReviews, ReviewsError } from "@/lib/reviews";

/**
 * GET /api/reviews
 *
 * Returns every review, most recent first.
 */
export async function GET() {
  try {
    const reviews = await getReviews();
    return NextResponse.json({ reviews });
  } catch (err) {
    if (err instanceof ReviewsError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Unexpected error while fetching reviews" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 *
 * Body: { musician, venue, concertDate, reviewText, venueCity?,
 *         venueState?, venueCountry?, userName? }
 *
 * musician, venue, concertDate, and reviewText are required.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const { musician, venue, concertDate, reviewText } = body;

  if (
    typeof musician !== "string" ||
    typeof venue !== "string" ||
    typeof concertDate !== "string" ||
    typeof reviewText !== "string" ||
    !musician ||
    !venue ||
    !concertDate ||
    !reviewText
  ) {
    return NextResponse.json(
      {
        error:
          "musician, venue, concertDate, and reviewText are required strings",
      },
      { status: 400 }
    );
  }

  const venueCity = typeof body.venueCity === "string" ? body.venueCity : undefined;
  const venueState =
    typeof body.venueState === "string" ? body.venueState : undefined;
  const venueCountry =
    typeof body.venueCountry === "string" ? body.venueCountry : undefined;
  const userName =
    typeof body.userName === "string" ? body.userName : undefined;

  try {
    const review = await createReview({
      musician,
      venue,
      concertDate,
      reviewText,
      venueCity,
      venueState,
      venueCountry,
      userName,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    if (err instanceof ReviewsError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Unexpected error while creating review" },
      { status: 500 }
    );
  }
}