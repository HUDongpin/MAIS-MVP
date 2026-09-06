import path from "node:path";
import { buildV2CandidateSet, writeFrozenV2CandidateSet } from "./candidate-set-builder.mjs";

export function samplePackage({ multipleChoiceHasOptions = true, templateLabel = null } = {}) {
  const multipleChoice = {
    id: "q-mc",
    type: "multiple-choice",
    gradeBand: "Grade 4",
    standardIds: ["4.NF.3"],
    alignment: { grade: "4", primaryStandardId: "4.NF.3" },
    prompt: {
      en: "What is 1/4 + 1/4?",
      zh: "四分之一加四分之一是多少？",
      zhHans: "四分之一加四分之一是多少？"
    },
    answer: "1/2",
    acceptedAnswers: ["1/2"],
    answerContract: { canonicalAnswer: "1/2", normalizationRule: "exact-rational" },
    explanation: {
      en: "1/4 + 1/4 = 2/4 = 1/2.",
      zh: "1/4 + 1/4 = 2/4 = 1/2。",
      zhHans: "1/4 + 1/4 = 2/4 = 1/2。"
    },
    misconceptionMap: { id: "like-denominator-addition" },
    evidenceSurface: { expectedLabel: "1/2", visibleLabel: "1/2" },
    templateTrace: { publicLabel: templateLabel },
    validation: {
      independentAnswer: "1/2",
      independentAnswerProvenance: "tool-derived-from-structured-model"
    },
    ...(multipleChoiceHasOptions
      ? {
          options: ["1/2", "1/4", "3/4", "1"].map((value) => ({
            en: value,
            zh: value,
            zhHans: value
          }))
        }
      : {})
  };

  return {
    packageId: "pkg-v2-fixture",
    protocolId: "MAIS-RSI-LITE-CAL-V2",
    protocolVersion: "2.0.0-candidate",
    sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
    region: "CA",
    curriculumTrack: "US_CA_MATH",
    publisher: "CA",
    gradeBand: "Grade 4",
    questions: [
      multipleChoice,
      {
        ...structuredClone(multipleChoice),
        id: "q-fill",
        type: "fill-in",
        options: undefined,
        templateTrace: { publicLabel: null }
      },
      {
        ...structuredClone(multipleChoice),
        id: "q-short",
        type: "short-answer",
        options: undefined,
        templateTrace: { publicLabel: null }
      }
    ],
    lessons: [
      {
        id: "lesson-1",
        gradeBand: "Grade 4",
        alignment: { grade: "4", primaryStandardId: "4.NF.3" },
        title: {
          en: "Adding fractions",
          zh: "分數加法",
          zhHans: "分数加法"
        },
        workedExample: {
          questionId: "q-mc",
          answer: "1/2",
          explanation: structuredClone(multipleChoice.explanation)
        }
      }
    ],
    browserRoutes: []
  };
}

export function completeRoleResult({ role, packageContent, findings = [] }) {
  return {
    schemaVersion: 2,
    role,
    packageId: packageContent.packageId,
    inspectionComplete: true,
    inspectedSurfaceIds: [
      ...packageContent.questions.map((row) => row.id),
      ...(role === "bilingual-curriculum-critic" || role === "evidence-verifier"
        ? packageContent.lessons.map((row) => row.id)
        : [])
    ],
    findings
  };
}

/** Test-owned synthetic data; never reopens the historical protected corpus. */
export async function createFrozenCandidateFixtureV2(parent) {
  const candidate = buildV2CandidateSet({
    masterSeed: "S6-v2-offline-test-owned-seed-20260906-0123456789abcdef",
    itemsPerPackage: 100
  });
  const candidateRoot = path.join(parent, "synthetic-candidate-set");
  await writeFrozenV2CandidateSet({ candidate, outputRoot: candidateRoot });
  return { candidateRoot, candidate };
}

/** Real receipt shape from the public runner; all model responses and billing are synthetic. */
export async function offlineRunFixtureV2({ arm = "A_PRIME", packageContent = samplePackage(), findingsByRole = {}, repeatGroupId = "synthetic-repeat-1" } = {}) {
  const { runPackageV2 } = await import("./formal-runner-v2.mjs");
  const { createProviderCallRecordV2 } = await import("./call-record-contract.mjs");
  const { canonicalSha256 } = await import("./candidate-set-builder.mjs");
  const { createBudgetLedger } = await import("../rsi-lite-calibration-v1/f3-formal-runner.mjs");
  let calls = 0;
  const providerAdapter = {
    executionMode: "offline-mock",
    async runRole({ role, packageId, projection, repeatGroupId }) {
      calls += 1;
      const request = { provider: "DeepSeek", model: "deepseek-v4-pro", temperature: 0, topP: 1, maxOutputTokens: 24_000, stream: true, requestedSeed: null, seedSupport: "not-assumed" };
      const projectionSha256 = canonicalSha256(projection);
      const usage = { promptCacheHitTokens: 0, promptCacheMissTokens: 100, completionTokens: 20, totalTokens: 120 };
      return {
        projectionSha256, latencyMs: 0, usage,
        callRecord: createProviderCallRecordV2({ packageId, role, projectionSha256, repeatGroupId, request,
          response: { responseId: `synthetic-${calls}`, observedModel: request.model, createdAt: "2026-09-06T00:00:00.000Z", finishReason: "stop", usage: { promptCacheHitTokens: 0, promptCacheMissTokens: 100, outputTokens: 20 } } }),
        roleResult: { schemaVersion: 2, role, packageId, inspectionComplete: true,
          inspectedSurfaceIds: [...(projection.questions ?? []), ...(projection.lessons ?? [])].map((row) => row.id),
          findings: structuredClone(findingsByRole[role] ?? []) }
      };
    }
  };
  const budgetLedger = createBudgetLedger({ caps: { currencyCapUsd: 25, providerCallCap: 220, tokenCap: 40_000_000 }, pricesUsdPerMillion: { inputCacheHit: 0.003625, inputCacheMiss: 0.435, output: 0.87 } });
  const receipt = await runPackageV2({ packageContent, providerAdapter, budgetLedger,
    planRow: { packageId: packageContent.packageId, arm, contentSha256: canonicalSha256(packageContent), candidateSetSha256: "a".repeat(64), authorizationBinding: {}, repeatGroupId } });
  return { receipt, expectedPackage: packageContent, providerAdapter, budgetLedger, getProviderCalls: () => calls };
}
