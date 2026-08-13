import { DEFAULT_API_CACHE_TTL_SECONDS, normalizeSearchValue } from "@/lib/cache-config";
import type { NormalizedArtistBio } from "@jamspot/shared";

const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";

export type { NormalizedArtistBio };

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
  // TEA-30: normalize so "Cher", " cher ", "CHER" all build the exact same
  // request URL, and therefore share one Next.js Data Cache entry.
  const normalizedArtistName = normalizeSearchValue(artistName);

  const searchParams = new URLSearchParams({
    method: "artist.getinfo",
    artist: normalizedArtistName,
    api_key: apiKey,
    format: "json",
    autocorrect: "1",
  });

  let response: Response;
  try {
    response = await fetch(`${LASTFM_BASE_URL}?${searchParams.toString()}`, {
      // Bios don't change often - cache for a day (configurable) to stay
      // well within Last.fm's rate limit. TEA-30.
      next: { revalidate: DEFAULT_API_CACHE_TTL_SECONDS },
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