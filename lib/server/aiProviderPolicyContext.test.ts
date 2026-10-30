import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { classProviderRegion, storedUserProviderRegion } from "./aiProviderPolicyContext";
import { providerPolicyRegionForUser } from "@/lib/aiProviderCompanyPolicy";
import { authenticatedUserFromAuthRecords, normalizeAuthStudentProfileRecord, projectedStudentProfileRecord } from "./userStore/authSessionPersistence";
import type { CurriculumRegion, CurriculumTrack, TextbookPublisher } from "@/types";
import { toAuthenticatedAppShellBootstrap } from "@/lib/appShellBootstrap";
import { curriculumProfileForTrack, isCurriculumRegion, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import { mayUseUnverifiedBrowserRecognition } from "@/lib/browserSpeechPolicy";

const database = {
  student_profiles: [
    { user_id: "teacher", curriculum_region: "HK", curriculum_track: "HK" },
    { user_id: "us", curriculum_region: "US", curriculum_track: "US_CA_MATH" },
    { user_id: "mainland", curriculum_region: "MAINLAND", curriculum_track: "MAINLAND_PEP_HIGH" },
    { user_id: "unknown" }
  ],
  teacher_classes: [{ id: "class", teacher_id: "teacher" }],
  class_enrollments: [{ class_id: "class", student_id: "us" }]
};

test("persisted learner and class contexts keep US data on US companies even for an HK teacher", () => {
  assert.equal(storedUserProviderRegion(database, "us"), "US");
  assert.equal(classProviderRegion(database, "class", "teacher"), "US");
  assert.equal(classProviderRegion({ ...database, class_enrollments: [] }, "class", "teacher"), "HK");
  assert.equal(classProviderRegion({ ...database, class_enrollments: [{ class_id: "class", student_id: "unknown" }] }, "class"), null);
  assert.equal(classProviderRegion(database, "absent"), null);
});

test("authentication does not disguise missing stored region as unrestricted HK for providers", () => {
  const user = { id: "u", username: "fixture", role: "student" as const };
  const make = (fields: object) => authenticatedUserFromAuthRecords({
    user, profile: { user_id: "u", name: "Fixture", grade: "S3", ...fields }, mediaObjectUrlForKey: () => null
  })!;
  const unknown = make({});
  assert.equal(unknown.user.curriculumProfile.region, "HK", "legacy curriculum display default remains intact");
  assert.equal(providerPolicyRegionForUser(unknown.user), null, "provider policy preserves unresolved stored identity");
  assert.equal(providerPolicyRegionForUser(make({ curriculum_track: "US_CA_MATH" }).user), "US");
  assert.equal(providerPolicyRegionForUser(make({ curriculum_track: "HK" }).user), "HK");
});

test("normalization, persistence and hot-row projection preserve unresolved and explicit US policy", () => {
  for (const fields of [{}, { curriculum_region: "US" as const, curriculum_track: "HK" as const }]) {
    let profile = { user_id: "u", name: "Fixture", grade: "S3" as const, ...fields };
    for (let round = 0; round < 3; round++) {
      profile = JSON.parse(JSON.stringify(normalizeAuthStudentProfileRecord(profile)));
      const hot = projectedStudentProfileRecord(profile)!;
      const authenticated = authenticatedUserFromAuthRecords({ user: { id: "u", username: "fixture", role: "student" }, profile: hot, mediaObjectUrlForKey: () => null })!;
      assert.equal(providerPolicyRegionForUser(authenticated.user), Object.hasOwn(fields, "curriculum_track") ? "US" : null);
      assert.equal(storedUserProviderRegion({ student_profiles: [profile] }, "u"), Object.hasOwn(fields, "curriculum_track") ? "US" : null);
    }
  }
});

test("a stored region survives conflicting legacy publishers in raw and persisted authentication", () => {
  const cases: Array<{ region: CurriculumRegion; track: CurriculumTrack; publisher: TextbookPublisher }> = [
    { region: "US", track: "HK", publisher: "HK_UNITED_PRIME_MIA" },
    { region: "HK", track: "US_CA_MATH", publisher: "US_CA_MATH" },
    { region: "MAINLAND", track: "US_CA_MATH", publisher: "US_CA_MATH" }
  ];
  for (const { region, track, publisher } of cases) {
    let profile = { user_id: "u", name: "Fixture", grade: "S3" as const, curriculum_region: region, curriculum_track: track, textbook_publisher: publisher };
    for (let round = 0; round < 4; round++) {
      const hot = projectedStudentProfileRecord(profile)!;
      const authenticated = authenticatedUserFromAuthRecords({ user: { id: "u", username: "fixture", role: "student" }, profile: hot, mediaObjectUrlForKey: () => null })!;
      assert.equal(providerPolicyRegionForUser(authenticated.user), region, `${region} raw/auth projection round ${round}`);
      assert.equal(storedUserProviderRegion({ student_profiles: [profile] }, "u"), region);
      profile = JSON.parse(JSON.stringify(normalizeAuthStudentProfileRecord(profile)));
      assert.equal(profile.curriculum_region, region, `${region} persisted round ${round}`);
    }
  }
});

test("bootstrap and login decoding retain the nullable policy before browser speech decisions", () => {
  const file = ts.createSourceFile("AppProviders.tsx", readFileSync("components/providers/AppProviders.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = file.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "readAuthSession");
  assert.ok(fn);
  const js = ts.transpileModule(fn.getText(file), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const read = vm.runInNewContext(`${js}\nreadAuthSession`, {
    isGrade: () => true, isValidLanguage: () => true,
    normalizeCurriculumProfile, curriculumProfileForTrack, isCurriculumRegion,
    readAvatarId: () => "astronaut", readAvatarImageUrl: () => undefined, readAvatarImageDataUrl: () => undefined,
    readAvatarImageObjectKey: () => undefined, readLessonEntryTarget: () => null
  }) as (value: unknown) => ReturnType<typeof authenticatedUserFromAuthRecords>;
  for (const region of [null, "US", "HK", "MAINLAND"] as const) {
    const session = authenticatedUserFromAuthRecords({
      user: { id: "u", username: "fixture", role: "student" },
      profile: { user_id: "u", name: "Fixture", grade: "P3", ...(region ? { curriculum_region: region } : {}) },
      mediaObjectUrlForKey: () => null
    })!;
    const bootstrap = JSON.parse(JSON.stringify(toAuthenticatedAppShellBootstrap(session)));
    assert.equal(providerPolicyRegionForUser(bootstrap.user), region, "HTML/RSC bootstrap");
    const decoded = read(JSON.parse(JSON.stringify(session)))!;
    assert.equal(providerPolicyRegionForUser(decoded.user), region, "login/session refresh decoder");
    assert.equal(mayUseUnverifiedBrowserRecognition(providerPolicyRegionForUser(decoded.user)), region === "HK" || region === "MAINLAND");
    const malformed = read({ ...session, user: { ...session.user, providerPolicyRegion: "invalid" } })!;
    assert.equal(providerPolicyRegionForUser(malformed.user), null);
  }
});
