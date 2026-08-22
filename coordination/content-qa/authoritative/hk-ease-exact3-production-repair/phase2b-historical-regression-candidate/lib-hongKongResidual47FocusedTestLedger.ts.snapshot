import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import nodeTest from "node:test";
import ts from "typescript";

import focusedTestLedgerJson from "../coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json";

type FocusedTestSuiteLedger = {
  sourcePath: string;
  suiteId: string;
  testNames: string[];
};

type FocusedTestLedger = {
  schemaVersion: string;
  canonicalSerialization: string;
  expectedSuiteCount: number;
  expectedFocusedTestCount: number;
  testNameSha256: string;
  suites: FocusedTestSuiteLedger[];
};

const ledger = focusedTestLedgerJson as FocusedTestLedger;
const ledgerRelativePath =
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json";

// These independent constants make fixture drift fail closed. Re-freezing the
// machine ledger requires an explicit reviewed update of both constants.
export const HONG_KONG_RESIDUAL47_FOCUSED_TEST_LEDGER_FILE_SHA256 =
  "8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0" as const;
export const HONG_KONG_RESIDUAL47_FOCUSED_TEST_NAME_SHA256 =
  "d89c4aee3a620ecf6c5ff150b4b29def12b5f53107b41a1478c2cfa2a6437bfd" as const;

const expectedKeys = ledger.suites.flatMap((suite) =>
  suite.testNames.map((testName) => `${suite.suiteId}\0${testName}`)
);
const expectedKeySet = new Set(expectedKeys);
const registeredKeys: string[] = [];

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalTestNameHash(keys: string[]) {
  return sha256(JSON.stringify([...keys].sort()));
}

export const HONG_KONG_RESIDUAL47_EXPECTED_FOCUSED_TEST_NAMES =
  ledger.suites[0]?.testNames as readonly string[];

/**
 * The only authorized node:test registrar for the residual47 repair suite. It
 * records real import-time registrations and rejects missing, unexpected, or
 * duplicate fully qualified names before any assertion can count as green.
 */
export function createHongKongResidual47Test(suiteId: string): typeof nodeTest {
  assert.ok(
    ledger.suites.some((suite) => suite.suiteId === suiteId),
    `unknown residual47 focused suite: ${suiteId}`
  );

  return ((...args: unknown[]) => {
    const testName = args[0];
    assert.equal(typeof testName, "string", `${suiteId}: focused tests require a literal string name`);
    const key = `${suiteId}\0${String(testName)}`;
    assert.ok(expectedKeySet.has(key), `${suiteId}: unexpected focused test registration: ${String(testName)}`);
    assert.equal(
      registeredKeys.includes(key),
      false,
      `${suiteId}: duplicate focused test registration: ${String(testName)}`
    );
    registeredKeys.push(key);
    return Reflect.apply(nodeTest, undefined, args);
  }) as typeof nodeTest;
}

function assertSourceUsesOnlyTrackedRegistrar(suite: FocusedTestSuiteLedger) {
  const absolutePath = join(process.cwd(), suite.sourcePath);
  const source = readFileSync(absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(
    absolutePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const sourceTestNames: string[] = [];
  let trackedRegistrarImports = 0;
  let trackedTestBindings = 0;
  const forbiddenNodeTestLoads: string[] = [];
  const forbiddenTestMethodCalls: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = node.moduleSpecifier.text;
      if (moduleName === "node:test" || moduleName === "node:test/promises") {
        forbiddenNodeTestLoads.push(`import:${moduleName}`);
      }
      const clause = node.importClause;
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          if ((element.propertyName ?? element.name).text === "createHongKongResidual47Test") {
            assert.equal(
              moduleName,
              "./hongKongResidual47FocusedTestLedger",
              `${suite.sourcePath}: tracked registrar must come from the canonical module`
            );
            trackedRegistrarImports += 1;
          }
        }
      }
    }

    if (ts.isCallExpression(node)) {
      const firstArgument = node.arguments[0];
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      if (
        (isRequire || isDynamicImport)
        && firstArgument
        && ts.isStringLiteral(firstArgument)
        && (firstArgument.text === "node:test" || firstArgument.text === "node:test/promises")
      ) {
        forbiddenNodeTestLoads.push(`${isRequire ? "require" : "import"}:${firstArgument.text}`);
      }

      if (ts.isIdentifier(node.expression) && node.expression.text === "test") {
        assert.ok(
          firstArgument && ts.isStringLiteral(firstArgument),
          `${suite.sourcePath}: every tracked test() name must be a string literal`
        );
        sourceTestNames.push(firstArgument.text);
      }
      if (
        ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && node.expression.expression.text === "test"
      ) {
        forbiddenTestMethodCalls.push(node.expression.name.text);
      }
    }

    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === "test"
      && node.initializer
      && ts.isCallExpression(node.initializer)
      && ts.isIdentifier(node.initializer.expression)
      && node.initializer.expression.text === "createHongKongResidual47Test"
    ) {
      trackedTestBindings += 1;
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  assert.deepEqual(
    forbiddenNodeTestLoads,
    [],
    `${suite.sourcePath}: direct node:test registration bypasses the durable ledger`
  );
  assert.deepEqual(
    forbiddenTestMethodCalls,
    [],
    `${suite.sourcePath}: test.skip/only/todo bypasses the exact runtime ledger`
  );
  assert.equal(trackedRegistrarImports, 1, `${suite.sourcePath}: import the tracked registrar exactly once`);
  assert.equal(trackedTestBindings, 1, `${suite.sourcePath}: bind test to the tracked registrar exactly once`);
  assert.deepEqual(sourceTestNames, suite.testNames, `${suite.sourcePath}: exact source test-name/order ledger drift`);
}

export function assertHongKongResidual47FocusedTestLedger(registeredSuiteId: string) {
  assert.equal(ledger.schemaVersion, "hk-residual47-focused-test-ledger-v1");
  assert.equal(
    ledger.canonicalSerialization,
    "SHA-256 of UTF-8 JSON.stringify(lexicographically sorted suiteId + U+0000 + testName strings)"
  );
  assert.equal(ledger.expectedSuiteCount, 1);
  assert.equal(ledger.expectedFocusedTestCount, 10);
  assert.equal(ledger.suites.length, ledger.expectedSuiteCount);
  assert.equal(expectedKeys.length, ledger.expectedFocusedTestCount);
  assert.equal(expectedKeySet.size, ledger.expectedFocusedTestCount, "ledger names must be unique");
  assert.equal(ledger.suites[0]?.suiteId, registeredSuiteId);
  assert.equal(ledger.suites[0]?.sourcePath, "lib/hongKongResidual47RepairContract.test.ts");

  const ledgerBytes = readFileSync(join(process.cwd(), ledgerRelativePath));
  assert.equal(sha256(ledgerBytes), HONG_KONG_RESIDUAL47_FOCUSED_TEST_LEDGER_FILE_SHA256);
  assert.equal(ledger.testNameSha256, HONG_KONG_RESIDUAL47_FOCUSED_TEST_NAME_SHA256);
  assert.equal(canonicalTestNameHash(expectedKeys), HONG_KONG_RESIDUAL47_FOCUSED_TEST_NAME_SHA256);

  assertSourceUsesOnlyTrackedRegistrar(ledger.suites[0]);
  assert.equal(registeredKeys.length, ledger.expectedFocusedTestCount);
  assert.equal(new Set(registeredKeys).size, ledger.expectedFocusedTestCount);
  assert.deepEqual(
    [...registeredKeys].sort(),
    [...expectedKeys].sort(),
    "runtime registrations must match the exact residual47 focused test-name ledger"
  );
}
