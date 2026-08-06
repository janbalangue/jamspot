const assert = require("node:assert/strict");
const test = require("node:test");
const React = require("react");

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body };
}

function installHookHarness(values) {
  const originals = {
    useEffect: React.useEffect,
    useMemo: React.useMemo,
    useState: React.useState,
  };
  const setterCalls = [];
  const cleanups = [];
  let stateIndex = 0;

  React.useState = (initialValue) => {
    const index = stateIndex++;
    const value =
      index < values.length
        ? values[index]
        : typeof initialValue === "function"
          ? initialValue()
          : initialValue;
    setterCalls[index] = [];
    return [
      value,
      (nextValue) => {
        setterCalls[index].push(nextValue);
      },
    ];
  };
  React.useMemo = (factory) => factory();
  React.useEffect = (effect) => {
    const cleanup = effect();
    if (typeof cleanup === "function") cleanups.push(cleanup);
  };

  return {
    cleanups,
    setterCalls,
    restore() {
      React.useEffect = originals.useEffect;
      React.useMemo = originals.useMemo;
      React.useState = originals.useState;
    },
  };
}

function findElements(node, predicate, matches = []) {
  if (Array.isArray(node)) {
    for (const child of node) findElements(child, predicate, matches);
    return matches;
  }
  if (!React.isValidElement(node)) return matches;
  if (predicate(node)) matches.push(node);
  findElements(node.props.children, predicate, matches);
  return matches;
}

const baseEvent = {
  id: "event-1",
  artist: "Nova Bloom",
  venue: "The Granada",
  city: "Dallas",
  state: "TX",
  date: "Sep 15, 2026",
  time: "7:30 PM",
  genre: "Rock",
  priceRange: "$40 - $120",
  image: "https://picsum.photos/400/250?random=1",
  ticketUrl: "https://tickets.example.com/nova",
};

function homeState(overrides = {}) {
  return [
    overrides.searchInput ?? "",
    overrides.search ?? "",
    overrides.locationInput ?? "",
    overrides.location ?? "",
    overrides.activeGenre ?? "All",
    overrides.hasSearched ?? false,
    overrides.isLoadingMore ?? false,
    overrides.events ?? [],
    overrides.selectedEvent ?? null,
    overrides.isLoading ?? false,
    overrides.fetchError ?? null,
    overrides.visibleCount ?? 6,
  ];
}

