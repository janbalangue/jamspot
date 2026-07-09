# JamSpot

**JamSpot** is a local concert discovery application that recommends live music events based on a user's location, date range, music preferences, mood, and favorite artists.

> Find your next live show.

## About the Project

Finding concerts is easy when you already know exactly who you want to see. JamSpot is designed for the other situation: when you want to go to a show but need help discovering what is happening nearby.

Users provide preferences such as:

* Location
* Date range
* Music genre
* Mood
* Favorite artists

JamSpot uses those preferences to find and rank relevant local concerts.

The MVP will use Supabase for preference storage and the Ticketmaster Discovery API for concert data.

## Tech Stack

| Technology                 | Purpose                   |
| -------------------------- | ------------------------- |
| Next.js                    | Web application framework |
| React                      | User interface            |
| TypeScript                 | Application language      |
| Tailwind CSS               | Styling                   |
| Supabase                   | Backend platform          |
| PostgreSQL                 | Database                  |
| Ticketmaster Discovery API | Concert and event data    |
| Vercel                     | Hosting and deployment    |

Possible future integrations:

* Claude API for natural-language preference input
* Last.fm API for artist and music recommendations
* Google authentication
* Native mobile application

## Current Project Status

Current foundation work:

* [x] GitHub repository created
* [x] Local project connected to GitHub
* [x] Next.js application initialized
* [x] Node.js 24 development environment configured
* [x] Supabase project created
* [x] Supabase JavaScript client installed
* [x] Local environment variables configured
* [x] Next.js-to-Supabase database connection tested
* [ ] Vercel deployment completed
* [ ] User preferences schema finalized
* [ ] Preferences page implemented
* [ ] Ticketmaster API integrated
* [ ] Recommendation logic implemented
* [ ] Concert recommendation UI implemented
* [ ] MVP testing completed

---

## Planned Application Pages

JamSpot's MVP has two primary pages.

### Home Page

Route:

```text
/
```

The Home page will be the first page users see.

It will:

* Load saved preferences
* Fetch matching concerts
* Rank concert recommendations
* Display concert cards
* Show the currently active preferences
* Handle loading states
* Handle empty results
* Handle API and database errors

### Preferences Page

Route:

```text
/preferences
```

Users will enter:

* Location
* Genre
* Mood
* Favorite artist or artists
* Start date
* End date

Required MVP fields:

* Location
* Genre
* Start date
* End date

---

## Prerequisites

Before running JamSpot locally, install:

* Git
* NVM
* Node.js 24
* npm

Check whether NVM is installed:

```bash
nvm --version
```

Install Node.js 24:

```bash
nvm install 24
```

Use Node.js 24:

```bash
nvm use 24
```

Confirm the active version:

```bash
node --version
```

The output should begin with:

```text
v24.
```

### Recommended `.nvmrc`

Create a file named:

```text
.nvmrc
```

with:

```text
24
```

Team members can then switch to the correct Node.js version with:

```bash
nvm use
```

If Node.js 24 has not been installed yet:

```bash
nvm install
nvm use
```

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <REPOSITORY_URL>
```

Enter the project directory:

```bash
cd jamspot
```

### 2. Use the Project Node Version

```bash
nvm use
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Create the Environment File

Create:

```text
.env.local
```

in the project root.

Add:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Add the values from the JamSpot Supabase project.

The project currently only requires these two environment variables.

Future integrations may add:

```env
TICKETMASTER_API_KEY=
ANTHROPIC_API_KEY=
LASTFM_API_KEY=
```

These variables are not required until the corresponding integrations are implemented.

### 5. Confirm `.env.local` Is Ignored

Run:

```bash
git check-ignore .env.local
```

Expected output:

```text
.env.local
```

Also check:

```bash
git status
```

`.env.local` should not appear as an untracked or staged file.

Never commit real API credentials or environment files containing credentials.

### 6. Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Supabase Setup

JamSpot currently connects to Supabase using:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The application uses the Supabase JavaScript client:

```bash
npm install @supabase/supabase-js
```

A simple client configuration can be created in:

```text
lib/supabase.ts
```

Example:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
```

## Supabase Connection Test

During initial setup, JamSpot uses a temporary connection-test page:

```text
/test-db
```

Start the application:

```bash
npm run dev
```

Then visit:

```text
http://localhost:3000/test-db
```

The current connection flow is:

```text
Next.js
    ↓
Environment Variables
    ↓
Supabase JavaScript Client
    ↓
Supabase Data API
    ↓
