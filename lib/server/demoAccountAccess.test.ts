import assert from "node:assert/strict";
import test from "node:test";
import { demoAccountsEnabled, internalFastLoginEnabled, resolveDemoPassword } from "./demoAccountAccess";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function withEnv(patch: Record<string, string | undefined>, body: () => void) {
  const previous = Object.fromEntries(Object.keys(patch).map((key) => [key, process.env[key]]));
  try {
    Object.entries(patch).forEach(([key, value]) => restoreEnv(key, value));
    body();
  } finally {
    Object.entries(previous).forEach(([key, value]) => restoreEnv(key, value));
  }
}

test("demo accounts default off for production builds and on for local development", () => {
  withEnv({ HK_MATH_ENABLE_DEMO_USER: undefined, NODE_ENV: "production", VERCEL_ENV: undefined }, () => {
    assert.equal(demoAccountsEnabled(), false);
  });

  withEnv({ HK_MATH_ENABLE_DEMO_USER: undefined, NODE_ENV: "development", VERCEL_ENV: "production" }, () => {
    assert.equal(demoAccountsEnabled(), false);
  });

  withEnv({ HK_MATH_ENABLE_DEMO_USER: undefined, NODE_ENV: "development", VERCEL_ENV: undefined }, () => {
    assert.equal(demoAccountsEnabled(), true);
  });
});

test("an explicit flag beats the environment default in both directions", () => {
  withEnv({ HK_MATH_ENABLE_DEMO_USER: "true", NODE_ENV: "production", VERCEL_ENV: "production" }, () => {
    assert.equal(demoAccountsEnabled(), true);
  });

  withEnv({ HK_MATH_ENABLE_DEMO_USER: "false", NODE_ENV: "development", VERCEL_ENV: undefined }, () => {
    assert.equal(demoAccountsEnabled(), false);
  });
});

test("the internal fast login stays off unless it is named, including locally", () => {
  withEnv({ HK_MATH_ENABLE_INTERNAL_FAST_LOGIN: undefined, NODE_ENV: "development" }, () => {
    assert.equal(internalFastLoginEnabled(), false);
  });

  withEnv({ HK_MATH_ENABLE_INTERNAL_FAST_LOGIN: "true", NODE_ENV: "production" }, () => {
    assert.equal(internalFastLoginEnabled(), true);
  });
});

test("HK_MATH_DEMO_PASSWORD is authoritative, and the published password is never the fallback when demo access is off", () => {
  withEnv(
    { HK_MATH_DEMO_PASSWORD: "  chosen-by-the-owner  ", HK_MATH_ENABLE_DEMO_USER: "true", NODE_ENV: "development" },
    () => {
      assert.equal(resolveDemoPassword(), "chosen-by-the-owner");
    }
  );

  withEnv({ HK_MATH_DEMO_PASSWORD: undefined, HK_MATH_ENABLE_DEMO_USER: "true", NODE_ENV: "development" }, () => {
    assert.equal(resolveDemoPassword(), "12345");
  });

  withEnv(
    {
      HK_MATH_DEMO_PASSWORD: undefined,
      HK_MATH_ENABLE_DEMO_USER: undefined,
      NODE_ENV: "production",
      VERCEL_ENV: undefined,
      AUTH_SESSION_SECRET: "demo-account-access-test-secret"
    },
    () => {
      const locked = resolveDemoPassword();
      assert.notEqual(locked, "12345");
      assert.ok(locked.length > 20);
      // Stability matters: the seed sync re-hashes whenever the password stops
      // matching, so a value that moved between calls would rewrite every seed row
      // on every cold start.
      assert.equal(resolveDemoPassword(), locked);
    }
  );
});
