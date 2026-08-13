import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { GET } from "../../app/api/concerts/route";

function withEnv(key: string, value: string | undefined, fn: () => Promise<void>) {
  const original = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  return fn().finally(() => {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  });
}

test("GET /api/concerts requires at least one search param", async () => {
  const response = await GET(new NextRequest("http://localhost/api/concerts"));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /Provide at least one of/);
});

test("GET /api/concerts normalizes city and state casing before querying Ticketmaster", async () => {
  const originalFetch = globalThis.fetch;
  // TEA-30: a cache read and (on a miss) a cache write now bracket the
  // Ticketmaster call, so capture every requested URL rather than
  // assuming the Ticketmaster request is the only - or the last - one.
  const requestedUrls: string[] = [];
  globalThis.fetch = async (url: RequestInfo | URL) => {
    const requestedUrl = String(url);
    requestedUrls.push(requestedUrl);
    if (requestedUrl.includes("app.ticketmaster.com")) {
      return { ok: true, json: async () => ({ _embedded: { events: [] } }) } as Response;
    }
    // Cache read/write calls (to Supabase): respond with something that
    // reads as "no cache entry" so withCache falls through to Ticketmaster.
    return { ok: true, json: async () => null } as Response;
  };
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      const response = await GET(
        new NextRequest("http://localhost/api/concerts?city=dallas fort worth&stateCode=tx"),
      );
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.deepEqual(body, { concerts: [] });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  const ticketmasterUrl = requestedUrls.find((url) => url.includes("app.ticketmaster.com"));
  assert.ok(ticketmasterUrl, "expected a request to Ticketmaster");
  assert.match(ticketmasterUrl!, /city=Dallas\+Fort\+Worth/);
  assert.match(ticketmasterUrl!, /stateCode=TX/);
});

test("GET /api/concerts maps a TicketmasterApiError to its status", async () => {
  // TEA-30: stub fetch so the cache-read attempt (which happens before we
  // ever get to lib/ticketmaster's missing-key check) doesn't make a real
  // network call to the placeholder Supabase URL in tests/unit/register-test-env.cjs.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => null }) as Response;
  try {
    // No API key set -> lib/ticketmaster throws TicketmasterApiError with no status.
    await withEnv("TICKETMASTER_API_KEY", undefined, async () => {
      const response = await GET(new NextRequest("http://localhost/api/concerts?keyword=jazz"));
      assert.equal(response.status, 502);
      const body = await response.json();
      assert.match(body.error, /Missing TICKETMASTER_API_KEY/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/concerts returns 500 for a non-Ticketmaster error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => {
        throw new Error("malformed body");
      },
    }) as unknown as Response;
  try {
    await withEnv("TICKETMASTER_API_KEY", "key-123", async () => {
      const response = await GET(new NextRequest("http://localhost/api/concerts?keyword=jazz"));
      assert.equal(response.status, 500);
      const body = await response.json();
      assert.match(body.error, /Unexpected error while fetching concerts/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});