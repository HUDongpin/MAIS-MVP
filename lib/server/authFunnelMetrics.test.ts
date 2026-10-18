import assert from "node:assert/strict";
import { chmodSync, existsSync, rmSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import {
  authFunnelRetentionDays,
  isValidAuthFunnelEvent,
  maxAuthFunnelBatchSize,
  readAuthFunnelCounters,
  recordAuthFunnelEvents,
  resetAuthFunnelMetricsForTests
} from "./authFunnelMetrics";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

async function withTempFunnelDatabase(run: () => void | Promise<void>) {
  const previousPath = process.env.AUTH_FUNNEL_DB_PATH;
  const dir = await mkdtemp(path.join(tmpdir(), "mais-auth-funnel-"));
  process.env.AUTH_FUNNEL_DB_PATH = path.join(dir, "funnel.sqlite");
  resetAuthFunnelMetricsForTests();

  try {
    await run();
  } finally {
    resetAuthFunnelMetricsForTests();
    restoreEnv("AUTH_FUNNEL_DB_PATH", previousPath);
    await rm(dir, { recursive: true, force: true });
  }
}

describe("auth funnel metrics", { concurrency: false }, () => {
test("event validation accepts the closed vocabulary and rejects everything else", () => {
  assert.equal(isValidAuthFunnelEvent({ event: "login_submit", detail: "credentials:success" }), true);
  assert.equal(isValidAuthFunnelEvent({ event: "login_submit", detail: "demo-cta:pending_curriculum" }), true);
  assert.equal(isValidAuthFunnelEvent({ event: "login_google_start", detail: "teacher" }), true);
  assert.equal(isValidAuthFunnelEvent({ event: "register_step", detail: "curriculum" }), true);
  assert.equal(isValidAuthFunnelEvent({ event: "register_submit", detail: "student:duplicate" }), true);

  assert.equal(isValidAuthFunnelEvent({ event: "login_submit", detail: "credentials:hacked" }), false);
  assert.equal(isValidAuthFunnelEvent({ event: "unknown_event", detail: "credentials:success" }), false);
  assert.equal(isValidAuthFunnelEvent({ event: "login_submit", detail: "<script>" }), false);
  assert.equal(isValidAuthFunnelEvent({ event: "login_submit" }), false);
  assert.equal(isValidAuthFunnelEvent("login_submit"), false);
  assert.equal(isValidAuthFunnelEvent(null), false);
});

test("recording aggregates same-day events into counters and drops invalid entries", async () => {
  await withTempFunnelDatabase(() => {
    const now = new Date("2026-07-19T10:00:00Z");
    const accepted = recordAuthFunnelEvents(
      [
        { event: "login_submit", detail: "credentials:success" },
        { event: "login_submit", detail: "credentials:success" },
        { event: "login_submit", detail: "credentials:invalid" },
        { event: "not_a_real_event", detail: "credentials:success" }
      ],
      now
    );
    assert.equal(accepted, 3);

    const rows = readAuthFunnelCounters(7, now).map((row) => ({ ...row }));
    assert.deepEqual(rows, [
      { day: "2026-07-19", event: "login_submit", detail: "credentials:invalid", count: 1 },
      { day: "2026-07-19", event: "login_submit", detail: "credentials:success", count: 2 }
    ]);
  });
});

test("batch size is capped", async () => {
  await withTempFunnelDatabase(() => {
    const now = new Date("2026-07-19T10:00:00Z");
    const oversized = Array.from({ length: maxAuthFunnelBatchSize + 5 }, () => ({
      event: "register_step",
      detail: "account"
    }));
    const accepted = recordAuthFunnelEvents(oversized, now);
    assert.equal(accepted, maxAuthFunnelBatchSize);

    const rows = readAuthFunnelCounters(1, now);
    assert.equal(rows[0]?.count, maxAuthFunnelBatchSize);
  });
});

test("read window filters by day and retention prunes old counters", async () => {
  await withTempFunnelDatabase(() => {
    const oldDay = new Date("2026-01-01T10:00:00Z");
    const recentDay = new Date("2026-07-18T10:00:00Z");
    const today = new Date("2026-07-19T10:00:00Z");

    recordAuthFunnelEvents([{ event: "register_submit", detail: "student:success" }], oldDay);
    recordAuthFunnelEvents([{ event: "register_submit", detail: "student:success" }], recentDay);

    const windowed = readAuthFunnelCounters(1, recentDay);
    assert.equal(windowed.length, 1);
    assert.equal(windowed[0]?.day, "2026-07-18");

    const wide = readAuthFunnelCounters(90, recentDay);
    assert.equal(wide.length, 1, "rows older than the retention window are not readable");

    recordAuthFunnelEvents([{ event: "register_submit", detail: "student:error" }], today);
    const afterPrune = readAuthFunnelCounters(90, today);
    const days = afterPrune.map((row) => row.day);
    assert.equal(days.includes("2026-01-01"), false, `prune removed days older than ${authFunnelRetentionDays}d`);
    assert.equal(days.includes("2026-07-18"), true);
    assert.equal(days.includes("2026-07-19"), true);
  });
});

test("recording creates a missing parent directory instead of failing the beacon write", async () => {
  const previousPath = process.env.AUTH_FUNNEL_DB_PATH;
  const root = await mkdtemp(path.join(tmpdir(), "mais-auth-funnel-missing-"));
  const databasePath = path.join(root, "not-created-yet", "funnel.sqlite");
  process.env.AUTH_FUNNEL_DB_PATH = databasePath;
  resetAuthFunnelMetricsForTests();

  try {
    assert.equal(existsSync(path.dirname(databasePath)), false);
    const accepted = recordAuthFunnelEvents([{ event: "register_step", detail: "account" }]);
    assert.equal(accepted, 1);
    const rows = readAuthFunnelCounters(1);
    assert.equal(rows[0]?.event, "register_step");
    assert.equal(rows[0]?.detail, "account");
    assert.equal(rows[0]?.count, 1);
  } finally {
    resetAuthFunnelMetricsForTests();
    restoreEnv("AUTH_FUNNEL_DB_PATH", previousPath);
    await rm(root, { recursive: true, force: true });
  }
});

test("Vercel relocates the funnel file when the main database directory is not writable", async () => {
  const previous = {
    AUTH_FUNNEL_DB_PATH: process.env.AUTH_FUNNEL_DB_PATH,
    HK_MATH_DB_PATH: process.env.HK_MATH_DB_PATH,
    HK_MATH_DB_DIR: process.env.HK_MATH_DB_DIR,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV
  };
  const locked = await mkdtemp(path.join(tmpdir(), "mais-auth-funnel-locked-"));
  rmSync(path.join(tmpdir(), "hk-math-lab"), { recursive: true, force: true });
  chmodSync(locked, 0o555);
  delete process.env.AUTH_FUNNEL_DB_PATH;
  delete process.env.HK_MATH_DB_DIR;
  delete process.env.VERCEL_ENV;
  process.env.VERCEL = "1";
  process.env.HK_MATH_DB_PATH = path.join(locked, "hk-math-db.sqlite");
  resetAuthFunnelMetricsForTests();

  try {
    const accepted = recordAuthFunnelEvents([{ event: "register_step", detail: "curriculum" }]);
    assert.equal(accepted, 1);
    assert.equal(existsSync(path.join(locked, "auth-funnel-metrics.sqlite")), false);
    const rows = readAuthFunnelCounters(1);
    assert.equal(rows.some((row) => row.event === "register_step" && row.detail === "curriculum" && row.count === 1), true);
  } finally {
    resetAuthFunnelMetricsForTests();
    chmodSync(locked, 0o755);
    await rm(locked, { recursive: true, force: true });
    rmSync(path.join(tmpdir(), "hk-math-lab"), { recursive: true, force: true });
    restoreEnv("AUTH_FUNNEL_DB_PATH", previous.AUTH_FUNNEL_DB_PATH);
    restoreEnv("HK_MATH_DB_PATH", previous.HK_MATH_DB_PATH);
    restoreEnv("HK_MATH_DB_DIR", previous.HK_MATH_DB_DIR);
    restoreEnv("VERCEL", previous.VERCEL);
    restoreEnv("VERCEL_ENV", previous.VERCEL_ENV);
  }
});

test("an explicit funnel path is not relocated when its directory is not writable", async () => {
  const previous = {
    AUTH_FUNNEL_DB_PATH: process.env.AUTH_FUNNEL_DB_PATH,
    VERCEL: process.env.VERCEL
  };
  const locked = await mkdtemp(path.join(tmpdir(), "mais-auth-funnel-explicit-"));
  chmodSync(locked, 0o555);
  process.env.VERCEL = "1";
  process.env.AUTH_FUNNEL_DB_PATH = path.join(locked, "funnel.sqlite");
  resetAuthFunnelMetricsForTests();

  try {
    assert.throws(
      () => recordAuthFunnelEvents([{ event: "register_step", detail: "details" }]),
      /unable to open database file/u
    );
  } finally {
    resetAuthFunnelMetricsForTests();
    chmodSync(locked, 0o755);
    await rm(locked, { recursive: true, force: true });
    restoreEnv("AUTH_FUNNEL_DB_PATH", previous.AUTH_FUNNEL_DB_PATH);
    restoreEnv("VERCEL", previous.VERCEL);
  }
});
});
