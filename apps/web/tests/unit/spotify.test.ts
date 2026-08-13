import assert from "node:assert/strict";
import test from "node:test";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

function withEnv(entries: Record<string, string | undefined>, fn: () => Promise<void>) {
  const originals: Record<string, string | undefined> = {};
  for (const key of Object.keys(entries)) {
    originals[key] = process.env[key];
    if (entries[key] === undefined) delete process.env[key];
    else process.env[key] = entries[key];
  }
  return fn().finally(() => {
    for (const key of Object.keys(originals)) {
      if (originals[key] === undefined) delete process.env[key];
      else process.env[key] = originals[key];
    }
  });
}

/** cachedToken is module-level state, so each test gets a fresh module instance. */
function freshSpotifyModule(): typeof import("../../lib/spotify") {
  const modulePath = require.resolve("../../lib/spotify");
  delete require.cache[modulePath];
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- needs the live require() cache, not a static import, to force a fresh module instance.
  return require(modulePath);
}

test("getSpotifyArtist throws when credentials are missing", async () => {
  const { getSpotifyArtist, SpotifyApiError } = freshSpotifyModule();
  await withEnv({ SPOTIFY_CLIENT_ID: undefined, SPOTIFY_CLIENT_SECRET: undefined }, async () => {
    await assert.rejects(getSpotifyArtist("Nova Bloom"), (err) => {
      assert.ok(err instanceof SpotifyApiError);
      assert.match(err.message, /Missing SPOTIFY_CLIENT_ID/);
      return true;
    });
  });
});

test("getSpotifyArtist wraps a token-fetch network failure", async () => {
  const { getSpotifyArtist, SpotifyApiError } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      await assert.rejects(getSpotifyArtist("Nova Bloom"), (err) => {
        assert.ok(err instanceof SpotifyApiError);
        assert.match(err.message, /Failed to reach Spotify auth: network down/);
        return true;
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSpotifyArtist throws when the token request is rejected", async () => {
  const { getSpotifyArtist, SpotifyApiError } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({}, false, 400);
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      await assert.rejects(getSpotifyArtist("Nova Bloom"), (err) => {
        assert.ok(err instanceof SpotifyApiError);
        assert.match(err.message, /rejected the client credentials/);
        return true;
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSpotifyArtist caches the access token across calls", async () => {
  const { getSpotifyArtist } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  let tokenCalls = 0;
  globalThis.fetch = async (url: RequestInfo | URL) => {
    if (String(url).includes("token")) {
      tokenCalls++;
      return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
    }
    return jsonResponse({ artists: { items: [] } });
  };
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      await getSpotifyArtist("Nova Bloom");
      await getSpotifyArtist("Silver Static");
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(tokenCalls, 1);
});

test("getSpotifyArtist maps search error status codes and drops the cached token on 401", async () => {
  const { getSpotifyArtist, SpotifyApiError } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  let tokenCalls = 0;
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      globalThis.fetch = async (url: RequestInfo | URL) => {
        if (String(url).includes("token")) {
          tokenCalls++;
          return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
        }
        return jsonResponse({}, false, 401);
      };
      await assert.rejects(getSpotifyArtist("Nova Bloom"), (err) => {
        assert.ok(err instanceof SpotifyApiError);
        assert.match(err.message, /rejected the access token/);
        return true;
      });

      // Token cache was dropped, so the next call re-authenticates.
      await assert.rejects(getSpotifyArtist("Nova Bloom"));
      assert.equal(tokenCalls, 2);

      globalThis.fetch = async (url: RequestInfo | URL) => {
        if (String(url).includes("token")) {
          return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
        }
        return jsonResponse({}, false, 429);
      };
      await assert.rejects(getSpotifyArtist("Nova Bloom"), /rate limit exceeded/);

      globalThis.fetch = async (url: RequestInfo | URL) => {
        if (String(url).includes("token")) {
          return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
        }
        return jsonResponse({}, false, 500);
      };
      await assert.rejects(getSpotifyArtist("Nova Bloom"), /failed with status 500/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSpotifyArtist wraps a search-fetch network failure", async () => {
  const { getSpotifyArtist, SpotifyApiError } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      globalThis.fetch = async (url: RequestInfo | URL) => {
        if (String(url).includes("token")) {
          return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
        }
        throw new Error("search down");
      };
      await assert.rejects(getSpotifyArtist("Nova Bloom"), (err) => {
        assert.ok(err instanceof SpotifyApiError);
        assert.match(err.message, /Failed to reach Spotify: search down/);
        return true;
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSpotifyArtist returns null when there is no match", async () => {
  const { getSpotifyArtist } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      globalThis.fetch = async (url: RequestInfo | URL) => {
        if (String(url).includes("token")) {
          return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
        }
        return jsonResponse({ artists: { items: [] } });
      };
      assert.equal(await getSpotifyArtist("Nobody"), null);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSpotifyArtist normalizes a full artist and picks a mid-resolution image", async () => {
  const { getSpotifyArtist } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      globalThis.fetch = async (url: RequestInfo | URL) => {
        if (String(url).includes("token")) {
          return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
        }
        return jsonResponse({
          artists: {
            items: [
              {
                id: "spotify-1",
                name: "Nova Bloom",
                external_urls: { spotify: "https://open.spotify.com/artist/1" },
                images: [
                  { url: "https://img.example.com/huge.jpg", width: 1000 },
                  { url: "https://img.example.com/mid.jpg", width: 400 },
                ],
                genres: ["indie rock"],
                followers: { total: 12000 },
                popularity: 55,
              },
            ],
          },
        });
      };
      const artist = await getSpotifyArtist("Nova Bloom");
      assert.deepEqual(artist, {
        id: "spotify-1",
        name: "Nova Bloom",
        url: "https://open.spotify.com/artist/1",
        imageUrl: "https://img.example.com/mid.jpg",
        genres: ["indie rock"],
        followers: 12000,
        popularity: 55,
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSpotifyArtist falls back for a sparse artist", async () => {
  const { getSpotifyArtist } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      globalThis.fetch = async (url: RequestInfo | URL) => {
        if (String(url).includes("token")) {
          return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
        }
        return jsonResponse({
          artists: { items: [{ id: "spotify-2", name: "Bare Artist" }] },
        });
      };
      const artist = await getSpotifyArtist("Bare Artist");
      assert.deepEqual(artist, {
        id: "spotify-2",
        name: "Bare Artist",
        url: null,
        imageUrl: null,
        genres: [],
        followers: null,
        popularity: null,
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSpotifyArtist normalizes whitespace/casing in the artist name for the search request (TEA-30)", async () => {
  const { getSpotifyArtist } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  let searchUrl = "";
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      globalThis.fetch = async (url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes("token")) {
          return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
        }
        searchUrl = urlStr;
        return jsonResponse({ artists: { items: [] } });
      };
      await getSpotifyArtist("  The STROKES  ");
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(searchUrl, /q=the\+strokes/);
});

test("getSpotifyArtist opts the search request into Next's Data Cache with the configured TTL (TEA-30)", async () => {
  const { getSpotifyArtist } = freshSpotifyModule();
  const originalFetch = globalThis.fetch;
  let searchInit: RequestInit | undefined;
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes("token")) {
          return jsonResponse({ access_token: "tok", token_type: "Bearer", expires_in: 3600 });
        }
        searchInit = init;
        return jsonResponse({ artists: { items: [] } });
      };
      await getSpotifyArtist("The Strokes");
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual((searchInit as { next?: { revalidate?: number } })?.next, {
    revalidate: 86_400,
  });
});