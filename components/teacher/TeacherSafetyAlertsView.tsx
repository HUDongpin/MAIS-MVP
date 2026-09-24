"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import type {
  ContentSafetyAlertsData,
  ContentSafetyCategory,
  ContentSafetyFlag,
  ContentSafetyFlagStatus,
  ContentSafetySeverity,
  ContentSafetySource,
  LocalizedText
} from "@/types";

type StatusFilter = "all" | ContentSafetyFlagStatus;

const categoryLabels: Record<ContentSafetyCategory, LocalizedText> = {
  "self-harm": { en: "Self-harm / crisis", zh: "自我傷害／危機", zhHans: "自我伤害／危机" },
  abuse: { en: "Abuse disclosure", zh: "受虐披露", zhHans: "受虐披露" },
  violence: { en: "Threat of violence", zh: "暴力威脅", zhHans: "暴力威胁" },
  harassment: { en: "Bullying / harassment", zh: "欺凌／騷擾", zhHans: "欺凌／骚扰" },
  sexual: { en: "Inappropriate / sexual", zh: "不當／性內容", zhHans: "不当／性内容" }
};

const severityLabels: Record<ContentSafetySeverity, LocalizedText> = {
  critical: { en: "Critical", zh: "緊急", zhHans: "紧急" },
  high: { en: "High", zh: "高", zhHans: "高" },
  medium: { en: "Medium", zh: "中", zhHans: "中" }
};

const sourceLabels: Record<ContentSafetySource, LocalizedText> = {
  "student-input": { en: "Student wrote this to the tutor", zh: "學生向 AI 導師寫下", zhHans: "学生向 AI 导师写下" },
  "tutor-output": { en: "AI tutor reply was flagged", zh: "AI 導師回覆被標記", zhHans: "AI 导师回复被标记" }
};

const statusLabels: Record<ContentSafetyFlagStatus, LocalizedText> = {
  new: { en: "New", zh: "新", zhHans: "新" },
  acknowledged: { en: "Acknowledged", zh: "已知悉", zhHans: "已知悉" },
  resolved: { en: "Resolved", zh: "已處理", zhHans: "已处理" }
};

function severityClasses(severity: ContentSafetySeverity) {
  if (severity === "critical") {
    return "border-rose-400/60 bg-rose-500/15 text-rose-800 dark:text-rose-100";
  }
  if (severity === "high") {
    return "border-amber-400/60 bg-amber-400/15 text-amber-800 dark:text-amber-100";
  }
  return "border-slate-300/70 bg-slate-400/15 text-slate-700 dark:text-slate-200";
}

function cardAccent(flag: ContentSafetyFlag) {
  if (flag.status === "resolved") return "border-slate-200/70 dark:border-white/10";
  if (flag.severity === "critical") return "border-rose-300/70 dark:border-rose-400/30";
  if (flag.severity === "high") return "border-amber-300/70 dark:border-amber-400/30";
  return "border-slate-200/70 dark:border-white/10";
}

function emptyCounts() {
  return { new: 0, acknowledged: 0, resolved: 0, total: 0, open: 0 };
}

function recomputeCounts(flags: ContentSafetyFlag[]) {
  const counts = emptyCounts();
  for (const flag of flags) {
    counts.total += 1;
    counts[flag.status] += 1;
  }
  counts.open = counts.new + counts.acknowledged;
  return counts;
}

