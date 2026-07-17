import { randomUUID } from "crypto";
import {
  boundedLLMNumber,
  buildLLMProviderRequestBody,
  extractLLMProviderReply,
  extractLLMProviderUsage,
  readLLMProviderConfig,
  readQwenImageProviderConfig,
  type LLMProviderContentPart,
  type LLMProviderMessage,
  type LLMProviderName,
  type LLMProviderUsage
} from "@/lib/server/llmProvider";
import { isSupportedDifficultyRecord, mapDifficultyToActive } from "@/lib/difficulty";
import { normalizeQuestionDiagram, validateQuestionDiagram } from "@/lib/questionFigure";
import type {
  AssessmentEmbeddedQuestion,
  AssessmentPaperSection,
  AssignmentContentType,
  Difficulty,
  GradeId,
  LocalizedText,
  QuestionDiagram,
  QuestionType
} from "@/types";

const assignmentGenerationDefaultQuestionCount = 5;
const assignmentGenerationMaxImageDataUrlLength = 1_500_000;
const validQuestionTypes = new Set<QuestionType>(["multiple-choice", "fill-in", "short-answer", "graph"]);

export type TeacherAssignmentGenerationResult = {
  title: LocalizedText;
  description: LocalizedText;
  sections: AssessmentPaperSection[];
  provider: LLMProviderName;
  model: string;
  usedImage: boolean;
  usage: LLMProviderUsage;
};

export type TeacherAssignmentGenerationInput = {
  title: string;
  description: string;
  contentType: AssignmentContentType;
  targetId?: string;
  className: string;
  grade: GradeId;
  dueAt?: string | null;
  questionCount?: number;
  imageDataUrl?: string;
  imageFileName?: string;
};

export class TeacherAssignmentGenerationError extends Error {
  constructor(
    public readonly code: "missing-config" | "timeout" | "provider-http" | "empty-reply" | "format-error",
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "TeacherAssignmentGenerationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanText(value: unknown, fallback = "", maxLength = 4000) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function localizedText(value: unknown, fallback: string, maxLength = 4000): LocalizedText {
  if (typeof value === "string") {
    const text = cleanText(value, fallback, maxLength);
    return { en: text, zh: text, zhHans: text };
  }

  if (isRecord(value)) {
    const en = cleanText(value.en, "", maxLength);
    const zh = cleanText(value.zhHans, cleanText(value.zh, en || fallback, maxLength), maxLength);
    const resolvedEn = en || zh || fallback;
    return {
      en: resolvedEn,
      zh: zh || resolvedEn,
      zhHans: zh || resolvedEn
    };
  }

  return { en: fallback, zh: fallback, zhHans: fallback };
}

function extractJsonObjectText(reply: string) {
  const withoutFence = reply
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  return start >= 0 && end > start ? withoutFence.slice(start, end + 1) : withoutFence;
}

function normalizeQuestionType(value: unknown): QuestionType {
  return typeof value === "string" && validQuestionTypes.has(value as QuestionType)
    ? (value as QuestionType)
    : "short-answer";
}

function normalizeDifficulty(value: unknown): Difficulty {
  return isSupportedDifficultyRecord(value)
    ? mapDifficultyToActive(value)
    : "Medium";
}

function normalizeOptions(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const options = value
    .map((option) => localizedText(option, "", 1000))
    .filter((option) => option.en || option.zh);
  return options.length >= 2 ? options.slice(0, 6) : undefined;
}

function normalizeAcceptedAnswers(value: unknown, answer: string) {
  const acceptedAnswers = Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 1000))
    : [];
  return Array.from(new Set([answer, ...acceptedAnswers])).slice(0, 6);
}

function normalizeGeneratedDiagram(value: unknown): QuestionDiagram | undefined {
  if (typeof value === "undefined" || value === null) return undefined;
  const normalized = normalizeQuestionDiagram(value);
  if (!normalized || validateQuestionDiagram(normalized).length > 0) return undefined;
  return normalized;
}

function normalizeGeneratedQuestion(value: unknown, index: number): AssessmentEmbeddedQuestion | null {
  if (!isRecord(value)) return null;
  const prompt = localizedText(value.prompt ?? value.question, "", 4000);
  const answer = cleanText(value.answer, "", 1000);
  if (!prompt.en || !answer) return null;

  const type = normalizeQuestionType(value.type);
  const options = normalizeOptions(value.options);
  const diagram = normalizeGeneratedDiagram(value.diagram);
  const resolvedType = type === "multiple-choice" && !options
    ? "short-answer"
    : type === "graph" && !diagram
      ? "short-answer"
      : type;

  return {
    type: resolvedType,
    prompt,
    options,
    answer,
    acceptedAnswers: normalizeAcceptedAnswers(value.acceptedAnswers, answer),
    explanation: localizedText(value.explanation, answer, 4000),
    topicId: cleanText(value.topicId, "", 120) || undefined,
    difficulty: normalizeDifficulty(value.difficulty ?? (index < 2 ? "Low" : "Medium")),
    diagram
  };
}

