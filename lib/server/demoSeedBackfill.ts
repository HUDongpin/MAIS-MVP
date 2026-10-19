export const DEMO_SEED_BACKFILL_ENV_NAME = "MAIS_DEMO_SEED_BACKFILL";

export type DemoSeedBackfillEnv = Record<string, string | undefined>;

function normalizedFlag(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

/** Explicit opt-in. Only `1` and `true` count; `yes`, `on`, and empty do not. */
export function demoSeedBackfillFlagExplicitlyEnabled(value: string | undefined) {
  const flag = normalizedFlag(value);
  return flag === "1" || flag === "true";
}

export function demoSeedBackfillFlagExplicitlyDisabled(value: string | undefined) {
  const flag = normalizedFlag(value);
  return flag === "0" || flag === "false";
}

/**
 * Whether stable-id demo seed rows may be merged into, or initially written to,
 * the persistent data store.
 *
 * Any non-empty `VERCEL_ENV` (production, preview, or another Vercel deployment)
 * refuses the backfill unless `MAIS_DEMO_SEED_BACKFILL` is explicitly `1` or
 * `true`. Preview deployments share the production database, so an unset flag
 * must not write demo rows there. `HK_MATH_ENABLE_DEMO_USER` does not override
 * that refusal.
 *
 * Local, dev, test, and CI leave `VERCEL_ENV` unset and keep the historical
 * backfill. Set `0` or `false` to force the backfill off in those environments.
 */
export function shouldBackfillDemoSeed(env: DemoSeedBackfillEnv = process.env) {
  const explicitlyEnabled = demoSeedBackfillFlagExplicitlyEnabled(env[DEMO_SEED_BACKFILL_ENV_NAME]);
  const vercelEnv = env.VERCEL_ENV?.trim() ?? "";
  if (vercelEnv.length > 0) return explicitlyEnabled;
  if (demoSeedBackfillFlagExplicitlyDisabled(env[DEMO_SEED_BACKFILL_ENV_NAME])) return false;
  if (explicitlyEnabled) return true;
  return true;
}

export function retainRecordsUnlessNewDemoSeed<T>(
  existing: readonly T[] | undefined,
  normalized: readonly T[],
  identity: (record: T) => string,
  demoSeedIdentities: ReadonlySet<string>,
  allowBackfill: boolean
) {
  if (allowBackfill) return [...normalized];
  const stored = new Set((existing ?? []).map(identity));
  return normalized.filter((record) => {
    const key = identity(record);
    return !demoSeedIdentities.has(key) || stored.has(key);
  });
}
