import assert from "node:assert/strict";
import test from "node:test";

import { createAuthUserStore } from "@/lib/server/userStore/authStore";
import type { AuthSession } from "@/lib/server/userStore/authSessionPersistence";

const authenticated: AuthSession = {
  settings: {
    language: "en",
    selectedGrade: "S3",
    theme: "dark"
  },
  user: {
    avatarId: "delta",
    curriculumProfile: {
      publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
      region: "HK"
    },
    curriculumTrack: "HK",
    grade: "S3",
    id: "student-1",
    name: "Student One",
    passwordMustChange: false,
    role: "student",
    username: "Student One"
  }
};

function createTestStore(
  sessionLookup: (
    userId: string,
    sessionRevision: number,
    signal?: AbortSignal
  ) => Promise<AuthSession | null>
) {
  return createAuthUserStore({
    authAdminStoragePersistenceStore: {} as never,
    authProvisioningPersistenceStore: {} as never,
    authSessionPersistenceStore: {
      getAuthenticatedUserForSession: sessionLookup
    } as never,
    isGradeAllowedForCurriculumProfile: () => true,
    learnerProfilePersistenceStore: {} as never
  });
}

test("the auth facade forwards the signed revision and admission signal to one session-aware lookup", async () => {
  const controller = new AbortController();
  let calls = 0;
  const store = createTestStore(async (userId, sessionRevision, signal) => {
    calls += 1;
    assert.equal(userId, "student-1");
    assert.equal(sessionRevision, 7);
    assert.equal(signal, controller.signal);
    return authenticated;
  });

  assert.equal(
    await store.getAuthenticatedUserForSession("student-1", 7, controller.signal),
    authenticated
  );
  assert.equal(calls, 1);
});

test("the auth facade propagates session lookup failures without an ID-only fallback", async () => {
  const databaseError = new Error("synthetic database failure");
  const store = createTestStore(async () => {
    throw databaseError;
  });

  await assert.rejects(
    store.getAuthenticatedUserForSession(
      "student-1",
      7,
      new AbortController().signal
    ),
    (error) => error === databaseError
  );
});
