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
let openedDatabasePath: string | null = null;

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

function getDatabase() {
  const targetPath = resolveDatabasePath();
  if (database && openedDatabasePath === targetPath) return database;

  database?.close();
  database = new DatabaseSync(targetPath);
  openedDatabasePath = targetPath;
  database.exec(`
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
  openedDatabasePath = null;
}
