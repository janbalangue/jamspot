'use client'

import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Ticket, Music2 } from "lucide-react";

const GENRES = ['All', 'Electronic', 'Rock', 'Hip-Hop', 'Rap', 'Jazz', 'Indie', 'Pop', 'Classical', 'Metal'];

const EVENTS = [
  {
    id: 'vvG1YZ_ukBu12Y',
    artist: 'Rod Wave',
    venue: 'American Airlines Center',
    city: 'Dallas',
    state: 'TX',
    date: '2026-09-26',
    time: '20:00:00',
    genre: 'Hip-Hop/Rap',
    priceRange: '$20',
    image: 'https://s1.ticketm.net/dam/a/f72/4c583e8a-6739-4fb2-9861-e73978841f72_SOURCE',
    ticketUrl: 'https://www.ticketmaster.com/rod-wave-dont-look-down-tour-dallas-texas-09-26-2026/event/0c0064D1BA34A3F0',
  },
  {
    id: 'vvG1YZ_GRP5q61',
    artist: 'Don Toliver',
    venue: 'American Airlines Center',
    city: 'Dallas',
    state: 'TX',
    date: '2026-08-13',
    time: '19:30:00',
    genre: 'Hip-Hop/Rap',
    priceRange: null,
    image: 'https://s1.ticketm.net/dam/a/4d1/d0bc76d6-02e3-4e46-96fc-658377e464d1_TABLET_LANDSCAPE_LARGE_16_9.jpg',
    ticketUrl: 'https://www.ticketmaster.com/don-toliver-nitrous-octane-world-tour-dallas-texas-08-13-2026/event/0C0064CBE52DD1CA',
  },
  {
    id: 'vvG1YZ_vsJZ9l5',
    artist: 'Imagine Dragons',
    venue: 'MGM Grand Garden Arena',
    city: 'Las Vegas',
    state: 'NV',
    date: '2026-07--28',
    time: '19:30:00',
    genre: 'Rock',
    priceRange: '$65 - $225',
    image: 'https://picsum.photos/400/250?random=4',
    ticketUrl: null,
  },
  {
    id: 'vvG1YZ_GT1n9j7',
    artist: 'Billie Eilish',
    venue: 'Kia Forum',
    city: 'Inglewood',
    state: 'CA',
    date: '2026-11-18',
    time: '20:00:00',
    genre: 'Pop',
    priceRange: '$99 - $450',
    image: 'https://picsum.photos/400/250?random=5',
    ticketUrl: null,
  },
  {
    id: 'vvG1YZ_ukBu1y3',
    artist: 'Rod Wave',
    venue: 'American Airlines Center',
    city: 'Dallas',
    state: 'TX',
    date: '2026-09-26',
    time: '20:00:00',
    genre: 'Hip-Hop/Rap',
    priceRange: '$20',
    image: 'https://s1.ticketm.net/dam/a/f72/4c583e8a-6739-4fb2-9861-e73978841f72_SOURCE',
    ticketUrl: 'https://www.ticketmaster.com/rod-wave-dont-look-down-tour-dallas-texas-09-26-2026/event/0c0064D1BA34A3F0',
  },
  {
    id: 'vvG1YZ_GRP5q75',
    artist: 'Don Toliver',
    venue: 'American Airlines Center',
    city: 'Dallas',
    state: 'TX',
    date: '2026-08-13',
    time: '19:30:00',
    genre: 'Hip-Hop/Rap',
    priceRange: null,
    image: 'https://s1.ticketm.net/dam/a/4d1/d0bc76d6-02e3-4e46-96fc-658377e464d1_TABLET_LANDSCAPE_LARGE_16_9.jpg',
    ticketUrl: 'https://www.ticketmaster.com/don-toliver-nitrous-octane-world-tour-dallas-texas-08-13-2026/event/0C0064CBE52DD1CA',
  },
  {
    id: 'vvG1YZ_vsJZ9T1',
    artist: 'Imagine Dragons',
    venue: 'MGM Grand Garden Arena',
    city: 'Las Vegas',
    state: 'NV',
    date: '2026-07--28',
    time: '19:30:00',
    genre: 'Rock',
    priceRange: '$65 - $225',
    image: 'https://picsum.photos/400/250?random=4',
    ticketUrl: null,
  },
  {
    id: 'vvG1YZ_GT1n9J0',
    artist: 'Billie Eilish',
    venue: 'Kia Forum',
    city: 'Inglewood',
    state: 'CA',
    date: '2026-11-18',
    time: '20:00:00',
    genre: 'Pop',
    priceRange: '$99 - $450',
    image: 'https://picsum.photos/400/250?random=5',
    ticketUrl: null,
  },
]

