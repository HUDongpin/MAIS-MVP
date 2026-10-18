import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { readAuthFunnelCounters, resetAuthFunnelMetricsForTests } from "@/lib/server/authFunnelMetrics";
import { GET, POST } from "./route";

const endpoint = "https://app.example.test/api/auth/funnel";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("auth funnel route", { concurrency: false }, () => {
  test("anonymous GET does not open the funnel database", async () => {
    const response = await GET(new Request(endpoint));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Not authenticated." });
  });

  test("signup load beacon returns 202 when the Vercel funnel directory does not exist yet", async () => {
    const previous = {
      AUTH_FUNNEL_DB_PATH: process.env.AUTH_FUNNEL_DB_PATH,
      HK_MATH_DB_PATH: process.env.HK_MATH_DB_PATH,
      HK_MATH_DB_DIR: process.env.HK_MATH_DB_DIR,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    };
    const funnelDirectory = path.join(tmpdir(), "hk-math-lab");
    rmSync(funnelDirectory, { recursive: true, force: true });
    delete process.env.AUTH_FUNNEL_DB_PATH;
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_DB_DIR;
    delete process.env.VERCEL_ENV;
    process.env.VERCEL = "1";
    resetAuthFunnelMetricsForTests();

    try {
      const response = await POST(new Request(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: [{ event: "register_step", detail: "account" }] })
      }));

      assert.equal(response.status, 202);
      assert.deepEqual(await response.json(), { accepted: 1 });
      const rows = readAuthFunnelCounters(1);
      assert.equal(
        rows.some((row) => row.event === "register_step" && row.detail === "account" && row.count === 1),
        true
      );
    } finally {
      resetAuthFunnelMetricsForTests();
      rmSync(funnelDirectory, { recursive: true, force: true });
      restoreEnv("AUTH_FUNNEL_DB_PATH", previous.AUTH_FUNNEL_DB_PATH);
      restoreEnv("HK_MATH_DB_PATH", previous.HK_MATH_DB_PATH);
      restoreEnv("HK_MATH_DB_DIR", previous.HK_MATH_DB_DIR);
      restoreEnv("VERCEL", previous.VERCEL);
      restoreEnv("VERCEL_ENV", previous.VERCEL_ENV);
    }
  });
});
