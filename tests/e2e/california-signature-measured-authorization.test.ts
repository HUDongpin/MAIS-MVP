import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign as signBytes
} from "node:crypto";
import {
  lstatSync,
  readFileSync
} from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rmdir,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import * as lifecycle from "./california-signature-exhaustive-artifact-lifecycle";

type MeasuredAuthorizationReaderOptions = {
  allowedRoot: string;
  authorizationRequest: LoadedAuthorizationRequest;
  expectedSha256: string;
  receiptPath: string;
};

type TestingMeasuredAuthorizationReaderOptions =
  MeasuredAuthorizationReaderOptions & {
    testOnlyAttemptLedgerRoot: string;
    testOnlyTrustedReviewerPublicKeys: ReadonlyMap<string, string>;
  };

type LoadedMeasuredAuthorizationReceipt = {
  authorization: unknown;
  fileSha256: string;
};

type AuthorizationRequestBuildInputs = {
  acceptanceRunId: string;
  attemptId: string;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: MeasuredAuthorizationLaunchCommand;
  matrixRunId: string;
  origin: string;
  runtimeRunId: string;
  sourceSnapshotSha256: string;
};

type TestingAuthorizationRequestBuildInputs =
  AuthorizationRequestBuildInputs & {
    testOnlyLedgerAuthority: MeasuredAuthorizationAttemptLedgerIdentity;
  };

type AuthorizationRequest = {
  acceptanceRunId: string;
  attemptId: string;
  attemptLedger: MeasuredAuthorizationAttemptLedgerIdentity;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: MeasuredAuthorizationLaunchCommand;
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

type AuthorizationRequestReaderOptions = {
  allowedRoot: string;
  expectedRequest: AuthorizationRequest;
  expectedSha256: string;
  requestPath: string;
};

type AuthorizationRequestFixture = {
  authorizationRequest: LoadedAuthorizationRequest;
  bytes: Buffer;
  request: AuthorizationRequest;
  requestPath: string;
  requestRoot: string;
  sha256: string;
};

type MeasuredAuthorizationLaunchCommand = {
  projects: readonly ["desktop-chrome", "mobile-chrome"];
  repeatEach: 1;
  reporter: "json";
  retries: 0;
  specPath: "tests/e2e/california-signature-exhaustive.spec.ts";
  workers: 1;
};

type MeasuredAuthorizationLaunchContext = {
  attemptId: string;
  buildId: string;
  executionPlanSha256: string;
  launchCommand: MeasuredAuthorizationLaunchCommand;
  requiredProjects: readonly ["desktop-chrome", "mobile-chrome"];
  sourceSnapshotSha256: string;
};

type MeasuredAuthorizationLaunchOptions<Result> = {
  authorization: unknown;
  launch: () => Result;
  launchContext: MeasuredAuthorizationLaunchContext;
};

type TestOnlyDurabilityEvent =
  | {
      kind: "ROOT_FD_BOUND";
      rootFdIdentity: string;
    }
  | {
      fileFdIdentity: string;
      kind: "MARKER_CREATED_EXCLUSIVE_AT_ROOT_FD";
      mode: 0o600;
      relativeName: string;
      rootFdIdentity: string;
    }
  | {
      fileFdIdentity: string;
      kind: "MARKER_WRITTEN";
      sha256: string;
    }
  | {
      fileFdIdentity: string;
      kind: "MARKER_FILE_FSYNCED";
    }
  | {
      fileFdIdentity: string;
      kind: "MARKER_SAME_FD_READBACK_VERIFIED";
      sha256: string;
    }
  | {
      kind: "MARKER_ROOT_FSYNCED";
      rootFdIdentity: string;
    };

type TestingMeasuredAuthorizationLaunchOptions<Result> =
  MeasuredAuthorizationLaunchOptions<Result> & {
    testOnlyDurabilityObserver?: (
      event: Readonly<TestOnlyDurabilityEvent>
    ) => void;
  };

type MeasuredAuthorizationApi = {
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT?: unknown;
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_PUBLIC_KEY_SHA256?: unknown;
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_REVIEWER_KEY_ID?: unknown;
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV?: unknown;
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_VALUE?: unknown;
  CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_TRUSTED_REVIEWER_KEYS?:
    ReadonlyMap<string, string>;
  assertCaliforniaSignatureMeasuredAuthorizationRunnerGuard?: (
    value: unknown
  ) => void;
  __testingBuildCaliforniaSignatureMeasuredAuthorizationRequest: (
    options: TestingAuthorizationRequestBuildInputs
  ) => AuthorizationRequest;
  __testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority: (
    options: { testOnlyAttemptLedgerRoot: string }
  ) => MeasuredAuthorizationAttemptLedgerIdentity;
  readCaliforniaSignatureMeasuredAuthorizationRequest: (
    options: AuthorizationRequestReaderOptions
  ) => LoadedAuthorizationRequest;
  readCaliforniaSignatureMeasuredAuthorizationReceipt: (
    options: MeasuredAuthorizationReaderOptions
  ) => LoadedMeasuredAuthorizationReceipt;
  __testingReadCaliforniaSignatureMeasuredAuthorizationReceipt: (
    options: TestingMeasuredAuthorizationReaderOptions
  ) => LoadedMeasuredAuthorizationReceipt;
  __testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch: <Result>(
    options: TestingMeasuredAuthorizationLaunchOptions<Result>
  ) => Result;
  verifyCaliforniaSignatureMeasuredAuthorizationForLaunch: <Result>(
    options: MeasuredAuthorizationLaunchOptions<Result>
  ) => Result;
};

const api = lifecycle as MeasuredAuthorizationApi;

const OWNER_REVIEWER_KEY_ID =
  "ca-owner-reviewer-95eb52000940afa9f991dcad27e59cdfb1d9ff53b883611f";
const OWNER_PUBLIC_KEY_SHA256 =
  "deb227d57f46f21d92967f529552a67994bbc7fb6def882eec46f5d77c16305a";
const RUNNER_GUARD_ENV = "CA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD";
const RUNNER_GUARD_VALUE = "owner-approved-runner-verified-and-consumed-v1";
const sha256 = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");

const DISCOVERY_SCHEMA =
  "ca.california-signature.measured-authorization.v3";
const CONSUMPTION_SCHEMA =
  "ca.california-signature.measured-authorization-consumption.v2";
const CONSUMPTION_SUFFIX = ".measured-authorization-consumed.json";
const ATTEMPT_LEDGER_ANCHOR_FILENAME =
  ".california-signature-measured-authorization-ledger-root.json";
const ATTEMPT_LEDGER_ANCHOR_SCHEMA =
  "ca.california-signature.measured-authorization-ledger-root.v1";
const REQUEST_SCHEMA =
  "ca.california-signature.measured-authorization-request.v1";
const REVIEWER_KEY_ID = "test-reviewer-ed25519-0123456789abcdef";
const TEST_ROOT_DISJOINTNESS_ERROR =
  "California signature measured-authorization test root must be disjoint from the fixed production ledger root";

type MeasuredAuthorizationAttemptLedgerIdentity = {
  anchorSha256: string;
  ledgerId: string;
  rootBirthtimeNs: string;
  rootDev: string;
  rootIno: string;
  rootPathSha256: string;
};

type SignedPayload = {
  attemptId: string;
  attemptLedger: MeasuredAuthorizationAttemptLedgerIdentity;
  authorizationNonce: string;
  authorizationRequestSha256: string;
  buildId: string;
  decision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS";
  executionPlanSha256: string;
  expiresAt: string;
  issuedAt: string;
  launchCommand: MeasuredAuthorizationLaunchCommand;
  maxInvocations: 1;
  requiredProjects: readonly ["desktop-chrome", "mobile-chrome"];
  retryAuthorized: false;
  sourceSnapshotSha256: string;
};

type DiscoveryReceipt = {
  payloadBase64: string;
  reviewerKeyId: string;
  schema: typeof DISCOVERY_SCHEMA;
  signatureAlgorithm: "Ed25519";
  signatureBase64: string;
};

function receiptBytes(receipt: Record<string, unknown>) {
  return Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8");
}

function canonicalPrettyObjectBytes(value: Record<string, unknown>) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function syncDirectory(directory: string) {
  const directoryHandle = await open(directory, "r");
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
}

async function publishDurableExclusiveFile(filePath: string, bytes: Buffer) {
  const fileHandle = await open(filePath, "wx+", 0o600);
  try {
    await fileHandle.writeFile(bytes);
    await fileHandle.sync();
    const heldIdentity = await fileHandle.stat({ bigint: true });
    assert.ok(heldIdentity.isFile() && heldIdentity.nlink === BigInt(1),
      `${filePath}: held fixture FD must be one regular singleton file`);
    assert.equal(heldIdentity.mode & BigInt(0o777), BigInt(0o600),
      `${filePath}: held fixture FD must be mode 0600`);
    assert.equal(heldIdentity.size, BigInt(bytes.length),
      `${filePath}: held fixture FD byte count drifted`);
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
        `${filePath}: same-FD fixture readback ended early`);
      offset += result.bytesRead;
    }
    assert.deepEqual(readback, bytes,
      `${filePath}: same-FD fixture readback drifted`);
  } finally {
    await fileHandle.close();
  }
  await syncDirectory(path.dirname(filePath));
}

async function publishDurableExclusiveReadonlyFile(
  filePath: string,
  bytes: Buffer
) {
  const fileHandle = await open(filePath, "wx+", 0o400);
  try {
    await fileHandle.writeFile(bytes);
    await fileHandle.sync();
    const heldIdentity = await fileHandle.stat({ bigint: true });
    assert.ok(heldIdentity.isFile() && heldIdentity.nlink === BigInt(1),
      `${filePath}: held immutable fixture FD must be one regular singleton file`);
    assert.equal(heldIdentity.uid, BigInt(process.getuid!()),
      `${filePath}: held immutable fixture FD must be test-owned`);
    assert.equal(heldIdentity.mode & BigInt(0o777), BigInt(0o400),
      `${filePath}: held immutable fixture FD must be mode 0400`);
    assert.equal(heldIdentity.size, BigInt(bytes.length),
      `${filePath}: held immutable fixture FD byte count drifted`);
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
        `${filePath}: same-FD immutable fixture readback ended early`);
      offset += result.bytesRead;
    }
    assert.deepEqual(readback, bytes,
      `${filePath}: same-FD immutable fixture readback drifted`);
  } finally {
    await fileHandle.close();
  }
  await syncDirectory(path.dirname(filePath));
  const pathIdentity = await lstat(filePath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
    pathIdentity.nlink === BigInt(1),
  `${filePath}: immutable fixture path must be one regular singleton file`);
  assert.equal(pathIdentity.uid, BigInt(process.getuid!()),
    `${filePath}: immutable fixture path must be test-owned`);
  assert.equal(pathIdentity.mode & BigInt(0o777), BigInt(0o400),
    `${filePath}: immutable fixture path must be mode 0400`);
  assert.deepEqual(await readFile(filePath), bytes,
    `${filePath}: immutable fixture path readback drifted`);
}

