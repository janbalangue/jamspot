// Types shared between the JamSpot web app (apps/web) and the JamSpot
// mobile app (apps/mobile) — the normalized, front-end-friendly shapes the
// Next.js API routes (apps/web/app/api/**) return as JSON, so both clients
// can type their fetch/response handling against the same contract.
//
// Ships as raw TypeScript with no build step (see package.json's
// "main"/"types"/"exports"): Next.js consumes it via `transpilePackages`
// in apps/web/next.config.ts, and Metro (Expo) transpiles TypeScript
// on the fly, so neither bundler needs a prebuilt dist/.

/** Clean, front-end-friendly shape a Ticketmaster event is normalized into.
 *  Source of truth was apps/web/lib/ticketmaster.ts. */
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

/**
 * Row shape of the `reviews` table.
 *
 * There is no `user_id` / accounts table - JamSpot has no authentication.
 * `user_name` is a plain, manually-entered text field, not a foreign key.
 *
 * Source of truth was apps/web/lib/reviews.ts.
 */
export type Review = {
  id: string;
  musician: string;
  venue: string;
  concert_date: string; // ISO date, e.g. "2026-05-01"
  review_text: string;
  venue_city: string | null;
  venue_state: string | null;
  venue_country: string | null;
  user_name: string | null;
  created_at: string;
};

/** Fields needed to create a new review. */
export type NewReview = {
  musician: string;
  venue: string;
  concertDate: string;
  reviewText: string;
  venueCity?: string;
  venueState?: string;
  venueCountry?: string;
  userName?: string;
};

/** Fields that can be changed on an existing review. All optional. */
export type ReviewUpdate = Partial<NewReview>;

/** Clean, front-end-friendly shape a Spotify artist is normalized into.
 *  Source of truth was apps/web/lib/spotify.ts. */
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

/** Clean, front-end-friendly shape an Apple Music (iTunes) artist is
 *  normalized into. Source of truth was apps/web/lib/apple-music.ts. */
export type NormalizedAppleMusicArtist = {
  id: number;
  name: string;
  /** Link to the artist's Apple Music page. */
  url: string | null;
  primaryGenre: string | null;
};

/** Clean, front-end-friendly shape a Last.fm artist bio is normalized into.
 *  Source of truth was apps/web/lib/lastfm.ts. */
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
