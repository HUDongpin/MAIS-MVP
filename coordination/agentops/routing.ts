import type { AgentOpsRequestV1, AgentOpsTaskType } from "./contracts";
import type { DiscoveryResultV1 } from "./discovery";
import {
  LANE_REGISTRY,
  SHARED_PATH_OWNER_REGISTRY,
  SPECIALIST_REGISTRY,
  type AgentLaneId,
  type SpecialistWorkflowId,
} from "./registry";

export type RouteStatusV1 = "routed" | "clarification-required" | "blocked";

export interface OrderedSubcontractV1 {
  readonly order: number;
  readonly primaryLane: AgentLaneId;
  readonly includedScopes: readonly string[];
  readonly specialistWorkflow: SpecialistWorkflowId;
  readonly claimCeiling: string;
}

export interface RouteDecisionV1 {
  readonly status: RouteStatusV1;
  readonly primaryLane: AgentLaneId | null;
  readonly collaboratingLanes: readonly AgentLaneId[];
  readonly ownedPathScopes: readonly string[];
  readonly forbiddenPathScopes: readonly string[];
  readonly routingReasons: readonly string[];
  readonly specialistWorkflow: SpecialistWorkflowId | null;
  readonly claimCeiling: string;
  readonly orderedSubcontracts: readonly OrderedSubcontractV1[];
  readonly parallelExecutionAllowed: false;
  readonly clarificationQuestions: readonly string[];
  readonly blockerCode: "ownership-or-worktree-conflict" | null;
}

const TASK_LANE_OVERRIDES: Readonly<
  Partial<Record<AgentOpsTaskType, AgentLaneId>>
> = Object.freeze({
  "content-generation": "A21",
  "machine-qa": "A18",
  "content-qa": "A18",
  "adaptive-audit": "A15",
  research: "A16",
  regression: "A11",
  release: "A22",
  "git-hygiene": "A25",
  backend: "A12",
  documentation: "A10",
  illustration: "A24",
});

const TEXT_SIGNALS: Readonly<Record<AgentLaneId, readonly RegExp[]>> = {
  A01: [/app shell|home page|navigation|theme|首页|导航|主题/i],
  A02: [/dashboard|progress page|analytics display|仪表盘|进度页/i],
  A03: [/learning path|roadmap|grade structure|学习路径|路线图/i],
  A04: [/practice arena|mistake book|question bank|练习|错题本|题库/i],
  A05: [/lesson page|lesson content|课程页面|课件/i],
  A06: [/visualization lab|interactive math|可视化实验室|交互数学/i],
  A07: [/ai tutor|nova|tutor prompt|llm provider|智能导师|导师 prompt/i],
  A08: [/shared type|shared state|analytics logic|difficulty schema|共享类型|状态语义/i],
  A09: [/i18n|bilingual copy|accessibility|a11y|双语文案|无障碍/i],
  A10: [/tooling|documentation|coordination report|agentops|工具链|项目文档|协调报告/i],
  A11: [/regression|e2e|quality gate|回归|端到端|质量门/i],
  A12: [/backend|general api|auth|session|storage|后端|认证|存储/i],
  A13: [/teacher console|teacher workflow|教师端|教师控制台/i],
  A14: [/parent console|guardian|parent report|家长端|监护人/i],
  A15: [/adaptive learning|bkt|candidate rerank|adaptive prompt|自适应学习/i],
  A16: [/learning science|research design|evaluation design|学习科学|研究设计/i],
  A17: [/gamification|badge|streak|leaderboard|reward economy|游戏化|徽章|连续学习/i],
  A18: [/curriculum qa|answer validation|content quality|课程审核|答案校验|内容质量/i],
  A19: [/environment variable|environment parity|credential placement|环境变量|凭据配置/i],
  A20: [/game loop|math game|level design|game-based learning|数学游戏|关卡设计/i],
  A21: [/content generation|rag candidate|candidate package|内容生成|候选包/i],
  A22: [/build|deploy|release|rollback|vercel|构建|部署|上线|回滚/i],
  A23: [/promotion|candidate-to-live|integration sequencing|promotion gate|晋升|候选上线/i],
  A24: [/exact layer|deterministic overlay|math svg|精确图层|确定性叠加/i],
  A25: [/dirty tree|git hygiene|worktree|release intake|脏树|工作树|git 卫生/i],
};

