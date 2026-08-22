import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign as signBytes
} from "node:crypto";
import { renameSync } from "node:fs";
import {
  chmod,
  link,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  symlink
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import * as lifecycle from "./california-signature-exhaustive-artifact-lifecycle";

const GLOBAL_LEDGER_ROOT =
  "/Volumes/Starship/.california-signature-measured-authorization-ledger-v1";
const LEDGER_ANCHOR_FILENAME =
  ".california-signature-measured-authorization-ledger-root.json";
const LEDGER_ANCHOR_SCHEMA =
  "ca.california-signature.measured-authorization-ledger-root.v1";
const V3_RECEIPT_SCHEMA =
  "ca.california-signature.measured-authorization.v3";
const V2_RECEIPT_SCHEMA =
  "ca.california-signature.measured-authorization.v2";
const V2_CONSUMPTION_SCHEMA =
  "ca.california-signature.measured-authorization-consumption.v2";
const REQUEST_SCHEMA =
  "ca.california-signature.measured-authorization-request.v1";
const CONSUMPTION_SUFFIX = ".measured-authorization-consumed.json";
const REVIEWER_KEY_ID = "root-authority-reviewer-ed25519-0123456789abcdef";
const TEST_ONLY_LEDGER_DISJOINTNESS_GUARD =
  "assertTestOnlyMeasuredAuthorizationRootDisjointFromProductionLedger";
const TEST_ONLY_LEDGER_DISJOINTNESS_ERROR =
  "California signature test-only measured-authorization ledger root must be disjoint from the fixed production ledger root";

type LaunchCommand = {
  projects: readonly ["desktop-chrome", "mobile-chrome"];
  repeatEach: 1;
  reporter: "json";
  retries: 0;
  specPath: "tests/e2e/california-signature-exhaustive.spec.ts";
  workers: 1;
};

type LaunchContext = {
  attemptId: string;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: LaunchCommand;
  requiredProjects: readonly ["desktop-chrome", "mobile-chrome"];
  sourceSnapshotSha256: string;
};

type AttemptLedgerIdentity = {
  anchorSha256: string;
  ledgerId: string;
  rootBirthtimeNs: string;
  rootDev: string;
  rootIno: string;
  rootPathSha256: string;
};

type V3Payload = {
  attemptId: string;
  attemptLedger: AttemptLedgerIdentity;
  authorizationNonce: string;
  authorizationRequestSha256: string;
  buildId: string;
  decision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS";
  executionPlanSha256: string;
  expiresAt: string;
  issuedAt: string;
  launchCommand: LaunchCommand;
  maxInvocations: 1;
  requiredProjects: readonly ["desktop-chrome", "mobile-chrome"];
  retryAuthorized: false;
  sourceSnapshotSha256: string;
};

type V2Payload = Omit<
  V3Payload,
  "attemptLedger" | "authorizationRequestSha256"
>;

type ReaderOptions = {
  allowedRoot: string;
  authorizationRequest: LoadedAuthorizationRequest;
  expectedSha256: string;
  receiptPath: string;
};

type TestingReaderOptions = ReaderOptions & {
  testOnlyAttemptLedgerRoot: string;
  testOnlyTrustedReviewerPublicKeys: ReadonlyMap<string, string>;
};

type LoadedReceipt = {
  authorization: unknown;
  fileSha256: string;
};

type AuthorizationRequestBuildInputs = {
  acceptanceRunId: string;
  attemptId: string;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: LaunchCommand;
  matrixRunId: string;
  origin: string;
  runtimeRunId: string;
  sourceSnapshotSha256: string;
};

type TestingAuthorizationRequestBuildInputs =
  AuthorizationRequestBuildInputs & {
    testOnlyLedgerAuthority: AttemptLedgerIdentity;
  };

type AuthorizationRequest = {
  acceptanceRunId: string;
  attemptId: string;
  attemptLedger: AttemptLedgerIdentity;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: LaunchCommand;
  matrixRunId: string;
  maxInvocations: 1;
  origin: string;
  requestedDecision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS";
  requiredProjects: readonly ["desktop-chrome", "mobile-chrome"];
  retryAuthorized: false;
  runtimeRunId: string;
  schema: typeof REQUEST_SCHEMA;
  sourceSnapshotSha256: string;
  status: "AWAITING_OWNER_REVIEW";
};

type LoadedAuthorizationRequest = {
  fileSha256: string;
  request: AuthorizationRequest;
};

type AuthorizationRequestPublicationPreparation = Readonly<{
  authorizationRequestSha256: string;
  canonicalRequest: AuthorizationRequest;
  canonicalRequestUtf8: string;
}>;

type AuthorizationRequestReaderOptions = {
  allowedRoot: string;
  expectedRequest: AuthorizationRequest;
  expectedSha256: string;
  requestPath: string;
};

type PublicationAuthorizationRequestReaderOptions =
  AuthorizationRequestReaderOptions & {
    expectedFileIdentity: Readonly<{
      dev: string;
      ino: string;
    }>;
  };

type TestingAuthorizationRequestReaderOptions =
  AuthorizationRequestReaderOptions & {
    testOnlyBeforeFinalVerification: () => void;
  };

type LaunchOptions<Result> = {
  authorization: unknown;
  launch: () => Result;
  launchContext: LaunchContext;
};

type TestingDurabilityEvent = Readonly<{
  kind:
    | "ROOT_FD_BOUND"
    | "MARKER_CREATED_EXCLUSIVE_AT_ROOT_FD"
    | "MARKER_WRITTEN"
    | "MARKER_FILE_FSYNCED"
    | "MARKER_SAME_FD_READBACK_VERIFIED"
    | "MARKER_ROOT_FSYNCED";
}>;

type TestingLaunchOptions<Result> = LaunchOptions<Result> & {
  testOnlyDurabilityObserver?: (event: TestingDurabilityEvent) => void;
};

type Api = {
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT?: unknown;
  prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication: (
    options: { request: unknown }
  ) => AuthorizationRequestPublicationPreparation;
  buildCaliforniaSignatureMeasuredAuthorizationRequest: (
    options: AuthorizationRequestBuildInputs
  ) => AuthorizationRequest;
  __testingBuildCaliforniaSignatureMeasuredAuthorizationRequest: (
    options: TestingAuthorizationRequestBuildInputs
  ) => AuthorizationRequest;
  readCaliforniaSignatureMeasuredAuthorizationLedgerAuthority: (
  ) => AttemptLedgerIdentity;
  __testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority: (
    options: { testOnlyAttemptLedgerRoot: string }
  ) => AttemptLedgerIdentity;
  readCaliforniaSignatureMeasuredAuthorizationRequest: (
    options: AuthorizationRequestReaderOptions
  ) => LoadedAuthorizationRequest;
  readCaliforniaSignatureMeasuredAuthorizationRequestForPublication: (
    options: PublicationAuthorizationRequestReaderOptions
  ) => LoadedAuthorizationRequest;
  __testingReadCaliforniaSignatureMeasuredAuthorizationRequest: (
    options: TestingAuthorizationRequestReaderOptions
  ) => LoadedAuthorizationRequest;
  readCaliforniaSignatureMeasuredAuthorizationReceipt: (
    options: ReaderOptions
  ) => LoadedReceipt;
  __testingReadCaliforniaSignatureMeasuredAuthorizationReceipt: (
    options: TestingReaderOptions
  ) => LoadedReceipt;
  verifyCaliforniaSignatureMeasuredAuthorizationForLaunch: <Result>(
    options: LaunchOptions<Result>
  ) => Result;
  __testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch: <Result>(
    options: TestingLaunchOptions<Result>
  ) => Result;
};

type FixtureLedger = {
  anchorBytes: Buffer;
  anchorPath: string;
  attemptLedger: AttemptLedgerIdentity;
  ledgerId: string;
  root: string;
};

type PublishedReceipt = {
  bytes: Buffer;
  filePath: string;
  sha256: string;
};

const api = lifecycle as Api;
const sha256 = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");

function exactLaunchCommand(): LaunchCommand {
  return {
    projects: ["desktop-chrome", "mobile-chrome"],
    repeatEach: 1,
    reporter: "json",
    retries: 0,
    specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
    workers: 1
  };
}

function launchContextFor(payload: V3Payload | V2Payload): LaunchContext {
  return {
    attemptId: payload.attemptId,
    buildId: payload.buildId,
    executionPlanSha256: payload.executionPlanSha256,
    launchCommand: exactLaunchCommand(),
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    sourceSnapshotSha256: payload.sourceSnapshotSha256
  };
}

function canonicalObjectBytes(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value) + "\n", "utf8");
}

function canonicalPrettyObjectBytes(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function assertDeepFrozen(value: unknown, label: string, seen = new Set<object>()) {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return;
  }
  seen.add(value);
  assert.equal(Object.isFrozen(value), true, label + " must be deeply frozen");
  for (const nested of Object.values(value as Record<string, unknown>)) {
    assertDeepFrozen(nested, label, seen);
  }
}

function deepFreezeFixture<T>(value: T, seen = new Set<object>()): T {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreezeFixture(nested, seen);
  }
  return Object.freeze(value);
}

function assertIdentityFields<T extends object>(
  actual: T,
  expected: T,
  keys: readonly (keyof T)[],
  label: string
) {
  for (const key of keys) {
    assert.equal(actual[key], expected[key],
      label + " " + String(key) + " changed");
  }
}

function assertRejectsBeforeFixedLedgerAccess(
  action: () => unknown,
  label: string
) {
  assert.throws(action, (error: unknown) => {
    const message = error instanceof Error
      ? error.name + ": " + error.message
      : String(error);
    assert.match(message,
      /argument|arity|exact schema|expects? no|unknown|unexpected|option|key/i,
    label + ": rejection did not identify the caller-supplied input");
    assert.doesNotMatch(message,
      /ENOENT|no such file|global ledger.*(?:missing|unprovisioned)|anchor.*(?:missing|not found)/i,
    label + ": rejection touched the fixed global ledger before validating input");
    return true;
  }, label);
}

function assertTestRootDisjointFromProductionLedger(
  testRoot: string,
  label: string
) {
  const normalizedTestRoot = path.resolve(testRoot);
  const normalizedProductionRoot = path.resolve(GLOBAL_LEDGER_ROOT);
  const sameOrDescendant = (root: string, candidate: string) =>
    candidate === root || candidate.startsWith(root + path.sep);
  assert.equal(
    sameOrDescendant(normalizedProductionRoot, normalizedTestRoot) ||
      sameOrDescendant(normalizedTestRoot, normalizedProductionRoot),
    false,
    label + ": " + TEST_ONLY_LEDGER_DISJOINTNESS_ERROR
  );
  return normalizedTestRoot;
}

function assertCentralTestOnlyLedgerDisjointnessGuardBeforeBoundary(
  source: string,
  commonReaderCall: string,
  label: string
) {
  const normalizedSource = source.replace(/\s+/g, "");
  const guardCall = TEST_ONLY_LEDGER_DISJOINTNESS_GUARD + "(";
  const guardIndex = normalizedSource.indexOf(guardCall);
  assert.equal(
    normalizedSource.split(guardCall).length - 1,
    1,
    label + " must call the one central " +
      TEST_ONLY_LEDGER_DISJOINTNESS_GUARD + " guard exactly once"
  );
  const commonReaderIndex = normalizedSource.indexOf(commonReaderCall + "(");
  assert.ok(commonReaderIndex >= 0,
    label + " common reader call was not found during source inspection");
  assert.ok(guardIndex < commonReaderIndex,
    label + " must reject a production-related test root before its common reader");
  for (const boundary of ["lstatSync(", "openSync(", "JSON.parse("]) {
    const boundaryIndex = normalizedSource.indexOf(boundary);
    if (boundaryIndex >= 0) {
      assert.ok(guardIndex < boundaryIndex,
        label + " must reject a production-related test root before " +
          boundary.slice(0, -1));
    }
  }
}

function assertThrowsTestOnlyLedgerDisjointness(
  action: () => unknown,
  label: string
) {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof Error, label + " must throw one Error");
    assert.equal(error.message, TEST_ONLY_LEDGER_DISJOINTNESS_ERROR,
      label + " must report the specific production-ledger disjointness error");
    return true;
  }, label);
}

async function syncDirectory(directory: string) {
  const directoryHandle = await open(directory, "r");
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
}

async function publishExclusiveDurableFile(filePath: string, bytes: Buffer) {
  const fileHandle = await open(filePath, "wx+", 0o600);
  try {
    await fileHandle.writeFile(bytes);
    await fileHandle.sync();
    const identity = await fileHandle.stat({ bigint: true });
    assert.ok(identity.isFile() && identity.nlink === BigInt(1),
      filePath + ": held fixture FD must be one regular singleton file");
    assert.equal(identity.mode & BigInt(0o777), BigInt(0o600),
      filePath + ": held fixture FD must be mode 0600");
    assert.equal(identity.size, BigInt(bytes.length),
      filePath + ": held fixture FD byte count drifted");
    const readback = Buffer.alloc(bytes.length);
    let offset = 0;
    while (offset < readback.length) {
      const result = await fileHandle.read(
        readback,
        offset,
        readback.length - offset,
        offset
      );
      assert.ok(result.bytesRead > 0,
        filePath + ": same-FD fixture readback ended early");
      offset += result.bytesRead;
    }
    assert.deepEqual(readback, bytes,
      filePath + ": same-FD fixture readback drifted");
  } finally {
    await fileHandle.close();
  }
  await syncDirectory(path.dirname(filePath));
  const pathIdentity = await lstat(filePath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
    pathIdentity.nlink === BigInt(1),
  filePath + ": fixture path must be one regular singleton file");
  assert.equal(pathIdentity.uid, BigInt(process.getuid!()),
    filePath + ": fixture path must be test-owned");
  assert.equal(pathIdentity.mode & BigInt(0o777), BigInt(0o600),
    filePath + ": fixture path must be mode 0600");
  assert.deepEqual(await readFile(filePath), bytes,
    filePath + ": fixture path readback drifted");
}

async function publishExclusiveDurableReadonlyFile(
  filePath: string,
  bytes: Buffer
) {
  const fileHandle = await open(filePath, "wx+", 0o400);
  try {
    await fileHandle.writeFile(bytes);
    await fileHandle.sync();
    const identity = await fileHandle.stat({ bigint: true });
    assert.ok(identity.isFile() && identity.nlink === BigInt(1),
      filePath + ": held immutable fixture FD must be one regular singleton file");
    assert.equal(identity.mode & BigInt(0o777), BigInt(0o400),
      filePath + ": held immutable fixture FD must be mode 0400");
    assert.equal(identity.size, BigInt(bytes.length),
      filePath + ": held immutable fixture FD byte count drifted");
    const readback = Buffer.alloc(bytes.length);
    let offset = 0;
    while (offset < readback.length) {
      const result = await fileHandle.read(
        readback,
        offset,
        readback.length - offset,
        offset
      );
      assert.ok(result.bytesRead > 0,
        filePath + ": same-FD immutable fixture readback ended early");
      offset += result.bytesRead;
    }
    assert.deepEqual(readback, bytes,
      filePath + ": same-FD immutable fixture readback drifted");
  } finally {
    await fileHandle.close();
  }
  await syncDirectory(path.dirname(filePath));
  const pathIdentity = await lstat(filePath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
    pathIdentity.nlink === BigInt(1),
  filePath + ": immutable fixture path must be one regular singleton file");
  assert.equal(pathIdentity.uid, BigInt(process.getuid!()),
    filePath + ": immutable fixture path must be test-owned");
  assert.equal(pathIdentity.mode & BigInt(0o777), BigInt(0o400),
    filePath + ": immutable fixture path must be mode 0400");
  assert.deepEqual(await readFile(filePath), bytes,
    filePath + ": immutable fixture path readback drifted");
}

async function assertPhysicalOwnedDirectory(directory: string, label: string) {
  const identity = await lstat(directory, { bigint: true });
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
    label + " must be one physical directory");
  assert.equal(identity.uid, BigInt(process.getuid!()),
    label + " must be test-owned");
  assert.equal(identity.mode & BigInt(0o777), BigInt(0o700),
    label + " must be mode 0700");
  assert.equal(await realpath(directory), directory,
    label + " must not traverse a symlink");
  return identity;
}

async function provisionTestLedger(
  root: string,
  ledgerId: string
): Promise<FixtureLedger> {
  assert.ok(path.isAbsolute(root) && root.startsWith("/Volumes/Starship/"),
    "test ledger root must be one absolute Starship path");
  assert.equal(path.normalize(root), root,
    "test ledger root must be normalized");
  await mkdir(root, { mode: 0o700 });
  await syncDirectory(path.dirname(root));
  await assertPhysicalOwnedDirectory(root, ledgerId + " root");

  const anchor = {
    ledgerId,
    rootPathSha256: sha256(root),
    schema: LEDGER_ANCHOR_SCHEMA,
    status: "ACTIVE"
  } as const;
  const anchorBytes = canonicalObjectBytes(anchor);
  const anchorPath = path.join(root, LEDGER_ANCHOR_FILENAME);
  await publishExclusiveDurableFile(anchorPath, anchorBytes);
  const anchorIdentity = await lstat(anchorPath, { bigint: true });
  assert.ok(anchorIdentity.isFile() && !anchorIdentity.isSymbolicLink() &&
    anchorIdentity.nlink === BigInt(1),
  ledgerId + ": anchor must be one regular singleton file");
  assert.equal(anchorIdentity.mode & BigInt(0o777), BigInt(0o600),
    ledgerId + ": anchor must be exact mode 0600");
  assert.deepEqual(
    anchorBytes,
    Buffer.from(JSON.stringify(anchor) + "\n", "utf8"),
    ledgerId + ": anchor must be canonical and LF-terminated"
  );

  const rootIdentity = await assertPhysicalOwnedDirectory(root, ledgerId + " root");
  assert.ok(rootIdentity.birthtimeNs > BigInt(0),
    ledgerId + ": root must expose a physical birthtime identity");
  const attemptLedger: AttemptLedgerIdentity = {
    anchorSha256: sha256(anchorBytes),
    ledgerId,
    rootBirthtimeNs: String(rootIdentity.birthtimeNs),
    rootDev: String(rootIdentity.dev),
    rootIno: String(rootIdentity.ino),
    rootPathSha256: sha256(root)
  };
  assert.deepEqual(Object.keys(attemptLedger), [
    "anchorSha256",
    "ledgerId",
    "rootBirthtimeNs",
    "rootDev",
    "rootIno",
    "rootPathSha256"
  ], ledgerId + ": exact signed attempt-ledger identity schema drifted");
  return { anchorBytes, anchorPath, attemptLedger, ledgerId, root };
}

function v3PayloadFor(
  label: string,
  attemptLedger: AttemptLedgerIdentity,
  authorizationClock: number
): V3Payload {
  return {
    attemptId: "measured-root-attempt-" + label +
      "-0123456789abcdef0123456789abcdef",
    attemptLedger,
    authorizationNonce: "measured-root-nonce-" + label +
      "-0123456789abcdef0123456789abcdef",
    authorizationRequestSha256: sha256("authorization-request:" + label),
    buildId: "california-signature-root-build-" + label +
      "-0123456789abcdef",
    decision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
    executionPlanSha256: sha256("execution-plan:" + label),
    expiresAt: new Date(authorizationClock + 60 * 60_000).toISOString(),
    issuedAt: new Date(authorizationClock - 60_000).toISOString(),
    launchCommand: exactLaunchCommand(),
    maxInvocations: 1,
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    retryAuthorized: false,
    sourceSnapshotSha256: sha256("source-snapshot:" + label)
  };
}

