"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import type { LearningPathStepKind, StudentLearningPath } from "@/types";

const stepKindLabels: Record<LearningPathStepKind, { en: string; zh: string }> = {
  lesson: { en: "Lesson", zh: "課堂" },
  practice: { en: "Practice", zh: "練習" },
  assessment: { en: "Assessment", zh: "測驗" },
  visualization: { en: "Visualization", zh: "視覺化" },
  resource: { en: "Resource", zh: "資源" }
};

function StepMarker({ status }: { status: StudentLearningPath["steps"][number]["status"] }) {
  if (status === "completed") {
    return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">✓</span>;
  }
  if (status === "available") {
    return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white ring-4 ring-cyan-400/30 dark:bg-white dark:text-slate-950">▶</span>;
  }
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300/70 bg-white/60 text-sm font-black text-slate-400 dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-500">🔒</span>;
}

function StudentLearningPathCard({
  path,
  onUpdate
}: {
  path: StudentLearningPath;
  onUpdate: (path: StudentLearningPath) => void;
}) {
  const { t } = useSettings();
  const [busyStepId, setBusyStepId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const markComplete = async (stepId: string) => {
    setBusyStepId(stepId);
    setError("");
    const response = await fetch(`/api/learning-paths/${encodeURIComponent(path.id)}/steps/${encodeURIComponent(stepId)}/complete`, {
      method: "POST"
    });
    setBusyStepId(null);
    const payload = await response.json().catch(() => null) as { path?: StudentLearningPath } | null;
    if (!response.ok || !payload?.path) {
      setError(t({ en: "Could not update this step.", zh: "未能更新此步驟。" }));
      return;
    }
    onUpdate(payload.path);
  };

  const progressPercent = path.totalStepCount ? Math.round((path.completedStepCount / path.totalStepCount) * 100) : 0;

  return (
    <article className="glass-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xl font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{path.title}</p>
          {path.description ? <p className="mt-1 break-words text-sm font-semibold text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{path.description}</p> : null}
        </div>
        {path.completed ? (
          <span className="rounded-full border border-emerald-300/50 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-200">{t({ en: "Completed", zh: "已完成" })}</span>
        ) : (
          <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">{path.completedStepCount}/{path.totalStepCount} {t({ en: "steps", zh: "步驟" })}</span>
        )}
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      <ol className="mt-5 grid gap-3">
        {path.steps.map((step, index) => (
          <li key={step.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3 ${step.status === "locked" ? "border-slate-200/50 bg-white/40 opacity-70 dark:border-white/5 dark:bg-white/[0.02]" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.05]"}`}>
            <StepMarker status={step.status} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">{index + 1}</span>
                <span className="rounded-full border border-slate-200/70 bg-white/70 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">{t(stepKindLabels[step.kind])}</span>
                <span className="min-w-0 break-words text-sm font-black text-slate-950 [overflow-wrap:anywhere] dark:text-white">{step.title}</span>
              </div>
              {step.description ? <p className="mt-1 break-words text-xs font-semibold text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">{step.description}</p> : null}
            </div>
            {step.status !== "locked" ? (
              <div className="flex flex-wrap gap-2">
                {step.href ? (
                  <Link href={step.href} className="focus-ring rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">{t({ en: "Open", zh: "開始" })}</Link>
                ) : null}
                {step.status === "available" ? (
                  <button type="button" onClick={() => markComplete(step.id)} disabled={busyStepId === step.id} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{busyStepId === step.id ? t({ en: "Saving...", zh: "儲存中..." }) : t({ en: "Mark done", zh: "標記完成" })}</button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
    </article>
  );
}

export function StudentLearningPathsView() {
  const { t } = useSettings();
  const [paths, setPaths] = useState<StudentLearningPath[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/learning-paths")
      .then((response) => (response.ok ? response.json() : { paths: [] }))
      .then((payload: { paths?: StudentLearningPath[] }) => {
        if (active) setPaths(payload.paths ?? []);
      })
      .catch(() => {
        if (active) setPaths([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const updatePath = (updated: StudentLearningPath) => {
    setPaths((current) => (current ? current.map((path) => (path.id === updated.id ? updated : path)) : current));
  };

  if (paths === null || paths.length === 0) return null;

  return (
    <section data-tour="student-learning-paths" className="mx-auto grid w-full max-w-5xl gap-4 px-4 pt-8 sm:px-6">
      <div>
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Your learning paths", zh: "你的學習路徑" })}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{t({ en: "Follow each step in order — finish one to unlock the next.", zh: "按順序完成每個步驟，完成一步即可解鎖下一步。" })}</p>
      </div>
      {paths.map((path) => <StudentLearningPathCard key={path.id} path={path} onUpdate={updatePath} />)}
    </section>
  );
}
