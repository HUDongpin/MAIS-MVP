import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { validateIsolationReceipt } from "./isolation-harness.mjs";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./run-isolation-proof.mjs", import.meta.url));
const ROLE_IDS = [
  "answer-blind-solver",
  "tool-verifier",
  "adversarial-grader",
  "bilingual-curriculum-critic",
  "evidence-verifier"
];

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mais-f2-r-isolation-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("CLI writes a validated five-role deny-default candidate receipt", async (t) => {
  if (process.platform !== "darwin") return t.skip("Seatbelt integration proof is macOS-specific.");
  try {
    await access("/usr/bin/sandbox-exec");
  } catch {
    return t.skip("sandbox-exec is unavailable on this host.");
  }
  const directory = await temporaryDirectory(t);
  const outputPath = path.join(directory, "isolation-receipt.json");
  const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, "--output", outputPath]);

  assert.equal(stderr, "");
  assert.match(stdout, /candidate-only.*five-role.*formal execution remains disabled/i);
  const receipt = JSON.parse(await readFile(outputPath, "utf8"));
  const publicManifest = JSON.parse(await readFile(path.join(path.dirname(scriptPath), "public-manifest.json"), "utf8"));
  assert.equal(receipt.candidateSetSha256, publicManifest.candidateSetSha256);
  assert.ok(receipt.roles.every((role) => role.childProcessSpawnDenied === true));
  assert.deepEqual(validateIsolationReceipt(receipt, { expectedRoleIds: ROLE_IDS, candidateSetSha256: publicManifest.candidateSetSha256 }), []);
});

test("CLI rejects formal, live-provider, production, and missing-output requests before probing", async () => {
  const cases = [
    ["--formal-run"],
    ["--live-provider"],
    ["--production"],
    []
  ];
  for (const args of cases) {
    await assert.rejects(
      execFileAsync(process.execPath, [scriptPath, ...args]),
      (error) => {
        assert.equal(error.code, 2);
        assert.match(error.stderr, /not authorized|requires/i);
        return true;
      }
    );
  }
});
