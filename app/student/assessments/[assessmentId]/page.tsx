"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import type { StudentAssessmentDetailData } from "@/types";

type AssessmentResponse = {
  data?: StudentAssessmentDetailData;
  submission?: StudentAssessmentDetailData["submission"];
};

function scoreLabel(submission: StudentAssessmentDetailData["submission"]) {
  if (submission.score === null || submission.maxScore <= 0) return "-";
  return `${submission.score}/${submission.maxScore} (${Math.round((submission.score / submission.maxScore) * 100)}%)`;
}

export default function StudentAssessmentPage() {
  const params = useParams<{ assessmentId: string }>();
  const { t, text } = useSettings();
  const [data, setData] = useState<StudentAssessmentDetailData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAssessment() {
    setIsLoading(true);
    const response = await fetch(`/api/assessments/${encodeURIComponent(params.assessmentId)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => null) as AssessmentResponse | null;
    setData(response.ok ? payload?.data ?? null : null);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.assessmentId]);

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setMessage("");
    setIsSubmitting(true);
    const response = await fetch(`/api/assessments/${encodeURIComponent(params.assessmentId)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: data.questions.map((question) => ({
          questionId: question.id,
          answer: answers[question.id] ?? ""
        }))
      })
    });
    setIsSubmitting(false);
    if (!response.ok) {
      setMessage(t({ en: "Could not submit this assessment yet.", zh: "暫時未能提交此測驗。" }));
      return;
    }
    setMessage(t({ en: "Assessment submitted and graded.", zh: "測驗已提交並完成批改。" }));
    await loadAssessment();
  }

  if (isLoading) {
    return (
      <div className="page-container py-10 sm:py-12">
        <div className="glass-panel min-h-72 animate-pulse p-8" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel p-6 sm:p-8">
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Assessment unavailable", zh: "測驗未能開啟" })}</h1>
          <Link href="/dashboard" className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t(dictionary.nav.dashboard)}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {data.className}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{text(data.assessment.title)}</h1>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-cyan-700 dark:text-cyan-200">{data.assessment.type}</span>
          <span className="rounded-full bg-violet-400/15 px-3 py-1 text-violet-700 dark:text-violet-200">{data.assessment.maxAttempts}x</span>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-700 dark:text-emerald-200">{data.submission.status}</span>
        </div>
        {data.assessment.sourceResourceId ? (
          <Link href={`/resource/${data.assessment.sourceResourceId}`} className="focus-ring mt-5 inline-flex rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">
            {t({ en: "Open source resource", zh: "開啟來源資源" })}
          </Link>
        ) : null}
        {data.unavailableReason ? (
          <p className="mt-4 rounded-2xl border border-amber-300/50 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-100">
            {text(data.unavailableReason)}
          </p>
        ) : null}
      </section>

      <form onSubmit={submitAssessment} className="mt-7 grid gap-6">
        {data.questionSections.map((section, sectionIndex) => (
          <section key={section.id} className="grid gap-5">
            <div className="glass-panel p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                {t({ en: `Section ${sectionIndex + 1}`, zh: `第 ${sectionIndex + 1} 部分` })}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{text(section.title)}</h2>
              {section.instructions ? (
                <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{text(section.instructions)}</p>
              ) : null}
            </div>
            {section.questions.map((question, index) => {
              const previousAnswer = data.submission.answers.find((answer) => answer.questionId === question.id);
              const currentAnswer = answers[question.id] ?? previousAnswer?.answer ?? "";
              return (
                <section key={question.id} className="glass-panel p-5 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                    {t({ en: `Question ${index + 1}`, zh: `第 ${index + 1} 題` })} · {question.maxPoints} {t({ en: "points", zh: "分" })}
                  </p>
                  <MathText as="h2" text={text(question.prompt)} className="mt-3 text-2xl font-black text-slate-950 dark:text-white" />
                  {question.options?.length ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {question.options.map((option) => {
                        const value = text(option);
                        return (
                          <label key={value} className={`focus-ring flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm font-bold ${currentAnswer === value ? "border-cyan-300 bg-cyan-400/15" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]"}`}>
                            <input
                              type="radio"
                              name={question.id}
                              value={value}
                              checked={currentAnswer === value}
                              disabled={!data.canSubmit}
                              onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                            />
                            <MathText text={value} />
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      value={currentAnswer}
                      disabled={!data.canSubmit}
                      onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                      className="focus-ring mt-5 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold dark:border-white/10 dark:bg-white/[0.06]"
                    />
                  )}
                  {previousAnswer ? (
                    <div className="mt-4 grid gap-2 text-sm font-bold">
                      <p className={`font-black ${previousAnswer.isCorrect ? "text-emerald-700 dark:text-emerald-200" : "text-rose-700 dark:text-rose-200"}`}>
                        {previousAnswer.isCorrect ? t({ en: "Correct", zh: "正確" }) : t({ en: "Needs review", zh: "需要重溫" })}
                      </p>
                      {question.isAnswerVisible && question.correctAnswer ? (
                        <p className="text-slate-600 dark:text-slate-300">{t({ en: "Answer", zh: "答案" })}: {question.correctAnswer}</p>
                      ) : null}
                      {question.isAnswerVisible && question.explanation ? (
                        <MathText text={text(question.explanation)} className="text-slate-500 dark:text-slate-400" />
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </section>
        ))}

        <section className="glass-panel flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">{t({ en: "Current score", zh: "目前分數" })}</p>
            <p className="mt-1 text-3xl font-black gradient-text">{scoreLabel(data.submission)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">
              {t(dictionary.nav.dashboard)}
            </Link>
            <button
              disabled={!data.canSubmit || isSubmitting}
              className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {isSubmitting ? t({ en: "Submitting", zh: "提交中" }) : t({ en: "Submit assessment", zh: "提交測驗" })}
            </button>
          </div>
          {message ? <p className="basis-full text-sm font-bold text-cyan-700 dark:text-cyan-200">{message}</p> : null}
        </section>
      </form>
    </div>
  );
}
