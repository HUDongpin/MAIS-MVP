import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const DESIGN_REGISTRATION_HASH = "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632";
const DESIGN_PACKAGE_ROOT_HASH = "66a78409c64d65fa8d7e0208386f2046b276de5295602261fdb41e53e08544a1";
const RUNNER_COMMIT = "1dc093a1d0a300495dcd671091c849d24410fd5e";
const RUNNER_SOURCE_MANIFEST_ROOT_HASH = "2d333700f464fc856beea60f8f96c276eaaaaaed10b476b841c06ba4b9a127b0";
const RUNNER_HASH = "cfef4f67e1c294e60f10de594dea59828c4f4a94b8465e55ab36b5b65285789c";
const ADAPTER_HASH = "63beb1ca15a26c71563a73447f347383bdaa31cb27a2b932b33d534007767013";
const CUSTODY_REGISTRY_HASH = "aa48b5d02996ceed02daff2579b8961a4e5ea3c373dfdc023085fa181c2914a1";
const DESIGN_DIRECTORY = "coordination/research/mais-natural-ca60-v1/versions/design-v5";
const RUNNER_DIRECTORY = "coordination/content-qa/mais-natural-ca60-v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_SHA1 = /^[0-9a-f]{40}$/u;

export function canonicalJsonIndependent(value) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("non-finite number is not canonical JSON");
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError("undefined is not canonical JSON");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJsonIndependent).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJsonIndependent(value[key])}`).join(",")}}`;
}

export function independentHash(value) {
  return createHash("sha256").update(Buffer.from(canonicalJsonIndependent(value), "utf8")).digest("hex");
}

function byteHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function cloneWithout(value, field) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy[field];
  return copy;
}

function safeRelativePath(value) {
  return typeof value === "string"
    && value.length > 0
    && !path.isAbsolute(value)
    && !value.split(/[\\/]/u).includes("..")
    && !value.includes("\0");
}