export default function Home() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [location, setLocation] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [isDesktop, setIsDesktop] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // Large breakpoint media query to determing card load size
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const update = () => setIsDesktop(mediaQuery.matches);

    update();

    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, [])

  const initialLimit = isDesktop ? 6 : 4;
  const itemsPerLoad = isDesktop ? 3 : 2;

  const [visibleCount, setVisibleCount] = useState(initialLimit);

  const filtered = useMemo(() => {
    return EVENTS.filter((e) => {
      const matchGenre = activeGenre === 'All' || e.genre === activeGenre;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.artist.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.state.toLowerCase().includes(q) ||
        e.genre.toLowerCase().includes(q);
      const loc = location.toLowerCase();
      const matchLocation = !loc || e.city.toLowerCase().includes(loc) || e.state.toLowerCase().includes(loc);
      return matchGenre && matchSearch && matchLocation;
    });
  }, [initialLimit, search, location, activeGenre]);

  const currentYear = new Date().getFullYear();

  const visibleCards = filtered.slice(0, visibleCount);

  // Resets initial ammount when search, location, or genre changes
  useEffect(() => {
    setVisibleCount(initialLimit);
  }, [initialLimit, search, location, activeGenre]);

  const handleLoadMore = () => {
    setVisibleCount((prevCount) => prevCount + itemsPerLoad);
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {

     const query = searchInput.trim();

      setSearch(query);
      setLocation(locationInput.trim());
      setHasSearched(true);
    
     const matchedGenre = GENRES.find(
        (genre) => query.toLowerCase().includes(genre.toLowerCase())
     );

      setActiveGenre(matchedGenre ?? 'All');
    }
  }

  const handleTicketClick = (event: (typeof EVENTS)[0]) => {
    if (!event.ticketUrl) return;

    window.open(event.ticketUrl, '_blank', 'noreferrer');
  }
 
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
              style={{ fontFamily: "'Unbounded', sans-serif", letterSpacing: "0.12em" }}
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
                placeholder="City or country"
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
            <img 
              src="https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Massive Attack"
              className="w-full h-full object-cover opacity-60"
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
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
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
              style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '1rem' }}
            >
              {activeGenre === 'All' ? 'Upcoming Shows' : activeGenre}
            </h2>
            <span className="text-sm text-muted-foreground"
              style={{ fontFamily: "'DM Mono', monospace" }}>
                {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Events grid */}
          {filtered.length === 0 ? (
           <div className="text-center py-24">
              <Music2 size={40} className="text-muted-foreground mx-auto md-4 opacity-40" />
              <p className="text-muted-foreground">No shows found. Try a different search.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <ul className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {visibleCards.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
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
          <p className="text-xs text-muted-foreground"
            style={{ fontFamily: "'DM Mono', monospace" }}>
            &copy; {currentYear} · Events are updated daily
          </p>
        </div>
      </footer>
    </div>
  );
}

function EventCard({ 
  event,
  onTicketClick,
 }: { 
  event: (typeof EVENTS)[0];
  onTicketClick: (event: (typeof EVENTS)[0]) => void; 
}) {
  return (
  <li className="group  relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/30 transition-all hover:-translate-y-0.5 duration-200">
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-muted">
        <img 
          src={event.image} 
          alt={`${event.artist} live`}
          className="w-full h-full object-cover opacity-70 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500"
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
            style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "0.875rem" }}
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
              onClick={() => onTicketClick(event)}
              disabled={!event.ticketUrl} 
              className="
                flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 
                text-primary font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer 
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary/10 disabled:hover:border-primary/20">
              <Ticket size={12} />
              {event.ticketUrl ? 'Get Tickets' : 'Unavailable'}
            </button>
          </div>
         </div>
    </li>
  )
}