function v2PayloadFor(label: string, authorizationClock: number): V2Payload {
  return {
    attemptId: "measured-v2-attempt-" + label +
      "-0123456789abcdef0123456789abcdef",
    authorizationNonce: "measured-v2-nonce-" + label +
      "-0123456789abcdef0123456789abcdef",
    buildId: "california-signature-v2-build-" + label +
      "-0123456789abcdef",
    decision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
    executionPlanSha256: sha256("execution-plan:v2:" + label),
    expiresAt: new Date(authorizationClock + 60 * 60_000).toISOString(),
    issuedAt: new Date(authorizationClock - 60_000).toISOString(),
    launchCommand: exactLaunchCommand(),
    maxInvocations: 1,
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    retryAuthorized: false,
    sourceSnapshotSha256: sha256("source-snapshot:v2:" + label)
  };
}

async function publishSignedReceipt(options: {
  label: string;
  payload: V3Payload | V2Payload;
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];
  receiptRoot: string;
  schema: typeof V3_RECEIPT_SCHEMA | typeof V2_RECEIPT_SCHEMA;
}): Promise<PublishedReceipt> {
  const payloadBytes = Buffer.from(JSON.stringify(options.payload), "utf8");
  const receipt = {
    payloadBase64: payloadBytes.toString("base64"),
    reviewerKeyId: REVIEWER_KEY_ID,
    schema: options.schema,
    signatureAlgorithm: "Ed25519",
    signatureBase64: signBytes(
      null,
      payloadBytes,
      options.privateKey
    ).toString("base64")
  } as const;
  const bytes = canonicalObjectBytes(receipt);
  const filePath = path.join(options.receiptRoot, options.label + ".json");
  await publishExclusiveDurableFile(filePath, bytes);
  return { bytes, filePath, sha256: sha256(bytes) };
}

function consumptionPath(root: string, attemptId: string) {
  return path.join(root, sha256(attemptId) + CONSUMPTION_SUFFIX);
}

function readThroughFixtureLedger(
  selectedApi: Api,
  published: PublishedReceipt,
  ledgerRoot: string,
  authorizationRequest: LoadedAuthorizationRequest,
  testKeys: ReadonlyMap<string, string>
) {
  const reader =
    selectedApi.__testingReadCaliforniaSignatureMeasuredAuthorizationReceipt;
  assert.equal(typeof reader, "function",
    "test-only v3 reader must be exported");
  return reader({
    allowedRoot: path.dirname(published.filePath),
    authorizationRequest,
    expectedSha256: published.sha256,
    receiptPath: published.filePath,
    testOnlyAttemptLedgerRoot: ledgerRoot,
    testOnlyTrustedReviewerPublicKeys: testKeys
  });
}