function normalizeScope(scope: string): string {
  return scope.replace(/^\.\//, "").replace(/\*.*$/, "").replace(/\/$/, "");
}

function scopesOverlap(left: string, right: string): boolean {
  const normalizedLeft = normalizeScope(left);
  const normalizedRight = normalizeScope(right);
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.startsWith(`${normalizedRight}/`) ||
    normalizedRight.startsWith(`${normalizedLeft}/`)
  );
}

function scopeSpecificity(scope: string): number {
  return normalizeScope(scope).length;
}

function laneForScope(scope: string): AgentLaneId | null {
  const candidates: { laneId: AgentLaneId; score: number }[] = [];
  for (const [laneId, lane] of Object.entries(LANE_REGISTRY) as [
    AgentLaneId,
    (typeof LANE_REGISTRY)[AgentLaneId],
  ][]) {
    const matching = lane.ownedPathScopes.filter((owned) =>
      scopesOverlap(scope, owned),
    );
    if (matching.length > 0) {
      candidates.push({
        laneId,
        score: Math.max(...matching.map(scopeSpecificity)),
      });
    }
  }
  candidates.sort(
    (left, right) =>
      right.score - left.score || left.laneId.localeCompare(right.laneId),
  );
  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    return null;
  }
  return candidates[0].laneId;
}

