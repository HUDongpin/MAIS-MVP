import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Invite gate for `role: "teacher"` self-registration (BK-05 / the first open item
 * on PRODUCTION-READINESS-CHECKLIST.md).
 *
 * Until this existed, anyone on the internet could POST to /api/auth/register with
 * `role: "teacher"` and receive the full teacher console — classes, assignment
 * creation, question generation, communications, rewards.
 *
 * Codes come from `TEACHER_INVITE_CODES` (comma or newline separated). The backlog
 * ticket also contemplates admin-generated codes held in the user store; that half
 * is deliberately not built here, because BK-07 freezes the `app_state` blob
 * against new domains and a durable code table needs the migration framework from
 * BK-08. `verifyTeacherInviteCode` is the single choke point to extend when those
 * land.
 *
 * The gate fails closed: with no codes configured, teacher self-registration is
 * refused outright rather than waved through.
 */

export type TeacherInviteCodeVerdict =
  | { status: "accepted" }
  | { status: "rejected"; reason: "registration-closed" | "code-required" | "code-invalid" };

function normalizeInviteCode(value: string) {
  return value.trim().toLowerCase();
}

function inviteCodeDigest(value: string) {
  return createHash("sha256").update(normalizeInviteCode(value)).digest();
}

export function configuredTeacherInviteCodes() {
  return (process.env.TEACHER_INVITE_CODES ?? "")
    .split(/[,\n]/)
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

/**
 * Whether this deployment accepts teacher self-registration at all. False means the
 * route rejects every teacher signup, valid code or not — the intended posture for
 * a deployment that provisions teachers through the admin/school flows instead.
 */
export function teacherSelfRegistrationConfigured() {
  return configuredTeacherInviteCodes().length > 0;
}

/**
 * Compares against every configured code without short-circuiting, so a caller
 * cannot time the response to learn how many codes exist or how close a guess was.
 */
export function verifyTeacherInviteCode(submittedCode: unknown): TeacherInviteCodeVerdict {
  const configured = configuredTeacherInviteCodes();
  if (configured.length === 0) return { status: "rejected", reason: "registration-closed" };

  const code = typeof submittedCode === "string" ? submittedCode.trim() : "";
  if (!code) return { status: "rejected", reason: "code-required" };

  const submittedDigest = inviteCodeDigest(code);
  const matched = configured.reduce(
    (accepted, candidate) => timingSafeEqual(submittedDigest, inviteCodeDigest(candidate)) || accepted,
    false
  );

  return matched ? { status: "accepted" } : { status: "rejected", reason: "code-invalid" };
}
