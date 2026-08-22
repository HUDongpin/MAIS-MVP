import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(currentDirectory, "curated-corrections.json");

export const hjbJuniorCuratedCorrections = Object.freeze(
  JSON.parse(fs.readFileSync(manifestPath, "utf8"))
);

export const hjbJuniorCuratedCorrectionIds = Object.freeze(
  Object.keys(hjbJuniorCuratedCorrections).sort()
);

export function applyHjbJuniorCuratedCorrection(id, row) {
  const correction = hjbJuniorCuratedCorrections[id];
  if (!correction) return row;
  return {
    ...row,
    ...correction,
    optionsZhHans: [...correction.optionsZhHans],
    acceptedAnswers: [...correction.acceptedAnswers]
  };
}
