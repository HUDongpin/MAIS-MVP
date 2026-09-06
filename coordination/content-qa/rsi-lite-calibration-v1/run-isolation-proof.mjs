import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { runIsolationMatrix, writeIsolationReceipt } from "./isolation-harness.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const ROLE_IDS = Object.freeze([
  "answer-blind-solver",
  "tool-verifier",
  "adversarial-grader",
  "bilingual-curriculum-critic",
  "evidence-verifier"
]);

class AuthorizationBoundaryError extends Error {}

function optionValue(name, { required = false } = {}) {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    if (required) throw new AuthorizationBoundaryError(`${name} requires a value.`);
    return undefined;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new AuthorizationBoundaryError(`${name} requires a value.`);
  return value;
}

const forbidden = ["--formal-run", "--live-provider", "--production"].find((flag) => process.argv.includes(flag));
if (forbidden) {
  process.stderr.write(`${forbidden} is not authorized during F2-R.\n`);
  process.exitCode = 2;
} else {
  try {
    const outputPath = path.resolve(optionValue("--output", { required: true }));
    if (path.extname(outputPath).toLowerCase() !== ".json") {
      throw new AuthorizationBoundaryError("--output requires a .json receipt path.");
    }
    const publicManifest = JSON.parse(await readFile(path.join(scriptDirectory, "public-manifest.json"), "utf8"));
    const candidateSetSha256 = publicManifest.candidateSetSha256;
    const receipt = await runIsolationMatrix({ repositoryRoot, roleIds: ROLE_IDS, candidateSetSha256 });
    await writeIsolationReceipt(outputPath, receipt, { expectedRoleIds: ROLE_IDS, candidateSetSha256 });
    process.stdout.write("candidate-only: five-role deny-default isolation receipt written; formal execution remains disabled.\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`F2-R isolation proof failed: ${message}\n`);
    process.exitCode = error instanceof AuthorizationBoundaryError ? 2 : 1;
  }
}
