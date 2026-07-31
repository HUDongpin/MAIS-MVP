/**
 * Client-visible contract for account deletion (`DELETE /api/account`).
 *
 * Lives in `lib/` rather than `lib/server/` because both the route handler and
 * the deletion page import it — the confirmation phrase must not drift between
 * the form that asks for it and the endpoint that checks it.
 */

/**
 * The exact phrase a requester types to confirm erasure.
 *
 * Deliberately NOT translated. A localized phrase would mean the endpoint had
 * to accept several accepted strings, widening the surface of the one control
 * standing between a mis-click and an irreversible deletion. The page presents
 * it as copyable literal text instead, which works the same in any language.
 */
export const ACCOUNT_ERASURE_CONFIRMATION_PHRASE = "DELETE MY DATA";

export type AccountErasureErrorCode =
  | "confirmation-required"
  | "subject-not-found"
  | "requester-not-found"
  | "not-authorized"
  | "seeded-account-protected"
  | "media-erasure-failed"
  | "rate-limited"
  | "network"
  | "unknown";

export type AccountErasureReceipt = {
  subjectId: string;
  subjectRole: string;
  basis: string;
  erasedAt: string;
  deleted: Record<string, number>;
  anonymised: Record<string, number>;
  mediaObjectsDeleted: number;
};

/**
 * Per-user data cached in the browser, which the server-side erasure cannot
 * reach. On a shared classroom device this would otherwise outlive the account.
 *
 * User-scoped keys across the app consistently embed the user id
 * (`mais-lesson-entry-target:<id>:<grade>`, `hk-math-game-best:<id>`,
 * `hk-math-game-sound:<id>`, `mais:viz-explored:<id>:<module>`, …), so matching
 * on the id catches them without this module having to track every producer —
 * a list that would silently rot as features are added.
 *
 * Pure over a key list so it can be tested without a browser.
 */
export function localKeysToClearForErasedUser(keys: readonly string[], userId: string) {
  if (!userId) return [];
  return keys.filter((key) => key.includes(userId) || GLOBAL_SESSION_KEYS.has(key));
}

/** Un-scoped keys that hold the signed-in user's state regardless of id. */
const GLOBAL_SESSION_KEYS = new Set([
  "hk-math-user",
  "hk-math-mistakes",
  "hk-math-theme",
  "hk-math-language",
  "hk-math-grade"
]);

/** Clears the erased user's cached data from both web storages. */
export function clearLocalDataForErasedUser(userId: string) {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keys = Object.keys(storage);
      localKeysToClearForErasedUser(keys, userId).forEach((key) => storage.removeItem(key));
    } catch {
      // Storage can throw in private-browsing modes; erasure already succeeded
      // on the server, so this must not surface as a failed deletion.
    }
  }
}
