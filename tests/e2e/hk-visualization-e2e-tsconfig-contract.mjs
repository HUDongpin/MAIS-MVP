import path from "node:path";
import ts from "typescript";

import {
  assertHkVisualizationStarshipPath,
  buildHkVisualizationE2eTsconfig,
} from "./hk-visualization-starship-path-contract.mjs";

export const HK_VISUALIZATION_E2E_TSCONFIG_HARDENING_EXCLUDES = Object.freeze([
  ".next-*",
  ".s??-*",
  "tmp",
  "temp",
  "output",
  "outputs",
  "coverage",
  "playwright-report",
  "test-results",
  "var",
  "var/**/*",
  "MAIS-MVP-*",
  "MAIS-MVP-*/**/*",
]);

export function readHkVisualizationCanonicalTsconfigExcludes({
  workspace,
  readConfigFile = ts.readConfigFile,
}) {
  const absoluteWorkspace = assertHkVisualizationStarshipPath(
    "HK Visualization canonical tsconfig workspace",
    workspace,
  );
  const baseTsconfigPath = path.join(absoluteWorkspace, "tsconfig.json");
  const { config, error } = readConfigFile(
    baseTsconfigPath,
    (filePath) => ts.sys.readFile(filePath),
  );
  const canonical = Array.isArray(config?.exclude) ? config.exclude : null;
  if (
    error ||
    !canonical ||
    canonical.some((exclude) => typeof exclude !== "string")
  ) {
    throw new Error(
      `Could not read \`exclude\` from ${baseTsconfigPath} for the e2e temp tsconfig` +
        `${error ? `: ${ts.flattenDiagnosticMessageText(error.messageText, "\n")}` : "."}`,
    );
  }
  return Object.freeze(
    Array.from(
      new Set([
        ...canonical,
        ...HK_VISUALIZATION_E2E_TSCONFIG_HARDENING_EXCLUDES,
      ]),
    ),
  );
}

export function buildHkVisualizationCanonicalE2eTsconfig({
  workspace,
  nextDistDir,
}) {
  return buildHkVisualizationE2eTsconfig({
    workspace,
    nextDistDir,
    exclude: readHkVisualizationCanonicalTsconfigExcludes({ workspace }),
  });
}

export function buildHkVisualizationCanonicalE2eTsconfigBytes(options) {
  return Buffer.from(
    `${JSON.stringify(
      buildHkVisualizationCanonicalE2eTsconfig(options),
      null,
      2,
    )}\n`,
    "utf8",
  );
}
