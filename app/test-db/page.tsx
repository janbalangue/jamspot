import { supabase } from "@/lib/supabase";

export default async function TestDatabasePage() {
  const { data, error } = await supabase
    .from("connection_test")
    .select("*")
    .limit(1);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        {error
          ? "Supabase connection failed"
          : "JamSpot is connected to Supabase"}
      </h1>

      {error ? (
        <pre className="mt-4 whitespace-pre-wrap">
          {error.message}
        </pre>
      ) : (
        <pre className="mt-4">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}