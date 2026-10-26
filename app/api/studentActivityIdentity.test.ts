import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { NextResponse } from "next/server";
import * as auth from "@/lib/server/auth";
import { isValidLearningAnalyticsEvent } from "@/lib/learningAnalytics";
import * as authorityIntent from "@/lib/server/learnerAuthorityIntent";
import * as authorityState from "@/lib/server/learnerAuthorityState";

// Execute the real route with synthetic authentication/storage dependencies.
// A rejected stale request must neither read nor write the replacement user.
function routeHarness(route: "lesson-progress" | "visualization-sessions", role = "student") {
  const calls: unknown[] = [];
  const exports: Record<string, (request: Request) => Promise<Response>> = {};
  const source = readFileSync(path.join(process.cwd(), "app/api", route, "route.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(code, {
    exports, Request, URL,
    require: (name: string) => {
      if (name === "next/server") return { NextResponse };
      if (name === "@/lib/server/auth") return {
        ...auth,
        requireAuthenticatedUser: async () => ({ user: { id: "student-b", role, curriculumProfile: {} } }),
        requireLessonProgressAuthenticatedUser: async () => ({ user: { id: "student-b", role, curriculumProfile: {} }, sessionRevision: 7 })
      };
      if (name === "@/lib/learningAnalytics") return { isValidLearningAnalyticsEvent };
      if (name === "@/lib/server/learnerAuthorityIntent") return authorityIntent;
      if (name === "@/lib/server/learnerAuthorityState") return authorityState;
      if (name === "@/lib/server/userStore") return {
        updateLessonProgress: async (input: unknown) => { calls.push(input); return { slug: "synthetic" }; },
        markVisualizationSession: async (input: unknown) => {
          calls.push(input);
          return { module_id: "synthetic", topic_id: "synthetic", source: "visualization-lab", explored: true };
        },
        listVisualizationSessionsForUser: async (userId: string) => { calls.push(userId); return []; }
      };
      throw new Error(`Unexpected route dependency: ${name}`);
    }
  });
  return { route: exports, calls };
}

for (const endpoint of ["lesson-progress", "visualization-sessions"] as const) {
  for (const identity of ["student-a", "missing", "student-b"] as const) {
    test(`${endpoint} POST binds activity to the initiating account (${identity})`, async () => {
      const { route, calls } = routeHarness(endpoint);
      const response = await route.POST(new Request(`http://localhost/api/${endpoint}`, {
        method: "POST", headers: {
          "Content-Type": "application/json",
          ...(identity === "missing" ? {} : { "X-MAIS-Expected-User-Id": identity })
        },
        body: JSON.stringify({ slug: "synthetic", action: "complete", moduleId: "synthetic", topicId: "synthetic", source: "visualization-lab" })
      }));
      assert.equal(response.status, identity === "student-b" ? 200 : 409);
      assert.equal(calls.length, identity === "student-b" ? 1 : 0);
    });
  }
  test(`${endpoint} POST rejects conflicting body identity and non-student writes`, async () => {
    for (const [role, expectedUserId, status] of [["student", "student-a", 409], ["teacher", "student-b", 403]] as const) {
      const { route, calls } = routeHarness(endpoint, role);
      const response = await route.POST(new Request(`http://localhost/api/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-MAIS-Expected-User-Id": "student-b" },
        body: JSON.stringify({ expectedUserId, slug: "synthetic", action: "complete", moduleId: "synthetic", topicId: "synthetic", source: "visualization-lab" })
      }));
      assert.equal(response.status, status);
      assert.equal(calls.length, 0);
    }
  });
}

test("visualization history rejects stale or unbound reads", async () => {
  for (const identity of ["student-a", "missing", "student-b"]) {
    const { route, calls } = routeHarness("visualization-sessions");
    const response = await route.GET(new Request("http://localhost/api/visualization-sessions", {
      headers: identity === "missing" ? {} : { "X-MAIS-Expected-User-Id": identity }
    }));
    assert.equal(response.status, identity === "student-b" ? 200 : 409);
    assert.deepEqual(calls, identity === "student-b" ? ["student-b"] : []);
  }
});


test("lesson progress carries the verified cookie revision rather than an untrusted body revision", async () => {
  const { route, calls } = routeHarness("lesson-progress");
  const response = await route.POST(new Request("http://localhost/api/lesson-progress", {
    method: "POST", headers: { "Content-Type": "application/json", "X-MAIS-Expected-User-Id": "student-b" },
    body: JSON.stringify({ slug: "synthetic", action: "complete", expectedSessionRevision: 999 })
  }));
  assert.equal(response.status, 200);
  assert.equal((calls[0] as { expectedSessionRevision: number }).expectedSessionRevision, 7);
});
