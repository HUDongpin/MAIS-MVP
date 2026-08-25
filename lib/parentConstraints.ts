export const guardianInviteTokenPrefix = "MAIS-";
export const guardianInviteTokenHexLength = 24;
export const guardianInviteTokenLength = guardianInviteTokenPrefix.length + guardianInviteTokenHexLength;
export const guardianInviteTtlMs = 24 * 60 * 60 * 1000;
export const guardianInviteTokenPattern = /^MAIS-[A-F0-9]{24}$/;

// Kept as the public input bound used by the parent form. The exact accepted
// format is intentionally stricter and is shared by every server consumer.
export const parentInviteCodeMaxLength = guardianInviteTokenLength;
export const parentMessageSubjectMaxLength = 160;
export const parentMessageBodyMaxLength = 2000;

export function normalizeGuardianInviteToken(value: string) {
  return value.trim().toUpperCase();
}

export function isValidGuardianInviteToken(value: string) {
  return guardianInviteTokenPattern.test(normalizeGuardianInviteToken(value));
}

export function isWithinParentTextLimit(value: string, maxLength: number) {
  return value.length <= maxLength;
}
