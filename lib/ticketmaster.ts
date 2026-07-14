const TICKETMASTER_EVENTS_URL =
  "https://app.ticketmaster.com/discovery/v2/events.json";

/**
 * Params accepted by searchConcerts. These map fairly directly to the
 * Ticketmaster Discovery API's query params - see:
 * https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */
export type TicketmasterSearchParams = {
  /** City name, e.g. "Dallas" */
  city?: string;
  /** Two-letter US state code, e.g. "TX" */
  stateCode?: string;
  /** US postal / ZIP code */
  postalCode?: string;
  /** Free-text search - artist name, event name, etc. */
  keyword?: string;
  /** Ticketmaster classification. Defaults to "music". */
  classificationName?: string;
  /** ISO 8601 date-time, e.g. "2026-08-01T00:00:00Z" */
  startDateTime?: string;
  /** ISO 8601 date-time, e.g. "2026-08-31T23:59:59Z" */
  endDateTime?: string;
  /** Results per page (Ticketmaster max is 200) */
  size?: number;
  page?: number;
  /** e.g. "date,asc" */
  sort?: string;
};

/** Clean, front-end-friendly shape we normalize every event into. */
export type NormalizedConcert = {
  id: string;
  name: string;
  artist: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  date: string | null;
  time: string | null;
  imageUrl: string | null;
  ticketUrl: string | null;
  genre: string | null;
  subGenre: string | null;
  priceRange: { min: number; max: number; currency: string } | null;
};

export class TicketmasterApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TicketmasterApiError";
    this.status = status;
  }
}

// --- Minimal typing for the slice of the Ticketmaster response we use ---
// The real payload has many more fields; we only type what normalizeEvent reads.

type TmImage = {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
};

type TmVenue = {
  name?: string;
  city?: { name?: string };
  state?: { stateCode?: string; name?: string };
};

type TmAttraction = {
  name?: string;
};

type TmClassification = {
  genre?: { name?: string };
  subGenre?: { name?: string };
};

type TmPriceRange = {
  min?: number;
  max?: number;
  currency?: string;
};

type TmEvent = {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  classifications?: TmClassification[];
  priceRanges?: TmPriceRange[];
  dates?: {
    start?: { localDate?: string; localTime?: string };
  };
  _embedded?: {
    venues?: TmVenue[];
    attractions?: TmAttraction[];
  };
};

type TmEventsResponse = {
  _embedded?: {
    events?: TmEvent[];
  };
};

function getApiKey(): string {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    throw new TicketmasterApiError(
      "Missing TICKETMASTER_API_KEY environment variable"
    );
  }
  return apiKey;
}

/**
 * Search Ticketmaster for music events and return them in our normalized
 * shape. Throws TicketmasterApiError on any failure (missing key, network
 * error, non-2xx response) so callers can catch a single error type.
 */
export async function searchConcerts(
  params: TicketmasterSearchParams
): Promise<NormalizedConcert[]> {
  const apiKey = getApiKey();

  const searchParams = new URLSearchParams({
    apikey: apiKey,
    classificationName: params.classificationName ?? "music",
    size: String(params.size ?? 20),
  });

  if (params.city) searchParams.set("city", params.city);
  if (params.stateCode) searchParams.set("stateCode", params.stateCode);
  if (params.postalCode) searchParams.set("postalCode", params.postalCode);
  if (params.keyword) searchParams.set("keyword", params.keyword);
  if (params.startDateTime)
    searchParams.set("startDateTime", params.startDateTime);
  if (params.endDateTime) searchParams.set("endDateTime", params.endDateTime);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.sort) searchParams.set("sort", params.sort);

  let response: Response;
  try {
    response = await fetch(
      `${TICKETMASTER_EVENTS_URL}?${searchParams.toString()}`,
      // Concert listings don't change minute to minute - cache briefly so
      // we don't burn through Ticketmaster's rate limit.
      { next: { revalidate: 300 } }
    );
  } catch (err) {
    throw new TicketmasterApiError(
      `Failed to reach Ticketmaster: ${
        err instanceof Error ? err.message : "unknown network error"
      }`
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new TicketmasterApiError(
        "Ticketmaster rejected the API key. Check TICKETMASTER_API_KEY.",
        response.status
      );
    }
    if (response.status === 429) {
      throw new TicketmasterApiError(
        "Ticketmaster rate limit exceeded. Try again shortly.",
        response.status
      );
    }
    throw new TicketmasterApiError(
      `Ticketmaster request failed with status ${response.status}`,
      response.status
    );
  }

  const data = (await response.json()) as TmEventsResponse;
  const events = data._embedded?.events ?? [];

  return events.map(normalizeEvent);
}

function normalizeEvent(event: TmEvent): NormalizedConcert {
  const venue = event._embedded?.venues?.[0];
  const attraction = event._embedded?.attractions?.[0];
  const classification = event.classifications?.[0];
  const image = pickBestImage(event.images);
  const priceRange = event.priceRanges?.[0];

  return {
    id: event.id,
    name: event.name,
    artist: attraction?.name ?? null,
    venue: venue?.name ?? null,
    city: venue?.city?.name ?? null,
    state: venue?.state?.stateCode ?? null,
    date: event.dates?.start?.localDate ?? null,
    time: event.dates?.start?.localTime ?? null,
    imageUrl: image?.url ?? null,
    ticketUrl: event.url ?? null,
    genre: classification?.genre?.name ?? null,
    subGenre: classification?.subGenre?.name ?? null,
    priceRange:
      priceRange &&
      priceRange.min !== undefined &&
      priceRange.max !== undefined &&
      priceRange.currency
        ? {
            min: priceRange.min,
            max: priceRange.max,
            currency: priceRange.currency,
          }
        : null,
  };
}

/** Prefer a decent-resolution 16:9 image; fall back to whatever's first. */
function pickBestImage(images: TmImage[] | undefined): TmImage | undefined {
  if (!images || images.length === 0) return undefined;
  return (
    images.find((img) => img.ratio === "16_9" && (img.width ?? 0) >= 1024) ??
    images[0]
  );
}
