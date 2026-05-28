"use client";

import { ChangeEvent, createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MathText } from "@/components/math/MathText";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { FunctionGraphExplorer } from "@/components/visualizations/FunctionGraphExplorer";
import {
  normalizeAITutorVisualization,
  type AITutorVisualization
} from "@/lib/aiTutorVisualization";
import { formatGradeLabel, formatLearnerName, isChineseLanguage, simplifyChineseText, textForLanguage, traditionalToSimplifiedMap } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  CurriculumTrack,
  GradeId,
  HongKongDseMathDifficultyBand,
  HongKongDseMathLanguageVariant,
  HongKongDseMathPaperComponent,
  HongKongDseMathRagIntent,
  HongKongMathEdBDifficultyBand,
  HongKongMathEdBDocumentPurpose,
  HongKongMathEdBRagIntent,
  HongKongMathEdBStage,
  Language,
  MainlandPepDifficultyBand,
  MainlandPepRagIntent,
  StudentSession
} from "@/types";

export type TutorDataScope = "student-dashboard" | "teacher-dashboard" | "teacher-student-profile" | "adaptive-engine";

type TutorEvidenceQuery = {
  conceptIds?: string[];
  chapter?: string;
  grade?: GradeId;
  topicId?: string;
  stage?: HongKongMathEdBStage;
  documentPurpose?: HongKongMathEdBDocumentPurpose;
  paperComponent?: HongKongDseMathPaperComponent;
  language?: HongKongDseMathLanguageVariant;
  intent: MainlandPepRagIntent | HongKongMathEdBRagIntent | HongKongDseMathRagIntent;
  difficultyBand?: MainlandPepDifficultyBand | HongKongMathEdBDifficultyBand | HongKongDseMathDifficultyBand;
  limit?: number;
};

export type TutorContext = {
  mode: "concept" | "question" | "figure" | "mistake" | "general";
  title: string;
  details?: string;
  curriculumTrack?: CurriculumTrack;
  topicId?: string;
  skillId?: string;
  questionId?: string;
  lessonSlug?: string;
  evidenceQuery?: TutorEvidenceQuery;
  dataScopes?: TutorDataScope[];
  targetStudentId?: string;
};

type TutorMessage = {
  id?: string;
  role: "tutor" | "student";
  content: string;
  visualization?: AITutorVisualization;
  status?: "thinking" | "typing";
};

type TutorApiResponse = {
  reply?: string;
  visualization?: AITutorVisualization;
  error?: string;
  mode?: string;
};

type TutorSetupStatus = {
  state: "checking" | "configured" | "local-helper";
  model?: string;
};

type TutorAttachment = {
  id: string;
  name: string;
  size: number;
  file: File;
};

type AITutorContextValue = {
  openTutor: (context?: TutorContext) => void;
};

type TutorDraft = {
  userId: string;
  role: StudentSession["role"] | "guest";
  open: boolean;
  context?: TutorContext;
  input: string;
  messages: TutorMessage[];
};

const AITutorContext = createContext<AITutorContextValue | null>(null);

type TutorDraftOwner = Pick<TutorDraft, "userId" | "role">;

const legacyTutorDraftStorageKey = "mais-ai-tutor-draft-v1";
const tutorDraftStorageKeyPrefix = "mais-ai-tutor-draft-v2";
const tutorDraftMaxAgeMs = 12 * 60 * 60 * 1000;
const tutorContextModes = new Set<TutorContext["mode"]>(["concept", "question", "figure", "mistake", "general"]);
const tutorDraftRoles = new Set<TutorDraft["role"]>(["student", "teacher", "parent", "admin", "guest"]);
const tutorCurriculumTracks = new Set<CurriculumTrack>(["HK", "MAINLAND_PEP_HIGH", "US_CA_MATH", "US_NC_MATH"]);
const tutorGradeValues = new Set<GradeId>(["P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"]);
const tutorDataScopeValues: TutorDataScope[] = ["student-dashboard", "teacher-dashboard", "teacher-student-profile", "adaptive-engine"];
const tutorDataScopeSet = new Set<TutorDataScope>(tutorDataScopeValues);
const tutorEvidenceStages = new Set<HongKongMathEdBStage>([
  "whole-curriculum",
  "primary",
  "junior-secondary",
  "senior-secondary-compulsory",
  "senior-secondary-m1",
  "senior-secondary-m2",
  "senior-secondary-support",
  "implementation"
]);
const tutorEvidenceDocumentPurposes = new Set<HongKongMathEdBDocumentPurpose>([
  "curriculum-guide",
  "learning-content-supplement",
  "curriculum-interpretation",
  "revision-comparison",
  "curriculum-assessment-guide",
  "implementation-timeline",
  "learning-diversity-support"
]);
const tutorEvidencePaperComponents = new Set<HongKongDseMathPaperComponent>(["paper-1", "paper-2", "answer-file"]);
const tutorEvidenceLanguageVariants = new Set<HongKongDseMathLanguageVariant>(["en", "zh"]);
const tutorEvidenceIntents = new Set<TutorEvidenceQuery["intent"]>([
  "tutor-explain",
  "generate-question",
  "generate-lesson",
  "exam-practice",
  "diagnose-mistake",
  "assessment-design"
]);
const tutorEvidenceDifficultyBands = new Set<NonNullable<TutorEvidenceQuery["difficultyBand"]>>(["foundation", "core", "exam", "challenge"]);
const immersiveGameRoutes = ["/practice/fishing-game", "/practice/adventure-island"];
const simplifiedChineseSignalCharacters = new Set(
  Object.entries(traditionalToSimplifiedMap)
    .filter(([traditional, simplified]) => traditional !== simplified)
    .map(([, simplified]) => simplified)
);

const latestTutorDrafts = new Map<string, TutorDraft>();

const tutorNames = {
  en: "Professor Nova",
  zh: "Nova 導師"
} as const;

const tutorSignatures = {
  en: "Professor Nova ✦",
  zh: "Nova 導師 ✦"
} as const;

function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function tutorMessage(role: TutorMessage["role"], content: string, status?: TutorMessage["status"]): TutorMessage {
  return {
    id: createMessageId(role),
    role,
    content,
    ...(status ? { status } : {})
  };
}

function NovaMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative isolate inline-grid shrink-0 place-items-center rounded-full border border-cyan-100/60 bg-slate-950 text-cyan-50 shadow-[0_0_24px_rgba(103,232,249,0.42)]",
        compact ? "h-8 w-8" : "h-10 w-10"
      )}
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-[conic-gradient(from_120deg,rgba(34,211,238,0.92),rgba(165,180,252,0.3),rgba(232,121,249,0.9),rgba(34,211,238,0.92))] opacity-90 blur-[1px] animate-[spin_7s_linear_infinite]" />
      <span className="absolute inset-[3px] -z-10 rounded-full bg-[radial-gradient(circle_at_28%_24%,rgba(207,250,254,0.8),transparent_24%),linear-gradient(145deg,rgba(8,13,35,0.98),rgba(46,16,101,0.9))]" />
      <span className={cn("font-black leading-none text-cyan-50 drop-shadow-[0_0_8px_rgba(207,250,254,0.95)]", compact ? "text-base" : "text-lg")}>
        ✦
      </span>
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-fuchsia-200 shadow-[0_0_12px_rgba(240,171,252,0.95)]" />
    </span>
  );
}

function ThinkingNovaMark() {
  return (
    <span
      aria-hidden="true"
      className="relative isolate grid h-12 w-12 shrink-0 place-items-center rounded-full"
    >
      <span className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.46),transparent_64%)] blur-md animate-pulse motion-reduce:animate-none" />
      <span className="absolute inset-[2px] rounded-full bg-[conic-gradient(from_90deg,rgba(103,232,249,0.98),rgba(129,140,248,0.24),rgba(232,121,249,0.95),rgba(34,211,238,0.98))] shadow-[0_0_26px_rgba(34,211,238,0.42)] animate-[spin_3.6s_linear_infinite] motion-reduce:animate-none" />
      <span className="absolute inset-[6px] rounded-full bg-slate-950 shadow-[inset_0_0_18px_rgba(103,232,249,0.28)]" />
      <span className="absolute inset-[8px] rounded-full bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.86),transparent_15%),radial-gradient(circle_at_72%_74%,rgba(34,211,238,0.68),transparent_34%),linear-gradient(145deg,rgba(30,27,75,0.98),rgba(8,47,73,0.96),rgba(88,28,135,0.94))]" />
      <span className="absolute inset-[9px] rounded-full border border-cyan-100/50 border-b-fuchsia-200/90 animate-[spin_2.8s_linear_infinite_reverse] motion-reduce:animate-none" />
      <span className="absolute inset-[13px] rounded-full border border-cyan-200/25 border-l-white/70 border-r-fuchsia-200/70 animate-[spin_4.5s_linear_infinite] motion-reduce:animate-none" />
      <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-fuchsia-200 shadow-[0_0_18px_rgba(240,171,252,0.96)]">
        <span className="h-1.5 w-1.5 rounded-full bg-white/95" />
      </span>
      <span className="absolute left-1 top-1/2 h-1.5 w-1.5 rounded-full bg-cyan-100 shadow-[0_0_12px_rgba(165,243,252,0.95)] animate-ping motion-reduce:animate-none" />
      <span className="absolute inset-[7px] overflow-hidden rounded-full">
        <span className="absolute -left-7 top-1/2 h-8 w-3 -translate-y-1/2 rotate-12 bg-white/35 blur-[2px] animate-[pulse_1.4s_ease-in-out_infinite] motion-reduce:animate-none" />
      </span>
      <span className="relative text-xl font-black leading-none text-white drop-shadow-[0_0_10px_rgba(207,250,254,0.98)] animate-[pulse_1.8s_ease-in-out_infinite] motion-reduce:animate-none">
        ✦
      </span>
    </span>
  );
}

function ThinkingBubble({ language }: { language: Language }) {
  const label = textForLanguage({ en: "Thinking", zh: "正在思考" }, language);

  return (
    <div role="status" aria-live="polite" className="flex min-h-12 items-center gap-3">
      <ThinkingNovaMark />
      <span className="relative inline-flex overflow-hidden rounded-full">
        <span className="bg-gradient-to-r from-cyan-400 via-slate-950 to-fuchsia-500 bg-clip-text text-base font-black text-transparent animate-pulse dark:from-cyan-200 dark:via-white dark:to-fuchsia-200 motion-reduce:animate-none">
          {label}
        </span>
        <span className="ml-1 inline-flex items-end gap-0.5 text-cyan-500 dark:text-cyan-100" aria-hidden="true">
          <span className="animate-bounce [animation-delay:-0.24s] motion-reduce:animate-none">.</span>
          <span className="animate-bounce [animation-delay:-0.12s] motion-reduce:animate-none">.</span>
          <span className="animate-bounce motion-reduce:animate-none">.</span>
        </span>
      </span>
    </div>
  );
}

function TypewriterMathText({
  active,
  onDone,
  onProgress,
  text
}: {
  active: boolean;
  onDone: () => void;
  onProgress?: () => void;
  text: string;
}) {
  const characters = useMemo(() => Array.from(text), [text]);
  const [visibleText, setVisibleText] = useState(active ? "" : text);
  const onDoneRef = useRef(onDone);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    if (!active) {
      setVisibleText(text);
      return;
    }

    if (!characters.length) {
      setVisibleText("");
      onDoneRef.current();
      return;
    }

    let frame = 0;
    let lastCount = 0;
    const startedAt = performance.now();
    const charactersPerSecond = 145;

    function tick(now: number) {
      const elapsedSeconds = (now - startedAt) / 1000;
      const nextCount = Math.min(characters.length, Math.max(1, Math.floor(elapsedSeconds * charactersPerSecond)));

      if (nextCount !== lastCount) {
        lastCount = nextCount;
        setVisibleText(characters.slice(0, nextCount).join(""));
        onProgressRef.current?.();
      }

      if (nextCount < characters.length) {
        frame = requestAnimationFrame(tick);
      } else {
        setVisibleText(text);
        onDoneRef.current();
      }
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, characters, text]);

  return <MathText text={visibleText} />;
}

function contextLabel(context: TutorContext | undefined, language: Language) {
  if (!context) return textForLanguage({ en: "this page", zh: "本頁" }, language);
  if (isChineseLanguage(language)) {
    if (context.mode === "question") return simplifyChineseText(`這道題目：${context.title}`, language);
    if (context.mode === "figure") return simplifyChineseText(`這個視覺化：${context.title}`, language);
    if (context.mode === "mistake") return simplifyChineseText(`這項錯題：${context.title}`, language);
    if (context.mode === "concept") return simplifyChineseText(`這個概念：${context.title}`, language);
    return context.title;
  }
  if (context.mode === "question") return `this question: ${context.title}`;
  if (context.mode === "figure") return `this visualization: ${context.title}`;
  if (context.mode === "mistake") return `this mistake-book item: ${context.title}`;
  if (context.mode === "concept") return `this concept: ${context.title}`;
  return context.title;
}

