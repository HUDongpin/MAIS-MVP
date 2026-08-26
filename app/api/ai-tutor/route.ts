export const runtime = "edge";

const defaultTotalDeadlineMs = 8_000;
const defaultEdgeResponseReserveMs = 3_500;
const maxTotalDeadlineMs = 12_000;

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function resolveAITutorTotalDeadlineMs(value: string | undefined) {
  return boundedNumber(value, defaultTotalDeadlineMs, 2_000, maxTotalDeadlineMs);
}

function resolveAITutorEdgeDeadlineMs(totalDeadlineMs: number, value: string | undefined) {
  const reserveMs = boundedNumber(value, defaultEdgeResponseReserveMs, 0, 5_000);
  return Math.max(1_000, totalDeadlineMs - reserveMs);
}

function buildDeadlineTutorFallbackBody() {
  return {
    reply: [
      "Professor Nova is taking longer than usual, so I will not keep you waiting.",
      "Try one safe next step: write down the known values, name the unknown, and send me that first step so I can continue from there."
    ].join("\n\n"),
    mode: "deadline-fallback"
  };
}

function buildUnexpectedTutorFallbackBody() {
  return {
    reply: [
      "Professor Nova could not complete the live response just now.",
      "Please try again in a moment, or send the math question again with your first step so I can still guide you safely."
    ].join("\n\n"),
    mode: "provider-fallback"
  };
}

function buildRateLimitedTutorFallbackBody() {
  return {
    reply: [
      "Professor Nova is receiving too many requests right now, so I will pause this live reply instead of leaving you waiting.",
      "Please try again in a minute. If you want to keep working, write your first equation or diagram step and send it next."
    ].join("\n\n"),
    mode: "rate-limit-fallback"
  };
}

function wantsAITutorEventStream(request: Request) {
  return request.headers.get("accept")?.toLowerCase().includes("text/event-stream") ?? false;
}

function encodeAITutorSSE(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      ...Object.fromEntries(new Headers(init?.headers).entries())
    }
  });
}

function resolverHeaders(request: Request) {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Content-Type", request.headers.get("content-type") ?? "application/json");

  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);

  const expectedUserId = request.headers.get("x-mais-expected-user-id");
  if (expectedUserId) headers.set("X-MAIS-Expected-User-Id", expectedUserId);

  return headers;
}

function resolverUrl(request: Request) {
  return new URL("/api/ai-tutor/resolve", request.url);
}

