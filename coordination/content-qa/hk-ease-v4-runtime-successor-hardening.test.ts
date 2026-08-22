import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { pathToFileURL } from "node:url";

import sanitizedInputJson from
  "./authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json";
import supplementJson from
  "./authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json";
import type {
  HongKongEaseV4DerivationRow,
  HongKongEaseV4DerivationSupplement
} from "./build-hk-ease-independent-oracle-v4-supplement";
import type { HongKongEaseV4SanitizedInput } from "./build-hk-ease-derivation-input-v4";
import {
  validateHongKongEaseV4DerivationRow,
  validateHongKongEaseV4DerivationSupplement
} from "../../lib/hongKongEaseIndependentOracleV4";

type JsonRecord = Record<string, any>;

const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-v4-runtime-successor-provenance.ts";
const HARDENING_TEST_PATH =
  "coordination/content-qa/hk-ease-v4-runtime-successor-hardening.test.ts";
const PREDECESSOR_RUNTIME_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/exact26-frozen-coordinates/sha256/697c62f2433bf03ca0d9296dd66a90e441fed22a904f55ca2cdb074f49ffa2c1.ts.snapshot";
const LIVE_RUNTIME_PATH = "lib/hongKongEaseIndependentOracleV4.ts";
const SUCCESSOR_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-runtime-successor-provenance";
const SUCCESSOR_SNAPSHOT_PATH =
  `${SUCCESSOR_DIRECTORY}/sha256/11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c.ts.snapshot`;
const AUTHORITY_PATH = `${SUCCESSOR_DIRECTORY}/v4-runtime-successor-authority-v1.json`;
const PREDECESSOR_SHA256 =
  "697c62f2433bf03ca0d9296dd66a90e441fed22a904f55ca2cdb074f49ffa2c1";
const SUCCESSOR_SHA256 =
  "11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c";
const SUPPLEMENT_SHA256 =
  "6322b360ff71778fb7611190b7bf5a0a8f4be64287e2c5b3e7744ece4e3e57c6";
const PREDECESSOR_TEST_SHA256 =
  "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472";
const SOURCE_CLASSIFICATION =
  "pre-existing-unattributed-postimage-adopted-only-after-independent-review";

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

function exactUnifiedDiffSummary() {
  const result = spawnSync(
    "diff",
    [
      "-U0",
      resolve(process.cwd(), PREDECESSOR_RUNTIME_PATH),
      resolve(process.cwd(), LIVE_RUNTIME_PATH)
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1, "the exact predecessor and successor must differ");
  const headers = [...result.stdout.matchAll(
    /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/gm
  )];
  const count = (value: string | undefined) => value === undefined ? 1 : Number(value);
  return {
    hunkCount: headers.length,
    additions: headers.reduce((sum, match) => sum + count(match[2]), 0),
    deletions: headers.reduce((sum, match) => sum + count(match[1]), 0)
  };
}

const sanitized = sanitizedInputJson as HongKongEaseV4SanitizedInput;
const supplement = supplementJson as HongKongEaseV4DerivationSupplement;

const rowByBaseId = (baseId: string) => {
  const row = supplement.rows.find((candidate) => candidate.baseId === baseId);
  assert.ok(row, `${baseId}: missing baseline row`);
  return structuredClone(row);
};

const sourceFor = (row: HongKongEaseV4DerivationRow) => {
  const source = sanitized.rows[row.index];
  assert.equal(source?.baseId, row.baseId);
  return source;
};

const rehashRow = (row: HongKongEaseV4DerivationRow) => {
  const { derivationPayloadSha256: _oldHash, ...payload } = row;
  row.derivationPayloadSha256 = sha256(JSON.stringify(payload));
};

const expectRowRejection = (
  row: HongKongEaseV4DerivationRow,
  expected: RegExp,
  label: string
) => {
  assert.throws(
    () => validateHongKongEaseV4DerivationRow(sourceFor(row), row),
    expected,
    label
  );
};

const starshipTmpRoot = () => {
  assert.ok(process.env.TMPDIR, "a unique Starship TMPDIR is required");
  const physical = realpathSync(process.env.TMPDIR);
  assert.match(physical, /^\/Volumes\/Starship\//);
  return physical;
};

type InstrumentedRuntime = {
  validateHongKongEaseV4DerivationRow: typeof validateHongKongEaseV4DerivationRow;
  __predecessorDeepEqualJson?: (left: unknown, right: unknown) => boolean;
  __successorExactStrictJsonDataEqual?: (left: unknown, right: unknown) => boolean;
};

async function loadInstrumentedRuntimes() {
  const fixtureRoot = mkdtempSync(join(starshipTmpRoot(), "v4-runtime-successor-instrumented-"));
  const predecessorPath = join(fixtureRoot, "predecessor.ts");
  const successorPath = join(fixtureRoot, "successor.ts");
  writeFileSync(
    predecessorPath,
    `${readFileSync(resolve(process.cwd(), PREDECESSOR_RUNTIME_PATH), "utf8")}\nexport { deepEqualJson as __predecessorDeepEqualJson };\n`,
    { flag: "wx" }
  );
  writeFileSync(
    successorPath,
    `${readFileSync(resolve(process.cwd(), LIVE_RUNTIME_PATH), "utf8")}\nexport { exactStrictJsonDataEqual as __successorExactStrictJsonDataEqual };\n`,
    { flag: "wx" }
  );
  try {
    const nonce = `${process.pid}-${Date.now()}`;
    const predecessor = await import(
      `${pathToFileURL(predecessorPath).href}?instrumented=${nonce}`
    ) as InstrumentedRuntime;
    const successor = await import(
      `${pathToFileURL(successorPath).href}?instrumented=${nonce}`
    ) as InstrumentedRuntime;
    return { predecessor, successor };
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: false });
  }
}

