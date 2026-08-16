"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ChangeEvent, RefObject } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "@/components/ui/Motion";
import { MathText, toPlainMathText } from "@/components/math/MathText";
import { NovaCompanion } from "@/components/practice/NovaCompanion";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { practiceTextForLanguage } from "@/components/practice/hjbPracticeEnglish";
import { shouldHideMainlandPepPrimaryPracticeIllustration } from "@/components/practice/mainlandPepPrimaryIllustrationGate";
import { formatPracticeOptionDisplayText } from "@/components/practice/practiceOptionDisplayText";
import { cleanPracticeQuestionPromptText } from "@/components/practice/practicePromptText";
import { isImmersiveStudentPracticeGamePath } from "@/lib/gameBasedLearning";
import { isStudentLessonPath } from "@/lib/lessonLinks";
import { countingDotCardQuantitiesFor } from "@/lib/countingDotCards";
import {
  buildPracticeReadAloudText,
  practiceReadAloudLanguageCode,
  speakPracticeText,
  stopPracticeReadAloud
} from "@/lib/practiceReadAloud";
import { isYoungLearnerPracticeGrade } from "@/lib/youngLearnerPractice";
import { cn } from "@/lib/utils";
import { CountingDotCards } from "@/components/practice/CountingDotCards";
import { QuestionFigure, type QuestionFigureVariant } from "@/components/practice/QuestionFigure";
import type { AttemptFeedback, Language, LocalizedText, PublicQuestion, QuestionType } from "@/types";

type AnswerInputMode = "keyboard" | "handwriting";
type AnswerControl = HTMLInputElement | HTMLTextAreaElement;
type PhotoAttachment = {
  dataUrl: string;
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  // Set once the photo has been stored in the governed media-object store.
  // Null while uploading, or if the upload failed.
  //
  // Every field here is required by the server's `mediaObjectReferenceFromUnknown`
  // parser — drop one (it re-checks `kind`, `encrypted`, `scanStatus` and
  // `retentionExpiresAt`) and the reference is rejected with a 400. Forward the
  // server's response object verbatim rather than rebuilding it.
  mediaObject: AnswerWorkPhotoReference | null;
};

type AnswerWorkPhotoReference = {
  kind: "object-reference";
  objectKey: string;
  mimeType: string;
  byteLength: number;
  encrypted: true;
  scanStatus: "passed" | "pending" | "failed";
  retentionExpiresAt: string;
};
type LazyHandwritingAnswerBoardProps = {
  boardId: string;
  answerInputId: string;
  value: string;
  isShortAnswer: boolean;
  language: Language;
  placeholder: string;
  resetToken: number;
  showAnswerInput?: boolean;
  answerLabel?: LocalizedText;
  onAnswerChange: (value: string) => void;
  onBeginAttempt: () => void;
  onDraftInteraction: () => void;
};
type LazyMathSoftKeyboardProps = {
  id: string;
  value: string;
  targetRef: RefObject<AnswerControl | null>;
  language: Language;
  onChange: (value: string) => void;
  ariaLabel?: LocalizedText;
  clearAriaLabel?: LocalizedText;
};

const HandwritingAnswerBoard = dynamic<LazyHandwritingAnswerBoardProps>(
  () => import("@/components/practice/HandwritingAnswerBoard").then((module) => module.HandwritingAnswerBoard),
  {
    ssr: false,
    loading: () => <div className="mt-3 h-64 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/10" aria-hidden="true" />
  }
);

const MathSoftKeyboard = dynamic<LazyMathSoftKeyboardProps>(
  () => import("@/components/practice/MathSoftKeyboard").then((module) => module.MathSoftKeyboard),
  {
    ssr: false,
    loading: () => <div className="mt-3 h-44 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/10" aria-hidden="true" />
  }
);

const answerPhotoAccept = "image/*";
const maxAnswerPhotoAttachments = 6;

function PaperclipIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none">
      <path
        d="m21.4 11.2-8.9 8.9a6 6 0 0 1-8.5-8.5l9.5-9.5a4.1 4.1 0 0 1 5.8 5.8l-9.6 9.6a2.2 2.2 0 0 1-3.1-3.1l8.8-8.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

const correctBurstStars = [
  { x: -34, y: -30, delay: 0, size: "h-4 w-4" },
  { x: 32, y: -34, delay: 0.05, size: "h-5 w-5" },
  { x: -46, y: 6, delay: 0.1, size: "h-3 w-3" },
  { x: 48, y: 10, delay: 0.08, size: "h-4 w-4" },
  { x: 0, y: -48, delay: 0.12, size: "h-3.5 w-3.5" }
] as const;

function BurstStarIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="m12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8L12 3Z" fill="currentColor" />
    </svg>
  );
}

/** Celebratory star burst behind Nova when an answer lands correct. */
function CorrectStarBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
      {correctBurstStars.map((star, index) => (
        <motion.span
          key={index}
          className="absolute text-amber-400"
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.6], x: star.x, y: star.y }}
          transition={{ duration: 0.7, delay: star.delay, ease: "easeOut" }}
        >
          <BurstStarIcon className={star.size} />
        </motion.span>
      ))}
    </span>
  );
}

function formatPhotoSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPhotoFile(file: File) {
  return file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
}

function readPhotoDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(typeof reader.result === "string" ? reader.result : ""));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Could not read photo.")));
    reader.readAsDataURL(file);
  });
}

/**
 * Submits the governed media-object REFERENCES, never the image bytes. Bytes go
 * to `/api/media-objects` at attach time; an attachment whose upload failed has
 * no reference and is skipped rather than failing the whole answer submission.
 */
function serializeAnswerWorkPhotos(attachments: PhotoAttachment[]) {
  return attachments
    .map((attachment) => attachment.mediaObject)
    .filter((media): media is NonNullable<PhotoAttachment["mediaObject"]> => Boolean(media));
}

async function uploadAnswerWorkPhoto(dataUrl: string) {
  if (!dataUrl.startsWith("data:image/")) return null;

  try {
    const response = await fetch("/api/media-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability: "practice-work-photo", dataUrl })
    });
    if (!response.ok) return null;

    const payload = await response.json().catch(() => null) as { media?: unknown } | null;
    const media = payload?.media as AnswerWorkPhotoReference | undefined;
    return media?.kind === "object-reference" && media.objectKey ? media : null;
  } catch {
    return null;
  }
}

function revokePhotoAttachments(attachments: PhotoAttachment[]) {
  attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url));
}

function readAttemptFeedback(value: unknown): AttemptFeedback | null {
  const feedback = value as Partial<AttemptFeedback> | null;
  const explanation = feedback?.explanation as Partial<AttemptFeedback["explanation"]> | undefined;

  if (
    typeof feedback?.correct !== "boolean" ||
    typeof explanation?.en !== "string" ||
    typeof explanation?.zh !== "string" ||
    (typeof feedback.correctAnswer !== "undefined" && typeof feedback.correctAnswer !== "string")
  ) {
    return null;
  }

  return {
    correct: feedback.correct,
    explanation: {
      en: explanation.en,
      zh: explanation.zh
    },
    correctAnswer: feedback.correctAnswer
  };
}

const answerLabels: Record<Exclude<QuestionType, "multiple-choice">, { en: string; zh: string }> = {
  "fill-in": { en: "Fill in the blank", zh: "填空答案" },
  "short-answer": { en: "Short answer", zh: "簡答答案" },
  graph: { en: "Answer from the diagram", zh: "根據圖形作答" }
};

const answerPlaceholders: Record<Exclude<QuestionType, "multiple-choice">, { en: string; zh: string }> = {
  "fill-in": { en: "Type the missing value", zh: "輸入空格中的答案" },
  "short-answer": { en: "Type a concise answer", zh: "輸入簡短答案" },
  graph: { en: "Read the diagram, then answer", zh: "閱讀圖形後作答" }
};

