const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";

/**
 * Apple's real Apple Music API (MusicKit) requires a paid Apple Developer
 * Program membership and a private key to sign a JWT developer token. This
 * project doesn't have those, so we use Apple's free, keyless iTunes Search
 * API instead - it indexes the same artist catalog and returns an official
 * `artistLinkUrl` straight to the Apple Music artist page, which is all we
 * need for the "link out to Apple Music" use case.
 */

/** Clean, front-end-friendly shape we normalize the iTunes response into. */
export type NormalizedAppleMusicArtist = {
  id: number;
  name: string;
  /** Link to the artist's Apple Music page. */
  url: string | null;
  primaryGenre: string | null;
};

export class AppleMusicApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AppleMusicApiError";
    this.status = status;
  }
}

// --- Minimal typing for the slice of the iTunes response we use ---

type ItunesArtistResult = {
  artistId?: number;
  artistName?: string;
  artistLinkUrl?: string;
  primaryGenreName?: string;
};

type ItunesSearchResponse = {
  results?: ItunesArtistResult[];
};

/**
 * Search Apple Music (via the iTunes Search API) for an artist by name and
 * return the best match in our normalized shape. Throws AppleMusicApiError
 * on any failure (network error, non-2xx response) so callers can catch a
 * single error type. Returns null if there's no matching artist.
 */
export async function getAppleMusicArtist(
  artistName: string
): Promise<NormalizedAppleMusicArtist | null> {
  const searchParams = new URLSearchParams({
    term: artistName,
    entity: "musicArtist",
    limit: "1",
  });

  let response: Response;
  try {
    response = await fetch(`${ITUNES_SEARCH_URL}?${searchParams.toString()}`, {
      // Artist metadata doesn't change minute to minute.
      next: { revalidate: 86400 },
    });
  } catch (err) {
    throw new AppleMusicApiError(
      `Failed to reach Apple Music (iTunes Search): ${
        err instanceof Error ? err.message : "unknown network error"
      }`
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new AppleMusicApiError(
        "Apple Music (iTunes Search) rate limit exceeded. Try again shortly.",
        response.status
      );
    }
    throw new AppleMusicApiError(
      `Apple Music (iTunes Search) request failed with status ${response.status}`,
      response.status
    );
  }

  const data = (await response.json()) as ItunesSearchResponse;
  const artist = data.results?.[0];

  if (!artist || !artist.artistId || !artist.artistName) return null;

  return {
    id: artist.artistId,
    name: artist.artistName,
    url: artist.artistLinkUrl ?? null,
    primaryGenre: artist.primaryGenreName ?? null,
  };
}
