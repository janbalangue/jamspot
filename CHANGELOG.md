# Changelog

All notable changes to JamSpot are documented in this file.

## [Unreleased]

## [0.2.0] - 2026-08-09

### Added

- Caching for external API search results (Ticketmaster, Last.fm, Spotify, Apple Music) via Next.js's built-in fetch/Data Cache, with a configurable default TTL (24h for artist data, 5min for Ticketmaster listings). No external database - `next: { revalidate }` is set on every provider fetch, and search values are normalized (trimmed + lowercased) before building the request so equivalent searches share one cache entry. (TEA-30)
- Converted the repo into an npm-workspaces monorepo with `apps/web` (the existing Next.js app), `apps/mobile` (a new Expo/React Native app for iOS and Android), and `packages/shared` (TypeScript types shared between the two apps).
- Scaffolded the Expo mobile app (managed workflow) with tab navigation, themed components, and concert/review views backed by the shared API client.

### Changed

- Moved the Next.js app's source, tests, and config into `apps/web`; the local env file now lives at `apps/web/.env.local`.
- Replaced root-level `dev`/`build`/`test`/etc. scripts with workspace-delegating scripts (`dev:web`, `dev:mobile`, `dev:ios`, `dev:android`, `build:web`, `start:web`, `test:web`, `coverage:web`), plus workspace-wide `lint` and `test`.
- Scoped the subprod and production-preview GitHub Actions workflows to `apps/web` (path filters, working directory, and coverage artifact path).
- Updated README with the monorepo layout and revised setup/troubleshooting instructions.

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