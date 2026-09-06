import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildA18BlindReviewMaterials,
  writeA18BlindReviewMaterials
} from "./a18-blind-review-materials.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const defaultSealedRoot = path.join(repositoryRoot, ".local", "rsi-lite-calibration-v1");
const forbiddenFlags = ["--formal-run", "--live-provider", "--production", "--deploy"];

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a path value.`);
  return path.resolve(value);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main() {
  const requestedForbiddenFlag = forbiddenFlags.find((flag) => process.argv.includes(flag));
  if (requestedForbiddenFlag) {
    process.stderr.write(`${requestedForbiddenFlag} is not authorized by F2-R.\n`);
    process.exitCode = 2;
    return;
  }

  const sealedRoot = optionValue("--sealed-root", defaultSealedRoot);
  const publicManifestPath = optionValue("--public-manifest", path.join(scriptDirectory, "public-manifest.json"));
  const sealedManifestPath = optionValue("--sealed-manifest", path.join(sealedRoot, "sealed-manifest.json"));
  const goldLedgerPath = optionValue("--gold-ledger", path.join(sealedRoot, "gold-ledger.json"));
  const packageDirectory = optionValue("--package-dir", path.join(sealedRoot, "packages"));
  const publicRegistrationPath = optionValue(
    "--public-registration",
    path.join(scriptDirectory, "review-gates", "a18-blind-review-registration-v2.json")
  );
  const restrictedRoot = optionValue(
    "--restricted-root",
    path.join(sealedRoot, "a18-independent-human-review-v2")
  );

  const packageFiles = (await readdir(packageDirectory)).filter((file) => file.endsWith(".json")).sort();
  const [sealedManifest, goldLedger, publicManifest, packages] = await Promise.all([
    readJson(sealedManifestPath),
    readJson(goldLedgerPath),
    readJson(publicManifestPath),
    Promise.all(packageFiles.map((file) => readJson(path.join(packageDirectory, file))))
  ]);
  const materials = buildA18BlindReviewMaterials({ sealedManifest, goldLedger, publicManifest, packages });
  await writeA18BlindReviewMaterials({ materials, publicRegistrationPath, restrictedRoot });
  process.stdout.write(
    `A18 blind-review inputs frozen: ${materials.registration.counts.totalReviewSurfaces} review surfaces across two reviewer slots; model-only approval is forbidden and formal execution remains unauthorized.\n`
  );
}

main().catch((error) => {
  process.stderr.write(`A18 blind-review input generation failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
