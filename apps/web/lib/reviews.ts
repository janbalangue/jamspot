import { supabase } from "@/lib/supabase";
import type { Review, NewReview, ReviewUpdate } from "@jamspot/shared";

export type { Review, NewReview, ReviewUpdate };

export class ReviewsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewsError";
  }
}

/**
 * Fetch all reviews, most recent first.
 */
export async function getReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new ReviewsError(`Failed to fetch reviews: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetch a single review by id. Returns null if no review has that id
 * (rather than throwing), since "not found" is an expected outcome here.
 */
export async function getReviewById(id: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new ReviewsError(`Failed to fetch review ${id}: ${error.message}`);
  }

  return data;
}

/**
 * Insert a new review. Returns the created row, including the
 * database-generated `id` and `created_at`.
 */
export async function createReview(input: NewReview): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      musician: input.musician,
      venue: input.venue,
      concert_date: input.concertDate,
      review_text: input.reviewText,
      venue_city: input.venueCity ?? null,
      venue_state: input.venueState ?? null,
      venue_country: input.venueCountry ?? null,
      user_name: input.userName ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new ReviewsError(`Failed to create review: ${error.message}`);
  }

  return data;
}