test("the V4 runtime successor provenance authority and content-addressed bytes are deterministic", async () => {
  assert.equal(existsSync(resolve(process.cwd(), BUILDER_PATH)), true, "successor builder missing");
  if (!existsSync(resolve(process.cwd(), BUILDER_PATH))) return;
  const authority = JSON.parse(readFileSync(resolve(process.cwd(), AUTHORITY_PATH), "utf8"));
  const exactDiff = exactUnifiedDiffSummary();
  assert.deepEqual(exactDiff, { hunkCount: 21, additions: 568, deletions: 20 });
  assert.deepEqual(
    {
      hunkCount: authority.exactDiff.hunkCount,
      additions: authority.exactDiff.additions,
      deletions: authority.exactDiff.deletions
    },
    exactDiff,
    "authority diff counts must be recomputed from the exact 697c and 11c byte images"
  );
  const builder = await import(pathToFileURL(resolve(process.cwd(), BUILDER_PATH)).href) as {
    HK_EASE_V4_RUNTIME_SUCCESSOR_OUTPUT_PATHS: readonly string[];
    serializeHongKongEaseV4RuntimeSuccessorProvenance: (
      repositoryRoot: string
    ) => Record<string, string | Buffer>;
  };
  assert.deepEqual(builder.HK_EASE_V4_RUNTIME_SUCCESSOR_OUTPUT_PATHS, [
    SUCCESSOR_SNAPSHOT_PATH,
    AUTHORITY_PATH
  ]);
  const first = builder.serializeHongKongEaseV4RuntimeSuccessorProvenance(process.cwd());
  const second = builder.serializeHongKongEaseV4RuntimeSuccessorProvenance(process.cwd());
  assert.deepEqual(second, first);
  for (const path of builder.HK_EASE_V4_RUNTIME_SUCCESSOR_OUTPUT_PATHS) {
    const absolutePath = resolve(process.cwd(), path);
    assert.equal(existsSync(absolutePath), true, `${path}: missing checked-in output`);
    if (!existsSync(absolutePath)) continue;
    assert.equal(lstatSync(absolutePath).isSymbolicLink(), false);
    assert.equal(statSync(absolutePath).mode & 0o777, 0o444);
    const expected = first[path];
    const actual = readFileSync(absolutePath);
    assert.deepEqual(actual, Buffer.isBuffer(expected) ? expected : Buffer.from(expected));
  }
  assert.equal(sha256(readFileSync(resolve(process.cwd(), SUCCESSOR_SNAPSHOT_PATH))), SUCCESSOR_SHA256);
  assert.deepEqual(
    readFileSync(resolve(process.cwd(), SUCCESSOR_SNAPSHOT_PATH)),
    readFileSync(resolve(process.cwd(), LIVE_RUNTIME_PATH))
  );
  const payload = { ...authority };
  delete payload.authorityPayloadSha256;
  assert.equal(authority.authorityPayloadSha256, sha256(JSON.stringify(payload)));
  assert.equal(authority.sourceClassification, SOURCE_CLASSIFICATION);
  assert.equal(authority.predecessor.sha256, PREDECESSOR_SHA256);
  assert.equal(authority.successor.sha256, SUCCESSOR_SHA256);
  assert.equal(authority.successor.byteLength, 210_235);
  assert.equal(authority.supplement.sha256, SUPPLEMENT_SHA256);
  assert.equal(authority.predecessorFocusedTest.sha256, PREDECESSOR_TEST_SHA256);
  assert.equal(authority.review.acceptanceExpansionPolicy,
    "only-plain-JSON-object-key-order-is-relaxed-arrays-order-and-values-remain-strict");
  assert.equal(authority.promotion.status, "hold-not-authorized-for-production-cascade");
});

