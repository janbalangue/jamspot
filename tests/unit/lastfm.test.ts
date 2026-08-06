import assert from "node:assert/strict";
import test from "node:test";

import { getArtistBio, LastfmApiError } from "../../lib/lastfm";

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

test("getArtistBio throws when the API key is missing", async () => {
  await withEnv("LASTFM_API_KEY", undefined, async () => {
    await assert.rejects(getArtistBio("Nova Bloom"), (err) => {
      assert.ok(err instanceof LastfmApiError);
      assert.match(err.message, /Missing LASTFM_API_KEY/);
      return true;
    });
  });
});

test("getArtistBio wraps network failures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("boom");
  };
  try {
    await withEnv("LASTFM_API_KEY", "key-123", async () => {
      await assert.rejects(getArtistBio("Nova Bloom"), /Failed to reach Last\.fm: boom/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getArtistBio maps HTTP error status codes", async () => {
  const originalFetch = globalThis.fetch;
  try {
    await withEnv("LASTFM_API_KEY", "key-123", async () => {
      globalThis.fetch = async () => jsonResponse({}, false, 403);
      await assert.rejects(getArtistBio("Nova Bloom"), /rejected the API key/);

      globalThis.fetch = async () => jsonResponse({}, false, 429);
      await assert.rejects(getArtistBio("Nova Bloom"), /rate limit exceeded/);

      globalThis.fetch = async () => jsonResponse({}, false, 500);
      await assert.rejects(getArtistBio("Nova Bloom"), /failed with status 500/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getArtistBio returns null for Last.fm's 'artist not found' body error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ error: 6, message: "The artist you supplied could not be found" });
  try {
    await withEnv("LASTFM_API_KEY", "key-123", async () => {
      assert.equal(await getArtistBio("Nobody"), null);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getArtistBio throws for other Last.fm body error codes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ error: 10, message: "Invalid API key" });
  try {
    await withEnv("LASTFM_API_KEY", "key-123", async () => {
      await assert.rejects(getArtistBio("Nova Bloom"), (err) => {
        assert.ok(err instanceof LastfmApiError);
        assert.match(err.message, /Invalid API key/);
        return true;
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getArtistBio falls back to a generic message when the body error has none", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ error: 29 });
  try {
    await withEnv("LASTFM_API_KEY", "key-123", async () => {
      await assert.rejects(getArtistBio("Nova Bloom"), /Last\.fm returned error code 29/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getArtistBio returns null when the body has no artist", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({});
  try {
    await withEnv("LASTFM_API_KEY", "key-123", async () => {
      assert.equal(await getArtistBio("Nova Bloom"), null);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getArtistBio normalizes a full artist, stripping markup and the 'read more' link", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse({
      artist: {
        name: "Nova Bloom",
        url: "https://www.last.fm/music/Nova+Bloom",
        stats: { listeners: "48213" },
        bio: {
          summary:
            '<p>Nova Bloom &amp; friends make music.</p> <a href="https://www.last.fm/music/Nova+Bloom">Read more on Last.fm</a>.',
          content: "Full bio with &quot;quotes&quot; &lt;and tags&gt; &#39;here&#39;.",
        },
      },
    });
  try {
    await withEnv("LASTFM_API_KEY", "key-123", async () => {
      const bio = await getArtistBio("Nova Bloom");
      assert.deepEqual(bio, {
        name: "Nova Bloom",
        summary: "Nova Bloom & friends make music.",
        content: 'Full bio with "quotes" <and tags> \'here\'.',
        url: "https://www.last.fm/music/Nova+Bloom",
        listeners: 48213,
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getArtistBio falls back for a sparse artist with no bio", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ artist: {} });
  try {
    await withEnv("LASTFM_API_KEY", "key-123", async () => {
      const bio = await getArtistBio("Mystery Act");
      assert.deepEqual(bio, {
        name: "",
        summary: null,
        content: null,
        url: null,
        listeners: null,
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getArtistBio treats a whitespace-only bio and a non-numeric listener count as null", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse({
      artist: {
        name: "Blank Slate",
        stats: { listeners: "not-a-number" },
        bio: { summary: "   ", content: undefined },
      },
    });
  try {
    await withEnv("LASTFM_API_KEY", "key-123", async () => {
      const bio = await getArtistBio("Blank Slate");
      assert.equal(bio?.summary, null);
      assert.equal(bio?.content, null);
      assert.equal(bio?.listeners, null);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
