"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, MapPin, Calendar, Clock, Ticket } from "lucide-react";

import type { NormalizedArtistBio } from "@/lib/lastfm";
import type { NormalizedSpotifyArtist } from "@/lib/spotify";
import type { NormalizedAppleMusicArtist } from "@/lib/apple-music";
import StreamingServiceLinks from "@/components/StreamingServiceLinks";

/** Matches the CardEvent shape rendered by EventCard in app/page.tsx. */
export type ConcertModalEvent = {
  id: string;
  artist: string;
  venue: string;
  city: string;
  state: string;
  date: string;
  time: string;
  genre: string;
  subGenre: string;
  priceRange: string | null;
  image: string;
  ticketUrl: string | null;
};

type FetchState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

const initialFetchState = <T,>(): FetchState<T> => ({
  data: null,
  isLoading: true,
  error: null,
});

export default function ConcertModal({
  event,
  onClose,
}: {
  event: ConcertModalEvent | null;
  onClose: () => void;
}) {
  // TEA-22: Last.fm artist biography
  const [bio, setBio] = useState<FetchState<NormalizedArtistBio | null>>(
    initialFetchState
  );
  // TEA-19 / TEA-23: Spotify artist data + link
  const [spotify, setSpotify] = useState<
    FetchState<NormalizedSpotifyArtist | null>
  >(initialFetchState);
  // TEA-21 / TEA-24: Apple Music artist lookup + link
  const [appleMusic, setAppleMusic] = useState<
    FetchState<NormalizedAppleMusicArtist | null>
  >(initialFetchState);

  // Close on Escape.
  useEffect(() => {
    if (!event) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [event, onClose]);

  // Fetch artist enrichment data whenever the modal opens for a new artist.
  // Each source is fetched and reported independently, so one failing
  // (e.g. Last.fm rate-limited) never blocks the others from rendering.
  // Note: page.tsx renders this component with `key={event.id}`, so React
  // remounts (and re-initializes all state to "loading") on artist change
  // instead of us needing to reset it manually inside the effect.
  useEffect(() => {
    if (!event) return;

    const controller = new AbortController();
    const artistName = event.artist;

    fetchArtistData<{ bio: NormalizedArtistBio | null }>(
      `/api/artist/lastfm?name=${encodeURIComponent(artistName)}`,
      controller.signal
    )
      .then((res) => setBio({ data: res.bio, isLoading: false, error: null }))
      .catch((err) => setBio(errorState(err)));

    fetchArtistData<{ artist: NormalizedSpotifyArtist | null }>(
      `/api/artist/spotify?name=${encodeURIComponent(artistName)}`,
      controller.signal
    )
      .then((res) =>
        setSpotify({ data: res.artist, isLoading: false, error: null })
      )
      .catch((err) => setSpotify(errorState(err)));

    fetchArtistData<{ artist: NormalizedAppleMusicArtist | null }>(
      `/api/artist/apple-music?name=${encodeURIComponent(artistName)}`,
      controller.signal
    )
      .then((res) =>
        setAppleMusic({ data: res.artist, isLoading: false, error: null })
      )
      .catch((err) => setAppleMusic(errorState(err)));

    return () => controller.abort();
  }, [event]);

  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${event.artist} concert details`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 border border-white/10 text-white/80 hover:text-white hover:bg-black/80 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Hero image */}
        <div className="relative h-48 overflow-hidden bg-muted">
          <Image
            src={event.image}
            alt={`${event.artist} live`}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <div className="absolute top-3 left-3">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white/80 backdrop-blur-sm"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {event.genre}
            </span>
          </div>
        </div>

        <div className="p-5">
          <h2
            className="text-xl font-black text-foreground leading-tight mb-2"
            style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "1.1rem" }}
          >
            {event.artist}
          </h2>

          {/* Concert details */}
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-2">
              <MapPin size={13} className="shrink-0" />
              {event.venue} · {event.city}, {event.state}
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={13} className="shrink-0" />
              {event.date}
            </span>
            {event.time && (
              <span className="flex items-center gap-2">
                <Clock size={13} className="shrink-0" />
                {event.time}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mb-5">
            {event.priceRange && (
              <span
                className="text-foreground font-semibold text-sm"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {event.priceRange}
              </span>
            )}
            <a
              href={event.ticketUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!event.ticketUrl}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all border ${
                event.ticketUrl
                  ? "bg-primary/10 hover:bg-primary/20 border-primary/20 hover:border-primary/40 text-primary cursor-pointer"
                  : "bg-primary/10 border-primary/20 text-primary opacity-40 pointer-events-none"
              }`}
            >
              <Ticket size={12} />
              {event.ticketUrl ? "Get Tickets" : "Unavailable"}
            </a>
          </div>

          {/* TEA-22: Last.fm bio */}
          <section className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
              About {event.artist}
            </h3>
            {bio.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading bio...</p>
            ) : bio.error ? (
              <p className="text-sm text-muted-foreground">
                Bio unavailable right now.
              </p>
            ) : bio.data?.summary ? (
              <p className="text-sm text-foreground/80 leading-relaxed">
                {bio.data.summary}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No biography found for this artist.
              </p>
            )}
          </section>

          {/* TEA-19/21/23/24: streaming links */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Listen &amp; Follow
            </h3>
            <StreamingServiceLinks
              artistName={event.artist}
              appleMusic={{
                isLoading: appleMusic.isLoading,
                url: appleMusic.data?.url ?? null,
              }}
              spotify={{
                isLoading: spotify.isLoading,
                url: spotify.data?.url ?? null,
              }}
            />
            {spotify.data?.genres && spotify.data.genres.length > 0 && (
              <p
                className="mt-3 text-xs text-muted-foreground"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {spotify.data.genres.slice(0, 4).join(" · ")}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}


async function fetchArtistData<T>(
  url: string,
  signal: AbortSignal
): Promise<T> {
  const res = await fetch(url, { signal });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? "Request failed");
  }
  return data as T;
}

function errorState<T>(err: unknown): FetchState<T> {
  const isAbort = err instanceof DOMException && err.name === "AbortError";
  return {
    data: null,
    isLoading: false,
    error: isAbort ? null : err instanceof Error ? err.message : "Failed to load",
  };
}
