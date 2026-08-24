import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] as const;
const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".tmp",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
]);
const BANNED_PACKAGES = [
  "@cortex-js/compute-engine",
  "@mais/math-kernel/server",
  "server-only",
] as const;

function sourceFilesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const output: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        output.push(...sourceFilesUnder(join(directory, entry.name)));
      }
      continue;
    }
    if (
      entry.isFile() &&
      SOURCE_EXTENSIONS.includes(extname(entry.name) as (typeof SOURCE_EXTENSIONS)[number]) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx")
    ) {
      output.push(join(directory, entry.name));
    }
  }
  return output;
}

function parse(file: string): ts.SourceFile {
  const scriptKind = file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
}

function isClientEntry(file: string): boolean {
  const source = parse(file);
  return source.statements.some(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression) &&
      statement.expression.text === "use client",
  );
}

function moduleSpecifiers(file: string): string[] {
  const output: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      output.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      output.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(parse(file));
  return output;
}

function resolveSourceImport(importer: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? resolve(ROOT, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(importer), specifier)
      : null;
  if (base === null) return null;
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => join(base, `index${extension}`)),
  ];
  return candidates.find(
    (candidate) =>
      existsSync(candidate) &&
      statSync(candidate).isFile() &&
      SOURCE_EXTENSIONS.includes(extname(candidate) as (typeof SOURCE_EXTENSIONS)[number]),
  ) ?? null;
}

function displayPath(file: string): string {
  return normalize(relative(ROOT, file));
}

test("every use-client and math-scene-adapter graph excludes CAS, server modules, and kernel test fixtures", () => {
  const clientEntries = ["app", "components", "lib"]
    .flatMap((directory) => sourceFilesUnder(resolve(ROOT, directory)))
    .filter(isClientEntry)
    .sort();
  assert.ok(clientEntries.length > 0, "Expected at least one use-client source entry.");
  const adapterEntries = [
    "components/visualizations/three/manim/mathKernelSceneAdapter.ts",
    "components/visualizations/three/manim/mathKernelDemoScenes.ts",
  ].map((file) => resolve(ROOT, file));
  for (const entry of adapterEntries) {
    assert.equal(existsSync(entry), true, `Missing client-safe adapter entry ${displayPath(entry)}`);
  }
  const entries = [...new Set([...clientEntries, ...adapterEntries])].sort();

  const violations: string[] = [];
  for (const entry of entries) {
    const pending: { file: string; chain: string[] }[] = [
      { file: entry, chain: [displayPath(entry)] },
    ];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (visited.has(current.file)) continue;
      visited.add(current.file);
      for (const specifier of moduleSpecifiers(current.file)) {
        const nextChain = [...current.chain, specifier];
        if (
          BANNED_PACKAGES.some(
            (name) => specifier === name || specifier.startsWith(`${name}/`),
          )
        ) {
          violations.push(`${nextChain.join(" -> ")} [server/CAS package]`);
          continue;
        }
        if (/(?:^|\/)\w+\.server(?:\.|\/|$)/.test(specifier)) {
          violations.push(`${nextChain.join(" -> ")} [.server import]`);
          continue;
        }
        const resolved = resolveSourceImport(current.file, specifier);
        if (resolved === null) continue;
        const displayed = displayPath(resolved);
        if (
          /(?:^|\/)test-fixtures(?:\/|$)/.test(displayed) ||
          /(?:\.test|\.spec)\.[cm]?[jt]sx?$/.test(displayed)
        ) {
          violations.push(`${nextChain.join(" -> ")} -> ${displayed} [test-only source]`);
          continue;
        }
        if (/(?:^|\/)\w+\.server(?:\.|\/|$)/.test(displayed)) {
          violations.push(`${nextChain.join(" -> ")} -> ${displayed} [.server module]`);
          continue;
        }
        pending.push({ file: resolved, chain: [...current.chain, displayed] });
      }
    }
  }

  assert.deepEqual(violations, []);
});
