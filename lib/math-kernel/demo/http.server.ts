import "server-only";

import { NextResponse } from "next/server";

import type {
  ExactIntersectionResultDto,
  ExactSecantIntersectionDto,
} from "../analytic/types";
import { KERNEL_ERROR_CODES } from "../shared/errors";
import type { KernelResult } from "../shared/types";

type ExactDemoHttpBody =
  | {
      readonly ok: true;
      readonly slopeQuarter: number;
      readonly value: ExactSecantIntersectionDto;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly message: string;
      };
    };

function json(
  body: ExactDemoHttpBody,
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** Convert the trusted kernel result to the narrower public demo HTTP DTO. */
export function exactDemoHttpResponse(
  result: KernelResult<ExactIntersectionResultDto>,
  slopeQuarter: number,
): NextResponse {
  if (result.ok) {
    if (result.value.kind === "secant") {
      return json({
        ok: true,
        slopeQuarter,
        value: result.value,
      }, 200);
    }
    return json({
      ok: false,
      error: {
        code: KERNEL_ERROR_CODES.invalidIntersection,
        message: "The exact demo computation did not produce a real secant.",
      },
    }, 500);
  }

  if (result.error.code === KERNEL_ERROR_CODES.invalidInput) {
    return json({
      ok: false,
      error: {
        code: KERNEL_ERROR_CODES.invalidInput,
        message: result.error.message,
      },
    }, 400);
  }

  return json({
    ok: false,
    error: {
      code: KERNEL_ERROR_CODES.casOperationFailed,
      message: "The exact demo computation is temporarily unavailable.",
    },
  }, 500);
}
