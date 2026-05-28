"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { formatDifficultyLabel, formatGradeLabel } from "@/lib/i18n";
import type { StudentResourceDetailData } from "@/types";

type ResourceResponse = {
  data?: StudentResourceDetailData;
};

function formatFileSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

export default function StudentResourcePage() {
  const params = useParams<{ resourceId: string }>();
  const { language, t, text } = useSettings();
  const [data, setData] = useState<StudentResourceDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadResource() {
      setIsLoading(true);
      const response = await fetch(`/api/resources/${encodeURIComponent(params.resourceId)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as ResourceResponse | null;
      if (!cancelled) {
        setData(response.ok ? payload?.data ?? null : null);
        setIsLoading(false);
      }
    }

    void loadResource();
    return () => {
      cancelled = true;
    };
  }, [params.resourceId]);

  async function markComplete() {
    setMessage("");
    const response = await fetch(`/api/resources/${encodeURIComponent(params.resourceId)}`, { method: "POST" });
    setMessage(
      response.ok
        ? t({ en: "Resource marked complete.", zh: "資源已標記完成。" })
        : t({ en: "Could not update this resource yet.", zh: "暫時未能更新此資源。" })
    );
  }

  if (isLoading) {
    return (
      <div className="page-container py-10 sm:py-12">
        <div className="glass-panel min-h-64 animate-pulse p-8" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel p-6 sm:p-8">
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Resource unavailable", zh: "資源未能開啟" })}</h1>
          <Link href="/dashboard" className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t(dictionary.nav.dashboard)}
          </Link>
        </section>
      </div>
    );
  }

  const resource = data.resource;

  return (
    <div className="page-container py-10 sm:py-12">
      <section className="glass-panel p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {formatGradeLabel(resource.grade, language, true)} · {resource.type}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{text(resource.title)}</h1>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-cyan-700 dark:text-cyan-200">{resource.fileType}</span>
          <span className="rounded-full bg-violet-400/15 px-3 py-1 text-violet-700 dark:text-violet-200">{formatFileSize(resource.fileSizeBytes)}</span>
          {resource.difficulty ? (
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-700 dark:text-emerald-200">
              {formatDifficultyLabel(resource.difficulty, language)}
            </span>
          ) : null}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href={data.downloadUrl} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Download resource", zh: "下載資源" })}
          </a>
          {data.canMarkComplete ? (
            <button type="button" onClick={markComplete} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">
              {t({ en: "Mark complete", zh: "標記完成" })}
            </button>
          ) : null}
          <Link href="/dashboard" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">
            {t(dictionary.nav.dashboard)}
          </Link>
        </div>
        {data.assignment ? (
          <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">
            {t({ en: "Linked assignment", zh: "連結作業" })}: {text(data.assignment.assignment.title)} · {data.assignment.submission.status}
          </p>
        ) : null}
        {message ? <p className="mt-4 text-sm font-bold text-cyan-700 dark:text-cyan-200">{message}</p> : null}
      </section>
    </div>
  );
}