async function readResolverJson(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function safeResolverBody(response: Response, body: unknown) {
  const bodyRecord = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const reply = typeof bodyRecord.reply === "string" ? bodyRecord.reply : "";
  if (reply) {
    return {
      body: bodyRecord,
      headers: response.headers,
      ok: response.ok,
      status: response.status
    };
  }

  if (!response.ok && typeof bodyRecord.error === "string") {
    return {
      body: bodyRecord,
      headers: response.headers,
      ok: false,
      status: response.status
    };
  }

  if (!response.ok && response.status < 500) {
    return {
      body: Object.keys(bodyRecord).length > 0
        ? bodyRecord
        : response.status === 429
          ? buildRateLimitedTutorFallbackBody()
          : buildUnexpectedTutorFallbackBody(),
      headers: response.headers,
      ok: false,
      status: response.status
    };
  }

  return {
    body: buildUnexpectedTutorFallbackBody(),
    headers: response.headers,
    ok: false,
    status: response.ok ? 502 : response.status
  };
}

async function fetchResolver(request: Request, bodyBytes: ArrayBuffer, signal: AbortSignal) {
  return fetch(resolverUrl(request), {
    method: "POST",
    headers: resolverHeaders(request),
    body: bodyBytes,
    cache: "no-store",
    signal
  });
}

function streamAITutorPost(request: Request) {
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  const totalDeadlineMs = resolveAITutorTotalDeadlineMs(process.env.AI_TUTOR_TOTAL_DEADLINE_MS);
  const edgeDeadlineMs = resolveAITutorEdgeDeadlineMs(
    totalDeadlineMs,
    process.env.AI_TUTOR_EDGE_RESPONSE_RESERVE_MS
  );
  const abortController = new AbortController();
  let closed = false;
  let hardDeadline: ReturnType<typeof setTimeout> | undefined;
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;

  const cleanup = () => {
    if (hardDeadline) clearTimeout(hardDeadline);
    request.signal.removeEventListener("abort", abortForIncomingRequest);
  };
  const stopWithoutWriting = (reason?: unknown) => {
    if (closed) return;
    closed = true;
    cleanup();
    if (!abortController.signal.aborted) abortController.abort(reason);
    try {
      streamController?.close();
    } catch {
      // The consumer already cancelled the stream.
    }
  };
  const abortForIncomingRequest = () => stopWithoutWriting(request.signal.reason);
  request.signal.addEventListener("abort", abortForIncomingRequest, { once: true });
  if (request.signal.aborted) abortForIncomingRequest();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      streamController = controller;
      if (closed) {
        try {
          controller.close();
        } catch {
          // The consumer already cancelled the stream.
        }
        return;
      }

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(encodeAITutorSSE(event, data)));
        } catch (error) {
          stopWithoutWriting(error);
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // The consumer already cancelled the stream.
        }
      };

      const sendDeadlineFallback = () => {
        const body = buildDeadlineTutorFallbackBody();
        abortController.abort();
        send("status", {
          phase: "deadline-fallback",
          elapsedMs: Date.now() - startedAt
        });
        send("chunk", {
          delta: body.reply,
          elapsedMs: Date.now() - startedAt,
          mode: body.mode,
          text: body.reply
        });
        send("final", {
          status: 503,
          ok: false,
          body,
          elapsedMs: Date.now() - startedAt
        });
        close();
      };

      send("status", { phase: "accepted", elapsedMs: 0 });

      hardDeadline = setTimeout(sendDeadlineFallback, edgeDeadlineMs);

      try {
        const bodyBytes = await request.arrayBuffer();
        const response = await fetchResolver(request, bodyBytes, abortController.signal);
        if (closed) return;

        const resolved = safeResolverBody(response, await readResolverJson(response));
        const reply = typeof (resolved.body as { reply?: unknown }).reply === "string"
          ? (resolved.body as { reply: string }).reply
          : "";
        const mode = typeof (resolved.body as { mode?: unknown }).mode === "string"
          ? (resolved.body as { mode: string }).mode
          : undefined;
        const provider = response.headers.get("X-MAIS-AI-Provider");
        const model = response.headers.get("X-MAIS-AI-Model");

        if (resolved.ok && reply && provider && model && !mode?.includes("fallback")) {
          send("status", {
            phase: "provider-start",
            elapsedMs: Date.now() - startedAt,
            provider,
            model
          });
        }

        if (reply) {
          send("chunk", {
            delta: reply,
            elapsedMs: Date.now() - startedAt,
            mode,
            text: reply
          });
        }
        send("final", {
          status: resolved.status,
          ok: resolved.ok,
          body: resolved.body,
          elapsedMs: Date.now() - startedAt
        });
      } catch {
        if (!closed) {
          const body = buildUnexpectedTutorFallbackBody();
          send("chunk", {
            delta: body.reply,
            elapsedMs: Date.now() - startedAt,
            mode: body.mode,
            text: body.reply
          });
          send("final", {
            status: 503,
            ok: false,
            body,
            elapsedMs: Date.now() - startedAt
          });
        }
      } finally {
        close();
      }
    },
    cancel(reason) {
      stopWithoutWriting(reason);
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Vary: "Accept"
    }
  });
}

export async function POST(request: Request) {
  if (wantsAITutorEventStream(request)) {
    return streamAITutorPost(request);
  }

  const totalDeadlineMs = resolveAITutorTotalDeadlineMs(process.env.AI_TUTOR_TOTAL_DEADLINE_MS);
  const edgeDeadlineMs = resolveAITutorEdgeDeadlineMs(
    totalDeadlineMs,
    process.env.AI_TUTOR_EDGE_RESPONSE_RESERVE_MS
  );
  const abortController = new AbortController();
  const abortForIncomingRequest = () => abortController.abort(request.signal.reason);
  request.signal.addEventListener("abort", abortForIncomingRequest, { once: true });
  if (request.signal.aborted) abortForIncomingRequest();
  const hardDeadline = setTimeout(() => abortController.abort(), edgeDeadlineMs);

  try {
    const bodyBytes = await request.arrayBuffer();
    const response = await fetchResolver(request, bodyBytes, abortController.signal);
    const resolved = safeResolverBody(response, await readResolverJson(response));
    return jsonResponse(resolved.body, {
      headers: resolved.headers,
      status: resolved.status
    });
  } catch {
    return jsonResponse(
      abortController.signal.aborted
        ? buildDeadlineTutorFallbackBody()
        : buildUnexpectedTutorFallbackBody(),
      { status: 503 }
    );
  } finally {
    clearTimeout(hardDeadline);
    request.signal.removeEventListener("abort", abortForIncomingRequest);
  }
}

export async function GET() {
  return jsonResponse({
    ok: true,
    mode: "prewarm",
    provider: "qwen"
  });
}
