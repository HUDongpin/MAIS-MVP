import { normalizeClientErrorPayload } from "./errorPolicy";

// Module lifetime is the document lifetime. StrictMode/remounts do not reset its budget.
const seen = new Set<string>();
const maxReportsPerPageLoad = 5;

export function reportClientErrorPayload(payload: unknown) {
  try {
    const safe = normalizeClientErrorPayload(payload);
    if (!safe) return;
    const body = JSON.stringify(safe);
    if (seen.has(body) || seen.size >= maxReportsPerPageLoad) return;
    seen.add(body);
    void fetch("/api/observability/client-error", {
      method: "POST", keepalive: true, referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json" }, body
    }).catch(() => {});
  } catch { /* Error reporting must not break the page. */ }
}

export function installClientErrorListeners(target: Window) {
  const onError = (event: ErrorEvent) => {
    try {
      const error = event.error;
      reportClientErrorPayload({ name: error?.name ?? "Error", message: error?.message ?? event.message,
        route: target.location.pathname, source: "window.onerror" });
    } catch { /* Hostile getters must not create a new reporting error. */ }
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    try {
      const reason = event.reason;
      reportClientErrorPayload({ name: typeof reason === "string" ? "UnhandledRejection" : reason?.name ?? "UnhandledRejection",
        message: typeof reason === "string" ? reason : reason?.message,
        route: target.location.pathname, source: "unhandledrejection" });
    } catch { /* Same boundary as window.onerror. */ }
  };
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}
