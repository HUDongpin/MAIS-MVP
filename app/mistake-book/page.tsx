"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AITutorButton } from "@/components/ai/AITutorButton";
import { MathText, toPlainMathText } from "@/components/math/MathText";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatDifficultyLabel, formatGradeLabel, localeForLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Language, LocalizedText, MistakeBookItem } from "@/types";

type ReviewFilter = "all" | "active" | "mastered";

function formatAttemptDate(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function readMistakes(value: unknown) {
  const response = value as { mistakes?: unknown } | null;
  return Array.isArray(response?.mistakes) ? (response.mistakes as MistakeBookItem[]) : [];
}

function localizedSearchValues(value: LocalizedText) {
  return [value.en, value.zh, value.zhHans ?? ""];
}

function normalizeSearchText(value: string) {
  return toPlainMathText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function searchTextForMistake(record: MistakeBookItem) {
  const question = record.question;
  const statusLabels = record.mastered
    ? ["mastered", "已掌握"]
    : ["active review", "active", "活躍複習", "活跃复习"];

  return normalizeSearchText([
    question.id,
    question.grade,
    question.topicId,
    question.difficulty,
    question.type,
    question.type.replace("-", " "),
    ...localizedSearchValues(question.topic),
    ...localizedSearchValues(question.prompt),
    ...localizedSearchValues(record.explanation),
    record.lastSelectedAnswer,
    record.correctAnswer,
    String(record.wrongAttempts),
    ...statusLabels
  ].join(" "));
}

function clampMistakeIndex(index: number, recordCount: number) {
  if (recordCount <= 0) return 0;
  return Math.min(recordCount - 1, Math.max(0, index));
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}

export default function MistakeBookPage() {
  const { language, t, text } = useSettings();
  const [filter, setFilter] = useState<ReviewFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jumpValue, setJumpValue] = useState("1");
  const [allMistakes, setAllMistakes] = useState<MistakeBookItem[]>([]);
  const [visibleRecords, setVisibleRecords] = useState<MistakeBookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  const activeCount = allMistakes.filter((record) => !record.mastered).length;
  const masteredCount = allMistakes.filter((record) => record.mastered).length;
  const filteredRecords = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);
    if (!normalizedQuery) return visibleRecords;
    return visibleRecords.filter((record) => searchTextForMistake(record).includes(normalizedQuery));
  }, [searchQuery, visibleRecords]);
  const filteredRecordSignature = useMemo(
    () => filteredRecords.map((record) => record.questionId).join("|"),
    [filteredRecords]
  );
  const recordCount = filteredRecords.length;
  const safeCurrentIndex = clampMistakeIndex(currentIndex, recordCount);
  const currentRecordNumber = recordCount ? safeCurrentIndex + 1 : 0;
  const currentRecord = filteredRecords[safeCurrentIndex] ?? null;
  const trimmedSearchQuery = searchQuery.trim();

  const goToIndex = useCallback((index: number) => {
    if (!recordCount) return;
    setCurrentIndex(clampMistakeIndex(index, recordCount));
  }, [recordCount]);

  const goToPrevious = useCallback(() => {
    goToIndex(safeCurrentIndex - 1);
  }, [goToIndex, safeCurrentIndex]);

  const goToNext = useCallback(() => {
    goToIndex(safeCurrentIndex + 1);
  }, [goToIndex, safeCurrentIndex]);

  const handleJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextRecordNumber = Number.parseInt(jumpValue, 10);
    if (Number.isNaN(nextRecordNumber)) {
      setJumpValue(recordCount ? String(currentRecordNumber) : "");
      return;
    }

    goToIndex(nextRecordNumber - 1);
  }, [currentRecordNumber, goToIndex, jumpValue, recordCount]);

  useEffect(() => {
    let cancelled = false;

    async function loadAllMistakes() {
      try {
        const response = await fetch("/api/mistakes", { cache: "no-store" });
        const mistakes = readMistakes(await response.json());
        if (!response.ok) throw new Error(t({ en: "Could not load mistake counts.", zh: "暫時無法載入錯題數量。" }));
        if (!cancelled) setAllMistakes(mistakes);
      } catch {
        if (!cancelled) setAllMistakes([]);
      }
    }

    loadAllMistakes();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, t]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadVisibleMistakes() {
      const query = filter === "all" ? "" : `?status=${filter}`;
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/mistakes${query}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const mistakes = readMistakes(await response.json());
        if (!response.ok) throw new Error(t({ en: "Could not load mistakes.", zh: "暫時無法載入錯題。" }));
        setVisibleRecords(mistakes);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setVisibleRecords([]);
          setError(caughtError instanceof Error ? caughtError.message : t({ en: "Could not load mistakes.", zh: "暫時無法載入錯題。" }));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadVisibleMistakes();

    return () => controller.abort();
  }, [filter, refreshKey, t]);

  useEffect(() => {
    setCurrentIndex(0);
    setJumpValue(recordCount ? "1" : "");
  }, [filteredRecordSignature, recordCount]);

  useEffect(() => {
    setJumpValue(recordCount ? String(currentRecordNumber) : "");
  }, [currentRecordNumber, recordCount]);

  useEffect(() => {
    if (recordCount < 2) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditableElement(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, recordCount]);

  async function clearMistakes() {
    await fetch("/api/mistakes", { method: "DELETE" });
    refresh();
  }

  async function markMistakeMastered(questionId: string) {
    await fetch(`/api/mistakes/${encodeURIComponent(questionId)}`, { method: "PATCH" });
    refresh();
  }

  async function removeMistake(questionId: string) {
    await fetch(`/api/mistakes/${encodeURIComponent(questionId)}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <SectionHeader
        title={t(dictionary.mistakes.title)}
        description={t(dictionary.mistakes.desc)}
        eyebrow={t(dictionary.mistakes.eyebrow)}
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 dark:bg-white dark:text-slate-950"
            >
              {t(dictionary.mistakes.practiceMore)}
            </Link>
            <button
              type="button"
              onClick={clearMistakes}
              disabled={allMistakes.length === 0}
              className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 shadow-lg transition enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.07] dark:text-white"
            >
              {t(dictionary.mistakes.clear)}
            </button>
          </div>
        }
      />

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { label: t(dictionary.mistakes.wrongItems), value: allMistakes.length },
          { label: t(dictionary.mistakes.activeItems), value: activeCount },
          { label: t(dictionary.mistakes.masteredItems), value: masteredCount }
        ].map((item) => (
          <div key={item.label} className="glass-panel p-5">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-2 text-4xl font-black text-cyan-600 dark:text-cyan-200">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="glass-panel mt-6 grid gap-4 p-3 lg:grid-cols-[auto_minmax(18rem,1fr)] lg:items-end">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "active", label: t(dictionary.mistakes.activeItems) },
            { id: "all", label: t(dictionary.common.all) },
            { id: "mastered", label: t(dictionary.mistakes.masteredItems) }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id as ReviewFilter)}
              className={cn(
                "focus-ring rounded-full px-4 py-2 text-sm font-black transition",
                filter === item.id
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label htmlFor="mistake-search" className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t({ en: "Search mistakes", zh: "搜尋錯題" })}
            </span>
            <input
              id="mistake-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t({ en: "Topic, keyword, answer, S3...", zh: "課題、關鍵字、答案、S3..." })}
              className="focus-ring min-h-12 w-full rounded-full border border-slate-200 bg-white/85 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm placeholder:text-slate-400 focus:outline-none dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
            />
          </label>
          {trimmedSearchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-white"
            >
              {t({ en: "Clear search", zh: "清除搜尋" })}
            </button>
          ) : null}
        </div>
      </section>

      {isLoading ? (
        <section className="glass-panel mt-8 p-8 text-center">
          <p className="text-xl font-black text-slate-950 dark:text-white">{t(dictionary.mistakes.loading)}</p>
        </section>
      ) : null}

      {error ? (
        <section className="glass-panel mt-8 p-8 text-center">
          <p className="text-xl font-black text-rose-700 dark:text-rose-200">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && visibleRecords.length > 0 && currentRecord ? (
        <section className="mt-8 grid gap-5" aria-label={t({ en: "Mistake review questions", zh: "錯題重溫題目" })}>
          <div className="glass-panel grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div>
              <p aria-live="polite" className="text-sm font-black uppercase tracking-[0.18em] text-cyan-500 dark:text-cyan-300">
                {t({ en: `Question ${currentRecordNumber} of ${recordCount}`, zh: `第 ${currentRecordNumber} 題，共 ${recordCount} 題` })}
              </p>
              {trimmedSearchQuery ? (
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {t({
                    en: `${recordCount} matching ${recordCount === 1 ? "mistake" : "mistakes"} for "${trimmedSearchQuery}"`,
                    zh: `「${trimmedSearchQuery}」顯示 ${recordCount} 道相符錯題`
                  })}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label={t({ en: "Previous mistake", zh: "上一道錯題" })}
                  onClick={goToPrevious}
                  disabled={safeCurrentIndex === 0}
                  className="focus-ring rounded-full border border-slate-200/70 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.07] dark:text-white"
                >
                  {t({ en: "< Previous", zh: "< 上一題" })}
                </button>
                <button
                  type="button"
                  aria-label={t({ en: "Next mistake", zh: "下一道錯題" })}
                  onClick={goToNext}
                  disabled={safeCurrentIndex >= recordCount - 1}
                  className="focus-ring rounded-full border border-slate-200/70 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.07] dark:text-white"
                >
                  {t({ en: "Next >", zh: "下一題 >" })}
                </button>
              </div>
            </div>

            <form onSubmit={handleJump} noValidate className="grid gap-2 sm:w-64">
              <label htmlFor="mistake-question-jump" className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t({ en: "Jump to", zh: "跳到題號" })}
              </label>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  id="mistake-question-jump"
                  type="number"
                  min={1}
                  max={recordCount}
                  value={jumpValue}
                  onChange={(event) => setJumpValue(event.target.value)}
                  className="focus-ring min-h-14 w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-lg font-black text-slate-950 shadow-sm [appearance:textfield] placeholder:text-slate-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:border-white/10 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="submit"
                  className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                >
                  {t({ en: "Jump", zh: "跳轉" })}
                </button>
              </div>
            </form>
          </div>

          <article className="glass-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-300">{formatGradeLabel(currentRecord.question.grade, language, true)}</span>
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-300">{formatDifficultyLabel(currentRecord.question.difficulty, language)}</span>
              <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">{text(currentRecord.question.topic)}</span>
              <span className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                currentRecord.mastered
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-200"
              )}>
                {currentRecord.mastered ? t(dictionary.mistakes.masteredItems) : t(dictionary.mistakes.activeItems)}
              </span>
            </div>

            <MathText
              as="h2"
              text={text(currentRecord.question.prompt)}
              className="mt-5 text-2xl font-black leading-snug text-slate-950 dark:text-white"
            />
            <MathText
              as="p"
              text={text(currentRecord.explanation)}
              className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300"
            />
            <div className="mt-4">
              <AITutorButton
                context={{
                  mode: "mistake",
                  title: text(currentRecord.question.prompt),
                  details: t({
                    en: `Last answer: ${currentRecord.lastSelectedAnswer}. Correct answer: ${currentRecord.correctAnswer}. Wrong attempts: ${currentRecord.wrongAttempts}.`,
                    zh: `上次答案：${currentRecord.lastSelectedAnswer}。正確答案：${currentRecord.correctAnswer}。錯誤次數：${currentRecord.wrongAttempts}。`
                  })
                }}
                label={t(dictionary.practice.askTutor)}
              />
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">{t(dictionary.mistakes.lastAnswer)}</dt>
                <MathText as="dd" text={currentRecord.lastSelectedAnswer} renderBareMath className="mt-2 block overflow-x-auto break-words font-black text-slate-950 dark:text-white" />
              </div>
              <div className="min-w-0 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-4">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">{t(dictionary.mistakes.correctAnswer)}</dt>
                <MathText as="dd" text={currentRecord.correctAnswer} renderBareMath className="mt-2 block overflow-x-auto break-words font-black text-slate-950 dark:text-white" />
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t(dictionary.mistakes.wrongAttempts)}</dt>
                <dd className="mt-2 font-black text-slate-950 dark:text-white">{currentRecord.wrongAttempts}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t(dictionary.mistakes.lastAttempt)}</dt>
                <dd className="mt-2 font-black text-slate-950 dark:text-white">{formatAttemptDate(currentRecord.lastAttemptAt, language)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{t(dictionary.mistakes.retryHint)}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              {!currentRecord.mastered ? (
                <button
                  type="button"
                  onClick={() => markMistakeMastered(currentRecord.questionId)}
                  className="focus-ring rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  {t(dictionary.mistakes.markMastered)}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => removeMistake(currentRecord.questionId)}
                className="focus-ring rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
              >
                {t(dictionary.mistakes.remove)}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {!isLoading && !error && visibleRecords.length > 0 && filteredRecords.length === 0 ? (
        <section className="glass-panel mt-8 p-8 text-center">
          <p className="text-2xl font-black text-slate-950 dark:text-white">
            {t({ en: "No matching mistakes", zh: "找不到相符錯題" })}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
            {t({ en: "Try a different keyword, topic, answer, or grade.", zh: "請嘗試其他關鍵字、課題、答案或年級。" })}
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="focus-ring mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 font-black text-white transition hover:-translate-y-1 dark:bg-white dark:text-slate-950"
          >
            {t({ en: "Clear search", zh: "清除搜尋" })}
          </button>
        </section>
      ) : null}

      {!isLoading && !error && visibleRecords.length === 0 ? (
        <section className="glass-panel mt-8 p-8 text-center">
          <p className="text-2xl font-black text-slate-950 dark:text-white">{t(dictionary.mistakes.emptyTitle)}</p>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">{t(dictionary.mistakes.emptyDesc)}</p>
          <Link
            href="/practice"
            className="focus-ring mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 font-black text-white transition hover:-translate-y-1 dark:bg-white dark:text-slate-950"
          >
            {t(dictionary.mistakes.practiceMore)}
          </Link>
        </section>
      ) : null}
    </div>
  );
}
