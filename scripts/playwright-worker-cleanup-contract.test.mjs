import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

test("Playwright owns and gracefully terminates the Next web server process", async () => {
  const source = await fs.readFile(path.join(repoRoot, "playwright.config.ts"), "utf8");

  assert.match(
    source,
    /`exec env NEXT_DIST_DIR=.*\$\{shellQuote\(process\.execPath\)\} node_modules\/next\/dist\/bin\/next start/s,
    "the final shell command must exec the Next CLI directly"
  );
  assert.match(
    source,
    /gracefulShutdown:\s*\{\s*signal:\s*"SIGTERM",\s*timeout:\s*5_000\s*\}/,
    "Playwright must terminate its web server with a bounded SIGTERM grace period"
  );
  assert.doesNotMatch(
    source,
    /npm run start -- --hostname/,
    "an npm wrapper can orphan next-server after the Playwright worker exits"
  );
  assert.match(source, /workers:\s*1/, "the release harness must keep its explicit single-worker contract");
});