test("measured authorization publication preparation is pure canonical fixed-error and filesystem-free", () => {
  const preparePublication =
    api.prepareCaliforniaSignatureMeasuredAuthorizationRequestPublication;
  assert.equal(typeof preparePublication, "function",
    "pure measured-authorization publication preparation function must be exported");
  assert.equal(preparePublication.length, 1,
    "publication preparation must accept one exact request options object");

  const preparationSource = Function.prototype.toString.call(
    preparePublication
  );
  const forbiddenFilesystemCall =
    /\b(?:access|appendFile|chmod|chown|copyFile|cp|link|lstat|mkdir|mkdtemp|open|opendir|readFile|readdir|readlink|realpath|rename|rm|rmdir|stat|symlink|truncate|unlink|writeFile)(?:Sync)?\s*\(/;
  assert.doesNotMatch(preparationSource, forbiddenFilesystemCall,
    "publication preparation export must not call a filesystem primitive");
  assert.doesNotMatch(preparationSource,
    /(?:node:fs|node:path|\bfs\s*\.|\bpath\s*\.|\bprocess\s*\.|\brequire\s*\(|\bimport\s*\()/,
  "publication preparation export must not import or consult filesystem/path/process state");
  for (const [label, forbiddenToken] of [
    [
      "fixed production ledger root",
      [
        "CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION",
        "LEDGER_ROOT"
      ].join("_")
    ],
    [
      "production ledger-authority reader",
      [
        "readCaliforniaSignatureMeasuredAuthorization",
        "LedgerAuthority"
      ].join("")
    ],
    [
      "test-only ledger-authority reader",
      [
        "__testingReadCaliforniaSignatureMeasuredAuthorization",
        "LedgerAuthority"
      ].join("")
    ],
    [
      "production request builder",
      [
        "buildCaliforniaSignatureMeasuredAuthorization",
        "Request"
      ].join("")
    ],
    [
      "test-only request builder",
      [
        "__testingBuildCaliforniaSignatureMeasuredAuthorization",
        "Request"
      ].join("")
    ],
    [
      "filesystem-backed request reader",
      [
        "readCaliforniaSignatureMeasuredAuthorization",
        "Request"
      ].join("")
    ],
    [
      "filesystem-backed receipt reader",
      [
        "readCaliforniaSignatureMeasuredAuthorization",
        "Receipt"
      ].join("")
    ],
    [
      "production ledger authority brand",
      [
        "californiaSignatureMeasuredAuthorizationProduction",
        "LedgerAuthorities"
      ].join("")
    ]
  ] as const) {
    assert.equal(preparationSource.includes(forbiddenToken), false,
      "publication preparation export must not reference the " + label);
  }

  const exactRequest = deepFreezeFixture<AuthorizationRequest>({
    acceptanceRunId:
      "accept-preparation-0123456789abcdef0123456789abcdef",
    attemptId:
      "attempt-preparation-0123456789abcdef0123456789abcdef",
    attemptLedger: {
      anchorSha256: sha256("synthetic preparation anchor bytes"),
      ledgerId:
        "ledger-preparation-0123456789abcdef0123456789abcdef",
      rootBirthtimeNs: "1700000000000000000",
      rootDev: "42",
      rootIno: "314159",
      rootPathSha256: sha256("synthetic preparation root identity")
    },
    buildId:
      "build-preparation-0123456789abcdef0123456789abcdef",
    executionPlanSha256: sha256("preparation execution plan"),
    launchCommand: exactLaunchCommand(),
    matrixRunId:
      "matrix-preparation-0123456789abcdef0123456789abcdef",
    maxInvocations: 1,
    origin: "http://127.0.0.1:43117",
    requestedDecision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    retryAuthorized: false,
    runtimeRunId:
      "runtime-preparation-0123456789abcdef0123456789abcdef",
    schema: REQUEST_SCHEMA,
    sourceSnapshotSha256: sha256("preparation source snapshot"),
    status: "AWAITING_OWNER_REVIEW"
  });
  const canonicalRequestUtf8 = JSON.stringify(exactRequest, null, 2) + "\n";
  const expectedAuthorizationRequestSha256 = sha256(
    Buffer.from(canonicalRequestUtf8, "utf8")
  );
  const firstPreparation = preparePublication({ request: exactRequest });
  assert.deepEqual(Reflect.ownKeys(firstPreparation), [
    "authorizationRequestSha256",
    "canonicalRequest",
    "canonicalRequestUtf8"
  ], "publication preparation output must have the exact three-key schema/order");
  assert.equal(
    firstPreparation.authorizationRequestSha256,
    expectedAuthorizationRequestSha256,
    "publication preparation returned the wrong canonical request SHA"
  );
  assert.deepEqual(firstPreparation.canonicalRequest, exactRequest,
    "publication preparation returned the wrong canonical request");
  assert.notEqual(firstPreparation.canonicalRequest, exactRequest,
    "publication preparation returned the caller-owned request object");
  assert.equal(firstPreparation.canonicalRequestUtf8, canonicalRequestUtf8,
    "publication preparation must return exact pretty JSON plus one terminal LF");
  assertDeepFrozen(firstPreparation, "publication preparation output");

  const secondPreparation = preparePublication({
    request: structuredClone(exactRequest)
  });
  assert.deepEqual(secondPreparation, firstPreparation,
    "publication preparation must be deterministic for equal request values");
  assert.notEqual(secondPreparation, firstPreparation,
    "publication preparation must return one fresh output object per call");
  assert.notEqual(
    secondPreparation.canonicalRequest,
    firstPreparation.canonicalRequest,
    "publication preparation must return one fresh canonical request per call"
  );
  assertDeepFrozen(secondPreparation, "repeated publication preparation output");

  const runtimeCanary = [
    "RUNTIME",
    "MEASURED",
    "REQUEST",
    "CANARY",
    sha256(String(Date.now()) + ":" + String(process.hrtime.bigint()))
  ].join("_");
  const timeVaryingBuildIdCanary =
    `${runtimeCanary}_INVALID_TIME_VARYING_BUILD_ID!`;
  const timeVaryingAnchorSha256Canary =
    `${runtimeCanary}_INVALID_TIME_VARYING_ANCHOR_SHA256!`;
  let buildIdGetterAccessCount = 0;
  const timeVaryingBuildIdRequest = structuredClone(exactRequest);
  Object.defineProperty(timeVaryingBuildIdRequest, "buildId", {
    configurable: true,
    enumerable: true,
    get() {
      buildIdGetterAccessCount += 1;
      return buildIdGetterAccessCount === 1
        ? exactRequest.buildId
        : timeVaryingBuildIdCanary;
    }
  });
  let anchorSha256GetterAccessCount = 0;
  const timeVaryingAnchorSha256Request = structuredClone(exactRequest);
  Object.defineProperty(
    timeVaryingAnchorSha256Request.attemptLedger,
    "anchorSha256",
    {
      configurable: true,
      enumerable: true,
      get() {
        anchorSha256GetterAccessCount += 1;
        return anchorSha256GetterAccessCount === 1
          ? exactRequest.attemptLedger.anchorSha256
          : timeVaryingAnchorSha256Canary;
      }
    }
  );
  const assertStableOneSnapshotPreparation = (
    label: string,
    request: AuthorizationRequest,
    canary: string,
    accessCount: () => number,
    assertRetainedFirstValue: (request: AuthorizationRequest) => void
  ) => {
    const preparation = preparePublication({ request });
    assert.equal(accessCount(), 1,
      label + ": recognized getter must be observed exactly once");
    assert.deepEqual(preparation.canonicalRequest, exactRequest,
      label + ": canonical request did not retain the exact valid first-access snapshot");
    assertRetainedFirstValue(preparation.canonicalRequest);
    assert.equal(preparation.canonicalRequestUtf8, canonicalRequestUtf8,
      label + ": canonical UTF-8 drifted from the exact valid one-snapshot request");
    assert.equal(
      preparation.authorizationRequestSha256,
      expectedAuthorizationRequestSha256,
      label + ": canonical request SHA drifted from the exact valid one-snapshot request"
    );
    assert.equal(JSON.stringify(preparation).includes(canary), false,
      label + ": returned preparation leaked a later accessor canary");
    assert.equal(preparation.canonicalRequestUtf8.includes(canary), false,
      label + ": canonical UTF-8 leaked a later accessor canary");
    assertDeepFrozen(preparation, label + ": one-snapshot preparation output");

    const replay = preparePublication({
      request: preparation.canonicalRequest
    });
    assert.deepEqual(replay, preparation,
      label + ": returned canonical request was not deterministically reaccepted");
    assert.notEqual(replay, preparation,
      label + ": canonical-request replay reused the prior output object");
    assert.notEqual(replay.canonicalRequest, preparation.canonicalRequest,
      label + ": canonical-request replay reused the prior canonical request object");
    assert.equal(accessCount(), 1,
      label + ": replay unexpectedly reobserved the caller-owned getter");
    assertDeepFrozen(replay, label + ": canonical-request replay output");
  };
  assertStableOneSnapshotPreparation(
    "time-varying top-level buildId getter",
    timeVaryingBuildIdRequest,
    timeVaryingBuildIdCanary,
    () => buildIdGetterAccessCount,
    (request) => {
      assert.equal(request.buildId, exactRequest.buildId,
        "time-varying buildId getter lost its exact valid first value");
    }
  );
  assertStableOneSnapshotPreparation(
    "time-varying nested attempt-ledger anchorSha256 getter",
    timeVaryingAnchorSha256Request,
    timeVaryingAnchorSha256Canary,
    () => anchorSha256GetterAccessCount,
    (request) => {
      assert.equal(
        request.attemptLedger.anchorSha256,
        exactRequest.attemptLedger.anchorSha256,
        "time-varying anchorSha256 getter lost its exact valid first value"
      );
    }
  );
  const missingRequiredField = structuredClone(exactRequest) as
    Partial<AuthorizationRequest>;
  delete missingRequiredField.status;
  const unknownTopLevelField = {
    ...structuredClone(exactRequest),
    unexpectedDiagnostic: runtimeCanary
  };
  const nestedInvalid = structuredClone(exactRequest) as
    AuthorizationRequest & {
      launchCommand: LaunchCommand & { unexpectedDiagnostic: string };
    };
  nestedInvalid.launchCommand = {
    ...nestedInvalid.launchCommand,
    workers: 2,
    unexpectedDiagnostic: runtimeCanary
  } as unknown as LaunchCommand & { unexpectedDiagnostic: string };
  const getterThrowing = structuredClone(exactRequest) as
    Record<string, unknown>;
  Object.defineProperty(getterThrowing, "buildId", {
    configurable: true,
    enumerable: true,
    get() {
      throw new Error(runtimeCanary);
    }
  });
  const oversizedString = {
    ...structuredClone(exactRequest),
    buildId: "b".repeat(64 * 1024 + 1)
  };
  const invalidRows = [
    ["missing required field", missingRequiredField],
    ["unknown top-level canary field", unknownTopLevelField],
    ["nested invalid launch command", nestedInvalid],
    ["throwing canary getter", getterThrowing],
    ["oversized recognized string", oversizedString]
  ] as const;
  const observedErrors: Error[] = [];
  for (const [label, request] of invalidRows) {
    let output: unknown;
    let thrown: unknown;
    try {
      output = preparePublication({ request });
    } catch (error) {
      thrown = error;
    }
    assert.equal(output, undefined,
      label + ": invalid publication preparation returned output");
    assert.ok(thrown instanceof Error,
      label + ": invalid publication preparation must throw Error");
    assert.equal(Object.getPrototypeOf(thrown), Error.prototype,
      label + ": invalid publication preparation must throw a plain Error");
    assert.equal(
      (thrown as Error & { code?: unknown }).code,
      "INVALID_MEASURED_AUTHORIZATION_REQUEST",
      label + ": invalid publication preparation error code drifted"
    );
    assert.equal(Object.hasOwn(thrown, "code"), true,
      label + ": invalid publication preparation error must own its fixed code");
    assert.equal(
      thrown.message,
      "California measured-authorization request is invalid",
      label + ": invalid publication preparation error message drifted"
    );
    assert.equal(Object.hasOwn(thrown, "cause"), false,
      label + ": invalid publication preparation exposed an error cause");
    assert.deepEqual(
      Object.keys(thrown).filter((key) => key !== "code"),
      [],
      label + ": invalid publication preparation exposed enumerable request data"
    );
    for (const [property, descriptor] of Object.entries(
      Object.getOwnPropertyDescriptors(thrown)
    )) {
      assert.equal(descriptor.get, undefined,
        label + ": error property " + property + " unexpectedly has a getter");
      assert.equal(descriptor.set, undefined,
        label + ": error property " + property + " unexpectedly has a setter");
      if (!("value" in descriptor)) {
        continue;
      }
      assert.notEqual(descriptor.value, request,
        label + ": error property " + property + " retained request data");
      if (typeof descriptor.value === "string") {
        assert.equal(descriptor.value.includes(runtimeCanary), false,
          label + ": error property " + property + " leaked the runtime canary");
      }
    }
    assert.equal(thrown.message.includes(runtimeCanary), false,
      label + ": error message leaked the runtime canary");
    assert.equal((thrown.stack ?? "").includes(runtimeCanary), false,
      label + ": error stack leaked the runtime canary");
    assert.equal(JSON.stringify(thrown).includes(runtimeCanary), false,
      label + ": enumerable error properties leaked the runtime canary");
    for (const previousError of observedErrors) {
      assert.notEqual(thrown, previousError,
        label + ": invalid publication preparation reused an earlier Error");
    }
    observedErrors.push(thrown);
  }
});

test("measured authorization publication reader direct contract binds helper inode, exact schemas, and request brand", async () => {
  const testRoot =
    process.env.CA_SIGNATURE_MEASURED_AUTHORIZATION_ROOT_AUTHORITY_TEST_ROOT?.trim();
  assert.ok(testRoot && path.isAbsolute(testRoot) &&
    testRoot.startsWith("/Volumes/Starship/"),
  "publication-reader contract test root must be one absolute Starship path");
  assert.equal(path.normalize(testRoot), testRoot,
    "publication-reader contract test root must be normalized");
  assertTestRootDisjointFromProductionLedger(
    testRoot,
    "publication-reader contract test root"
  );
  await assertPhysicalOwnedDirectory(
    testRoot,
    "publication-reader contract test root"
  );

  const retainedRoot = path.join(
    testRoot,
    "publication-reader-direct-contract-retained"
  );
  const requestRoot = path.join(retainedRoot, "requests");
  const receiptRoot = path.join(retainedRoot, "receipts");
  const ledgerRoot = path.join(retainedRoot, "attempt-ledger");
  for (const [label, root] of [
    ["publication-reader retained root", retainedRoot],
    ["publication-reader request root", requestRoot],
    ["publication-reader receipt root", receiptRoot],
    ["publication-reader attempt ledger", ledgerRoot]
  ] as const) {
    assertTestRootDisjointFromProductionLedger(root, label);
  }
  for (const directory of [retainedRoot, requestRoot, receiptRoot]) {
    await mkdir(directory, { mode: 0o700 });
    await syncDirectory(path.dirname(directory));
    await assertPhysicalOwnedDirectory(directory, directory);
  }
  const ledger = await provisionTestLedger(
    ledgerRoot,
    "publication-reader-ledger-0123456789abcdef0123456789abcdef"
  );

  const authorityReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority!;
  const requestBuilder =
    api.__testingBuildCaliforniaSignatureMeasuredAuthorizationRequest!;
  const publicationReader =
    api.readCaliforniaSignatureMeasuredAuthorizationRequestForPublication!;
  const ordinaryReader =
    api.readCaliforniaSignatureMeasuredAuthorizationRequest!;
  const testingReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationRequest!;
  const receiptReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationReceipt!;
  for (const [label, value] of [
    ["test ledger-authority reader", authorityReader],
    ["test request builder", requestBuilder],
    ["production publication request reader", publicationReader],
    ["ordinary request reader", ordinaryReader],
    ["testing request reader", testingReader],
    ["testing receipt reader", receiptReader]
  ] as const) {
    assert.equal(typeof value, "function", label + " must be exported");
  }
  assert.equal(publicationReader.length, 1,
    "publication reader must accept one exact options object");

  const authority = authorityReader({
    testOnlyAttemptLedgerRoot: ledger.root
  });
  const request = requestBuilder({
    acceptanceRunId:
      "accept-publication-reader-0123456789abcdef0123456789abcdef",
    attemptId:
      "attempt-publication-reader-0123456789abcdef0123456789abcdef",
    buildId:
      "build-publication-reader-0123456789abcdef0123456789abcdef",
    executionPlanSha256: sha256("publication-reader execution plan"),
    launchCommand: exactLaunchCommand(),
    matrixRunId:
      "matrix-publication-reader-0123456789abcdef0123456789abcdef",
    origin: "http://127.0.0.1:43117",
    runtimeRunId:
      "runtime-publication-reader-0123456789abcdef0123456789abcdef",
    sourceSnapshotSha256: sha256("publication-reader source snapshot"),
    testOnlyLedgerAuthority: authority
  });
  const requestBytes = canonicalPrettyObjectBytes(
    request as unknown as Record<string, unknown>
  );
  const requestSha256 = sha256(requestBytes);
  const requestPath = path.join(requestRoot, "authorization-request.json");
  await publishExclusiveDurableReadonlyFile(requestPath, requestBytes);
  const originalRequestIdentity = await lstat(requestPath, { bigint: true });
  const expectedFileIdentity = Object.freeze({
    dev: originalRequestIdentity.dev.toString(),
    ino: originalRequestIdentity.ino.toString()
  });
  assert.deepEqual(Object.keys(expectedFileIdentity), ["dev", "ino"],
    "helper-created file identity visible schema/order drifted");
  assert.equal(Object.isFrozen(expectedFileIdentity), true,
    "helper-created file identity fixture must be frozen");

  const validReaderOptions: PublicationAuthorizationRequestReaderOptions = {
    allowedRoot: requestRoot,
    expectedFileIdentity,
    expectedRequest: request,
    expectedSha256: requestSha256,
    requestPath
  };
  const extraArgumentCanary =
    "publication-reader-extra-argument-canary-0123456789abcdef";
  const extraArgumentOptionAccessCounts: Record<string, number> =
    Object.create(null);
  const extraArgumentValidOptions = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(validReaderOptions)) {
    extraArgumentOptionAccessCounts[key] = 0;
    Object.defineProperty(extraArgumentValidOptions, key, {
      configurable: true,
      enumerable: true,
      get() {
        extraArgumentOptionAccessCounts[key] += 1;
        return value;
      }
    });
  }
  const extraArgumentRequestIdentityBefore = await lstat(requestPath, {
    bigint: true
  });
  const extraArgumentRequestBytesBefore = await readFile(requestPath);
  assert.throws(() => Reflect.apply(
    publicationReader as (...args: unknown[]) => LoadedAuthorizationRequest,
    null,
    [extraArgumentValidOptions, extraArgumentCanary]
  ), (error: unknown) => {
    assert.ok(error instanceof Error,
      "publication reader extra-argument rejection must throw Error");
    const seen = new Set<object>();
    const assertCanaryAbsent = (value: unknown, label: string): void => {
      if (typeof value === "string") {
        assert.equal(value.includes(extraArgumentCanary), false,
          label + " leaked the extra positional-argument canary");
        return;
      }
      if (value === null ||
          (typeof value !== "object" && typeof value !== "function") ||
          seen.has(value as object)) {
        return;
      }
      seen.add(value as object);
      for (const property of Reflect.ownKeys(value as object)) {
        if (typeof property === "string") {
          assert.equal(property.includes(extraArgumentCanary), false,
            label + " property name leaked the extra positional-argument canary");
        }
        const descriptor = Object.getOwnPropertyDescriptor(
          value as object,
          property
        );
        if (descriptor && "value" in descriptor) {
          assertCanaryAbsent(
            descriptor.value,
            label + "." + String(property)
          );
        }
      }
    };
    assertCanaryAbsent(error, "publication reader extra-argument error");
    return true;
  }, "publication reader accepted one extra positional argument");
  for (const key of Object.keys(validReaderOptions)) {
    assert.equal(extraArgumentOptionAccessCounts[key], 0,
      "publication reader observed option " + key +
      " before rejecting an extra positional argument");
  }
  const extraArgumentRequestIdentityAfter = await lstat(requestPath, {
    bigint: true
  });
  assertIdentityFields(
    extraArgumentRequestIdentityAfter,
    extraArgumentRequestIdentityBefore,
    ["dev", "ino", "birthtimeNs", "size", "mode", "nlink", "uid", "mtimeNs"],
    "extra-argument rejected request"
  );
  assert.deepEqual(await readFile(requestPath), extraArgumentRequestBytesBefore,
    "extra-argument rejection changed the immutable request bytes");

  const loadedRequest = publicationReader(validReaderOptions);
  assert.deepEqual(Reflect.ownKeys(loadedRequest), ["fileSha256", "request"],
    "publication reader loaded-request schema/order drifted");
  assert.equal(loadedRequest.fileSha256, requestSha256,
    "publication reader returned the wrong request SHA");
  assert.deepEqual(loadedRequest.request, request,
    "publication reader returned the wrong canonical request");
  assert.notEqual(loadedRequest.request, request,
    "publication reader returned the caller-owned request object");
  assertDeepFrozen(loadedRequest, "publication reader loaded request");

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const reviewerKeys = new Map([[REVIEWER_KEY_ID, publicKey.export({
    format: "der",
    type: "spki"
  }).toString("base64")]]);
  const authorizationClock = Date.now();
  const payload: V3Payload = {
    attemptId: request.attemptId,
    attemptLedger: request.attemptLedger,
    authorizationNonce:
      "nonce-publication-reader-0123456789abcdef0123456789abcdef",
    authorizationRequestSha256: loadedRequest.fileSha256,
    buildId: request.buildId,
    decision: request.requestedDecision,
    executionPlanSha256: request.executionPlanSha256,
    expiresAt: new Date(authorizationClock + 60 * 60_000).toISOString(),
    issuedAt: new Date(authorizationClock - 60_000).toISOString(),
    launchCommand: request.launchCommand,
    maxInvocations: request.maxInvocations,
    requiredProjects: request.requiredProjects,
    retryAuthorized: request.retryAuthorized,
    sourceSnapshotSha256: request.sourceSnapshotSha256
  };
  const publishedReceipt = await publishSignedReceipt({
    label: "publication-reader-same-brand",
    payload,
    privateKey,
    receiptRoot,
    schema: V3_RECEIPT_SCHEMA
  });
  const brandedReceipt = readThroughFixtureLedger(
    api,
    publishedReceipt,
    ledger.root,
    loadedRequest,
    reviewerKeys
  );
  assert.equal(brandedReceipt.fileSha256, publishedReceipt.sha256,
    "same private request brand did not reach receipt acceptance");
  assert.ok(brandedReceipt.authorization &&
    typeof brandedReceipt.authorization === "object",
  "same private request brand did not mint one receipt authorization");
  assertDeepFrozen(brandedReceipt.authorization,
    "publication-reader receipt authorization");
  assert.deepEqual((await readdir(ledger.root)).sort(), [LEDGER_ANCHOR_FILENAME],
    "publication-reader receipt acceptance mutated the attempt ledger");

  assert.throws(() => publicationReader({
    ...validReaderOptions,
    expectedFileIdentity: {
      dev: (originalRequestIdentity.dev + BigInt(1)).toString(),
      ino: expectedFileIdentity.ino
    }
  }), /device differs from the helper-created file/i,
  "publication reader accepted an independently mismatched helper device");
  assert.throws(() => publicationReader({
    ...validReaderOptions,
    expectedFileIdentity: {
      dev: expectedFileIdentity.dev,
      ino: (originalRequestIdentity.ino + BigInt(1)).toString()
    }
  }), /inode differs from the helper-created file/i,
  "publication reader accepted an independently mismatched helper inode");

  const malformedIdentities: Array<readonly [string, unknown]> = [
    ["null identity", null],
    ["array identity", []],
    ["string identity", "1:1"],
    ["missing dev", { ino: expectedFileIdentity.ino }],
    ["missing ino", { dev: expectedFileIdentity.dev }],
    ["unknown identity key", {
      ...expectedFileIdentity,
      unexpected: true
    }],
    ["numeric dev", {
      dev: Number(originalRequestIdentity.dev),
      ino: expectedFileIdentity.ino
    }],
    ["numeric ino", {
      dev: expectedFileIdentity.dev,
      ino: Number(originalRequestIdentity.ino)
    }]
  ];
  for (const invalid of ["", "-1", "+1", "00", "01", "1.0", " 1", "1 ", "0"]) {
    malformedIdentities.push([
      "invalid dev " + JSON.stringify(invalid),
      { dev: invalid, ino: expectedFileIdentity.ino }
    ]);
    malformedIdentities.push([
      "invalid ino " + JSON.stringify(invalid),
      { dev: expectedFileIdentity.dev, ino: invalid }
    ]);
  }
  for (const [label, expectedFileIdentityCandidate] of malformedIdentities) {
    assert.throws(() => publicationReader({
      ...validReaderOptions,
      expectedFileIdentity: expectedFileIdentityCandidate
    } as never), /object|schema|decimal|string|canonical|positive/i,
    label + " was accepted by the publication reader");
  }
  assert.throws(() => publicationReader(null as never), /object/i,
    "publication reader accepted a non-object outer input");
  assert.throws(() => publicationReader([] as never), /object/i,
    "publication reader accepted an array outer input");
  const { expectedFileIdentity: omittedIdentity, ...missingIdentityOptions } =
    validReaderOptions;
  assert.ok(omittedIdentity, "missing-identity fixture lost its removed value");
  assert.throws(() => publicationReader(missingIdentityOptions as never),
    /schema/i,
  "publication reader accepted a missing expectedFileIdentity option");
  assert.throws(() => publicationReader({
    ...validReaderOptions,
    unexpected: true
  } as never), /schema/i,
  "publication reader accepted an unknown outer option");

  assert.throws(() => ordinaryReader({
    allowedRoot: requestRoot,
    expectedFileIdentity,
    expectedRequest: request,
    expectedSha256: requestSha256,
    requestPath
  } as never), /schema/i,
  "ordinary request reader accepted the publication-only identity key");
  let testingHookCalls = 0;
  assert.throws(() => testingReader({
    allowedRoot: requestRoot,
    expectedFileIdentity,
    expectedRequest: request,
    expectedSha256: requestSha256,
    requestPath,
    testOnlyBeforeFinalVerification: () => {
      testingHookCalls += 1;
    }
  } as never), /schema/i,
  "testing request reader accepted the publication-only identity key");
  assert.equal(testingHookCalls, 0,
    "testing reader invoked its hook before rejecting the extra identity key");
  let forbiddenPublicationHookCalls = 0;
  assert.throws(() => publicationReader({
    ...validReaderOptions,
    testOnlyBeforeFinalVerification: () => {
      forbiddenPublicationHookCalls += 1;
    }
  } as never), /schema/i,
  "publication reader accepted a testing final-verification hook");
  assert.equal(forbiddenPublicationHookCalls, 0,
    "publication reader invoked a forbidden hook before exact-schema rejection");

  const expectedRequestAccessorCanary =
    "publication-reader-expected-request-reread-canary-0123456789abcdef";
  const expectedRequestAccessorCounts: Record<string, number> =
    Object.create(null);
  const accessorizeExpectedRequest = (value: unknown, valuePath: string): unknown => {
    if (Array.isArray(value)) {
      const accessorArray: unknown[] = new Array(value.length);
      for (let index = 0; index < value.length; index += 1) {
        const propertyPath = `${valuePath}[${index}]`;
        const nestedValue = accessorizeExpectedRequest(
          value[index],
          propertyPath
        );
        expectedRequestAccessorCounts[propertyPath] = 0;
        Object.defineProperty(accessorArray, String(index), {
          configurable: true,
          enumerable: true,
          get() {
            expectedRequestAccessorCounts[propertyPath] += 1;
            if (expectedRequestAccessorCounts[propertyPath] !== 1) {
              throw new Error(
                expectedRequestAccessorCanary + ":" + propertyPath
              );
            }
            return nestedValue;
          }
        });
      }
      return accessorArray;
    }
    if (value && typeof value === "object") {
      const accessorRecord: Record<string, unknown> = {};
      for (const [key, propertyValue] of Object.entries(
        value as Record<string, unknown>
      )) {
        const propertyPath = `${valuePath}.${key}`;
        const nestedValue = accessorizeExpectedRequest(
          propertyValue,
          propertyPath
        );
        expectedRequestAccessorCounts[propertyPath] = 0;
        Object.defineProperty(accessorRecord, key, {
          configurable: true,
          enumerable: true,
          get() {
            expectedRequestAccessorCounts[propertyPath] += 1;
            if (expectedRequestAccessorCounts[propertyPath] !== 1) {
              throw new Error(
                expectedRequestAccessorCanary + ":" + propertyPath
              );
            }
            return nestedValue;
          }
        });
      }
      return accessorRecord;
    }
    return value;
  };
  const expectedRequestAccessorPaths = [
    "expectedRequest.acceptanceRunId",
    "expectedRequest.attemptId",
    "expectedRequest.attemptLedger",
    "expectedRequest.attemptLedger.anchorSha256",
    "expectedRequest.attemptLedger.ledgerId",
    "expectedRequest.attemptLedger.rootBirthtimeNs",
    "expectedRequest.attemptLedger.rootDev",
    "expectedRequest.attemptLedger.rootIno",
    "expectedRequest.attemptLedger.rootPathSha256",
    "expectedRequest.buildId",
    "expectedRequest.executionPlanSha256",
    "expectedRequest.launchCommand",
    "expectedRequest.launchCommand.projects",
    "expectedRequest.launchCommand.projects[0]",
    "expectedRequest.launchCommand.projects[1]",
    "expectedRequest.launchCommand.repeatEach",
    "expectedRequest.launchCommand.reporter",
    "expectedRequest.launchCommand.retries",
    "expectedRequest.launchCommand.specPath",
    "expectedRequest.launchCommand.workers",
    "expectedRequest.matrixRunId",
    "expectedRequest.maxInvocations",
    "expectedRequest.origin",
    "expectedRequest.requestedDecision",
    "expectedRequest.requiredProjects",
    "expectedRequest.requiredProjects[0]",
    "expectedRequest.requiredProjects[1]",
    "expectedRequest.retryAuthorized",
    "expectedRequest.runtimeRunId",
    "expectedRequest.schema",
    "expectedRequest.sourceSnapshotSha256",
    "expectedRequest.status"
  ] as const;
  const accessorExpectedRequest = accessorizeExpectedRequest(
    request,
    "expectedRequest"
  ) as AuthorizationRequest;
  assert.deepEqual(
    Object.keys(expectedRequestAccessorCounts).sort(),
    [...expectedRequestAccessorPaths].sort(),
    "recursive expected-request accessor fixture missed a recognized field"
  );

  const nestedAccessorCounts = { dev: 0, ino: 0 };
  const accessorIdentity = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(expectedFileIdentity)) {
    Object.defineProperty(accessorIdentity, key, {
      configurable: true,
      enumerable: true,
      get() {
        nestedAccessorCounts[key as "dev" | "ino"] += 1;
        return nestedAccessorCounts[key as "dev" | "ino"] === 1
          ? value
          : "0";
      }
    });
  }
  const outerAccessorCounts: Record<string, number> = Object.create(null);
  const accessorValues: Record<string, unknown> = {
    allowedRoot: requestRoot,
    expectedFileIdentity: accessorIdentity,
    expectedRequest: accessorExpectedRequest,
    expectedSha256: requestSha256,
    requestPath
  };
  const accessorOptions = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(accessorValues)) {
    outerAccessorCounts[key] = 0;
    Object.defineProperty(accessorOptions, key, {
      configurable: true,
      enumerable: true,
      get() {
        outerAccessorCounts[key] += 1;
        if (outerAccessorCounts[key] !== 1) {
          throw new Error("publication reader reread outer accessor " + key);
        }
        return value;
      }
    });
  }
  const accessorLoadedRequest = publicationReader(
    accessorOptions as unknown as PublicationAuthorizationRequestReaderOptions
  );
  for (const key of Object.keys(accessorValues)) {
    assert.equal(outerAccessorCounts[key], 1,
      "publication reader must capture outer accessor " + key + " exactly once");
  }
  assert.deepEqual(nestedAccessorCounts, { dev: 1, ino: 1 },
    "publication reader must capture nested dev/ino accessors exactly once");
  for (const propertyPath of expectedRequestAccessorPaths) {
    assert.equal(expectedRequestAccessorCounts[propertyPath], 1,
      "publication reader must capture recursive accessor " + propertyPath +
      " exactly once");
  }
  assert.deepEqual(accessorLoadedRequest, loadedRequest,
    "exactly-once accessor capture changed the loaded request value");
  assert.notEqual(accessorLoadedRequest, loadedRequest,
    "exactly-once accessor call reused an earlier loaded-request brand");
  assertDeepFrozen(accessorLoadedRequest,
    "publication-reader accessor-loaded request");

  const stagedReplacementPath = path.join(
    requestRoot,
    ".authorization-request.replacement-staged.json"
  );
  const retainedOriginalPath = path.join(
    requestRoot,
    ".authorization-request.original-retained.json"
  );
  await publishExclusiveDurableReadonlyFile(
    stagedReplacementPath,
    requestBytes
  );
  const stagedReplacementIdentity = await lstat(stagedReplacementPath, {
    bigint: true
  });
  assert.notEqual(stagedReplacementIdentity.ino, originalRequestIdentity.ino,
    "byte-identical replacement fixture must use a distinct inode");
  await rename(requestPath, retainedOriginalPath);
  await rename(stagedReplacementPath, requestPath);
  await syncDirectory(requestRoot);
  assert.throws(() => publicationReader(validReaderOptions),
    /inode differs from the helper-created file/i,
  "publication reader accepted a byte-identical replacement inode");
  const retainedOriginalIdentity = await lstat(retainedOriginalPath, {
    bigint: true
  });
  const replacementIdentity = await lstat(requestPath, { bigint: true });
  const retainedIdentityKeys = [
    "dev",
    "ino",
    "birthtimeNs",
    "size",
    "mode",
    "nlink",
    "uid",
    "mtimeNs"
  ] as const;
  assertIdentityFields(
    retainedOriginalIdentity,
    originalRequestIdentity,
    retainedIdentityKeys,
    "retained helper-created request"
  );
  assertIdentityFields(
    replacementIdentity,
    stagedReplacementIdentity,
    retainedIdentityKeys,
    "byte-identical replacement request"
  );
  assert.deepEqual(await readFile(retainedOriginalPath), requestBytes,
    "retained helper-created request bytes changed");
  assert.deepEqual(await readFile(requestPath), requestBytes,
    "byte-identical replacement request bytes changed");
  assert.deepEqual((await readdir(requestRoot)).sort(), [
    path.basename(requestPath),
    path.basename(retainedOriginalPath)
  ].sort(), "replacement attack must retain exactly original and replacement files");
  assert.deepEqual((await readdir(ledger.root)).sort(), [LEDGER_ANCHOR_FILENAME],
    "publication-reader attack matrix mutated the test attempt ledger");
});