test("the current 11c validator accepts all exact 701 rows in the frozen 6322 supplement", () => {
  validateHongKongEaseV4DerivationSupplement(sanitized, supplement);
  let positiveCount = 0;
  for (let index = 0; index < 701; index += 1) {
    validateHongKongEaseV4DerivationRow(sanitized.rows[index], supplement.rows[index]);
    positiveCount += 1;
  }
  assert.equal(positiveCount, 701);
});

test("the 11c validator rejects exotic data shapes, unregistered operations, and schema drift", () => {
  {
    const row = rowByBaseId("hk-ease-10629");
    Object.setPrototypeOf(row.steps[0].parameters, { inherited: true });
    expectRowRejection(row, /V4_STEP_INPUT_BINDING_INVALID/, "exotic prototype must reject");
  }
  {
    const row = rowByBaseId("hk-ease-10629");
    (row.steps[0].parameters as JsonRecord)[Symbol("hidden") as any] = true;
    expectRowRejection(row, /V4_STEP_INPUT_BINDING_INVALID/, "symbol key must reject");
  }
  {
    const row = rowByBaseId("hk-ease-10629");
    const parameters = row.steps[0].parameters as JsonRecord;
    const expression = parameters.expression;
    Object.defineProperty(parameters, "expression", {
      enumerable: true,
      configurable: true,
      get: () => expression
    });
    expectRowRejection(row, /V4_STEP_INPUT_BINDING_INVALID/, "accessor must reject");
  }
  {
    const row = rowByBaseId("hk-ease-10629");
    Object.defineProperty(row.steps[0].parameters, "hidden", {
      enumerable: false,
      configurable: true,
      value: true
    });
    expectRowRejection(row, /V4_STEP_INPUT_BINDING_INVALID/, "non-enumerable key must reject");
  }
  {
    const row = rowByBaseId("hk-ease-10629");
    row.steps[0].inputFactIds = new Array(1) as string[];
    expectRowRejection(row, /V4_STEP_EXECUTION_INVALID/, "sparse array must reject");
  }
  {
    const row = rowByBaseId("hk-ease-10629");
    const ast = (row.steps[0].parameters as JsonRecord).ast;
    ast.cycle = ast;
    expectRowRejection(row, /V4_STEP_EXECUTION_INVALID/, "cycle must reject");
  }
  {
    const row = rowByBaseId("hk-ease-10629");
    (row.steps[0].output as JsonRecord).operationTrace.push(Number.POSITIVE_INFINITY);
    expectRowRejection(row, /V4_STEP_EXECUTION_INVALID/, "non-finite number must reject");
  }
  {
    const row = rowByBaseId("hk-ease-10629");
    row.steps[0].operation = "unknown-operation" as never;
    rehashRow(row);
    expectRowRejection(row, /V4_STEP_EXECUTION_INVALID/, "unknown operation must reject");
  }
  {
    const row = rowByBaseId("hk-ease-10629");
    (row.steps[0].parameters as JsonRecord).unexecuted = true;
    expectRowRejection(row, /V4_STEP_INPUT_BINDING_INVALID/, "parameter schema drift must reject");
  }
  {
    const row = rowByBaseId("hk-ease-10629");
    (row.steps[0].output as JsonRecord).unexecuted = true;
    expectRowRejection(row, /V4_STEP_OUTPUT_INVALID/, "output schema drift must reject");
  }
});

