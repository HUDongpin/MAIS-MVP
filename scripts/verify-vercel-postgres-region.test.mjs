import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  classifyPostgresUrl,
  summarizeVerification
} from "./verify-vercel-postgres-region.mjs";

test("classifies Neon US West Oregon POSTGRES_URL without returning the raw URL", () => {
  const rawUrl = "postgresql://user:password@ep-example-pooler.us-west-2.aws.neon.tech/db?sslmode=require";
  const classification = classifyPostgresUrl(rawUrl);

  assert.equal(classification.provider, "neon");
  assert.equal(classification.region, "aws-us-west-2");
  assert.equal(classification.usWestNeon, true);
  assert.equal(JSON.stringify(classification).includes(rawUrl), false);
  assert.equal(JSON.stringify(classification).includes("password"), false);
});

test("classifies non-US-West Neon hosts as not aligned", () => {
  const classification = classifyPostgresUrl(
    "postgresql://user:password@ep-example.us-east-1.aws.neon.tech/db?sslmode=require"
  );

  assert.equal(classification.provider, "neon");
  assert.equal(classification.region, "aws-us-east-1");
  assert.equal(classification.usWestNeon, false);
});

test("summary fails when either Preview or Production is missing", () => {
  const summary = summarizeVerification([
    { target: "preview", status: "verified", usWestNeon: true },
    { target: "production", status: "missing" }
  ]);

  assert.equal(summary.ok, false);
  assert.equal(summary.missingTargets.includes("production"), true);
});

test("process-env mode prints only redacted classification", () => {
  const rawUrl = "postgresql://user:password@ep-example.us-west-2.aws.neon.tech/db?sslmode=require";
  const result = spawnSync(
    process.execPath,
    ["scripts/verify-vercel-postgres-region.mjs", "--from-process-env", "--target", "preview"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        POSTGRES_URL: rawUrl
      }
    }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /"target": "preview"/);
  assert.match(result.stdout, /"region": "aws-us-west-2"/);
  assert.equal(result.stdout.includes(rawUrl), false);
  assert.equal(result.stdout.includes("password"), false);
});
