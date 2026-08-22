#!/usr/bin/env node

import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import {
  MUTABLE_BROWSER_PATH_FLAGS,
  assertStarshipPath,
  validateStarshipE2ePathManifest,
} from "./starship-e2e-path-gate.mjs";

const projects = Object.freeze(["desktop-chrome", "mobile-chrome"]);
const analyticsSourceByGroup = Object.freeze({
  G03: "coordinate-plane",
  G04: "geometry",
  G05: "geometry",
  G06: "geometry",
});
const maximumAttachmentBytes = 16 * 1024 * 1024;
const playwrightVersion = "1.59.1";
const integrationArtifactPaths = Object.freeze({
  collisionScanner: "tests/e2e/hk-visualization-collision-scanner.ts",
  contrastScanner: "tests/e2e/hk-visualization-text-contrast-scanner.ts",
  durabilityBrowser: "tests/e2e/visualization-lesson-session-durability-browser.ts",
  durabilityBrowserTest: "tests/e2e/visualization-lesson-session-durability-browser.test.ts",
  durabilityPure: "tests/e2e/visualization-lesson-session-durability.ts",
  durabilityPureTest: "tests/e2e/visualization-lesson-session-durability.test.ts",
  focusedReportValidator: "scripts/validate-mainland-focused-visualization-report.mjs",
  focusedReportValidatorTest: "scripts/validate-mainland-focused-visualization-report.test.mjs",
  nextEnv: "next-env.d.ts",
  scannerSixCaseTest: "tests/e2e/hk-visualization-scanner-six-case-contract.test.mjs",
});
const durabilityArtifactPaths = Object.freeze([
  integrationArtifactPaths.durabilityBrowser,
  integrationArtifactPaths.durabilityBrowserTest,
  integrationArtifactPaths.durabilityPure,
  integrationArtifactPaths.durabilityPureTest,
]);
const scannerArtifactPaths = Object.freeze([
  integrationArtifactPaths.collisionScanner,
  integrationArtifactPaths.contrastScanner,
  integrationArtifactPaths.scannerSixCaseTest,
]);
const durabilityAggregateSerialization =
  "shasum-a-256-lowercase-digest-two-spaces-repo-relative-path-lf-fixed-order";
const scannerAggregateSerialization =
  "ordered-repo-relative-path-utf8-nul-raw-file-bytes-no-final-separator";
const focusedManifestPathLabels = Object.freeze([
  "browserProfileEvidencePath",
  "browserProcessEvidencePath",
  "browserTempDir",
  "crashDumpDir",
  "databasePath",
  "e2eRunRoot",
  "nextDistDir",
  "nextTsconfigPath",
  "nodeCompileCacheDir",
  "npmCacheDir",
  "outputDir",
  "pathManifestPath",
  "reportDir",
  "repositoryRoot",
  "serverCommandOwnerPidPath",
  "serverLogPath",
]);
const dynamicSourceReadLinearization =
  "successful-second-O_NOFOLLOW-open-read-and-before-after-fstat-with-byte-equality; post-point path replacement is outside the pure-path API guarantee";

export const MAINLAND_FOCUSED_VISUALIZATION_OUTER_SUPERVISOR_CONTRACT =
  Object.freeze({
    integrationHook: "outerSupervisorReceiptPath",
    releaseReadyWithoutOuterSupervisorReceipt: false,
    schemaVersion: 1,
    validatorScope: "inner-playwright-report-and-run-receipts-only",
  });

function chunkManifest(entries) {
  return Object.freeze(
    entries.flatMap(([labId, counts]) =>
      counts.map((stateCount, index) => ({
        chunkId: `${labId}:chunk-${String(index + 1).padStart(2, "0")}-of-${String(counts.length).padStart(2, "0")}`,
        stateCount,
      })),
    ),
  );
}

export const MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT = Object.freeze({
  projects,
  groups: Object.freeze([
    Object.freeze({
      analyticsSource: "coordinate-plane",
      attachmentPrefix: "china-mainland-g03-",
      canonicalExecutionCount: 52,
      chunks: chunkManifest([
        ["bnu-junior-s1-upper-rational-numbers", [32, 32, 32, 21]],
        ["bnu-junior-s2-upper-real-numbers", [32, 32, 32, 32, 24]],
        ["hjb-junior-s2-upper-quadratic-radicals", [32, 32, 32, 27]],
        ["hjb-junior-s2-upper-real-numbers", [32, 32, 32, 32, 24]],
        ["hjb-primary-p6-lower-rational-numbers", [32, 32, 32, 21]],
        ["pep-junior-s1-upper-rational-numbers", [32, 32, 32, 21]],
      ]),
      file: "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
      id: "G03",
      schemaVersion: "china-mainland-g03-signed-real-production.v3",
      stateCountPerProject: 778,
      stateDescriptorPlanSha256: "277bd4b9b512ac7768738f3ce3d96a32f954e971770a146f4bd51c3de87e7da0",
      statePlanSha256: "fde0029a129b621250ebadcf2db1fcf2625843d86e74eb1d02d3ebeaa1f6642b",
    }),
    Object.freeze({
      analyticsSource: "geometry",
      attachmentPrefix: "china-mainland-g04-",
      canonicalExecutionCount: 26,
      chunks: chunkManifest([
        ["bnu-primary-p5-lower-fraction-add-sub", [32, 25]],
        ["bnu-primary-p5-lower-fraction-division", [32, 21]],
        ["bnu-primary-p5-lower-fraction-multiplication", [32, 11]],
        ["hjb-primary-p5-lower-fractions-equivalence-operations", [32, 32, 19]],
        ["pep-primary-p5-lower-factors-fractions", [32, 32, 32, 25]],
      ]),
      file: "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
      id: "G04",
      schemaVersion: "china-mainland-g04-fraction-operations-production.v4",
      stateCountPerProject: 357,
      stateDescriptorPlanSha256: "701af7210820f410d663a2eab8018c3d9f4cfe2cbc55651e68c3d5f25adf3978",
      statePlanSha256: "077767c50993274aac87f94d8c0da07c18219fc23ce1c6c6f95b84f40a81ff41",
    }),
    Object.freeze({
      analyticsSource: "geometry",
      attachmentPrefix: "china-mainland-g05-",
      canonicalExecutionCount: 10,
      chunks: chunkManifest([
        ["bnu-primary-p6-upper-percentage-applications", [32, 31, 6]],
        ["pep-primary-p6-upper-percent-fractions", [32, 25]],
      ]),
      file: "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
      id: "G05",
      schemaVersion: "china-mainland-g05-percent-applications-production.v3",
      stateCountPerProject: 126,
      stateDescriptorPlanSha256: "5273f49a219e3b1416d346de98c34f60d239b9904782fa817955f91ca7d3c7be",
      statePlanSha256: "cc53becea61e7c5ced860d61736404b8069f66e21e9976e24cee8afd9082f641",
    }),
    Object.freeze({
      analyticsSource: "geometry",
      attachmentPrefix: "china-mainland-g06-",
      canonicalExecutionCount: 4,
      chunks: chunkManifest([
        ["pep-primary-p6-lower-ratio-proportion-scale", [32, 30]],
      ]),
      file: "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts",
      id: "G06",
      schemaVersion: "china-mainland-g06-ratio-proportion-scale-production.v3",
      stateCountPerProject: 62,
      stateDescriptorPlanSha256: "3756c3e9344aebcdc68b9e5ad011061a14e5df1ddac9c79af9f0b1450460acb6",
      statePlanSha256: "51d09d7bf6054c918eeb1206ad2cfa78a70cc4258b2ce06c86bf9758185ef5cb",
    }),
  ]),
});

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isIsoTimestamp(value) {
  if (!isNonEmptyString(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function exactArray(value, label, reject) {
  if (!Array.isArray(value)) {
    reject(`${label} must be an array`);
    return [];
  }
  return value;
}

function normalizeFile(value, rootDir) {
  const normalized = String(value ?? "").replaceAll("\\", "/");
  if (normalized.startsWith("tests/e2e/")) return normalized;
  const normalizedRoot = typeof rootDir === "string"
    ? rootDir.replaceAll("\\", "/").replace(/\/$/u, "")
    : "";
  if (normalizedRoot && normalized.startsWith(`${normalizedRoot}/`)) {
    return `tests/e2e/${normalized.slice(normalizedRoot.length + 1)}`;
  }
  if (normalized.length > 0 && !normalized.startsWith("/")) {
    return `tests/e2e/${normalized.replace(/^\.\//u, "")}`;
  }
  return normalized;
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function duplicates(values) {
  const seen = new Set();
  const duplicate = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate];
}

function sha256Lines(values) {
  return createHash("sha256").update(`${values.join("\n")}\n`).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  throw new Error(`value is not canonical JSON: ${String(value)}`);
}

function sha256CanonicalJsonLines(values) {
  return createHash("sha256")
    .update(`${values.map(canonicalJson).join("\n")}\n`)
    .digest("hex");
}

function chunkTopicId(chunkId) {
  if (!isNonEmptyString(chunkId)) throw new Error("raw replay chunkId must be non-empty");
  const marker = chunkId.indexOf(":chunk-");
  if (marker <= 0) throw new Error(`raw replay chunkId is malformed: ${chunkId}`);
  return chunkId.slice(0, marker);
}

export function validateMainlandFocusedVisualizationRawReplayLedger(
  normalizedExecutions,
  contract = MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT,
) {
  if (!Array.isArray(normalizedExecutions)) {
    throw new Error("raw replay executions must be an array");
  }
  const expectedRows = [];
  const countsByGroup = {};
  for (const group of contract.groups) {
    const topicIds = [...new Set(group.chunks.map(({ chunkId }) => chunkTopicId(chunkId)))];
    const firstChunkByTopic = new Map();
    for (const { chunkId } of group.chunks) {
      const topicId = chunkTopicId(chunkId);
      if (!firstChunkByTopic.has(topicId)) firstChunkByTopic.set(topicId, chunkId);
    }
    if ([...firstChunkByTopic.values()].some((chunkId) => !/:chunk-01-of-/u.test(chunkId))) {
      throw new Error(`${group.id} contract does not begin every topic with chunk-01`);
    }
    const rule = group.id === "G06"
      ? "desktop-chrome:first-canonical-chunk-for-g06-topic"
      : `desktop-chrome:first-canonical-chunk-per-${group.id.toLowerCase()}-topic`;
    countsByGroup[group.id] = topicIds.length;
    for (const project of contract.projects) {
      for (const { chunkId } of group.chunks) {
        const topicId = chunkTopicId(chunkId);
        expectedRows.push({
          chunkId,
          expectedCountAcrossReport: topicIds.length,
          expectedProjects: ["desktop-chrome"],
          expectedTopicIds: topicIds,
          groupId: group.id,
          included:
            project === "desktop-chrome" && firstChunkByTopic.get(topicId) === chunkId,
          project,
          representativeRule: rule,
          topicId,
        });
      }
    }
  }
  if (normalizedExecutions.length !== expectedRows.length) {
    throw new Error(
      `raw replay execution count mismatch; expected=${expectedRows.length} actual=${normalizedExecutions.length}`,
    );
  }
  const actualByIdentity = new Map();
  for (const execution of normalizedExecutions) {
    if (!isRecord(execution)) throw new Error("raw replay execution is malformed");
    const identity = `${execution.groupId}\u0000${execution.project}\u0000${execution.chunkId}`;
    if (actualByIdentity.has(identity)) throw new Error(`raw replay execution is duplicated: ${identity}`);
    actualByIdentity.set(identity, execution);
  }
  const representativeCaseIds = [];
  for (const expected of expectedRows) {
    const identity = `${expected.groupId}\u0000${expected.project}\u0000${expected.chunkId}`;
    const execution = actualByIdentity.get(identity);
    if (!execution) throw new Error(`raw replay execution is missing: ${identity}`);
    const ledger = execution.rawReplayLedger;
    assertExactObjectKeys("rawReplayLedger", ledger, [
      "expectedCountAcrossReport",
      "expectedProjects",
      "expectedTopicIds",
      "included",
      "representativeRule",
      "topicId",
    ]);
    if (
      ledger.expectedCountAcrossReport !== expected.expectedCountAcrossReport ||
      !sameArray(arrayOf(ledger.expectedProjects), expected.expectedProjects) ||
      !sameArray(arrayOf(ledger.expectedTopicIds), expected.expectedTopicIds) ||
      typeof ledger.included !== "boolean" ||
      ledger.included !== expected.included ||
      ledger.representativeRule !== expected.representativeRule ||
      ledger.topicId !== expected.topicId
    ) {
      throw new Error(`raw replay canonical representative drifted: ${identity}`);
    }
    const final = execution.final;
    if (!isRecord(final) || !isRecord(final.first) || !isRecord(final.mount)) {
      throw new Error(`raw replay final receipt is malformed: ${identity}`);
    }
    if (
      final.coverage !== (expected.included ? "full-raw-replay" : "browser") ||
      final.directReplayCount !== (expected.included ? 1 : 0) ||
      final.first.rawIncluded !== expected.included ||
      final.mount.rawIncluded !== expected.included ||
      (final.first.durability !== null) !== expected.included ||
      (final.mount.durability !== null) !== expected.included ||
      (final.replay !== null) !== expected.included
    ) {
      throw new Error(`raw replay coverage implication drifted: ${identity}`);
    }
    if (expected.included) representativeCaseIds.push(identity);
  }
  if (actualByIdentity.size !== expectedRows.length) {
    throw new Error("raw replay executions contain a surplus identity");
  }
  const independentlyDerivedCount = Object.values(countsByGroup)
    .reduce((sum, value) => sum + value, 0);
  if (representativeCaseIds.length !== independentlyDerivedCount) {
    throw new Error(
      `raw replay representative total mismatch; expected=${independentlyDerivedCount} actual=${representativeCaseIds.length}`,
    );
  }
  return Object.freeze({
    countsByGroup: Object.freeze({ ...countsByGroup }),
    executionCount: expectedRows.length,
    includedCount: representativeCaseIds.length,
    representativeCaseIds: Object.freeze(representativeCaseIds),
  });
}

function flattenReportSpecs(report, reject) {
  const flattened = [];
  const rootDir = isRecord(report?.config) ? report.config.rootDir : null;
  const visit = (suite, location) => {
    if (!isRecord(suite)) {
      reject(`malformed suite at ${location}`);
      return;
    }
    if (suite.specs !== undefined && !Array.isArray(suite.specs)) {
      reject(`malformed spec collection at ${location}`);
    }
    for (const [index, spec] of arrayOf(suite.specs).entries()) {
      if (!isRecord(spec)) {
        reject(`malformed spec at ${location}.specs[${index}]`);
        continue;
      }
      const rawFile = spec.file ?? suite.file;
      if (!isNonEmptyString(rawFile)) {
        reject(`malformed spec file at ${location}.specs[${index}]`);
      }
      flattened.push({
        ...spec,
        file: normalizeFile(isNonEmptyString(rawFile) ? rawFile : "", rootDir),
      });
    }
    if (suite.suites !== undefined && !Array.isArray(suite.suites)) {
      reject(`malformed nested suite collection at ${location}`);
    }
    for (const [index, nested] of arrayOf(suite.suites).entries()) {
      visit(nested, `${location}.suites[${index}]`);
    }
  };
  if (!Array.isArray(report?.suites)) reject("malformed top-level suite collection");
  for (const [index, suite] of arrayOf(report?.suites).entries()) {
    visit(suite, `suites[${index}]`);
  }
  return flattened;
}

async function decodeJsonAttachment(attachment, reportPath, readArtifact) {
  if (attachment.contentType !== "application/json") {
    throw new Error(
      `attachment contentType must be application/json; actual=${String(attachment.contentType)}`,
    );
  }
  if (attachment.body !== undefined && typeof attachment.body !== "string") {
    throw new Error("attachment body must be a base64 string when present");
  }
  if (
    attachment.path !== undefined &&
    (typeof attachment.path !== "string" || attachment.path.length === 0)
  ) {
    throw new Error("attachment path must be a non-empty string when present");
  }
  const hasBody = typeof attachment.body === "string";
  const hasPath = typeof attachment.path === "string" && attachment.path.length > 0;
  if (hasBody === hasPath) {
    throw new Error(
      hasBody
        ? "attachment is ambiguous because both body and path are present"
        : "attachment has neither an inline body nor a readable path",
    );
  }
  let source;
  let attachmentPath = null;
  if (hasBody) {
    if (attachment.body.length > Math.ceil(maximumAttachmentBytes * 4 / 3) + 4) {
      throw new Error(
        `attachment body exceeds the ${maximumAttachmentBytes}-byte size cap`,
      );
    }
    const decoded = Buffer.from(attachment.body, "base64");
    if (attachment.body.length === 0 || decoded.toString("base64") !== attachment.body) {
      throw new Error("attachment body must use canonical base64 without whitespace");
    }
    if (decoded.byteLength > maximumAttachmentBytes) {
      throw new Error(
        `attachment body exceeds the ${maximumAttachmentBytes}-byte size cap`,
      );
    }
    source = decoded.toString("utf8");
  } else {
    const resolvedAttachmentPath = isAbsolute(attachment.path)
      ? attachment.path
      : resolve(dirname(reportPath), attachment.path);
    attachmentPath = assertStarshipPath(
      "focused report attachment path",
      resolvedAttachmentPath,
    );
    source = await readArtifact(attachmentPath, "utf8");
    if (Buffer.byteLength(source, "utf8") > maximumAttachmentBytes) {
      throw new Error(
        `attachment body exceeds the ${maximumAttachmentBytes}-byte size cap`,
      );
    }
  }
  return {
    attachmentPath,
    evidence: JSON.parse(source),
  };
}

function collectPathEvidenceStrings(value, location = "pathEvidence", entries = []) {
  if (typeof value === "string") {
    entries.push({ location, value });
    return entries;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectPathEvidenceStrings(entry, `${location}[${index}]`, entries)
    );
    return entries;
  }
  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      collectPathEvidenceStrings(entry, `${location}.${key}`, entries);
    }
  }
  return entries;
}

function pathManifestFromEvidence(value) {
  if (!isRecord(value)) return null;
  for (const candidate of [
    value.pathManifestPath,
    value.manifestPath,
    isRecord(value.paths) ? value.paths.pathManifestPath : null,
  ]) {
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
}

async function readJsonArtifact(artifactPath, label, readArtifact) {
  const canonicalArtifactPath = assertStarshipPath(`${label} path`, artifactPath);
  const parsed = JSON.parse(await readArtifact(canonicalArtifactPath, "utf8"));
  if (!isRecord(parsed)) throw new Error(`${label} must contain a JSON object`);
  return parsed;
}

function assertChildStarshipPath(label, value, parent) {
  const canonicalValue = assertStarshipPath(label, value);
  const canonicalParent = assertStarshipPath(`${label} parent`, parent);
  if (
    canonicalValue !== canonicalParent &&
    !canonicalValue.startsWith(`${canonicalParent}/`)
  ) {
    throw new Error(`${label} escaped ${canonicalParent}; actual=${canonicalValue}`);
  }
  return canonicalValue;
}

async function readFixedSourceArtifact(
  repositoryRoot,
  relativePath,
  { lstatArtifact, openArtifact, readArtifact, realpathArtifact },
) {
  const lexicalPath = resolve(repositoryRoot, relativePath);
  const expectedCanonicalPath = assertChildStarshipPath(
    `dynamic source provenance ${relativePath}`,
    lexicalPath,
    repositoryRoot,
  );
  const metadata = await lstatArtifact(lexicalPath, { bigint: true });
  if (
    !metadata ||
    typeof metadata.isFile !== "function" ||
    typeof metadata.isSymbolicLink !== "function" ||
    !metadata.isFile() ||
    metadata.isSymbolicLink()
  ) {
    throw new Error(`dynamic source provenance ${relativePath} is not a regular non-symlink file`);
  }
  const resolvedPath = await realpathArtifact(lexicalPath);
  if (resolvedPath !== expectedCanonicalPath || resolvedPath !== lexicalPath) {
    throw new Error(
      `dynamic source provenance ${relativePath} realpath alias drifted; expected=${lexicalPath} actual=${resolvedPath}`,
    );
  }
  if (openArtifact !== null) {
    if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
      throw new Error(
        `dynamic source provenance ${relativePath} cannot fail closed because O_NOFOLLOW is unavailable`,
      );
    }
    const noFollowReadFlags = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW;
    const handle = await openArtifact(
      lexicalPath,
      noFollowReadFlags,
    );
    let bytes;
    let primaryError = null;
    try {
      const before = await handle.stat({ bigint: true });
      if (
        !before.isFile() ||
        (metadata.dev !== undefined && before.dev !== metadata.dev) ||
        (metadata.ino !== undefined && before.ino !== metadata.ino)
      ) {
        throw new Error(
          `dynamic source provenance ${relativePath} changed identity between lstat and O_NOFOLLOW open`,
        );
      }
      bytes = await handle.readFile();
      const after = await handle.stat({ bigint: true });
      if (
        !after.isFile() ||
        before.dev !== after.dev ||
        before.ino !== after.ino ||
        before.size !== after.size ||
        before.mtimeNs !== after.mtimeNs ||
        BigInt(bytes.length) !== after.size
      ) {
        throw new Error(`dynamic source provenance ${relativePath} changed while being read`);
      }
      const afterPathMetadata = await lstatArtifact(lexicalPath, { bigint: true });
      const afterResolvedPath = await realpathArtifact(lexicalPath);
      if (
        !afterPathMetadata.isFile() ||
        afterPathMetadata.isSymbolicLink() ||
        afterPathMetadata.dev !== before.dev ||
        afterPathMetadata.ino !== before.ino ||
        afterResolvedPath !== expectedCanonicalPath ||
        afterResolvedPath !== lexicalPath
      ) {
        throw new Error(
          `dynamic source provenance ${relativePath} changed path identity while being read`,
        );
      }
      const confirmationHandle = await openArtifact(
        lexicalPath,
        noFollowReadFlags,
      );
      let confirmationError = null;
      try {
        const confirmationBefore = await confirmationHandle.stat({ bigint: true });
        if (
          !confirmationBefore.isFile() ||
          confirmationBefore.dev !== before.dev ||
          confirmationBefore.ino !== before.ino
        ) {
          throw new Error(
            `dynamic source provenance ${relativePath} changed identity after post-read realpath confirmation`,
          );
        }
        const confirmationBytes = await confirmationHandle.readFile();
        const confirmationAfter = await confirmationHandle.stat({ bigint: true });
        if (
          !confirmationAfter.isFile() ||
          confirmationAfter.dev !== confirmationBefore.dev ||
          confirmationAfter.ino !== confirmationBefore.ino ||
          confirmationAfter.size !== confirmationBefore.size ||
          confirmationAfter.mtimeNs !== confirmationBefore.mtimeNs ||
          confirmationAfter.ctimeNs !== confirmationBefore.ctimeNs ||
          BigInt(confirmationBytes.length) !== confirmationAfter.size ||
          !Buffer.from(confirmationBytes).equals(Buffer.from(bytes))
        ) {
          throw new Error(
            `dynamic source provenance ${relativePath} changed bytes before the source-read linearization point`,
          );
        }
      } catch (error) {
        confirmationError = error;
      }
      let confirmationCloseError = null;
      try {
        await confirmationHandle.close();
      } catch (error) {
        confirmationCloseError = error;
      }
      if (confirmationError !== null && confirmationCloseError !== null) {
        throw new AggregateError(
          [confirmationError, confirmationCloseError],
          `dynamic source provenance ${relativePath} confirmation and close both failed; primary=${String(confirmationError)}; close=${String(confirmationCloseError)}`,
        );
      }
      if (confirmationError !== null) throw confirmationError;
      if (confirmationCloseError !== null) throw confirmationCloseError;
    } catch (error) {
      primaryError = error;
    }
    let closeError = null;
    try {
      await handle.close();
    } catch (error) {
      closeError = error;
    }
    if (primaryError !== null && closeError !== null) {
      throw new AggregateError(
        [primaryError, closeError],
        `dynamic source provenance ${relativePath} read and close both failed; primary=${String(primaryError)}; close=${String(closeError)}`,
      );
    }
    if (primaryError !== null) throw primaryError;
    if (closeError !== null) throw closeError;
    return Buffer.from(bytes);
  }
  const bytes = await readArtifact(lexicalPath);
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    throw new Error(`dynamic source provenance ${relativePath} must be read as raw bytes`);
  }
  return Buffer.from(bytes);
}

async function validateDynamicSourceProvenance(
  repositoryRoot,
  executions,
  dependencies,
) {
  const artifactBytes = new Map();
  const artifactSha256 = new Map();
  for (const relativePath of Object.values(integrationArtifactPaths)) {
    const bytes = await readFixedSourceArtifact(repositoryRoot, relativePath, dependencies);
    artifactBytes.set(relativePath, bytes);
    artifactSha256.set(
      relativePath,
      createHash("sha256").update(bytes).digest("hex"),
    );
  }
  const durabilityAggregate = (relativePaths) => createHash("sha256")
    .update(relativePaths.map((relativePath) =>
      `${artifactSha256.get(relativePath)}  ${relativePath}\n`
    ).join(""))
    .digest("hex");
  const durabilityPairSha256 = durabilityAggregate(durabilityArtifactPaths.slice(0, 2));
  const durabilityFourSha256 = durabilityAggregate(durabilityArtifactPaths);
  const scannerHash = createHash("sha256");
  for (const relativePath of scannerArtifactPaths) {
    scannerHash.update(relativePath, "utf8");
    scannerHash.update(Uint8Array.of(0));
    scannerHash.update(artifactBytes.get(relativePath));
  }
  const scannerSha256 = scannerHash.digest("hex");
  const expectedCommon = Object.fromEntries(
    Object.entries(integrationArtifactPaths).map(([key, relativePath]) => [
      key,
      artifactSha256.get(relativePath),
    ]),
  );
  const producerShaByGroup = new Map();
  for (const execution of executions) {
    const { evidence, group } = execution;
    const label = `${group.id}/${execution.project}/${String(evidence?.chunkId)}`;
    const integration = evidence?.integrationSourceSha256;
    const expectedIntegration = group.id === "G04"
      ? {
          durabilityBrowser: expectedCommon.durabilityBrowser,
          durabilityBrowserPairAggregate: durabilityPairSha256,
          durabilityBrowserTest: expectedCommon.durabilityBrowserTest,
          durabilityFourFileAggregate: durabilityFourSha256,
          durabilityPure: expectedCommon.durabilityPure,
          durabilityPureTest: expectedCommon.durabilityPureTest,
          focusedReportValidator: expectedCommon.focusedReportValidator,
          focusedReportValidatorTest: expectedCommon.focusedReportValidatorTest,
          nextEnv: expectedCommon.nextEnv,
          scannerCollision: expectedCommon.collisionScanner,
          scannerContrast: expectedCommon.contrastScanner,
          scannerPackageAggregate: scannerSha256,
          scannerSixCaseTest: expectedCommon.scannerSixCaseTest,
        }
      : expectedCommon;
    assertExactObjectKeys(`${label} integrationSourceSha256`, integration, Object.keys(expectedIntegration));
    if (!isDeepStrictEqual(integration, expectedIntegration)) {
      throw new Error(`${label} dynamic source provenance integrationSourceSha256 drifted`);
    }
    if (
      evidence.collisionScannerSha256 !== expectedCommon.collisionScanner ||
      evidence.contrastScannerSha256 !== expectedCommon.contrastScanner
    ) {
      throw new Error(`${label} dynamic source provenance scanner leaf drifted`);
    }
    if (group.id !== "G04") {
      const aggregates = evidence.sourceAggregates;
      assertExactObjectKeys(`${label} sourceAggregates`, aggregates, [
        "durabilityBrowserPairSha256",
        "durabilityFourFileSha256",
        "durabilitySerialization",
        "scannerEntries",
        "scannerSerialization",
        "scannerSha256",
      ]);
      if (
        aggregates.durabilityBrowserPairSha256 !== durabilityPairSha256 ||
        aggregates.durabilityFourFileSha256 !== durabilityFourSha256 ||
        aggregates.durabilitySerialization !== durabilityAggregateSerialization ||
        !sameArray(arrayOf(aggregates.scannerEntries), scannerArtifactPaths) ||
        aggregates.scannerSerialization !== scannerAggregateSerialization ||
        aggregates.scannerSha256 !== scannerSha256
      ) {
        throw new Error(`${label} dynamic source provenance aggregate drifted`);
      }
    }
    let producerBytes = artifactBytes.get(group.file);
    if (!producerBytes) {
      producerBytes = await readFixedSourceArtifact(repositoryRoot, group.file, dependencies);
      artifactBytes.set(group.file, producerBytes);
    }
    const producerSha256 = createHash("sha256").update(producerBytes).digest("hex");
    if (evidence.producerSourceSha256 !== producerSha256) {
      throw new Error(`${label} dynamic source provenance producerSourceSha256 drifted`);
    }
    const previous = producerShaByGroup.get(group.id);
    if (previous !== undefined && previous !== evidence.producerSourceSha256) {
      throw new Error(`${group.id} producerSourceSha256 differs across attachments`);
    }
    producerShaByGroup.set(group.id, evidence.producerSourceSha256);
  }
}

function expectedTitle(group, chunk) {
  return `${group.id} ${chunk.chunkId} audits ${chunk.stateCount} exact states`;
}

function requireReceiptRecord(receipt, field, label) {
  if (!isRecord(receipt[field])) {
    throw new Error(`${label} lacks required positive evidence object ${field}`);
  }
  return receipt[field];
}

function requireReceiptString(receipt, field, label) {
  if (!isNonEmptyString(receipt[field])) {
    throw new Error(`${label} lacks required positive evidence string ${field}`);
  }
  return receipt[field];
}

function requireReceiptPositiveNumber(receipt, field, label) {
  if (!isPositiveFiniteNumber(receipt[field])) {
    throw new Error(`${label} lacks required positive evidence number ${field}`);
  }
  return receipt[field];
}

function requireReceiptArray(receipt, field, label) {
  if (!Array.isArray(receipt[field])) {
    throw new Error(`${label} lacks required evidence array ${field}`);
  }
  return receipt[field];
}

function assertReceipt(condition, message) {
  if (!condition) throw new Error(message);
}

function assertReceiptEqual(actual, expected, label) {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(`${label} does not reconstruct the expected semantic state`);
  }
}

function exactNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function exactPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function canonicalPositiveIntegerString(value) {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/u.test(value)) return null;
  const parsed = Number(value);
  return exactPositiveInteger(parsed) ? parsed : null;
}

function validateReceiptControls(controls, label) {
  assertReceipt(Array.isArray(controls) && controls.length > 0, `${label} lacks required positive evidence controls`);
  const parameters = [];
  for (const [index, control] of controls.entries()) {
    const controlLabel = `${label}.controls[${index}]`;
    assertReceipt(isRecord(control), `${controlLabel} is malformed`);
    assertReceipt(control.disabled === false, `${controlLabel} is disabled`);
    assertReceipt(isNonEmptyString(control.parameter), `${controlLabel} lacks a control parameter identity`);
    parameters.push(control.parameter);
  }
  assertReceipt(duplicates(parameters).length === 0, `${label} has duplicate control parameter identities`);
}

const collisionPairKinds = Object.freeze([
  "control-control",
  "dom-text-text",
  "svg-label-label",
  "svg-label-mark",
  "text-control",
  "text-occlusion",
]);

function validateCollisionReceipt(group, collision, visual, label) {
  if (
    group.id === "G05" &&
    isRecord(visual) &&
    visual.status === "unsupported"
  ) {
    assertExactObjectKeys(
      label,
      collision,
      ["inspectedCandidateCount", "learnerControlCount", "status", "totalCandidatePairCount"],
    );
    assertReceipt(
      collision.status === "unsupported-zero-area-explicit-owner",
      `${label} has no explicit unsupported collision status`,
    );
    for (const field of ["inspectedCandidateCount", "learnerControlCount", "totalCandidatePairCount"]) {
      assertReceipt(
        Number.isSafeInteger(collision[field]) && collision[field] > 0,
        `${label}.${field} lacks positive collision coverage`,
      );
    }
    return;
  }

  assertExactObjectKeys(
    label,
    collision,
    [
      "candidatePairCounts",
      "canvasSurfaceCount",
      "htmlTextFragmentCount",
      "inspectedCandidateCount",
      "learnerControlCount",
      "overlapExemptionCount",
      "paintedMarkCount",
      "phase",
      "svgSurfaceCount",
      "svgTextFragmentCount",
      "totalCandidatePairCount",
    ],
  );
  assertReceipt(
    collision.status === undefined,
    `${label} has an unmodelled collision status`,
  );

  const candidateCounts = requireReceiptRecord(collision, "candidatePairCounts", label);
  const actualPairKinds = Object.keys(candidateCounts).sort();
  assertReceipt(
    sameArray(actualPairKinds, [...collisionPairKinds].sort()),
    `${label}.candidatePairCounts does not contain the exact collision pair families`,
  );
  for (const field of [
    "htmlTextFragmentCount",
    "inspectedCandidateCount",
    "learnerControlCount",
    "overlapExemptionCount",
    "paintedMarkCount",
    "svgSurfaceCount",
    "svgTextFragmentCount",
    "totalCandidatePairCount",
  ]) {
    assertReceipt(exactNonNegativeInteger(collision[field]), `${label}.${field} is not an exact nonnegative integer`);
  }
  assertReceipt(exactNonNegativeInteger(collision.canvasSurfaceCount), `${label}.canvasSurfaceCount is not an exact nonnegative integer`);
  for (const kind of collisionPairKinds) {
    assertReceipt(exactNonNegativeInteger(candidateCounts[kind]), `${label}.${kind} is not an exact nonnegative integer`);
  }
  const expectedInspected = collision.htmlTextFragmentCount +
    collision.learnerControlCount + collision.paintedMarkCount + collision.svgTextFragmentCount;
  const expectedPairTotal = collisionPairKinds.reduce(
    (total, kind) => total + candidateCounts[kind],
    0,
  );
  assertReceipt(collision.inspectedCandidateCount === expectedInspected, `${label} collision candidate-family total is inconsistent`);
  assertReceipt(collision.totalCandidatePairCount === expectedPairTotal, `${label} collision pair-family total is inconsistent`);
  for (const field of [
    "htmlTextFragmentCount",
    "inspectedCandidateCount",
    "learnerControlCount",
    "paintedMarkCount",
    "totalCandidatePairCount",
  ]) {
    assertReceipt(collision[field] > 0, `${label}.${field} lacks positive collision coverage`);
  }
  if (group.id !== "G04") {
    assertReceipt(collision.svgTextFragmentCount > 0, `${label}.svgTextFragmentCount lacks positive collision coverage`);
    assertReceipt(
      collision.svgSurfaceCount + collision.canvasSurfaceCount > 0,
      `${label} inspected no visible SVG or Canvas surface`,
    );
  } else if (isRecord(visual) && Array.isArray(visual.supported) && visual.supported.length > 0) {
    assertReceipt(collision.svgSurfaceCount >= visual.supported.length, `${label} has fewer SVG surfaces than supported visuals`);
  }
}

function validateContrastReceipt(group, contrast, label) {
  assertReceipt(
    contrast.status === undefined,
    `${label} has an unmodelled contrast status`,
  );
  const auditedField = group.id === "G04" || group.id === "G06"
    ? "auditedTextCount"
    : "audited";
  requireReceiptPositiveNumber(contrast, auditedField, label);
  const minimumRatio = requireReceiptPositiveNumber(contrast, "minRatio", label);
  const requiredRatio = requireReceiptPositiveNumber(contrast, "requiredRatio", label);
  assertReceipt(minimumRatio >= requiredRatio, `${label} records a failing minimum contrast ratio`);
}

const g03ExactModes = new Set([
  "absolute-value",
  "add",
  "classify",
  "compare",
  "cube-root",
  "divide",
  "estimate",
  "estimate-check",
  "locate",
  "multiply",
  "opposite",
  "radical",
  "radical-add",
  "radical-divide",
  "radical-multiply",
  "radical-subtract",
  "simplify",
  "square-root",
  "subtract",
]);

const g03RationalModes = Object.freeze([
  "locate",
  "compare",
  "add",
  "subtract",
  "multiply",
  "divide",
  "opposite",
  "absolute-value",
]);

const g03RealModes = Object.freeze([
  "locate",
  "compare",
  "absolute-value",
  "radical",
  "classify",
  "square-root",
  "cube-root",
  "estimate",
]);

const g03QuadraticRadicalModes = Object.freeze([
  "simplify",
  "radical-add",
  "radical-subtract",
  "radical-multiply",
  "radical-divide",
  "estimate-check",
]);

const g03TopicModes = Object.freeze({
  "bnu-junior-s1-upper-rational-numbers": g03RationalModes,
  "bnu-junior-s2-upper-real-numbers": g03RealModes,
  "hjb-junior-s2-upper-quadratic-radicals": g03QuadraticRadicalModes,
  "hjb-junior-s2-upper-real-numbers": g03RealModes,
  "hjb-primary-p6-lower-rational-numbers": g03RationalModes,
  "pep-junior-s1-upper-rational-numbers": g03RationalModes,
});

const g03TopicResetInputs = Object.freeze({
  "bnu-junior-s1-upper-rational-numbers": Object.freeze({
    labId: "bnu-junior-s1-upper-rational-numbers",
    mode: "locate",
    precision: 2,
    value: Object.freeze({ denominator: 2, kind: "rational", numerator: -3 }),
  }),
  "bnu-junior-s2-upper-real-numbers": Object.freeze({
    labId: "bnu-junior-s2-upper-real-numbers",
    mode: "radical",
    precision: 3,
    value: Object.freeze({ index: 2, kind: "radical", radicand: 2, sign: 1 }),
  }),
  "hjb-junior-s2-upper-quadratic-radicals": Object.freeze({
    labId: "hjb-junior-s2-upper-quadratic-radicals",
    mode: "simplify",
    precision: 3,
    value: Object.freeze({
      coefficient: Object.freeze({ denominator: 1, kind: "rational", numerator: 1 }),
      kind: "quadratic-surd",
      radicand: 12,
    }),
  }),
  "hjb-junior-s2-upper-real-numbers": Object.freeze({
    labId: "hjb-junior-s2-upper-real-numbers",
    mode: "radical",
    precision: 3,
    value: Object.freeze({ index: 2, kind: "radical", radicand: 2, sign: 1 }),
  }),
  "hjb-primary-p6-lower-rational-numbers": Object.freeze({
    labId: "hjb-primary-p6-lower-rational-numbers",
    mode: "locate",
    precision: 2,
    value: Object.freeze({ denominator: 2, kind: "rational", numerator: -3 }),
  }),
  "pep-junior-s1-upper-rational-numbers": Object.freeze({
    labId: "pep-junior-s1-upper-rational-numbers",
    mode: "locate",
    precision: 2,
    value: Object.freeze({ denominator: 2, kind: "rational", numerator: -3 }),
  }),
});

const g03DurabilityProbeModeByTopic = Object.freeze({
  "bnu-junior-s1-upper-rational-numbers": "compare",
  "bnu-junior-s2-upper-real-numbers": "locate",
  "hjb-junior-s2-upper-quadratic-radicals": "radical-add",
  "hjb-junior-s2-upper-real-numbers": "locate",
  "hjb-primary-p6-lower-rational-numbers": "compare",
  "pep-junior-s1-upper-rational-numbers": "compare",
});

function g03Gcd(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function normalizeG03Rational(numerator, denominator, label) {
  assertReceipt(
    Number.isSafeInteger(numerator) &&
      Number.isSafeInteger(denominator) &&
      denominator !== 0,
    `${label} is not a safe exact rational`,
  );
  const divisor = g03Gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const normalizedNumerator = (sign * numerator) / divisor;
  return {
    denominator: Math.abs(denominator / divisor),
    kind: "rational",
    numerator: Object.is(normalizedNumerator, -0) ? 0 : normalizedNumerator,
  };
}

function validateG03InputInteger(value, label, { minimum = -50_000, maximum = 50_000 } = {}) {
  assertReceipt(
    Number.isSafeInteger(value) &&
      !Object.is(value, -0) &&
      value >= minimum &&
      value <= maximum,
    `${label} is outside the exact G03 integer domain`,
  );
  return value;
}

function validateG03InputRational(value, label) {
  assertExactObjectKeys(label, value, ["denominator", "kind", "numerator"]);
  assertReceipt(value.kind === "rational", `${label}.kind is not rational`);
  const numerator = validateG03InputInteger(value.numerator, `${label}.numerator`);
  const denominator = validateG03InputInteger(
    value.denominator,
    `${label}.denominator`,
  );
  assertReceipt(denominator !== 0, `${label}.denominator is zero`);
  return normalizeG03Rational(numerator, denominator, label);
}

function g03ExactIntegerRoot(magnitude, index) {
  if (magnitude === 0) return 0;
  const target = BigInt(magnitude);
  let low = 0n;
  let high = target + 1n;
  while (low + 1n < high) {
    const middle = (low + high) / 2n;
    const power = g03PowBigInt(middle, index);
    if (power <= target) low = middle;
    else high = middle;
  }
  return g03PowBigInt(low, index) === target ? Number(low) : null;
}

function validateG03InputRadical(value, label) {
  assertExactObjectKeys(label, value, ["index", "kind", "radicand", "sign"]);
  assertReceipt(value.kind === "radical", `${label}.kind is not radical`);
  const radicand = validateG03InputInteger(value.radicand, `${label}.radicand`, {
    minimum: 0,
  });
  const index = validateG03InputInteger(value.index, `${label}.index`, {
    maximum: 9,
    minimum: 2,
  });
  assertReceipt(value.sign === -1 || value.sign === 1, `${label}.sign is invalid`);
  assertReceipt(radicand !== 0 || value.sign === 1, `${label} zero radical has a negative sign`);
  const exactRoot = g03ExactIntegerRoot(radicand, index);
  if (exactRoot !== null) {
    return normalizeG03Rational(value.sign * exactRoot, 1, label);
  }
  return {
    coefficient: { denominator: 1, kind: "rational", numerator: 1 },
    index,
    kind: "radical",
    radicand,
    sign: value.sign,
  };
}

function validateG03InputExactReal(value, label, { rationalOnly = false, radicalOnly = false } = {}) {
  assertReceipt(isRecord(value), `${label} is malformed`);
  if (value.kind === "rational") {
    assertReceipt(!radicalOnly, `${label} must be radical`);
    return validateG03InputRational(value, label);
  }
  assertReceipt(value.kind === "radical" && !rationalOnly, `${label}.kind is invalid for its mode`);
  return validateG03InputRadical(value, label);
}

function g03LargestSquareExtraction(radicand) {
  if (radicand === 0) return { outside: 0, remaining: 1 };
  let outside = 1;
  let remaining = radicand;
  for (let factor = 2; factor * factor <= remaining; factor += 1) {
    const square = factor * factor;
    while (remaining % square === 0) {
      outside *= factor;
      remaining /= square;
    }
  }
  return { outside, remaining };
}

function validateG03InputQuadraticSurd(value, label) {
  assertExactObjectKeys(label, value, ["coefficient", "kind", "radicand"]);
  assertReceipt(value.kind === "quadratic-surd", `${label}.kind is not quadratic-surd`);
  const coefficient = validateG03InputRational(value.coefficient, `${label}.coefficient`);
  const radicand = validateG03InputInteger(value.radicand, `${label}.radicand`, {
    minimum: 0,
  });
  if (coefficient.numerator === 0 || radicand === 0) {
    return {
      coefficient: { denominator: 1, kind: "rational", numerator: 0 },
      radicand: 1,
    };
  }
  const extraction = g03LargestSquareExtraction(radicand);
  return {
    coefficient: normalizeG03Rational(
      coefficient.numerator * extraction.outside,
      coefficient.denominator,
      `${label}.canonicalCoefficient`,
    ),
    radicand: extraction.remaining,
  };
}

function g03PointFromQuadraticSurd(value) {
  if (value.coefficient.numerator === 0 || value.radicand === 1) {
    return normalizeG03Rational(
      value.coefficient.numerator,
      value.coefficient.denominator,
      "G03 quadratic-surd rational point",
    );
  }
  return {
    coefficient: {
      denominator: value.coefficient.denominator,
      kind: "rational",
      numerator: Math.abs(value.coefficient.numerator),
    },
    index: 2,
    kind: "radical",
    radicand: value.radicand,
    sign: value.coefficient.numerator < 0 ? -1 : 1,
  };
}

function g03RationalAdd(left, right, direction, label) {
  return normalizeG03Rational(
    left.numerator * right.denominator +
      direction * right.numerator * left.denominator,
    left.denominator * right.denominator,
    label,
  );
}

function g03RationalMultiply(left, right, label) {
  return normalizeG03Rational(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
    label,
  );
}

function g03RationalDivide(left, right, label) {
  assertReceipt(right.numerator !== 0, `${label} divides by zero`);
  return normalizeG03Rational(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
    label,
  );
}

function g03QuadraticResult(mode, left, right, label) {
  if (mode === "simplify" || mode === "estimate-check") return left;
  assertReceipt(right !== null, `${label} lacks a right quadratic surd`);
  if (mode === "radical-add" || mode === "radical-subtract") {
    if (left.radicand !== right.radicand) return left;
    return {
      coefficient: g03RationalAdd(
        left.coefficient,
        right.coefficient,
        mode === "radical-add" ? 1 : -1,
        `${label}.coefficient`,
      ),
      radicand: left.radicand,
    };
  }
  if (mode === "radical-multiply") {
    const coefficient = g03RationalMultiply(
      left.coefficient,
      right.coefficient,
      `${label}.coefficient`,
    );
    const radicand = validateG03InputInteger(
      left.radicand * right.radicand,
      `${label}.radicand`,
      { maximum: Number.MAX_SAFE_INTEGER },
    );
    const extraction = g03LargestSquareExtraction(radicand);
    return {
      coefficient: normalizeG03Rational(
        coefficient.numerator * extraction.outside,
        coefficient.denominator,
        `${label}.canonicalCoefficient`,
      ),
      radicand: extraction.remaining,
    };
  }
  assertReceipt(mode === "radical-divide", `${label} has an invalid quadratic mode`);
  assertReceipt(
    right.coefficient.numerator !== 0 && right.radicand !== 0,
    `${label} divides by a zero quadratic surd`,
  );
  const quotient = g03RationalDivide(
    left.coefficient,
    right.coefficient,
    `${label}.coefficientQuotient`,
  );
  const coefficient = normalizeG03Rational(
    quotient.numerator,
    quotient.denominator * right.radicand,
    `${label}.rationalizedCoefficient`,
  );
  const radicand = validateG03InputInteger(
    left.radicand * right.radicand,
    `${label}.radicand`,
    { maximum: Number.MAX_SAFE_INTEGER },
  );
  const extraction = g03LargestSquareExtraction(radicand);
  return {
    coefficient: normalizeG03Rational(
      coefficient.numerator * extraction.outside,
      coefficient.denominator,
      `${label}.canonicalCoefficient`,
    ),
    radicand: extraction.remaining,
  };
}

function validateG03Input(input, label) {
  assertReceipt(isRecord(input), `${label} is malformed`);
  const mode = input.mode;
  const labId = input.labId;
  assertReceipt(isNonEmptyString(labId), `${label}.labId is invalid`);
  assertReceipt(
    Array.isArray(g03TopicModes[labId]) && g03TopicModes[labId].includes(mode),
    `${label} mode is outside the exact G03 topic allowlist`,
  );
  const precision = validateG03InputInteger(input.precision, `${label}.precision`, {
    maximum: 6,
    minimum: 0,
  });
  const baseKeys = ["labId", "mode", "precision"];
  let point;
  let comparisonPoint = null;
  let operationStart = null;
  let operationStep = null;
  if (["locate", "absolute-value", "radical", "classify", "estimate"].includes(mode)) {
    assertExactObjectKeys(label, input, [...baseKeys, "value"]);
    point = validateG03InputExactReal(input.value, `${label}.value`, {
      radicalOnly: mode === "radical",
      rationalOnly: g03TopicModes[labId] === g03RationalModes,
    });
  } else if (mode === "compare") {
    assertExactObjectKeys(label, input, [...baseKeys, "left", "right"]);
    const rationalOnly = g03RationalModes === g03TopicModes[labId];
    point = validateG03InputExactReal(input.left, `${label}.left`, { rationalOnly });
    comparisonPoint = validateG03InputExactReal(input.right, `${label}.right`, { rationalOnly });
  } else if (mode === "add" || mode === "subtract") {
    assertExactObjectKeys(label, input, [...baseKeys, "start", "step"]);
    operationStart = validateG03InputRational(input.start, `${label}.start`);
    operationStep = validateG03InputRational(input.step, `${label}.step`);
    point = g03RationalAdd(
      operationStart,
      operationStep,
      mode === "add" ? 1 : -1,
      `${label}.point`,
    );
  } else if (mode === "multiply" || mode === "divide") {
    assertExactObjectKeys(label, input, [...baseKeys, "left", "right"]);
    const left = validateG03InputRational(input.left, `${label}.left`);
    const right = validateG03InputRational(input.right, `${label}.right`);
    point = mode === "multiply"
      ? g03RationalMultiply(left, right, `${label}.point`)
      : g03RationalDivide(left, right, `${label}.point`);
  } else if (mode === "opposite") {
    assertExactObjectKeys(label, input, [...baseKeys, "value"]);
    const value = validateG03InputRational(input.value, `${label}.value`);
    point = normalizeG03Rational(-value.numerator, value.denominator, `${label}.point`);
  } else if (mode === "square-root" || mode === "cube-root") {
    assertExactObjectKeys(label, input, [...baseKeys, "radicand"]);
    const rawRadicand = validateG03InputInteger(input.radicand, `${label}.radicand`);
    assertReceipt(
      mode === "cube-root" || rawRadicand >= 0,
      `${label} square-root radicand is negative`,
    );
    point = validateG03InputRadical(
      {
        index: mode === "square-root" ? 2 : 3,
        kind: "radical",
        radicand: Math.abs(rawRadicand),
        sign: rawRadicand < 0 ? -1 : 1,
      },
      `${label}.root`,
    );
  } else {
    const unary = mode === "simplify" || mode === "estimate-check";
    assertExactObjectKeys(label, input, unary
      ? [...baseKeys, "value"]
      : [...baseKeys, "left", "right"]);
    const left = validateG03InputQuadraticSurd(
      unary ? input.value : input.left,
      `${label}.${unary ? "value" : "left"}`,
    );
    const right = unary
      ? null
      : validateG03InputQuadraticSurd(input.right, `${label}.right`);
    point = g03PointFromQuadraticSurd(
      g03QuadraticResult(mode, left, right, `${label}.point`),
    );
  }
  return { comparisonPoint, labId, mode, operationStart, operationStep, point, precision };
}

function g03ControlStateFromInput(input) {
  let numberKind = "rational";
  let valueSign = 1;
  let valueRadicand = 2;
  let rightRationalNumerator = 1;
  let rightRationalDenominator = 1;
  let rightSurdCoefficientNumerator = 1;
  let rightSurdCoefficientDenominator = 1;
  let rightSurdRadicand = 2;
  const primary = input.mode === "compare"
    ? input.left
    : ["locate", "absolute-value", "radical", "classify", "estimate"].includes(input.mode)
      ? input.value
      : null;
  if (primary) numberKind = primary.kind;
  if (g03QuadraticRadicalModes.includes(input.mode)) numberKind = "quadratic-surd";
  else if (input.mode === "square-root" || input.mode === "cube-root") numberKind = "radical";
  if (primary?.kind === "radical") {
    valueSign = primary.sign;
    valueRadicand = primary.radicand;
  } else if (input.mode === "square-root" || input.mode === "cube-root") {
    valueSign = input.radicand < 0 ? -1 : 1;
    valueRadicand = Math.abs(input.radicand);
  } else if (input.mode === "simplify" || input.mode === "estimate-check") {
    valueRadicand = input.value.radicand;
  }
  if (["compare", "multiply", "divide"].includes(input.mode) && input.right.kind === "rational") {
    rightRationalNumerator = input.right.numerator;
    rightRationalDenominator = input.right.denominator;
  }
  if (["radical-add", "radical-subtract", "radical-multiply", "radical-divide"].includes(input.mode)) {
    valueRadicand = input.left.radicand;
    rightSurdCoefficientNumerator = input.right.coefficient.numerator;
    rightSurdCoefficientDenominator = input.right.coefficient.denominator;
    rightSurdRadicand = input.right.radicand;
  }
  return {
    labId: input.labId,
    mode: input.mode,
    numberKind,
    rightRationalDenominator,
    rightRationalNumerator,
    rightSurdCoefficientDenominator,
    rightSurdCoefficientNumerator,
    rightSurdRadicand,
    valueRadicand,
    valueSign,
  };
}

function validateG03ControlState(controlState, input, label) {
  assertExactObjectKeys(
    label,
    controlState,
    [
      "labId",
      "mode",
      "numberKind",
      "rightRationalDenominator",
      "rightRationalNumerator",
      "rightSurdCoefficientDenominator",
      "rightSurdCoefficientNumerator",
      "rightSurdRadicand",
      "valueRadicand",
      "valueSign",
    ],
  );
  const exactIntegerFields = [
    ["valueRadicand", 0, 50_000],
    ["rightRationalNumerator", -50_000, 50_000],
    ["rightRationalDenominator", 1, 50_000],
    ["rightSurdCoefficientNumerator", -50_000, 50_000],
    ["rightSurdCoefficientDenominator", 1, 50_000],
    ["rightSurdRadicand", 0, 50_000],
  ];
  for (const [field, minimum, maximum] of exactIntegerFields) {
    validateG03InputInteger(controlState[field], `${label}.${field}`, { maximum, minimum });
  }
  assertReceipt(
    controlState.valueSign === -1 || controlState.valueSign === 1,
    `${label}.valueSign is invalid`,
  );
  assertReceipt(
    controlState.valueRadicand !== 0 || controlState.valueSign === 1,
    `${label} zero radical has a negative sign`,
  );
  assertReceiptEqual(
    controlState,
    g03ControlStateFromInput(input),
    `${label} exact input-derived controlState`,
  );
}

function parseG03ExactPoint(encoded, label, { allowAbsent = false } = {}) {
  if (encoded === "-") {
    assertReceipt(allowAbsent, `${label} is unexpectedly absent`);
    return null;
  }
  const rationalMatch = encoded.match(/^r:(-?\d+)\/(\d+)$/u);
  if (rationalMatch) {
    const point = normalizeG03Rational(
      Number(rationalMatch[1]),
      Number(rationalMatch[2]),
      label,
    );
    assertReceipt(
      encoded === `r:${point.numerator}/${point.denominator}`,
      `${label} is not a canonical rational encoding`,
    );
    return point;
  }
  const radicalMatch = encoded.match(
    /^d:(-?1):(\d+):(\d+):(-?\d+)\/(\d+)$/u,
  );
  assertReceipt(radicalMatch !== null, `${label} is not an exact point encoding`);
  const sign = Number(radicalMatch[1]);
  const index = Number(radicalMatch[2]);
  const radicand = Number(radicalMatch[3]);
  const coefficient = normalizeG03Rational(
    Number(radicalMatch[4]),
    Number(radicalMatch[5]),
    `${label} coefficient`,
  );
  assertReceipt(
    (sign === -1 || sign === 1) &&
      Number.isSafeInteger(index) &&
      index >= 2 &&
      index <= 9 &&
      Number.isSafeInteger(radicand) &&
      radicand >= 0 &&
      coefficient.numerator > 0,
    `${label} is outside the signed-real radical domain`,
  );
  assertReceipt(
    encoded ===
      `d:${sign}:${index}:${radicand}:${coefficient.numerator}/${coefficient.denominator}`,
    `${label} is not a canonical radical encoding`,
  );
  return {
    coefficient,
    index,
    kind: "radical",
    radicand,
    sign,
  };
}

function parseG03ConfiguredState(configuredState, label) {
  const parts = configuredState.split("|");
  assertReceipt(
    parts.length === 8 && parts[0] === "signed-real-number-line-v1",
    `${label} configured state has a malformed exact shape`,
  );
  const names = ["lab", "mode", "precision", "point", "compare", "start", "step"];
  const fields = {};
  for (const [index, name] of names.entries()) {
    const prefix = `${name}=`;
    assertReceipt(parts[index + 1].startsWith(prefix), `${label} configured state lacks exact ${name}`);
    fields[name] = parts[index + 1].slice(prefix.length);
  }
  assertReceipt(isNonEmptyString(fields.lab), `${label} configured state has no lab identity`);
  assertReceipt(g03ExactModes.has(fields.mode), `${label} configured state has an invalid mode`);
  const precision = Number(fields.precision);
  assertReceipt(
    Number.isSafeInteger(precision) && precision >= 0 && precision <= 6 &&
      String(precision) === fields.precision,
    `${label} configured state has an invalid precision`,
  );
  const point = parseG03ExactPoint(fields.point, `${label}.point`);
  const comparisonPoint = parseG03ExactPoint(
    fields.compare,
    `${label}.compare`,
    { allowAbsent: true },
  );
  const operationStart = parseG03ExactPoint(
    fields.start,
    `${label}.start`,
    { allowAbsent: true },
  );
  const operationStep = parseG03ExactPoint(
    fields.step,
    `${label}.step`,
    { allowAbsent: true },
  );
  assertReceipt(
    (fields.mode === "compare") === (comparisonPoint !== null),
    `${label} configured state comparison point is inconsistent with its mode`,
  );
  const operationMode = fields.mode === "add" || fields.mode === "subtract";
  assertReceipt(
    operationMode === (operationStart !== null) &&
      operationMode === (operationStep !== null),
    `${label} configured state operation points are inconsistent with its mode`,
  );
  if (operationMode) {
    assertReceipt(
      operationStart.kind === "rational" && operationStep.kind === "rational",
      `${label} configured operation must use rational start and step points`,
    );
  }
  return {
    comparisonPoint,
    labId: fields.lab,
    mode: fields.mode,
    operationStart,
    operationStep,
    point,
    precision,
  };
}

function g03ExactKey(point) {
  if (point.kind === "rational") {
    const exact = normalizeG03Rational(point.numerator, point.denominator, "G03 exact key");
    return `r:${exact.numerator}/${exact.denominator}`;
  }
  let outside = 1;
  let remaining = point.radicand;
  for (let factor = 2; factor ** point.index <= remaining; factor += 1) {
    const power = factor ** point.index;
    while (remaining % power === 0) {
      outside *= factor;
      remaining /= power;
    }
  }
  const coefficient = normalizeG03Rational(
    point.coefficient.numerator * outside,
    point.coefficient.denominator,
    "G03 radical exact key",
  );
  return `d:${point.sign}:${point.index}:${remaining}:${coefficient.numerator}/${coefficient.denominator}`;
}

function g03StatePointKey(point) {
  if (point.kind === "rational") {
    const exact = normalizeG03Rational(
      point.numerator,
      point.denominator,
      "G03 state point key",
    );
    return `r:${exact.numerator}/${exact.denominator}`;
  }
  return `d:${point.sign}:${point.index}:${point.radicand}:${point.coefficient.numerator}/${point.coefficient.denominator}`;
}

function g03PowBigInt(base, exponent) {
  let result = 1n;
  for (let index = 0; index < exponent; index += 1) result *= base;
  return result;
}

function g03FloorScaledRadical(point, scale) {
  const coefficientMagnitude = BigInt(Math.abs(point.coefficient.numerator));
  const denominator = BigInt(point.coefficient.denominator);
  const scaleBig = BigInt(scale);
  const scaledCoefficient = coefficientMagnitude * scaleBig;
  const targetPower = BigInt(point.radicand) * g03PowBigInt(scaledCoefficient, point.index);
  let low = 0n;
  let high = BigInt(Math.max(1, point.radicand)) * scaledCoefficient + 1n;
  while (low + 1n < high) {
    const middle = (low + high) / 2n;
    if (g03PowBigInt(middle * denominator, point.index) <= targetPower) low = middle;
    else high = middle;
  }
  const lowerPower = g03PowBigInt(low * denominator, point.index);
  return {
    exact: lowerPower === targetPower,
    lowerPower,
    magnitude: low,
    nextPower: g03PowBigInt((low + 1n) * denominator, point.index),
    targetPower,
  };
}

function g03PointInterval(point, precision, label) {
  if (point.kind === "rational") {
    const value = point.numerator / point.denominator;
    return { lower: value, rendered: value, upper: value };
  }
  const scale = 10 ** precision;
  const floor = g03FloorScaledRadical(point, scale);
  const signedMagnitude = point.sign < 0 ? -floor.magnitude : floor.magnitude;
  const unscaled = Number(signedMagnitude);
  assertReceipt(Number.isSafeInteger(unscaled), `${label} radical approximation is not safe`);
  const rendered = unscaled / scale;
  const lower = floor.exact || point.sign > 0
    ? rendered
    : Number(-(floor.magnitude + 1n)) / scale;
  const upper = floor.exact || point.sign < 0
    ? rendered
    : Number(floor.magnitude + 1n) / scale;
  assertReceipt(
    Number.isFinite(lower) && Number.isFinite(rendered) && Number.isFinite(upper),
    `${label} radical approximation is not finite`,
  );
  return { lower, rendered, upper };
}

function deriveG03Geometry(configuredState, label) {
  const state = parseG03ConfiguredState(configuredState, label);
  const points = [
    {
      point: { denominator: 1, kind: "rational", numerator: 0 },
      semanticId: "origin",
    },
    { point: state.point, semanticId: "primary" },
  ];
  if (state.comparisonPoint) {
    points.push({ point: state.comparisonPoint, semanticId: "comparison" });
  }
  if (state.operationStart && state.operationStep) {
    const direction = state.mode === "add" ? 1 : -1;
    const endpoint = normalizeG03Rational(
      state.operationStart.numerator * state.operationStep.denominator +
        direction * state.operationStep.numerator * state.operationStart.denominator,
      state.operationStart.denominator * state.operationStep.denominator,
      `${label} operation endpoint`,
    );
    assertReceipt(
      g03ExactKey(endpoint) === g03ExactKey(state.point),
      `${label} configured operation endpoint does not reconstruct the primary point`,
    );
    points.push({ point: state.operationStart, semanticId: "operation-start" });
    points.push({ point: endpoint, semanticId: "operation-endpoint" });
  }
  const candidates = points.map(({ point, semanticId }) => ({
    exactKey: g03ExactKey(point),
    interval: g03PointInterval(point, state.precision, `${label}.${semanticId}`),
    semanticId,
  }));
  const maximumMagnitude = Math.max(
    0,
    ...candidates.flatMap(({ interval }) => [
      Math.abs(interval.lower),
      Math.abs(interval.upper),
    ]),
  );
  const halfRange = Math.max(2, Math.ceil(maximumMagnitude * 1.25));
  const axisMin = -halfRange;
  const axisMax = halfRange;
  const svgXMin = 70;
  const svgXMax = 890;
  const pixelsPerUnit = (svgXMax - svgXMin) / (axisMax - axisMin);
  const membersByExactKey = new Map();
  for (const candidate of candidates) {
    const members = membersByExactKey.get(candidate.exactKey) ?? [];
    members.push(candidate.semanticId);
    membersByExactKey.set(candidate.exactKey, members);
  }
  for (const members of membersByExactKey.values()) members.sort();
  const geometry = candidates.map((candidate) => {
    const members = membersByExactKey.get(candidate.exactKey);
    const owner = members[0];
    const mapToPixel = (value) => svgXMin + (value - axisMin) * pixelsPerUnit;
    return {
      exactKey: candidate.exactKey,
      lower: mapToPixel(candidate.interval.lower),
      marker: candidate.semanticId === owner,
      owner,
      reason: members.length > 1 ? "exact-equality" : "unique-exact-value",
      rendered: mapToPixel(candidate.interval.rendered),
      semanticId: candidate.semanticId,
      upper: mapToPixel(candidate.interval.upper),
    };
  });
  const geometryState = [
    "signed-real-number-line-geometry-v1",
    `axis=${axisMin}:${axisMax}`,
    `svg=${svgXMin}:${svgXMax}`,
    ...geometry.map((point) =>
      `${point.semanticId}:${point.exactKey}:${point.rendered}:${point.owner}`
    ),
  ].join("|");
  return { geometry, geometryState, state };
}

function g03ConfiguredStateFromInput(input, label) {
  const state = validateG03Input(input, `${label}.input`);
  return [
    "signed-real-number-line-v1",
    `lab=${state.labId}`,
    `mode=${state.mode}`,
    `precision=${state.precision}`,
    `point=${g03StatePointKey(state.point)}`,
    `compare=${state.comparisonPoint === null ? "-" : g03StatePointKey(state.comparisonPoint)}`,
    `start=${state.operationStart === null ? "-" : g03StatePointKey(state.operationStart)}`,
    `step=${state.operationStep === null ? "-" : g03StatePointKey(state.operationStep)}`,
  ].join("|");
}

function validateG03CanonicalReset(
  request,
  expectedSnapshot,
  expectedSignature,
  observedGeometry,
  label,
) {
  if (request.kind !== "reset" && request.kind !== "initial") return;
  const resetInput = g03TopicResetInputs[request.topicId];
  assertReceipt(
    isRecord(resetInput),
    `${label} G03 reset has no canonical topic input`,
  );
  assertReceiptEqual(
    expectedSnapshot.input,
    resetInput,
    `${label} G03 reset canonical input`,
  );
  const configuredState = g03ConfiguredStateFromInput(
    resetInput,
    `${label} G03 reset canonical`,
  );
  assertReceipt(
    expectedSnapshot.configuredState === configuredState &&
      expectedSnapshot.labId === resetInput.labId &&
      expectedSnapshot.mode === resetInput.mode,
    `${label} G03 reset canonical configured state/mode is inconsistent`,
  );
  validateG03ControlState(
    expectedSnapshot.controlState,
    resetInput,
    `${label} G03 reset canonical controlState`,
  );
  const canonicalGeometry = deriveG03Geometry(
    configuredState,
    `${label} G03 reset canonical geometry`,
  );
  assertReceipt(
    expectedSignature.state === configuredState &&
      expectedSignature.semanticState === configuredState &&
      expectedSignature.mode === resetInput.mode &&
      expectedSignature.geometryState === canonicalGeometry.geometryState,
    `${label} G03 reset canonical signature/geometry is inconsistent`,
  );
  assertG03GeometryEqual(
    observedGeometry,
    canonicalGeometry.geometry,
    `${label} G03 reset canonical geometry`,
  );
}

function assertG03GeometryEqual(actual, expected, label) {
  assertReceipt(actual.length === expected.length, `${label} geometry point count is not state-derived`);
  for (const [index, expectedPoint] of expected.entries()) {
    const actualPoint = actual[index];
    for (const field of ["exactKey", "marker", "owner", "reason", "semanticId"]) {
      assertReceipt(
        actualPoint[field] === expectedPoint[field],
        `${label}.geometry[${index}].${field} is not derived from configured state`,
      );
    }
    for (const field of ["lower", "rendered", "upper"]) {
      assertReceipt(
        Math.abs(actualPoint[field] - expectedPoint[field]) <= 1e-9,
        `${label}.geometry[${index}].${field} pixel position is not derived from configured state`,
      );
    }
  }
}

function validateG03Request(request, state, label) {
  assertReceipt(isRecord(request), `${label} is malformed`);
  if (request.kind === "initial" || request.kind === "reset") {
    assertExactObjectKeys(label, request, ["kind", "topicId"]);
    assertReceipt(
      request.topicId === state.labId,
      `${label} topic identity does not match the exact G03 state lab`,
    );
    return;
  }
  if (request.kind === "control") {
    assertExactObjectKeys(label, request, ["control", "kind", "value"]);
    assertReceipt(isNonEmptyString(request.control), `${label}.control is invalid`);
  } else {
    assertReceipt(request.kind === "controller", `${label}.kind is invalid`);
    assertExactObjectKeys(label, request, ["controller", "kind", "value"]);
    assertReceipt(
      request.controller === "mode" || request.controller === "number-kind",
      `${label}.controller is invalid`,
    );
  }
  assertReceipt(
    typeof request.value === "string" ||
      (typeof request.value === "number" &&
        Number.isFinite(request.value) &&
        !Object.is(request.value, -0)),
    `${label}.value is not an exact JSON scalar`,
  );
}

function validateG03Snapshot(snapshot, label, expectedPendingRequest) {
  assertExactObjectKeys(
    label,
    snapshot,
    ["configuredState", "controlState", "input", "labId", "mode", "pendingRequest"],
  );
  const configuredState = requireReceiptString(snapshot, "configuredState", label);
  const state = parseG03ConfiguredState(configuredState, label);
  const input = requireReceiptRecord(snapshot, "input", label);
  const controlState = requireReceiptRecord(snapshot, "controlState", label);
  const inputState = validateG03Input(input, `${label}.input`);
  assertReceiptEqual(
    state,
    inputState,
    `${label}.input exact configured-state reconstruction`,
  );
  validateG03ControlState(controlState, input, `${label}.controlState`);
  assertReceipt(
    snapshot.labId === state.labId &&
      snapshot.mode === state.mode &&
      input.labId === state.labId &&
      input.mode === state.mode &&
      controlState.labId === state.labId &&
      controlState.mode === state.mode,
    `${label} lab/mode identity does not reconstruct configured state`,
  );
  assertReceiptEqual(snapshot.pendingRequest, expectedPendingRequest, `${label} pending request`);
  return state;
}

function g03RequestControlParameters(request) {
  if (request.kind === "controller" && request.controller === "number-kind") {
    return ["value-kind", "left-kind"];
  }
  if (request.kind !== "control") return [];
  const aliases = {
    "right-rational-denominator": ["right-denominator"],
    "right-rational-numerator": ["right-numerator"],
    "right-surd-coefficient-denominator": ["right-coefficient-denominator"],
    "right-surd-coefficient-numerator": ["right-coefficient-numerator"],
    "right-surd-radicand": ["right-radicand"],
    "value-radicand": ["value-radicand", "left-radicand"],
    "value-sign": ["value-sign", "left-sign"],
  };
  return aliases[request.control] ?? [request.control];
}

function validateG03AcceptedRequestResult(request, signature, projections, label) {
  if (request.kind === "initial" || request.kind === "reset") return;
  if (request.kind === "controller" && request.controller === "mode") {
    assertReceipt(
      signature.mode === request.value,
      `${label} accepted mode request did not produce its exact result`,
    );
    return;
  }
  const parameters = g03RequestControlParameters(request);
  const visibleResult = arrayOf(signature.controls).some((control) =>
    isRecord(control) &&
      parameters.includes(control.parameter) &&
      control.value === String(request.value)
  );
  const projectedResult = arrayOf(projections).some((projection) =>
    isRecord(projection) &&
      (parameters.includes(projection.affectedControl) ||
        parameters.includes(projection.control))
  );
  assertReceipt(
    visibleResult || projectedResult,
    `${label} accepted control request did not produce or project its exact requested value`,
  );
}

const g03InvariantIds = Object.freeze([
  "rational-point",
  "radical-square-error",
  "absolute-value-distance",
  "signed-origin-stability",
  "exact-cross-product",
  "additive-endpoint",
  "topic-mode-allowlist",
  "rational-operation-reconstruction",
  "real-concept-reconstruction",
  "quadratic-radical-reconstruction",
]);

function g03SignatureParameters(input, label) {
  const parameters = [];
  const rationalPair = (prefix) =>
    parameters.push(`${prefix}-numerator`, `${prefix}-denominator`);
  const exact = (prefix, value, includeKind) => {
    if (includeKind) parameters.push(`${prefix}-kind`);
    if (value.kind === "rational") rationalPair(prefix);
    else parameters.push(`${prefix}-sign`, `${prefix}-radicand`, `${prefix}-index`);
  };
  const surd = (prefix) => parameters.push(
    `${prefix}-coefficient-numerator`,
    `${prefix}-coefficient-denominator`,
    `${prefix}-radicand`,
  );
  const modes = g03TopicModes[input.labId];
  if (modes === g03RationalModes) {
    if (["locate", "opposite", "absolute-value"].includes(input.mode)) {
      rationalPair("value");
    } else if (["compare", "multiply", "divide"].includes(input.mode)) {
      rationalPair("left");
      rationalPair("right");
    } else if (["add", "subtract"].includes(input.mode)) {
      rationalPair("start");
      rationalPair("step");
    } else {
      assertReceipt(false, `${label} has no rational signature parameter plan`);
    }
  } else if (modes === g03RealModes) {
    if (["locate", "absolute-value", "classify", "estimate"].includes(input.mode)) {
      exact("value", input.value, true);
    } else if (input.mode === "compare") {
      exact("left", input.left, true);
      exact("right", input.right, true);
    } else if (input.mode === "radical") {
      exact("value", input.value, false);
    } else if (input.mode === "square-root") {
      parameters.push("value-radicand");
    } else if (input.mode === "cube-root") {
      parameters.push("value-sign", "value-radicand");
    } else {
      assertReceipt(false, `${label} has no real signature parameter plan`);
    }
  } else if (["simplify", "estimate-check"].includes(input.mode)) {
    surd("value");
  } else if (g03QuadraticRadicalModes.includes(input.mode)) {
    surd("left");
    surd("right");
  } else {
    assertReceipt(false, `${label} has no quadratic signature parameter plan`);
  }
  parameters.push("precision");
  return parameters;
}

function g03SignatureControlValue(input, parameter, label) {
  if (parameter === "precision") return String(input.precision);
  if (
    (input.mode === "square-root" || input.mode === "cube-root") &&
    parameter === "value-radicand"
  ) {
    return String(Math.abs(input.radicand));
  }
  if (input.mode === "cube-root" && parameter === "value-sign") {
    return String(input.radicand < 0 ? -1 : 1);
  }
  const match = parameter.match(
    /^(value|left|right|start|step)-(kind|sign|radicand|index|numerator|denominator|coefficient-numerator|coefficient-denominator)$/u,
  );
  assertReceipt(match !== null, `${label} cannot derive control ${parameter}`);
  const [, prefix, field] = match;
  const source = input[prefix];
  assertReceipt(isRecord(source), `${label} has no ${prefix} input`);
  if (field === "coefficient-numerator" || field === "coefficient-denominator") {
    assertReceipt(isRecord(source.coefficient), `${label} has no ${prefix} coefficient`);
    return String(source.coefficient[field === "coefficient-numerator" ? "numerator" : "denominator"]);
  }
  return String(source[field]);
}

function g03CanonicalEvidenceParameter(labId, parameter) {
  const modes = g03TopicModes[labId];
  if (modes === g03RationalModes) {
    if (parameter === "right-numerator") return "right-rational-numerator";
    if (parameter === "right-denominator") return "right-rational-denominator";
  }
  if (modes === g03QuadraticRadicalModes) {
    if (parameter === "right-coefficient-numerator") {
      return "right-surd-coefficient-numerator";
    }
    if (parameter === "right-coefficient-denominator") {
      return "right-surd-coefficient-denominator";
    }
    if (parameter === "right-radicand") return "right-surd-radicand";
  }
  if (modes === g03RealModes) {
    if (parameter === "left-sign") return "value-sign";
    if (parameter === "left-radicand") return "value-radicand";
  }
  return parameter;
}

function g03ExpectedSignatureControls(input, label) {
  return g03SignatureParameters(input, label).map((parameter) => {
    const select = parameter.endsWith("-kind") || parameter.endsWith("-sign");
    let range = { max: null, min: null, step: null };
    if (!select) {
      if (parameter.endsWith("-numerator")) range = { max: 24, min: -24, step: 1 };
      else if (parameter.endsWith("-denominator")) range = { max: 12, min: 1, step: 1 };
      else if (parameter.endsWith("-radicand")) range = { max: 50, min: 0, step: 1 };
      else if (parameter.endsWith("-index")) range = { max: 9, min: 2, step: 1 };
      else if (parameter === "precision") range = { max: 6, min: 0, step: 1 };
      else assertReceipt(false, `${label} has no range descriptor for ${parameter}`);
    }
    return {
      disabled: false,
      kind: select ? "select" : "range",
      ...range,
      options: select
        ? (parameter.endsWith("-kind") ? ["rational", "radical"] : ["-1", "1"])
        : [],
      parameter: g03CanonicalEvidenceParameter(input.labId, parameter),
      value: g03SignatureControlValue(input, parameter, label),
    };
  });
}

function g03RationalSymbolic(value) {
  return value.numerator === 0
    ? "0"
    : value.denominator === 1
      ? String(value.numerator)
      : `${value.numerator}/${value.denominator}`;
}

function g03QuadraticSurdSymbolic(value) {
  if (value.coefficient.numerator === 0 || value.radicand === 0) return "0";
  if (value.radicand === 1) return g03RationalSymbolic(value.coefficient);
  const negative = value.coefficient.numerator < 0;
  const magnitude = {
    denominator: value.coefficient.denominator,
    numerator: Math.abs(value.coefficient.numerator),
  };
  const coefficient = magnitude.numerator === magnitude.denominator
    ? ""
    : magnitude.denominator === 1
      ? String(magnitude.numerator)
      : `${magnitude.numerator}/${magnitude.denominator}`;
  return `${negative ? "-" : ""}${coefficient}√${value.radicand}`;
}

function g03PointSymbolic(point, mode, { absolute = false } = {}) {
  if (point.kind === "rational") {
    return g03RationalSymbolic({
      ...point,
      numerator: absolute ? Math.abs(point.numerator) : point.numerator,
    });
  }
  const sign = absolute ? 1 : point.sign;
  if (g03QuadraticRadicalModes.includes(mode)) {
    return g03QuadraticSurdSymbolic({
      coefficient: {
        ...point.coefficient,
        numerator: sign * point.coefficient.numerator,
      },
      radicand: point.radicand,
    });
  }
  const prefix = sign < 0 && point.radicand !== 0 ? "-" : "";
  return point.index === 2
    ? `${prefix}√(${point.radicand})`
    : `${prefix}√[${point.index}](${point.radicand})`;
}

function g03PointSign(point) {
  if (point.kind === "rational") {
    return point.numerator === 0 ? 0 : point.numerator < 0 ? -1 : 1;
  }
  return point.radicand === 0 ? 0 : point.sign;
}

function g03CompareBigInts(left, right) {
  return left === right ? 0 : left < right ? -1 : 1;
}

function g03CompareExactPoints(left, right) {
  if (left.kind === "rational" && right.kind === "rational") {
    return g03CompareBigInts(
      BigInt(left.numerator) * BigInt(right.denominator),
      BigInt(right.numerator) * BigInt(left.denominator),
    );
  }
  const leftSign = g03PointSign(left);
  const rightSign = g03PointSign(right);
  if (leftSign === 0 && rightSign === 0) return 0;
  if (leftSign !== rightSign) return leftSign < rightSign ? -1 : 1;
  let magnitude;
  if (left.kind === "rational") {
    magnitude = g03CompareBigInts(
      g03PowBigInt(BigInt(Math.abs(left.numerator)), right.index),
      BigInt(right.radicand) * g03PowBigInt(BigInt(left.denominator), right.index),
    );
  } else if (right.kind === "rational") {
    magnitude = g03CompareBigInts(
      BigInt(left.radicand) * g03PowBigInt(BigInt(right.denominator), left.index),
      g03PowBigInt(BigInt(Math.abs(right.numerator)), left.index),
    );
  } else {
    const commonPower = (left.index * right.index) / g03Gcd(left.index, right.index);
    magnitude = g03CompareBigInts(
      g03PowBigInt(BigInt(left.radicand), commonPower / left.index),
      g03PowBigInt(BigInt(right.radicand), commonPower / right.index),
    );
  }
  return leftSign < 0 && magnitude !== 0 ? -magnitude : magnitude;
}

function g03QuadraticInvariantSymbolic(input, label) {
  const unary = input.mode === "simplify" || input.mode === "estimate-check";
  const left = validateG03InputQuadraticSurd(
    unary ? input.value : input.left,
    `${label}.${unary ? "value" : "left"}`,
  );
  if (unary) return g03QuadraticSurdSymbolic(left);
  const right = validateG03InputQuadraticSurd(input.right, `${label}.right`);
  if (input.mode === "radical-add" || input.mode === "radical-subtract") {
    const effectiveRight = {
      coefficient: normalizeG03Rational(
        (input.mode === "radical-subtract" ? -1 : 1) * right.coefficient.numerator,
        right.coefficient.denominator,
        `${label}.effectiveRight`,
      ),
      radicand: right.radicand,
    };
    if (left.radicand !== effectiveRight.radicand) {
      return [left, effectiveRight].map((term, index) => {
        const negative = term.coefficient.numerator < 0;
        const unsigned = g03QuadraticSurdSymbolic({
          ...term,
          coefficient: {
            ...term.coefficient,
            numerator: Math.abs(term.coefficient.numerator),
          },
        });
        if (index === 0) return negative ? `-${unsigned}` : unsigned;
        return `${negative ? "−" : "+"} ${unsigned}`;
      }).join(" ");
    }
  }
  return g03QuadraticSurdSymbolic(
    g03QuadraticResult(input.mode, left, right, `${label}.result`),
  );
}

function expectedG03InvariantStates(snapshot, label) {
  const state = parseG03ConfiguredState(snapshot.configuredState, label);
  const distance = state.point.kind === "rational"
    ? { ...state.point, numerator: Math.abs(state.point.numerator) }
    : { ...state.point, sign: 1 };
  const signedStep = state.operationStep === null
    ? null
    : normalizeG03Rational(
        state.mode === "subtract"
          ? -state.operationStep.numerator
          : state.operationStep.numerator,
        state.operationStep.denominator,
        `${label}.signedStep`,
      );
  const endpoint = state.operationStart === null
    ? null
    : g03RationalAdd(
        state.operationStart,
        signedStep,
        1,
        `${label}.endpoint`,
      );
  const rationals = [
    state.point,
    distance,
    state.comparisonPoint,
    state.operationStart,
    state.operationStep,
    signedStep,
    endpoint,
  ].filter((point) => point?.kind === "rational");
  const radicalPower = state.point.kind === "radical" && state.point.index === 2
    ? g03FloorScaledRadical(state.point, 10 ** state.precision)
    : null;
  const rationalOperationApplicable =
    ["add", "subtract", "multiply", "divide", "opposite"].includes(state.mode) ||
    (state.mode === "absolute-value" && state.point.kind === "rational");
  const rationalOperationResult = state.mode === "absolute-value"
    ? g03PointSymbolic(distance, state.mode)
    : rationalOperationApplicable
      ? g03PointSymbolic(state.point, state.mode)
      : "not-applicable";
  const realConceptApplicable =
    ["classify", "square-root", "cube-root", "estimate"].includes(state.mode);
  const rootMode = state.mode === "square-root" || state.mode === "cube-root";
  const realConceptExpected = rootMode
    ? String(snapshot.input.radicand)
    : "classification-or-estimate";
  const realConceptObserved = rootMode
    ? state.point.kind === "rational"
      ? g03PowBigInt(
          BigInt(state.point.numerator),
          state.mode === "square-root" ? 2 : 3,
        ).toString()
      : String(snapshot.input.radicand)
    : "classification-or-estimate";
  const encode = (id, applicable, expected, observed = expected) =>
    `${id}|${applicable ? "pass" : "not-applicable"}|${expected}|${observed}`;
  return [
    encode(
      "rational-point",
      rationals.length > 0,
      "all rational denominators are positive and reduced",
      rationals.map(g03RationalSymbolic).join(";") || "not-applicable",
    ),
    encode(
      "radical-square-error",
      radicalPower !== null,
      "lower^2 <= scaled radicand < next^2",
      radicalPower === null
        ? "not-applicable"
        : `${radicalPower.lowerPower}<=${radicalPower.targetPower}<${radicalPower.nextPower}`,
    ),
    encode(
      "absolute-value-distance",
      true,
      g03PointSymbolic(distance, state.mode),
    ),
    encode(
      "signed-origin-stability",
      true,
      g03PointSign(state.point) === 0
        ? "origin"
        : g03PointSign(state.point) < 0
          ? "negative"
          : "positive",
    ),
    encode(
      "exact-cross-product",
      state.comparisonPoint !== null,
      state.comparisonPoint === null
        ? "not-applicable"
        : String(g03CompareExactPoints(state.point, state.comparisonPoint)),
    ),
    encode(
      "additive-endpoint",
      endpoint !== null,
      endpoint === null ? "not-applicable" : g03RationalSymbolic(endpoint),
    ),
    encode(
      "topic-mode-allowlist",
      true,
      "mode belongs to the exact topic allowlist",
    ),
    encode(
      "rational-operation-reconstruction",
      rationalOperationApplicable,
      rationalOperationResult,
    ),
    encode(
      "real-concept-reconstruction",
      realConceptApplicable,
      realConceptExpected,
      realConceptObserved,
    ),
    encode(
      "quadratic-radical-reconstruction",
      g03QuadraticRadicalModes.includes(state.mode),
      g03QuadraticRadicalModes.includes(state.mode)
        ? g03QuadraticInvariantSymbolic(snapshot.input, `${label}.quadratic`)
        : "not-applicable",
    ),
  ];
}

function validateG03InvariantStates(value, snapshot, label) {
  assertReceipt(Array.isArray(value), `${label} invariantStates is not an array`);
  assertReceiptEqual(
    value,
    expectedG03InvariantStates(snapshot, label),
    `${label} invariantStates exact production payload`,
  );
}

function validateG03ActionSignature(signature, snapshot, label, currentProduct = null) {
  assertExactObjectKeys(label, signature, [
    "actionReceipt", "controls", "domainId", "geometryOwners", "geometryState",
    "invariantStates", "mode", "semanticState", "state",
  ]);
  const geometry = deriveG03Geometry(snapshot.configuredState, label);
  const expectedOwners = geometry.geometry.map((point) => ({
    exactKey: point.exactKey,
    ownerId: point.owner,
    renderMarker: point.marker,
    semanticId: point.semanticId,
  }));
  assertReceiptEqual(
    signature.controls,
    g03ExpectedSignatureControls(snapshot.input, label),
    `${label} controls reconstructed from action snapshot`,
  );
  assertReceiptEqual(
    signature.geometryOwners,
    expectedOwners,
    `${label} geometry owners reconstructed from action snapshot`,
  );
  assertReceipt(
    signature.domainId === `signed-real-number-line:${snapshot.labId}:${snapshot.mode}:v1` &&
      signature.geometryState === geometry.geometryState &&
      signature.mode === snapshot.mode &&
      signature.semanticState === snapshot.configuredState &&
      signature.state === snapshot.configuredState,
    `${label} signature leaves are not reconstructed from the action snapshot`,
  );
  validateG03InvariantStates(signature.invariantStates, snapshot, label);
  const actionReceipt = parseReceiptJson(signature.actionReceipt, `${label}.actionReceipt`);
  assertReceipt(
    signature.actionReceipt === JSON.stringify(actionReceipt),
    `${label}.actionReceipt is not the exact serialized product receipt`,
  );
  if (currentProduct === null) {
    assertReceipt(
      isRecord(actionReceipt) &&
        actionReceipt.version === "signed-real-number-line-action-receipt-v1" &&
        (actionReceipt.status === "accepted" || actionReceipt.status === "rejected"),
      `${label}.actionReceipt is not a production action receipt`,
    );
    assertReceiptEqual(
      actionReceipt.observed,
      snapshot,
      `${label}.actionReceipt prior observed snapshot`,
    );
  } else {
    assertReceiptEqual(
      actionReceipt,
      currentProduct,
      `${label}.actionReceipt current product binding`,
    );
  }
}

function g03ModeInputFromControlState(labId, mode, controls) {
  const rational = (numerator, denominator = 1) => ({
    denominator, kind: "rational", numerator,
  });
  const radical = (radicand, index = 2, sign = 1) => ({
    index, kind: "radical", radicand, sign,
  });
  const surd = (numerator, radicand, denominator = 1) => ({
    coefficient: rational(numerator, denominator), kind: "quadratic-surd", radicand,
  });
  const precision = 3;
  const exactValue = controls.numberKind === "radical"
    ? radical(controls.valueRadicand, 2, controls.valueSign)
    : rational(-3, 2);
  if (["locate", "absolute-value", "classify", "estimate"].includes(mode)) {
    return { labId, mode, precision, value: exactValue };
  }
  if (mode === "radical") {
    return { labId, mode, precision, value: radical(controls.valueRadicand, 2, controls.valueSign) };
  }
  if (mode === "compare") {
    return {
      labId,
      left: exactValue,
      mode,
      precision,
      right: rational(controls.rightRationalNumerator, controls.rightRationalDenominator),
    };
  }
  if (mode === "add" || mode === "subtract") {
    return {
      labId, mode, precision, start: rational(-3, 2),
      step: rational(mode === "add" ? 5 : -5, 4),
    };
  }
  if (mode === "multiply" || mode === "divide") {
    return {
      labId,
      left: rational(-3, 2),
      mode,
      precision,
      right: rational(controls.rightRationalNumerator, controls.rightRationalDenominator),
    };
  }
  if (mode === "opposite") return { labId, mode, precision, value: rational(-7, 3) };
  if (mode === "square-root" || mode === "cube-root") {
    return {
      labId,
      mode,
      precision,
      radicand: mode === "cube-root"
        ? controls.valueSign * controls.valueRadicand
        : controls.valueRadicand,
    };
  }
  if (mode === "simplify" || mode === "estimate-check") {
    return { labId, mode, precision, value: surd(1, controls.valueRadicand) };
  }
  const leftNumerator = mode === "radical-add" || mode === "radical-subtract" ? 2 : 1;
  return {
    labId,
    left: surd(leftNumerator, controls.valueRadicand),
    mode,
    precision,
    right: surd(
      controls.rightSurdCoefficientNumerator,
      controls.rightSurdRadicand,
      controls.rightSurdCoefficientDenominator,
    ),
  };
}

function g03AllowedNumberKinds(labId, mode) {
  const modes = g03TopicModes[labId];
  if (modes === g03RationalModes) return ["rational"];
  if (modes === g03QuadraticRadicalModes) return ["quadratic-surd"];
  if (mode === "radical" || mode === "square-root" || mode === "cube-root") {
    return ["radical"];
  }
  return ["rational", "radical"];
}

function g03DomainInteger(value, minimum, maximum) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    !Object.is(value, -0) &&
    value >= minimum &&
    value <= maximum;
}

function g03Projection(
  affectedControl,
  previousValue,
  expectedValue,
  projection,
  reason,
) {
  return { affectedControl, expectedValue, previousValue, projection, reason };
}

function planG03ControlTransition(current, request) {
  const expected = structuredClone(current);
  const projections = [];
  const accepted = () => ({ expected, projections, rejection: null });
  const rejected = (rejection) => ({
    expected: structuredClone(current),
    projections: [],
    rejection,
  });
  if (request.control === "mode") {
    if (typeof request.value !== "string") return rejected("INVALID_MODE");
    if (!g03TopicModes[current.labId]?.includes(request.value)) {
      return rejected("MODE_NOT_ALLOWED_FOR_TOPIC");
    }
    expected.mode = request.value;
    const allowedKinds = g03AllowedNumberKinds(current.labId, request.value);
    if (!allowedKinds.includes(expected.numberKind)) {
      const nextKind = allowedKinds[0];
      projections.push(g03Projection(
        "number-kind",
        expected.numberKind,
        nextKind,
        "mode-number-kind",
        "mode-requires-number-kind",
      ));
      expected.numberKind = nextKind;
    }
    if (request.value === "divide" && expected.rightRationalNumerator === 0) {
      projections.push(g03Projection(
        "right-rational-numerator",
        0,
        1,
        "exclude-zero-divisor",
        "division-requires-nonzero-rational-divisor",
      ));
      expected.rightRationalNumerator = 1;
    }
    if (request.value === "radical-divide") {
      if (expected.rightSurdCoefficientNumerator === 0) {
        projections.push(g03Projection(
          "right-surd-coefficient-numerator",
          0,
          1,
          "exclude-zero-divisor",
          "division-requires-nonzero-surd-coefficient",
        ));
        expected.rightSurdCoefficientNumerator = 1;
      }
      if (expected.rightSurdRadicand === 0) {
        projections.push(g03Projection(
          "right-surd-radicand",
          0,
          1,
          "exclude-zero-divisor",
          "division-requires-nonzero-surd-radicand",
        ));
        expected.rightSurdRadicand = 1;
      }
    }
    return accepted();
  }
  if (request.control === "number-kind") {
    if (!["rational", "radical", "quadratic-surd"].includes(request.value) ||
      !g03AllowedNumberKinds(current.labId, current.mode).includes(request.value)) {
      return rejected("NUMBER_KIND_NOT_ALLOWED");
    }
    expected.numberKind = request.value;
    return accepted();
  }
  if (request.control === "value-sign") {
    if (request.value !== -1 && request.value !== 1) {
      return rejected("CONTROL_VALUE_OUT_OF_DOMAIN");
    }
    if (current.numberKind !== "radical") return rejected("NUMBER_KIND_NOT_ALLOWED");
    if (current.valueRadicand === 0 && request.value === -1) {
      return rejected("DIRECT_REQUEST_VIOLATES_DOMAIN");
    }
    expected.valueSign = request.value;
    return accepted();
  }
  if (request.control === "value-radicand") {
    if (current.numberKind !== "radical") return rejected("NUMBER_KIND_NOT_ALLOWED");
    if (!g03DomainInteger(request.value, 0, 50_000)) {
      return rejected("CONTROL_VALUE_OUT_OF_DOMAIN");
    }
    expected.valueRadicand = request.value;
    if (request.value === 0 && expected.valueSign === -1) {
      projections.push(g03Projection(
        "value-sign",
        -1,
        1,
        "canonical-zero-sign",
        "zero-has-no-negative-sign",
      ));
      expected.valueSign = 1;
    }
    return accepted();
  }
  if (request.control === "right-rational-numerator") {
    if (!g03DomainInteger(request.value, -50_000, 50_000)) {
      return rejected("CONTROL_VALUE_OUT_OF_DOMAIN");
    }
    if (current.mode === "divide" && request.value === 0) {
      return rejected("DIRECT_REQUEST_VIOLATES_DOMAIN");
    }
    expected.rightRationalNumerator = request.value;
    return accepted();
  }
  if (request.control === "right-rational-denominator") {
    if (!g03DomainInteger(request.value, 1, 50_000)) {
      return rejected("CONTROL_VALUE_OUT_OF_DOMAIN");
    }
    expected.rightRationalDenominator = request.value;
    return accepted();
  }
  if (request.control === "right-surd-coefficient-numerator") {
    if (!g03DomainInteger(request.value, -50_000, 50_000)) {
      return rejected("CONTROL_VALUE_OUT_OF_DOMAIN");
    }
    if (current.mode === "radical-divide" && request.value === 0) {
      return rejected("DIRECT_REQUEST_VIOLATES_DOMAIN");
    }
    expected.rightSurdCoefficientNumerator = request.value;
    return accepted();
  }
  if (request.control === "right-surd-coefficient-denominator") {
    if (!g03DomainInteger(request.value, 1, 50_000)) {
      return rejected("CONTROL_VALUE_OUT_OF_DOMAIN");
    }
    expected.rightSurdCoefficientDenominator = request.value;
    return accepted();
  }
  if (request.control === "right-surd-radicand") {
    if (!g03DomainInteger(request.value, 0, 50_000)) {
      return rejected("CONTROL_VALUE_OUT_OF_DOMAIN");
    }
    if (current.mode === "radical-divide" && request.value === 0) {
      return rejected("DIRECT_REQUEST_VIOLATES_DOMAIN");
    }
    expected.rightSurdRadicand = request.value;
    return accepted();
  }
  return rejected("UNKNOWN_CONTROL");
}

function g03DomainRequest(request, labId) {
  if (request.kind === "controller") {
    return { control: request.controller, value: request.value };
  }
  if (request.kind !== "control") return null;
  const modes = g03TopicModes[labId];
  const domainControl =
    (modes === g03RealModes &&
      (request.control === "value-sign" || request.control === "value-radicand")) ||
    (modes === g03RationalModes &&
      (request.control === "right-rational-numerator" ||
        request.control === "right-rational-denominator")) ||
    (modes === g03QuadraticRadicalModes &&
      (request.control === "right-surd-coefficient-numerator" ||
        request.control === "right-surd-coefficient-denominator" ||
        request.control === "right-surd-radicand"));
  return domainControl
    ? { control: request.control, value: request.value }
    : null;
}

function g03InputAfterDomainTransition(current, controls, request) {
  if (request.control === "mode" || request.control === "number-kind") {
    return g03ModeInputFromControlState(current.labId, controls.mode, controls);
  }
  if (request.control === "value-sign" || request.control === "value-radicand") {
    const radical = (radicand, index, sign) => ({ index, kind: "radical", radicand, sign });
    if (["locate", "absolute-value", "radical", "classify", "estimate"].includes(current.mode)) {
      if (current.value.kind !== "radical") return structuredClone(current);
      return {
        ...structuredClone(current),
        value: radical(controls.valueRadicand, current.value.index, controls.valueSign),
      };
    }
    if (current.mode === "compare" && current.left.kind === "radical") {
      return {
        ...structuredClone(current),
        left: radical(controls.valueRadicand, current.left.index, controls.valueSign),
      };
    }
    if (current.mode === "square-root" || current.mode === "cube-root") {
      return {
        ...structuredClone(current),
        radicand: current.mode === "cube-root"
          ? controls.valueSign * controls.valueRadicand
          : controls.valueRadicand,
      };
    }
    return structuredClone(current);
  }
  if (request.control === "right-rational-numerator" ||
    request.control === "right-rational-denominator") {
    if (["compare", "multiply", "divide"].includes(current.mode) &&
      current.right.kind === "rational") {
      return {
        ...structuredClone(current),
        right: {
          denominator: controls.rightRationalDenominator,
          kind: "rational",
          numerator: controls.rightRationalNumerator,
        },
      };
    }
    return structuredClone(current);
  }
  if (request.control === "right-surd-coefficient-numerator" ||
    request.control === "right-surd-coefficient-denominator" ||
    request.control === "right-surd-radicand") {
    if (["radical-add", "radical-subtract", "radical-multiply", "radical-divide"].includes(current.mode)) {
      return {
        ...structuredClone(current),
        right: {
          coefficient: {
            denominator: controls.rightSurdCoefficientDenominator,
            kind: "rational",
            numerator: controls.rightSurdCoefficientNumerator,
          },
          kind: "quadratic-surd",
          radicand: controls.rightSurdRadicand,
        },
      };
    }
  }
  return structuredClone(current);
}

function g03NormalInputTransition(current, request, label) {
  const next = structuredClone(current);
  if (request.control === "precision") {
    next.precision = request.value;
    return next;
  }
  const match = request.control.match(
    /^(value|left|right|start|step)-(kind|sign|radicand|index|numerator|denominator|coefficient-numerator|coefficient-denominator)$/u,
  );
  assertReceipt(match !== null, `${label} ordinary action oracle has an unknown direct control`);
  const [, prefix, field] = match;
  if (field === "kind") {
    next[prefix] = request.value === "radical"
      ? { index: 2, kind: "radical", radicand: 2, sign: 1 }
      : { denominator: 2, kind: "rational", numerator: -3 };
    return next;
  }
  const target = next[prefix];
  assertReceipt(isRecord(target), `${label} ordinary action oracle direct target is missing`);
  if (field === "coefficient-numerator" || field === "coefficient-denominator") {
    assertReceipt(isRecord(target.coefficient), `${label} ordinary action oracle coefficient is missing`);
    target.coefficient[field === "coefficient-numerator" ? "numerator" : "denominator"] =
      request.value;
  } else {
    target[field] = request.value;
  }
  return next;
}

function g03CanonicalActionExactInput(value) {
  if (value.kind === "rational") {
    return {
      denominator: value.denominator,
      kind: "rational",
      numerator: value.numerator,
    };
  }
  return {
    index: value.index,
    kind: "radical",
    radicand: Math.abs(value.radicand),
    sign: value.radicand === 0 ? 1 : value.sign,
  };
}

function g03CanonicalActionInput(input) {
  if (["locate", "absolute-value", "radical", "classify", "estimate"].includes(input.mode)) {
    return { ...input, value: g03CanonicalActionExactInput(input.value) };
  }
  if (input.mode === "compare") {
    return {
      ...input,
      left: g03CanonicalActionExactInput(input.left),
      right: g03CanonicalActionExactInput(input.right),
    };
  }
  return input;
}

function g03ActionSnapshotFromInput(input, label) {
  return {
    configuredState: g03ConfiguredStateFromInput(input, label),
    controlState: g03ControlStateFromInput(input),
    input: structuredClone(input),
    labId: input.labId,
    mode: input.mode,
    pendingRequest: null,
  };
}

function expectedG03Action(before, request, label) {
  if (request.kind === "initial" || request.kind === "reset") {
    const input = g03TopicResetInputs[before.labId];
    assertReceipt(isRecord(input), `${label} ordinary action oracle has no reset input`);
    return {
      expected: g03ActionSnapshotFromInput(input, `${label}.reset`),
      projections: [],
      rejection: null,
    };
  }
  const domainRequest = g03DomainRequest(request, before.labId);
  if (domainRequest !== null) {
    const transition = planG03ControlTransition(before.controlState, domainRequest);
    if (transition.rejection !== null) {
      return {
        expected: structuredClone(before),
        projections: [],
        rejection: transition.rejection,
      };
    }
    const input = g03InputAfterDomainTransition(
      before.input,
      transition.expected,
      domainRequest,
    );
    const expected = g03ActionSnapshotFromInput(input, `${label}.domain`);
    assertReceiptEqual(
      expected.controlState,
      transition.expected,
      `${label} ordinary action oracle post-projection controls`,
    );
    return { expected, projections: transition.projections, rejection: null };
  }
  assertReceipt(request.kind === "control", `${label} ordinary action oracle request is unsupported`);
  const input = g03CanonicalActionInput(
    g03NormalInputTransition(before.input, request, label),
  );
  return {
    expected: g03ActionSnapshotFromInput(input, `${label}.direct`),
    projections: [],
    rejection: null,
  };
}

function validateG03ActionOracle(product, label) {
  const oracle = expectedG03Action(product.before, product.request, label);
  assertReceiptEqual(
    product.projections,
    oracle.projections,
    `${label} ordinary action oracle exact projection ledger`,
  );
  const expectedStatus = oracle.rejection === null ? "accepted" : "rejected";
  assertReceipt(
    product.status === expectedStatus && product.rejection === oracle.rejection,
    `${label} ordinary action oracle status/rejection is not exact`,
  );
  assertReceiptEqual(
    product.expected,
    oracle.expected,
    `${label} ordinary action oracle expected snapshot`,
  );
  assertReceiptEqual(
    product.observed,
    oracle.expected,
    `${label} ordinary action oracle observed snapshot`,
  );
}

function validateG03StateReceipt(receipt, label) {
  const configuredState = requireReceiptString(receipt, "configuredState", label);
  assertReceipt(configuredState.startsWith("signed-real-number-line-v1|"), `${label} configured state version is invalid`);
  const mode = requireReceiptString(receipt, "mode", label);
  const geometry = requireReceiptArray(receipt, "geometry", label);
  assertReceipt(geometry.length > 0, `${label} lacks positive geometry evidence`);
  for (const [index, point] of geometry.entries()) {
    const pointLabel = `${label}.geometry[${index}]`;
    assertReceipt(isRecord(point), `${pointLabel} is malformed`);
    assertExactObjectKeys(
      pointLabel,
      point,
      ["exactKey", "lower", "marker", "owner", "reason", "rendered", "semanticId", "upper"],
    );
    assertReceipt(point.status === undefined, `${pointLabel} has an unmodelled geometry status`);
    for (const field of ["exactKey", "owner", "reason", "semanticId"]) {
      assertReceipt(isNonEmptyString(point[field]), `${pointLabel}.${field} lacks an identity`);
    }
    for (const field of ["lower", "rendered", "upper"]) {
      assertReceipt(typeof point[field] === "number" && Number.isFinite(point[field]), `${pointLabel}.${field} is not finite`);
    }
    assertReceipt(typeof point.marker === "boolean", `${pointLabel}.marker is not boolean`);
    assertReceipt(point.lower <= point.rendered && point.rendered <= point.upper, `${pointLabel} escaped its certified geometry interval`);
  }
  const semanticIds = geometry.map((point) => point.semanticId);
  assertReceipt(
    duplicates(semanticIds).length === 0,
    `${label}.geometry contains duplicate semantic identities`,
  );
  const geometryByExactKey = new Map();
  for (const point of geometry) {
    const colocated = geometryByExactKey.get(point.exactKey) ?? [];
    colocated.push(point);
    geometryByExactKey.set(point.exactKey, colocated);
  }
  for (const [exactKey, colocated] of geometryByExactKey) {
    assertReceipt(
      colocated.filter((point) => point.marker).length === 1,
      `${label}.geometry exact key ${exactKey} must expose exactly one marker`,
    );
    assertReceipt(
      new Set(colocated.map((point) => point.owner)).size === 1,
      `${label}.geometry exact key ${exactKey} must expose exactly one colocation owner`,
    );
  }
  const derivedGeometry = deriveG03Geometry(configuredState, label);
  assertReceipt(mode === derivedGeometry.state.mode, `${label} mode is not derived from configured state`);
  assertG03GeometryEqual(geometry, derivedGeometry.geometry, label);
  const layout = requireReceiptRecord(receipt, "layout", label);
  assertReceipt(layout.status === undefined, `${label}.layout has an unmodelled status`);
  requireReceiptPositiveNumber(layout, "targetCount", `${label}.layout`);

  const action = requireReceiptRecord(receipt, "action", label);
  assertExactObjectKeys(
    `${label}.action`,
    action,
    ["beforeSignature", "expectedSignature", "observedSignature", "plannedRequest", "projections", "receipt"],
  );
  assertReceipt(action.status === undefined, `${label}.action has an invalid wrapper status`);
  const product = requireReceiptRecord(action, "receipt", `${label}.action`);
  assertExactObjectKeys(
    `${label}.action.receipt`,
    product,
    ["before", "expected", "observed", "projections", "rejection", "request", "requested", "status", "version"],
  );
  assertReceipt(product.version === "signed-real-number-line-action-receipt-v1", `${label} action receipt version is invalid`);
  assertReceipt(product.status === "accepted" || product.status === "rejected", `${label} action receipt status is invalid`);
  assertReceipt(
    (product.status === "accepted" && product.rejection === null) ||
      (product.status === "rejected" && isNonEmptyString(product.rejection)),
    `${label} action status/rejection relationship is invalid`,
  );
  for (const field of ["request", "before", "requested", "expected", "observed"]) {
    requireReceiptRecord(product, field, `${label}.action.receipt`);
  }
  const productProjections = requireReceiptArray(product, "projections", `${label}.action.receipt`);
  validateG03Request(product.request, derivedGeometry.state, `${label}.action.receipt.request`);
  validateG03Snapshot(product.before, `${label}.action.receipt.before`, null);
  validateG03Snapshot(product.requested, `${label}.action.receipt.requested`, product.request);
  validateG03Snapshot(product.expected, `${label}.action.receipt.expected`, null);
  validateG03Snapshot(product.observed, `${label}.action.receipt.observed`, null);
  assertReceiptEqual(product.requested.pendingRequest, product.request, `${label} action requested pendingRequest`);
  assertReceiptEqual(
    { ...product.requested, pendingRequest: null },
    product.before,
    `${label} action requested snapshot before state`,
  );
  assertReceiptEqual(product.observed, product.expected, `${label} action observed state`);
  assertReceiptEqual(action.plannedRequest, product.request, `${label} planned action request`);
  assertReceiptEqual(action.projections, product.projections, `${label} action projections`);
  const expectedSignature = requireReceiptRecord(action, "expectedSignature", `${label}.action`);
  const observedSignature = requireReceiptRecord(action, "observedSignature", `${label}.action`);
  const beforeSignature = requireReceiptRecord(action, "beforeSignature", `${label}.action`);
  for (const [signatureName, signature] of [
    ["beforeSignature", beforeSignature],
    ["expectedSignature", expectedSignature],
    ["observedSignature", observedSignature],
  ]) {
    assertExactObjectKeys(
      `${label}.action.${signatureName}`,
      signature,
      ["actionReceipt", "controls", "domainId", "geometryOwners", "geometryState", "invariantStates", "mode", "semanticState", "state"],
    );
  }
  validateG03ActionSignature(
    beforeSignature,
    product.before,
    `${label}.action.beforeSignature`,
  );
  validateG03ActionSignature(
    expectedSignature,
    product.expected,
    `${label}.action.expectedSignature`,
    product,
  );
  validateG03ActionSignature(
    observedSignature,
    product.observed,
    `${label}.action.observedSignature`,
    product,
  );
  const reconstructedGeometryOwners = geometry.map((point) => ({
    exactKey: point.exactKey,
    ownerId: point.owner,
    renderMarker: point.marker,
    semanticId: point.semanticId,
  }));
  assertReceiptEqual(
    requireReceiptArray(expectedSignature, "geometryOwners", `${label}.action.expectedSignature`),
    reconstructedGeometryOwners,
    `${label} G03 geometry action-owner ledger`,
  );
  assertReceiptEqual(
    requireReceiptArray(observedSignature, "geometryOwners", `${label}.action.observedSignature`),
    reconstructedGeometryOwners,
    `${label} G03 geometry observed action-owner ledger`,
  );
  assertReceipt(product.before.configuredState === beforeSignature.state, `${label} action before configured state is inconsistent`);
  assertReceipt(product.before.mode === beforeSignature.mode, `${label} action before mode is inconsistent`);
  assertReceipt(product.expected.configuredState === expectedSignature.state, `${label} action expected configured state is inconsistent`);
  assertReceipt(product.expected.mode === expectedSignature.mode, `${label} action expected mode is inconsistent`);
  assertReceiptEqual(observedSignature, expectedSignature, `${label} action signature`);
  assertReceipt(
    expectedSignature.geometryState === derivedGeometry.geometryState,
    `${label} G03 geometry signature state is not derived from configured state`,
  );
  assertReceipt(
    expectedSignature.domainId ===
      `signed-real-number-line:${derivedGeometry.state.labId}:${derivedGeometry.state.mode}:v1`,
    `${label} G03 control-domain identity is not derived from configured state`,
  );
  assertReceiptEqual(observedSignature.controls, receipt.controls, `${label} visible controls`);
  assertReceipt(observedSignature.state === configuredState, `${label} configured-state signature is inconsistent`);
  assertReceipt(observedSignature.semanticState === configuredState, `${label} semantic-state signature is inconsistent`);
  assertReceipt(observedSignature.mode === mode, `${label} mode signature is inconsistent`);
  validateG03CanonicalReset(
    product.request,
    product.expected,
    expectedSignature,
    geometry,
    label,
  );
  validateG03ActionOracle(product, `${label} G03`);
}

function validateDomainReceipt(domain, label, { requiresMatch = false } = {}) {
  for (const field of ["requested", "expected", "observed"]) {
    requireReceiptRecord(domain, field, label);
  }
  assertReceiptEqual(domain.observed, domain.expected, `${label} observed domain`);
  if (requiresMatch) assertReceipt(domain.match === true, `${label}.match must be true`);
  assertReceipt(exactNonNegativeInteger(domain.projectionCount), `${label}.projectionCount is invalid`);
  if (domain.projectionReasons !== undefined) {
    assertReceipt(Array.isArray(domain.projectionReasons), `${label}.projectionReasons must be an array`);
    assertReceipt(domain.projectionReasons.length === domain.projectionCount, `${label} projection count/reasons are inconsistent`);
  }
}

function validateSupportedVisual(visual, label) {
  assertReceipt(isRecord(visual), `${label} is malformed`);
  assertReceipt(isNonEmptyString(visual.kind), `${label}.kind is missing`);
  assertReceipt(visual.status === "supported", `${label}.status is not supported`);
  assertReceipt(
    exactPositiveInteger(visual.markCount),
    `${label}.markCount is not an exact positive integer`,
  );
  validateSupportedVisualReceipt(
    requireReceiptRecord(visual, "receipt", label),
    visual.kind,
    `${label}.receipt`,
  );
}

function validateSupportedVisualReceipt(receipt, expectedKind, label) {
  assertReceipt(isRecord(receipt), `${label} is malformed`);
  assertReceipt(receipt.status === "supported", `${label}.status is not supported`);
  assertReceipt(receipt.kind === expectedKind, `${label}.kind does not match ${expectedKind}`);
}

const g04PhysicalInterpretationsByOperation = Object.freeze({
  add: Object.freeze([]),
  compare: Object.freeze([]),
  divide: Object.freeze([
    Object.freeze({ kind: "measurement-division", name: "division-measurement-interpretation" }),
    Object.freeze({ kind: "sharing-division", name: "division-sharing-interpretation" }),
  ]),
  equivalence: Object.freeze([]),
  multiply: Object.freeze([
    Object.freeze({ kind: "area-grid", name: "multiplication-area-interpretation" }),
    Object.freeze({ kind: "part-of-quantity", name: "multiplication-repeated-group-interpretation" }),
    Object.freeze({ kind: "scaling", name: "multiplication-scaling-interpretation" }),
  ]),
  simplify: Object.freeze([]),
  subtract: Object.freeze([]),
});

const g04Modes = Object.freeze([
  "equivalence",
  "compare",
  "add",
  "subtract",
  "multiply",
  "divide",
  "simplify",
  "estimate",
]);

const g04EvaluatedOperations = Object.freeze(
  g04Modes.filter((mode) => mode !== "estimate"),
);

const g04EstimateOperations = Object.freeze([
  "add",
  "subtract",
  "multiply",
  "divide",
]);

const g04DomainStateKeys = Object.freeze([
  "evaluatedOperation",
  "leftDenominator",
  "leftNumerator",
  "mode",
  "rightDenominator",
  "rightNumerator",
]);

const g04ModeAllowlists = Object.freeze({
  "bnu-primary-p5-lower-fraction-add-sub": Object.freeze([
    "add",
    "subtract",
    "simplify",
    "estimate",
  ]),
  "bnu-primary-p5-lower-fraction-division": Object.freeze([
    "divide",
    "simplify",
    "estimate",
  ]),
  "bnu-primary-p5-lower-fraction-multiplication": Object.freeze([
    "multiply",
    "simplify",
    "estimate",
  ]),
  "hjb-primary-p5-lower-fractions-equivalence-operations": Object.freeze([
    "equivalence",
    "compare",
    "add",
    "subtract",
    "simplify",
    "estimate",
  ]),
  "pep-primary-p5-lower-factors-fractions": g04Modes,
});

const g04EstimateOperationAllowlists = Object.freeze({
  "bnu-primary-p5-lower-fraction-add-sub": Object.freeze(["add", "subtract"]),
  "bnu-primary-p5-lower-fraction-division": Object.freeze(["divide"]),
  "bnu-primary-p5-lower-fraction-multiplication": Object.freeze(["multiply"]),
  "hjb-primary-p5-lower-fractions-equivalence-operations": Object.freeze([
    "add",
    "subtract",
  ]),
  "pep-primary-p5-lower-factors-fractions": g04EstimateOperations,
});

const g04ResetStates = Object.freeze({
  "bnu-primary-p5-lower-fraction-add-sub": Object.freeze({
    evaluatedOperation: "add",
    leftDenominator: 4,
    leftNumerator: 7,
    mode: "add",
    rightDenominator: 6,
    rightNumerator: 5,
  }),
  "bnu-primary-p5-lower-fraction-division": Object.freeze({
    evaluatedOperation: "divide",
    leftDenominator: 4,
    leftNumerator: 7,
    mode: "divide",
    rightDenominator: 6,
    rightNumerator: 5,
  }),
  "bnu-primary-p5-lower-fraction-multiplication": Object.freeze({
    evaluatedOperation: "multiply",
    leftDenominator: 4,
    leftNumerator: 7,
    mode: "multiply",
    rightDenominator: 6,
    rightNumerator: 5,
  }),
  "hjb-primary-p5-lower-fractions-equivalence-operations": Object.freeze({
    evaluatedOperation: "equivalence",
    leftDenominator: 4,
    leftNumerator: 6,
    mode: "equivalence",
    rightDenominator: 6,
    rightNumerator: 9,
  }),
  "pep-primary-p5-lower-factors-fractions": Object.freeze({
    evaluatedOperation: "simplify",
    leftDenominator: 8,
    leftNumerator: 12,
    mode: "simplify",
    rightDenominator: 10,
    rightNumerator: 15,
  }),
});

function exactBigIntAbsolute(value) {
  return value < 0n ? -value : value;
}

function exactBigIntGcd(left, right) {
  let a = exactBigIntAbsolute(left);
  let b = exactBigIntAbsolute(right);
  while (b !== 0n) [a, b] = [b, a % b];
  return a === 0n ? 1n : a;
}

function normalizeExactBigIntRational(numerator, denominator, label) {
  assertReceipt(denominator !== 0n, `${label} has a zero denominator`);
  if (numerator === 0n) return { denominator: 1n, numerator: 0n };
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = exactBigIntGcd(numerator, denominator);
  return {
    denominator: exactBigIntAbsolute(denominator / divisor),
    numerator: sign * (numerator / divisor),
  };
}

function exactBigIntRationalString(value) {
  return `${value.numerator}/${value.denominator}`;
}

function parseExactBigIntRational(value, label, { normalized = false } = {}) {
  assertReceipt(
    typeof value === "string" &&
      /^(?:0|-[1-9][0-9]*|[1-9][0-9]*)\/(?:[1-9][0-9]*)$/u.test(value),
    `${label} is not a canonical exact rational string`,
  );
  const [numeratorText, denominatorText] = value.split("/");
  const rational = {
    denominator: BigInt(denominatorText),
    numerator: BigInt(numeratorText),
  };
  if (normalized) {
    assertReceipt(
      exactBigIntRationalString(
        normalizeExactBigIntRational(rational.numerator, rational.denominator, label),
      ) === value,
      `${label} is not normalized`,
    );
  }
  return rational;
}

function deriveG04ExactResult(left, right, operation, label) {
  if (operation === "add" || operation === "subtract" || operation === "compare") {
    const direction = operation === "add" ? 1n : -1n;
    return normalizeExactBigIntRational(
      left.numerator * right.denominator +
        direction * right.numerator * left.denominator,
      left.denominator * right.denominator,
      label,
    );
  }
  if (operation === "multiply") {
    return normalizeExactBigIntRational(
      left.numerator * right.numerator,
      left.denominator * right.denominator,
      label,
    );
  }
  if (operation === "divide") {
    assertReceipt(right.numerator !== 0n, `${label} divides by zero`);
    return normalizeExactBigIntRational(
      left.numerator * right.denominator,
      left.denominator * right.numerator,
      label,
    );
  }
  assertReceipt(
    operation === "equivalence" || operation === "simplify",
    `${label} has an invalid evaluated operation`,
  );
  return normalizeExactBigIntRational(left.numerator, left.denominator, label);
}

function parseG04ConfiguredState(configuredState, label) {
  const parts = configuredState.split("|");
  assertReceipt(
    parts.length === 7 && parts[0] === "fraction-operations-v2",
    `${label} configured state is not the exact seven-segment state key`,
  );
  const names = ["lab", "mode", "evaluated", "left", "right", "result"];
  const fields = {};
  for (const [index, name] of names.entries()) {
    const prefix = `${name}=`;
    assertReceipt(
      parts[index + 1].startsWith(prefix),
      `${label} configured state lacks exact ${name}`,
    );
    fields[name] = parts[index + 1].slice(prefix.length);
  }
  const allowedModes = g04ModeAllowlists[fields.lab];
  assertReceipt(Array.isArray(allowedModes), `${label} configured lab is not a production G04 lab`);
  assertReceipt(
    allowedModes.includes(fields.mode),
    `${label} configured mode is outside its exact lab allowlist`,
  );
  assertReceipt(
    g04EvaluatedOperations.includes(fields.evaluated),
    `${label} configured evaluated operation is invalid`,
  );
  if (fields.mode === "estimate") {
    assertReceipt(
      g04EstimateOperationAllowlists[fields.lab].includes(fields.evaluated),
      `${label} configured estimate operation is outside its exact lab allowlist`,
    );
  } else {
    assertReceipt(
      fields.evaluated === fields.mode,
      `${label} configured mode/evaluated operation pair is inconsistent`,
    );
  }
  const left = parseExactBigIntRational(fields.left, `${label}.left`);
  const right = parseExactBigIntRational(fields.right, `${label}.right`);
  const result = parseExactBigIntRational(fields.result, `${label}.result`, {
    normalized: true,
  });
  const derivedResult = deriveG04ExactResult(
    left,
    right,
    fields.evaluated,
    `${label}.result`,
  );
  assertReceipt(
    exactBigIntRationalString(result) === exactBigIntRationalString(derivedResult),
    `${label} configured result does not reconstruct the exact operands and operation`,
  );
  return {
    evaluatedOperation: fields.evaluated,
    labId: fields.lab,
    left,
    mode: fields.mode,
    result,
    right,
  };
}

function validateG04DomainState(state, label, { allowRequestedDivisorZero = false } = {}) {
  assertExactObjectKeys(label, state, g04DomainStateKeys);
  assertReceipt(g04Modes.includes(state.mode), `${label}.mode is not a production G04 mode`);
  assertReceipt(
    g04EvaluatedOperations.includes(state.evaluatedOperation),
    `${label}.evaluatedOperation is not a production G04 operation`,
  );
  assertReceipt(
    state.mode === "estimate"
      ? g04EstimateOperations.includes(state.evaluatedOperation)
      : state.mode === state.evaluatedOperation,
    `${label} mode/evaluatedOperation pair is invalid`,
  );
  for (const field of ["leftNumerator", "rightNumerator"]) {
    assertReceipt(
      Number.isSafeInteger(state[field]) && state[field] >= -48 && state[field] <= 48,
      `${label}.${field} is outside the exact numerator domain -48..48`,
    );
  }
  for (const field of ["leftDenominator", "rightDenominator"]) {
    assertReceipt(
      Number.isSafeInteger(state[field]) && state[field] >= 1 && state[field] <= 24,
      `${label}.${field} is outside the exact denominator domain 1..24`,
    );
  }
  assertReceipt(
    allowRequestedDivisorZero ||
      state.evaluatedOperation !== "divide" ||
      state.rightNumerator !== 0,
    `${label} persists a zero divisor in division mode`,
  );
}

function validateG04DomainReceipt(domain, label) {
  assertExactObjectKeys(
    label,
    domain,
    ["expected", "match", "observed", "projectionCount", "projectionReasons", "rejection", "requested"],
  );
  validateDomainReceipt(domain, label, { requiresMatch: true });
  validateG04DomainState(domain.requested, `${label}.requested`, {
    allowRequestedDivisorZero: true,
  });
  validateG04DomainState(domain.expected, `${label}.expected`);
  validateG04DomainState(domain.observed, `${label}.observed`);
  if (
    domain.requested.evaluatedOperation === "divide" &&
    domain.requested.rightNumerator === 0
  ) {
    assertReceipt(
      domain.rejection === "DIRECT_DIVISOR_ZERO_REQUEST" ||
        (domain.projectionCount > 0 &&
          domain.projectionReasons.includes("division-divisor-cannot-be-zero")),
      `${label} records an accepted divide-zero request without projection evidence`,
    );
  }
}

const g04NumericControlContracts = Object.freeze({
  "left-numerator": Object.freeze({ field: "leftNumerator", max: 48, min: -48 }),
  "left-denominator": Object.freeze({ field: "leftDenominator", max: 24, min: 1 }),
  "right-numerator": Object.freeze({ field: "rightNumerator", max: 48, min: -48 }),
  "right-denominator": Object.freeze({ field: "rightDenominator", max: 24, min: 1 }),
});

function cloneG04DomainState(state) {
  return {
    evaluatedOperation: state.evaluatedOperation,
    leftDenominator: state.leftDenominator,
    leftNumerator: state.leftNumerator,
    mode: state.mode,
    rightDenominator: state.rightDenominator,
    rightNumerator: state.rightNumerator,
  };
}

function deriveG04ActionTransition(before, request, labId, label) {
  if (
    request.kind !== "control" &&
    request.kind !== "controller" &&
    request.kind !== "reset" &&
    request.kind !== "initial"
  ) return null;
  const labModes = g04ModeAllowlists[labId];
  assertReceipt(Array.isArray(labModes), `${label} has an unknown G04 labId`);
  assertReceipt(
    labModes.includes(before.mode),
    `${label} before state mode is outside the exact G04 lab allowlist`,
  );
  if (before.mode === "estimate") {
    assertReceipt(
      g04EstimateOperationAllowlists[labId].includes(before.evaluatedOperation),
      `${label} before state estimate operation is outside the exact G04 lab allowlist`,
    );
  }
  if (request.kind === "reset" || request.kind === "initial") {
    const resetState = g04ResetStates[labId];
    assertReceipt(isRecord(resetState), `${label} has no exact G04 reset state`);
    const canonicalReset = cloneG04DomainState(resetState);
    return {
      accepted: true,
      ...(request.kind === "initial"
        ? { before: cloneG04DomainState(canonicalReset) }
        : {}),
      expected: cloneG04DomainState(canonicalReset),
      observed: cloneG04DomainState(canonicalReset),
      projections: [],
      rejection: null,
      requested: cloneG04DomainState(canonicalReset),
      requestedValidity: "accepted-as-requested",
      status: "accepted",
    };
  }
  let requested;
  let directDivisorZero = false;
  if (request.kind === "control") {
    const contract = g04NumericControlContracts[request.controlId];
    assertReceipt(isRecord(contract), `${label} has an invalid G04 control request`);
    requested = {
      ...cloneG04DomainState(before),
      [contract.field]: request.value,
    };
    directDivisorZero =
      request.controlId === "right-numerator" &&
      request.value === 0 &&
      before.evaluatedOperation === "divide";
  } else {
    assertReceipt(
      labModes.includes(request.mode),
      `${label} controller mode is outside the exact G04 lab allowlist`,
    );
    assertReceipt(
      request.mode === "estimate"
        ? g04EstimateOperationAllowlists[labId].includes(request.evaluatedOperation)
        : request.mode === request.evaluatedOperation,
      `${label} controller mode/evaluated operation is outside the exact G04 lab allowlist`,
    );
    requested = {
      ...cloneG04DomainState(before),
      evaluatedOperation: request.evaluatedOperation,
      mode: request.mode,
    };
  }
  const requiresProjection =
    request.kind === "controller" &&
    requested.evaluatedOperation === "divide" &&
    requested.rightNumerator === 0;
  const projections = requiresProjection
    ? [{
        affectedControlId: "right-numerator",
        after: 1,
        before: 0,
        controllerInputs: {
          evaluatedOperation: "divide",
          mode: requested.mode,
        },
        domainId: "fraction-operations-divisor-nonzero-v1",
        projection: "exclude-zero",
        reason: "division-divisor-cannot-be-zero",
      }]
    : [];
  const acceptedExpected = requiresProjection
    ? { ...cloneG04DomainState(requested), rightNumerator: 1 }
    : cloneG04DomainState(requested);
  return {
    accepted: !directDivisorZero,
    expected: directDivisorZero ? cloneG04DomainState(before) : acceptedExpected,
    observed: directDivisorZero ? cloneG04DomainState(before) : acceptedExpected,
    projections: directDivisorZero ? [] : projections,
    rejection: directDivisorZero ? "DIRECT_DIVISOR_ZERO_REQUEST" : null,
    requested,
    requestedValidity: directDivisorZero
      ? "rejected-invalid"
      : requiresProjection
        ? "requires-projection"
        : "accepted-as-requested",
    status: directDivisorZero ? "rejected" : "accepted",
  };
}

function validateDerivedG04ActionTransition(product, labId, label) {
  const derived = deriveG04ActionTransition(
    product.before,
    product.request,
    labId,
    `${label} G04 ${product.request.kind} transition`,
  );
  if (derived === null) return;
  for (const field of [
    ...(Object.hasOwn(derived, "before") ? ["before"] : []),
    "requested",
    "expected",
    "observed",
    "projections",
  ]) {
    assertReceiptEqual(
      product[field],
      derived[field],
      `${label} G04 ${product.request.kind} request derived ${field} state`,
    );
  }
  for (const field of [
    "accepted",
    "rejection",
    "requestedValidity",
    "status",
  ]) {
    assertReceipt(
      product[field] === derived[field],
      `${label} G04 ${product.request.kind} request derived ${field} is inconsistent`,
    );
  }
}

function validateG04NumericControlValue(value, min, max, step, label) {
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  assertReceipt(
    Number.isSafeInteger(parsed) &&
      value === String(parsed) &&
      Number.isSafeInteger(min) &&
      Number.isSafeInteger(max) &&
      Number.isSafeInteger(step) &&
      step > 0 &&
      parsed >= min &&
      parsed <= max &&
      (parsed - min) % step === 0,
    `${label} is not a canonical safe integer inside its declared min/max/step domain`,
  );
  return parsed;
}

function validateG04ActionRequest(request, label, { allowInitialReset = true } = {}) {
  assertReceipt(isRecord(request), `${label} is malformed`);
  if (request.kind === "initial" || request.kind === "reset") {
    assertReceipt(allowInitialReset, `${label}.${request.kind} is not a planner-domain request`);
    assertExactObjectKeys(label, request, ["kind"]);
    return;
  }
  if (request.kind === "control") {
    assertExactObjectKeys(label, request, ["controlId", "kind", "value"]);
    const contract = g04NumericControlContracts[request.controlId];
    assertReceipt(isRecord(contract), `${label}.controlId is invalid`);
    assertReceipt(
      Number.isSafeInteger(request.value) &&
        request.value >= contract.min &&
        request.value <= contract.max,
      `${label}.value is outside the exact production control domain`,
    );
    return;
  }
  assertReceipt(request.kind === "controller", `${label}.kind is invalid`);
  assertExactObjectKeys(label, request, ["evaluatedOperation", "kind", "mode"]);
  validateG04DomainState(
    {
      evaluatedOperation: request.evaluatedOperation,
      leftDenominator: 1,
      leftNumerator: 1,
      mode: request.mode,
      rightDenominator: 1,
      rightNumerator: 1,
    },
    `${label}.controller`,
  );
}

function validateG04Projection(projection, label) {
  assertExactObjectKeys(
    label,
    projection,
    ["affectedControlId", "after", "before", "controllerInputs", "domainId", "projection", "reason"],
  );
  assertReceipt(
    projection.affectedControlId === "right-numerator" &&
      projection.after === 1 &&
      projection.before === 0 &&
      projection.domainId === "fraction-operations-divisor-nonzero-v1" &&
      projection.projection === "exclude-zero" &&
      projection.reason === "division-divisor-cannot-be-zero",
    `${label} is not the exact production divide-zero projection`,
  );
  assertExactObjectKeys(`${label}.controllerInputs`, projection.controllerInputs, ["evaluatedOperation", "mode"]);
  assertReceipt(
    projection.controllerInputs.evaluatedOperation === "divide" &&
      (projection.controllerInputs.mode === "divide" ||
        projection.controllerInputs.mode === "estimate"),
    `${label}.controllerInputs are invalid`,
  );
}

function validateG04ControlSnapshots(controls, state, labId, label) {
  assertReceipt(Array.isArray(controls), `${label} must be an array`);
  const estimateOperations = g04EstimateOperationAllowlists[labId];
  assertReceipt(
    Array.isArray(estimateOperations),
    `${label} has no exact lab-specific estimate allowlist`,
  );
  const expectedParameters = [
    ...(state.mode === "estimate" ? ["estimate-operation"] : []),
    ...Object.keys(g04NumericControlContracts),
  ];
  assertReceipt(
    sameArray(controls.map((control) => control?.parameter), expectedParameters),
    `${label} does not expose the exact production parameter order`,
  );
  for (const [index, control] of controls.entries()) {
    const controlLabel = `${label}[${index}]`;
    assertExactObjectKeys(
      controlLabel,
      control,
      ["affects", "disabled", "kind", "max", "min", "options", "parameter", "projection", "projectionReason", "step", "value", "zeroExcluded"],
    );
    assertReceipt(control.disabled === false, `${controlLabel} is disabled`);
    if (control.parameter === "estimate-operation") {
      assertReceipt(
        control.kind === "select" &&
          control.max === null &&
          control.min === null &&
          control.step === null &&
          control.zeroExcluded === null &&
          sameArray(control.options, estimateOperations) &&
          control.value === state.evaluatedOperation &&
          sameArray(control.affects, ["right-numerator"]) &&
          control.projection === "exclude-zero" &&
          control.projectionReason === "division-divisor-cannot-be-zero",
        `${controlLabel} does not reconstruct the estimate-operation control`,
      );
      continue;
    }
    const contract = g04NumericControlContracts[control.parameter];
    assertReceipt(isRecord(contract), `${controlLabel}.parameter is invalid`);
    const numericValue = validateG04NumericControlValue(
      control.value,
      control.min,
      control.max,
      control.step,
      `${controlLabel}.value`,
    );
    assertReceipt(
      control.kind === "number" &&
        control.max === contract.max &&
        control.min === contract.min &&
        control.step === 1 &&
        Array.isArray(control.options) && control.options.length === 0 &&
        Array.isArray(control.affects) && control.affects.length === 0 &&
        control.projection === null &&
        control.projectionReason === null &&
        numericValue === state[contract.field] &&
        control.zeroExcluded ===
          (control.parameter === "right-numerator" && state.evaluatedOperation === "divide"),
      `${controlLabel} does not reconstruct domain state and control metadata`,
    );
  }
}

function validateG04RuntimeControls(runtimeControls, aggregateControls, state, labId, label) {
  assertReceipt(Array.isArray(runtimeControls) && runtimeControls.length > 0, `${label} is missing`);
  const aggregateByParameter = new Map(
    aggregateControls.map((control) => [control.parameter, control]),
  );
  const observedParameters = [];
  const observedModes = [];
  let activeModeCount = 0;
  let resetCount = 0;
  for (const [index, control] of runtimeControls.entries()) {
    const controlLabel = `${label}[${index}]`;
    assertExactObjectKeys(
      controlLabel,
      control,
      ["attributes", "disabled", "options", "tagName", "text", "value"],
    );
    assertReceipt(isRecord(control.attributes), `${controlLabel}.attributes is malformed`);
    assertReceipt(control.disabled === false, `${controlLabel} is disabled`);
    assertReceipt(Array.isArray(control.options), `${controlLabel}.options is malformed`);
    assertReceipt(typeof control.text === "string", `${controlLabel}.text is malformed`);
    const parameter = control.attributes["data-viz-parameter"];
    if (isNonEmptyString(parameter)) {
      const aggregate = aggregateByParameter.get(parameter);
      assertReceipt(isRecord(aggregate), `${controlLabel} has an unknown runtime parameter`);
      observedParameters.push(parameter);
      assertReceipt(control.value === aggregate.value, `${controlLabel} runtime value drifted from the aggregate`);
      if (aggregate.kind === "number") {
        assertExactObjectKeys(
          `${controlLabel}.attributes`,
          control.attributes,
          ["data-viz-parameter", "data-viz-zero-excluded", "max", "min", "step", "type"],
        );
        assertReceipt(
          control.tagName === "input" &&
            control.text === "" &&
            control.options.length === 0 &&
            control.attributes.type === "number" &&
            control.attributes.min === String(aggregate.min) &&
            control.attributes.max === String(aggregate.max) &&
            control.attributes.step === String(aggregate.step) &&
            control.attributes["data-viz-zero-excluded"] === String(aggregate.zeroExcluded),
          `${controlLabel} does not reconstruct the exact number-control metadata`,
        );
        validateG04NumericControlValue(
          control.value,
          Number(control.attributes.min),
          Number(control.attributes.max),
          Number(control.attributes.step),
          `${controlLabel}.value`,
        );
      } else {
        assertReceipt(aggregate.kind === "select", `${controlLabel} aggregate kind is invalid`);
        assertExactObjectKeys(
          `${controlLabel}.attributes`,
          control.attributes,
          ["data-viz-domain-controller", "data-viz-parameter", "data-viz-range-affects", "data-viz-range-projection", "data-viz-range-projection-reason"],
        );
        assertReceipt(
          control.tagName === "select" &&
            control.attributes["data-viz-domain-controller"] === "evaluated-operation" &&
            control.attributes["data-viz-range-affects"] === aggregate.affects.join(",") &&
            control.attributes["data-viz-range-projection"] === aggregate.projection &&
            control.attributes["data-viz-range-projection-reason"] === aggregate.projectionReason,
          `${controlLabel} does not reconstruct the exact select-control metadata`,
        );
        assertReceiptEqual(
          control.options,
          aggregate.options.map((value) => ({ disabled: false, value })),
          `${controlLabel} runtime select options`,
        );
      }
      continue;
    }

    if (control.attributes["data-viz-mode-button"] !== undefined) {
      const mode = control.attributes["data-viz-mode"];
      const hasProjection = control.attributes["data-viz-range-projection"] !== undefined;
      const expectedAttributeKeys = [
        "aria-pressed",
        "data-viz-domain-controller",
        "data-viz-mode",
        "data-viz-mode-active",
        "data-viz-mode-button",
        "type",
        ...(hasProjection
          ? ["data-viz-range-affects", "data-viz-range-projection", "data-viz-range-projection-reason"]
          : []),
      ];
      assertExactObjectKeys(`${controlLabel}.attributes`, control.attributes, expectedAttributeKeys);
      assertReceipt(g04Modes.includes(mode), `${controlLabel} has an invalid runtime mode`);
      const active = mode === state.mode;
      if (active) activeModeCount += 1;
      observedModes.push(mode);
      assertReceipt(
        control.tagName === "button" &&
          control.value === null &&
          control.options.length === 0 &&
          isNonEmptyString(control.text) &&
          control.attributes.type === "button" &&
          control.attributes["data-viz-mode-button"] === "true" &&
          control.attributes["data-viz-domain-controller"] === "mode" &&
          control.attributes["data-viz-mode-active"] === String(active) &&
          control.attributes["aria-pressed"] === String(active),
        `${controlLabel} does not reconstruct an exact runtime mode button`,
      );
      const shouldProject = mode === "divide" ||
        (mode === "estimate" && state.evaluatedOperation === "divide");
      assertReceipt(
        hasProjection === shouldProject &&
          (!hasProjection ||
            (control.attributes["data-viz-range-affects"] === "right-numerator" &&
              control.attributes["data-viz-range-projection"] === "exclude-zero" &&
              control.attributes["data-viz-range-projection-reason"] === "division-divisor-cannot-be-zero")),
        `${controlLabel} runtime mode projection metadata is inconsistent`,
      );
      continue;
    }

    if (control.attributes["data-viz-reset-model"] !== undefined) {
      resetCount += 1;
      assertExactObjectKeys(
        `${controlLabel}.attributes`,
        control.attributes,
        ["data-viz-reset-model", "data-viz-reset-module-id", "data-viz-reset-topic-id", "type"],
      );
      assertReceipt(
        control.tagName === "button" &&
          control.value === null &&
          control.options.length === 0 &&
          isNonEmptyString(control.text) &&
          control.attributes.type === "button" &&
          control.attributes["data-viz-reset-model"] === "true" &&
          control.attributes["data-viz-reset-module-id"] === "configured-visualization-lab" &&
          control.attributes["data-viz-reset-topic-id"] === labId,
        `${controlLabel} does not reconstruct the exact runtime reset control`,
      );
      continue;
    }
    throw new Error(`${controlLabel} is an unknown runtime control record`);
  }
  assertReceipt(
    sameArray(observedParameters, aggregateControls.map((control) => control.parameter)),
    `${label} parameters do not reconstruct the aggregate controls`,
  );
  assertReceipt(
    sameArray(observedModes, g04ModeAllowlists[labId]) && activeModeCount === 1,
    `${label} runtime modes do not match the exact ordered lab mode allowlist with one active mode`,
  );
  assertReceipt(resetCount === 1, `${label} does not expose exactly one reset control`);
  return runtimeControls.flatMap((control) =>
    isNonEmptyString(control.attributes["data-viz-range-projection"])
      ? [{
          affects: control.attributes["data-viz-range-affects"] ?? null,
          parameter: control.attributes["data-viz-parameter"] ?? null,
          projection: control.attributes["data-viz-range-projection"],
          reason: control.attributes["data-viz-range-projection-reason"] ?? null,
        }]
      : []
  );
}

function requireG04RuntimeVisualRecord(value, label) {
  assertReceipt(isRecord(value), `${label} is malformed`);
  assertReceipt(isRecord(value.attributes), `${label}.attributes is malformed`);
  assertReceipt(typeof value.text === "string", `${label}.text is malformed`);
  return value;
}

function validateG04StateReceipt(receipt, label) {
  const configuredState = requireReceiptString(receipt, "configuredState", label);
  const configured = parseG04ConfiguredState(configuredState, label);
  const mode = requireReceiptString(receipt, "mode", label);
  const evaluatedOperation = requireReceiptString(receipt, "evaluatedOperation", label);
  const domain = requireReceiptRecord(receipt, "domain", label);
  validateG04DomainReceipt(domain, `${label}.domain`);
  assertReceipt(
    configured.mode === mode &&
      configured.evaluatedOperation === evaluatedOperation &&
      configured.left.numerator === BigInt(domain.observed.leftNumerator) &&
      configured.left.denominator === BigInt(domain.observed.leftDenominator) &&
      configured.right.numerator === BigInt(domain.observed.rightNumerator) &&
      configured.right.denominator === BigInt(domain.observed.rightDenominator),
    `${label} configured state does not reconstruct the exact domain operands, mode, and operation`,
  );
  const product = requireReceiptRecord(receipt, "productActionReceipt", label);
  assertExactObjectKeys(
    `${label}.productActionReceipt`,
    product,
    ["accepted", "before", "domainId", "domainVersion", "expected", "matchesExpected", "observed", "projections", "rejection", "request", "requested", "requestedValidity", "status", "version"],
  );
  assertReceipt(product.version === "fraction-operations-action-receipt-v1", `${label} product action version is invalid`);
  assertReceipt(product.domainId === "fraction-operations-divisor-nonzero-v1" && product.domainVersion === 1, `${label} product action domain contract is invalid`);
  assertReceipt(product.matchesExpected === true, `${label} product action does not match expected`);
  assertReceipt(product.status === "accepted" || product.status === "rejected", `${label} product action status is invalid`);
  assertReceipt(typeof product.accepted === "boolean" && product.accepted === (product.status === "accepted"), `${label} product action accepted/status relationship is invalid`);
  for (const field of ["before", "request", "requested", "expected", "observed"]) requireReceiptRecord(product, field, `${label}.productActionReceipt`);
  validateG04DomainState(product.before, `${label}.productActionReceipt.before`);
  validateG04DomainState(product.requested, `${label}.productActionReceipt.requested`, {
    allowRequestedDivisorZero: true,
  });
  validateG04DomainState(product.expected, `${label}.productActionReceipt.expected`);
  validateG04DomainState(product.observed, `${label}.productActionReceipt.observed`);
  validateG04ActionRequest(product.request, `${label}.productActionReceipt.request`);
  const productProjections = requireReceiptArray(product, "projections", `${label}.productActionReceipt`);
  productProjections.forEach((projection, index) =>
    validateG04Projection(projection, `${label}.productActionReceipt.projections[${index}]`)
  );
  validateDerivedG04ActionTransition(product, configured.labId, label);
  assertReceiptEqual(product.observed, product.expected, `${label} product action observed state`);
  assertReceiptEqual(domain.requested, product.requested, `${label} product/domain requested state`);
  assertReceiptEqual(domain.expected, product.expected, `${label} product/domain expected state`);
  assertReceiptEqual(domain.observed, product.observed, `${label} product/domain observed state`);
  assertReceipt(domain.rejection === product.rejection, `${label} product/domain rejection is inconsistent`);
  assertReceipt(domain.projectionCount === product.projections.length, `${label} product/domain projection count is inconsistent`);
  assertReceiptEqual(domain.projectionReasons, product.projections.map((projection) => projection.reason), `${label} product/domain projection reasons`);

  const action = requireReceiptRecord(receipt, "action", label);
  assertExactObjectKeys(
    `${label}.action`,
    action,
    ["beforeControls", "beforeDomain", "expectedActionReceipt", "expectedProjection", "expectedRejection", "observedControls", "oracleAfter", "oracleBefore", "plannedRequest", "plannerReceipt", "rejectedRequest"],
  );
  assertReceiptEqual(action.expectedActionReceipt, product, `${label} expected product action receipt`);
  assertReceiptEqual(action.observedControls, receipt.controls, `${label} action visible controls`);
  assertReceiptEqual(action.plannedRequest, product.request, `${label} planned product request`);
  validateG04ActionRequest(action.plannedRequest, `${label}.action.plannedRequest`);
  assertReceipt(action.expectedRejection === product.rejection, `${label} action rejection is inconsistent`);
  validateG04DomainReceipt(
    requireReceiptRecord(action, "beforeDomain", `${label}.action`),
    `${label}.action.beforeDomain`,
  );
  validateG04DomainState(
    requireReceiptRecord(action, "oracleBefore", `${label}.action`),
    `${label}.action.oracleBefore`,
  );
  validateG04DomainState(
    requireReceiptRecord(action, "oracleAfter", `${label}.action`),
    `${label}.action.oracleAfter`,
  );
  assertReceiptEqual(action.oracleBefore, product.before, `${label} action oracle-before state`);
  const expectedBeforeDomainState =
    product.request.kind === "initial" || product.request.kind === "reset"
      ? product.expected
      : product.before;
  assertReceiptEqual(
    action.beforeDomain.observed,
    expectedBeforeDomainState,
    `${label} action before-domain state`,
  );
  validateG04ControlSnapshots(
    requireReceiptArray(action, "beforeControls", `${label}.action`),
    action.beforeDomain.observed,
    configured.labId,
    `${label}.action.beforeControls`,
  );
  validateG04ControlSnapshots(
    requireReceiptArray(action, "observedControls", `${label}.action`),
    domain.observed,
    configured.labId,
    `${label}.action.observedControls`,
  );
  validateG04ControlSnapshots(
    receipt.controls,
    domain.observed,
    configured.labId,
    `${label}.controls`,
  );
  if (product.status === "accepted") {
    assertReceipt(product.rejection === null, `${label} accepted product action has a rejection`);
    const expectedValidity = product.projections.length > 0
      ? "requires-projection"
      : "accepted-as-requested";
    assertReceipt(product.requestedValidity === expectedValidity, `${label} accepted product action validity/projections are inconsistent`);
    assertReceipt(action.expectedProjection === (product.projections.length > 0), `${label} accepted action projection flag is inconsistent`);
    assertReceipt(isRecord(action.plannerReceipt) && action.rejectedRequest === null, `${label} accepted action lacks its planner receipt`);
    assertExactObjectKeys(
      `${label}.action.plannerReceipt`,
      action.plannerReceipt,
      ["domainId", "domainVersion", "expected", "matchesExpected", "observed", "projections", "request", "requested"],
    );
    assertReceipt(
      action.plannerReceipt.domainId === product.domainId &&
        action.plannerReceipt.domainVersion === product.domainVersion,
      `${label} accepted planner domain identity/version is inconsistent`,
    );
    assertReceipt(action.plannerReceipt.matchesExpected === true, `${label} accepted planner receipt does not match expected`);
    validateG04ActionRequest(
      requireReceiptRecord(action.plannerReceipt, "request", `${label}.action.plannerReceipt`),
      `${label}.action.plannerReceipt.request`,
      { allowInitialReset: false },
    );
    const expectedPlannerRequest =
      product.request.kind === "initial" || product.request.kind === "reset"
        ? {
            evaluatedOperation: product.expected.evaluatedOperation,
            kind: "controller",
            mode: product.expected.mode,
          }
        : product.request;
    assertReceiptEqual(
      action.plannerReceipt.request,
      expectedPlannerRequest,
      `${label} accepted planner request`,
    );
    validateG04DomainState(action.plannerReceipt.requested, `${label}.action.plannerReceipt.requested`, {
      allowRequestedDivisorZero: true,
    });
    validateG04DomainState(action.plannerReceipt.expected, `${label}.action.plannerReceipt.expected`);
    validateG04DomainState(action.plannerReceipt.observed, `${label}.action.plannerReceipt.observed`);
    requireReceiptArray(action.plannerReceipt, "projections", `${label}.action.plannerReceipt`).forEach(
      (projection, index) => validateG04Projection(projection, `${label}.action.plannerReceipt.projections[${index}]`),
    );
    for (const field of ["requested", "expected", "observed", "projections"]) {
      assertReceiptEqual(action.plannerReceipt[field], product[field], `${label} accepted planner ${field}`);
    }
    assertReceiptEqual(action.oracleAfter, domain.observed, `${label} accepted action oracle`);
  } else {
    assertReceipt(product.rejection === "DIRECT_DIVISOR_ZERO_REQUEST", `${label} rejected product action rejection is invalid`);
    assertReceipt(product.requestedValidity === "rejected-invalid", `${label} rejected product action validity is invalid`);
    assertReceipt(action.plannerReceipt === null && isRecord(action.rejectedRequest), `${label} rejected action lacks its rejected request`);
    assertReceiptEqual(product.request, action.rejectedRequest, `${label} rejected product request`);
    assertReceiptEqual(action.oracleAfter, action.oracleBefore, `${label} rejected action oracle`);
    assertReceiptEqual(domain.observed, action.oracleBefore, `${label} rejected action domain`);
  }

  const runtime = requireReceiptRecord(receipt, "runtimeSignature", label);
  assertReceipt(runtime.stable === undefined, `${label}.runtimeSignature has an invalid stable flag`);
  const runtimeAction = requireReceiptRecord(runtime, "action", `${label}.runtimeSignature`);
  const expectedRuntimeAction = {
    "data-viz-action-accepted": String(product.accepted),
    "data-viz-action-before": JSON.stringify(product.before),
    "data-viz-action-expected": JSON.stringify(product.expected),
    "data-viz-action-observed": JSON.stringify(product.observed),
    "data-viz-action-projections": JSON.stringify(product.projections),
    "data-viz-action-receipt": JSON.stringify(product),
    "data-viz-action-receipt-version": product.version,
    "data-viz-action-rejection": product.rejection ?? "none",
    "data-viz-action-request": JSON.stringify(product.request),
    "data-viz-action-requested": JSON.stringify(product.requested),
    "data-viz-action-requested-validity": product.requestedValidity,
    "data-viz-action-status": product.status,
  };
  assertReceiptEqual(
    runtimeAction,
    expectedRuntimeAction,
    `${label} runtime action attributes`,
  );
  assertReceipt(runtime.configuredState === configuredState && runtime.semanticState === configuredState, `${label} runtime configured/semantic state is inconsistent`);
  assertReceipt(runtime.mode === mode && runtime.evaluatedOperation === evaluatedOperation, `${label} runtime mode/operation is inconsistent`);
  const runtimeProjectionDescriptors = validateG04RuntimeControls(
    runtime.controls,
    receipt.controls,
    domain.observed,
    configured.labId,
    `${label}.runtimeSignature.controls`,
  );
  const runtimeDomain = requireReceiptRecord(runtime, "domain", `${label}.runtimeSignature`);
  assertExactObjectKeys(
    `${label}.runtimeSignature.domain`,
    runtimeDomain,
    [
      "domainId",
      "domainVersion",
      "expected",
      "match",
      "observed",
      "projectionCount",
      "projectionReasons",
      "projections",
      "rejection",
      "requested",
    ],
  );
  assertReceipt(
    runtimeDomain.domainId === product.domainId &&
      runtimeDomain.domainVersion === String(product.domainVersion),
    `${label} runtime domain identity/version is inconsistent`,
  );
  assertReceipt(runtimeDomain.match === "true", `${label} runtime domain match is not true`);
  assertReceiptEqual(runtimeDomain.requested, domain.requested, `${label} runtime requested domain`);
  assertReceiptEqual(runtimeDomain.expected, domain.expected, `${label} runtime expected domain`);
  assertReceiptEqual(runtimeDomain.observed, domain.observed, `${label} runtime observed domain`);
  assertReceipt(runtimeDomain.rejection === domain.rejection, `${label} runtime domain rejection is inconsistent`);
  assertReceipt(runtimeDomain.projectionCount === String(domain.projectionCount), `${label} runtime projection count is inconsistent`);
  assertReceiptEqual(runtimeDomain.projectionReasons, domain.projectionReasons, `${label} runtime projection reasons`);
  assertReceiptEqual(
    runtimeDomain.projections,
    runtimeProjectionDescriptors,
    `${label} runtime control projection descriptors`,
  );
  const runtimeVisual = requireReceiptRecord(runtime, "visual", `${label}.runtimeSignature`);
  for (const field of ["geometry", "interpretations", "visibleReceipts"]) requireReceiptArray(runtimeVisual, field, `${label}.runtimeSignature.visual`);

  const visual = requireReceiptRecord(receipt, "visual", label);
  assertReceipt(visual.status === undefined, `${label}.visual has an invalid aggregate status`);
  const expected = requireReceiptArray(visual, "expectedInterpretations", `${label}.visual`);
  const supported = requireReceiptArray(visual, "supported", `${label}.visual`);
  const unsupported = requireReceiptArray(visual, "unsupported", `${label}.visual`);
  for (const [index, item] of supported.entries()) validateSupportedVisual(item, `${label}.visual.supported[${index}]`);
  for (const [index, item] of unsupported.entries()) {
    assertReceipt(
      isRecord(item) &&
        item.status === undefined &&
        isNonEmptyString(item.kind) &&
        isNonEmptyString(item.reason),
      `${label}.visual.unsupported[${index}] is malformed`,
    );
  }
  const observedKinds = [...supported, ...unsupported].map((item) => item.kind);
  const expectedInterpretations = g04PhysicalInterpretationsByOperation[evaluatedOperation];
  assertReceipt(
    Array.isArray(expectedInterpretations),
    `${label} evaluated operation ${evaluatedOperation} has no visual contract`,
  );
  assertReceipt(
    domain.observed.evaluatedOperation === evaluatedOperation &&
      domain.observed.mode === mode,
    `${label} evaluated operation/mode does not match the domain state`,
  );
  assertReceipt(
    sameArray(expected, expectedInterpretations.map(({ name }) => name)),
    `${label} ${evaluatedOperation} physical interpretation plan is inconsistent`,
  );
  const expectedKinds = expectedInterpretations.map(({ kind }) => kind);
  assertReceipt(
    observedKinds.length === expectedKinds.length &&
      duplicates(observedKinds).length === 0,
    `${label} visual interpretation accounting is inconsistent`,
  );
  assertReceipt(
    sameArray([...observedKinds].sort(), [...expectedKinds].sort()),
    `${label} visual interpretation set is inconsistent`,
  );

  const aggregateByKind = new Map(
    [...supported, ...unsupported].map((item) => [item.kind, item]),
  );
  const supportedKinds = new Set(supported.map((item) => item.kind));
  const expectedRuntimeInterpretationNames = evaluatedOperation === "divide"
    ? [
        "division-reciprocal-interpretation",
        ...expectedInterpretations.map(({ name }) => name),
      ]
    : expectedInterpretations.map(({ name }) => name);
  const runtimeInterpretations = runtimeVisual.interpretations.map((item, index) =>
    requireG04RuntimeVisualRecord(
      item,
      `${label}.runtimeSignature.visual.interpretations[${index}]`,
    )
  );
  assertReceipt(
    sameArray(
      runtimeInterpretations.map((item) => item.attributes["data-viz-name"]),
      expectedRuntimeInterpretationNames,
    ),
    `${label} runtime interpretation names do not reconstruct the operation plan`,
  );
  for (const descriptor of expectedInterpretations) {
    const aggregate = aggregateByKind.get(descriptor.kind);
    const runtimeInterpretation = runtimeInterpretations.find(
      (item) => item.attributes["data-viz-name"] === descriptor.name,
    );
    assertReceipt(
      isRecord(aggregate) && runtimeInterpretation,
      `${label} runtime interpretation ${descriptor.name} is missing`,
    );
    const aggregateStatus = supportedKinds.has(descriptor.kind)
      ? "supported"
      : "unsupported";
    assertReceipt(
      runtimeInterpretation.attributes["data-viz-interpretation-status"] ===
        aggregateStatus,
      `${label} runtime interpretation ${descriptor.name} status drifted from the aggregate`,
    );
    if (aggregateStatus === "unsupported") {
      assertReceipt(
        runtimeInterpretation.attributes["data-viz-unsupported-reason"] ===
          aggregate.reason,
        `${label} runtime interpretation ${descriptor.name} unsupported reason drifted`,
      );
    }
  }
  if (evaluatedOperation === "divide") {
    const reciprocal = runtimeInterpretations[0];
    assertReceipt(
      reciprocal.attributes["data-viz-interpretation-status"] === "supported",
      `${label} runtime reciprocal interpretation is not supported`,
    );
  }

  const runtimeGeometry = runtimeVisual.geometry.map((item, index) =>
    requireG04RuntimeVisualRecord(
      item,
      `${label}.runtimeSignature.visual.geometry[${index}]`,
    )
  );
  assertReceipt(
    runtimeGeometry.length === supported.length,
    `${label} runtime geometry count does not reconstruct supported visuals`,
  );
  for (const [index, aggregate] of supported.entries()) {
    const runtimeItem = runtimeGeometry[index];
    assertReceipt(
      runtimeItem.attributes["data-viz-fraction-visual"] === aggregate.kind,
      `${label} runtime geometry[${index}] kind drifted from the aggregate`,
    );
    assertReceipt(
      runtimeItem.attributes["data-viz-painted-mark-count"] ===
        String(aggregate.markCount),
      `${label} runtime geometry[${index}] mark count drifted from the aggregate`,
    );
    assertReceiptEqual(
      parseReceiptJson(
        runtimeItem.attributes["data-viz-geometry-receipt"],
        `${label}.runtimeSignature.visual.geometry[${index}].receipt`,
      ),
      aggregate.receipt,
      `${label} runtime geometry[${index}] receipt`,
    );
  }

  const expectedVisibleReceipt = mode === "equivalence"
    ? "equivalence"
    : mode === "compare"
      ? "comparison"
      : mode === "simplify"
        ? "simplification"
        : mode === "estimate"
          ? "estimate"
          : "arithmetic";
  const runtimeVisibleReceipts = runtimeVisual.visibleReceipts.map((item, index) =>
    requireG04RuntimeVisualRecord(
      item,
      `${label}.runtimeSignature.visual.visibleReceipts[${index}]`,
    )
  );
  assertReceipt(
    runtimeVisibleReceipts.length === 1 &&
      runtimeVisibleReceipts[0].attributes["data-viz-visible-receipt"] ===
        expectedVisibleReceipt,
    `${label} runtime visible receipt does not reconstruct mode ${mode}`,
  );
  requireReceiptPositiveNumber(receipt, "touchTargetCount", label);
}

const g05TopicContracts = Object.freeze({
  "bnu-primary-p6-upper-percentage-applications": Object.freeze({
    modes: Object.freeze([
      "find-part",
      "find-whole",
      "increase",
      "decrease",
      "discount",
      "inverse",
    ]),
  }),
  "pep-primary-p6-upper-percent-fractions": Object.freeze({
    modes: Object.freeze([
      "convert",
      "find-part",
      "find-whole",
      "increase",
      "decrease",
      "discount",
    ]),
  }),
});

const g05ControlsByMode = Object.freeze({
  convert: Object.freeze(["rate-basis-points"]),
  decrease: Object.freeze(["base", "rate-basis-points"]),
  discount: Object.freeze(["base", "rate-basis-points"]),
  "find-part": Object.freeze(["base", "rate-basis-points"]),
  "find-whole": Object.freeze(["amount", "rate-basis-points"]),
  increase: Object.freeze(["base", "rate-basis-points"]),
  inverse: Object.freeze(["new-value", "rate-basis-points"]),
});

const g05QuantityFields = Object.freeze({
  amount: "amount",
  base: "base",
  "new-value": "newValue",
});

function g05RateContract(state) {
  return {
    max:
      state.mode === "decrease" || state.mode === "discount"
        ? 10_000
        : state.mode === "inverse" && state.inverseDirection === "decrease"
          ? 9_999
          : 50_000,
    min: state.mode === "find-whole" ? 1 : 0,
    step: 1,
  };
}

function g05ExactIntegerRational(value) {
  return { denominator: 1n, numerator: BigInt(value) };
}

function g05ExactRate(state, label) {
  return normalizeExactBigIntRational(
    BigInt(state.rateBasisPoints),
    10_000n,
    `${label}.rate`,
  );
}

function g05ExactMultiply(left, right, label) {
  return normalizeExactBigIntRational(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
    label,
  );
}

function g05ExactAdd(left, right, direction, label) {
  return normalizeExactBigIntRational(
    left.numerator * right.denominator +
      direction * right.numerator * left.denominator,
    left.denominator * right.denominator,
    label,
  );
}

function g05ExactDivide(left, right, label) {
  assertReceipt(right.numerator !== 0n, `${label} divides by zero`);
  return normalizeExactBigIntRational(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
    label,
  );
}

function g05ExactDecimal(basisPoints) {
  const whole = Math.floor(basisPoints / 10_000);
  const remainder = basisPoints % 10_000;
  if (remainder === 0) return String(whole);
  return `${whole}.${String(remainder).padStart(4, "0").replace(/0+$/u, "")}`;
}

function g05PercentText(basisPoints) {
  const whole = Math.floor(basisPoints / 100);
  const hundredths = basisPoints % 100;
  if (hundredths === 0) return `${whole}%`;
  if (hundredths % 10 === 0) return `${whole}.${hundredths / 10}%`;
  return `${whole}.${String(hundredths).padStart(2, "0")}%`;
}

function deriveG05Visual(state, label) {
  const kind = g05ExpectedVisualKind(state, label);
  if (g05HasZeroMagnitude(state)) {
    return { kind, markCount: 0, receipt: null, status: "unsupported" };
  }
  const rate = g05ExactRate(state, label);
  const rateText = exactBigIntRationalString(rate);
  if (state.mode === "convert") {
    const gridCount = Math.max(1, Math.ceil(state.rateBasisPoints / 10_000));
    const partialCellBasisPoints = state.rateBasisPoints % 100;
    const totalCells = gridCount * 100;
    return {
      kind,
      markCount: totalCells + (partialCellBasisPoints > 0 ? 1 : 0),
      receipt: {
        decimal: g05ExactDecimal(state.rateBasisPoints),
        filledWholeCells: Math.floor(state.rateBasisPoints / 100),
        fraction: rateText,
        gridCount,
        kind,
        partialCellBasisPoints,
        percentText: g05PercentText(state.rateBasisPoints),
        status: "supported",
        totalCells,
      },
      status: "supported",
    };
  }
  if (state.mode === "find-part") {
    const whole = g05ExactIntegerRational(state.base);
    const part = g05ExactMultiply(whole, rate, `${label}.part`);
    return {
      kind,
      markCount: 2,
      receipt: {
        kind,
        part: exactBigIntRationalString(part),
        rate: rateText,
        reconstruction: exactBigIntRationalString(
          g05ExactMultiply(whole, rate, `${label}.reconstruction`),
        ),
        status: "supported",
        whole: exactBigIntRationalString(whole),
      },
      status: "supported",
    };
  }
  if (state.mode === "find-whole") {
    const knownPart = g05ExactIntegerRational(state.amount);
    const whole = g05ExactDivide(knownPart, rate, `${label}.whole`);
    return {
      kind,
      markCount: 2,
      receipt: {
        kind,
        knownPart: exactBigIntRationalString(knownPart),
        rate: rateText,
        reconstruction: exactBigIntRationalString(
          g05ExactMultiply(whole, rate, `${label}.reconstruction`),
        ),
        status: "supported",
        whole: exactBigIntRationalString(whole),
      },
      status: "supported",
    };
  }
  const one = { denominator: 1n, numerator: 1n };
  if (state.mode === "increase" || state.mode === "decrease") {
    const original = g05ExactIntegerRational(state.base);
    const absoluteChange = g05ExactMultiply(original, rate, `${label}.absoluteChange`);
    const direction = state.mode === "increase" ? 1n : -1n;
    const multiplier = g05ExactAdd(one, rate, direction, `${label}.multiplier`);
    const newValue = g05ExactMultiply(original, multiplier, `${label}.newValue`);
    const reconstruction = g05ExactAdd(
      original,
      absoluteChange,
      direction,
      `${label}.reconstruction`,
    );
    return {
      kind,
      markCount: 3,
      receipt: {
        absoluteChange: exactBigIntRationalString(absoluteChange),
        direction: state.mode,
        kind,
        multiplier: exactBigIntRationalString(multiplier),
        newValue: exactBigIntRationalString(newValue),
        original: exactBigIntRationalString(original),
        reconstruction: exactBigIntRationalString(reconstruction),
        status: "supported",
      },
      status: "supported",
    };
  }
  if (state.mode === "discount") {
    const originalPrice = g05ExactIntegerRational(state.base);
    const discountAmount = g05ExactMultiply(
      originalPrice,
      rate,
      `${label}.discountAmount`,
    );
    const salePrice = g05ExactAdd(
      originalPrice,
      discountAmount,
      -1n,
      `${label}.salePrice`,
    );
    return {
      kind,
      markCount: 3,
      receipt: {
        discountAmount: exactBigIntRationalString(discountAmount),
        discountRate: rateText,
        kind,
        originalPrice: exactBigIntRationalString(originalPrice),
        reconstruction: exactBigIntRationalString(
          g05ExactAdd(salePrice, discountAmount, 1n, `${label}.reconstruction`),
        ),
        salePrice: exactBigIntRationalString(salePrice),
        status: "supported",
      },
      status: "supported",
    };
  }
  assertReceipt(state.mode === "inverse", `${label}.mode has no G05 visual family`);
  const observedNewValue = g05ExactIntegerRational(state.newValue);
  const direction = state.inverseDirection === "increase" ? 1n : -1n;
  const multiplier = g05ExactAdd(one, rate, direction, `${label}.multiplier`);
  const original = g05ExactDivide(observedNewValue, multiplier, `${label}.original`);
  return {
    kind,
    markCount: 3,
    receipt: {
      direction: state.inverseDirection,
      forwardCheck: exactBigIntRationalString(
        g05ExactMultiply(original, multiplier, `${label}.forwardCheck`),
      ),
      kind,
      multiplier: exactBigIntRationalString(multiplier),
      observedNewValue: exactBigIntRationalString(observedNewValue),
      original: exactBigIntRationalString(original),
      status: "supported",
    },
    status: "supported",
  };
}

function validateG05DomainState(
  state,
  label,
  { enforceModeRateContract = true } = {},
) {
  assertExactObjectKeys(
    label,
    state,
    ["amount", "base", "inverseDirection", "labId", "mode", "newValue", "rateBasisPoints"],
  );
  const topic = g05TopicContracts[state.labId];
  assertReceipt(isRecord(topic), `${label}.labId is not an exact production G05 lab`);
  assertReceipt(
    topic.modes.includes(state.mode),
    `${label}.mode is outside the exact topic allowlist`,
  );
  assertReceipt(
    state.inverseDirection === "increase" || state.inverseDirection === "decrease",
    `${label}.inverseDirection is invalid`,
  );
  for (const field of ["amount", "base", "newValue"]) {
    assertReceipt(
      Number.isSafeInteger(state[field]) && state[field] >= 0 && state[field] <= 1_000_000,
      `${label}.${field} is outside the exact quantity range 0..1000000`,
    );
  }
  assertReceipt(
    Number.isSafeInteger(state.rateBasisPoints) &&
      state.rateBasisPoints >= 0 &&
      state.rateBasisPoints <= 50_000,
    `${label}.rateBasisPoints is outside the exact global range 0..50000`,
  );
  if (enforceModeRateContract) {
    const rate = g05RateContract(state);
    assertReceipt(
      state.rateBasisPoints >= rate.min && state.rateBasisPoints <= rate.max,
      `${label}.rateBasisPoints is outside its exact mode/direction range`,
    );
  }
}

function validateG05DomainReceipt(domain, label) {
  assertExactObjectKeys(
    label,
    domain,
    ["expected", "observed", "projectionCount", "projectionReasons", "rejection", "requested"],
  );
  validateDomainReceipt(domain, label);
  validateG05DomainState(domain.requested, `${label}.requested`, {
    enforceModeRateContract: false,
  });
  validateG05DomainState(domain.expected, `${label}.expected`);
  validateG05DomainState(domain.observed, `${label}.observed`);
  assertReceipt(
    domain.rejection === null ||
      [
        "CONTROL_NOT_VISIBLE",
        "DIRECT_CONTROL_OUT_OF_RANGE",
        "INVALID_CONTROL_VALUE",
        "INVALID_CONTROLLER",
        "INVALID_DIRECTION",
        "INVALID_LAB_ID",
        "INVALID_MODE",
        "INVALID_STATE",
      ].includes(domain.rejection),
    `${label}.rejection is not a production G05 domain code`,
  );
}

function validateG05Controls(controls, state, label) {
  assertReceipt(Array.isArray(controls), `${label} must be an array`);
  const expectedParameters = g05ControlsByMode[state.mode];
  assertReceipt(
    Array.isArray(expectedParameters) &&
      sameArray(controls.map((control) => control?.parameter), expectedParameters),
    `${label} does not expose the exact topic/mode numeric control set`,
  );
  for (const [index, control] of controls.entries()) {
    const controlLabel = `${label}[${index}]`;
    assertExactObjectKeys(
      controlLabel,
      control,
      ["disabled", "max", "min", "parameter", "step", "value"],
    );
    assertReceipt(control.disabled === false, `${controlLabel} is disabled`);
    const field = control.parameter === "rate-basis-points"
      ? "rateBasisPoints"
      : g05QuantityFields[control.parameter];
    assertReceipt(isNonEmptyString(field), `${controlLabel}.parameter is invalid`);
    const contract = control.parameter === "rate-basis-points"
      ? g05RateContract(state)
      : { max: 1_000_000, min: 0, step: 1 };
    const parsed = Number(control.value);
    assertReceipt(
      control.min === contract.min &&
        control.max === contract.max &&
        control.step === contract.step &&
        Number.isSafeInteger(parsed) &&
        control.value === String(parsed) &&
        parsed >= control.min &&
        parsed <= control.max &&
        (parsed - control.min) % control.step === 0 &&
        parsed === state[field],
      `${controlLabel} does not reconstruct its exact state/range/value contract`,
    );
  }
}

function validateG05Signature(signature, label) {
  assertExactObjectKeys(label, signature, ["controls", "inverseDirection", "mode", "state"]);
  const state = requireReceiptRecord(signature, "state", label);
  validateG05DomainState(state, `${label}.state`);
  assertReceipt(
    signature.mode === state.mode && signature.inverseDirection === state.inverseDirection,
    `${label} mode/direction does not reconstruct its state`,
  );
  validateG05Controls(
    requireReceiptArray(signature, "controls", label),
    state,
    `${label}.controls`,
  );
}

function validateG05Request(request, beforeState, label) {
  assertReceipt(isRecord(request), `${label} is malformed`);
  if (request.kind === "initial" || request.kind === "reset") {
    assertExactObjectKeys(label, request, ["kind"]);
    return;
  }
  if (request.kind === "control") {
    assertExactObjectKeys(label, request, ["controlId", "kind", "value"]);
    assertReceipt(
      [...Object.keys(g05QuantityFields), "rate-basis-points"].includes(request.controlId),
      `${label}.controlId is invalid`,
    );
    assertReceipt(
      g05ControlsByMode[beforeState.mode].includes(request.controlId),
      `${label}.controlId is not visible in the exact before-state mode`,
    );
    assertReceipt(Number.isSafeInteger(request.value), `${label}.value is not a safe integer`);
    return;
  }
  assertReceipt(request.kind === "controller", `${label}.kind is invalid`);
  assertExactObjectKeys(label, request, ["controllerId", "kind", "value"]);
  if (request.controllerId === "mode") {
    assertReceipt(
      g05TopicContracts[beforeState.labId].modes.includes(request.value),
      `${label}.value is outside the exact topic mode allowlist`,
    );
    return;
  }
  assertReceipt(
    request.controllerId === "inverse-direction" &&
      beforeState.mode === "inverse" &&
      (request.value === "increase" || request.value === "decrease"),
    `${label} is not an exact visible inverse-direction request`,
  );
}

function g05ResetState(labId) {
  return {
    amount: 36,
    base: 240,
    inverseDirection: "increase",
    labId,
    mode: "find-part",
    newValue: 120,
    rateBasisPoints: 1_500,
  };
}

function g05ProjectionFor(requested) {
  const contract = g05RateContract(requested);
  if (requested.rateBasisPoints >= contract.min && requested.rateBasisPoints <= contract.max) {
    return { expected: structuredClone(requested), projections: [] };
  }
  const high = requested.rateBasisPoints > contract.max;
  const to = high ? contract.max : contract.min;
  const reason = requested.mode === "discount"
    ? "discount-rate-cannot-exceed-100-percent"
    : requested.mode === "decrease"
      ? "decrease-rate-cannot-exceed-100-percent"
      : requested.mode === "find-whole"
        ? "find-whole-rate-must-be-positive"
        : "inverse-decrease-must-remain-below-100-percent";
  return {
    expected: { ...requested, rateBasisPoints: to },
    projections: [{
      controlId: "rate-basis-points",
      from: requested.rateBasisPoints,
      projection: high ? "clamp-max" : "clamp-min",
      reason,
      to,
    }],
  };
}

function deriveG05Action(beforeState, request) {
  if (request.kind === "initial") {
    return { expected: structuredClone(beforeState), projections: [], requested: structuredClone(beforeState) };
  }
  if (request.kind === "reset") {
    const reset = g05ResetState(beforeState.labId);
    return { expected: reset, projections: [], requested: structuredClone(reset) };
  }
  if (request.kind === "control") {
    const field = request.controlId === "rate-basis-points"
      ? "rateBasisPoints"
      : g05QuantityFields[request.controlId];
    const requested = { ...beforeState, [field]: request.value };
    const contract = request.controlId === "rate-basis-points"
      ? g05RateContract(beforeState)
      : { max: 1_000_000, min: 0 };
    const rejected = request.value < contract.min || request.value > contract.max;
    return {
      expected: rejected ? structuredClone(beforeState) : requested,
      projections: [],
      rejected,
      requested,
    };
  }
  const requested = request.controllerId === "mode"
    ? { ...beforeState, mode: request.value }
    : { ...beforeState, inverseDirection: request.value };
  return { requested, ...g05ProjectionFor(requested) };
}

function validateG05StateReceipt(receipt, label) {
  const domain = requireReceiptRecord(receipt, "domain", label);
  validateG05DomainReceipt(domain, `${label}.domain`);
  const action = requireReceiptRecord(receipt, "action", label);
  assertExactObjectKeys(
    `${label}.action`,
    action,
    [
      "before",
      "beforeDomain",
      "expected",
      "expectedDomain",
      "expectedRejection",
      "observed",
      "plannedProjections",
      "plannedRequest",
    ],
  );
  assertReceipt(action.status === undefined, `${label}.action has an invalid wrapper status`);
  const expected = requireReceiptRecord(action, "expected", `${label}.action`);
  const observed = requireReceiptRecord(action, "observed", `${label}.action`);
  const before = requireReceiptRecord(action, "before", `${label}.action`);
  validateG05Signature(before, `${label}.action.before`);
  validateG05Signature(expected, `${label}.action.expected`);
  validateG05Signature(observed, `${label}.action.observed`);
  const beforeDomain = requireReceiptRecord(action, "beforeDomain", `${label}.action`);
  validateG05DomainReceipt(beforeDomain, `${label}.action.beforeDomain`);
  assertReceiptEqual(
    beforeDomain.observed,
    requireReceiptRecord(before, "state", `${label}.action.before`),
    `${label} action before domain/state`,
  );
  const expectedDomain = requireReceiptRecord(action, "expectedDomain", `${label}.action`);
  validateG05DomainReceipt(expectedDomain, `${label}.action.expectedDomain`);
  const plannedProjections = requireReceiptArray(action, "plannedProjections", `${label}.action`);
  for (const [index, projection] of plannedProjections.entries()) {
    assertExactObjectKeys(
      `${label}.action.plannedProjections[${index}]`,
      projection,
      ["controlId", "from", "projection", "reason", "to"],
    );
  }
  const plannedRequest = requireReceiptRecord(action, "plannedRequest", `${label}.action`);
  validateG05Request(plannedRequest, before.state, `${label}.action.plannedRequest`);
  assertReceiptEqual(observed, expected, `${label} action observed signature`);
  assertReceiptEqual(expectedDomain, domain, `${label} action expected domain`);
  assertReceipt(action.expectedRejection === domain.rejection, `${label} action/domain rejection is inconsistent`);
  assertReceipt(action.plannedProjections.length === domain.projectionCount, `${label} action/domain projection count is inconsistent`);
  assertReceiptEqual(action.plannedProjections.map((projection) => projection.reason), domain.projectionReasons, `${label} action/domain projection reasons`);
  assertReceiptEqual(observed.controls, receipt.controls, `${label} action visible controls`);
  const derivedAction = deriveG05Action(before.state, plannedRequest);
  if (action.expectedRejection) {
    assertReceipt(
      derivedAction.rejected === true &&
        action.expectedRejection === "DIRECT_CONTROL_OUT_OF_RANGE",
      `${label} rejected action does not reconstruct an exact invalid direct request`,
    );
    assertReceiptEqual(action.expected, action.before, `${label} rejected action expected state`);
    assertReceiptEqual(action.observed, action.before, `${label} rejected action observed state`);
    assertReceipt(action.plannedProjections.length === 0, `${label} rejected action invented a projection`);
    assertReceiptEqual(domain.observed, before.state, `${label} rejected action changed domain state`);
  } else {
    assertReceipt(derivedAction.rejected !== true, `${label} accepted an out-of-range direct request`);
    assertReceiptEqual(expected.state, derivedAction.expected, `${label} request/result state`);
    assertReceiptEqual(domain.requested, derivedAction.requested, `${label} request/domain requested state`);
    assertReceiptEqual(domain.expected, derivedAction.expected, `${label} request/domain expected state`);
    assertReceiptEqual(plannedProjections, derivedAction.projections, `${label} request projection semantics`);
  }

  validateG05Controls(receipt.controls, domain.observed, `${label}.controls`);

  const runtime = requireReceiptRecord(receipt, "runtimeSignature", label);
  assertExactObjectKeys(
    `${label}.runtimeSignature`,
    runtime,
    ["configuredState", "controls", "domain", "inverseDirection", "mode", "semanticState", "visual"],
  );
  assertReceipt(runtime.stable === undefined, `${label}.runtimeSignature has an invalid stable flag`);
  requireReceiptRecord(runtime, "configuredState", `${label}.runtimeSignature`);
  requireReceiptRecord(runtime, "semanticState", `${label}.runtimeSignature`);
  assertReceiptEqual(runtime.configuredState, runtime.semanticState, `${label} runtime configured/semantic state`);
  assertReceiptEqual(runtime.configuredState, domain.observed, `${label} runtime configured/domain state`);
  assertReceiptEqual(expected.state, domain.observed, `${label} action expected/domain state`);
  const runtimeDomain = requireReceiptRecord(runtime, "domain", `${label}.runtimeSignature`);
  validateG05DomainReceipt(runtimeDomain, `${label}.runtimeSignature.domain`);
  assertReceiptEqual(runtimeDomain, domain, `${label} runtime domain`);
  assertReceiptEqual(runtime.controls, receipt.controls, `${label} runtime visible controls`);
  validateG05Controls(runtime.controls, runtime.configuredState, `${label}.runtimeSignature.controls`);
  assertReceipt(runtime.mode === runtime.configuredState.mode, `${label} runtime mode is inconsistent`);
  assertReceipt(runtime.inverseDirection === runtime.configuredState.inverseDirection, `${label} runtime inverse direction is inconsistent`);
  const runtimeVisuals = requireReceiptArray(runtime, "visual", `${label}.runtimeSignature`);

  const visual = requireReceiptRecord(receipt, "visual", label);
  assertReceipt(isNonEmptyString(visual.kind), `${label}.visual.kind is missing`);
  const expectedVisualKind = g05ExpectedVisualKind(domain.observed, `${label}.domain.observed`);
  const zeroMagnitude = g05HasZeroMagnitude(domain.observed);
  const derivedVisual = deriveG05Visual(domain.observed, `${label}.domain.observed`);
  assertReceipt(
    visual.kind === expectedVisualKind,
    `${label}.visual.kind does not match the observed mode`,
  );
  if (visual.status === "supported") {
    assertReceipt(
      !zeroMagnitude,
      `${label}.visual claims supported geometry for a zero magnitude`,
    );
    validateSupportedVisual(visual, `${label}.visual`);
    assertReceiptEqual(
      visual,
      {
        kind: derivedVisual.kind,
        markCount: derivedVisual.markCount,
        receipt: derivedVisual.receipt,
        status: "supported",
      },
      `${label} exact G05 visual rational reconstruction`,
    );
    assertReceipt(
      receipt.collision?.paintedMarkCount === derivedVisual.markCount,
      `${label} collision painted-mark count does not match the exact G05 visual`,
    );
  } else {
    assertReceipt(visual.status === "unsupported", `${label}.visual.status is invalid`);
    assertReceipt(
      zeroMagnitude,
      `${label}.visual claims unsupported zero-magnitude ownership for a nonzero state`,
    );
    assertReceipt(
      sameArray(Object.keys(visual).sort(), ["kind", "status"]),
      `${label}.visual unsupported receipt contains unmodelled evidence`,
    );
    assertReceipt(
      derivedVisual.status === "unsupported" && derivedVisual.markCount === 0,
      `${label}.visual unsupported state does not reconstruct zero painted marks`,
    );
  }
  assertReceipt(
    runtimeVisuals.length === 2,
    `${label} runtime visual signature must contain exactly one equation and one visual owner`,
  );
  for (const [index, runtimeVisual] of runtimeVisuals.entries()) {
    assertExactObjectKeys(
      `${label}.runtimeSignature.visual[${index}]`,
      runtimeVisual,
      ["geometryReceipt", "kind", "markCount", "visibleReceipt"],
    );
  }
  const equationVisuals = runtimeVisuals.filter((runtimeVisual) =>
    runtimeVisual.geometryReceipt === null &&
    runtimeVisual.kind === null &&
    runtimeVisual.markCount === null &&
    runtimeVisual.visibleReceipt === expectedVisualKind
  );
  assertReceipt(
    equationVisuals.length === 1,
    `${label} runtime visual signature lacks the exact visible equation receipt`,
  );
  const geometryVisuals = runtimeVisuals.filter((runtimeVisual) =>
    runtimeVisual !== equationVisuals[0]
  );
  assertReceipt(
    geometryVisuals.length === 1,
    `${label} runtime visual signature has ambiguous geometry ownership`,
  );
  const runtimeGeometry = geometryVisuals[0];
  if (visual.status === "supported") {
    const runtimeMarkCount = canonicalPositiveIntegerString(runtimeGeometry.markCount);
    assertReceipt(
      runtimeGeometry.kind === expectedVisualKind &&
        runtimeGeometry.visibleReceipt === null &&
        runtimeMarkCount === visual.markCount,
      `${label} runtime supported visual kind/mark count does not match the aggregate`,
    );
    assertReceiptEqual(
      parseReceiptJson(
        runtimeGeometry.geometryReceipt,
        `${label}.runtimeSignature.visual.geometryReceipt`,
      ),
      visual.receipt,
      `${label} runtime supported visual geometry receipt`,
    );
  } else {
    assertReceipt(
      runtimeGeometry.geometryReceipt === null &&
        runtimeGeometry.kind === "unsupported" &&
        runtimeGeometry.markCount === null &&
        runtimeGeometry.visibleReceipt === null,
      `${label} runtime unsupported visual owner is not exact`,
    );
  }
  const layout = requireReceiptRecord(receipt, "layout", label);
  assertReceipt(layout.status === undefined, `${label}.layout has an unmodelled status`);
  requireReceiptPositiveNumber(layout, "targetCount", `${label}.layout`);
}

function parseReceiptJson(value, label) {
  assertReceipt(isNonEmptyString(value), `${label} is not a JSON string`);
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

const g05Modes = Object.freeze([
  "convert",
  "find-part",
  "find-whole",
  "increase",
  "decrease",
  "discount",
  "inverse",
]);

function g05ExpectedVisualKind(state, label) {
  assertReceipt(g05Modes.includes(state.mode), `${label}.mode is invalid`);
  for (const field of ["amount", "base", "newValue", "rateBasisPoints"]) {
    assertReceipt(
      Number.isSafeInteger(state[field]) && state[field] >= 0,
      `${label}.${field} is not an exact nonnegative integer`,
    );
  }
  assertReceipt(isNonEmptyString(state.labId), `${label}.labId is invalid`);
  assertReceipt(
    state.inverseDirection === "increase" || state.inverseDirection === "decrease",
    `${label}.inverseDirection is invalid`,
  );
  return state.mode === "convert"
    ? "conversion"
    : state.mode === "increase" || state.mode === "decrease"
      ? "percent-change"
      : state.mode;
}

function g05HasZeroMagnitude(state) {
  if (
    state.mode === "find-part" ||
    state.mode === "increase" ||
    state.mode === "decrease" ||
    state.mode === "discount"
  ) {
    return state.base === 0;
  }
  if (state.mode === "find-whole") return state.amount === 0;
  if (state.mode === "inverse") return state.newValue === 0;
  return false;
}

const g06Modes = Object.freeze([
  "equivalent-ratios",
  "direct-proportion",
  "inverse-proportion",
  "scale-drawing",
]);

const g06Units = Object.freeze(["mm", "cm", "m", "km"]);

function validateG06DomainState(state, label) {
  assertExactObjectKeys(
    label,
    state,
    ["actualUnit", "drawingLength", "drawingUnit", "labId", "mode", "ratioA", "ratioB", "scaleFactor"],
  );
  assertReceipt(g06Modes.includes(state.mode), `${label}.mode is not a production G06 mode`);
  assertReceipt(
    state.labId === "pep-primary-p6-lower-ratio-proportion-scale",
    `${label}.labId is not the production G06 lab`,
  );
  for (const field of ["actualUnit", "drawingUnit"]) {
    assertReceipt(g06Units.includes(state[field]), `${label}.${field} is invalid`);
  }
  for (const field of ["drawingLength", "ratioA", "ratioB", "scaleFactor"]) {
    assertReceipt(
      Number.isSafeInteger(state[field]) && state[field] >= 1 && state[field] <= 10_000,
      `${label}.${field} is outside the exact safe-integer control range`,
    );
  }
}

function validateG06DomainReceipt(domain, label) {
  assertExactObjectKeys(
    label,
    domain,
    ["domainId", "expected", "match", "observed", "projectionCount", "rejection", "requested"],
  );
  validateDomainReceipt(domain, label, { requiresMatch: true });
  for (const field of ["requested", "expected", "observed"]) {
    validateG06DomainState(domain[field], `${label}.${field}`);
  }
  assertReceipt(domain.projectionCount === 0, `${label} invented a projection`);
  assertReceipt(
    domain.domainId === `ratio-proportion-scale-${domain.observed.mode}-v1`,
    `${label}.domainId is invalid for the observed mode`,
  );
}

function validateG06Rational(value, label) {
  assertReceipt(
    typeof value === "string" && /^-?(?:0|[1-9][0-9]*)\/[1-9][0-9]*$/u.test(value),
    `${label} is not an exact rational string`,
  );
}

function validateG06RationalRecord(value, keys, label) {
  assertExactObjectKeys(label, value, keys);
  for (const key of keys) validateG06Rational(value[key], `${label}.${key}`);
}

function validateG06VisualReceipt(receipt, expectedMode, label) {
  assertReceipt(isRecord(receipt), `${label} is malformed`);
  assertReceipt(receipt.kind === expectedMode, `${label}.kind does not match the production mode`);
  assertReceipt(receipt.status === "supported", `${label}.status is not supported`);
  if (expectedMode === "equivalent-ratios") {
    assertExactObjectKeys(label, receipt, ["crossProducts", "firstRatio", "kind", "scaleFactor", "secondRatio", "status"]);
    validateG06RationalRecord(receipt.crossProducts, ["left", "right"], `${label}.crossProducts`);
    validateG06RationalRecord(receipt.firstRatio, ["antecedent", "consequent"], `${label}.firstRatio`);
    validateG06RationalRecord(receipt.secondRatio, ["antecedent", "consequent"], `${label}.secondRatio`);
    validateG06Rational(receipt.scaleFactor, `${label}.scaleFactor`);
    return;
  }
  if (expectedMode === "direct-proportion") {
    assertExactObjectKeys(label, receipt, ["constantK", "crossProducts", "firstPair", "kind", "scaleFactor", "secondPair", "status"]);
    validateG06RationalRecord(receipt.constantK, ["first", "second"], `${label}.constantK`);
    validateG06RationalRecord(receipt.crossProducts, ["left", "right"], `${label}.crossProducts`);
    validateG06RationalRecord(receipt.firstPair, ["dependent", "independent"], `${label}.firstPair`);
    validateG06RationalRecord(receipt.secondPair, ["dependent", "independent"], `${label}.secondPair`);
    validateG06Rational(receipt.scaleFactor, `${label}.scaleFactor`);
    return;
  }
  if (expectedMode === "inverse-proportion") {
    assertExactObjectKeys(label, receipt, ["constantProduct", "firstPair", "kind", "scaleFactor", "secondPair", "status"]);
    validateG06RationalRecord(receipt.constantProduct, ["first", "second"], `${label}.constantProduct`);
    validateG06RationalRecord(receipt.firstPair, ["first", "second"], `${label}.firstPair`);
    validateG06RationalRecord(receipt.secondPair, ["first", "second"], `${label}.secondPair`);
    validateG06Rational(receipt.scaleFactor, `${label}.scaleFactor`);
    return;
  }
  assertReceipt(expectedMode === "scale-drawing", `${label} uses an invalid visual mode`);
  assertExactObjectKeys(
    label,
    receipt,
    ["actualDimension", "actualInDrawingUnits", "drawingDimension", "kind", "reconstructionInDrawingUnits", "scaleFactor", "scaleRatio", "status", "unitConversion"],
  );
  for (const field of ["actualDimension", "actualInDrawingUnits", "drawingDimension"]) {
    assertExactObjectKeys(`${label}.${field}`, receipt[field], ["length", "unit"]);
    validateG06Rational(receipt[field].length, `${label}.${field}.length`);
    assertReceipt(g06Units.includes(receipt[field].unit), `${label}.${field}.unit is invalid`);
  }
  validateG06RationalRecord(receipt.scaleRatio, ["actual", "drawing"], `${label}.scaleRatio`);
  validateG06RationalRecord(
    receipt.unitConversion,
    ["actualUnitInMillimetres", "drawingUnitInMillimetres"],
    `${label}.unitConversion`,
  );
  validateG06Rational(receipt.reconstructionInDrawingUnits, `${label}.reconstructionInDrawingUnits`);
  validateG06Rational(receipt.scaleFactor, `${label}.scaleFactor`);
}

const g06NumericControlFields = Object.freeze({
  "drawing-length": "drawingLength",
  "ratio-a": "ratioA",
  "ratio-b": "ratioB",
  "scale-factor": "scaleFactor",
});

const g06UnitControlFields = Object.freeze({
  "actual-unit": "actualUnit",
  "drawing-unit": "drawingUnit",
});

const g06UnitInMillimetres = Object.freeze({
  cm: 10,
  km: 1_000_000,
  m: 1_000,
  mm: 1,
});

function g06ControlParameters(mode) {
  return mode === "scale-drawing"
    ? ["scale-factor", "drawing-length", "actual-unit", "drawing-unit"]
    : ["ratio-a", "ratio-b", "scale-factor"];
}

function validateG06Controls(controls, state, label) {
  assertReceipt(Array.isArray(controls), `${label} must be an array`);
  const expectedParameters = g06ControlParameters(state.mode);
  assertReceipt(
    sameArray(controls.map((control) => control?.parameter), expectedParameters),
    `${label} does not expose the exact production mode control schema`,
  );
  for (const [index, control] of controls.entries()) {
    const controlLabel = `${label}[${index}]`;
    assertExactObjectKeys(
      controlLabel,
      control,
      ["disabled", "kind", "max", "min", "options", "parameter", "step", "value"],
    );
    assertReceipt(control.disabled === false, `${controlLabel} is disabled`);
    const numericField = g06NumericControlFields[control.parameter];
    if (numericField) {
      const parsed = Number(control.value);
      assertReceipt(
        control.kind === "range" &&
          control.max === 10_000 &&
          control.min === 1 &&
          control.step === 1 &&
          Array.isArray(control.options) && control.options.length === 0 &&
          Number.isSafeInteger(parsed) &&
          control.value === String(parsed) &&
          parsed === state[numericField],
        `${controlLabel} does not reconstruct its exact numeric state/range`,
      );
      continue;
    }
    const unitField = g06UnitControlFields[control.parameter];
    assertReceipt(
      unitField &&
        control.kind === "select" &&
        control.max === null &&
        control.min === null &&
        control.step === null &&
        sameArray(control.options, g06Units) &&
        control.value === state[unitField],
      `${controlLabel} does not reconstruct its exact unit enum state`,
    );
  }
}

function g06RationalText(rawNumerator, rawDenominator = 1) {
  let numerator = BigInt(rawNumerator);
  let denominator = BigInt(rawDenominator);
  assertReceipt(denominator !== 0n, "G06 derived rational divides by zero");
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  let a = numerator < 0n ? -numerator : numerator;
  let b = denominator;
  while (b !== 0n) [a, b] = [b, a % b];
  const divisor = a || 1n;
  return `${numerator / divisor}/${denominator / divisor}`;
}

function deriveG06VisualReceipt(state) {
  const ratioA = BigInt(state.ratioA);
  const ratioB = BigInt(state.ratioB);
  const factor = BigInt(state.scaleFactor);
  if (state.mode === "equivalent-ratios") {
    return {
      crossProducts: {
        left: g06RationalText(ratioA * ratioB * factor),
        right: g06RationalText(ratioA * ratioB * factor),
      },
      firstRatio: {
        antecedent: g06RationalText(ratioA),
        consequent: g06RationalText(ratioB),
      },
      kind: state.mode,
      scaleFactor: g06RationalText(factor),
      secondRatio: {
        antecedent: g06RationalText(ratioA * factor),
        consequent: g06RationalText(ratioB * factor),
      },
      status: "supported",
    };
  }
  if (state.mode === "direct-proportion") {
    return {
      constantK: {
        first: g06RationalText(ratioB, ratioA),
        second: g06RationalText(ratioB * factor, ratioA * factor),
      },
      crossProducts: {
        left: g06RationalText(ratioA * ratioB * factor),
        right: g06RationalText(ratioA * ratioB * factor),
      },
      firstPair: {
        dependent: g06RationalText(ratioB),
        independent: g06RationalText(ratioA),
      },
      kind: state.mode,
      scaleFactor: g06RationalText(factor),
      secondPair: {
        dependent: g06RationalText(ratioB * factor),
        independent: g06RationalText(ratioA * factor),
      },
      status: "supported",
    };
  }
  if (state.mode === "inverse-proportion") {
    return {
      constantProduct: {
        first: g06RationalText(ratioA * ratioB),
        second: g06RationalText(ratioA * ratioB),
      },
      firstPair: {
        first: g06RationalText(ratioA),
        second: g06RationalText(ratioB),
      },
      kind: state.mode,
      scaleFactor: g06RationalText(factor),
      secondPair: {
        first: g06RationalText(ratioA * factor),
        second: g06RationalText(ratioB, factor),
      },
      status: "supported",
    };
  }
  const drawingLength = BigInt(state.drawingLength);
  const drawingMillimetres = BigInt(g06UnitInMillimetres[state.drawingUnit]);
  const actualMillimetres = BigInt(g06UnitInMillimetres[state.actualUnit]);
  return {
    actualDimension: {
      length: g06RationalText(
        drawingLength * factor * drawingMillimetres,
        actualMillimetres,
      ),
      unit: state.actualUnit,
    },
    actualInDrawingUnits: {
      length: g06RationalText(drawingLength * factor),
      unit: state.drawingUnit,
    },
    drawingDimension: {
      length: g06RationalText(drawingLength),
      unit: state.drawingUnit,
    },
    kind: state.mode,
    reconstructionInDrawingUnits: g06RationalText(drawingLength * factor),
    scaleFactor: g06RationalText(factor),
    scaleRatio: {
      actual: g06RationalText(factor),
      drawing: "1/1",
    },
    status: "supported",
    unitConversion: {
      actualUnitInMillimetres: g06RationalText(actualMillimetres),
      drawingUnitInMillimetres: g06RationalText(drawingMillimetres),
    },
  };
}

function validateG06Request(request, label) {
  assertReceipt(isRecord(request), `${label} is malformed`);
  if (request.kind === "initial" || request.kind === "reset") {
    assertExactObjectKeys(label, request, ["kind"]);
    return;
  }
  if (request.kind === "control") {
    assertExactObjectKeys(label, request, ["controlId", "kind", "value"]);
    assertReceipt(
      Object.hasOwn(g06NumericControlFields, request.controlId) &&
        typeof request.value === "number",
      `${label} is not an exact numeric control request`,
    );
    return;
  }
  assertReceipt(request.kind === "controller", `${label}.kind is invalid`);
  assertExactObjectKeys(label, request, ["controllerId", "kind", "value"]);
  assertReceipt(
    ["mode", ...Object.keys(g06UnitControlFields)].includes(request.controllerId) &&
      typeof request.value === "string",
    `${label} is not an exact controller request`,
  );
}

function g06ResetState() {
  return {
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    labId: "pep-primary-p6-lower-ratio-proportion-scale",
    mode: "equivalent-ratios",
    ratioA: 2,
    ratioB: 3,
    scaleFactor: 4,
  };
}

function deriveG06Action(before, request) {
  if (request.kind === "initial") {
    return { expected: structuredClone(before), rejection: null, requested: structuredClone(before) };
  }
  if (request.kind === "reset") {
    const reset = g06ResetState();
    return { expected: reset, rejection: null, requested: structuredClone(reset) };
  }
  if (request.kind === "control") {
    const visible = g06ControlParameters(before.mode);
    if (!visible.includes(request.controlId)) {
      return { expected: structuredClone(before), rejection: "CONTROL_NOT_VISIBLE", requested: structuredClone(before) };
    }
    if (!Number.isSafeInteger(request.value)) {
      return { expected: structuredClone(before), rejection: "INVALID_CONTROL_VALUE", requested: structuredClone(before) };
    }
    if (request.value < 1 || request.value > 10_000) {
      return { expected: structuredClone(before), rejection: "DIRECT_CONTROL_OUT_OF_RANGE", requested: structuredClone(before) };
    }
    const requested = { ...before, [g06NumericControlFields[request.controlId]]: request.value };
    return { expected: requested, rejection: null, requested: structuredClone(requested) };
  }
  if (request.controllerId === "mode") {
    if (!g06Modes.includes(request.value)) {
      return { expected: structuredClone(before), rejection: "INVALID_MODE", requested: structuredClone(before) };
    }
    const requested = { ...before, mode: request.value };
    return { expected: requested, rejection: null, requested: structuredClone(requested) };
  }
  if (before.mode !== "scale-drawing") {
    return { expected: structuredClone(before), rejection: "CONTROL_NOT_VISIBLE", requested: structuredClone(before) };
  }
  if (!g06Units.includes(request.value)) {
    return { expected: structuredClone(before), rejection: "INVALID_UNIT", requested: structuredClone(before) };
  }
  const requested = { ...before, [g06UnitControlFields[request.controllerId]]: request.value };
  return { expected: requested, rejection: null, requested: structuredClone(requested) };
}

function validateG06StateReceipt(receipt, label) {
  const domain = requireReceiptRecord(receipt, "domain", label);
  validateG06DomainReceipt(domain, `${label}.domain`);
  const configuredState = requireReceiptRecord(receipt, "configuredState", label);
  validateG06DomainState(configuredState, `${label}.configuredState`);
  assertReceiptEqual(configuredState, domain.observed, `${label} configured/domain state`);
  assertReceipt(
    isNonEmptyString(configuredState.mode) &&
      domain.domainId === `ratio-proportion-scale-${configuredState.mode}-v1`,
    `${label} domain identity is invalid for its configured mode`,
  );
  const action = requireReceiptRecord(receipt, "action", label);
  assertExactObjectKeys(
    `${label}.action`,
    action,
    ["before", "expectedRejection", "expectedState", "plannedRequest"],
  );
  for (const field of ["before", "expectedState", "plannedRequest"]) requireReceiptRecord(action, field, `${label}.action`);
  validateG06DomainState(action.before, `${label}.action.before`);
  validateG06DomainState(action.expectedState, `${label}.action.expectedState`);
  validateG06Request(action.plannedRequest, `${label}.action.plannedRequest`);
  const derivedAction = deriveG06Action(action.before, action.plannedRequest);
  assertReceipt(
    action.expectedRejection === derivedAction.rejection,
    `${label} G06 request rejection is not reconstructed from the exact before state`,
  );
  assertReceiptEqual(
    action.expectedState,
    derivedAction.expected,
    `${label} G06 request/result state`,
  );
  const product = requireReceiptRecord(receipt, "productAction", label);
  assertExactObjectKeys(
    `${label}.productAction`,
    product,
    ["before", "expected", "observed", "projections", "rejection", "request", "requested", "status", "version"],
  );
  assertReceipt(product.version === "ratio-proportion-scale-action-receipt-v1", `${label} product action version is invalid`);
  assertReceipt(product.status === "accepted" || product.status === "rejected", `${label} product action status is invalid`);
  for (const field of ["before", "expected", "observed", "request", "requested"]) requireReceiptRecord(product, field, `${label}.productAction`);
  validateG06Request(product.request, `${label}.productAction.request`);
  for (const field of ["before", "expected", "observed", "requested"]) {
    validateG06DomainState(product[field], `${label}.productAction.${field}`);
  }
  const projections = requireReceiptArray(product, "projections", `${label}.productAction`);
  assertReceipt(projections.length === 0, `${label} product action invented a projection`);
  assertReceiptEqual(product.request, action.plannedRequest, `${label} planned product request`);
  assertReceiptEqual(product.before, action.before, `${label} product before state`);
  assertReceipt(action.expectedRejection === domain.rejection, `${label} action/domain rejection is inconsistent`);
  for (const field of ["requested", "expected", "observed"]) {
    assertReceiptEqual(product[field], domain[field], `${label} product/domain ${field} state`);
  }
  if (action.expectedRejection) {
    assertReceipt(product.status === "rejected" && product.rejection === action.expectedRejection, `${label} rejected product action status/rejection is inconsistent`);
    for (const field of ["requested", "expected", "observed"]) assertReceiptEqual(product[field], action.before, `${label} rejected product ${field} state`);
  } else {
    assertReceipt(product.status === "accepted" && product.rejection === null, `${label} accepted product action status/rejection is inconsistent`);
    for (const field of ["requested", "expected", "observed"]) assertReceiptEqual(product[field], action.expectedState, `${label} accepted product ${field} state`);
  }
  assertReceiptEqual(product.requested, derivedAction.requested, `${label} G06 exact request requested-state result`);
  assertReceiptEqual(product.expected, derivedAction.expected, `${label} G06 exact request expected-state result`);
  validateG06Controls(receipt.controls, configuredState, `${label}.controls`);

  const runtime = parseReceiptJson(requireReceiptString(receipt, "runtimeSignature", label), `${label}.runtimeSignature`);
  assertReceipt(isRecord(runtime), `${label}.runtimeSignature is malformed`);
  assertExactObjectKeys(
    `${label}.runtimeSignature`,
    runtime,
    [
      "actionBefore",
      "actionExpected",
      "actionObserved",
      "actionProjections",
      "actionReceipt",
      "actionRejection",
      "actionRequest",
      "actionRequested",
      "actionStatus",
      "actionVersion",
      "controls",
      "domainId",
      "expected",
      "geometry",
      "mode",
      "observed",
      "projectionCount",
      "rejection",
      "requested",
      "semanticState",
      "state",
    ],
  );
  assertReceipt(runtime.stable === undefined, `${label}.runtimeSignature has an invalid stable flag`);
  assertReceipt(runtime.actionStatus === product.status, `${label} runtime action status is inconsistent`);
  assertReceipt(runtime.actionVersion === product.version, `${label} runtime action version is inconsistent`);
  assertReceipt(runtime.actionRejection === (product.rejection ?? "none"), `${label} runtime action rejection is inconsistent`);
  assertReceipt(runtime.rejection === domain.rejection, `${label} runtime domain rejection is inconsistent`);
  assertReceiptEqual(runtime.controls, receipt.controls, `${label} runtime visible controls`);
  validateG06Controls(runtime.controls, configuredState, `${label}.runtimeSignature.controls`);
  assertReceipt(runtime.domainId === domain.domainId && runtime.mode === configuredState.mode, `${label} runtime domain/mode identity is inconsistent`);
  assertReceipt(runtime.projectionCount === "0", `${label} runtime projection count is inconsistent`);
  for (const [field, expected] of [
    ["expected", domain.expected],
    ["observed", domain.observed],
    ["requested", domain.requested],
    ["state", configuredState],
    ["semanticState", configuredState],
    ["actionBefore", product.before],
    ["actionExpected", product.expected],
    ["actionObserved", product.observed],
    ["actionRequested", product.requested],
    ["actionRequest", product.request],
  ]) {
    assertReceiptEqual(parseReceiptJson(runtime[field], `${label}.runtimeSignature.${field}`), expected, `${label} runtime ${field}`);
  }
  assertReceiptEqual(parseReceiptJson(runtime.actionReceipt, `${label}.runtimeSignature.actionReceipt`), product, `${label} runtime product action receipt`);
  assertReceiptEqual(parseReceiptJson(runtime.actionProjections, `${label}.runtimeSignature.actionProjections`), [], `${label} runtime action projections`);
  assertReceipt(
    Array.isArray(runtime.geometry) && runtime.geometry.length === 1,
    `${label} runtime geometry must contain exactly one visual`,
  );
  const expectedMarkCount = configuredState.mode === "equivalent-ratios" ||
      configuredState.mode === "direct-proportion"
    ? 5
    : 3;
  let runtimeMarkCount = null;
  for (const [index, geometry] of runtime.geometry.entries()) {
    assertExactObjectKeys(
      `${label}.runtimeSignature.geometry[${index}]`,
      geometry,
      ["kind", "marks", "receipt"],
    );
    assertReceipt(isNonEmptyString(geometry.kind), `${label} runtime geometry[${index}] is malformed`);
    assertReceipt(geometry.kind === configuredState.mode, `${label} runtime geometry[${index}] mode is inconsistent`);
    runtimeMarkCount = canonicalPositiveIntegerString(geometry.marks);
    assertReceipt(
      runtimeMarkCount === expectedMarkCount,
      `${label} runtime geometry[${index}] mark count is not the exact mode-derived safe integer`,
    );
    validateG06VisualReceipt(
      parseReceiptJson(
        geometry.receipt,
        `${label}.runtimeSignature.geometry[${index}].receipt`,
      ),
      configuredState.mode,
      `${label}.runtimeSignature.geometry[${index}].receipt`,
    );
  }
  const visual = requireReceiptRecord(receipt, "visual", label);
  assertExactObjectKeys(`${label}.visual`, visual, ["kind", "markCount", "receipt"]);
  assertReceipt(visual.kind === configuredState.mode, `${label}.visual.kind is inconsistent with the configured mode`);
  assertReceipt(
    exactPositiveInteger(visual.markCount) &&
      visual.markCount === expectedMarkCount &&
      visual.markCount === runtimeMarkCount,
    `${label}.visual mark count does not match the exact runtime/mode-derived safe integer`,
  );
  const visualReceipt = requireReceiptRecord(visual, "receipt", `${label}.visual`);
  validateG06VisualReceipt(visualReceipt, configuredState.mode, `${label}.visual.receipt`);
  assertReceiptEqual(
    visualReceipt,
    deriveG06VisualReceipt(configuredState),
    `${label} G06 visual rational receipt derived from domain`,
  );
  const runtimeGeometryReceipt = parseReceiptJson(
    runtime.geometry[0].receipt,
    `${label}.runtimeSignature.geometry[0].receipt`,
  );
  assertReceiptEqual(
    runtimeGeometryReceipt,
    visualReceipt,
    `${label} top visual/runtime geometry receipt`,
  );
  requireReceiptPositiveNumber(receipt, "touchTargetCount", label);
}

function validatePositiveStateReceipt(group, receipt, label) {
  if (!isRecord(receipt)) throw new Error(`${label} is a malformed or hollow state receipt`);
  const collision = requireReceiptRecord(receipt, "collision", label);
  const contrast = requireReceiptRecord(receipt, "contrast", label);
  validateContrastReceipt(group, contrast, `${label}.contrast`);
  if (["G03", "G04", "G05", "G06"].includes(group.id)) {
    validateReceiptControls(receipt.controls, label);
    validateCollisionReceipt(group, collision, receipt.visual, `${label}.collision`);
    const unsupportedZeroArea =
      group.id === "G05" && isRecord(receipt.visual) && receipt.visual.status === "unsupported";
    if (!unsupportedZeroArea) {
      assertReceipt(
        isNonEmptyString(receipt.stateId) && collision.phase === receipt.stateId,
        `${label}.collision phase does not match the exact producer state ID`,
      );
    }
  } else {
    assertReceipt(
      Array.isArray(receipt.controls) && receipt.controls.length > 0 && receipt.controls.every(isRecord),
      `${label} lacks required positive evidence controls`,
    );
    for (const field of ["inspectedCandidateCount", "learnerControlCount", "totalCandidatePairCount"]) {
      requireReceiptPositiveNumber(collision, field, `${label}.collision`);
    }
  }

  if (group.id === "G03") {
    validateG03StateReceipt(receipt, label);
    return;
  }
  if (group.id === "G04") {
    validateG04StateReceipt(receipt, label);
    return;
  }
  if (group.id === "G05") {
    validateG05StateReceipt(receipt, label);
    return;
  }
  if (group.id === "G06") {
    validateG06StateReceipt(receipt, label);
    return;
  }

  requireReceiptRecord(receipt, "action", label);
  if (!isRecord(receipt.geometry) && !isRecord(receipt.visual)) {
    throw new Error(`${label} lacks required positive visual or geometry evidence`);
  }
  if (
    !isPositiveFiniteNumber(receipt.touchTargetCount) &&
    !(isRecord(receipt.layout) && isPositiveFiniteNumber(receipt.layout.targetCount))
  ) {
    throw new Error(`${label} lacks required positive layout evidence`);
  }
}

function validatePlannedStateDescriptor(group, descriptor, receipt, label) {
  const focusedGroup = ["G03", "G04", "G05", "G06"].includes(group.id);
  assertExactObjectKeys(
    label,
    descriptor,
    focusedGroup ? ["labId", "plan", "stateId"] : ["plan", "stateId"],
  );
  const stateId = requireReceiptString(descriptor, "stateId", label);
  const plan = requireReceiptRecord(descriptor, "plan", label);
  assertExactObjectKeys(`${label}.plan`, plan, [
    "controlParameter",
    "kind",
    "mode",
    "request",
  ]);
  assertReceipt(isNonEmptyString(plan.kind), `${label}.plan.kind is missing`);
  assertReceipt(
    plan.controlParameter === null || isNonEmptyString(plan.controlParameter),
    `${label}.plan.controlParameter must be null or a non-empty string`,
  );

  if (!focusedGroup) {
    assertReceipt(
      plan.mode === null && plan.request === null && plan.controlParameter === null,
      `${label}.plan generic fixture semantics are malformed`,
    );
    return stateId;
  }

  const descriptorLabId = requireReceiptString(descriptor, "labId", label);
  const stateIdSeparator = stateId.indexOf(":");
  assertReceipt(
    stateIdSeparator > 0 && stateIdSeparator < stateId.length - 1,
    `${label}.stateId does not contain an exact lab prefix`,
  );
  const stateIdLabId = stateId.slice(0, stateIdSeparator);
  assertReceipt(
    descriptorLabId === stateIdLabId,
    `${label}.labId does not match the stateId lab prefix`,
  );

  assertReceipt(isRecord(receipt), `${label} has no matching state receipt`);
  const receiptLabId = group.id === "G03"
    ? parseG03ConfiguredState(receipt.configuredState, `${label} receipt`).labId
    : group.id === "G04"
      ? parseG04ConfiguredState(receipt.configuredState, `${label} receipt`).labId
      : group.id === "G05"
        ? receipt.domain?.observed?.labId
        : receipt.configuredState?.labId;
  assertReceipt(
    descriptorLabId === receiptLabId,
    `${label}.labId does not match the reconstructed receipt lab`,
  );
  const receiptMode = group.id === "G05"
    ? receipt.domain?.observed?.mode
    : group.id === "G06"
      ? receipt.configuredState?.mode
      : receipt.mode;
  assertReceipt(isNonEmptyString(receiptMode), `${label} matching receipt mode is missing`);
  assertReceipt(
    plan.mode === receiptMode,
    `${label}.plan descriptor mode does not match the receipt mode`,
  );

  const plannedRequest = receipt.action?.plannedRequest;
  assertReceipt(isRecord(plannedRequest), `${label} matching receipt planned request is missing`);
  assertReceipt(
    isDeepStrictEqual(plan.request, plannedRequest),
    `${label}.plan descriptor request does not match the receipt request`,
  );
  assertReceipt(
    plan.kind === plannedRequest.kind,
    `${label}.plan descriptor kind does not match the receipt request kind`,
  );

  let expectedControlParameter = null;
  if (plannedRequest.kind === "control") {
    const usesG03Control = group.id === "G03";
    assertReceipt(
      (usesG03Control &&
        Object.hasOwn(plannedRequest, "control") &&
        !Object.hasOwn(plannedRequest, "controlId")) ||
        (!usesG03Control &&
          Object.hasOwn(plannedRequest, "controlId") &&
          !Object.hasOwn(plannedRequest, "control")),
      `${label} receipt control request uses an invalid or ambiguous identity field`,
    );
    assertReceipt(
      !Object.hasOwn(plannedRequest, "controller") &&
        !Object.hasOwn(plannedRequest, "controllerId"),
      `${label} receipt control request contains a controller identity alias`,
    );
    expectedControlParameter = usesG03Control
      ? plannedRequest.control
      : plannedRequest.controlId;
    assertReceipt(
      isNonEmptyString(expectedControlParameter),
      `${label} receipt control request has no exact control identity`,
    );
  } else if (plannedRequest.kind === "controller") {
    if (group.id === "G03") {
      assertReceipt(
        Object.hasOwn(plannedRequest, "controller") &&
          !Object.hasOwn(plannedRequest, "controllerId") &&
          !Object.hasOwn(plannedRequest, "control") &&
          !Object.hasOwn(plannedRequest, "controlId"),
        `${label} G03 controller request uses an invalid or ambiguous identity field`,
      );
      expectedControlParameter = plannedRequest.controller ?? null;
    } else if (group.id === "G04") {
      assertReceipt(
        !Object.hasOwn(plannedRequest, "controller") &&
          !Object.hasOwn(plannedRequest, "controllerId") &&
          !Object.hasOwn(plannedRequest, "control") &&
          !Object.hasOwn(plannedRequest, "controlId") &&
        isNonEmptyString(plannedRequest.mode) &&
          isNonEmptyString(plannedRequest.evaluatedOperation) &&
          plannedRequest.mode === receiptMode &&
          plannedRequest.evaluatedOperation === receipt.evaluatedOperation,
        `${label} G04 controller request does not match the receipt mode/operation`,
      );
      expectedControlParameter = "mode/evaluated-operation";
    } else {
      assertReceipt(
        Object.hasOwn(plannedRequest, "controllerId") &&
          !Object.hasOwn(plannedRequest, "controller") &&
          !Object.hasOwn(plannedRequest, "control") &&
          !Object.hasOwn(plannedRequest, "controlId"),
        `${label} ${group.id} controller request uses an invalid or ambiguous identity field`,
      );
      expectedControlParameter = plannedRequest.controllerId ?? null;
    }
    assertReceipt(
      isNonEmptyString(expectedControlParameter),
      `${label} receipt controller request has no exact controller identity`,
    );
  } else {
    assertReceipt(
      (plannedRequest.kind === "initial" || plannedRequest.kind === "reset") &&
        !["control", "controlId", "controller", "controllerId"].some((field) =>
          Object.hasOwn(plannedRequest, field)
        ),
      `${label} receipt request kind is not modelled`,
    );
  }
  assertReceipt(
    plan.controlParameter === expectedControlParameter,
    `${label}.plan descriptor control parameter does not match the receipt request`,
  );
  if (plannedRequest.kind === "control") {
    assertReceipt(
      arrayOf(receipt.controls).some((control) =>
        isRecord(control) && control.parameter === expectedControlParameter
      ),
      `${label}.plan control parameter is absent from the receipt controls`,
    );
  }
  return stateId;
}

function assertExactObjectKeys(label, value, expectedKeys) {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (!sameArray(actual, expected)) {
    throw new Error(
      `${label} key mismatch; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`,
    );
  }
}

function expectedStorageFamilyForKey(key, userId) {
  if (!isNonEmptyString(key) || !isNonEmptyString(userId)) return null;
  const user = encodeURIComponent(userId);
  const exact = new Map([
    [`mais:learning-analytics-boundary-lineage:v1:${user}`, "analytics-boundary-lineage"],
    [`mais:learning-analytics-clear-fence:v1:${user}`, "analytics-clear-fence"],
    [`mais:learning-analytics-generation:v1:${user}`, "analytics-generation"],
    [
      `mais:learning-analytics-generation-handshake:v1:${user}`,
      "analytics-generation-handshake",
    ],
    [
      `mais:learning-analytics-generation-transition:v1:${user}`,
      "analytics-generation-transition",
    ],
    [`mais:learning-analytics-outbox:v1:${user}`, "analytics-legacy"],
    [`mais:learning-analytics-outbox:v1:${user}:quarantine`, "analytics-legacy"],
  ]);
  if (exact.has(key)) return exact.get(key);
  for (const [prefix, family] of [
    [`mais:visualization-session-outbox:v1:${user}/`, "session-live"],
    [`mais:visualization-session-outbox-quarantine:v1:${user}:`, "session-quarantine"],
    [
      `mais:visualization-session-outbox-legacy-terminal:v1:${user}:`,
      "session-legacy-terminal",
    ],
    [`mais:learning-analytics-outbox:v2:${user}:`, "analytics-confirmed"],
    [
      `mais:learning-analytics-unconfirmed-outbox:v1:${user}:`,
      "analytics-unconfirmed",
    ],
    [
      `mais:learning-analytics-generation-quarantine:v1:${user}:`,
      "analytics-quarantine",
    ],
    [`mais:learning-analytics-corrupt-outbox:v1:${user}:`, "analytics-corrupt"],
    [`mais:viz-completion-telemetry:v1:${user}/`, "completion-telemetry"],
  ]) {
    if (key.startsWith(prefix)) return family;
  }
  return null;
}

function validProtocolId(value) {
  return isNonEmptyString(value) && value.length <= 240;
}

function uniqueProtocolValues(value, predicate = validProtocolId) {
  return Array.isArray(value) &&
    value.every(predicate) &&
    new Set(value).size === value.length;
}

function validCompletionClaim(value, userId) {
  return isRecord(value) &&
    expectedStorageFamilyForKey(value.storageKey, userId) === "completion-telemetry" &&
    typeof value.originalValue === "string" &&
    typeof value.claimedValue === "string" &&
    value.claimedValue.length > 0;
}

function validateProtocolStorageEntry(entry, userId, label) {
  const record = entry.parsed;
  const encodedUserId = encodeURIComponent(userId);
  const nonNegativeGeneration = (value) =>
    Number.isSafeInteger(value) && value >= 0;
  const exactAnalyticsClearKey = (key) =>
    key.startsWith(`mais:learning-analytics-outbox:v2:${encodedUserId}:`) ||
    key.startsWith(`mais:learning-analytics-unconfirmed-outbox:v1:${encodedUserId}:`) ||
    key.startsWith(`mais:learning-analytics-generation-quarantine:v1:${encodedUserId}:`) ||
    key.startsWith(`mais:learning-analytics-corrupt-outbox:v1:${encodedUserId}:confirmed:`) ||
    key.startsWith(`mais:learning-analytics-corrupt-outbox:v1:${encodedUserId}:unconfirmed:`) ||
    key === `mais:learning-analytics-outbox:v1:${encodedUserId}` ||
    key === `mais:learning-analytics-outbox:v1:${encodedUserId}:quarantine`;
  const exactCompletionKey = (key) =>
    key.startsWith(`mais:viz-completion-telemetry:v1:${encodedUserId}/`);
  const exactUnconfirmedKey = (key) =>
    key.startsWith(`mais:learning-analytics-unconfirmed-outbox:v1:${encodedUserId}:`);
  const exactConfirmedKey = (key) =>
    key.startsWith(`mais:learning-analytics-outbox:v2:${encodedUserId}:`);
  const validStorageKeys = (value, predicate) =>
    uniqueProtocolValues(value, (key) => isNonEmptyString(key) && predicate(key));
  const validCompletionClaims = (value) =>
    Array.isArray(value) && value.every((claim) => validCompletionClaim(claim, userId));
  try {
    switch (entry.family) {
      case "analytics-generation":
        if (!nonNegativeGeneration(record)) throw new Error("generation is invalid");
        break;
      case "analytics-clear-fence": {
        const exactKeys = record?.version === 1
          ? [
              "baseGeneration", "clearedCompletionStorageKeys", "clearedStorageKeys",
              "deleteAttemptedAt", "requestId", "requestedAt", "userId", "version",
            ]
          : [
              "baseGeneration", "clearedCompletionStorageKeys", "clearedStorageKeys",
              "completionClaims", "deleteAttemptedAt", "phase", "requestId",
              "requestedAt", "userId", "version",
            ];
        assertExactObjectKeys(label, record, exactKeys);
        if (
          ![1, 2].includes(record.version) ||
          record.userId !== userId ||
          !nonNegativeGeneration(record.baseGeneration) ||
          !isIsoTimestamp(record.requestedAt) ||
          !validProtocolId(record.requestId) ||
          (record.deleteAttemptedAt !== null && !isIsoTimestamp(record.deleteAttemptedAt)) ||
          !validStorageKeys(record.clearedStorageKeys, exactAnalyticsClearKey) ||
          !validStorageKeys(record.clearedCompletionStorageKeys, exactCompletionKey) ||
          (record.version === 2 && (
            !["collecting", "prepared"].includes(record.phase) ||
            !validCompletionClaims(record.completionClaims)
          ))
        ) throw new Error("clear fence normalization failed");
        break;
      }
      case "analytics-generation-handshake": {
        const exactKeys = record?.version === 1
          ? [
              "existingUnconfirmedEventIds", "generation", "requestId", "startedAt",
              "userId", "version",
            ]
          : [
              "existingUnconfirmedEventIds", "generation", "phase", "requestId",
              "startedAt", "userId", "version",
            ];
        assertExactObjectKeys(label, record, exactKeys);
        if (
          ![1, 2].includes(record.version) ||
          record.userId !== userId ||
          !nonNegativeGeneration(record.generation) ||
          !isIsoTimestamp(record.startedAt) ||
          !validProtocolId(record.requestId) ||
          !uniqueProtocolValues(record.existingUnconfirmedEventIds) ||
          (record.version === 2 && !["collecting", "prepared"].includes(record.phase))
        ) throw new Error("generation handshake normalization failed");
        break;
      }
      case "analytics-generation-transition": {
        const exactKeys = record?.version === 1
          ? [
              "boundaryClearedAt", "clearedCompletionStorageKeys", "fromGeneration",
              "kind", "preparedAt", "preserveAllUnconfirmed", "preserveEventIds",
              "quarantineEventIds", "toGeneration", "transitionId", "userId", "version",
            ]
          : [
              "boundaryClearedAt", "clearedCompletionStorageKeys", "completionClaims",
              "fromGeneration", "kind", "phase", "preparedAt",
              "preserveAllUnconfirmed", "preserveEventIds",
              "preserveUnconfirmedStorageKeys", "quarantineConfirmedStorageKeys",
              "quarantineEventIds", "quarantineUnconfirmedStorageKeys", "toGeneration",
              "transitionId", "userId", "version",
            ];
        assertExactObjectKeys(label, record, exactKeys);
        const directionIsValid = record.kind === "forward-clear"
          ? record.toGeneration > record.fromGeneration && isIsoTimestamp(record.boundaryClearedAt)
          : record.kind === "authoritative-lower" &&
            record.toGeneration < record.fromGeneration &&
            record.boundaryClearedAt === null;
        if (
          ![1, 2].includes(record.version) ||
          record.userId !== userId ||
          !nonNegativeGeneration(record.fromGeneration) ||
          !nonNegativeGeneration(record.toGeneration) ||
          !directionIsValid ||
          !isIsoTimestamp(record.preparedAt) ||
          !validProtocolId(record.transitionId) ||
          typeof record.preserveAllUnconfirmed !== "boolean" ||
          !uniqueProtocolValues(record.preserveEventIds) ||
          !uniqueProtocolValues(record.quarantineEventIds) ||
          !validStorageKeys(record.clearedCompletionStorageKeys, exactCompletionKey)
        ) throw new Error("generation transition normalization failed");
        if (record.version === 1) break;
        const exactRevisionKeysAreValid =
          validStorageKeys(record.preserveUnconfirmedStorageKeys, exactUnconfirmedKey) &&
          validStorageKeys(record.quarantineConfirmedStorageKeys, exactConfirmedKey) &&
          validStorageKeys(record.quarantineUnconfirmedStorageKeys, exactUnconfirmedKey);
        if (!exactRevisionKeysAreValid) break;
        if (
          !["collecting", "prepared"].includes(record.phase) ||
          !validCompletionClaims(record.completionClaims)
        ) throw new Error("generation transition normalization failed");
        break;
      }
      case "analytics-boundary-lineage":
        assertExactObjectKeys(label, record, [
          "generation", "preservedBoundaryTokens", "userId", "version",
        ]);
        if (
          record.version !== 1 ||
          record.userId !== userId ||
          !nonNegativeGeneration(record.generation) ||
          !uniqueProtocolValues(record.preservedBoundaryTokens)
        ) throw new Error("boundary lineage normalization failed");
        break;
      default:
        break;
    }
  } catch (error) {
    throw new Error(`${label} protocol storage schema is invalid: ${String(error)}`);
  }
}

function validateBrowserStorageReceipt(
  value,
  label,
  { initial = false, userId } = {},
) {
  assertExactObjectKeys(label, value, [
    "digest", "entries", "liveAnalyticsRecords", "liveSessionRecords",
    "outboxEntries", "poisonKeys", "protocolControlEntries",
  ]);
  for (const field of [
    "entries", "liveAnalyticsRecords", "liveSessionRecords", "outboxEntries",
    "poisonKeys", "protocolControlEntries",
  ]) {
    if (!Array.isArray(value[field])) throw new Error(`${label}.${field} must be an array`);
  }
  const protocolFamilies = new Set([
    "analytics-boundary-lineage", "analytics-clear-fence", "analytics-generation",
    "analytics-generation-handshake", "analytics-generation-transition",
  ]);
  const liveAnalyticsFamilies = new Set([
    "analytics-confirmed", "analytics-unconfirmed", "analytics-legacy",
    "completion-telemetry",
  ]);
  const seenKeys = new Set();
  let previousKey = null;
  for (const [index, entry] of value.entries.entries()) {
    assertExactObjectKeys(`${label}.entries[${index}]`, entry, [
      "family", "key", "parsed", "raw", "rawSha256",
    ]);
    if (
      !isNonEmptyString(entry.family) ||
      !isNonEmptyString(entry.key) ||
      typeof entry.raw !== "string" ||
      !/^[0-9a-f]{64}$/u.test(entry.rawSha256 ?? "") ||
      entry.rawSha256 !== createHash("sha256").update(entry.raw).digest("hex") ||
      entry.family !== expectedStorageFamilyForKey(entry.key, userId) ||
      seenKeys.has(entry.key) ||
      (previousKey !== null && previousKey >= entry.key)
    ) {
      throw new Error(`${label} storage entry family/identity/order/hash is malformed`);
    }
    let parsed;
    try {
      parsed = JSON.parse(entry.raw);
    } catch {
      throw new Error(`${label} storage entry raw bytes are not JSON`);
    }
    if (!isDeepStrictEqual(entry.parsed, parsed)) {
      throw new Error(`${label} storage entry parsed value drifted from raw bytes`);
    }
    validateProtocolStorageEntry(entry, userId, `${label}.entries[${index}]`);
    seenKeys.add(entry.key);
    previousKey = entry.key;
  }
  const expectedLiveAnalytics = value.entries
    .filter(({ family }) => liveAnalyticsFamilies.has(family))
    .map(({ parsed }) => parsed);
  const expectedLiveSessions = value.entries
    .filter(({ family }) => family === "session-live")
    .map(({ parsed }) => parsed);
  const expectedProtocol = value.entries.filter(({ family }) => protocolFamilies.has(family));
  const expectedOutbox = value.entries.filter(({ family }) => !protocolFamilies.has(family));
  const expectedPoison = value.entries
    .filter(({ family, key }) =>
      family === "session-quarantine" ||
      family === "session-legacy-terminal" ||
      family === "analytics-quarantine" ||
      family === "analytics-corrupt" ||
      (family === "analytics-legacy" && key.endsWith(":quarantine"))
    )
    .map(({ key }) => key);
  const expectedDigest = createHash("sha256")
    .update(canonicalJson(value.entries.map(({ key, raw }) => ({ key, raw }))))
    .digest("hex");
  if (
    value.digest !== expectedDigest ||
    !isDeepStrictEqual(value.liveAnalyticsRecords, expectedLiveAnalytics) ||
    !isDeepStrictEqual(value.liveSessionRecords, expectedLiveSessions) ||
    !isDeepStrictEqual(value.protocolControlEntries, expectedProtocol) ||
    !isDeepStrictEqual(value.outboxEntries, expectedOutbox) ||
    !isDeepStrictEqual(value.poisonKeys, expectedPoison) ||
    value.liveAnalyticsRecords.length !== 0 ||
    value.liveSessionRecords.length !== 0 ||
    value.outboxEntries.length !== 0 ||
    value.poisonKeys.length !== 0 ||
    (initial && value.entries.length !== 0)
  ) {
    throw new Error(`${label} storage receipt projections or digest are not exact`);
  }
}

function validateBrowserStorageEvents(value, label, { appOrigin, userId }) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  for (const [index, event] of value.entries()) {
    assertExactObjectKeys(`${label}[${index}]`, event, [
      "key", "newValue", "oldValue", "sequence", "url",
    ]);
    let eventUrl;
    try {
      eventUrl = new URL(event.url);
    } catch {
      throw new Error(`${label}[${index}] has no exact local URL`);
    }
    const keyIsExact = event.key === null
      ? event.newValue === null && event.oldValue === null
      : expectedStorageFamilyForKey(event.key, userId) !== null &&
        (typeof event.newValue === "string" || typeof event.oldValue === "string");
    if (
      event.sequence !== index + 1 ||
      !keyIsExact ||
      (event.newValue !== null && typeof event.newValue !== "string") ||
      (event.oldValue !== null && typeof event.oldValue !== "string") ||
      eventUrl.origin !== appOrigin ||
      eventUrl.username !== "" ||
      eventUrl.password !== "" ||
      eventUrl.search !== "" ||
      eventUrl.hash !== "" ||
      eventUrl.href !== event.url
    ) {
      throw new Error(`${label}[${index}] storage event schema/sequence/local URL/key drifted`);
    }
  }
}

function validateG03DurabilityProbeActions(probe, first, second, topicId, label) {
  const signatureKeys = [
    "actionReceipt", "controls", "domainId", "geometryOwners", "geometryState",
    "invariantStates", "mode", "semanticState", "state",
  ];
  const wrapperKeys = [
    "beforeSignature", "expectedSignature", "observedSignature", "plannedRequest",
    "projections", "receipt",
  ];
  const productKeys = [
    "before", "expected", "observed", "projections", "rejection", "request",
    "requested", "status", "version",
  ];
  const validateAction = (action, actionLabel) => {
    assertExactObjectKeys(actionLabel, action, wrapperKeys);
    const product = action.receipt;
    assertExactObjectKeys(`${actionLabel}.receipt`, product, productKeys);
    for (const name of ["beforeSignature", "expectedSignature", "observedSignature"]) {
      assertExactObjectKeys(`${actionLabel}.${name}`, action[name], signatureKeys);
    }
    if (
      product.version !== "signed-real-number-line-action-receipt-v1" ||
      product.status !== "accepted" ||
      product.rejection !== null ||
      !Array.isArray(product.projections) ||
      product.projections.length !== 0 ||
      !Array.isArray(action.projections) ||
      action.projections.length !== 0 ||
      !isDeepStrictEqual(action.projections, product.projections) ||
      !isDeepStrictEqual(action.plannedRequest, product.request) ||
      !isDeepStrictEqual(product.observed, product.expected) ||
      !isDeepStrictEqual(action.observedSignature, action.expectedSignature)
    ) {
      throw new Error(`${actionLabel} wrapper/product relationship is invalid`);
    }
    const beforeState = validateG03Snapshot(product.before, `${actionLabel}.receipt.before`, null);
    validateG03Request(product.request, beforeState, `${actionLabel}.receipt.request`);
    validateG03Snapshot(
      product.requested,
      `${actionLabel}.receipt.requested`,
      product.request,
    );
    validateG03Snapshot(product.expected, `${actionLabel}.receipt.expected`, null);
    validateG03Snapshot(product.observed, `${actionLabel}.receipt.observed`, null);
    validateG03ActionSignature(
      action.beforeSignature,
      product.before,
      `${actionLabel}.beforeSignature`,
    );
    validateG03ActionSignature(
      action.expectedSignature,
      product.expected,
      `${actionLabel}.expectedSignature`,
      product,
    );
    validateG03ActionSignature(
      action.observedSignature,
      product.observed,
      `${actionLabel}.observedSignature`,
      product,
    );
    if (
      !isDeepStrictEqual(
        { ...product.requested, pendingRequest: null },
        product.before,
      ) ||
      product.before.configuredState !== action.beforeSignature.state ||
      product.before.mode !== action.beforeSignature.mode ||
      product.expected.configuredState !== action.expectedSignature.state ||
      product.expected.mode !== action.expectedSignature.mode ||
      action.expectedSignature.semanticState !== action.expectedSignature.state ||
      !isDeepStrictEqual(
        parseReceiptJson(
          action.observedSignature.actionReceipt,
          `${actionLabel}.observedSignature.actionReceipt`,
        ),
        product,
      )
    ) {
      throw new Error(`${actionLabel} signature/snapshot relationship is invalid`);
    }
    return product;
  };
  const firstAction = probe.firstAction;
  const firstProduct = validateAction(firstAction, `${label}.firstAction`);
  const expectedProbeMode = g03DurabilityProbeModeByTopic[topicId];
  const expectedFirstRequest = {
    controller: "mode",
    kind: "controller",
    value: expectedProbeMode,
  };
  const resetInput = g03TopicResetInputs[topicId];
  const expectedFirstControlState = {
    ...firstProduct.before.controlState,
    mode: expectedProbeMode,
  };
  const expectedFirstInput = g03ModeInputFromControlState(
    topicId,
    expectedProbeMode,
    expectedFirstControlState,
  );
  const expectedFirstSnapshot = {
    configuredState: g03ConfiguredStateFromInput(
      expectedFirstInput,
      `${label}.firstAction expected transition`,
    ),
    controlState: expectedFirstControlState,
    input: expectedFirstInput,
    labId: topicId,
    mode: expectedProbeMode,
    pendingRequest: null,
  };
  if (
    !isRecord(resetInput) ||
    !isDeepStrictEqual(firstProduct.before.input, resetInput) ||
    !isDeepStrictEqual(firstProduct.expected, expectedFirstSnapshot) ||
    !isDeepStrictEqual(firstProduct.request, expectedFirstRequest) ||
    first.expectedControl.controlKey !== expectedProbeMode ||
    firstAction.expectedSignature.mode !== expectedProbeMode ||
    firstProduct.expected.mode !== expectedProbeMode ||
    firstAction.expectedSignature.domainId !==
      `signed-real-number-line:${topicId}:${expectedProbeMode}:v1`
  ) {
    throw new Error(`${label} G03 durability probe action first transition is not exact`);
  }

  const secondAction = probe.secondAction;
  const secondProduct = validateAction(secondAction, `${label}.secondAction`);
  const expectedResetRequest = { kind: "reset", topicId };
  if (
    !isDeepStrictEqual(secondProduct.request, expectedResetRequest) ||
    !isDeepStrictEqual(secondProduct.before, firstProduct.expected) ||
    !isDeepStrictEqual(secondAction.beforeSignature, firstAction.observedSignature) ||
    second.expectedControl.controlKey !== topicId
  ) {
    throw new Error(`${label} G03 durability probe action reset boundary drifted`);
  }
  const canonicalGeometry = deriveG03Geometry(
    secondProduct.expected.configuredState,
    `${label}.secondAction.reset`,
  );
  validateG03CanonicalReset(
    secondProduct.request,
    secondProduct.expected,
    secondAction.expectedSignature,
    canonicalGeometry.geometry,
    `${label}.secondAction`,
  );
  const expectedGeometryOwners = canonicalGeometry.geometry.map((point) => ({
    exactKey: point.exactKey,
    ownerId: point.owner,
    renderMarker: point.marker,
    semanticId: point.semanticId,
  }));
  if (!isDeepStrictEqual(secondAction.expectedSignature.geometryOwners, expectedGeometryOwners)) {
    throw new Error(`${label} G03 durability probe action reset geometry owners drifted`);
  }
}

function validateDurabilityReceiptEnvelope(group, evidence, label, resultInterval) {
  const durability = evidence.durabilityReceipts;
  const expectedKeys = group.id === "G03" || group.id === "G05"
    ? ["final", "mount", "probe", "rawReplayLedger"]
    : [
        "controlEvidence",
        "final",
        "firstSessionAcknowledgement",
        "mount",
        "rawReplayLedger",
      ];
  assertExactObjectKeys(`${label}.durabilityReceipts`, durability, expectedKeys);
  assertExactObjectKeys(`${label}.durabilityReceipts.final`, durability.final, [
    "apiRequests",
    "browserSessionPostCount",
    "controlEvents",
    "controlObserverStop",
    "coverage",
    "directReplayCount",
    "expectedControl",
    "first",
    "identity",
    "learnerProfileSetup",
    "manifest",
    "mount",
    "mutations",
    "navigation",
    "projectName",
    "replay",
    "requests",
    "seal",
    "second",
    "storage",
    "storageEvents",
    "testOutputDir",
    "title",
    "topology",
  ]);
  const final = durability.final;
  const mount = durability.mount;
  assertExactObjectKeys(`${label}.durabilityReceipts.mount`, mount, [
    "acknowledgements",
    "browserDigest",
    "controlEventCount",
    "durability",
    "initialStorage",
    "networkRequestCount",
    "rawIncluded",
    "root",
    "storage",
  ]);
  assertExactObjectKeys(`${label}.durabilityReceipts.mount.root`, mount.root, [
    "activeLabId",
    "controls",
    "count",
    "matchesRootSelector",
    "moduleId",
    "sessionOwner",
    "topicId",
    "visible",
  ]);
  const sha256Pattern = /^[0-9a-f]{64}$/u;
  if (
    !sha256Pattern.test(mount.browserDigest ?? "") ||
    mount.controlEventCount !== 0 ||
    !Number.isSafeInteger(mount.networkRequestCount) ||
    mount.networkRequestCount <= 0 ||
    typeof mount.rawIncluded !== "boolean"
  ) {
    throw new Error(`${label} mount terminal envelope is malformed`);
  }
  if (!Array.isArray(mount.root.controls) || mount.root.controls.length === 0) {
    throw new Error(`${label} mount root control ledger is empty`);
  }
  const mountControlKeys = new Set();
  const expectedDataPressedKeys = [
    "data-viz-mode-active",
    "data-viz-strand-active",
    "data-viz-active",
  ];
  for (const [index, control] of mount.root.controls.entries()) {
    assertExactObjectKeys(`${label}.mount.root.controls[${index}]`, control, [
      "ariaPressed", "dataPressed", "key", "max", "min", "options", "step",
      "tag", "type", "value",
    ]);
    if (
      !isNonEmptyString(control.key) ||
      control.key.trim() !== control.key ||
      mountControlKeys.has(control.key) ||
      !isNonEmptyString(control.tag) ||
      ![control.ariaPressed, control.max, control.min, control.step, control.type, control.value]
        .every((value) => value === null || typeof value === "string") ||
      !Array.isArray(control.dataPressed) ||
      control.dataPressed.length !== expectedDataPressedKeys.length ||
      control.dataPressed.some((entry, entryIndex) =>
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        entry[0] !== expectedDataPressedKeys[entryIndex] ||
        (entry[1] !== null && typeof entry[1] !== "string")
      ) ||
      !Array.isArray(control.options)
    ) {
      throw new Error(`${label} mount root control is malformed`);
    }
    mountControlKeys.add(control.key);
    for (const [optionIndex, option] of control.options.entries()) {
      assertExactObjectKeys(
        `${label}.mount.root.controls[${index}].options[${optionIndex}]`,
        option,
        ["disabled", "selected", "value"],
      );
      if (
        typeof option.disabled !== "boolean" ||
        typeof option.selected !== "boolean" ||
        typeof option.value !== "string"
      ) {
        throw new Error(`${label} mount root control option is malformed`);
      }
    }
  }
  if (mount.rawIncluded) {
    assertExactObjectKeys(`${label}.mount.durability`, mount.durability, [
      "hardFailures", "pending", "rawPayloadSha256", "rawRevision", "terminal",
      "terminalDigest",
    ]);
    if (
      !Array.isArray(mount.durability.hardFailures) ||
      mount.durability.hardFailures.length !== 0 ||
      !Array.isArray(mount.durability.pending) ||
      mount.durability.pending.length !== 0 ||
      !sha256Pattern.test(mount.durability.rawPayloadSha256 ?? "") ||
      !Number.isSafeInteger(mount.durability.rawRevision) ||
      mount.durability.rawRevision <= 0 ||
      mount.durability.terminal !== true ||
      mount.durability.terminalDigest !== mount.browserDigest
    ) {
      throw new Error(`${label} mount terminal envelope is malformed`);
    }
  } else if (mount.durability !== null) {
    throw new Error(`${label} mount terminal envelope contains excluded raw durability`);
  }
  if (!isDeepStrictEqual(final.mount, mount)) {
    throw new Error(`${label} final mount does not equal the outer mount receipt`);
  }

  const firstKeys = [
    "adapterId",
    "browserDigest",
    "browserEventCount",
    "browserSessionPostCount",
    "controlEvents",
    "durability",
    "expectedControl",
    "ordinal",
    "rawIncluded",
    "requestBody",
    "requestBytes",
    "requestHeaders",
    "requestId",
    "requestOrigin",
    "requestPathname",
    "requestUrl",
    "response",
    "storage",
  ];
  const secondKeys = [
    "browserDigest",
    "browserEventCount",
    "browserSessionPostCount",
    "controlEvents",
    "controlObserverStop",
    "expectedControl",
    "ordinal",
    "storage",
  ];
  assertExactObjectKeys(`${label}.durabilityReceipts.final.first`, final.first, firstKeys);
  assertExactObjectKeys(`${label}.durabilityReceipts.final.second`, final.second, secondKeys);

  const validateExpectedControl = (value, expectedLabel) => {
    assertExactObjectKeys(expectedLabel, value, ["controlKey", "eventTypes"]);
    if (
      !isNonEmptyString(value.controlKey) ||
      !Array.isArray(value.eventTypes) ||
      !sameArray(value.eventTypes, ["pointerup", "click"])
    ) {
      throw new Error(`${expectedLabel} is not an exact button-click control`);
    }
  };
  const validateEvents = (value, expectedControl, firstSequence, eventsLabel) => {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new Error(`${eventsLabel} must contain exactly two control events`);
    }
    for (const [index, event] of value.entries()) {
      assertExactObjectKeys(`${eventsLabel}[${index}]`, event, [
        "controlKey",
        "key",
        "sequence",
        "type",
      ]);
      if (
        event.controlKey !== expectedControl.controlKey ||
        event.key !== null ||
        event.sequence !== firstSequence + index ||
        event.type !== expectedControl.eventTypes[index]
      ) {
        throw new Error(`${eventsLabel} control event sequence/value drifted`);
      }
    }
  };
  const first = final.first;
  const second = final.second;
  validateBrowserStorageReceipt(mount.initialStorage, `${label}.mount.initialStorage`, {
    initial: true,
    userId: evidence.userId,
  });
  validateBrowserStorageReceipt(mount.storage, `${label}.mount.storage`, {
    userId: evidence.userId,
  });
  validateBrowserStorageReceipt(first.storage, `${label}.first.storage`, {
    userId: evidence.userId,
  });
  validateBrowserStorageReceipt(second.storage, `${label}.second.storage`, {
    userId: evidence.userId,
  });
  validateBrowserStorageReceipt(final.storage, `${label}.final.storage`, {
    userId: evidence.userId,
  });
  if (
    !sha256Pattern.test(first.browserDigest ?? "") ||
    !sha256Pattern.test(second.browserDigest ?? "")
  ) {
    throw new Error(`${label} interaction browser digest is not a lowercase SHA-256 receipt`);
  }
  if (first.browserEventCount !== 2 || second.browserEventCount !== 4) {
    throw new Error(`${label} browser event count drifted from exact two-click ledger`);
  }
  assertExactObjectKeys(`${label}.durabilityReceipts.final.controlEvents`, final.controlEvents, [
    "first",
    "second",
  ]);
  assertExactObjectKeys(`${label}.durabilityReceipts.final.expectedControl`, final.expectedControl, [
    "first",
    "second",
  ]);
  assertExactObjectKeys(`${label}.durabilityReceipts.final.identity`, final.identity, [
    "appOrigin",
    "grade",
    "lessonPathname",
    "lessonSlug",
    "moduleId",
    "selectedTopicId",
    "siblingTopicIds",
    "source",
    "userId",
  ]);
  assertExactObjectKeys(`${label}.durabilityReceipts.final.first.requestBody`, first.requestBody, [
    "moduleId",
    "source",
    "topicId",
  ]);
  assertExactObjectKeys(`${label}.durabilityReceipts.final.first.response`, first.response, [
    "body",
    "bytes",
    "bytesSha256",
    "status",
  ]);
  validateExpectedControl(first.expectedControl, `${label}.first.expectedControl`);
  validateExpectedControl(second.expectedControl, `${label}.second.expectedControl`);
  validateEvents(first.controlEvents, first.expectedControl, 1, `${label}.first.controlEvents`);
  validateEvents(second.controlEvents, second.expectedControl, 3, `${label}.second.controlEvents`);
  if (
    mount.root.controls.length < 2 ||
    first.expectedControl.controlKey === second.expectedControl.controlKey ||
    !mountControlKeys.has(first.expectedControl.controlKey) ||
    !mountControlKeys.has(second.expectedControl.controlKey)
  ) {
    throw new Error(`${label} mounted controls do not contain both exact interaction keys`);
  }
  if (
    first.ordinal !== 1 ||
    second.ordinal !== 2 ||
    first.browserSessionPostCount !== 1 ||
    second.browserSessionPostCount !== 1 ||
    final.browserSessionPostCount !== 1 ||
    !isDeepStrictEqual(final.expectedControl, {
      first: first.expectedControl,
      second: second.expectedControl,
    }) ||
    !isDeepStrictEqual(final.controlEvents, {
      first: first.controlEvents,
      second: second.controlEvents,
    })
  ) {
    throw new Error(`${label} final control ledger is not bound to first and second`);
  }

  const stop = final.controlObserverStop;
  assertExactObjectKeys(`${label}.controlObserverStop`, stop, [
    "active",
    "adapterId",
    "eventCount",
    "events",
    "eventsSha256",
    "lastSequence",
    "removalCount",
    "removedEventTypes",
    "removedExactlyOnce",
    "removedListenerCount",
    "stopId",
  ]);
  const completeEvents = [...first.controlEvents, ...second.controlEvents];
  const computedEventsSha256 = createHash("sha256")
    .update(canonicalJson(completeEvents))
    .digest("hex");
  if (
    stop.active !== false ||
    !/^viz-durability-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      stop.adapterId ?? "",
    ) ||
    stop.eventCount !== 4 ||
    !isDeepStrictEqual(stop.events, completeEvents) ||
    stop.eventsSha256 !== computedEventsSha256 ||
    stop.lastSequence !== 4 ||
    stop.removalCount !== 1 ||
    !sameArray(arrayOf(stop.removedEventTypes), ["change", "click", "input", "keyup", "pointerup"]) ||
    stop.removedExactlyOnce !== true ||
    stop.removedListenerCount !== 5 ||
    stop.stopId !== `${stop.adapterId}:control-observer-stop:1` ||
    first.adapterId !== stop.adapterId ||
    !isDeepStrictEqual(second.controlObserverStop, stop)
  ) {
      throw new Error(`${label} control ledger stop receipt or adapter identity is not exact`);
  }

  let acknowledgement;
  if (group.id === "G03" || group.id === "G05") {
    assertExactObjectKeys(`${label}.durabilityReceipts.probe`, durability.probe, [
      "controlObserverStop",
      "first",
      "second",
      "sessionAcknowledgement",
      ...(group.id === "G03" ? ["firstAction", "secondAction"] : []),
    ]);
    if (
      !isDeepStrictEqual(durability.probe.first, first) ||
      !isDeepStrictEqual(durability.probe.second, second) ||
      !isDeepStrictEqual(durability.probe.controlObserverStop, stop)
    ) {
      throw new Error(`${label} probe family does not equal final control receipts`);
    }
    if (group.id === "G03") {
      validateG03DurabilityProbeActions(
        durability.probe,
        first,
        second,
        String(evidence.chunkId ?? "").split(":chunk-")[0],
        `${label}.durabilityReceipts.probe`,
      );
    }
    acknowledgement = durability.probe.sessionAcknowledgement;
  } else {
    assertExactObjectKeys(`${label}.durabilityReceipts.controlEvidence`, durability.controlEvidence, [
      "final",
      "first",
      "second",
    ]);
    const expectedControlEvidence = {
      final: {
        controlEvents: final.controlEvents,
        controlObserverStop: stop,
        expectedControl: final.expectedControl,
      },
      first: {
        controlEvents: first.controlEvents,
        expectedControl: first.expectedControl,
      },
      second: {
        controlEvents: second.controlEvents,
        controlObserverStop: stop,
        expectedControl: second.expectedControl,
      },
    };
    if (!isDeepStrictEqual(durability.controlEvidence, expectedControlEvidence)) {
      throw new Error(`${label} controlEvidence family drifted from final receipts`);
    }
    acknowledgement = durability.firstSessionAcknowledgement;
  }

  assertExactObjectKeys(`${label}.firstSessionAcknowledgement`, acknowledgement, [
    "acknowledgedUserId",
    "durablyPersisted",
    "session",
  ]);
  assertExactObjectKeys(`${label}.firstSessionAcknowledgement.session`, acknowledgement.session, [
    "completedAt",
    "explored",
    "moduleId",
    "source",
    "topicId",
    "updatedAt",
  ]);
  const session = acknowledgement.session;
  const expectedAnalyticsSource = analyticsSourceByGroup[group.id];
  if (
    !isNonEmptyString(expectedAnalyticsSource) ||
    group.analyticsSource !== expectedAnalyticsSource ||
    session.source !== expectedAnalyticsSource
  ) {
    throw new Error(`${label} analytics source drifted from the group contract`);
  }
  const chunkTopicId = String(evidence.chunkId ?? "").split(":chunk-")[0];
  const topicIds = [...new Set(group.chunks.map(({ chunkId }) =>
    String(chunkId).split(":chunk-")[0]
  ))];
  const gradeMatch = chunkTopicId.match(/-(?:primary-p([1-6])|junior-s([1-6]))-/u);
  const expectedGrade = gradeMatch?.[1]
    ? `P${gradeMatch[1]}`
    : gradeMatch?.[2]
      ? `S${gradeMatch[2]}`
      : null;
  const expectedLessonSlug = chunkTopicId === "quadratic-patterns"
    ? "quadratic-functions"
    : chunkTopicId;
  const expectedSiblingTopicIds = topicIds.filter((topicId) => topicId !== chunkTopicId);
  if (
    expectedGrade === null ||
    final.identity.grade !== expectedGrade ||
    !sameArray(arrayOf(final.identity.siblingTopicIds), expectedSiblingTopicIds) ||
    new Set(arrayOf(final.identity.siblingTopicIds)).size !== expectedSiblingTopicIds.length ||
    final.identity.lessonSlug !== expectedLessonSlug
  ) {
    throw new Error(`${label} lesson identity grade/sibling/slug contract drifted`);
  }
  if (session.topicId !== chunkTopicId) {
    throw new Error(`${label} first-session ACK chunk topic identity drifted`);
  }
  if (
    first.expectedControl.controlKey === second.expectedControl.controlKey ||
    second.expectedControl.controlKey !== chunkTopicId
  ) {
    throw new Error(`${label} first and reset control identities are not exact or distinct`);
  }
  let parsedAppOrigin;
  try {
    parsedAppOrigin = new URL(final.identity.appOrigin);
  } catch {
    throw new Error(`${label} final identity has no canonical app origin`);
  }
  if (
    parsedAppOrigin.origin !== final.identity.appOrigin ||
    !["http:", "https:"].includes(parsedAppOrigin.protocol) ||
    !["127.0.0.1", "localhost"].includes(parsedAppOrigin.hostname) ||
    parsedAppOrigin.username !== "" ||
    parsedAppOrigin.password !== "" ||
    parsedAppOrigin.pathname !== "/" ||
    parsedAppOrigin.search !== "" ||
    parsedAppOrigin.hash !== ""
  ) {
    throw new Error(`${label} final identity has no canonical app origin`);
  }
  assertExactObjectKeys(`${label}.navigation`, final.navigation, [
    "historyDrifts", "location", "mainFrameNavigations",
  ]);
  assertExactObjectKeys(`${label}.navigation.location`, final.navigation.location, [
    "hash", "href", "origin", "pathname", "search",
  ]);
  if (!Array.isArray(final.navigation.historyDrifts)) {
    throw new Error(`${label} final navigation history drift ledger is malformed`);
  }
  if (!Array.isArray(final.navigation.mainFrameNavigations)) {
    throw new Error(`${label} final navigation main-frame ledger is malformed`);
  }
  for (const [index, navigation] of final.navigation.mainFrameNavigations.entries()) {
    assertExactObjectKeys(`${label}.navigation.mainFrameNavigations[${index}]`, navigation, [
      "sequence", "url",
    ]);
  }
  const expectedLessonUrl = `${final.identity.appOrigin}${final.identity.lessonPathname}`;
  if (
    final.navigation.historyDrifts.length !== 0 ||
    !isDeepStrictEqual(final.navigation.location, {
      hash: "",
      href: expectedLessonUrl,
      origin: final.identity.appOrigin,
      pathname: final.identity.lessonPathname,
      search: "",
    }) ||
    !isDeepStrictEqual(final.navigation.mainFrameNavigations, [{
      sequence: 1,
      url: expectedLessonUrl,
    }])
  ) {
    throw new Error(`${label} final navigation is not the exact canonical lesson transition`);
  }
  assertExactObjectKeys(`${label}.topology`, final.topology, [
    "applicationEvents", "arm", "current", "events", "listenerCleanup",
  ]);
  for (const name of ["arm", "current"]) {
    assertExactObjectKeys(`${label}.topology.${name}`, final.topology[name], [
      "frameCount", "mainFrameUrl", "pageCount", "pageUrl",
    ]);
  }
  assertExactObjectKeys(`${label}.topology.listenerCleanup`, final.topology.listenerCleanup, [
    "applicationTopologyObserverRemoved",
    "contextPageListenerRemoved",
    "pageListenerEvents",
    "removedExactlyOnce",
    "storageEventListenerRemoved",
    "totalRemoved",
  ]);
  const expectedPageListenerEvents = [
    "frameattached", "framedetached", "framenavigated", "popup",
    "request", "requestfailed", "requestfinished", "response",
  ];
  if (
    !Array.isArray(final.topology.applicationEvents) ||
    final.topology.applicationEvents.length !== 0 ||
    !Array.isArray(final.topology.events) ||
    final.topology.events.length !== 0 ||
    !isDeepStrictEqual(final.topology.arm, {
      frameCount: 1,
      mainFrameUrl: "about:blank",
      pageCount: 1,
      pageUrl: "about:blank",
    }) ||
    !isDeepStrictEqual(final.topology.current, {
      frameCount: 1,
      mainFrameUrl: expectedLessonUrl,
      pageCount: 1,
      pageUrl: expectedLessonUrl,
    }) ||
    !isDeepStrictEqual(final.topology.listenerCleanup, {
      applicationTopologyObserverRemoved: true,
      contextPageListenerRemoved: true,
      pageListenerEvents: expectedPageListenerEvents,
      removedExactlyOnce: true,
      storageEventListenerRemoved: true,
      totalRemoved: 9,
    })
  ) {
    throw new Error(`${label} final topology and listener cleanup are not exact`);
  }
  assertExactObjectKeys(`${label}.manifest`, final.manifest, [
    "pathManifestPath", "paths", "runId", "schemaVersion",
  ]);
  assertExactObjectKeys(`${label}.manifest.paths`, final.manifest.paths, focusedManifestPathLabels);
  for (const [pathLabel, value] of Object.entries(final.manifest.paths)) {
    assertStarshipPath(`${label}.manifest.paths.${pathLabel}`, value);
  }
  const canonicalTestOutputDir = assertStarshipPath(
    `${label}.testOutputDir`,
    final.testOutputDir,
  );
  if (
    final.manifest.schemaVersion !== 1 ||
    !isNonEmptyString(final.manifest.runId) ||
    final.manifest.pathManifestPath !== final.manifest.paths.pathManifestPath ||
    dirname(canonicalTestOutputDir) !== final.manifest.paths.outputDir
  ) {
    throw new Error(`${label} final manifest or direct-child testOutputDir is not exact`);
  }
  validateBrowserStorageEvents(final.storageEvents, `${label}.storageEvents`, {
    appOrigin: final.identity.appOrigin,
    userId: evidence.userId,
  });
  if (!isRecord(first.requestHeaders)) {
    throw new Error(`${label} first request headers are malformed`);
  }
  for (const requiredHeader of ["content-type", "x-mais-visualization-user-id"]) {
    if (
      Object.keys(first.requestHeaders).some((key) =>
        key !== requiredHeader && key.toLowerCase() === requiredHeader
      )
    ) {
      throw new Error(`${label} first request has an ambiguous required request header`);
    }
  }
  const requestIdentityKeys = [
    "finished",
    "hash",
    "id",
    "method",
    "origin",
    "pathname",
    "requestBodySha256",
    "responseSha256",
    "search",
    "status",
    "url",
  ];
  if (!Array.isArray(final.requests)) throw new Error(`${label} request ledger is malformed`);
  const requestIds = new Set();
  for (const [index, request] of final.requests.entries()) {
    try {
      assertExactObjectKeys(`${label}.requests[${index}]`, request, requestIdentityKeys);
    } catch {
      throw new Error(`${label} request ledger contains a malformed identity`);
    }
    let requestUrl;
    try {
      requestUrl = new URL(request.url);
    } catch {
      throw new Error(`${label} request ledger has an invalid local URL`);
    }
    const safeRequest = ["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (
      request.id !== index + 1 ||
      requestIds.has(request.id) ||
      request.finished !== true ||
      request.origin !== final.identity.appOrigin ||
      requestUrl.origin !== request.origin ||
      requestUrl.pathname !== request.pathname ||
      requestUrl.search !== request.search ||
      requestUrl.hash !== request.hash ||
      requestUrl.href !== request.url ||
      !request.pathname.startsWith("/api/") ||
      !Number.isSafeInteger(request.status) ||
      (safeRequest
        ? request.status < 100 || request.status > 599
        : request.status !== 200) ||
      !sha256Pattern.test(request.responseSha256 ?? "") ||
      (safeRequest ? request.requestBodySha256 !== null :
        !sha256Pattern.test(request.requestBodySha256 ?? ""))
    ) {
      throw new Error(`${label} request ledger has a duplicate or invalid id`);
    }
    requestIds.add(request.id);
  }
  const expectedRequestBodySha256 = createHash("sha256")
    .update(first.requestBytes)
    .digest("hex");
  const matchingRequests = final.requests.filter((request) => request.id === first.requestId);
  if (
    matchingRequests.length !== 1 ||
    !isDeepStrictEqual(matchingRequests[0], {
      finished: true,
      hash: "",
      id: first.requestId,
      method: "POST",
      origin: first.requestOrigin,
      pathname: "/api/visualization-sessions",
      requestBodySha256: expectedRequestBodySha256,
      responseSha256: first.response.bytesSha256,
      search: "",
      status: 200,
      url: first.requestUrl,
    })
  ) {
    throw new Error(`${label} request ledger does not uniquely bind the first session POST`);
  }
  const mutationKeys = [
    "authorizedPhase",
    ...requestIdentityKeys,
    "requestBody",
    "requestBytes",
    "responseBytes",
  ];
  if (!Array.isArray(final.mutations)) throw new Error(`${label} mutation ledger is malformed`);
  const firstMutations = [];
  for (const [index, mutation] of final.mutations.entries()) {
    try {
      assertExactObjectKeys(`${label}.mutations[${index}]`, mutation, mutationKeys);
    } catch {
      throw new Error(`${label} mutation ledger contains a malformed receipt`);
    }
    if (!requestIds.has(mutation.id) || !["mount", "first-control"].includes(mutation.authorizedPhase)) {
      throw new Error(`${label} mutation ledger is not bound to a request identity`);
    }
    const request = final.requests.find((candidate) => candidate.id === mutation.id);
    const { authorizedPhase: _authorizedPhase, requestBody, requestBytes, responseBytes, ...identity } = mutation;
    if (
      !isDeepStrictEqual(request, identity) ||
      requestBytes !== JSON.stringify(requestBody) ||
      mutation.requestBodySha256 !== createHash("sha256").update(requestBytes).digest("hex") ||
      mutation.responseSha256 !== createHash("sha256").update(responseBytes).digest("hex")
    ) {
      throw new Error(`${label} mutation ledger is not byte-bound to its request identity`);
    }
    if (mutation.authorizedPhase === "first-control") firstMutations.push(mutation);
  }
  if (
    firstMutations.length !== 1 ||
    !isDeepStrictEqual(firstMutations[0], {
      ...matchingRequests[0],
      authorizedPhase: "first-control",
      requestBody: first.requestBody,
      requestBytes: first.requestBytes,
      responseBytes: first.response.bytes,
    })
  ) {
    throw new Error(`${label} mutation ledger does not uniquely bind first-control bytes`);
  }
  const mountMutations = final.mutations.filter(({ authorizedPhase }) =>
    authorizedPhase === "mount"
  );
  const nonSafeRequests = final.requests.filter((request) =>
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  );
  const mutationProjection = final.mutations.map(({
    authorizedPhase: _authorizedPhase,
    requestBody: _requestBody,
    requestBytes: _requestBytes,
    responseBytes: _responseBytes,
    ...identity
  }) => identity);
  if (!isDeepStrictEqual(nonSafeRequests, mutationProjection)) {
    throw new Error(`${label} non-safe request ledger is not the exact mutation projection`);
  }
  const mountMutationRequestIndexes = mountMutations.map((mutation) =>
    final.requests.findIndex((request) => request.id === mutation.id)
  );
  const firstMutationRequestIndex = final.requests.findIndex((request) =>
    request.id === firstMutations[0]?.id
  );
  if (
    final.mutations.length !== 4 ||
    mountMutations.length !== 3 ||
    !sameArray(final.mutations.map(({ authorizedPhase }) => authorizedPhase), [
      "mount", "mount", "mount", "first-control",
    ]) ||
    mountMutationRequestIndexes.some((index) => index < 0 || index >= mount.networkRequestCount) ||
    firstMutationRequestIndex < mount.networkRequestCount
  ) {
    throw new Error(`${label} terminal mount mutation ledger is not exact or ordered`);
  }
  const [lessonProgressMutation, handshakeMutation, pageViewMutation] = mountMutations;
  const parseMutationResponse = (mutation, mutationLabel) => {
    let body;
    try {
      body = JSON.parse(mutation.responseBytes);
    } catch {
      throw new Error(`${mutationLabel} response bytes are not JSON`);
    }
    return body;
  };
  assertExactObjectKeys(`${label}.lessonProgress.requestBody`, lessonProgressMutation.requestBody, [
    "action", "slug",
  ]);
  const lessonProgressResponse = parseMutationResponse(
    lessonProgressMutation,
    `${label}.lessonProgress`,
  );
  assertExactObjectKeys(`${label}.lessonProgress.responseBody`, lessonProgressResponse, ["lesson"]);
  if (
    lessonProgressMutation.method !== "POST" ||
    lessonProgressMutation.pathname !== "/api/lesson-progress" ||
    lessonProgressMutation.requestBody.action !== "start" ||
    lessonProgressMutation.requestBody.slug !== final.identity.lessonSlug ||
    lessonProgressMutation.status !== 200 ||
    !isRecord(lessonProgressResponse.lesson) ||
    lessonProgressResponse.lesson.slug !== final.identity.lessonSlug ||
    lessonProgressResponse.lesson.topicId !== final.identity.selectedTopicId ||
    lessonProgressResponse.lesson.status !== "in-progress"
  ) {
    throw new Error(`${label} terminal mount mutation ledger lesson-start is invalid`);
  }
  assertExactObjectKeys(`${label}.handshake.requestBody`, handshakeMutation.requestBody, [
    "events", "generation",
  ]);
  const handshakeResponse = parseMutationResponse(handshakeMutation, `${label}.handshake`);
  assertExactObjectKeys(`${label}.handshake.responseBody`, handshakeResponse, [
    "accepted", "acknowledgedEventIds", "acknowledgedUserId", "dispositions",
    "durablyPersisted", "generation",
  ]);
  if (
    handshakeMutation.method !== "POST" ||
    handshakeMutation.pathname !== "/api/learning-events" ||
    !Number.isSafeInteger(handshakeMutation.requestBody.generation) ||
    handshakeMutation.requestBody.generation < 0 ||
    !Array.isArray(handshakeMutation.requestBody.events) ||
    handshakeMutation.requestBody.events.length !== 0 ||
    handshakeMutation.status !== 200 ||
    handshakeResponse.accepted !== 0 ||
    !Array.isArray(handshakeResponse.acknowledgedEventIds) ||
    handshakeResponse.acknowledgedEventIds.length !== 0 ||
    handshakeResponse.acknowledgedUserId !== evidence.userId ||
    !Array.isArray(handshakeResponse.dispositions) ||
    handshakeResponse.dispositions.length !== 0 ||
    handshakeResponse.durablyPersisted !== true ||
    handshakeResponse.generation !== handshakeMutation.requestBody.generation
  ) {
    throw new Error(`${label} terminal mount mutation ledger analytics handshake is invalid`);
  }
  assertExactObjectKeys(`${label}.pageView.requestBody`, pageViewMutation.requestBody, [
    "events", "generation",
  ]);
  const pageViewEvents = pageViewMutation.requestBody.events;
  const pageViewEvent = Array.isArray(pageViewEvents) ? pageViewEvents[0] : null;
  assertExactObjectKeys(`${label}.pageView.event`, pageViewEvent, [
    "grade", "id", "source", "timestamp", "topicId", "type",
  ]);
  const pageViewResponse = parseMutationResponse(pageViewMutation, `${label}.pageView`);
  assertExactObjectKeys(`${label}.pageView.responseBody`, pageViewResponse, [
    "accepted", "acknowledgedEventIds", "acknowledgedUserId", "dispositions",
    "durablyPersisted", "generation",
  ]);
  const disposition = Array.isArray(pageViewResponse.dispositions)
    ? pageViewResponse.dispositions[0]
    : null;
  assertExactObjectKeys(`${label}.pageView.disposition`, disposition, ["disposition", "id"]);
  if (
    pageViewMutation.method !== "POST" ||
    pageViewMutation.pathname !== "/api/learning-events" ||
    !Number.isSafeInteger(pageViewMutation.requestBody.generation) ||
    pageViewMutation.requestBody.generation < 0 ||
    !Array.isArray(pageViewEvents) ||
    pageViewEvents.length !== 1 ||
    !isNonEmptyString(pageViewEvent.id) ||
    pageViewEvent.type !== "page-view" ||
    pageViewEvent.source !== "lesson" ||
    !isIsoTimestamp(pageViewEvent.timestamp) ||
    pageViewEvent.grade !== final.identity.grade ||
    pageViewEvent.topicId !== `student-lessons-${final.identity.lessonSlug}` ||
    pageViewMutation.status !== 200 ||
    pageViewResponse.accepted !== 1 ||
    !sameArray(arrayOf(pageViewResponse.acknowledgedEventIds), [pageViewEvent.id]) ||
    pageViewResponse.acknowledgedUserId !== evidence.userId ||
    !Array.isArray(pageViewResponse.dispositions) ||
    pageViewResponse.dispositions.length !== 1 ||
    disposition.id !== pageViewEvent.id ||
    disposition.disposition !== "inserted" ||
    pageViewResponse.durablyPersisted !== true ||
    pageViewResponse.generation !== pageViewMutation.requestBody.generation
  ) {
    throw new Error(`${label} terminal mount mutation ledger page-view is invalid`);
  }
  const pageViewIdPrefix = `${pageViewEvent.timestamp}-`;
  if (
    !pageViewEvent.id.startsWith(pageViewIdPrefix) ||
    !/^[a-z0-9]{0,8}$/u.test(pageViewEvent.id.slice(pageViewIdPrefix.length))
  ) {
    throw new Error(`${label} page-view event identity is not timestamp-derived`);
  }
  if (pageViewMutation.requestBody.generation !== handshakeMutation.requestBody.generation) {
    throw new Error(`${label} analytics handshake and page-view generations differ`);
  }
  assertExactObjectKeys(`${label}.mount.acknowledgements`, mount.acknowledgements, [
    "lessonPageView", "lessonProgressStart",
  ]);
  const acknowledgementForMutation = ({ authorizedPhase: _phase, ...receipt }) => receipt;
  for (const [ackName, mutation] of [
    ["lessonProgressStart", lessonProgressMutation],
    ["lessonPageView", pageViewMutation],
  ]) {
    const acknowledgementReceipt = mount.acknowledgements[ackName];
    assertExactObjectKeys(`${label}.mount.acknowledgements.${ackName}`, acknowledgementReceipt, [
      ...requestIdentityKeys, "requestBody", "requestBytes", "responseBytes",
    ]);
    if (!isDeepStrictEqual(acknowledgementReceipt, acknowledgementForMutation(mutation))) {
      throw new Error(`${label} terminal mount mutation ledger acknowledgement drifted`);
    }
  }

  assertExactObjectKeys(`${label}.final.seal`, final.seal, [
    "compositeSha256", "digests", "epoch", "linearization", "networkSha256",
    "postSealViolations", "sealId", "state", "terminalEpoch",
  ]);
  assertExactObjectKeys(`${label}.final.seal.digests`, final.seal.digests, [
    "locationSha256", "observerSha256", "storageSha256",
  ]);
  const observerSnapshot = {
    controlObserverActive: false,
    controlObserverFrozenEventCount: 4,
    controlObserverLedgerFrozen: true,
    controlObserverRemovalCount: 1,
    controlObserverStopReceipt: stop,
    events: completeEvents,
    initialStorage: mount.initialStorage.entries.map(({ key, raw }) => ({ key, raw })),
    listenerErrors: [],
    location: final.navigation.location,
    navigationDrifts: final.navigation.historyDrifts,
    storageError: null,
    storageEvents: final.storageEvents,
    topologyEvents: final.topology.applicationEvents,
    version: 1,
  };
  const recomputedSealDigests = {
    locationSha256: createHash("sha256")
      .update(canonicalJson(final.navigation.location))
      .digest("hex"),
    observerSha256: createHash("sha256")
      .update(canonicalJson(observerSnapshot))
      .digest("hex"),
    storageSha256: createHash("sha256")
      .update(canonicalJson(final.storage.entries.map(({ key, raw }) => ({ key, raw }))))
      .digest("hex"),
  };
  if (!isDeepStrictEqual(final.seal.digests, recomputedSealDigests)) {
    throw new Error(`${label} final seal digests do not match recomputed location/storage/observer leaves`);
  }
  const recomputedNetworkSha256 = createHash("sha256")
    .update(canonicalJson(final.requests))
    .digest("hex");
  const recomputedCompositeSha256 = createHash("sha256")
    .update(canonicalJson({
      browserEpoch: final.seal.epoch,
      digests: final.seal.digests,
      networkSha256: final.seal.networkSha256,
      sealId: final.seal.sealId,
      terminalEpoch: final.seal.terminalEpoch,
    }))
    .digest("hex");
  if (
    !Object.values(final.seal.digests).every((digest) => sha256Pattern.test(digest ?? "")) ||
    !Number.isSafeInteger(final.seal.epoch) ||
    final.seal.epoch <= 0 ||
    !Number.isSafeInteger(final.seal.terminalEpoch) ||
    final.seal.terminalEpoch <= 0 ||
    !Array.isArray(final.seal.postSealViolations) ||
    final.seal.postSealViolations.length !== 0 ||
    final.seal.state !== "sealed" ||
    final.seal.linearization !==
      "browser-task-sealed-after-immutable-snapshot-digests-and-confirmed-after-125ms" ||
    !new RegExp(`^${stop.adapterId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}:[1-9]\\d*$`, "u")
      .test(final.seal.sealId ?? "") ||
    final.seal.networkSha256 !== recomputedNetworkSha256 ||
    final.seal.compositeSha256 !== recomputedCompositeSha256
  ) {
    throw new Error(`${label} final network seal is malformed or not recomputed`);
  }
  const apiRequestKeys = [
    "completedAt",
    "method",
    "origin",
    "pathname",
    "requestBodySha256",
    "requestBytes",
    "responseBytes",
    "responseSha256",
    "responseUrl",
    "startedAt",
    "statusCode",
    "url",
  ];
  if (!Array.isArray(final.apiRequests)) throw new Error(`${label} API request ledger is malformed`);
  for (const [index, request] of final.apiRequests.entries()) {
    try {
      assertExactObjectKeys(`${label}.apiRequests[${index}]`, request, apiRequestKeys);
    } catch {
      throw new Error(`${label} API request ledger contains a malformed receipt`);
    }
    let requestUrl;
    let responseUrl;
    try {
      requestUrl = new URL(request.url);
      responseUrl = new URL(request.responseUrl);
    } catch {
      throw new Error(`${label} API request ledger has no local exact target`);
    }
    const exactPathMethod =
      (request.pathname === "/api/me/learner-profile" && request.method === "PATCH") ||
      (request.pathname === "/api/visualization-sessions" &&
        ["GET", "POST"].includes(request.method));
    if (
      !isIsoTimestamp(request.startedAt) ||
      !isIsoTimestamp(request.completedAt) ||
      Date.parse(request.completedAt) < Date.parse(request.startedAt) ||
      !exactPathMethod ||
      !Number.isSafeInteger(request.statusCode) ||
      request.statusCode !== 200 ||
      request.origin !== final.identity.appOrigin ||
      request.url !== `${final.identity.appOrigin}${request.pathname}` ||
      request.responseUrl !== request.url ||
      requestUrl.origin !== final.identity.appOrigin ||
      requestUrl.pathname !== request.pathname ||
      requestUrl.search !== "" ||
      requestUrl.hash !== "" ||
      responseUrl.href !== requestUrl.href ||
      request.responseSha256 !== createHash("sha256").update(request.responseBytes).digest("hex") ||
      (request.requestBytes === null) !== (request.requestBodySha256 === null) ||
      (request.requestBytes !== null && request.requestBodySha256 !==
        createHash("sha256").update(request.requestBytes).digest("hex"))
    ) {
      throw new Error(`${label} API request ledger has invalid status, hashes, or local exact target`);
    }
    if (
      index > 0 &&
      Date.parse(request.startedAt) < Date.parse(final.apiRequests[index - 1].completedAt)
    ) {
      throw new Error(`${label} API request ledger is not serial in receipt order`);
    }
    if (
      Number.isFinite(resultInterval?.startMillis) &&
      Number.isFinite(resultInterval?.endMillis) &&
      (Date.parse(request.startedAt) < resultInterval.startMillis ||
        Date.parse(request.completedAt) > resultInterval.endMillis)
    ) {
      throw new Error(`${label} API request receipt is outside Playwright result interval`);
    }
  }
  assertExactObjectKeys(`${label}.learnerProfileSetup`, final.learnerProfileSetup, [
    "appOrigin",
    "completedAt",
    "method",
    "pathname",
    "request",
    "requestBodySha256",
    "responseBytes",
    "responseSha256",
    "shouldShowOnboarding",
    "skippedAt",
    "startedAt",
    "status",
    "statusCode",
    "userId",
  ]);
  const profile = final.learnerProfileSetup;
  const expectedProfileRequestBody = {
    answers: { challenge: "balanced", goal: "repair", help: "hint" },
    status: "skipped",
  };
  let profileResponseBody;
  try {
    profileResponseBody = JSON.parse(profile.responseBytes);
  } catch {
    throw new Error(`${label} learner profile setup response is not JSON`);
  }
  assertExactObjectKeys(`${label}.learnerProfileSetup.response`, profileResponseBody, [
    "learnerProfile", "shouldShowOnboarding",
  ]);
  assertExactObjectKeys(
    `${label}.learnerProfileSetup.response.learnerProfile`,
    profileResponseBody.learnerProfile,
    [
      "answers", "initializedFrom", "questionnaireVersion", "skippedAt", "status",
      "updatedAt", "userId",
    ],
  );
  assertExactObjectKeys(
    `${label}.learnerProfileSetup.response.learnerProfile.answers`,
    profileResponseBody.learnerProfile.answers,
    ["challenge", "goal", "help"],
  );
  const profileBody = profileResponseBody.learnerProfile;
  if (
    final.apiRequests.length === 0 ||
    !isDeepStrictEqual(final.apiRequests[0], profile.request) ||
    profile.appOrigin !== final.identity.appOrigin ||
    profile.method !== "PATCH" ||
    profile.pathname !== "/api/me/learner-profile" ||
    profile.requestBodySha256 !== profile.request.requestBodySha256 ||
    profile.responseBytes !== profile.request.responseBytes ||
    profile.responseSha256 !== profile.request.responseSha256 ||
    profile.completedAt !== profile.request.completedAt ||
    profile.startedAt !== profile.request.startedAt ||
    profile.shouldShowOnboarding !== false ||
    profile.status !== "skipped" ||
    profile.statusCode !== 200 ||
    profile.userId !== evidence.userId ||
    profile.request.requestBytes !== JSON.stringify(expectedProfileRequestBody) ||
    profile.request.requestBodySha256 !== createHash("sha256")
      .update(profile.request.requestBytes).digest("hex") ||
    profileResponseBody.shouldShowOnboarding !== false ||
    profileBody.userId !== evidence.userId ||
    profileBody.status !== "skipped" ||
    profileBody.questionnaireVersion !== "learner-start-v1" ||
    profileBody.initializedFrom !== "login-onboarding" ||
    !isDeepStrictEqual(profileBody.answers, expectedProfileRequestBody.answers) ||
    !isIsoTimestamp(profileBody.skippedAt) ||
    profileBody.updatedAt !== profileBody.skippedAt ||
    profile.skippedAt !== profileBody.skippedAt ||
    Date.parse(profile.completedAt) - Date.parse(profile.startedAt) > 30_000 ||
    Date.parse(profileBody.skippedAt) < Date.parse(profile.startedAt) ||
    Date.parse(profileBody.skippedAt) > Date.parse(profile.completedAt) ||
    !isIsoTimestamp(profile.skippedAt) ||
    Date.parse(profile.skippedAt) < Date.parse(profile.startedAt) ||
    Date.parse(profile.skippedAt) > Date.parse(profile.completedAt)
  ) {
    throw new Error(`${label} API request ledger does not bind learner profile setup`);
  }
  if (
    Number.isFinite(resultInterval?.startMillis) &&
    Number.isFinite(resultInterval?.endMillis) &&
    [profile.startedAt, profile.completedAt, profile.skippedAt, profileBody.skippedAt]
      .some((timestamp) =>
        Date.parse(timestamp) < resultInterval.startMillis ||
        Date.parse(timestamp) > resultInterval.endMillis
      )
  ) {
    throw new Error(`${label} learner profile receipt is outside Playwright result interval`);
  }
  const replayPosts = final.apiRequests.filter((request) =>
    request.method === "POST" && request.pathname === "/api/visualization-sessions"
  );
  if (
    (final.replay === null && replayPosts.length !== 0) ||
    (final.replay !== null &&
      (replayPosts.length !== 1 || !isDeepStrictEqual(replayPosts[0], final.replay.request)))
  ) {
    throw new Error(`${label} API request ledger does not bind replay semantics`);
  }
  const parseSessionEnvelope = (request, requestLabel) => {
    let body;
    try {
      body = JSON.parse(request.responseBytes);
    } catch {
      throw new Error(`${requestLabel} response is not exact JSON`);
    }
    assertExactObjectKeys(`${requestLabel}.response`, body, ["sessions"]);
    if (!Array.isArray(body.sessions)) {
      throw new Error(`${requestLabel} response sessions are malformed`);
    }
    return body.sessions;
  };
  const rawCoverage = final.replay !== null;
  const apiTail = final.apiRequests.slice(1);
  const sessionReads = rawCoverage ? apiTail.slice(0, -2) : apiTail;
  const replayPost = rawCoverage ? apiTail.at(-2) : null;
  const replayRead = rawCoverage ? apiTail.at(-1) : null;
  if (
    sessionReads.length < 2 ||
    sessionReads.some((request) =>
      request.method !== "GET" ||
      request.pathname !== "/api/visualization-sessions" ||
      request.requestBytes !== null ||
      request.requestBodySha256 !== null
    ) ||
    (rawCoverage && (
      replayPost?.method !== "POST" ||
      replayPost.pathname !== "/api/visualization-sessions" ||
      replayRead?.method !== "GET" ||
      replayRead.pathname !== "/api/visualization-sessions"
    ))
  ) {
    throw new Error(`${label} API request ledger phase order is not exact`);
  }
  for (const [index, mountRead] of sessionReads.slice(0, -1).entries()) {
    if (parseSessionEnvelope(mountRead, `${label}.apiRequests.mount[${index}]`).length !== 0) {
      throw new Error(`${label} API request ledger mount phase exposed a session`);
    }
  }
  const firstControlRead = sessionReads.at(-1);
  const firstControlSessions = parseSessionEnvelope(
    firstControlRead,
    `${label}.apiRequests.firstControl`,
  );
  if (
    firstControlSessions.length !== 1 ||
    !isDeepStrictEqual(firstControlSessions[0], session)
  ) {
    throw new Error(`${label} API request ledger first-control reread is not exact`);
  }
  const lastMountRead = sessionReads.at(-2);
  const phaseChronology = [
    profile.startedAt,
    profile.skippedAt,
    profile.completedAt,
    pageViewEvent.timestamp,
    lastMountRead.startedAt,
    lastMountRead.completedAt,
    session.updatedAt,
    firstControlRead.startedAt,
    firstControlRead.completedAt,
  ].map((timestamp) => Date.parse(timestamp));
  if (phaseChronology.some((timestamp, index) =>
    !Number.isFinite(timestamp) ||
    (index > 0 && timestamp < phaseChronology[index - 1])
  )) {
    throw new Error(`${label} browser phase chronology is not exact`);
  }

  if (rawCoverage) {
    const replayChronology = [
      firstControlRead.completedAt,
      replayPost.startedAt,
      replayPost.completedAt,
      replayRead.startedAt,
      replayRead.completedAt,
    ].map((timestamp) => Date.parse(timestamp));
    if (replayChronology.some((timestamp, index) =>
      !Number.isFinite(timestamp) ||
      (index > 0 && timestamp < replayChronology[index - 1])
    )) {
      throw new Error(`${label} browser phase chronology is not exact`);
    }
    assertExactObjectKeys(`${label}.final.first.durability`, first.durability, [
      "apiResponseBytes", "apiResponseSha256", "appStatePayloadSha256",
      "appStateRevision", "appStateUpdatedAt", "gamificationEventsSha256",
      "gamificationRewardPoints", "gamificationXp", "learningEventsSha256",
      "moduleId", "requestBodySha256", "responseBytes", "responseSha256",
      "rewardAmount", "rewardsSha256", "rewardSourceKey", "selectedTopicId",
      "sessionSha256", "source", "userId", "visualizationEventsSha256",
      "visualizationSliceSha256",
    ]);
    const firstRaw = first.durability;
    const emptyArraySha256 = createHash("sha256").update(canonicalJson([])).digest("hex");
    const rewardSourceKey = `visualization-complete:v2:${createHash("sha256")
      .update(JSON.stringify([evidence.userId, session.moduleId, session.topicId]))
      .digest("hex")}`;
    const rewardsSha256 = createHash("sha256").update(canonicalJson([{
      amount: 20,
      createdAt: session.updatedAt,
      reason: "visualization-complete",
      sourceKey: rewardSourceKey,
      studentId: evidence.userId,
    }])).digest("hex");
    const rawHashFields = [
      "apiResponseSha256", "appStatePayloadSha256", "gamificationEventsSha256",
      "learningEventsSha256", "requestBodySha256", "responseSha256",
      "rewardsSha256", "sessionSha256", "visualizationEventsSha256",
      "visualizationSliceSha256",
    ];
    if (
      rawHashFields.some((field) => !sha256Pattern.test(firstRaw[field] ?? "")) ||
      firstRaw.apiResponseBytes !== firstControlRead.responseBytes ||
      firstRaw.apiResponseSha256 !== firstControlRead.responseSha256 ||
      !Number.isSafeInteger(firstRaw.appStateRevision) ||
      firstRaw.appStateRevision !== mount.durability.rawRevision + 1 ||
      firstRaw.appStatePayloadSha256 === mount.durability.rawPayloadSha256 ||
      !isIsoTimestamp(firstRaw.appStateUpdatedAt) ||
      firstRaw.gamificationRewardPoints !== 20 ||
      firstRaw.gamificationXp !== 45 ||
      firstRaw.learningEventsSha256 !== emptyArraySha256 ||
      firstRaw.moduleId !== session.moduleId ||
      firstRaw.requestBodySha256 !== createHash("sha256")
        .update(canonicalJson(first.requestBody)).digest("hex") ||
      firstRaw.responseBytes !== first.response.bytes ||
      firstRaw.responseSha256 !== first.response.bytesSha256 ||
      firstRaw.rewardAmount !== 20 ||
      firstRaw.rewardsSha256 !== rewardsSha256 ||
      firstRaw.rewardSourceKey !== rewardSourceKey ||
      firstRaw.selectedTopicId !== session.topicId ||
      firstRaw.sessionSha256 !== createHash("sha256")
        .update(canonicalJson(session)).digest("hex") ||
      firstRaw.source !== session.source ||
      firstRaw.userId !== evidence.userId ||
      firstRaw.visualizationEventsSha256 !== emptyArraySha256
    ) {
      throw new Error(`${label} raw first interaction durability is not exact`);
    }
    assertExactObjectKeys(`${label}.final.replay`, final.replay, [
      "directReplayCount", "duplicate", "request", "responseBytes", "responseSha256",
    ]);
    assertExactObjectKeys(`${label}.final.replay.duplicate`, final.replay.duplicate, [
      "appStateRevision", "idempotent", "responseSha256", "selectedTopicId",
      "visualizationSliceSha256",
    ]);
    if (
      final.replay.directReplayCount !== 1 ||
      !isDeepStrictEqual(final.replay.request, replayPost) ||
      replayPost.requestBytes !== first.requestBytes ||
      replayPost.requestBodySha256 !== expectedRequestBodySha256 ||
      final.replay.responseBytes !== first.response.bytes ||
      final.replay.responseSha256 !== first.response.bytesSha256 ||
      replayPost.responseBytes !== final.replay.responseBytes ||
      replayPost.responseSha256 !== final.replay.responseSha256 ||
      final.replay.duplicate.appStateRevision !== firstRaw.appStateRevision ||
      final.replay.duplicate.idempotent !== true ||
      final.replay.duplicate.responseSha256 !== firstRaw.responseSha256 ||
      final.replay.duplicate.selectedTopicId !== firstRaw.selectedTopicId ||
      final.replay.duplicate.visualizationSliceSha256 !== firstRaw.visualizationSliceSha256 ||
      replayRead.responseBytes !== firstControlRead.responseBytes ||
      replayRead.responseSha256 !== firstControlRead.responseSha256 ||
      !isDeepStrictEqual(
        parseSessionEnvelope(replayRead, `${label}.apiRequests.replayRead`),
        firstControlSessions,
      )
    ) {
      throw new Error(`${label} replay receipt or API request ledger phase is not exact`);
    }
  } else if (
    first.durability !== null ||
    final.replay !== null ||
    final.directReplayCount !== 0 ||
    final.coverage !== "browser"
  ) {
    throw new Error(`${label} raw replay exclusion is not exact`);
  }
  if (
    acknowledgement.acknowledgedUserId !== evidence.userId ||
    acknowledgement.durablyPersisted !== true ||
    session.moduleId !== "configured-visualization-lab" ||
    session.explored !== true ||
    session.completedAt !== session.updatedAt ||
    !isIsoTimestamp(session.completedAt) ||
    final.identity?.userId !== evidence.userId ||
    final.identity?.moduleId !== session.moduleId ||
    final.identity?.selectedTopicId !== session.topicId ||
    final.identity?.source !== session.source ||
    !isNonEmptyString(group.analyticsSource) ||
    session.source !== group.analyticsSource ||
    final.projectName !== evidence.project ||
    final.title !== evidence.testTitle ||
    final.identity.lessonSlug !== expectedLessonSlug ||
    final.identity.lessonPathname !==
      `/student/lessons/${encodeURIComponent(final.identity.lessonSlug)}` ||
    mount.root.activeLabId !== chunkTopicId ||
    mount.root.topicId !== chunkTopicId ||
    mount.root.moduleId !== session.moduleId ||
    mount.root.sessionOwner !== "first-control-interaction" ||
    mount.root.count !== 1 ||
    mount.root.matchesRootSelector !== true ||
    mount.root.visible !== true ||
    !Array.isArray(mount.root.controls) ||
    mount.root.controls.length === 0 ||
    first.requestPathname !== "/api/visualization-sessions" ||
    first.adapterId !== stop.adapterId ||
    first.requestBytes !== JSON.stringify(first.requestBody) ||
    first.requestOrigin !== final.identity.appOrigin ||
    first.requestUrl !== `${final.identity.appOrigin}/api/visualization-sessions` ||
    first.requestBody?.moduleId !== session.moduleId ||
    first.requestBody?.topicId !== session.topicId ||
    first.requestBody?.source !== session.source ||
    first.requestHeaders?.["content-type"] !== "application/json" ||
    decodeURIComponent(first.requestHeaders?.["x-mais-visualization-user-id"] ?? "") !== evidence.userId ||
    first.response?.status !== 200 ||
    !isDeepStrictEqual(first.response?.body, acknowledgement) ||
    first.response?.bytes !== JSON.stringify(first.response?.body) ||
    first.response?.bytesSha256 !== createHash("sha256").update(first.response.bytes).digest("hex")
  ) {
    throw new Error(`${label} first-session acknowledgement/request identity drifted`);
  }
}

const producerAttachmentKeysByGroup = Object.freeze({
  G03: Object.freeze([
    "canonicalExecutionCount", "chunkId", "collisionScannerSha256",
    "contrastScannerSha256", "controlDomainVersion", "durabilityReceipts",
    "expectedChunkIds", "expectedStateCountPerProject",
    "expectedStateDescriptorPlanSha256", "expectedStatePlanSha256",
    "geometryVersion", "integrationSourceSha256",
    "observedStateDescriptorPlanSha256", "observedStatePlanSha256",
    "plannedStateDescriptors", "plannedStateIds", "producerSourceSha256",
    "project", "receipts", "schemaVersion", "sourceAggregates",
    "starshipPaths", "stateDescriptorSerializer", "testTitle", "theme",
    "userId", "viewport",
  ]),
  G04: Object.freeze([
    "canonicalCliReceipt", "canonicalExecutionCount", "chunkId",
    "collisionScannerSha256", "contrastScannerSha256", "durabilityReceipts",
    "expectedChunkIds", "expectedStateCountPerProject",
    "expectedStateDescriptorPlanSha256", "expectedStatePlanSha256",
    "expectedTopicModeControlTable", "expectedTopicModeControlTableSha256",
    "integrationSourceSha256", "observedStateDescriptorPlanSha256",
    "observedStatePlanSha256", "observedTopicModeControlTableSha256",
    "pathReceipt", "plannedStateDescriptors", "plannedStateIds",
    "producerSourceSha256", "project", "receipts", "schemaVersion",
    "sessionWrites", "sourcePlannerCanaries", "testTitle", "theme", "userId",
    "viewport",
  ]),
  G05: Object.freeze([
    "canonicalExecutionCount", "canonicalRunner", "chunkId",
    "collisionScannerSha256", "contrastScannerSha256", "controlDomain",
    "durabilityReceipts", "expectedChunkIds", "expectedStateCountPerProject",
    "expectedStateDescriptorPlanSha256", "expectedStatePlanSha256",
    "expectedTopicModeControlTable", "expectedTopicModeControlTableSha256",
    "integrationSourceSha256", "observedMutationWrites",
    "observedStateDescriptorPlanSha256", "observedStatePlanSha256",
    "observedTopicModeControlTableSha256", "plannedStateDescriptors",
    "plannedStateIds", "producerSourceSha256", "project", "receipts",
    "schemaVersion", "sourceAggregates", "starshipPaths", "testTitle", "theme",
    "userId", "viewport",
  ]),
  G06: Object.freeze([
    "canonicalExecutionCount", "chunkId", "chunkStateCounts",
    "collisionScannerSha256", "contrastScannerSha256", "durabilityReceipts",
    "expectedChunkIds", "expectedStateCountPerProject",
    "expectedStateDescriptorPlanSha256", "expectedStatePlanSha256",
    "integrationSourceSha256", "observedStateDescriptorPlanSha256",
    "observedStatePlanSha256", "pathReceipt", "plannedStateDescriptors",
    "plannedStateIds", "producerSourceSha256", "project", "receipts",
    "schemaVersion", "sessionWrites", "sourceAggregates", "sourceHardRejects",
    "stateDescriptorSerializer", "testTitle", "theme", "userId", "viewport",
  ]),
});

function validateProducerAttachmentEnvelope(group, evidence, label) {
  const expectedKeys = producerAttachmentKeysByGroup[group.id];
  if (!expectedKeys) return;
  assertExactObjectKeys(`${group.id} attachment`, evidence, expectedKeys);
  if (
    evidence.schemaVersion !== group.schemaVersion ||
    evidence.expectedStateDescriptorPlanSha256 !== group.stateDescriptorPlanSha256 ||
    evidence.observedStateDescriptorPlanSha256 !== group.stateDescriptorPlanSha256 ||
    !/^[0-9a-f]{64}$/u.test(evidence.producerSourceSha256 ?? "")
  ) {
    throw new Error(`${label} producer attachment identity drifted`);
  }
}

function assertExactManifestPath(label, value, expected) {
  const canonicalValue = assertStarshipPath(label, value);
  const canonicalExpected = assertStarshipPath(`${label} manifest value`, expected);
  if (canonicalValue !== canonicalExpected) {
    throw new Error(`${label} drifted from the current run manifest`);
  }
  return canonicalValue;
}

function assertDirectPathReceiptValues(receipt, manifest, { outputDirIsChild = false } = {}) {
  const aliases = new Map([
    ["browserProfileEvidencePath", "browserProfileEvidencePath"],
    ["browserProcessEvidencePath", "browserProcessEvidencePath"],
    ["browserTempDir", "browserTempDir"],
    ["crashDumpDir", "crashDumpDir"],
    ["databasePath", "databasePath"],
    ["e2eRunRoot", "e2eRunRoot"],
    ["nextDistDir", "nextDistDir"],
    ["nextTsconfigPath", "nextTsconfigPath"],
    ["nodeCompileCache", "nodeCompileCacheDir"],
    ["nodeCompileCacheDir", "nodeCompileCacheDir"],
    ["npmCache", "npmCacheDir"],
    ["npmCacheDir", "npmCacheDir"],
    ["output", "outputDir"],
    ["outputRoot", "outputDir"],
    ["pathManifestPath", "pathManifestPath"],
    ["reportDir", "reportDir"],
    ["serverCommandOwnerPidPath", "serverCommandOwnerPidPath"],
    ["serverLogPath", "serverLogPath"],
    ["temp", "browserTempDir"],
    ["tmp", "browserTempDir"],
    ["tmpdir", "browserTempDir"],
    ["worktree", "repositoryRoot"],
  ]);
  for (const [key, value] of Object.entries(receipt)) {
    if (key === "outputDir") {
      if (outputDirIsChild) {
        assertChildStarshipPath("path receipt outputDir", value, manifest.paths.outputDir);
      } else {
        assertExactManifestPath("path receipt outputDir", value, manifest.paths.outputDir);
      }
      continue;
    }
    const manifestKey = aliases.get(key);
    if (!manifestKey) throw new Error(`path receipt contains unmapped key ${key}`);
    assertExactManifestPath(
      `path receipt ${key}`,
      value,
      manifest.paths[manifestKey],
    );
  }
}

function assertCurrentRunPathReceipt(execution, manifest) {
  const receipt = execution.pathEvidence;
  if (!isRecord(receipt)) {
    throw new Error(`${execution.group.id}/${execution.project} path receipt is missing`);
  }
  const groupId = execution.group.id;
  if (groupId === "G03") {
    const keys = [
      "browserProfileEvidencePath",
      "browserProcessEvidencePath",
      "browserTempDir",
      "crashDumpDir",
      "databasePath",
      "e2eRunRoot",
      "nextDistDir",
      "nodeCompileCache",
      "npmCache",
      "outputDir",
      "pathManifestPath",
      "reportDir",
      "serverLogPath",
      "temp",
      "tmp",
      "tmpdir",
      "worktree",
    ];
    assertExactObjectKeys("G03 path receipt", receipt, keys);
    assertDirectPathReceiptValues(receipt, manifest, { outputDirIsChild: true });
    return;
  }
  if (groupId === "G05") {
    const keys = [
      "browserProfileEvidencePath",
      "browserProcessEvidencePath",
      "browserTempDir",
      "crashDumpDir",
      "databasePath",
      "e2eRunRoot",
      "nextDistDir",
      "nextTsconfigPath",
      "nodeCompileCache",
      "npmCache",
      "outputDir",
      "outputRoot",
      "pathManifestPath",
      "reportDir",
      "serverCommandOwnerPidPath",
      "serverLogPath",
      "temp",
      "tmp",
      "tmpdir",
      "worktree",
    ];
    assertExactObjectKeys("G05 path receipt", receipt, keys);
    assertDirectPathReceiptValues(receipt, manifest, { outputDirIsChild: true });
    return;
  }
  if (groupId === "G04") {
    assertExactObjectKeys(
      "G04 path receipt",
      receipt,
      ["manifestPath", "paths", "process", "temporaryPaths"],
    );
    if (receipt.manifestPath !== manifest.paths.pathManifestPath) {
      throw new Error("G04 path receipt manifestPath drifted from the current run manifest");
    }
    const requiredPathKeys = [
      "browserProfileEvidencePath",
      "browserProcessEvidencePath",
      "browserTempDir",
      "crashDumpDir",
      "databasePath",
      "e2eRunRoot",
      "nextDistDir",
      "nextTsconfigPath",
      "nodeCompileCacheDir",
      "npmCacheDir",
      "outputDir",
      "pathManifestPath",
      "reportDir",
      "serverCommandOwnerPidPath",
      "serverLogPath",
    ];
    assertExactObjectKeys("G04 path receipt paths", receipt.paths, requiredPathKeys);
    assertDirectPathReceiptValues(receipt.paths, manifest);
    assertExactObjectKeys("G04 path receipt process", receipt.process, ["cwd", "pid", "ppid"]);
    if (
      receipt.process.cwd !== manifest.process.cwd ||
      receipt.process.pid !== manifest.process.pid ||
      receipt.process.ppid !== manifest.process.ppid
    ) {
      throw new Error("G04 path receipt process identity drifted from the manifest");
    }
    assertExactObjectKeys(
      "G04 path receipt temporaryPaths",
      receipt.temporaryPaths,
      ["TEMP", "TMP", "TMPDIR"],
    );
    for (const [key, value] of Object.entries(receipt.temporaryPaths)) {
      assertExactManifestPath(
        `G04 path receipt ${key}`,
        value,
        manifest.paths.browserTempDir,
      );
    }
    return;
  }
  if (groupId === "G06") {
    assertExactObjectKeys("G06 path receipt", receipt, ["manifestPath", "pathNames"]);
    if (receipt.manifestPath !== manifest.paths.pathManifestPath) {
      throw new Error("G06 path receipt manifestPath drifted from the current run manifest");
    }
    const expectedPathNames = [
      "HK_MATH_DB_PATH",
      "NODE_COMPILE_CACHE",
      "PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH",
      "PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH",
      "PLAYWRIGHT_BROWSER_TEMP_DIR",
      "PLAYWRIGHT_CRASH_DUMP_DIR",
      "PLAYWRIGHT_E2E_ROOT",
      "PLAYWRIGHT_NEXT_DIST_DIR",
      "PLAYWRIGHT_OUTPUT_DIR",
      "PLAYWRIGHT_PATH_MANIFEST_PATH",
      "PLAYWRIGHT_REPORT_DIR",
      "PLAYWRIGHT_SERVER_LOG_PATH",
      "TEMP",
      "TMP",
      "TMPDIR",
      "npm_config_cache",
    ];
    if (!Array.isArray(receipt.pathNames) || !sameArray(receipt.pathNames, expectedPathNames)) {
      throw new Error("G06 path-name receipt does not match the canonical runner mapping");
    }
    return;
  }

  if (receipt.pathManifestPath !== manifest.paths.pathManifestPath) {
    throw new Error("path receipt pathManifestPath drifted from the current run manifest");
  }
  assertDirectPathReceiptValues(receipt, manifest, { outputDirIsChild: true });
}

function formatErrors(errors) {
  return [
    `Mainland focused visualization report rejected with ${errors.length} finding(s):`,
    ...errors.map((error, index) => `${index + 1}. ${error}`),
  ].join("\n");
}

export async function validateMainlandFocusedVisualizationReport(
  report,
  reportPath,
  contract = MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT,
  dependencies = {},
) {
  const injectedDependencyKeys = [
    "lstatArtifact",
    "openArtifact",
    "readArtifact",
    "realpathArtifact",
  ].filter((key) => Object.hasOwn(dependencies, key));
  const testIoInjected = injectedDependencyKeys.length === 4;
  if (injectedDependencyKeys.length !== 0 && !testIoInjected) {
    throw new Error(
      "artifact IO dependencies must be injected all-or-none for an explicitly untrusted test seam",
    );
  }
  const {
    lstatArtifact = (artifactPath, options) => lstat(artifactPath, options),
    openArtifact = open,
    readArtifact = readFile,
    realpathArtifact = realpath,
  } = dependencies;
  const errors = [];
  const reject = (message) => errors.push(message);
  let canonicalReportPath = resolve(reportPath);
  try {
    canonicalReportPath = assertStarshipPath("focused Playwright JSON report", canonicalReportPath);
  } catch (error) {
    reject(`report path must resolve under /Volumes/Starship: ${String(error)}`);
  }

  const expectedProjects = [...contract.projects];
  const expectedExecutionCount = contract.groups.reduce(
    (total, group) => total + group.chunks.length * expectedProjects.length,
    0,
  );
  const groupsByFile = new Map(contract.groups.map((group) => [group.file, group]));
  const executions = [];
  const pathManifestPaths = new Set();
  const expectedLogicalSpecs = new Map(
    contract.groups.flatMap((group) =>
      group.chunks.map((chunk) => [
        `${group.file}\u0000${expectedTitle(group, chunk)}`,
        expectedProjects.length,
      ]),
    ),
  );

  if (
    expectedProjects.length === 0 ||
    expectedProjects.some((project) => !isNonEmptyString(project)) ||
    duplicates(expectedProjects).length > 0
  ) {
    reject("report contract projects must be unique non-empty strings");
  }
  if (!Array.isArray(contract.groups) || contract.groups.length === 0) {
    reject("report contract groups must be a non-empty array");
  }

  if (!Array.isArray(report?.errors) || report.errors.length !== 0) {
    reject("report top-level errors must be an exact empty array");
  }
  if (!isRecord(report?.stats)) {
    reject("report stats are missing or malformed");
  } else {
    for (const [label, expected] of [
      ["expected", expectedExecutionCount],
      ["skipped", 0],
      ["unexpected", 0],
      ["flaky", 0],
    ]) {
      if (report.stats[label] !== expected) {
        reject(`report stats.${label} must equal ${expected}; actual=${String(report.stats[label])}`);
      }
    }
    if (!isIsoTimestamp(report.stats.startTime)) {
      reject(`report stats.startTime must be an exact ISO timestamp; actual=${String(report.stats.startTime)}`);
    }
    if (!isNonNegativeFiniteNumber(report.stats.duration)) {
      reject(`report stats.duration must be finite and nonnegative; actual=${String(report.stats.duration)}`);
    }
  }
  if (!isRecord(report?.config)) {
    reject("report config is missing or malformed");
  } else {
    if (report.config.workers !== 1) {
      reject(`report config.workers must equal 1; actual=${String(report.config.workers)}`);
    }
    for (const [label, expected] of [
      ["forbidOnly", false],
      ["fullyParallel", false],
      ["globalTeardown", null],
      ["grepInvert", null],
      ["maxFailures", 0],
      ["shard", null],
      ["version", playwrightVersion],
    ]) {
      if (report.config[label] !== expected) {
        reject(`report config.${label} must equal ${JSON.stringify(expected)}; actual=${JSON.stringify(report.config[label])}`);
      }
    }
    if (!isRecord(report.config.grep) || Object.keys(report.config.grep).length !== 0) {
      reject("report config.grep must be the unfiltered empty Playwright pattern receipt");
    }
    if (JSON.stringify(report.config.reporter) !== JSON.stringify([["list"], ["json"]])) {
      reject("report config.reporter must be the exact list+json pair");
    }
    for (const label of ["configFile", "globalSetup", "rootDir"]) {
      try {
        assertStarshipPath(`report config.${label}`, report.config[label]);
      } catch (error) {
        reject(`report config.${label} escaped Starship: ${String(error)}`);
      }
    }
    const configuredProjects = exactArray(
      report.config.projects,
      "report config.projects",
      reject,
    );
    const configuredProjectNames = configuredProjects.map((project) =>
      isRecord(project) && isNonEmptyString(project.name) ? project.name : "",
    );
    if (!sameArray(configuredProjectNames, expectedProjects)) {
      reject(`report config project set/order mismatch: ${JSON.stringify(configuredProjectNames)}`);
    }
    for (const project of configuredProjects) {
      if (!isRecord(project)) {
        reject("report config contains a malformed project");
        continue;
      }
      const projectName = isNonEmptyString(project.name) ? project.name : "<missing>";
      if (!isNonEmptyString(project.name) || project.id !== project.name) {
        reject(`report config project id/name mismatch for ${projectName}`);
      }
      if (project.retries !== 0 || project.repeatEach !== 1) {
        reject(`report config project ${projectName} must use retries=0 and repeatEach=1`);
      }
      if (!Number.isSafeInteger(project.timeout) || project.timeout <= 0) {
        reject(`report config project ${projectName} timeout must be a positive integer`);
      }
      for (const label of ["outputDir", "testDir"]) {
        const value = project[label];
        try {
          assertStarshipPath(`report config project ${projectName} ${label}`, value);
        } catch (error) {
          reject(`report config project ${projectName} ${label} escaped Starship: ${String(error)}`);
        }
      }
    }
  }

  const reportSpecs = flattenReportSpecs(report, reject);
  if (reportSpecs.length !== expectedExecutionCount) {
    reject(`report must contain exactly ${expectedExecutionCount} physical spec nodes; actual=${reportSpecs.length}`);
  }
  const specIds = reportSpecs
    .filter((spec) => isNonEmptyString(spec.id))
    .map((spec) => spec.id);
  if (specIds.length !== expectedExecutionCount || duplicates(specIds).length > 0) {
    reject(`report physical spec ids must be ${expectedExecutionCount} unique non-empty identities`);
  }
  const observedLogicalSpecs = new Map();
  const observedLogicalProjects = new Map();
  const reportStartMillis = isRecord(report?.stats) && isIsoTimestamp(report.stats.startTime)
    ? Date.parse(report.stats.startTime)
    : Number.NaN;
  const reportEndMillis = Number.isFinite(reportStartMillis) &&
      isRecord(report?.stats) && isNonNegativeFiniteNumber(report.stats.duration)
    ? reportStartMillis + report.stats.duration
    : Number.NaN;

  for (const spec of reportSpecs) {
    const group = groupsByFile.get(spec.file);
    if (!group) {
      reject(`unexpected spec file ${spec.file || "<missing>"}`);
      continue;
    }
    if (spec.ok !== true) {
      reject(`${group.id} ${String(spec.title)} spec.ok must be true`);
    }
    if (!isNonEmptyString(spec.id)) {
      reject(`${group.id} ${String(spec.title)} spec id must be a non-empty string`);
    }
    if (!isNonEmptyString(spec.title)) {
      reject(`${group.id} spec title must be a non-empty string`);
    }
    const logicalKey = `${spec.file}\u0000${String(spec.title ?? "")}`;
    if (!expectedLogicalSpecs.has(logicalKey)) {
      reject(`${group.id} unexpected spec title ${String(spec.title)}`);
    } else {
      observedLogicalSpecs.set(logicalKey, (observedLogicalSpecs.get(logicalKey) ?? 0) + 1);
    }
    exactArray(spec.tags, `${group.id} ${String(spec.title)} spec tags`, reject);
    if (!Array.isArray(spec.tests)) {
      reject(`${group.id} ${String(spec.title)} has a malformed test collection`);
    }
    const specTests = arrayOf(spec.tests);
    if (specTests.length !== 1) {
      reject(`${group.id} ${String(spec.title)} physical spec node must contain exactly one project test`);
    }
    for (const [testIndex, testCase] of specTests.entries()) {
      if (!isRecord(testCase)) {
        reject(`${group.id} ${String(spec.title)} has malformed test at index ${testIndex}`);
        continue;
      }
      const project = isNonEmptyString(testCase.projectName)
        ? testCase.projectName
        : "";
      if (!project || testCase.projectId !== project) {
        reject(`${group.id} ${String(spec.title)} test projectId/projectName mismatch`);
      }
      if (!expectedProjects.includes(project)) {
        reject(`${group.id} ${String(spec.title)} ran in unexpected project ${project || "<missing>"}`);
      }
      if (expectedLogicalSpecs.has(logicalKey)) {
        const logicalProjects = observedLogicalProjects.get(logicalKey) ?? [];
        logicalProjects.push(project);
        observedLogicalProjects.set(logicalKey, logicalProjects);
      }
      if (testCase.expectedStatus !== "passed" || testCase.status !== "expected") {
        reject(`${group.id} ${String(spec.title)} was not an expected pass`);
      }
      const testAnnotations = exactArray(
        testCase.annotations,
        `${group.id} ${String(spec.title)} test annotations`,
        reject,
      );
      if (testAnnotations.length > 0) {
        reject(`${group.id} ${String(spec.title)} has test annotations`);
      }
      if (!Number.isSafeInteger(testCase.timeout) || testCase.timeout <= 0) {
        reject(`${group.id} ${String(spec.title)} test timeout must be a positive integer`);
      }
      if (!Array.isArray(testCase.results)) {
        reject(`${group.id} ${String(spec.title)} has a malformed result collection`);
      }
      const results = arrayOf(testCase.results);
      if (results.length !== 1) {
        reject(`${group.id} ${String(spec.title)} has ${results.length} results; exact one is required`);
      }
      for (const [resultIndex, result] of results.entries()) {
        if (!isRecord(result)) {
          reject(`${group.id} ${String(spec.title)} has malformed result at index ${resultIndex}`);
          continue;
        }
        if (result.status !== "passed" || result.retry !== 0) {
          reject(`${group.id} ${String(spec.title)} result=${String(result.status)} retry=${String(result.retry)}`);
        }
        const resultAnnotations = result.annotations === undefined
          ? []
          : exactArray(
              result.annotations,
              `${group.id} ${String(spec.title)} result annotations`,
              reject,
            );
        const resultErrors = exactArray(
          result.errors,
          `${group.id} ${String(spec.title)} result errors`,
          reject,
        );
        if (resultAnnotations.length > 0 || resultErrors.length > 0) {
          reject(`${group.id} ${String(spec.title)} has result annotations or errors`);
        }
        if (result.error !== undefined && result.error !== null) {
          reject(`${group.id} ${String(spec.title)} result.error must be absent on a pass`);
        }
        if (!isNonNegativeFiniteNumber(result.duration)) {
          reject(`${group.id} ${String(spec.title)} result duration must be finite and nonnegative`);
        }
        const resultStartMillis = isIsoTimestamp(result.startTime)
          ? Date.parse(result.startTime)
          : Number.NaN;
        const resultEndMillis = Number.isFinite(resultStartMillis) &&
          isNonNegativeFiniteNumber(result.duration)
          ? resultStartMillis + result.duration
          : Number.NaN;
        if (!isIsoTimestamp(result.startTime)) {
          reject(`${group.id} ${String(spec.title)} result startTime must be an exact ISO timestamp`);
        } else if (
          isNonNegativeFiniteNumber(result.duration) &&
          Number.isFinite(reportStartMillis) &&
          Number.isFinite(reportEndMillis)
        ) {
          if (resultStartMillis < reportStartMillis || resultEndMillis > reportEndMillis) {
            reject(`${group.id} ${String(spec.title)} result interval falls outside aggregate report stats timing`);
          }
        }
        if (Array.isArray(result.stdout) === false && result.stdout !== undefined) {
          reject(`${group.id} ${String(spec.title)} result stdout must be an array`);
        }
        if (Array.isArray(result.stderr) === false && result.stderr !== undefined) {
          reject(`${group.id} ${String(spec.title)} result stderr must be an array`);
        }
        if (!Array.isArray(result.attachments)) {
          reject(`${group.id} ${String(spec.title)} has a malformed attachment collection`);
        }
        const attachments = arrayOf(result.attachments);
        attachments.forEach((attachment, attachmentIndex) => {
          if (!isRecord(attachment)) {
            reject(
              `${group.id} ${String(spec.title)} has malformed attachment at index ${attachmentIndex}`,
            );
          }
        });
        if (attachments.length !== 1) {
          reject(`${group.id} ${String(spec.title)} must have exactly one attachment`);
        }
        const matchingAttachments = attachments.filter((attachment) =>
          isRecord(attachment) &&
          isNonEmptyString(attachment.name) &&
          !attachment.name.includes("/") &&
          !attachment.name.includes("\\") &&
          attachment.name.startsWith(group.attachmentPrefix) &&
          attachment.name.endsWith(".json")
        );
        if (matchingAttachments.length !== 1) {
          reject(`${group.id} ${String(spec.title)} has ${matchingAttachments.length} canonical JSON attachments`);
          continue;
        }
        try {
          const decodedAttachment = await decodeJsonAttachment(
            matchingAttachments[0],
            canonicalReportPath,
            readArtifact,
          );
          executions.push({
            attachmentPath: decodedAttachment.attachmentPath,
            evidence: decodedAttachment.evidence,
            group,
            pathEvidence:
              decodedAttachment.evidence?.starshipPaths ??
              decodedAttachment.evidence?.pathReceipt,
            project,
            resultEndMillis,
            resultStartMillis,
            title: isNonEmptyString(spec.title) ? spec.title : "",
          });
        } catch (error) {
          reject(`${group.id} ${String(spec.title)} attachment is unreadable: ${String(error)}`);
        }
      }
    }
  }

  if (observedLogicalSpecs.size !== expectedLogicalSpecs.size) {
    reject(`report logical spec count mismatch; expected=${expectedLogicalSpecs.size} actual=${observedLogicalSpecs.size}`);
  }
  for (const [logicalKey, expectedCount] of expectedLogicalSpecs) {
    const actualCount = observedLogicalSpecs.get(logicalKey) ?? 0;
    if (actualCount !== expectedCount) {
      reject(`logical spec ${JSON.stringify(logicalKey)} must have ${expectedCount} project nodes; actual=${actualCount}`);
    }
    const actualProjects = observedLogicalProjects.get(logicalKey) ?? [];
    if (!sameArray([...actualProjects].sort(), [...expectedProjects].sort())) {
      reject(`logical spec ${JSON.stringify(logicalKey)} project identities are incomplete or duplicated`);
    }
  }

  if (executions.length !== expectedExecutionCount) {
    reject(`expected ${expectedExecutionCount} canonical executions, found ${executions.length}`);
  }

  let totalStateReceipts = 0;
  for (const group of contract.groups) {
    const expectedChunkIds = group.chunks.map((chunk) => chunk.chunkId);
    const expectedTitles = new Map(group.chunks.map((chunk) => [chunk.chunkId, expectedTitle(group, chunk)]));
    const expectedCounts = new Map(group.chunks.map((chunk) => [chunk.chunkId, chunk.stateCount]));
    const projectStatePlans = new Map();
    const projectDescriptorPlans = new Map();

    if (group.canonicalExecutionCount !== group.chunks.length * expectedProjects.length) {
      reject(`${group.id} contract canonicalExecutionCount is internally inconsistent`);
    }
    if (group.chunks.reduce((sum, chunk) => sum + chunk.stateCount, 0) !== group.stateCountPerProject) {
      reject(`${group.id} contract stateCountPerProject is internally inconsistent`);
    }
    if (!/^[0-9a-f]{64}$/u.test(group.stateDescriptorPlanSha256 ?? "")) {
      reject(
        `${group.id} has no pinned semantic descriptor-plan SHA; producer-schema integration remains HOLD`,
      );
    }

    for (const project of expectedProjects) {
      const selected = executions.filter(
        (execution) => execution.group.file === group.file && execution.project === project,
      );
      const byChunk = new Map();
      for (const execution of selected) {
        const evidence = execution.evidence;
        if (!isRecord(evidence)) {
          reject(`${group.id}/${project}/${execution.title} attachment is not an object`);
          continue;
        }
        if (["G03", "G04", "G05", "G06"].includes(group.id)) {
          try {
            validateProducerAttachmentEnvelope(
              group,
              evidence,
              `${group.id}/${project}/${execution.title}`,
            );
            validateDurabilityReceiptEnvelope(
              group,
              evidence,
              `${group.id}/${project}/${execution.title}`,
              {
                endMillis: execution.resultEndMillis,
                startMillis: execution.resultStartMillis,
              },
            );
          } catch (error) {
            reject(String(error));
          }
        }
        const chunkId = isNonEmptyString(evidence.chunkId) ? evidence.chunkId : "";
        if (!chunkId) reject(`${group.id}/${project}/${execution.title} chunkId must be a non-empty string`);
        if (byChunk.has(chunkId)) reject(`${group.id}/${project} duplicated chunk ${chunkId || "<missing>"}`);
        byChunk.set(chunkId, execution);
        if (!expectedCounts.has(chunkId)) reject(`${group.id}/${project} unexpected chunk ${chunkId || "<missing>"}`);
        const plannedStateIds = exactArray(
          evidence.plannedStateIds,
          `${group.id}/${project}/${chunkId} plannedStateIds`,
          reject,
        ).map((stateId, index) => {
          if (!isNonEmptyString(stateId)) {
            reject(`${group.id}/${project}/${chunkId} plannedStateIds[${index}] must be a non-empty string`);
            return "";
          }
          return stateId;
        });
        const plannedStateDescriptors = exactArray(
          evidence.plannedStateDescriptors,
          `${group.id}/${project}/${chunkId} plannedStateDescriptors`,
          reject,
        );
        const receipts = exactArray(
          evidence.receipts,
          `${group.id}/${project}/${chunkId} receipts`,
          reject,
        );
        const receiptStateIds = receipts.map((receipt, receiptIndex) => {
          const label = `${group.id}/${project}/${chunkId} receipts[${receiptIndex}]`;
          if (!isRecord(receipt) || !isNonEmptyString(receipt.stateId)) {
            reject(`${label} stateId must be a non-empty string`);
            return "";
          }
          try {
            validatePositiveStateReceipt(group, receipt, label);
          } catch (error) {
            reject(`${label} is a hollow state receipt: ${String(error)}`);
          }
          return receipt.stateId;
        });
        const expectedCount = expectedCounts.get(chunkId);
        if (plannedStateIds.length !== expectedCount) {
          reject(`${group.id}/${project}/${chunkId} planned ${plannedStateIds.length} states; expected ${String(expectedCount)}`);
        }
        if (duplicates(plannedStateIds).length > 0) {
          reject(`${group.id}/${project}/${chunkId} contains duplicate planned state IDs`);
        }
        if (plannedStateDescriptors.length !== expectedCount) {
          reject(`${group.id}/${project}/${chunkId} planned ${plannedStateDescriptors.length} semantic descriptors; expected ${String(expectedCount)}`);
        }
        const descriptorStateIds = plannedStateDescriptors.map((descriptor, descriptorIndex) => {
          const descriptorLabel =
            `${group.id}/${project}/${chunkId} plannedStateDescriptors[${descriptorIndex}]`;
          try {
            return validatePlannedStateDescriptor(
              group,
              descriptor,
              receipts[descriptorIndex],
              descriptorLabel,
            );
          } catch (error) {
            reject(`${descriptorLabel} is invalid: ${String(error)}`);
            return isRecord(descriptor) && isNonEmptyString(descriptor.stateId)
              ? descriptor.stateId
              : "";
          }
        });
        if (duplicates(descriptorStateIds).length > 0) {
          reject(`${group.id}/${project}/${chunkId} contains duplicate descriptor state IDs`);
        }
        if (!sameArray(descriptorStateIds, plannedStateIds)) {
          reject(`${group.id}/${project}/${chunkId} descriptor state IDs do not exactly match the ordered plan`);
        }
        if (!sameArray(receiptStateIds, plannedStateIds)) {
          reject(`${group.id}/${project}/${chunkId} receipt state IDs do not exactly match the ordered plan`);
        }
        if (!isNonEmptyString(evidence.project) || evidence.project !== project) {
          reject(`${group.id}/${project}/${chunkId} attachment project string identity mismatch`);
        }
        if (!isNonEmptyString(evidence.testTitle) || evidence.testTitle !== execution.title) {
          reject(`${group.id}/${project}/${chunkId} attachment title string identity mismatch`);
        }
        if (execution.title !== expectedTitles.get(chunkId)) reject(`${group.id}/${project}/${chunkId} report title mismatch`);
        if (!isNonEmptyString(evidence.schemaVersion) || evidence.schemaVersion !== group.schemaVersion) {
          reject(`${group.id}/${project}/${chunkId} schema string identity mismatch`);
        }
        if (
          group.id === "G03" &&
          (
            evidence.controlDomainVersion !== "signed-real-number-line-control-domain-v1" ||
            evidence.geometryVersion !== "signed-real-number-line-geometry-v1"
          )
        ) {
          reject(`${group.id}/${project}/${chunkId} control-domain or geometry receipt version mismatch`);
        }
        if (
          group.id === "G05" &&
          (
            !isRecord(evidence.controlDomain) ||
            evidence.controlDomain.id !== "percent-applications-rate-v1" ||
            evidence.controlDomain.version !== 1
          )
        ) {
          reject(`${group.id}/${project}/${chunkId} control-domain receipt version mismatch`);
        }
        if (evidence.expectedStateCountPerProject !== group.stateCountPerProject) {
          reject(`${group.id}/${project}/${chunkId} declared project state count mismatch`);
        }
        const declaredChunkIds = exactArray(
          evidence.expectedChunkIds,
          `${group.id}/${project}/${chunkId} expectedChunkIds`,
          reject,
        );
        if (
          declaredChunkIds.some((candidate) => !isNonEmptyString(candidate)) ||
          !sameArray(declaredChunkIds, expectedChunkIds)
        ) {
          reject(`${group.id}/${project}/${chunkId} expected chunk ledger mismatch`);
        }
        if (evidence.expectedStatePlanSha256 !== group.statePlanSha256) {
          reject(`${group.id}/${project}/${chunkId} state-plan SHA mismatch`);
        }
        if (evidence.expectedStateDescriptorPlanSha256 !== group.stateDescriptorPlanSha256) {
          reject(`${group.id}/${project}/${chunkId} semantic descriptor-plan SHA mismatch`);
        }
        if (
          evidence.canonicalExecutionCount !== undefined &&
          evidence.canonicalExecutionCount !== group.canonicalExecutionCount
        ) {
          reject(`${group.id}/${project}/${chunkId} canonical execution count mismatch`);
        }
        if (evidence.starshipPaths !== undefined && evidence.pathReceipt !== undefined) {
          reject(`${group.id}/${project}/${chunkId} has ambiguous path receipt owners`);
        }
        const pathEvidence = evidence.starshipPaths ?? evidence.pathReceipt;
        if (!isRecord(pathEvidence)) {
          reject(`${group.id}/${project}/${chunkId} lacks Starship path evidence`);
        } else {
          const pathStrings = collectPathEvidenceStrings(pathEvidence);
          const absolutePathStrings = pathStrings.filter(
            ({ location }) => !location.includes(".pathNames["),
          );
          if (absolutePathStrings.length === 0) {
            reject(`${group.id}/${project}/${chunkId} path evidence is empty`);
          }
          for (const { location, value } of pathStrings) {
            if (location.includes(".pathNames[")) {
              if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value)) {
                reject(
                  `${group.id}/${project}/${chunkId} malformed path-name receipt at ${location}: ${value}`,
                );
              }
              continue;
            }
            try {
              assertStarshipPath(
                `${group.id}/${project}/${chunkId} ${location}`,
                value,
              );
            } catch (error) {
              reject(
                `${group.id}/${project}/${chunkId} relative path evidence or escaped Starship at ${location}: ${String(error)}`,
              );
            }
          }
          const manifestPath = pathManifestFromEvidence(pathEvidence);
          if (!manifestPath) {
            reject(`${group.id}/${project}/${chunkId} lacks a path-manifest pointer`);
          } else {
            try {
              pathManifestPaths.add(
                assertStarshipPath(
                  `${group.id}/${project}/${chunkId} path manifest`,
                  manifestPath,
                ),
              );
            } catch (error) {
              reject(
                `${group.id}/${project}/${chunkId} path manifest escaped Starship: ${String(error)}`,
              );
            }
          }
        }
      }

      const observedChunkIds = [...byChunk.keys()];
      if (!sameArray(observedChunkIds, expectedChunkIds)) {
        reject(`${group.id}/${project} chunk order/set mismatch`);
      }
      const orderedStateIds = expectedChunkIds.flatMap((chunkId) =>
        arrayOf(byChunk.get(chunkId)?.evidence?.plannedStateIds).map(String),
      );
      if (orderedStateIds.length !== group.stateCountPerProject) {
        reject(`${group.id}/${project} executed ${orderedStateIds.length} states; expected ${group.stateCountPerProject}`);
      }
      if (duplicates(orderedStateIds).length > 0) reject(`${group.id}/${project} contains duplicate state IDs`);
      const observedPlanSha = sha256Lines(orderedStateIds);
      if (observedPlanSha !== group.statePlanSha256) {
        reject(`${group.id}/${project} independently recomputed state-plan SHA mismatch: ${observedPlanSha}`);
      }
      projectStatePlans.set(project, orderedStateIds);
      const orderedStateDescriptors = expectedChunkIds.flatMap((chunkId) =>
        arrayOf(byChunk.get(chunkId)?.evidence?.plannedStateDescriptors),
      );
      if (orderedStateDescriptors.length !== group.stateCountPerProject) {
        reject(`${group.id}/${project} executed ${orderedStateDescriptors.length} semantic descriptors; expected ${group.stateCountPerProject}`);
      }
      const orderedDescriptorStateIds = orderedStateDescriptors.map((descriptor) =>
        isRecord(descriptor) ? String(descriptor.stateId ?? "") : ""
      );
      if (!sameArray(orderedDescriptorStateIds, orderedStateIds)) {
        reject(`${group.id}/${project} descriptor plan state IDs do not bind one-to-one to the state plan`);
      }
      try {
        const observedDescriptorPlanSha = sha256CanonicalJsonLines(
          orderedStateDescriptors,
        );
        if (observedDescriptorPlanSha !== group.stateDescriptorPlanSha256) {
          reject(`${group.id}/${project} independently recomputed semantic descriptor-plan SHA mismatch: ${observedDescriptorPlanSha}`);
        }
        projectDescriptorPlans.set(
          project,
          orderedStateDescriptors.map(canonicalJson),
        );
      } catch (error) {
        reject(`${group.id}/${project} semantic descriptor plan is not canonical JSON: ${String(error)}`);
      }
      totalStateReceipts += orderedStateIds.length;
    }

    const firstPlan = projectStatePlans.get(expectedProjects[0]) ?? [];
    for (const project of expectedProjects.slice(1)) {
      if (!sameArray(projectStatePlans.get(project) ?? [], firstPlan)) {
        reject(`${group.id} state plan differs between ${expectedProjects[0]} and ${project}`);
      }
    }
    const firstDescriptorPlan = projectDescriptorPlans.get(expectedProjects[0]) ?? [];
    for (const project of expectedProjects.slice(1)) {
      if (!sameArray(projectDescriptorPlans.get(project) ?? [], firstDescriptorPlan)) {
        reject(`${group.id} semantic descriptor plan differs between ${expectedProjects[0]} and ${project}`);
      }
    }
  }

  const expectedStateReceipts = contract.groups.reduce(
    (total, group) => total + group.stateCountPerProject * expectedProjects.length,
    0,
  );
  if (totalStateReceipts !== expectedStateReceipts) {
    reject(`expected ${expectedStateReceipts} state receipts, found ${totalStateReceipts}`);
  }

  if (contract.groups.every((group) => producerAttachmentKeysByGroup[group.id])) {
    try {
      validateMainlandFocusedVisualizationRawReplayLedger(
        executions.map((execution) => ({
          chunkId: execution.evidence?.chunkId,
          final: execution.evidence?.durabilityReceipts?.final,
          groupId: execution.group.id,
          project: execution.project,
          rawReplayLedger:
            execution.evidence?.durabilityReceipts?.rawReplayLedger,
        })),
        contract,
      );
    } catch (error) {
      reject(`raw replay ledger validation failed: ${String(error)}`);
    }
  }

  if (pathManifestPaths.size !== 1) {
    reject(`expected one run-scoped path manifest, found ${pathManifestPaths.size}`);
  } else {
    const [manifestPath] = pathManifestPaths;
    try {
      const manifest = validateStarshipE2ePathManifest(
        await readJsonArtifact(manifestPath, "Starship path manifest", readArtifact),
      );
      if (manifest.status !== "preflight-passed") {
        throw new Error("Starship path manifest is not a canonical preflight pass");
      }
      const repositoryRoot = assertStarshipPath(
        "manifest repositoryRoot",
        manifest.paths.repositoryRoot,
      );
      const browserTempDir = assertStarshipPath(
        "manifest browserTempDir",
        manifest.paths.browserTempDir,
      );
      const crashDumpDir = assertStarshipPath(
        "manifest crashDumpDir",
        manifest.paths.crashDumpDir,
      );
      const e2eRunRoot = assertStarshipPath(
        "manifest e2eRunRoot",
        manifest.paths.e2eRunRoot,
      );
      if (manifest.paths.pathManifestPath !== manifestPath) {
        throw new Error("Starship path manifest does not bind its own exact path");
      }
      if (manifest.process?.cwd !== repositoryRoot) {
        throw new Error("Starship path manifest process cwd does not match repositoryRoot");
      }
      if (contract.groups.every((group) => producerAttachmentKeysByGroup[group.id])) {
        await validateDynamicSourceProvenance(repositoryRoot, executions, {
          lstatArtifact,
          openArtifact,
          readArtifact,
          realpathArtifact,
        });
      }
      if (!Number.isSafeInteger(manifest.process?.pid) || manifest.process.pid <= 0) {
        throw new Error("Starship path manifest has no positive Playwright process pid");
      }
      if (
        manifest.externalEvidencePaths?.jsonReportPath !== canonicalReportPath ||
        manifest.externalEvidencePaths?.PLAYWRIGHT_JSON_OUTPUT_FILE !== canonicalReportPath
      ) {
        throw new Error("Starship path manifest does not bind the canonical JSON report");
      }
      assertChildStarshipPath(
        "focused Playwright JSON report",
        canonicalReportPath,
        e2eRunRoot,
      );
      if (isRecord(report.config)) {
        const expectedRootDir = assertStarshipPath(
          "canonical Playwright rootDir",
          join(repositoryRoot, "tests", "e2e"),
        );
        const rootDir = assertChildStarshipPath(
          "report config.rootDir",
          report.config.rootDir,
          repositoryRoot,
        );
        if (rootDir !== expectedRootDir) {
          throw new Error("report config.rootDir drifted from the canonical tests/e2e root");
        }
        if (
          assertStarshipPath("report config.configFile", report.config.configFile) !==
          assertStarshipPath(
            "canonical Playwright configFile",
            join(repositoryRoot, "playwright.config.ts"),
          )
        ) {
          throw new Error("report configFile drifted from the canonical Playwright config");
        }
        if (
          assertStarshipPath("report config.globalSetup", report.config.globalSetup) !==
          assertStarshipPath(
            "canonical Playwright globalSetup",
            join(repositoryRoot, "tests", "e2e", "starship-e2e-global-setup.ts"),
          )
        ) {
          throw new Error("report globalSetup drifted from the canonical Starship setup");
        }
        for (const project of arrayOf(report.config.projects)) {
          if (!isRecord(project)) continue;
          if (assertStarshipPath("report project outputDir", project.outputDir) !== manifest.paths.outputDir) {
            throw new Error(`report project ${String(project.name)} outputDir drifted from the manifest`);
          }
          if (assertStarshipPath("report project testDir", project.testDir) !== rootDir) {
            throw new Error(`report project ${String(project.name)} testDir drifted from config.rootDir`);
          }
        }
      }
      for (const execution of executions) {
        if (producerAttachmentKeysByGroup[execution.group.id]) {
          const final = execution.evidence?.durabilityReceipts?.final;
          const expectedFinalManifest = {
            pathManifestPath: manifestPath,
            paths: manifest.paths,
            runId: manifest.runId,
            schemaVersion: manifest.schemaVersion,
          };
          if (!isRecord(final) || !isDeepStrictEqual(final.manifest, expectedFinalManifest)) {
            throw new Error(
              `${execution.group.id}/${execution.project} final manifest drifted from the outer manifest`,
            );
          }
          const finalTestOutputDir = assertStarshipPath(
            `${execution.group.id}/${execution.project} final testOutputDir`,
            final.testOutputDir,
          );
          if (dirname(finalTestOutputDir) !== manifest.paths.outputDir) {
            throw new Error(
              `${execution.group.id}/${execution.project} final testOutputDir is not a direct child of the outer manifest outputDir`,
            );
          }
        }
        assertCurrentRunPathReceipt(execution, manifest);
        if (execution.attachmentPath === null) continue;
        assertChildStarshipPath(
          `${execution.group.id}/${execution.project} attachment path`,
          execution.attachmentPath,
          manifest.paths.outputDir,
        );
      }

      const browserProcesses = await readJsonArtifact(
        manifest.paths.browserProcessEvidencePath,
        "browser process receipt",
        readArtifact,
      );
      assertExactObjectKeys(
        "browser process receipt",
        browserProcesses,
        ["ancestorPid", "immutableExecutablePathsExcludedFromMutableArtifactClassification", "minimumDistinctProfiles", "observations", "processMutablePathAudit", "schemaVersion", "status"],
      );
      if (!Array.isArray(browserProcesses.observations)) {
        throw new Error("browser process observations must be an array");
      }
      const processObservations = browserProcesses.observations;
      const profileDirs = new Set();
      const browserPids = new Set();
      if (
        browserProcesses.schemaVersion !== 1 ||
        browserProcesses.status !== "passed" ||
        Object.hasOwn(browserProcesses, "violation") ||
        browserProcesses.ancestorPid !== manifest.process.pid ||
        browserProcesses.minimumDistinctProfiles !== expectedProjects.length ||
        browserProcesses.immutableExecutablePathsExcludedFromMutableArtifactClassification !== true
      ) {
        throw new Error("browser process receipt is not a terminal pass: status/violation/ancestor/profile producer contract mismatch");
      }
      if (processObservations.length < browserProcesses.minimumDistinctProfiles) {
        throw new Error(
          `browser process receipt must contain at least ${browserProcesses.minimumDistinctProfiles} profile observations; actual=${processObservations.length}`,
        );
      }
      for (const observation of processObservations) {
        if (!isRecord(observation)) throw new Error("browser process observation is malformed");
        assertExactObjectKeys(
          "browser process observation",
          observation,
          ["browserPid", "mutablePaths", "processCount", "userDataDir"],
        );
        if (
          !Number.isSafeInteger(observation.browserPid) ||
          observation.browserPid <= 0 ||
          !Number.isSafeInteger(observation.processCount) ||
          observation.processCount <= 0
        ) {
          throw new Error("browser process observation lacks a positive pid/process count");
        }
        if (browserPids.has(observation.browserPid)) {
          throw new Error(`browser process receipt contains duplicate browser pid ${observation.browserPid}`);
        }
        browserPids.add(observation.browserPid);
        const userDataDir = assertChildStarshipPath(
          "browser process userDataDir",
          observation.userDataDir,
          browserTempDir,
        );
        if (profileDirs.has(userDataDir)) {
          throw new Error(`browser process receipt contains duplicate browser profile ${userDataDir}`);
        }
        profileDirs.add(userDataDir);
        if (!Array.isArray(observation.mutablePaths) || observation.mutablePaths.length === 0) {
          throw new Error("browser process observation has no mutable-path array");
        }
        const mutablePaths = observation.mutablePaths;
        const observedUserDataEntries = mutablePaths.filter((entry) =>
          isRecord(entry) &&
          entry.flag === "user-data-dir" &&
          entry.pid === observation.browserPid &&
          assertStarshipPath("browser observation user-data-dir", entry.path) === userDataDir
        );
        if (observedUserDataEntries.length !== 1) {
          throw new Error("browser process observation lacks its exact user-data-dir audit");
        }
        const observedCrashDumpEntries = mutablePaths.filter((entry) =>
          isRecord(entry) &&
          entry.flag === "crash-dumps-dir" &&
          entry.pid === observation.browserPid &&
          assertStarshipPath("browser observation crash-dumps-dir", entry.path) ===
            crashDumpDir
        );
        if (observedCrashDumpEntries.length !== 1) {
          throw new Error(
            "browser process observation lacks its exact main-PID crash-dumps-dir audit",
          );
        }
        for (const entry of mutablePaths) {
          if (!isRecord(entry)) throw new Error("browser process mutable-path entry is malformed");
          assertExactObjectKeys(
            "browser process observation mutable-path entry",
            entry,
            ["flag", "path", "pid"],
          );
          if (
            !MUTABLE_BROWSER_PATH_FLAGS.includes(entry.flag) ||
            !Number.isSafeInteger(entry.pid) ||
            entry.pid <= 0
          ) {
            throw new Error("browser process mutable-path entry has an invalid flag or pid");
          }
          const mutablePath = assertChildStarshipPath(
            `browser process --${entry.flag}`,
            entry.path,
            e2eRunRoot,
          );
          if (entry.flag === "user-data-dir") {
            assertChildStarshipPath("browser process user-data-dir", mutablePath, browserTempDir);
            if (mutablePath !== userDataDir) {
              throw new Error(
                "browser process observation contains user-data-dir evidence for a different profile identity",
              );
            }
          }
          if (entry.flag === "crash-dumps-dir" && mutablePath !== crashDumpDir) {
            throw new Error("browser process crash-dumps-dir drifted from the manifest");
          }
        }
      }
      if (
        profileDirs.size !== processObservations.length ||
        browserPids.size !== processObservations.length ||
        profileDirs.size < browserProcesses.minimumDistinctProfiles
      ) {
        throw new Error(
          `browser process receipt lacks the minimum unique Chrome profile/PID cardinality; observations=${processObservations.length} profiles=${profileDirs.size} pids=${browserPids.size}`,
        );
      }
      if (!Array.isArray(browserProcesses.processMutablePathAudit)) {
        throw new Error("browser process mutable-path audit must be an array");
      }
      const processMutablePathAudit = browserProcesses.processMutablePathAudit;
      if (!processMutablePathAudit.some((entry) =>
        isRecord(entry) && entry.flag === "user-data-dir"
      )) {
        throw new Error("browser process receipt has no mutable user-data-dir audit");
      }
      for (const entry of processMutablePathAudit) {
        if (!isRecord(entry)) throw new Error("browser process audit entry is malformed");
        assertExactObjectKeys(
          "browser process audit entry",
          entry,
          ["flag", "path", "pid", "processKind"],
        );
        if (
          !MUTABLE_BROWSER_PATH_FLAGS.includes(entry.flag) ||
          !Number.isSafeInteger(entry.pid) ||
          entry.pid <= 0 ||
          !["browser-main", "crashpad", "descendant"].includes(entry.processKind)
        ) {
          throw new Error("browser process audit entry has no valid mutable flag/positive pid/processKind");
        }
        if (browserPids.has(entry.pid) && entry.processKind !== "browser-main") {
          throw new Error("browser process main-PID audit entry must use processKind browser-main");
        }
        const auditedPath = assertChildStarshipPath(
          `browser process descendant --${String(entry.flag)}`,
          entry.path,
          e2eRunRoot,
        );
        if (entry.flag === "user-data-dir") {
          assertChildStarshipPath("browser process audited userDataDir", auditedPath, browserTempDir);
        }
        if (entry.flag === "crash-dumps-dir" && auditedPath !== crashDumpDir) {
          throw new Error("browser process crash-dumps-dir drifted from the manifest");
        }
      }
      const auditIdentity = (entry) =>
        `${entry.pid}\u0000${entry.flag}\u0000${assertStarshipPath("browser audit identity path", entry.path)}`;
      const auditIdentities = processMutablePathAudit.map(auditIdentity);
      if (duplicates(auditIdentities).length > 0) {
        throw new Error("browser process mutable-path audit contains duplicate identity tuples");
      }
      const observationIdentities = processObservations.flatMap((observation) =>
        observation.mutablePaths.map(auditIdentity)
      );
      if (duplicates(observationIdentities).length > 0) {
        throw new Error(
          "browser process observations contain duplicate mutable-path identities",
        );
      }
      for (const identity of observationIdentities) {
        if (auditIdentities.filter((candidate) => candidate === identity).length !== 1) {
          throw new Error("browser process observation is not uniquely identity-bound to the accumulated audit");
        }
      }

      const browserProfile = await readJsonArtifact(
        manifest.paths.browserProfileEvidencePath,
        "browser profile receipt",
        readArtifact,
      );
      assertExactObjectKeys(
        "browser profile receipt",
        browserProfile,
        ["browserCommandAudit", "browserVersion", "channel", "environment", "observed", "pathManifestPath", "projectFixtureInheritance", "schemaVersion", "status"],
      );
      if (
        browserProfile.schemaVersion !== 1 ||
        browserProfile.status !== "passed" ||
        browserProfile.channel !== "chrome" ||
        typeof browserProfile.browserVersion !== "string" ||
        browserProfile.browserVersion.length === 0 ||
        browserProfile.pathManifestPath !== manifestPath ||
        browserProfile.browserCommandAudit?.crashpadDatabaseFlagIsFailClosedWhenSpawnedInBrowserTree !== true ||
        browserProfile.browserCommandAudit?.immutableExecutablePathsExcludedFromMutableArtifactClassification !== true ||
        !Array.isArray(browserProfile.browserCommandAudit?.mutableFlags) ||
        !sameArray(browserProfile.browserCommandAudit.mutableFlags, MUTABLE_BROWSER_PATH_FLAGS)
      ) {
        throw new Error("browser profile receipt is not a canonical terminal Chrome pass");
      }
      const profileEnvironment = browserProfile.environment;
      if (
        !isRecord(profileEnvironment) ||
        profileEnvironment.TEMP !== browserTempDir ||
        profileEnvironment.TMP !== browserTempDir ||
        profileEnvironment.TMPDIR !== browserTempDir ||
        profileEnvironment.NODE_COMPILE_CACHE !== manifest.paths.nodeCompileCacheDir ||
        profileEnvironment.npm_config_cache !== manifest.paths.npmCacheDir ||
        profileEnvironment.NEXT_TELEMETRY_DISABLED !== "1"
      ) {
        throw new Error("browser profile did not inherit the exact Starship temp/cache contract");
      }
      assertExactObjectKeys(
        "browser profile observation",
        browserProfile.observed,
        ["browserPid", "mutablePaths", "processCount", "userDataDir"],
      );
      const observedProfileDir = assertChildStarshipPath(
        "browser profile observed userDataDir",
        browserProfile.observed?.userDataDir,
        browserTempDir,
      );
      const observedProfilePid = browserProfile.observed?.browserPid;
      if (
        !Number.isSafeInteger(observedProfilePid) ||
        observedProfilePid <= 0 ||
        !Number.isSafeInteger(browserProfile.observed?.processCount) ||
        browserProfile.observed.processCount <= 0
      ) {
        throw new Error("browser profile observation lacks a positive pid/process count");
      }
      const matchingProcessObservations = processObservations.filter((observation) =>
        isRecord(observation) &&
        observation.browserPid === observedProfilePid &&
        observation.userDataDir === observedProfileDir
      );
      if (matchingProcessObservations.length !== 1) {
        throw new Error(
          "browser profile must match exactly one process-observed profile identity",
        );
      }
      const [matchingProcessObservation] = matchingProcessObservations;
      if (browserProfile.observed.processCount !== matchingProcessObservation.processCount) {
        throw new Error("browser profile processCount drifted from its process observation");
      }
      if (
        !Array.isArray(browserProfile.observed?.mutablePaths) ||
        browserProfile.observed.mutablePaths.length === 0
      ) {
        throw new Error("browser profile mutable-path receipt must be a non-empty array");
      }
      const observedMutablePaths = browserProfile.observed.mutablePaths;
      if (!observedMutablePaths.some((entry) =>
        isRecord(entry) &&
        entry.flag === "user-data-dir" &&
        entry.pid === observedProfilePid &&
        assertStarshipPath("browser profile user-data-dir", entry.path) === observedProfileDir
      )) {
        throw new Error("browser profile lacks its exact user-data-dir receipt");
      }
      if (!observedMutablePaths.some((entry) =>
        isRecord(entry) &&
        entry.flag === "crash-dumps-dir" &&
        assertStarshipPath("browser profile crash-dumps-dir", entry.path) === crashDumpDir
      )) {
        throw new Error("browser profile lacks the canonical crash-dumps-dir receipt");
      }
      for (const entry of observedMutablePaths) {
        if (!isRecord(entry)) throw new Error("browser profile mutable-path entry is malformed");
        assertExactObjectKeys(
          "browser profile observation mutable-path entry",
          entry,
          ["flag", "path", "pid"],
        );
        if (
          !MUTABLE_BROWSER_PATH_FLAGS.includes(entry.flag) ||
          !Number.isSafeInteger(entry.pid) ||
          entry.pid <= 0
        ) {
          throw new Error("browser profile mutable-path entry has no valid flag/positive pid");
        }
        assertChildStarshipPath(
          `browser profile --${String(entry.flag)}`,
          entry.path,
          e2eRunRoot,
        );
        if (auditIdentities.filter((identity) => identity === auditIdentity(entry)).length !== 1) {
          throw new Error("browser profile mutable path is not uniquely bound to the process audit");
        }
      }
      const profileMutablePathIdentities = observedMutablePaths.map(auditIdentity);
      const matchingObservationIdentities = matchingProcessObservation.mutablePaths.map(
        auditIdentity,
      );
      if (
        duplicates(profileMutablePathIdentities).length > 0 ||
        duplicates(matchingObservationIdentities).length > 0
      ) {
        throw new Error(
          "browser profile or matched process observation contains duplicate mutable-path identities",
        );
      }
      if (
        !sameArray(
          [...profileMutablePathIdentities].sort(),
          [...matchingObservationIdentities].sort(),
        )
      ) {
        throw new Error(
          "browser profile mutable-path identity set does not exactly match its process observation",
        );
      }
      if (!processMutablePathAudit.some((entry) =>
        isRecord(entry) &&
        entry.pid === observedProfilePid &&
        entry.flag === "user-data-dir" &&
        assertStarshipPath("browser process/profile user-data-dir", entry.path) === observedProfileDir
      )) {
        throw new Error("browser process audit is not identity-bound to the browser profile receipt");
      }
      if (!Array.isArray(browserProfile.projectFixtureInheritance)) {
        throw new Error("browser profile project inheritance must be an array");
      }
      const inheritedProjects = browserProfile.projectFixtureInheritance;
      const enforcedLaunchArgs = [
        "--disable-breakpad",
        "--disable-crash-reporter",
        `--crash-dumps-dir=${crashDumpDir}`,
      ];
      if (
        inheritedProjects.length !== expectedProjects.length ||
        !sameArray(
          inheritedProjects.map((entry) => isRecord(entry) ? String(entry.projectName ?? "") : ""),
          expectedProjects,
        ) ||
        inheritedProjects.some((entry) =>
          !isRecord(entry) ||
          entry.channel !== "chrome" ||
          entry.workerTempEnvironmentInheritedFromPlaywrightNode !== true ||
          !Array.isArray(entry.launchArgs) ||
          !sameArray(entry.launchArgs, enforcedLaunchArgs)
        )
      ) {
        throw new Error(
          `browser profile mutable launch arguments do not match the exact producer contract ${JSON.stringify(enforcedLaunchArgs)}`,
        );
      }
      for (const inheritance of inheritedProjects) {
        for (const argument of inheritance.launchArgs) {
          if (!isNonEmptyString(argument)) {
            throw new Error("browser mutable launch argument must be a non-empty string");
          }
          for (const flag of MUTABLE_BROWSER_PATH_FLAGS) {
            if (argument === `--${flag}`) {
              throw new Error(`browser mutable launch argument --${flag} has no path`);
            }
            if (!argument.startsWith(`--${flag}=`)) continue;
            const launchPath = assertChildStarshipPath(
              `browser mutable launch argument --${flag}`,
              argument.slice(flag.length + 3),
              e2eRunRoot,
            );
            if (flag === "user-data-dir") {
              assertChildStarshipPath(
                "browser mutable launch user-data-dir",
                launchPath,
                browserTempDir,
              );
            }
            if (flag === "crash-dumps-dir" && launchPath !== crashDumpDir) {
              throw new Error("browser mutable launch crash-dumps-dir drifted from the manifest");
            }
          }
        }
      }
    } catch (error) {
      reject(`terminal Starship receipt validation failed: ${String(error)}`);
    }
  }

  if (errors.length > 0) throw new Error(formatErrors(errors));
  return Object.freeze({
    dynamicSourceReadLinearization,
    executionCount: executions.length,
    groupCount: contract.groups.length,
    outerSupervisor: MAINLAND_FOCUSED_VISUALIZATION_OUTER_SUPERVISOR_CONTRACT,
    projects: Object.freeze(expectedProjects),
    releaseReady: false,
    reportPath: canonicalReportPath,
    stateReceiptCount: totalStateReceipts,
    status: "inner-report-passed",
    ioTrust: testIoInjected ? "injected-untrusted-test-seam" : "native-filesystem",
  });
}

export async function validateMainlandFocusedVisualizationReportFile(
  reportPath,
  contract = MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT,
) {
  const canonicalReportPath = assertStarshipPath(
    "focused Playwright JSON report",
    resolve(reportPath),
  );
  const report = JSON.parse(await readFile(canonicalReportPath, "utf8"));
  return validateMainlandFocusedVisualizationReport(report, canonicalReportPath, contract);
}

async function main(argv) {
  if (argv.length !== 1) {
    throw new Error("Usage: node scripts/validate-mainland-focused-visualization-report.mjs <Starship-playwright-report.json>");
  }
  const summary = await validateMainlandFocusedVisualizationReportFile(argv[0]);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
