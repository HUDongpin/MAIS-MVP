"use client";

import { useEffect } from "react";
import { reportClientErrorPayload } from "@/components/observability/ClientErrorReporter";

/**
 * Root error boundary. Next.js renders this in place of the whole document when a render
 * error escapes every nested boundary, which is why it must ship its own <html>/<body> and
 * cannot use the app's providers (useSettings, theme, i18n are all unavailable here) — hence
 * the static bilingual copy and inline styles.
 *
 * It is also the only place a React render crash can be captured: those never reach
 * window.onerror, so without this the most user-visible failures would stay invisible.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientErrorPayload({
      name: error.name || "RenderError",
      message: error.message || "Unhandled render error",
      stack: error.stack,
      route: typeof window === "undefined" ? "unknown" : window.location.pathname,
      source: "global-error-boundary"
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "2rem"
        }}
      >
        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.75rem" }}>Something went wrong.</h1>
          <p style={{ margin: "0 0 0.5rem", lineHeight: 1.6, color: "#cbd5f5" }}>
            The page hit an unexpected error. Your work is saved on the server — reloading usually fixes it.
          </p>
          <p style={{ margin: "0 0 1.5rem", lineHeight: 1.6, color: "#cbd5f5" }} lang="zh-Hant">
            頁面發生未預期的錯誤。你的紀錄已儲存，重新載入通常就能繼續。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              borderRadius: "9999px",
              border: "none",
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: "0.95rem",
              padding: "0.75rem 1.5rem"
            }}
          >
            Try again · 重試
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
