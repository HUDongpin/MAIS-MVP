import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCalibrationDesign } from "./calibration-design.mjs";
import { loadOrCreateSeed, writeCalibrationArtifacts } from "./package-artifacts.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return path.resolve(value);
}

const forbidden = ["--formal-run", "--live-provider", "--production", "--deploy"]
  .find((flag) => process.argv.includes(flag));

if (forbidden) {
  process.stderr.write(`${forbidden} is not authorized during F2-R.\n`);
  process.exitCode = 2;
} else {
  try {
    const publicDirectory = optionValue("--public-dir", scriptDirectory);
    const sealedDirectory = optionValue(
      "--sealed-dir",
      path.join(repositoryRoot, ".local", "rsi-lite-calibration-v1")
    );
    const seedPath = optionValue(
      "--seed-file",
      path.join(sealedDirectory, "randomization-seed.txt")
    );
    const seed = await loadOrCreateSeed(seedPath);
    const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
    const receipt = await writeCalibrationArtifacts({ design, publicDirectory, sealedDirectory });

    process.stdout.write(
      `candidate-only: wrote ${receipt.counts.packages} sealed packages and redacted F1 evidence; formal execution remains disabled.\n`
    );
  } catch (error) {
    process.stderr.write(`F1 generation failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
