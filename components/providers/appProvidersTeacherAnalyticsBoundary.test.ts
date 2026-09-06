import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("shared providers only enqueue learning analytics for student sessions", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const callbackStart = source.indexOf("const recordLearningEvent = useCallback");
  const eventCreateIndex = source.indexOf("createLearningAnalyticsEvent", callbackStart);
  const roleGuardIndex = source.indexOf('currentUser.role !== "student"', callbackStart);

  assert.notEqual(callbackStart, -1, "AppProviders should expose recordLearningEvent.");
  assert.notEqual(eventCreateIndex, -1, "recordLearningEvent should create analytics events for eligible users.");
  assert.notEqual(roleGuardIndex, -1, "recordLearningEvent should guard non-student roles.");
  assert.ok(
    callbackStart < roleGuardIndex && roleGuardIndex < eventCreateIndex,
    "Teacher/admin/parent sessions should return before creating or flushing learning analytics events."
  );
});

test("learning-events API ignores non-student sessions before LRS and storage work", async () => {
  const source = await readFile(path.join(process.cwd(), "app/api/learning-events/route.ts"), "utf8");
  const authIndex = source.indexOf("const authenticated = await requireAuthenticatedUser(request)");
  const roleGuardIndex = source.indexOf('authenticated.user.role !== "student"');
  const jsonParseIndex = source.indexOf("await request.json()", authIndex);
  const lrsIndex = source.indexOf("emitLearningEventsToLrs", authIndex);
  const appendIndex = source.indexOf("appendLearningEvents", authIndex);

  assert.notEqual(authIndex, -1, "learning-events API should authenticate first.");
  assert.notEqual(roleGuardIndex, -1, "learning-events API should ignore non-student sessions.");
  assert.notEqual(jsonParseIndex, -1, "learning-events API should still parse student request bodies.");
  assert.notEqual(lrsIndex, -1, "learning-events API should still support LRS for student events.");
  assert.notEqual(appendIndex, -1, "learning-events API should still persist student events.");
  assert.ok(
    authIndex < roleGuardIndex &&
      roleGuardIndex < jsonParseIndex &&
      roleGuardIndex < lrsIndex &&
      roleGuardIndex < appendIndex,
    "Non-student sessions should return before JSON parsing, LRS delivery, and storage append."
  );

  const { POST } = await import("@/app/api/learning-events/route");
  const guestResponse = await POST(new Request("https://mais.example.test/api/learning-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ events: [{ deliberately: "ignored" }] })
  }));
  assert.equal(guestResponse.status, 202);
  assert.deepEqual(await guestResponse.json(), { accepted: 0, ignored: true });
});

test("student analytics summary and export APIs are student-only", async () => {
  const routePaths = [
    "app/api/analytics/summary/route.ts",
    "app/api/analytics/export/route.ts"
  ];

  for (const routePath of routePaths) {
    const source = await readFile(path.join(process.cwd(), routePath), "utf8");
    const authIndex = source.indexOf("const authenticated = await requireAuthenticatedUser(request)");
    const roleGuardIndex = source.indexOf('authenticated.user.role !== "student"', authIndex);
    const analyticsReadIndex = Math.max(
      source.indexOf("getAnalyticsSummary", authIndex),
      source.indexOf("getAnalyticsExport", authIndex)
    );

    assert.notEqual(authIndex, -1, `${routePath} should authenticate before reading analytics.`);
    assert.notEqual(roleGuardIndex, -1, `${routePath} should block non-student roles.`);
    assert.notEqual(analyticsReadIndex, -1, `${routePath} should read student analytics after authorization.`);
    assert.ok(
      authIndex < roleGuardIndex && roleGuardIndex < analyticsReadIndex,
      `${routePath} should return before reading analytics for teacher/admin/parent sessions.`
    );
  }
});

test("student learning-events API persists local analytics before scheduling optional LRS delivery", async () => {
  const source = await readFile(path.join(process.cwd(), "app/api/learning-events/route.ts"), "utf8");
  const authIndex = source.indexOf("const authenticated = await requireAuthenticatedUser(request)");
  const jsonParseIndex = source.indexOf("await request.json()", authIndex);
  const appendCallIndex = source.indexOf("await appendLearningEvents", jsonParseIndex);
  const scheduleCallIndex = source.indexOf("scheduleLearningEventsLrsDelivery", appendCallIndex);
  const responseIndex = source.indexOf("return NextResponse.json({ accepted", appendCallIndex);
  const lrsCallIndex = source.indexOf("emitLearningEventsToLrs", responseIndex);

  assert.notEqual(appendCallIndex, -1, "Student learning events should be appended to local analytics storage.");
  assert.notEqual(scheduleCallIndex, -1, "Student learning events should still schedule optional LRS delivery.");
  assert.notEqual(responseIndex, -1, "Student learning events should respond after the local analytics append.");
  assert.notEqual(lrsCallIndex, -1, "Optional LRS delivery should still be attempted outside the awaited response path.");
  assert.ok(
    jsonParseIndex < appendCallIndex && appendCallIndex < scheduleCallIndex && scheduleCallIndex < responseIndex && responseIndex < lrsCallIndex,
    "Local analytics storage must be the only awaited durable write so LRS latency cannot slow student analytics responses."
  );
  assert.equal(source.includes("await emitLearningEventsToLrs"), false);
});
