import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PRODUCTION_ENTRYPOINTS_V5_R6,
} from "./execution-evidence-v5-r6.mjs";
import {
  collectFilesystemSourceClosureV5R6,
  importSpecifiersV5R6,
} from "./source-closure-v5-r6.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const packageRoot = "coordination/content-qa/mais-natural-ca60-v1/";

test("V5-R6 source scanner recognizes static, side-effect, and literal dynamic imports only", () => {
  assert.deepEqual(importSpecifiersV5R6(`
    import x from "./x.mjs";
    import "./side-effect.mjs";
    const y = import("./dynamic.json");
    const ignored = import(variable);
  `), ["./dynamic.json", "./side-effect.mjs", "./x.mjs"]);
});

test("registered V5-R6 production entrypoints have one deterministic, complete transitive filesystem closure", async () => {
  const first = await collectFilesystemSourceClosureV5R6({ repoRoot, entryPoints: PRODUCTION_ENTRYPOINTS_V5_R6 });
  const second = await collectFilesystemSourceClosureV5R6({ repoRoot, entryPoints: [...PRODUCTION_ENTRYPOINTS_V5_R6].reverse() });
  assert.deepEqual(second, first);
  assert.ok(first.paths.length > PRODUCTION_ENTRYPOINTS_V5_R6.length);
  assert.ok(first.importEdgeCount >= first.paths.length - 1);
  for (const entrypoint of PRODUCTION_ENTRYPOINTS_V5_R6) assert.ok(first.paths.includes(entrypoint));
  for (const required of [
    `${packageRoot}guarded-provider-attempt-v5-r6.mjs`,
    `${packageRoot}raw-response-custody-v5-r6.mjs`,
    `${packageRoot}route-evidence-custody-v5-r6.mjs`,
    `${packageRoot}runner-v5-r6-cli.mjs`,
    `${packageRoot}runner-v5-r6-runtime.mjs`,
    `${packageRoot}schemas/ProviderAuthorizationV5.schema.json`,
    `${packageRoot}schemas/ResolvedProviderAttemptReceiptV1.schema.json`,
  ]) assert.ok(first.paths.includes(required), `${required} is outside the production closure`);
  assert.equal(first.paths.some((sourcePath) => sourcePath.endsWith(".test.mjs")), false);
  assert.equal(first.paths.some((sourcePath) => sourcePath.includes("runner-v5-r6-test-fixtures")), false);
});

test("unresolved and escaping relative imports fail closed", async () => {
  const files = new Map([
    ["fixture/entry.mjs", Buffer.from(`import "./missing.mjs";`)],
  ]);
  await assert.rejects(() => import("./source-closure-v5-r6.mjs").then(({ collectTransitiveSourceClosureV5R6 }) =>
    collectTransitiveSourceClosureV5R6({
      entryPoints: ["fixture/entry.mjs"],
      exists: async (sourcePath) => files.has(sourcePath),
      readBytes: async (sourcePath) => files.get(sourcePath),
    })), /unresolved relative import/iu);
  const escaping = new Map([
    ["entry.mjs", Buffer.from(`import "../outside.mjs";`)],
  ]);
  await assert.rejects(() => import("./source-closure-v5-r6.mjs").then(({ collectTransitiveSourceClosureV5R6 }) =>
    collectTransitiveSourceClosureV5R6({
      entryPoints: ["entry.mjs"],
      exists: async (sourcePath) => escaping.has(sourcePath),
      readBytes: async (sourcePath) => escaping.get(sourcePath),
    })), /unsafe relative import/iu);
});
