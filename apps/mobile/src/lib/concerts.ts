import type {
  NormalizedAppleMusicArtist,
  NormalizedArtistBio,
  NormalizedConcert,
  NormalizedSpotifyArtist,
} from '@jamspot/shared';

import { apiFetch } from '@/lib/api';

const FALLBACK_IMAGE = 'https://picsum.photos/400/250?random=1';

export async function searchConcerts(params: {
  keyword?: string;
  city?: string;
  stateCode?: string;
}): Promise<NormalizedConcert[]> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.city) query.set('city', params.city);
  if (params.stateCode) query.set('stateCode', params.stateCode);

  const { concerts } = await apiFetch<{ concerts: NormalizedConcert[] }>(
    `/api/concerts?${query.toString()}`,
  );
  return concerts;
}

export async function getArtistBio(name: string): Promise<NormalizedArtistBio | null> {
  const { bio } = await apiFetch<{ bio: NormalizedArtistBio | null }>(
    `/api/artist/lastfm?name=${encodeURIComponent(name)}`,
  );
  return bio;
}

export async function getSpotifyArtist(name: string): Promise<NormalizedSpotifyArtist | null> {
  const { artist } = await apiFetch<{ artist: NormalizedSpotifyArtist | null }>(
    `/api/artist/spotify?name=${encodeURIComponent(name)}`,
  );
  return artist;
}

export async function getAppleMusicArtist(
  name: string,
): Promise<NormalizedAppleMusicArtist | null> {
  const { artist } = await apiFetch<{ artist: NormalizedAppleMusicArtist | null }>(
    `/api/artist/apple-music?name=${encodeURIComponent(name)}`,
  );
  return artist;
}

/**
 * Same keyword-length gate and city-vs-stateCode heuristic as
 * apps/web/app/page.tsx's handleSearch/fetchConcerts, so mobile and web
 * search behave identically against the same API.
 */
export function buildConcertSearchParams(keyword: string, location: string) {
  const params: { keyword?: string; city?: string; stateCode?: string } = {};
  if (keyword.length >= 3) {
    params.keyword = keyword;
  }
  if (location) {
    if (/^[a-z]{2}$/i.test(location)) {
      params.stateCode = location.toUpperCase();
    } else {
      params.city = location;
    }
  }
  return params;
}

/** Shape the UI renders. Derived from NormalizedConcert, same as web's CardEvent. */
export type CardEvent = {
  id: string;
  artist: string;
  venue: string;
  city: string;
  state: string;
  date: string;
  time: string;
  genre: string;
  priceRange: string | null;
  image: string;
  ticketUrl: string | null;
};

export function formatDate(date: string | null | undefined): string {
  if (!date) return 'Date TBA';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return 'Time TBA';
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatPriceRange(priceRange: NormalizedConcert['priceRange']): string | null {
  if (!priceRange) return null;
  const { min, max, currency } = priceRange;
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  if (min === max) return `${symbol}${min}`;
  return `${symbol}${min} - ${symbol}${max}`;
}

export function toCardEvent(concert: NormalizedConcert): CardEvent {
  return {
    id: concert.id,
    artist: concert.artist ?? concert.name,
    venue: concert.venue ?? 'Venue TBA',
    city: concert.city ?? '',
    state: concert.state ?? '',
    date: formatDate(concert.date),
    time: formatTime(concert.time),
    genre: concert.genre ?? 'Other',
    priceRange: formatPriceRange(concert.priceRange),
    image: concert.imageUrl ?? FALLBACK_IMAGE,
    ticketUrl: concert.ticketUrl,
  };
}

export function filterCardEvents(
  events: CardEvent[],
  search: string,
  location: string,
  activeGenre: string,
): CardEvent[] {
  const query = search.trim().toLowerCase();
  const normalizedLocation = location.trim().toLowerCase();

  return events.filter((event) => {
    const matchesGenre = activeGenre === 'All' || event.genre === activeGenre;
    const searchableText = [event.artist, event.venue, event.city, event.state, event.genre]
      .join(' ')
      .toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);
    const matchesLocation =
      !normalizedLocation ||
      event.city.toLowerCase().includes(normalizedLocation) ||
      event.state.toLowerCase().includes(normalizedLocation);

    return matchesGenre && matchesSearch && matchesLocation;
  });
}
