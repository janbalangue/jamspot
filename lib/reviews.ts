import { supabase } from "@/lib/supabase";

/**
 * Row shape of the `reviews` table.
 *
 * There is no `user_id` / accounts table - JamSpot has no authentication.
 * `user_name` is a plain, manually-entered text field, not a foreign key.
 */
export type Review = {
  id: string;
  musician: string;
  venue: string;
  concert_date: string; // ISO date, e.g. "2026-05-01"
  review_text: string;
  venue_city: string | null;
  venue_state: string | null;
  venue_country: string | null;
  user_name: string | null;
  created_at: string;
};

/** Fields needed to create a new review. */
export type NewReview = {
  musician: string;
  venue: string;
  concertDate: string;
  reviewText: string;
  venueCity?: string;
  venueState?: string;
  venueCountry?: string;
  userName?: string;
};

/** Fields that can be changed on an existing review. All optional. */
export type ReviewUpdate = Partial<NewReview>;

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

/**
 * Update an existing review. Only the fields provided in `updates` are
 * changed.
 */
export async function updateReview(
  id: string,
  updates: ReviewUpdate
): Promise<Review> {
  const patch: Record<string, unknown> = {};

  if (updates.musician !== undefined) patch.musician = updates.musician;
  if (updates.venue !== undefined) patch.venue = updates.venue;
  if (updates.concertDate !== undefined)
    patch.concert_date = updates.concertDate;
  if (updates.reviewText !== undefined)
    patch.review_text = updates.reviewText;
  if (updates.venueCity !== undefined) patch.venue_city = updates.venueCity;
  if (updates.venueState !== undefined)
    patch.venue_state = updates.venueState;
  if (updates.venueCountry !== undefined)
    patch.venue_country = updates.venueCountry;
  if (updates.userName !== undefined) patch.user_name = updates.userName;

  const { data, error } = await supabase
    .from("reviews")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new ReviewsError(`Failed to update review ${id}: ${error.message}`);
  }

  return data;
}

/**
 * Delete a review by id.
 */
export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", id);

  if (error) {
    throw new ReviewsError(`Failed to delete review ${id}: ${error.message}`);
  }
}