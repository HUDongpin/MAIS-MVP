import { currentConsentPolicyVersion } from "@/lib/legal/policyVersion";
import { parentalConsentRelationships, type ParentalConsentRecord, type ParentalConsentRelationship } from "@/types";

export const guardianNameMaxLength = 120;
export const guardianEmailMaxLength = 254;

export type ParentalConsentInput = {
  acknowledged?: unknown;
  guardianName?: unknown;
  guardianEmail?: unknown;
  relationship?: unknown;
};

export type ParentalConsentParseResult =
  | { status: "ok"; consent: ParentalConsentRecord }
  | { status: "invalid"; reason: ParentalConsentInvalidReason };

export type ParentalConsentInvalidReason =
  | "missing"
  | "not-acknowledged"
  | "guardian-name-required"
  | "relationship-invalid"
  | "guardian-email-invalid";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRelationship = (value: unknown): value is ParentalConsentRelationship =>
  typeof value === "string" && (parentalConsentRelationships as readonly string[]).includes(value);

// Deliberately permissive: this only rejects obviously malformed addresses. The
// address is a contact record for the consent, not an authentication factor.
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Turns an untrusted registration payload into a consent record, or explains why
 * it is not one. Callers must treat "invalid" as a hard registration failure —
 * a child account may not be created without it.
 */
export function parseParentalConsent(input: unknown, grantedAt: string): ParentalConsentParseResult {
  if (!isRecord(input)) return { status: "invalid", reason: "missing" };

  if (input.acknowledged !== true) return { status: "invalid", reason: "not-acknowledged" };

  const guardianName = typeof input.guardianName === "string" ? input.guardianName.trim() : "";
  if (!guardianName || guardianName.length > guardianNameMaxLength) {
    return { status: "invalid", reason: "guardian-name-required" };
  }

  if (!isRelationship(input.relationship)) {
    return { status: "invalid", reason: "relationship-invalid" };
  }

  const rawEmail = typeof input.guardianEmail === "string" ? input.guardianEmail.trim() : "";
  if (rawEmail && (rawEmail.length > guardianEmailMaxLength || !looksLikeEmail(rawEmail))) {
    return { status: "invalid", reason: "guardian-email-invalid" };
  }

  return {
    status: "ok",
    consent: {
      grantedAt,
      guardianName,
      ...(rawEmail ? { guardianEmail: rawEmail } : {}),
      relationship: input.relationship,
      policyVersion: currentConsentPolicyVersion,
      method: input.relationship === "school" ? "school-authorized" : "registration-form"
    }
  };
}

export const parentalConsentErrorMessages: Record<ParentalConsentInvalidReason, string> = {
  missing: "A parent or guardian must give consent before a student account can be created.",
  "not-acknowledged": "The parent or guardian must confirm they have read the privacy policy and give consent.",
  "guardian-name-required": "The name of the consenting parent or guardian is required.",
  "relationship-invalid": "Select how the consenting adult is related to the student.",
  "guardian-email-invalid": "Enter a valid contact email for the consenting parent or guardian."
};
