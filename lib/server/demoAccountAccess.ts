import { createHash, randomBytes } from "node:crypto";

/**
 * Single source of truth for whether the hardcoded demo/example credentials may
 * authenticate.
 *
 * Before this module the answer was "always, everywhere": `getDemoPassword()` in
 * userStore.ts returned the literal "12345" regardless of environment, the
 * internal California fast-login seeds compared against that same literal with no
 * gate at all, and `HK_MATH_DEMO_PASSWORD` — documented in .env.local.example
 * since the seeds were added — was never read by any code path. An owner who set
 * it believed they had changed the password while "12345" kept working, which is
 * worse than no knob at all.
 *
 * Both switches below are opt-in by environment, never by build accident.
 */

/** The password printed on the login page's example-account chips. */
export const displayedDemoPassword = "12345";

function readFlag(name: string) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function isProductionRuntime() {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/**
 * Seeded demo accounts (the HK / Mainland / US example students and teachers, plus
 * the fabricated classroom data that hangs off them).
 *
 * Unset means "on for local development, off for any production build": a Vercel
 * production deployment must set HK_MATH_ENABLE_DEMO_USER=true to opt back in.
 * The previous default was the inverse — on unless explicitly set to "false" —
 * so every production deploy shipped them.
 */
export function demoAccountsEnabled() {
  return readFlag("HK_MATH_ENABLE_DEMO_USER") ?? !isProductionRuntime();
}

/**
 * The internal California fast-login path bypasses the user store entirely and
 * mints a session straight from an in-memory seed list, so it stays off unless a
 * deployment asks for it by name — including in local development, where the
 * regular seeded accounts already cover the same journeys.
 */
export function internalFastLoginEnabled() {
  return readFlag("HK_MATH_ENABLE_INTERNAL_FAST_LOGIN") === true;
}

let cachedLockedPassword: string | null = null;
let cachedLockedPasswordKey: string | null = null;
let processEntropy: string | null = null;

/**
 * Deployment-stable value that no one can guess. It is the seeded accounts' password
 * when demo access is switched off, and it is also what a *retired* seed row is
 * locked to even while demo access is on — a deployment that keeps the demo students
 * but drops the internal California accounts must not leave those two on "12345".
 * Stability matters:
 * `syncAuthDemoAccounts` re-hashes the seed password whenever it stops matching,
 * so a per-boot random value would rewrite every seed row on every cold start.
 *
 * When no session secret is configured there is nothing stable to derive from, so
 * fall back to per-process entropy — that configuration cannot mint sessions at
 * all (see `sessionSecretMissingResponse`), so the churn is unreachable.
 */
export function lockedExampleAccountPassword() {
  const secret = process.env.AUTH_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  const key = secret || (processEntropy ??= randomBytes(32).toString("base64url"));
  if (cachedLockedPassword && cachedLockedPasswordKey === key) return cachedLockedPassword;

  cachedLockedPasswordKey = key;
  cachedLockedPassword = `locked:${createHash("sha256").update(`mais-demo-account-lock:${key}`).digest("base64url")}`;
  return cachedLockedPassword;
}

/**
 * Password the seeded example accounts are provisioned with, and the one the
 * storage-free example-login fast paths compare against.
 *
 * `HK_MATH_DEMO_PASSWORD` is now authoritative when set. With no override and demo
 * access disabled the seeds are provisioned with `lockedExampleAccountPassword()`, so rows
 * left behind by an earlier deploy that *did* have demo access on stop being a
 * login the moment the flag flips — the accounts survive for referential
 * integrity, the credential does not.
 */
export function resolveDemoPassword() {
  const configured = process.env.HK_MATH_DEMO_PASSWORD?.trim();
  if (configured) return configured;
  if (demoAccountsEnabled()) return displayedDemoPassword;
  return lockedExampleAccountPassword();
}

/**
 * Deterministic salt for the locked password.
 *
 * The lock check runs inside database normalization, which is on the read path. A
 * random salt would make "is this row already locked?" a 120k-iteration PBKDF2
 * verify per retired account per normalize — and worse, each process would derive a
 * different hash for the same password and re-lock every row on every cold start.
 * Deriving the salt makes the credential identical everywhere, so the check is a
 * string comparison and the write happens exactly once.
 *
 * Salting buys nothing here in any case: the value being hashed is already a
 * 256-bit digest of the deployment secret, not a human-chosen password.
 */
export function lockedExampleAccountSalt() {
  return createHash("sha256")
    .update(`mais-demo-account-lock-salt:${lockedExampleAccountPassword()}`)
    .digest("hex")
    .slice(0, 32);
}
