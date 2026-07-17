"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { grades } from "@/data/grades";
import { visibleDifficultiesForSelection } from "@/lib/difficulty";
import { formatDifficultyLabel, formatGradeLabelForCurriculum } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Difficulty, GradeId, LocalizedText, QuestionType } from "@/types";

export type PracticeMissionSetupTopicOption = {
  topicId: string;
  grade: GradeId;
  topic: LocalizedText;
};

export type PracticeMissionPreviewQuestion = {
  id: string;
  difficulty: Difficulty;
  grade: GradeId;
  options?: LocalizedText[];
  prompt: LocalizedText;
  topic: LocalizedText;
  topicId: string;
  type: QuestionType;
};

type GradeFilter = GradeId | "all";
type DifficultyFilter = Difficulty | "all";
type QuestionTypeFilter = QuestionType | "all";

const questionTypes: QuestionType[] = ["multiple-choice", "fill-in", "short-answer", "graph"];

const questionTypeLabels: Record<QuestionType, LocalizedText> = {
  "multiple-choice": { en: "Multiple choice", zh: "選擇題", zhHans: "选择题" },
  "fill-in": { en: "Fill-in", zh: "填空題", zhHans: "填空题" },
  "short-answer": { en: "Short answer", zh: "簡答題", zhHans: "简答题" },
  graph: { en: "Graph", zh: "圖形題", zhHans: "图形题" }
};

type PracticeMissionSetupControlsProps = {
  topicOptions: PracticeMissionSetupTopicOption[];
  gradeFilter?: GradeFilter;
  difficultyFilter?: DifficultyFilter;
  topicFilter?: string;
  questionTypeFilter?: QuestionTypeFilter;
  questionPreviewItems?: PracticeMissionPreviewQuestion[];
  gradeSelectionDisabled?: boolean;
  onGradeFilterChange?: (value: GradeFilter) => void;
  onDifficultyFilterChange?: (value: DifficultyFilter) => void;
  onTopicFilterChange?: (value: string) => void;
  onQuestionTypeFilterChange?: (value: QuestionTypeFilter) => void;
  className?: string;
};

