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
    body: response.ok
      ? buildDeadlineTutorFallbackBody()
      : buildUnexpectedTutorFallbackBody(),
    headers: response.headers,
    ok: true,
    status: 200
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const abortController = new AbortController();
      let hardDeadline: ReturnType<typeof setTimeout> | undefined;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(encodeAITutorSSE(event, data)));
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (hardDeadline) clearTimeout(hardDeadline);
        controller.close();
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
          status: 200,
          ok: true,
          body,
          elapsedMs: Date.now() - startedAt
        });
        close();
      };

      send("status", { phase: "accepted", elapsedMs: 0 });
      send("status", { phase: "context-start", elapsedMs: Date.now() - startedAt });
      send("status", {
        phase: "provider-start",
        elapsedMs: Date.now() - startedAt,
        provider: "qwen"
      });

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
        if (!closed && abortController.signal.aborted) {
          sendDeadlineFallback();
          return;
        }
        if (!closed) {
          const body = buildUnexpectedTutorFallbackBody();
          send("chunk", {
            delta: body.reply,
            elapsedMs: Date.now() - startedAt,
            mode: body.mode,
            text: body.reply
          });
          send("final", {
            status: 200,
            ok: true,
            body,
            elapsedMs: Date.now() - startedAt
          });
        }
      } finally {
        close();
      }
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
        : buildUnexpectedTutorFallbackBody()
    );
  } finally {
    clearTimeout(hardDeadline);
  }
}

export async function GET() {
  return jsonResponse({
    ok: true,
    mode: "prewarm",
    provider: "qwen"
  });
}
