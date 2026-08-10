/**
 * Shared config for Next.js's built-in fetch cache ("Data Cache"), used by
 * every external API integration (Ticketmaster, Last.fm, Spotify, Apple
 * Music) via the `next: { revalidate }` option on `fetch()` calls.
 *
 * TEA-30: this is intentionally *not* a database-backed cache - Next.js's
 * Data Cache is already a shared, server-side cache that persists across
 * requests and application instances when deployed (e.g. on Vercel), so a
 * separate table would just be duplicating what the framework gives us for
 * free. See lib/lastfm.ts, lib/spotify.ts, lib/apple-music.ts, and
 * lib/ticketmaster.ts for where this is used.
 */

/** Default TTL: 24 hours. Configurable via API_CACHE_TTL_SECONDS. */
export const DEFAULT_API_CACHE_TTL_SECONDS =
  Number(process.env.API_CACHE_TTL_SECONDS) || 86_400;

/**
 * Ticketmaster gets its own, shorter default (5 minutes) - concert
 * listings (new shows, sold-out status, etc.) change far more often than
 * artist bios/links, so a 24h cache would go stale in a way that matters.
 * Configurable via TICKETMASTER_CACHE_TTL_SECONDS.
 */
export const TICKETMASTER_CACHE_TTL_SECONDS =
  Number(process.env.TICKETMASTER_CACHE_TTL_SECONDS) || 300;

/**
 * Normalizes a search value (artist name, keyword, etc.) so that requests
 * differing only by capitalization or surrounding whitespace resolve to the
 * exact same outgoing URL - and therefore the same Data Cache entry.
 * Search text is lowercased before being sent to each provider; that's
 * safe because Ticketmaster/Last.fm/Spotify/iTunes search are already
 * case-insensitive server-side, so this only affects caching, not results.
 */
export function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}