async function provisionAttemptLedger(root: string, label: string) {
  assert.ok(path.isAbsolute(root) && root.startsWith("/Volumes/Starship/"),
    `${label}: test attempt-ledger root must be one absolute Starship path`);
  assert.equal(path.normalize(root), root,
    `${label}: test attempt-ledger root must be normalized`);
  await mkdir(root, { mode: 0o700 });
  await syncDirectory(path.dirname(root));
  const initialRootIdentity = await lstat(root, { bigint: true });
  assert.ok(initialRootIdentity.isDirectory() &&
    !initialRootIdentity.isSymbolicLink(),
  `${label}: attempt ledger must be one physical directory`);
  assert.equal(initialRootIdentity.uid, BigInt(process.getuid!()),
    `${label}: attempt ledger must be test-owned`);
  assert.equal(initialRootIdentity.mode & BigInt(0o777), BigInt(0o700),
    `${label}: attempt ledger must be mode 0700`);
  assert.ok(initialRootIdentity.birthtimeNs > BigInt(0),
    `${label}: attempt ledger must expose a physical birthtime`);

  const ledgerId =
    `measured-attempt-ledger-${label}-0123456789abcdef0123456789abcdef`;
  const anchor = {
    ledgerId,
    rootPathSha256: sha256(root),
    schema: ATTEMPT_LEDGER_ANCHOR_SCHEMA,
    status: "ACTIVE"
  } as const;
  const anchorBytes = receiptBytes(anchor);
  const anchorPath = path.join(root, ATTEMPT_LEDGER_ANCHOR_FILENAME);
  await publishDurableExclusiveFile(anchorPath, anchorBytes);
  const anchorIdentity = await lstat(anchorPath, { bigint: true });
  assert.ok(anchorIdentity.isFile() && !anchorIdentity.isSymbolicLink() &&
    anchorIdentity.nlink === BigInt(1),
  `${label}: ledger anchor must be one regular singleton file`);
  assert.equal(anchorIdentity.uid, BigInt(process.getuid!()),
    `${label}: ledger anchor must be test-owned`);
  assert.equal(anchorIdentity.mode & BigInt(0o777), BigInt(0o600),
    `${label}: ledger anchor must be mode 0600`);
  assert.deepEqual(await readFile(anchorPath), anchorBytes,
    `${label}: ledger anchor readback drifted`);

  const rootIdentity = await lstat(root, { bigint: true });
  const attemptLedger: MeasuredAuthorizationAttemptLedgerIdentity = {
    anchorSha256: sha256(anchorBytes),
    ledgerId,
    rootBirthtimeNs: String(rootIdentity.birthtimeNs),
    rootDev: String(rootIdentity.dev),
    rootIno: String(rootIdentity.ino),
    rootPathSha256: sha256(root)
  };
  return {
    anchorBytes,
    anchorIdentity,
    anchorPath,
    attemptLedger,
    root,
    rootIdentity
  };
}

async function provisionAuthorizationRequest(options: {
  attemptId: string;
  attemptLedgerRoot: string;
  buildId: string;
  executionPlanSha256: string;
  label: string;
  requestRoot: string;
  selectedApi: MeasuredAuthorizationApi;
  sourceSnapshotSha256: string;
}): Promise<AuthorizationRequestFixture> {
  assert.ok(path.isAbsolute(options.requestRoot) &&
    options.requestRoot.startsWith("/Volumes/Starship/"),
  `${options.label}: authorization-request root must be one absolute Starship path`);
  assert.equal(path.normalize(options.requestRoot), options.requestRoot,
    `${options.label}: authorization-request root must be normalized`);
  await mkdir(options.requestRoot, { mode: 0o700 });
  await syncDirectory(path.dirname(options.requestRoot));
  const requestRootIdentity = await lstat(options.requestRoot, { bigint: true });
  assert.ok(requestRootIdentity.isDirectory() &&
    !requestRootIdentity.isSymbolicLink(),
  `${options.label}: authorization-request root must be one physical directory`);
  assert.equal(requestRootIdentity.uid, BigInt(process.getuid!()),
    `${options.label}: authorization-request root must be test-owned`);
  assert.equal(requestRootIdentity.mode & BigInt(0o777), BigInt(0o700),
    `${options.label}: authorization-request root must be mode 0700`);

  const authorityReader =
    options.selectedApi
      .__testingReadCaliforniaSignatureMeasuredAuthorizationLedgerAuthority;
  const requestBuilder =
    options.selectedApi
      .__testingBuildCaliforniaSignatureMeasuredAuthorizationRequest;
  const requestReader =
    options.selectedApi.readCaliforniaSignatureMeasuredAuthorizationRequest;
  assert.equal(typeof authorityReader, "function",
    `${options.label}: testing ledger-authority reader must be exported`);
  assert.equal(typeof requestBuilder, "function",
    `${options.label}: testing authorization-request builder must be exported`);
  assert.equal(typeof requestReader, "function",
    `${options.label}: ordinary authorization-request reader must be exported`);

  const testOnlyLedgerAuthority = authorityReader({
    testOnlyAttemptLedgerRoot: options.attemptLedgerRoot
  });
  const request = requestBuilder({
    acceptanceRunId:
      `measured-acceptance-${options.label}-0123456789abcdef0123456789abcdef`,
    attemptId: options.attemptId,
    buildId: options.buildId,
    executionPlanSha256: options.executionPlanSha256,
    launchCommand: exactLaunchCommand(),
    matrixRunId:
      `measured-matrix-${options.label}-0123456789abcdef0123456789abcdef`,
    origin: "http://127.0.0.1:43117",
    runtimeRunId:
      `measured-runtime-${options.label}-0123456789abcdef0123456789abcdef`,
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    testOnlyLedgerAuthority
  });
  const bytes = canonicalPrettyObjectBytes(
    request as unknown as Record<string, unknown>
  );
  const requestPath = path.join(
    options.requestRoot,
    "authorization-request.json"
  );
  await publishDurableExclusiveReadonlyFile(requestPath, bytes);
  const requestSha256 = sha256(bytes);
  const authorizationRequest = requestReader({
    allowedRoot: options.requestRoot,
    expectedRequest: request,
    expectedSha256: requestSha256,
    requestPath
  });
  assert.deepEqual(Object.keys(authorizationRequest), [
    "fileSha256",
    "request"
  ], `${options.label}: visible authorization-request binding schema drifted`);
  assert.equal(authorizationRequest.fileSha256, requestSha256,
    `${options.label}: authorization-request binding SHA drifted`);
  assert.deepEqual(authorizationRequest.request, request,
    `${options.label}: authorization-request binding content drifted`);
  return {
    authorizationRequest,
    bytes,
    request,
    requestPath,
    requestRoot: options.requestRoot,
    sha256: requestSha256
  };
}

function readAuthorizationRequestWithApi(
  selectedApi: MeasuredAuthorizationApi,
  fixture: AuthorizationRequestFixture
) {
  const requestReader =
    selectedApi.readCaliforniaSignatureMeasuredAuthorizationRequest;
  assert.equal(typeof requestReader, "function",
    "selected module must expose the ordinary authorization-request reader");
  const authorizationRequest = requestReader({
    allowedRoot: fixture.requestRoot,
    expectedRequest: fixture.request,
    expectedSha256: fixture.sha256,
    requestPath: fixture.requestPath
  });
  assert.equal(authorizationRequest.fileSha256, fixture.sha256,
    "selected module authorization-request binding SHA drifted");
  assert.deepEqual(authorizationRequest.request, fixture.request,
    "selected module authorization-request binding content drifted");
  return authorizationRequest;
}

function exactLaunchCommand(): MeasuredAuthorizationLaunchCommand {
  return {
    projects: ["desktop-chrome", "mobile-chrome"],
    repeatEach: 1,
    reporter: "json",
    retries: 0,
    specPath: "tests/e2e/california-signature-exhaustive.spec.ts",
    workers: 1
  };
}

function launchContextFor(payload: SignedPayload): MeasuredAuthorizationLaunchContext {
  return {
    attemptId: payload.attemptId,
    buildId: payload.buildId,
    executionPlanSha256: payload.executionPlanSha256,
    launchCommand: exactLaunchCommand(),
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    sourceSnapshotSha256: payload.sourceSnapshotSha256
  };
}

function consumptionPathFor(root: string, attemptId: string) {
  return path.join(root, `${sha256(attemptId)}${CONSUMPTION_SUFFIX}`);
}

async function assertMeasuredAuthorizationTestRootDisjointFromProductionLedger(
  testRoot: string,
  productionLedgerRoot: unknown
) {
  assert.equal(typeof testRoot, "string",
    "measured-authorization test root must be one string");
  assert.ok(path.isAbsolute(testRoot),
    "measured-authorization test root must be absolute");
  assert.equal(path.normalize(testRoot), testRoot,
    "measured-authorization test root must be normalized");
  assert.equal(typeof productionLedgerRoot, "string",
    "fixed production measured-authorization ledger root must be one string");
  const fixedProductionLedgerRoot = productionLedgerRoot as string;
  assert.ok(path.isAbsolute(fixedProductionLedgerRoot),
    "fixed production measured-authorization ledger root must be absolute");
  assert.equal(
    path.normalize(fixedProductionLedgerRoot),
    fixedProductionLedgerRoot,
    "fixed production measured-authorization ledger root must be normalized"
  );
  const sameOrDescendant = (root: string, candidate: string) =>
    candidate === root || candidate.startsWith(
      root.endsWith(path.sep) ? root : `${root}${path.sep}`
    );
  const overlapsProductionLedger =
    sameOrDescendant(fixedProductionLedgerRoot, testRoot) ||
    sameOrDescendant(testRoot, fixedProductionLedgerRoot);
  if (overlapsProductionLedger) {
    throw new Error(TEST_ROOT_DISJOINTNESS_ERROR);
  }

  const filesystemRoot = path.parse(testRoot).root;
  const testRootComponentPaths = [filesystemRoot];
  let componentPath = filesystemRoot;
  for (const component of path.relative(filesystemRoot, testRoot)
    .split(path.sep).filter(Boolean)) {
    componentPath = path.join(componentPath, component);
    testRootComponentPaths.push(componentPath);
  }
  assert.equal(testRootComponentPaths.at(-1), testRoot,
    "measured-authorization test-root component scan must end at the exact test root");
  for (const componentPath of testRootComponentPaths) {
    const componentIdentity = await lstat(componentPath);
    if (componentIdentity.isSymbolicLink()) {
      throw new Error(
        `measured-authorization test-root component must not be a symlink: ${componentPath}`
      );
    }
  }
  assert.equal(await realpath(testRoot), testRoot,
    "measured-authorization test root must not traverse a symlinked ancestor");
}

