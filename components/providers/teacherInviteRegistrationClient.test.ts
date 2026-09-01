import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

test("teacher registration UI, provider, and test harness carry the server-only invite code", async () => {
  const [provider, page, helper, isolatedApp, playwrightConfig, envExample] = await Promise.all([
    readFile(path.join(projectRoot, "components/providers/AppProviders.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app/register/page.tsx"), "utf8"),
    readFile(path.join(projectRoot, "tests/e2e/helpers.ts"), "utf8"),
    readFile(path.join(projectRoot, "tests/e2e/isolated-app.ts"), "utf8"),
    readFile(path.join(projectRoot, "playwright.config.ts"), "utf8"),
    readFile(path.join(projectRoot, ".env.local.example"), "utf8")
  ]);

  assert.match(provider, /teacherInviteCode\?: string/);
  assert.match(provider, /\| "teacher-invite"/);
  assert.match(provider, /teacherInviteCode\s*}\s*:\s*RegisterInput/);
  assert.match(provider, /teacherInviteCode,\s*\n\s*language/);
  assert.match(provider, /response\.status === 403.*forbiddenAuthReason/);

  assert.match(page, /const \[teacherInviteCode, setTeacherInviteCode\] = useState\(""/);
  assert.match(page, /teacherInviteCode: isTeacherRegistration \? teacherInviteCode : undefined/);
  assert.match(page, /id="register-teacher-invite-code"/);
  assert.match(page, /result\.reason === "teacher-invite"/);

  assert.match(helper, /export const teacherInviteCode =/);
  assert.match(isolatedApp, /TEACHER_INVITE_CODES: teacherInviteCode/);
  assert.match(playwrightConfig, /TEACHER_INVITE_CODES=\$\{shellQuote\(e2eTeacherInviteCode\)\}/);
  assert.match(envExample, /^TEACHER_INVITE_CODES=$/m);
});
