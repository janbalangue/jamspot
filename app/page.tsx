"use client";

import { useState, useEffect, useMemo } from "react";

import Image from "next/image";
import { Search, MapPin, Ticket, Music2, Calendar, Clock, X } from "lucide-react";

import type { NormalizedConcert } from "@/lib/ticketmaster";

const FALLBACK_IMAGE = "https://picsum.photos/400/250?random=1";

/** Shape the UI renders. Derived from the Ticketmaster API's normalized concert data. */
type CardEvent = {
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
  description?: string;
  ticketUrl: string | null;
};

function formatPriceRange(
  priceRange: NormalizedConcert["priceRange"],
): string | null {
  if (!priceRange) return null;
  const { min, max, currency } = priceRange;
  const symbol = currency === "USD" ? "$" : `${currency} `;
  if (min === max) return `${symbol}${min}`;
  return `${symbol}${min} - ${symbol}${max}`;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "Date TBA";

  return new Intl.DateTimeFormat("en-US", {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function formatTime(time: string | null | undefined): string {
  if (!time) return "Time TBA";

  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(hours,minutes);

  return new Intl.DateTimeFormat("en-US", {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function toCardEvent(concert: NormalizedConcert): CardEvent {
  return {
    id: concert.id,
    artist: concert.artist ?? concert.name,
    venue: concert.venue ?? "Venue TBA",
    city: concert.city ?? "",
    state: concert.state ?? "",
    date: formatDate(concert.date),
    time: formatTime(concert.time),
    genre: concert.genre ?? "Other",
    priceRange: formatPriceRange(concert.priceRange),
    image: concert.imageUrl ?? FALLBACK_IMAGE,
    ticketUrl: concert.ticketUrl,
  };
}

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [location, setLocation] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [hasSearched, setHasSearched] = useState(false);

  const [events, setEvents] = useState<CardEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CardEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch concerts from our Ticketmaster-backed API route whenever a search

  // (keyword and/or location) has been submitted.
  useEffect(() => {
    if (!hasSearched) return;
    if (!search && !location) return;

    const controller = new AbortController();

    const fetchConcerts = async () => {
      setIsLoading(true);
      setFetchError(null);

      const params = new URLSearchParams();
      if (search.length >= 3) {
        params.set("keyword", search);
      }
      if (location) {
        if (/^[a-z]{2}$/i.test(location)) {
          params.set("stateCode", location.toUpperCase());
        } else {
          params.set("city", location);
        }
      }

      try {
        const res = await fetch(`/api/concerts?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to load concerts");
        }
        const concerts = (data.concerts ?? []) as NormalizedConcert[];

        setEvents(concerts.map(toCardEvent));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFetchError(
          err instanceof Error ? err.message : "Failed to load concerts",
        );
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConcerts();

    return () => controller.abort();
  }, [hasSearched, search, location]);

  const initialLimit = 6;
  const itemsPerLoad = 6;

  const [visibleCount, setVisibleCount] = useState(initialLimit);

  // Genres available, derived from the fetched events so the chips only
  // ever show options that actually have results. Ticketmaster searches
  // return a small number of events, so these are cheap to recompute on
  // every render - no need for useMemo here.
  const genres = [
    "All",
    ...new Set(events.map((e) => e.genre).filter(Boolean)),
  ];

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchGenre = activeGenre === "All" || e.genre === activeGenre;
      const q = search.trim().toLowerCase();

      const searchableText = [
        e.artist,
        e.venue,
        e.city,
        e.state,
        e.genre,
      ]
        .join(' ')
        .toLowerCase();

      const matchSearch =
        !q || searchableText.includes(q);
      const loc = location.toLowerCase().trim();
      const matchLocation = !loc || e.city.toLowerCase().includes(loc) || e.state.toLowerCase().includes(loc);
      return matchGenre && matchLocation && matchSearch
    })
  }, [events, search, location, activeGenre])

  const currentYear = new Date().getFullYear();

  const visibleCards = filtered.slice(0, visibleCount);
  const completeCardEvents = visibleCards.filter(
    (event) =>
      event.id &&
      event.artist &&
      event.venue &&
      event.city &&
      event.state &&
      event.date &&
      event.time &&
      event.genre &&
      event.image
  );

  const handleLoadMore = () => {
    setVisibleCount((prevCount) => prevCount + itemsPerLoad);
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const query = searchInput.trim();

      setSearch(query);
      setLocation(locationInput.trim());
      setHasSearched(true);
      setVisibleCount(initialLimit);

      const matchedGenre = genres.find(
        (genre) =>
          genre !== "All" && query.toLowerCase().includes(genre.toLowerCase()),
      );

      setActiveGenre(matchedGenre ?? "All");
    }
  };

  const handleGenreClick = (g: string) => {
    setActiveGenre(g);
    setVisibleCount(initialLimit);
  };

  const handleModalOpen = (event: CardEvent) => {
    setSelectedEvent(event);
  }

  const handleTicketClick = (event: CardEvent) => {
    if (!event.ticketUrl) return;

    window.open(event.ticketUrl, "_blank", "noreferrer");
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center gap-6 h-16">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Music2 size={14} className="text-white" />
            </div>
            <span
              className="text-sm font-bold tracking-widest text-foreground uppercase"
              style={{
                fontFamily: "'Unbounded', sans-serif",
                letterSpacing: "0.12em",
              }}
            >
              JAMSPOT
            </span>
          </div>

          {/* Search bar */}
          <div className="flex flex-1 items-center gap-2 max-w-2xl ml-auto">
            <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border focus-within:border-primary/50 transition-colors">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                name="search"
                placeholder="Artist, venue, event, or genre..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearch}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full truncate"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border focus-within:border-primary/50 transition-colors w-44">
              <MapPin size={15} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                name="location"
                placeholder="City or state"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={handleSearch}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full truncate"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content / Hidden cards by default*/}
      {hasSearched === false ? (
        <section className="relative h-[480px] sm:h-[560px] overflow-hidden">
          <div className="absolute inset-0 bg-[#07070f]">
            <Image
              src="https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Massive Attack"
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-60"
            />
          </div>

          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent" />

          <div className="relative flex h-full items-center justify-center px-6 lg:px-12">
            <h1
              className="leading-none tracking-tight text-white text-4xl lg:text-6xl uppercase"
              style={{ fontFamily: "'Unbounded', sans-serif" }}
            >
              Find your next Jam
            </h1>
          </div>
        </section>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {/* Genre chips */}
          <div className="flex gap-2 flex-wrap mb-8">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreClick(g)}
                className={`text-xs px-4 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${
                  activeGenre === g
                    ? "bg-primary border-primary text-white"
                    : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Results header */}
          <div className="flex items-baseline justify-between mb-6">
            <h2
              className="text-lg font-bold text-foreground"
              style={{
                fontFamily: "'Unbounded', sans-serif",
                fontSize: "1rem",
              }}
            >
              {activeGenre === "All" ? "Upcoming Shows" : activeGenre}
            </h2>
            <span
              className="text-sm text-muted-foreground"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Events grid */}
          {isLoading ? (
            <ul className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <EventCardSkeleton key={index} />
              ))}
            </ul>
          ) : fetchError ? (
            <div className="text-center py-24">
              <Music2
                size={40}
                className="text-muted-foreground mx-auto md-4 opacity-40"
              />
              <p className="text-muted-foreground">{fetchError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <Music2
                size={40}
                className="text-muted-foreground mx-auto md-4 opacity-40"
              />
              <p className="text-muted-foreground">
                No shows found. Try a different search.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              <ul className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completeCardEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onOpen={handleModalOpen}
                    onTicketClick={handleTicketClick}
                  />
                ))}
              </ul>
              {visibleCount < filtered.length && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="text-sm px-6 py-2.5 md:px-8 md:py-3 lg:px-10 rounded-full border bg-muted border-primary/40 text-foreground transition-all font-medium cursor-pointer hover:bg-primary hover:border-primary"
                  >
                    Show more
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/30 flex items-center justify-center">
              <Music2 size={10} className="text-primary" />
            </div>
            <span
              className="text-xs tracking-widest text-muted-foreground uppercase"
              style={{ fontFamily: "'Unbounded', sans-serif" }}
            >
              JAMSPOT
            </span>
          </div>
          <p
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            &copy; {currentYear} · Events are updated daily
          </p>
        </div>
      </footer>

      {/* Modal */}
      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

function EventCard({
  event,
  onOpen,
  onTicketClick,
}: {
  event: CardEvent;
  onOpen: (event: CardEvent) => void;
  onTicketClick: (event: CardEvent) => void;
}) {
  return (
    <li
      onClick={() => onOpen(event)} 
      className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/30 transition-all hover:-translate-y-0.5 duration-200 cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-muted">
        <Image
          src={event.image}
          alt={`${event.artist} live`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover opacity-70 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        {/* Genre badge */}
        <div className="absolute top-3 left-3">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white/80 backdrop-blur-sm"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {event.genre}
          </span>
        </div>

        {/* Date overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <p
              className="text-[10px] text-primary/80 font-medium"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {event.date}
            </p>
            <p
              className="text-xs text-white/60"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {event.time}
            </p>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        <h3
          className="text-base font-black text-foreground leading-tight mb-1 group-hover:text-primary transition-colors"
          style={{
            fontFamily: "'Unbounded', sans-serif",
            fontSize: "0.875rem",
          }}
        >
          {event.artist}
        </h3>
        <p className="text-sm text-muted-forground flex items-center gap-1 mb-4">
          <MapPin size={11} className="shrink-0" />
          {event.venue} · {event.city}, {event.state}
        </p>

        <div className="flex items-center justify-between">
          <span
            className="text-foreground font-semibold text-sm"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {event.priceRange}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTicketClick(event);
            }}
            disabled={!event.ticketUrl}
            className="
                flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 
                text-primary font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer 
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary/10 disabled:hover:border-primary/20"
          >
            <Ticket size={12} />
            {event.ticketUrl ? "Get Tickets" : "Unavailable"}
          </button>
        </div>
      </div>
    </li>
  );
}

function EventCardSkeleton() {
  return (
    <li className="overflow-hidden rounded-xl bg-card border border-border">
      {/* Image skeleton */}
      <div className="h-44 bg-muted animate-pulse" />

      {/* Card body skeleton */}
      <div className="p-4 space-y-4">
        {/* Artist */}
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />

        {/* Venue */}
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          <div className="h-8 w-28 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    </li>
  )
}

interface EventDetailsModalProps {
  event: CardEvent | null;
  onClose: () => void;
}

function EventDetailsModal ({
  event,
  onClose,
} : EventDetailsModalProps) {
  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 cursor-pointer"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        {/* Image */}
        <div className="relative h-56">
          <Image 
            src={event.image}
            alt={event.artist}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

          <div className="absolute bottom-4 left-4">
            <span
              className="rounded bg-black/60 px-2 py-1 text-xs text-white"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {event.genre}
            </span>

            <h2
              className="mt-2 text-2xl font-black text-white"
              style={{ fontFamily: "'Unbounded', sans-serif" }}
            >
              {event.artist}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-primary" />
            <span>{event.date}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-primary" />
            <span>{event.time}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin size={16} className="mt-0.5 text-primary" />
            <span>
              {event.venue}
              <br />
              {event.city}, {event.state}
            </span>
          </div>

          <div className="border-t border-border pt-4">
            <p
              className="text-xs uppercase text-muted-foreground"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Price
            </p>

            <p className="mt-1 font-semibold">{event.priceRange}</p>
          </div>

          {event.description && (
            <div className="border-t border-border pt-4">
              <p
                className="mb-2 text-xs uppercase text-muted-foreground"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                About
              </p>

              <p className="text-sm leading-6 text-muted-foreground">
                {event.description}
              </p>
            </div>
          )}

          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:opacity-90"
            >
              <Ticket size={16} />
              Get Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  )
}