function gitBytes(repoRoot, commit, relativePath) {
  if (!GIT_SHA1.test(commit) || !safeRelativePath(relativePath)) throw new Error("unsafe Git object request");
  return execFileSync("git", ["show", `${commit}:${relativePath}`], {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitCommitExists(repoRoot, commit) {
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function gitCommitIsAncestor(repoRoot, ancestor) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, "HEAD"], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function addCheck(checks, code, passed, expected = null, observed = null) {
  checks.push(Object.freeze({ code, passed: passed === true, expected, observed }));
}

function sortedManifest(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ({
    path: entry?.path,
    byteLength: entry?.byteLength,
    sha256: entry?.sha256,
  })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

async function verifyDesignPackage(repoRoot, checks) {
  const registrationPath = path.join(repoRoot, DESIGN_DIRECTORY, "design-registration.json");
  const packageManifestPath = path.join(repoRoot, DESIGN_DIRECTORY, "package-manifest.json");
  const activePointerPath = path.join(repoRoot, "coordination/research/mais-natural-ca60-v1/ACTIVE-DESIGN-REGISTRATION.json");
  const [registration, packageManifest, activePointer] = await Promise.all([
    readJson(registrationPath),
    readJson(packageManifestPath),
    readJson(activePointerPath),
  ]);

  const recomputedRegistrationHash = independentHash(cloneWithout(registration, "registrationHash"));
  addCheck(checks, "DESIGN_ID_EXACT", registration.designId === DESIGN_ID, DESIGN_ID, registration.designId ?? null);
  addCheck(checks, "DESIGN_REGISTRATION_SELF_HASH", recomputedRegistrationHash === registration.registrationHash,
    registration.registrationHash ?? null, recomputedRegistrationHash);
  addCheck(checks, "DESIGN_REGISTRATION_EXPECTED_ROOT", registration.registrationHash === DESIGN_REGISTRATION_HASH,
    DESIGN_REGISTRATION_HASH, registration.registrationHash ?? null);
  addCheck(checks, "DESIGN_ZERO_PROVIDER_EVENTS",
    registration.providerEventCount === 0 && registration.preExecutionState?.providerEventCount === 0,
    0, registration.providerEventCount ?? null);
  addCheck(checks, "DESIGN_REMAINS_NONAUTHORIZING",
    registration.firstProviderExecutionAllowed === false
      && registration.providerControls?.firstProviderExecutionAllowed === false
      && registration.providerControls?.currentOpenAIReferenceAuthorizationHash === null
      && registration.providerControls?.currentDeepSeekAuthorizationHash === null,
    false, registration.firstProviderExecutionAllowed ?? null);
  addCheck(checks, "OPENAI_REFERENCE_TUPLE_EXACT",
    registration.providerControls?.openaiReferenceEnvelope?.provider === "OPENAI_DIRECT"
      && registration.providerControls?.openaiReferenceEnvelope?.projectResidency === "US_STORAGE_PROCESSING"
      && registration.providerControls?.openaiReferenceEnvelope?.endpoint === "https://us.api.openai.com/v1/responses"
      && registration.providerControls?.openaiReferenceEnvelope?.requestedModel === "gpt-5.6-luna"
      && registration.providerControls?.openaiReferenceEnvelope?.apiSurface === "RESPONSES_API_V1",
    "OPENAI_DIRECT|US_STORAGE_PROCESSING|https://us.api.openai.com/v1/responses|gpt-5.6-luna|RESPONSES_API_V1",
    null);
  addCheck(checks, "DECISION_CEILING_EXACT",
    registration.scope?.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE"
      && registration.analysis?.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE"
      && registration.analysis?.structuralFeasibility?.ca60CanSimultaneouslyMeetSurfaceConfidenceGates === false,
    "INCONCLUSIVE_MACHINE_REFERENCE", registration.analysis?.decisionCeiling ?? null);
  addCheck(checks, "THRESHOLD_CHRONOLOGY_PRE_EXECUTION",
    Number.isFinite(Date.parse(registration.thresholdsFrozenAt))
      && Number.isFinite(Date.parse(registration.frozenAt))
      && Date.parse(registration.thresholdsFrozenAt) <= Date.parse(registration.frozenAt)
      && registration.providerEventCount === 0,
    "thresholdsFrozenAt<=frozenAt before provider event", null);

  const observedEntries = [];
  let packageEntryBytesValid = true;
  for (const entry of sortedManifest(packageManifest.entries)) {
    if (!safeRelativePath(entry.path) || !Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0 || !SHA256.test(entry.sha256 ?? "")) {
      packageEntryBytesValid = false;
      continue;
    }
    const bytes = await readFile(path.join(repoRoot, DESIGN_DIRECTORY, entry.path));
    const observed = { path: entry.path, byteLength: bytes.byteLength, sha256: byteHash(bytes) };
    observedEntries.push(observed);
    if (canonicalJsonIndependent(observed) !== canonicalJsonIndependent(entry)) packageEntryBytesValid = false;
  }
  const normalizedDeclaredEntries = sortedManifest(packageManifest.entries);
  const recomputedPackageRoot = independentHash(observedEntries);
  addCheck(checks, "DESIGN_PACKAGE_ENTRY_BYTES", packageEntryBytesValid
    && canonicalJsonIndependent(observedEntries) === canonicalJsonIndependent(normalizedDeclaredEntries),
  "all package manifest bytes", packageEntryBytesValid ? "matched" : "mismatch");
  addCheck(checks, "DESIGN_PACKAGE_ROOT", recomputedPackageRoot === packageManifest.packageRootHash,
    packageManifest.packageRootHash ?? null, recomputedPackageRoot);
  addCheck(checks, "DESIGN_PACKAGE_EXPECTED_ROOT", packageManifest.packageRootHash === DESIGN_PACKAGE_ROOT_HASH,
    DESIGN_PACKAGE_ROOT_HASH, packageManifest.packageRootHash ?? null);
  addCheck(checks, "DESIGN_PACKAGE_SELF_HASH",
    independentHash(cloneWithout(packageManifest, "selfHash")) === packageManifest.selfHash,
    packageManifest.selfHash ?? null, independentHash(cloneWithout(packageManifest, "selfHash")));
  addCheck(checks, "DESIGN_PACKAGE_BINDS_REGISTRATION",
    packageManifest.registrationHash === registration.registrationHash,
    registration.registrationHash ?? null, packageManifest.registrationHash ?? null);

  addCheck(checks, "ACTIVE_POINTER_REMAINS_V3",
    activePointer.activeDesignId === "MAIS-NATURAL-CA60-V3"
      && activePointer.activeRegistrationHash === "08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d"
      && activePointer.firstProviderExecutionAllowed === false,
    "MAIS-NATURAL-CA60-V3", activePointer.activeDesignId ?? null);

  return { registration, packageManifest, activePointer };
}

function sourcePrimitiveScan(sourceRows) {
  const callWord = ["fet", "ch"].join("");
  const environmentWord = ["process", "env"].join("\\.");
  const keyWord = ["OPENAI", "API", "KEY"].join("_");
  const forbidden = [
    { code: "DIRECT_HTTP_FETCH", expression: new RegExp(`\\b${callWord}\\s*\\(`, "u"), category: "network" },
    { code: "DIRECT_NODE_HTTP", expression: new RegExp(["https?", "request"].join("\\."), "u"), category: "network" },
    { code: "NODE_SOCKET_IMPORT", expression: new RegExp(["node:", "(?:net|tls)"].join(""), "u"), category: "network" },
    { code: "PROCESS_ENV_ACCESS", expression: new RegExp(environmentWord, "u"), category: "credential" },
    { code: "OPENAI_KEY_NAME", expression: new RegExp(keyWord, "u"), category: "credential" },
    { code: "OPENAI_SDK_IMPORT", expression: new RegExp(["from\\s+[\"']", "open", "ai", "[\"']"].join(""), "u"), category: "network" },
  ];
  const findings = [];
  for (const row of sourceRows) {
    for (const rule of forbidden) {
      if (rule.expression.test(row.source)) findings.push({ path: row.path, code: rule.code, category: rule.category });
    }
  }
  return findings;
}

async function verifyCustody(repoRoot, custodyRegistryPath, checks) {
  const [registry, metadata] = await Promise.all([readJson(custodyRegistryPath), stat(custodyRegistryPath)]);
  addCheck(checks, "CUSTODY_FILE_MODE_0600", (metadata.mode & 0o777) === 0o600, "0600", `0${(metadata.mode & 0o777).toString(8)}`);
  const recomputedRegistryHash = independentHash(cloneWithout(registry, "registryHash"));
  addCheck(checks, "CUSTODY_SELF_HASH", recomputedRegistryHash === registry.registryHash,
    registry.registryHash ?? null, recomputedRegistryHash);
  addCheck(checks, "CUSTODY_EXPECTED_ROOT", registry.registryHash === CUSTODY_REGISTRY_HASH,
    CUSTODY_REGISTRY_HASH, registry.registryHash ?? null);
  addCheck(checks, "CUSTODY_DESIGN_BINDING",
    registry.designId === DESIGN_ID && registry.designRegistrationHash === DESIGN_REGISTRATION_HASH
      && registry.registrationPackageRootHash === DESIGN_PACKAGE_ROOT_HASH,
    `${DESIGN_ID}|${DESIGN_REGISTRATION_HASH}|${DESIGN_PACKAGE_ROOT_HASH}`, null);
  addCheck(checks, "CUSTODY_NONAUTHORIZING",
    registry.providerExecutionAuthorized === false && registry.aggregatePublicationAuthorized === false,
    false, registry.providerExecutionAuthorized ?? null);
  addCheck(checks, "CUSTODY_RUNNER_COMMIT", registry.runnerCommit === RUNNER_COMMIT,
    RUNNER_COMMIT, registry.runnerCommit ?? null);
  addCheck(checks, "RUNNER_COMMIT_EXISTS", gitCommitExists(repoRoot, registry.runnerCommit), true, null);
  addCheck(checks, "RUNNER_COMMIT_ANCESTOR_OF_REVIEW_HEAD", gitCommitIsAncestor(repoRoot, registry.runnerCommit), true, null);

  const declaredManifest = sortedManifest(registry.runnerSourceManifest);
  const recomputedManifestRoot = independentHash(declaredManifest);
  addCheck(checks, "RUNNER_SOURCE_MANIFEST_ROOT", recomputedManifestRoot === registry.runnerSourceManifestRootHash,
    registry.runnerSourceManifestRootHash ?? null, recomputedManifestRoot);
  addCheck(checks, "RUNNER_SOURCE_EXPECTED_ROOT", registry.runnerSourceManifestRootHash === RUNNER_SOURCE_MANIFEST_ROOT_HASH,
    RUNNER_SOURCE_MANIFEST_ROOT_HASH, registry.runnerSourceManifestRootHash ?? null);
  addCheck(checks, "RUNNER_SOURCE_FILE_COUNT", declaredManifest.length === 17, 17, declaredManifest.length);

  let committedBytesValid = true;
  const sourceRows = [];
  for (const entry of declaredManifest) {
    if (!safeRelativePath(entry.path) || !entry.path.startsWith(`${RUNNER_DIRECTORY}/`)
      || !Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0 || !SHA256.test(entry.sha256 ?? "")) {
      committedBytesValid = false;
      continue;
    }
    let bytes;
    try {
      bytes = gitBytes(repoRoot, registry.runnerCommit, entry.path);
    } catch {
      committedBytesValid = false;
      continue;
    }
    if (bytes.byteLength !== entry.byteLength || byteHash(bytes) !== entry.sha256) committedBytesValid = false;
    if (/\.(?:mjs|ts)$/u.test(entry.path)) sourceRows.push({ path: entry.path, source: bytes.toString("utf8") });
  }
  addCheck(checks, "RUNNER_COMMITTED_BYTES", committedBytesValid, "all 17 Git object rows match", committedBytesValid ? "matched" : "mismatch");

  const adapterRow = declaredManifest.filter((entry) => entry.path === `${RUNNER_DIRECTORY}/openai-reference-adapter-v5.mjs`);
  addCheck(checks, "ADAPTER_UNIQUE_SOURCE_ROW", adapterRow.length === 1, 1, adapterRow.length);
  addCheck(checks, "ADAPTER_HASH", adapterRow.length === 1 && adapterRow[0].sha256 === registry.adapterHash
    && registry.adapterHash === ADAPTER_HASH,
  ADAPTER_HASH, registry.adapterHash ?? null);

  const recomputedRunnerHash = independentHash({
    designRegistrationHash: registry.designRegistrationHash,
    registrationPackageRootHash: registry.registrationPackageRootHash,
    runnerCommit: registry.runnerCommit,
    runnerSourceManifestRootHash: registry.runnerSourceManifestRootHash,
    adapterHash: registry.adapterHash,
  });
  addCheck(checks, "RUNNER_HASH", recomputedRunnerHash === registry.runnerHash,
    registry.runnerHash ?? null, recomputedRunnerHash);
  addCheck(checks, "RUNNER_EXPECTED_ROOT", registry.runnerHash === RUNNER_HASH, RUNNER_HASH, registry.runnerHash ?? null);

  const primitiveFindings = sourcePrimitiveScan(sourceRows);
  const networkFindings = primitiveFindings.filter((finding) => finding.category === "network");
  const credentialFindings = primitiveFindings.filter((finding) => finding.category === "credential");
  addCheck(checks, "NO_LIVE_NETWORK_PRIMITIVE", networkFindings.length === 0, 0, networkFindings.length);
  addCheck(checks, "NO_CREDENTIAL_PRIMITIVE", credentialFindings.length === 0, 0, credentialFindings.length);

  let cliSource = "";
  let guardSource = "";
  try {
    cliSource = gitBytes(repoRoot, registry.runnerCommit, `${RUNNER_DIRECTORY}/cli.mjs`).toString("utf8");
    guardSource = gitBytes(repoRoot, registry.runnerCommit, `${RUNNER_DIRECTORY}/authorization-guard-v5.mjs`).toString("utf8");
  } catch {
    // The committed-byte check above records this failure without exposing content.
  }
  addCheck(checks, "CLI_LABEL_OPENAI_ONLY", cliSource.includes('"label-openai"') && !cliSource.includes('"label-qwen"'),
    "label-openai", null);
  addCheck(checks, "PRODUCTION_GUARD_PINS_ON_DISK_ROOTS",
    guardSource.includes("ACTIVE-DESIGN-REGISTRATION.json")
      && guardSource.includes("versions/design-v5/design-registration.json")
      && guardSource.includes("FIXTURE_ONLY_NO_NETWORK_V2"),
    true, null);

  return {
    registry,
    primitiveFindings,
    networkPrimitiveDetected: networkFindings.length > 0,
    credentialPrimitiveDetected: credentialFindings.length > 0,
  };
}

export async function verifyPreactivationPackage({ repoRoot, custodyRegistryPath }) {
  if (typeof repoRoot !== "string" || !path.isAbsolute(repoRoot)) throw new Error("repoRoot must be absolute");
  if (typeof custodyRegistryPath !== "string" || !path.isAbsolute(custodyRegistryPath)) throw new Error("custodyRegistryPath must be absolute");
  const checks = [];
  let design;
  let custody;
  try {
    design = await verifyDesignPackage(repoRoot, checks);
  } catch (error) {
    addCheck(checks, "DESIGN_PACKAGE_READABLE", false, "readable", error instanceof Error ? error.name : "UnknownError");
  }
  try {
    custody = await verifyCustody(repoRoot, custodyRegistryPath, checks);
  } catch (error) {
    addCheck(checks, "CUSTODY_READABLE", false, "readable", error instanceof Error ? error.name : "UnknownError");
  }

  const decision = checks.length > 0 && checks.every((check) => check.passed) ? "CONCURRED" : "DISCREPANCY";
  const registry = custody?.registry ?? {};
  const activePointer = design?.activePointer ?? {};
  const body = {
    schemaVersion: "PreActivationIndependentVerificationV1",
    reviewerLane: "A11",
    provenanceType: "A11_INDEPENDENT_STATIC_AND_HASH_RECOMPUTATION",
    designId: DESIGN_ID,
    designRegistrationHash: design?.registration?.registrationHash ?? null,
    designPackageRootHash: design?.packageManifest?.packageRootHash ?? null,
    runnerCommit: registry.runnerCommit ?? null,
    runnerSourceManifestRootHash: registry.runnerSourceManifestRootHash ?? null,
    runnerHash: registry.runnerHash ?? null,
    adapterHash: registry.adapterHash ?? null,
    custodyRegistryHash: registry.registryHash ?? null,
    activeDesignId: activePointer.activeDesignId ?? null,
    activeRegistrationHash: activePointer.activeRegistrationHash ?? null,
    activeV5AtReview: activePointer.activeDesignId === DESIGN_ID
      && activePointer.activeRegistrationHash === DESIGN_REGISTRATION_HASH,
    providerEventCount: design?.registration?.providerEventCount ?? null,
    providerExecutionAuthorized: registry.providerExecutionAuthorized ?? null,
    aggregatePublicationAuthorized: registry.aggregatePublicationAuthorized ?? null,
    mainA21ModuleImported: false,
    networkPrimitiveDetected: custody?.networkPrimitiveDetected ?? null,
    credentialPrimitiveDetected: custody?.credentialPrimitiveDetected ?? null,
    checks,
    decision,
    limitations: [
      "PREACTIVATION_DESIGN_AND_RUNNER_REVIEW_ONLY",
      "NO_PROVIDER_CALL_OR_ROUTE_PROBE",
      "NOT_THE_POST_EXECUTION_60_ITEM_INDEPENDENT_RECOMPUTATION",
      "NOT_HUMAN_GOLD_LABEL_REVIEW",
      "DOES_NOT_AUTHORIZE_ACTIVE_POINTER_MUTATION_OR_PROVIDER_EXECUTION",
    ],
  };
  return Object.freeze({ ...body, verificationHash: independentHash(body) });
}

export function buildIndependentDesignReviewReceiptV1({ verification, reviewedAt }) {
  if (!verification || verification.decision !== "CONCURRED") throw new Error("a CONCURRED independent verification is required");
  if (!SHA256.test(verification.verificationHash ?? "")
    || independentHash(cloneWithout(verification, "verificationHash")) !== verification.verificationHash) {
    throw new Error("independent verification self hash is invalid");
  }
  if (typeof reviewedAt !== "string" || !Number.isFinite(Date.parse(reviewedAt))) throw new Error("reviewedAt must be a valid date-time");
  const body = {
    schemaVersion: "IndependentDesignReviewReceiptV1",
    designId: DESIGN_ID,
    designRegistrationHash: verification.designRegistrationHash,
    reviewedDesignPackageRootHash: verification.designPackageRootHash,
    runnerCommit: verification.runnerCommit,
    runnerHash: verification.runnerHash,
    adapterHash: verification.adapterHash,
    reviewerLane: "A11",
    decision: "CONCURRED",
    reviewedAt,
  };
  return Object.freeze({ ...body, reviewHash: independentHash(body) });
}

async function main() {
  const args = process.argv.slice(2);
  const repoIndex = args.indexOf("--repo-root");
  const custodyIndex = args.indexOf("--custody");
  if (repoIndex < 0 || custodyIndex < 0 || !args[repoIndex + 1] || !args[custodyIndex + 1]) {
    throw new Error("usage: independent-preactivation-verifier.mjs --repo-root ABSOLUTE --custody ABSOLUTE");
  }
  const result = await verifyPreactivationPackage({
    repoRoot: path.resolve(args[repoIndex + 1]),
    custodyRegistryPath: path.resolve(args[custodyIndex + 1]),
  });
  process.stdout.write(`${canonicalJsonIndependent(result)}\n`);
  process.exitCode = result.decision === "CONCURRED" ? 0 : 2;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = path.resolve(decodeURIComponent(new URL(import.meta.url).pathname));
if (invokedPath === modulePath) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "A11_VERIFIER_FAILURE", redactedError: error instanceof Error ? error.name : "UnknownError" })}\n`);
    process.exitCode = 70;
  });
}