test("test-only measured authorization rejects the production ledger root before any filesystem access", () => {
  const authorityReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority;
  const receiptReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationReceipt;
  const authorityReaderSource = Function.prototype.toString.call(
    authorityReader
  );
  const receiptReaderSource = Function.prototype.toString.call(receiptReader);
  assertCentralTestOnlyLedgerDisjointnessGuardBeforeBoundary(
    authorityReaderSource,
    "readMeasuredAuthorizationLedgerAuthorityBinding",
    "test-only measured-authorization ledger-authority reader"
  );
  assertCentralTestOnlyLedgerDisjointnessGuardBeforeBoundary(
    receiptReaderSource,
    "readCaliforniaSignatureMeasuredAuthorizationReceiptInternal",
    "test-only measured-authorization receipt reader"
  );

  const { publicKey } = generateKeyPairSync("ed25519");
  const dummyReviewerKeys = new Map([[REVIEWER_KEY_ID, publicKey.export({
    format: "der",
    type: "spki"
  }).toString("base64")]]);
  const dummyReceiptRoot =
    "/Volumes/Starship/california-signature-disjointness-never-read";
  const forbiddenRoots = [
    ["exact production ledger root", GLOBAL_LEDGER_ROOT],
    [
      "production ledger descendant",
      path.join(GLOBAL_LEDGER_ROOT, "forbidden-test-descendant")
    ],
    ["production ledger ancestor", path.dirname(GLOBAL_LEDGER_ROOT)]
  ] as const;
  for (const [relationship, forbiddenRoot] of forbiddenRoots) {
    assertThrowsTestOnlyLedgerDisjointness(() => authorityReader!({
      testOnlyAttemptLedgerRoot: forbiddenRoot
    }), "authority reader: " + relationship);
    assertThrowsTestOnlyLedgerDisjointness(() => receiptReader!({
      allowedRoot: dummyReceiptRoot,
      authorizationRequest: {} as LoadedAuthorizationRequest,
      expectedSha256: "0".repeat(64),
      receiptPath: path.join(dummyReceiptRoot, "never-read.json"),
      testOnlyAttemptLedgerRoot: forbiddenRoot,
      testOnlyTrustedReviewerPublicKeys: dummyReviewerKeys
    }), "receipt reader: " + relationship);
  }

  for (const [relationship, forbiddenRoot] of forbiddenRoots) {
    assert.throws(
      () => assertTestRootDisjointFromProductionLedger(
        forbiddenRoot,
        "pure fixture guard: " + relationship
      ),
      /must be disjoint from the fixed production ledger root/,
      "pure fixture guard must reject the " + relationship
    );
  }
  const safeFixtureRoot =
    "/Volumes/Starship/california-signature-disjoint-fixture-0123456789abcdef";
  assert.equal(
    assertTestRootDisjointFromProductionLedger(
      safeFixtureRoot,
      "pure fixture guard: disjoint root"
    ),
    safeFixtureRoot,
    "pure fixture guard must preserve one normalized disjoint test root"
  );
});

test("measured authorization root authority RED: fixed global v3 ledger prevents alternate-root and replacement replay", async (t) => {
  const testRoot =
    process.env.CA_SIGNATURE_MEASURED_AUTHORIZATION_ROOT_AUTHORITY_TEST_ROOT?.trim();
  assert.ok(testRoot && path.isAbsolute(testRoot) &&
    testRoot.startsWith("/Volumes/Starship/"),
  "CA_SIGNATURE_MEASURED_AUTHORIZATION_ROOT_AUTHORITY_TEST_ROOT must be one absolute Starship path");
  assert.equal(path.normalize(testRoot), testRoot,
    "root-authority test root must be normalized");
  assertTestRootDisjointFromProductionLedger(
    testRoot,
    "root-authority test root"
  );
  const retainedRoot = path.join(testRoot, "root-authority-red");
  const receiptRoot = path.join(retainedRoot, "receipts");
  const ledgerParent = path.join(retainedRoot, "ledgers");
  const requestRoot = path.join(retainedRoot, "requests");
  for (const [label, directory] of [
    ["root-authority retained root", retainedRoot],
    ["root-authority receipt root", receiptRoot],
    ["root-authority ledger parent", ledgerParent],
    ["root-authority request root", requestRoot]
  ] as const) {
    assertTestRootDisjointFromProductionLedger(directory, label);
  }
  await assertPhysicalOwnedDirectory(testRoot, "root-authority test root");

  for (const directory of [
    retainedRoot,
    receiptRoot,
    ledgerParent,
    requestRoot
  ]) {
    await mkdir(directory, { mode: 0o700 });
    await syncDirectory(path.dirname(directory));
    await assertPhysicalOwnedDirectory(directory, directory);
  }

  const ledgerA = await provisionTestLedger(
    path.join(ledgerParent, "ledger-a"),
    "measured-attempt-ledger-a-0123456789abcdef0123456789abcdef"
  );
  const ledgerB = await provisionTestLedger(
    path.join(ledgerParent, "ledger-b"),
    "measured-attempt-ledger-b-0123456789abcdef0123456789abcdef"
  );
  assert.notDeepEqual(
    {
      birthtimeNs: ledgerA.attemptLedger.rootBirthtimeNs,
      dev: ledgerA.attemptLedger.rootDev,
      ino: ledgerA.attemptLedger.rootIno
    },
    {
      birthtimeNs: ledgerB.attemptLedger.rootBirthtimeNs,
      dev: ledgerB.attemptLedger.rootDev,
      ino: ledgerB.attemptLedger.rootIno
    },
    "independent fixture ledgers must not share one physical identity"
  );

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeySpkiDerBase64 = publicKey.export({
    format: "der",
    type: "spki"
  }).toString("base64");
  const testKeys = new Map([[REVIEWER_KEY_ID, publicKeySpkiDerBase64]]);
  const authorizationClock = Date.now();
  const unsignedRequestPayload = v3PayloadFor(
    "ledger-a",
    ledgerA.attemptLedger,
    authorizationClock
  );
  const fixtureAuthorityReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority;
  const fixtureRequestBuilder =
    api.__testingBuildCaliforniaSignatureMeasuredAuthorizationRequest;
  const fixtureRequestReader =
    api.readCaliforniaSignatureMeasuredAuthorizationRequest;
  assert.equal(typeof fixtureAuthorityReader, "function",
    "root-authority fixture requires the testing ledger-authority reader");
  assert.equal(typeof fixtureRequestBuilder, "function",
    "root-authority fixture requires the testing request builder");
  assert.equal(typeof fixtureRequestReader, "function",
    "root-authority fixture requires the ordinary request reader");
  const ledgerAAuthority = fixtureAuthorityReader({
    testOnlyAttemptLedgerRoot: ledgerA.root
  });
  const fixtureRequest = fixtureRequestBuilder({
    acceptanceRunId:
      "accept-root-authority-0123456789abcdef0123456789abcdef",
    attemptId: unsignedRequestPayload.attemptId,
    buildId: unsignedRequestPayload.buildId,
    executionPlanSha256: unsignedRequestPayload.executionPlanSha256,
    launchCommand: exactLaunchCommand(),
    matrixRunId:
      "matrix-root-authority-0123456789abcdef0123456789abcdef",
    origin: "http://127.0.0.1:43117",
    runtimeRunId:
      "runtime-root-authority-0123456789abcdef0123456789abcdef",
    sourceSnapshotSha256: unsignedRequestPayload.sourceSnapshotSha256,
    testOnlyLedgerAuthority: ledgerAAuthority
  });
  const fixtureRequestBytes = canonicalPrettyObjectBytes(
    fixtureRequest as unknown as Record<string, unknown>
  );
  const fixtureRequestPath = path.join(
    requestRoot,
    "root-authority-authorization-request.json"
  );
  await publishExclusiveDurableReadonlyFile(
    fixtureRequestPath,
    fixtureRequestBytes
  );
  const fixtureRequestSha256 = sha256(fixtureRequestBytes);
  const authorizationRequest = fixtureRequestReader({
    allowedRoot: requestRoot,
    expectedRequest: fixtureRequest,
    expectedSha256: fixtureRequestSha256,
    requestPath: fixtureRequestPath
  });
  assert.deepEqual(Object.keys(authorizationRequest), [
    "fileSha256",
    "request"
  ], "root-authority fixture request binding visible schema drifted");
  const v3Payload: V3Payload = {
    ...unsignedRequestPayload,
    authorizationRequestSha256: authorizationRequest.fileSha256
  };
  assert.deepEqual(Object.keys(v3Payload), [
    "attemptId",
    "attemptLedger",
    "authorizationNonce",
    "authorizationRequestSha256",
    "buildId",
    "decision",
    "executionPlanSha256",
    "expiresAt",
    "issuedAt",
    "launchCommand",
    "maxInvocations",
    "requiredProjects",
    "retryAuthorized",
    "sourceSnapshotSha256"
  ], "v3 payload exact schema/order drifted");
  const publishedV3 = await publishSignedReceipt({
    label: "ledger-a-v3",
    payload: v3Payload,
    privateKey,
    receiptRoot,
    schema: V3_RECEIPT_SCHEMA
  });
  const v2Payload = v2PayloadFor("legacy", authorizationClock);
  const publishedV2 = await publishSignedReceipt({
    label: "legacy-v2",
    payload: v2Payload,
    privateKey,
    receiptRoot,
    schema: V2_RECEIPT_SCHEMA
  });

  assert.equal(
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT,
    GLOBAL_LEDGER_ROOT,
    "production must export the one immutable global attempt-ledger root"
  );
  assert.notEqual(
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT,
    ledgerA.root,
    "the production global ledger must never alias a test fixture"
  );
  assert.equal(
    typeof api.readCaliforniaSignatureMeasuredAuthorizationReceipt,
    "function",
    "production v3 reader must remain exported"
  );
  assert.equal(
    typeof api.__testingReadCaliforniaSignatureMeasuredAuthorizationReceipt,
    "function",
    "test-only v3 reader must be exported"
  );
  assert.equal(
    typeof api.verifyCaliforniaSignatureMeasuredAuthorizationForLaunch,
    "function",
    "production root-owning verifier must be exported"
  );
  assert.equal(
    typeof api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch,
    "function",
    "test-only root-owning verifier must be exported"
  );

  await t.test("ledger A consumes exactly one v2 marker and verifier root injection is forbidden", async () => {
    const loaded = readThroughFixtureLedger(
      api,
      publishedV3,
      ledgerA.root,
      authorizationRequest,
      testKeys
    );
    const launchContext = launchContextFor(v3Payload);
    const productionVerify =
      api.verifyCaliforniaSignatureMeasuredAuthorizationForLaunch!;
    let productionLaunchCount = 0;
    assert.throws(() => productionVerify({
      attemptConsumptionRoot: ledgerB.root,
      authorization: loaded.authorization,
      launch: () => {
        productionLaunchCount += 1;
        return "FORBIDDEN_PRODUCTION_ROOT_INJECTION";
      },
      launchContext
    } as unknown as LaunchOptions<string>),
    /exact schema|unknown.*attemptConsumptionRoot|attemptConsumptionRoot.*forbidden/i,
    "production verifier must reject caller-selected attemptConsumptionRoot before provenance");
    assert.equal(productionLaunchCount, 0,
      "production root injection reached launch");

    const testingVerify =
      api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch!;
    let injectedLaunchCount = 0;
    assert.throws(() => testingVerify({
      attemptConsumptionRoot: ledgerB.root,
      authorization: loaded.authorization,
      launch: () => {
        injectedLaunchCount += 1;
        return "FORBIDDEN_TEST_ROOT_INJECTION";
      },
      launchContext
    } as unknown as LaunchOptions<string>),
    /exact schema|unknown.*attemptConsumptionRoot|attemptConsumptionRoot.*forbidden/i,
    "test-only verifier must reject caller-selected attemptConsumptionRoot");
    assert.equal(injectedLaunchCount, 0,
      "test-only root injection reached launch");
    assert.deepEqual((await readdir(ledgerA.root)).sort(),
      [LEDGER_ANCHOR_FILENAME],
    "rejected root injection mutated ledger A");
    assert.deepEqual((await readdir(ledgerB.root)).sort(),
      [LEDGER_ANCHOR_FILENAME],
    "rejected root injection mutated ledger B");

    let spentRetryLaunchCount = 0;
    assert.throws(() => testingVerify({
      authorization: loaded.authorization,
      launch: () => {
        spentRetryLaunchCount += 1;
        return "FORBIDDEN_SPENT_ROOT_INJECTION_RETRY";
      },
      launchContext
    }), /requires one test-only reader authorization|already consumed|spent/i,
    "malformed selected testing launch must spend its authorization before schema rejection");
    assert.equal(spentRetryLaunchCount, 0,
      "spent malformed-options authorization retry reached launch");
    assert.deepEqual((await readdir(ledgerA.root)).sort(),
      [LEDGER_ANCHOR_FILENAME],
    "spent malformed-options retry mutated ledger A");
    assert.deepEqual((await readdir(ledgerB.root)).sort(),
      [LEDGER_ANCHOR_FILENAME],
    "spent malformed-options retry mutated ledger B");

    const positiveAuthorizationRequest = fixtureRequestReader({
      allowedRoot: requestRoot,
      expectedRequest: fixtureRequest,
      expectedSha256: fixtureRequestSha256,
      requestPath: fixtureRequestPath
    });
    assert.notEqual(positiveAuthorizationRequest, authorizationRequest,
      "positive path must use a fresh module-local request binding");
    assert.deepEqual(positiveAuthorizationRequest, authorizationRequest,
      "fresh positive request binding changed the same immutable request");
    const positiveLoaded = readThroughFixtureLedger(
      api,
      publishedV3,
      ledgerA.root,
      positiveAuthorizationRequest,
      testKeys
    );
    assert.notEqual(positiveLoaded.authorization, loaded.authorization,
      "positive path must use a fresh same-receipt testing authorization");

    let launchCount = 0;
    assert.equal(testingVerify({
      authorization: positiveLoaded.authorization,
      launch: () => {
        launchCount += 1;
        return "LEDGER_A_AUTHORIZED";
      },
      launchContext
    }), "LEDGER_A_AUTHORIZED",
    "exact v3 ledger-A authorization did not reach launch");
    assert.equal(launchCount, 1,
      "exact v3 ledger-A authorization did not launch exactly once");

    const markerPath = consumptionPath(ledgerA.root, v3Payload.attemptId);
    assert.deepEqual((await readdir(ledgerA.root)).sort(), [
      LEDGER_ANCHOR_FILENAME,
      path.basename(markerPath)
    ].sort(), "ledger A must contain one anchor and one deterministic marker");
    const markerIdentity = await lstat(markerPath, { bigint: true });
    assert.ok(markerIdentity.isFile() && !markerIdentity.isSymbolicLink() &&
      markerIdentity.nlink === BigInt(1),
    "ledger-A marker must be one regular singleton file");
    assert.equal(markerIdentity.mode & BigInt(0o777), BigInt(0o600),
      "ledger-A marker must be mode 0600");
    const markerBytes = await readFile(markerPath);
    const marker = JSON.parse(markerBytes.toString("utf8")) as
      Record<string, unknown>;
    assert.equal(typeof marker.consumedAt, "string",
      "v2 consumption marker must contain one consumedAt");
    assert.equal(new Date(marker.consumedAt as string).toISOString(),
      marker.consumedAt,
    "v2 consumption marker consumedAt must be canonical ISO");
    const expectedMarker = {
      attemptId: v3Payload.attemptId,
      attemptLedgerIdentitySha256: sha256(JSON.stringify(v3Payload.attemptLedger)),
      authorizationNonceSha256: sha256(v3Payload.authorizationNonce),
      authorizationRequestSha256: v3Payload.authorizationRequestSha256,
      buildId: v3Payload.buildId,
      consumedAt: marker.consumedAt,
      executionPlanSha256: v3Payload.executionPlanSha256,
      ledgerId: v3Payload.attemptLedger.ledgerId,
      maxInvocations: 1,
      receiptSha256: publishedV3.sha256,
      retryAuthorized: false,
      schema: V2_CONSUMPTION_SCHEMA,
      sourceSnapshotSha256: v3Payload.sourceSnapshotSha256,
      status: "CONSUMED_BEFORE_LAUNCH"
    };
    assert.deepEqual(marker, expectedMarker,
      "v2 consumption marker exact identity/schema drifted");
    assert.deepEqual(markerBytes, canonicalObjectBytes(expectedMarker),
      "v2 consumption marker must be canonical and LF-terminated");
  });

  await t.test("the same signed receipt cannot authorize a fresh different ledger", async () => {
    const testingVerify =
      api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch!;
    let launchCount = 0;
    assert.throws(() => {
      const loaded = readThroughFixtureLedger(
        api,
        publishedV3,
        ledgerB.root,
        authorizationRequest,
        testKeys
      );
      testingVerify({
        authorization: loaded.authorization,
        launch: () => {
          launchCount += 1;
          return "FORBIDDEN_LEDGER_B_REPLAY";
        },
        launchContext: launchContextFor(v3Payload)
      });
    }, /attempt ledger|anchor|birthtime|device|inode|identity|ledgerId|root/i,
    "a receipt signed for ledger A must reject against fresh ledger B");
    assert.equal(launchCount, 0,
      "fresh-ledger replay reached launch");
    assert.deepEqual((await readdir(ledgerB.root)).sort(),
      [LEDGER_ANCHOR_FILENAME],
    "fresh-ledger replay published a marker");
  });

  await t.test("same-path byte-identical anchor replacement rejects in fresh module state", async () => {
    const markerLeaf = path.basename(
      consumptionPath(ledgerA.root, v3Payload.attemptId)
    );
    const originalMarkerPath = path.join(ledgerA.root, markerLeaf);
    const originalMarkerBytes = await readFile(originalMarkerPath);
    const originalMarkerIdentity = await lstat(originalMarkerPath, {
      bigint: true
    });
    const originalRootIdentity = await lstat(ledgerA.root, { bigint: true });
    const retainedOriginalRoot = path.join(
      ledgerParent,
      "ledger-a-original-retained"
    );
    await rename(ledgerA.root, retainedOriginalRoot);
    await syncDirectory(ledgerParent);

    const replacementLedger = await provisionTestLedger(
      ledgerA.root,
      ledgerA.ledgerId
    );
    assert.deepEqual(replacementLedger.anchorBytes, ledgerA.anchorBytes,
      "same-path replacement fixture must copy byte-identical anchor bytes");
    assert.equal(
      replacementLedger.attemptLedger.rootPathSha256,
      ledgerA.attemptLedger.rootPathSha256,
      "same-path replacement must retain the exact signed pathname hash"
    );
    assert.notDeepEqual(
      {
        birthtimeNs: replacementLedger.attemptLedger.rootBirthtimeNs,
        dev: replacementLedger.attemptLedger.rootDev,
        ino: replacementLedger.attemptLedger.rootIno
      },
      {
        birthtimeNs: ledgerA.attemptLedger.rootBirthtimeNs,
        dev: ledgerA.attemptLedger.rootDev,
        ino: ledgerA.attemptLedger.rootIno
      },
      "same-path replacement fixture must have a different physical identity"
    );

    const freshModuleUrl = new URL(
      "./california-signature-exhaustive-artifact-lifecycle.ts",
      import.meta.url
    );
    freshModuleUrl.searchParams.set(
      "root-authority-replacement",
      String(Date.now())
    );
    const freshApi = await import(freshModuleUrl.href) as Api;
    const freshVerify =
      freshApi.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    const freshRequestReader =
      freshApi.readCaliforniaSignatureMeasuredAuthorizationRequest;
    assert.equal(typeof freshVerify, "function",
      "cache-busted test-only verifier must remain exported");
    assert.equal(typeof freshRequestReader, "function",
      "cache-busted ordinary request reader must remain exported");
    const freshAuthorizationRequest = freshRequestReader({
      allowedRoot: requestRoot,
      expectedRequest: fixtureRequest,
      expectedSha256: fixtureRequestSha256,
      requestPath: fixtureRequestPath
    });
    let launchCount = 0;
    assert.throws(() => {
      const loaded = readThroughFixtureLedger(
        freshApi,
        publishedV3,
        replacementLedger.root,
        freshAuthorizationRequest,
        testKeys
      );
      freshVerify({
        authorization: loaded.authorization,
        launch: () => {
          launchCount += 1;
          return "FORBIDDEN_SAME_PATH_REPLACEMENT_REPLAY";
        },
        launchContext: launchContextFor(v3Payload)
      });
    }, /attempt ledger|birthtime|device|inode|physical identity|replacement|root/i,
    "byte-identical same-path replacement must reject across fresh module state");
    assert.equal(launchCount, 0,
      "same-path replacement replay reached launch");
    assert.deepEqual((await readdir(replacementLedger.root)).sort(),
      [LEDGER_ANCHOR_FILENAME],
    "same-path replacement replay published a marker");

    const retainedRootIdentity = await lstat(retainedOriginalRoot, {
      bigint: true
    });
    for (const key of ["dev", "ino", "birthtimeNs"] as const) {
      assert.equal(retainedRootIdentity[key], originalRootIdentity[key],
        "retained original ledger " + key + " changed after rename");
    }
    const retainedMarkerPath = path.join(retainedOriginalRoot, markerLeaf);
    const retainedMarkerIdentity = await lstat(retainedMarkerPath, {
      bigint: true
    });
    for (const key of ["dev", "ino", "birthtimeNs", "size", "mode"] as const) {
      assert.equal(retainedMarkerIdentity[key], originalMarkerIdentity[key],
        "retained original marker " + key + " changed after replacement");
    }
    assert.deepEqual(await readFile(retainedMarkerPath), originalMarkerBytes,
      "retained original marker bytes changed after replacement");
    assert.deepEqual((await readdir(retainedOriginalRoot)).sort(), [
      LEDGER_ANCHOR_FILENAME,
      markerLeaf
    ].sort(), "original ledger and marker must remain retained");
  });

  await t.test("canonical v2 receipt remains non-authorizing", async () => {
    assert.throws(() => readThroughFixtureLedger(
      api,
      publishedV2,
      ledgerB.root,
      authorizationRequest,
      testKeys
    ), /v2|v3|schema|non-authorizing|authorization.*hold/i,
    "legacy canonical v2 receipt must not mint a launch authorization");
    assert.deepEqual((await readdir(ledgerB.root)).sort(),
      [LEDGER_ANCHOR_FILENAME],
    "legacy v2 receipt rejection mutated the attempt ledger");
  });
});

