import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  userStoreDomainFunctionManifest,
  userStoreDomainNames,
  type UserStoreDomainName
} from "@/lib/server/userStore/domainContracts";

const domainSourceFiles: Record<UserStoreDomainName, string> = {
  auth: "auth",
  "student-activity": "studentActivity",
  "teacher-ops": "teacherOps",
  parent: "parent",
  gamification: "gamification",
  "ai-governance": "aiGovernance"
};

const expectedCoreOperations = {
  auth: [
    "authenticateUserForLogin",
    "createStudentUser",
    "createTeacherUser",
    "createParentUser",
    "getAuthenticatedUserById",
    "updateUserSettings",
    "updateUserProfile"
  ],
  "student-activity": [
    "submitQuestionAttempt",
    "getMistakes",
    "appendLearningEvents",
    "getDashboardData",
    "getProgressData",
    "getLessonBySlug",
    "updateLessonProgress"
  ],
  "teacher-ops": [
    "getTeacherDashboardData",
    "getTeacherOperationsData",
    "getTeacherClasses",
    "createTeacherAssignment",
    "getTeacherAssessmentListData",
    "getTeacherInboxData",
    "getForumWorkspaceData"
  ],
  parent: [
    "parentCanAccessStudent",
    "getParentFoundationData",
    "getParentChildSummary",
    "getParentReportData",
    "getParentMessagesData",
    "linkParentToStudentByInviteCode"
  ],
  gamification: [
    "getStudentRewardsData",
    "getStudentGamificationSummary",
    "completeFishingGame",
    "completeAdventureIsland",
    "getTeacherGamificationData",
    "awardTeacherRewardPoints"
  ],
  "ai-governance": [
    "recordAITutorMessage",
    "recordAITutorUsage",
    "consumeAiCapabilityRateLimit",
    "recordAiGovernanceEvent",
    "getAiGovernanceSummaryForAdmin",
    "getPilotPlatformLoopData",
    "recordNovaLensRun",
    "buildAITutorDatabaseContext"
  ]
} satisfies Record<UserStoreDomainName, string[]>;

