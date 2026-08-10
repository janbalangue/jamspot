import { test, expect } from "@playwright/test";
import {
  buildConcert,
  mockConcerts,
  mockConcertsError,
} from "../support/mock-api";

test.describe("landing state", () => {
  test("shows the hero before any search is submitted", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Find your next Jam" }),
    ).toBeVisible();
    await expect(page.getByText(/events?$/i)).toHaveCount(0);
  });
});

test.describe("searching for concerts", () => {
  test("searching by keyword renders matching concerts", async ({ page }) => {
    // The API is mocked to return both, but the search text also drives a
    // client-side filter (see `matchSearch` in app/page.tsx) - so only the
    // concert whose fields actually contain the query text should render.
    await mockConcerts(page, [
      buildConcert({ id: "1", artist: "Nova Bloom", genre: "Rock" }),
      buildConcert({ id: "2", artist: "Silver Echo", genre: "Jazz" }),
    ]);

    await page.goto("/");
    await page.getByPlaceholder("Artist, venue, event, or genre...").fill("Bloom");
    await page.getByPlaceholder("Artist, venue, event, or genre...").press("Enter");

    await expect(page.getByRole("heading", { name: "Nova Bloom" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Silver Echo" })).toHaveCount(0);
    await expect(page.getByText("1 event")).toBeVisible();
  });

  test("sends a stateCode param for a two-letter location", async ({ page }) => {
    await mockConcerts(page, [buildConcert()]);
    await page.goto("/");

    const request = page.waitForRequest((req) =>
      req.url().includes("/api/concerts") && req.url().includes("stateCode=TX"),
    );
    await page.getByPlaceholder("City or state").fill("TX");
    await page.getByPlaceholder("City or state").press("Enter");

    await request;
  });

  test("sends a city param for a full location name", async ({ page }) => {
    await mockConcerts(page, [buildConcert()]);
    await page.goto("/");

    const request = page.waitForRequest((req) =>
      req.url().includes("/api/concerts") && req.url().includes("city=Dallas"),
    );
    await page.getByPlaceholder("City or state").fill("Dallas");
    await page.getByPlaceholder("City or state").press("Enter");

    await request;
  });

  test("shows an empty state when no concerts match", async ({ page }) => {
    await mockConcerts(page, []);
    await page.goto("/");

    await page.getByPlaceholder("City or state").fill("Nowhere");
    await page.getByPlaceholder("City or state").press("Enter");

    await expect(
      page.getByText("No shows found. Try a different search."),
    ).toBeVisible();
  });

  test("shows an error state when the concerts request fails", async ({ page }) => {
    await mockConcertsError(page, "Ticketmaster is unavailable", 502);
    await page.goto("/");

    await page.getByPlaceholder("City or state").fill("Dallas");
    await page.getByPlaceholder("City or state").press("Enter");

    await expect(page.getByText("Ticketmaster is unavailable")).toBeVisible();
  });
});

test.describe("filtering and paging results", () => {
  test("genre chips filter results client-side", async ({ page }) => {
    await mockConcerts(page, [
      buildConcert({ id: "1", artist: "Cobalt Sky", genre: "Rock" }),
      buildConcert({ id: "2", artist: "Midnight Reed", genre: "Jazz" }),
    ]);

    await page.goto("/");
    await page.getByPlaceholder("City or state").fill("Dallas");
    await page.getByPlaceholder("City or state").press("Enter");

    await expect(page.getByRole("heading", { name: "Cobalt Sky" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Midnight Reed" })).toBeVisible();

    await page.getByRole("button", { name: "Jazz", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Midnight Reed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cobalt Sky" })).toHaveCount(0);
    await expect(page.getByText("1 event")).toBeVisible();

    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Cobalt Sky" })).toBeVisible();
  });

  test("show more reveals additional results", async ({ page }) => {
    const concerts = Array.from({ length: 9 }, (_, i) =>
      buildConcert({ id: `${i + 1}`, artist: `Artist ${i + 1}` }),
    );
    await mockConcerts(page, concerts);

    await page.goto("/");
    await page.getByPlaceholder("City or state").fill("Dallas");
    await page.getByPlaceholder("City or state").press("Enter");

    await expect(page.getByText("9 events")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(6);

    await page.getByRole("button", { name: /Show more/i }).click();

    await expect(page.getByRole("listitem")).toHaveCount(9);
    await expect(page.getByRole("button", { name: /Show more/i })).toHaveCount(0);
  });
});
