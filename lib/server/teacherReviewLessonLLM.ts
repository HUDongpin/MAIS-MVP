import {
  boundedLLMNumber,
  buildLLMProviderRequestBody,
  extractLLMProviderReply,
  readLLMProviderConfig,
  type LLMProviderMessage
} from "@/lib/server/llmProvider";
import type {
  LocalizedText,
  TeacherReviewLessonMisconceptionTag,
  TeacherReviewLessonPlan,
  TeacherReviewLessonPracticeQuestion
} from "@/types";

const reviewLessonLLMMaxTokens = 1800;
const reviewLessonLLMTimeoutMs = 20000;
const validMisconceptionTags = new Set<TeacherReviewLessonMisconceptionTag>([
  "conceptual-understanding",
  "calculation-symbol",
  "reading-modeling",
  "solution-steps",
  "graph-table-reading",
  "unit-format",
  "strategy-choice"
]);

type ReviewLessonLLMPracticePatch = {
  questionId?: unknown;
  prompt?: unknown;
  answer?: unknown;
  explanation?: unknown;
};

type ReviewLessonLLMItemPatch = {
  itemId?: unknown;
  teachingScript?: unknown;
  teacherNotes?: unknown;
  misconceptionTags?: unknown;
};

type ReviewLessonLLMSlidePatch = {
  slideId?: unknown;
  bullets?: unknown;
  speakerNotes?: unknown;
};

type ReviewLessonLLMPatch = {
  objectives?: unknown;
  generationNotes?: unknown;
  items?: unknown;
  slides?: unknown;
  variationQuestions?: unknown;
  remediationQuestions?: unknown;
};