test("Home handlers update search state, filters, cards, tickets, and pagination", async () => {
  const originalFormData = global.FormData;
  const originalSetTimeout = global.setTimeout;
  const originalWindow = global.window;
  const originalFetch = global.fetch;
  const opened = [];

  global.window = {
    open: (...args) => opened.push(args),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  global.setTimeout = (callback) => {
    callback();
    return 1;
  };
  global.FormData = class FormDataStub {
    get(name) {
      return name === "search" ? "  rock  " : "  Dallas  ";
    }
  };
  global.fetch = async () =>
    jsonResponse({
      concerts: [
        {
          id: "api-event",
          name: "API Event",
          artist: "API Artist",
          venue: "API Venue",
          city: "Dallas",
          state: "TX",
          date: "2026-09-15T12:00:00Z",
          time: "19:30:00",
          imageUrl: null,
          ticketUrl: null,
          genre: "Rock",
          subGenre: null,
          priceRange: null,
        },
      ],
    });

  const events = Array.from({ length: 7 }, (_, index) => ({
    ...baseEvent,
    id: `event-${index}`,
    artist: `Nova Bloom ${index}`,
  }));
  const hooks = installHookHarness(
    homeState({
      search: "rock",
      location: "tx",
      hasSearched: true,
      events,
    }),
  );

  try {
    const page = require("../../.ui-test-build/app/page.js");
    const tree = page.default();

    const searchInput = findElements(
      tree,
      (element) => element.props.placeholder === "Artist, venue, event, or genre...",
    )[0];
    const locationInput = findElements(
      tree,
      (element) => element.props.placeholder === "City or state",
    )[0];
    searchInput.props.onChange({ target: { value: "jazz" } });
    locationInput.props.onChange({ target: { value: "Austin" } });
    assert.equal(hooks.setterCalls[0].at(-1), "jazz");
    assert.equal(hooks.setterCalls[2].at(-1), "Austin");

    let prevented = 0;
    let submitted = 0;
    searchInput.props.onKeyDown({
      key: "Tab",
      preventDefault: () => prevented++,
      currentTarget: { form: { requestSubmit: () => submitted++ } },
    });
    searchInput.props.onKeyDown({
      key: "Enter",
      preventDefault: () => prevented++,
      currentTarget: { form: { requestSubmit: () => submitted++ } },
    });
    assert.equal(prevented, 1);
    assert.equal(submitted, 1);

    const form = findElements(tree, (element) => element.type === "form")[0];
    form.props.onSubmit({ preventDefault: () => prevented++, currentTarget: {} });
    assert.equal(hooks.setterCalls[1].at(-1), "rock");
    assert.equal(hooks.setterCalls[3].at(-1), "Dallas");
    assert.equal(hooks.setterCalls[5].at(-1), true);
    assert.equal(hooks.setterCalls[4].at(-1), "Rock");

    const rockButton = findElements(
      tree,
      (element) => element.type === "button" && element.props.children === "Rock",
    )[0];
    rockButton.props.onClick();
    assert.equal(hooks.setterCalls[4].at(-1), "Rock");
    assert.equal(hooks.setterCalls[11].at(-1), 6);

    const showMore = findElements(
      tree,
      (element) => element.type === "button" && element.props.children === "Show more",
    )[0];
    showMore.props.onClick();
    assert.equal(hooks.setterCalls[6][0], true);
    assert.equal(hooks.setterCalls[11].at(-1)(6), 12);
    assert.equal(hooks.setterCalls[6].at(-1), false);

    const eventCardElement = findElements(
      tree,
      (element) => element.type === page.EventCard,
    )[0];
    eventCardElement.props.onOpen(baseEvent);
    assert.deepEqual(hooks.setterCalls[8].at(-1), baseEvent);
    eventCardElement.props.onTicketClick(baseEvent);
    eventCardElement.props.onTicketClick({ ...baseEvent, ticketUrl: null });
    assert.deepEqual(opened, [
      ["https://tickets.example.com/nova", "_blank", "noreferrer"],
    ]);

    await flushPromises();
    assert.equal(hooks.setterCalls[9][0], true);
    assert.equal(hooks.setterCalls[10][0], null);
    assert.equal(hooks.setterCalls[7].at(-1)[0].artist, "API Artist");
    assert.equal(hooks.setterCalls[9].at(-1), false);
    assert.equal(hooks.cleanups.length, 1);
    hooks.cleanups[0]();
  } finally {
    hooks.restore();
    global.FormData = originalFormData;
    global.setTimeout = originalSetTimeout;
    global.window = originalWindow;
    global.fetch = originalFetch;
  }
});

test("Home concert loading handles city queries, API failures, and aborts", async () => {
  const originalFetch = global.fetch;
  const requestedUrls = [];

  global.fetch = async (url) => {
    requestedUrls.push(String(url));
    return jsonResponse({ error: "Concert service unavailable" }, false);
  };
  const failureHooks = installHookHarness(
    homeState({ search: "nova", location: "Dallas", hasSearched: true }),
  );
  try {
    const page = require("../../.ui-test-build/app/page.js");
    page.default();
    await flushPromises();
    assert.match(requestedUrls[0], /keyword=nova/);
    assert.match(requestedUrls[0], /city=Dallas/);
    assert.equal(failureHooks.setterCalls[10].at(-1), "Concert service unavailable");
    assert.deepEqual(failureHooks.setterCalls[7].at(-1), []);
  } finally {
    failureHooks.restore();
  }

  global.fetch = async () => {
    throw new DOMException("aborted", "AbortError");
  };
  const abortHooks = installHookHarness(
    homeState({ search: "nova", location: "Dallas", hasSearched: true }),
  );
  try {
    const page = require("../../.ui-test-build/app/page.js");
    page.default();
    await flushPromises();
    assert.equal(abortHooks.setterCalls[10].length, 1);
    assert.equal(abortHooks.setterCalls[10][0], null);
    assert.equal(abortHooks.setterCalls[9].at(-1), false);
  } finally {
    abortHooks.restore();
    global.fetch = originalFetch;
  }
});

test("EventCard and modal callback functions execute without a browser DOM", async () => {
  const originalFetch = global.fetch;
  const originalWindow = global.window;
  const listeners = new Map();
  let closeCount = 0;

  global.window = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
    open: () => undefined,
  };
  global.fetch = async (url) => {
    const value = String(url);
    if (value.includes("lastfm")) {
      return jsonResponse({ bio: { name: "Nova Bloom", summary: "A bio" } });
    }
    if (value.includes("spotify")) {
      return jsonResponse({
        artist: {
          id: "spotify-1",
          name: "Nova Bloom",
          url: "https://open.spotify.com/artist/1",
          imageUrl: null,
          genres: ["rock"],
          followers: 1,
          popularity: 1,
        },
      });
    }
    return jsonResponse({
      artist: {
        id: 1,
        name: "Nova Bloom",
        url: "https://music.apple.com/artist/1",
        primaryGenre: "Rock",
      },
    });
  };

  const hooks = installHookHarness([]);
  try {
    const page = require("../../.ui-test-build/app/page.js");
    const card = page.EventCard({
      event: baseEvent,
      onOpen: () => closeCount++,
      onTicketClick: () => closeCount++,
    });
    card.props.onClick();
    const cardButtons = findElements(card, (element) => element.type === "button");
    cardButtons[0].props.onClick({ stopPropagation: () => closeCount++ });
    assert.equal(closeCount, 3);

    const modal = page.EventDetailsModal({
      event: baseEvent,
      onClose: () => closeCount++,
    });
    const modalContainers = findElements(
      modal,
      (element) => element.props.className?.includes("cursor-pointer"),
    );
    modalContainers[0].props.onClick();
    modalContainers[1].props.onClick({ stopPropagation: () => closeCount++ });
    const closeButton = findElements(
      modal,
      (element) => element.props["aria-label"] === "Close concert details",
    )[0];
    closeButton.props.onClick();
    await flushPromises();

    const standalone = require("../../.ui-test-build/components/ConcertModal.js");
    const standaloneElement = standalone.default({
      event: { ...baseEvent, subGenre: "Indie Rock" },
      onClose: () => closeCount++,
    });
    assert.ok(standaloneElement);
    listeners.get("keydown")({ key: "Tab" });
    listeners.get("keydown")({ key: "Escape" });
    await flushPromises();
    assert.ok(closeCount >= 6);
    for (const cleanup of hooks.cleanups) cleanup();
  } finally {
    hooks.restore();
    global.fetch = originalFetch;
    global.window = originalWindow;
  }
});
