"use client";

import Link from "next/link";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { formatDifficultyLabel, formatGradeLabel } from "@/lib/i18n";
import { lessonHrefForTopicId } from "@/lib/lessonLinks";
import { cn, percent } from "@/lib/utils";
import type { Topic } from "@/types";

const statusClasses = {
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  "in-progress": "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  "not-started": "bg-slate-500/15 text-slate-600 dark:text-slate-300"
};

export function TopicCard({ topic, href = lessonHrefForTopicId(topic.id) }: { topic: Topic; href?: string }) {
  const { language, text, t } = useSettings();
  const statusLabel =
    topic.status === "completed" ? dictionary.common.completed : topic.status === "in-progress" ? dictionary.common.inProgress : dictionary.common.notStarted;

  return (
    <Link href={href} className="focus-ring group soft-panel block p-5 transition hover:-translate-y-1 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{formatGradeLabel(topic.grade, language, true)} · {formatDifficultyLabel(topic.difficulty, language)}</p>
          <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-white">{text(topic.title)}</h3>
        </div>
        <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold", statusClasses[topic.status])}>{t(statusLabel)}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(topic.description)}</p>
      <div className="mt-5 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{topic.minutes} {t(dictionary.common.minutes)}</span>
        <span>{percent(topic.mastery)} {t(dictionary.common.mastery)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all group-hover:from-cyan-300 group-hover:to-fuchsia-400" style={{ width: `${topic.mastery}%` }} />
      </div>
    </Link>
  );
}
