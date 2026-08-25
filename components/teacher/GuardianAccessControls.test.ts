import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  guardianAccessErrorCopy,
  guardianExpectedUserHeaders,
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
  assert.deepEqual(guardianExpectedUserHeaders("teacher-old-document"), {
    "X-MAIS-Expected-User-Id": "teacher-old-document"
  });
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
  assert.match(source, /currentUser\?\.role === "teacher"/);
  assert.match(source, /expectedTeacherIdRef = useRef/);
  assert.equal(source.match(/headers: guardianExpectedUserHeaders\(expectedTeacherId\)/gu)?.length, 2);
  assert.doesNotMatch(source, /tokenDigest|token_digest/);
});

test("guardian revoke preserves the server-rotated invitation for one-time display", async () => {
  const module = await import("@/components/teacher/GuardianAccessControls") as Record<string, unknown>;
  assert.equal(typeof module.readRevealedGuardianInvitation, "function");
  if (typeof module.readRevealedGuardianInvitation !== "function") return;
  const readRevealedGuardianInvitation = module.readRevealedGuardianInvitation as (
    value: unknown
  ) => { token: string; version: number; expiresAt: string } | null;
  const invitation = {
    token: "MAIS-ABCDEF0123456789ABCDEF01",
    version: 4,
    expiresAt: "2026-08-26T00:00:00.000Z"
  };
  assert.deepEqual(readRevealedGuardianInvitation({ invitation }), invitation);
  assert.equal(readRevealedGuardianInvitation({ invitation: { ...invitation, token: "bad" } }), null);

  const source = await readFile(path.join(process.cwd(), "components/teacher/GuardianAccessControls.tsx"), "utf8");
  const revokeStart = source.indexOf("const revokeLink = async");
  const revokeEnd = source.indexOf("return (", revokeStart);
  const revokeSource = source.slice(revokeStart, revokeEnd);
  assert.match(revokeSource, /readRevealedGuardianInvitation\(payload\)/u);
  assert.match(revokeSource, /setRevealedInvitation\(invitation\)/u);
  assert.doesNotMatch(revokeSource, /setRevealedInvitation\(null\)/u);
});
