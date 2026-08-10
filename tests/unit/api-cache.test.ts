import assert from "node:assert/strict";
import test from "node:test";

import { withCache } from "../../lib/api-cache";

/**
 * Builds a mock `globalThis.fetch` that stands in for Supabase's REST API,
 * matching the exact request shapes lib/api-cache.ts's `supabase.from(...)`
 * calls produce (verified empirically against @supabase/supabase-js -
 * GET .../api_cache?select=...&provider=eq.X&query=eq.Y for reads, POST
 * .../api_cache?on_conflict=provider%2Cquery for writes).
 */
function mockSupabaseFetch({
  onRead,
  onWrite,
}: {
  onRead?: (url: string) => { status: number; body: unknown };
  onWrite?: (url: string, body: unknown) => { status: number; body: unknown };
} = {}) {
  const calls: { method: string; url: string; body?: unknown }[] = [];

  const fetchMock = async (url: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const urlStr = String(url);
    const parsedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url: urlStr, body: parsedBody });

    if (method === "GET") {
      const { status, body } = onRead?.(urlStr) ?? { status: 200, body: null };
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }

    // Writes (upsert -> POST)
    const { status, body } = onWrite?.(urlStr, parsedBody) ?? { status: 201, body: null };
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };

  return { fetchMock, calls };
}

async function withMockedFetch<T>(
  fetchMock: typeof globalThis.fetch,
  fn: () => Promise<T>
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = fetchMock;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test("withCache returns a fresh cached response without calling fetchFn", async () => {
  const { fetchMock, calls } = mockSupabaseFetch({
    onRead: () => ({
      status: 200,
      body: { response: { cached: true }, expires_at: "2099-01-01T00:00:00Z" },
    }),
  });

  let fetchFnCalls = 0;
  const result = await withMockedFetch(fetchMock, () =>
    withCache("lastfm", "Cher", async () => {
      fetchFnCalls += 1;
      return { cached: false };
    })
  );

  assert.deepEqual(result, { cached: true });
  assert.equal(fetchFnCalls, 0, "fetchFn should not run on a cache hit");
  // Only the read - no write attempted on a hit.
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
});

test("withCache treats an expired entry as a miss, calls fetchFn, and writes a fresh entry", async () => {
  const { fetchMock, calls } = mockSupabaseFetch({
    onRead: () => ({
      status: 200,
      body: { response: { cached: true }, expires_at: "2000-01-01T00:00:00Z" },
    }),
  });

  let fetchFnCalls = 0;
  const result = await withMockedFetch(fetchMock, () =>
    withCache("lastfm", "Cher", async () => {
      fetchFnCalls += 1;
      return { cached: false };
    })
  );

  assert.deepEqual(result, { cached: false });
  assert.equal(fetchFnCalls, 1);
  assert.equal(calls.length, 2, "expects a read (miss) followed by a write");
  assert.equal(calls[1].method, "POST");
  assert.equal((calls[1].body as { query: string }).query, "cher");
});

test("withCache calls fetchFn and writes a new entry on a true cache miss (no row)", async () => {
  const { fetchMock, calls } = mockSupabaseFetch({
    onRead: () => ({ status: 200, body: null }),
  });

  const result = await withMockedFetch(fetchMock, () =>
    withCache("spotify", "Nova Bloom", async () => ({ id: "1" }))
  );

  assert.deepEqual(result, { id: "1" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[1].method, "POST");
});

test("withCache normalizes the query (trims + lowercases) for both read and write", async () => {
  const { fetchMock, calls } = mockSupabaseFetch({
    onRead: () => ({ status: 200, body: null }),
  });

  await withMockedFetch(fetchMock, () => withCache("lastfm", "  ChEr  ", async () => ({ ok: true })));

  assert.match(calls[0].url, /query=eq\.cher(?!\S)/);
  assert.equal((calls[1].body as { query: string }).query, "cher");
});

test("withCache falls back to fetchFn when the cache read errors (e.g. table missing)", async () => {
  const { fetchMock } = mockSupabaseFetch({
    onRead: () => ({ status: 500, body: { message: "relation does not exist" } }),
    onWrite: () => ({ status: 500, body: { message: "relation does not exist" } }),
  });

  const result = await withMockedFetch(fetchMock, () =>
    withCache("apple-music", "Nova Bloom", async () => ({ id: 1 }))
  );

  // A cache outage never breaks the search - fetchFn's result still wins.
  assert.deepEqual(result, { id: 1 });
});

test("withCache falls back to fetchFn when the cache read throws (network failure)", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };

  try {
    const result = await withCache("ticketmaster", "dallas", async () => ["concert"]);
    assert.deepEqual(result, ["concert"]);
  } finally {
    globalThis.fetch = original;
  }
});