function llmEnabled() {
  const value = process.env.TEACHER_REVIEW_LESSON_LLM?.trim().toLowerCase();
  return value === "enabled" || value === "true" || value === "1" || value === "yes" || value === "on";
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function localized(value: unknown, fallback: LocalizedText, maxLength = 1400): LocalizedText {
  if (typeof value === "string") {
    const text = clean(value, maxLength);
    return text ? { en: text, zh: text, zhHans: text } : fallback;
  }
  if (!isRecord(value)) return fallback;
  const en = clean(value.en, maxLength) ?? fallback.en;
  const zh = clean(value.zh, maxLength) ?? fallback.zh;
  const zhHans = clean(value.zhHans, maxLength) ?? fallback.zhHans ?? zh;
  return { en, zh, zhHans };
}

function localizedList(value: unknown, fallback: LocalizedText[], limit: number) {
  if (!Array.isArray(value)) return fallback;
  const next = value
    .slice(0, limit)
    .map((item, index) => localized(item, fallback[index] ?? { en: "", zh: "", zhHans: "" }, 360))
    .filter((item) => item.en || item.zh || item.zhHans);
  return next.length ? next : fallback;
}

function parseJsonObject(value: string): ReviewLessonLLMPatch | null {
  const trimmed = value.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const json = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  try {
    const parsed: unknown = JSON.parse(json);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildLLMPayload(plan: TeacherReviewLessonPlan) {
  return {
    language: plan.language,
    title: plan.title,
    durationMinutes: plan.durationMinutes,
    sourceSnapshot: {
      assessmentTitle: plan.sourceSnapshot.assessmentTitle,
      submittedCount: plan.sourceSnapshot.submittedCount,
      totalStudents: plan.sourceSnapshot.totalStudents,
      questionCount: plan.sourceSnapshot.questionCount
    },
    objectives: plan.objectives,
    timeline: plan.timeline,
    items: plan.items.map((item) => ({
      itemId: item.id,
      questionId: item.questionId,
      category: item.category,
      prompt: item.prompt,
      correctRate: item.correctRate,
      wrongCount: item.wrongCount,
      totalResponses: item.totalResponses,
      commonWrongAnswer: item.commonWrongAnswer,
      commonWrongAnswerCount: item.commonWrongAnswerCount,
      misconceptionTags: item.misconceptionTags,
      categoryReason: item.categoryReason,
      teachingScript: item.teachingScript,
      teacherNotes: item.teacherNotes
    })),
    slides: plan.slides.map((slide) => ({
      slideId: slide.id,
      title: slide.title,
      bullets: slide.bullets,
      speakerNotes: slide.speakerNotes,
      relatedItemIds: slide.relatedItemIds
    })),
    variationQuestions: plan.variationQuestions.map((question) => ({
      questionId: question.id,
      source: question.source,
      prompt: question.prompt,
      answer: question.answer,
      explanation: question.explanation,
      validationStatus: question.validationStatus
    })),
    remediationQuestions: plan.remediationQuestions.map((question) => ({
      questionId: question.id,
      source: question.source,
      prompt: question.prompt,
      answer: question.answer,
      explanation: question.explanation,
      validationStatus: question.validationStatus
    }))
  };
}

function buildMessages(plan: TeacherReviewLessonPlan): LLMProviderMessage[] {
  return [
    {
      role: "system",
      content: [
        "You enrich a teacher review lesson plan for math assessment debriefing.",
        "Return only strict JSON. Do not use Markdown fences.",
        "You may improve objectives, teaching scripts, teacher notes, speaker notes, and AI/manual variation or remediation drafts.",
        "You must not change categories, correctness rates, counts, student ids, student names, source snapshot, or question ids.",
        "Do not include real student names. Individual support names are intentionally omitted.",
        "Allowed misconceptionTags: conceptual-understanding, calculation-symbol, reading-modeling, solution-steps, graph-table-reading, unit-format, strategy-choice.",
        "JSON shape: { objectives?: LocalizedText[], generationNotes?: LocalizedText, items?: [{ itemId, teachingScript?, teacherNotes?, misconceptionTags? }], slides?: [{ slideId, bullets?, speakerNotes? }], variationQuestions?: [{ questionId, prompt?, answer?, explanation? }], remediationQuestions?: [{ questionId, prompt?, answer?, explanation? }] }"
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify(buildLLMPayload(plan))
    }
  ];
}

function applyItemPatches(plan: TeacherReviewLessonPlan, patches: ReviewLessonLLMItemPatch[]) {
  const byId = new Map(patches
    .filter((patch) => typeof patch.itemId === "string")
    .map((patch) => [patch.itemId as string, patch]));
  return plan.items.map((item) => {
    const patch = byId.get(item.id);
    if (!patch) return item;
    const misconceptionTags = Array.isArray(patch.misconceptionTags)
      ? patch.misconceptionTags.filter((tag): tag is TeacherReviewLessonMisconceptionTag =>
          typeof tag === "string" && validMisconceptionTags.has(tag as TeacherReviewLessonMisconceptionTag)
        ).slice(0, 4)
      : item.misconceptionTags;
    return {
      ...item,
      teachingScript: localized(patch.teachingScript, item.teachingScript, 1800),
      teacherNotes: localized(patch.teacherNotes, item.teacherNotes, 1200),
      misconceptionTags: misconceptionTags.length ? misconceptionTags : item.misconceptionTags
    };
  });
}

function applySlidePatches(plan: TeacherReviewLessonPlan, patches: ReviewLessonLLMSlidePatch[]) {
  const byId = new Map(patches
    .filter((patch) => typeof patch.slideId === "string")
    .map((patch) => [patch.slideId as string, patch]));
  return plan.slides.map((slide) => {
    const patch = byId.get(slide.id);
    if (!patch) return slide;
    return {
      ...slide,
      bullets: localizedList(patch.bullets, slide.bullets, 8),
      speakerNotes: localized(patch.speakerNotes, slide.speakerNotes, 1600)
    };
  });
}

function applyPracticePatches(questions: TeacherReviewLessonPracticeQuestion[], patches: ReviewLessonLLMPracticePatch[]) {
  const byId = new Map(patches
    .filter((patch) => typeof patch.questionId === "string")
    .map((patch) => [patch.questionId as string, patch]));
  return questions.map((question) => {
    const patch = byId.get(question.id);
    if (!patch || question.source === "question-bank") return question;
    return {
      ...question,
      source: "ai-generated" as const,
      prompt: localized(patch.prompt, question.prompt, 1000),
      answer: clean(patch.answer, 400) ?? question.answer,
      explanation: localized(patch.explanation, question.explanation ?? { en: "", zh: "", zhHans: "" }, 1200),
      validationStatus: "needs-teacher-review" as const
    };
  });
}

function applyPatch(plan: TeacherReviewLessonPlan, patch: ReviewLessonLLMPatch): TeacherReviewLessonPlan {
  return {
    ...plan,
    objectives: localizedList(patch.objectives, plan.objectives, 8),
    generationNotes: localized(patch.generationNotes, plan.generationNotes, 1200),
    items: Array.isArray(patch.items) ? applyItemPatches(plan, patch.items as ReviewLessonLLMItemPatch[]) : plan.items,
    slides: Array.isArray(patch.slides) ? applySlidePatches(plan, patch.slides as ReviewLessonLLMSlidePatch[]) : plan.slides,
    variationQuestions: Array.isArray(patch.variationQuestions)
      ? applyPracticePatches(plan.variationQuestions, patch.variationQuestions as ReviewLessonLLMPracticePatch[])
      : plan.variationQuestions,
    remediationQuestions: Array.isArray(patch.remediationQuestions)
      ? applyPracticePatches(plan.remediationQuestions, patch.remediationQuestions as ReviewLessonLLMPracticePatch[])
      : plan.remediationQuestions
  };
}

export async function maybeEnrichTeacherReviewLessonPlanWithLLM(plan: TeacherReviewLessonPlan): Promise<TeacherReviewLessonPlan> {
  const mockJson = process.env.TEACHER_REVIEW_LESSON_LLM_MOCK_JSON;
  if (mockJson?.trim()) {
    const patch = parseJsonObject(mockJson);
    return patch ? applyPatch(plan, patch) : plan;
  }

  if (!llmEnabled()) return plan;
  const providerConfig = readLLMProviderConfig();
  if (!providerConfig.apiKey) return plan;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    boundedLLMNumber(process.env.TEACHER_REVIEW_LESSON_LLM_TIMEOUT_MS, reviewLessonLLMTimeoutMs, 250, 60000)
  );
  try {
    const response = await fetch(providerConfig.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${providerConfig.apiKey}`
      },
      body: JSON.stringify(buildLLMProviderRequestBody({
        model: providerConfig.model,
        provider: providerConfig.provider,
        messages: buildMessages(plan),
        responseFormat: "json_object",
        deepSeekThinking: "disabled",
        maxTokens: boundedLLMNumber(
          process.env.TEACHER_REVIEW_LESSON_LLM_MAX_COMPLETION_TOKENS,
          reviewLessonLLMMaxTokens,
          300,
          4000
        )
      })),
      signal: controller.signal
    });
    if (!response.ok) return plan;
    const data: unknown = await response.json();
    const patch = parseJsonObject(extractLLMProviderReply(data));
    return patch ? applyPatch(plan, patch) : plan;
  } catch {
    return plan;
  } finally {
    clearTimeout(timeout);
  }
}