function openingMessage(context: TutorContext | undefined, language: Language) {
  if (isChineseLanguage(language)) {
    return simplifyChineseText(`你好，我是${textForLanguage(tutorSignatures, language)}。我可以協助你處理${contextLabel(context, language)}。先告訴我你目前理解到哪一步，我會逐步引導你，而不是直接給答案。`, language);
  }
  return `Hi, I am ${tutorSignatures.en}, your AI Tutor. I can help with ${contextLabel(context, language)}. Share what you understand so far, and I’ll use the Socratic method to guide you step by step instead of simply giving away the answer.`;
}

function buildTutorReply(input: string, context: TutorContext | undefined, language: Language) {
  const lower = input.toLowerCase();
  const asksForAnswer = /answer|solve|solution|答案|解答|點做|怎么做|如何做/.test(lower);
  const needsSupport = /tired|exhausted|stuck|hard|difficult|confused|stress|累|辛苦|唔識|不懂|困難|好難|崩潰/.test(lower);
  const asksConcept = /explain|why|concept|understand|意思|解釋|點解|為什麼|概念/.test(lower);
  const asksIdentity = /who are you|what(?:'s| is) your name|your name|are you\s+(?:professor\s+nova|(?:hk\s+)?teacher\s+chan|mainland\s+teacher\s+phoebe)|professor\s+nova.*(?:teacher\s+chan|teacher\s+phoebe)|(?:teacher\s+chan|teacher\s+phoebe).*professor\s+nova|你是.*(?:nova|chan|phoebe|誰|谁)|你係.*(?:nova|chan|phoebe|邊個|边个)|你叫|身份/i.test(input);

  if (asksIdentity) {
    if (isChineseLanguage(language)) {
      return simplifyChineseText("我是 Professor Nova，也就是 MAIS 的 AI Tutor，不是 HK Teacher Chan 或 Mainland Teacher Phoebe；我會以 Nova 導師的身份陪你學數學。", language);
    }
    return "I am Professor Nova, the MAIS AI Tutor. I am not HK Teacher Chan or Mainland Teacher Phoebe; I will help you learn math as Professor Nova.";
  }

  if (needsSupport) {
    if (isChineseLanguage(language)) {
      return simplifyChineseText(`我明白。先和我一起做一小步。數學卡住通常代表題目藏了太多步驟，不代表你不擅長。讓我們縮小範圍：你能從${contextLabel(context, language)}找出第一個已知條件、公式或圖中標記嗎？`, language);
    }
    return `I hear you. Take one small step with me. In math, feeling stuck usually means the problem has too many hidden steps, not that you are bad at it. Let us reduce it: what is the first fact, formula, or diagram label you can identify from ${contextLabel(context, language)}?`;
  }

  if (context?.mode === "mistake") {
    if (isChineseLanguage(language)) {
      return simplifyChineseText("這是一題值得重溫的錯題。先比較上次答案和正確答案，看看改變的是符號、公式、代入還是題意理解。告訴我哪一部分不確定，我會用相似例子和你重建方法。", language);
    }
    return `Good mistake to review. First compare your last answer with the correct answer. What changed: the sign, the formula, the substitution, or the interpretation? If you tell me which part feels uncertain, I will help you rebuild the method with a similar example.`;
  }

  if (context?.mode === "figure") {
    if (isChineseLanguage(language)) {
      return simplifyChineseText("先觀察視覺化中的規律。當你拖曳、滑動或調整控制項時，有甚麼改變？嘗試說出一個保持不變的量和一個正在改變的量，這通常就是由圖像走向代數的橋樑。", language);
    }
    return `Look at the visual pattern first. What changes when you drag, slide, or adjust the controls? Try naming one quantity that stays fixed and one quantity that changes. That observation is usually the bridge from the figure to the algebra.`;
  }

  if (context?.mode === "question" || asksForAnswer) {
    if (isChineseLanguage(language)) {
      return simplifyChineseText(`我們走引導式路線。第一步：辨認課題和未知量。第二步：寫出相關性質或公式。第三步：小心代入。對於${contextLabel(context, language)}，題目要求的是哪個數值或關係？先回覆這一點，我再帶你做下一步。`, language);
    }
    return `Let us use a Socratic route. Step 1: identify the topic and the unknown. Step 2: write the relevant fact or formula. Step 3: substitute carefully. For ${contextLabel(context, language)}, what value or relationship is the question asking for? Reply with that, and I will guide the next step.`;
  }

  if (context?.mode === "concept" || asksConcept) {
    if (isChineseLanguage(language)) {
      return simplifyChineseText(`我們用學習路線：先講意思，再看視覺模型，最後連到代數。對於${contextLabel(context, language)}，可以問自己：涉及哪些物件？甚麼規則把它們連起來？某個值改變時有甚麼跟着變？用一句話說出你現在的理解，我會幫你修正。`, language);
    }
    return `Here is a learning route: start with the meaning, then the visual model, then the algebra. For ${contextLabel(context, language)}, ask yourself: what objects are involved, what rule connects them, and what changes when one value changes? Give me one sentence of your current understanding, and I will refine it.`;
  }

  if (isChineseLanguage(language)) {
    return simplifyChineseText("我們一起處理。你可以要求概念解釋、逐步提示、檢查思路或鼓勵支持。你想先要哪一種？", language);
  }
  return `Let us work on this together. I can explain the concept, ask guiding questions, check your reasoning, or help you plan revision. Which one do you want: concept explanation, step-by-step hint, answer check, or encouragement?`;
}

function hasChineseText(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

function hasLatinText(value: string) {
  return /[A-Za-z]/.test(value);
}

function inferChineseScript(value: string): Extract<Language, "zh" | "zh-Hans"> | undefined {
  let simplifiedScore = 0;
  let traditionalScore = 0;

  for (const character of Array.from(value)) {
    const simplified = traditionalToSimplifiedMap[character];
    if (simplified && simplified !== character) traditionalScore += 1;
    if (simplifiedChineseSignalCharacters.has(character)) simplifiedScore += 1;
  }

  if (simplifiedScore > traditionalScore) return "zh-Hans";
  if (traditionalScore > simplifiedScore) return "zh";
  return undefined;
}

function fallbackLanguageForInput(language: Language, input: string, messages: TutorMessage[]): Language {
  if (hasChineseText(input)) {
    const historyText = messages
      .filter((message) => message.role === "student")
      .map((message) => message.content)
      .join("\n");
    return inferChineseScript(input) ?? inferChineseScript(historyText) ?? (language === "zh-Hans" ? "zh-Hans" : "zh");
  }

  if (hasLatinText(input)) return "en";
  return language;
}

function visibleFallbackReason(reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) return "";
  if (/LLM|provider|structured tutor reply|API request failed|HTTP \d+|request timed out|request failed|\.env|OPENAI|DeepSeek/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanTutorString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function setHas<T extends string>(set: ReadonlySet<T>, value: unknown): value is T {
  return typeof value === "string" && (set as ReadonlySet<string>).has(value);
}

function readTutorEvidenceQuery(value: unknown): TutorEvidenceQuery | undefined {
  if (!isRecord(value)) return undefined;

  const conceptIds = Array.isArray(value.conceptIds)
    ? Array.from(new Set(value.conceptIds.map((conceptId) => cleanTutorString(conceptId, 80)).filter(Boolean))).slice(0, 8)
    : [];
  const chapter = cleanTutorString(value.chapter, 120);
  const topicId = cleanTutorString(value.topicId, 160);
  const grade = setHas(tutorGradeValues, value.grade) ? value.grade : undefined;
  const stage = setHas(tutorEvidenceStages, value.stage) ? value.stage : undefined;
  const documentPurpose = setHas(tutorEvidenceDocumentPurposes, value.documentPurpose) ? value.documentPurpose : undefined;
  const paperComponent = setHas(tutorEvidencePaperComponents, value.paperComponent) ? value.paperComponent : undefined;
  const evidenceLanguage = setHas(tutorEvidenceLanguageVariants, value.language) ? value.language : undefined;
  const intent = setHas(tutorEvidenceIntents, value.intent) ? value.intent : "tutor-explain";
  const difficultyBand = setHas(tutorEvidenceDifficultyBands, value.difficultyBand) ? value.difficultyBand : undefined;
  const limit = typeof value.limit === "number" && Number.isFinite(value.limit)
    ? Math.min(5, Math.max(1, Math.round(value.limit)))
    : undefined;

  if (!conceptIds.length && !chapter && !grade && !topicId && !stage && !documentPurpose && !paperComponent && !evidenceLanguage && !difficultyBand) {
    return undefined;
  }

  return {
    ...(conceptIds.length ? { conceptIds } : {}),
    ...(chapter ? { chapter } : {}),
    ...(grade ? { grade } : {}),
    ...(topicId ? { topicId } : {}),
    ...(stage ? { stage } : {}),
    ...(documentPurpose ? { documentPurpose } : {}),
    ...(paperComponent ? { paperComponent } : {}),
    ...(evidenceLanguage ? { language: evidenceLanguage } : {}),
    intent,
    ...(difficultyBand ? { difficultyBand } : {}),
    ...(limit ? { limit } : {})
  };
}

function isPrimaryGrade(grade: GradeId) {
  return grade.startsWith("P");
}

function isJuniorSecondaryGrade(grade: GradeId) {
  return grade === "S1" || grade === "S2" || grade === "S3";
}

function hongKongStageForGrade(grade: GradeId): HongKongMathEdBStage {
  if (isPrimaryGrade(grade)) return "primary";
  if (isJuniorSecondaryGrade(grade)) return "junior-secondary";
  return "senior-secondary-compulsory";
}

function hongKongEvidenceLanguage(language: Language): HongKongDseMathLanguageVariant {
  return isChineseLanguage(language) ? "zh" : "en";
}

function tutorEvidenceSearchText(input: string, context: TutorContext | undefined, page: string) {
  return `${input} ${page} ${context?.title ?? ""} ${context?.details ?? ""}`.toLowerCase();
}

function asksForExamOrPaperEvidence(input: string, context: TutorContext | undefined, page: string) {
  return /exam|paper|dse|assessment|test|mock|past paper|考試|考试|測驗|测验|試卷|试卷|卷一|卷二|paper\s*[12]/i.test(tutorEvidenceSearchText(input, context, page));
}

function inferHongKongPaperComponent(input: string, context: TutorContext | undefined, page: string): HongKongDseMathPaperComponent | undefined {
  const searchable = tutorEvidenceSearchText(input, context, page);
  if (/paper\s*2|paper\s*ii|卷\s*二|卷二/i.test(searchable)) return "paper-2";
  if (/paper\s*1|paper\s*i\b|卷\s*一|卷一/i.test(searchable)) return "paper-1";
  return undefined;
}

function tutorRequestTitle(context: TutorContext | undefined, input: string, page: string) {
  if (context?.title) return context.title;
  const inputTitle = cleanTutorString(input, 120);
  if (inputTitle) return inputTitle;
  if (page.startsWith("/dashboard")) return "Dashboard AI Tutor question";
  if (page.startsWith("/practice")) return "Practice AI Tutor question";
  if (page.startsWith("/mistake-book")) return "Mistake Book AI Tutor question";
  return "AI Tutor question";
}

function buildTutorEvidenceQuery({
  context,
  input,
  grade,
  language,
  page,
  curriculumTrack
}: {
  context?: TutorContext;
  input: string;
  grade: GradeId;
  language: Language;
  page: string;
  curriculumTrack?: CurriculumTrack;
}): TutorEvidenceQuery | undefined {
  if (context?.evidenceQuery) {
    return {
      ...context.evidenceQuery,
      grade: context.evidenceQuery.grade ?? grade,
      topicId: context.evidenceQuery.topicId ?? context.topicId
    };
  }

  if (curriculumTrack !== "HK" && curriculumTrack !== "MAINLAND_PEP_HIGH") return undefined;

  const asksExam = asksForExamOrPaperEvidence(input, context, page);
  const intent = context?.mode === "mistake"
    ? "diagnose-mistake"
    : asksExam
      ? "exam-practice"
      : "tutor-explain";
  const difficultyBand = asksExam ? "exam" : "core";

  if (curriculumTrack === "HK") {
    const paperComponent = inferHongKongPaperComponent(input, context, page);
    return {
      grade,
      ...(context?.topicId ? { topicId: context.topicId } : {}),
      stage: hongKongStageForGrade(grade),
      documentPurpose: "curriculum-guide",
      ...(paperComponent ? { paperComponent } : {}),
      language: hongKongEvidenceLanguage(language),
      intent,
      difficultyBand
    };
  }

  return {
    grade,
    ...(context?.topicId ? { topicId: context.topicId } : {}),
    ...(context?.evidenceQuery?.chapter ? { chapter: context.evidenceQuery.chapter } : {}),
    intent,
    difficultyBand
  };
}

function buildTutorRequestContext({
  context,
  input,
  grade,
  language,
  page,
  curriculumTrack
}: {
  context?: TutorContext;
  input: string;
  grade: GradeId;
  language: Language;
  page: string;
  curriculumTrack?: CurriculumTrack;
}): TutorContext | undefined {
  const resolvedTrack = context?.curriculumTrack ?? curriculumTrack;
  const evidenceQuery = buildTutorEvidenceQuery({
    context,
    input,
    grade,
    language,
    page,
    curriculumTrack: resolvedTrack
  });

  if (!context && !evidenceQuery) return undefined;

  return {
    mode: context?.mode ?? "general",
    title: tutorRequestTitle(context, input, page),
    details: context?.details,
    ...(resolvedTrack ? { curriculumTrack: resolvedTrack } : {}),
    topicId: context?.topicId,
    skillId: context?.skillId,
    questionId: context?.questionId,
    lessonSlug: context?.lessonSlug,
    ...(evidenceQuery ? { evidenceQuery } : {}),
    dataScopes: context?.dataScopes,
    targetStudentId: context?.targetStudentId
  };
}

function stripQuestionAnswer(context?: TutorContext) {
  if (!context?.details) return context;

  const details = context.details
    .replace(/\s*Correct answer:\s*[^.。]*(?:[.。]|$)/i, "")
    .replace(/\s*正確答案：\s*[^.。]*(?:[.。]|$)/, "")
    .replace(/\s*正确答案：\s*[^.。]*(?:[.。]|$)/, "")
    .trim();

  return {
    ...context,
    details: details || undefined
  };
}

function readApiResponse(value: unknown): TutorApiResponse {
  if (!isRecord(value)) return {};
  const visualization = normalizeAITutorVisualization(value.visualization);
  return {
    reply: typeof value.reply === "string" ? value.reply : undefined,
    ...(visualization ? { visualization } : {}),
    error: typeof value.error === "string" ? value.error : undefined,
    mode: typeof value.mode === "string" ? value.mode : undefined
  };
}

function readSetupStatus(value: unknown): TutorSetupStatus {
  if (!isRecord(value)) return { state: "local-helper" };
  return {
    state: value.configured === true ? "configured" : "local-helper",
    model: typeof value.model === "string" ? value.model : undefined
  };
}

function hasStudentMessage(messages: TutorMessage[]) {
  return messages.some((message) => message.role === "student");
}

function sanitizeMessagesForDraft(messages: TutorMessage[]): TutorMessage[] {
  return messages
    .filter((message) => !(message.status === "thinking" && !message.content.trim()))
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      visualization: message.visualization,
      ...(message.status === "typing" ? { status: message.status } : {})
    }));
}