function laneFromText(request: AgentOpsRequestV1): AgentLaneId | null {
  const text = [request.intentSummary, request.explicitGoal, ...request.mustHave]
    .join("\n")
    .toLowerCase();
  const scored = (Object.entries(TEXT_SIGNALS) as [AgentLaneId, readonly RegExp[]][])
    .map(([laneId, expressions]) => ({
      laneId,
      score: expressions.filter((expression) => expression.test(text)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.laneId.localeCompare(right.laneId),
    );
  if (scored.length === 0) {
    return null;
  }
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    return null;
  }
  return scored[0].laneId;
}

function selectPromptAuditLane(request: AgentOpsRequestV1): AgentLaneId {
  const text = [request.intentSummary, request.explicitGoal, ...request.scope.included]
    .join("\n")
    .toLowerCase();
  return /adaptive|bkt|adaptive-learning/.test(text) ? "A15" : "A07";
}

function selectWorkflow(
  request: AgentOpsRequestV1,
  primaryLane: AgentLaneId,
): SpecialistWorkflowId {
  if (request.taskType === "content-generation") {
    return "content-candidate-generation.v1";
  }
  if (request.taskType === "machine-qa") {
    return "question-machine-qa.v1";
  }
  if (request.taskType === "content-qa") {
    return "curriculum-content-review.v1";
  }
  if (request.taskType === "prompt-audit" && primaryLane === "A07") {
    return "nova-prompt-audit.v1";
  }
  if (
    request.taskType === "adaptive-audit" ||
    (request.taskType === "prompt-audit" && primaryLane === "A15")
  ) {
    return "adaptive-prompt-audit.v1";
  }
  if (request.taskType === "regression") {
    return "regression-plan.v1";
  }
  if (request.taskType === "release") {
    return "release-graphops-handoff.v1";
  }
  if (request.taskType === "git-hygiene") {
    return "git-hygiene-intake.v1";
  }
  if (request.taskType === "research") {
    return "learning-science-eval-plan.v1";
  }
  if (primaryLane === "A23") {
    return "candidate-promotion.v1";
  }
  return "owner-lane-handoff.v1";
}

function createSubcontract(
  order: number,
  primaryLane: AgentLaneId,
  includedScopes: readonly string[],
  specialistWorkflow: SpecialistWorkflowId,
): OrderedSubcontractV1 {
  return {
    order,
    primaryLane,
    includedScopes,
    specialistWorkflow,
    claimCeiling: SPECIALIST_REGISTRY[specialistWorkflow].claimCeiling,
  };
}

function dependencyWorkflow(primaryLane: AgentLaneId): SpecialistWorkflowId {
  switch (primaryLane) {
    case "A11":
      return "regression-plan.v1";
    case "A22":
      return "release-graphops-handoff.v1";
    case "A23":
      return "candidate-promotion.v1";
    case "A25":
      return "git-hygiene-intake.v1";
    default:
      return "owner-lane-handoff.v1";
  }
}

function orderedScopeRoutes(request: AgentOpsRequestV1): OrderedSubcontractV1[] {
  const order: AgentLaneId[] = [];
  const scopesByLane = new Map<AgentLaneId, string[]>();
  for (const scope of request.scope.included) {
    const laneId = laneForScope(scope);
    if (!laneId) {
      continue;
    }
    if (!scopesByLane.has(laneId)) {
      order.push(laneId);
      scopesByLane.set(laneId, []);
    }
    scopesByLane.get(laneId)?.push(scope);
  }
  return order.map((primaryLane, index) => ({
    ...createSubcontract(
      index + 1,
      primaryLane,
      scopesByLane.get(primaryLane) ?? [],
      dependencyWorkflow(primaryLane),
    ),
  }));
}

function routingText(request: AgentOpsRequestV1): string {
  return [
    request.intentSummary,
    request.explicitGoal,
    ...request.mustHave,
    ...request.successCriteria,
  ].join("\n");
}

function contentEvidenceSubcontracts(
  request: AgentOpsRequestV1,
): readonly OrderedSubcontractV1[] {
  if (request.taskType !== "content-generation") return [];
  const text = routingText(request);
  const wantsRelease = /release|deploy|\bA22\b|发布|部署|上线/i.test(text);
  const wantsPromotion =
    wantsRelease || /promot|candidate-to-live|\bA23\b|晋升|候选上线/i.test(text);
  const wantsReview =
    wantsPromotion || /independent review|content review|\bA18\b|独立审核|内容审核/i.test(text);
  const wantsMachineQa =
    wantsReview || /machine[- ]?(?:check|qa)|机器检查|机审/i.test(text);
  const wantsRegression =
    wantsRelease || /regression|e2e|\bA11\b|回归|端到端/i.test(text);
  if (!wantsMachineQa && !wantsReview && !wantsPromotion && !wantsRegression && !wantsRelease) {
    return [];
  }
  const steps: readonly (readonly [AgentLaneId, SpecialistWorkflowId])[] = [
    ["A21", "content-candidate-generation.v1"],
    ...(wantsMachineQa
      ? ([["A18", "question-machine-qa.v1"]] as const)
      : []),
    ...(wantsReview
      ? ([["A18", "curriculum-content-review.v1"]] as const)
      : []),
    ...(wantsPromotion
      ? ([["A23", "candidate-promotion.v1"]] as const)
      : []),
    ...(wantsRegression
      ? ([["A11", "regression-plan.v1"]] as const)
      : []),
    ...(wantsRelease
      ? ([["A22", "release-graphops-handoff.v1"]] as const)
      : []),
  ];
  return steps.map(([primaryLane, workflow], index) =>
    createSubcontract(index + 1, primaryLane, request.scope.included, workflow),
  );
}

function explicitDependencySubcontracts(
  request: AgentOpsRequestV1,
  primaryLane: AgentLaneId,
): readonly Omit<OrderedSubcontractV1, "order">[] {
  const text = routingText(request);
  const specifications: readonly [AgentLaneId, RegExp][] = [
    ["A08", /shared type|shared state|共享类型|共享状态/i],
    ["A12", /api|storage|backend|存储|后端/i],
    ["A11", /regression|e2e|\bA11\b|回归|端到端/i],
    ["A22", /release|deploy|\bA22\b|发布|部署|上线/i],
  ];
  const allDeclaredScopes = [...request.scope.included, ...request.scope.excluded];
  return specifications.flatMap(([laneId, signal]) => {
    if (laneId === primaryLane || !signal.test(text)) return [];
    const matchingScopes = allDeclaredScopes.filter(
      (scope) => laneForScope(scope) === laneId,
    );
    const workflow = dependencyWorkflow(laneId);
    const { order: _order, ...subcontract } = createSubcontract(
      1,
      laneId,
      matchingScopes.length > 0 ? matchingScopes : request.scope.included,
      workflow,
    );
    return [subcontract];
  });
}

function orderedSubcontractsFor(
  request: AgentOpsRequestV1,
  primaryLane: AgentLaneId,
  primaryWorkflow: SpecialistWorkflowId,
  scopeSubcontracts: readonly OrderedSubcontractV1[],
): readonly OrderedSubcontractV1[] {
  const contentEvidence = contentEvidenceSubcontracts(request);
  if (contentEvidence.length > 1) return contentEvidence;
  if (request.taskType === "release") {
    return [
      createSubcontract(
        1,
        "A25",
        ["coordination/release-intake/**"],
        "git-hygiene-intake.v1",
      ),
      createSubcontract(
        2,
        primaryLane,
        request.scope.included,
        primaryWorkflow,
      ),
    ];
  }

  const secondaryScopes = scopeSubcontracts.filter(
    ({ primaryLane: laneId }) => laneId !== primaryLane,
  );
  const dependencies = explicitDependencySubcontracts(request, primaryLane);
  if (secondaryScopes.length === 0 && dependencies.length === 0) return [];

  const primaryScopes =
    scopeSubcontracts.find(({ primaryLane: laneId }) => laneId === primaryLane)
      ?.includedScopes ?? request.scope.included;
  const ordered: Omit<OrderedSubcontractV1, "order">[] = [];
  const add = (subcontract: Omit<OrderedSubcontractV1, "order">) => {
    if (!ordered.some(({ primaryLane: laneId }) => laneId === subcontract.primaryLane)) {
      ordered.push(subcontract);
    }
  };
  const { order: _primaryOrder, ...primary } = createSubcontract(
    1,
    primaryLane,
    primaryScopes,
    primaryWorkflow,
  );
  add(primary);
  for (const scoped of secondaryScopes) {
    const { order: _order, ...subcontract } = scoped;
    add(subcontract);
  }
  dependencies.forEach(add);
  return ordered.map((subcontract, index) => ({
    order: index + 1,
    ...subcontract,
  }));
}

function hasExternalWriterConflict(
  request: AgentOpsRequestV1,
  discovery: DiscoveryResultV1,
): boolean {
  return discovery.worktrees.some(
    (worktree) =>
      worktree.rootDigest !== discovery.repositorySnapshot.rootDigest &&
      worktree.dirty &&
      worktree.changedPaths.some((changedPath) =>
        request.scope.included.some((scope) => scopesOverlap(scope, changedPath)),
      ),
  );
}

function sharedOwnerConflict(
  request: AgentOpsRequestV1,
  primaryLane: AgentLaneId,
): AgentLaneId | null {
  if (
    !request.requestedEffects.includes("code-write") &&
    !request.requestedEffects.includes("content-write")
  ) {
    return null;
  }
  for (const included of request.scope.included) {
    const matches = SHARED_PATH_OWNER_REGISTRY.filter(({ scope }) =>
      scopesOverlap(included, scope),
    ).sort(
      (left, right) =>
        scopeSpecificity(right.scope) - scopeSpecificity(left.scope),
    );
    const exactOwner = matches[0]?.owner;
    if (exactOwner && exactOwner !== primaryLane) {
      return exactOwner;
    }
  }
  return null;
}

function collaboratorsFor(
  request: AgentOpsRequestV1,
  primaryLane: AgentLaneId,
  orderedSubcontracts: readonly OrderedSubcontractV1[],
): readonly AgentLaneId[] {
  const candidates: AgentLaneId[] = [];
  const add = (laneId: AgentLaneId) => {
    if (laneId !== primaryLane && !candidates.includes(laneId)) {
      candidates.push(laneId);
    }
  };
  orderedSubcontracts.forEach(({ primaryLane: laneId }) => add(laneId));
  LANE_REGISTRY[primaryLane].defaultCollaborators.forEach(add);
  const text = [request.intentSummary, request.explicitGoal, ...request.mustHave].join(" ");
  if (/api|storage|backend|存储|后端/i.test(text)) add("A12");
  if (/shared type|shared state|共享类型|共享状态/i.test(text)) add("A08");
  if (/regression|e2e|回归/i.test(text)) add("A11");
  if (/release|deploy|上线|部署/i.test(text)) add("A22");
  return candidates.slice(0, 3);
}

function clarificationDecision(reason: string): RouteDecisionV1 {
  return {
    status: "clarification-required",
    primaryLane: null,
    collaboratingLanes: [],
    ownedPathScopes: [],
    forbiddenPathScopes: [],
    routingReasons: [reason],
    specialistWorkflow: null,
    claimCeiling: "clarification-only",
    orderedSubcontracts: [],
    parallelExecutionAllowed: false,
    clarificationQuestions: [
      "Which exact product surface or repository-relative path is being decided?",
      "What observable outcome must the owning lane hand back?",
      "Which changes or external effects must remain out of scope?",
    ],
    blockerCode: null,
  };
}

export function routeAgentTask(
  request: AgentOpsRequestV1,
  discovery: DiscoveryResultV1,
): Readonly<RouteDecisionV1> {
  const scopeSubcontracts = orderedScopeRoutes(request);
  const taskOverride =
    request.taskType === "prompt-audit"
      ? selectPromptAuditLane(request)
      : TASK_LANE_OVERRIDES[request.taskType];
  const primaryLane =
    taskOverride ?? scopeSubcontracts[0]?.primaryLane ?? laneFromText(request);
  if (!primaryLane) {
    return Object.freeze(
      clarificationDecision("No unique primary lane can be established safely."),
    );
  }
  const specialistWorkflow = selectWorkflow(request, primaryLane);
  const orderedSubcontracts = orderedSubcontractsFor(
    request,
    primaryLane,
    specialistWorkflow,
    scopeSubcontracts,
  );
  const lane = LANE_REGISTRY[primaryLane];
  const collaborators = collaboratorsFor(
    request,
    primaryLane,
    orderedSubcontracts,
  );
  const base: RouteDecisionV1 = {
    status: "routed",
    primaryLane,
    collaboratingLanes: collaborators,
    ownedPathScopes: lane.ownedPathScopes,
    forbiddenPathScopes: lane.forbiddenPathScopes,
    routingReasons: [
      taskOverride
        ? `taskType ${request.taskType} has an exact lane rule`
        : `the decided object maps to ${primaryLane}`,
    ],
    specialistWorkflow,
    claimCeiling: SPECIALIST_REGISTRY[specialistWorkflow].claimCeiling,
    orderedSubcontracts,
    parallelExecutionAllowed: false,
    clarificationQuestions: [],
    blockerCode: null,
  };
  const conflictingSharedOwner = sharedOwnerConflict(request, primaryLane);
  if (conflictingSharedOwner) {
    return Object.freeze({
      ...base,
      status: "blocked",
      blockerCode: "ownership-or-worktree-conflict",
      routingReasons: [
        ...base.routingReasons,
        `the requested shared path is owned by ${conflictingSharedOwner}`,
      ],
      claimCeiling: "blocker-report-only",
    });
  }
  if (hasExternalWriterConflict(request, discovery)) {
    return Object.freeze({
      ...base,
      status: "blocked",
      blockerCode: "ownership-or-worktree-conflict",
      routingReasons: [
        ...base.routingReasons,
        "an external dirty worktree touches the requested scope",
      ],
      claimCeiling: "blocker-report-only",
    });
  }
  return Object.freeze(base);
}

export const routingInternalsForTests = Object.freeze({
  scopesOverlap,
  laneForScope,
});
