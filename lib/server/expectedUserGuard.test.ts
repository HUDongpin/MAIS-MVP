import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

type AuthModule = {
  expectedUserConstraintsFromRequest?: (request: Request) => unknown[];
  guardExpectedAuthenticatedUser?: (
    authenticated: { user: { id: string } },
    constraints: readonly unknown[],
    options?: { requireConstraint?: boolean }
  ) => Response | null;
};

async function loadAuthModule(): Promise<AuthModule> {
  return import("@/lib/server/auth") as Promise<AuthModule>;
}

test("expected-user guard supports optional discovery calls but fails closed on strict omission", async () => {
  const auth = await loadAuthModule();
  assert.equal(typeof auth.guardExpectedAuthenticatedUser, "function");
  if (!auth.guardExpectedAuthenticatedUser) return;

  const authenticated = { user: { id: "student-1" } };
  assert.equal(auth.guardExpectedAuthenticatedUser(authenticated, []), null);
  const missingStrictConstraint = auth.guardExpectedAuthenticatedUser(
    authenticated,
    [],
    { requireConstraint: true }
  );
  assert.equal(missingStrictConstraint?.status, 409);
  assert.deepEqual(await missingStrictConstraint?.json(), {
    code: "authenticated-user-changed",
    error: "The authenticated user changed. Reload before retrying."
  });
  assert.equal(
    auth.guardExpectedAuthenticatedUser(
      authenticated,
      ["student-1", "student-1"],
      { requireConstraint: true }
    ),
    null
  );
});

test("expected-user guard rejects every non-exact or malformed constraint with stable private 409 JSON", async () => {
  const auth = await loadAuthModule();
  assert.equal(typeof auth.guardExpectedAuthenticatedUser, "function");
  if (!auth.guardExpectedAuthenticatedUser) return;

  const authenticated = { user: { id: "student-1" } };
  for (const constraint of ["student-2", "Student-1", "student-1 ", "", null, 1]) {
    const response = auth.guardExpectedAuthenticatedUser(authenticated, [constraint]);
    assert.ok(response, `expected ${JSON.stringify(constraint)} to conflict`);
    assert.equal(response.status, 409);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.clone().json(), {
      code: "authenticated-user-changed",
      error: "The authenticated user changed. Reload before retrying."
    });
    const serialized = await response.text();
    assert.doesNotMatch(serialized, /student-1|student-2/i);
  }
});

test("request constraints include every header and query constraint so one match cannot mask one mismatch", async () => {
  const auth = await loadAuthModule();
  assert.equal(typeof auth.expectedUserConstraintsFromRequest, "function");
  if (!auth.expectedUserConstraintsFromRequest) return;

  const request = new Request(
    "https://mais.example.test/api/mistakes?expectedUserId=student-1&expectedUserId=student-2",
    { headers: { "X-MAIS-Expected-User-Id": "student-1" } }
  );
  assert.deepEqual(auth.expectedUserConstraintsFromRequest(request), [
    "student-1",
    "student-1",
    "student-2"
  ]);

  const authenticated = { user: { id: "student-1" } };
  const response = auth.guardExpectedAuthenticatedUser?.(
    authenticated,
    auth.expectedUserConstraintsFromRequest(request)
  );
  assert.equal(response?.status, 409);
});