function readTutorContext(value: unknown): TutorContext | undefined {
  if (!isRecord(value) || !tutorContextModes.has(value.mode as TutorContext["mode"]) || typeof value.title !== "string") {
    return undefined;
  }
  const dataScopes = Array.isArray(value.dataScopes)
    ? Array.from(new Set(value.dataScopes.filter((scope): scope is TutorDataScope => tutorDataScopeSet.has(scope as TutorDataScope))))
    : [];
  const curriculumTrack = setHas(tutorCurriculumTracks, value.curriculumTrack) ? value.curriculumTrack : undefined;
  const evidenceQuery = readTutorEvidenceQuery(value.evidenceQuery);

  return {
    mode: value.mode as TutorContext["mode"],
    title: value.title,
    details: typeof value.details === "string" ? value.details : undefined,
    curriculumTrack,
    topicId: typeof value.topicId === "string" ? value.topicId : undefined,
    skillId: typeof value.skillId === "string" ? value.skillId : undefined,
    questionId: typeof value.questionId === "string" ? value.questionId : undefined,
    lessonSlug: typeof value.lessonSlug === "string" ? value.lessonSlug : undefined,
    evidenceQuery,
    dataScopes: dataScopes.length ? dataScopes : undefined,
    targetStudentId: typeof value.targetStudentId === "string" ? value.targetStudentId : undefined
  };
}

