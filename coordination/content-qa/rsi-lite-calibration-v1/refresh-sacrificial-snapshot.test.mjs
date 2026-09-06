import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./refresh-sacrificial-snapshot.mjs", import.meta.url));

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mais-f2-r-public-snapshot-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("CLI atomically refreshes the public F2-R sacrificial snapshot", async (t) => {
  const outputDirectory = await temporaryDirectory(t);
  const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, "--output-dir", outputDirectory]);

  assert.equal(stderr, "");
  assert.match(stdout, /candidate-only.*26 surfaces.*formal execution remains disabled/i);
  const summary = JSON.parse(await readFile(path.join(outputDirectory, "f2-sacrificial-summary.json"), "utf8"));
  const commit = JSON.parse(await readFile(path.join(outputDirectory, "f2-snapshot-commit-manifest.json"), "utf8"));
  assert.equal(summary.protocolVersion, "1.1.1-f2-r");
  assert.equal(summary.receiptCount, 4);
  assert.equal(commit.complete, true);
  assert.equal(commit.formalExecutionAuthorized, false);
});

test("CLI rejects formal, live-provider, production, and deployment requests", async (t) => {
  const outputDirectory = await temporaryDirectory(t);
  for (const flag of ["--formal-run", "--live-provider", "--production", "--deploy"]) {
    await assert.rejects(
      execFileAsync(process.execPath, [scriptPath, "--output-dir", outputDirectory, flag]),
      (error) => {
        assert.equal(error.code, 2);
        assert.match(error.stderr, /not authorized during F2-R/i);
        return true;
      }
    );
  }
});
