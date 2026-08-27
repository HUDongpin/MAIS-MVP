import type { AgentOpsTaskType } from "../contracts";
import type { AgentLaneId } from "../registry";

export type RoutingEvalCaseKindV1 =
  | "positive-path"
  | "positive-language"
  | "near-neighbor"
  | "conflict";

export interface RoutingEvalCaseV1 {
  readonly id: string;
  readonly laneUnderTest: AgentLaneId;
  readonly caseKind: RoutingEvalCaseKindV1;
  readonly query: string;
  readonly taskType: AgentOpsTaskType;
  readonly includedScope: string;
  readonly conflictingPath: string | null;
  readonly expectedStatus: "routed" | "blocked";
  readonly expectedPrimaryLane: AgentLaneId;
}

interface LaneSeedV1 {
  readonly laneId: AgentLaneId;
  readonly objectLanguage: string;
  readonly ownedScope: string;
  readonly conflictPath: string;
  readonly taskType: AgentOpsTaskType;
}

const LANE_SEEDS: readonly LaneSeedV1[] = Object.freeze([
  { laneId: "A01", objectLanguage: "the app shell home navigation and theme surface", ownedScope: "app/page.tsx", conflictPath: "app/page.tsx", taskType: "feature" },
  { laneId: "A02", objectLanguage: "the dashboard progress and analytics display UI", ownedScope: "app/progress/page.tsx", conflictPath: "app/progress/page.tsx", taskType: "feature" },
  { laneId: "A03", objectLanguage: "the curriculum learning path and secondary roadmap", ownedScope: "app/learning-path/page.tsx", conflictPath: "app/learning-path/page.tsx", taskType: "feature" },
  { laneId: "A04", objectLanguage: "the Practice Arena mistake book and live question bank", ownedScope: "app/mistake-book/page.tsx", conflictPath: "app/mistake-book/page.tsx", taskType: "feature" },
  { laneId: "A05", objectLanguage: "lesson pages and live lesson content", ownedScope: "app/lesson/algebra/page.tsx", conflictPath: "app/lesson/algebra/page.tsx", taskType: "feature" },
  { laneId: "A06", objectLanguage: "the Visualization Lab and interactive math modules", ownedScope: "app/visualization-lab/page.tsx", conflictPath: "app/visualization-lab/page.tsx", taskType: "feature" },
  { laneId: "A07", objectLanguage: "the Nova AI Tutor prompt and tutor provider behavior", ownedScope: "app/api/ai-tutor/resolve/route.ts", conflictPath: "app/api/ai-tutor/resolve/route.ts", taskType: "prompt-audit" },
  { laneId: "A08", objectLanguage: "shared types state semantics and analytics logic", ownedScope: "types/index.ts", conflictPath: "types/index.ts", taskType: "routing" },
  { laneId: "A09", objectLanguage: "bilingual copy i18n and accessibility labels", ownedScope: "lib/i18n.ts", conflictPath: "lib/i18n.ts", taskType: "routing" },
  { laneId: "A10", objectLanguage: "AgentOps tooling project documentation and coordination reports", ownedScope: "README.md", conflictPath: "README.md", taskType: "documentation" },
  { laneId: "A11", objectLanguage: "regression E2E and QA matrices", ownedScope: "tests/e2e/student.spec.ts", conflictPath: "tests/e2e/student.spec.ts", taskType: "regression" },
  { laneId: "A12", objectLanguage: "the general backend API auth session and storage platform", ownedScope: "lib/server/auth.ts", conflictPath: "lib/server/auth.ts", taskType: "backend" },
  { laneId: "A13", objectLanguage: "the Teacher Console and teacher workflows", ownedScope: "app/teacher/page.tsx", conflictPath: "app/teacher/page.tsx", taskType: "feature" },
  { laneId: "A14", objectLanguage: "the Parent Console guardian experience and parent reports", ownedScope: "app/parent/page.tsx", conflictPath: "app/parent/page.tsx", taskType: "feature" },
  { laneId: "A15", objectLanguage: "Adaptive Learning BKT and candidate-only reranking", ownedScope: "lib/adaptiveLearning.ts", conflictPath: "lib/adaptiveLearning.ts", taskType: "adaptive-audit" },
  { laneId: "A16", objectLanguage: "learning science research and evaluation design", ownedScope: "coordination/research/evaluation.md", conflictPath: "coordination/research/evaluation.md", taskType: "research" },
  { laneId: "A17", objectLanguage: "gamification badges streaks and reward economy", ownedScope: "lib/gamification.ts", conflictPath: "lib/gamification.ts", taskType: "feature" },
  { laneId: "A18", objectLanguage: "curriculum QA answer validation and content acceptance", ownedScope: "coordination/content-qa/review.md", conflictPath: "coordination/content-qa/review.md", taskType: "content-qa" },
  { laneId: "A19", objectLanguage: "API environment variable placement and environment parity", ownedScope: ".env.local", conflictPath: ".env.local", taskType: "routing" },
  { laneId: "A20", objectLanguage: "math game loops level design and game-based learning", ownedScope: "app/games/algebra/page.tsx", conflictPath: "app/games/algebra/page.tsx", taskType: "feature" },
  { laneId: "A21", objectLanguage: "content generation RAG candidates and candidate packages", ownedScope: "data/generated-content/candidate.json", conflictPath: "data/generated-content/candidate.json", taskType: "content-generation" },
  { laneId: "A22", objectLanguage: "build release deployment rollback and runtime parity", ownedScope: "playwright.config.ts", conflictPath: "playwright.config.ts", taskType: "release" },
  { laneId: "A23", objectLanguage: "candidate promotion currentness and integration sequencing", ownedScope: "coordination/integration/candidate.md", conflictPath: "coordination/integration/candidate.md", taskType: "routing" },
  { laneId: "A24", objectLanguage: "the deterministic illustration exact layer and math SVG overlay", ownedScope: "lib/questionFigure.ts", conflictPath: "lib/questionFigure.ts", taskType: "illustration" },
  { laneId: "A25", objectLanguage: "dirty-tree ownership worktree lifecycle and Git hygiene", ownedScope: "coordination/release-intake/dirty-map.json", conflictPath: "coordination/release-intake/dirty-map.json", taskType: "git-hygiene" }
]);

