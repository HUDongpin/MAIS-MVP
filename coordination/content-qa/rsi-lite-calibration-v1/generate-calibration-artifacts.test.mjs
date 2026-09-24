import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./generate-calibration-artifacts.mjs", import.meta.url));

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mais-rsi-lite-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("CLI writes F1 evidence without disclosing the seed", async (t) => {
  const directory = await temporaryDirectory(t);
  const publicDirectory = path.join(directory, "public");
  const sealedDirectory = path.join(directory, "sealed");
  const seedPath = path.join(sealedDirectory, "randomization-seed.txt");

  const { stdout, stderr } = await execFileAsync(process.execPath, [
    scriptPath,
    "--public-dir", publicDirectory,
    "--sealed-dir", sealedDirectory,
    "--seed-file", seedPath
  ]);

  const seed = (await readFile(seedPath, "utf8")).trim();
  assert.equal(stderr, "");
  assert.equal(stdout.includes(seed), false);
  assert.match(stdout, /candidate-only/);
  assert.match(stdout, /48 sealed packages/);
  assert.ok(await readFile(path.join(publicDirectory, "public-manifest.json"), "utf8"));
  assert.ok(await readFile(path.join(sealedDirectory, "gold-ledger.json"), "utf8"));
});

test("CLI refuses formal, live-provider, production, and deploy flags during F2-R", async (t) => {
  const directory = await temporaryDirectory(t);
  for (const flag of ["--formal-run", "--live-provider", "--production", "--deploy"]) {
    await assert.rejects(
      execFileAsync(process.execPath, [
        scriptPath,
        "--public-dir", path.join(directory, "public"),
        "--sealed-dir", path.join(directory, "sealed"),
        "--seed-file", path.join(directory, "sealed", "seed.txt"),
        flag
      ]),
      (error) => {
        assert.equal(error.code, 2);
        assert.match(error.stderr, /not authorized during F2-R/i);
        return true;
      }
    );
  }
});
