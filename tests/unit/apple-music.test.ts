import assert from "node:assert/strict";
import test from "node:test";

import { getAppleMusicArtist, AppleMusicApiError } from "../../lib/apple-music";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

test("getAppleMusicArtist wraps network failures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("boom");
  };
  try {
    await assert.rejects(getAppleMusicArtist("Nova Bloom"), (err) => {
      assert.ok(err instanceof AppleMusicApiError);
      assert.match(err.message, /Failed to reach Apple Music \(iTunes Search\): boom/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAppleMusicArtist maps HTTP error status codes", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => jsonResponse({}, false, 429);
    await assert.rejects(getAppleMusicArtist("Nova Bloom"), /rate limit exceeded/);

    globalThis.fetch = async () => jsonResponse({}, false, 500);
    await assert.rejects(getAppleMusicArtist("Nova Bloom"), /failed with status 500/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAppleMusicArtist returns null when there are no results", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ results: [] });
  try {
    assert.equal(await getAppleMusicArtist("Nobody"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAppleMusicArtist returns null when the result is missing an id or name", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ results: [{ artistLinkUrl: "https://music.apple.com/artist/1" }] });
  try {
    assert.equal(await getAppleMusicArtist("Nova Bloom"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAppleMusicArtist normalizes a full artist", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse({
      results: [
        {
          artistId: 1,
          artistName: "Nova Bloom",
          artistLinkUrl: "https://music.apple.com/artist/1",
          primaryGenreName: "Rock",
        },
      ],
    });
  try {
    const artist = await getAppleMusicArtist("Nova Bloom");
    assert.deepEqual(artist, {
      id: 1,
      name: "Nova Bloom",
      url: "https://music.apple.com/artist/1",
      primaryGenre: "Rock",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAppleMusicArtist falls back when the url or genre is missing", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse({ results: [{ artistId: 2, artistName: "Bare Artist" }] });
  try {
    const artist = await getAppleMusicArtist("Bare Artist");
    assert.deepEqual(artist, {
      id: 2,
      name: "Bare Artist",
      url: null,
      primaryGenre: null,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAppleMusicArtist normalizes whitespace/casing in the artist name for the search request (TEA-30)", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url: RequestInfo | URL) => {
    requestedUrl = String(url);
    return jsonResponse({ results: [] });
  };
  try {
    await getAppleMusicArtist("  Nova BLOOM  ");
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(requestedUrl, /term=nova\+bloom/);
});

test("getAppleMusicArtist opts the search request into Next's Data Cache with the configured TTL (TEA-30)", async () => {
  const originalFetch = globalThis.fetch;
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    capturedInit = init;
    return jsonResponse({ results: [] });
  };
  try {
    await getAppleMusicArtist("Nova Bloom");
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual((capturedInit as { next?: { revalidate?: number } })?.next, {
    revalidate: 86_400,
  });
});