function readTutorMessages(value: unknown): TutorMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((message): TutorMessage | null => {
      if (
        !isRecord(message) ||
        (message.role !== "tutor" && message.role !== "student") ||
        typeof message.content !== "string"
      ) {
        return null;
      }

      return {
        id: typeof message.id === "string" ? message.id : undefined,
        role: message.role,
        content: message.content,
        visualization: normalizeAITutorVisualization(message.visualization),
        ...(message.status === "typing" ? { status: message.status } : {})
      };
    })
    .filter((message): message is TutorMessage => Boolean(message));
}

function isGuestSignupTutorMessage(message: TutorMessage) {
  if (message.role !== "tutor") return false;
  return /AI Tutor (?:is available|needs|required|需要).*(?:register|sign in|註冊|登入|注册|登录)|Please create a learning account|請先建立.*學習帳戶|请先建立.*学习帐户/i.test(message.content);
}

function tutorDraftOwnerForUser(user: StudentSession | null): TutorDraftOwner {
  return user
    ? { userId: user.id, role: user.role }
    : { userId: "guest", role: "guest" };
}

function tutorDraftStorageKeyFor(owner: TutorDraftOwner) {
  return `${tutorDraftStorageKeyPrefix}:${owner.userId}`;
}

function readTutorDraft(value: unknown, owner: TutorDraftOwner): TutorDraft | null {
  if (!isRecord(value) || value.version !== 2 || typeof value.updatedAt !== "number") return null;
  if (Date.now() - value.updatedAt > tutorDraftMaxAgeMs) return null;
  if (value.userId !== owner.userId || !tutorDraftRoles.has(value.role as TutorDraft["role"]) || value.role !== owner.role) {
    return null;
  }

  const messages = readTutorMessages(value.messages).filter((message) => (
    owner.role === "guest" || !isGuestSignupTutorMessage(message)
  ));
  if (!messages.length) return null;

  return {
    userId: owner.userId,
    role: owner.role,
    open: value.open === true,
    context: readTutorContext(value.context),
    input: typeof value.input === "string" ? value.input : "",
    messages
  };
}

function removeLegacyTutorDraft() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(legacyTutorDraftStorageKey);
  } catch {
    // Legacy cleanup is best-effort only.
  }
}