function domainSourcePath(domainName: UserStoreDomainName) {
  return path.join(process.cwd(), "lib/server/userStore", `${domainSourceFiles[domainName]}.ts`);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exportedOperationPattern(operationName: string) {
  const escapedName = escapeRegex(operationName);
  return new RegExp(`export\\s+(?:async\\s+)?function\\s+${escapedName}\\b|export\\s+const\\s+${escapedName}\\b`);
}

function exportedDomainAdapterOperationPattern(operationName: string) {
  const escapedName = escapeRegex(operationName);
  return new RegExp(
    `export\\s+const\\s+${escapedName}\\s*=\\s*legacyUserStore\\.${escapedName}\\b|export\\s*\\{[\\s\\S]*\\b${escapedName}\\b[\\s\\S]*\\}`
  );
}

function compatibilityExportFromDomainStorePattern(operationName: string, storeName: string) {
  const escapedName = escapeRegex(operationName);
  return new RegExp(`export\\s+const\\s+${escapedName}(?:\\s*:[^=]+)?\\s*=\\s*${storeName}\\.${escapedName}\\b`);
}

test("userStore domain manifest defines the six storage boundaries", () => {
  assert.deepEqual(userStoreDomainNames, [
    "auth",
    "student-activity",
    "teacher-ops",
    "parent",
    "gamification",
    "ai-governance"
  ]);

  for (const domainName of userStoreDomainNames) {
    assert.ok(userStoreDomainFunctionManifest[domainName].length > 0, `${domainName} should list exported operations`);
  }
});

test("domain manifests expose core operations and keep compatibility exports", async () => {
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const seenOperations = new Map<string, UserStoreDomainName>();

  for (const domainName of userStoreDomainNames) {
    const manifest: readonly string[] = userStoreDomainFunctionManifest[domainName];

    for (const operationName of expectedCoreOperations[domainName]) {
      assert.ok(
        manifest.includes(operationName),
        `${domainName} manifest should include ${operationName}`
      );
    }

    for (const operationName of manifest) {
      assert.match(
        compatibilitySource,
        exportedOperationPattern(operationName),
        `${operationName} should remain exported by the compatibility store`
      );

      const previousDomain = seenOperations.get(operationName);
      assert.equal(previousDomain, undefined, `${operationName} appears in both ${previousDomain} and ${domainName}`);
      seenOperations.set(operationName, domainName);
    }
  }
});

test("domain modules stay as thin adapters until implementations move behind them", async () => {
  for (const domainName of userStoreDomainNames) {
    const source = await readFile(domainSourcePath(domainName), "utf8");
    const manifest: readonly string[] = userStoreDomainFunctionManifest[domainName];

    assert.doesNotMatch(source, /from ["']@\/data\//, `${domainName} should not directly import seed data`);
    assert.doesNotMatch(source, /\breadDatabase\(/, `${domainName} should not bypass the compatibility implementation yet`);
    assert.doesNotMatch(source, /\bwriteDatabase\(/, `${domainName} should not bypass the compatibility implementation yet`);

    for (const operationName of manifest) {
      assert.match(
        source,
        exportedDomainAdapterOperationPattern(operationName),
        `${domainName}.${operationName} should delegate to the compatibility implementation`
      );
    }
  }
});

test("domain adapters import compatibility operations explicitly", async () => {
  for (const domainName of userStoreDomainNames) {
    const source = await readFile(domainSourcePath(domainName), "utf8");

    assert.doesNotMatch(
      source,
      /import\s+\*\s+as\s+legacyUserStore\s+from\s+["']\.\.\/userStore["']/,
      `${domainName} adapter should not wildcard-import the compatibility store`
    );

    for (const operationName of userStoreDomainFunctionManifest[domainName]) {
      const escapedName = escapeRegex(operationName);
      assert.match(
        source,
        new RegExp(`import\\s*\\{[\\s\\S]*\\b${escapedName}\\b[\\s\\S]*\\}\\s*from\\s+["']\\.\\.\\/userStore["']`),
        `${domainName} adapter should explicitly import ${operationName}`
      );
      assert.match(
        source,
        new RegExp(`export\\s*\\{[\\s\\S]*\\b${escapedName}\\b[\\s\\S]*\\}`),
        `${domainName} adapter should explicitly re-export ${operationName}`
      );
    }
  }
});

test("AI governance compatibility exports are composed through the domain userStore factory", async () => {
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const aiGovernanceOperations: readonly string[] = userStoreDomainFunctionManifest["ai-governance"];

  assert.match(
    compatibilitySource,
    /from ["']@\/lib\/server\/userStore\/aiGovernanceStore["']/,
    "compatibility userStore should import the AI governance domain store factory"
  );
  assert.match(
    compatibilitySource,
    /const\s+aiGovernanceUserStore\s*=\s*createAiGovernanceUserStore\(/,
    "compatibility userStore should compose the AI governance domain store once"
  );

  for (const operationName of aiGovernanceOperations) {
    const escapedName = escapeRegex(operationName);
    assert.match(
      compatibilitySource,
      new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*aiGovernanceUserStore\\.${escapedName}\\b`),
      `AI governance compatibility export ${operationName} should come from the domain userStore`
    );
    assert.doesNotMatch(
      compatibilitySource,
      new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*(?:aiGovernancePersistenceStore|novaLensPersistenceStore)\\.${escapedName}\\b`),
      `AI governance compatibility export ${operationName} should not be wired directly from a root persistence store`
    );
  }
});

test("gamification compatibility exports are composed through the domain userStore factory", async () => {
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const gamificationOperations: readonly string[] = userStoreDomainFunctionManifest.gamification;

  assert.match(
    compatibilitySource,
    /from ["']@\/lib\/server\/userStore\/gamificationStore["']/,
    "compatibility userStore should import the gamification domain store factory"
  );
  assert.match(
    compatibilitySource,
    /const\s+gamificationUserStore\s*=\s*createGamificationUserStore\(/,
    "compatibility userStore should compose the gamification domain store once"
  );

  for (const operationName of gamificationOperations) {
    const escapedName = escapeRegex(operationName);
    assert.match(
      compatibilitySource,
      new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*gamificationUserStore\\.${escapedName}\\b`),
      `gamification compatibility export ${operationName} should come from the domain userStore`
    );
    assert.doesNotMatch(
      compatibilitySource,
      new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*(?:gamificationGamePersistenceStore|gamificationRewardRedemptionPersistenceStore|gamificationSummaryPersistenceStore|gamificationCampaignPersistenceStore)\\.${escapedName}\\b`),
      `gamification compatibility export ${operationName} should not be wired directly from a root persistence store`
    );
  }
});

test("parent compatibility exports are composed through the domain userStore factory", async () => {
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const parentOperations: readonly string[] = userStoreDomainFunctionManifest.parent;

  assert.match(
    compatibilitySource,
    /from ["']@\/lib\/server\/userStore\/parentStore["']/,
    "compatibility userStore should import the parent domain store factory"
  );
  assert.match(
    compatibilitySource,
    /const\s+parentUserStore\s*=\s*createParentUserStore\(/,
    "compatibility userStore should compose the parent domain store once"
  );

  for (const operationName of parentOperations) {
    const escapedName = escapeRegex(operationName);
    assert.match(
      compatibilitySource,
      new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*parentUserStore\\.${escapedName}\\b`),
      `parent compatibility export ${operationName} should come from the domain userStore`
    );
    assert.doesNotMatch(
      compatibilitySource,
      new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*(?:parentAccessPersistenceStore|parentNoticePersistenceStore|parentFoundationPersistenceStore|parentReportPersistenceStore|parentMessagePersistenceStore)\\.${escapedName}\\b`),
      `parent compatibility export ${operationName} should not be wired directly from a root persistence store`
    );
  }
});

test("auth compatibility exports are composed through the domain userStore factory", async () => {
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const authOperations: readonly string[] = userStoreDomainFunctionManifest.auth;

  assert.match(
    compatibilitySource,
    /from ["']@\/lib\/server\/userStore\/authStore["']/,
    "compatibility userStore should import the auth domain store factory"
  );
  assert.match(
    compatibilitySource,
    /const\s+authUserStore\s*=\s*createAuthUserStore\(/,
    "compatibility userStore should compose the auth domain store once"
  );

  for (const operationName of authOperations) {
    const escapedName = escapeRegex(operationName);
    assert.match(
      compatibilitySource,
      compatibilityExportFromDomainStorePattern(operationName, "authUserStore"),
      `auth compatibility export ${operationName} should come from the domain userStore`
    );
    assert.doesNotMatch(
      compatibilitySource,
      new RegExp(`export\\s+const\\s+${escapedName}(?:\\s*:[^=]+)?\\s*=\\s*(?:authSessionPersistenceStore|authProvisioningPersistenceStore|authAdminStoragePersistenceStore|learnerProfilePersistenceStore|isGradeAllowedForCurriculumProfileFromAvailability)\\.${escapedName}\\b|export\\s+const\\s+${escapedName}\\s*=\\s*isGradeAllowedForCurriculumProfileFromAvailability\\b`),
      `auth compatibility export ${operationName} should not be wired directly from root auth dependencies`
    );
  }
});

test("student activity compatibility exports are composed through the domain userStore factory", async () => {
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const studentActivityOperations: readonly string[] = userStoreDomainFunctionManifest["student-activity"];

  assert.match(
    compatibilitySource,
    /from ["']@\/lib\/server\/userStore\/studentActivityStore["']/,
    "compatibility userStore should import the student activity domain store factory"
  );
  assert.match(
    compatibilitySource,
    /const\s+studentActivityUserStore\s*=\s*createStudentActivityUserStore\(/,
    "compatibility userStore should compose the student activity domain store once"
  );

  for (const operationName of studentActivityOperations) {
    const escapedName = escapeRegex(operationName);
    assert.match(
      compatibilitySource,
      compatibilityExportFromDomainStorePattern(operationName, "studentActivityUserStore"),
      `student activity compatibility export ${operationName} should come from the domain userStore`
    );
    assert.doesNotMatch(
      compatibilitySource,
      new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*(?:studentActivityPersistenceStore|teacherOpsLiveSessionPersistenceStore|getContentUnavailableForCurriculumFromAvailability|getAdaptiveContentUnavailableForCurriculumFromAvailability)\\.${escapedName}\\b|export\\s+const\\s+${escapedName}\\s*=\\s*(?:getContentUnavailableForCurriculumFromAvailability|getAdaptiveContentUnavailableForCurriculumFromAvailability)\\b`),
      `student activity compatibility export ${operationName} should not be wired directly from root student dependencies`
    );
  }
});

test("teacher ops compatibility exports are composed through the domain userStore factory", async () => {
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const teacherOpsOperations: readonly string[] = userStoreDomainFunctionManifest["teacher-ops"];

  assert.match(
    compatibilitySource,
    /from ["']@\/lib\/server\/userStore\/teacherOpsStore["']/,
    "compatibility userStore should import the teacher ops domain store factory"
  );
  assert.match(
    compatibilitySource,
    /const\s+teacherOpsUserStore\s*=\s*createTeacherOpsUserStore\(/,
    "compatibility userStore should compose the teacher ops domain store once"
  );

  for (const operationName of teacherOpsOperations) {
    const escapedName = escapeRegex(operationName);
    assert.match(
      compatibilitySource,
      compatibilityExportFromDomainStorePattern(operationName, "teacherOpsUserStore"),
      `teacher ops compatibility export ${operationName} should come from the domain userStore`
    );
    assert.doesNotMatch(
      compatibilitySource,
      new RegExp(`export\\s+const\\s+${escapedName}\\s*=\\s*(?:teacherOpsReportPersistenceStore|teacherOpsOperationsPersistenceStore|teacherOpsForumPersistenceStore|teacherOpsTermArchivePersistenceStore|teacherOpsMasteryTargetPersistenceStore|teacherOpsStudentProfilePersistenceStore|teacherOpsClassCollaboratorPersistenceStore|teacherOpsPrepTeamPersistenceStore|teacherOpsReminderPersistenceStore|teacherOpsRosterProfilePersistenceStore|teacherOpsRosterImportPersistenceStore|teacherOpsFoundationPersistenceStore|teacherOpsAssignmentPersistenceStore|teacherOpsClassPersistenceStore|teacherOpsSubmissionPersistenceStore|teacherOpsClassroomWorkSamplePersistenceStore|teacherOpsLiveSessionPersistenceStore|teacherOpsInboxPersistenceStore|teacherOpsLessonKitPersistenceStore|teacherOpsNoticePersistenceStore|teacherOpsResourcePersistenceStore|teacherOpsAssessmentPersistenceStore|teacherReportPreviewToCsvFromTeacherOps|teacherReportPreviewToPdfFromTeacherOps)\\.${escapedName}\\b|export\\s+const\\s+${escapedName}\\s*=\\s*(?:teacherReportPreviewToCsvFromTeacherOps|teacherReportPreviewToPdfFromTeacherOps)\\b`),
      `teacher ops compatibility export ${operationName} should not be wired directly from root teacher dependencies`
    );
  }
});