export function TeacherSafetyAlertsView({ initialData }: { initialData: ContentSafetyAlertsData }) {
  const { language, t } = useSettings();
  const [flags, setFlags] = useState<ContentSafetyFlag[]>(initialData.flags);
  const [counts, setCounts] = useState(initialData.counts ?? recomputeCounts(initialData.flags));
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locale = language === "en" ? "en-US" : language === "zh-Hans" ? "zh-CN" : "zh-HK";

  const visibleFlags = useMemo(() => {
    if (filter === "all") return flags;
    return flags.filter((flag) => flag.status === filter);
  }, [flags, filter]);

  function formatWhen(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  async function updateFlag(flag: ContentSafetyFlag, status: "acknowledged" | "resolved") {
    setPendingId(flag.id);
    setError(null);
    try {
      const response = await fetch("/api/teacher/safety-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flagId: flag.id,
          status,
          ...(status === "resolved" && notes[flag.id]?.trim() ? { note: notes[flag.id].trim() } : {})
        })
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const payload = (await response.json()) as { flag?: ContentSafetyFlag };
      if (!payload.flag) throw new Error("Malformed response");
      setFlags((current) => {
        const next = current.map((item) => (item.id === payload.flag!.id ? payload.flag! : item));
        setCounts(recomputeCounts(next));
        return next;
      });
    } catch {
      setError(t({
        en: "Could not update this alert. Please try again.",
        zh: "無法更新此警示，請再試一次。", zhHans: "无法更新此警示，请再试一次。"
      }));
    } finally {
      setPendingId(null);
    }
  }

  const filterTabs: { key: StatusFilter; label: LocalizedText; count: number }[] = [
    { key: "all", label: { en: "All", zh: "全部", zhHans: "全部" }, count: counts.total },
    { key: "new", label: statusLabels.new, count: counts.new },
    { key: "acknowledged", label: statusLabels.acknowledged, count: counts.acknowledged },
    { key: "resolved", label: statusLabels.resolved, count: counts.resolved }
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-200" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M12 3 5 6v5.5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z" />
              <path d="M12 8.5v4" />
              <path d="M12 15.5h.01" />
            </svg>
          </span>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
            {t({ en: "Safety alerts", zh: "安全警示", zhHans: "安全警示" })}
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-300">
          {t({
            en: "When a student writes something concerning to the AI tutor — self-harm, a crisis, abuse, or a threat — or the tutor reaches unsafe content, it is flagged here for you. Follow your school's safeguarding process; this is a support tool, not a disciplinary one.",
            zh: "當學生向 AI 導師寫下令人擔憂的內容——自我傷害、危機、受虐或威脅——或導師觸及不安全內容時，會在此標記給你。請依學校的保護程序處理；這是支援工具，而非懲處工具。", zhHans: "当学生向 AI 导师写下令人担忧的内容——自我伤害、危机、受虐或威胁——或导师触及不安全内容时，会在此标记给你。请依学校的保护程序处理；这是支援工具，而非惩处工具。"
          })}
        </p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: { en: "Open", zh: "待處理", zhHans: "待处理" }, value: counts.open, tone: "text-rose-700 dark:text-rose-200" },
          { label: statusLabels.new, value: counts.new, tone: "text-slate-900 dark:text-white" },
          { label: statusLabels.acknowledged, value: counts.acknowledged, tone: "text-slate-900 dark:text-white" },
          { label: statusLabels.resolved, value: counts.resolved, tone: "text-emerald-700 dark:text-emerald-200" }
        ].map((tile) => (
          <div key={tile.label.en} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t(tile.label)}</p>
            <p className={`mt-1 text-3xl font-black leading-none ${tile.tone}`}>{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            aria-pressed={filter === tab.key}
            className={`focus-ring rounded-full px-4 py-1.5 text-sm font-bold transition ${
              filter === tab.key
                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                : "bg-slate-950/[0.05] text-slate-600 hover:bg-slate-950/[0.09] dark:bg-white/[0.06] dark:text-slate-300"
            }`}
          >
            {t(tab.label)} <span className="opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-800 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      {visibleFlags.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-6 py-14 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <p className="text-lg font-black text-slate-900 dark:text-white">
            {filter === "all"
              ? t({ en: "No safety alerts", zh: "沒有安全警示", zhHans: "没有安全警示" })
              : t({ en: "Nothing here", zh: "此分類沒有項目", zhHans: "此分类没有项目" })}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {t({
              en: "You'll see an alert here if a student's AI tutor conversation raises a safety concern.",
              zh: "若學生的 AI 導師對話出現安全疑慮，警示會顯示在此。", zhHans: "若学生的 AI 导师对话出现安全疑虑，警示会显示在此。"
            })}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {visibleFlags.map((flag) => {
            const busy = pendingId === flag.id;
            return (
              <li
                key={flag.id}
                className={`rounded-3xl border bg-white/80 p-5 shadow-sm dark:bg-white/[0.03] ${cardAccent(flag)} ${flag.status === "resolved" ? "opacity-80" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${severityClasses(flag.severity)}`}>
                    {t(severityLabels[flag.severity])}
                  </span>
                  <span className="rounded-full bg-slate-950/[0.06] px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-white/[0.08] dark:text-slate-200">
                    {t(categoryLabels[flag.category])}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    flag.status === "resolved"
                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-100"
                      : flag.status === "acknowledged"
                        ? "bg-sky-500/15 text-sky-800 dark:text-sky-100"
                        : "bg-rose-500/15 text-rose-800 dark:text-rose-100"
                  }`}>
                    {t(statusLabels[flag.status])}
                  </span>
                  <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">{formatWhen(flag.createdAt)}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-base font-black text-slate-950 dark:text-white">{flag.studentName}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t(sourceLabels[flag.source])}</p>
                </div>

                <blockquote className="mt-2 rounded-2xl border-l-4 border-slate-300 bg-slate-950/[0.03] px-4 py-3 text-sm font-medium italic text-slate-700 dark:border-white/20 dark:bg-white/[0.04] dark:text-slate-200">
                  “{flag.excerpt || t({ en: "(no excerpt captured)", zh: "（未擷取內容）", zhHans: "（未撷取内容）" })}”
                </blockquote>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {flag.blockedReply ? (
                    <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-200">
                      {t({ en: "Tutor answer was withheld; a support message was shown instead", zh: "已暫停導師作答，改為顯示支援訊息", zhHans: "已暂停导师作答，改为显示支援讯息" })}
                    </span>
                  ) : null}
                  {flag.page ? <span>{t({ en: "Page", zh: "頁面", zhHans: "页面" })}: {flag.page}</span> : null}
                </div>

                {flag.status === "resolved" ? (
                  <div className="mt-3 rounded-2xl bg-emerald-500/[0.08] px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-100">
                    {t({ en: "Resolved by", zh: "處理者", zhHans: "处理者" })} {flag.resolvedByName ?? t({ en: "an educator", zh: "教育者", zhHans: "教育者" })}
                    {flag.resolvedAt ? ` · ${formatWhen(flag.resolvedAt)}` : ""}
                    {flag.resolutionNote ? (
                      <span className="mt-1 block font-medium not-italic text-emerald-900/90 dark:text-emerald-50">“{flag.resolutionNote}”</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4">
                    {flag.status === "acknowledged" && flag.acknowledgedByName ? (
                      <p className="mb-2 text-xs font-semibold text-sky-700 dark:text-sky-200">
                        {t({ en: "Acknowledged by", zh: "已知悉：", zhHans: "已知悉：" })} {flag.acknowledgedByName}
                      </p>
                    ) : null}
                    <textarea
                      value={notes[flag.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [flag.id]: event.target.value }))}
                      placeholder={t({ en: "Add a follow-up note (optional) — recorded when you resolve", zh: "加入跟進備註（選填）——處理時一併記錄", zhHans: "加入跟进备注（选填）——处理时一并记录" })}
                      rows={2}
                      className="focus-ring w-full resize-none rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {flag.status === "new" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateFlag(flag, "acknowledged")}
                          className="focus-ring rounded-full bg-sky-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-sky-500 disabled:opacity-60"
                        >
                          {t({ en: "Acknowledge", zh: "標記知悉", zhHans: "标记知悉" })}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateFlag(flag, "resolved")}
                        className="focus-ring rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {t({ en: "Mark resolved", zh: "標記已處理", zhHans: "标记已处理" })}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
