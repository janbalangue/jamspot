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
  let requestedUrl = "";
  globalThis.fetch = async (url: RequestInfo | URL) => {
    requestedUrl = String(url);
    return { ok: true, json: async () => ({ _embedded: { events: [] } }) } as Response;
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
  assert.match(requestedUrl, /city=Dallas\+Fort\+Worth/);
  assert.match(requestedUrl, /stateCode=TX/);
});

test("GET /api/concerts maps a TicketmasterApiError to its status", async () => {
  // No API key set -> lib/ticketmaster throws TicketmasterApiError with no status.
  await withEnv("TICKETMASTER_API_KEY", undefined, async () => {
    const response = await GET(new NextRequest("http://localhost/api/concerts?keyword=jazz"));
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.match(body.error, /Missing TICKETMASTER_API_KEY/);
  });
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