test("production measured authorization pins the exact owner public identity immutably", () => {
  assert.equal(
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_REVIEWER_KEY_ID,
    OWNER_REVIEWER_KEY_ID,
    "production trust must expose only the owner-approved reviewer identity"
  );
  assert.equal(
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_OWNER_PUBLIC_KEY_SHA256,
    OWNER_PUBLIC_KEY_SHA256,
    "production trust must pin the owner-approved public SPKI digest"
  );
  const productionKeys =
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_TRUSTED_REVIEWER_KEYS;
  assert.ok(productionKeys,
    "production reviewer trust must expose one immutable read-only view");
  assert.deepEqual([...productionKeys.keys()], [OWNER_REVIEWER_KEY_ID],
    "production reviewer trust must contain exactly the owner-approved reviewer");
  const publicKeyBase64 = productionKeys.get(OWNER_REVIEWER_KEY_ID);
  assert.ok(typeof publicKeyBase64 === "string",
    "owner-approved reviewer trust must contain one encoded public SPKI");
  const publicKeyBytes = Buffer.from(publicKeyBase64, "base64");
  assert.equal(publicKeyBytes.toString("base64"), publicKeyBase64,
    "owner-approved reviewer public SPKI must use canonical base64");
  assert.equal(createHash("sha256").update(publicKeyBytes).digest("hex"),
    OWNER_PUBLIC_KEY_SHA256,
    "production reviewer public SPKI differs from the owner-approved digest");
  assert.equal(Object.isFrozen(productionKeys), true,
    "production reviewer trust must be frozen");
  for (const mutator of ["set", "delete", "clear"] as const) {
    assert.equal(Reflect.get(productionKeys, mutator), undefined,
      `production reviewer trust must not expose Map.${mutator}`);
  }
});

test("exhaustive spec admits only the agreed runner guard before test declaration", () => {
  assert.equal(
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV,
    RUNNER_GUARD_ENV,
    "runner-guard environment key drifted"
  );
  assert.equal(
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_VALUE,
    RUNNER_GUARD_VALUE,
    "runner-guard value drifted"
  );
  const assertRunnerGuard =
    api.assertCaliforniaSignatureMeasuredAuthorizationRunnerGuard;
  assert.equal(typeof assertRunnerGuard, "function",
    "lifecycle must export the accidental-direct-invocation runner guard");
  assert.throws(() => assertRunnerGuard?.(undefined),
    /runner guard/i,
    "missing runner guard must fail closed");
  assert.throws(() => assertRunnerGuard?.("owner-approved-runner-v0"),
    /runner guard/i,
    "incorrect runner guard must fail closed");
  assert.doesNotThrow(() => assertRunnerGuard?.(RUNNER_GUARD_VALUE),
    "the exact runner guard must pass");

  const specSource = readFileSync(path.join(
    process.cwd(),
    "tests/e2e/california-signature-exhaustive.spec.ts"
  ), "utf8");
  assert.doesNotMatch(
    specSource,
    /assertCaliforniaSignatureFormalExecutionAuthorizationUnavailable/,
    "exhaustive spec must not retain the unconditional diagnostic-capacity HOLD"
  );
  const guardCall =
    "assertCaliforniaSignatureMeasuredAuthorizationRunnerGuard(\n  process.env[CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_RUNNER_GUARD_ENV]\n);";
  const guardIndex = specSource.indexOf(guardCall);
  const firstTestDeclarationIndex = specSource.indexOf("test.describe.configure(");
  assert.ok(guardIndex >= 0 && firstTestDeclarationIndex > guardIndex,
    "exhaustive spec must check the exact runner guard before declaring tests");
});

test("measured authorization test-root containment guard precedes filesystem access", async () => {
  const source = readFileSync(new URL(import.meta.url), "utf8");
  const guardName = [
    "assertMeasuredAuthorizationTestRootDisjoint",
    "FromProductionLedger"
  ].join("");
  const declarationToken = `async function ${guardName}(`;
  const countToken = (value: string, token: string) =>
    value.split(token).length - 1;
  assert.equal(countToken(source, declarationToken), 1,
    "measured authorization must declare one shared asynchronous test-root disjointness guard");
  const guardStart = source.indexOf(declarationToken);
  const guardEndToken = ["\n}", "\n\ntest("].join("");
  const guardEnd = source.indexOf(guardEndToken, guardStart);
  assert.ok(guardStart >= 0 && guardEnd > guardStart,
    "shared test-root disjointness guard source block must be isolated");
  const guardSource = source.slice(guardStart, guardEnd + 2);
  const overlapThrowToken = [
    "throw new ",
    "Error(TEST_ROOT_",
    "DISJOINTNESS_ERROR);"
  ].join("");
  const overlapThrowIndex = guardSource.indexOf(overlapThrowToken);
  assert.ok(overlapThrowIndex >= 0,
    "shared test-root guard must contain the exact lexical overlap throw");
  const filesystemCallTokens = [
    ["await real", "path("].join(""),
    ["await l", "stat("].join(""),
    ["await read", "File("].join(""),
    ["await read", "dir("].join(""),
    ["await o", "pen("].join(""),
    ["await mk", "dir("].join(""),
    ["lstat", "Sync("].join(""),
    ["readFile", "Sync("].join(""),
    ["open", "Sync("].join(""),
    ["realpath", "Sync("].join("")
  ];
  const filesystemCallIndexes = filesystemCallTokens.flatMap((token) => {
    const indexes: number[] = [];
    let cursor = guardSource.indexOf(token);
    while (cursor >= 0) {
      indexes.push(cursor);
      cursor = guardSource.indexOf(token, cursor + token.length);
    }
    return indexes;
  });
  assert.ok(filesystemCallIndexes.length >= 1,
    "shared test-root guard must retain its canonical filesystem verification");
  for (const filesystemCallIndex of filesystemCallIndexes) {
    assert.ok(overlapThrowIndex < filesystemCallIndex,
      "lexical production-root overlap rejection must precede every filesystem call");
  }
  const componentScanToken = [
    "const componentIdentity = await l",
    "stat(componentPath);"
  ].join("");
  const canonicalRealpathToken = [
    "await real",
    "path(testRoot)"
  ].join("");
  const componentScanIndex = guardSource.indexOf(componentScanToken);
  const canonicalRealpathIndex = guardSource.indexOf(canonicalRealpathToken);
  assert.ok(componentScanIndex >= 0,
    "shared test-root guard must lstat each root-to-leaf test-path component");
  assert.ok(canonicalRealpathIndex >= 0,
    "shared test-root guard must retain its final canonical realpath check");
  assert.ok(overlapThrowIndex < componentScanIndex,
    "lexical production-root overlap rejection must precede component lstat scanning");
  assert.ok(componentScanIndex < canonicalRealpathIndex,
    "root-to-leaf component lstat scanning must precede final realpath canonicalization");

  const existingTopLevelTests = [
    "measured authorization is Ed25519-bound, opaque, and fail-closed before launch",
    "measured authorization production closure RED: trust separation, exact context, and durable one-attempt consumption"
  ] as const;
  const testStarts = existingTopLevelTests.map((name) => {
    const start = source.lastIndexOf(`test(\"${name}\"`);
    assert.ok(start >= 0,
      `${name}: existing top-level test declaration must remain source-visible`);
    return start;
  });
  let guardedTopLevelTests = 0;
  for (const [index, name] of existingTopLevelTests.entries()) {
    const block = source.slice(
      testStarts[index],
      testStarts[index + 1] ?? source.length
    );
    const guardCallToken = `await ${guardName}(`;
    assert.equal(countToken(block, guardCallToken), 1,
      `${name}: must contain exactly one shared test-root disjointness guard call`);
    const normalizedIndex = block.indexOf(
      "assert.equal(path.normalize(testRoot), testRoot"
    );
    const guardIndex = block.indexOf(guardCallToken);
    const lstatIndex = block.indexOf(
      "const testRootIdentity = await lstat(testRoot"
    );
    assert.ok(normalizedIndex >= 0 && lstatIndex >= 0,
      `${name}: normalized-path and first-lstat source boundaries must remain visible`);
    assert.ok(normalizedIndex < guardIndex,
      `${name}: test-root disjointness guard must follow path normalization`);
    assert.ok(guardIndex < lstatIndex,
      `${name}: test-root disjointness guard must precede the first lstat`);
    guardedTopLevelTests += 1;
  }
  assert.equal(guardedTopLevelTests, 2,
    "exactly two existing top-level tests must be guarded before lstat");

  const behaviorTestRoot =
    process.env.CA_SIGNATURE_MEASURED_AUTHORIZATION_TEST_ROOT?.trim();
  assert.ok(behaviorTestRoot && path.isAbsolute(behaviorTestRoot),
    "containment behavior requires one absolute measured-authorization test root");
  assert.equal(path.normalize(behaviorTestRoot), behaviorTestRoot,
    "containment behavior test root must be normalized");
  const assertRelationshipRejected = async (
    productionLedgerRoot: string,
    label: string
  ) => {
    await assert.rejects(
      () => assertMeasuredAuthorizationTestRootDisjointFromProductionLedger(
        behaviorTestRoot,
        productionLedgerRoot
      ),
      (error: unknown) => {
        assert.ok(error instanceof Error,
          `${label}: containment rejection must throw one Error`);
        assert.equal(error.message, TEST_ROOT_DISJOINTNESS_ERROR,
          `${label}: containment rejection message drifted`);
        return true;
      },
      label
    );
  };
  await assertRelationshipRejected(
    behaviorTestRoot,
    "test root equal to supplied production root"
  );
  await assertRelationshipRejected(
    path.dirname(behaviorTestRoot),
    "test root below supplied production root"
  );
  await assertRelationshipRejected(
    path.join(behaviorTestRoot, "synthetic-production-ledger-descendant"),
    "test root above supplied production root"
  );
  await assert.doesNotReject(
    () => assertMeasuredAuthorizationTestRootDisjointFromProductionLedger(
      behaviorTestRoot,
      api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT
    ),
    "a physical test root disjoint from the fixed production ledger must be accepted"
  );
});

