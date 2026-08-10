import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Home, {
  EventCard,
  EventCardSkeleton,
  EventDetailsModal,
  fetchArtistData as fetchPageArtistData,
  filterCardEvents,
  formatDate,
  formatPriceRange,
  formatTime,
  loadArtistData,
  toCardEvent,
  type CardEvent,
} from "../../app/page";
import ConcertModal, {
  errorState,
  fetchArtistData as fetchModalArtistData,
  initialFetchState,
  type ConcertModalEvent,
} from "../../components/ConcertModal";
import StreamingServiceLinks from "../../components/StreamingServiceLinks";

const baseEvent: CardEvent = {
  id: "event-1",
  artist: "Nova Bloom",
  venue: "The Granada",
  city: "Dallas",
  state: "TX",
  date: "Sep 15, 2026",
  time: "7:30 PM",
  genre: "Rock",
  priceRange: "$40 - $120",
  image: "https://example.com/nova.jpg",
  ticketUrl: "https://tickets.example.com/nova",
};

const modalEvent: ConcertModalEvent = {
  ...baseEvent,
  subGenre: "Indie Rock",
};

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

test("formats concert display values and fallbacks", () => {
  assert.equal(formatPriceRange(null), null);
  assert.equal(
    formatPriceRange({ min: 40, max: 120, currency: "USD" }),
    "$40 - $120",
  );
  assert.equal(formatPriceRange({ min: 50, max: 50, currency: "USD" }), "$50");
  assert.equal(
    formatPriceRange({ min: 30, max: 80, currency: "EUR" }),
    "EUR 30 - EUR 80",
  );
  assert.equal(formatDate(null), "Date TBA");
  assert.equal(formatDate("2026-09-15T12:00:00Z"), "Sep 15, 2026");
  assert.equal(formatTime(null), "Time TBA");
  assert.equal(formatTime("19:30:00"), "7:30 PM");
});

test("normalizes Ticketmaster concerts for the card UI", () => {
  const card = toCardEvent({
    id: "fallback-event",
    name: "Fallback Artist",
    artist: null,
    venue: null,
    city: null,
    state: null,
    date: null,
    time: null,
    imageUrl: null,
    ticketUrl: null,
    genre: null,
    subGenre: null,
    priceRange: null,
  });

  assert.equal(card.artist, "Fallback Artist");
  assert.equal(card.venue, "Venue TBA");
  assert.equal(card.city, "");
  assert.equal(card.state, "");
  assert.equal(card.date, "Date TBA");
  assert.equal(card.time, "Time TBA");
  assert.equal(card.genre, "Other");
  assert.equal(card.priceRange, null);
  assert.match(card.image, /^https:\/\/picsum\.photos\//);
});

test("filters cards by text, location, and genre", () => {
  const events: CardEvent[] = [
    baseEvent,
    {
      ...baseEvent,
      id: "event-2",
      artist: "Silver Static",
      venue: "Mohawk",
      city: "Austin",
      genre: "Electronic",
    },
  ];

  assert.deepEqual(filterCardEvents(events, "", "", "All"), events);
  assert.deepEqual(filterCardEvents(events, "nova", "", "All"), [events[0]]);
  assert.deepEqual(filterCardEvents(events, "mohawk", "", "All"), [events[1]]);
  assert.deepEqual(filterCardEvents(events, "", "tx", "All"), events);
  assert.deepEqual(filterCardEvents(events, "", "Austin", "All"), [events[1]]);
  assert.deepEqual(filterCardEvents(events, "", "", "Rock"), [events[0]]);
  assert.deepEqual(filterCardEvents(events, "nova", "Austin", "Rock"), []);
});

test("renders the initial home UI", () => {
  const html = render(React.createElement(Home));

  assert.match(html, /Find your next Jam/);
  assert.match(html, /Artist, venue, event, or genre/);
  assert.match(html, /City or state/);
  assert.match(html, /Events are updated daily/);
  assert.match(html, /Massive Attack/);
});

test("renders event cards, disabled ticket states, and skeletons", () => {
  const active = render(
    React.createElement(EventCard, {
      event: baseEvent,
      onOpen: () => undefined,
      onTicketClick: () => undefined,
    }),
  );
  assert.match(active, /Nova Bloom/);
  assert.match(active, /The Granada/);
  assert.match(active, /Get Tickets/);
  assert.doesNotMatch(active, /disabled=""/);

  const unavailable = render(
    React.createElement(EventCard, {
      event: { ...baseEvent, ticketUrl: null, priceRange: null },
      onOpen: () => undefined,
      onTicketClick: () => undefined,
    }),
  );
  assert.match(unavailable, /Unavailable/);
  assert.match(unavailable, /disabled=""/);

  const skeleton = render(React.createElement(EventCardSkeleton));
  assert.match(skeleton, /animate-pulse/);
});

test("renders streaming link loading, unavailable, and linked states", () => {
  const loading = render(
    React.createElement(StreamingServiceLinks, {
      artistName: "Nova Bloom",
      spotify: { isLoading: true, url: null },
      appleMusic: { isLoading: true, url: null },
    }),
  );
  assert.match(loading, /Loading Apple Music link/);
  assert.match(loading, /Loading Spotify link/);

  const unavailable = render(
    React.createElement(StreamingServiceLinks, {
      artistName: "Nova Bloom",
      spotify: { isLoading: false, url: null },
      appleMusic: { isLoading: false, url: null },
    }),
  );
  assert.match(unavailable, /Apple Music unavailable/);
  assert.match(unavailable, /Spotify unavailable/);

  const linked = render(
    React.createElement(StreamingServiceLinks, {
      artistName: "Nova Bloom",
      spotify: { isLoading: false, url: "https://open.spotify.com/artist/1" },
      appleMusic: { isLoading: false, url: "https://music.apple.com/artist/1" },
    }),
  );
  assert.match(linked, /href="https:\/\/open\.spotify\.com\/artist\/1"/);
  assert.match(linked, /href="https:\/\/music\.apple\.com\/artist\/1"/);
  assert.match(linked, /Listen to Nova Bloom on Spotify/);
  assert.match(linked, /Listen to Nova Bloom on Apple Music/);
  assert.match(linked, /noopener noreferrer/);
});

test("renders the page modal with loading data and ticket states", () => {
  const withTicket = render(
    React.createElement(EventDetailsModal, {
      event: baseEvent,
      onClose: () => undefined,
    }),
  );
  assert.match(withTicket, /Nova Bloom/);
  assert.match(withTicket, /The Granada/);
  assert.match(withTicket, /Loading Apple Music link/);
  assert.match(withTicket, /Loading Spotify link/);
  assert.match(withTicket, /Close concert details/);
  assert.match(withTicket, /href="https:\/\/tickets\.example\.com\/nova"/);

  const withoutTicket = render(
    React.createElement(EventDetailsModal, {
      event: { ...baseEvent, ticketUrl: null },
      onClose: () => undefined,
    }),
  );
  assert.doesNotMatch(withoutTicket, /href="https:\/\/tickets\.example\.com\/nova"/);
});

test("renders the standalone modal null and loading states", () => {
  assert.equal(
    render(React.createElement(ConcertModal, { event: null, onClose: () => undefined })),
    "",
  );

  const html = render(
    React.createElement(ConcertModal, {
      event: modalEvent,
      onClose: () => undefined,
    }),
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /Nova Bloom concert details/);
  assert.match(html, /Loading bio/);
  assert.match(html, /Loading Apple Music link/);
  assert.match(html, /Loading Spotify link/);
  assert.match(html, /Get Tickets/);
});

test("fetchArtistData returns JSON and propagates API errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => jsonResponse({ artist: { name: "Nova Bloom" } });
  await assert.doesNotReject(async () => {
    const data = await fetchPageArtistData<{ artist: { name: string } }>(
      "/api/artist",
      new AbortController().signal,
    );
    assert.equal(data.artist.name, "Nova Bloom");
  });

  globalThis.fetch = async () => jsonResponse({ error: "Provider unavailable" }, false);
  await assert.rejects(
    fetchPageArtistData("/api/artist", new AbortController().signal),
    /Provider unavailable/,
  );

  globalThis.fetch = async () => jsonResponse({}, false);
  await assert.rejects(
    fetchModalArtistData("/api/artist", new AbortController().signal),
    /Request failed/,
  );

  globalThis.fetch = originalFetch;
});

