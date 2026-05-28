import { expect, request as apiRequest, test, type APIRequestContext, type APIResponse, type TestInfo } from "@playwright/test";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

type AuthSession = {
  user: {
    id: string;
    role: "student" | "teacher" | "parent" | "admin";
  };
};

type AdaptiveAction = "review" | "repair" | "practice" | "lesson" | "challenge";

type LocalizedText = {
  en: string;
  zh: string;
};

type AdaptiveDecision = {
  deterministic: boolean;
  action: AdaptiveAction;
  skill: { id: string; topicId: string; difficulty: string };
  topic: { id: string };
  questions: Array<{ id: string; topicId: string; difficulty: string; type: string }>;
  explanation: LocalizedText;
  engine: {
    mode: "deterministic" | "llm-assisted";
    llmStatus: "disabled" | "pending" | "ready" | "failed" | "rejected";
    provider?: string;
    model?: string;
    candidateSignature: string;
    selectedCandidateId: string;
    deterministicCandidateId: string;
    teacherAuditNote?: LocalizedText;
    signalsUsed?: string[];
    confidenceExplanation?: LocalizedText;
    aiConfidence?: { score: number; label: LocalizedText; criteria: LocalizedText };
    error?: string;
    errorKind?: string;
  };
};

type AdaptiveNextResponse = {
  decision: AdaptiveDecision;
};

type AdaptiveRefreshResponse = {
  status: AdaptiveDecision["engine"]["llmStatus"];
  decision: AdaptiveDecision | null;
  error?: string;
};

type AppStateRow = {
  payload: string;
};

type AppStatePayload = {
  adaptive_skill_state?: AdaptiveSkillStateRecord[];
  adaptive_recommendation_cache?: Array<Record<string, unknown> & { user_id: string }>;
};

type AdaptiveSkillStateRecord = {
  user_id: string;
  skill_id: string;
  p_mastery: number;
  attempt_count: number;
  correct_streak: number;
  wrong_streak: number;
  last_practiced_at: string | null;
  next_review_at: string | null;
  hint_count: number;
  misconception_tags: string[];
  updated_at: string;
};

type ProviderRequestRecord = {
  body: Record<string, unknown>;
  authorization: "present" | "missing";
};

type QueuedProviderResponse = {
  status?: number;
  body?: unknown | ((requestBody: Record<string, unknown>) => unknown);
  rawBody?: string;
  delayMs?: number;
};

type AdaptiveFeaturePack = {
  policy?: Record<string, unknown>;
  curriculumTrack?: string;
  promptVersion?: string;
  candidateSignature?: string;
  cacheSignature?: string;
  deterministicCandidateId?: string;
  candidates?: Array<{
    candidateId?: string;
    action?: string;
    hardGuardFlags?: string[];
    questionIds?: string[];
    ragEvidenceTopicId?: string;
  }>;
  ragEvidence?: {
    status?: string;
    signature?: string;
    policy?: Record<string, unknown>;
    byTopic?: Array<{
      topicId?: string;
      candidateIds?: string[];
      status?: string;
      layers?: Array<{ label?: string; cardIds?: string[]; cardCount?: number }>;
      safeUse?: string[];
      evidenceText?: string;
    }>;
  };
};

const projectRoot = process.cwd();
const proxyPath = path.join(projectRoot, "tests", "e2e", "deepseek-fetch-proxy.cjs");
const smokeNow = "2026-05-21T00:00:00.000Z";
const s3SmokeTopicIds = ["polynomials", "quadratic-patterns", "trigonometry-basics", "circles"] as const;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a local port.");
  return address.port;
}

function readIncomingBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    request.on("error", reject);
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function sendJson(response: ServerResponse, status: number, body: unknown, rawBody?: string) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(rawBody ?? JSON.stringify(body));
}

async function closeServer(server: Server | null) {
  if (!server) return;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

function chatCompletion(
  content: unknown,
  usage = { prompt_tokens: 44, completion_tokens: 26, total_tokens: 70 },
  finishReason = "stop"
) {
  return {
    id: `adaptive-smoke-${Date.now()}`,
    object: "chat.completion",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content
      },
      finish_reason: finishReason
    }],
    usage
  };
}

