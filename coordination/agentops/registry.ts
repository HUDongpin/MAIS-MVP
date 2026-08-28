import { readFile } from "node:fs/promises";
import path from "node:path";

import { sha256Digest } from "./canonical";

export type AgentLaneId =
  | "A01"
  | "A02"
  | "A03"
  | "A04"
  | "A05"
  | "A06"
  | "A07"
  | "A08"
  | "A09"
  | "A10"
  | "A11"
  | "A12"
  | "A13"
  | "A14"
  | "A15"
  | "A16"
  | "A17"
  | "A18"
  | "A19"
  | "A20"
  | "A21"
  | "A22"
  | "A23"
  | "A24"
  | "A25";

export interface LaneRegistryEntryV1 {
  readonly laneId: AgentLaneId;
  readonly ownerRole: string;
  readonly objectKinds: readonly string[];
  readonly ownedPathScopes: readonly string[];
  readonly forbiddenPathScopes: readonly string[];
  readonly defaultCollaborators: readonly AgentLaneId[];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function lane(
  laneId: AgentLaneId,
  ownerRole: string,
  objectKinds: readonly string[],
  ownedPathScopes: readonly string[],
  forbiddenPathScopes: readonly string[],
  defaultCollaborators: readonly AgentLaneId[] = [],
): LaneRegistryEntryV1 {
  return {
    laneId,
    ownerRole,
    objectKinds,
    ownedPathScopes,
    forbiddenPathScopes,
    defaultCollaborators,
  };
}

export const LANE_REGISTRY = deepFreeze({
  A01: lane(
    "A01",
    "App shell lead",
    ["app-shell", "home", "navigation", "theme"],
    ["app/layout.tsx", "app/page.tsx", "components/layout/**", "components/home/**", "components/background/**", "components/ui/ThemeToggle.tsx", "components/ui/LanguageToggle.tsx"],
    ["app/api/**", "data/questions.ts", "components/visualizations/**"],
    ["A09", "A11"],
  ),
  A02: lane(
    "A02",
    "Dashboard lead",
    ["dashboard", "progress-ui", "analytics-display"],
    ["app/dashboard/**", "app/progress/**", "components/dashboard/**", "components/cards/**", "data/progress.ts", "data/learningAnalytics.ts"],
    ["lib/learningAnalytics.ts", "app/api/ai-tutor/**"],
    ["A08", "A15", "A11"],
  ),
  A03: lane(
    "A03",
    "Curriculum roadmap lead",
    ["learning-path", "roadmap", "grade-topic-structure"],
    ["app/learning-path/**", "app/secondary-roadmap/**", "components/learning/**", "data/grades.ts", "data/topics.ts"],
    ["data/questions.ts", "app/api/ai-tutor/**"],
    ["A18", "A11"],
  ),
  A04: lane(
    "A04",
    "Practice lead",
    ["practice", "mistake-book", "live-question-bank"],
    ["app/practice/**", "app/mistake-book/**", "components/practice/**", "data/questions.ts"],
    ["data/topics.ts", "components/visualizations/**", "app/api/ai-tutor/**"],
    ["A18", "A23", "A11"],
  ),
  A05: lane(
    "A05",
    "Lesson lead",
    ["lesson", "live-lesson-content"],
    ["app/lesson/**", "data/lessons.ts", "components/lesson/**"],
    ["app/practice/**", "components/visualizations/**", "app/api/ai-tutor/**"],
    ["A18", "A23", "A11"],
  ),
  A06: lane(
    "A06",
    "Visualization lead",
    ["visualization-lab", "interactive-math"],
    ["app/visualization-lab/**", "app/student/tools/visualizations/**", "components/visualizations/**", "data/visualizationLabs.ts", "lib/math.ts"],
    ["app/api/ai-tutor/**", "lib/server/llmProvider.ts"],
    ["A18", "A11"],
  ),
  A07: lane(
    "A07",
    "AI tutor lead",
    ["ai-tutor", "nova-prompt", "llm-runtime-behavior"],
    ["components/ai/**", "app/api/ai-tutor/**", "lib/server/llmProvider.ts", ".env.local.example"],
    [".env", ".env.local", "app/api/adaptive-learning/**"],
    ["A09", "A11", "A19"],
  ),
  A08: lane(
    "A08",
    "State and analytics lead",
    ["shared-state", "analytics-logic", "shared-types", "difficulty-schema"],
    ["components/providers/AppProviders.tsx", "lib/learningAnalytics.ts", "lib/learningAnalytics.test.ts", "lib/utils.ts", "types/index.ts", "lib/difficulty.ts", "lib/difficulty.test.ts"],
    ["app/api/ai-tutor/**", "package.json"],
    ["A10", "A11", "A22"],
  ),
  A09: lane(
    "A09",
    "Copy, i18n, accessibility lead",
    ["bilingual-copy", "i18n", "accessibility"],
    ["lib/i18n.ts", "**/*copy-only*", "**/*accessibility-only*"],
    ["package.json", ".env*", "business-logic/**"],
    ["A11"],
  ),
  A10: lane(
    "A10",
    "Tooling, docs, report lead",
    ["tooling", "documentation", "coordination", "configuration", "agentops"],
    ["README.md", "AGENTS.md", ".gitignore", "package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs", "app/globals.css", "coordination/**"],
    ["app/**", "components/**", "lib/**", "data/**"],
    ["A08", "A11", "A22", "A25"],
  ),
  A11: lane(
    "A11",
    "QA and release quality lead",
    ["regression", "e2e", "qa-matrix", "release-quality"],
    ["tests/e2e/**", "coordination/reports/**", "**/*regression-test-helper*"],
    ["app/**", "components/**", "lib/**", "data/**"],
    ["A10", "A22", "A25"],
  ),
  A12: lane(
    "A12",
    "Backend and API platform lead",
    ["backend", "general-api", "auth", "session", "storage"],
    ["app/api/**", "lib/server/auth.ts", "lib/server/sessionCookie.ts", "lib/server/userStore.ts", "**/*backend-api-test*"],
    ["app/api/ai-tutor/**", "app/api/adaptive-learning/**", ".env*"],
    ["A07", "A08", "A15", "A19"],
  ),
  A13: lane(
    "A13",
    "Teacher console lead",
    ["teacher-console", "teacher-workflow"],
    ["app/teacher/**", "components/teacher/**"],
    ["app/parent/**", "app/api/**", "app/api/ai-tutor/**"],
    ["A09", "A11", "A12"],
  ),
  A14: lane(
    "A14",
    "Parent console lead",
    ["parent-console", "guardian-experience", "parent-report"],
    ["app/parent/**", "components/parent/**"],
    ["app/teacher/**", "app/api/**", "lib/server/**"],
    ["A09", "A11", "A12"],
  ),
  A15: lane(
    "A15",
    "Adaptive engine lead",
    ["adaptive-learning", "bkt", "candidate-rerank", "adaptive-prompt"],
    ["lib/adaptiveLearning.ts", "lib/adaptiveLearning.test.ts", "app/api/adaptive-learning/**", "components/dashboard/AdaptiveLearningContent.tsx", "coordination/reports/**adaptive*"],
    ["app/api/ai-tutor/**", "lib/server/llmProvider.ts", "types/index.ts"],
    ["A02", "A07", "A08", "A11", "A16"],
  ),
  A16: lane(
    "A16",
    "Research and learning science lead",
    ["research", "learning-science", "evaluation-design", "pedagogy"],
    ["coordination/research/**", "coordination/reports/**research*", "coordination/reports/**evaluation*"],
    ["app/**", "components/**", "lib/adaptiveLearning.ts", "app/api/ai-tutor/**"],
    ["A07", "A15", "A18"],
  ),
  A17: lane(
    "A17",
    "Gamification and motivation lead",
    ["gamification", "badges", "streaks", "rewards", "leaderboards"],
    ["lib/gamification.ts", "lib/gamification.test.ts", "data/gamification.ts", "components/gamification/**", "app/api/gamification/**"],
    ["components/gamification/FishingGame.tsx", "components/gamification/AdventureIslandGame.tsx", "components/gamification/QuadraticBonusGame.tsx", "app/games/**"],
    ["A12", "A18", "A20"],
  ),
  A18: lane(
    "A18",
    "Curriculum QA and content quality lead",
    ["content-qa", "machine-qa", "curriculum-alignment", "answer-validation", "content-acceptance"],
    ["coordination/content-qa/**", "**/*curriculum-alignment*", "**/*content-review*"],
    ["data/questions.ts", "data/lessons.ts", "app/**", "content-generation-runtime/**"],
    ["A16", "A21", "A23", "A24"],
  ),
  A19: lane(
    "A19",
    "API configuration and deployment environment lead",
    ["api-environment", "environment-parity", "credential-placement"],
    [".env.local", ".env.local.example", "coordination/**api-config*", "coordination/**environment*"],
    ["app/api/**", "lib/server/llmProvider.ts", "package.json"],
    ["A07", "A12", "A15", "A22"],
  ),
  A20: lane(
    "A20",
    "Game design and game-based learning lead",
    ["math-game", "game-loop", "level-design", "game-based-learning"],
    ["app/games/**", "app/student/practice/games/**", "components/games/**", "lib/gameBasedLearning.ts", "lib/gameBasedLearning.test.ts", "data/gameBasedLearning.ts", "components/gamification/FishingGame.tsx", "components/gamification/AdventureIslandGame.tsx", "components/gamification/QuadraticBonusGame.tsx", "app/practice/fishing-game/**", "app/practice/quadratic-bonus/**"],
    ["lib/gamification.ts", "data/gamification.ts", "data/questions.ts"],
    ["A11", "A17", "A18"],
  ),
  A21: lane(
    "A21",
    "Content pipeline and RAG operations lead",
    ["content-generation", "rag-candidate", "candidate-package", "content-asset-logistics"],
    ["coordination/content-qa/**", "data/generated-content/**", "data/rag/**", "lib/rag/**", ".local/rag/**", "public/question-illustrations/**", "scripts/**/*content*", "scripts/**/*rag*"],
    ["data/questions.ts", "data/topics.ts", "data/lessons.ts", "app/**", ".env*"],
    ["A18", "A23", "A24"],
  ),
  A22: lane(
    "A22",
    "Production reliability and release engineering lead",
    ["build", "release", "deploy", "rollback", "release-graphops", "runtime-parity"],
    ["playwright.config.ts", ".vercelignore", "coordination/reports/**release*", "scripts/**/*release*", "scripts/**/*deploy*"],
    ["app/**", "components/**", "lib/**", "data/**", ".env*"],
    ["A10", "A11", "A19", "A25"],
  ),
  A23: lane(
    "A23",
    "Integration and promotion lead",
    ["candidate-promotion", "content-currentness", "integration-sequencing"],
    ["coordination/integration/**", "coordination/reports/**promotion*"],
    ["data/questions.ts", "data/topics.ts", "data/grades.ts", "data/lessons.ts", "app/**"],
    ["A04", "A05", "A11", "A18", "A21", "A22"],
  ),
  A24: lane(
    "A24",
    "Illustration exact-layer lead",
    ["illustration-exact-layer", "deterministic-overlay", "svg-math-overlay"],
    ["coordination/content-qa/**/*illustration*", "coordination/content-qa/**/*exact*", "coordination/content-qa/**/*overlay*", "public/question-illustrations/**", "public/lesson-illustrations/**", "lib/questionFigure.ts", "lib/questionFigure.test.ts"],
    ["bitmap-generation/**", "data/questions.ts", "data/lessons.ts", "app/**"],
    ["A04", "A11", "A18", "A21"],
  ),
  A25: lane(
    "A25",
    "Git hygiene and release intake lead",
    ["git-hygiene", "dirty-tree", "ownership-conflict", "worktree-lifecycle", "release-intake"],
    ["coordination/release-intake/**", "coordination/reports/**git*", "coordination/reports/**dirty*"],
    ["feature-code/**", "generated-content/**", "secret-files/**"],
    ["A10", "A11", "A22"],
  ),
} satisfies Record<AgentLaneId, LaneRegistryEntryV1>);

export interface SharedPathOwnerRegistryEntryV1 {
  readonly scope: string;
  readonly owner: AgentLaneId;
  readonly policyAnchor?: string;
}

export const SHARED_PATH_OWNER_REGISTRY: readonly SharedPathOwnerRegistryEntryV1[] = deepFreeze([
  { scope: "app/api/ai-tutor/**", owner: "A07" },
  { scope: "app/api/adaptive-learning/**", owner: "A15" },
  { scope: "app/api/**", owner: "A12" },
  { scope: "types/index.ts", owner: "A08" },
  { scope: "components/providers/AppProviders.tsx", owner: "A08" },
  { scope: "lib/i18n.ts", owner: "A09" },
  { scope: "app/globals.css", owner: "A10" },
  { scope: "package.json", owner: "A10" },
  { scope: "package-lock.json", owner: "A10", policyAnchor: "package.json" },
  { scope: "tailwind.config.ts", owner: "A10" },
  { scope: "tsconfig.json", owner: "A10" },
  { scope: "next.config.ts", owner: "A10" },
  { scope: "README.md", owner: "A10" },
  { scope: "AGENTS.md", owner: "A10" },
  { scope: "tests/e2e/**", owner: "A11" },
  { scope: "playwright.config.ts", owner: "A22" },
  { scope: ".vercelignore", owner: "A22" },
  { scope: "lib/server/userStore.ts", owner: "A12" },
  { scope: "lib/server/llmProvider.ts", owner: "A07" },
  { scope: "lib/difficulty.ts", owner: "A08" },
  { scope: "lib/difficulty.test.ts", owner: "A08" },
  { scope: "components/dashboard/AdaptiveLearningContent.tsx", owner: "A15" },
  { scope: "app/visualization-lab/**", owner: "A06" },
  { scope: "app/student/tools/visualizations/**", owner: "A06" },
  { scope: "components/visualizations/**", owner: "A06" },
  { scope: "data/visualizationLabs.ts", owner: "A06" },
  { scope: "lib/gamification.ts", owner: "A17" },
  { scope: "data/gamification.ts", owner: "A17" },
  { scope: "app/games/**", owner: "A20" },
  { scope: "app/student/practice/games/**", owner: "A20" },
  { scope: "components/games/**", owner: "A20" },
  { scope: "lib/gameBasedLearning.ts", owner: "A20" },
  { scope: "data/gameBasedLearning.ts", owner: "A20" },
  { scope: "data/questions.ts", owner: "A04" },
  { scope: "data/topics.ts", owner: "A03" },
  { scope: "data/grades.ts", owner: "A03" },
  { scope: "data/lessons.ts", owner: "A05" },
  { scope: "components/lesson/**", owner: "A05" },
  { scope: "data/generated-content/**", owner: "A21" },
  { scope: "data/rag/**", owner: "A21" },
  { scope: "lib/rag/**", owner: "A21" },
  { scope: "coordination/integration/**", owner: "A23" },
  { scope: "coordination/release-intake/**", owner: "A25" },
] satisfies readonly SharedPathOwnerRegistryEntryV1[]);

export const PROBE_REGISTRY = deepFreeze({
  "git.snapshot": {
    probeId: "git.snapshot",
    fixedOperation: "Read HEAD, branch, root identity, and bounded status.",
  },
  "git.worktrees": {
    probeId: "git.worktrees",
    fixedOperation: "Read registered worktree inventory and bounded writer status.",
  },
  "repo.context-boundaries": {
    probeId: "repo.context-boundaries",
    fixedOperation: "Resolve declared repository references without escaping the root.",
  },
  "repo.policy-digests": {
    probeId: "repo.policy-digests",
    fixedOperation: "Hash fixed coordination policy sources.",
  },
  "repo.specialist-availability": {
    probeId: "repo.specialist-availability",
    fixedOperation: "Check fixed specialist entrypoint paths.",
  },
} as const);

export type ProbeId = keyof typeof PROBE_REGISTRY;

export const SPECIALIST_REGISTRY = deepFreeze({
  "owner-lane-handoff.v1": {
    workflowId: "owner-lane-handoff.v1",
    requiredPaths: ["AGENTS.md"],
    claimCeiling: "handoff-ready",
  },
  "question-machine-qa.v1": {
    workflowId: "question-machine-qa.v1",
    requiredPaths: [
      "coordination/content-qa",
      "coordination/agentops/currentness/question-machine-qa.reviewed-current.json",
    ],
    availabilityPolicy: "reviewed-currentness-marker-required",
    reviewedRepository: {
      reviewedMainCommit: "9bf9cfb99f75a0dbc5a298e0d6aae74594571890",
      agentopsCommit: "150ded76db7d64c368e5db7e6cb30f3d90d40f78",
    },
    reviewedSource: {
      status: "source-package-installation-verified",
      evidenceBasis: "committed-redacted-receipt-not-agentops-execution",
      suiteName: "mais-question-qa-skill-suite",
      suiteVersion: "1.0.0",
      sourceBranch: "codex/a10-qa-skill-distillation-20260827",
      sourceCommit: "e33bf615846b708edf8339a4a82c6b760574c349",
      receiptCommit: "a49914a4dc34212354a64dbcad13c28f899c3782",
      baseCommit: "f001a9570f2a0ef066b1a83a33619f72215ff354",
      sourceScope: "coordination/skills/**",
      changedFileCount: 92,
      packageName: "mais-rsi-machine-qa-workflow",
      packagePath: "coordination/skills/mais-rsi-machine-qa-workflow",
      sourceTreeSha256: "6fe8303c91b5ba276632e4ad7a74c0e9c30a15cd8e71e33cc4cebaa790137e24",
      packageViewSha256: "fd4953c1cde7b0564d7706e1353ef5a80d7d1b976589ee53ad735ae1dc607b01",
      packageArchiveSha256: "7d42cf2837a274b678f5e7b00e0aa7464ad4d0498e4c9e3dc89f4d3aa84be1e1",
      installedReadbackSha256: "fd4953c1cde7b0564d7706e1353ef5a80d7d1b976589ee53ad735ae1dc607b01",
      installationReceiptSha256: "250211c582f855d468697e9b364e074e9a9493b8a11bb215c981f64117981927",
      packageBuildVerified: true,
      installationReadbackVerified: true,
      backupRollbackDrillVerified: true,
      finalReceiptCommitVerified: true,
    },
    claimCeiling: "machine-qa-packet-only",
  },
  "curriculum-content-review.v1": {
    workflowId: "curriculum-content-review.v1",
    requiredPaths: ["coordination/content-qa"],
    claimCeiling: "approved-for-integration-review",
  },
  "content-candidate-generation.v1": {
    workflowId: "content-candidate-generation.v1",
    requiredPaths: ["coordination/content-qa"],
    claimCeiling: "immutable-candidate-only",
  },
  "candidate-promotion.v1": {
    workflowId: "candidate-promotion.v1",
    requiredPaths: ["coordination/integration"],
    claimCeiling: "promotion-plan-only",
  },
  "nova-prompt-audit.v1": {
    workflowId: "nova-prompt-audit.v1",
    requiredPaths: ["app/api/ai-tutor"],
    claimCeiling: "prompt-audit-only",
  },
  "adaptive-prompt-audit.v1": {
    workflowId: "adaptive-prompt-audit.v1",
    requiredPaths: ["app/api/adaptive-learning", "lib/adaptiveLearning.ts"],
    claimCeiling: "prompt-audit-only",
  },
  "regression-plan.v1": {
    workflowId: "regression-plan.v1",
    requiredPaths: ["tests/e2e"],
    claimCeiling: "regression-plan-only",
  },
  "release-graphops-handoff.v1": {
    workflowId: "release-graphops-handoff.v1",
    requiredPaths: ["coordination/release-intake"],
    claimCeiling: "graphops-handoff-only",
  },
  "git-hygiene-intake.v1": {
    workflowId: "git-hygiene-intake.v1",
    requiredPaths: ["coordination/release-intake"],
    claimCeiling: "non-mutating-intake-only",
  },
  "learning-science-eval-plan.v1": {
    workflowId: "learning-science-eval-plan.v1",
    requiredPaths: ["coordination/reports"],
    claimCeiling: "evaluation-plan-only",
  },
} as const);

export type SpecialistWorkflowId = keyof typeof SPECIALIST_REGISTRY;

export const LANE_REGISTRY_DIGEST = sha256Digest({
  lanes: LANE_REGISTRY,
  probes: PROBE_REGISTRY,
  sharedPathOwners: SHARED_PATH_OWNER_REGISTRY,
  specialists: SPECIALIST_REGISTRY,
});

export interface LaneRegistryParityResultV1 {
  readonly ok: boolean;
  readonly missingFromRegistry: readonly string[];
  readonly extraInRegistry: readonly string[];
  readonly invalidReleaseOwners: readonly string[];
  readonly invalidSharedOwners: readonly string[];
  readonly sharedOwnerScopeMismatches: readonly string[];
  readonly undocumentedSharedOwnerScopes: readonly string[];
  readonly agentsPolicyDigest: string;
  readonly releaseRegistryDigest: string;
}

function collectLaneIds(value: unknown, result: Set<string>): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\bA\d{2}\b/g)) {
      result.add(match[0]);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectLaneIds(item, result));
    return;
  }
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((item) => collectLaneIds(item, result));
  }
}