export function PracticeMissionSetupControls({
  topicOptions,
  gradeFilter,
  difficultyFilter,
  topicFilter,
  questionTypeFilter,
  questionPreviewItems = [],
  gradeSelectionDisabled = false,
  onGradeFilterChange,
  onDifficultyFilterChange,
  onTopicFilterChange,
  onQuestionTypeFilterChange,
  className
}: PracticeMissionSetupControlsProps) {
  const { currentUser, language, selectedGrade, t, text } = useSettings();
  const curriculumTrack = currentUser?.curriculumTrack ?? "HK";
  const [localGradeFilter, setLocalGradeFilter] = useState<GradeFilter>(selectedGrade);
  const [localDifficultyFilter, setLocalDifficultyFilter] = useState<DifficultyFilter>("all");
  const [localTopicFilter, setLocalTopicFilter] = useState("all");
  const [localQuestionTypeFilter, setLocalQuestionTypeFilter] = useState<QuestionTypeFilter>("all");
  const activeGradeFilter = gradeFilter ?? localGradeFilter;
  const activeDifficultyFilter = difficultyFilter ?? localDifficultyFilter;
  const activeTopicFilter = topicFilter ?? localTopicFilter;
  const activeQuestionTypeFilter = questionTypeFilter ?? localQuestionTypeFilter;

  useEffect(() => {
    if (gradeFilter) return;
    setLocalGradeFilter(selectedGrade);
  }, [gradeFilter, selectedGrade]);

  const handleGradeFilterChange = useCallback((value: GradeFilter) => {
    if (onGradeFilterChange) onGradeFilterChange(value);
    else setLocalGradeFilter(value);
  }, [onGradeFilterChange]);

  const handleDifficultyFilterChange = useCallback((value: DifficultyFilter) => {
    if (onDifficultyFilterChange) onDifficultyFilterChange(value);
    else setLocalDifficultyFilter(value);
  }, [onDifficultyFilterChange]);

  const handleTopicFilterChange = useCallback((value: string) => {
    if (onTopicFilterChange) onTopicFilterChange(value);
    else setLocalTopicFilter(value);
  }, [onTopicFilterChange]);

  const handleQuestionTypeFilterChange = useCallback((value: QuestionTypeFilter) => {
    if (onQuestionTypeFilterChange) onQuestionTypeFilterChange(value);
    else setLocalQuestionTypeFilter(value);
  }, [onQuestionTypeFilterChange]);

  const filteredTopicOptions = useMemo(() => {
    if (activeGradeFilter === "all") return topicOptions;
    return topicOptions.filter((topicOption) => topicOption.grade === activeGradeFilter);
  }, [activeGradeFilter, topicOptions]);
  const previewQuestions = useMemo(() => {
    return questionPreviewItems
      .filter((question) => activeGradeFilter === "all" || question.grade === activeGradeFilter)
      .filter((question) => activeDifficultyFilter === "all" || question.difficulty === activeDifficultyFilter)
      .filter((question) => activeTopicFilter === "all" || question.topicId === activeTopicFilter)
      .filter((question) => activeQuestionTypeFilter === "all" || question.type === activeQuestionTypeFilter)
      .slice(0, 5);
  }, [activeDifficultyFilter, activeGradeFilter, activeQuestionTypeFilter, activeTopicFilter, questionPreviewItems]);

  useEffect(() => {
    if (activeTopicFilter === "all") return;
    if (!filteredTopicOptions.some((topicOption) => topicOption.topicId === activeTopicFilter)) {
      handleTopicFilterChange("all");
    }
  }, [activeTopicFilter, filteredTopicOptions, handleTopicFilterChange]);

  return (
    <section
      id="parked-practice-mission-setup"
      aria-label={t({ en: "Practice mission setup controls", zh: "練習場任務設定控制", zhHans: "练习场任务设置控制" })}
      className={cn("bg-cyan-400 px-4 py-8 sm:px-6 lg:px-8", className)}
    >
      <div className="mx-auto max-w-7xl rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_22px_46px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/95 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600 dark:text-cyan-300">
              {t({ en: "Mission Setup", zh: "任務設定", zhHans: "任务设置" })}
            </p>
            <h2 className="mt-1 text-2xl font-black text-blue-950 dark:text-white">
              {t({ en: "Choose your next challenge", zh: "選擇下一個挑戰", zhHans: "选择下一个挑战" })}
            </h2>
          </div>
          <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {t({
              en: "Free selection is ready for the next 5-question round.",
              zh: "自由選題已準備好開始下一個 5 題回合。",
              zhHans: "自由选题已准备好开始下一个 5 题回合。"
            })}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="grid gap-2 text-sm font-black text-blue-950 dark:text-cyan-50">
            {t(dictionary.common.grade)}
            <select
              value={activeGradeFilter}
              onChange={(event) => handleGradeFilterChange(event.target.value as GradeFilter)}
              disabled={gradeSelectionDisabled}
              className="focus-ring min-h-14 w-full rounded-2xl border border-blue-100 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-700 shadow-inner disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
            >
              <option value="all">{t(dictionary.common.all)}</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {formatGradeLabelForCurriculum(grade.id, language, curriculumTrack)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-blue-950 dark:text-cyan-50">
            {t(dictionary.common.difficulty)}
            <select
              value={activeDifficultyFilter}
              onChange={(event) => handleDifficultyFilterChange(event.target.value as DifficultyFilter)}
              className="focus-ring min-h-14 w-full rounded-2xl border border-blue-100 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-700 shadow-inner dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
            >
              <option value="all">{t(dictionary.common.all)}</option>
              {visibleDifficultiesForSelection.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {formatDifficultyLabel(difficulty, language)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-blue-950 dark:text-cyan-50">
            {t(dictionary.common.topic)}
            <select
              value={activeTopicFilter}
              onChange={(event) => handleTopicFilterChange(event.target.value)}
              className="focus-ring min-h-14 w-full rounded-2xl border border-blue-100 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-700 shadow-inner dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
            >
              <option value="all">{t(dictionary.common.all)}</option>
              {filteredTopicOptions.map((topicOption) => (
                <option key={topicOption.topicId} value={topicOption.topicId}>
                  {`${formatGradeLabelForCurriculum(topicOption.grade, language, curriculumTrack, true)} · ${text(topicOption.topic)}`}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-blue-950 dark:text-cyan-50">
            {t({ en: "Question type", zh: "題型", zhHans: "题型" })}
            <select
              value={activeQuestionTypeFilter}
              onChange={(event) => handleQuestionTypeFilterChange(event.target.value as QuestionTypeFilter)}
              className="focus-ring min-h-14 w-full rounded-2xl border border-blue-100 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-700 shadow-inner dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
            >
              <option value="all">{t(dictionary.common.all)}</option>
              {questionTypes.map((questionType) => (
                <option key={questionType} value={questionType}>
                  {t(questionTypeLabels[questionType])}
                </option>
              ))}
            </select>
          </label>
        </div>

        {questionPreviewItems.length ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-practice-mission-preview-count={previewQuestions.length}>
            {previewQuestions.map((question, index) => (
              <article
                key={question.id}
                className="grid min-h-[13rem] min-w-0 content-between rounded-2xl border border-blue-100 bg-sky-50/70 p-4 shadow-inner dark:border-white/10 dark:bg-white/[0.08]"
                data-practice-mission-preview-card
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-white">
                      {index + 1}/5
                    </span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[0.65rem] font-black text-blue-800 dark:bg-white/[0.09] dark:text-cyan-100">
                      {formatDifficultyLabel(question.difficulty, language)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">
                    {text(question.topic)}
                  </p>
                  <MathText
                    as="p"
                    text={text(question.prompt)}
                    className="mt-2 line-clamp-4 min-w-0 text-sm font-bold leading-6 text-slate-700 dark:text-slate-100"
                  />
                </div>
                {question.options?.length ? (
                  <div className="mt-3 grid gap-1.5">
                    {question.options.slice(0, 2).map((option, optionIndex) => (
                      <span key={`${question.id}-${optionIndex}`} className="truncate rounded-xl bg-white/85 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/[0.08] dark:text-slate-200">
                        {text(option)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-white/85 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/[0.08] dark:text-slate-200">
                    {t(questionTypeLabels[question.type])}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
