import { execFile } from "node:child_process";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import type { Question } from "@/types";

const execFileAsync = promisify(execFile);

async function gitOutput(sourceRoot: string, args: string[]) {
  try {
    const result = await execFileAsync("git", ["-C", sourceRoot, ...args], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024
    });
    return result.stdout.trim();
  } catch {
    throw new Error("Could not verify the Hong Kong question-history source as a Git checkout.");
  }
}

async function assertLockedCleanSource(sourceRoot: string, expectedCommit: string) {
  if (!/^[0-9a-f]{40}$/.test(expectedCommit)) {
    throw new Error("Expected commit must be an exact 40-character lowercase Git SHA.");
  }

  const resolvedSourceRoot = await realpath(path.resolve(sourceRoot));
  const repositoryRoot = await realpath(await gitOutput(resolvedSourceRoot, ["rev-parse", "--show-toplevel"]));
  if (resolvedSourceRoot !== repositoryRoot) {
    throw new Error("Question-history source root must be the exact Git checkout root.");
  }

  const actualCommit = await gitOutput(resolvedSourceRoot, ["rev-parse", "--verify", "HEAD"]);
  if (actualCommit !== expectedCommit) {
    throw new Error(`Question-history source HEAD does not match expected commit ${expectedCommit}.`);
  }

  const status = await gitOutput(resolvedSourceRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) {
    const changedPathCount = status.split("\n").filter(Boolean).length;
    throw new Error(
      `Question-history source must be clean before snapshot generation (${changedPathCount} changed paths).`
    );
  }

  return resolvedSourceRoot;
}

async function main() {
  const [sourceRoot, outputPath, expectedCommit] = process.argv.slice(2);
  if (!sourceRoot || !outputPath || !expectedCommit) {
    throw new Error("Usage: generate-hk-question-history-snapshot <source-root> <output-path> <expected-commit>");
  }

  const verifiedSourceRoot = await assertLockedCleanSource(sourceRoot, expectedCommit);
  const sourceModule = path.join(verifiedSourceRoot, "data/questions.ts");
  const loaded = await import(`${pathToFileURL(sourceModule).href}?history-snapshot=${encodeURIComponent(expectedCommit)}`) as {
    questions: Question[];
  };
  const questions = loaded.questions.filter((question) => question.curriculumTrack === "HK");
  const payload = {
    schemaVersion: 1,
    sourceCommit: expectedCommit,
    generatedAt: null,
    questions
  };

  const resolvedOutputPath = path.resolve(outputPath);
  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`wrote ${questions.length} Hong Kong historical questions from ${expectedCommit}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