test("loadArtistData records success, errors, fallback errors, and aborts", async () => {
  const originalFetch = globalThis.fetch;
  const states: Array<{ data: string | null; isLoading: boolean; error: string | null }> = [];

  globalThis.fetch = async () => jsonResponse({ value: "ready" });
  loadArtistData<{ value: string }, string>(
    "/success",
    new AbortController().signal,
    (response) => response.value,
    (state) => states.push(state),
    "fallback",
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(states.pop(), { data: "ready", isLoading: false, error: null });

  globalThis.fetch = async () => jsonResponse({ error: "broken" }, false);
  loadArtistData<{ value: string }, string>(
    "/failure",
    new AbortController().signal,
    (response) => response.value,
    (state) => states.push(state),
    "fallback",
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(states.pop(), { data: null, isLoading: false, error: "broken" });

  globalThis.fetch = async () => {
    throw "not-an-error";
  };
  loadArtistData<{ value: string }, string>(
    "/fallback",
    new AbortController().signal,
    (response) => response.value,
    (state) => states.push(state),
    "fallback",
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(states.pop(), { data: null, isLoading: false, error: "fallback" });

  const abort = new DOMException("aborted", "AbortError");
  globalThis.fetch = async () => {
    throw abort;
  };
  const beforeAbort = states.length;
  loadArtistData<{ value: string }, string>(
    "/abort",
    new AbortController().signal,
    (response) => response.value,
    (state) => states.push(state),
    "fallback",
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(states.length, beforeAbort);

  globalThis.fetch = originalFetch;
});

test("standalone modal state helpers distinguish errors and aborts", () => {
  assert.deepEqual(initialFetchState<string>(), {
    data: null,
    isLoading: true,
    error: null,
  });
  assert.deepEqual(errorState<string>(new Error("failed")), {
    data: null,
    isLoading: false,
    error: "failed",
  });
  assert.deepEqual(errorState<string>("unknown"), {
    data: null,
    isLoading: false,
    error: "Failed to load",
  });
  assert.deepEqual(errorState<string>(new DOMException("aborted", "AbortError")), {
    data: null,
    isLoading: false,
    error: null,
  });
});
