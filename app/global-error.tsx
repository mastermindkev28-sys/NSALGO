"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#07080a", color: "#e9edf3", fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ letterSpacing: "0.3em", fontSize: 12, color: "#737b88" }}>NSALGO</p>
          <h1 style={{ fontWeight: 500 }}>The application failed to load.</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 6, border: "1px solid #ffffff30", background: "#161a1f", color: "#e9edf3", cursor: "pointer" }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
