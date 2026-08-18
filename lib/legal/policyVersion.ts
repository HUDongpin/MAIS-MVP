// Version stamps for the published legal documents.
//
// Consent is only meaningful if you can say what was consented to, so every
// parental-consent record stores the policy version live at the moment it was
// granted. Bump these when the substance of the documents changes — a bump is
// the signal that existing consents may need to be re-collected.

export const privacyPolicyVersion = "2026-08-18";
export const termsOfServiceVersion = "2026-08-18";

/** Recorded on each consent so a later policy change is auditable. */
export const currentConsentPolicyVersion = privacyPolicyVersion;

/**
 * The documents ship as counsel-review drafts. This flag drives the visible
 * banner on /privacy and /terms; flip it when reviewed copy lands so the notice
 * disappears in exactly one place.
 */
export const legalDocumentsAwaitingCounselReview = true;
