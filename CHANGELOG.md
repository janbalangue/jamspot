# Changelog

All notable changes to JamSpot are documented in this file.

## [Unreleased]

### Added

- Shared, Supabase-backed cache for external API search results (Ticketmaster, Last.fm, Spotify, Apple Music), keyed by provider and normalized query, with a configurable 24-hour default TTL. (TEA-30)
- `supabase/api_cache.sql` - SQL to create the `api_cache` table and its RLS policies; run manually in the Supabase SQL editor per environment.

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