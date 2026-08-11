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

function createTestStore({
  fastLookup,
  legacyLookup
}: {
  fastLookup: (
    userId: string,
    signal: AbortSignal
  ) => Promise<AuthSession | null | undefined>;
  legacyLookup: (userId: string) => Promise<AuthSession | null>;
}) {
  return createAuthUserStore({
    authAdminStoragePersistenceStore: {} as never,
    authProvisioningPersistenceStore: {} as never,
    authSessionPersistenceStore: {
      getAuthenticatedUserById: legacyLookup
    } as never,
    getAuthenticatedUserByIdForAiTutorAdmissionBeforeSnapshot: fastLookup,
    isGradeAllowedForCurriculumProfile: () => true,
    learnerProfilePersistenceStore: {} as never
  });
}

test("an authoritative AI Tutor auth miss never falls back to the snapshot", async () => {
  let legacyCalls = 0;
  const controller = new AbortController();
  const store = createTestStore({
    fastLookup: async (_userId, signal) => {
      assert.equal(signal, controller.signal);
      return null;
    },
    legacyLookup: async () => {
      legacyCalls += 1;
      return authenticated;
    }
  });

  assert.equal(
    await store.getAuthenticatedUserByIdForAiTutorAdmission("student-1", controller.signal),
    null
  );
  assert.equal(legacyCalls, 0);
});

test("AI Tutor auth keeps legacy snapshot behavior only when the fast path is not applicable", async () => {
  let legacyCalls = 0;
  const controller = new AbortController();
  const store = createTestStore({
    fastLookup: async () => undefined,
    legacyLookup: async () => {
      legacyCalls += 1;
      return authenticated;
    }
  });

  assert.equal(
    await store.getAuthenticatedUserByIdForAiTutorAdmission("student-1", controller.signal),
    authenticated
  );
  assert.equal(legacyCalls, 1);
});

test("AI Tutor auth propagates fast-path failures without snapshot fallback", async () => {
  const databaseError = new Error("synthetic database failure");
  let legacyCalls = 0;
  const store = createTestStore({
    fastLookup: async () => {
      throw databaseError;
    },
    legacyLookup: async () => {
      legacyCalls += 1;
      return authenticated;
    }
  });

  await assert.rejects(
    store.getAuthenticatedUserByIdForAiTutorAdmission(
      "student-1",
      new AbortController().signal
    ),
    (error) => error === databaseError
  );
  assert.equal(legacyCalls, 0);
});
