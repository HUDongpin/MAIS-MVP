type SaveBody = { slug: string; action: "start" | "update" | "complete"; checklistState?: Record<string, boolean>; durationSeconds?: number };
const pendingSaves = new Map<string, { createdAt: number; requestBody: string }>();

/** Bind each save to the current account/reset epoch before sending its command.
 * Keep an uncertain request only in memory so a transport retry uses its receipt.
 * The server still checks authorization and the signed intent on every retry. */
export async function saveLessonProgressRequest(
  userId: string,
  body: SaveBody,
  signal?: AbortSignal
) {
  const headers = { "Content-Type": "application/json", "X-MAIS-Expected-User-Id": userId };
  const key = JSON.stringify([userId, body]);
  for (const [pendingKey, pending] of pendingSaves) if (Date.now() - pending.createdAt >= 110_000) pendingSaves.delete(pendingKey);
  let pending = pendingSaves.get(key);
  if (!pending) {
    const admission = await fetch("/api/lesson-progress", { method: "GET", headers, signal, cache: "no-store" });
    if (!admission.ok) return admission;
    const result = await admission.json() as { intent: string | null };
    if (result.intent !== null && typeof result.intent !== "string") throw new Error("Lesson save is unavailable.");
    pending = { createdAt: Date.now(), requestBody: JSON.stringify({ ...body,
      ...(result.intent ? { intent: result.intent, operationId: crypto.randomUUID() } : {}) }) };
    if (pendingSaves.size >= 32) pendingSaves.delete(pendingSaves.keys().next().value!);
    pendingSaves.set(key, pending);
  }
  const response = await fetch("/api/lesson-progress", {
    method: "POST", headers, signal,
    body: pending.requestBody
  });
  if ((response.ok || response.status < 500) && pendingSaves.get(key) === pending) pendingSaves.delete(key);
  return response;
}