test("withCache swallows a failed cache write and still returns fetchFn's result", async () => {
  const { fetchMock, calls } = mockSupabaseFetch({
    onRead: () => ({ status: 200, body: null }),
    onWrite: () => ({ status: 403, body: { message: "row-level security violation" } }),
  });

  const result = await withMockedFetch(fetchMock, () =>
    withCache("lastfm", "Nova Bloom", async () => ({ summary: "bio text" }))
  );

  assert.deepEqual(result, { summary: "bio text" });
  assert.equal(calls.length, 2, "a write should still be attempted even though it fails");
});

test("withCache never writes to the cache when fetchFn throws, and propagates the error", async () => {
  const { fetchMock, calls } = mockSupabaseFetch({
    onRead: () => ({ status: 200, body: null }),
  });

  await assert.rejects(
    withMockedFetch(fetchMock, () =>
      withCache("lastfm", "Nova Bloom", async () => {
        throw new Error("upstream API down");
      })
    ),
    /upstream API down/
  );

  assert.equal(calls.length, 1, "only the read should happen - no write for a failed fetchFn");
});

test("withCache keeps different providers isolated even for the same query", async () => {
  const requestedProviders: string[] = [];
  const { fetchMock } = mockSupabaseFetch({
    onRead: (url) => {
      const match = url.match(/provider=eq\.([^&]+)/);
      requestedProviders.push(match ? decodeURIComponent(match[1]) : "");
      return { status: 200, body: null };
    },
  });

  await withMockedFetch(fetchMock, async () => {
    await withCache("lastfm", "Cher", async () => ({ from: "lastfm" }));
    await withCache("spotify", "Cher", async () => ({ from: "spotify" }));
  });

  assert.deepEqual(requestedProviders, ["lastfm", "spotify"]);
});

test("withCache writes an expiry ttlSeconds in the future, defaulting to 24 hours", async () => {
  let writtenBody: { created_at: string; expires_at: string } | undefined;
  const { fetchMock } = mockSupabaseFetch({
    onRead: () => ({ status: 200, body: null }),
    onWrite: (_url, body) => {
      writtenBody = body as { created_at: string; expires_at: string };
      return { status: 201, body: null };
    },
  });

  await withMockedFetch(fetchMock, () => withCache("lastfm", "Cher", async () => ({ ok: true })));

  assert.ok(writtenBody);
  const createdAt = new Date(writtenBody!.created_at).getTime();
  const expiresAt = new Date(writtenBody!.expires_at).getTime();
  const deltaSeconds = (expiresAt - createdAt) / 1000;
  assert.ok(
    Math.abs(deltaSeconds - 86_400) < 5,
    `expected ~86400s TTL, got ${deltaSeconds}s`
  );
});

test("withCache honors a custom ttlSeconds override", async () => {
  let writtenBody: { created_at: string; expires_at: string } | undefined;
  const { fetchMock } = mockSupabaseFetch({
    onRead: () => ({ status: 200, body: null }),
    onWrite: (_url, body) => {
      writtenBody = body as { created_at: string; expires_at: string };
      return { status: 201, body: null };
    },
  });

  await withMockedFetch(fetchMock, () =>
    withCache("lastfm", "Cher", async () => ({ ok: true }), { ttlSeconds: 60 })
  );

  assert.ok(writtenBody);
  const createdAt = new Date(writtenBody!.created_at).getTime();
  const expiresAt = new Date(writtenBody!.expires_at).getTime();
  assert.equal((expiresAt - createdAt) / 1000, 60);
});