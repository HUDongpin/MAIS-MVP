export const TEACHER_INVITE_CODE_PREFIX = "tinv_";
export const TEACHER_INVITE_CODE_HEX_LENGTH = 32;
export const TEACHER_INVITE_CODE_MAX_LENGTH =
  TEACHER_INVITE_CODE_PREFIX.length + TEACHER_INVITE_CODE_HEX_LENGTH;

const teacherInviteCodePattern = /^tinv_[0-9a-f]{32}$/u;

export function isTeacherInviteCode(value: unknown): value is string {
  return typeof value === "string" && teacherInviteCodePattern.test(value);
}