function parseAdaptiveFeaturePack(requestBody: Record<string, unknown>): AdaptiveFeaturePack {
  const messages = Array.isArray(requestBody.messages) ? requestBody.messages as Array<Record<string, unknown>> : [];
  const featurePackText = typeof messages[1]?.content === "string" ? messages[1].content : "{}";
  return JSON.parse(featurePackText) as AdaptiveFeaturePack;
}

function selectedCandidate(featurePack: AdaptiveFeaturePack, candidateId?: string) {
  return featurePack.candidates?.find((candidate) => candidate.candidateId === candidateId)
    ?? featurePack.candidates?.[0]
    ?? {};
}

function adaptiveRecommendationJson({
  selectedCandidateId,
  questionIds,
  reasonEn
}: {
  selectedCandidateId: string;
  questionIds: string[];
  reasonEn: string;
}) {
  return JSON.stringify({
    selectedCandidateId,
    questionIds,
    learnerReason: {
      en: reasonEn,
      zh: "Smoke LLM 根據掌握度、作答證據和題目組合，選擇受防護的下一步。"
    },
    teacherAuditNote: {
      en: "Smoke LLM audit: selected only from generated adaptive candidates.",
      zh: "Smoke LLM 審核：只從已生成的適性候選方案中選取。"
    },
    signalsUsed: ["masteryProbability", "correctStreak", "questionMix", "deterministicCandidateId", "ragEvidence"],
    confidenceExplanation: {
      en: "Smoke LLM confidence is grounded in mastery, streaks, guardrails, and existing question IDs.",
      zh: "Smoke LLM 信心依據掌握度、連續作答、防護規則和既有題目 ID。"
    }
  });
}

function validDeterministicRecommendationResponse(requestBody: Record<string, unknown>) {
  const featurePack = parseAdaptiveFeaturePack(requestBody);
  const selectedCandidateId = featurePack.deterministicCandidateId ?? featurePack.candidates?.[0]?.candidateId ?? "";
  const candidate = selectedCandidate(featurePack, selectedCandidateId);

  return chatCompletion(adaptiveRecommendationJson({
    selectedCandidateId,
    questionIds: candidate.questionIds?.slice(0, 2) ?? [],
    reasonEn: "Smoke LLM reason: the deterministic candidate remains the best guarded next step."
  }));
}

function validAlternativeRecommendationResponse(requestBody: Record<string, unknown>) {
  const featurePack = parseAdaptiveFeaturePack(requestBody);
  const selected =
    featurePack.candidates?.find((candidate) => candidate.candidateId !== featurePack.deterministicCandidateId && candidate.questionIds?.length) ??
    featurePack.candidates?.[0] ??
    {};
  const selectedCandidateId = selected.candidateId ?? "";
  const reorderedQuestionIds = [...(selected.questionIds ?? [])].reverse().slice(0, 2);

  return chatCompletion(adaptiveRecommendationJson({
    selectedCandidateId,
    questionIds: reorderedQuestionIds,
    reasonEn: "Smoke LLM reason: an allowed alternative candidate was selected after weighing mastery and question mix."
  }));
}

function invalidCandidateResponse() {
  return chatCompletion(adaptiveRecommendationJson({
    selectedCandidateId: "practice:llm-invented-skill",
    questionIds: [],
    reasonEn: "Invalid candidate smoke response."
  }));
}

function invalidQuestionResponse(requestBody: Record<string, unknown>) {
  const featurePack = parseAdaptiveFeaturePack(requestBody);
  const selectedCandidateId = featurePack.deterministicCandidateId ?? featurePack.candidates?.[0]?.candidateId ?? "";
  const candidate = selectedCandidate(featurePack, selectedCandidateId);

  return chatCompletion(adaptiveRecommendationJson({
    selectedCandidateId,
    questionIds: [candidate.questionIds?.[0] ?? "", "llm-invented-question"].filter(Boolean),
    reasonEn: "Invalid question smoke response."
  }));
}