const photoAttachmentCopy = {
  addPhotos: { en: "Add photos", zh: "加入相片", zhHans: "添加照片" }
} satisfies { addPhotos: LocalizedText };

const practiceQuestionCardSimplifiedTextReplacements = [
  ["憑", "凭"],
  ["細", "细"],
  ["綜", "综"],
  ["職", "职"],
  ["觀", "观"],
  ["軌", "轨"],
  ["鄰", "邻"],
  ["魚", "鱼"],
  ["遊", "游"],
  ["靈", "灵"]
] as const;

function normalizePracticeQuestionCardSimplifiedText(value: string, language: Language) {
  if (language !== "zh-Hans") return value;

  return practiceQuestionCardSimplifiedTextReplacements.reduce(
    (current, [source, replacement]) => current.split(source).join(replacement),
    value
  );
}

function shouldRenderOptionAsBareMath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return false;

  const allowedMathWords = new Set(["sin", "cos", "tan", "log", "ln", "sqrt", "frac", "theta", "pi"]);
  const words = trimmed.match(/[A-Za-z]+/g) ?? [];
  if (words.some((word) => word.length > 1 && !allowedMathWords.has(word.toLowerCase()))) return false;

  if (/^[+-]?\d+(?:\.\d+)?%?$/.test(trimmed)) return true;
  if (/^\(\s*[+-]?\d+(?:\.\d+)?\s*,\s*[+-]?\d+(?:\.\d+)?\s*\)$/.test(trimmed)) return true;
  if (/^[A-Za-zθπ](?:_\{?\d+\}?|\d)?\s*(?:=|≈|<|>|≤|≥)\s*.+$/.test(trimmed)) return true;

  return /^[\\A-Za-zθπ0-9{}_^()+\-/*=<>≤≥≈.,:°\s]+$/.test(trimmed) && /[=^/\\]|[θπ]|°/.test(trimmed);
}

const unitExponentPattern = /(^|[\s(])((?:\d+(?:\.\d+)?\s*)?)(km|cm|mm|m)\^([23])(?=$|[\s.,;)])/gi;

function formatUnitExponentsForMathText(value: string) {
  if (!value.includes("^")) return value;

  return value.replace(unitExponentPattern, (_, leadIn: string, quantity: string, unit: string, exponent: string) => {
    const coefficient = quantity.trim();
    const mathSource = coefficient ? `${coefficient}\\,\\text{${unit}}^{${exponent}}` : `\\text{${unit}}^{${exponent}}`;
    return `${leadIn}\\(${mathSource}\\)`;
  });
}

type PracticeQuestionCardProps = {
  question: PublicQuestion;
  onAnswered?: (question: PublicQuestion, feedback: AttemptFeedback) => void;
};

export function PracticeQuestionCard({ question, onAnswered }: PracticeQuestionCardProps) {
  const { currentUser, language, recordLearningEvent, refreshMistakeRecordsAfterAttempt, text: settingsText, t: settingsT } = useSettings();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const answerControlBaseId = useId();
  const keyboardAnswerControlId = `${answerControlBaseId}-keyboard-answer`;
  const handwritingAnswerControlId = `${answerControlBaseId}-handwriting-answer`;
  const handwritingBoardId = `${answerControlBaseId}-handwriting-board`;
  const mathKeyboardId = `${answerControlBaseId}-math-keyboard`;
  const answerControlRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoAttachmentsRef = useRef<PhotoAttachment[]>([]);
  const [selected, setSelected] = useState("");
  const [answerInputMode, setAnswerInputMode] = useState<AnswerInputMode>("keyboard");
  const [photoAttachments, setPhotoAttachments] = useState<PhotoAttachment[]>([]);
  // Null until probed. The attachment control stays hidden unless the governed
  // media store is actually usable — a control that is guaranteed to error is
  // worse than no control.
  const [photoUploadsAvailable, setPhotoUploadsAvailable] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [softKeyboardOpen, setSoftKeyboardOpen] = useState(false);
  const [handwritingResetToken, setHandwritingResetToken] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const text = (localized: LocalizedText) => normalizePracticeQuestionCardSimplifiedText(settingsText(localized), language);
  const t = (localized: LocalizedText) => normalizePracticeQuestionCardSimplifiedText(settingsT(localized), language);
  const localizedPracticeText = (localized: PublicQuestion["topic"]) => normalizePracticeQuestionCardSimplifiedText(
    practiceTextForLanguage(localized, language, question.publisher),
    language
  );
  const promptText = cleanPracticeQuestionPromptText(localizedPracticeText(question.prompt));
  const promptLabel = toPlainMathText(promptText);
  const isLessonPage = isStudentLessonPath(pathname);
  const isPracticePage = pathname.startsWith("/practice") || isImmersiveStudentPracticeGamePath(pathname);
  const shouldUseDayModeDiagram = isLessonPage || isPracticePage;
  const shouldShowPhotoUpload =
    photoUploadsAvailable === true &&
    ((isLessonPage && question.type !== "multiple-choice") || (isPracticePage && question.type === "short-answer"));
  const shouldShowAnswerTools =
    question.type === "fill-in" ||
    question.type === "short-answer" ||
    (isLessonPage && question.type === "graph");
  const shouldShowMathSoftKeyboard = shouldShowAnswerTools;
  const shouldShowAnswerInputModes = shouldShowAnswerTools;
  const diagramVariant: QuestionFigureVariant = shouldUseDayModeDiagram ? "day" : "default";
  const shouldHideUnsafeMainlandPepPrimaryPracticeIllustration =
    isPracticePage && shouldHideMainlandPepPrimaryPracticeIllustration(question);
  const questionImageAssets = shouldHideUnsafeMainlandPepPrimaryPracticeIllustration
    ? []
    : (question.questionAssets ?? []).filter((asset) => asset.kind === "image");
  const shouldShowReadAloud = isYoungLearnerPracticeGrade(question.grade);
  const isYoungLearner = shouldShowReadAloud;
  const dotCardQuantities = countingDotCardQuantitiesFor(question);

  useEffect(() => {
    photoAttachmentsRef.current = photoAttachments;
  }, [photoAttachments]);

  useEffect(() => () => {
    revokePhotoAttachments(photoAttachmentsRef.current);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setPhotoUploadsAvailable(false);
      return;
    }

    let cancelled = false;
    fetch("/api/media-objects")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { uploadsAvailable?: unknown } | null) => {
        if (!cancelled) setPhotoUploadsAvailable(payload?.uploadsAvailable === true);
      })
      .catch(() => {
        if (!cancelled) setPhotoUploadsAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => () => stopPracticeReadAloud(), []);

  useEffect(() => {
    setSelected("");
    setPhotoAttachments((current) => {
      revokePhotoAttachments(current);
      return [];
    });
    setFeedback(null);
    setError("");
    setNeedsLogin(false);
    setIsChecking(false);
    setAnswerInputMode("keyboard");
    setSoftKeyboardOpen(false);
    setHandwritingResetToken((current) => current + 1);
    setStartedAt(null);
    stopPracticeReadAloud();
    setIsReadingAloud(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }, [question.id]);

  function handleReadAloudToggle() {
    if (isReadingAloud) {
      stopPracticeReadAloud();
      setIsReadingAloud(false);
      return;
    }

    const optionTexts = (question.options ?? []).map((option) =>
      toPlainMathText(formatPracticeOptionDisplayText(localizedPracticeText(option)))
    );
    const started = speakPracticeText(
      buildPracticeReadAloudText({ promptText: promptLabel, optionTexts, language }),
      practiceReadAloudLanguageCode(language),
      { onEnd: () => setIsReadingAloud(false) }
    );
    setIsReadingAloud(started);
  }

  function beginAttempt() {
    setStartedAt((current) => current ?? Date.now());
  }

  async function handleSubmit() {
    if (!selected.trim() || feedback || isChecking) return;
    if (!currentUser) {
      setNeedsLogin(true);
      setError(t(dictionary.practice.loginRequired));
      return;
    }

    const durationSeconds = startedAt === null ? 1 : Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    setError("");
    setNeedsLogin(false);
    setIsChecking(true);

    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          questionId: question.id,
          selectedAnswer: selected,
          durationSeconds,
          answerWorkPhotos: serializeAnswerWorkPhotos(photoAttachments)
        })
      });
      const responseBody = await response.json().catch(() => null);
      const result = readAttemptFeedback(responseBody);

      if (response.status === 401) {
        setNeedsLogin(true);
        throw new Error(t({
          en: "Your sign-in session could not be verified. Log in again before checking answers.",
          zh: "未能驗證你的登入狀態。請重新登入後再檢查答案。"
        }));
      }

      if (!response.ok || !result) {
        throw new Error("Could not check this answer yet.");
      }

      refreshMistakeRecordsAfterAttempt();
      recordLearningEvent({
        type: result.correct ? "answer-correct" : "answer-wrong",
        source: "practice",
        topicId: question.topicId,
        questionId: question.id,
        durationSeconds
      });
      setFeedback(result);
      onAnswered?.(question, result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not check this answer yet.");
    } finally {
      setIsChecking(false);
    }
  }

  function reset() {
    setSelected("");
    setPhotoAttachments((current) => {
      revokePhotoAttachments(current);
      return [];
    });
    setFeedback(null);
    setError("");
    setNeedsLogin(false);
    setIsChecking(false);
    setSoftKeyboardOpen(false);
    setHandwritingResetToken((current) => current + 1);
    setStartedAt(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handleTypedAnswer(value: string) {
    beginAttempt();
    recordLearningEvent({
      type: "keyboard",
      source: "practice",
      topicId: question.topicId,
      questionId: question.id
    });
    setSelected(value);
    setFeedback(null);
    setError("");
    setNeedsLogin(false);
  }

  function handleHandwritingDraftInteraction() {
    recordLearningEvent({
      type: "mouse-click",
      source: "practice",
      topicId: question.topicId,
      questionId: question.id
    });
    setFeedback(null);
    setError("");
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter(isPhotoFile);
    event.target.value = "";
    if (!files.length) return;

    beginAttempt();
    recordLearningEvent({
      type: "mouse-click",
      source: "practice",
      topicId: question.topicId,
      questionId: question.id
    });
    setFeedback(null);
    setError("");

    const createdAt = Date.now();
    const newAttachments = await Promise.all(files.map(async (file, index) => {
      const dataUrl = await readPhotoDataUrl(file).catch(() => "");

      return {
        dataUrl,
        id: `${question.id}-${createdAt}-${index}-${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type || "image/*",
        url: URL.createObjectURL(file),
        // Uploaded at attach time, while the student is still working, so the
        // answer submission carries references instead of megabytes of base64.
        mediaObject: await uploadAnswerWorkPhoto(dataUrl)
      };
    }));

    setPhotoAttachments((current) => {
      const remainingSlots = Math.max(0, maxAnswerPhotoAttachments - current.length);
      const acceptedAttachments = newAttachments.slice(0, remainingSlots);
      revokePhotoAttachments(newAttachments.slice(remainingSlots));
      return [...current, ...acceptedAttachments];
    });
  }

  function removePhotoAttachment(attachmentId: string) {
    setPhotoAttachments((current) => {
      const attachment = current.find((item) => item.id === attachmentId);
      if (attachment) URL.revokeObjectURL(attachment.url);
      return current.filter((item) => item.id !== attachmentId);
    });
  }

  return (
    <article className="glass-panel p-5" data-question-id={question.id}>
      <div className={cn(shouldShowReadAloud && "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between")}>
        <MathText
          as="h3"
          text={promptText}
          ariaLabel={promptLabel}
          className={cn(
            "practice-question-title font-black leading-snug text-slate-950 dark:text-white",
            isYoungLearner ? "text-2xl sm:text-[1.7rem]" : "text-xl",
            shouldShowReadAloud && "min-w-0 sm:flex-1"
          )}
        />
        {shouldShowReadAloud ? (
          <button
            type="button"
            onClick={handleReadAloudToggle}
            aria-pressed={isReadingAloud}
            data-testid="practice-read-aloud"
            className={cn(
              "focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border px-4 py-2.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
              isReadingAloud
                ? "border-sky-400 bg-sky-500/15 text-sky-800 dark:border-sky-300/40 dark:bg-sky-300/15 dark:text-sky-100"
                : "border-sky-200/80 bg-sky-50/80 text-sky-700 dark:border-sky-300/25 dark:bg-sky-950/40 dark:text-sky-200"
            )}
          >
            <SpeakerIcon />
            <span>{isReadingAloud ? t({ en: "Stop", zh: "停止", zhHans: "停止" }) : t({ en: "Read aloud", zh: "讀給我聽", zhHans: "读给我听" })}</span>
          </button>
        ) : null}
      </div>

      {question.diagram ? (
        <QuestionFigure diagram={question.diagram} variant={diagramVariant} compact={isPracticePage} language={language} />
      ) : null}

      {dotCardQuantities.length ? <CountingDotCards quantities={dotCardQuantities} t={t} /> : null}

      {questionImageAssets.length ? (
        <div className="mt-4 grid gap-3">
          {questionImageAssets.map((asset) => (
            <figure key={asset.src} className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.055]">
              <img
                src={asset.src}
                alt={localizedPracticeText(asset.alt)}
                className="mx-auto max-h-64 w-auto max-w-full object-contain sm:max-h-80 lg:max-h-96"
              />
              {asset.caption ? (
                <figcaption className="border-t border-slate-200/70 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300">
                  {localizedPracticeText(asset.caption)}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      ) : null}

      {question.type === "multiple-choice" ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(question.options ?? []).map((option) => {
              const optionValue = text(option);
              const optionText = localizedPracticeText(option);
              const optionDisplayText = formatUnitExponentsForMathText(formatPracticeOptionDisplayText(optionText));
              const active = selected === optionValue;
              return (
                <button
                  key={optionValue}
                  type="button"
                  aria-label={toPlainMathText(optionDisplayText)}
                  onClick={() => {
                    beginAttempt();
                    recordLearningEvent({
                      type: "mouse-click",
                      source: "practice",
                      topicId: question.topicId,
                      questionId: question.id
                    });
                    setSelected(optionValue);
                    setFeedback(null);
                    setError("");
                  }}
                  className={cn(
                    "focus-ring rounded-2xl border px-4 py-3 text-left text-sm font-bold transition",
                    active
                      ? "border-cyan-400 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                      : "border-slate-200/70 bg-white/65 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                  )}
                >
                  <MathText text={optionDisplayText} renderBareMath={shouldRenderOptionAsBareMath(optionText)} />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-5">
          {shouldShowAnswerInputModes ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {t(answerLabels[question.type])}
              </p>
              <div role="tablist" aria-label={t({ en: "Answer input mode", zh: "答案輸入模式" })} className="inline-flex rounded-full border border-slate-200/80 bg-white/75 p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                {([
                  ["keyboard", { en: "Keyboard input", zh: "鍵盤輸入" }],
                  ["handwriting", { en: "Handwriting board", zh: "手寫板" }]
                ] as const).map(([mode, label]) => {
                  const active = answerInputMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls={mode === "handwriting" ? handwritingBoardId : keyboardAnswerControlId}
                      onClick={() => {
                        beginAttempt();
                        setAnswerInputMode(mode);
                        if (mode === "handwriting") setSoftKeyboardOpen(false);
                      }}
                      className={cn(
                        "focus-ring rounded-full px-4 py-2 text-sm font-black transition",
                        active
                          ? "bg-cyan-500 text-white shadow-sm dark:bg-cyan-300 dark:text-slate-950"
                          : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-800 dark:text-slate-200 dark:hover:bg-white/[0.1] dark:hover:text-white"
                      )}
                    >
                      {t(label)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <label htmlFor={keyboardAnswerControlId} className="block text-sm font-bold text-slate-600 dark:text-slate-300">
              {t(answerLabels[question.type])}
            </label>
          )}

          {!shouldShowAnswerInputModes || answerInputMode === "keyboard" ? (
            question.type === "short-answer" ? (
              <textarea
                id={keyboardAnswerControlId}
                ref={(element) => {
                  answerControlRef.current = element;
                }}
                value={selected}
                rows={3}
                onChange={(event) => handleTypedAnswer(event.target.value)}
                onFocus={beginAttempt}
                placeholder={t(answerPlaceholders[question.type])}
                className="focus-ring mt-2 w-full resize-none rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
              />
            ) : (
              <input
                id={keyboardAnswerControlId}
                ref={(element) => {
                  answerControlRef.current = element;
                }}
                value={selected}
                onChange={(event) => handleTypedAnswer(event.target.value)}
                onFocus={beginAttempt}
                placeholder={t(answerPlaceholders[question.type])}
                className="focus-ring mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
              />
            )
          ) : null}

          {shouldShowAnswerInputModes && answerInputMode === "handwriting" ? (
            <HandwritingAnswerBoard
              boardId={handwritingBoardId}
              answerInputId={handwritingAnswerControlId}
              value={selected}
              isShortAnswer={question.type === "short-answer"}
              language={language}
              placeholder={t(answerPlaceholders[question.type])}
              resetToken={handwritingResetToken}
              onAnswerChange={handleTypedAnswer}
              onBeginAttempt={beginAttempt}
              onDraftInteraction={handleHandwritingDraftInteraction}
            />
          ) : null}

          {shouldShowMathSoftKeyboard && answerInputMode === "keyboard" ? (
            <div className="mt-3">
              <button
                type="button"
                aria-controls={mathKeyboardId}
                aria-expanded={softKeyboardOpen}
                aria-label={t(softKeyboardOpen ? { en: "Hide math keyboard", zh: "收起數學鍵盤" } : { en: "Show math keyboard", zh: "顯示數學鍵盤" })}
                onClick={() => {
                  beginAttempt();
                  setSoftKeyboardOpen((open) => !open);
                  requestAnimationFrame(() => answerControlRef.current?.focus({ preventScroll: true }));
                }}
                className={cn(
                  "focus-ring inline-flex min-h-11 items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
                  softKeyboardOpen
                    ? "border-cyan-300 bg-cyan-400/18 text-cyan-800 dark:border-cyan-200/35 dark:bg-cyan-300/15 dark:text-cyan-100"
                    : "border-slate-200/80 bg-white/75 text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.1]"
                )}
              >
                <span aria-hidden="true" className="text-base">⌨</span>
                <span>{t({ en: "Math keyboard", zh: "數學鍵盤" })}</span>
              </button>

              <AnimatePresence initial={false}>
                {softKeyboardOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.99 }}
                    transition={{ duration: 0.16 }}
                  >
                    <MathSoftKeyboard
                      id={mathKeyboardId}
                      value={selected}
                      targetRef={answerControlRef}
                      language={language}
                      onChange={handleTypedAnswer}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      )}

      <div className={cn("mt-5 flex flex-col gap-5", shouldShowPhotoUpload && "mt-4 sm:inline-flex sm:w-fit sm:items-stretch")}>
        {shouldShowPhotoUpload ? (
          <div className="w-full">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="focus-ring inline-flex min-h-14 w-full items-center gap-4 rounded-[1.6rem] border border-slate-200/80 bg-white px-5 py-4 text-left text-lg font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 sm:min-w-72 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.1]"
            >
              <PaperclipIcon />
              <span>{t(photoAttachmentCopy.addPhotos)}</span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept={answerPhotoAccept}
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              aria-label={t(photoAttachmentCopy.addPhotos)}
            />
            {photoAttachments.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {photoAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-white/10 dark:bg-white/[0.055]">
                    <img src={attachment.url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-800 dark:text-white">{attachment.name}</p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{formatPhotoSize(attachment.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhotoAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                      className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-lg font-black text-slate-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:text-rose-200"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected.trim() || isChecking || Boolean(feedback)}
            className={cn(
              "focus-ring rounded-full font-black text-white transition enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-[0_2px_0_#0e7490] disabled:cursor-not-allowed",
              "bg-cyan-500 shadow-[0_6px_0_#0e7490] enabled:hover:bg-cyan-400",
              "disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-400",
              isYoungLearner ? "min-h-14 px-8 py-3 text-lg" : "px-6 py-3 text-base"
            )}
          >
            {!currentUser ? t(dictionary.practice.loginAction) : isChecking ? t(dictionary.practice.checking) : t(dictionary.common.checkAnswer)}
          </button>
          <button
            type="button"
            onClick={reset}
            className={cn(
              "focus-ring rounded-full border border-slate-200/70 bg-white/70 font-bold text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-white",
              isYoungLearner ? "min-h-14 px-7 py-3 text-lg" : "px-5 py-3"
            )}
          >
            {t(dictionary.common.reset)}
          </button>
        </div>
      </div>

	      {error ? (
	        <p role="alert" className="mt-4 rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
	          {error} {needsLogin || !currentUser ? <Link href="/login" className="underline underline-offset-4">{t(dictionary.nav.login)}</Link> : null}
	        </p>
	      ) : null}

      <AnimatePresence>
        {feedback ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "relative mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6",
              feedback.correct
                ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                : "border-amber-400/30 bg-amber-500/15 text-amber-700 dark:text-amber-200"
            )}
          >
            <span className="relative grid shrink-0 place-items-center">
              {feedback.correct && !prefersReducedMotion ? <CorrectStarBurst /> : null}
              <motion.span
                key={feedback.correct ? "nova-correct" : "nova-retry"}
                className="grid place-items-center"
                initial={prefersReducedMotion ? false : { scale: 0.6, rotate: feedback.correct ? -10 : 0 }}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : feedback.correct
                      ? { scale: [0.6, 1.15, 1], rotate: [-10, 8, 0] }
                      : { rotate: [0, -6, 6, 0] }
                }
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <NovaCompanion mood={feedback.correct ? "cheer" : "encourage"} className="h-11 w-11" />
              </motion.span>
            </span>
            <div className="min-w-0 flex-1">
	            <p className="font-black">
	              {feedback.correct ? t(dictionary.practice.correct) : (
	                <>
	                  {t(dictionary.practice.notYet)}{" "}
                  {feedback.correctAnswer ? (
                    <MathText
                      text={formatUnitExponentsForMathText(feedback.correctAnswer)}
                      renderBareMath={shouldRenderOptionAsBareMath(feedback.correctAnswer)}
                    />
                  ) : null}
	                </>
	              )}
	            </p>
	            <MathText as="p" text={practiceTextForLanguage(feedback.explanation, language, question.publisher)} className="mt-1" />
	            {!feedback.correct ? <p className="mt-2 font-bold">{t(dictionary.practice.savedMistake)}</p> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}
