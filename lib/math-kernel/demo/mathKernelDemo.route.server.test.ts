import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { POST } from "../../../app/api/math-kernel-demo/analytic-exact/route";

const ENDPOINT = "http://localhost/api/math-kernel-demo/analytic-exact";

function requestWithBody(body: BodyInit, headers?: HeadersInit): NextRequest {
  return new NextRequest(ENDPOINT, {
    method: "POST",
    body,
    headers,
    duplex: "half",
  } as unknown as ConstructorParameters<typeof NextRequest>[1]);
}

test("the exact demo route accepts only the constrained integer payload", async () => {
  const response = await POST(requestWithBody(
    JSON.stringify({ slopeQuarter: 4 }),
    { "content-type": "application/json" },
  ));
  assert.equal(response.status, 200);
  const body = await response.json() as {
    readonly ok?: unknown;
    readonly value?: { readonly kind?: unknown };
  };
  assert.equal(body.ok, true);
  assert.equal(body.value?.kind, "secant");
  assert.equal((body as { readonly slopeQuarter?: unknown }).slopeQuarter, 4);
});

test("the exact demo route requires application/json to block simple cross-site posts", async () => {
  for (const contentType of [undefined, "text/plain", "application/x-www-form-urlencoded"]) {
    const response = await POST(requestWithBody(
      JSON.stringify({ slopeQuarter: 4 }),
      contentType ? { "content-type": contentType } : undefined,
    ));
    assert.equal(response.status, 415);
    const body = await response.json() as { readonly ok?: unknown };
    assert.equal(body.ok, false);
  }

  const charsetResponse = await POST(requestWithBody(
    JSON.stringify({ slopeQuarter: 4 }),
    { "content-type": "application/json; charset=utf-8" },
  ));
  assert.equal(charsetResponse.status, 200);
});

test("the exact demo route rejects an oversized chunked body without trusting Content-Length", async () => {
  const encoder = new TextEncoder();
  const oversized = encoder.encode(JSON.stringify({
    slopeQuarter: 0,
    padding: "x".repeat(2_000),
  }));
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(oversized.subarray(0, 700));
      controller.enqueue(oversized.subarray(700));
      controller.close();
    },
  });

  const response = await POST(requestWithBody(
    stream as unknown as BodyInit,
    { "content-type": "application/json" },
  ));
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: {
      code: "INVALID_INPUT",
      message: "The demo request is too large.",
    },
  });
});

test("the body limit accepts 1,024 bytes for parsing and rejects byte 1,025", async () => {
  const atLimit = JSON.stringify("x".repeat(1_022));
  const overLimit = JSON.stringify("x".repeat(1_023));
  assert.equal(new TextEncoder().encode(atLimit).byteLength, 1_024);
  assert.equal(new TextEncoder().encode(overLimit).byteLength, 1_025);

  const atLimitResponse = await POST(requestWithBody(atLimit, {
    "content-type": "application/json",
  }));
  assert.equal(atLimitResponse.status, 400, "the 1,024-byte body reaches schema validation");

  const overLimitResponse = await POST(requestWithBody(overLimit, {
    "content-type": "application/json",
  }));
  assert.equal(overLimitResponse.status, 413);
});

test("the exact route accepts both slope boundaries and rejects their neighbours", async () => {
  for (const slopeQuarter of [-8, 8]) {
    const response = await POST(requestWithBody(JSON.stringify({ slopeQuarter }), {
      "content-type": "application/json",
    }));
    assert.equal(response.status, 200);
  }
  for (const slopeQuarter of [-9, 9]) {
    const response = await POST(requestWithBody(JSON.stringify({ slopeQuarter }), {
      "content-type": "application/json",
    }));
    assert.equal(response.status, 400);
  }
});

test("the exact demo route rejects extra keys and non-integer slope tokens", async () => {
  for (const payload of [
    { slopeQuarter: 0, expression: "m" },
    { slopeQuarter: 0.5 },
    { slopeQuarter: "0" },
  ]) {
    const response = await POST(requestWithBody(JSON.stringify(payload), {
      "content-type": "application/json",
    }));
    assert.equal(response.status, 400);
    const body = await response.json() as { readonly ok?: unknown };
    assert.equal(body.ok, false);
  }
});
