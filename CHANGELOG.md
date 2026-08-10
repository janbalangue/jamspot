# Changelog

All notable changes to JamSpot are documented in this file.

## [Unreleased]

### Added

- Caching for external API search results (Ticketmaster, Last.fm, Spotify, Apple Music) via Next.js's built-in fetch/Data Cache, with a configurable default TTL (24h for artist data, 5min for Ticketmaster listings). No external database - `next: { revalidate }` is set on every provider fetch, and search values are normalized (trimmed + lowercased) before building the request so equivalent searches share one cache entry. (TEA-30)

## [0.1.0] - 2026-08-05

### Added

- UI unit tests for concert formatting, filtering, cards, modal states, streaming links, search handlers, pagination, and data-loading failures.
- Native V8 coverage reporting with enforced 70% line, branch, and function thresholds.
- Text and HTML coverage report generation through `npm run test:ui:coverage`.
- UI test and coverage gates for both subprod and production-preview GitHub Actions workflows.
- Coverage report artifacts retained for 14 days on every deployment workflow run.

### Changed

- Extracted the concert filtering logic into an exported function so it can be tested directly.
- Added an accessible label and explicit button type to the concert-details close control.
- Subprod and production-preview deployments now run only after the UI test job passes.
- Added stable concurrency groups so newer pull-request runs cancel superseded deployments.