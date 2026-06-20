"use client";

import { useEffect, useMemo, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { grades } from "@/data/grades";
import { visibleDifficultiesForSelection } from "@/lib/difficulty";
import { formatDifficultyLabel, formatGradeLabel } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Difficulty, GradeId, LocalizedText, QuestionType } from "@/types";

export type PracticeMissionSetupTopicOption = {
  topicId: string;
  grade: GradeId;
  topic: LocalizedText;
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
  className?: string;
};

export function PracticeMissionSetupControls({ topicOptions, className }: PracticeMissionSetupControlsProps) {
  const { language, selectedGrade, t, text } = useSettings();
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>(selectedGrade);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionTypeFilter>("all");

  useEffect(() => {
    setGradeFilter(selectedGrade);
  }, [selectedGrade]);

  const filteredTopicOptions = useMemo(() => {
    if (gradeFilter === "all") return topicOptions;
    return topicOptions.filter((topicOption) => topicOption.grade === gradeFilter);
  }, [gradeFilter, topicOptions]);

  useEffect(() => {
    if (topicFilter === "all") return;
    if (!filteredTopicOptions.some((topicOption) => topicOption.topicId === topicFilter)) {
      setTopicFilter("all");
    }
  }, [filteredTopicOptions, topicFilter]);

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
              en: "These controls are reserved here temporarily for the next Practice Arena question flow.",
              zh: "這些控制暫時保留在這裡，供下一版練習場題目流程使用。",
              zhHans: "这些控制暂时保留在这里，供下一版练习场题目流程使用。"
            })}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="grid gap-2 text-sm font-black text-blue-950 dark:text-cyan-50">
            {t(dictionary.common.grade)}
            <select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value as GradeFilter)}
              className="focus-ring min-h-14 w-full rounded-2xl border border-blue-100 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-700 shadow-inner dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
            >
              <option value="all">{t(dictionary.common.all)}</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {text(grade.name)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-blue-950 dark:text-cyan-50">
            {t(dictionary.common.difficulty)}
            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value as DifficultyFilter)}
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
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              className="focus-ring min-h-14 w-full rounded-2xl border border-blue-100 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-700 shadow-inner dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
            >
              <option value="all">{t(dictionary.common.all)}</option>
              {filteredTopicOptions.map((topicOption) => (
                <option key={topicOption.topicId} value={topicOption.topicId}>
                  {`${formatGradeLabel(topicOption.grade, language, true)} · ${text(topicOption.topic)}`}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-blue-950 dark:text-cyan-50">
            {t({ en: "Question type", zh: "題型", zhHans: "题型" })}
            <select
              value={questionTypeFilter}
              onChange={(event) => setQuestionTypeFilter(event.target.value as QuestionTypeFilter)}
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
      </div>
    </section>
  );
}
