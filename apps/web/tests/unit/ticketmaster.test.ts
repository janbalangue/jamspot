import assert from "node:assert/strict";
import test from "node:test";

import {
  searchConcerts,
  TicketmasterApiError,
  type NormalizedConcert,
} from "../../lib/ticketmaster";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

function withEnv(key: string, value: string | undefined, fn: () => Promise<void>) {
  const original = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  return fn().finally(() => {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  });
}

test("searchConcerts throws when the API key is missing", async () => {
  await withEnv("TICKETMASTER_API_KEY", undefined, async () => {
    await assert.rejects(searchConcerts({ city: "Dallas" }), (err) => {
      assert.ok(err instanceof TicketmasterApiError);
      assert.match(err.message, /Missing TICKETMASTER_API_KEY/);
      return true;
    });
  });
});

test("searchConcerts wraps network failures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("boom");
  };
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      await assert.rejects(searchConcerts({ keyword: "jazz" }), (err) => {
        assert.ok(err instanceof TicketmasterApiError);
        assert.match(err.message, /Failed to reach Ticketmaster: boom/);
        return true;
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("searchConcerts maps error status codes", async () => {
  const originalFetch = globalThis.fetch;
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      globalThis.fetch = async () => jsonResponse({}, false, 401);
      await assert.rejects(searchConcerts({ keyword: "jazz" }), (err) => {
        assert.ok(err instanceof TicketmasterApiError);
        assert.match(err.message, /rejected the API key/);
        assert.equal(err.status, 401);
        return true;
      });

      globalThis.fetch = async () => jsonResponse({}, false, 429);
      await assert.rejects(searchConcerts({ keyword: "jazz" }), (err) => {
        assert.ok(err instanceof TicketmasterApiError);
        assert.match(err.message, /rate limit exceeded/);
        return true;
      });

      globalThis.fetch = async () => jsonResponse({}, false, 500);
      await assert.rejects(searchConcerts({ keyword: "jazz" }), (err) => {
        assert.ok(err instanceof TicketmasterApiError);
        assert.match(err.message, /failed with status 500/);
        return true;
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("searchConcerts builds the query string from provided params", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url: RequestInfo | URL) => {
    requestedUrl = String(url);
    return jsonResponse({ _embedded: { events: [] } });
  };
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      await searchConcerts({
        city: "Dallas",
        stateCode: "TX",
        postalCode: "75201",
        keyword: "jazz",
        startDateTime: "2026-09-01T00:00:00Z",
        endDateTime: "2026-09-30T23:59:59Z",
        page: 2,
        sort: "date,asc",
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(requestedUrl, /city=Dallas/);
  assert.match(requestedUrl, /stateCode=TX/);
  assert.match(requestedUrl, /postalCode=75201/);
  assert.match(requestedUrl, /keyword=jazz/);
  assert.match(requestedUrl, /page=2/);
  assert.match(requestedUrl, /sort=date%2Casc/);
  assert.match(requestedUrl, /classificationName=music/);
});

test("searchConcerts normalizes a full event", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse({
      _embedded: {
        events: [
          {
            id: "evt-1",
            name: "Nova Bloom Live",
            url: "https://tickets.example.com/nova",
            images: [
              { url: "https://img.example.com/small.jpg", ratio: "3_2", width: 300 },
              { url: "https://img.example.com/big.jpg", ratio: "16_9", width: 2048 },
            ],
            classifications: [
              { genre: { name: "Rock" }, subGenre: { name: "Indie Rock" } },
            ],
            priceRanges: [{ min: 40, max: 120, currency: "USD" }],
            dates: { start: { localDate: "2026-09-15", localTime: "19:30:00" } },
            _embedded: {
              venues: [{ name: "The Granada", city: { name: "Dallas" }, state: { stateCode: "TX" } }],
              attractions: [{ name: "Nova Bloom" }],
            },
          } satisfies Record<string, unknown>,
        ],
      },
    });

  let result: NormalizedConcert[] = [];
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      result = await searchConcerts({ city: "Dallas" });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    id: "evt-1",
    name: "Nova Bloom Live",
    artist: "Nova Bloom",
    venue: "The Granada",
    city: "Dallas",
    state: "TX",
    date: "2026-09-15",
    time: "19:30:00",
    imageUrl: "https://img.example.com/big.jpg",
    ticketUrl: "https://tickets.example.com/nova",
    genre: "Rock",
    subGenre: "Indie Rock",
    priceRange: { min: 40, max: 120, currency: "USD" },
  });
});

test("searchConcerts falls back for sparse events", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse({
      _embedded: {
        events: [
          {
            id: "evt-2",
            name: "Untitled Event",
            images: [{ url: "https://img.example.com/only.jpg" }],
            priceRanges: [{ min: 10, currency: "USD" }],
          },
        ],
      },
    });

  let result: NormalizedConcert[] = [];
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      result = await searchConcerts({ keyword: "untitled" });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(result[0].artist, null);
  assert.equal(result[0].venue, null);
  assert.equal(result[0].city, null);
  assert.equal(result[0].state, null);
  assert.equal(result[0].date, null);
  assert.equal(result[0].time, null);
  assert.equal(result[0].imageUrl, "https://img.example.com/only.jpg");
  assert.equal(result[0].ticketUrl, null);
  assert.equal(result[0].genre, null);
  assert.equal(result[0].subGenre, null);
  // Missing max/currency means the price range is dropped entirely.
  assert.equal(result[0].priceRange, null);
});

test("searchConcerts handles a response with no events", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({});
  let result: NormalizedConcert[] = [];
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      result = await searchConcerts({ keyword: "nothing" });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(result, []);
});

test("searchConcerts normalizes whitespace/casing in the keyword for the outgoing request (TEA-30)", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url: RequestInfo | URL) => {
    requestedUrl = String(url);
    return jsonResponse({});
  };
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      await searchConcerts({ keyword: "  JAZZ  " });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(requestedUrl, /keyword=jazz/);
});

test("searchConcerts opts the request into Next's Data Cache with the configured (shorter) TTL (TEA-30)", async () => {
  const originalFetch = globalThis.fetch;
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    capturedInit = init;
    return jsonResponse({});
  };
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      await searchConcerts({ keyword: "jazz" });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  // Ticketmaster intentionally uses a shorter default (5 min) than the
  // artist-data integrations (24h) - concert listings go stale faster.
  assert.deepEqual((capturedInit as { next?: { revalidate?: number } })?.next, {
    revalidate: 300,
  });
});