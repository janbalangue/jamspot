import { NextRequest, NextResponse } from "next/server";
import {
  getReviewById,
  ReviewsError
} from "@/lib/reviews";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/reviews/[id]
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const review = await getReviewById(id);

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ review });
  } catch (err) {
    if (err instanceof ReviewsError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Unexpected error while fetching review" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reviews/[id]
 *
 * Body may include any subset of: musician, venue, concertDate,
 * reviewText, venueCity, venueState, venueCountry, userName.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const updates: Record<string, string> = {};
  const stringFields = [
    "musician",
    "venue",
    "concertDate",
    "reviewText",
    "venueCity",
    "venueState",
    "venueCountry",
    "userName",
  ] as const;

  for (const field of stringFields) {
    if (typeof body[field] === "string") {
      updates[field] = body[field] as string;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields provided to update" },
      { status: 400 }
    );
  }

  try {
    const review = await updateReview(id, updates);
    return NextResponse.json({ review });
  } catch (err) {
    if (err instanceof ReviewsError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Unexpected error while updating review" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    await deleteReview(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ReviewsError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Unexpected error while deleting review" },
      { status: 500 }
    );
  }
}
