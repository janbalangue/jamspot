import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { GET, POST } from "../../app/api/reviews/route";
import * as reviewsLib from "../../lib/reviews";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function postRequest(body: string) {
  return new NextRequest("http://localhost/api/reviews", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

test("GET /api/reviews returns the review list", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse([{ id: "1", musician: "Nova Bloom", venue: "The Granada", concert_date: "2026-05-01", review_text: "Great show", venue_city: null, venue_state: null, venue_country: null, user_name: null, created_at: "2026-05-02T00:00:00Z" }]);
  try {
    const response = await GET();
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.reviews.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/reviews maps a ReviewsError to 502", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ message: "db down" }, 500);
  try {
    const response = await GET();
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /db down/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/reviews returns 500 for a non-ReviewsError", async () => {
  const original = reviewsLib.getReviews;
  Object.assign(reviewsLib, {
    getReviews: async () => {
      throw new Error("boom");
    },
  });
  try {
    const response = await GET();
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /Unexpected error while fetching reviews/);
  } finally {
    Object.assign(reviewsLib, { getReviews: original });
  }
});

test("POST /api/reviews rejects invalid JSON", async () => {
  const response = await POST(postRequest("{not valid json"));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /must be valid JSON/);
});

test("POST /api/reviews rejects a body missing required fields", async () => {
  const response = await POST(postRequest(JSON.stringify({ musician: "Nova Bloom" })));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /are required strings/);
});

test("POST /api/reviews creates a review and passes through optional fields", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: unknown = null;
  globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    requestBody = init?.body ? JSON.parse(String(init.body)) : null;
    return jsonResponse(
      { id: "new-1", musician: "Nova Bloom", venue: "The Granada", concert_date: "2026-05-01", review_text: "Great show", venue_city: "Dallas", venue_state: null, venue_country: null, user_name: null, created_at: "2026-05-02T00:00:00Z" },
      201,
    );
  };
  try {
    const response = await POST(
      postRequest(
        JSON.stringify({
          musician: "Nova Bloom",
          venue: "The Granada",
          concertDate: "2026-05-01",
          reviewText: "Great show",
          venueCity: "Dallas",
        }),
      ),
    );
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.review.id, "new-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal((requestBody as { venue_city?: string })?.venue_city, "Dallas");
});

test("POST /api/reviews maps a ReviewsError to 502", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ message: "constraint violation" }, 400);
  try {
    const response = await POST(
      postRequest(JSON.stringify({ musician: "X", venue: "Y", concertDate: "2026-01-01", reviewText: "Z" })),
    );
    assert.equal(response.status, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/reviews returns 500 for a non-ReviewsError", async () => {
  const original = reviewsLib.createReview;
  Object.assign(reviewsLib, {
    createReview: async () => {
      throw new Error("boom");
    },
  });
  try {
    const response = await POST(
      postRequest(JSON.stringify({ musician: "X", venue: "Y", concertDate: "2026-01-01", reviewText: "Z" })),
    );
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /Unexpected error while creating review/);
  } finally {
    Object.assign(reviewsLib, { createReview: original });
  }
});
