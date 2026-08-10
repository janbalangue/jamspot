import { createReview, getReviewById, ReviewsError } from "@/lib/reviews";

/**
 * Temporary connection-test route for the reviews table, following the
 * same pattern as /test-db and /test-concerts.
 *
 * On every load this WRITES a real row to `reviews` (via createReview)
 * and then READS it back by id (via getReviewById) to confirm the full
 * round trip works. It cannot clean up after itself: the RLS policy on
 * `reviews` only grants anon SELECT and INSERT, not DELETE, so the test
 * row stays in the table. Remove this route (or periodically delete rows
 * where user_name = 'test-reviews route') before sharing the app publicly.
 */
export default async function TestReviewsPage() {
  let created: Awaited<ReturnType<typeof createReview>> | null = null;
  let fetched: Awaited<ReturnType<typeof getReviewById>> | null = null;
  let error: string | null = null;

  try {
    created = await createReview({
      musician: "RLS Test Artist",
      venue: "Automated Test Venue",
      concertDate: new Date().toISOString().slice(0, 10),
      reviewText: `Automated read/write check at ${new Date().toISOString()}`,
      userName: "test-reviews route",
    });

    fetched = await getReviewById(created.id);

    if (!fetched) {
      error = "Review was created but could not be read back by id";
    }
  } catch (err) {
    error = err instanceof ReviewsError ? err.message : "Unexpected error";
  }

  const success = !error && created !== null && fetched !== null;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        {success
          ? "JamSpot can read and write reviews"
          : "Reviews read/write test failed"}
      </h1>

      <p className="mt-2 text-sm text-gray-600">
        This route writes a real row to the reviews table on every load and
        cannot delete it (RLS blocks anon deletes by design). Remove this
        route, or periodically clear test rows, before sharing this app
        publicly.
      </p>

      {error ? (
        <pre className="mt-4 whitespace-pre-wrap">{error}</pre>
      ) : (
        <>
          <h2 className="mt-4 font-semibold">Write result (created row):</h2>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(created, null, 2)}
          </pre>

          <h2 className="mt-4 font-semibold">
            Read result (same row, fetched back by id):
          </h2>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(fetched, null, 2)}
          </pre>
        </>
      )}
    </main>
  );
}