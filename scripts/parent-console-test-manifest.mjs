import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

// Keep execution explicit: discovery is a tripwire for newly added parent tests,
// never an instruction to run an unreviewed file automatically.
export const parentDomainTestFiles = Object.freeze([
  "app/api/parent/parentChildSummaryAdminBoundary.test.ts",
  "app/api/parent/parentMessageRoutes.test.ts",
  "app/api/parent/parentNoticeAckRoute.test.ts",
  "app/api/parent/parentPrivacyRoutes.test.ts",
  "app/parent/parentRscSafeBoundary.test.ts",
  "components/parent/parentErrorAnnouncements.test.ts",
  "components/parent/parentMessageUi.test.ts",
  "lib/server/userStore/parentPostgresScopedMutationCapability.test.ts",
  "lib/server/userStore/parentPostgresScopedMutations.test.ts",
  "lib/server/userStoreParentAccessPersistence.test.ts",
  "lib/server/userStoreParentFoundationPersistence.test.ts",
  "lib/server/userStoreParentMessagePersistence.test.ts",
  "lib/server/userStoreParentNoticePersistence.test.ts",
  "lib/server/userStoreParentPostgresScopedCollections.test.ts",
  "lib/server/userStoreParentPostgresScopedReads.test.ts",
  "lib/server/userStoreParentReportPersistence.test.ts",
  "lib/server/userStoreParentSafeDto.test.ts"
]);

// Preserve the original four prerequisites and the shared language-selector
// keyboard contract so widening the gate cannot reduce supporting coverage.
export const parentConsoleSupportTestFiles = Object.freeze([
  "lib/server/authRouteGuards.test.ts",
  "lib/server/contentSafetySeed.test.ts",
  "lib/server/questionStore.test.ts",
  "app/api/questions/routeQuestionStore.test.ts",
  "components/ui/LanguageToggle.test.ts"
]);

// These tests own the P0/P1 authorization and lifecycle contracts that the
// parent console depends on but that deliberately live outside parent-named
// modules: teacher report authorization, guardian invitation rotation, and
// revocable authentication sessions (including the real SQLite process races).
export const parentSecurityLifecycleTestFiles = Object.freeze([
  "app/api/attempts/routeSessionRevision.test.ts",
  "app/api/auth/logout-all/route.test.ts",
  "app/api/auth/password-change/routeSessionRevision.test.ts",
  "app/api/auth/password-reset/confirm/routeSessionRevision.test.ts",
  "app/api/auth/sessionIssuanceRoutes.test.ts",
  "app/api/guardianInvitationRoutes.test.ts",
  "app/api/teacher/teacherReportPreviewRoute.test.ts",
  "components/teacher/GuardianAccessControls.test.ts",
  "components/teacher/teacherReportFormState.test.ts",
  "lib/server/sessionCookie.test.ts",
  "lib/server/userStoreAuthSessionPersistence.test.ts",
  "lib/server/userStoreGuardianInvitationPersistence.test.ts",
  "lib/server/userStoreSessionRevisionPostgres.test.ts",
  "lib/server/userStoreSessionRevisionSqliteConcurrency.test.ts",
  "lib/server/userStoreTeacherOpsReportPersistence.test.ts",
  "lib/server/userStoreTeacherReportPreviewDecoder.test.ts",
  "lib/session.test.ts"
]);

export const parentConsoleTestFiles = Object.freeze([
  ...parentConsoleSupportTestFiles,
  ...parentDomainTestFiles,
  ...parentSecurityLifecycleTestFiles
]);

export const expectedParentDomainTestCount = 140;
export const expectedParentConsoleSupportTestCount = 15;
export const expectedParentSecurityLifecycleTestCount = 146;
export const expectedParentConsoleTestCount = 301;

// Runtime has two more tests than the source declaration count because two
// teacher-report cases are declared inside a two-value loop. The runner below
// therefore verifies the authoritative TAP runtime count rather than treating
// a source regex as execution evidence.
export const expectedParentDomainStaticDeclarationCount = 140;
export const expectedParentConsoleSupportStaticDeclarationCount = 15;
export const expectedParentSecurityLifecycleStaticDeclarationCount = 144;
export const expectedParentConsoleStaticDeclarationCount = 299;

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
      "lib/server/userStore",
      (relativePath) => /^lib\/server\/userStore\/parent[^/]*\.test\.(?:ts|tsx)$/u.test(relativePath)
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
  const missingSecurityLifecycleFiles = parentSecurityLifecycleTestFiles.filter(
    (relativePath) => !existsSync(path.join(repoRoot, relativePath))
  );
  const duplicateFiles = parentConsoleTestFiles.filter(
    (relativePath, index) => parentConsoleTestFiles.indexOf(relativePath) !== index
  );

  if (
    unlisted.length ||
    stale.length ||
    missingSupportFiles.length ||
    missingSecurityLifecycleFiles.length ||
    duplicateFiles.length
  ) {
    throw new Error([
      "Parent console test manifest is out of date.",
      `Unlisted parent-domain tests: ${unlisted.join(", ") || "none"}`,
      `Stale parent-domain entries: ${stale.join(", ") || "none"}`,
      `Missing support tests: ${missingSupportFiles.join(", ") || "none"}`,
      `Missing security-lifecycle tests: ${missingSecurityLifecycleFiles.join(", ") || "none"}`,
      `Duplicate entries: ${duplicateFiles.join(", ") || "none"}`
    ].join("\n"));
  }
}