test("the 11c validator binds factor payloads and select-unique-option consumption", () => {
  {
    const row = rowByBaseId("hk-ease-303");
    const step = row.steps.find((candidate) =>
      candidate.operation === "evaluate-rational-expression" &&
      Array.isArray((candidate.output as JsonRecord).primeFactorization)
    );
    assert.ok(step);
    (step.output as JsonRecord).primeFactorization[0].prime = "11";
    rehashRow(row);
    expectRowRejection(row, /V4_STEP_OUTPUT_INVALID/, "factor payload must equal replayed value");
  }
  {
    const row = rowByBaseId("hk-ease-10589");
    const step = row.steps.find((candidate) => candidate.operation === "select-unique-option");
    assert.ok(step);
    assert.ok(step.inputStepIds.length > 1);
    step.inputStepIds = [step.inputStepIds[0]];
    rehashRow(row);
    expectRowRejection(
      row,
      /V4_STEP_INPUT_BINDING_INVALID/,
      "selector must consume every option fact or every prior comparison step"
    );
  }
});

test("plain-object key reorder is the sole equality relaxation while arrays and values stay strict", async () => {
  const { predecessor, successor } = await loadInstrumentedRuntimes();
  assert.equal(typeof predecessor.__predecessorDeepEqualJson, "function");
  assert.equal(typeof successor.__successorExactStrictJsonDataEqual, "function");
  const oldEqual = predecessor.__predecessorDeepEqualJson!;
  const strictEqual = successor.__successorExactStrictJsonDataEqual!;

  assert.equal(oldEqual({ numerator: "245", denominator: "1" }, {
    denominator: "1", numerator: "245"
  }), false, "697c treated plain-object key order as semantic");
  assert.equal(strictEqual({ numerator: "245", denominator: "1" }, {
    denominator: "1", numerator: "245"
  }), true, "11c intentionally relaxes only plain-object key order");
  assert.equal(strictEqual(["a", "b"], ["b", "a"]), false);
  assert.equal(strictEqual({ value: "1" }, { value: "2" }), false);
  assert.equal(oldEqual({ value: +0 }, { value: -0 }), true, "JSON equality conflated signed zero");
  assert.equal(strictEqual({ value: +0 }, { value: -0 }), false, "11c must preserve signed-zero values");

  const reordered = rowByBaseId("hk-ease-10629");
  const reorderedOutput = reordered.steps[0].output as JsonRecord;
  const oldValue = reorderedOutput.value;
  reorderedOutput.value = {
    denominator: oldValue.denominator,
    numerator: oldValue.numerator
  };
  rehashRow(reordered);
  assert.doesNotThrow(() =>
    validateHongKongEaseV4DerivationRow(sourceFor(reordered), reordered));
  assert.throws(
    () => predecessor.validateHongKongEaseV4DerivationRow(sourceFor(reordered), reordered),
    /V4_STEP_EXECUTION_INVALID/,
    "697c must reject the key-reordered equivalent that 11c intentionally accepts"
  );

  const arrayReordered = rowByBaseId("hk-ease-10629");
  const trace = (arrayReordered.steps[0].output as JsonRecord).operationTrace;
  [trace[0], trace[1]] = [trace[1], trace[0]];
  rehashRow(arrayReordered);
  expectRowRejection(arrayReordered, /V4_STEP_EXECUTION_INVALID/, "array order must remain strict");

  const valueChanged = rowByBaseId("hk-ease-10629");
  (valueChanged.steps[0].output as JsonRecord).value.numerator = "246";
  rehashRow(valueChanged);
  expectRowRejection(valueChanged, /V4_STEP_EXECUTION_INVALID/, "values must remain strict");
});

test("the hardening test itself is bound to the observed predecessor and successor bytes", () => {
  assert.equal(sha256(readFileSync(resolve(process.cwd(), PREDECESSOR_RUNTIME_PATH))), PREDECESSOR_SHA256);
  assert.equal(sha256(readFileSync(resolve(process.cwd(), LIVE_RUNTIME_PATH))), SUCCESSOR_SHA256);
  assert.equal(sha256(readFileSync(resolve(
    process.cwd(),
    "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json"
  ))), SUPPLEMENT_SHA256);
  assert.equal(sha256(readFileSync(resolve(
    process.cwd(),
    "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/exact26-frozen-coordinates/sha256/cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472.ts.snapshot"
  ))), PREDECESSOR_TEST_SHA256);
  assert.equal(existsSync(resolve(process.cwd(), HARDENING_TEST_PATH)), true);
});
