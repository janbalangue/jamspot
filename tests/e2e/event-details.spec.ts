import { test, expect, type Page } from "@playwright/test";
import { buildConcert, mockArtist, mockConcerts } from "../support/mock-api";

async function searchAndOpenFirstCard(page: Page) {
  await page.goto("/");
  await page.getByPlaceholder("City or state").fill("Dallas");
  await page.getByPlaceholder("City or state").press("Enter");
  await page.getByRole("heading", { level: 3 }).first().click();
}

/** The modal's outer card - the only element in the tree with this class pair. */
function modalCard(page: Page) {
  return page.locator(".rounded-2xl.shadow-xl");
}

/**
 * Mirrors app/page.tsx's formatDate so assertions aren't hostage to the
 * app's UTC-midnight date-only parsing shifting the day in negative-UTC
 * timezones - we want to check the modal renders whatever formatDate
 * actually produces, not assume a timezone-independent result.
 */
function expectedDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

test.describe("event details modal", () => {
  test("opens with the concert's date, venue, location and price", async ({ page }) => {
    await mockConcerts(page, [
      buildConcert({
        artist: "Nova Bloom",
        venue: "The Granada",
        city: "Dallas",
        state: "TX",
        date: "2026-09-15",
        time: "19:30:00",
        priceRange: { min: 40, max: 120, currency: "USD" },
      }),
    ]);
    await mockArtist(page, {
      bio: { name: "Nova Bloom", summary: "An up-and-coming indie act." },
      spotify: { id: "1", name: "Nova Bloom", url: "https://open.spotify.com/artist/1" },
      appleMusic: { id: 1, name: "Nova Bloom", url: "https://music.apple.com/artist/1" },
    });

    await searchAndOpenFirstCard(page);

    const modal = modalCard(page);
    await expect(page.getByRole("heading", { name: "Nova Bloom", level: 2 })).toBeVisible();
    await expect(modal).toContainText(expectedDate("2026-09-15"));
    await expect(modal).toContainText("7:30 PM");
    await expect(modal).toContainText("The Granada");
    await expect(modal).toContainText("Dallas, TX");
    await expect(modal).toContainText("$40 - $120");
  });

  test("shows the artist bio once Last.fm resolves", async ({ page }) => {
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom" })]);
    await mockArtist(page, {
      bio: { name: "Nova Bloom", summary: "An up-and-coming indie act." },
    });

    await searchAndOpenFirstCard(page);

    await expect(page.getByText("An up-and-coming indie act.")).toBeVisible();
  });

  test("shows a fallback message when the bio request fails", async ({ page }) => {
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom" })]);
    await mockArtist(page, { bioStatus: 500 });

    await searchAndOpenFirstCard(page);

    await expect(page.getByText("Bio unavailable right now.")).toBeVisible();
  });

  test("shows a fallback message when Last.fm has no bio on file", async ({ page }) => {
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom" })]);
    await mockArtist(page, { bio: null });

    await searchAndOpenFirstCard(page);

    await expect(
      page.getByText("No biography found for this artist."),
    ).toBeVisible();
  });

  test("shows streaming links once Spotify and Apple Music resolve", async ({ page }) => {
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom" })]);
    await mockArtist(page, {
      spotify: { id: "1", name: "Nova Bloom", url: "https://open.spotify.com/artist/1" },
      appleMusic: { id: 1, name: "Nova Bloom", url: "https://music.apple.com/artist/1" },
    });

    await searchAndOpenFirstCard(page);

    const spotifyLink = page.getByRole("link", { name: /Nova Bloom.*Spotify/i });
    await expect(spotifyLink).toHaveAttribute(
      "href",
      "https://open.spotify.com/artist/1",
    );

    const appleMusicLink = page.getByRole("link", { name: /Nova Bloom.*Apple Music/i });
    await expect(appleMusicLink).toHaveAttribute(
      "href",
      "https://music.apple.com/artist/1",
    );
  });

  test("shows an unavailable state when a provider has no match", async ({ page }) => {
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom" })]);
    await mockArtist(page, { spotify: null, appleMusic: null });

    await searchAndOpenFirstCard(page);

    await expect(page.getByText("Spotify unavailable")).toBeVisible();
    await expect(page.getByText("Apple Music unavailable")).toBeVisible();
  });

  test("the modal's ticket link points at the ticket URL", async ({ page }) => {
    const ticketUrl = "https://www.ticketmaster.com/event/modal-test";
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom", ticketUrl })]);
    await mockArtist(page);

    await searchAndOpenFirstCard(page);

    const link = page.getByRole("link", { name: "Get Tickets" });
    await expect(link).toHaveAttribute("href", ticketUrl);
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("closes via the close button", async ({ page }) => {
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom" })]);
    await mockArtist(page);

    await searchAndOpenFirstCard(page);
    await expect(page.getByRole("heading", { name: "Nova Bloom", level: 2 })).toBeVisible();

    await modalCard(page).getByRole("button").first().click();

    await expect(page.getByRole("heading", { name: "Nova Bloom", level: 2 })).toHaveCount(0);
  });

  test("closes via clicking the backdrop", async ({ page }) => {
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom" })]);
    await mockArtist(page);

    await searchAndOpenFirstCard(page);
    await expect(page.getByRole("heading", { name: "Nova Bloom", level: 2 })).toBeVisible();

    // Click near the top-left corner of the viewport, outside the modal card.
    await page.mouse.click(5, 5);

    await expect(page.getByRole("heading", { name: "Nova Bloom", level: 2 })).toHaveCount(0);
  });
});

test.describe("getting tickets from the results grid", () => {
  test("opens the ticket URL in a new tab", async ({ page, context }) => {
    const ticketUrl = "https://www.ticketmaster.com/event/card-test";
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom", ticketUrl })]);
    await page.route(ticketUrl, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>ok</body></html>",
      }),
    );

    await page.goto("/");
    await page.getByPlaceholder("City or state").fill("Dallas");
    await page.getByPlaceholder("City or state").press("Enter");

    const popupPromise = context.waitForEvent("page");
    await page.getByRole("button", { name: "Get Tickets" }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();

    expect(popup.url()).toBe(ticketUrl);
    await popup.close();
  });

  test("shows an unavailable, disabled ticket button when there is no ticket URL", async ({ page }) => {
    await mockConcerts(page, [buildConcert({ artist: "Nova Bloom", ticketUrl: null })]);

    await page.goto("/");
    await page.getByPlaceholder("City or state").fill("Dallas");
    await page.getByPlaceholder("City or state").press("Enter");

    const button = page.getByRole("button", { name: "Unavailable" });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  });
});
