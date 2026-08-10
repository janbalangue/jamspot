import { supabase } from "@/lib/supabase";

/**
 * Default cache TTL: 24 hours, per TEA-30. Configurable via
 * API_CACHE_TTL_SECONDS without a code change if we ever need to tune it.
 */
const DEFAULT_TTL_SECONDS = Number(process.env.API_CACHE_TTL_SECONDS) || 86_400;

const CACHE_TABLE = "api_cache";

/** Row shape of the `api_cache` table (see supabase/api_cache.sql). */
type ApiCacheRow = {
  provider: string;
  query: string;
  response: unknown;
  created_at: string;
  expires_at: string;
};

/**
 * Normalize a raw search query so equivalent searches share one cache
 * entry: trims whitespace and lowercases. Safe to call with an already
 *-serialized querystring (e.g. "city=dallas&statecode=tx") as well as a
 * plain artist name.
 */
function normalizeQuery(rawQuery: string): string {
  return rawQuery.trim().toLowerCase();
}

/**
 * Wrap an external API call with a shared, server-side cache (TEA-30).
 *
 * Looks up `(provider, normalized query)` in Supabase first; on a fresh
 * hit, returns the cached payload without calling `fetchFn`. On a miss (or
 * any cache failure), calls `fetchFn`, and - only if it succeeds - stores
 * the result for `ttlSeconds` (default 24h) before returning it.
 *
 * Cache reads and writes never throw: any Supabase error, network failure,
 * or malformed response is treated as "no cache available" and we fall
 * back to calling `fetchFn` directly, so a cache outage never breaks a
 * search. Failed `fetchFn` calls are never cached and their errors
 * propagate to the caller unchanged.
 */
export async function withCache<T>(
  provider: string,
  rawQuery: string,
  fetchFn: () => Promise<T>,
  options?: { ttlSeconds?: number }
): Promise<T> {
  const query = normalizeQuery(rawQuery);

  const cached = await readCache<T>(provider, query);
  if (cached !== undefined) {
    return cached;
  }

  const result = await fetchFn();

  await writeCache(provider, query, result, options?.ttlSeconds ?? DEFAULT_TTL_SECONDS);

  return result;
}

/**
 * Returns the cached payload if a non-expired entry exists, otherwise
 * `undefined`. Never throws - any failure is treated as a cache miss.
 */
async function readCache<T>(provider: string, query: string): Promise<T | undefined> {
  try {
    const { data, error } = await supabase
      .from(CACHE_TABLE)
      .select("response, expires_at")
      .eq("provider", provider)
      .eq("query", query)
      .maybeSingle<Pick<ApiCacheRow, "response" | "expires_at">>();

    if (error || !data) return undefined;

    const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : NaN;
    if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      return undefined;
    }

    return data.response as T;
  } catch {
    return undefined;
  }
}

/**
 * Best-effort cache write. A failure here never propagates - the request
 * already succeeded by the time this runs, so a broken cache should only
 * mean "we'll hit the external API again next time," not a failed search.
 */
async function writeCache(
  provider: string,
  query: string,
  response: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    await supabase.from(CACHE_TABLE).upsert(
      {
        provider,
        query,
        response,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      } satisfies ApiCacheRow,
      { onConflict: "provider,query" }
    );
  } catch {
    // Swallow - see doc comment above.
  }
}