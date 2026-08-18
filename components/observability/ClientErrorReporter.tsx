"use client";

import { useEffect } from "react";

/**
 * Client-side crash reporting.
 *
 * Mounted from app/layout.tsx on Vercel deployments only. It forwards uncaught errors and
 * unhandled promise rejections to /api/observability/client-error, which applies the same
 * PII scrub as every server capture (lib/server/errorMonitor.ts).
 *
 * Deliberately conservative: at most `maxReportsPerPageLoad` reports per page load, with
 * identical signatures collapsed, so a render loop cannot turn one broken component into
 * thousands of requests. Delivery is best-effort — a failed report is swallowed.
 */

const maxReportsPerPageLoad = 5;
const maxStackFrames = 5;

export function reportClientErrorPayload(payload: {
  name: string;
  message: string;
  stack?: string;
  route: string;
  source: string;
}) {
  try {
    void fetch("/api/observability/client-error", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {
      /* reporting must never break the page it is reporting about */
    });
  } catch {
    /* ditto */
  }
}

function stackHead(stack: unknown) {
  return typeof stack === "string" ? stack.split("\n").slice(0, maxStackFrames).join("\n") : undefined;
}

export function ClientErrorReporter() {
  useEffect(() => {
    let reported = 0;
    const seen = new Set<string>();

    const report = (name: string, message: string, stack: unknown, source: string) => {
      const signature = `${source}:${name}:${message}`;
      if (seen.has(signature) || reported >= maxReportsPerPageLoad) return;
      seen.add(signature);
      reported += 1;
      reportClientErrorPayload({
        name,
        message,
        stack: stackHead(stack),
        route: window.location.pathname,
        source
      });
    };

    const onError = (event: ErrorEvent) => {
      const error = event.error as Error | undefined;
      report(error?.name ?? "Error", error?.message ?? event.message ?? "Unknown client error", error?.stack, "window.onerror");
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { name?: string; message?: string; stack?: string } | string | undefined;
      if (typeof reason === "string") {
        report("UnhandledRejection", reason, undefined, "unhandledrejection");
        return;
      }
      report(reason?.name ?? "UnhandledRejection", reason?.message ?? "Unhandled promise rejection", reason?.stack, "unhandledrejection");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