function normalizeRegistryScope(scope: string): string {
  return scope.replace(/^\.\//, "").replace(/\*.*$/, "").replace(/\/$/, "");
}

function registryScopesOverlap(left: string, right: string): boolean {
  const normalizedLeft = normalizeRegistryScope(left);
  const normalizedRight = normalizeRegistryScope(right);
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.startsWith(`${normalizedRight}/`) ||
    normalizedRight.startsWith(`${normalizedLeft}/`)
  );
}

export async function verifyLaneRegistryParity(
  repoRoot: string,
): Promise<Readonly<LaneRegistryParityResultV1>> {
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  const ownerPathspecsPath = path.join(
    repoRoot,
    "coordination/release-intake/owner-pathspecs.json",
  );
  const packageManifestPath = path.join(
    repoRoot,
    "coordination/release-intake/owner-package-manifest.json",
  );
  const [agentsText, ownerPathspecsText, packageManifestText] = await Promise.all([
    readFile(agentsPath, "utf8"),
    readFile(ownerPathspecsPath, "utf8"),
    readFile(packageManifestPath, "utf8"),
  ]);
  const documented = new Set(
    [...agentsText.matchAll(/^\| `(A\d{2})` \|/gm)]
      .map((match) => match[1])
      .filter((lane): lane is string => Boolean(lane)),
  );
  const registered = new Set(Object.keys(LANE_REGISTRY));
  const releaseOwners = new Set<string>();
  collectLaneIds(JSON.parse(ownerPathspecsText), releaseOwners);
  collectLaneIds(JSON.parse(packageManifestText), releaseOwners);

  const missingFromRegistry = [...documented]
    .filter((laneId) => !registered.has(laneId))
    .sort();
  const extraInRegistry = [...registered]
    .filter((laneId) => !documented.has(laneId))
    .sort();
  const invalidReleaseOwners = [...releaseOwners]
    .filter((laneId) => !registered.has(laneId))
    .sort();
  const invalidSharedOwners = SHARED_PATH_OWNER_REGISTRY
    .filter(({ owner }) => !registered.has(owner))
    .map(({ owner }) => owner)
    .sort();
  const sharedOwnerScopeMismatches = SHARED_PATH_OWNER_REGISTRY
    .filter(
      ({ scope, owner }) =>
        !LANE_REGISTRY[owner].ownedPathScopes.some((ownedScope) =>
          registryScopesOverlap(scope, ownedScope),
        ),
    )
    .map(({ scope, owner }) => `${scope}:${owner}`)
    .sort();
  const undocumentedSharedOwnerScopes = SHARED_PATH_OWNER_REGISTRY
    .filter(
      ({ scope, policyAnchor }) =>
        !agentsText.includes(
          normalizeRegistryScope(policyAnchor ?? scope),
        ),
    )
    .map(({ scope }) => scope)
    .sort();
  const result: LaneRegistryParityResultV1 = {
    ok:
      documented.size === 25 &&
      missingFromRegistry.length === 0 &&
      extraInRegistry.length === 0 &&
      invalidReleaseOwners.length === 0 &&
      invalidSharedOwners.length === 0 &&
      sharedOwnerScopeMismatches.length === 0 &&
      undocumentedSharedOwnerScopes.length === 0,
    missingFromRegistry,
    extraInRegistry,
    invalidReleaseOwners,
    invalidSharedOwners,
    sharedOwnerScopeMismatches,
    undocumentedSharedOwnerScopes,
    agentsPolicyDigest: sha256Digest({ text: agentsText }),
    releaseRegistryDigest: sha256Digest({
      ownerPathspecs: JSON.parse(ownerPathspecsText),
      packageManifest: JSON.parse(packageManifestText),
    }),
  };
  return deepFreeze(result);
}