test("measured authorization owner-free APIs RED: fixed ledger authority and immutable request binding", async () => {
  const testRoot =
    process.env.CA_SIGNATURE_MEASURED_AUTHORIZATION_ROOT_AUTHORITY_TEST_ROOT?.trim();
  assert.ok(testRoot && path.isAbsolute(testRoot) &&
    testRoot.startsWith("/Volumes/Starship/"),
  "CA_SIGNATURE_MEASURED_AUTHORIZATION_ROOT_AUTHORITY_TEST_ROOT must be one absolute Starship path");
  assert.equal(path.normalize(testRoot), testRoot,
    "owner-free API test root must be normalized");
  assertTestRootDisjointFromProductionLedger(
    testRoot,
    "owner-free API test root"
  );
  const retainedRoot = path.join(testRoot, "owner-free-apis-red");
  const ledgerParent = path.join(retainedRoot, "ledgers");
  const requestRoot = path.join(retainedRoot, "requests");
  for (const [label, directory] of [
    ["owner-free API retained root", retainedRoot],
    ["owner-free API ledger parent", ledgerParent],
    ["owner-free API request root", requestRoot]
  ] as const) {
    assertTestRootDisjointFromProductionLedger(directory, label);
  }
  await assertPhysicalOwnedDirectory(testRoot, "owner-free API test root");

  for (const directory of [retainedRoot, ledgerParent, requestRoot]) {
    await mkdir(directory, { mode: 0o700 });
    await syncDirectory(path.dirname(directory));
    await assertPhysicalOwnedDirectory(directory, directory);
  }

  const authorityLedger = await provisionTestLedger(
    path.join(ledgerParent, "authority-ledger"),
    "measured-authority-ledger-0123456789abcdef0123456789abcdef"
  );
  const launchCommand = exactLaunchCommand();
  const buildInputs: AuthorizationRequestBuildInputs = {
    acceptanceRunId:
      "accept-owner-free-0123456789abcdef0123456789abcdef",
    attemptId:
      "attempt-owner-free-0123456789abcdef0123456789abcdef",
    buildId:
      "build-owner-free-0123456789abcdef0123456789abcdef",
    executionPlanSha256: sha256("owner-free exact execution plan"),
    launchCommand,
    matrixRunId:
      "matrix-owner-free-0123456789abcdef0123456789abcdef",
    origin: "http://127.0.0.1:43117",
    runtimeRunId:
      "runtime-owner-free-0123456789abcdef0123456789abcdef",
    sourceSnapshotSha256: sha256("owner-free frozen source snapshot")
  };
  const expectedRequest: AuthorizationRequest = {
    acceptanceRunId: buildInputs.acceptanceRunId,
    attemptId: buildInputs.attemptId,
    attemptLedger: authorityLedger.attemptLedger,
    buildId: buildInputs.buildId,
    executionPlanSha256: buildInputs.executionPlanSha256,
    launchCommand,
    matrixRunId: buildInputs.matrixRunId,
    maxInvocations: 1,
    origin: buildInputs.origin,
    requestedDecision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    retryAuthorized: false,
    runtimeRunId: buildInputs.runtimeRunId,
    schema: REQUEST_SCHEMA,
    sourceSnapshotSha256: buildInputs.sourceSnapshotSha256,
    status: "AWAITING_OWNER_REVIEW"
  };
  assert.deepEqual(Object.keys(expectedRequest), [
    "acceptanceRunId",
    "attemptId",
    "attemptLedger",
    "buildId",
    "executionPlanSha256",
    "launchCommand",
    "matrixRunId",
    "maxInvocations",
    "origin",
    "requestedDecision",
    "requiredProjects",
    "retryAuthorized",
    "runtimeRunId",
    "schema",
    "sourceSnapshotSha256",
    "status"
  ], "authorization request fixture schema/order drifted");

  const ledgerAuthorityExportNames = Object.keys(lifecycle)
    .filter((name) => name.replaceAll("_", "").toLowerCase().includes(
      "californiasignaturemeasuredauthorizationledger"
    ))
    .sort();
  assert.deepEqual(ledgerAuthorityExportNames, [
    "CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT",
    "__testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority",
    "readCaliforniaSignatureMeasuredAuthorizationLedgerAuthority"
  ].sort(),
  "measured-authorization ledger exports must be exactly one constant and two read-only readers with no provisioning/write surface");

  const measuredAuthorizationExportNames = Object.keys(lifecycle)
    .filter((name) => name.replaceAll("_", "").toLowerCase().includes(
      "californiasignaturemeasuredauthorization"
    ))
    .sort();
  const mutatingMeasuredAuthorizationExports =
    measuredAuthorizationExportNames.filter((name) =>
      /create|initialize|provision|publish|write|replace|truncate|chmod|chown|delete|remove|unlink|rename|mkdir|open|append|mutate|consume|mark|reset|rotate|revoke/i.test(
        name.replaceAll("_", "")
      ));
  assert.deepEqual(mutatingMeasuredAuthorizationExports, [],
    "the complete measured-authorization export prefix must expose no mutation verb");

  const productionAuthorityReader =
    api.readCaliforniaSignatureMeasuredAuthorizationLedgerAuthority;
  const testingAuthorityReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority;
  const requestBuilder =
    api.buildCaliforniaSignatureMeasuredAuthorizationRequest;
  const testingRequestBuilder =
    api.__testingBuildCaliforniaSignatureMeasuredAuthorizationRequest;
  const requestReader =
    api.readCaliforniaSignatureMeasuredAuthorizationRequest;
  const testingRequestReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationRequest;
  assert.equal(typeof productionAuthorityReader, "function",
    "production zero-option measured-authorization ledger-authority reader must be exported");
  assert.equal(productionAuthorityReader.length, 0,
    "production ledger-authority reader must accept no caller-selected root or other options");
  assert.equal(typeof testingAuthorityReader, "function",
    "test-only measured-authorization ledger-authority reader must be exported");
  assert.equal(testingAuthorityReader.length, 1,
    "test-only ledger-authority reader must accept one exact options object");
  assert.equal(typeof requestBuilder, "function",
    "production measured-authorization request builder must be exported");
  assert.equal(requestBuilder.length, 1,
    "production measured-authorization request builder must accept one exact inputs object");
  assert.equal(typeof testingRequestBuilder, "function",
    "test-only branded-authority measured-authorization request builder must be exported");
  assert.equal(testingRequestBuilder.length, 1,
    "test-only request builder must accept one exact inputs object");
  assert.equal(typeof requestReader, "function",
    "production measured-authorization request reader must be exported");
  assert.equal(requestReader.length, 1,
    "production measured-authorization request reader must accept one exact binding object");
  assert.equal(typeof testingRequestReader, "function",
    "test-only final-verification request reader must be exported");
  assert.equal(testingRequestReader.length, 1,
    "test-only request reader must accept one exact binding and hook object");
  assert.equal(
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT,
    GLOBAL_LEDGER_ROOT,
    "production authority reader must remain bound only to the immutable global ledger-root constant"
  );

  const normalizedProductionAuthoritySource = Function.prototype.toString
    .call(productionAuthorityReader)
    .replace(/\s+/g, "");
  const productionAuthoritySourceShape = normalizedProductionAuthoritySource.match(
    /^functionreadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority\(\)\{(?:assert|import_[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.equal\(arguments\.length,0,(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)\);return([A-Za-z_$][\w$]*)\(CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT\);?\}$/
  );
  assert.ok(productionAuthoritySourceShape,
    "production ledger-authority reader must first assert.equal(arguments.length, 0, <literal>) and then make one constant-only private-reader call");
  assert.notEqual(
    productionAuthoritySourceShape[1],
    "readCaliforniaSignatureMeasuredAuthorizationLedgerAuthority",
    "production ledger-authority reader must delegate to a private reader instead of recursing"
  );
  const executableProductionAuthoritySource =
    normalizedProductionAuthoritySource.replace(
      /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
      "<guard-message-literal>"
    );
  assert.equal(
    executableProductionAuthoritySource.match(
      /CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT/g
    )?.length,
    1,
    "production ledger-authority reader must contain exactly one root token: the fixed exported constant"
  );
  assert.doesNotMatch(executableProductionAuthoritySource,
    /arguments\[|arguments\.at\(|process\.env|import\.meta\.env|Deno\.env|Bun\.env|attemptLedgerRoot|testOnlyAttemptLedgerRoot/i,
  "production ledger-authority reader must not derive or override its root from caller arguments or environment state");

  const forbiddenProductionAuthorityArguments: readonly [string, unknown][] = [
    ["raw root string", authorityLedger.root],
    ["root object", { root: authorityLedger.root }],
    ["attemptLedgerRoot object", {
      attemptLedgerRoot: authorityLedger.root
    }],
    ["testOnlyAttemptLedgerRoot object", {
      testOnlyAttemptLedgerRoot: authorityLedger.root
    }]
  ];
  for (const [label, forbiddenArgument] of
    forbiddenProductionAuthorityArguments) {
    assertRejectsBeforeFixedLedgerAccess(
      () => Reflect.apply(
        productionAuthorityReader,
        undefined,
        [forbiddenArgument]
      ),
      "production authority reader accepted " + label
    );
  }

  const signedAuthority = testingAuthorityReader({
    testOnlyAttemptLedgerRoot: authorityLedger.root
  });
  assert.deepEqual(Object.keys(signedAuthority), [
    "anchorSha256",
    "ledgerId",
    "rootBirthtimeNs",
    "rootDev",
    "rootIno",
    "rootPathSha256"
  ], "test ledger-authority reader returned a non-exact six-key identity schema/order");
  assert.deepEqual(signedAuthority, authorityLedger.attemptLedger,
    "test ledger-authority reader did not return the fixture ledger's exact identity");
  assertDeepFrozen(signedAuthority,
    "test ledger-authority reader branded identity");
  assert.throws(() => {
    (signedAuthority as { ledgerId: string }).ledgerId =
      "forbidden-authority-mutation";
  }, TypeError,
  "test ledger-authority reader returned a mutable branded identity");
  assert.throws(() => testingAuthorityReader({
    testOnlyAttemptLedgerRoot: authorityLedger.root,
    unknownLedgerAuthorityOption: "forbidden"
  } as unknown as { testOnlyAttemptLedgerRoot: string }),
  /exact schema|unknown.*unknownLedgerAuthorityOption|unknown.*key/i,
  "test ledger-authority reader accepted an unknown option");

  const changedAnchorLedger = await provisionTestLedger(
    path.join(ledgerParent, "changed-anchor-ledger"),
    "measured-changed-anchor-0123456789abcdef0123456789abcdef"
  );
  const changedAnchorBytes = canonicalObjectBytes({
    ledgerId: changedAnchorLedger.ledgerId,
    rootPathSha256: changedAnchorLedger.attemptLedger.rootPathSha256,
    schema: LEDGER_ANCHOR_SCHEMA,
    status: "REVOKED"
  });
  const changedAnchorHandle = await open(changedAnchorLedger.anchorPath, "r+");
  try {
    await changedAnchorHandle.truncate(0);
    await changedAnchorHandle.writeFile(changedAnchorBytes);
    await changedAnchorHandle.sync();
  } finally {
    await changedAnchorHandle.close();
  }
  await syncDirectory(changedAnchorLedger.root);
  assert.throws(() => testingAuthorityReader({
    testOnlyAttemptLedgerRoot: changedAnchorLedger.root
  }), /anchor|ACTIVE|canonical|status/i,
  "test ledger-authority reader accepted changed anchor bytes");

  const replacedAnchorLedger = await provisionTestLedger(
    path.join(ledgerParent, "replaced-anchor-ledger"),
    "measured-replaced-anchor-0123456789abcdef0123456789abcdef"
  );
  const retainedAnchorPath = path.join(
    replacedAnchorLedger.root,
    ".retained-original-ledger-anchor.json"
  );
  await rename(replacedAnchorLedger.anchorPath, retainedAnchorPath);
  await syncDirectory(replacedAnchorLedger.root);
  await symlink(path.basename(retainedAnchorPath), replacedAnchorLedger.anchorPath);
  await syncDirectory(replacedAnchorLedger.root);
  assert.throws(() => testingAuthorityReader({
    testOnlyAttemptLedgerRoot: replacedAnchorLedger.root
  }), /anchor.*(?:symlink|physical|regular|singleton)|symlink.*anchor/i,
  "test ledger-authority reader accepted a replaced anchor pathname");

  const changedRootLedger = await provisionTestLedger(
    path.join(ledgerParent, "changed-root-ledger"),
    "measured-changed-root-0123456789abcdef0123456789abcdef"
  );
  await chmod(changedRootLedger.root, 0o755);
  assert.throws(() => testingAuthorityReader({
    testOnlyAttemptLedgerRoot: changedRootLedger.root
  }), /root.*(?:mode|0700)|0700.*root/i,
  "test ledger-authority reader accepted changed ledger-root authority mode");

  const replacedRootLedger = await provisionTestLedger(
    path.join(ledgerParent, "replaced-root-ledger"),
    "measured-replaced-root-0123456789abcdef0123456789abcdef"
  );
  const retainedLedgerRoot = path.join(
    ledgerParent,
    "replaced-root-ledger-original-retained"
  );
  await rename(replacedRootLedger.root, retainedLedgerRoot);
  await syncDirectory(ledgerParent);
  await symlink(path.basename(retainedLedgerRoot), replacedRootLedger.root, "dir");
  await syncDirectory(ledgerParent);
  assert.throws(() => testingAuthorityReader({
    testOnlyAttemptLedgerRoot: replacedRootLedger.root
  }), /root.*(?:symlink|physical|directory)|symlink.*root/i,
  "test ledger-authority reader accepted a replaced ledger-root pathname");

  assertRejectsBeforeFixedLedgerAccess(() => requestBuilder({
    ...buildInputs,
    attemptLedger: signedAuthority
  } as unknown as AuthorizationRequestBuildInputs),
  "production request builder accepted raw attemptLedger authority");
  assertRejectsBeforeFixedLedgerAccess(() => requestBuilder({
    ...buildInputs,
    testOnlyLedgerAuthority: signedAuthority
  } as unknown as AuthorizationRequestBuildInputs),
  "production request builder accepted test-only ledger authority");

  const clonedAuthority = deepFreezeFixture(structuredClone(signedAuthority));
  assert.deepEqual(clonedAuthority, signedAuthority,
    "structured-clone authority attack fixture changed visible identity values");
  assertDeepFrozen(clonedAuthority,
    "structured-clone authority attack fixture");
  assert.throws(() => testingRequestBuilder({
    ...buildInputs,
    launchCommand: exactLaunchCommand(),
    testOnlyLedgerAuthority: clonedAuthority
  }), /brand|opaque|provenance|reader-issued|ledger authority/i,
  "test-only request builder accepted a structuredClone that lost authority provenance");

  const handShapedAuthority = deepFreezeFixture({
    anchorSha256: signedAuthority.anchorSha256,
    ledgerId: signedAuthority.ledgerId,
    rootBirthtimeNs: signedAuthority.rootBirthtimeNs,
    rootDev: signedAuthority.rootDev,
    rootIno: signedAuthority.rootIno,
    rootPathSha256: signedAuthority.rootPathSha256
  });
  assert.deepEqual(Object.keys(handShapedAuthority), Object.keys(signedAuthority),
    "hand-shaped authority attack fixture must have the same exact six visible keys");
  assert.deepEqual(handShapedAuthority, signedAuthority,
    "hand-shaped authority attack fixture changed visible identity values");
  assertDeepFrozen(handShapedAuthority,
    "hand-shaped authority attack fixture");
  assert.throws(() => testingRequestBuilder({
    ...buildInputs,
    launchCommand: exactLaunchCommand(),
    testOnlyLedgerAuthority: handShapedAuthority
  }), /brand|opaque|provenance|reader-issued|ledger authority/i,
  "test-only request builder accepted a frozen hand-shaped authority identity");

  const requestInputs: TestingAuthorizationRequestBuildInputs = {
    ...buildInputs,
    launchCommand: exactLaunchCommand(),
    testOnlyLedgerAuthority: signedAuthority
  };
  const builtRequest = testingRequestBuilder(requestInputs);
  assert.deepEqual(Object.keys(builtRequest), [
    "acceptanceRunId",
    "attemptId",
    "attemptLedger",
    "buildId",
    "executionPlanSha256",
    "launchCommand",
    "matrixRunId",
    "maxInvocations",
    "origin",
    "requestedDecision",
    "requiredProjects",
    "retryAuthorized",
    "runtimeRunId",
    "schema",
    "sourceSnapshotSha256",
    "status"
  ], "test-only authorization request builder schema/order drifted");
  assert.deepEqual(builtRequest, expectedRequest,
    "test-only authorization request builder did not return the exact deterministic v1 request");
  assertDeepFrozen(builtRequest,
    "built measured-authorization request");
  assert.throws(() => {
    (builtRequest.requiredProjects as unknown as string[]).push(
      "forbidden-project"
    );
  }, TypeError,
  "test-only authorization request builder returned a mutable nested project list");
  const rebuiltRequest = testingRequestBuilder({
    ...requestInputs,
    launchCommand: exactLaunchCommand()
  });
  assert.deepEqual(rebuiltRequest, builtRequest,
    "test-only authorization request builder is not deterministic for exact equal inputs");
  assertDeepFrozen(rebuiltRequest,
    "rebuilt measured-authorization request");
  assert.throws(() => testingRequestBuilder({
    ...requestInputs,
    requestedDecision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS"
  } as unknown as TestingAuthorizationRequestBuildInputs),
  /exact schema|unknown.*requestedDecision|unknown.*key/i,
  "test-only authorization request builder accepted a caller-selected authorization decision");

  const requestBytes = canonicalPrettyObjectBytes(
    builtRequest as unknown as Record<string, unknown>
  );
  assert.deepEqual(
    requestBytes,
    Buffer.from(JSON.stringify(expectedRequest, null, 2) + "\n", "utf8"),
    "branded test-only builder output must produce canonical pretty JSON plus LF"
  );
  const requestPath = path.join(
    requestRoot,
    "california-signature-measured-authorization-request.json"
  );
  await publishExclusiveDurableReadonlyFile(requestPath, requestBytes);
  const requestSha256 = sha256(requestBytes);
  const originalRequestIdentity = await lstat(requestPath, { bigint: true });
  const originalRequestBytes = await readFile(requestPath);
  const immutableFileIdentityKeys = [
    "dev",
    "ino",
    "birthtimeNs",
    "size",
    "mode",
    "nlink",
    "uid",
    "mtimeNs",
    "ctimeNs"
  ] as const;

  const loadedRequest = requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath
  });
  assert.deepEqual(Object.keys(loadedRequest), ["fileSha256", "request"],
    "authorization request reader binding schema/order drifted");
  assert.deepEqual(loadedRequest, {
    fileSha256: requestSha256,
    request: expectedRequest
  }, "authorization request reader returned the wrong frozen binding");
  assert.notEqual(loadedRequest.request, builtRequest,
    "authorization request reader returned its caller's object instead of the independently parsed file request");
  assertDeepFrozen(loadedRequest,
    "loaded measured-authorization request binding");
  assert.throws(() => {
    (loadedRequest as { fileSha256: string }).fileSha256 = "0".repeat(64);
  }, TypeError,
  "authorization request reader returned a mutable binding");

  let productionHookCallCount = 0;
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath,
    testOnlyBeforeFinalVerification: () => {
      productionHookCallCount += 1;
    }
  } as unknown as AuthorizationRequestReaderOptions),
  /exact schema|unknown.*testOnlyBeforeFinalVerification|test-only.*hook|unknown.*key/i,
  "production request reader accepted the deterministic test-only race hook");
  assert.equal(productionHookCallCount, 0,
    "production request reader invoked a rejected test-only race hook");
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath,
    unknownRequestReaderOption: "forbidden"
  } as unknown as AuthorizationRequestReaderOptions),
  /exact schema|unknown.*unknownRequestReaderOption|unknown.*key/i,
  "authorization request reader accepted an unknown option");
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: "0".repeat(64),
    requestPath
  }), /SHA|sha256|digest/i,
  "authorization request reader accepted the wrong external SHA");

  type MutableRequestFixture = Record<string, unknown> & {
    attemptLedger: Record<string, string>;
    launchCommand: Record<string, unknown>;
    requiredProjects: string[];
  };
  const expectedRequestMismatches: readonly {
    label: string;
    mutate: (candidate: MutableRequestFixture) => void;
  }[] = [
    {
      label: "acceptanceRunId",
      mutate: (candidate) => {
        candidate.acceptanceRunId =
          "accept-mismatch-0123456789abcdef0123456789abcdef";
      }
    },
    {
      label: "attemptId",
      mutate: (candidate) => {
        candidate.attemptId =
          "attempt-mismatch-0123456789abcdef0123456789abcdef";
      }
    },
    {
      label: "attemptLedger.anchorSha256",
      mutate: (candidate) => {
        candidate.attemptLedger.anchorSha256 = sha256("wrong anchor");
      }
    },
    {
      label: "attemptLedger.ledgerId",
      mutate: (candidate) => {
        candidate.attemptLedger.ledgerId =
          "measured-mismatch-ledger-0123456789abcdef0123456789abcdef";
      }
    },
    {
      label: "attemptLedger.rootBirthtimeNs",
      mutate: (candidate) => {
        candidate.attemptLedger.rootBirthtimeNs = String(
          BigInt(candidate.attemptLedger.rootBirthtimeNs) + BigInt(1)
        );
      }
    },
    {
      label: "attemptLedger.rootDev",
      mutate: (candidate) => {
        candidate.attemptLedger.rootDev = String(
          BigInt(candidate.attemptLedger.rootDev) + BigInt(1)
        );
      }
    },
    {
      label: "attemptLedger.rootIno",
      mutate: (candidate) => {
        candidate.attemptLedger.rootIno = String(
          BigInt(candidate.attemptLedger.rootIno) + BigInt(1)
        );
      }
    },
    {
      label: "attemptLedger.rootPathSha256",
      mutate: (candidate) => {
        candidate.attemptLedger.rootPathSha256 = sha256("wrong ledger path");
      }
    },
    {
      label: "buildId",
      mutate: (candidate) => {
        candidate.buildId =
          "build-mismatch-0123456789abcdef0123456789abcdef";
      }
    },
    {
      label: "executionPlanSha256",
      mutate: (candidate) => {
        candidate.executionPlanSha256 = sha256("wrong execution plan");
      }
    },
    {
      label: "launchCommand.projects",
      mutate: (candidate) => {
        candidate.launchCommand.projects = ["mobile-chrome", "desktop-chrome"];
      }
    },
    {
      label: "launchCommand.repeatEach",
      mutate: (candidate) => {
        candidate.launchCommand.repeatEach = 2;
      }
    },
    {
      label: "launchCommand.reporter",
      mutate: (candidate) => {
        candidate.launchCommand.reporter = "line";
      }
    },
    {
      label: "launchCommand.retries",
      mutate: (candidate) => {
        candidate.launchCommand.retries = 1;
      }
    },
    {
      label: "launchCommand.specPath",
      mutate: (candidate) => {
        candidate.launchCommand.specPath =
          "tests/e2e/california-signature-measured-authorization.test.ts";
      }
    },
    {
      label: "launchCommand.workers",
      mutate: (candidate) => {
        candidate.launchCommand.workers = 2;
      }
    },
    {
      label: "matrixRunId",
      mutate: (candidate) => {
        candidate.matrixRunId =
          "matrix-mismatch-0123456789abcdef0123456789abcdef";
      }
    },
    {
      label: "maxInvocations",
      mutate: (candidate) => {
        candidate.maxInvocations = 2;
      }
    },
    {
      label: "origin",
      mutate: (candidate) => {
        candidate.origin = "http://127.0.0.1:43118";
      }
    },
    {
      label: "requestedDecision",
      mutate: (candidate) => {
        candidate.requestedDecision = "REJECTED";
      }
    },
    {
      label: "requiredProjects",
      mutate: (candidate) => {
        candidate.requiredProjects = ["mobile-chrome", "desktop-chrome"];
      }
    },
    {
      label: "retryAuthorized",
      mutate: (candidate) => {
        candidate.retryAuthorized = true;
      }
    },
    {
      label: "runtimeRunId",
      mutate: (candidate) => {
        candidate.runtimeRunId =
          "runtime-mismatch-0123456789abcdef0123456789abcdef";
      }
    },
    {
      label: "schema",
      mutate: (candidate) => {
        candidate.schema =
          "ca.california-signature.measured-authorization-request.v2";
      }
    },
    {
      label: "sourceSnapshotSha256",
      mutate: (candidate) => {
        candidate.sourceSnapshotSha256 = sha256("wrong source snapshot");
      }
    },
    {
      label: "status",
      mutate: (candidate) => {
        candidate.status = "AUTHORIZED";
      }
    }
  ];
  for (const mismatch of expectedRequestMismatches) {
    const candidate = structuredClone(builtRequest) as unknown as
      MutableRequestFixture;
    mismatch.mutate(candidate);
    const frozenCandidate = deepFreezeFixture(candidate) as unknown as
      AuthorizationRequest;
    assertDeepFrozen(frozenCandidate,
      "wrong expected request for " + mismatch.label);
    assert.throws(() => requestReader({
      allowedRoot: requestRoot,
      expectedRequest: frozenCandidate,
      expectedSha256: requestSha256,
      requestPath
    }), /expected request|request.*(?:differ|mismatch|schema|binding)|invalid.*request/i,
    "authorization request reader accepted mismatched " + mismatch.label);
    assert.deepEqual(await readFile(requestPath), originalRequestBytes,
      "mismatched " + mismatch.label + " changed original request bytes");
    const afterMismatchIdentity = await lstat(requestPath, { bigint: true });
    assertIdentityFields(
      afterMismatchIdentity,
      originalRequestIdentity,
      immutableFileIdentityKeys,
      "mismatched " + mismatch.label + " changed original request identity"
    );
  }

  const unknownFieldRequest = {
    ...structuredClone(builtRequest),
    unknownRequestField: "forbidden"
  };
  const unknownFieldRequestBytes = canonicalPrettyObjectBytes(
    unknownFieldRequest as unknown as Record<string, unknown>
  );
  const unknownFieldRequestPath = path.join(
    requestRoot,
    "unknown-field-request.json"
  );
  await publishExclusiveDurableReadonlyFile(
    unknownFieldRequestPath,
    unknownFieldRequestBytes
  );
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: sha256(unknownFieldRequestBytes),
    requestPath: unknownFieldRequestPath
  }), /exact schema|unknown.*unknownRequestField|unknown.*key/i,
  "authorization request reader accepted an unknown file field");

  const missingFieldRequest = structuredClone(builtRequest) as unknown as
    Record<string, unknown>;
  delete missingFieldRequest.sourceSnapshotSha256;
  const missingFieldRequestBytes = canonicalPrettyObjectBytes(
    missingFieldRequest
  );
  const missingFieldRequestPath = path.join(
    requestRoot,
    "missing-field-request.json"
  );
  await publishExclusiveDurableReadonlyFile(
    missingFieldRequestPath,
    missingFieldRequestBytes
  );
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: sha256(missingFieldRequestBytes),
    requestPath: missingFieldRequestPath
  }), /exact schema|missing.*sourceSnapshotSha256|missing.*key/i,
  "authorization request reader accepted a missing file field");

  const requestSymlinkPath = path.join(requestRoot, "request-path-replacement.json");
  await symlink(path.basename(requestPath), requestSymlinkPath);
  await syncDirectory(requestRoot);
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath: requestSymlinkPath
  }), /request.*(?:symlink|physical|regular|singleton)|symlink.*request/i,
  "authorization request reader accepted a symlink pathname replacement");

  const nestedRequestRoot = path.join(requestRoot, "nested");
  await mkdir(nestedRequestRoot, { mode: 0o700 });
  await syncDirectory(requestRoot);
  const nestedRequestPath = path.join(nestedRequestRoot, "nested-request.json");
  await publishExclusiveDurableReadonlyFile(nestedRequestPath, requestBytes);
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath: nestedRequestPath
  }), /direct child|escaped|allowed root|parent/i,
  "authorization request reader accepted a non-direct-child request path");

  const oneLineRequestBytes = canonicalObjectBytes(
    builtRequest as unknown as Record<string, unknown>
  );
  const oneLineRequestPath = path.join(requestRoot, "one-line-request.json");
  await publishExclusiveDurableReadonlyFile(
    oneLineRequestPath,
    oneLineRequestBytes
  );
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: sha256(oneLineRequestBytes),
    requestPath: oneLineRequestPath
  }), /canonical|pretty|JSON|format/i,
  "authorization request reader accepted compact instead of pretty canonical JSON");

  const missingLfBytes = Buffer.from(
    JSON.stringify(builtRequest, null, 2),
    "utf8"
  );
  const missingLfPath = path.join(requestRoot, "missing-lf-request.json");
  await publishExclusiveDurableReadonlyFile(missingLfPath, missingLfBytes);
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: sha256(missingLfBytes),
    requestPath: missingLfPath
  }), /canonical|LF|newline|JSON|format/i,
  "authorization request reader accepted canonical JSON without the terminal LF");

  const writableRequestPath = path.join(requestRoot, "writable-request.json");
  await publishExclusiveDurableFile(writableRequestPath, requestBytes);
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath: writableRequestPath
  }), /0400|mode|immutable/i,
  "authorization request reader accepted a mode-0600 request");

  const linkedRequestPath = path.join(requestRoot, "linked-request.json");
  const linkedRequestAliasPath = path.join(requestRoot, "linked-request-alias.json");
  await publishExclusiveDurableReadonlyFile(linkedRequestPath, requestBytes);
  await link(linkedRequestPath, linkedRequestAliasPath);
  await syncDirectory(requestRoot);
  assert.throws(() => requestReader({
    allowedRoot: requestRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath: linkedRequestPath
  }), /singleton|link|nlink/i,
  "authorization request reader accepted a multiply linked request file");

  const permissiveRequestRoot = path.join(retainedRoot, "mode-0755-request-root");
  await mkdir(permissiveRequestRoot, { mode: 0o700 });
  await syncDirectory(retainedRoot);
  await assertPhysicalOwnedDirectory(
    permissiveRequestRoot,
    "pre-attack permissive request root"
  );
  const permissiveRequestPath = path.join(
    permissiveRequestRoot,
    "request.json"
  );
  await publishExclusiveDurableReadonlyFile(permissiveRequestPath, requestBytes);
  await chmod(permissiveRequestRoot, 0o755);
  assert.throws(() => requestReader({
    allowedRoot: permissiveRequestRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath: permissiveRequestPath
  }), /allowed root.*(?:mode|0700)|0700.*allowed root|root.*0700/i,
  "authorization request reader accepted a non-private mode-0755 allowedRoot");

  const physicalRequestRoot = path.join(retainedRoot, "physical-request-root");
  await mkdir(physicalRequestRoot, { mode: 0o700 });
  await syncDirectory(retainedRoot);
  await assertPhysicalOwnedDirectory(
    physicalRequestRoot,
    "physical request root symlink target"
  );
  const physicalRequestPath = path.join(physicalRequestRoot, "request.json");
  await publishExclusiveDurableReadonlyFile(physicalRequestPath, requestBytes);
  const symlinkRequestRoot = path.join(retainedRoot, "symlink-request-root");
  await symlink(path.basename(physicalRequestRoot), symlinkRequestRoot, "dir");
  await syncDirectory(retainedRoot);
  assert.throws(() => requestReader({
    allowedRoot: symlinkRequestRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath: path.join(symlinkRequestRoot, "request.json")
  }), /allowed root.*(?:symlink|physical|directory)|symlink.*allowed root/i,
  "authorization request reader accepted a symlink allowedRoot");

  const requestRaceRoot = path.join(retainedRoot, "request-replacement-race");
  await mkdir(requestRaceRoot, { mode: 0o700 });
  await syncDirectory(retainedRoot);
  await assertPhysicalOwnedDirectory(requestRaceRoot,
    "request replacement race root");
  const raceRequestPath = path.join(requestRaceRoot, "request.json");
  const stagedRaceRequestPath = path.join(
    requestRaceRoot,
    ".request.replacement-staged.json"
  );
  const retainedRaceRequestPath = path.join(
    requestRaceRoot,
    ".request.original-retained.json"
  );
  await publishExclusiveDurableReadonlyFile(raceRequestPath, requestBytes);
  await publishExclusiveDurableReadonlyFile(stagedRaceRequestPath, requestBytes);
  const originalRaceRequestIdentity = await lstat(raceRequestPath, {
    bigint: true
  });
  const stagedRaceRequestIdentity = await lstat(stagedRaceRequestPath, {
    bigint: true
  });
  assert.notEqual(originalRaceRequestIdentity.ino, stagedRaceRequestIdentity.ino,
    "request replacement attack needs distinct physical file identities");
  const originalRaceRequestBytes = await readFile(raceRequestPath);
  const stagedRaceRequestBytes = await readFile(stagedRaceRequestPath);
  let requestRaceHookCallCount = 0;
  assert.throws(() => testingRequestReader({
    allowedRoot: requestRaceRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath: raceRequestPath,
    testOnlyBeforeFinalVerification: () => {
      assert.equal(requestRaceHookCallCount, 0,
        "request replacement hook must run exactly once");
      requestRaceHookCallCount += 1;
      renameSync(raceRequestPath, retainedRaceRequestPath);
      renameSync(stagedRaceRequestPath, raceRequestPath);
    }
  }), /changed|replaced|identity|inode|pathname|final verification/i,
  "test-only request reader accepted same-path request replacement after held-FD readback");
  await syncDirectory(requestRaceRoot);
  assert.equal(requestRaceHookCallCount, 1,
    "test-only request reader did not invoke the request replacement hook exactly once");
  const retainedRaceRequestIdentity = await lstat(retainedRaceRequestPath, {
    bigint: true
  });
  const currentRaceRequestIdentity = await lstat(raceRequestPath, {
    bigint: true
  });
  const raceFileIdentityKeys = [
    "dev",
    "ino",
    "birthtimeNs",
    "size",
    "mode",
    "nlink",
    "uid",
    "mtimeNs"
  ] as const;
  assertIdentityFields(
    retainedRaceRequestIdentity,
    originalRaceRequestIdentity,
    raceFileIdentityKeys,
    "retained original request-race file"
  );
  assertIdentityFields(
    currentRaceRequestIdentity,
    stagedRaceRequestIdentity,
    raceFileIdentityKeys,
    "current replacement request-race file"
  );
  assert.deepEqual(await readFile(retainedRaceRequestPath),
    originalRaceRequestBytes,
  "retained original request-race bytes changed");
  assert.deepEqual(await readFile(raceRequestPath), stagedRaceRequestBytes,
    "current replacement request-race bytes changed");
  assert.deepEqual((await readdir(requestRaceRoot)).sort(), [
    path.basename(raceRequestPath),
    path.basename(retainedRaceRequestPath)
  ].sort(), "request replacement race must retain exactly both physical files");

  const rootRaceParent = path.join(retainedRoot, "root-replacement-race");
  await mkdir(rootRaceParent, { mode: 0o700 });
  await syncDirectory(retainedRoot);
  await assertPhysicalOwnedDirectory(rootRaceParent,
    "request root replacement race parent");
  const boundRaceRoot = path.join(rootRaceParent, "bound-root");
  const stagedRaceRoot = path.join(rootRaceParent, "replacement-staged-root");
  const retainedRaceRoot = path.join(rootRaceParent, "original-root-retained");
  for (const directory of [boundRaceRoot, stagedRaceRoot]) {
    await mkdir(directory, { mode: 0o700 });
    await syncDirectory(rootRaceParent);
    await assertPhysicalOwnedDirectory(directory, directory);
  }
  const boundRootRequestPath = path.join(boundRaceRoot, "request.json");
  const stagedRootRequestPath = path.join(stagedRaceRoot, "request.json");
  await publishExclusiveDurableReadonlyFile(boundRootRequestPath, requestBytes);
  await publishExclusiveDurableReadonlyFile(stagedRootRequestPath, requestBytes);
  const originalBoundRootIdentity = await lstat(boundRaceRoot, { bigint: true });
  const stagedRootIdentity = await lstat(stagedRaceRoot, { bigint: true });
  assert.notEqual(originalBoundRootIdentity.ino, stagedRootIdentity.ino,
    "root replacement attack needs distinct physical directory identities");
  const originalBoundFileIdentity = await lstat(boundRootRequestPath, {
    bigint: true
  });
  const stagedRootFileIdentity = await lstat(stagedRootRequestPath, {
    bigint: true
  });
  const originalBoundFileBytes = await readFile(boundRootRequestPath);
  const stagedRootFileBytes = await readFile(stagedRootRequestPath);
  let rootRaceHookCallCount = 0;
  assert.throws(() => testingRequestReader({
    allowedRoot: boundRaceRoot,
    expectedRequest: builtRequest,
    expectedSha256: requestSha256,
    requestPath: boundRootRequestPath,
    testOnlyBeforeFinalVerification: () => {
      assert.equal(rootRaceHookCallCount, 0,
        "root replacement hook must run exactly once");
      rootRaceHookCallCount += 1;
      renameSync(boundRaceRoot, retainedRaceRoot);
      renameSync(stagedRaceRoot, boundRaceRoot);
    }
  }), /root.*(?:changed|replaced|identity|inode)|final verification/i,
  "test-only request reader accepted same-path allowedRoot replacement after held-FD readback");
  await syncDirectory(rootRaceParent);
  assert.equal(rootRaceHookCallCount, 1,
    "test-only request reader did not invoke the root replacement hook exactly once");
  const retainedRootIdentity = await lstat(retainedRaceRoot, { bigint: true });
  const currentBoundRootIdentity = await lstat(boundRaceRoot, { bigint: true });
  const rootIdentityKeys = ["dev", "ino", "birthtimeNs", "mode", "uid"] as const;
  assertIdentityFields(
    retainedRootIdentity,
    originalBoundRootIdentity,
    rootIdentityKeys,
    "retained original request root"
  );
  assertIdentityFields(
    currentBoundRootIdentity,
    stagedRootIdentity,
    rootIdentityKeys,
    "current replacement request root"
  );
  await assertPhysicalOwnedDirectory(retainedRaceRoot,
    "retained original request root");
  await assertPhysicalOwnedDirectory(boundRaceRoot,
    "current replacement request root");
  const retainedRootFilePath = path.join(retainedRaceRoot, "request.json");
  const currentBoundFilePath = path.join(boundRaceRoot, "request.json");
  const retainedRootFileIdentity = await lstat(retainedRootFilePath, {
    bigint: true
  });
  const currentBoundFileIdentity = await lstat(currentBoundFilePath, {
    bigint: true
  });
  assertIdentityFields(
    retainedRootFileIdentity,
    originalBoundFileIdentity,
    raceFileIdentityKeys,
    "retained original request-root file"
  );
  assertIdentityFields(
    currentBoundFileIdentity,
    stagedRootFileIdentity,
    raceFileIdentityKeys,
    "current replacement request-root file"
  );
  assert.deepEqual(await readFile(retainedRootFilePath), originalBoundFileBytes,
    "retained original request-root bytes changed");
  assert.deepEqual(await readFile(currentBoundFilePath), stagedRootFileBytes,
    "current replacement request-root bytes changed");
  assert.deepEqual((await readdir(rootRaceParent)).sort(), [
    path.basename(boundRaceRoot),
    path.basename(retainedRaceRoot)
  ].sort(), "root replacement race must retain exactly both physical roots");

  assert.deepEqual(await readFile(requestPath), originalRequestBytes,
    "owner-free attacks changed original request bytes");
  const finalRequestIdentity = await lstat(requestPath, { bigint: true });
  assertIdentityFields(
    finalRequestIdentity,
    originalRequestIdentity,
    immutableFileIdentityKeys,
    "owner-free attacks changed original request identity"
  );
});

