import { NextRequest, NextResponse } from "next/server";
import {
  exactDemoIntersectionForSlopeQuarter,
  isDemoSlopeQuarter,
} from "@/lib/math-kernel/demo/mathKernelDemo.server";
import { exactDemoHttpResponse } from "@/lib/math-kernel/demo/http.server";
import { KERNEL_ERROR_CODES } from "@/lib/math-kernel/shared/errors";
import type { KernelResult } from "@/lib/math-kernel/shared/types";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 1_024;

type BodyReadResult =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly status: 400 | 413;
      readonly message: string;
    };

function invalid(message: string): KernelResult<never> {
  return {
    ok: false,
    error: { code: KERNEL_ERROR_CODES.invalidInput, message },
  };
}

function invalidResponse(message: string, status: 400 | 413 | 415) {
  return NextResponse.json(invalid(message), {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

async function readBoundedJson(request: NextRequest): Promise<BodyReadResult> {
  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, status: 400, message: "The demo request must be valid JSON." };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        try {
          await reader.cancel("request body exceeds the demo limit");
        } catch {
          // The response is already fail-closed; cancellation is best effort.
        }
        return { ok: false, status: 413, message: "The demo request is too large." };
      }
      chunks.push(chunk.value);
    }
  } catch {
    return { ok: false, status: 400, message: "The demo request must be valid JSON." };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, message: "The demo request must be valid JSON." };
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_REQUEST_BYTES) {
    return invalidResponse("The demo request is too large.", 413);
  }

  const mediaType = request.headers.get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    return invalidResponse("The demo request must use application/json.", 415);
  }

  const parsedBody = await readBoundedJson(request);
  if (!parsedBody.ok) {
    return invalidResponse(parsedBody.message, parsedBody.status);
  }
  const body = parsedBody.value;
  if (
    !isPlainRecord(body) ||
    Object.keys(body).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(body, "slopeQuarter")
  ) {
    return invalidResponse("The demo request must contain only slopeQuarter.", 400);
  }
  if (!isDemoSlopeQuarter(body.slopeQuarter)) {
    return invalidResponse("slopeQuarter must be an integer from -8 through 8.", 400);
  }
  const slopeQuarter = body.slopeQuarter;

  try {
    return exactDemoHttpResponse(
      exactDemoIntersectionForSlopeQuarter(slopeQuarter),
      slopeQuarter,
    );
  } catch {
    return exactDemoHttpResponse({
      ok: false,
      error: {
        code: KERNEL_ERROR_CODES.casOperationFailed,
        message: "The exact demo computation threw unexpectedly.",
      },
    }, slopeQuarter);
  }
}
