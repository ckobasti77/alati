"use client";

/** Greška u samom layout-u (retko): minimalna stranica bez zavisnosti od teme i provajdera. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="sr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <main style={{ maxWidth: 360, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Aplikacija trenutno ne radi</h1>
          <p style={{ fontSize: 14, lineHeight: "20px", color: "#a1a1aa", margin: "0 0 20px" }}>
            Nešto je pošlo naopako pri učitavanju. Pokušaj ponovo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: 0,
              background: "#7c3aed",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Pokušaj ponovo
          </button>
        </main>
      </body>
    </html>
  );
}
