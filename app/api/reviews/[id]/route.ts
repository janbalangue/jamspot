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

