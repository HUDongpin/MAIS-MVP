/**
 * Descriptor-bound execution capsule for signature-lab assignment gates.
 *
 * The only executable pathname is a root-owned Node binary. TypeScript 5.8.3
 * is evaluated from inherited descriptor 3, while every project/declaration
 * byte is parsed from one canonical archive inherited as descriptor 4.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fstatSync, lstatSync, realpathSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

export const EXPECTED_TYPESCRIPT_VERSION = "5.8.3";
export const EXPECTED_TYPESCRIPT_BUNDLE_SHA256 =
  "dd17428736a07e1db1a138d8a14295ddb2699ba780ee15038acdd2c6da5373a0";
export const EXPECTED_TYPESCRIPT_BUNDLE_BYTE_LENGTH = 9_066_411;

export const EXPECTED_ASSIGNMENT_PROJECT_GRAPH_NAMES_SHA256 =
  "360aaa2c530f138ba81938c14f3b2a7d6849687c5332c04c9e3d4b88a9508990";
export const EXPECTED_ASSIGNMENT_PROJECT_GRAPH_CONTENT_SHA256 =
  "1f70939a6c6ff9fe3e5031a5db3c3ff6bae6dcb758b5277c3d80e61fec6e5819";
export const EXPECTED_ASSIGNMENT_DECLARATION_NAMES_SHA256 =
  "6a4e9b0a7cd48a02b02b1fc52971a6f0d6744f75a8edded0ded605ae377809d5";
export const EXPECTED_ASSIGNMENT_DECLARATION_CONTENT_SHA256 =
  "915ee4cd0841d10c718a65cf825fdfe2d53783060bb937c3bce29c53396c7ec3";
export const EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256 =
  "155b9d6e82d7a4dc60eb1e5102f8ce45669e97a43ddc8871ebd721ce3fb247ce";
export const EXPECTED_ASSIGNMENT_COMPILER_CONTENT_SHA256 =
  "761b44b92ad0a67484aadc2abf5dd76d8e4a0288318a007515576fb1e4e1b583";
export const EXPECTED_ASSIGNMENT_RUNTIME_GRAPH_NAMES_SHA256 =
  "de55a35879b044185b9731be2e740a9125f4a894ced787de940d5e5da8e5ef5d";
export const EXPECTED_ASSIGNMENT_RUNTIME_EDGES_SHA256 =
  "6525e076c324ad92b7f459a172216155fd7423313ebf87aecec47ca4ec7aeb26";

const EXPECTED_PROJECT_BYTES = 50_425_935;
const EXPECTED_DECLARATION_BYTES = 6_923_797;
const EXPECTED_COMPILER_BYTES = 57_349_732;
const EXPECTED_PROJECT_COUNT = 53;
const EXPECTED_DECLARATION_COUNT = 603;
const EXPECTED_COMPILER_COUNT = 656;
const EXPECTED_RUNTIME_SOURCE_COUNT = 52;
const EXPECTED_RUNTIME_EDGE_COUNT = 63;
const ASSIGNMENT_ENTRY = "data/signatureLabAssignments.test.ts";
const VIRTUAL_PROJECT_ROOT = "/__ca_signature_lab__/project";
const ARCHIVE_SCHEMA = "ca.signature-lab.assignment-archive.v1";
const ARCHIVE_BUILD_SCHEMA = "ca.signature-lab.assignment-archive-build.v1";
const ARCHIVE_MAGIC = Buffer.from(
  "CA_SIGNATURE_LAB_ASSIGNMENT_ARCHIVE_V1\n",
  "ascii",
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function canonicalValue(value, label = "value") {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${label}: expected one safe integer`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => canonicalValue(entry, `${label}[${index}]`));
  }
  if (typeof value !== "object") {
    throw new Error(`${label}: unsupported canonical value`);
  }
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] === undefined) {
      throw new Error(`${label}.${key}: undefined is not canonical`);
    }
    result[key] = canonicalValue(value[key], `${label}.${key}`);
  }
  return result;
}

function canonicalJsonBytes(value, label = "value") {
  return Buffer.from(`${JSON.stringify(canonicalValue(value, label))}\n`, "utf8");
}

function assertSha256(value, label) {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label}: expected one lowercase SHA-256`);
  }
}

function assertRelativeArchivePath(value, label) {
  if (typeof value !== "string" || value === "" || value.includes("\\") ||
      value.includes("\0") || path.posix.isAbsolute(value) ||
      path.posix.normalize(value) !== value || value.endsWith("/")) {
    throw new Error(`${label}: invalid canonical relative path`);
  }
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`${label}: invalid canonical path component`);
  }
  return value;
}

function canonicalNameManifest(names) {
  return Buffer.from(`${names.join("\n")}\n`, "utf8");
}

function canonicalContentManifest(entries) {
  return Buffer.from(
    `${entries.map((entry) => `${entry.relativePath}\t${entry.sha256}`).join("\n")}\n`,
    "utf8",
  );
}

function decodeFrozenLineManifest(encoded, expectedCount, expectedSha256, label) {
  const text = inflateRawSync(Buffer.from(encoded, "base64")).toString("utf8");
  if (!text.endsWith("\n")) throw new Error(`${label}: manifest is not newline terminated`);
  const values = text.slice(0, -1).split("\n");
  if (values.length !== expectedCount || new Set(values).size !== values.length ||
      sha256(Buffer.from(text, "utf8")) !== expectedSha256) {
    throw new Error(`${label}: frozen manifest drifted`);
  }
  for (const [index, value] of values.entries()) {
    assertRelativeArchivePath(value, `${label}[${index}]`);
  }
  return Object.freeze(values);
}

const DECLARATION_PATHS_DEFLATE_BASE64 =
  "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";

export const EXPECTED_ASSIGNMENT_DECLARATION_PATHS = decodeFrozenLineManifest(
  DECLARATION_PATHS_DEFLATE_BASE64,
  EXPECTED_DECLARATION_COUNT,
  EXPECTED_ASSIGNMENT_DECLARATION_NAMES_SHA256,
  "assignment declaration paths",
);

export const EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS = Object.freeze([
  "components/visualizations/three/threeDSceneMath.ts",
  "components/visualizations/three/threeDSceneTypes.ts",
  "components/visualizations/visualizationTemplateIds.ts",
  "data/generated-content/ccss-textbook-practice-v1/question-pack.json",
  "data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json",
  "data/generated-content/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json",
  "data/generated-content/mainland-bnu-primary-generated-bank-v1-1500/question-pack.json",
  "data/generated-content/mainland-bnu-primary-generated-bank-v2-1500/question-pack.json",
  "data/generated-content/mainland-hjb-high-generated-bank-v1/question-pack.json",
  "data/generated-content/mainland-hjb-high-generated-bank-v2/question-pack.json",
  "data/generated-content/mainland-hjb-high-generated-bank-v3-remediated/question-pack.json",
  "data/generated-content/mainland-hjb-high-generated-bank-v4-remediated/question-pack.json",
  "data/generated-content/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json",
  "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json",
  "data/generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json",
  "data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json",
  "data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json",
  "data/generated-content/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json",
  "data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json",
  "data/generated-content/us-fl-math-middle-school-textbooks-v1/textbook-pack.json",
  "data/grades.ts",
  "data/hjbQuestionLocalization.ts",
  "data/mainlandBnuHighTopics.ts",
  "data/mainlandBnuJuniorTopics.ts",
  "data/mainlandBnuPrimaryTopics.ts",
  "data/mainlandHjbHighTopics.ts",
  "data/mainlandHjbJuniorTopics.ts",
  "data/mainlandHjbPrimaryTopics.ts",
  "data/mainlandPepHighTopics.ts",
  "data/mainlandPepJuniorTopics.ts",
  "data/mainlandPepPrimaryTopics.ts",
  "data/rag/mainlandBnuHigh.ts",
  "data/rag/mainlandBnuJunior.ts",
  "data/rag/mainlandBnuPrimary.ts",
  "data/rag/mainlandHjbHigh.ts",
  "data/rag/mainlandHjbJunior.ts",
  "data/rag/mainlandHjbPrimary.ts",
  "data/rag/mainlandPepJunior.ts",
  "data/rag/usMath.ts",
  "data/signatureLabAssignments.test.ts",
  "data/signatureLabAssignments.ts",
  "data/topics.ts",
  "data/usArkansasTopics.ts",
  "data/usCaliforniaKnowledgePoints.ts",
  "data/usCaliforniaMathematicalPractices.ts",
  "data/usCaliforniaMicroLessons.ts",
  "data/usCaliforniaTopics.ts",
  "data/usFloridaMiddleSchoolTopics.ts",
  "data/usMathTopics.ts",
  "data/visualizationLabs.ts",
  "lib/difficulty.ts",
  "lib/i18n.ts",
  "types/index.ts",
]);

if (sha256(canonicalNameManifest(EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS)) !==
    EXPECTED_ASSIGNMENT_PROJECT_GRAPH_NAMES_SHA256) {
  throw new Error("assignment project source manifest drifted");
}

export const EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS = Object.freeze([
  ...EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS,
  ...EXPECTED_ASSIGNMENT_DECLARATION_PATHS,
].sort());

if (sha256(canonicalNameManifest(EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS)) !==
    EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256) {
  throw new Error("assignment compiler source manifest drifted");
}

const RUNTIME_EDGES_DEFLATE_BASE64 =
  "vVnbcpswEH0m/yKTOEmn06em7XTS1plxJ/kBIdYgAxKVRNr06zsYjAFLQsJ2Xzyg1R7tWe1FMoQXJWfAlAxfqaxwTv9iRTmToUoFQPP75ZkAgyes0oWSwaI/+PJWggyIO8pOYaHkVYwVDtNt9LMCWc9dcdLp1ct8DHMahfTmPQv2D51agSnLMYs/seqRJukLLymRjW0JMBBYQYwIZwqY6iajiFUopUmKDnMizDL0eoNu7q+vw1+tJajEJFvgshT8FeLFVnIW7Ja9DPYkJYGTsbixRyOYdlHj15huNpRUuXoLhq86gO8Vo1x4eHm7UzD5Ys8eDZ3i7OfZ6A7ERi5tJmi93Yhc3DXD42tBCyzePFxeNhpu8efsam/UCzJZXoTJ8hQmo5BoZ2jDpZU5bbZvwDxuI48ymG4jQ6ma41svtIuYvTyr2cv/ZfYtElBATOuhszKYAL4ImbtLkbk7kUw/C1vxcXq2gum8mpGY9hbTTdAaZWgxj9vIr6rW3j1/f5iF6sLEcCgMJk6MLtAjBxsL9kHmBOwbF2so7XHRTTg2rRN1qJImDKtKwApHD7J+K+qj+EKBVI11tmmBHcNvjcHpf4WjFv1o2BmX8Rg+YClBqFAqQYnSDHlA1S+Hp0ZR9TZBe2wOrCdqK0h/m4OJg6IVaBBzwdQRwgw1qGmBtdxZQczEjoueFchCTJNqZqg1lCZiA9EUiJnYcdZagSzExlItVCUfRIaZxLIPMR41qH7GOd1wwSgeKo/HDepfcy5ojJ9oHOfwTFLO8yGOcYIBsP7zYIhwGOlUNNy0ja2SCAtUYJWi5B1Kbpand7UTIGfbnqHk/qyW+wGa7XZtZ/1w+sH47xziBNacNo1jFIf1fkOBFSU4XwtMFCWgCUvttJkrUiL4CqTkTLdQT6rFt+8jIVIiBX9UxHmGytZSv0uUD4avfZVEBKPsHmV7N6Gy9tNMU2fCzbPalobLGfkxF/IE67WpeItigFICZCeQmIl8Kpd9mMp6o/M2bXxMNgLYLbNkfOBQEtzBz1Yt3KunrYmaNmWTNz4tdkpI7rSGzj1UFIewmoV3pevh7RWmGT3cW5r3jrXuKlBzFTjet4PmeUrjpOuMAVP1TihqeDbRanwMid/3k4B4f2+Zufzg9QWKMscKvsW2bzUmlSkjtN9pes/7y6F+j/8B";

function decodeRuntimeEdges() {
  const text = inflateRawSync(Buffer.from(RUNTIME_EDGES_DEFLATE_BASE64, "base64"))
    .toString("utf8");
  if (!text.endsWith("\n") || sha256(Buffer.from(text, "utf8")) !==
      EXPECTED_ASSIGNMENT_RUNTIME_EDGES_SHA256) {
    throw new Error("assignment runtime-edge manifest drifted");
  }
  const edges = text.slice(0, -1).split("\n").map((line, index) => {
    const values = line.split("\t");
    if (values.length !== 3) throw new Error(`runtime edge ${index}: malformed`);
    assertRelativeArchivePath(values[0], `runtime edge ${index} importer`);
    if (values[1] === "") throw new Error(`runtime edge ${index}: empty specifier`);
    if (!values[2].startsWith("node:")) {
      assertRelativeArchivePath(values[2], `runtime edge ${index} target`);
    }
    return Object.freeze(values);
  });
  if (edges.length !== EXPECTED_RUNTIME_EDGE_COUNT ||
      new Set(edges.map((edge) => edge.join("\t"))).size !== edges.length) {
    throw new Error("assignment runtime-edge inventory drifted");
  }
  return Object.freeze(edges);
}

export const EXPECTED_ASSIGNMENT_RUNTIME_EDGES = decodeRuntimeEdges();

function deriveRuntimeSourceNames(edges) {
  const byImporter = new Map();
  for (const edge of edges) {
    const list = byImporter.get(edge[0]) ?? [];
    list.push(edge);
    byImporter.set(edge[0], list);
  }
  const pending = [ASSIGNMENT_ENTRY];
  const seen = new Set();
  while (pending.length > 0) {
    const current = pending.pop();
    if (seen.has(current)) continue;
    seen.add(current);
    for (const edge of byImporter.get(current) ?? []) {
      if (!edge[2].startsWith("node:")) pending.push(edge[2]);
    }
  }
  return [...seen].sort();
}

export const EXPECTED_ASSIGNMENT_RUNTIME_SOURCE_PATHS = Object.freeze(
  deriveRuntimeSourceNames(EXPECTED_ASSIGNMENT_RUNTIME_EDGES),
);

if (EXPECTED_ASSIGNMENT_RUNTIME_SOURCE_PATHS.length !== EXPECTED_RUNTIME_SOURCE_COUNT ||
    sha256(canonicalNameManifest(EXPECTED_ASSIGNMENT_RUNTIME_SOURCE_PATHS)) !==
      EXPECTED_ASSIGNMENT_RUNTIME_GRAPH_NAMES_SHA256) {
  throw new Error("assignment runtime source graph drifted");
}

export const EXPECTED_ASSIGNMENT_COMPILER_OPTIONS = deepFreeze({
  allowJs: true,
  checkJs: false,
  esModuleInterop: true,
  incremental: false,
  isolatedModules: true,
  jsx: "Preserve",
  lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.d.ts"],
  module: "ESNext",
  moduleResolution: "Bundler",
  noEmit: true,
  paths: { "@/*": ["./*"] },
  plugins: [],
  resolveJsonModule: true,
  skipLibCheck: true,
  strict: true,
  target: "ES2017",
});

function normalizeCompilerEntries(compilerEntries) {
  let candidates;
  if (compilerEntries instanceof Map) {
    candidates = [...compilerEntries.entries()].map(([relativePath, value]) => ({
      relativePath,
      bytes: Buffer.isBuffer(value) || value instanceof Uint8Array ? value : value?.bytes,
    }));
  } else if (Array.isArray(compilerEntries)) {
    candidates = compilerEntries.map((entry) => ({
      relativePath: entry?.relativePath ?? entry?.path,
      bytes: entry?.bytes,
    }));
  } else {
    throw new Error("compilerEntries: expected a Map or array");
  }
  const entries = candidates.map((entry, index) => {
    const relativePath = assertRelativeArchivePath(
      entry.relativePath,
      `compilerEntries[${index}].relativePath`,
    );
    if (!Buffer.isBuffer(entry.bytes) && !(entry.bytes instanceof Uint8Array)) {
      throw new Error(`${relativePath}: compiler entry bytes are unavailable`);
    }
    const bytes = Buffer.from(entry.bytes);
    return {
      relativePath,
      bytes,
      byteLength: bytes.length,
      sha256: sha256(bytes),
      kind: relativePath.endsWith(".d.ts")
        ? "declaration"
        : relativePath.endsWith(".json")
          ? "json"
          : "typescript",
    };
  }).sort((left, right) => left.relativePath < right.relativePath
    ? -1
    : left.relativePath > right.relativePath
      ? 1
      : 0);
  if (entries.length !== EXPECTED_COMPILER_COUNT ||
      new Set(entries.map((entry) => entry.relativePath)).size !== entries.length ||
      JSON.stringify(entries.map((entry) => entry.relativePath)) !==
        JSON.stringify(EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS)) {
    throw new Error("assignment compiler entry-name inventory drifted");
  }
  if (entries.reduce((total, entry) => total + entry.byteLength, 0) !==
      EXPECTED_COMPILER_BYTES ||
      sha256(canonicalNameManifest(entries.map((entry) => entry.relativePath))) !==
        EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256 ||
      sha256(canonicalContentManifest(entries)) !==
        EXPECTED_ASSIGNMENT_COMPILER_CONTENT_SHA256) {
    throw new Error("assignment compiler entry bytes drifted");
  }
  return entries;
}

function assertExactFrozenInput(actual, expected, label) {
  const actualBytes = canonicalJsonBytes(actual, label);
  const expectedBytes = canonicalJsonBytes(expected, `${label} expected`);
  if (!actualBytes.equals(expectedBytes)) throw new Error(`${label}: reviewed value drifted`);
  return canonicalValue(actual, label);
}

function buildArchiveHeader(entries, compilerOptions, projectGraph, runtimeEdges) {
  const projectNames = assertExactFrozenInput(
    projectGraph,
    EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS,
    "projectGraph",
  );
  const reviewedEdges = assertExactFrozenInput(
    runtimeEdges,
    EXPECTED_ASSIGNMENT_RUNTIME_EDGES,
    "runtimeEdges",
  );
  const reviewedOptions = assertExactFrozenInput(
    compilerOptions,
    EXPECTED_ASSIGNMENT_COMPILER_OPTIONS,
    "compilerOptions",
  );
  const runtimeSourceNames = deriveRuntimeSourceNames(reviewedEdges);
  const byName = new Map(entries.map((entry) => [entry.relativePath, entry]));
  const projectEntries = projectNames.map((name) => byName.get(name));
  const declarationEntries = EXPECTED_ASSIGNMENT_DECLARATION_PATHS.map(
    (name) => byName.get(name),
  );
  if (projectEntries.some((entry) => entry === undefined) ||
      declarationEntries.some((entry) => entry === undefined)) {
    throw new Error("assignment archive partition is incomplete");
  }
  if (projectEntries.reduce((total, entry) => total + entry.byteLength, 0) !==
      EXPECTED_PROJECT_BYTES ||
      declarationEntries.reduce((total, entry) => total + entry.byteLength, 0) !==
        EXPECTED_DECLARATION_BYTES ||
      sha256(canonicalContentManifest(projectEntries)) !==
        EXPECTED_ASSIGNMENT_PROJECT_GRAPH_CONTENT_SHA256 ||
      sha256(canonicalContentManifest(declarationEntries)) !==
        EXPECTED_ASSIGNMENT_DECLARATION_CONTENT_SHA256) {
    throw new Error("assignment archive partition bytes drifted");
  }
  let offset = 0;
  const headerEntries = entries.map((entry) => {
    const result = {
      byteLength: entry.byteLength,
      kind: entry.kind,
      offset,
      relativePath: entry.relativePath,
      sha256: entry.sha256,
    };
    offset += entry.byteLength;
    return result;
  });
  return canonicalValue({
    schemaVersion: ARCHIVE_SCHEMA,
    virtualProjectRoot: VIRTUAL_PROJECT_ROOT,
    assignmentEntry: ASSIGNMENT_ENTRY,
    compilerOptions: reviewedOptions,
    compilerEntryCount: EXPECTED_COMPILER_COUNT,
    compilerEntriesNamesSha256: EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256,
    compilerEntriesContentManifestSha256: EXPECTED_ASSIGNMENT_COMPILER_CONTENT_SHA256,
    compilerEntries: headerEntries,
    projectGraph: {
      count: EXPECTED_PROJECT_COUNT,
      namesSha256: EXPECTED_ASSIGNMENT_PROJECT_GRAPH_NAMES_SHA256,
      contentManifestSha256: EXPECTED_ASSIGNMENT_PROJECT_GRAPH_CONTENT_SHA256,
      names: projectNames,
    },
    declarations: {
      count: EXPECTED_DECLARATION_COUNT,
      namesSha256: EXPECTED_ASSIGNMENT_DECLARATION_NAMES_SHA256,
      contentManifestSha256: EXPECTED_ASSIGNMENT_DECLARATION_CONTENT_SHA256,
    },
    runtimeGraph: {
      entry: ASSIGNMENT_ENTRY,
      sourceCount: EXPECTED_RUNTIME_SOURCE_COUNT,
      namesSha256: EXPECTED_ASSIGNMENT_RUNTIME_GRAPH_NAMES_SHA256,
      sourceNames: runtimeSourceNames,
      edgeCount: EXPECTED_RUNTIME_EDGE_COUNT,
      edgesSha256: EXPECTED_ASSIGNMENT_RUNTIME_EDGES_SHA256,
      allowedBuiltins: ["node:assert/strict", "node:test"],
      edges: reviewedEdges,
    },
  }, "assignment archive header");
}

export function buildCanonicalAssignmentArchive({
  compilerEntries,
  compilerOptions = EXPECTED_ASSIGNMENT_COMPILER_OPTIONS,
  projectGraph = EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS,
  runtimeEdges = EXPECTED_ASSIGNMENT_RUNTIME_EDGES,
}) {
  const entries = normalizeCompilerEntries(compilerEntries);
  const header = buildArchiveHeader(entries, compilerOptions, projectGraph, runtimeEdges);
  const headerBytes = canonicalJsonBytes(header, "assignment archive header");
  const headerLength = Buffer.alloc(8);
  headerLength.writeBigUInt64BE(BigInt(headerBytes.length));
  const bytes = Buffer.concat([
    ARCHIVE_MAGIC,
    headerLength,
    headerBytes,
    ...entries.map((entry) => entry.bytes),
  ]);
  return Object.freeze({
    schemaVersion: ARCHIVE_BUILD_SCHEMA,
    bytes,
    byteLength: bytes.length,
    sha256: sha256(bytes),
    header: deepFreeze(header),
    headerByteLength: headerBytes.length,
    headerSha256: sha256(headerBytes),
    compilerEntryCount: EXPECTED_COMPILER_COUNT,
    compilerEntriesNamesSha256: EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256,
    compilerEntriesContentManifestSha256: EXPECTED_ASSIGNMENT_COMPILER_CONTENT_SHA256,
    projectGraphCount: EXPECTED_PROJECT_COUNT,
    projectGraphNamesSha256: EXPECTED_ASSIGNMENT_PROJECT_GRAPH_NAMES_SHA256,
    projectGraphContentManifestSha256: EXPECTED_ASSIGNMENT_PROJECT_GRAPH_CONTENT_SHA256,
    declarationCount: EXPECTED_DECLARATION_COUNT,
    declarationNamesSha256: EXPECTED_ASSIGNMENT_DECLARATION_NAMES_SHA256,
    declarationContentManifestSha256: EXPECTED_ASSIGNMENT_DECLARATION_CONTENT_SHA256,
    runtimeSourceCount: EXPECTED_RUNTIME_SOURCE_COUNT,
    runtimeGraphNamesSha256: EXPECTED_ASSIGNMENT_RUNTIME_GRAPH_NAMES_SHA256,
    runtimeEdgeCount: EXPECTED_RUNTIME_EDGE_COUNT,
    runtimeEdgesSha256: EXPECTED_ASSIGNMENT_RUNTIME_EDGES_SHA256,
  });
}

function parseArchiveBytes(archiveBytes, expectedArchiveSha256 = null) {
  const bytes = Buffer.from(archiveBytes);
  if (expectedArchiveSha256 !== null) {
    assertSha256(expectedArchiveSha256, "expectedArchiveSha256");
    if (sha256(bytes) !== expectedArchiveSha256) {
      throw new Error("assignment archive descriptor digest mismatch");
    }
  }
  if (bytes.length < ARCHIVE_MAGIC.length + 8 ||
      !bytes.subarray(0, ARCHIVE_MAGIC.length).equals(ARCHIVE_MAGIC)) {
    throw new Error("assignment archive magic drifted");
  }
  const headerLengthBig = bytes.readBigUInt64BE(ARCHIVE_MAGIC.length);
  if (headerLengthBig > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("assignment archive header length is unsafe");
  }
  const headerLength = Number(headerLengthBig);
  const headerStart = ARCHIVE_MAGIC.length + 8;
  const payloadStart = headerStart + headerLength;
  if (headerLength < 3 || payloadStart > bytes.length) {
    throw new Error("assignment archive header is truncated");
  }
  const headerBytes = bytes.subarray(headerStart, payloadStart);
  let header;
  try {
    header = JSON.parse(headerBytes.toString("utf8"));
  } catch (error) {
    throw new Error("assignment archive header is not JSON", { cause: error });
  }
  if (!canonicalJsonBytes(header, "assignment archive header").equals(headerBytes)) {
    throw new Error("assignment archive header is not canonical");
  }
  if (header.schemaVersion !== ARCHIVE_SCHEMA ||
      header.virtualProjectRoot !== VIRTUAL_PROJECT_ROOT ||
      header.assignmentEntry !== ASSIGNMENT_ENTRY ||
      header.compilerEntryCount !== EXPECTED_COMPILER_COUNT ||
      header.compilerEntriesNamesSha256 !== EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256 ||
      header.compilerEntriesContentManifestSha256 !==
        EXPECTED_ASSIGNMENT_COMPILER_CONTENT_SHA256 ||
      !Array.isArray(header.compilerEntries) ||
      header.compilerEntries.length !== EXPECTED_COMPILER_COUNT) {
    throw new Error("assignment archive header binding drifted");
  }
  assertExactFrozenInput(
    header.compilerOptions,
    EXPECTED_ASSIGNMENT_COMPILER_OPTIONS,
    "archive compilerOptions",
  );
  const names = [];
  const contentRows = [];
  const entryMap = new Map();
  let offset = 0;
  for (const [index, entry] of header.compilerEntries.entries()) {
    const relativePath = assertRelativeArchivePath(
      entry.relativePath,
      `archive compilerEntries[${index}]`,
    );
    if (entry.offset !== offset || !Number.isSafeInteger(entry.byteLength) ||
        entry.byteLength < 0 || !["typescript", "json", "declaration"].includes(entry.kind)) {
      throw new Error(`${relativePath}: archive entry layout drifted`);
    }
    assertSha256(entry.sha256, `${relativePath} sha256`);
    const start = payloadStart + offset;
    const end = start + entry.byteLength;
    if (end > bytes.length) throw new Error(`${relativePath}: archive entry is truncated`);
    const entryBytes = bytes.subarray(start, end);
    if (sha256(entryBytes) !== entry.sha256) {
      throw new Error(`${relativePath}: archive entry digest drifted`);
    }
    if (entryMap.has(relativePath)) throw new Error(`${relativePath}: duplicate archive entry`);
    names.push(relativePath);
    contentRows.push({ relativePath, sha256: entry.sha256 });
    entryMap.set(relativePath, entryBytes);
    offset += entry.byteLength;
  }
  if (payloadStart + offset !== bytes.length || offset !== EXPECTED_COMPILER_BYTES ||
      JSON.stringify(names) !== JSON.stringify(EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS) ||
      sha256(canonicalNameManifest(names)) !== EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256 ||
      sha256(canonicalContentManifest(contentRows)) !==
        EXPECTED_ASSIGNMENT_COMPILER_CONTENT_SHA256) {
    throw new Error("assignment archive payload inventory drifted");
  }
  assertExactFrozenInput(
    header.projectGraph.names,
    EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS,
    "archive projectGraph",
  );
  assertExactFrozenInput(
    header.runtimeGraph.edges,
    EXPECTED_ASSIGNMENT_RUNTIME_EDGES,
    "archive runtimeEdges",
  );
  assertExactFrozenInput(
    header.runtimeGraph.sourceNames,
    EXPECTED_ASSIGNMENT_RUNTIME_SOURCE_PATHS,
    "archive runtime source graph",
  );
  return {
    bytes,
    header: deepFreeze(header),
    headerBytes,
    headerSha256: sha256(headerBytes),
    entryMap,
  };
}

export function parseCanonicalAssignmentArchive(
  archiveBytes,
  { expectedArchiveSha256 = null } = {},
) {
  const parsed = parseArchiveBytes(archiveBytes, expectedArchiveSha256);
  return Object.freeze({
    schemaVersion: "ca.signature-lab.assignment-archive-parse.v1",
    byteLength: parsed.bytes.length,
    sha256: sha256(parsed.bytes),
    header: parsed.header,
    headerSha256: parsed.headerSha256,
    entries: parsed.entryMap,
  });
}

export function assertRootOwnedExecutableChain(executablePath) {
  if (typeof executablePath !== "string" || !path.isAbsolute(executablePath)) {
    throw new Error("executable chain must start at one absolute root-owned path");
  }
  const resolved = path.resolve(executablePath);
  if (realpathSync(resolved) !== resolved) {
    throw new Error("executable chain may not contain a symbolic-link leaf");
  }
  const leaf = lstatSync(resolved);
  if (!leaf.isFile() || leaf.isSymbolicLink() || leaf.uid !== 0 || leaf.nlink < 1 ||
      (leaf.mode & 0o022) !== 0) {
    throw new Error("executable leaf is not one protected root-owned file");
  }
  let current = path.dirname(resolved);
  const directories = [];
  for (;;) {
    const identity = lstatSync(current);
    if (!identity.isDirectory() || identity.isSymbolicLink() || identity.uid !== 0 ||
        (identity.mode & 0o022) !== 0 || realpathSync(current) !== current) {
      throw new Error(`${current}: executable chain directory is writable or not root-owned`);
    }
    directories.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return deepFreeze({
    schemaVersion: "ca.signature-lab.root-owned-executable-chain.v1",
    executable: resolved,
    directories,
  });
}

function exactBoundAssignmentCapsuleMain() {
  "use strict";

  const { createHash } = require("node:crypto");
  const { readFileSync } = require("node:fs");
  const moduleApi = require("node:module");
  const nodePath = require("node:path");
  const vm = require("node:vm");

  const TYPESCRIPT_VERSION = "5.8.3";
  const TYPESCRIPT_SHA256 =
    "dd17428736a07e1db1a138d8a14295ddb2699ba780ee15038acdd2c6da5373a0";
  const TYPESCRIPT_BYTE_LENGTH = 9066411;
  const MAGIC = Buffer.from("CA_SIGNATURE_LAB_ASSIGNMENT_ARCHIVE_V1\n", "ascii");
  const SCHEMA = "ca.signature-lab.assignment-archive.v1";
  const VIRTUAL_ROOT = "/__ca_signature_lab__/project";
  const ENTRY = "data/signatureLabAssignments.test.ts";
  const COMPILER_COUNT = 656;
  const COMPILER_BYTES = 57349732;
  const COMPILER_NAMES_SHA256 =
    "155b9d6e82d7a4dc60eb1e5102f8ce45669e97a43ddc8871ebd721ce3fb247ce";
  const COMPILER_CONTENT_SHA256 =
    "761b44b92ad0a67484aadc2abf5dd76d8e4a0288318a007515576fb1e4e1b583";
  const PROJECT_COUNT = 53;
  const PROJECT_NAMES_SHA256 =
    "360aaa2c530f138ba81938c14f3b2a7d6849687c5332c04c9e3d4b88a9508990";
  const PROJECT_CONTENT_SHA256 =
    "1f70939a6c6ff9fe3e5031a5db3c3ff6bae6dcb758b5277c3d80e61fec6e5819";
  const DECLARATION_COUNT = 603;
  const DECLARATION_NAMES_SHA256 =
    "6a4e9b0a7cd48a02b02b1fc52971a6f0d6744f75a8edded0ded605ae377809d5";
  const DECLARATION_CONTENT_SHA256 =
    "915ee4cd0841d10c718a65cf825fdfe2d53783060bb937c3bce29c53396c7ec3";
  const RUNTIME_SOURCE_COUNT = 52;
  const RUNTIME_NAMES_SHA256 =
    "de55a35879b044185b9731be2e740a9125f4a894ced787de940d5e5da8e5ef5d";
  const RUNTIME_EDGE_COUNT = 63;
  const RUNTIME_EDGES_SHA256 =
    "6525e076c324ad92b7f459a172216155fd7423313ebf87aecec47ca4ec7aeb26";
  const ALLOWED_BUILTINS = new Set(["node:assert/strict", "node:test"]);

  function digest(value) {
    return createHash("sha256").update(value).digest("hex");
  }

  function canonical(value, label) {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) throw new Error(label + ": unsafe integer");
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((entry, index) => canonical(entry, label + "[" + index + "]"));
    }
    if (typeof value !== "object") throw new Error(label + ": unsupported value");
    const result = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) throw new Error(label + "." + key + ": undefined");
      result[key] = canonical(value[key], label + "." + key);
    }
    return result;
  }

  function canonicalBytes(value, label) {
    return Buffer.from(JSON.stringify(canonical(value, label)) + "\n", "utf8");
  }

  function assertHash(value, label) {
    if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error(label + ": invalid SHA-256");
  }

  function assertRelative(value, label) {
    if (typeof value !== "string" || value === "" || value.includes("\\") ||
        value.includes("\0") || nodePath.posix.isAbsolute(value) ||
        nodePath.posix.normalize(value) !== value || value.endsWith("/")) {
      throw new Error(label + ": invalid relative path");
    }
    if (value.split("/").some((part) => part === "" || part === "." || part === "..")) {
      throw new Error(label + ": invalid path component");
    }
    return value;
  }

  function nameManifest(names) {
    return Buffer.from(names.join("\n") + "\n", "utf8");
  }

  function contentManifest(entries) {
    return Buffer.from(
      entries.map((entry) => entry.relativePath + "\t" + entry.sha256).join("\n") + "\n",
      "utf8",
    );
  }

  function parseArchive(bytes, expectedSha256) {
    assertHash(expectedSha256, "archive digest argument");
    if (digest(bytes) !== expectedSha256) {
      throw new Error("assignment archive descriptor digest mismatch");
    }
    if (bytes.length < MAGIC.length + 8 || !bytes.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error("assignment archive magic drifted");
    }
    const lengthBig = bytes.readBigUInt64BE(MAGIC.length);
    if (lengthBig > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("assignment archive header length is unsafe");
    }
    const headerLength = Number(lengthBig);
    const headerStart = MAGIC.length + 8;
    const payloadStart = headerStart + headerLength;
    if (headerLength < 3 || payloadStart > bytes.length) {
      throw new Error("assignment archive header is truncated");
    }
    const headerBytes = bytes.subarray(headerStart, payloadStart);
    let header;
    try {
      header = JSON.parse(headerBytes.toString("utf8"));
    } catch (error) {
      throw new Error("assignment archive header is not JSON", { cause: error });
    }
    if (!canonicalBytes(header, "archive header").equals(headerBytes)) {
      throw new Error("assignment archive header is not canonical");
    }
    if (header.schemaVersion !== SCHEMA || header.virtualProjectRoot !== VIRTUAL_ROOT ||
        header.assignmentEntry !== ENTRY || header.compilerEntryCount !== COMPILER_COUNT ||
        header.compilerEntriesNamesSha256 !== COMPILER_NAMES_SHA256 ||
        header.compilerEntriesContentManifestSha256 !== COMPILER_CONTENT_SHA256 ||
        !Array.isArray(header.compilerEntries) ||
        header.compilerEntries.length !== COMPILER_COUNT) {
      throw new Error("assignment archive header binding drifted");
    }
    const entryMap = new Map();
    const entryMetadata = [];
    let offset = 0;
    for (const [index, entry] of header.compilerEntries.entries()) {
      const relativePath = assertRelative(entry.relativePath, "compiler entry " + index);
      if (entry.offset !== offset || !Number.isSafeInteger(entry.byteLength) ||
          entry.byteLength < 0 ||
          !["typescript", "json", "declaration"].includes(entry.kind)) {
        throw new Error(relativePath + ": archive layout drifted");
      }
      assertHash(entry.sha256, relativePath + " digest");
      const start = payloadStart + offset;
      const end = start + entry.byteLength;
      if (end > bytes.length) throw new Error(relativePath + ": truncated archive entry");
      const entryBytes = bytes.subarray(start, end);
      if (digest(entryBytes) !== entry.sha256) {
        throw new Error(relativePath + ": archive entry digest drifted");
      }
      if (entryMap.has(relativePath)) throw new Error(relativePath + ": duplicate entry");
      entryMap.set(relativePath, entryBytes);
      entryMetadata.push({ relativePath, sha256: entry.sha256, kind: entry.kind });
      offset += entry.byteLength;
    }
    const names = entryMetadata.map((entry) => entry.relativePath);
    if (payloadStart + offset !== bytes.length || offset !== COMPILER_BYTES ||
        digest(nameManifest(names)) !== COMPILER_NAMES_SHA256 ||
        digest(contentManifest(entryMetadata)) !== COMPILER_CONTENT_SHA256) {
      throw new Error("assignment archive compiler inventory drifted");
    }
    if (!header.projectGraph || header.projectGraph.count !== PROJECT_COUNT ||
        header.projectGraph.namesSha256 !== PROJECT_NAMES_SHA256 ||
        header.projectGraph.contentManifestSha256 !== PROJECT_CONTENT_SHA256 ||
        !Array.isArray(header.projectGraph.names) ||
        header.projectGraph.names.length !== PROJECT_COUNT ||
        digest(nameManifest(header.projectGraph.names)) !== PROJECT_NAMES_SHA256) {
      throw new Error("assignment archive project graph drifted");
    }
    const projectMetadata = header.projectGraph.names.map((name) => {
      const found = entryMetadata.find((entry) => entry.relativePath === name);
      if (!found) throw new Error(name + ": project entry unavailable");
      return found;
    });
    if (digest(contentManifest(projectMetadata)) !== PROJECT_CONTENT_SHA256) {
      throw new Error("assignment archive project bytes drifted");
    }
    const declarationMetadata = entryMetadata.filter((entry) => entry.kind === "declaration");
    if (!header.declarations || header.declarations.count !== DECLARATION_COUNT ||
        header.declarations.namesSha256 !== DECLARATION_NAMES_SHA256 ||
        header.declarations.contentManifestSha256 !== DECLARATION_CONTENT_SHA256 ||
        declarationMetadata.length !== DECLARATION_COUNT ||
        digest(nameManifest(declarationMetadata.map((entry) => entry.relativePath))) !==
          DECLARATION_NAMES_SHA256 ||
        digest(contentManifest(declarationMetadata)) !== DECLARATION_CONTENT_SHA256) {
      throw new Error("assignment archive declaration binding drifted");
    }
    if (!header.runtimeGraph || header.runtimeGraph.entry !== ENTRY ||
        header.runtimeGraph.sourceCount !== RUNTIME_SOURCE_COUNT ||
        header.runtimeGraph.namesSha256 !== RUNTIME_NAMES_SHA256 ||
        header.runtimeGraph.edgeCount !== RUNTIME_EDGE_COUNT ||
        header.runtimeGraph.edgesSha256 !== RUNTIME_EDGES_SHA256 ||
        !Array.isArray(header.runtimeGraph.sourceNames) ||
        !Array.isArray(header.runtimeGraph.edges) ||
        header.runtimeGraph.sourceNames.length !== RUNTIME_SOURCE_COUNT ||
        header.runtimeGraph.edges.length !== RUNTIME_EDGE_COUNT ||
        digest(nameManifest(header.runtimeGraph.sourceNames)) !== RUNTIME_NAMES_SHA256 ||
        digest(Buffer.from(
          header.runtimeGraph.edges.map((edge) => edge.join("\t")).join("\n") + "\n",
          "utf8",
        )) !== RUNTIME_EDGES_SHA256 ||
        JSON.stringify(header.runtimeGraph.allowedBuiltins) !==
          JSON.stringify(["node:assert/strict", "node:test"])) {
      throw new Error("assignment archive runtime binding drifted");
    }
    for (const [index, edge] of header.runtimeGraph.edges.entries()) {
      if (!Array.isArray(edge) || edge.length !== 3) {
        throw new Error("runtime edge " + index + ": malformed");
      }
      assertRelative(edge[0], "runtime edge importer");
      if (edge[1] === "") throw new Error("runtime edge has empty specifier");
      if (edge[2].startsWith("node:")) {
        if (!ALLOWED_BUILTINS.has(edge[2]) || edge[1] !== edge[2]) {
          throw new Error("runtime edge has undeclared builtin");
        }
      } else {
        assertRelative(edge[2], "runtime edge target");
        if (!entryMap.has(edge[2])) throw new Error("runtime edge target is unavailable");
      }
      if (!entryMap.has(edge[0])) throw new Error("runtime edge importer is unavailable");
    }
    return { header, entryMap, entryMetadata };
  }

  function assertTypeScriptBundle(bundleBytes) {
    if (bundleBytes.length !== TYPESCRIPT_BYTE_LENGTH ||
        digest(bundleBytes) !== TYPESCRIPT_SHA256) {
      throw new Error("TypeScript descriptor digest mismatch");
    }
  }

  function evaluateTypeScript(bundleBytes) {
    assertTypeScriptBundle(bundleBytes);
    let deniedFileSystemCalls = 0;
    const denyFileSystem = function denyFileSystem() {
      deniedFileSystemCalls += 1;
      throw new Error("TypeScript VM rejected unbound filesystem access");
    };
    denyFileSystem.native = denyFileSystem;
    const deniedFs = new Proxy(
      { realpathSync: denyFileSystem },
      { get(target, key) { return key in target ? target[key] : denyFileSystem; } },
    );
    const moduleRecord = { exports: {} };
    const sandbox = {
      module: moduleRecord,
      exports: moduleRecord.exports,
      require(specifier) {
        if (specifier === "fs") return deniedFs;
        if (specifier === "path") return nodePath;
        if (specifier === "os") {
          return Object.freeze({ platform: () => process.platform, EOL: "\n" });
        }
        if (specifier === "crypto") return require("node:crypto");
        if (specifier === "perf_hooks") return require("node:perf_hooks");
        throw new Error("TypeScript VM rejected undeclared require " + specifier);
      },
      __filename: "/__ca_signature_lab__/typescript.js",
      __dirname: "/__ca_signature_lab__",
      process,
      Buffer,
      console,
      setTimeout,
      clearTimeout,
      setImmediate,
      clearImmediate,
      performance: require("node:perf_hooks").performance,
    };
    vm.createContext(sandbox);
    new vm.Script(bundleBytes.toString("utf8"), {
      filename: sandbox.__filename,
    }).runInContext(sandbox, { timeout: 30_000 });
    const ts = moduleRecord.exports;
    if (!ts || ts.version !== TYPESCRIPT_VERSION || typeof ts.createProgram !== "function") {
      throw new Error("TypeScript VM version or API drifted");
    }
    return { ts, deniedFileSystemCalls };
  }

  function createArchiveCompiler(ts, archive) {
    const virtualMap = new Map();
    const entryKind = new Map();
    for (const entry of archive.entryMetadata) {
      const virtualPath = nodePath.posix.join(VIRTUAL_ROOT, entry.relativePath);
      virtualMap.set(virtualPath, archive.entryMap.get(entry.relativePath));
      entryKind.set(virtualPath, entry.kind);
    }
    const directories = new Set();
    const childDirectories = new Map();
    for (const fileName of virtualMap.keys()) {
      let directory = nodePath.posix.dirname(fileName);
      for (;;) {
        directories.add(directory);
        const parent = nodePath.posix.dirname(directory);
        if (parent === directory) break;
        const children = childDirectories.get(parent) || new Set();
        children.add(nodePath.posix.basename(directory));
        childDirectories.set(parent, children);
        directory = parent;
      }
    }
    const getVirtual = (candidate) => {
      const normalized = nodePath.posix.normalize(candidate);
      if (normalized !== VIRTUAL_ROOT && !normalized.startsWith(VIRTUAL_ROOT + "/")) {
        return null;
      }
      return normalized;
    };
    const sourceMisses = [];
    const host = {
      getSourceFile(fileName, languageVersionOrOptions) {
        const normalized = getVirtual(fileName);
        const bytes = normalized === null ? undefined : virtualMap.get(normalized);
        if (bytes === undefined) {
          sourceMisses.push(fileName);
          return undefined;
        }
        const scriptKind = entryKind.get(normalized) === "json"
          ? ts.ScriptKind.JSON
          : undefined;
        return ts.createSourceFile(
          normalized,
          bytes.toString("utf8"),
          languageVersionOrOptions,
          true,
          scriptKind,
        );
      },
      getDefaultLibFileName(options) {
        return nodePath.posix.join(
          VIRTUAL_ROOT,
          "node_modules/typescript/lib",
          ts.getDefaultLibFileName(options),
        );
      },
      getDefaultLibLocation() {
        return nodePath.posix.join(VIRTUAL_ROOT, "node_modules/typescript/lib");
      },
      writeFile() {
        throw new Error("assignment CompilerHost rejected output");
      },
      getCurrentDirectory() { return VIRTUAL_ROOT; },
      getCanonicalFileName(fileName) { return fileName; },
      useCaseSensitiveFileNames() { return true; },
      getNewLine() { return "\n"; },
      fileExists(fileName) {
        const normalized = getVirtual(fileName);
        return normalized !== null && virtualMap.has(normalized);
      },
      readFile(fileName) {
        const normalized = getVirtual(fileName);
        const bytes = normalized === null ? undefined : virtualMap.get(normalized);
        return bytes === undefined ? undefined : bytes.toString("utf8");
      },
      directoryExists(directoryName) {
        const normalized = getVirtual(directoryName);
        return normalized !== null && directories.has(normalized);
      },
      getDirectories(directoryName) {
        const normalized = getVirtual(directoryName);
        return normalized === null
          ? []
          : [...(childDirectories.get(normalized) || [])].sort();
      },
      readDirectory(directoryName, extensions) {
        const normalized = getVirtual(directoryName);
        if (normalized === null) return [];
        return [...virtualMap.keys()].filter((fileName) =>
          fileName.startsWith(normalized + "/") &&
          (!extensions || extensions.some((extension) => fileName.endsWith(extension))));
      },
      realpath(candidate) {
        const normalized = getVirtual(candidate);
        return normalized === null ? candidate : normalized;
      },
    };
    const reviewed = archive.header.compilerOptions;
    const options = {
      target: ts.ScriptTarget[reviewed.target],
      lib: [...reviewed.lib],
      allowJs: reviewed.allowJs,
      checkJs: reviewed.checkJs,
      skipLibCheck: reviewed.skipLibCheck,
      strict: reviewed.strict,
      noEmit: reviewed.noEmit,
      esModuleInterop: reviewed.esModuleInterop,
      module: ts.ModuleKind[reviewed.module],
      moduleResolution: ts.ModuleResolutionKind[reviewed.moduleResolution],
      resolveJsonModule: reviewed.resolveJsonModule,
      isolatedModules: reviewed.isolatedModules,
      jsx: ts.JsxEmit[reviewed.jsx],
      incremental: reviewed.incremental,
      plugins: [],
      paths: reviewed.paths,
      pathsBasePath: VIRTUAL_ROOT,
      configFilePath: nodePath.posix.join(VIRTUAL_ROOT, "tsconfig.json"),
    };
    if (![options.target, options.module, options.moduleResolution, options.jsx]
      .every((value) => Number.isInteger(value))) {
      throw new Error("TypeScript compiler-option enum drifted");
    }
    const program = ts.createProgram({
      rootNames: [nodePath.posix.join(VIRTUAL_ROOT, ENTRY)],
      options,
      host,
    });
    if (sourceMisses.length !== 0) {
      throw new Error("assignment CompilerHost missed " + sourceMisses.join(", "));
    }
    const compilerNames = program.getSourceFiles()
      .map((sourceFile) => nodePath.posix.relative(VIRTUAL_ROOT, sourceFile.fileName))
      .sort();
    const projectGraph = compilerNames
      .filter((relativePath) => !relativePath.startsWith("node_modules/"))
      .sort();
    if (compilerNames.length !== COMPILER_COUNT ||
        digest(nameManifest(compilerNames)) !== COMPILER_NAMES_SHA256 ||
        projectGraph.length !== PROJECT_COUNT ||
        digest(nameManifest(projectGraph)) !== PROJECT_NAMES_SHA256 ||
        JSON.stringify(projectGraph) !== JSON.stringify(archive.header.projectGraph.names)) {
      throw new Error("assignment CompilerHost graph drifted");
    }
    return { program, host, options, projectGraph, compilerNames };
  }

  async function runTap(archive) {
    if (typeof moduleApi.registerHooks !== "function" ||
        typeof moduleApi.stripTypeScriptTypes !== "function") {
      throw new Error("Node assignment runtime APIs are unavailable");
    }
    const edgeMap = new Map();
    for (const edge of archive.header.runtimeGraph.edges) {
      const key = edge[0] + "\0" + edge[1];
      if (edgeMap.has(key)) throw new Error("duplicate runtime resolution edge");
      edgeMap.set(key, edge[2]);
    }
    const urlByPath = new Map();
    const pathByUrl = new Map();
    for (const relativePath of archive.header.runtimeGraph.sourceNames) {
      const url = "ca-assignment:///" + relativePath
        .split("/").map(encodeURIComponent).join("/");
      urlByPath.set(relativePath, url);
      pathByUrl.set(url, relativePath);
    }
    const loaded = new Set();
    const entryUrl = urlByPath.get(ENTRY);
    moduleApi.registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === entryUrl && !pathByUrl.has(context.parentURL)) {
          return { url: entryUrl, format: "module", shortCircuit: true };
        }
        const importer = pathByUrl.get(context.parentURL);
        if (importer === undefined) {
          throw new Error("assignment runtime rejected an unbound importer");
        }
        const target = edgeMap.get(importer + "\0" + specifier);
        if (target === undefined) {
          throw new Error("assignment runtime rejected an undeclared module import");
        }
        if (target.startsWith("node:")) {
          if (!ALLOWED_BUILTINS.has(target) || target !== specifier) {
            throw new Error("assignment runtime rejected an undeclared builtin");
          }
          return nextResolve(specifier, context);
        }
        const url = urlByPath.get(target);
        if (url === undefined) throw new Error("assignment runtime target is unavailable");
        if (target.endsWith(".json")) {
          return {
            url,
            format: "json",
            importAttributes: { type: "json" },
            shortCircuit: true,
          };
        }
        return { url, format: "module", shortCircuit: true };
      },
      load(url, context, nextLoad) {
        if (url.startsWith("node:")) return nextLoad(url, context);
        const relativePath = pathByUrl.get(url);
        if (relativePath === undefined) {
          throw new Error("assignment runtime rejected an undeclared load");
        }
        const bytes = archive.entryMap.get(relativePath);
        if (bytes === undefined) throw new Error("assignment runtime bytes are unavailable");
        loaded.add(relativePath);
        if (relativePath.endsWith(".json")) {
          return { format: "json", source: bytes, shortCircuit: true };
        }
        if (/\.(?:ts|tsx|mts|cts)$/u.test(relativePath)) {
          return {
            format: "module",
            source: moduleApi.stripTypeScriptTypes(bytes.toString("utf8"), {
              mode: "transform",
              sourceMap: false,
              sourceUrl: url,
            }),
            shortCircuit: true,
          };
        }
        return { format: "module", source: bytes, shortCircuit: true };
      },
    });
    await import(entryUrl);
    const loadedNames = [...loaded].sort();
    if (loadedNames.length !== RUNTIME_SOURCE_COUNT ||
        digest(nameManifest(loadedNames)) !== RUNTIME_NAMES_SHA256 ||
        JSON.stringify(loadedNames) !==
          JSON.stringify(archive.header.runtimeGraph.sourceNames)) {
      throw new Error("assignment runtime loaded-source inventory drifted");
    }
  }

  async function main() {
    const mode = process.argv[1];
    const expectedArchiveSha256 = process.argv[2];
    if (!new Set(["graph", "typecheck", "tap"]).has(mode) || process.argv.length !== 3) {
      throw new Error("assignment capsule argv drifted");
    }
    const typescriptBytes = readFileSync(3);
    const archiveBytes = readFileSync(4);
    const archive = parseArchive(archiveBytes, expectedArchiveSha256);
    if (mode === "tap") {
      assertTypeScriptBundle(typescriptBytes);
      await runTap(archive);
      return;
    }
    const evaluated = evaluateTypeScript(typescriptBytes);
    const compiled = createArchiveCompiler(evaluated.ts, archive);
    if (mode === "typecheck") {
      const diagnostics = evaluated.ts.getPreEmitDiagnostics(compiled.program);
      if (diagnostics.length !== 0) {
        process.stderr.write(evaluated.ts.formatDiagnosticsWithColorAndContext(
          diagnostics,
          compiled.host,
        ));
        process.exitCode = 1;
      }
      return;
    }
    process.stdout.write(compiled.projectGraph.join("\n") + "\n");
  }

  main().catch((error) => {
    const name = error && error.name ? error.name : "Error";
    const message = error && error.message ? error.message : String(error);
    process.stderr.write(name + ": " + message + "\n");
    process.exitCode = 1;
  });
}

export const EXACT_BOUND_ASSIGNMENT_CAPSULE_SOURCE =
  `"use strict";(${exactBoundAssignmentCapsuleMain.toString()})();`;
export const EXACT_BOUND_ASSIGNMENT_CAPSULE_SHA256 = sha256(
  Buffer.from(EXACT_BOUND_ASSIGNMENT_CAPSULE_SOURCE, "utf8"),
);

export function exactBoundAssignmentArgv({
  nodePath,
  mode,
  expectedArchiveSha256,
}) {
  if (typeof nodePath !== "string" || nodePath === "") {
    throw new Error("nodePath: expected one executable path");
  }
  if (!["graph", "typecheck", "tap"].includes(mode)) {
    throw new Error("assignment capsule mode is not reviewed");
  }
  assertSha256(expectedArchiveSha256, "expectedArchiveSha256");
  return Object.freeze([
    nodePath,
    "--disable-warning=ExperimentalWarning",
    ...(mode === "tap" ? ["--test-reporter=tap"] : []),
    "--eval",
    EXACT_BOUND_ASSIGNMENT_CAPSULE_SOURCE,
    "--",
    mode,
    expectedArchiveSha256,
  ]);
}

export function runExactBoundSignatureAssignment({
  nodePath,
  typescriptFd,
  archiveFd,
  mode,
  expectedArchiveSha256,
  cwd,
  environment,
}) {
  if (!Number.isInteger(typescriptFd) || typescriptFd < 0 ||
      !Number.isInteger(archiveFd) || archiveFd < 0 || typescriptFd === archiveFd) {
    throw new Error("assignment capsule requires two distinct held descriptors");
  }
  for (const [descriptor, label] of [
    [typescriptFd, "TypeScript descriptor"],
    [archiveFd, "assignment archive descriptor"],
  ]) {
    const identity = fstatSync(descriptor);
    if (!identity.isFile() || identity.nlink < 1) {
      throw new Error(`${label}: expected one held regular file`);
    }
  }
  assertRootOwnedExecutableChain(nodePath);
  const argv = exactBoundAssignmentArgv({ nodePath, mode, expectedArchiveSha256 });
  try {
    return spawnSync(argv[0], argv.slice(1), {
      cwd,
      env: environment,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe", typescriptFd, archiveFd],
    });
  } catch (error) {
    return {
      error,
      status: null,
      signal: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
    };
  }
}
