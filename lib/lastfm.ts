const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";

/** Clean, front-end-friendly shape we normalize the Last.fm response into. */
export type NormalizedArtistBio = {
  name: string;
  /** Short bio with HTML stripped and the trailing "Read more on Last.fm"
   *  link removed. Null if Last.fm has no bio on file for this artist. */
  summary: string | null;
  /** Full-length bio, same cleanup applied as `summary`. */
  content: string | null;
  /** Link to the artist's Last.fm page. */
  url: string | null;
  /** Last.fm's listener count for the artist, if available. */
  listeners: number | null;
};

export class LastfmApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "LastfmApiError";
    this.status = status;
  }
}

// --- Minimal typing for the slice of the Last.fm response we use ---

type LastfmBio = {
  summary?: string;
  content?: string;
};

type LastfmArtist = {
  name?: string;
  url?: string;
  stats?: { listeners?: string };
  bio?: LastfmBio;
};

type LastfmArtistInfoResponse = {
  artist?: LastfmArtist;
  error?: number;
  message?: string;
};

function getApiKey(): string {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    throw new LastfmApiError("Missing LASTFM_API_KEY environment variable");
  }
  return apiKey;
}

/**
 * Look up an artist's biography on Last.fm and return it in our normalized
 * shape. Throws LastfmApiError on any failure (missing key, network error,
 * non-2xx response, or Last.fm's own in-body error codes) so callers can
 * catch a single error type. Returns null if Last.fm has no matching artist.
 */
export async function getArtistBio(
  artistName: string
): Promise<NormalizedArtistBio | null> {
  const apiKey = getApiKey();

  const searchParams = new URLSearchParams({
    method: "artist.getinfo",
    artist: artistName,
    api_key: apiKey,
    format: "json",
    autocorrect: "1",
  });

  let response: Response;
  try {
    response = await fetch(`${LASTFM_BASE_URL}?${searchParams.toString()}`, {
      // Bios don't change often - cache for a day to stay well within
      // Last.fm's rate limit.
      next: { revalidate: 86400 },
    });
  } catch (err) {
    throw new LastfmApiError(
      `Failed to reach Last.fm: ${
        err instanceof Error ? err.message : "unknown network error"
      }`
    );
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new LastfmApiError(
        "Last.fm rejected the API key. Check LASTFM_API_KEY.",
        response.status
      );
    }
    if (response.status === 429) {
      throw new LastfmApiError(
        "Last.fm rate limit exceeded. Try again shortly.",
        response.status
      );
    }
    throw new LastfmApiError(
      `Last.fm request failed with status ${response.status}`,
      response.status
    );
  }

  const data = (await response.json()) as LastfmArtistInfoResponse;

  // Last.fm returns 200 OK with an `error` field in the body for things
  // like "artist not found" (error 6) rather than a non-2xx status.
  if (data.error) {
    if (data.error === 6) return null; // no matching artist
    throw new LastfmApiError(
      data.message ?? `Last.fm returned error code ${data.error}`
    );
  }

  if (!data.artist) return null;

  return normalizeArtist(data.artist);
}

function normalizeArtist(artist: LastfmArtist): NormalizedArtistBio {
  const listeners = artist.stats?.listeners
    ? Number(artist.stats.listeners)
    : null;

  return {
    name: artist.name ?? "",
    summary: cleanBioText(artist.bio?.summary),
    content: cleanBioText(artist.bio?.content),
    url: artist.url ?? null,
    listeners: listeners !== null && !Number.isNaN(listeners) ? listeners : null,
  };
}

/**
 * Last.fm bios come as HTML with a trailing
 * `<a href="...">Read more on Last.fm</a>` link baked into the text. Strip
 * the markup and that trailing link so the UI gets plain, clean prose.
 */
function cleanBioText(raw: string | undefined): string | null {
  if (!raw) return null;

  const withoutReadMoreLink = raw.replace(/<a href="[^"]*">Read more on Last\.fm<\/a>\.?/i, "");
  const withoutTags = withoutReadMoreLink.replace(/<[^>]*>/g, "");
  const decoded = withoutTags
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  const trimmed = decoded.trim();
  return trimmed.length > 0 ? trimmed : null;
}
