import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  fsyncSync,
  mkdtempSync,
  openSync,
  writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import {
  assertExactAuditLabSourceBindings,
  EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256,
  EXPECTED_AUDIT_LAB_SOURCE_SHA256,
} from "./signature-lab-source-bindings.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const runnerPath = path.join(here, "run-signature-lab-tests.mjs");
const retainedEvidenceModulePath = path.join(
  here,
  "signature-lab-retained-evidence.mjs",
);
const sourceBindingsModulePath = path.join(here, "signature-lab-source-bindings.mjs");
const executionCapsuleModulePath = path.join(
  here,
  "signature-lab-execution-capsule.mjs",
);
const unboundFileSystemAuditPath = path.join(
  here,
  "fixtures/signature-lab-unbound-fs-audit.mjs",
);

const SAFE_CHILD_ENV_KEYS = Object.freeze([
  "FORCE_COLOR",
  "LANG",
  "LC_ALL",
  "NODE_DISABLE_COMPILE_CACHE",
  "NO_COLOR",
  "PATH",
  "TMPDIR",
]);
const EXPECTED_ASSIGNMENT_GATE_NAMES = Object.freeze([
  "assignment-live-graph-initial",
  "assignment-snapshot-graph",
  "assignment-snapshot-typecheck",
  "assignment-snapshot-tap",
  "assignment-live-graph-final",
]);
const EXPECTED_ASSIGNMENT_GATE_NAMES_SHA256 =
  "60ce236df8594f0a195f7a58427d63ad5a841ef3f972d992309d4e6f32236011";
const EXPECTED_GATE_PLAN_NAMES_SHA256 =
  "ff3c9132d31462ae501e44620f157bc03c5726ef6b019e7f8a5569f155aa8c36";
const EXPECTED_ASSIGNMENT_SOURCE_GRAPH_NAMES_SHA256 =
  "360aaa2c530f138ba81938c14f3b2a7d6849687c5332c04c9e3d4b88a9508990";
const EXPECTED_ASSIGNMENT_SOURCE_GRAPH_SHA256 =
  "1f70939a6c6ff9fe3e5031a5db3c3ff6bae6dcb758b5277c3d80e61fec6e5819";
const EXPECTED_PROJECT_TSCONFIG_SHA256 =
  "463a2abe6c2c803606ddf13aa6cb7d2f68cab049052ed876e5ffb77f5f4d96a8";
