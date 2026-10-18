import { mkdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";

export type AuthFunnelEventInput = {
  event: string;
  detail: string;
};

export type AuthFunnelCounterRow = {
  day: string;
  event: string;
  detail: string;
  count: number;
};

export const maxAuthFunnelBatchSize = 10;
export const authFunnelRetentionDays = 90;
export const maxAuthFunnelReadDays = 90;

const eventDetailPatterns: Record<string, RegExp> = {
  login_submit: /^(credentials|example-tile|demo-cta):(success|invalid|pending_curriculum|error)$/,
  login_google_start: /^(student|parent|teacher)$/,
  register_step: /^(account|curriculum|grade|details)$/,
  register_submit: /^(student|teacher|parent):(success|duplicate|invalid|error|password_mismatch)$/
};

let database: DatabaseSync | null = null;
let openedForConfiguredPath: string | null = null;

function defaultDatabaseDirectory() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return path.join(tmpdir(), "hk-math-lab");
  }

  return path.join(process.cwd(), ".local");
}

function resolveDatabasePath() {
  const configured = process.env.AUTH_FUNNEL_DB_PATH?.trim();
  if (configured) return path.resolve(configured);

  const mainDbPath = process.env.HK_MATH_DB_PATH?.trim();
  const directory = mainDbPath
    ? path.dirname(path.resolve(mainDbPath))
    : path.resolve(process.env.HK_MATH_DB_DIR ?? defaultDatabaseDirectory());
  return path.join(directory, "auth-funnel-metrics.sqlite");
}

function sqliteCantOpen(error: unknown) {
  if (!(error instanceof Error)) return false;
  const sqliteError = error as Error & { code?: unknown; errcode?: unknown };
  if (sqliteError.code === "ERR_SQLITE_ERROR" && sqliteError.errcode === 14) return true;
  return sqliteError.code === "ENOENT"
    || sqliteError.code === "EACCES"
    || sqliteError.code === "EPERM"
    || sqliteError.code === "EROFS";
}

function openFunnelDatabase(targetPath: string) {
  // node:sqlite does not create parent directories. The Vercel default is
  // /tmp/hk-math-lab, and the Postgres runtime never creates it, so the first
  // signup beacon write throws "unable to open database file".
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const opened = new DatabaseSync(targetPath);
  try {
    opened.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS auth_funnel_daily_counters (
        day TEXT NOT NULL,
        event TEXT NOT NULL,
        detail TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, event, detail)
      );
    `);
  } catch (error) {
    opened.close();
    throw error;
  }
  return opened;
}

function implicitVercelFallbackPath() {
  return path.join(tmpdir(), "hk-math-lab", "auth-funnel-metrics.sqlite");
}

function getDatabase() {
  const configuredPath = resolveDatabasePath();
  if (database && openedForConfiguredPath === configuredPath) return database;

  database?.close();
  database = null;
  openedForConfiguredPath = null;

  try {
    database = openFunnelDatabase(configuredPath);
  } catch (error) {
    const explicitPath = Boolean(process.env.AUTH_FUNNEL_DB_PATH?.trim());
    const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    const fallbackPath = implicitVercelFallbackPath();
    if (
      explicitPath
      || !onVercel
      || path.resolve(fallbackPath) === path.resolve(configuredPath)
      || !sqliteCantOpen(error)
    ) {
      throw error;
    }
    // HK_MATH_DB_PATH can point at the read-only deployment filesystem. The
    // beacon still has to land somewhere writable, and an explicit
    // AUTH_FUNNEL_DB_PATH is never relocated.
    database = openFunnelDatabase(fallbackPath);
  }

  openedForConfiguredPath = configuredPath;
  return database;
}

function utcDay(now: Date) {
  return now.toISOString().slice(0, 10);
}

function utcDayOffset(now: Date, offsetDays: number) {
  const shifted = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return utcDay(shifted);
}

export function isValidAuthFunnelEvent(value: unknown): value is AuthFunnelEventInput {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { event?: unknown; detail?: unknown };
  if (typeof candidate.event !== "string" || typeof candidate.detail !== "string") return false;
  const pattern = eventDetailPatterns[candidate.event];
  return Boolean(pattern && candidate.detail.length <= 64 && pattern.test(candidate.detail));
}

export function recordAuthFunnelEvents(events: readonly AuthFunnelEventInput[], now = new Date()): number {
  const accepted = events.filter(isValidAuthFunnelEvent).slice(0, maxAuthFunnelBatchSize);
  if (accepted.length === 0) return 0;

  const storage = getDatabase();
  const day = utcDay(now);
  const upsert = storage.prepare(`
    INSERT INTO auth_funnel_daily_counters (day, event, detail, count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT (day, event, detail) DO UPDATE SET count = count + 1
  `);
  for (const entry of accepted) {
    upsert.run(day, entry.event, entry.detail);
  }

  storage
    .prepare("DELETE FROM auth_funnel_daily_counters WHERE day < ?")
    .run(utcDayOffset(now, -authFunnelRetentionDays));

  return accepted.length;
}

export function readAuthFunnelCounters(days = 30, now = new Date()): AuthFunnelCounterRow[] {
  const window = Math.min(maxAuthFunnelReadDays, Math.max(1, Math.floor(days)));
  const storage = getDatabase();
  return storage
    .prepare(`
      SELECT day, event, detail, count
      FROM auth_funnel_daily_counters
      WHERE day >= ?
      ORDER BY day DESC, event ASC, detail ASC
    `)
    .all(utcDayOffset(now, -(window - 1))) as AuthFunnelCounterRow[];
}

export function resetAuthFunnelMetricsForTests() {
  database?.close();
  database = null;
  openedForConfiguredPath = null;
}
