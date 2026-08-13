import { searchConcerts, TicketmasterApiError } from "@/lib/ticketmaster";

export default async function TestConcertsPage() {
  let concerts: Awaited<ReturnType<typeof searchConcerts>> = [];
  let error: string | null = null;

  try {
    concerts = await searchConcerts({ city: "Dallas", stateCode: "TX" });
  } catch (err) {
    error =
      err instanceof TicketmasterApiError
        ? err.message
        : "Unexpected error";
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        {error
          ? "Ticketmaster connection failed"
          : "JamSpot is connected to Ticketmaster"}
      </h1>

      {error ? (
        <pre className="mt-4 whitespace-pre-wrap">{error}</pre>
      ) : (
        <pre className="mt-4 whitespace-pre-wrap">
          {JSON.stringify(concerts, null, 2)}
        </pre>
      )}
    </main>
  );
}
