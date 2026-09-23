// Version stamps for the published legal documents.
//
// Consent is only meaningful if you can say what was consented to, so every
// parental-consent record stores the policy version live at the moment it was
// granted. Bump these when the substance of the documents changes — a bump is
// the signal that existing consents may need to be re-collected.

export const privacyPolicyVersion = "2026-09-23";
export const termsOfServiceVersion = "2026-09-23";

/** Recorded on each consent so a later policy change is auditable. */
export const currentConsentPolicyVersion = privacyPolicyVersion;

/**
 * The owner confirmed that legal professionals reviewed the final integrated
 * privacy policy and terms. Recheck this status when either document changes.
 */
export const legalDocumentsReviewedByCounsel = true;
