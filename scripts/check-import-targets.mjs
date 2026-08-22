#!/usr/bin/env node

import { execFile } from "node:child_process";
import { access, readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const execFileAsync = promisify(execFile);

const DEFAULT_GIT_PATHS = [
  "app",
  "components",
  "data",
  "lib",
  "scripts",
  "tests",
  "types",
  "proxy.ts",
  "next.config.ts",
  "playwright.config.ts",
  "postcss.config.mjs",
  "tailwind.config.ts"
];

const SOURCE_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const COMMONJS_EXTENSIONS = new Set([".cjs", ".js"]);
const RESOLUTION_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
const SKIPPED_DIRECTORIES = new Set([".git", ".next", ".tmp", "node_modules"]);

function isSourceFile(filePath) {
  return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

function normalizeSpecifier(specifier) {
  return specifier.split(/[?#]/, 1)[0];
}

function isLocalSpecifier(specifier) {
  return specifier.startsWith("@/") || specifier.startsWith(".");
}

function collectImportSpecifiers(source, importerPath) {
  const sourceFile = ts.createSourceFile(
    importerPath,
    source,
    ts.ScriptTarget.Latest,
    true
  );
  const specifiers = [];
  const isCommonJsImporter = COMMONJS_EXTENSIONS.has(path.extname(importerPath));

  function addLiteralSpecifier(node) {
    if (node && ts.isStringLiteralLike(node)) {
      specifiers.push(node.text);
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addLiteralSpecifier(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addLiteralSpecifier(node.moduleReference.expression);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addLiteralSpecifier(node.arguments[0]);
      } else if (
        isCommonJsImporter &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      ) {
        addLiteralSpecifier(node.arguments[0]);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return specifiers;
}

function isProperlyContained(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function isInsideSkippedDirectory(rootPath, candidatePath) {
  const [firstSegment] = path.relative(rootPath, candidatePath).split(path.sep);
  return SKIPPED_DIRECTORIES.has(firstSegment);
}

async function isFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function buildCandidatePaths(basePath) {
  return [
    basePath,
    ...RESOLUTION_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...RESOLUTION_EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`))
  ];
}

async function resolveLocalImportTarget({ rootDir, canonicalRootDir, importerPath, specifier }) {
  const normalizedSpecifier = normalizeSpecifier(specifier);
  const basePath = normalizedSpecifier.startsWith("@/")
    ? path.join(rootDir, normalizedSpecifier.slice(2))
    : path.resolve(path.dirname(importerPath), normalizedSpecifier);

  if (!isProperlyContained(rootDir, basePath)) {
    return { reason: "target-outside-root", targetPath: null };
  }

  // Targets inside generated directories (.tmp, .next) are build artifacts
  // that only exist mid-run (e.g. scripts/adaptive-eval.mjs imports the
  // compiled output of eval:adaptive), so they can never resolve in a clean
  // checkout.
  if (isInsideSkippedDirectory(rootDir, basePath)) {
    return { reason: "target-in-generated-directory", targetPath: null };
  }

  for (const candidatePath of buildCandidatePaths(basePath)) {
    if (!isProperlyContained(rootDir, candidatePath)) {
      return { reason: "target-outside-root", targetPath: null };
    }

    if (!(await isFile(candidatePath))) {
      continue;
    }

    const canonicalCandidatePath = await realpath(candidatePath);
    if (!isProperlyContained(canonicalRootDir, canonicalCandidatePath)) {
      return { reason: "target-outside-root", targetPath: null };
    }

    return { reason: null, targetPath: candidatePath };
  }

  return { reason: null, targetPath: null };
}

async function listGitSourceFiles(rootDir) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...DEFAULT_GIT_PATHS],
      {
        cwd: rootDir,
        maxBuffer: 1024 * 1024 * 20
      }
    );

    return [
      ...new Set(stdout.split("\0").filter((filePath) => filePath && isSourceFile(filePath)))
    ];
  } catch {
    return null;
  }
}

async function listSourceFilesRecursively(rootDir, currentDir = rootDir) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const sourceFiles = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        sourceFiles.push(...(await listSourceFilesRecursively(rootDir, absolutePath)));
      }
      continue;
    }

    if (entry.isFile() && isSourceFile(entry.name)) {
      sourceFiles.push(path.relative(rootDir, absolutePath));
    }
  }

  return sourceFiles;
}

async function listSourceFiles(rootDir) {
  const gitFiles = await listGitSourceFiles(rootDir);
  if (gitFiles) {
    return gitFiles;
  }
  return listSourceFilesRecursively(rootDir);
}

async function assertRootExists(rootDir) {
  await access(rootDir);
}

export async function findMissingLocalImportTargets({ rootDir = process.cwd(), filePaths } = {}) {
  const resolvedRootDir = path.resolve(rootDir);
  await assertRootExists(resolvedRootDir);
  const canonicalRootDir = await realpath(resolvedRootDir);

  const sourceFiles = filePaths ?? (await listSourceFiles(resolvedRootDir));
  const missingTargets = [];

  for (const sourceFile of sourceFiles) {
    if (!isSourceFile(sourceFile)) {
      continue;
    }

    const importerPath = path.resolve(resolvedRootDir, sourceFile);
    const importer = path.relative(resolvedRootDir, importerPath);
    if (!isProperlyContained(resolvedRootDir, importerPath)) {
      missingTargets.push({
        importer,
        specifier: "",
        reason: "importer-outside-root"
      });
      continue;
    }

    if (!(await isFile(importerPath))) {
      continue;
    }

    const canonicalImporterPath = await realpath(importerPath);
    if (!isProperlyContained(canonicalRootDir, canonicalImporterPath)) {
      missingTargets.push({
        importer,
        specifier: "",
        reason: "importer-outside-root"
      });
      continue;
    }

    const source = await readFile(importerPath, "utf8");

    for (const specifier of collectImportSpecifiers(source, importerPath)) {
      if (!isLocalSpecifier(specifier)) {
        continue;
      }

      const resolution = await resolveLocalImportTarget({
        rootDir: resolvedRootDir,
        canonicalRootDir,
        importerPath,
        specifier
      });

      if (resolution.reason === "target-in-generated-directory") {
        continue;
      }

      if (!resolution.targetPath) {
        const missingTarget = { importer, specifier };
        if (resolution.reason) {
          missingTarget.reason = resolution.reason;
        }
        missingTargets.push(missingTarget);
      }
    }
  }

  return missingTargets;
}

async function main() {
  const missingTargets = await findMissingLocalImportTargets();

  if (missingTargets.length === 0) {
    console.log("All local import targets resolved.");
    return;
  }

  console.error("Missing local import targets:");
  for (const entry of missingTargets) {
    if (entry.reason === "importer-outside-root") {
      console.error(`- rejected importer outside repository: ${entry.importer}`);
    } else if (entry.reason === "target-outside-root") {
      console.error(`- ${entry.importer} imports ${entry.specifier} (target outside repository)`);
    } else {
      console.error(`- ${entry.importer} imports ${entry.specifier}`);
    }
  }
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
