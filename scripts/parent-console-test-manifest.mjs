import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

// Keep execution explicit: discovery is a tripwire for newly added parent tests,
// never an instruction to run an unreviewed file automatically.
export const parentDomainTestFiles = Object.freeze([
  "components/parent/parentErrorAnnouncements.test.ts",
  "lib/server/userStoreParentAccessPersistence.test.ts",
  "lib/server/userStoreParentFoundationPersistence.test.ts",
  "lib/server/userStoreParentMessagePersistence.test.ts",
  "lib/server/userStoreParentNoticePersistence.test.ts",
  "lib/server/userStoreParentReportPersistence.test.ts"
]);

// These four pre-existing prerequisites belonged to test:parent-console before
// the parent-domain expansion. Preserve them so widening the gate cannot reduce
// coverage elsewhere.
export const parentConsoleSupportTestFiles = Object.freeze([
  "lib/server/authRouteGuards.test.ts",
  "lib/server/contentSafetySeed.test.ts",
  "lib/server/questionStore.test.ts",
  "app/api/questions/routeQuestionStore.test.ts"
]);

export const parentConsoleTestFiles = Object.freeze([
  ...parentConsoleSupportTestFiles,
  ...parentDomainTestFiles
]);

export const expectedParentDomainTestCount = 49;
export const expectedParentConsoleSupportTestCount = 12;
export const expectedParentConsoleTestCount = 61;

function repoRelativeFilesBelow(repoRoot, relativeRoot, predicate) {
  const absoluteRoot = path.join(repoRoot, relativeRoot);
  if (!existsSync(absoluteRoot)) return [];

  const results = [];
  const visit = (absoluteDirectory) => {
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const absoluteEntry = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(absoluteEntry);
      } else if (entry.isFile()) {
        const relativeEntry = path.relative(repoRoot, absoluteEntry).replaceAll(path.sep, "/");
        if (predicate(relativeEntry)) results.push(relativeEntry);
      }
    }
  };
  visit(absoluteRoot);
  return results;
}

export function discoverParentDomainTestFiles(repoRoot) {
  const discovered = [
    ...repoRelativeFilesBelow(
      repoRoot,
      "app/api/parent",
      (relativePath) => /\.test\.(?:ts|tsx)$/u.test(relativePath)
    ),
    ...repoRelativeFilesBelow(
      repoRoot,
      "app/parent",
      (relativePath) => /\.test\.(?:ts|tsx)$/u.test(relativePath)
    ),
    ...repoRelativeFilesBelow(
      repoRoot,
      "components/parent",
      (relativePath) => /\.test\.(?:ts|tsx)$/u.test(relativePath)
    ),
    ...repoRelativeFilesBelow(
      repoRoot,
      "lib/server",
      (relativePath) => /^lib\/server\/userStoreParent[^/]*\.test\.(?:ts|tsx)$/u.test(relativePath)
    ),
    ...repoRelativeFilesBelow(
      repoRoot,
      "lib/server/userStore/parent",
      (relativePath) => /\.test\.(?:ts|tsx)$/u.test(relativePath)
    )
  ];
  return Array.from(new Set(discovered)).sort();
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((entry) => !rightSet.has(entry));
}

export function assertParentConsoleTestManifest(repoRoot) {
  const discovered = discoverParentDomainTestFiles(repoRoot);
  const unlisted = difference(discovered, parentDomainTestFiles);
  const stale = difference(parentDomainTestFiles, discovered);
  const missingSupportFiles = parentConsoleSupportTestFiles.filter(
    (relativePath) => !existsSync(path.join(repoRoot, relativePath))
  );
  const duplicateFiles = parentConsoleTestFiles.filter(
    (relativePath, index) => parentConsoleTestFiles.indexOf(relativePath) !== index
  );

  if (unlisted.length || stale.length || missingSupportFiles.length || duplicateFiles.length) {
    throw new Error([
      "Parent console test manifest is out of date.",
      `Unlisted parent-domain tests: ${unlisted.join(", ") || "none"}`,
      `Stale parent-domain entries: ${stale.join(", ") || "none"}`,
      `Missing support tests: ${missingSupportFiles.join(", ") || "none"}`,
      `Duplicate entries: ${duplicateFiles.join(", ") || "none"}`
    ].join("\n"));
  }
}
