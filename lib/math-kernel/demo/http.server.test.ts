import assert from "node:assert/strict";
import test from "node:test";

import type { ExactIntersectionResultDto } from "../analytic/types";
import { KERNEL_ERROR_CODES } from "../shared/errors";
import type { KernelResult } from "../shared/types";
import { exactDemoHttpResponse } from "./http.server";
import { exactDemoIntersectionForSlopeQuarter } from "./mathKernelDemo.server";

test("a success response echoes the constrained slope for client correlation", async () => {
  const result = exactDemoIntersectionForSlopeQuarter(4);
  const response = exactDemoHttpResponse(result, 4);
  assert.equal(response.status, 200);
  const body = await response.json() as {
    readonly ok?: unknown;
    readonly slopeQuarter?: unknown;
  };
  assert.equal(body.ok, true);
  assert.equal(body.slopeQuarter, 4);
});

test("internal exact failures become sanitized 5xx responses", async () => {
  const result: KernelResult<ExactIntersectionResultDto> = {
    ok: false,
    error: {
      code: KERNEL_ERROR_CODES.casOperationFailed,
      message: "internal Compute Engine detail",
      details: { path: "secret-path" },
    },
  };
  const response = exactDemoHttpResponse(result, 4);
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: false,
    error: {
      code: KERNEL_ERROR_CODES.casOperationFailed,
      message: "The exact demo computation is temporarily unavailable.",
    },
  });
});

test("a non-secant success union is an internal contract failure, not HTTP 200", async () => {
  const result = {
    ok: true,
    value: {
      schemaVersion: 1,
      kind: "disjoint",
      coefficients: {},
    },
  } as unknown as KernelResult<ExactIntersectionResultDto>;
  const response = exactDemoHttpResponse(result, 4);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: {
      code: KERNEL_ERROR_CODES.invalidIntersection,
      message: "The exact demo computation did not produce a real secant.",
    },
  });
});

test("validated caller input failures remain sanitized 400 responses", async () => {
  const response = exactDemoHttpResponse({
    ok: false,
    error: {
      code: KERNEL_ERROR_CODES.invalidInput,
      message: "slopeQuarter is outside the allowed range.",
      details: { raw: "must-not-leak" },
    },
  }, 4);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: {
      code: KERNEL_ERROR_CODES.invalidInput,
      message: "slopeQuarter is outside the allowed range.",
    },
  });
});