function questionPoints(value: unknown) {
  const points = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 10;
  return Math.max(1, Math.min(25, points));
}

function parseGeneratedAssignment(reply: string, fallbackTitle: string): Pick<TeacherAssignmentGenerationResult, "title" | "description" | "sections"> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObjectText(reply));
  } catch {
    throw new TeacherAssignmentGenerationError("format-error", "Assignment generation JSON could not be parsed.");
  }

  if (!isRecord(parsed)) {
    throw new TeacherAssignmentGenerationError("format-error", "Assignment generation JSON was not an object.");
  }

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions = rawQuestions
    .map(normalizeGeneratedQuestion)
    .filter((question): question is AssessmentEmbeddedQuestion => Boolean(question))
    .slice(0, 10);

  if (!questions.length) {
    throw new TeacherAssignmentGenerationError("format-error", "Assignment generation returned no usable questions.");
  }

  return {
    title: localizedText(parsed.title, fallbackTitle, 240),
    description: localizedText(parsed.description, fallbackTitle, 1000),
    sections: [
      {
        id: `section-ai-${randomUUID()}`,
        title: localizedText(parsed.sectionTitle, "AI practice", 240),
        instructions: localizedText(parsed.instructions, "Show your working and answer each question.", 500),
        order: 0,
        items: questions.map((question, index) => {
          const rawQuestion = rawQuestions[index];
          return {
            id: `ai-item-${randomUUID()}`,
            source: "ai-generated" as const,
            embeddedQuestion: question,
            points: isRecord(rawQuestion) ? questionPoints(rawQuestion.points) : 10,
            order: index
          };
        })
      }
    ]
  };
}

function cleanImageDataUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.startsWith("data:image/")) return undefined;
  return trimmed.length <= assignmentGenerationMaxImageDataUrlLength ? trimmed : undefined;
}

function assignmentQuestionCount(value: number | undefined) {
  const envDefault = boundedLLMNumber(
    process.env.ASSIGNMENT_CREATION_QUESTION_COUNT,
    assignmentGenerationDefaultQuestionCount,
    1,
    10
  );
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(10, Math.round(value)))
    : envDefault;
}

