import { TEACHER_INVITE_CODE_MAX_LENGTH } from "@/lib/teacherInviteCodeContract";

export type RegistrationFailureReason =
  | "duplicate"
  | "invalid"
  | "setup"
  | "error"
  | "teacher-invite";

export const teacherInviteInputAttributes = Object.freeze({
  type: "password" as const,
  autoComplete: "off",
  maxLength: TEACHER_INVITE_CODE_MAX_LENGTH
});

export function buildRegistrationRequestInit(payload: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  };
}

async function registrationErrorCode(response: Response) {
  try {
    const body = await response.clone().json() as { code?: unknown } | null;
    return typeof body?.code === "string" ? body.code : "";
  } catch {
    return "";
  }
}

export async function classifyRegistrationFailure(response: Response): Promise<RegistrationFailureReason> {
  if (response.status === 409) return "duplicate";
  if (response.status === 400) return "invalid";

  if (response.status === 403) {
    return (await registrationErrorCode(response)) === "teacher-invite-denied"
      ? "teacher-invite"
      : "error";
  }

  if (response.status === 503) {
    return (await registrationErrorCode(response)) === "session-secret-missing"
      ? "setup"
      : "error";
  }

  return "error";
}
