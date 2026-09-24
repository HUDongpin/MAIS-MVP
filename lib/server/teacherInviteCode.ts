import { createHash, timingSafeEqual } from "node:crypto";
import {
  isTeacherInviteCode,
  TEACHER_INVITE_CODE_MAX_SUBMITTED_LENGTH
} from "@/lib/teacherInviteCodeContract";

export type TeacherInviteCodeVerdict =
  | { status: "accepted" }
  | {
      status: "rejected";
      reason: "registration-closed" | "code-required" | "code-invalid";
    };

function inviteCodeDigest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function configuredTeacherInviteCodes() {
  const configured = (process.env.TEACHER_INVITE_CODES ?? "")
    .split(/[,\n]/)
    .map((code) => code.trim())
    .filter(Boolean);

  if (configured.length === 0 || configured.some((code) => !isTeacherInviteCode(code))) {
    return [];
  }

  return Array.from(new Set(configured));
}

export function teacherSelfRegistrationConfigured() {
  return configuredTeacherInviteCodes().length > 0;
}

export function verifyTeacherInviteCode(submittedCode: unknown): TeacherInviteCodeVerdict {
  const configured = configuredTeacherInviteCodes();
  if (configured.length === 0) {
    return { status: "rejected", reason: "registration-closed" };
  }

  if (typeof submittedCode === "string" && submittedCode.length > TEACHER_INVITE_CODE_MAX_SUBMITTED_LENGTH) {
    return { status: "rejected", reason: "code-invalid" };
  }

  const code = typeof submittedCode === "string" ? submittedCode.trim() : "";
  if (!code) return { status: "rejected", reason: "code-required" };
  if (!isTeacherInviteCode(code)) return { status: "rejected", reason: "code-invalid" };

  const submittedDigest = inviteCodeDigest(code);
  const matched = configured.reduce(
    (accepted, candidate) => (
      timingSafeEqual(submittedDigest, inviteCodeDigest(candidate)) || accepted
    ),
    false
  );

  return matched ? { status: "accepted" } : { status: "rejected", reason: "code-invalid" };
}