function buildPrompt(input: TeacherAssignmentGenerationInput, questionCount: number, usedImage: boolean) {
  return [
    "You are generating a short math practice assignment for MAIS.",
    "Return strict JSON only. Do not include markdown fences.",
    "The JSON shape must be:",
    "{\"title\":{\"en\":\"...\",\"zh\":\"...\",\"zhHans\":\"...\"},\"description\":{\"en\":\"...\",\"zh\":\"...\",\"zhHans\":\"...\"},\"sectionTitle\":{\"en\":\"Practice\",\"zh\":\"练习\",\"zhHans\":\"练习\"},\"instructions\":{\"en\":\"...\",\"zh\":\"...\",\"zhHans\":\"...\"},\"questions\":[{\"type\":\"short-answer\",\"prompt\":{\"en\":\"...\",\"zh\":\"...\",\"zhHans\":\"...\"},\"answer\":\"...\",\"acceptedAnswers\":[\"...\"],\"explanation\":{\"en\":\"...\",\"zh\":\"...\",\"zhHans\":\"...\"},\"difficulty\":\"Medium\",\"points\":10}]}",
    "Allowed question types: multiple-choice, fill-in, short-answer, graph.",
    "Allowed difficulty values: Low, Medium, High.",
    "Use bilingual English and Simplified Chinese copy. Keep the math correct and grade appropriate.",
    "For graph or image-derived questions, write a clear text prompt that can be answered in the app.",
    "A question may include an optional \"diagram\" field that renders an exact vector figure in the app. Include it when a figure is pedagogically needed (plane geometry, number lines, coordinate work, solids); omit it otherwise. Every type \"graph\" question MUST include a diagram. Never reference a figure in the prompt without providing the diagram field.",
    "The diagram must be exactly one of these JSON shapes:",
    "plane-figure: {\"kind\":\"plane-figure\",\"points\":[{\"id\":\"A\",\"x\":0,\"y\":0,\"label\":\"A\"}],\"segments\":[{\"from\":\"A\",\"to\":\"B\",\"label\":{\"en\":\"5 cm\",\"zh\":\"5 厘米\"}}],\"polygons\":[{\"vertexIds\":[\"A\",\"B\",\"C\"]}],\"circles\":[{\"centerId\":\"O\",\"radius\":2}],\"angleMarks\":[{\"vertexId\":\"B\",\"fromId\":\"A\",\"toId\":\"C\",\"label\":{\"en\":\"50°\",\"zh\":\"50°\"}}]} (segments/polygons/circles/angleMarks are optional; ids must reference points; use rightAngle:true only for true 90° angles).",
    "number-line: {\"kind\":\"number-line\",\"range\":[0,10],\"tickInterval\":1,\"points\":[{\"value\":3,\"label\":\"P\",\"marker\":\"closed\"}],\"highlights\":[{\"from\":2,\"to\":5}]}.",
    "coordinate-grid: {\"kind\":\"coordinate-grid\",\"xRange\":[-5,5],\"yRange\":[-5,5],\"points\":[{\"label\":\"A\",\"x\":1,\"y\":2}],\"lines\":[{\"points\":[{\"x\":0,\"y\":0},{\"x\":2,\"y\":4}]}]}.",
    "solid-figure: {\"kind\":\"solid-figure\",\"shape\":\"cuboid\",\"width\":4,\"depth\":3,\"height\":2,\"labels\":{\"width\":{\"en\":\"4 cm\",\"zh\":\"4 cm\"},\"depth\":{\"en\":\"3 cm\",\"zh\":\"3 cm\"},\"height\":{\"en\":\"2 cm\",\"zh\":\"2 cm\"}}} (shapes: cuboid uses width/depth/height, cube uses size, cylinder and cone use radius/height, sphere uses radius).",
    "Diagram coordinates must be mathematically consistent with the stated answer: marked angles, lengths, and positions are recomputed and validated deterministically, and malformed or inconsistent diagrams are discarded (a graph question then falls back to short-answer).",
    usedImage ? "A question image is attached. Read the image and generate answerable practice questions from it." : "No image is attached. Use the teacher title, target, and description.",
    `Question count: ${questionCount}`,
    `Class: ${input.className}`,
    `Grade: ${input.grade}`,
    `Teacher title: ${input.title}`,
    `Teacher description: ${input.description || "none"}`,
    `Content type requested: ${input.contentType}`,
    `Target id or topic: ${input.targetId || "none"}`,
    `Due at: ${input.dueAt || "not set"}`,
    input.imageFileName ? `Image file name: ${input.imageFileName}` : ""
  ].filter(Boolean).join("\n");
}

export async function generateTeacherAssignmentAssessment(input: TeacherAssignmentGenerationInput): Promise<TeacherAssignmentGenerationResult> {
  const imageDataUrl = cleanImageDataUrl(input.imageDataUrl);
  const config = imageDataUrl ? readQwenImageProviderConfig() : readLLMProviderConfig();
  if (!config.apiKey) {
    throw new TeacherAssignmentGenerationError("missing-config", "Assignment generation LLM is not configured.");
  }

  const questionCount = assignmentQuestionCount(input.questionCount);
  const prompt = buildPrompt(input, questionCount, Boolean(imageDataUrl));
  const messages: LLMProviderMessage[] = [
    {
      role: "system",
      content: "You are a careful mathematics assessment author. You output only valid JSON."
    },
    {
      role: "user",
      content: imageDataUrl
        ? ([
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } }
          ] satisfies LLMProviderContentPart[])
        : prompt
    }
  ];

  const timeoutMs = boundedLLMNumber(process.env.ASSIGNMENT_CREATION_LLM_TIMEOUT_MS, 30000, 5000, 90000);
  const maxTokens = boundedLLMNumber(process.env.ASSIGNMENT_CREATION_LLM_MAX_COMPLETION_TOKENS, 3000, 800, 8000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify(buildLLMProviderRequestBody({
        model: config.model,
        messages,
        maxTokens,
        provider: config.provider,
        responseFormat: "json_object",
        deepSeekThinking: "disabled"
      }))
    });

    if (!response.ok) {
      throw new TeacherAssignmentGenerationError("provider-http", "Assignment generation provider returned an error.", response.status);
    }

    const payload: unknown = await response.json();
    const reply = extractLLMProviderReply(payload);
    if (!reply) {
      throw new TeacherAssignmentGenerationError("empty-reply", "Assignment generation provider returned an empty reply.");
    }

    return {
      ...parseGeneratedAssignment(reply, input.title),
      provider: config.provider,
      model: config.model,
      usedImage: Boolean(imageDataUrl),
      usage: extractLLMProviderUsage(payload)
    };
  } catch (error) {
    if (error instanceof TeacherAssignmentGenerationError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TeacherAssignmentGenerationError("timeout", "Assignment generation provider timed out.");
    }
    throw new TeacherAssignmentGenerationError("provider-http", "Assignment generation provider request failed.");
  } finally {
    clearTimeout(timeout);
  }
}
