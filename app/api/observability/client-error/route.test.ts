import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";
import { createClientErrorHandler } from "./handler";

const endpoint = "https://app.example.test/api/observability/client-error";

test("client intake rejects non-JSON MIME and foreign request metadata before reading", async () => {
  const invalidHeaders: Record<string, string>[] = [
    { "content-type": "text/plain; hint=application/json", origin: "https://app.example.test" },
    { "content-type": "application/json", origin: "https://foreign.example.test" },
    { "content-type": "application/json", "sec-fetch-site": "cross-site" }
  ];
  for (const headers of invalidHeaders) {
    const request = new Request(endpoint, { method: "POST", headers, body: "{}" });
    let reads = 0;
    const read = request.body!.getReader.bind(request.body);
    Object.defineProperty(request.body, "getReader", { value: () => { reads += 1; return read(); } });
    const response = await POST(request);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(reads, 0);
  }
});

test("valid same-origin intake only captures normalized client facts", async () => {
  const events: unknown[] = [];
  const handler = createClientErrorHandler({ capture: (error, context) => events.push({ message: (error as Error).message, name: (error as Error).name, stack: (error as Error).stack, context }) });
  const response = await handler(new Request(endpoint, {
    method: "POST", headers: { "content-type": "Application/JSON; charset=utf-8", origin: "https://app.example.test", "sec-fetch-site": "same-origin" },
    body: JSON.stringify({ message: "Failed to fetch private note", name: "privateAlias", route: "/parent/private", source: "datastore", extra: { token: "private" } })
  }));
  assert.equal(response.status, 204); assert.equal(events.length, 1);
  assert.doesNotMatch(JSON.stringify(events), /private|datastore|token/);
  assert.match(JSON.stringify(events), /network-failed/);
});

test("missing origin metadata, malformed JSON and non-object data are silently dropped", async () => {
  let captures = 0;
  const handler = createClientErrorHandler({ capture: () => { captures += 1; } });
  for (const body of ["{", "[]", "null", "42"]) {
    const response = await handler(new Request(endpoint, { method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.test" }, body }));
    assert.equal(response.status, 204);
  }
  await handler(new Request(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
  await handler(new Request(endpoint, { method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.test" }, body: new Uint8Array([0xff, 0xfe]) }));
  assert.equal(captures, 0);
});

test("declared oversized bodies are rejected early and a small forged length does not bypass the actual byte cap", async () => {
  let captures = 0;
  const handler = createClientErrorHandler({ capture: () => { captures += 1; } });
  for (const declared of ["9000", "0", "not-a-number"]) {
    const response = await handler(new Request(endpoint, { method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.test", "content-length": declared }, body: JSON.stringify({ message: "界".repeat(3000) }) }));
    assert.equal(response.status, 204);
  }
  assert.equal(captures, 0);
});

test("global intake rejection stops before any per-IP bucket or body read", async () => {
  const keys: string[] = [];
  const handler = createClientErrorHandler({ consume: (key) => { keys.push(key); return { allowed: false, retryAfterSeconds: 1, remaining: 0, resetAt: 1 }; } });
  const response = await handler(new Request(endpoint, { method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.test", "x-forwarded-for": "forged" }, body: "{}" }));
  assert.equal(response.status, 204); assert.deepEqual(keys, ["observability:client-error:all"]);
});

test("intake capture exceptions retain the uniform no-store response", async () => {
  const handler = createClientErrorHandler({ capture: () => { throw new Error("synthetic capture failure"); } });
  const response = await handler(new Request(endpoint, { method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.test" }, body: "{}" }));
  assert.equal(response.status, 204); assert.equal(response.headers.get("cache-control"), "no-store"); assert.equal(await response.text(), "");
});

test("client intake cancels an oversized stream without buffering its remainder", async () => {
  let chunksRead = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      chunksRead += 1;
      if (chunksRead > 16) controller.close();
      else controller.enqueue(new Uint8Array(2048).fill(32));
    },
    cancel() { cancelled = true; }
  });
  const request = new Request(endpoint, {
    method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.test" },
    body: stream, duplex: "half"
  } as RequestInit & { duplex: "half" });
  const response = await POST(request);
  assert.equal(response.status, 204);
  assert.equal(cancelled, true);
  assert.ok(chunksRead < 16, "must stop pulling once the 8 KiB bound is exceeded");
});