test("measured authorization is Ed25519-bound, opaque, and fail-closed before launch", async (t) => {
  const testingReadReceipt =
    api.__testingReadCaliforniaSignatureMeasuredAuthorizationReceipt;
  const testingVerifyForLaunch =
    api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
  const readReceipt = api.readCaliforniaSignatureMeasuredAuthorizationReceipt;
  const verifyForLaunch =
    api.verifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
  const productionKeys =
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_TRUSTED_REVIEWER_KEYS;

  assert.equal(typeof testingReadReceipt, "function",
    "__testingReadCaliforniaSignatureMeasuredAuthorizationReceipt must be exported before ephemeral reviewer keys can exercise the contract");
  assert.equal(typeof testingVerifyForLaunch, "function",
    "ephemeral reviewer keys require an isolated test-only launch verifier that cannot mint a production launch capability");
  assert.equal(typeof readReceipt, "function",
    "readCaliforniaSignatureMeasuredAuthorizationReceipt must be exported before measured execution can leave HOLD");
  assert.equal(typeof verifyForLaunch, "function",
    "verifyCaliforniaSignatureMeasuredAuthorizationForLaunch must own the launch callback");
  assert.ok(productionKeys,
    "the production measured-authorization reviewer registry must expose a read-only view");
  assert.equal(productionKeys.size, 1,
    "production reviewer trust must contain only the owner-approved reviewer key");
  assert.equal(productionKeys.has(OWNER_REVIEWER_KEY_ID), true,
    "production reviewer trust must contain the owner-approved reviewer identity");
  assert.equal(Object.isFrozen(productionKeys), true,
    "the exported production reviewer-key view must be frozen");
  for (const mutator of ["set", "delete", "clear"] as const) {
    assert.equal(Reflect.get(productionKeys, mutator), undefined,
      `the exported production reviewer-key view must not expose Map.${mutator}`);
  }
  assert.throws(() => Map.prototype.set.call(productionKeys,
    "injected-reviewer-ed25519-0123456789abcdef", "injected-key"),
  /Map|receiver|incompatible/i,
  "Map.set must not mutate the exported production reviewer-key view");
  assert.throws(() => Map.prototype.delete.call(productionKeys,
    "injected-reviewer-ed25519-0123456789abcdef"),
  /Map|receiver|incompatible/i,
  "Map.delete must not mutate the exported production reviewer-key view");
  assert.throws(() => Map.prototype.clear.call(productionKeys),
    /Map|receiver|incompatible/i,
    "Map.clear must not mutate the exported production reviewer-key view");
  assert.equal(productionKeys.size, 1,
    "mutation attempts changed the immutable owner-approved reviewer-key registry");
  assert.equal(productionKeys.has(OWNER_REVIEWER_KEY_ID), true,
    "mutation attempts removed the owner-approved reviewer identity");

  const testRoot = process.env.CA_SIGNATURE_MEASURED_AUTHORIZATION_TEST_ROOT?.trim();
  assert.ok(testRoot && path.isAbsolute(testRoot) &&
    testRoot.startsWith("/Volumes/Starship/"),
  "CA_SIGNATURE_MEASURED_AUTHORIZATION_TEST_ROOT must be one absolute Starship path");
  assert.equal(path.normalize(testRoot), testRoot,
    "measured-authorization test root must be normalized");
  await assertMeasuredAuthorizationTestRootDisjointFromProductionLedger(
    testRoot,
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT
  );
  const testRootIdentity = await lstat(testRoot);
  assert.ok(testRootIdentity.isDirectory() && !testRootIdentity.isSymbolicLink(),
    "measured-authorization test root must be a physical directory");
  assert.equal(testRootIdentity.uid, process.getuid!(),
    "measured-authorization test root must be test-owned");
  assert.equal(testRootIdentity.mode & 0o777, 0o700,
    "measured-authorization test root must be mode 0700");

  const fixtureRoot = path.join(testRoot, "receipts");
  const attemptLedgerRoot = path.join(testRoot, "attempt-ledger");
  const authorizationRequestRoot = path.join(
    testRoot,
    "isolated-contract-authorization-request"
  );
  await mkdir(fixtureRoot, { mode: 0o700 });
  await syncDirectory(testRoot);
  const attemptLedgerFixture = await provisionAttemptLedger(
    attemptLedgerRoot,
    "isolated-contract"
  );
  const fixtureIdentity = await lstat(fixtureRoot);
  assert.ok(fixtureIdentity.isDirectory() && !fixtureIdentity.isSymbolicLink());
  assert.equal(fixtureIdentity.uid, process.getuid!());
  assert.equal(fixtureIdentity.mode & 0o777, 0o700);
  const createdFiles: string[] = [];
  const createdConsumptionFiles: string[] = [];
  const createdAuthorizationRequests: AuthorizationRequestFixture[] = [];
  t.after(async () => {
    for (const filePath of [...createdConsumptionFiles].reverse()) {
      const identity = await lstat(filePath);
      assert.ok(identity.isFile() && !identity.isSymbolicLink() && identity.nlink === 1,
        `cleanup refused a non-singleton consumption receipt: ${filePath}`);
      assert.equal(identity.uid, process.getuid!(),
        `cleanup refused a consumption receipt owned by another uid: ${filePath}`);
      await unlink(filePath);
    }
    assert.deepEqual(await readdir(attemptLedgerRoot), [ATTEMPT_LEDGER_ANCHOR_FILENAME],
      "measured-authorization attempt ledger retained unexpected residue");
    const finalAnchorIdentity = await lstat(
      attemptLedgerFixture.anchorPath,
      { bigint: true }
    );
    for (const key of [
      "dev", "ino", "size", "mtimeNs", "ctimeNs", "birthtimeNs", "nlink", "uid", "mode"
    ] as const) {
      assert.equal(finalAnchorIdentity[key], attemptLedgerFixture.anchorIdentity[key],
        `cleanup refused changed attempt-ledger anchor ${key}`);
    }
    assert.deepEqual(
      await readFile(attemptLedgerFixture.anchorPath),
      attemptLedgerFixture.anchorBytes,
      "cleanup refused changed attempt-ledger anchor bytes"
    );
    await unlink(attemptLedgerFixture.anchorPath);
    assert.deepEqual(await readdir(attemptLedgerRoot), [],
      "attempt-ledger root retained residue after exact anchor cleanup");
    const finalAttemptLedgerIdentity = await lstat(attemptLedgerRoot, {
      bigint: true
    });
    for (const key of ["dev", "ino", "birthtimeNs", "uid", "mode"] as const) {
      assert.equal(
        finalAttemptLedgerIdentity[key],
        attemptLedgerFixture.rootIdentity[key],
        `cleanup refused changed attempt-ledger root ${key}`
      );
    }
    await rmdir(attemptLedgerRoot);
    for (const filePath of [...createdFiles].reverse()) {
      const identity = await lstat(filePath);
      assert.ok(identity.isFile() && !identity.isSymbolicLink() && identity.nlink === 1,
        `cleanup refused a non-singleton receipt: ${filePath}`);
      assert.equal(identity.uid, process.getuid!(),
        `cleanup refused a receipt owned by another uid: ${filePath}`);
      await unlink(filePath);
    }
    assert.deepEqual(await readdir(fixtureRoot), [],
      "measured-authorization fixture root retained unexpected residue");
    const finalFixtureIdentity = await lstat(fixtureRoot);
    assert.equal(finalFixtureIdentity.dev, fixtureIdentity.dev);
    assert.equal(finalFixtureIdentity.ino, fixtureIdentity.ino);
    await rmdir(fixtureRoot);
    for (const requestFixture of [...createdAuthorizationRequests].reverse()) {
      const requestIdentity = await lstat(requestFixture.requestPath);
      assert.ok(requestIdentity.isFile() &&
        !requestIdentity.isSymbolicLink() && requestIdentity.nlink === 1,
      `cleanup refused a non-singleton authorization request: ${requestFixture.requestPath}`);
      assert.equal(requestIdentity.uid, process.getuid!(),
        `cleanup refused an authorization request owned by another uid: ${requestFixture.requestPath}`);
      assert.equal(requestIdentity.mode & 0o777, 0o400,
        `cleanup refused an authorization request not held at mode 0400: ${requestFixture.requestPath}`);
      assert.deepEqual(await readFile(requestFixture.requestPath),
        requestFixture.bytes,
      `cleanup refused changed authorization-request bytes: ${requestFixture.requestPath}`);
      await unlink(requestFixture.requestPath);
      assert.deepEqual(await readdir(requestFixture.requestRoot), [],
        `authorization-request root retained residue: ${requestFixture.requestRoot}`);
      const requestRootIdentity = await lstat(requestFixture.requestRoot);
      assert.ok(requestRootIdentity.isDirectory() &&
        !requestRootIdentity.isSymbolicLink(),
      `cleanup refused a non-physical authorization-request root: ${requestFixture.requestRoot}`);
      assert.equal(requestRootIdentity.uid, process.getuid!(),
        `cleanup refused an authorization-request root owned by another uid: ${requestFixture.requestRoot}`);
      assert.equal(requestRootIdentity.mode & 0o777, 0o700,
        `cleanup refused an authorization-request root not held at mode 0700: ${requestFixture.requestRoot}`);
      await rmdir(requestFixture.requestRoot);
    }
    const finalTestRootIdentity = await lstat(testRoot);
    assert.equal(finalTestRootIdentity.dev, testRootIdentity.dev,
      "test root device changed during measured-authorization contract");
    assert.equal(finalTestRootIdentity.ino, testRootIdentity.ino,
      "test root inode changed during measured-authorization contract");
  });

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeySpkiDerBase64 = publicKey.export({
    format: "der",
    type: "spki"
  }).toString("base64");
  const testKeys = new Map([[REVIEWER_KEY_ID, publicKeySpkiDerBase64]]);
  const authorizationClock = Date.now();
  const attemptId = "measured-attempt-0123456789abcdef0123456789abcdef";
  const buildId = "california-signature-build-0123456789abcdef";
  const executionPlanSha256 = "b".repeat(64);
  const sourceSnapshotSha256 = "a".repeat(64);
  const authorizationRequestFixture = await provisionAuthorizationRequest({
    attemptId,
    attemptLedgerRoot,
    buildId,
    executionPlanSha256,
    label: "isolated-contract",
    requestRoot: authorizationRequestRoot,
    selectedApi: api,
    sourceSnapshotSha256
  });
  createdAuthorizationRequests.push(authorizationRequestFixture);
  const payload: SignedPayload = {
    attemptId,
    attemptLedger: attemptLedgerFixture.attemptLedger,
    authorizationNonce: "measured-auth-0123456789abcdef0123456789abcdef",
    authorizationRequestSha256: authorizationRequestFixture.sha256,
    buildId,
    decision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
    executionPlanSha256,
    expiresAt: new Date(authorizationClock + 60 * 60_000).toISOString(),
    issuedAt: new Date(authorizationClock - 60_000).toISOString(),
    launchCommand: exactLaunchCommand(),
    maxInvocations: 1,
    requiredProjects: ["desktop-chrome", "mobile-chrome"],
    retryAuthorized: false,
    sourceSnapshotSha256
  };

  function signedReceipt(value: Record<string, unknown>, reviewerKeyId = REVIEWER_KEY_ID) {
    const payloadBytes = Buffer.from(JSON.stringify(value), "utf8");
    return {
      payloadBase64: payloadBytes.toString("base64"),
      reviewerKeyId,
      schema: DISCOVERY_SCHEMA,
      signatureAlgorithm: "Ed25519",
      signatureBase64: signBytes(null, payloadBytes, privateKey).toString("base64")
    } satisfies DiscoveryReceipt;
  }

  async function publish(fileName: string, receipt: Record<string, unknown>) {
    const filePath = path.join(fixtureRoot, fileName);
    const bytes = receiptBytes(receipt);
    await writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
    createdFiles.push(filePath);
    return { bytes, filePath, sha256: sha256(bytes) };
  }

  function readThroughTestReceipt(options: {
    expectedSha256: string;
    receiptPath: string;
    trustedKeys: ReadonlyMap<string, string>;
  }) {
    const authorizationRequest = readAuthorizationRequestWithApi(
      api,
      authorizationRequestFixture
    );
    return testingReadReceipt({
      allowedRoot: fixtureRoot,
      authorizationRequest,
      expectedSha256: options.expectedSha256,
      receiptPath: options.receiptPath,
      testOnlyAttemptLedgerRoot: attemptLedgerRoot,
      testOnlyTrustedReviewerPublicKeys: options.trustedKeys
    });
  }

  function launchThroughTestReceipt(options: {
    expectedSha256: string;
    receiptPath: string;
    trustedKeys: ReadonlyMap<string, string>;
  }, onLaunch: () => string) {
    const loaded = readThroughTestReceipt(options);
    return {
      fileSha256: loaded.fileSha256,
      result: testingVerifyForLaunch({
        authorization: loaded.authorization,
        launch: onLaunch,
        launchContext: launchContextFor(payload)
      }),
      authorization: loaded.authorization
    };
  }

  function assertRejectedBeforeLaunch(options: {
    expectedSha256: string;
    label: string;
    matcher: RegExp;
    receiptPath: string;
    trustedKeys: ReadonlyMap<string, string>;
  }) {
    let launchCount = 0;
    assert.throws(() => launchThroughTestReceipt(options, () => {
      launchCount += 1;
      return "FORBIDDEN_LAUNCH";
    }), options.matcher, options.label);
    assert.equal(launchCount, 0, `${options.label}: rejected authorization reached launch`);
  }

  const valid = await publish("valid.json", signedReceipt(payload));
  let validLaunchCount = 0;
  const accepted = launchThroughTestReceipt({
    expectedSha256: valid.sha256,
    receiptPath: valid.filePath,
    trustedKeys: testKeys
  }, () => {
    validLaunchCount += 1;
    return "LAUNCH_ACCEPTED";
  });
  assert.equal(accepted.fileSha256, valid.sha256);
  assert.equal(accepted.result, "LAUNCH_ACCEPTED");
  assert.equal(validLaunchCount, 1,
    "a valid test-only Ed25519 discovery receipt must cross the launch seam exactly once");
  createdConsumptionFiles.push(consumptionPathFor(attemptLedgerRoot, payload.attemptId));
  let replayLaunchCount = 0;
  assert.throws(() => testingVerifyForLaunch({
    authorization: accepted.authorization,
    launch: () => {
      replayLaunchCount += 1;
      return "FORBIDDEN_REPLAY_LAUNCH";
    },
    launchContext: launchContextFor(payload)
  }), /consumed|one-shot|opaque|validated|authorization/i,
  "the original validated authorization must be one-shot");
  assert.equal(replayLaunchCount, 0,
    "a consumed original authorization reached launch twice");

  const missingPath = path.join(fixtureRoot, "missing.json");
  assertRejectedBeforeLaunch({
    expectedSha256: "0".repeat(64),
    label: "missing receipt",
    matcher: /missing|ENOENT|receipt/i,
    receiptPath: missingPath,
    trustedKeys: testKeys
  });

  assertRejectedBeforeLaunch({
    expectedSha256: valid.sha256,
    label: "non-Map test reviewer registry",
    matcher: /Map|test-only trusted reviewer/i,
    receiptPath: valid.filePath,
    trustedKeys: Object.freeze({}) as unknown as ReadonlyMap<string, string>
  });

  const unsignedReceipt: Record<string, unknown> = { ...signedReceipt(payload) };
  delete unsignedReceipt.signatureBase64;
  const unsigned = await publish("unsigned.json", unsignedReceipt);
  assertRejectedBeforeLaunch({
    expectedSha256: unsigned.sha256,
    label: "unsigned receipt",
    matcher: /signature|exact schema|missing/i,
    receiptPath: unsigned.filePath,
    trustedKeys: testKeys
  });

  const unknownReceiptField = await publish("unknown-receipt-field.json", {
    ...signedReceipt(payload),
    legacySignatureEncoding: "hex"
  });
  assertRejectedBeforeLaunch({
    expectedSha256: unknownReceiptField.sha256,
    label: "unknown receipt field",
    matcher: /exact schema|unknown|field/i,
    receiptPath: unknownReceiptField.filePath,
    trustedKeys: testKeys
  });

  const unknownReviewer = await publish("unknown-reviewer.json",
    signedReceipt(payload, "unknown-reviewer-ed25519-0123456789abcdef"));
  assertRejectedBeforeLaunch({
    expectedSha256: unknownReviewer.sha256,
    label: "unknown reviewer key",
    matcher: /unknown|trusted reviewer|HOLD/i,
    receiptPath: unknownReviewer.filePath,
    trustedKeys: testKeys
  });

  const mutatedPayloadReceipt = signedReceipt(payload);
  const mutatedPayload = {
    ...payload,
    sourceSnapshotSha256: "c".repeat(64)
  };
  mutatedPayloadReceipt.payloadBase64 = Buffer.from(
    JSON.stringify(mutatedPayload), "utf8").toString("base64");
  const mutatedPayloadFile = await publish("payload-mutation.json", mutatedPayloadReceipt);
  assertRejectedBeforeLaunch({
    expectedSha256: mutatedPayloadFile.sha256,
    label: "payload mutation",
    matcher: /Ed25519|signature|payload/i,
    receiptPath: mutatedPayloadFile.filePath,
    trustedKeys: testKeys
  });

  const mutatedSignatureReceipt = signedReceipt(payload);
  const mutatedSignature = Buffer.from(mutatedSignatureReceipt.signatureBase64, "base64");
  mutatedSignature[0] = mutatedSignature[0]! ^ 0x01;
  mutatedSignatureReceipt.signatureBase64 = mutatedSignature.toString("base64");
  const mutatedSignatureFile = await publish("signature-mutation.json", mutatedSignatureReceipt);
  assertRejectedBeforeLaunch({
    expectedSha256: mutatedSignatureFile.sha256,
    label: "signature mutation",
    matcher: /Ed25519|signature/i,
    receiptPath: mutatedSignatureFile.filePath,
    trustedKeys: testKeys
  });

  assertRejectedBeforeLaunch({
    expectedSha256: "d".repeat(64),
    label: "external SHA mismatch",
    matcher: /SHA|external|bytes/i,
    receiptPath: valid.filePath,
    trustedKeys: testKeys
  });

  const unknownFieldPayload = {
    ...payload,
    legacyAuthorizationScope: "all-projects"
  };
  const unknownFieldFile = await publish("unknown-field.json",
    signedReceipt(unknownFieldPayload));
  assertRejectedBeforeLaunch({
    expectedSha256: unknownFieldFile.sha256,
    label: "unknown payload field",
    matcher: /exact schema|unknown|field/i,
    receiptPath: unknownFieldFile.filePath,
    trustedKeys: testKeys
  });

  const { buildId: _missingBuildId, ...missingFieldPayload } = payload;
  const missingFieldFile = await publish("missing-field.json",
    signedReceipt(missingFieldPayload));
  assertRejectedBeforeLaunch({
    expectedSha256: missingFieldFile.sha256,
    label: "missing payload field",
    matcher: /exact schema|missing|buildId/i,
    receiptPath: missingFieldFile.filePath,
    trustedKeys: testKeys
  });

  const mutatedAuthorization = readThroughTestReceipt({
    expectedSha256: valid.sha256,
    receiptPath: valid.filePath,
    trustedKeys: testKeys
  });
  assert.ok(mutatedAuthorization.authorization &&
    typeof mutatedAuthorization.authorization === "object" &&
    !Array.isArray(mutatedAuthorization.authorization),
  "the opaque authorization must be an object branded by the reader");
  const genuineAuthorization =
    mutatedAuthorization.authorization as Record<string, unknown>;
  assert.equal(Object.isFrozen(mutatedAuthorization), true,
    "the genuine reader result must be frozen");
  assert.equal(Object.isFrozen(genuineAuthorization), true,
    "the genuine reader-issued authorization must be frozen");
  const launchCommand =
    genuineAuthorization.launchCommand as Record<string, unknown>;
  for (const [label, nested] of [
    ["attemptLedger", genuineAuthorization.attemptLedger],
    ["launchCommand", launchCommand],
    ["launchCommand.projects", launchCommand.projects],
    ["requiredProjects", genuineAuthorization.requiredProjects]
  ] as const) {
    assert.ok(nested && typeof nested === "object",
      `the genuine authorization ${label} must be one nested object`);
    assert.equal(Object.isFrozen(nested), true,
      `the genuine authorization ${label} must be frozen`);
  }
  const originalBuildId = genuineAuthorization.buildId;
  assert.equal(originalBuildId, payload.buildId,
    "the genuine reader-issued authorization buildId drifted before mutation rejection");
  assert.throws(() => {
    genuineAuthorization.buildId =
      "tampered-california-signature-build-0123456789abcdef";
  }, (error: unknown) => {
    assert.ok(error instanceof TypeError,
      "direct mutation of the genuine authorization must throw TypeError");
    assert.match(error.message, /read.?only|assign/i,
      "direct mutation must identify the read-only authorization property");
    return true;
  }, "the genuine reader-issued authorization must reject direct mutation");
  assert.equal(genuineAuthorization.buildId, originalBuildId,
    "direct mutation changed the genuine reader-issued authorization buildId");

  const mutatedAuthorizationClone = structuredClone(genuineAuthorization);
  mutatedAuthorizationClone.buildId =
    "tampered-california-signature-build-0123456789abcdef";
  let mutatedAuthorizationLaunchCount = 0;
  assert.throws(() => testingVerifyForLaunch({
    authorization: mutatedAuthorizationClone,
    launch: () => {
      mutatedAuthorizationLaunchCount += 1;
      return "FORBIDDEN_MUTATED_AUTHORIZATION_LAUNCH";
    },
    launchContext: launchContextFor(payload)
  }), /opaque|validated|reader|authorization/i,
  "a caller-shaped mutated clone must not impersonate the frozen reader-issued authorization");
  assert.equal(mutatedAuthorizationLaunchCount, 0,
    "a caller-shaped mutated authorization clone reached launch");

  let callerShapedLaunchCount = 0;
  assert.throws(() => testingVerifyForLaunch({
    authorization: structuredClone(accepted.authorization),
    launch: () => {
      callerShapedLaunchCount += 1;
      return "FORBIDDEN_CALLER_SHAPED_LAUNCH";
    },
    launchContext: launchContextFor(payload)
  }), /opaque|validated|reader|authorization/i,
  "a caller-shaped in-memory object must not impersonate the held-file reader result");
  assert.equal(callerShapedLaunchCount, 0,
    "caller-shaped in-memory authorization reached launch");

  const validMarkerPath = consumptionPathFor(attemptLedgerRoot, payload.attemptId);
  const validMarkerIdentityBeforeProductionHold = await lstat(validMarkerPath, {
    bigint: true
  });
  const validMarkerBytesBeforeProductionHold = await readFile(validMarkerPath);
  const ledgerEntriesBeforeProductionHold = await readdir(attemptLedgerRoot);
  let productionHoldLaunchCount = 0;
  assert.throws(() => {
    const authorizationRequest = readAuthorizationRequestWithApi(
      api,
      authorizationRequestFixture
    );
    const loaded = readReceipt({
      allowedRoot: fixtureRoot,
      authorizationRequest,
      expectedSha256: valid.sha256,
      receiptPath: valid.filePath,
      testOnlyTrustedReviewerPublicKeys: testKeys
    } as unknown as MeasuredAuthorizationReaderOptions);
    return verifyForLaunch({
      authorization: loaded.authorization,
      launch: () => {
        productionHoldLaunchCount += 1;
        return "FORBIDDEN_PRODUCTION_HOLD_LAUNCH";
      },
      launchContext: launchContextFor(payload)
    });
  }, /HOLD|trusted reviewer|unknown reviewer|exact schema|unknown.*key|test-only/i,
  "caller-supplied test keys must not bypass the empty production reviewer registry");
  assert.throws(() => {
    const authorizationRequest = readAuthorizationRequestWithApi(
      api,
      authorizationRequestFixture
    );
    const loaded = readReceipt({
      allowedRoot: fixtureRoot,
      authorizationRequest,
      expectedSha256: valid.sha256,
      receiptPath: valid.filePath
    });
    return verifyForLaunch({
      authorization: loaded.authorization,
      launch: () => {
        productionHoldLaunchCount += 1;
        return "FORBIDDEN_EMPTY_TRUST_PRODUCTION_LAUNCH";
      },
      launchContext: launchContextFor(payload)
    });
  }, /HOLD|trusted reviewer|unknown reviewer/i,
  "the exact production reader must remain on HOLD at its empty reviewer registry");
  assert.equal(productionHoldLaunchCount, 0,
    "empty production reviewer registry reached launch");
  assert.deepEqual(await readdir(attemptLedgerRoot), ledgerEntriesBeforeProductionHold,
    "production HOLD mutated the isolated attempt-ledger directory");
  const validMarkerIdentityAfterProductionHold = await lstat(validMarkerPath, {
    bigint: true
  });
  for (const key of [
    "dev", "ino", "size", "mtimeNs", "ctimeNs", "birthtimeNs", "nlink", "uid", "mode"
  ] as const) {
    assert.equal(
      validMarkerIdentityAfterProductionHold[key],
      validMarkerIdentityBeforeProductionHold[key],
      `production HOLD changed isolated marker ${key}`
    );
  }
  assert.deepEqual(await readFile(validMarkerPath), validMarkerBytesBeforeProductionHold,
    "production HOLD changed isolated marker bytes");
});