async function createDeepSeekMockServer(providerRequests: ProviderRequestRecord[], queuedResponses: QueuedProviderResponse[]) {
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/chat/completions") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    const requestText = await readIncomingBody(request);
    const requestBody = JSON.parse(requestText) as Record<string, unknown>;
    providerRequests.push({
      body: requestBody,
      authorization: request.headers.authorization ? "present" : "missing"
    });

    const queued = queuedResponses.shift() ?? { body: validDeterministicRecommendationResponse };
    if (queued.delayMs) await delay(queued.delayMs);

    const body = typeof queued.body === "function" ? queued.body(requestBody) : queued.body;
    sendJson(response, queued.status ?? 200, body ?? {});
  });

  const port = await listen(server);
  return {
    server,
    url: `http://127.0.0.1:${port}/chat/completions`
  };
}

function uniqueStudent(testInfo: TestInfo, label: string) {
  const title = testInfo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 30);
  const id = `${label}-${Date.now()}-${testInfo.workerIndex}-${title}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    name: `Adaptive LLM Smoke ${id}`,
    username: `${id}@example.test`,
    password: "start12345"
  };
}

async function readJson<T>(response: APIResponse, expectedStatus = 200) {
  expect(response.status()).toBe(expectedStatus);
  return await response.json() as T;
}

async function newApiContext(app: IsolatedApp, contexts: APIRequestContext[]) {
  const context = await apiRequest.newContext({ baseURL: app.baseURL });
  contexts.push(context);
  return context;
}

async function registerStudent(
  app: IsolatedApp,
  contexts: APIRequestContext[],
  testInfo: TestInfo,
  label: string,
  options: { grade?: string; curriculumTrack?: string } = {}
) {
  const context = await newApiContext(app, contexts);
  const student = uniqueStudent(testInfo, label);
  const session = await readJson<AuthSession>(
    await context.post("/api/auth/register", {
      data: {
        name: student.name,
        username: student.username,
        email: student.username,
        password: student.password,
        grade: options.grade ?? "S3",
        curriculumTrack: options.curriculumTrack ?? "HK",
        language: "en",
        theme: "dark"
      }
    })
  );

  expect(session.user.role).toBe("student");
  return { context, userId: session.user.id };
}

async function disposeAll(contexts: APIRequestContext[]) {
  for (const context of contexts) {
    try {
      await context.dispose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ENOENT") && !message.includes("Tracing is already stopping")) throw error;
    }
  }
}

function readAppStatePayload(dbPath: string) {
  const sqlite = new DatabaseSync(dbPath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as AppStateRow | undefined;
    expect(row).toBeTruthy();
    return JSON.parse(row?.payload ?? "{}") as AppStatePayload;
  } finally {
    sqlite.close();
  }
}

function writeAppStatePayload(dbPath: string, payload: AppStatePayload) {
  const sqlite = new DatabaseSync(dbPath);
  try {
    sqlite
      .prepare("UPDATE app_state SET payload = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(payload), new Date().toISOString(), "primary");
  } finally {
    sqlite.close();
  }
}

function seedAdaptiveStates(
  app: IsolatedApp,
  userId: string,
  states: Array<Partial<AdaptiveSkillStateRecord> & { skill_id: string }>
) {
  const payload = readAppStatePayload(app.dbPath);
  const nextStates = states.map((state): AdaptiveSkillStateRecord => ({
    user_id: userId,
    p_mastery: 0.35,
    attempt_count: 0,
    correct_streak: 0,
    wrong_streak: 0,
    last_practiced_at: smokeNow,
    next_review_at: null,
    hint_count: 0,
    misconception_tags: [],
    updated_at: smokeNow,
    ...state
  }));
  const stateIds = new Set(nextStates.map((state) => state.skill_id));

  payload.adaptive_skill_state = [
    ...(payload.adaptive_skill_state ?? []).filter((state) => state.user_id !== userId || !stateIds.has(state.skill_id)),
    ...nextStates
  ];
  payload.adaptive_recommendation_cache = (payload.adaptive_recommendation_cache ?? []).filter((record) => record.user_id !== userId);

  writeAppStatePayload(app.dbPath, payload);
}

function seedStaleNonRagAdaptiveCache(
  app: IsolatedApp,
  userId: string,
  decision: AdaptiveDecision,
  grade: string,
  topicId: string
) {
  const payload = readAppStatePayload(app.dbPath);
  const now = new Date().toISOString();
  const selectedCandidateId = decision.engine.deterministicCandidateId;
  const questionIds = decision.questions.map((question) => question.id).slice(0, 2);

  payload.adaptive_recommendation_cache = [
    ...(payload.adaptive_recommendation_cache ?? []).filter((record) => record.user_id !== userId),
    {
      id: `adaptive-stale-non-rag-${Date.now()}`,
      user_id: userId,
      grade,
      topic_id: topicId,
      candidate_signature: decision.engine.candidateSignature,
      status: "ready",
      selected_candidate_id: selectedCandidateId,
      question_ids: questionIds,
      recommendation_json: {
        selectedCandidateId,
        questionIds,
        learnerReason: {
          en: "STALE NON-RAG CACHE SHOULD NOT BE USED",
          zh: "舊的非 RAG 快取不應被使用"
        },
        teacherAuditNote: {
          en: "Stale pre-RAG cache row.",
          zh: "舊的 RAG 前快取列。"
        },
        signalsUsed: ["masteryProbability"],
        confidenceExplanation: {
          en: "This row predates adaptive RAG evidence.",
          zh: "此列早於適性 RAG 證據。"
        }
      },
      provider: "deepseek",
      model: "deepseek-v4-pro",
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      error: null,
      error_kind: null,
      finish_reason: "stop",
      created_at: now,
      updated_at: now
    }
  ];

  writeAppStatePayload(app.dbPath, payload);
}

function highMasteryStates(topicId: string) {
  return ["foundation", "fluency", "transfer"].map((stage) => ({
    skill_id: `${topicId}:${stage}`,
    p_mastery: 0.92,
    attempt_count: 6,
    correct_streak: 3,
    wrong_streak: 0,
    next_review_at: null
  }));
}

function highMasteryStatesForTopics(topicIds: readonly string[]) {
  return topicIds.flatMap((topicId) => highMasteryStates(topicId));
}

function assertSafeRagEvidence(featurePack: AdaptiveFeaturePack, expectedLayer: RegExp = /hk-/) {
  expect(featurePack.promptVersion).toBe("adaptive-rag-v1");
  expect(featurePack.cacheSignature).toMatch(/^adaptive-rag-v1:/);
  expect(featurePack.cacheSignature).not.toBe(featurePack.candidateSignature);
  expect(featurePack.ragEvidence?.status).toBe("ready");
  expect(featurePack.ragEvidence?.signature).toBeTruthy();
  expect(featurePack.ragEvidence?.policy?.safeCardsOnly).toBe(true);
  expect(featurePack.ragEvidence?.policy?.rawSourceTextAllowed).toBe(false);
  expect(featurePack.ragEvidence?.policy?.sourceLocatorsAllowed).toBe(false);
  expect(featurePack.ragEvidence?.policy?.embeddingPayloadAllowed).toBe(false);
  expect(featurePack.ragEvidence?.policy?.answerOrSolutionAccessAllowed).toBe(false);
  expect(featurePack.ragEvidence?.policy?.questionGenerationAllowed).toBe(false);
  expect(featurePack.ragEvidence?.byTopic?.length).toBeGreaterThan(0);
  expect(featurePack.ragEvidence?.byTopic?.length).toBeLessThanOrEqual(4);

  const topicEvidence = featurePack.ragEvidence?.byTopic?.[0];
  expect(topicEvidence?.status).toBe("ready");
  expect(topicEvidence?.candidateIds?.length).toBeGreaterThan(0);
  expect(topicEvidence?.layers?.length).toBeGreaterThan(0);
  expect(topicEvidence?.layers?.some((layer) => expectedLayer.test(layer.label ?? ""))).toBe(true);
  expect(topicEvidence?.layers?.some((layer) => (layer.cardIds?.length ?? 0) > 0)).toBe(true);
  expect(featurePack.candidates?.every((candidate) => Boolean(candidate.ragEvidenceTopicId))).toBe(true);

  const evidenceJson = JSON.stringify(featurePack.ragEvidence?.byTopic ?? []);
  expect(evidenceJson).not.toMatch(/\bOCR\b/i);
  expect(evidenceJson).not.toMatch(/\bpage\s+\d+\b/i);
  expect(evidenceJson).not.toMatch(/\bp\.\s*\d+/i);
  expect(evidenceJson).not.toMatch(/source locators?/i);
  expect(evidenceJson).not.toMatch(/embedding\s*:/i);
  expect(evidenceJson).not.toMatch(/answer key/i);
  expect(evidenceJson).not.toMatch(/official solution/i);
  expect(evidenceJson).not.toMatch(/prompt_en|prompt_zh|explanation_en|explanation_zh|selected_answer|correct_answer/i);
}

function assertDeepSeekRequestContract(request: ProviderRequestRecord, expectedRagLayer: RegExp = /hk-/) {
  expect(request.authorization).toBe("present");
  expect(request.body.model).toBe("deepseek-v4-pro");
  expect(request.body.response_format).toEqual({ type: "json_object" });
  expect(request.body.stream).toBe(false);
  expect(request.body.thinking).toEqual({ type: "disabled" });
  expect(request.body).not.toHaveProperty("reasoning_effort");
  expect(request.body.max_tokens).toBeGreaterThanOrEqual(160);
  expect(request.body).not.toHaveProperty("max_completion_tokens");

  const messages = request.body.messages as Array<{ role?: string; content?: unknown }>;
  expect(Array.isArray(messages)).toBe(true);
  expect(messages[0]?.role).toBe("system");
  const systemPrompt = String(messages[0]?.content ?? "");
  expect(systemPrompt).toContain("preserve the deterministic BKT guardrails");
  expect(systemPrompt).toContain("Do not invent topics, skills, questions, answers");
  expect(systemPrompt).toContain("ragEvidence is MAIS-safe curriculum, textbook, and exam-pattern context");
  expect(systemPrompt).toContain("signalsUsed must include at least one evidence signal");
  expect(systemPrompt).toContain("Return only strict JSON");

  const featurePack = parseAdaptiveFeaturePack(request.body);
  expect(featurePack.policy?.authority).toBe("guarded-rerank-only");
  expect(featurePack.policy?.canSelectOnlyGeneratedCandidateIds).toBe(true);
  expect(featurePack.policy?.canOnlyReorderExistingQuestionIds).toBe(true);
  expect(featurePack.policy?.noQuestionGeneration).toBe(true);
  expect(featurePack.deterministicCandidateId).toBeTruthy();
  expect(featurePack.candidates?.length).toBeGreaterThan(0);
  assertSafeRagEvidence(featurePack, expectedRagLayer);
}

function assertReadyLLMDecision(decision: AdaptiveDecision | null) {
  expect(decision).toBeTruthy();
  expect(decision?.deterministic).toBe(false);
  expect(decision?.engine.mode).toBe("llm-assisted");
  expect(decision?.engine.llmStatus).toBe("ready");
  expect(decision?.engine.provider).toBe("deepseek");
  expect(decision?.engine.model).toBe("deepseek-v4-pro");
  expect(decision?.engine.signalsUsed).toEqual(expect.arrayContaining(["masteryProbability", "questionMix", "ragEvidence"]));
  expect(decision?.engine.teacherAuditNote?.en).toContain("Smoke LLM audit");
  expect(decision?.engine.confidenceExplanation?.en).toContain("Smoke LLM confidence");
  expect(decision?.engine.aiConfidence?.score).toBeGreaterThanOrEqual(0);
  expect(decision?.engine.aiConfidence?.score).toBeLessThanOrEqual(1);
}

async function startMockedAdaptiveApp(testInfo: TestInfo, mockUrl: string) {
  const nodeOptions = [process.env.NODE_OPTIONS, `--require ${proxyPath}`].filter(Boolean).join(" ");
  return await startIsolatedApp("adaptive-llm-smoke", testInfo, {
    env: {
      NODE_OPTIONS: nodeOptions,
      E2E_DEEPSEEK_MOCK_URL: mockUrl,
      LLM_API_KEY: "e2e-deepseek-key",
      OPENAI_API_KEY: "",
      LLM_MODEL: "deepseek-v4-pro",
      OPENAI_MODEL: "",
      LLM_API_URL: "https://api.deepseek.com/chat/completions",
      ADAPTIVE_LLM_MAX_REQUESTS_PER_MINUTE: "30",
      ADAPTIVE_LLM_MAX_REQUESTS_PER_HOUR: "120",
      ADAPTIVE_LLM_PROVIDER_TIMEOUT_MS: "300"
    }
  });
}

test.describe.serial("adaptive LLM smoke with mocked DeepSeek", () => {
  let app: IsolatedApp | null = null;
  let mockServer: Server | null = null;
  const providerRequests: ProviderRequestRecord[] = [];
  const queuedResponses: QueuedProviderResponse[] = [];

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "desktop-chrome") return;
    const mock = await createDeepSeekMockServer(providerRequests, queuedResponses);
    mockServer = mock.server;
    app = await startMockedAdaptiveApp(testInfo, mock.url);
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) await app?.attachLogs(testInfo);
  });

  test.afterAll(async () => {
    await app?.stop();
    await closeServer(mockServer);
  });

  function activeApp() {
    if (!app) throw new Error("Adaptive LLM smoke app did not start.");
    return app;
  }

  function queueProviderResponses(...responses: QueuedProviderResponse[]) {
    providerRequests.length = 0;
    queuedResponses.splice(0, queuedResponses.length, ...responses);
  }

  test("uses DeepSeek JSON mode, accepts a grounded recommendation, and serves it from cache", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Adaptive LLM smoke runs once.");
    const contexts: APIRequestContext[] = [];

    try {
      const { context, userId } = await registerStudent(activeApp(), contexts, testInfo, "contract-cache");
      const baseline = await readJson<AdaptiveNextResponse>(
        await context.get("/api/adaptive-learning/next?grade=S3&topicId=polynomials")
      );
      expect(baseline.decision.deterministic).toBe(true);
      expect(baseline.decision.engine.mode).toBe("deterministic");
      expect(baseline.decision.engine.llmStatus).toBe("pending");
      expect(baseline.decision.engine.provider).toBe("deepseek");
      expect(baseline.decision.engine.model).toBe("deepseek-v4-pro");
      expect(baseline.decision.engine.candidateSignature).toBeTruthy();

      seedStaleNonRagAdaptiveCache(activeApp(), userId, baseline.decision, "S3", "polynomials");
      const ignoredStaleCache = await readJson<AdaptiveNextResponse>(
        await context.get("/api/adaptive-learning/next?grade=S3&topicId=polynomials")
      );
      expect(ignoredStaleCache.decision.deterministic).toBe(true);
      expect(ignoredStaleCache.decision.engine.llmStatus).toBe("pending");
      expect(ignoredStaleCache.decision.explanation.en).not.toContain("STALE NON-RAG");

      queueProviderResponses({ body: validDeterministicRecommendationResponse });
      const refreshed = await readJson<AdaptiveRefreshResponse>(
        await context.post("/api/adaptive-learning/refresh", {
          data: { grade: "S3", topicId: "polynomials" }
        })
      );

      expect(refreshed.status).toBe("ready");
      assertReadyLLMDecision(refreshed.decision);
      expect(refreshed.decision?.engine.selectedCandidateId).toBe(refreshed.decision?.engine.deterministicCandidateId);
      expect(refreshed.decision?.explanation.en).toContain("Smoke LLM reason");
      expect(providerRequests).toHaveLength(1);
      assertDeepSeekRequestContract(providerRequests[0]);

      const cached = await readJson<AdaptiveNextResponse>(
        await context.get("/api/adaptive-learning/next?grade=S3&topicId=polynomials")
      );
      assertReadyLLMDecision(cached.decision);
      expect(cached.decision.engine.selectedCandidateId).toBe(refreshed.decision?.engine.selectedCandidateId);
      expect(cached.decision.explanation.en).toBe(refreshed.decision?.explanation.en);
      expect(providerRequests).toHaveLength(1);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("allows an LLM-selected generated alternative without leaving guardrails", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Adaptive LLM smoke runs once.");
    const contexts: APIRequestContext[] = [];

    try {
      const { context, userId } = await registerStudent(activeApp(), contexts, testInfo, "alternative");
      seedAdaptiveStates(activeApp(), userId, highMasteryStatesForTopics(s3SmokeTopicIds));
      queueProviderResponses({ body: validAlternativeRecommendationResponse });

      const refreshed = await readJson<AdaptiveRefreshResponse>(
        await context.post("/api/adaptive-learning/refresh", {
          data: { grade: "S3", topicId: "polynomials" }
        })
      );

      expect(refreshed.status).toBe("ready");
      assertReadyLLMDecision(refreshed.decision);
      expect(refreshed.decision?.engine.selectedCandidateId).not.toBe(refreshed.decision?.engine.deterministicCandidateId);
      expect(refreshed.decision?.explanation.en).toContain("allowed alternative");
      expect(providerRequests).toHaveLength(1);
      assertDeepSeekRequestContract(providerRequests[0]);
      expect(parseAdaptiveFeaturePack(providerRequests[0].body).candidates?.length).toBeGreaterThan(1);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("includes Mainland PEP safe RAG evidence in adaptive refresh prompts", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Adaptive LLM smoke runs once.");
    const contexts: APIRequestContext[] = [];
    const mainlandTopicId = "pep-junior-s3-upper-quadratics-circle-probability";

    try {
      const { context } = await registerStudent(activeApp(), contexts, testInfo, "mainland-rag", {
        grade: "S3",
        curriculumTrack: "MAINLAND_PEP_HIGH"
      });
      queueProviderResponses({ body: validDeterministicRecommendationResponse });

      const refreshed = await readJson<AdaptiveRefreshResponse>(
        await context.post("/api/adaptive-learning/refresh", {
          data: { grade: "S3", topicId: mainlandTopicId }
        })
      );

      expect(refreshed.status).toBe("ready");
      assertReadyLLMDecision(refreshed.decision);
      expect(providerRequests).toHaveLength(1);
      assertDeepSeekRequestContract(providerRequests[0], /mainland-/);
      const featurePack = parseAdaptiveFeaturePack(providerRequests[0].body);
      expect(featurePack.curriculumTrack).toBe("MAINLAND_PEP_HIGH");
      assertSafeRagEvidence(featurePack, /mainland-/);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("falls back deterministically on malformed, unsafe, provider, and timeout responses", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Adaptive LLM smoke runs once.");
    const contexts: APIRequestContext[] = [];

    async function refreshWithResponse(label: string, response: QueuedProviderResponse) {
      const { context } = await registerStudent(activeApp(), contexts, testInfo, label);
      queueProviderResponses(response);
      return await readJson<AdaptiveRefreshResponse>(
        await context.post("/api/adaptive-learning/refresh", {
          data: { grade: "S3", topicId: "polynomials" }
        })
      );
    }

    try {
      const invalidJson = await refreshWithResponse("invalid-json", { body: chatCompletion("{not-json") });
      expect(invalidJson.status).toBe("rejected");
      expect(invalidJson.error).toBe("invalid-json");
      expect(invalidJson.decision?.deterministic).toBe(true);
      expect(invalidJson.decision?.engine.errorKind).toBe("format");

      const invalidCandidate = await refreshWithResponse("invalid-candidate", { body: invalidCandidateResponse });
      expect(invalidCandidate.status).toBe("rejected");
      expect(invalidCandidate.error).toBe("candidate-not-generated");
      expect(invalidCandidate.decision?.deterministic).toBe(true);
      expect(invalidCandidate.decision?.engine.errorKind).toBe("guardrail");

      const invalidQuestion = await refreshWithResponse("invalid-question", { body: invalidQuestionResponse });
      expect(invalidQuestion.status).toBe("rejected");
      expect(invalidQuestion.error).toBe("question-not-in-candidate");
      expect(invalidQuestion.decision?.deterministic).toBe(true);
      expect(invalidQuestion.decision?.engine.errorKind).toBe("guardrail");

      const providerFailure = await refreshWithResponse("provider-failure", { status: 500, body: { error: "provider down" } });
      expect(providerFailure.status).toBe("failed");
      expect(providerFailure.error).toMatch(/HTTP 500/);
      expect(providerFailure.decision?.deterministic).toBe(true);
      expect(providerFailure.decision?.engine.errorKind).toBe("provider");

      const timeout = await refreshWithResponse("timeout", { delayMs: 1000, body: validDeterministicRecommendationResponse });
      expect(timeout.status).toBe("failed");
      expect(timeout.error).toMatch(/timed out/i);
      expect(timeout.decision?.deterministic).toBe(true);
      expect(timeout.decision?.engine.errorKind).toBe("provider");
    } finally {
      await disposeAll(contexts);
    }
  });
});

test("live DeepSeek adaptive judgement canary @live", async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "Live adaptive LLM smoke runs once.");
  test.skip(process.env.ADAPTIVE_LLM_LIVE_SMOKE !== "1", "Set ADAPTIVE_LLM_LIVE_SMOKE=1 to run the owner-approved live canary.");
  test.skip(!process.env.LLM_API_KEY, "Live adaptive LLM smoke requires an owner-approved LLM_API_KEY.");

  const liveApp = await startIsolatedApp("adaptive-llm-live-smoke", testInfo, {
    env: {
      LLM_API_KEY: process.env.LLM_API_KEY,
      OPENAI_API_KEY: "",
      LLM_API_URL: process.env.LLM_API_URL || "https://api.deepseek.com/chat/completions",
      LLM_MODEL: process.env.LLM_MODEL || "deepseek-v4-pro",
      OPENAI_MODEL: "",
      ADAPTIVE_LLM_MAX_REQUESTS_PER_MINUTE: "3",
      ADAPTIVE_LLM_MAX_REQUESTS_PER_HOUR: "3",
      ADAPTIVE_LLM_PROVIDER_TIMEOUT_MS: "45000"
    }
  });
  const contexts: APIRequestContext[] = [];

  const liveCases: Array<{
    label: string;
    topicId: string;
    expectedAction: AdaptiveAction;
    states: Array<Partial<AdaptiveSkillStateRecord> & { skill_id: string }>;
  }> = [
    {
      label: "live-repair",
      topicId: "polynomials",
      expectedAction: "repair",
      states: [
        { skill_id: "polynomials:foundation", p_mastery: 0.42, attempt_count: 3, correct_streak: 0, wrong_streak: 2 },
        { skill_id: "polynomials:fluency", p_mastery: 0.72, attempt_count: 2, correct_streak: 1, wrong_streak: 0 }
      ]
    },
    {
      label: "live-review",
      topicId: "polynomials",
      expectedAction: "review",
      states: [
        { skill_id: "polynomials:foundation", p_mastery: 0.91, attempt_count: 5, correct_streak: 3, wrong_streak: 0, next_review_at: "2026-05-20T00:00:00.000Z" },
        { skill_id: "polynomials:fluency", p_mastery: 0.82, attempt_count: 4, correct_streak: 2, wrong_streak: 0 }
      ]
    },
    {
      label: "live-challenge",
      topicId: "quadratic-patterns",
      expectedAction: "challenge",
      states: highMasteryStatesForTopics(s3SmokeTopicIds)
    }
  ];

  try {
    for (const liveCase of liveCases) {
      const { context, userId } = await registerStudent(liveApp, contexts, testInfo, liveCase.label);
      seedAdaptiveStates(liveApp, userId, liveCase.states);

      const baseline = await readJson<AdaptiveNextResponse>(
        await context.get(`/api/adaptive-learning/next?grade=S3&topicId=${liveCase.topicId}`)
      );
      expect(baseline.decision.action).toBe(liveCase.expectedAction);

      const refreshed = await readJson<AdaptiveRefreshResponse>(
        await context.post("/api/adaptive-learning/refresh", {
          data: { grade: "S3", topicId: liveCase.topicId }
        })
      );

      expect(refreshed.status).toBe("ready");
      expect(refreshed.decision?.engine.mode).toBe("llm-assisted");
      expect(refreshed.decision?.engine.llmStatus).toBe("ready");
      expect(refreshed.decision?.engine.provider).toBe("deepseek");
      expect(refreshed.decision?.engine.model).toBe(process.env.LLM_MODEL || "deepseek-v4-pro");
      expect(refreshed.decision?.action).toBe(liveCase.expectedAction);
      expect(refreshed.decision?.engine.signalsUsed?.join(" ")).toMatch(/mastery|streak|review|question|candidate|guard|difficulty|attempt/i);
      expect(refreshed.decision?.explanation.en.length).toBeGreaterThan(10);
      expect(refreshed.decision?.explanation.zh.length).toBeGreaterThan(5);
      expect(refreshed.decision?.engine.teacherAuditNote?.en.length).toBeGreaterThan(10);
      expect(refreshed.decision?.engine.confidenceExplanation?.zh.length).toBeGreaterThan(5);
      expect(refreshed.decision?.engine.aiConfidence?.score).toBeGreaterThanOrEqual(0);
      expect(refreshed.decision?.engine.aiConfidence?.score).toBeLessThanOrEqual(1);
    }
  } finally {
    await disposeAll(contexts);
    await liveApp.stop();
  }
});