PostgreSQL
```

The temporary connection-test route and database table should be removed after the real preferences database flow is implemented and verified.

---

## Environment Variable Strategy

JamSpot currently uses three separate environments.

### Local Development

Environment variables are stored in:

```text
.env.local
```

Current variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

### GitHub

The GitHub repository currently contains source code only.

JamSpot does **not** currently require environment variables or secrets in GitHub because Vercel deploys directly from the connected Git repository.

GitHub Actions secrets or variables should only be added later if GitHub Actions workflows need them for tasks such as:

* Integration tests
* Database tests
* Builds requiring runtime configuration
* Deployment scripts

### Vercel

The following variables must be configured in the Vercel project:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Recommended environments:

```text
Production
Preview
Development
```

The current configuration should be:

```text
Local
└── .env.local

GitHub
└── Source code only

Vercel
├── NEXT_PUBLIC_SUPABASE_URL
└── NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

---

## Vercel Deployment

### 1. Push the Latest Code

Before deploying, verify that the application builds:

```bash
nvm use
npm install
npm run build
```

Then check:

```bash
git status
```

Commit and push the latest source code:

```bash
git add .
git commit -m "Prepare JamSpot for deployment"
git push origin main
```

Do not commit `.env.local`.

### 2. Import JamSpot into Vercel

In the Vercel dashboard:

```text
Add New
→ Project
→ Import jamspot
```

For a standard project with `package.json` at the repository root:

```text
Framework Preset: Next.js
Root Directory: ./
```

Leave the detected Next.js build settings at their defaults unless the project structure changes.

### 3. Add Environment Variables

In the Vercel JamSpot project:

```text
Settings
→ Environment Variables
```

Add:

```text
NEXT_PUBLIC_SUPABASE_URL
```

and:

```text
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Use the values from the JamSpot Supabase project.

Assign them to:

```text
Production
Preview
Development
```

### 4. Deploy

Deploy the project.

After deployment, test:

```text
/
```

and, while the connection-test route still exists:

```text
/test-db
```

Verify that:

* The application loads
* Supabase queries work
* No environment variable errors occur
* No private credentials are displayed

---

## Git and Collaboration Workflow

Do not develop features directly on `main`.

Start from an updated `main` branch:

```bash
git checkout main
git pull origin main
```

Create a feature branch:

```bash
git checkout -b feature/preferences-form
```

Make changes, then review them:

```bash
git status
```

Commit:

```bash
git add .
git commit -m "Add preferences form"
```

Push:

```bash
git push -u origin feature/preferences-form
```

Then open a pull request into:

```text
main
```

Recommended branch prefixes:

```text
feature/
fix/
refactor/
test/
docs/
```

Examples:

```text
feature/preferences-form
feature/ticketmaster-search
feature/concert-cards
fix/date-range-validation
fix/supabase-query-error
refactor/recommendation-ranking
docs/update-readme
```

With Vercel connected to GitHub, the intended workflow is:

```text
Feature Branch
      ↓
Push to GitHub
      ↓
Vercel Preview Deployment
      ↓
Pull Request Review
      ↓
Merge to main
      ↓
Production Deployment
```

---

## MVP Data Model

The MVP is expected to use a `user_preferences` table.

Proposed fields:

| Field              | Purpose                           |
| ------------------ | --------------------------------- |
| `id`               | Unique preference record          |
| `location`         | User-specified concert location   |
| `genre`            | Preferred music genre             |
| `mood`             | Optional mood preference          |
| `favorite_artists` | One or more favorite artists      |
| `start_date`       | Beginning of concert search range |
| `end_date`         | End of concert search range       |
| `created_at`       | Preference creation timestamp     |

The exact schema and access strategy should be finalized before preference data is exposed through the application.

Because location and music preferences are user-related data, the preferences table should not use an unrestricted public-read policy.

---

## Planned Recommendation Logic

The MVP will begin with deterministic recommendation logic rather than AI.

Possible ranking priorities:

1. Favorite artist match
2. Genre match
3. Mood-to-genre match
4. Location match
5. Event date

Example mood mapping:

```text
Chill
→ Indie, R&B, Acoustic

Energetic
→ EDM, Pop, Hip-Hop

Sad
→ Alternative, Indie