test("stateful account routes guard body or request expected-user constraints before persistence", async () => {
  const routeContracts = [
    ["app/api/attempts/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*bodyExpectedUserConstraints\(body\)[\s\S]*requireConstraint:\s*true[\s\S]*readAnswerWorkPhotos/],
    ["app/api/me/settings/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*bodyExpectedUserConstraints\(body\)[\s\S]*requireConstraint:\s*true[\s\S]*updateUserSettings/],
    ["app/api/learning-events/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*bodyExpectedUserConstraints\(body\)[\s\S]*requireConstraint:\s*true[\s\S]*(?:appendLearningEventsFast|appendLearningEvents)/],
    ["app/api/me/profile/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*bodyExpectedUserConstraints\(body\)[\s\S]*requireConstraint:\s*true[\s\S]*updateUserProfile/],
    ["app/api/me/learner-profile/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*bodyExpectedUserConstraints\(payload\)[\s\S]*requireConstraint:\s*true[\s\S]*updateLearnerProfile/],
    ["app/api/media-objects/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*bodyExpectedUserConstraints\(body\)[\s\S]*requireConstraint:\s*true[\s\S]*consumeAiCapabilityRateLimit/],
    ["app/api/mistakes/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*expectedUserConstraintsFromRequest\(request\)[\s\S]*requireConstraint:\s*true[\s\S]*(?:getMistakes|clearMistakesForUser)/],
    ["app/api/mistakes/[questionId]/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*expectedUserConstraintsFromRequest\(request\)[\s\S]*requireConstraint:\s*true[\s\S]*(?:markMistakeMastered|deleteMistake)/],
    ["app/api/lesson-entry/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*expectedUserConstraintsFromRequest\(request\)[\s\S]*requireConstraint:\s*true[\s\S]*getLessonEntryTarget/],
    ["app/api/me/avatar/route.ts", /guardExpectedAuthenticatedUser\([\s\S]*expectedUserConstraintsFromRequest\(request\)[\s\S]*requireConstraint:\s*true[\s\S]*readStoredMediaObject/],
    ["app/api/auth/password-change/handler.ts", /guardExpectedAuthenticatedUser\([\s\S]*bodyExpectedUserConstraints\(body\)[\s\S]*requireConstraint:\s*true[\s\S]*changePassword/],
    ["app/api/auth/logout/handler.ts", /guardExpectedAuthenticatedUser\([\s\S]*expectedUserConstraintsFromRequest\(request\)[\s\S]*requireConstraint:\s*true[\s\S]*response\.cookies\.set/],
    ["app/api/auth/logout-all/handler.ts", /guardExpectedAuthenticatedUser\([\s\S]*expectedUserConstraintsFromRequest\(request\)[\s\S]*requireConstraint:\s*true[\s\S]*revokeSessions/]
  ] as const;

  for (const [relativePath, contract] of routeContracts) {
    const source = await readFile(path.join(process.cwd(), relativePath), "utf8");
    assert.match(source, contract, `${relativePath} must fail closed before state access`);
  }

  const methodGuardCounts = [
    ["app/api/attempts/route.ts", 3],
    ["app/api/me/settings/route.ts", 4],
    ["app/api/learning-events/route.ts", 5],
    ["app/api/me/profile/route.ts", 3],
    ["app/api/me/learner-profile/route.ts", 3],
    ["app/api/media-objects/route.ts", 3],
    ["app/api/mistakes/route.ts", 2],
    ["app/api/mistakes/[questionId]/route.ts", 2],
    ["app/api/lesson-entry/route.ts", 1],
    ["app/api/me/avatar/route.ts", 1],
    ["app/api/auth/password-change/handler.ts", 2],
    ["app/api/auth/logout/handler.ts", 1],
    ["app/api/auth/logout-all/handler.ts", 1]
  ] as const;
  for (const [relativePath, expectedCount] of methodGuardCounts) {
    const source = await readFile(path.join(process.cwd(), relativePath), "utf8");
    const actualCount = source.match(/guardExpectedAuthenticatedUser\(/g)?.length ?? 0;
    assert.equal(actualCount, expectedCount, `${relativePath} must guard every covered method/body`);
  }

  const clientContracts = [
    [
      "components/practice/PracticeQuestionCard.tsx",
      ["/api/attempts", "/api/media-objects", "X-MAIS-Expected-User-Id", "expectedUserId", "AbortController", "activeUserIdRef"]
    ],
    ["app/mistake-book/page.tsx", ["/api/mistakes", "X-MAIS-Expected-User-Id", "activeUserIdRef"]],
    ["components/lesson/LessonEntryClient.tsx", ["/api/lesson-entry", "X-MAIS-Expected-User-Id"]],
    ["components/layout/LearnerStartSetupGate.tsx", ["/api/me/learner-profile", "X-MAIS-Expected-User-Id", "expectedUserId"]],
    ["components/providers/AppProviders.tsx", ["/api/auth/logout", "X-MAIS-Expected-User-Id", "window.location.reload()"]]
  ] as const;
  for (const [relativePath, requiredSnippets] of clientContracts) {
    const source = await readFile(path.join(process.cwd(), relativePath), "utf8");
    for (const requiredSnippet of requiredSnippets) {
      assert.ok(
        source.includes(requiredSnippet),
        `${relativePath} must include ${requiredSnippet} to bind account requests to the rendered user`
      );
    }
  }
});
