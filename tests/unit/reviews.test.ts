import assert from "node:assert/strict";
import test from "node:test";

import { getReviews, getReviewById, createReview, ReviewsError, type NewReview } from "../../lib/reviews";

function jsonResponse(body: unknown, status = 200): Response {
  // supabase-js reads both .json() and, on some code paths, .text() - use a
  // real Response so both are implemented correctly.
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("getReviews returns rows ordered most-recent-first", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url: RequestInfo | URL) => {
    requestedUrl = String(url);
    return jsonResponse([
      { id: "1", musician: "Nova Bloom", venue: "The Granada", concert_date: "2026-05-01", review_text: "Great show", venue_city: null, venue_state: null, venue_country: null, user_name: null, created_at: "2026-05-02T00:00:00Z" },
    ]);
  };
  try {
    const reviews = await getReviews();
    assert.equal(reviews.length, 1);
    assert.equal(reviews[0].musician, "Nova Bloom");
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(requestedUrl, /order=created_at\.desc/);
});

test("getReviews returns an empty array when there is no data", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse(null);
  try {
    assert.deepEqual(await getReviews(), []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReviews throws a ReviewsError on failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ message: "relation does not exist" }, 500);
  try {
    await assert.rejects(getReviews(), (err) => {
      assert.ok(err instanceof ReviewsError);
      assert.match(err.message, /Failed to fetch reviews: relation does not exist/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReviewById returns the matching review", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse({ id: "1", musician: "Nova Bloom", venue: "The Granada", concert_date: "2026-05-01", review_text: "Great show", venue_city: null, venue_state: null, venue_country: null, user_name: null, created_at: "2026-05-02T00:00:00Z" });
  try {
    const review = await getReviewById("1");
    assert.equal(review?.id, "1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReviewById returns null when there is no match", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse([]);
  try {
    assert.equal(await getReviewById("missing"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getReviewById throws a ReviewsError on failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ message: "timeout" }, 500);
  try {
    await assert.rejects(getReviewById("1"), (err) => {
      assert.ok(err instanceof ReviewsError);
      assert.match(err.message, /Failed to fetch review 1: timeout/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createReview inserts a row and returns the created record", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: unknown = null;
  globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    requestBody = init?.body ? JSON.parse(String(init.body)) : null;
    return jsonResponse(
      {
        id: "new-1",
        musician: "Nova Bloom",
        venue: "The Granada",
        concert_date: "2026-05-01",
        review_text: "Great show",
        venue_city: "Dallas",
        venue_state: "TX",
        venue_country: "US",
        user_name: "Jan",
        created_at: "2026-05-02T00:00:00Z",
      },
      201,
    );
  };
  const input: NewReview = {
    musician: "Nova Bloom",
    venue: "The Granada",
    concertDate: "2026-05-01",
    reviewText: "Great show",
    venueCity: "Dallas",
    venueState: "TX",
    venueCountry: "US",
    userName: "Jan",
  };
  try {
    const review = await createReview(input);
    assert.equal(review.id, "new-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(requestBody, {
    musician: "Nova Bloom",
    venue: "The Granada",
    concert_date: "2026-05-01",
    review_text: "Great show",
    venue_city: "Dallas",
    venue_state: "TX",
    venue_country: "US",
    user_name: "Jan",
  });
});

test("createReview defaults optional fields to null", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: unknown = null;
  globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    requestBody = init?.body ? JSON.parse(String(init.body)) : null;
    return jsonResponse(
      { id: "new-2", musician: "Solo Artist", venue: "Small Room", concert_date: "2026-05-01", review_text: "Fun", venue_city: null, venue_state: null, venue_country: null, user_name: null, created_at: "2026-05-02T00:00:00Z" },
      201,
    );
  };
  try {
    await createReview({ musician: "Solo Artist", venue: "Small Room", concertDate: "2026-05-01", reviewText: "Fun" });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(requestBody, {
    musician: "Solo Artist",
    venue: "Small Room",
    concert_date: "2026-05-01",
    review_text: "Fun",
    venue_city: null,
    venue_state: null,
    venue_country: null,
    user_name: null,
  });
});

test("createReview throws a ReviewsError on failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ message: "constraint violation" }, 400);
  try {
    await assert.rejects(
      createReview({ musician: "X", venue: "Y", concertDate: "2026-01-01", reviewText: "Z" }),
      (err) => {
        assert.ok(err instanceof ReviewsError);
        assert.match(err.message, /Failed to create review: constraint violation/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
