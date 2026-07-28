import { getArtistBio, LastfmApiError } from "@/lib/lastfm";
import { getSpotifyArtist, SpotifyApiError } from "@/lib/spotify";
import { getAppleMusicArtist, AppleMusicApiError } from "@/lib/apple-music";

const TEST_ARTIST = "Tame Impala";

export default async function TestArtistPage() {
  const [bioResult, spotifyResult, appleMusicResult] = await Promise.all([
    getArtistBio(TEST_ARTIST).then(
      (data) => ({ data, error: null }),
      (err) => ({
        data: null,
        error: err instanceof LastfmApiError ? err.message : "Unexpected error",
      })
    ),
    getSpotifyArtist(TEST_ARTIST).then(
      (data) => ({ data, error: null }),
      (err) => ({
        data: null,
        error: err instanceof SpotifyApiError ? err.message : "Unexpected error",
      })
    ),
    getAppleMusicArtist(TEST_ARTIST).then(
      (data) => ({ data, error: null }),
      (err) => ({
        data: null,
        error:
          err instanceof AppleMusicApiError ? err.message : "Unexpected error",
      })
    ),
  ]);

  return (
    <main className="p-8 flex flex-col gap-8">
      <h1 className="text-2xl font-bold">
        Artist enrichment smoke test - &quot;{TEST_ARTIST}&quot;
      </h1>

      <ResultBlock title="Last.fm (TEA-14)" result={bioResult} />
      <ResultBlock title="Spotify (TEA-18)" result={spotifyResult} />
      <ResultBlock title="Apple Music (TEA-20)" result={appleMusicResult} />
    </main>
  );
}

function ResultBlock({
  title,
  result,
}: {
  title: string;
  result: { data: unknown; error: string | null };
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">
        {result.error ? `${title} - connection failed` : `${title} - connected`}
      </h2>
      <pre className="mt-2 whitespace-pre-wrap text-sm">
        {result.error ?? JSON.stringify(result.data, null, 2)}
      </pre>
    </section>
  );
}