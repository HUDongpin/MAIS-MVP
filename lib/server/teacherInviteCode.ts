import { createHash, timingSafeEqual } from "node:crypto";

const maxTeacherInviteCodeLength = 256;

export type TeacherInviteCodeVerdict =
  | { status: "accepted" }
  | {
      status: "rejected";
      reason: "registration-closed" | "code-required" | "code-invalid";
    };

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
    .filter((code) => code.length > 0 && code.length <= maxTeacherInviteCodeLength);
}

export function teacherSelfRegistrationConfigured() {
  return configuredTeacherInviteCodes().length > 0;
}

export function verifyTeacherInviteCode(submittedCode: unknown): TeacherInviteCodeVerdict {
  const configured = configuredTeacherInviteCodes();
  if (configured.length === 0) {
    return { status: "rejected", reason: "registration-closed" };
  }

  if (typeof submittedCode === "string" && submittedCode.length > maxTeacherInviteCodeLength) {
    return { status: "rejected", reason: "code-invalid" };
  }

  const code = typeof submittedCode === "string" ? submittedCode.trim() : "";
  if (!code) return { status: "rejected", reason: "code-required" };

  const submittedDigest = inviteCodeDigest(code);
  const matched = configured.reduce(
    (accepted, candidate) => (
      timingSafeEqual(submittedDigest, inviteCodeDigest(candidate)) || accepted
    ),
    false
  );

  return matched ? { status: "accepted" } : { status: "rejected", reason: "code-invalid" };
}