const EXPECTED_PLANNED_GATE_RECORD_KEYS = Object.freeze([
  "argv",
  "cwd",
  "environmentBinding",
  "gateId",
  "kind",
  "name",
  "ordinal",
  "schemaVersion",
  "sourceBinding",
  "status",
  "toolBinding",
]);
const EXPECTED_GATE_RESULT_RECORD_KEYS = Object.freeze([
  "exitCode",
  "gateId",
  "result",
  "schemaVersion",
  "signal",
  "status",
  "stderr",
  "stdout",
]);
const EXPECTED_GATE_ARTIFACT_RECORD_KEYS = Object.freeze([
  "byteLength",
  "relativePath",
  "sha256",
]);
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeExclusivePrivateFile(target, bytes) {
  const descriptor = openSync(
    target,
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL |
      fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function overwriteSameLength(target, replacement) {
  const descriptor = openSync(
    target,
    fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const before = fstatSync(descriptor, { bigint: true });
    assert.equal(before.size, BigInt(replacement.length));
    writeFileSync(descriptor, replacement);
    fsyncSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    for (const field of ["dev", "ino", "uid", "gid", "mode", "nlink", "size"]) {
      assert.equal(after[field], before[field], `${target}: stable ${field} drifted`);
    }
  } finally {
    closeSync(descriptor);
  }
}

function boundAuditEnvironment(tmpdir) {
  return Object.freeze({
    FORCE_COLOR: "0",
    LANG: "C",
    LC_ALL: "C",
    NODE_DISABLE_COMPILE_CACHE: "1",
    NO_COLOR: "1",
    PATH: "/usr/local/bin:/usr/bin:/bin",
    TMPDIR: tmpdir,
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function findMatchingDelimiter(source, openingIndex, opening, closing) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openingIndex; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === opening) {
      depth += 1;
    } else if (character === closing) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  assert.fail(`unclosed ${opening}${closing} delimiter at source offset ${openingIndex}`);
}

function findSemanticAuditLoop(source) {
  const loopPattern = /\bfor\s*\(/gu;
  for (const match of source.matchAll(loopPattern)) {
    const openParenthesis = source.indexOf("(", match.index);
    const closeParenthesis = findMatchingDelimiter(
      source,
      openParenthesis,
      "(",
      ")",
    );
    const header = source.slice(openParenthesis + 1, closeParenthesis);
    if (!/\bconst\b[\s\S]*\bof\b/u.test(header)) continue;

    let openBrace = closeParenthesis + 1;
    while (/\s/u.test(source[openBrace])) openBrace += 1;
    if (source[openBrace] !== "{") continue;
    const closeBrace = findMatchingDelimiter(source, openBrace, "{", "}");
    const body = source.slice(openBrace + 1, closeBrace);
    const semanticText = `${header}\n${body}`;
    const isAuditIteration = /\baudit(?:File|Gate|Plan|Record|Entry|Name)?s?\b/iu.test(
      semanticText,
    );
    const executesGate = /\b(?:execute[A-Za-z0-9_$]*Gate|record[A-Za-z0-9_$]*Result|runCaptured|runInherited|run[A-Za-z0-9_$]*Audit)\s*\(/u.test(
      body,
    );
    if (isAuditIteration && executesGate) {
      return {
        body,
        end: closeBrace + 1,
        header,
        start: match.index,
      };
    }
  }
  assert.fail("unable to locate a semantic audit-execution loop");
}

function findObjectCalls(source, functionName) {
  const pattern = new RegExp(`\\b${escapeRegExp(functionName)}\\s*\\(`, "gu");
  const calls = [];
  for (const match of source.matchAll(pattern)) {
    const openParenthesis = source.indexOf("(", match.index);
    let openBrace = openParenthesis + 1;
    while (/\s/u.test(source[openBrace])) openBrace += 1;
    if (source[openBrace] !== "{") continue;
    const closeBrace = findMatchingDelimiter(source, openBrace, "{", "}");
    calls.push({
      body: source.slice(openBrace + 1, closeBrace),
      end: closeBrace + 1,
      start: match.index,
    });
  }
  return calls;
}

function extractExactFrozenStringArray(source, constantName) {
  const pattern = new RegExp(
    `\\bconst\\s+${escapeRegExp(constantName)}\\s*=\\s*Object\\.freeze\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)\\s*;?`,
    "u",
  );
  const match = pattern.exec(source);
  assert.ok(match, `${constantName} must be one explicit frozen string array`);
  const values = [...match[1].matchAll(/["']([^"']+)["']/gu)]
    .map((entry) => entry[1]);
  const residue = match[1]
    .replace(/["'][^"']+["']\s*,?/gu, "")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/[^\n]*/gu, "")
    .trim();
  assert.equal(residue, "", `${constantName} may contain only literal strings`);
  return values;
}

function assertExactFrozenStringArray(source, constantName, expected) {
  assert.deepEqual(
    extractExactFrozenStringArray(source, constantName),
    [...expected],
    `${constantName} exact ordered schema drifted`,
  );
}

function assertModuleExport(moduleSource, exportName) {
  const direct = new RegExp(
    `\\bexport\\s+(?:async\\s+)?(?:function|const|let|class)\\s+${escapeRegExp(exportName)}\\b`,
    "u",
  );
  const listed = new RegExp(
    `\\bexport\\s*\\{[\\s\\S]*?\\b${escapeRegExp(exportName)}\\b[\\s\\S]*?\\}`,
    "u",
  );
  assert.ok(
    direct.test(moduleSource) || listed.test(moduleSource),
    `${exportName} must be an explicit retained-evidence module export`,
  );
}

test("signature lab gate pins inventories, snapshots sources, and retains sealed evidence", async () => {
  const source = await readFile(runnerPath, "utf8");

  assert.match(source, /EXPECTED_AUDIT_COUNT\s*=\s*192/u,
    "the gate must fail closed if the reviewed 192-audit inventory shrinks");
  assert.match(source, /EXPECTED_LAB_COUNT\s*=\s*192/u,
    "the gate must fail closed if the reviewed 192-lab inventory shrinks");
  assert.match(source, /9d64f8a3c7812487bb7a99c4f454bb571ce5b4e53143542447800550217f06d7/u,
    "the sorted audit filename manifest must be pinned");
  assert.match(source, /6c5698f86ae211364fac40271b20183f00ef8cc44be0ce2d13e058cecf6568fb/u,
    "the sorted lab filename manifest must be pinned");
  assert.match(source, /EXPECTED_CONTRACT_TEST_NAMES/u,
    "the six reviewed assignment test names must be pinned");
  assert.match(source, /validateTap\s*\(/u,
    "the descriptor-bound child test output must be machine checked as TAP");
  assert.match(
    source,
    /signature-lab-assignment-execution-capsule\.mjs/u,
    "assignment execution must use the reviewed descriptor-only capsule",
  );
  assert.match(source, /SAFE_CHILD_ENV_KEYS/u,
    "children must receive only the reviewed environment allowlist");
  assert.doesNotMatch(source, /\bNODE_COMPILE_CACHE\b/u,
    "the gate must never inherit or retain a caller-selected compile-cache path");
  assert.match(source, /NODE_DISABLE_COMPILE_CACHE\s*=\s*["']1["']/u,
    "children must not create an unreviewed compile-cache subtree");
  assert.match(source, /contractSnapshot/u,
    "the type-check and runtime must consume a private source snapshot");
  assert.match(source, /assertSourceRecordUnchanged/u,
    "live sources must be revalidated after execution");

  assert.match(source,
    /from\s+["'][^"']*signature-lab-retained-evidence\.mjs["']/u,
    "the gate must use the reviewed retained-evidence capability");
  assert.match(source, /sealRetainedSignatureLabEvidence/u);
  assert.match(source, /revalidateRetainedSignatureLabEvidence/u);
  assert.match(source, /PASS_RETAINED_SEALED_ARCHIVE/u);
  assert.match(source, /FAIL_RETAINED_SEALED_ARCHIVE/u);
  assert.match(source, /FAIL_RETAINED_UNSEALED/u);
  assert.match(source, /retainedArchiveCount\s*:\s*1/u,
    "success must report the physically retained archive");
  assert.match(source, /destructiveCleanupAttempted\s*:\s*false/u,
    "the gate must report that no destructive action was attempted");

  assert.doesNotMatch(source, /signature-lab-exact-remove/u);
  assert.doesNotMatch(source, /clang|codesign|CoreServices/u);
  assert.doesNotMatch(source, /\b(?:rm(?:Sync)?|unlink(?:Sync)?|rmdir(?:Sync)?)\b/u,
    "the retained-evidence gate must not contain a destructive pathname API");
});

test(
  "P1 retained evidence review: STARTED_UNSEALED is durable before work",
  async () => {
    const [source, moduleSource] = await Promise.all([
      readFile(runnerPath, "utf8"),
      readFile(retainedEvidenceModulePath, "utf8"),
    ]);

    for (const capability of [
      "createRetainedSignatureLabRun",
      "createRetainedSignatureLabDirectory",
      "writeRetainedSignatureLabFile",
      "inspectRetainedSignatureLabRun",
      "closeRetainedSignatureLabRun",
    ]) {
      assert.match(source, new RegExp(`\\b${capability}\\b`, "u"));
      assertModuleExport(moduleSource, capability);
    }
    assert.doesNotMatch(
      source,
      /\b(?:mkdtempSync|mkdirSync|writeFileSync)\s*\(/u,
      "runner archive construction must use only its opaque retained-run capability",
    );

    const auditLoop = findSemanticAuditLoop(source);
    const createCalls = findObjectCalls(source, "createRetainedSignatureLabRun");
    assert.equal(createCalls.length, 1, "runner must create exactly one retained run");
    const [createCall] = createCalls;
    assert.ok(
      createCall.start < auditLoop.start,
      "physical retained-run creation must precede the semantic audit loop",
    );
    assert.match(
      createCall.body,
      /\bstate\s*:\s*["']STARTED_UNSEALED["']/u,
      "createRetainedSignatureLabRun must durably publish STARTED_UNSEALED",
    );

    assertExactFrozenStringArray(source, "SAFE_CHILD_ENV_KEYS", SAFE_CHILD_ENV_KEYS);
    assert.match(
      source,
      /\b(?:build|create)SafeChildEnvironment\s*\(/u,
      "children must receive an explicitly constructed safe environment",
    );
    assert.doesNotMatch(
      source,
      /\.\.\.\s*process\.env\b/u,
      "the runner must never spread raw process.env into a child or evidence record",
    );
    assert.doesNotMatch(
      source,
      /\bprocess\.env\b/u,
      "no inherited environment values or hashes may enter permanent retained evidence",
    );
    assert.match(
      source,
      /\benvironmentBinding\b/u,
      "planned records must retain only the reviewed safe environment binding",
    );

    assert.match(moduleSource, /O_NOFOLLOW/u);
    assert.match(moduleSource, /dir_fd|openat|mkdirat/u);
    assert.match(moduleSource, /fsync(?:Sync)?\s*\(/u,
      "retained file publication must be durably fsynced");
    assert.match(
      moduleSource,
      /(?:\b(?:fsync|synchronize)[A-Za-z0-9_$]*Retained[A-Za-z0-9_$]*(?:BottomUp|DeepestFirst)\b|\bretained_[a-z0-9_]*fsync_[a-z0-9_]*deepest_first\b)/iu,
      "module must expose a semantically named bottom-up retained-directory barrier",
    );

    const sealCalls = findObjectCalls(source, "sealRetainedSignatureLabEvidence");
    const opaqueSeal = sealCalls.find((call) =>
      /\brun\s*:\s*retainedRun\b/u.test(call.body));
    assert.ok(opaqueSeal, "production sealing must use { run: retainedRun, ... }");
    assert.ok(opaqueSeal.start > createCall.start,
      "opaque-token sealing must follow retained-run creation");
    assert.doesNotMatch(
      opaqueSeal.body,
      /\b(?:archiveRoot|evidenceRoot|expectedEntries|expectedRootIdentity)\s*:/u,
      "opaque-token sealing must not reconstruct caller-authorized path inventory",
    );

    const revalidationCalls = findObjectCalls(
      source,
      "revalidateRetainedSignatureLabEvidence",
    );
    assert.ok(
      revalidationCalls.some((call) =>
        /\bexternalReceipt\s*:\s*[A-Za-z_$][\w$]*\.externalReceipt\b/u.test(
          call.body,
        )),
      "production revalidation must receive the seal result externalReceipt",
    );

    assert.match(
      source,
      /\bfinally\s*\{[\s\S]{0,2400}?\bcloseRetainedSignatureLabRun\s*\(\s*retainedRun\s*\)/u,
      "runner must close its opaque run handle in a finally path without deleting bytes",
    );
  },
);

test(
  "P1 retained evidence review: immutable audit and Lab snapshots use one retained batch",
  async () => {
    const [source, moduleSource] = await Promise.all([
      readFile(runnerPath, "utf8"),
      readFile(retainedEvidenceModulePath, "utf8"),
    ]);
    assertModuleExport(moduleSource, "writeRetainedSignatureLabBatch");
    assert.match(
      source,
      /\bwriteRetainedSignatureLabBatch\b[\s\S]*from\s+["'][^"']*signature-lab-retained-evidence\.mjs["']/u,
      "runner must import the immutable retained-batch capability",
    );
    const snapshotStart = source.indexOf("const auditSnapshot =");
    const snapshotEnd = source.indexOf("\n  const graphEnvironment", snapshotStart);
    assert.ok(snapshotStart >= 0 && snapshotEnd > snapshotStart);
    const snapshotSource = source.slice(snapshotStart, snapshotEnd);
    assert.equal(
      [...snapshotSource.matchAll(/writeRetainedSignatureLabBatch\s*\(/gu)].length,
      1,
      "all 384 immutable audit/Lab files must use one batch request",
    );
    assert.doesNotMatch(
      snapshotSource,
      /\b(?:copySourceRecord|writeRetainedSignatureLabFile)\s*\(/u,
      "immutable audit/Lab snapshots must not use one worker request per file",
    );
    assert.match(snapshotSource, /compareUnicodeOrdinal/u,
      "batch paths must be explicitly sorted with the worker's ordinal comparator");
    assert.match(source, /EXPECTED_IMMUTABLE_SOURCE_COUNT\s*=\s*384\b/u);
    assert.match(source, /EXPECTED_IMMUTABLE_SOURCE_BYTES\s*=\s*12_088_176\b/u);
    assert.match(source, /EXPECTED_IMMUTABLE_SOURCE_MAX_BYTES\s*=\s*84_282\b/u);
    assert.match(
      snapshotSource,
      /batch\.entryCount[\s\S]*EXPECTED_IMMUTABLE_SOURCE_COUNT/u,
      "runner must bind the returned batch count",
    );
    assert.match(
      snapshotSource,
      /batch\.totalByteLength[\s\S]*EXPECTED_IMMUTABLE_SOURCE_BYTES/u,
      "runner must bind the returned batch byte total",
    );
    assert.match(
      snapshotSource,
      /retainedDirectoryPaths\.add\s*\(/u,
      "runner directory cache must adopt every descriptor-bound batch directory",
    );
  },
);

test(
  "P1 retained evidence review: planned audit ledger records every gate and binding",
  async () => {
    const source = await readFile(runnerPath, "utf8");
    const auditLoop = findSemanticAuditLoop(source);

    for (const status of ["PASS", "FAIL", "NOT_RUN"]) {
      assert.match(source, new RegExp(`["']${status}["']`, "u"));
    }
    const notRun = source.indexOf('"NOT_RUN"') >= 0
      ? source.indexOf('"NOT_RUN"')
      : source.indexOf("'NOT_RUN'");
    assert.ok(
      notRun >= 0 && notRun < auditLoop.start,
      "every planned audit must start as NOT_RUN before any audit executes",
    );

    assertExactFrozenStringArray(
      source,
      "EXPECTED_ASSIGNMENT_GATE_NAMES",
      EXPECTED_ASSIGNMENT_GATE_NAMES,
    );
    assert.match(
      source,
      new RegExp(EXPECTED_ASSIGNMENT_GATE_NAMES_SHA256, "u"),
      "five-assignment-gate canonical name hash is not pinned",
    );
    assert.match(
      source,
      new RegExp(EXPECTED_GATE_PLAN_NAMES_SHA256, "u"),
      "the exact ordered 192-audit plus five-assignment plan hash is not pinned",
    );
    assert.match(source, /\bEXPECTED_ASSIGNMENT_GATE_COUNT\s*=\s*5\b/u);
    assert.match(source, /\bEXPECTED_GATE_PLAN_COUNT\s*=\s*197\b/u,
      "the immutable plan must contain exactly 192 audits plus five assignment gates");
    assertExactFrozenStringArray(
      source,
      "EXPECTED_PLANNED_GATE_RECORD_KEYS",
      EXPECTED_PLANNED_GATE_RECORD_KEYS,
    );
    assertExactFrozenStringArray(
      source,
      "EXPECTED_GATE_RESULT_RECORD_KEYS",
      EXPECTED_GATE_RESULT_RECORD_KEYS,
    );
    assertExactFrozenStringArray(
      source,
      "EXPECTED_GATE_ARTIFACT_RECORD_KEYS",
      EXPECTED_GATE_ARTIFACT_RECORD_KEYS,
    );
    assert.match(source, /ca\.signature-lab\.planned-gate\.v1/u);
    assert.match(source, /ca\.signature-lab\.gate-result\.v1/u);

    const planMatch = /\bconst\s+(plannedGateRecords|gatePlan)\s*=\s*deepFreeze\s*\(/u.exec(
      source,
    );
    assert.ok(planMatch, "the complete 197-gate plan must be deeply immutable");
    assert.ok(
      planMatch.index < auditLoop.start,
      "the exact immutable plan must exist before the first audit executes",
    );
    const planName = planMatch[1];
    assert.doesNotMatch(
      source,
      new RegExp(`\\b${escapeRegExp(planName)}\\s*\\.\\s*(?:push|pop|shift|unshift|splice|sort|reverse)\\s*\\(`, "u"),
      "the immutable gate plan must never be structurally mutated",
    );
    assert.match(
      source,
      /\bassertExactPlannedGateInventory\s*\([\s\S]{0,1200}?\bEXPECTED_GATE_PLAN_COUNT\b/u,
      "runner must verify exact plan count before execution",
    );
    assert.match(
      source,
      /\bassertExactPlannedGateInventory\b[\s\S]{0,5000}?\bnew Set\s*\([\s\S]{0,1200}?\bgateId\b/iu,
      "runner must reject duplicate planned gate ids",
    );
    assert.match(
      source,
      /\bassertExactPlannedGateInventory\b[\s\S]{0,6000}?\bnew Set\s*\([\s\S]{0,1200}?\bname\b/iu,
      "runner must reject duplicate planned gate names",
    );
    assert.match(
      source,
      /\bassertExactPlannedGateInventory\b[\s\S]{0,6000}?\bsha256\s*\([\s\S]{0,1200}?\b(?:gateId|name)\b/iu,
      "runner must verify the canonical unique plan-name hash",
    );

    assert.match(source, /\bgateResultRecords\b/u,
      "attempted gates must produce separate immutable result records");
    assert.match(
      source,
      /\bassertExactGateResultRecords\s*\(/u,
      "runner must prove result ids are unique and belong to the immutable plan",
    );
    assert.match(
      source,
      /\bassertExactGateResultRecords\b[\s\S]{0,5000}?\bnew Set\s*\([\s\S]{0,1200}?\bgateId\b/iu,
      "runner must reject duplicate gate result ids",
    );
    assert.match(
      source,
      /\bassertExactGateResultRecords\b[\s\S]{0,6000}?\b(?:plannedGateIds|plannedGateById|plannedGateRecords|gatePlan)\b/iu,
      "every result id must bind to one member of the immutable plan",
    );
    assert.match(
      source,
      /\bgateResultRecords\s*\.\s*push\s*\(\s*deepFreeze\s*\(/u,
      "each appended gate result record must be deeply immutable",
    );
    for (const artifact of ["stdout", "stderr", "result"]) {
      assert.match(
        source,
        new RegExp(`\\b${artifact}\\b[\\s\\S]{0,500}?\\b(?:relativePath|byteLength|sha256)\\b`, "iu"),
        `${artifact} must be retained as a digest-bound immutable artifact record`,
      );
    }
    assert.match(source, /\bcanonical(?:ize|JsonBytes|GateRecord)\b/u,
      "plan and result records must use one canonical serialization contract");
    assert.match(
      source,
      /\bappendRetainedSignatureLabExecutionJournal\s*\([\s\S]{0,3000}?\beventType\s*:\s*["']RESULT["'][\s\S]{0,3000}?\bstdout\s*:[\s\S]{0,1000}?\bstderr\s*:[\s\S]{0,1000}?\bresult\s*:/iu,
      "gate execution artifacts must use one durable RESULT journal transaction",
    );

    assert.match(source, /bind(?:Exact|Stable|Physical)[A-Za-z]*Tool|exactToolBinding/iu,
      "the root-owned Node launcher must use one exact physical binding");
    assert.match(
      source,
      /(?:toolBinding|exactToolBinding)[\s\S]{0,1200}?["']node["']/iu,
      "the root-owned Node exact tool binding is not recorded",
    );
    assert.match(source, /EXPECTED_TYPESCRIPT_BUNDLE_SHA256/u,
      "the descriptor-fed TypeScript bundle digest must be recorded");
    assert.match(source, /assignmentArchiveBuild/u,
      "the descriptor-fed assignment archive must be recorded");
    assert.match(source, /stdout[\s\S]{0,400}sha256|sha256[\s\S]{0,400}stdout/iu);
    assert.match(source, /stderr[\s\S]{0,400}sha256|sha256[\s\S]{0,400}stderr/iu);
    assert.match(source, /result[\s\S]{0,400}sha256|sha256[\s\S]{0,400}result/iu);
  },
);

test(
  "P1 retained evidence review: every audit is source-bound to one reviewed Lab",
  async () => {
    const [source, sourceBindingsModule, names] = await Promise.all([
      readFile(runnerPath, "utf8"),
      readFile(sourceBindingsModulePath, "utf8"),
      import("node:fs/promises").then(({ readdir }) => readdir(
        path.join(here, "../components/visualizations/signature"),
      )),
    ]);
    const signatureRoot = path.join(here, "../components/visualizations/signature");
    const audits = names.filter((name) =>
      name.startsWith("audit-") && name.endsWith(".mjs")).sort();
    const labFiles = names.filter((name) => name.endsWith("Lab.jsx")).sort();
    assert.equal(audits.length, 192);
    assert.equal(labFiles.length, 192);
    const knownLabs = new Set(labFiles.map((name) => name.slice(0, -4)));
    const pairs = [];
    const sourceRecords = new Map();
    for (const name of [...audits, ...labFiles]) {
      const bytes = await readFile(path.join(signatureRoot, name));
      sourceRecords.set(name, { bytes, sha256: sha256(bytes) });
    }
    for (const audit of audits) {
      const auditBytes = sourceRecords.get(audit).bytes;
      const auditText = auditBytes.toString("utf8");
      const labStem = [...auditText.matchAll(
        /\b([A-Z][A-Za-z0-9]*Lab)(?:\.jsx)?\b/gu,
      )].map((match) => match[1]).find((candidate) => knownLabs.has(candidate));
      assert.ok(labStem, `${audit}: missing reviewed Lab token`);
      const lab = `${labStem}.jsx`;
      const labBytes = sourceRecords.get(lab).bytes;
      pairs.push({ audit, lab, auditBytes, labBytes });
    }
    assert.equal(new Set(pairs.map((pair) => pair.lab)).size, 192,
      "the first reviewed Lab token must form one exact 192-to-192 bijection");
    const namesManifest = Buffer.from(
      `${pairs.map((pair) => `${pair.audit}\t${pair.lab}`).join("\n")}\n`,
      "utf8",
    );
    const sourceManifest = Buffer.from(
      `${pairs.map((pair) => [
        pair.audit,
        pair.lab,
        sha256(pair.auditBytes),
        sha256(pair.labBytes),
      ].join("\t")).join("\n")}\n`,
      "utf8",
    );
    assert.equal(sha256(namesManifest), EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256);
    assert.equal(sha256(sourceManifest), EXPECTED_AUDIT_LAB_SOURCE_SHA256);

    assert.match(sourceBindingsModule,
      new RegExp(EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256, "u"));
    assert.match(sourceBindingsModule,
      new RegExp(EXPECTED_AUDIT_LAB_SOURCE_SHA256, "u"));
    assert.match(source, /assertExactAuditLabSourceBindings\s*\(/u);
    assert.match(
      source,
      /sourceBinding\s*:\s*\{[\s\S]{0,900}?\baudit\s*:[\s\S]{0,900}?\blab\s*:/u,
      "each audit plan must bind both the audit bytes and its exact paired Lab bytes",
    );

    assert.deepEqual(
      assertExactAuditLabSourceBindings(audits, labFiles, sourceRecords),
      pairs.map(({ audit, lab }) => ({ audit, lab })),
    );
    const tamperedRecords = new Map(sourceRecords);
    const tamperedLab = pairs.at(-1).lab;
    const tamperedBytes = Buffer.from(tamperedRecords.get(tamperedLab).bytes);
    tamperedBytes[tamperedBytes.length - 1] ^= 1;
    tamperedRecords.set(tamperedLab, {
      bytes: tamperedBytes,
      sha256: sha256(tamperedBytes),
    });
    assert.throws(
      () => assertExactAuditLabSourceBindings(audits, labFiles, tamperedRecords),
      /source binding drifted/u,
      "the production assertion must reject a one-sided mirrored Lab change",
    );
  },
);

test(
  "P1 retained evidence review: assignment gates bind the exact graph they execute",
  async () => {
    const source = await readFile(runnerPath, "utf8");
    const ts = (await import("../node_modules/typescript/lib/typescript.js")).default;
    const projectRoot = path.resolve(here, "..");
    const tsconfigPath = path.join(projectRoot, "tsconfig.json");
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    assert.equal(configFile.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      projectRoot,
      { incremental: false, noEmit: true },
      tsconfigPath,
    );
    const program = ts.createProgram({
      rootNames: [path.join(projectRoot, "data/signatureLabAssignments.test.ts")],
      options: parsed.options,
    });
    const graph = program.getSourceFiles()
      .map((entry) => path.resolve(entry.fileName))
      .filter((entry) => entry.startsWith(`${projectRoot}${path.sep}`) &&
        !entry.includes(`${path.sep}node_modules${path.sep}`))
      .map((entry) => path.relative(projectRoot, entry))
      .sort();
    assert.deepEqual(
      extractExactFrozenStringArray(source, "EXPECTED_ASSIGNMENT_SOURCE_GRAPH"),
      graph,
      "the pre-plan source graph must be one reviewed exact compiler graph",
    );
    const namesManifest = Buffer.from(`${graph.join("\n")}\n`, "utf8");
    const sourceManifest = Buffer.from(
      `${(await Promise.all(graph.map(async (relative) => {
        const bytes = await readFile(path.join(projectRoot, relative));
        return `${relative}\t${sha256(bytes)}`;
      }))).join("\n")}\n`,
      "utf8",
    );
    assert.equal(sha256(namesManifest), EXPECTED_ASSIGNMENT_SOURCE_GRAPH_NAMES_SHA256);
    assert.equal(sha256(sourceManifest), EXPECTED_ASSIGNMENT_SOURCE_GRAPH_SHA256);
    assert.match(source,
      new RegExp(EXPECTED_ASSIGNMENT_SOURCE_GRAPH_NAMES_SHA256, "u"));
    assert.match(source, new RegExp(EXPECTED_ASSIGNMENT_SOURCE_GRAPH_SHA256, "u"));

    const prepared = source.indexOf("prepareAssignmentSourceBindings(");
    const plan = source.indexOf("const plannedGateRecords = deepFreeze");
    assert.ok(prepared >= 0 && plan > prepared,
      "live graph, snapshot graph, and generated configs must be bound before plan freeze");
    assert.doesNotMatch(source, /const\s+assignmentSourceBinding\s*=\s*\{/u,
      "five materially different gates may not reuse one live-only binding");
    assert.equal(
      [...source.matchAll(/sourceBinding\s*:\s*assignmentLiveSourceBinding\b/gu)].length,
      2,
      "gates 193 and 197 must bind the live graph and generated live config",
    );
    assert.equal(
      [...source.matchAll(/sourceBinding\s*:\s*assignmentSnapshotSourceBinding\b/gu)].length,
      3,
      "gates 194-196 must bind the exact copied graph and snapshot config",
    );
  },
);

test(
  "P1 retained evidence review: assignment compiler options are the reviewed pinned project-config projection",
  async () => {
    const source = await readFile(runnerPath, "utf8");
    const projectRoot = path.resolve(here, "..");
    const tsconfigPath = path.join(projectRoot, "tsconfig.json");
    const tsconfigBytes = await readFile(tsconfigPath);
    assert.equal(sha256(tsconfigBytes), EXPECTED_PROJECT_TSCONFIG_SHA256);

    const ts = (await import("../node_modules/typescript/lib/typescript.js")).default;
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    assert.equal(configFile.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      projectRoot,
      { incremental: false, noEmit: true },
      tsconfigPath,
    );
    const { EXPECTED_ASSIGNMENT_COMPILER_OPTIONS } = await import(
      "./signature-lab-assignment-execution-capsule.mjs"
    );
    const reviewedProjection = {
      allowJs: parsed.options.allowJs,
      checkJs: parsed.options.checkJs,
      esModuleInterop: parsed.options.esModuleInterop,
      incremental: parsed.options.incremental,
      isolatedModules: parsed.options.isolatedModules,
      jsx: ts.JsxEmit[parsed.options.jsx],
      lib: parsed.options.lib,
      module: ts.ModuleKind[parsed.options.module],
      moduleResolution: ts.ModuleResolutionKind[parsed.options.moduleResolution],
      noEmit: parsed.options.noEmit,
      paths: parsed.options.paths,
      plugins: [],
      resolveJsonModule: parsed.options.resolveJsonModule,
      skipLibCheck: parsed.options.skipLibCheck,
      strict: parsed.options.strict,
      target: ts.ScriptTarget[parsed.options.target],
    };
    assert.deepEqual(reviewedProjection, EXPECTED_ASSIGNMENT_COMPILER_OPTIONS);
    assert.match(source, new RegExp(EXPECTED_PROJECT_TSCONFIG_SHA256, "u"));
    assert.match(
      source,
      /projectTsconfigRecord\.sha256\s*!==\s*EXPECTED_PROJECT_TSCONFIG_SHA256/u,
      "the exact project config must be pinned before the assignment plan is frozen",
    );
    assert.match(
      source,
      /buildCanonicalAssignmentArchive\s*\(\s*\{[\s\S]{0,160}?compilerOptions\s*:\s*EXPECTED_ASSIGNMENT_COMPILER_OPTIONS/u,
      "the executed archive must receive the reviewed compiler-option projection explicitly",
    );
    assert.match(source, /executionCompilerOptions\s*:\s*EXPECTED_ASSIGNMENT_COMPILER_OPTIONS/u);
  },
);

test(
  "P1 retained evidence review: assignment gates execute only the bound TypeScript bundle and assignment archive",
  async () => {
    const assignmentCapsule = await import(
      "./signature-lab-assignment-execution-capsule.mjs"
    );
    for (const exportName of [
      "EXACT_BOUND_ASSIGNMENT_CAPSULE_SOURCE",
      "EXACT_BOUND_ASSIGNMENT_CAPSULE_SHA256",
      "EXPECTED_TYPESCRIPT_VERSION",
      "EXPECTED_TYPESCRIPT_BUNDLE_SHA256",
      "buildCanonicalAssignmentArchive",
      "exactBoundAssignmentArgv",
      "runExactBoundSignatureAssignment",
    ]) {
      assert.notEqual(
        assignmentCapsule[exportName],
        undefined,
        `${exportName} must be exported by the assignment capsule`,
      );
    }
    assert.equal(assignmentCapsule.EXPECTED_TYPESCRIPT_VERSION, "5.8.3");
    assert.equal(
      assignmentCapsule.EXPECTED_TYPESCRIPT_BUNDLE_SHA256,
      "dd17428736a07e1db1a138d8a14295ddb2699ba780ee15038acdd2c6da5373a0",
    );

    const source = await readFile(runnerPath, "utf8");
    assert.match(
      source,
      /from\s+["'][^"']*signature-lab-assignment-execution-capsule\.mjs["']/u,
      "the production runner must import the reviewed assignment capsule",
    );
    assert.match(source, /runExactBoundSignatureAssignment\s*\(\s*\{/u);
    assert.match(source, /exactBoundAssignmentArgv\s*\(\s*\{/u);

    const assignmentPlanStart = source.indexOf("ordinal: 193");
    const assignmentPlanEnd = source.indexOf(
      "assertExactPlannedGateInventory",
      assignmentPlanStart,
    );
    assert.ok(
      assignmentPlanStart >= 0 && assignmentPlanEnd > assignmentPlanStart,
      "the exact five-gate assignment plan is missing",
    );
    const assignmentPlan = source.slice(assignmentPlanStart, assignmentPlanEnd);
    assert.doesNotMatch(
      assignmentPlan,
      /\b(?:tscBin|tsxLoader|snapshotAssignment|snapshotTsconfig|liveGraphConfig)\b|node_modules\/(?:typescript\/bin\/tsc|tsx|esbuild|@esbuild)/u,
      "assignment argv may contain only root-owned Node, capsule source, mode, and archive digest",
    );
    assert.match(
      source,
      /const\s+typescriptBundleBinding\s*=\s*\{[\s\S]{0,200}?descriptor\s*:\s*3\b/u,
    );
    assert.match(
      source,
      /const\s+archiveBinding\s*=\s*\{[\s\S]{0,200}?descriptor\s*:\s*4\b/u,
    );
    assert.equal(
      [...assignmentPlan.matchAll(/exactBoundAssignmentArgv\s*\(\s*\{/gu)].length,
      5,
      "all five assignment plans must use the same descriptor-only argv builder",
    );

    const assignmentExecutionStart = source.indexOf(
      "async function executeExactBoundAssignmentGate",
    );
    const assignmentExecutionEnd = source.indexOf(
      "async function copySourceRecord",
      assignmentExecutionStart,
    );
    assert.ok(
      assignmentExecutionStart >= 0 && assignmentExecutionEnd > assignmentExecutionStart,
      "the assignment descriptor lifecycle helper is missing",
    );
    const assignmentExecution = source.slice(
      assignmentExecutionStart,
      assignmentExecutionEnd,
    );
    assert.match(
      assignmentExecution,
      /O_RDONLY\s*\|\s*fsConstants\.O_NOFOLLOW/u,
    );
    assert.match(assignmentExecution, /runExactBoundSignatureAssignment\s*\(/u);
    assert.match(assignmentExecution, /typescriptFd/u);
    assert.match(assignmentExecution, /archiveFd/u);
    assert.doesNotMatch(assignmentExecution, /runCaptured\s*\(/u);

    const tapPlanReference = source.indexOf("plannedAssignmentGateRecords[3]");
    const tapCallStart = source.lastIndexOf("executeExactBoundAssignmentGate(",
      tapPlanReference);
    const tapOpen = source.indexOf("(", tapCallStart);
    const tapClose = findMatchingDelimiter(source, tapOpen, "(", ")");
    const tapCall = source.slice(tapCallStart, tapClose + 1);
    assert.match(tapCall, /validateTap\s*\(/u);
    assert.doesNotMatch(tapCall, /tsx|adoptExpectedEmptyTsxCache/u);
  },
);

test(
  "P1 retained evidence review: stable source records bind exact byte length before assignment execution",
  async () => {
    const source = await readFile(runnerPath, "utf8");
    const readerStart = source.indexOf("function stableReadSourceFile");
    const readerEnd = source.indexOf(
      "function stableReadSystemTool",
      readerStart,
    );
    assert.ok(
      readerStart >= 0 && readerEnd > readerStart,
      "the stable source reader is missing",
    );
    const reader = source.slice(readerStart, readerEnd);
    assert.match(
      reader,
      /return\s*\{[\s\S]*?byteLength\s*:\s*bytes\.length[\s\S]*?sha256\s*:\s*sha256\(bytes\)/u,
      "stable source records must expose the exact bytes read to startup length gates",
    );
    assert.match(
      source,
      /typescriptBundleRecord\.byteLength\s*!==\s*EXPECTED_TYPESCRIPT_BUNDLE_BYTE_LENGTH/u,
      "TypeScript startup must compare the stable record against the capsule constant",
    );
  },
);

test(
  "P1 retained evidence review: descriptor comparators respect stable and retained identity schemas",
  async () => {
    const source = await readFile(runnerPath, "utf8");
    const stableStart = source.indexOf(
      "function assertDescriptorMatchesStableSource",
    );
    const retainedStart = source.indexOf(
      "function assertDescriptorMatchesRetainedSource",
    );
    const retainedEnd = source.indexOf(
      "function assertRetainedSourcePathBound",
      retainedStart,
    );
    assert.ok(
      stableStart >= 0 && retainedStart > stableStart && retainedEnd > retainedStart,
      "stable-source and retained-publication descriptors need distinct comparators",
    );
    const stableComparator = source.slice(stableStart, retainedStart);
    const retainedComparator = source.slice(retainedStart, retainedEnd);
    assert.match(stableComparator, /record\.identity/u);
    assert.match(stableComparator, /BigInt\(record\.byteLength\)/u);
    assert.match(retainedComparator, /jsonSafeIdentity/u);
    assert.match(retainedComparator, /BigInt\(record\.byteLength\)/u);
    assert.doesNotMatch(
      retainedComparator,
      /"(?:size|mtimeNs|ctimeNs)"/u,
      "retained publication identities do not attest mutable full-stat fields",
    );

    const assignmentStart = source.indexOf(
      "async function executeExactBoundAssignmentGate",
    );
    const assignmentEnd = source.indexOf(
      "async function copySourceRecord",
      assignmentStart,
    );
    const assignmentExecution = source.slice(assignmentStart, assignmentEnd);
    assert.equal(
      [...assignmentExecution.matchAll(/assertDescriptorMatchesStableSource\s*\(/gu)].length,
      2,
      "TypeScript FD3 must use the full stable-source comparator before and after execution",
    );
    assert.equal(
      [...assignmentExecution.matchAll(/assertDescriptorMatchesRetainedSource\s*\(/gu)].length,
      2,
      "retained FD4 must use the retained-publication comparator before and after execution",
    );
  },
);

test(
  "P1 retained evidence review: every spawned gate has durable attempt chronology",
  async () => {
    const source = await readFile(runnerPath, "utf8");
    const executorStart = source.indexOf("async function executeRecordedGate");
    const executorEnd = source.indexOf("async function publishInitialPlan", executorStart);
    assert.ok(executorStart >= 0 && executorEnd > executorStart);
    const executor = source.slice(executorStart, executorEnd);
    const attemptPublication = executor.indexOf('"attempt.json"');
    const spawn = executor.indexOf("runCaptured(");
    assert.ok(
      attemptPublication >= 0 && spawn > attemptPublication,
      "an O_EXCL/fsynced retained attempt record must precede the child spawn",
    );
    assert.match(
      executor,
      /gateAttemptRecords\s*\.\s*push\s*\(\s*deepFreeze\s*\(/u,
      "the immutable attempt ledger must bind the durable attempt artifact",
    );
    assert.match(
      source,
      /final-gate-ledger\.v1[\s\S]{0,900}?gateAttemptRecords/u,
      "the final retained ledger must preserve started attempts even when publication fails",
    );

    const capturedStart = source.indexOf("function runCaptured");
    const capturedEnd = source.indexOf("function printCaptured", capturedStart);
    assert.ok(capturedStart >= 0 && capturedEnd > capturedStart);
    const captured = source.slice(capturedStart, capturedEnd);
    assert.doesNotMatch(
      captured,
      /if\s*\(\s*result\.error\s*\)\s*throw/u,
      "spawnSync errors are execution results and must not bypass immutable FAIL publication",
    );
    assert.match(
      executor,
      /executionErrorRecord\s*\(\s*execution\.error\s*\)/u,
      "spawn errors must be normalized into the durable result record",
    );
  },
);

test(
  "P1 retained evidence review: execution journal ACKs bracket every gate executor",
  async () => {
    const [source, moduleSource] = await Promise.all([
      readFile(runnerPath, "utf8"),
      readFile(retainedEvidenceModulePath, "utf8"),
    ]);
    for (const capability of [
      "initializeRetainedSignatureLabExecutionJournal",
      "appendRetainedSignatureLabExecutionJournal",
    ]) {
      assertModuleExport(moduleSource, capability);
      assert.match(
        source,
        new RegExp(`\\b${capability}\\b[\\s\\S]*from\\s+["'][^"']*signature-lab-retained-evidence\\.mjs["']`, "u"),
        `runner must import ${capability}`,
      );
    }

    const executorStart = source.indexOf("async function executeRecordedGate");
    const executorEnd = source.indexOf("async function publishInitialPlan", executorStart);
    assert.ok(executorStart >= 0 && executorEnd > executorStart);
    const executor = source.slice(executorStart, executorEnd);
    const startedAppend = executor.indexOf(
      "await appendRetainedSignatureLabExecutionJournal",
    );
    const startedLedger = executor.indexOf("gateAttemptRecords.push", startedAppend);
    const capturedExecutor = executor.indexOf("runCaptured(", startedLedger);
    const injectedExecutor = executor.indexOf(": executor()", startedLedger);
    const executorInvocation = Math.min(
      ...[capturedExecutor, injectedExecutor].filter((index) => index >= 0),
    );
    const semanticValidation = executor.indexOf("validation(execution)", executorInvocation);
    const resultConstruction = executor.indexOf("const resultValue =", executorInvocation);
    const resultAppend = executor.indexOf(
      "await appendRetainedSignatureLabExecutionJournal",
      startedAppend + 1,
    );
    const resultLedger = executor.indexOf("gateResultRecords.push", resultAppend);
    assert.ok(
      startedAppend >= 0 &&
        startedLedger > startedAppend &&
        executorInvocation > startedLedger &&
        semanticValidation > executorInvocation &&
        resultConstruction > semanticValidation &&
        resultAppend > resultConstruction &&
        resultLedger > resultAppend,
      "durable STARTED ACK < attempt ledger < executor < validation/result < durable RESULT ACK < result ledger",
    );
    assert.doesNotMatch(
      executor,
      /\bmkdirOwned\s*\(\s*executionDirectory\s*\)|\bwriteRetainedSignatureLabFile\s*\(/u,
      "journal transactions must replace per-gate mkdir and independent artifact writes",
    );
  },
);

test(
  "P1 retained evidence review: runner journal integration reaches one sealed exact terminal chronology",
  async () => {
    const source = await readFile(runnerPath, "utf8");

    const planPublicationStart = source.indexOf(
      "async function publishInitialPlan()",
    );
    const planPublicationEnd = source.indexOf(
      "\nasync function publishFinalLedger()",
      planPublicationStart,
    );
    assert.ok(
      planPublicationStart >= 0 && planPublicationEnd > planPublicationStart,
      "durable initial-plan publication source boundary is missing",
    );
    const planPublication = source.slice(planPublicationStart, planPublicationEnd);
    const durablePlanWrites = [
      ...planPublication.matchAll(/await\s+writeCanonicalRetainedRecord\s*\(/gu),
    ];
    const auditPlanPath = planPublication.indexOf('"plans/planned-audits.json"');
    const assignmentPlanPath = planPublication.indexOf(
      '"plans/planned-assignment-gates.json"',
    );
    assert.equal(
      durablePlanWrites.length,
      2,
      "both and only both immutable plan ledgers must be durably awaited",
    );
    assert.ok(
      durablePlanWrites[0].index < auditPlanPath &&
        auditPlanPath < durablePlanWrites[1].index &&
        durablePlanWrites[1].index < assignmentPlanPath,
      "audit and assignment plans must publish durably in their reviewed order",
    );

    const executeGatesStart = source.indexOf("async function executeGates()");
    const executeGatesEnd = source.indexOf(
      "\nasync function executeAndSealRetainedGate()",
      executeGatesStart,
    );
    assert.ok(
      executeGatesStart >= 0 && executeGatesEnd > executeGatesStart,
      "gate orchestration source boundary is missing",
    );
    const executeGates = source.slice(executeGatesStart, executeGatesEnd);
    const publishPlan = executeGates.indexOf("await publishInitialPlan()");
    const initializeJournal = executeGates.indexOf(
      "await initializeRetainedSignatureLabExecutionJournal",
      publishPlan,
    );
    const adoptInitialJournal = executeGates.indexOf(
      "executionJournal = Object.freeze",
      initializeJournal,
    );
    const firstGateDispatch = executeGates.indexOf(
      "await executeExactBoundAuditGate",
      adoptInitialJournal,
    );
    assert.ok(
      publishPlan >= 0 && initializeJournal > publishPlan &&
        adoptInitialJournal > initializeJournal &&
        firstGateDispatch > adoptInitialJournal,
      "both durable plans and the initialized journal ACK must precede the first recorded executor",
    );

    const executorStart = source.indexOf("async function executeRecordedGate");
    const executorEnd = source.indexOf("async function publishInitialPlan", executorStart);
    assert.ok(executorStart >= 0 && executorEnd > executorStart);
    const executor = source.slice(executorStart, executorEnd);
    const startedAck = executor.indexOf(
      "await appendRetainedSignatureLabExecutionJournal",
    );
    const executorInvocation = Math.min(
      ...[
        executor.indexOf("runCaptured(", startedAck),
        executor.indexOf(": executor()", startedAck),
      ].filter((index) => index >= 0),
    );
    const resultStatus = executor.indexOf(
      'status: passed ? "PASS" : "FAIL"',
      executorInvocation,
    );
    const resultAck = executor.indexOf(
      "await appendRetainedSignatureLabExecutionJournal",
      startedAck + 1,
    );
    const resultLedger = executor.indexOf("gateResultRecords.push", resultAck);
    const executorReturn = executor.indexOf(
      "return { execution, passed, resultValue, result, validationValue }",
      resultLedger,
    );
    assert.ok(
      startedAck >= 0 && executorInvocation > startedAck &&
        resultStatus > executorInvocation && resultAck > resultStatus &&
        resultLedger > resultAck && executorReturn > resultLedger,
      "STARTED ACK must authorize execution and RESULT ACK plus its ledger must precede return",
    );

    const chronologyStart = source.indexOf(
      "function assertExecutionJournalChronology()",
    );
    const chronologyEnd = source.indexOf(
      "\nasync function finalizeRetainedEvidence()",
      chronologyStart,
    );
    assert.ok(
      chronologyStart >= 0 && chronologyEnd > chronologyStart,
      "execution-journal chronology source boundary is missing",
    );
    const chronology = source.slice(chronologyStart, chronologyEnd);
    assert.match(
      chronology,
      /resultCount\s*>\s*attemptCount\s*\|\|\s*attemptCount\s*>\s*resultCount\s*\+\s*1\s*\|\|\s*executionJournal\.recordCount\s*!==\s*attemptCount\s*\+\s*resultCount/u,
      "the journal must allow only equal ACK pairs or one trailing STARTED ACK",
    );
    assert.match(
      chronology,
      /gateAttemptRecords\[index\]\.gateId\s*!==\s*immutableGatePlan\[index\]\?\.gateId/u,
      "attempt ACKs must be an exact immutable-plan prefix",
    );
    assert.match(
      chronology,
      /gateResultRecords\[index\]\.gateId\s*!==\s*immutableGatePlan\[index\]\?\.gateId/u,
      "result ACKs must be an exact immutable-plan prefix",
    );
    assert.match(
      chronology,
      /const expectedNextEventType\s*=\s*attemptCount\s*>\s*resultCount\s*\?\s*"RESULT"\s*:\s*resultCount\s*===\s*immutableGatePlan\.length\s*\?\s*"COMPLETE"\s*:\s*"STARTED"/u,
      "valid prefixes must derive their exact next event type",
    );
    assert.match(
      chronology,
      /const expectedNextOrdinal\s*=\s*attemptCount\s*>\s*resultCount\s*\?\s*attemptCount\s*:\s*resultCount\s*\+\s*1/u,
      "valid prefixes must derive their exact next ordinal",
    );
    assert.match(
      chronology,
      /primaryFailure\s*===\s*null[\s\S]{0,500}?attemptCount\s*!==\s*EXPECTED_GATE_PLAN_COUNT[\s\S]{0,300}?resultCount\s*!==\s*EXPECTED_GATE_PLAN_COUNT[\s\S]{0,300}?executionJournal\.recordCount\s*!==\s*EXPECTED_GATE_PLAN_COUNT\s*\*\s*2[\s\S]{0,300}?executionJournal\.nextEventType\s*!==\s*"COMPLETE"[\s\S]{0,300}?executionJournal\.nextOrdinal\s*!==\s*EXPECTED_GATE_PLAN_COUNT\s*\+\s*1/u,
      "success must require 197 attempts, 197 results, 394 ACKs, COMPLETE, and ordinal 198",
    );
    assert.match(source, /const EXPECTED_GATE_PLAN_COUNT = 197;/u);

    const passGuards = [
      ...executeGates.matchAll(
        /if\s*\(\s*!([A-Za-z_$][A-Za-z0-9_$]*)\.passed\s*\)/gu,
      ),
    ].map((match) => match[1]);
    assert.deepEqual(
      passGuards,
      [
        "recorded",
        "liveGraphExecution",
        "snapshotListRecord",
        "typeCheckedRecord",
        "contractExecution",
        "finalGraphRecord",
      ],
      "the 192-audit loop and all five assignment gates must reject every non-PASS result",
    );

    for (const field of [
      "planSha256",
      "plannedGateCount",
      "plannedGateIdsSha256",
      "relativePath",
      "identity",
      "byteLength",
      "sha256",
      "recordCount",
      "lastFrameSha256",
      "nextEventType",
      "nextOrdinal",
    ]) {
      assert.match(
        chronology,
        new RegExp(`\\b${field}\\s*:`, "u"),
        `terminal journal provenance must include ${field}`,
      );
    }

    const finalizeStart = source.indexOf("async function finalizeRetainedEvidence()");
    const finalizeEnd = source.indexOf("\nasync function executeGates()", finalizeStart);
    assert.ok(finalizeStart >= 0 && finalizeEnd > finalizeStart);
    const finalize = source.slice(finalizeStart, finalizeEnd);
    const constructJournalProvenance = finalize.indexOf(
      "const executionJournalProvenance = assertExecutionJournalChronology()",
    );
    const includeJournalProvenance = finalize.indexOf(
      "executionJournal: executionJournalProvenance",
      constructJournalProvenance,
    );
    const seal = finalize.indexOf(
      "const result = await sealRetainedSignatureLabEvidence",
      includeJournalProvenance,
    );
    const retainSealResult = finalize.indexOf(
      "retainedEvidenceResult = result",
      seal,
    );
    const revalidate = finalize.indexOf(
      "const revalidated = await revalidateRetainedSignatureLabEvidence",
      retainSealResult,
    );
    assert.ok(
      constructJournalProvenance >= 0 &&
        includeJournalProvenance > constructJournalProvenance &&
        seal > includeJournalProvenance && retainSealResult > seal &&
        revalidate > retainSealResult,
      "terminal journal provenance must enter the seal before independent external revalidation",
    );
    assert.match(
      finalize,
      /sealRetainedSignatureLabEvidence\s*\(\s*\{\s*run\s*:\s*retainedRun\s*,\s*outcome\s*,\s*provenance\s*,?\s*\}\s*\)/u,
    );
    assert.match(
      finalize,
      /revalidateRetainedSignatureLabEvidence\s*\(\s*\{[\s\S]{0,500}?externalReceipt\s*:\s*result\.externalReceipt/u,
    );
  },
);

test(
  "P1 retained evidence review: journal plan digest canonicalizes the exact top-level gate array",
  async () => {
    const source = await readFile(runnerPath, "utf8");
    const helperStart = source.indexOf("function canonicalRecord(");
    const helperEnd = source.indexOf("\nfunction assertIdentity(", helperStart);
    assert.ok(
      helperStart >= 0 && helperEnd > helperStart,
      "canonical JSON helper source boundary is missing",
    );
    const context = { Buffer };
    runInNewContext(
      `${source.slice(helperStart, helperEnd)}\n` +
        `globalThis.serializedGatePlan = canonicalJsonArrayBytes([` +
        `{ ordinal: 1, gateId: "gate-0001" },` +
        `{ gateId: "gate-0002", ordinal: 2 }` +
        `], "immutable gate plan");` +
        `globalThis.testCanonicalJsonBytes = canonicalJsonBytes;` +
        `globalThis.testCanonicalJsonArrayBytes = canonicalJsonArrayBytes;`,
      context,
    );
    assert.equal(
      Buffer.from(context.serializedGatePlan).toString("utf8"),
      '[{"gateId":"gate-0001","ordinal":1},{"gateId":"gate-0002","ordinal":2}]\n',
      "the exact ordered gate array must have one deterministic canonical encoding",
    );
    assert.throws(
      () => context.testCanonicalJsonBytes([], "object record"),
      /object record: expected one object/u,
      "the object-record serializer must continue rejecting top-level arrays",
    );
    assert.throws(
      () => context.testCanonicalJsonArrayBytes([1], "gate plan"),
      /gate plan\[0\]: expected one object/u,
      "every top-level gate-plan array entry must remain one object",
    );
    assert.throws(
      () => context.testCanonicalJsonArrayBytes({}, "gate plan"),
      /gate plan: expected one array/u,
      "the gate-plan serializer must continue rejecting non-array roots",
    );

    const executeGatesStart = source.indexOf("async function executeGates()");
    const executeGatesEnd = source.indexOf(
      "\nasync function executeAndSealRetainedGate()",
      executeGatesStart,
    );
    assert.ok(executeGatesStart >= 0 && executeGatesEnd > executeGatesStart);
    const executeGates = source.slice(executeGatesStart, executeGatesEnd);
    assert.match(
      executeGates,
      /planSha256:\s*sha256\(canonicalJsonArrayBytes\(\s*immutableGatePlan,\s*["']immutable gate plan["']/u,
      "journal initialization must digest the top-level immutable gate array with its array serializer",
    );
    assert.doesNotMatch(
      executeGates,
      /planSha256:\s*sha256\(canonicalJsonBytes\(\s*immutableGatePlan/u,
      "the object-only record serializer must never receive the immutable gate array",
    );
  },
);

test(
  "P1 retained evidence review: source and tool postconditions decide PASS before freeze",
  async () => {
    const source = await readFile(runnerPath, "utf8");
    const auditLoop = findSemanticAuditLoop(source);
    assert.match(
      auditLoop.body,
      /executeExactBoundAuditGate\s*\(\s*\{[\s\S]{0,1800}?assertSourceRecordUnchanged\s*\([\s\S]{0,900}?\.audit[\s\S]{0,900}?assertSourceRecordUnchanged\s*\([\s\S]{0,900}?\.lab[\s\S]{0,900}?assertRetainedSourcePathBound\s*\([\s\S]{0,900}?auditSnapshotRecord[\s\S]{0,900}?assertRetainedSourcePathBound\s*\([\s\S]{0,900}?labSnapshotRecord/u,
      "each audit's live and descriptor-fed snapshot pair must be revalidated before PASS",
    );

    const finalPlanReference = source.indexOf("plannedAssignmentGateRecords[4]");
    const finalCallStart = source.lastIndexOf(
      "executeExactBoundAssignmentGate(",
      finalPlanReference,
    );
    const finalCallOpen = source.indexOf("(", finalCallStart);
    const finalCallClose = findMatchingDelimiter(source, finalCallOpen, "(", ")");
    const finalCall = source.slice(finalCallStart, finalCallClose + 1);
    assert.match(finalCall, /assertSourceRecordUnchanged\s*\(/u);
    assert.match(finalCall, /assertExactPhysicalToolsUnchanged\s*\(/u,
      "gate 197 cannot freeze PASS before final source/tool revalidation");

    const finalizeStart = source.indexOf("async function finalizeRetainedEvidence");
    const finalizeEnd = source.indexOf("async function executeGates", finalizeStart);
    assert.ok(finalizeStart >= 0 && finalizeEnd > finalizeStart);
    const finalize = source.slice(finalizeStart, finalizeEnd);
    const finalSourceCheck = finalize.lastIndexOf("assertSourceRecordUnchanged");
    const finalToolCheck = finalize.lastIndexOf("assertExactPhysicalToolsUnchanged");
    const ledgerPublication = finalize.indexOf("publishFinalLedger");
    assert.ok(
      finalSourceCheck >= 0 && finalToolCheck >= 0 &&
      ledgerPublication > finalSourceCheck && ledgerPublication > finalToolCheck,
      "the artifact named final-ledger must be published only after every pre-seal check",
    );
  },
);

test(
  "P1 retained evidence review: fallback reports only physically proven retained state",
  async () => {
    const source = await readFile(runnerPath, "utf8");
    const fallbackStart = source.indexOf("const terminalEvidence");
    const fallbackEnd = source.indexOf("SIGNATURE_LAB_RETAINED_EVIDENCE", fallbackStart);
    assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart,
      "terminal retained-evidence fallback is missing");
    const fallback = source.slice(fallbackStart, fallbackEnd);

    assert.match(fallback, /\bgateFailure\s*:\s*failureRecord\(/u);
    assert.match(fallback, /\bsealingFailure\s*:\s*failureRecord\(/u);
    assert.match(
      fallback,
      /\bglobalResidueState\s*:\s*["']NOT_EVALUATED["']/u,
      "fallback must not claim that a global residue audit ran",
    );
    assert.doesNotMatch(
      source,
      /\bunclassifiedResidueCount\b/u,
      "no runner outcome may make an unscoped global residue-count claim",
    );

    const freshBinding = /\bconst\s+freshRetainedRunBinding\s*=\s*retainedRun\s*===\s*null\s*\?\s*null\s*:\s*(?:await\s+)?inspectRetainedSignatureLabRun\s*\(\s*retainedRun\s*\)/u.exec(
      source,
    );
    assert.ok(
      freshBinding,
      "fallback must freshly inspect and bind a non-null opaque run token",
    );
    const sealCalls = findObjectCalls(source, "sealRetainedSignatureLabEvidence");
    assert.ok(
      sealCalls.length > 0 && freshBinding.index > Math.max(...sealCalls.map((call) => call.start)),
      "fallback binding inspection must occur after the final sealing attempt",
    );
    assert.match(
      fallback,
      /\bretainedArchiveCount\s*:\s*retainedRunClosureProven\s*\?\s*1\s*:\s*null\b/u,
      "fallback may report one only after fresh binding and exact terminal close",
    );
    assert.match(
      fallback,
      /\bcurrentRunPhysicalState\s*:\s*retainedRun\s*===\s*null\s*\?\s*["']UNKNOWN["']/u,
      "a missing token must yield null count and UNKNOWN physical state",
    );
  },
);

test(
  "P1 retained evidence review: terminal classification follows semantic and physical closure",
  async () => {
    const source = await readFile(runnerPath, "utf8");

    const sealStart = source.indexOf(
      "const result = await sealRetainedSignatureLabEvidence",
    );
    const durableResult = source.indexOf(
      "retainedEvidenceResult = result",
      sealStart,
    );
    const revalidation = source.indexOf(
      "const revalidated = await revalidateRetainedSignatureLabEvidence",
      sealStart,
    );
    assert.ok(
      sealStart >= 0 && durableResult > sealStart && revalidation > durableResult,
      "the durable seal result must be retained before independent revalidation",
    );

    const lifecycleStart = source.indexOf("async function inspectAndCloseRetainedRun");
    const lifecycleEnd = source.indexOf("await executeAndSealRetainedGate", lifecycleStart);
    assert.ok(lifecycleStart >= 0 && lifecycleEnd > lifecycleStart);
    const lifecycle = source.slice(lifecycleStart, lifecycleEnd);
    const tryStart = lifecycle.indexOf("try {");
    const inspect = lifecycle.indexOf("inspectRetainedSignatureLabRun", tryStart);
    const finallyStart = lifecycle.indexOf("finally {", inspect);
    const close = lifecycle.indexOf("closeRetainedSignatureLabRun", finallyStart);
    assert.ok(
      tryStart >= 0 && inspect > tryStart && finallyStart > inspect && close > finallyStart,
      "fresh inspection and unconditional descriptor close must share one try/finally",
    );
    assert.match(
      lifecycle,
      /(?:const|let)\s+\w*[Cc]lose\w*\s*=\s*await\s+closeRetainedSignatureLabRun\s*\(\s*retainedRun\s*\)/u,
      "the exact close result must be retained instead of discarded",
    );
    assert.match(
      lifecycle,
      /\w*[Cc]lose\w*\?*\.state\s*!==\s*["']CLOSED["'][\s\S]{0,360}?\w*[Cc]lose\w*\?*\.bound\s*!==\s*false/u,
      "POISONED or still-bound close results must become a terminal failure",
    );

    const exitConditionStart = source.indexOf(
      "if (primaryFailure !== null || retainedEvidenceFailure !== null",
    );
    const exitConditionEnd = source.indexOf("process.exitCode = 1", exitConditionStart);
    assert.ok(exitConditionStart >= 0 && exitConditionEnd > exitConditionStart);
    assert.match(
      source.slice(exitConditionStart, exitConditionEnd),
      /freshRetainedRunBinding\?\.bound\s*!==\s*true/u,
      "an absent fresh physical binding must force a failing process status",
    );
    assert.match(
      source.slice(exitConditionStart, exitConditionEnd),
      /freshRetainedRunClose\?\.state\s*!==\s*["']CLOSED["'][\s\S]{0,240}?freshRetainedRunClose\?\.bound\s*!==\s*false/u,
      "the process cannot exit successfully unless the final close is exact and terminal",
    );

    const tapPlanReference = source.indexOf("plannedAssignmentGateRecords[3]");
    const tapCallStart = source.lastIndexOf(
      "executeExactBoundAssignmentGate(",
      tapPlanReference,
    );
    const tapOpen = source.indexOf("(", tapCallStart);
    const tapClose = findMatchingDelimiter(source, tapOpen, "(", ")");
    const tapCall = source.slice(tapCallStart, tapClose + 1);
    assert.match(tapCall, /validateTap\s*\(/u);
    assert.doesNotMatch(
      tapCall,
      /tsx|adoptExpectedEmptyTsxCache/u,
      "the descriptor-only TAP gate must not depend on a TSX cache",
    );
  },
);

test(
  "P0 retained evidence review: audit FD3 bytes must match the immutable planned digest",
  async () => {
    const { exactBoundSignatureAuditArgv } = await import(
      "./signature-lab-execution-capsule.mjs"
    );
    const attackRoot = mkdtempSync(path.join(here, "../.tmp/audit-fd3-digest-red."));
    const auditPath = path.join(attackRoot, "audit.mjs");
    const labPath = path.join(attackRoot, "Lab.jsx");
    const originalAudit = Buffer.from('console.log("ORIGINAL_AUDIT");\n', "utf8");
    const replacementAudit = Buffer.from('console.log("ATTACKED_AUDIT");\n', "utf8");
    const originalLab = Buffer.from("ORIGINAL_LAB\n", "utf8");
    assert.equal(replacementAudit.length, originalAudit.length);
    writeExclusivePrivateFile(auditPath, originalAudit);
    writeExclusivePrivateFile(labPath, originalLab);

    const auditFd = openSync(auditPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const labFd = openSync(labPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try {
      const auditIdentity = fstatSync(auditFd, { bigint: true });
      overwriteSameLength(auditPath, replacementAudit);
      const attackedIdentity = fstatSync(auditFd, { bigint: true });
      for (const field of ["dev", "ino", "uid", "gid", "mode", "nlink", "size"]) {
        assert.equal(attackedIdentity[field], auditIdentity[field]);
      }
      const argv = exactBoundSignatureAuditArgv({
        nodePath: process.execPath,
        auditVirtualPath: path.join(attackRoot, "virtual", "audit.mjs"),
        labVirtualPath: path.join(attackRoot, "virtual", "Lab.jsx"),
        expectedLabRead: false,
        expectedAuditSha256: sha256(originalAudit),
        expectedLabSha256: sha256(originalLab),
      });
      const execution = spawnSync(argv[0], argv.slice(1), {
        cwd: attackRoot,
        env: boundAuditEnvironment(attackRoot),
        maxBuffer: 4 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe", auditFd, labFd],
      });
      assert.equal(execution.error, undefined);
      assert.equal(execution.signal, null);
      assert.notEqual(execution.status, 0, "equal-length replacement audit was executed");
      assert.equal(execution.stdout.length, 0);
      assert.doesNotMatch(execution.stdout.toString("utf8"), /ATTACKED_AUDIT/u);
      assert.match(execution.stderr.toString("utf8"), /audit descriptor digest mismatch/u);
    } finally {
      closeSync(auditFd);
      closeSync(labFd);
    }
    console.log(`AUDIT_FD3_DIGEST_ATTACK_RETAINED ${attackRoot}`);
  },
);

test(
  "P0 retained evidence review: Lab FD4 bytes must match the immutable planned digest",
  async () => {
    const { exactBoundSignatureAuditArgv } = await import(
      "./signature-lab-execution-capsule.mjs"
    );
    const attackRoot = mkdtempSync(path.join(here, "../.tmp/audit-fd4-digest-red."));
    const auditPath = path.join(attackRoot, "audit.mjs");
    const labPath = path.join(attackRoot, "Lab.jsx");
    const auditBytes = Buffer.from([
      'import fs from "node:fs";',
      'const lab = fs.readFileSync(new URL("./Lab.jsx", import.meta.url), "utf8");',
      'if (!lab.includes("ATTACKED_LAB")) throw new Error("planned Lab did not contain attack marker");',
      'console.log("LAB_ATTACK_ACCEPTED");',
      "",
    ].join("\n"), "utf8");
    const originalLab = Buffer.from("ORIGINAL_LAB\n", "utf8");
    const replacementLab = Buffer.from("ATTACKED_LAB\n", "utf8");
    assert.equal(replacementLab.length, originalLab.length);
    writeExclusivePrivateFile(auditPath, auditBytes);
    writeExclusivePrivateFile(labPath, originalLab);

    const auditFd = openSync(auditPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const labFd = openSync(labPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try {
      const labIdentity = fstatSync(labFd, { bigint: true });
      overwriteSameLength(labPath, replacementLab);
      const attackedIdentity = fstatSync(labFd, { bigint: true });
      for (const field of ["dev", "ino", "uid", "gid", "mode", "nlink", "size"]) {
        assert.equal(attackedIdentity[field], labIdentity[field]);
      }
      const argv = exactBoundSignatureAuditArgv({
        nodePath: process.execPath,
        auditVirtualPath: path.join(attackRoot, "virtual", "audit.mjs"),
        labVirtualPath: path.join(attackRoot, "virtual", "Lab.jsx"),
        expectedLabRead: true,
        expectedAuditSha256: sha256(auditBytes),
        expectedLabSha256: sha256(originalLab),
      });
      const execution = spawnSync(argv[0], argv.slice(1), {
        cwd: attackRoot,
        env: boundAuditEnvironment(attackRoot),
        maxBuffer: 4 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe", auditFd, labFd],
      });
      assert.equal(execution.error, undefined);
      assert.equal(execution.signal, null);
      assert.notEqual(execution.status, 0, "equal-length replacement Lab was consumed");
      assert.equal(execution.stdout.length, 0);
      assert.doesNotMatch(execution.stdout.toString("utf8"), /LAB_ATTACK_ACCEPTED/u);
      assert.match(execution.stderr.toString("utf8"), /Lab descriptor digest mismatch/u);
    } finally {
      closeSync(auditFd);
      closeSync(labFd);
    }
    console.log(`AUDIT_FD4_DIGEST_ATTACK_RETAINED ${attackRoot}`);
  },
);

test(
  "P1 retained evidence review: audit execution consumes only bound audit and Lab descriptors",
  async () => {
    const {
      assertRootOwnedExecutableChain,
      runExactBoundSignatureAudit,
    } = await import("./signature-lab-execution-capsule.mjs");
    const signatureRoot = path.join(
      here,
      "../components/visualizations/signature",
    );
    const auditPath = path.join(signatureRoot, "audit-closure.mjs");
    const labPath = path.join(signatureRoot, "ClosureLab.jsx");
    const auditSha256 = sha256(await readFile(auditPath));
    const labSha256 = sha256(await readFile(labPath));
    const auditFd = openSync(
      auditPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const labFd = openSync(
      labPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const absentVirtualRoot = path.join(signatureRoot, "absent-capsule-root");
    const capsuleEnvironment = Object.freeze({
      FORCE_COLOR: "0",
      LANG: "C",
      LC_ALL: "C",
      NODE_DISABLE_COMPILE_CACHE: "1",
      NO_COLOR: "1",
      PATH: "/usr/local/bin:/usr/bin:/bin",
      TSX_DISABLE_CACHE: "1",
    });
    try {
      const execution = runExactBoundSignatureAudit({
        nodePath: process.execPath,
        auditFd,
        labFd,
        auditVirtualPath: path.join(absentVirtualRoot, "audit-closure.mjs"),
        labVirtualPath: path.join(absentVirtualRoot, "ClosureLab.jsx"),
        expectedLabRead: true,
        expectedAuditSha256: auditSha256,
        expectedLabSha256: labSha256,
        cwd: signatureRoot,
        environment: capsuleEnvironment,
      });
      assert.equal(execution.error, undefined);
      assert.equal(execution.signal, null);
      assert.equal(execution.status, 0, execution.stderr.toString("utf8"));
      assert.match(execution.stdout.toString("utf8"), /PASS/u);
    } finally {
      closeSync(auditFd);
      closeSync(labFd);
    }

    assert.doesNotThrow(() => assertRootOwnedExecutableChain(process.execPath));
    assert.throws(
      () => assertRootOwnedExecutableChain(runnerPath),
      /root-owned|writable|executable chain/u,
      "a user-owned executable path must not satisfy the exact tool boundary",
    );

    const undeclaredAuditFd = openSync(
      sourceBindingsModulePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const denialLabFd = openSync(
      labPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    try {
      const denied = runExactBoundSignatureAudit({
        nodePath: process.execPath,
        auditFd: undeclaredAuditFd,
        labFd: denialLabFd,
        auditVirtualPath: path.join(absentVirtualRoot, "undeclared-import.mjs"),
        labVirtualPath: path.join(absentVirtualRoot, "ClosureLab.jsx"),
        expectedLabRead: false,
        expectedAuditSha256: sha256(await readFile(sourceBindingsModulePath)),
        expectedLabSha256: labSha256,
        cwd: signatureRoot,
        environment: capsuleEnvironment,
      });
      assert.equal(denied.error, undefined);
      assert.equal(denied.signal, null);
      assert.notEqual(denied.status, 0, "undeclared node:crypto import must fail");
      assert.match(denied.stderr.toString("utf8"), /undeclared module import/u);
    } finally {
      closeSync(undeclaredAuditFd);
      closeSync(denialLabFd);
    }

    const unboundFileSystemAuditFd = openSync(
      unboundFileSystemAuditPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const unboundFileSystemLabFd = openSync(
      labPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    try {
      const denied = runExactBoundSignatureAudit({
        nodePath: process.execPath,
        auditFd: unboundFileSystemAuditFd,
        labFd: unboundFileSystemLabFd,
        auditVirtualPath: path.join(absentVirtualRoot, "unbound-fs-audit.mjs"),
        labVirtualPath: path.join(absentVirtualRoot, "ClosureLab.jsx"),
        expectedLabRead: false,
        expectedAuditSha256: sha256(await readFile(unboundFileSystemAuditPath)),
        expectedLabSha256: labSha256,
        cwd: signatureRoot,
        environment: capsuleEnvironment,
      });
      assert.equal(denied.error, undefined);
      assert.equal(denied.signal, null);
      assert.equal(denied.status, 0, denied.stderr.toString("utf8"));
      assert.match(denied.stdout.toString("utf8"), /DENIED_ALTERNATES 7/u);
    } finally {
      closeSync(unboundFileSystemAuditFd);
      closeSync(unboundFileSystemLabFd);
    }

    const asyncAuditPath = path.join(signatureRoot, "audit-quadraticequation.mjs");
    const asyncLabPath = path.join(signatureRoot, "QuadraticEquationLab.jsx");
    const asyncAuditSha256 = sha256(await readFile(asyncAuditPath));
    const asyncLabSha256 = sha256(await readFile(asyncLabPath));
    const asyncAuditFd = openSync(
      asyncAuditPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const asyncLabFd = openSync(
      asyncLabPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    try {
      const execution = runExactBoundSignatureAudit({
        nodePath: process.execPath,
        auditFd: asyncAuditFd,
        labFd: asyncLabFd,
        auditVirtualPath: path.join(absentVirtualRoot, "audit-quadraticequation.mjs"),
        labVirtualPath: path.join(absentVirtualRoot, "QuadraticEquationLab.jsx"),
        expectedLabRead: true,
        expectedAuditSha256: asyncAuditSha256,
        expectedLabSha256: asyncLabSha256,
        cwd: signatureRoot,
        environment: capsuleEnvironment,
      });
      assert.equal(execution.error, undefined);
      assert.equal(execution.signal, null);
      assert.equal(execution.status, 0, execution.stderr.toString("utf8"));
      assert.match(execution.stdout.toString("utf8"), /all checks pass/u);
    } finally {
      closeSync(asyncAuditFd);
      closeSync(asyncLabFd);
    }

    const [runnerSource, capsuleSource] = await Promise.all([
      readFile(runnerPath, "utf8"),
      readFile(executionCapsuleModulePath, "utf8"),
    ]);
    assert.match(
      runnerSource,
      /from\s+["'][^"']*signature-lab-execution-capsule\.mjs["']/u,
      "the production runner must import the reviewed descriptor capsule",
    );
    assert.match(
      runnerSource,
      /runExactBoundSignatureAudit\s*\(\s*\{/u,
      "every audit child must be launched through the descriptor capsule",
    );
    assert.match(
      runnerSource,
      /O_RDONLY\s*\|\s*fsConstants\.O_NOFOLLOW/u,
      "the runner must bind each audit and Lab without following a symlink",
    );
    assert.doesNotMatch(
      runnerSource,
      /argv:\s*\[exactToolBinding\.nodeRecord\.path,\s*path\.join\(auditSnapshot,\s*name\)\]/u,
      "an audit plan may not execute its snapshotted pathname directly",
    );
    assert.match(capsuleSource, /ALLOWED_AUDIT_MODULE_SPECIFIERS/u);
    assert.match(capsuleSource, /rejected an undeclared module import/u);
    assert.match(capsuleSource, /denyUnboundFileSystemAccess/u);
    assert.match(capsuleSource, /Reflect\.ownKeys\(target\)/u);
    assert.match(
      capsuleSource,
      /replaceUnboundCallableExports\(fs,[\s\S]{0,180}?replaceUnboundCallableExports\(fsPromises,/u,
    );
    assert.match(capsuleSource, /replaceUnboundCallableExports\(process,/u);
    assert.match(capsuleSource, /controlledAuditExit/u);
    assert.match(capsuleSource, /assertCallableSurfaceConfined\(process,/u);
    assert.match(
      runnerSource,
      /let\s+auditFd\s*=\s*null[\s\S]{0,1600}?try\s*\{[\s\S]{0,900}?auditFd\s*=\s*openSync[\s\S]{0,900}?try\s*\{[\s\S]{0,900}?labFd\s*=\s*openSync[\s\S]{0,2400}?finally\s*\{[\s\S]{0,500}?labFd[\s\S]{0,900}?finally\s*\{[\s\S]{0,500}?auditFd/u,
      "nested descriptor ownership must close both inputs on every open/close edge",
    );
    assert.equal(typeof runExactBoundSignatureAudit, "function");
    assert.equal(typeof assertRootOwnedExecutableChain, "function");
    assert.equal(typeof executionCapsuleModulePath, "string");
  },
);
