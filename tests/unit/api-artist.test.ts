import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { GET as getAppleMusic } from "../../app/api/artist/apple-music/route";
import { GET as getLastfm } from "../../app/api/artist/lastfm/route";
import { GET as getSpotify } from "../../app/api/artist/spotify/route";

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

function brokenJsonResponse(): Response {
  return {
    ok: true,
    json: async () => {
      throw new Error("malformed body");
    },
  } as unknown as Response;
}

test("GET /api/artist/apple-music requires a name", async () => {
  const response = await getAppleMusic(new NextRequest("http://localhost/api/artist/apple-music"));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Provide an artist name/);
});

test("GET /api/artist/apple-music returns the normalized artist", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => ({
        results: [{ artistId: 1, artistName: "Nova Bloom", artistLinkUrl: "https://music.apple.com/artist/1", primaryGenreName: "Rock" }],
      }),
    }) as Response;
  try {
    const response = await getAppleMusic(new NextRequest("http://localhost/api/artist/apple-music?name=Nova+Bloom"));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).artist.name, "Nova Bloom");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/artist/apple-music maps an AppleMusicApiError status and a non-API error to 500", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) }) as Response;
    const rateLimited = await getAppleMusic(new NextRequest("http://localhost/api/artist/apple-music?name=X"));
    assert.equal(rateLimited.status, 429);

    globalThis.fetch = async () => brokenJsonResponse();
    const unexpected = await getAppleMusic(new NextRequest("http://localhost/api/artist/apple-music?name=X"));
    assert.equal(unexpected.status, 500);
    assert.match((await unexpected.json()).error, /Unexpected error while fetching Apple Music artist/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/artist/lastfm requires a name", async () => {
  const response = await getLastfm(new NextRequest("http://localhost/api/artist/lastfm"));
  assert.equal(response.status, 400);
});

test("GET /api/artist/lastfm returns the normalized bio", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({ ok: true, json: async () => ({ artist: { name: "Nova Bloom", bio: {} } }) }) as Response;
  try {
    await withEnv({ LASTFM_API_KEY: "key-123" }, async () => {
      const response = await getLastfm(new NextRequest("http://localhost/api/artist/lastfm?name=Nova+Bloom"));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).bio.name, "Nova Bloom");
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/artist/lastfm maps a LastfmApiError status and a non-API error to 500", async () => {
  const originalFetch = globalThis.fetch;
  try {
    await withEnv({ LASTFM_API_KEY: "key-123" }, async () => {
      globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) }) as Response;
      const forbidden = await getLastfm(new NextRequest("http://localhost/api/artist/lastfm?name=X"));
      assert.equal(forbidden.status, 403);

      globalThis.fetch = async () => brokenJsonResponse();
      const unexpected = await getLastfm(new NextRequest("http://localhost/api/artist/lastfm?name=X"));
      assert.equal(unexpected.status, 500);
      assert.match((await unexpected.json()).error, /Unexpected error while fetching artist bio/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/artist/spotify requires a name", async () => {
  const response = await getSpotify(new NextRequest("http://localhost/api/artist/spotify"));
  assert.equal(response.status, 400);
});

test("GET /api/artist/spotify returns the normalized artist", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: RequestInfo | URL) => {
    if (String(url).includes("token")) {
      return ({ ok: true, json: async () => ({ access_token: "tok", token_type: "Bearer", expires_in: 3600 }) }) as Response;
    }
    return ({ ok: true, json: async () => ({ artists: { items: [{ id: "1", name: "Nova Bloom" }] } }) }) as Response;
  };
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      const response = await getSpotify(new NextRequest("http://localhost/api/artist/spotify?name=Nova+Bloom"));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).artist.name, "Nova Bloom");
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GET /api/artist/spotify maps a SpotifyApiError status and a non-API error to 500", async () => {
  const originalFetch = globalThis.fetch;
  try {
    await withEnv({ SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret" }, async () => {
      globalThis.fetch = async (url: RequestInfo | URL) => {
        if (String(url).includes("token")) {
          return ({ ok: true, json: async () => ({ access_token: "tok", token_type: "Bearer", expires_in: 3600 }) }) as Response;
        }
        return ({ ok: false, status: 429, json: async () => ({}) }) as Response;
      };
      const rateLimited = await getSpotify(new NextRequest("http://localhost/api/artist/spotify?name=X"));
      assert.equal(rateLimited.status, 429);

      globalThis.fetch = async (url: RequestInfo | URL) => {
        if (String(url).includes("token")) {
          return ({ ok: true, json: async () => ({ access_token: "tok", token_type: "Bearer", expires_in: 3600 }) }) as Response;
        }
        return brokenJsonResponse();
      };
      const unexpected = await getSpotify(new NextRequest("http://localhost/api/artist/spotify?name=X"));
      assert.equal(unexpected.status, 500);
      assert.match((await unexpected.json()).error, /Unexpected error while fetching Spotify artist/);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