test("owner-free v3 receipt revalidates its exact immutable authorization request before consumption", async () => {
  const testRoot =
    process.env.CA_SIGNATURE_MEASURED_AUTHORIZATION_ROOT_AUTHORITY_TEST_ROOT?.trim();
  assert.ok(testRoot && path.isAbsolute(testRoot) &&
    testRoot.startsWith("/Volumes/Starship/"),
  "CA_SIGNATURE_MEASURED_AUTHORIZATION_ROOT_AUTHORITY_TEST_ROOT must be one absolute Starship path");
  assert.equal(path.normalize(testRoot), testRoot,
    "owner-free v3 request-binding test root must be normalized");
  assertTestRootDisjointFromProductionLedger(
    testRoot,
    "owner-free v3 request-binding test root"
  );
  const retainedRoot = path.join(
    testRoot,
    "owner-free-v3-request-binding-red"
  );
  assertTestRootDisjointFromProductionLedger(
    retainedRoot,
    "owner-free v3 request-binding retained root"
  );
  await assertPhysicalOwnedDirectory(
    testRoot,
    "owner-free v3 request-binding test root"
  );
  await mkdir(retainedRoot, { mode: 0o700 });
  await syncDirectory(testRoot);
  await assertPhysicalOwnedDirectory(
    retainedRoot,
    "owner-free v3 request-binding retained root"
  );

  const authorityReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority!;
  const requestBuilder =
    api.__testingBuildCaliforniaSignatureMeasuredAuthorizationRequest!;
  const requestReader =
    api.readCaliforniaSignatureMeasuredAuthorizationRequest!;
  const receiptReader =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationReceipt!;
  const verifier =
    api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch!;
  assert.equal(typeof authorityReader, "function",
    "owner-free v3 request binding requires the testing authority reader");
  assert.equal(typeof requestBuilder, "function",
    "owner-free v3 request binding requires the testing request builder");
  assert.equal(typeof requestReader, "function",
    "owner-free v3 request binding requires the ordinary request reader");
  assert.equal(typeof receiptReader, "function",
    "owner-free v3 request binding requires the testing receipt reader");
  assert.equal(typeof verifier, "function",
    "owner-free v3 request binding requires the testing verifier");

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const reviewerKeys = new Map([[REVIEWER_KEY_ID, publicKey.export({
    format: "der",
    type: "spki"
  }).toString("base64")]]);
  const authorizationClock = Date.now();
  const entropySuffix = "0123456789abcdef0123456789abcdef";

  const createRow = async (label: string) => {
    const rowRoot = path.join(retainedRoot, label);
    const requestRoot = path.join(rowRoot, "requests");
    const receiptRoot = path.join(rowRoot, "receipts");
    const ledgerRoot = path.join(rowRoot, "attempt-ledger");
    for (const [pathLabel, directory] of [
      [label + " row root", rowRoot],
      [label + " request root", requestRoot],
      [label + " receipt root", receiptRoot],
      [label + " ledger root", ledgerRoot]
    ] as const) {
      assertTestRootDisjointFromProductionLedger(directory, pathLabel);
    }
    for (const directory of [rowRoot, requestRoot, receiptRoot]) {
      await mkdir(directory, { mode: 0o700 });
      await syncDirectory(path.dirname(directory));
      await assertPhysicalOwnedDirectory(directory, directory);
    }
    const ledger = await provisionTestLedger(
      ledgerRoot,
      "ledger-v3-request-" + label + "-" + entropySuffix
    );
    const authority = authorityReader({
      testOnlyAttemptLedgerRoot: ledger.root
    });
    const launchCommand = exactLaunchCommand();
    const requestInputs: TestingAuthorizationRequestBuildInputs = {
      acceptanceRunId:
        "accept-v3-request-" + label + "-" + entropySuffix,
      attemptId: "attempt-v3-request-" + label + "-" + entropySuffix,
      buildId: "build-v3-request-" + label + "-" + entropySuffix,
      executionPlanSha256: sha256(
        "owner-free v3 request execution plan: " + label
      ),
      launchCommand,
      matrixRunId: "matrix-v3-request-" + label + "-" + entropySuffix,
      origin: "http://127.0.0.1:43117",
      runtimeRunId: "runtime-v3-request-" + label + "-" + entropySuffix,
      sourceSnapshotSha256: sha256(
        "owner-free v3 request source snapshot: " + label
      ),
      testOnlyLedgerAuthority: authority
    };
    const request = requestBuilder(requestInputs);
    const requestBytes = canonicalPrettyObjectBytes(
      request as unknown as Record<string, unknown>
    );
    const requestPath = path.join(
      requestRoot,
      "california-signature-measured-authorization-request.json"
    );
    await publishExclusiveDurableReadonlyFile(requestPath, requestBytes);
    const requestSha256 = sha256(requestBytes);
    const authorizationRequest = requestReader({
      allowedRoot: requestRoot,
      expectedRequest: request,
      expectedSha256: requestSha256,
      requestPath
    });
    assert.deepEqual(Object.keys(authorizationRequest), [
      "fileSha256",
      "request"
    ], label + ": ordinary request-reader visible binding shape drifted");
    assert.deepEqual(authorizationRequest.request, request,
      label + ": ordinary request reader changed the exact request semantics");
    assert.equal(authorizationRequest.fileSha256, requestSha256,
      label + ": ordinary request reader changed the canonical request SHA");
    assertDeepFrozen(authorizationRequest,
      label + ": ordinary request-reader binding");
    const payload: V3Payload = {
      attemptId: request.attemptId,
      attemptLedger: request.attemptLedger,
      authorizationNonce:
        "nonce-v3-request-" + label + "-" + entropySuffix,
      authorizationRequestSha256: authorizationRequest.fileSha256,
      buildId: request.buildId,
      decision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
      executionPlanSha256: request.executionPlanSha256,
      expiresAt: new Date(
        authorizationClock + 60 * 60_000
      ).toISOString(),
      issuedAt: new Date(authorizationClock - 60_000).toISOString(),
      launchCommand,
      maxInvocations: 1,
      requiredProjects: ["desktop-chrome", "mobile-chrome"],
      retryAuthorized: false,
      sourceSnapshotSha256: request.sourceSnapshotSha256
    };
    return {
      authorizationRequest,
      ledger,
      payload,
      receiptRoot,
      request,
      requestBytes,
      requestPath,
      requestRoot,
      requestSha256,
      rowRoot
    };
  };

  type RequestBindingRow = Awaited<ReturnType<typeof createRow>>;

  const publishRowReceipt = async (
    row: RequestBindingRow,
    label: string,
    payloadOverrides: Partial<V3Payload> = {}
  ) => {
    const payload = {
      ...row.payload,
      ...payloadOverrides
    } as V3Payload;
    const published = await publishSignedReceipt({
      label,
      payload,
      privateKey,
      receiptRoot: row.receiptRoot,
      schema: V3_RECEIPT_SCHEMA
    });
    return { payload, published };
  };

  const loadRowReceipt = (
    row: RequestBindingRow,
    published: PublishedReceipt,
    authorizationRequest: LoadedAuthorizationRequest =
      row.authorizationRequest
  ) => receiptReader({
    allowedRoot: row.receiptRoot,
    authorizationRequest,
    expectedSha256: published.sha256,
    receiptPath: published.filePath,
    testOnlyAttemptLedgerRoot: row.ledger.root,
    testOnlyTrustedReviewerPublicKeys: reviewerKeys
  });

  const assertAnchorOnly = async (
    row: RequestBindingRow,
    label: string
  ) => {
    const markerLeaf = path.basename(
      consumptionPath(row.ledger.root, row.payload.attemptId)
    );
    assert.deepEqual((await readdir(row.ledger.root)).sort(), [
      LEDGER_ANCHOR_FILENAME
    ], label + ": rejection must leave the attempt ledger anchor-only");
    assert.equal(
      (await readdir(row.ledger.root)).includes(markerLeaf),
      false,
      label + ": rejection published a consumption marker"
    );
  };

  const assertLaunchRejected = async (
    row: RequestBindingRow,
    loaded: LoadedReceipt,
    payload: V3Payload,
    expected: RegExp,
    label: string
  ) => {
    let launchCount = 0;
    assert.throws(() => verifier({
      authorization: loaded.authorization,
      launch: () => {
        launchCount += 1;
        return "FORBIDDEN_REQUEST_BINDING_LAUNCH";
      },
      launchContext: launchContextFor(payload)
    }), expected, label);
    assert.equal(launchCount, 0,
      label + ": rejected request binding reached the launch callback");
    await assertAnchorOnly(row, label);
  };

  const replaceRequestPath = async (
    row: RequestBindingRow,
    bytes: Buffer,
    label: string
  ) => {
    const stagedPath = path.join(
      row.requestRoot,
      "." + label + ".replacement-staged.json"
    );
    const retainedPath = path.join(
      row.requestRoot,
      "." + label + ".original-retained.json"
    );
    await publishExclusiveDurableReadonlyFile(stagedPath, bytes);
    const originalIdentity = await lstat(row.requestPath, { bigint: true });
    const stagedIdentity = await lstat(stagedPath, { bigint: true });
    assert.notEqual(originalIdentity.ino, stagedIdentity.ino,
      label + ": replacement fixture requires a distinct inode");
    await rename(row.requestPath, retainedPath);
    await rename(stagedPath, row.requestPath);
    await syncDirectory(row.requestRoot);
    const replacementIdentity = await lstat(row.requestPath, { bigint: true });
    assert.equal(replacementIdentity.ino, stagedIdentity.ino,
      label + ": replacement path did not resolve to the staged inode");
    assert.notEqual(replacementIdentity.ino, originalIdentity.ino,
      label + ": replacement path retained the original inode");
    assert.deepEqual(await readFile(row.requestPath), bytes,
      label + ": replacement request bytes drifted");
    return { retainedPath, replacementIdentity };
  };

  const rewriteReadonlyRequest = async (
    row: RequestBindingRow,
    bytes: Buffer,
    label: string
  ) => {
    await chmod(row.requestPath, 0o600);
    try {
      const requestHandle = await open(row.requestPath, "r+");
      try {
        await requestHandle.truncate(0);
        await requestHandle.writeFile(bytes);
        await requestHandle.sync();
      } finally {
        await requestHandle.close();
      }
    } finally {
      await chmod(row.requestPath, 0o400);
    }
    await syncDirectory(row.requestRoot);
    assert.deepEqual(await readFile(row.requestPath), bytes,
      label + ": rewritten canonical request bytes drifted");
  };

  const assertSpentAuthorization = (
    action: () => unknown,
    label: string
  ) => {
    assert.throws(action, (error: unknown) => {
      const message = error instanceof Error
        ? error.name + ": " + error.message
        : String(error);
      assert.match(message,
        /requires one test-only reader authorization|already consumed|spent|brand|provenance/i,
      label + ": retry did not fail at the spent test-only brand boundary");
      assert.doesNotMatch(message,
        /authorization request.*(?:changed|identity|inode|missing|pathname|symlink)|receipt.*(?:changed|identity|inode|missing|pathname|symlink)/i,
      label + ": retry re-entered artifact validation instead of failing as spent");
      return true;
    }, label);
  };

  const snapshotDurableMarker = async (
    row: RequestBindingRow,
    published: PublishedReceipt,
    label: string
  ) => {
    const markerPath = consumptionPath(
      row.ledger.root,
      row.payload.attemptId
    );
    const identity = await lstat(markerPath, { bigint: true });
    assert.ok(identity.isFile() && !identity.isSymbolicLink() &&
      identity.nlink === BigInt(1),
    label + ": post-marker rejection must retain one regular singleton marker");
    assert.equal(identity.mode & BigInt(0o777), BigInt(0o600),
      label + ": retained marker must remain mode 0600");
    const bytes = await readFile(markerPath);
    const marker = JSON.parse(bytes.toString("utf8")) as
      Record<string, unknown>;
    assert.deepEqual(bytes, canonicalObjectBytes(marker),
      label + ": retained marker must remain canonical LF-terminated JSON");
    assert.equal(marker.authorizationRequestSha256,
      row.authorizationRequest.fileSha256,
    label + ": retained marker changed the bound request SHA");
    assert.equal(marker.receiptSha256, published.sha256,
      label + ": retained marker changed the bound receipt SHA");
    assert.equal(marker.status, "CONSUMED_BEFORE_LAUNCH",
      label + ": retained marker status drifted");
    return { bytes, identity, markerPath };
  };

  const assertMarkerSnapshotUnchanged = async (
    snapshot: Awaited<ReturnType<typeof snapshotDurableMarker>>,
    label: string
  ) => {
    assert.deepEqual(await readFile(snapshot.markerPath), snapshot.bytes,
      label + ": spent retry changed retained marker bytes");
    const identity = await lstat(snapshot.markerPath, { bigint: true });
    assertIdentityFields(identity, snapshot.identity, [
      "dev",
      "ino",
      "birthtimeNs",
      "size",
      "mode",
      "nlink",
      "uid",
      "mtimeNs",
      "ctimeNs"
    ], label + ": spent retry changed retained marker identity");
  };

  const positiveRow = await createRow("positive-binding");
  const positiveReceipt = await publishRowReceipt(
    positiveRow,
    "positive-binding-receipt"
  );
  const positiveLoaded = loadRowReceipt(
    positiveRow,
    positiveReceipt.published
  );
  assert.deepEqual(Object.keys(positiveLoaded), [
    "authorization",
    "fileSha256"
  ], "request-bound receipt reader visible return shape drifted");
  assert.deepEqual(Object.keys(
    positiveLoaded.authorization as Record<string, unknown>
  ), [
    "attemptId",
    "attemptLedger",
    "authorizationNonce",
    "authorizationRequestSha256",
    "buildId",
    "decision",
    "executionPlanSha256",
    "expiresAt",
    "issuedAt",
    "launchCommand",
    "maxInvocations",
    "requiredProjects",
    "retryAuthorized",
    "sourceSnapshotSha256",
    "payloadSha256",
    "receiptSha256",
    "reviewerKeyId",
    "signatureSha256"
  ], "request-bound authorization visible shape drifted");
  assertDeepFrozen(positiveLoaded,
    "request-bound loaded receipt result");
  assertDeepFrozen(positiveLoaded.authorization,
    "request-bound opaque authorization");
  const positiveAuthorization = positiveLoaded.authorization as
    Record<string, unknown>;
  const positiveReceiptSha256 = positiveAuthorization.receiptSha256;
  assert.throws(() => Object.defineProperty(
    positiveAuthorization,
    "receiptSha256",
    {
      configurable: true,
      enumerable: true,
      get: () => positiveReceiptSha256
    }
  ), TypeError,
  "request-bound authorization allowed accessor replacement after receipt branding");
  let positiveLaunchCount = 0;
  const positiveLaunchOptions: LaunchOptions<string> = {
    authorization: positiveLoaded.authorization,
    launch: () => {
      positiveLaunchCount += 1;
      return "EXACT_REQUEST_BOUND_AUTHORIZATION_LAUNCHED";
    },
    launchContext: launchContextFor(positiveReceipt.payload)
  };
  assert.deepEqual(Object.keys(positiveLaunchOptions), [
    "authorization",
    "launch",
    "launchContext"
  ], "request-bound launch options visible shape drifted");
  assert.equal("requestPath" in positiveLaunchOptions, false,
    "request-bound launch must not accept or expose a request path");
  assert.equal(
    verifier(positiveLaunchOptions),
    "EXACT_REQUEST_BOUND_AUTHORIZATION_LAUNCHED",
    "exact reader-issued authorization request did not authorize launch"
  );
  assert.equal(positiveLaunchCount, 1,
    "exact reader-issued authorization request did not launch exactly once");
  const positiveMarkerPath = consumptionPath(
    positiveRow.ledger.root,
    positiveRow.payload.attemptId
  );
  assert.deepEqual((await readdir(positiveRow.ledger.root)).sort(), [
    LEDGER_ANCHOR_FILENAME,
    path.basename(positiveMarkerPath)
  ].sort(), "positive request binding must create exactly one marker");
  const positiveMarker = JSON.parse(
    (await readFile(positiveMarkerPath)).toString("utf8")
  ) as Record<string, unknown>;
  assert.equal(
    positiveMarker.authorizationRequestSha256,
    positiveRow.authorizationRequest.fileSha256,
    "consumption marker changed the exact bound authorization-request SHA"
  );

  const crossBrandRow = await createRow("cross-brand-no-fallback");
  const crossBrandReceipt = await publishRowReceipt(
    crossBrandRow,
    "cross-brand-no-fallback-receipt"
  );
  const crossBrandLoaded = loadRowReceipt(
    crossBrandRow,
    crossBrandReceipt.published
  );
  const productionVerifier =
    api.verifyCaliforniaSignatureMeasuredAuthorizationForLaunch!;
  assert.equal(typeof productionVerifier, "function",
    "cross-brand closure requires the production verifier");
  let crossBrandProductionLaunchCount = 0;
  const exactProductionCrossBrandOptions: LaunchOptions<string> = {
    authorization: crossBrandLoaded.authorization,
    launch: () => {
      crossBrandProductionLaunchCount += 1;
      return "FORBIDDEN_CROSS_BRAND_PRODUCTION_LAUNCH";
    },
    launchContext: launchContextFor(crossBrandReceipt.payload)
  };
  assert.deepEqual(Object.keys(exactProductionCrossBrandOptions), [
    "authorization",
    "launch",
    "launchContext"
  ], "cross-brand production verifier attack must use the exact three-key shape");
  assert.throws(() => productionVerifier(
    exactProductionCrossBrandOptions
  ), /production-provenance|test-only.*forbidden|requires one production/i,
  "production verifier accepted or fell back to a test-issued authorization brand");
  assert.equal(crossBrandProductionLaunchCount, 0,
    "cross-brand production rejection reached the launch callback");
  await assertAnchorOnly(
    crossBrandRow,
    "cross-brand production rejection"
  );
  let crossBrandTestingLaunchCount = 0;
  assert.equal(verifier({
    authorization: crossBrandLoaded.authorization,
    launch: () => {
      crossBrandTestingLaunchCount += 1;
      return "EXACT_TESTING_BRAND_LAUNCHED";
    },
    launchContext: launchContextFor(crossBrandReceipt.payload)
  }), "EXACT_TESTING_BRAND_LAUNCHED",
  "production provenance rejection consumed or migrated the test-only brand");
  assert.equal(crossBrandTestingLaunchCount, 1,
    "the exact testing verifier did not consume the retained test brand once");
  await snapshotDurableMarker(
    crossBrandRow,
    crossBrandReceipt.published,
    "cross-brand testing success"
  );

  const forgedRow = await createRow("forged-request-binding");
  const forgedReceipt = await publishRowReceipt(
    forgedRow,
    "forged-request-binding-receipt"
  );
  const forgedBinding = deepFreezeFixture(
    structuredClone(forgedRow.authorizationRequest)
  );
  assert.notEqual(forgedBinding, forgedRow.authorizationRequest,
    "forged request binding must be a distinct object");
  assert.deepEqual(forgedBinding, forgedRow.authorizationRequest,
    "forged request binding must preserve every visible value");
  assertDeepFrozen(forgedBinding,
    "structuredClone forged request binding");
  assert.throws(() => loadRowReceipt(
    forgedRow,
    forgedReceipt.published,
    forgedBinding
  ), /authorization request.*(?:brand|provenance|reader-issued|opaque)|(?:brand|provenance|reader-issued|opaque).*authorization request/i,
  "testing receipt reader accepted a frozen structuredClone request binding");
  await assertAnchorOnly(forgedRow, "forged request binding");

  const substitutedShaRow = await createRow("signed-request-sha-substitution");
  const substitutedShaReceipt = await publishRowReceipt(
    substitutedShaRow,
    "signed-request-sha-substitution-receipt",
    {
      authorizationRequestSha256: sha256(
        "signed substituted authorization request SHA"
      )
    }
  );
  assert.notEqual(
    substitutedShaReceipt.payload.authorizationRequestSha256,
    substitutedShaRow.authorizationRequest.fileSha256,
    "signed SHA-substitution fixture accidentally retained the real request SHA"
  );
  assert.throws(() => loadRowReceipt(
    substitutedShaRow,
    substitutedShaReceipt.published
  ), /authorization request.*(?:sha|digest|bytes|binding|differs)|(?:sha|digest|bytes|binding|differs).*authorization request/i,
  "testing receipt reader accepted a signed authorization-request SHA substitution");
  await assertAnchorOnly(
    substitutedShaRow,
    "signed authorization-request SHA substitution"
  );

  const semanticSplitRow = await createRow("signed-request-semantic-split");
  const semanticSplitBuildId =
    "build-v3-request-semantic-split-forged-" + entropySuffix;
  const semanticSplitReceipt = await publishRowReceipt(
    semanticSplitRow,
    "signed-request-semantic-split-receipt",
    { buildId: semanticSplitBuildId }
  );
  assert.notEqual(
    semanticSplitReceipt.payload.buildId,
    semanticSplitRow.authorizationRequest.request.buildId,
    "signed semantic-split fixture accidentally retained the request buildId"
  );
  assert.throws(() => loadRowReceipt(
    semanticSplitRow,
    semanticSplitReceipt.published
  ), /authorization request.*(?:buildId|semantic|payload|differs|binding)|(?:buildId|semantic|payload|differs|binding).*authorization request/i,
  "testing receipt reader accepted a signed request/payload semantic split");
  await assertAnchorOnly(
    semanticSplitRow,
    "signed authorization-request semantic split"
  );

  const preBrandReplacementRow = await createRow(
    "byte-identical-replacement-before-brand"
  );
  const preBrandReplacementReceipt = await publishRowReceipt(
    preBrandReplacementRow,
    "byte-identical-replacement-before-brand-receipt"
  );
  await replaceRequestPath(
    preBrandReplacementRow,
    preBrandReplacementRow.requestBytes,
    "before-brand"
  );
  assert.throws(() => loadRowReceipt(
    preBrandReplacementRow,
    preBrandReplacementReceipt.published
  ), /authorization request.*(?:changed|identity|inode|replaced|pathname|binding)|(?:changed|identity|inode|replaced|pathname|binding).*authorization request/i,
  "testing receipt reader accepted a byte-identical request replacement before receipt branding");
  await assertAnchorOnly(
    preBrandReplacementRow,
    "byte-identical request replacement before receipt brand"
  );

  const changedBytesRow = await createRow("changed-canonical-bytes-after-brand");
  const changedBytesReceipt = await publishRowReceipt(
    changedBytesRow,
    "changed-canonical-bytes-after-brand-receipt"
  );
  const changedBytesLoaded = loadRowReceipt(
    changedBytesRow,
    changedBytesReceipt.published
  );
  const changedCanonicalRequest = {
    ...structuredClone(changedBytesRow.request),
    buildId: "build-v3-request-changed-after-brand-" + entropySuffix
  } as AuthorizationRequest;
  const changedCanonicalBytes = canonicalPrettyObjectBytes(
    changedCanonicalRequest as unknown as Record<string, unknown>
  );
  assert.notDeepEqual(changedCanonicalBytes, changedBytesRow.requestBytes,
    "changed canonical request attack must change literal bytes");
  await rewriteReadonlyRequest(
    changedBytesRow,
    changedCanonicalBytes,
    "changed canonical request after receipt brand"
  );
  await assertLaunchRejected(
    changedBytesRow,
    changedBytesLoaded,
    changedBytesReceipt.payload,
    /authorization request.*(?:changed|bytes|identity|binding|replaced)|(?:changed|bytes|identity|binding|replaced).*authorization request/i,
    "changed canonical request bytes after receipt brand"
  );

  const postBrandReplacementRow = await createRow(
    "byte-identical-inode-replacement-after-brand"
  );
  const postBrandReplacementReceipt = await publishRowReceipt(
    postBrandReplacementRow,
    "byte-identical-inode-replacement-after-brand-receipt"
  );
  const postBrandReplacementLoaded = loadRowReceipt(
    postBrandReplacementRow,
    postBrandReplacementReceipt.published
  );
  await replaceRequestPath(
    postBrandReplacementRow,
    postBrandReplacementRow.requestBytes,
    "after-brand"
  );
  await assertLaunchRejected(
    postBrandReplacementRow,
    postBrandReplacementLoaded,
    postBrandReplacementReceipt.payload,
    /authorization request.*(?:changed|identity|inode|replaced|pathname|binding)|(?:changed|identity|inode|replaced|pathname|binding).*authorization request/i,
    "byte-identical request inode replacement after receipt brand"
  );
  let preMarkerSpentRetryLaunchCount = 0;
  assertSpentAuthorization(() => verifier({
    authorization: postBrandReplacementLoaded.authorization,
    launch: () => {
      preMarkerSpentRetryLaunchCount += 1;
      return "FORBIDDEN_PRE_MARKER_SPENT_RETRY_LAUNCH";
    },
    launchContext: launchContextFor(postBrandReplacementReceipt.payload)
  }), "pre-marker request-drift authorization retry");
  assert.equal(preMarkerSpentRetryLaunchCount, 0,
    "pre-marker spent-brand retry reached the callback");
  await assertAnchorOnly(
    postBrandReplacementRow,
    "pre-marker request-drift spent-brand retry"
  );

  const missingRow = await createRow("missing-request-after-brand");
  const missingReceipt = await publishRowReceipt(
    missingRow,
    "missing-request-after-brand-receipt"
  );
  const missingLoaded = loadRowReceipt(
    missingRow,
    missingReceipt.published
  );
  const retainedMissingRequestPath = path.join(
    missingRow.requestRoot,
    ".missing-request.original-retained.json"
  );
  await rename(missingRow.requestPath, retainedMissingRequestPath);
  await syncDirectory(missingRow.requestRoot);
  await assertLaunchRejected(
    missingRow,
    missingLoaded,
    missingReceipt.payload,
    /authorization request.*(?:missing|ENOENT|pathname|changed|binding)|(?:missing|ENOENT|pathname|changed|binding).*authorization request/i,
    "missing authorization request after receipt brand"
  );

  const symlinkRow = await createRow("symlink-request-after-brand");
  const symlinkReceipt = await publishRowReceipt(
    symlinkRow,
    "symlink-request-after-brand-receipt"
  );
  const symlinkLoaded = loadRowReceipt(
    symlinkRow,
    symlinkReceipt.published
  );
  const retainedSymlinkTarget = path.join(
    symlinkRow.requestRoot,
    ".symlink-request.original-retained.json"
  );
  await rename(symlinkRow.requestPath, retainedSymlinkTarget);
  await symlink(
    path.basename(retainedSymlinkTarget),
    symlinkRow.requestPath
  );
  await syncDirectory(symlinkRow.requestRoot);
  await assertLaunchRejected(
    symlinkRow,
    symlinkLoaded,
    symlinkReceipt.payload,
    /authorization request.*(?:symlink|physical|pathname|changed|binding)|(?:symlink|physical|pathname|changed|binding).*authorization request/i,
    "symlink authorization request after receipt brand"
  );

  const lateRequestRow = await createRow(
    "final-root-fsync-request-replacement"
  );
  const lateRequestReceipt = await publishRowReceipt(
    lateRequestRow,
    "final-root-fsync-request-replacement-receipt"
  );
  const lateRequestLoaded = loadRowReceipt(
    lateRequestRow,
    lateRequestReceipt.published
  );
  const lateRequestStagedPath = path.join(
    lateRequestRow.requestRoot,
    ".late-request.replacement-staged.json"
  );
  const lateRequestRetainedPath = path.join(
    lateRequestRow.requestRoot,
    ".late-request.original-retained.json"
  );
  await publishExclusiveDurableReadonlyFile(
    lateRequestStagedPath,
    lateRequestRow.requestBytes
  );
  const lateRequestOriginalIdentity = await lstat(
    lateRequestRow.requestPath,
    { bigint: true }
  );
  const lateRequestStagedIdentity = await lstat(
    lateRequestStagedPath,
    { bigint: true }
  );
  assert.notEqual(
    lateRequestOriginalIdentity.ino,
    lateRequestStagedIdentity.ino,
    "late request replacement requires distinct physical file identities"
  );
  const lateRequestOriginalBytes = await readFile(
    lateRequestRow.requestPath
  );
  const lateRequestStagedBytes = await readFile(lateRequestStagedPath);
  let lateRequestFinalObserverCount = 0;
  let lateRequestLaunchCount = 0;
  assert.throws(() => verifier({
    authorization: lateRequestLoaded.authorization,
    launch: () => {
      lateRequestLaunchCount += 1;
      return "FORBIDDEN_LATE_REQUEST_REPLACEMENT_LAUNCH";
    },
    launchContext: launchContextFor(lateRequestReceipt.payload),
    testOnlyDurabilityObserver: (event) => {
      if (event.kind !== "MARKER_ROOT_FSYNCED") {
        return;
      }
      assert.equal(lateRequestFinalObserverCount, 0,
        "late request replacement must run at the final root-fsync event exactly once");
      lateRequestFinalObserverCount += 1;
      renameSync(
        lateRequestRow.requestPath,
        lateRequestRetainedPath
      );
      renameSync(
        lateRequestStagedPath,
        lateRequestRow.requestPath
      );
    }
  }), /authorization request.*(?:changed|identity|inode|replaced|pathname|binding)|(?:changed|identity|inode|replaced|pathname|binding).*authorization request/i,
  "verifier accepted a byte-identical request replacement at final MARKER_ROOT_FSYNCED");
  await syncDirectory(lateRequestRow.requestRoot);
  assert.equal(lateRequestFinalObserverCount, 1,
    "late request replacement did not observe exactly one final root-fsync event");
  assert.equal(lateRequestLaunchCount, 0,
    "late request replacement reached the launch callback");
  const lateRequestMarkerSnapshot = await snapshotDurableMarker(
    lateRequestRow,
    lateRequestReceipt.published,
    "late request replacement"
  );
  const lateRequestRetainedIdentity = await lstat(
    lateRequestRetainedPath,
    { bigint: true }
  );
  const lateRequestReplacementIdentity = await lstat(
    lateRequestRow.requestPath,
    { bigint: true }
  );
  const retainedReplacementIdentityKeys = [
    "dev",
    "ino",
    "birthtimeNs",
    "size",
    "mode",
    "nlink",
    "uid",
    "mtimeNs"
  ] as const;
  assertIdentityFields(
    lateRequestRetainedIdentity,
    lateRequestOriginalIdentity,
    retainedReplacementIdentityKeys,
    "late request retained original identity"
  );
  assertIdentityFields(
    lateRequestReplacementIdentity,
    lateRequestStagedIdentity,
    retainedReplacementIdentityKeys,
    "late request current replacement identity"
  );
  assert.deepEqual(await readFile(lateRequestRetainedPath),
    lateRequestOriginalBytes,
  "late request retained original bytes changed");
  assert.deepEqual(await readFile(lateRequestRow.requestPath),
    lateRequestStagedBytes,
  "late request current replacement bytes changed");
  assert.deepEqual((await readdir(lateRequestRow.requestRoot)).sort(), [
    path.basename(lateRequestRetainedPath),
    path.basename(lateRequestRow.requestPath)
  ].sort(), "late request replacement must retain exactly both physical files");
  let lateRequestSpentRetryLaunchCount = 0;
  assertSpentAuthorization(() => verifier({
    authorization: lateRequestLoaded.authorization,
    launch: () => {
      lateRequestSpentRetryLaunchCount += 1;
      return "FORBIDDEN_LATE_REQUEST_SPENT_RETRY_LAUNCH";
    },
    launchContext: launchContextFor(lateRequestReceipt.payload)
  }), "late request replacement authorization retry");
  assert.equal(lateRequestSpentRetryLaunchCount, 0,
    "late request spent-brand retry reached the callback");
  await assertMarkerSnapshotUnchanged(
    lateRequestMarkerSnapshot,
    "late request replacement"
  );

  const lateReceiptRow = await createRow(
    "final-root-fsync-receipt-replacement"
  );
  const lateReceiptReceipt = await publishRowReceipt(
    lateReceiptRow,
    "final-root-fsync-receipt-replacement-receipt"
  );
  const lateReceiptLoaded = loadRowReceipt(
    lateReceiptRow,
    lateReceiptReceipt.published
  );
  const lateReceiptStagedPath = path.join(
    lateReceiptRow.receiptRoot,
    ".late-receipt.replacement-staged.json"
  );
  const lateReceiptRetainedPath = path.join(
    lateReceiptRow.receiptRoot,
    ".late-receipt.original-retained.json"
  );
  await publishExclusiveDurableFile(
    lateReceiptStagedPath,
    lateReceiptReceipt.published.bytes
  );
  const lateReceiptOriginalIdentity = await lstat(
    lateReceiptReceipt.published.filePath,
    { bigint: true }
  );
  const lateReceiptStagedIdentity = await lstat(
    lateReceiptStagedPath,
    { bigint: true }
  );
  assert.notEqual(
    lateReceiptOriginalIdentity.ino,
    lateReceiptStagedIdentity.ino,
    "late receipt replacement requires distinct physical file identities"
  );
  const lateReceiptOriginalBytes = await readFile(
    lateReceiptReceipt.published.filePath
  );
  const lateReceiptStagedBytes = await readFile(lateReceiptStagedPath);
  let lateReceiptFinalObserverCount = 0;
  let lateReceiptLaunchCount = 0;
  assert.throws(() => verifier({
    authorization: lateReceiptLoaded.authorization,
    launch: () => {
      lateReceiptLaunchCount += 1;
      return "FORBIDDEN_LATE_RECEIPT_REPLACEMENT_LAUNCH";
    },
    launchContext: launchContextFor(lateReceiptReceipt.payload),
    testOnlyDurabilityObserver: (event) => {
      if (event.kind !== "MARKER_ROOT_FSYNCED") {
        return;
      }
      assert.equal(lateReceiptFinalObserverCount, 0,
        "late receipt replacement must run at the final root-fsync event exactly once");
      lateReceiptFinalObserverCount += 1;
      renameSync(
        lateReceiptReceipt.published.filePath,
        lateReceiptRetainedPath
      );
      renameSync(
        lateReceiptStagedPath,
        lateReceiptReceipt.published.filePath
      );
    }
  }), /receipt.*(?:changed|identity|inode|replaced|pathname|binding)|(?:changed|identity|inode|replaced|pathname|binding).*receipt/i,
  "verifier accepted a byte-identical receipt replacement at final MARKER_ROOT_FSYNCED");
  await syncDirectory(lateReceiptRow.receiptRoot);
  assert.equal(lateReceiptFinalObserverCount, 1,
    "late receipt replacement did not observe exactly one final root-fsync event");
  assert.equal(lateReceiptLaunchCount, 0,
    "late receipt replacement reached the launch callback");
  const lateReceiptMarkerSnapshot = await snapshotDurableMarker(
    lateReceiptRow,
    lateReceiptReceipt.published,
    "late receipt replacement"
  );
  const lateReceiptRetainedIdentity = await lstat(
    lateReceiptRetainedPath,
    { bigint: true }
  );
  const lateReceiptReplacementIdentity = await lstat(
    lateReceiptReceipt.published.filePath,
    { bigint: true }
  );
  assertIdentityFields(
    lateReceiptRetainedIdentity,
    lateReceiptOriginalIdentity,
    retainedReplacementIdentityKeys,
    "late receipt retained original identity"
  );
  assertIdentityFields(
    lateReceiptReplacementIdentity,
    lateReceiptStagedIdentity,
    retainedReplacementIdentityKeys,
    "late receipt current replacement identity"
  );
  assert.deepEqual(await readFile(lateReceiptRetainedPath),
    lateReceiptOriginalBytes,
  "late receipt retained original bytes changed");
  assert.deepEqual(await readFile(lateReceiptReceipt.published.filePath),
    lateReceiptStagedBytes,
  "late receipt current replacement bytes changed");
  assert.deepEqual((await readdir(lateReceiptRow.receiptRoot)).sort(), [
    path.basename(lateReceiptRetainedPath),
    path.basename(lateReceiptReceipt.published.filePath)
  ].sort(), "late receipt replacement must retain exactly both physical files");
  let lateReceiptSpentRetryLaunchCount = 0;
  assertSpentAuthorization(() => verifier({
    authorization: lateReceiptLoaded.authorization,
    launch: () => {
      lateReceiptSpentRetryLaunchCount += 1;
      return "FORBIDDEN_LATE_RECEIPT_SPENT_RETRY_LAUNCH";
    },
    launchContext: launchContextFor(lateReceiptReceipt.payload)
  }), "late receipt replacement authorization retry");
  assert.equal(lateReceiptSpentRetryLaunchCount, 0,
    "late receipt spent-brand retry reached the callback");
  await assertMarkerSnapshotUnchanged(
    lateReceiptMarkerSnapshot,
    "late receipt replacement"
  );
});
