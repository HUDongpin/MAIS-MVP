import assert from "node:assert/strict";
import test from "node:test";
import { saveLessonProgressRequest } from "@/lib/lessonProgressRequest";

test("an uncertain browser save retries the same operation and body instead of rerunning a new command", async () => {
  const original = globalThis.fetch;
  const calls: RequestInit[] = [];
  let lost = true;
  globalThis.fetch = async (_url, options = {}) => {
    calls.push(options);
    if (options.method === "GET") return Response.json({ intent: "synthetic-signed-intent" });
    if (lost) { lost = false; throw new TypeError("synthetic lost response after server commit"); }
    return Response.json({ lesson: { status: "completed" } });
  };
  try {
    const user = crypto.randomUUID(), body = { slug: "synthetic", action: "complete" as const, checklistState: { a: true } };
    await assert.rejects(saveLessonProgressRequest(user, body), /lost response/);
    assert.equal((await saveLessonProgressRequest(user, body)).status, 200);
    assert.deepEqual(calls.map(call => call.method), ["GET", "POST", "POST"]);
    assert.equal(calls[1].body, calls[2].body);
    await saveLessonProgressRequest(user, body);
    assert.equal(calls[3].method, "GET", "an acknowledged action retires its transport retry");
  } finally { globalThis.fetch = original; }
});

test("account/input changes never borrow a pending command, and definitive rejection retires it", async () => {
  const original = globalThis.fetch, bodies: string[] = [];
  let reject = false;
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === "GET") return Response.json({ intent: "synthetic-intent" });
    bodies.push(String(options.body));
    if (reject) return Response.json({ code: "authority-intent-stale" }, { status: 409 });
    throw new TypeError("synthetic lost response");
  };
  try {
    const user = crypto.randomUUID();
    await assert.rejects(saveLessonProgressRequest(user, { slug: "a", action: "complete" }));
    await assert.rejects(saveLessonProgressRequest(user, { slug: "b", action: "complete" }));
    await assert.rejects(saveLessonProgressRequest(crypto.randomUUID(), { slug: "a", action: "complete" }));
    assert.equal(new Set(bodies.map(body => JSON.parse(body).operationId)).size, 3);
    reject = true;
    await saveLessonProgressRequest(user, { slug: "a", action: "complete" });
    assert.equal(bodies[0], bodies[3]);
    await saveLessonProgressRequest(user, { slug: "a", action: "complete" });
    assert.notEqual(bodies[0], bodies[4]);
  } finally { globalThis.fetch = original; }
});
