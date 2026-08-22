import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const generatorPath = path.join(
  process.cwd(),
  "coordination/content-qa/generate-hk-question-history-snapshot.ts"
);

async function git(sourceRoot: string, args: string[]) {
  const result = await execFileAsync("git", ["-C", sourceRoot, ...args], { encoding: "utf8" });
  return result.stdout.trim();
}

async function createCleanQuestionSource() {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "mais-hk-history-generator-"));
  const sourceRoot = path.join(fixtureRoot, "source");
  await mkdir(path.join(sourceRoot, "data"), { recursive: true });
  await writeFile(
    path.join(sourceRoot, "data/questions.ts"),
    `export const questions = [
      { id: "hk-old", curriculumTrack: "HK" },
      { id: "us-old", curriculumTrack: "US_CA_MATH" }
    ];\n`,
    "utf8"
  );
  await git(sourceRoot, ["init", "--quiet", "--initial-branch=main"]);
  await git(sourceRoot, ["config", "user.name", "Snapshot Test"]);
  await git(sourceRoot, ["config", "user.email", "snapshot-test@example.invalid"]);
  await git(sourceRoot, ["add", "data/questions.ts"]);
  await git(sourceRoot, ["commit", "--quiet", "-m", "locked question source"]);
  const commit = await git(sourceRoot, ["rev-parse", "HEAD"]);
  return { fixtureRoot, sourceRoot, commit };
}

async function runGenerator(sourceRoot: string, outputPath: string, expectedCommit: string) {
  return execFileAsync(
    process.execPath,
    ["--import", "tsx", generatorPath, sourceRoot, outputPath, expectedCommit],
    { cwd: process.cwd(), encoding: "utf8" }
  );
}

test("history snapshot generator accepts only an exact clean source commit", async (t) => {
  const { fixtureRoot, sourceRoot, commit } = await createCleanQuestionSource();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const outputPath = path.join(fixtureRoot, "output", "history.json");

  await runGenerator(sourceRoot, outputPath, commit);
  const payload = JSON.parse(await readFile(outputPath, "utf8")) as {
    sourceCommit: string;
    generatedAt: unknown;
    questions: Array<{ id: string }>;
  };
  assert.equal(payload.sourceCommit, commit);
  assert.equal(payload.generatedAt, null);
  assert.deepEqual(payload.questions.map((question) => question.id), ["hk-old"]);

  await assert.rejects(
    runGenerator(sourceRoot, path.join(fixtureRoot, "wrong-head.json"), "0".repeat(40)),
    /source HEAD does not match expected commit/
  );

  await writeFile(path.join(sourceRoot, "untracked-input.ts"), "export {};\n", "utf8");
  await assert.rejects(
    runGenerator(sourceRoot, path.join(fixtureRoot, "dirty.json"), commit),
    /source must be clean before snapshot generation/
  );
});

test("history snapshot generator rejects abbreviated SHAs and a source subdirectory", async (t) => {
  const { fixtureRoot, sourceRoot, commit } = await createCleanQuestionSource();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

  await assert.rejects(
    runGenerator(sourceRoot, path.join(fixtureRoot, "short-sha.json"), commit.slice(0, 8)),
    /exact 40-character lowercase Git SHA/
  );
  await assert.rejects(
    runGenerator(path.join(sourceRoot, "data"), path.join(fixtureRoot, "subdir.json"), commit),
    /source root must be the exact Git checkout root/
  );
});

