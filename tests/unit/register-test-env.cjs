// lib/supabase.ts throws at import time if these are unset. .env.local isn't
// committed (see .gitignore), so tests can't rely on it existing - supply
// harmless defaults. Every test that touches lib/reviews.ts stubs
// globalThis.fetch itself, so no real network call is ever made with these.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "sb_publishable_test";
