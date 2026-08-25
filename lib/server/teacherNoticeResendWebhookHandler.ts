import {
  TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES,
  verifyTeacherNoticeResendWebhook,
  type TeacherNoticeResendWebhookEnvelope
} from "./teacherNoticeResendWebhook";

type RawBodyResult =
  | { status: "ok"; rawBody: string }
  | { status: "invalid" }
  | { status: "too-large" };

type PersistenceResult = {
  status: "applied" | "unmatched" | "replayed" | "stale";
};

type HandlerOptions = {
  env?: Record<string, string | undefined>;
  persist: (event: TeacherNoticeResendWebhookEnvelope) => Promise<PersistenceResult>;
};

const responseHeaders = {
  "cache-control": "private, no-store",
  "content-type": "application/json; charset=utf-8"
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export async function readTeacherNoticeResendWebhookRawBody(
  request: Request
): Promise<RawBodyResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && /^[0-9]+$/u.test(contentLength)) {
    const declaredLength = Number(contentLength);
    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength > TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES
    ) {
      return { status: "too-large" };
    }
  }

  if (!request.body) return { status: "ok", rawBody: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES) {
        await reader.cancel();
        return { status: "too-large" };
      }
      chunks.push(value);
    }

    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      status: "ok",
      rawBody: new TextDecoder("utf-8", { fatal: true }).decode(body)
    };
  } catch {
    return { status: "invalid" };
  } finally {
    reader.releaseLock();
  }
}

export function createTeacherNoticeResendWebhookHandler(options: HandlerOptions) {
  return async function handleTeacherNoticeResendWebhook(request: Request): Promise<Response> {
    const rawBody = await readTeacherNoticeResendWebhookRawBody(request);
    if (rawBody.status === "too-large") {
      return jsonResponse({ error: "Request body is too large." }, 413);
    }
    if (rawBody.status === "invalid") {
      return jsonResponse({ error: "Invalid request body." }, 400);
    }

    const verification = verifyTeacherNoticeResendWebhook(
      rawBody.rawBody,
      request.headers,
      { env: options.env }
    );
    if (!verification.ok) {
      if (
        verification.error === "missing-configuration" ||
        verification.error === "invalid-configuration"
      ) {
        return jsonResponse({ error: "Service temporarily unavailable." }, 503);
      }
      if (
        verification.error === "missing-header" ||
        verification.error === "invalid-header" ||
        verification.error === "signature-verification-failed"
      ) {
        return jsonResponse({ error: "Invalid webhook signature." }, 401);
      }
      return jsonResponse({ error: "Invalid request body." }, 400);
    }

    if (verification.event.type === "ignored") {
      return jsonResponse({ received: true }, 200);
    }

    try {
      await options.persist(verification.event);
      return jsonResponse({ received: true }, 200);
    } catch {
      return jsonResponse({ error: "Service temporarily unavailable." }, 503);
    }
  };
}
