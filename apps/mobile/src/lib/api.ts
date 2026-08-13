import Constants from 'expo-constants';

/**
 * Shape of a row from the live `reviews` table, as actually returned by
 * GET /api/reviews today. This intentionally does NOT reuse the `Review`
 * type from @jamspot/shared: that type (and apps/web/lib/reviews.ts) still
 * describe an older schema (musician/venue/review_text/...) that no longer
 * matches the database, which now has star ratings and an author_id/profiles
 * relation. Once the shared type and web backend are reconciled with the
 * live schema, this can go back to importing from @jamspot/shared.
 */
export type Review = {
  id: string;
  short_description: string;
  description: string;
  star_rating: number;
  location: string;
  review_date: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  profiles: { username?: string; display_name?: string } | null;
};

/**
 * The web app's API routes are the backend for both clients. In dev, Metro's
 * hostUri (e.g. "192.168.1.88:8081") tells us the machine running `npm run
 * dev:web`, so simulators, emulators, and physical devices on the same LAN
 * all resolve the right host without per-platform special-casing.
 */
function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:3000`;
}

export class ApiError extends Error {}

export async function apiFetch<T>(path: string): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new ApiError(`Could not reach the JamSpot API at ${url}. Is "npm run dev:web" running?`);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? `Request to ${path} failed with status ${response.status}`);
  }
  return response.json();
}

export async function getReviews(): Promise<Review[]> {
  const { reviews } = await apiFetch<{ reviews: Review[] }>('/api/reviews');
  return reviews;
}