function readStoredTutorDraft(owner: TutorDraftOwner) {
  if (typeof window === "undefined") return null;

  const storageKey = tutorDraftStorageKeyFor(owner);
  const latestDraft = latestTutorDrafts.get(storageKey);
  if (latestDraft?.userId === owner.userId && latestDraft.role === owner.role) {
    return latestDraft;
  }

  try {
    removeLegacyTutorDraft();
    const value = window.localStorage.getItem(storageKey);
    const draft = value ? readTutorDraft(JSON.parse(value), owner) : null;
    if (!draft && value) window.localStorage.removeItem(storageKey);
    if (draft) latestTutorDrafts.set(storageKey, draft);
    return draft;
  } catch {
    return null;
  }
}

function rememberTutorDraft(owner: TutorDraftOwner, draft: Omit<TutorDraft, "userId" | "role">) {
  const messages = sanitizeMessagesForDraft(draft.messages).filter((message) => (
    owner.role === "guest" || !isGuestSignupTutorMessage(message)
  ));
  const storageKey = tutorDraftStorageKeyFor(owner);
  const ownedDraft: TutorDraft = {
    ...draft,
    userId: owner.userId,
    role: owner.role,
    messages
  };
  latestTutorDrafts.set(storageKey, ownedDraft);
  if (typeof window === "undefined") return;

  try {
    removeLegacyTutorDraft();
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 2,
        updatedAt: Date.now(),
        userId: owner.userId,
        role: owner.role,
        open: draft.open,
        context: draft.context,
        input: draft.input,
        messages
      })
    );
  } catch {
    // Losing the draft should not block the tutor itself.
  }
}

function formatAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function requestTutorReply({
  input,
  messages,
  context,
  grade,
  language,
  page,
  attachments,
  signedInUserId
}: {
  input: string;
  messages: TutorMessage[];
  context?: TutorContext;
  grade: string;
  language: string;
  page: string;
  attachments: TutorAttachment[];
  signedInUserId?: string;
}) {
  const payload = {
    input,
    messages: signedInUserId
      ? messages.filter((message) => !isGuestSignupTutorMessage(message))
      : messages,
    context: stripQuestionAnswer(context),
    grade,
    language,
    page
  };

  function buildRequestInit(): RequestInit {
    return attachments.length
      ? (() => {
          const formData = new FormData();
          formData.set("payload", JSON.stringify(payload));
          attachments.forEach((attachment) => formData.append("attachments", attachment.file, attachment.name));
          return {
            method: "POST",
            body: formData,
            cache: "no-store",
            credentials: "same-origin"
          };
        })()
      : {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          cache: "no-store",
          credentials: "same-origin"
        };
  }

  async function postTutorRequest() {
    const response = await fetch("/api/ai-tutor", buildRequestInit());
    let data: TutorApiResponse = {};
    try {
      data = readApiResponse(await response.json());
    } catch {
      data = {};
    }
    return { response, data };
  }

  let { response, data } = await postTutorRequest();
  if (response.ok && data.mode === "registration-required" && signedInUserId) {
    const sessionResponse = await fetch("/api/me", {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (sessionResponse.ok) {
      ({ response, data } = await postTutorRequest());
    }
  }

  if (response.ok && data.mode === "registration-required" && signedInUserId) {
    throw new Error("AI Tutor API request failed.");
  }

  if (!response.ok || !data.reply) {
    throw new Error(data.error ?? "AI Tutor API request failed.");
  }

  return {
    reply: data.reply,
    visualization: data.visualization
  };
}

function TutorVisualizationPanel({ visualization }: { visualization: AITutorVisualization }) {
  if (visualization.tool !== "show_function_graph") return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-200/80 bg-white p-2 shadow-inner shadow-cyan-900/5 dark:border-cyan-300/25 dark:bg-slate-950/80">
      <FunctionGraphExplorer
        compact
        initialCoefficients={visualization.parameters}
        showAxisLabels
        topicId="quadratic-functions"
      />
    </div>
  );
}

export function AITutorProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser, language, recordLearningEvent, selectedGrade, settingsReady, t } = useSettings();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<TutorContext | undefined>();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<TutorAttachment[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const openRequestedRef = useRef(false);
  const [setupStatus, setSetupStatus] = useState<TutorSetupStatus>({ state: "checking" });
  const [messages, setMessages] = useState<TutorMessage[]>(
    () => [tutorMessage("tutor", openingMessage(undefined, language))]
  );
  const [draftReady, setDraftReady] = useState(false);
  const [loadedDraftStorageKey, setLoadedDraftStorageKey] = useState<string | null>(null);
  const draftOwner = useMemo(() => tutorDraftOwnerForUser(currentUser), [currentUser?.id, currentUser?.role]);
  const draftStorageKey = useMemo(() => tutorDraftStorageKeyFor(draftOwner), [draftOwner.userId]);
  const selectedGradeLabel = formatGradeLabel(selectedGrade, language, true);
  const learnerName = currentUser ? formatLearnerName(currentUser.name, language) : t(dictionary.aiTutor.student);
  const scrollMessagesToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, []);

  const value = useMemo<AITutorContextValue>(
    () => ({
      openTutor: (nextContext) => {
        openRequestedRef.current = true;
        recordLearningEvent({
          type: "hint-request",
          source: "ai-tutor",
          topicId: nextContext?.topicId ?? nextContext?.mode ?? "general",
          questionId: nextContext?.questionId
        });
        setContext(nextContext);
        setOpen(true);
        setMessages((current) => [
          ...(hasStudentMessage(current) ? current : []),
          tutorMessage("tutor", openingMessage(nextContext, language))
        ]);
      }
    }),
    [language, recordLearningEvent]
  );

  useEffect(() => {
    setMessages((current) => {
      if (hasStudentMessage(current)) return current;
      return [tutorMessage("tutor", openingMessage(context, language))];
    });
  }, [context, language]);

  useEffect(() => {
    if (!currentUser) return;

    setMessages((current) => {
      const messagesWithoutGuestSignup = current.filter((message) => !isGuestSignupTutorMessage(message));
      if (messagesWithoutGuestSignup.length === current.length) return current;
      return messagesWithoutGuestSignup.length
        ? messagesWithoutGuestSignup
        : [tutorMessage("tutor", openingMessage(context, language))];
    });
  }, [context, currentUser?.id, language]);

  useEffect(() => {
    if (!settingsReady) {
      setDraftReady(false);
      setLoadedDraftStorageKey(null);
      return;
    }

    const storedDraft = readStoredTutorDraft(draftOwner);
    if (!storedDraft) {
      setOpen(openRequestedRef.current);
      setContext(undefined);
      setInput("");
      setAttachments([]);
      setAttachmentMenuOpen(false);
      setIsSending(false);
      setMessages([tutorMessage("tutor", openingMessage(undefined, language))]);
      setLoadedDraftStorageKey(draftStorageKey);
      setDraftReady(true);
      openRequestedRef.current = false;
      return;
    }

    setOpen(openRequestedRef.current || storedDraft.open);
    setContext(storedDraft.context);
    setInput(storedDraft.input);
    setMessages(storedDraft.messages);
    setAttachments([]);
    setAttachmentMenuOpen(false);
    setIsSending(false);
    setLoadedDraftStorageKey(draftStorageKey);
    setDraftReady(true);
    openRequestedRef.current = false;
  }, [draftOwner, draftStorageKey, settingsReady]);

  useEffect(() => {
    if (!settingsReady || !draftReady || loadedDraftStorageKey !== draftStorageKey) return;

    rememberTutorDraft(draftOwner, {
      open,
      context,
      input,
      messages
    });
  }, [context, draftOwner, draftReady, draftStorageKey, input, loadedDraftStorageKey, messages, open, settingsReady]);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [isSending, messages, scrollMessagesToBottom]);

  useEffect(() => {
    let cancelled = false;

    async function loadSetupStatus() {
      try {
        const response = await fetch("/api/ai-tutor/status", {
          cache: "no-store",
          credentials: "same-origin"
        });
        if (!response.ok) throw new Error("AI Tutor status unavailable.");
        const status = readSetupStatus(await response.json());
        if (!cancelled) setSetupStatus(status);
      } catch {
        if (!cancelled) setSetupStatus({ state: "local-helper" });
      }
    }

    void loadSetupStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const setupStatusLabel = useMemo(() => {
    if (setupStatus.state === "checking") return t(dictionary.aiTutor.setupChecking);
    if (setupStatus.state === "configured") return t(dictionary.aiTutor.liveReady);
    return t(dictionary.aiTutor.localHelperMode);
  }, [setupStatus.state, t]);
  const tutorPanelOpen = open && draftReady && loadedDraftStorageKey === draftStorageKey;
  const isImmersiveGameRoute = immersiveGameRoutes.some((route) => pathname.startsWith(route));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const fallbackLanguage = fallbackLanguageForInput(language, trimmed, messages);
    const requestContext = buildTutorRequestContext({
      context,
      input: trimmed,
      grade: selectedGrade,
      language: fallbackLanguage,
      page: pathname,
      curriculumTrack: currentUser?.curriculumTrack
    });
    const fallbackReply = buildTutorReply(trimmed, requestContext, fallbackLanguage);
    const pendingMessageId = createMessageId("thinking");
    setMessages((current) => [
      ...current,
      tutorMessage("student", trimmed),
      { id: pendingMessageId, role: "tutor", content: "", status: "thinking" }
    ]);
    setContext(requestContext);
    setInput("");
    setIsSending(true);

    try {
      const reply = await requestTutorReply({
        input: trimmed,
        messages,
        context: requestContext,
        grade: selectedGrade,
        language: fallbackLanguage,
        page: pathname,
        attachments,
        signedInUserId: currentUser?.id
      });

      setMessages((current) =>
        current.map((message) =>
          message.id === pendingMessageId
            ? { id: createMessageId("reply"), role: "tutor", content: reply.reply, visualization: reply.visualization, status: "typing" }
            : message
        )
      );
      setAttachments([]);
    } catch (error) {
      const safeReason = visibleFallbackReason(error instanceof Error ? error.message : "");
      const fallbackModeLabel = setupStatus.state === "configured"
        ? textForLanguage({ en: "Nova fallback hint", zh: "Nova 暫時提示" }, fallbackLanguage)
        : textForLanguage(dictionary.aiTutor.localHelperMode, fallbackLanguage);
      const fallbackHint = textForLanguage(dictionary.aiTutor.fallbackHint, fallbackLanguage);
      const reply = isChineseLanguage(fallbackLanguage)
        ? `${fallbackModeLabel}。${fallbackHint} ${fallbackReply}`
        : `${fallbackModeLabel}${safeReason ? ` (${safeReason})` : ""}. ${fallbackHint} ${fallbackReply}`;

      setMessages((current) =>
        current.map((message) =>
          message.id === pendingMessageId
            ? { id: createMessageId("fallback"), role: "tutor", content: reply, status: "typing" }
            : message
        )
      );
      setAttachments([]);
    } finally {
      setIsSending(false);
    }
  }

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (!files.length) {
      setAttachmentMenuOpen(false);
      return;
    }

    const addedAt = Date.now();
    setAttachments((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${addedAt}-${index}`,
	        name: file.name,
	        size: file.size,
	        file
	      }))
    ].slice(0, 6));
    setAttachmentMenuOpen(false);
    event.currentTarget.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  function openAttachmentPicker() {
    attachmentInputRef.current?.click();
    setAttachmentMenuOpen(false);
  }

  return (
    <AITutorContext.Provider value={value}>
      {children}
      <button
        type="button"
        onClick={() => {
          openRequestedRef.current = true;
          recordLearningEvent({ type: "hint-request", source: "ai-tutor", topicId: "general" });
          setOpen(true);
          setContext(undefined);
          setMessages((current) =>
            hasStudentMessage(current)
              ? current
              : [tutorMessage("tutor", openingMessage(undefined, language))]
          );
        }}
        aria-label={t(dictionary.aiTutor.button)}
        className={cn(
          "focus-ring group fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[70] isolate h-14 w-14 items-center justify-center gap-2 overflow-hidden rounded-full border border-cyan-200/65 bg-slate-950 p-0 text-xs font-black text-cyan-50 shadow-[0_20px_55px_rgba(8,145,178,0.35)] transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-fuchsia-200/80 hover:shadow-[0_24px_70px_rgba(217,70,239,0.28)] sm:bottom-5 sm:right-5 sm:h-auto sm:w-auto sm:min-w-[9.25rem] sm:px-4 sm:py-3 sm:text-sm dark:border-cyan-100/35 dark:bg-slate-950/90",
          tutorPanelOpen ? "hidden" : isImmersiveGameRoute ? "hidden sm:inline-flex" : "inline-flex"
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-full bg-[conic-gradient(from_130deg,rgba(34,211,238,0.92),rgba(129,140,248,0.35),rgba(217,70,239,0.82),rgba(34,211,238,0.92))] opacity-75 blur-[1px] transition duration-500 group-hover:rotate-180 group-hover:opacity-100"
        />
        <span
          aria-hidden="true"
          className="absolute inset-[2px] -z-10 rounded-full bg-[radial-gradient(circle_at_26%_18%,rgba(103,232,249,0.44),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(30,27,75,0.95),rgba(83,19,97,0.92))]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 -left-12 -z-10 w-10 rotate-12 bg-white/30 blur-md transition-transform duration-700 group-hover:translate-x-56"
        />
        <span aria-hidden="true" className="relative grid h-7 w-7 shrink-0 place-items-center sm:h-8 sm:w-8">
          <span className="absolute inset-0 rounded-full bg-cyan-300/30 blur-md transition duration-300 group-hover:bg-fuchsia-300/35" />
          <span className="absolute inset-0 rounded-full border border-cyan-100/70 border-t-fuchsia-200/90 animate-[spin_6s_linear_infinite]" />
          <span className="absolute inset-[6px] rounded-full border border-white/30 border-b-cyan-100/90 animate-[spin_4s_linear_infinite_reverse]" />
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.95)] transition duration-300 group-hover:bg-fuchsia-100 group-hover:shadow-[0_0_20px_rgba(240,171,252,0.95)]" />
        </span>
        <span className="hidden whitespace-nowrap sm:inline">{t(dictionary.aiTutor.button)}</span>
      </button>

      {tutorPanelOpen ? (
        <aside
          role="dialog"
          aria-modal="false"
          aria-label={t(dictionary.aiTutor.button)}
          className={cn(
            "fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[80] max-h-[calc(100dvh-1.5rem)] min-h-0 w-auto flex-col overflow-hidden rounded-[1.5rem] border border-cyan-300/35 bg-white shadow-2xl shadow-slate-950/25 dark:bg-slate-950 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-h-[min(720px,calc(100vh-2.5rem))] sm:w-[min(420px,calc(100vw-2rem))]",
            isImmersiveGameRoute ? "hidden sm:flex" : "flex"
          )}
        >
          <div className="border-b border-slate-200/70 bg-slate-950 px-5 py-4 text-white dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">{t(dictionary.aiTutor.button)}</p>
                <h2 className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xl font-black leading-tight sm:gap-3">
                  <span className="min-w-0">{textForLanguage(tutorNames, language)}</span>
                  <NovaMark compact />
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-300">
                  {isChineseLanguage(language) ? `${learnerName} · ${selectedGradeLabel}` : `${learnerName} · ${selectedGradeLabel} · ${pathname}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  openRequestedRef.current = false;
                  setOpen(false);
                }}
                aria-label={t(dictionary.aiTutor.close)}
                className="focus-ring rounded-full bg-white/10 px-3 py-1.5 text-sm font-black hover:bg-white/20"
              >
                ×
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={message.id ?? `${message.role}-${index}`}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-6",
                  message.role === "tutor"
                    ? "whitespace-pre-line border border-cyan-200/70 bg-cyan-50 text-slate-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-50"
                    : "ml-8 bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                )}
              >
                {message.status === "thinking" ? (
                  <ThinkingBubble language={language} />
                ) : (
                  <TypewriterMathText
                    active={message.status === "typing"}
                    text={message.content}
                    onProgress={scrollMessagesToBottom}
                    onDone={() => {
                      if (!message.id) return;
                      setMessages((current) =>
                        current.map((currentMessage) =>
                          currentMessage.id === message.id
                            ? { ...currentMessage, status: undefined }
                            : currentMessage
                        )
                      );
                    }}
                  />
                )}
                {message.visualization ? <TutorVisualizationPanel visualization={message.visualization} /> : null}
              </div>
            ))}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          <form onSubmit={handleSubmit} className="relative shrink-0 border-t border-slate-200/70 p-4 dark:border-white/10">
            <label className="sr-only" htmlFor="ai-tutor-input">{t(dictionary.aiTutor.ask)}</label>
            <textarea
              id="ai-tutor-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              disabled={isSending}
              placeholder={t(dictionary.aiTutor.placeholder)}
              className="focus-ring w-full resize-none rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            />
            {attachments.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span
                    key={attachment.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-200"
                  >
                    <span className="max-w-[11rem] truncate">{attachment.name}</span>
                    <span className="shrink-0 text-slate-400 dark:text-slate-500">{formatAttachmentSize(attachment.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                      className="focus-ring -mr-1 rounded-full px-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex min-w-0 items-center gap-2">
                <input
                  ref={attachmentInputRef}
                  id="ai-tutor-attachments"
                  type="file"
                  multiple
                  onChange={handleAttachmentChange}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="hidden"
                />
                {attachmentMenuOpen ? (
                  <div
                    id="ai-tutor-attachment-menu"
                    className="absolute bottom-full left-0 mb-3 w-[min(19rem,calc(100vw-3.5rem))] overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-2 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      className="focus-ring flex cursor-pointer items-center gap-4 rounded-2xl px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/[0.08]"
                      onClick={openAttachmentPicker}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 shrink-0"
                      >
                        <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.7-9.7a4 4 0 0 1 5.7 5.7l-9.7 9.7a2 2 0 0 1-2.8-2.8l8.9-8.9" />
                      </svg>
                      <span>Add photos &amp; files</span>
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label="Add photos and files"
                  aria-haspopup="menu"
                  aria-controls="ai-tutor-attachment-menu"
                  aria-expanded={attachmentMenuOpen}
                  onClick={() => setAttachmentMenuOpen((current) => !current)}
                  className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200/80 bg-slate-100 text-2xl font-light leading-none text-slate-500 transition hover:border-cyan-300/70 hover:bg-cyan-50 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-300 dark:hover:border-cyan-200/50 dark:hover:bg-white/[0.12] dark:hover:text-white"
                >
                  +
                </button>
                <p className="min-w-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isSending ? t(dictionary.aiTutor.thinking) : setupStatusLabel}
                </p>
              </div>
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="focus-ring w-full shrink-0 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 sm:w-auto"
              >
                {isSending ? t(dictionary.aiTutor.sending) : t(dictionary.aiTutor.send)}
              </button>
            </div>
          </form>
        </aside>
      ) : null}
    </AITutorContext.Provider>
  );
}

export function useAITutor() {
  const context = useContext(AITutorContext);
  if (!context) {
    throw new Error("useAITutor must be used within AITutorProvider");
  }
  return context;
}
