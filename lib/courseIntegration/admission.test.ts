import assert from "node:assert/strict";
import test from "node:test";

import { createCourseImportAdmissionController } from "./admission";

test("course import admission rate-limits hashed IP and teacher keys before concurrency", async () => {
  const observedKeys: string[] = [];
  const controller = createCourseImportAdmissionController({
    consumeRateLimit: (key) => {
      observedKeys.push(key);
      return { allowed: true, remaining: 1, resetAt: Date.now() + 60_000, retryAfterSeconds: 0 };
    }
  });
  const result = await controller.admit(
    new Request("https://preview.example/import", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }
    }),
    "Teacher.One@example.test"
  );
  assert.equal(result instanceof Response, false);
  assert.equal(observedKeys.length, 2);
  assert.ok(observedKeys.every((key) => /^[a-z-]+:[a-f0-9]{64}$/u.test(key)));
  assert.doesNotMatch(observedKeys.join("\n"), /203\.0\.113\.7|Teacher\.One/i);
  if (!(result instanceof Response)) result.release();
});

test("course import admission enforces bounded per-user concurrency and releases capacity", async () => {
  const controller = createCourseImportAdmissionController({
    limits: { maxConcurrentPerIp: 2, maxConcurrentPerUser: 1, timeoutMs: 100 },
    consumeRateLimit: () => ({
      allowed: true,
      remaining: 1,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 0
    })
  });
  const request = new Request("https://preview.example/import", {
    headers: { "x-real-ip": "203.0.113.8" }
  });
  const first = await controller.admit(request, "teacher-1");
  assert.equal(first instanceof Response, false);
  const blocked = await controller.admit(request, "teacher-1");
  assert.ok(blocked instanceof Response);
  assert.equal(blocked.status, 429);
  if (!(first instanceof Response)) first.release();
  const afterRelease = await controller.admit(request, "teacher-1");
  assert.equal(afterRelease instanceof Response, false);
  if (!(afterRelease instanceof Response)) afterRelease.release();
});

test("course import admission combines request abort and a bounded deadline", async () => {
  const requestController = new AbortController();
  const controller = createCourseImportAdmissionController({
    limits: { maxConcurrentPerIp: 2, maxConcurrentPerUser: 1, timeoutMs: 10 },
    consumeRateLimit: () => ({
      allowed: true,
      remaining: 1,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 0
    })
  });
  const lease = await controller.admit(new Request("https://preview.example/import", {
    signal: requestController.signal
  }), "teacher-1");
  assert.equal(lease instanceof Response, false);
  if (lease instanceof Response) return;
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(lease.signal.aborted, true);
  lease.release();

  const requestAbort = new AbortController();
  const linked = await controller.admit(new Request("https://preview.example/import", {
    signal: requestAbort.signal
  }), "teacher-2");
  assert.equal(linked instanceof Response, false);
  if (linked instanceof Response) return;
  requestAbort.abort();
  assert.equal(linked.signal.aborted, true);
  linked.release();
});
