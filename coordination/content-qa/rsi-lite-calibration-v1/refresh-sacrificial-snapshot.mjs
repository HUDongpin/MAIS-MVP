import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSacrificialBundle,
  runAllSacrificialArms,
  writeSacrificialArtifacts
} from "./sacrificial-runner.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

class AuthorizationBoundaryError extends Error {}

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new AuthorizationBoundaryError(`${name} requires a value.`);
  return path.resolve(value);
}

const forbidden = ["--formal-run", "--live-provider", "--production", "--deploy"]
  .find((flag) => process.argv.includes(flag));
if (forbidden) {
  process.stderr.write(`${forbidden} is not authorized during F2-R.\n`);
  process.exitCode = 2;
} else {
  try {
    const outputDirectory = optionValue("--output-dir", scriptDirectory);
    const bundle = buildSacrificialBundle();
    const receipts = await runAllSacrificialArms(bundle);
    await writeSacrificialArtifacts({ directory: outputDirectory, bundle, receipts });
    process.stdout.write("candidate-only: refreshed four sacrificial receipts over 26 surfaces; formal execution remains disabled.\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`F2-R sacrificial snapshot failed: ${message}\n`);
    process.exitCode = error instanceof AuthorizationBoundaryError ? 2 : 1;
  }
}
