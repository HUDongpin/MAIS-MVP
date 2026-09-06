import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { authorizeCronBearer } from "./cronAuthorization";

const validSecret = "fixture-cron-secret-with-at-least-32-bytes";

test("cron authorization rejects missing, undersized, oversized, padded, and control-bearing configuration", async () => {
  const invalidSecrets: unknown[] = [
    undefined,
    null,
    "",
    "x".repeat(31),
    "x".repeat(513),
    ` ${validSecret}`,
    `${validSecret} `,
    `fixture-cron-secret-with internal-space-and-32-bytes`,
    `fixture-cron-secret-with-tab\tand-32-bytes`,
    `fixture-cron-secret-with-newline\nand-32-bytes`,
    `fixture-cron-secret-with-null\u0000and-32-bytes`,
    `fixture-cron-secret-with-nel\u0085and-32-bytes`
  ];

  for (const configuredSecret of invalidSecrets) {
    assert.equal(
      authorizeCronBearer(`Bearer ${validSecret}`, configuredSecret),
      "unavailable",
      `configuration must fail closed: ${JSON.stringify(configuredSecret)}`
    );
  }

  const source = await readFile(
    path.join(process.cwd(), "lib/server/cronAuthorization.ts"),
    "utf8"
  );
  assert.match(source, /createHash/u);
  assert.match(source, /timingSafeEqual/u);
});

test("cron authorization accepts only the exact case-sensitive Bearer value", () => {
  const invalidAuthorizations = [
    null,
    "",
    validSecret,
    `bearer ${validSecret}`,
    `BEARER ${validSecret}`,
    `Bearer  ${validSecret}`,
    `Bearer ${validSecret} `,
    ` Bearer ${validSecret}`,
    "Bearer wrong-fixture-cron-secret-with-at-least-32-bytes"
  ];

  for (const authorization of invalidAuthorizations) {
    assert.equal(authorizeCronBearer(authorization, validSecret), "unauthorized");
  }
  assert.equal(authorizeCronBearer(`Bearer ${validSecret}`, validSecret), "authorized");
  for (const boundarySecret of ["x".repeat(32), "x".repeat(512)]) {
    assert.equal(
      authorizeCronBearer(`Bearer ${boundarySecret}`, boundarySecret),
      "authorized"
    );
  }
});

test("cron authorization exposes only an opaque decision without the configured secret", () => {
  assert.doesNotMatch(
    JSON.stringify(authorizeCronBearer(`Bearer ${validSecret}`, validSecret)),
    new RegExp(validSecret, "u")
  );
});
