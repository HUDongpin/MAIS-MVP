import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("storage-free example login sessions hydrate without a seeded database row", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-storage-free-auth-"));

  try {
    // The subject here is storage-free hydration, not the demo gate, so opt in: with
    // demo accounts switched off these seeds no longer resolve at all, which is the
    // behaviour userStoreDemoLoginGate.test.ts asserts.
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.HK_MATH_ENABLE_DEMO_USER = "true";
    process.env.HK_MATH_DB_DIR = dbDir;
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_STORAGE_PROVIDER;

    const {
      authenticateFlexibleExampleAccountForLogin,
      getAuthenticatedUserById
    } = await import("./userStore");

    const login = await authenticateFlexibleExampleAccountForLogin({
      username: "Student Peter",
      password: "12345",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      selectedGrade: "S4",
      language: "zh-Hans",
      theme: "dark"
    });

    assert.equal(login.status, "authenticated");
    if (login.status === "authenticated") {
      const hydrated = await getAuthenticatedUserById(login.session.user.id);

      assert.equal(hydrated?.user.id, login.session.user.id);
      assert.equal(hydrated?.user.username, "Student Peter");
      assert.equal(hydrated?.user.curriculumProfile.publisher, "MAINLAND_PEP");
      assert.equal(hydrated?.settings.selectedGrade, "S4");
    }
  } finally {
    restoreEnv("NODE_ENV", previousNodeEnv);
    restoreEnv("HK_MATH_ENABLE_DEMO_USER", previousDemoFlag);
    restoreEnv("HK_MATH_DB_DIR", previousDbDir);
    restoreEnv("HK_MATH_DB_PATH", previousDbPath);
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    await rm(dbDir, { recursive: true, force: true });
  }
});
