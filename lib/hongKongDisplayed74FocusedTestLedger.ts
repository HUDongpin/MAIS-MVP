import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import nodeTest from "node:test";
import ts from "typescript";
import focusedTestLedgerJson from "../coordination/content-qa/authoritative/2026-08-13-hk-displayed74-focused-test-ledger.json";

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
  "coordination/content-qa/authoritative/2026-08-13-hk-displayed74-focused-test-ledger.json";

// These constants intentionally live outside the JSON oracle. Changing the
// machine ledger requires an explicit reviewed re-freeze of both values.
export const HONG_KONG_DISPLAYED74_FOCUSED_TEST_LEDGER_FILE_SHA256 =
  "c676acf3931e4a59761cfc4f7249ebd7546fa144854c8ae89fdb59c4562e12fc" as const;
export const HONG_KONG_DISPLAYED74_FOCUSED_TEST_NAME_SHA256 =
  "3f0ec176d5c3ecdd216a1eaeb9d7fd3bda9a716796b9f28bf6b8f99529a386fd" as const;

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

export const HONG_KONG_DISPLAYED74_EXPECTED_FOCUSED_SUITE_IDS = ledger.suites.map(
  (suite) => suite.suiteId
) as readonly string[];

/**
 * The only authorized node:test registrar for the six canonical HK displayed74
 * contract suites. It records real import-time registrations and rejects an
 * unexpected or duplicate fully qualified test name before the suite can run.
 */
export function createHongKongDisplayed74Test(suiteId: string): typeof nodeTest {
  assert.ok(
    ledger.suites.some((suite) => suite.suiteId === suiteId),
    `unknown displayed74 focused suite: ${suiteId}`
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
  const expectedRegistrarModule = suite.sourcePath.startsWith("lib/server/")
    ? "../hongKongDisplayed74FocusedTestLedger"
    : "./hongKongDisplayed74FocusedTestLedger";

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = node.moduleSpecifier.text;
      if (moduleName === "node:test" || moduleName === "node:test/promises") {
        forbiddenNodeTestLoads.push(`import:${moduleName}`);
      }
      const clause = node.importClause;
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          if ((element.propertyName ?? element.name).text === "createHongKongDisplayed74Test") {
            assert.equal(
              moduleName,
              expectedRegistrarModule,
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
        (isRequire || isDynamicImport) &&
        firstArgument &&
        ts.isStringLiteral(firstArgument) &&
        (firstArgument.text === "node:test" || firstArgument.text === "node:test/promises")
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
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "test"
      ) {
        forbiddenTestMethodCalls.push(node.expression.name.text);
      }
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "test" &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "createHongKongDisplayed74Test"
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
    `${suite.sourcePath}: test.skip/only/todo bypasses the exact runtime registrar ledger`
  );
  assert.equal(
    trackedRegistrarImports,
    1,
    `${suite.sourcePath}: import the tracked registrar exactly once`
  );
  assert.equal(
    trackedTestBindings,
    1,
    `${suite.sourcePath}: bind test to the tracked registrar exactly once`
  );
  assert.deepEqual(
    sourceTestNames,
    suite.testNames,
    `${suite.sourcePath}: exact source test-name/order ledger drift`
  );
}

export function assertHongKongDisplayed74FocusedTestLedger(
  registeredSuiteIds: readonly string[]
) {
  assert.equal(ledger.schemaVersion, "hk-displayed74-focused-test-ledger-v1");
  assert.equal(
    ledger.canonicalSerialization,
    "SHA-256 of UTF-8 JSON.stringify(lexicographically sorted suiteId + U+0000 + testName strings)"
  );
  assert.equal(ledger.expectedSuiteCount, 6);
  assert.equal(ledger.expectedFocusedTestCount, 57);
  assert.equal(ledger.suites.length, ledger.expectedSuiteCount);
  assert.equal(expectedKeys.length, ledger.expectedFocusedTestCount);
  assert.equal(expectedKeySet.size, ledger.expectedFocusedTestCount, "ledger names must be unique per suite");
  assert.equal(new Set(ledger.suites.map((suite) => suite.suiteId)).size, ledger.expectedSuiteCount);
  assert.equal(new Set(ledger.suites.map((suite) => suite.sourcePath)).size, ledger.expectedSuiteCount);

  const ledgerBytes = readFileSync(join(process.cwd(), ledgerRelativePath));
  assert.equal(sha256(ledgerBytes), HONG_KONG_DISPLAYED74_FOCUSED_TEST_LEDGER_FILE_SHA256);
  assert.equal(ledger.testNameSha256, HONG_KONG_DISPLAYED74_FOCUSED_TEST_NAME_SHA256);
  assert.equal(canonicalTestNameHash(expectedKeys), HONG_KONG_DISPLAYED74_FOCUSED_TEST_NAME_SHA256);

  assert.deepEqual(
    [...registeredSuiteIds].sort(),
    [...HONG_KONG_DISPLAYED74_EXPECTED_FOCUSED_SUITE_IDS].sort(),
    "the canonical entry must import the exact six focused suites"
  );
  assert.equal(new Set(registeredSuiteIds).size, ledger.expectedSuiteCount);

  for (const suite of ledger.suites) assertSourceUsesOnlyTrackedRegistrar(suite);

  assert.equal(registeredKeys.length, ledger.expectedFocusedTestCount);
  assert.equal(new Set(registeredKeys).size, ledger.expectedFocusedTestCount);
  assert.deepEqual(
    [...registeredKeys].sort(),
    [...expectedKeys].sort(),
    "runtime registrations must match the exact focused test-name ledger"
  );
}