test("measured authorization production closure RED: trust separation, exact context, and durable one-attempt consumption", async (t) => {
  const testRoot = process.env.CA_SIGNATURE_MEASURED_AUTHORIZATION_TEST_ROOT?.trim();
  assert.ok(testRoot && path.isAbsolute(testRoot) &&
    testRoot.startsWith("/Volumes/Starship/"),
  "CA_SIGNATURE_MEASURED_AUTHORIZATION_TEST_ROOT must be one absolute Starship path");
  assert.equal(path.normalize(testRoot), testRoot,
    "measured-authorization RED test root must be normalized");
  await assertMeasuredAuthorizationTestRootDisjointFromProductionLedger(
    testRoot,
    api.CALIFORNIA_SIGNATURE_MEASURED_AUTHORIZATION_LEDGER_ROOT
  );
  const testRootIdentity = await lstat(testRoot);
  assert.ok(testRootIdentity.isDirectory() && !testRootIdentity.isSymbolicLink(),
    "measured-authorization RED test root must be a physical directory");
  assert.equal(testRootIdentity.uid, process.getuid!(),
    "measured-authorization RED test root must be test-owned");
  assert.equal(testRootIdentity.mode & 0o777, 0o700,
    "measured-authorization RED test root must be mode 0700");

  const retainedRoot = path.join(testRoot, "production-closure-red");
  const receiptRoot = path.join(retainedRoot, "receipts");
  await mkdir(retainedRoot, { mode: 0o700 });
  await syncDirectory(testRoot);
  await mkdir(receiptRoot, { mode: 0o700 });
  await syncDirectory(retainedRoot);
  const receiptRootIdentity = await lstat(receiptRoot);
  assert.ok(receiptRootIdentity.isDirectory() &&
    !receiptRootIdentity.isSymbolicLink(),
  "retained receipt root must be physical");
  assert.equal(receiptRootIdentity.uid, process.getuid!(),
    "retained receipt root must be test-owned");
  assert.equal(receiptRootIdentity.mode & 0o777, 0o700,
    "retained receipt root must be mode 0700");
  const trustAttemptLedger = await provisionAttemptLedger(
    path.join(retainedRoot, "trust-attempt-ledger"),
    "trust-separation"
  );
  const contextAttemptLedger = await provisionAttemptLedger(
    path.join(retainedRoot, "context-attempt-ledger"),
    "exact-context"
  );
  const durableAttemptLedger = await provisionAttemptLedger(
    path.join(retainedRoot, "durable-attempt-ledger"),
    "durable-attempt"
  );
  const occupiedAttemptLedger = await provisionAttemptLedger(
    path.join(retainedRoot, "occupied-attempt-ledger"),
    "occupied-attempt"
  );
  const callbackThrowAttemptLedger = await provisionAttemptLedger(
    path.join(retainedRoot, "callback-throw-attempt-ledger"),
    "callback-throw"
  );
  const observerAttemptLedger = await provisionAttemptLedger(
    path.join(retainedRoot, "observer-attempt-ledger"),
    "durability-observer"
  );

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeySpkiDerBase64 = publicKey.export({
    format: "der",
    type: "spki"
  }).toString("base64");
  const testKeys = new Map([[REVIEWER_KEY_ID, publicKeySpkiDerBase64]]);
  const authorizationClock = Date.now();

  async function payloadFor(
    label: string,
    attemptLedgerFixture: Awaited<ReturnType<typeof provisionAttemptLedger>>
  ) {
    const attemptId =
      `measured-attempt-${label}-0123456789abcdef0123456789abcdef`;
    const buildId =
      `california-signature-build-${label}-0123456789abcdef`;
    const executionPlanSha256 = sha256(`execution-plan-${label}`);
    const sourceSnapshotSha256 = sha256(`source-snapshot-${label}`);
    const authorizationRequestFixture = await provisionAuthorizationRequest({
      attemptId,
      attemptLedgerRoot: attemptLedgerFixture.root,
      buildId,
      executionPlanSha256,
      label,
      requestRoot: path.join(
        retainedRoot,
        `${label}-authorization-request`
      ),
      selectedApi: api,
      sourceSnapshotSha256
    });
    const payload: SignedPayload = {
      attemptId,
      attemptLedger: attemptLedgerFixture.attemptLedger,
      authorizationNonce: `measured-nonce-${label}-0123456789abcdef0123456789abcdef`,
      authorizationRequestSha256: authorizationRequestFixture.sha256,
      buildId,
      decision: "AUTHORIZED_FOR_EXACT_TWO_CHROME_PROJECTS",
      executionPlanSha256,
      expiresAt: new Date(authorizationClock + 60 * 60_000).toISOString(),
      issuedAt: new Date(authorizationClock - 60_000).toISOString(),
      launchCommand: exactLaunchCommand(),
      maxInvocations: 1,
      requiredProjects: ["desktop-chrome", "mobile-chrome"],
      retryAuthorized: false,
      sourceSnapshotSha256
    };
    return { authorizationRequestFixture, payload };
  }

  function signedReceipt(value: SignedPayload) {
    const payloadBytes = Buffer.from(JSON.stringify(value), "utf8");
    return {
      payloadBase64: payloadBytes.toString("base64"),
      reviewerKeyId: REVIEWER_KEY_ID,
      schema: DISCOVERY_SCHEMA,
      signatureAlgorithm: "Ed25519",
      signatureBase64: signBytes(null, payloadBytes, privateKey).toString("base64")
    } satisfies DiscoveryReceipt;
  }

  async function publish(
    label: string,
    payload: SignedPayload,
    testOnlyAttemptLedgerRoot: string,
    authorizationRequestFixture: AuthorizationRequestFixture
  ) {
    const filePath = path.join(receiptRoot, `${label}.json`);
    const bytes = receiptBytes(signedReceipt(payload));
    await writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
    return {
      authorizationRequestFixture,
      bytes,
      filePath,
      sha256: sha256(bytes),
      testOnlyAttemptLedgerRoot
    };
  }

  async function publishAttempt(
    label: string,
    attemptLedgerFixture: Awaited<ReturnType<typeof provisionAttemptLedger>>
  ) {
    const prepared = await payloadFor(label, attemptLedgerFixture);
    const published = await publish(
      label,
      prepared.payload,
      attemptLedgerFixture.root,
      prepared.authorizationRequestFixture
    );
    return { payload: prepared.payload, published };
  }

  function readThroughTestApi(
    selectedApi: MeasuredAuthorizationApi,
    published: Readonly<{
      authorizationRequestFixture: AuthorizationRequestFixture;
      filePath: string;
      sha256: string;
      testOnlyAttemptLedgerRoot: string;
    }>
  ) {
    const readReceipt =
      selectedApi.__testingReadCaliforniaSignatureMeasuredAuthorizationReceipt;
    assert.equal(typeof readReceipt, "function",
      "the test-only reader must exercise ephemeral Ed25519 keys without changing production trust");
    const authorizationRequest = readAuthorizationRequestWithApi(
      selectedApi,
      published.authorizationRequestFixture
    );
    return readReceipt({
      allowedRoot: receiptRoot,
      authorizationRequest,
      expectedSha256: published.sha256,
      receiptPath: published.filePath,
      testOnlyAttemptLedgerRoot: published.testOnlyAttemptLedgerRoot,
      testOnlyTrustedReviewerPublicKeys: testKeys
    });
  }

  await t.test("injected-key authorization cannot cross the production verifier", async () => {
    const { payload, published } = await publishAttempt(
      "trust-separation",
      trustAttemptLedger
    );
    const loaded = readThroughTestApi(api, published);
    const productionVerify =
      api.verifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    assert.equal(typeof productionVerify, "function",
      "the production verifier must own the production launch callback");
    let productionLaunchCount = 0;
    assert.throws(() => productionVerify({
      authorization: loaded.authorization,
      launch: () => {
        productionLaunchCount += 1;
        return "FORBIDDEN_INJECTED_KEY_PRODUCTION_LAUNCH";
      },
      launchContext: launchContextFor(payload)
    }), /production|test-only|injected|trusted reviewer|provenance|authorization/i,
    "an injected-key authorization must be rejected by the production verifier");
    assert.equal(productionLaunchCount, 0,
      "an injected-key authorization reached the production launch callback");

    const testVerify =
      api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    assert.equal(typeof testVerify, "function",
      "positive ephemeral-key crypto requires a separate test-only verifier");
    const positiveLoaded = readThroughTestApi(api, published);
    let testLaunchCount = 0;
    assert.equal(testVerify({
      authorization: positiveLoaded.authorization,
      launch: () => {
        testLaunchCount += 1;
        return "TEST_ONLY_CRYPTO_ACCEPTED";
      },
      launchContext: launchContextFor(payload)
    }), "TEST_ONLY_CRYPTO_ACCEPTED");
    assert.equal(testLaunchCount, 1,
      "the isolated test verifier did not preserve positive Ed25519 coverage");
  });

  await t.test("every signed launch field must match the exact caller context", async () => {
    const { payload, published } = await publishAttempt(
      "exact-context",
      contextAttemptLedger
    );
    const testVerify =
      api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    assert.equal(typeof testVerify, "function",
      "exact-context behavior requires the isolated test-only verifier");
    const exactContext = launchContextFor(payload);
    const mismatches: ReadonlyArray<{
      context: MeasuredAuthorizationLaunchContext;
      label: string;
    }> = [
      {
        context: { ...exactContext, buildId: `${payload.buildId}-other` },
        label: "buildId"
      },
      {
        context: { ...exactContext, attemptId: `${payload.attemptId}-other` },
        label: "attemptId"
      },
      {
        context: {
          ...exactContext,
          requiredProjects: ["mobile-chrome", "desktop-chrome"]
        } as unknown as MeasuredAuthorizationLaunchContext,
        label: "requiredProjects"
      },
      {
        context: { ...exactContext, sourceSnapshotSha256: "f".repeat(64) },
        label: "sourceSnapshotSha256"
      },
      {
        context: { ...exactContext, executionPlanSha256: "e".repeat(64) },
        label: "executionPlanSha256"
      },
      {
        context: {
          ...exactContext,
          launchCommand: { ...exactContext.launchCommand, workers: 2 }
        } as unknown as MeasuredAuthorizationLaunchContext,
        label: "launchCommand.workers"
      },
      {
        context: {
          ...exactContext,
          launchCommand: { ...exactContext.launchCommand, retries: 1 }
        } as unknown as MeasuredAuthorizationLaunchContext,
        label: "launchCommand.retries"
      },
      {
        context: {
          ...exactContext,
          launchCommand: { ...exactContext.launchCommand, repeatEach: 2 }
        } as unknown as MeasuredAuthorizationLaunchContext,
        label: "launchCommand.repeatEach"
      },
      {
        context: {
          ...exactContext,
          launchCommand: { ...exactContext.launchCommand, reporter: "line" }
        } as unknown as MeasuredAuthorizationLaunchContext,
        label: "launchCommand.reporter"
      },
      {
        context: {
          ...exactContext,
          launchCommand: {
            ...exactContext.launchCommand,
            specPath: "tests/e2e/california-visualization-labs.spec.ts"
          }
        } as unknown as MeasuredAuthorizationLaunchContext,
        label: "launchCommand.specPath"
      },
      {
        context: {
          ...exactContext,
          launchCommand: {
            ...exactContext.launchCommand,
            projects: ["mobile-chrome", "desktop-chrome"]
          }
        } as unknown as MeasuredAuthorizationLaunchContext,
        label: "launchCommand.projects"
      }
    ];

    for (const mismatch of mismatches) {
      const loaded = readThroughTestApi(api, published);
      let launchCount = 0;
      assert.throws(() => testVerify({
        authorization: loaded.authorization,
        launch: () => {
          launchCount += 1;
          return `FORBIDDEN_${mismatch.label}_LAUNCH`;
        },
        launchContext: mismatch.context
      }), /attempt|build|context|execution plan|launch command|project|source snapshot|authorization/i,
      `${mismatch.label} mismatch must reject before launch`);
      assert.equal(launchCount, 0,
        `${mismatch.label} mismatch reached the launch callback`);
    }
    assert.deepEqual(await readdir(contextAttemptLedger.root), [
      ATTEMPT_LEDGER_ANCHOR_FILENAME
    ],
      "context mismatch durably consumed an authorization before exact matching");

    const exactLoaded = readThroughTestApi(api, published);
    let exactLaunchCount = 0;
    assert.equal(testVerify({
      authorization: exactLoaded.authorization,
      launch: () => {
        exactLaunchCount += 1;
        return "EXACT_CONTEXT_ACCEPTED";
      },
      launchContext: exactContext
    }), "EXACT_CONTEXT_ACCEPTED");
    assert.equal(exactLaunchCount, 1,
      "an exact signed/caller launch context did not reach the test-only callback once");
  });

  await t.test("attempt consumption is durable across reread and restart-equivalent module state", async () => {
    const { payload, published } = await publishAttempt(
      "durable-attempt",
      durableAttemptLedger
    );
    const testVerify =
      api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    assert.equal(typeof testVerify, "function",
      "durable one-attempt behavior requires the isolated test-only verifier");
    const exactContext = launchContextFor(payload);

    const retryLoaded = readThroughTestApi(api, published);
    let retryLaunchCount = 0;
    assert.throws(() => testVerify({
      authorization: retryLoaded.authorization,
      launch: () => {
        retryLaunchCount += 1;
        return "FORBIDDEN_RETRY_LAUNCH";
      },
      launchContext: {
        ...exactContext,
        launchCommand: { ...exactContext.launchCommand, retries: 1 }
      } as unknown as MeasuredAuthorizationLaunchContext
    }), /retry|retries|launch command|context|authorization/i,
    "retryAuthorized=false must reject a retry context before attempt consumption");
    assert.equal(retryLaunchCount, 0,
      "retryAuthorized=false reached the retry launch callback");
    assert.deepEqual(await readdir(durableAttemptLedger.root), [
      ATTEMPT_LEDGER_ANCHOR_FILENAME
    ],
      "a rejected retry context consumed the single authorized attempt");

    const firstLoaded = readThroughTestApi(api, published);
    let firstLaunchCount = 0;
    assert.equal(testVerify({
      authorization: firstLoaded.authorization,
      launch: () => {
        firstLaunchCount += 1;
        return "FIRST_ATTEMPT_ACCEPTED";
      },
      launchContext: exactContext
    }), "FIRST_ATTEMPT_ACCEPTED");
    assert.equal(firstLaunchCount, 1,
      "the exact first attempt did not launch once");

    const consumptionPath = consumptionPathFor(
      durableAttemptLedger.root,
      payload.attemptId
    );
    assert.deepEqual((await readdir(durableAttemptLedger.root)).sort(), [
      ATTEMPT_LEDGER_ANCHOR_FILENAME,
      path.basename(consumptionPath)
    ].sort(),
      "durable attempt consumption must publish exactly one deterministic artifact");
    const consumptionIdentity = await lstat(consumptionPath, { bigint: true });
    assert.ok(consumptionIdentity.isFile() && !consumptionIdentity.isSymbolicLink() &&
      consumptionIdentity.nlink === BigInt(1),
    "durable attempt consumption must be one regular singleton file");
    assert.equal(consumptionIdentity.uid, BigInt(process.getuid!()),
      "durable attempt consumption must be test-owned");
    assert.equal(consumptionIdentity.mode & BigInt(0o777), BigInt(0o600),
      "durable attempt consumption must be mode 0600");
    const consumptionBytes = await readFile(consumptionPath);
    const consumption = JSON.parse(consumptionBytes.toString("utf8")) as Record<string, unknown>;
    assert.equal(typeof consumption.consumedAt, "string",
      "durable attempt consumption must record one canonical timestamp");
    assert.equal(new Date(consumption.consumedAt as string).toISOString(), consumption.consumedAt,
      "durable attempt consumption timestamp must be canonical ISO");
    const expectedConsumption = {
      attemptId: payload.attemptId,
      attemptLedgerIdentitySha256: sha256(JSON.stringify(payload.attemptLedger)),
      authorizationNonceSha256: sha256(payload.authorizationNonce),
      authorizationRequestSha256: payload.authorizationRequestSha256,
      buildId: payload.buildId,
      consumedAt: consumption.consumedAt,
      executionPlanSha256: payload.executionPlanSha256,
      ledgerId: payload.attemptLedger.ledgerId,
      maxInvocations: 1,
      receiptSha256: published.sha256,
      retryAuthorized: false,
      schema: CONSUMPTION_SCHEMA,
      sourceSnapshotSha256: payload.sourceSnapshotSha256,
      status: "CONSUMED_BEFORE_LAUNCH"
    } as const;
    assert.deepEqual(consumption, expectedConsumption,
      "durable attempt consumption exact identity/schema drifted");
    assert.deepEqual(consumptionBytes,
      Buffer.from(`${JSON.stringify(expectedConsumption)}\n`, "utf8"),
    "durable attempt consumption bytes must be canonical and LF-terminated");

    const rereadLoaded = readThroughTestApi(api, published);
    let rereadLaunchCount = 0;
    assert.throws(() => testVerify({
      authorization: rereadLoaded.authorization,
      launch: () => {
        rereadLaunchCount += 1;
        return "FORBIDDEN_REREAD_LAUNCH";
      },
      launchContext: exactContext
    }), /already|consum|EEXIST|one-shot|attempt|nonce/i,
    "rereading the same signed receipt must not mint a second usable attempt");
    assert.equal(rereadLaunchCount, 0,
      "a reread/new branded object reached a second launch");

    const freshModuleUrl = new URL(
      "./california-signature-exhaustive-artifact-lifecycle.ts",
      import.meta.url
    );
    freshModuleUrl.searchParams.set("restartEquivalent", payload.attemptId);
    const restartEquivalentApi = await import(freshModuleUrl.href) as MeasuredAuthorizationApi;
    const restartLoaded = readThroughTestApi(restartEquivalentApi, published);
    const restartVerify =
      restartEquivalentApi.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    assert.equal(typeof restartVerify, "function",
      "restart-equivalent module must expose the isolated test verifier");
    let restartLaunchCount = 0;
    assert.throws(() => restartVerify({
      authorization: restartLoaded.authorization,
      launch: () => {
        restartLaunchCount += 1;
        return "FORBIDDEN_RESTART_EQUIVALENT_LAUNCH";
      },
      launchContext: exactContext
    }), /already|consum|EEXIST|one-shot|attempt|nonce/i,
    "fresh module state must reject an already consumed signed attempt");
    assert.equal(restartLaunchCount, 0,
      "restart-equivalent fresh module state reached a second launch");

    const finalIdentity = await lstat(consumptionPath, { bigint: true });
    for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"] as const) {
      assert.equal(finalIdentity[key], consumptionIdentity[key],
        `durable O_EXCL attempt consumption ${key} changed after rejected replays`);
    }
    assert.deepEqual(await readFile(consumptionPath), consumptionBytes,
      "rejected replays overwrote the append-only attempt-consumption evidence");
    assert.deepEqual((await readdir(durableAttemptLedger.root)).sort(), [
      ATTEMPT_LEDGER_ANCHOR_FILENAME,
      path.basename(consumptionPath)
    ].sort(),
      "rejected replays added broad or duplicate attempt-consumption evidence");

    const {
      payload: occupiedPayload,
      published: occupiedPublished
    } = await publishAttempt(
      "occupied-attempt",
      occupiedAttemptLedger
    );
    const occupiedPath = consumptionPathFor(
      occupiedAttemptLedger.root,
      occupiedPayload.attemptId
    );
    const occupiedSentinel = Buffer.from("preexisting-attempt-consumption-must-not-change\n", "utf8");
    await publishDurableExclusiveFile(occupiedPath, occupiedSentinel);
    const occupiedLoaded = readThroughTestApi(api, occupiedPublished);
    let occupiedLaunchCount = 0;
    assert.throws(() => testVerify({
      authorization: occupiedLoaded.authorization,
      launch: () => {
        occupiedLaunchCount += 1;
        return "FORBIDDEN_PREOCCUPIED_ATTEMPT_LAUNCH";
      },
      launchContext: launchContextFor(occupiedPayload)
    }), /already|consum|EEXIST|O_EXCL|attempt|poison/i,
    "a preoccupied attempt path must fail closed instead of overwriting evidence");
    assert.equal(occupiedLaunchCount, 0,
      "a preoccupied attempt-consumption path reached launch");
    assert.deepEqual(await readFile(occupiedPath), occupiedSentinel,
      "attempt consumption did not preserve an O_EXCL preexisting artifact");
  });

  await t.test("callback failure retains the already durable one-attempt marker", async () => {
    const { payload, published } = await publishAttempt(
      "callback-throw",
      callbackThrowAttemptLedger
    );
    const loaded = readThroughTestApi(api, published);
    const testVerify =
      api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    assert.equal(typeof testVerify, "function",
      "callback-throw durability requires the isolated test-only verifier");
    const exactContext = launchContextFor(payload);
    const markerPath = consumptionPathFor(
      callbackThrowAttemptLedger.root,
      payload.attemptId
    );
    const callbackError = new Error("CALLBACK_THROW_AFTER_DURABLE_ATTEMPT_CONSUMPTION");
    let callbackCount = 0;
    let markerBytesAtCallback: Buffer | null = null;
    let markerIdentityAtCallback: Readonly<{
      ctimeNs: bigint;
      dev: bigint;
      ino: bigint;
      mtimeNs: bigint;
      nlink: bigint;
      size: bigint;
    }> | null = null;

    assert.throws(() => testVerify({
      authorization: loaded.authorization,
      launch: () => {
        callbackCount += 1;
        const identity = lstatSync(markerPath, { bigint: true });
        assert.ok(identity.isFile() && !identity.isSymbolicLink() &&
          identity.nlink === BigInt(1),
        "attempt marker must be a regular singleton before callback entry");
        assert.equal(identity.uid, BigInt(process.getuid!()),
          "attempt marker must be test-owned before callback entry");
        assert.equal(identity.mode & BigInt(0o777), BigInt(0o600),
          "attempt marker must be mode 0600 before callback entry");
        markerBytesAtCallback = readFileSync(markerPath);
        const marker = JSON.parse(markerBytesAtCallback.toString("utf8")) as
          Record<string, unknown>;
        assert.equal(typeof marker.consumedAt, "string",
          "callback-entry marker must contain one consumption timestamp");
        assert.equal(new Date(marker.consumedAt as string).toISOString(), marker.consumedAt,
          "callback-entry marker consumption timestamp must be canonical ISO");
        const expectedMarker = {
          attemptId: payload.attemptId,
          attemptLedgerIdentitySha256: sha256(JSON.stringify(payload.attemptLedger)),
          authorizationNonceSha256: sha256(payload.authorizationNonce),
          authorizationRequestSha256: payload.authorizationRequestSha256,
          buildId: payload.buildId,
          consumedAt: marker.consumedAt,
          executionPlanSha256: payload.executionPlanSha256,
          ledgerId: payload.attemptLedger.ledgerId,
          maxInvocations: 1,
          receiptSha256: published.sha256,
          retryAuthorized: false,
          schema: CONSUMPTION_SCHEMA,
          sourceSnapshotSha256: payload.sourceSnapshotSha256,
          status: "CONSUMED_BEFORE_LAUNCH"
        } as const;
        assert.deepEqual(marker, expectedMarker,
          "attempt marker must be exact before callback entry");
        assert.deepEqual(markerBytesAtCallback,
          Buffer.from(`${JSON.stringify(expectedMarker)}\n`, "utf8"),
        "attempt marker must be canonical and LF-terminated before callback entry");
        markerIdentityAtCallback = {
          ctimeNs: identity.ctimeNs,
          dev: identity.dev,
          ino: identity.ino,
          mtimeNs: identity.mtimeNs,
          nlink: identity.nlink,
          size: identity.size
        };
        throw callbackError;
      },
      launchContext: exactContext
    }), (error) => error === callbackError,
    "the verifier must preserve the exact callback exception");
    assert.equal(callbackCount, 1,
      "callback-throw contract did not enter the launch callback exactly once");
    assert.ok(markerBytesAtCallback,
      "callback entered before the durable attempt marker could be read");
    assert.ok(markerIdentityAtCallback,
      "callback entered before the durable attempt marker identity was bound");

    const rereadLoaded = readThroughTestApi(api, published);
    let rereadLaunchCount = 0;
    assert.throws(() => testVerify({
      authorization: rereadLoaded.authorization,
      launch: () => {
        rereadLaunchCount += 1;
        return "FORBIDDEN_CALLBACK_THROW_REREAD_LAUNCH";
      },
      launchContext: exactContext
    }), /already|consum|EEXIST|one-shot|attempt|nonce/i,
    "callback failure must not make the signed attempt reusable after reread");
    assert.equal(rereadLaunchCount, 0,
      "callback failure allowed a reread authorization to launch");

    const freshModuleUrl = new URL(
      "./california-signature-exhaustive-artifact-lifecycle.ts",
      import.meta.url
    );
    freshModuleUrl.searchParams.set("callbackThrowRestartEquivalent", payload.attemptId);
    const restartEquivalentApi = await import(freshModuleUrl.href) as MeasuredAuthorizationApi;
    const restartLoaded = readThroughTestApi(restartEquivalentApi, published);
    const restartVerify =
      restartEquivalentApi.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    assert.equal(typeof restartVerify, "function",
      "callback-throw restart-equivalent module must expose the test verifier");
    let restartLaunchCount = 0;
    assert.throws(() => restartVerify({
      authorization: restartLoaded.authorization,
      launch: () => {
        restartLaunchCount += 1;
        return "FORBIDDEN_CALLBACK_THROW_RESTART_LAUNCH";
      },
      launchContext: exactContext
    }), /already|consum|EEXIST|one-shot|attempt|nonce/i,
    "fresh module state must retain callback-throw attempt consumption");
    assert.equal(restartLaunchCount, 0,
      "callback failure allowed restart-equivalent state to launch");

    const finalIdentity = await lstat(markerPath, { bigint: true });
    for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"] as const) {
      assert.equal(finalIdentity[key], markerIdentityAtCallback[key],
        `callback failure/replay changed attempt marker ${key}`);
    }
    assert.deepEqual(await readFile(markerPath), markerBytesAtCallback,
      "callback failure/replay changed the append-only attempt marker bytes");
    assert.deepEqual((await readdir(callbackThrowAttemptLedger.root)).sort(), [
      ATTEMPT_LEDGER_ANCHOR_FILENAME,
      path.basename(markerPath)
    ].sort(),
      "callback failure/replay added or removed attempt markers");
  });

  await t.test("semantic durability observer proves the security boundary order", async () => {
    const { payload, published } = await publishAttempt(
      "durability-observer",
      observerAttemptLedger
    );
    const exactContext = launchContextFor(payload);
    const productionVerify =
      api.verifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    assert.equal(typeof productionVerify, "function",
      "production verifier must exist before observer option isolation can be checked");
    let productionLaunchCount = 0;
    let productionObserverCount = 0;
    assert.throws(() => productionVerify({
      authorization: {},
      launch: () => {
        productionLaunchCount += 1;
        return "FORBIDDEN_PRODUCTION_OBSERVER_LAUNCH";
      },
      launchContext: exactContext,
      testOnlyDurabilityObserver: () => {
        productionObserverCount += 1;
      }
    } as TestingMeasuredAuthorizationLaunchOptions<string>),
    /exact schema|observer|test-only.*option|unknown.*key/i,
    "production verifier must reject the test-only durability observer option");
    assert.equal(productionLaunchCount, 0,
      "production verifier reached launch with a test-only observer option");
    assert.equal(productionObserverCount, 0,
      "production verifier invoked a test-only durability observer");

    const loaded = readThroughTestApi(api, published);
    const testVerify =
      api.__testingVerifyCaliforniaSignatureMeasuredAuthorizationForLaunch;
    assert.equal(typeof testVerify, "function",
      "semantic durability observation requires the isolated test-only verifier");
    const events: TestOnlyDurabilityEvent[] = [];
    const sourceOrder: string[] = [];
    let launchCount = 0;
    assert.equal(testVerify({
      authorization: loaded.authorization,
      launch: () => {
        launchCount += 1;
        sourceOrder.push("CALLBACK");
        return "SEMANTIC_DURABILITY_ORDER_ACCEPTED";
      },
      launchContext: exactContext,
      testOnlyDurabilityObserver: (event) => {
        events.push(structuredClone(event));
        sourceOrder.push(event.kind);
      }
    }), "SEMANTIC_DURABILITY_ORDER_ACCEPTED");
    assert.equal(launchCount, 1,
      "semantic durability observer contract did not launch exactly once");
    assert.deepEqual(sourceOrder, [
      "ROOT_FD_BOUND",
      "MARKER_CREATED_EXCLUSIVE_AT_ROOT_FD",
      "MARKER_WRITTEN",
      "MARKER_FILE_FSYNCED",
      "MARKER_SAME_FD_READBACK_VERIFIED",
      "MARKER_ROOT_FSYNCED",
      "CALLBACK"
    ], "attempt marker security boundaries occurred out of order");

    function eventOf<Kind extends TestOnlyDurabilityEvent["kind"]>(kind: Kind) {
      const event = events.find((candidate) => candidate.kind === kind);
      assert.ok(event, `semantic durability observer omitted ${kind}`);
      return event as Extract<TestOnlyDurabilityEvent, { kind: Kind }>;
    }

    const rootBound = eventOf("ROOT_FD_BOUND");
    const created = eventOf("MARKER_CREATED_EXCLUSIVE_AT_ROOT_FD");
    const written = eventOf("MARKER_WRITTEN");
    const fileSynced = eventOf("MARKER_FILE_FSYNCED");
    const readback = eventOf("MARKER_SAME_FD_READBACK_VERIFIED");
    const rootSynced = eventOf("MARKER_ROOT_FSYNCED");
    assert.ok(rootBound.rootFdIdentity,
      "root FD observer identity must be nonempty and opaque");
    assert.ok(created.fileFdIdentity,
      "file FD observer identity must be nonempty and opaque");
    assert.notEqual(created.fileFdIdentity, rootBound.rootFdIdentity,
      "root and file FD observer identities must be distinct");
    assert.equal(created.rootFdIdentity, rootBound.rootFdIdentity,
      "exclusive marker creation did not use the bound root FD");
    assert.equal(rootSynced.rootFdIdentity, rootBound.rootFdIdentity,
      "root fsync did not use the bound root FD");
    assert.equal(written.fileFdIdentity, created.fileFdIdentity,
      "marker write changed file FD identity");
    assert.equal(fileSynced.fileFdIdentity, created.fileFdIdentity,
      "marker fsync changed file FD identity");
    assert.equal(readback.fileFdIdentity, created.fileFdIdentity,
      "marker readback was not performed through the written file FD");
    assert.equal(created.mode, 0o600,
      "descriptor-relative marker creation mode must be exactly 0600");
    assert.equal(path.isAbsolute(created.relativeName), false,
      "descriptor-relative marker creation received an absolute pathname");
    assert.equal(created.relativeName.includes(path.sep), false,
      "descriptor-relative marker creation basename contains a separator");
    assert.equal(created.relativeName.includes(".."), false,
      "descriptor-relative marker creation basename contains traversal");
    assert.equal(created.relativeName,
      `${sha256(payload.attemptId)}${CONSUMPTION_SUFFIX}`,
    "descriptor-relative marker creation basename drifted");

    const markerPath = path.join(observerAttemptLedger.root, created.relativeName);
    const markerBytes = await readFile(markerPath);
    assert.equal(written.sha256, sha256(markerBytes),
      "observer marker-write digest differs from durable marker bytes");
    assert.equal(readback.sha256, written.sha256,
      "same-FD readback digest differs from the written marker digest");
  });
});
