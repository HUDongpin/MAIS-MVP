export type AuthFunnelClientEvent =
  | "login_submit"
  | "login_google_start"
  | "register_step"
  | "register_submit";

export function recordAuthFunnelEvent(event: AuthFunnelClientEvent, detail: string) {
  try {
    const payload = JSON.stringify({ events: [{ event, detail }] });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const queued = navigator.sendBeacon("/api/auth/funnel", new Blob([payload], { type: "application/json" }));
      if (queued) return;
    }
    void fetch("/api/auth/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {});
  } catch {
    // Funnel metrics must never interfere with the auth flow itself.
  }
}