function makeCases(seed: LaneSeedV1, index: number): readonly RoutingEvalCaseV1[] {
  const next = LANE_SEEDS[(index + 1) % LANE_SEEDS.length];
  const prefix = `routing-${seed.laneId.toLowerCase()}`;
  return [
    {
      id: `${prefix}-positive-path`,
      laneUnderTest: seed.laneId,
      caseKind: "positive-path",
      query: `Prepare a read-only handoff for the object at ${seed.ownedScope}.`,
      taskType: seed.taskType,
      includedScope: seed.ownedScope,
      conflictingPath: null,
      expectedStatus: "routed",
      expectedPrimaryLane: seed.laneId,
    },
    {
      id: `${prefix}-positive-language`,
      laneUnderTest: seed.laneId,
      caseKind: "positive-language",
      query: `Route a bounded request concerning ${seed.objectLanguage}.`,
      taskType: "routing",
      includedScope: `unknown-${seed.laneId.toLowerCase()}/surface`,
      conflictingPath: null,
      expectedStatus: "routed",
      expectedPrimaryLane: seed.laneId,
    },
    {
      id: `${prefix}-near-neighbor`,
      laneUnderTest: seed.laneId,
      caseKind: "near-neighbor",
      query: `Route a bounded request concerning ${next.objectLanguage}.`,
      taskType: "routing",
      includedScope: `unknown-neighbor-${seed.laneId.toLowerCase()}/surface`,
      conflictingPath: null,
      expectedStatus: "routed",
      expectedPrimaryLane: next.laneId,
    },
    {
      id: `${prefix}-conflict`,
      laneUnderTest: seed.laneId,
      caseKind: "conflict",
      query: `Prepare a handoff for ${seed.objectLanguage} while another writer is active.`,
      taskType: seed.taskType,
      includedScope: seed.ownedScope,
      conflictingPath: seed.conflictPath,
      expectedStatus: "blocked",
      expectedPrimaryLane: seed.laneId,
    },
  ];
}

export const ROUTING_EVAL_CASES: readonly RoutingEvalCaseV1[] = Object.freeze(
  LANE_SEEDS.flatMap(makeCases),
);