Party
→ EDM, Rap, Pop
```

The ranking logic should be implemented as a separate testable function rather than directly inside a page component.

Example future location:

```text
lib/recommendations/rank-concerts.ts
```

---

## Planned Ticketmaster Integration

JamSpot will use the Ticketmaster Discovery API to find concert events.

The application will eventually search using data such as:

* Location
* Start date
* End date
* Genre
* Artist keyword
* Music classification

The Ticketmaster API response should be normalized before being passed to UI components.

A possible internal concert type:

```ts
type Concert = {
  id: string;
  name: string;
  venue: string;
  city: string;
  date: string;
  time?: string;
  imageUrl?: string;
  ticketUrl: string;
  genre?: string;
};
```

The UI should depend on JamSpot's normalized concert model rather than directly depending on the full Ticketmaster response structure.

---

## Suggested Project Structure

JamSpot can gradually move toward a structure similar to:

```text
jamspot/
├── app/
│   ├── api/
│   │   └── concerts/
│   │       └── route.ts
│   │
│   ├── preferences/
│   │   └── page.tsx
│   │
│   ├── test-db/
│   │   └── page.tsx
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── concert-card.tsx
│   ├── concert-grid.tsx
│   └── preference-form.tsx
│
├── lib/
│   ├── supabase.ts
│   │
│   ├── ticketmaster/
│   │   ├── normalize-event.ts
│   │   └── search-events.ts
│   │
│   └── recommendations/
│       ├── mood-map.ts
│       └── rank-concerts.ts
│
├── types/
│   ├── concert.ts
│   └── preferences.ts
│
├── public/
├── .env.local
├── .gitignore
├── .nvmrc
├── package.json
└── README.md
```

Add folders when the corresponding functionality is implemented rather than creating unused abstractions in advance.

---

## Development Roadmap

### Milestone 1 — Project Foundation

* [x] Create GitHub repository
* [x] Initialize Next.js application
* [x] Configure Node.js development environment
* [x] Create Supabase project
* [x] Install Supabase client
* [x] Configure local environment variables
* [x] Verify Supabase connectivity
* [ ] Deploy to Vercel
* [ ] Finalize database schema

### Milestone 2 — User Preferences

* [ ] Create Preferences page
* [ ] Add location input
* [ ] Add genre input
* [ ] Add mood input
* [ ] Add favorite artist input
* [ ] Add date-range inputs
* [ ] Add validation
* [ ] Save preferences to Supabase
* [ ] Fetch saved preferences
* [ ] Add database error handling

### Milestone 3 — Concert API

* [ ] Obtain Ticketmaster API credentials
* [ ] Research API search parameters
* [ ] Build server-side concert search function
* [ ] Search by location
* [ ] Search by date range
* [ ] Apply genre or music classification filters
* [ ] Normalize API data
* [ ] Add API error handling

### Milestone 4 — Recommendations

* [ ] Create Home page layout
* [ ] Fetch saved preferences
* [ ] Fetch matching concerts
* [ ] Implement genre matching
* [ ] Implement favorite artist matching
* [ ] Add mood-to-genre mapping
* [ ] Rank recommendations
* [ ] Create concert card component
* [ ] Add loading state
* [ ] Add empty state
* [ ] Add error state

### Milestone 5 — Polish and Testing

* [ ] Add navigation
* [ ] Improve styling
* [ ] Test responsive layouts
* [ ] Test preference form submission
* [ ] Test multiple cities and genres
* [ ] Test invalid date ranges
* [ ] Test no-results scenarios
* [ ] Test Supabase failures
* [ ] Test Ticketmaster failures
* [ ] Remove temporary database test route
* [ ] Remove debug logging
* [ ] Perform final MVP cleanup

---

## Test Scenarios

Planned concert search tests:

```text
Dallas, TX + Rap
New York, NY + Pop
Austin, TX + Country
Chicago, IL + EDM
```

Input and failure cases should include:

* Empty location
* Missing genre
* Missing start date
* Missing end date
* End date before start date
* Narrow date range
* Location with no events
* Supabase query failure
* Ticketmaster API failure

---

## Troubleshooting

### Wrong Node.js Version

Check:

```bash
node --version
```

Switch to the project version:

```bash
nvm use
```

If necessary:

```bash
nvm install 24
nvm use 24
```

Then reinstall dependencies if required:

```bash
rm -rf node_modules
npm install
```

### Environment Variables Are Not Loading

Confirm `.env.local` exists at the project root:

```text
jamspot/.env.local
```

Then restart the development server:

```bash
npm run dev
```

### Supabase Query Fails

Check:

* `NEXT_PUBLIC_SUPABASE_URL` is correct
* `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is correct
* Both values belong to the same Supabase project
* The requested table exists
* The table is in the expected schema
* Required database permissions exist
* The required RLS policy exists
* The correct Node.js version is active

### Clear the Next.js Build Cache

macOS or Linux:

```bash
rm -rf .next
npm run dev
```

PowerShell:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

---

## Security

* Never commit `.env.local`.
* Never commit database passwords or private API keys.
* Keep future Ticketmaster and AI API credentials server-side.
* Do not prefix server-only credentials with `NEXT_PUBLIC_`.
* Use Row Level Security for user-associated data.
* Do not create unrestricted public access to private preference records.
* Check `git status` before committing configuration changes.
* Remove temporary test routes once they are no longer needed.

---

## Future Ideas

After the MVP is stable, possible additions include:

* User accounts
* Google authentication
* User profiles
* Natural-language concert searches
* Claude-powered preference parsing
* Last.fm artist similarity recommendations
* Pagination
* Saved concerts
* Concert reviews
* Personalized recommendation history
* Native mobile application

## License

A project license has not yet been selected.
