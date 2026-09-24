import { createHash } from "node:crypto";
import { normalizeClientErrorReport, clientErrorFromReport } from "@/lib/server/clientErrorReport";
import { captureServerError } from "@/lib/server/errorMonitor";
import { consumeInMemoryRateLimit } from "@/lib/server/rateLimit";

const maxBodyBytes = 8 * 1024;
const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

async function readBoundedJson(request: Request): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBodyBytes)) {
    await request.body?.cancel().catch(() => {});
    return null;
  }
  if (!request.body) return null;
  const reader = request.body.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
  } finally { reader.releaseLock(); }
}

export function createClientErrorHandler({ capture = captureServerError, consume = consumeInMemoryRateLimit } = {}) {
  return async function POST(request: Request) {
    try {
      const mime = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
      const origin = request.headers.get("origin");
      const site = request.headers.get("sec-fetch-site");
      if (mime !== "application/json" || (origin !== null && origin !== new URL(request.url).origin)) return noContent();
      if (site !== null && site !== "same-origin") return noContent();
      if (origin === null && site !== "same-origin") return noContent();
      if (!consume("observability:client-error:all", { max: 120, windowMs: 60_000 }).allowed) return noContent();
      const ip = request.headers.get("x-forwarded-for")?.split(",", 1)[0].trim() || request.headers.get("x-real-ip") || "local";
      const key = createHash("sha256").update(ip).digest("hex").slice(0, 32);
      if (!consume(`observability:client-error:${key}`, { max: 20, windowMs: 900_000 }).allowed) return noContent();
      const report = normalizeClientErrorReport(await readBoundedJson(request));
      if (report) capture(clientErrorFromReport(report), { scope: "client", route: report.route, kind: report.source, tags: { source: report.source, runtime: "browser" } });
    } catch { /* Intake and monitor failures never become an application failure. */ }
    return noContent();
  };
}
