"use client";

// Do not render the underlying database exception or technical details.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="page"><h1>Gegevens niet beschikbaar</h1>
    <p>De gegevens kunnen momenteel niet worden geladen. Probeer het later opnieuw.</p>
    <button onClick={reset}>Opnieuw proberen</button>
  </main>;
}
