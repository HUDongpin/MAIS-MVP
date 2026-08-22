import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  guardianAccessErrorCopy,
  guardianInvitationIssuePath,
  guardianLinkRevokePath
} from "@/components/teacher/GuardianAccessControls";

test("guardian access client paths encode every exact authorization identifier", () => {
  assert.equal(
    guardianInvitationIssuePath("class/one", "student two"),
    "/api/teacher/classes/class%2Fone/students/student%20two/guardian-invitations"
  );
  assert.equal(
    guardianLinkRevokePath("class/one", "student two", "link?#three"),
    "/api/teacher/classes/class%2Fone/students/student%20two/guardian-links/link%3F%23three"
  );
});

test("guardian access client distinguishes safe recovery copy by failure class", () => {
  assert.match(guardianAccessErrorCopy(400).en, /check/i);
  assert.match(guardianAccessErrorCopy(403).en, /permission/i);
  assert.match(guardianAccessErrorCopy(404).en, /not found/i);
  assert.match(guardianAccessErrorCopy(409).en, /changed/i);
  assert.match(guardianAccessErrorCopy(410).en, /expired|revoked/i);
  assert.match(guardianAccessErrorCopy(429, 12).en, /12 seconds/i);
  assert.match(guardianAccessErrorCopy(503).en, /temporarily unavailable/i);
  assert.match(guardianAccessErrorCopy("network").en, /network/i);
  assert.ok(guardianAccessErrorCopy(503).zh.length > 0);
});

test("guardian access controls recover busy state and expose accessible live feedback", async () => {
  const source = await readFile(path.join(process.cwd(), "components/teacher/GuardianAccessControls.tsx"), "utf8");

  assert.match(source, /try\s*\{/);
  assert.match(source, /finally\s*\{/);
  assert.match(source, /role="status"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /Copy this code now/);
  assert.doesNotMatch(source, /tokenDigest|token_digest/);
});
