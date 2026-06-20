import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { test } from "node:test";
import { authenticatedUserForCredentials, __userStoreAuthHotTableTestHooks } from "@/lib/server/userStore";

function hashPassword(password: string, salt = "test-salt") {
  return pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

function testUser({
  email,
  id,
  password,
  username
}: {
  email?: string;
  id: string;
  password: string;
  username: string;
}) {
  const salt = `salt-${id}`;
  return {
    id,
    username,
    normalized_username: username.trim().toLowerCase(),
    email,
    normalized_email: email?.trim().toLowerCase(),
    password_hash: hashPassword(password, salt),
    password_salt: salt,
    password_must_change: false,
    role: "student" as const,
    created_at: "2026-06-04T00:00:00.000Z"
  };
}

test("credential lookup continues past a duplicate username with the wrong password", () => {
  const legacyUser = testUser({
    id: "legacy-shirleen",
    username: "Student Shirleen",
    password: "legacy-password"
  });
  const seededUser = testUser({
    id: "student-shirleen-us",
    username: "Student Shirleen",
    email: "student.shirleen@example.edu",
    password: "12345"
  });

  const user = authenticatedUserForCredentials(
    { users: [legacyUser, seededUser] } as Parameters<typeof authenticatedUserForCredentials>[0],
    "Student Shirleen",
    "12345"
  );

  assert.equal(user?.id, "student-shirleen-us");
});

test("credential lookup still supports exact email login for a duplicated demo user", () => {
  const legacyUser = testUser({
    id: "legacy-shirleen",
    username: "Student Shirleen",
    password: "legacy-password"
  });
  const seededUser = testUser({
    id: "student-shirleen-us",
    username: "Student Shirleen",
    email: "student.shirleen@example.edu",
    password: "12345"
  });

  const user = authenticatedUserForCredentials(
    { users: [legacyUser, seededUser] } as Parameters<typeof authenticatedUserForCredentials>[0],
    "student.shirleen@example.edu",
    "12345"
  );

  assert.equal(user?.id, "student-shirleen-us");
});

test("hot auth table lookup continues past a duplicate username with the wrong password", () => {
  const legacyUser = testUser({
    id: "legacy-shirleen",
    username: "Student Shirleen",
    password: "legacy-password"
  });
  const seededUser = testUser({
    id: "student-shirleen-us",
    username: "Student Shirleen",
    email: "student.shirleen@example.edu",
    password: "12345"
  });

  const result = __userStoreAuthHotTableTestHooks.authenticatedUserForHotAuthRows(
    {
      users: [legacyUser, seededUser],
      studentProfiles: [
        {
          user_id: "legacy-shirleen",
          name: "Legacy Student Shirleen",
          grade: "S4",
          curriculum_track: "HK",
          curriculum_region: "HK",
          textbook_publisher: "HK_UNITED_PRIME_MIA"
        },
        {
          user_id: "student-shirleen-us",
          name: "Student Shirleen",
          grade: "P1",
          curriculum_track: "US_CA_MATH",
          curriculum_region: "US",
          textbook_publisher: "US_CA_MATH"
        }
      ],
      userSettings: [
        {
          user_id: "legacy-shirleen",
          language: "en",
          theme: "dark",
          selected_grade: "S4",
          updated_at: "2026-06-14T00:00:00.000Z"
        },
        {
          user_id: "student-shirleen-us",
          language: "en",
          theme: "light",
          selected_grade: "P1",
          updated_at: "2026-06-14T00:00:00.000Z"
        }
      ]
    },
    "Student Shirleen",
    "12345"
  );

  assert.equal(result?.status, "authenticated");
  assert.equal(result?.session.user.id, "student-shirleen-us");
  assert.equal(result?.session.user.curriculumProfile.publisher, "US_CA_MATH");
  assert.equal(result?.session.settings.selectedGrade, "P1");
});

test("hot auth table overlay replaces stale snapshot auth rows", () => {
  const overlaid = __userStoreAuthHotTableTestHooks.overlayDatabaseWithHotAuthRows(
    {
      users: [
        testUser({
          id: "student-1",
          username: "Student One",
          email: "student-old@example.test",
          password: "old-password"
        })
      ],
      student_profiles: [
        {
          user_id: "student-1",
          name: "Student One Old",
          grade: "S3",
          curriculum_track: "HK",
          curriculum_region: "HK",
          textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
        }
      ],
      user_settings: [
        {
          user_id: "student-1",
          language: "en",
          theme: "dark",
          selected_grade: "S3",
          updated_at: "2026-06-13T00:00:00.000Z"
        }
      ],
      password_reset_tokens: [
        {
          id: "old-token",
          user_id: "student-1",
          token_hash: "old-hash",
          expires_at: "2026-06-15T00:00:00.000Z",
          used_at: null,
          created_at: "2026-06-13T00:00:00.000Z"
        }
      ]
    },
    {
      users: [
        testUser({
          id: "student-1",
          username: "Student One",
          email: "student-new@example.test",
          password: "new-password"
        })
      ],
      studentProfiles: [
        {
          user_id: "student-1",
          name: "Student One New",
          grade: "S4",
          curriculum_track: "MAINLAND_PEP_HIGH",
          curriculum_region: "MAINLAND",
          textbook_publisher: "MAINLAND_PEP"
        }
      ],
      userSettings: [
        {
          user_id: "student-1",
          language: "zh-Hans",
          theme: "light",
          selected_grade: "S4",
          updated_at: "2026-06-14T00:00:00.000Z"
        }
      ],
      passwordResetTokens: [
        {
          id: "new-token",
          user_id: "student-1",
          token_hash: "new-hash",
          expires_at: "2026-06-16T00:00:00.000Z",
          used_at: null,
          created_at: "2026-06-14T00:00:00.000Z"
        }
      ]
    }
  );

  assert.equal(overlaid.users[0]?.email, "student-new@example.test");
  assert.equal(overlaid.student_profiles[0]?.name, "Student One New");
  assert.equal(overlaid.user_settings[0]?.selected_grade, "S4");
  assert.equal(overlaid.password_reset_tokens.some((token) => token.id === "new-token"), true);
});
