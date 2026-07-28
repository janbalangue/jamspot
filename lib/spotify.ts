const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search";

/** Clean, front-end-friendly shape we normalize the Spotify response into. */
export type NormalizedSpotifyArtist = {
  id: string;
  name: string;
  /** Link to the artist's Spotify page. */
  url: string | null;
  imageUrl: string | null;
  genres: string[];
  followers: number | null;
  popularity: number | null;
};

export class SpotifyApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
  }
}

// --- Minimal typing for the slice of the Spotify response we use ---

type SpotifyImage = {
  url: string;
  width?: number;
  height?: number;
};

type SpotifyArtistResult = {
  id: string;
  name: string;
  external_urls?: { spotify?: string };
  images?: SpotifyImage[];
  genres?: string[];
  followers?: { total?: number };
  popularity?: number;
};

type SpotifySearchResponse = {
  artists?: { items?: SpotifyArtistResult[] };
};

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

// Client-credentials tokens are app-scoped (not per-user), so a single
// module-level cache is safe to share across requests on the server.
let cachedToken: { value: string; expiresAt: number } | null = null;

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new SpotifyApiError(
      "Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET environment variables"
    );
  }

  return { clientId, clientSecret };
}

/**
 * Get a valid client-credentials access token, reusing the cached one until
 * shortly before it expires.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.value;
  }

  const { clientId, clientSecret } = getCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  let response: Response;
  try {
    response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      // Don't let Next.js cache an auth token fetch.
      cache: "no-store",
    });
  } catch (err) {
    throw new SpotifyApiError(
      `Failed to reach Spotify auth: ${
        err instanceof Error ? err.message : "unknown network error"
      }`
    );
  }

  if (!response.ok) {
    throw new SpotifyApiError(
      "Spotify rejected the client credentials. Check SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.",
      response.status
    );
  }

  const data = (await response.json()) as SpotifyTokenResponse;

  // Refresh a minute early so we never hand out a token that expires
  // mid-request.
  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  };

  return cachedToken.value;
}

/**
 * Search Spotify for an artist by name and return the best match in our
 * normalized shape. Throws SpotifyApiError on any failure (missing
 * credentials, network error, non-2xx response) so callers can catch a
 * single error type. Returns null if Spotify has no matching artist.
 */
export async function getSpotifyArtist(
  artistName: string
): Promise<NormalizedSpotifyArtist | null> {
  const token = await getAccessToken();

  const searchParams = new URLSearchParams({
    q: artistName,
    type: "artist",
    limit: "1",
  });

  let response: Response;
  try {
    response = await fetch(
      `${SPOTIFY_SEARCH_URL}?${searchParams.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        // Artist metadata doesn't change minute to minute.
        next: { revalidate: 86400 },
      }
    );
  } catch (err) {
    throw new SpotifyApiError(
      `Failed to reach Spotify: ${
        err instanceof Error ? err.message : "unknown network error"
      }`
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Token may have been invalidated server-side; drop the cache so the
      // next call re-authenticates instead of retrying with a dead token.
      cachedToken = null;
      throw new SpotifyApiError(
        "Spotify rejected the access token.",
        response.status
      );
    }
    if (response.status === 429) {
      throw new SpotifyApiError(
        "Spotify rate limit exceeded. Try again shortly.",
        response.status
      );
    }
    throw new SpotifyApiError(
      `Spotify request failed with status ${response.status}`,
      response.status
    );
  }

  const data = (await response.json()) as SpotifySearchResponse;
  const artist = data.artists?.items?.[0];

  if (!artist) return null;

  return normalizeArtist(artist);
}

function normalizeArtist(artist: SpotifyArtistResult): NormalizedSpotifyArtist {
  return {
    id: artist.id,
    name: artist.name,
    url: artist.external_urls?.spotify ?? null,
    imageUrl: pickBestImage(artist.images)?.url ?? null,
    genres: artist.genres ?? [],
    followers: artist.followers?.total ?? null,
    popularity: artist.popularity ?? null,
  };
}

/** Prefer a mid-resolution image so we're not shipping a huge original. */
function pickBestImage(images: SpotifyImage[] | undefined): SpotifyImage | undefined {
  if (!images || images.length === 0) return undefined;
  return (
    images.find((img) => (img.width ?? 0) >= 300 && (img.width ?? 0) <= 640) ??
    images[0]
  );
}
