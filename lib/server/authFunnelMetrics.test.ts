import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
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
