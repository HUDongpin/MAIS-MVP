"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { localeForLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LocalizedText, RewardCampaignStatus, TeacherGamificationData } from "@/types";

const campaignStatusLabels: Record<RewardCampaignStatus, LocalizedText> = {
  draft: { en: "Draft", zh: "草稿", zhHans: "草稿" },
  active: { en: "Active", zh: "進行中", zhHans: "进行中" },
  paused: { en: "Paused", zh: "已暫停", zhHans: "已暂停" },
  ended: { en: "Ended", zh: "已結束", zhHans: "已结束" }
};

function readGamification(value: unknown) {
  const response = value as { gamification?: unknown } | null;
  return (response?.gamification ?? null) as TeacherGamificationData | null;
}

export function TeacherGamificationPanel() {
  const { language, t, text } = useSettings();
  const [data, setData] = useState<TeacherGamificationData | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const numberFormat = useMemo(() => new Intl.NumberFormat(localeForLanguage(language)), [language]);
  const loadErrorCopy = t({ en: "Could not load campaigns yet.", zh: "暫時無法載入活動。" });
  const defaultCampaignTitle = t({ en: "Steady learning sprint", zh: "穩定學習衝刺", zhHans: "稳定学习冲刺" });
  const defaultCampaignDescription = t({
    en: "Reward careful practice, lesson progress, and mistake repair.",
    zh: "獎勵細心練習、課堂進度與錯題修正。",
    zhHans: "奖励细心练习、课堂进度与错题修正。"
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadGamification() {
      const query = selectedClassId ? `?classId=${encodeURIComponent(selectedClassId)}` : "";
      const response = await fetch(`/api/teacher/gamification${query}`, { cache: "no-store", signal: controller.signal });
      const nextData = readGamification(await response.json().catch(() => null));
      if (response.ok && nextData) {
        setData(nextData);
        if (!selectedClassId && nextData.selectedClassId) setSelectedClassId(nextData.selectedClassId);
      }
    }

    loadGamification().catch(() => {
      if (!controller.signal.aborted) setMessage(loadErrorCopy);
    });

    return () => controller.abort();
  }, [selectedClassId, loadErrorCopy]);

  const createCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClassId) return;

    // React clears event.currentTarget once the synchronous phase of the
    // handler returns, so keep the element to reset it after the await.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setIsBusy(true);
    setMessage("");
    const response = await fetch("/api/teacher/gamification/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: selectedClassId,
        titleEn: form.get("title"),
        titleZh: form.get("title"),
        descriptionEn: form.get("description"),
        descriptionZh: form.get("description"),
        budgetPoints: Number(form.get("budgetPoints")),
        questIds: ["daily-correct-answers", "daily-lesson-step", "daily-repair"]
      })
    });
    const nextData = readGamification(await response.json().catch(() => null));
    setIsBusy(false);
    if (!response.ok || !nextData) {
      setMessage(t({ en: "Could not create the campaign.", zh: "暫時未能建立活動。" }));
      return;
    }
    setData(nextData);
    formElement.reset();
    setMessage(t({ en: "Campaign created.", zh: "已建立活動。" }));
  };

  const updateCampaign = async (campaignId: string, status: RewardCampaignStatus) => {
    setIsBusy(true);
    setMessage("");
    const response = await fetch(`/api/teacher/gamification/campaigns/${encodeURIComponent(campaignId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const nextData = readGamification(await response.json().catch(() => null));
    setIsBusy(false);
    if (!response.ok || !nextData) {
      setMessage(t({ en: "Could not update the campaign.", zh: "暫時未能更新活動。" }));
      return;
    }
    setData(nextData);
    setMessage(t({ en: "Campaign updated.", zh: "已更新活動。" }));
  };

  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{t({ en: "Rewards and campaigns", zh: "獎勵活動" })}</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Gamification core", zh: "核心遊戲化" })}</h2>
            </div>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="focus-ring h-11 min-w-56 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]"
            >
              {(data?.classes ?? []).map((teacherClass) => (
                <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              { label: t({ en: "Weekly XP", zh: "本週 XP" }), value: data?.totals.weeklyXp ?? 0 },
              { label: t({ en: "Weekly points", zh: "本週積分" }), value: data?.totals.weeklyRewardPoints ?? 0 },
              { label: t({ en: "Active campaigns", zh: "進行中活動" }), value: data?.totals.activeCampaigns ?? 0 },
              { label: t({ en: "Flagged", zh: "異常提示" }), value: data?.totals.flaggedEvents ?? 0 }
            ].map((item) => (
              <div key={item.label} className="soft-panel p-3">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-black gradient-text">{numberFormat.format(item.value)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="soft-panel p-4">
              <h3 className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Weekly class leaderboard", zh: "本週班級排行榜" })}</h3>
              <div className="mt-3 grid gap-2">
                {(data?.leaderboard ?? []).slice(0, 8).map((entry) => (
                  <div key={entry.studentId} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-2xl bg-white/50 px-2.5 py-2 text-[13px] sm:text-sm dark:bg-white/[0.04]">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="shrink-0 font-black text-cyan-700 dark:text-cyan-200">#{entry.rank}</span>
                      <span className="min-w-0 break-words font-black text-slate-700 dark:text-slate-200">{entry.studentName}</span>
                    </span>
                    <span className="shrink-0 font-black text-slate-500 dark:text-slate-400">{numberFormat.format(entry.weeklyXp)} XP</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="soft-panel p-4">
              <h3 className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Campaigns", zh: "活動" })}</h3>
              <div className="mt-3 grid gap-3">
                {(data?.campaigns ?? []).slice(0, 4).map((campaign) => (
                  <div key={campaign.id} className="rounded-2xl border border-slate-200/70 bg-white/50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950 dark:text-white">{text(campaign.title)}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {numberFormat.format(campaign.awardedPoints)}/{numberFormat.format(campaign.budgetPoints)} {t({ en: "points", zh: "積分" })}
                        </p>
                      </div>
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-black",
                        campaign.status === "active" ? "bg-emerald-400/15 text-emerald-800 dark:text-emerald-100" : "bg-slate-950/[0.06] text-slate-600 dark:bg-white/[0.08] dark:text-slate-300"
                      )}>
                        {text(campaignStatusLabels[campaign.status])}
                      </span>
                    </div>
                    {campaign.status === "active" ? (
                      <div className="mt-3 flex gap-2">
                        <button type="button" disabled={isBusy} onClick={() => updateCampaign(campaign.id, "paused")} className="focus-ring rounded-full border border-slate-200/80 px-3 py-1.5 text-xs font-black disabled:opacity-50 dark:border-white/10">
                          {t({ en: "Pause", zh: "暫停" })}
                        </button>
                        <button type="button" disabled={isBusy} onClick={() => updateCampaign(campaign.id, "ended")} className="focus-ring rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
                          {t({ en: "End", zh: "結束" })}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {data?.antiAbuseAlerts.length ? (
            <div className="mt-5 rounded-2xl border border-amber-300/60 bg-amber-400/10 p-4">
              <h3 className="text-sm font-black text-amber-900 dark:text-amber-100">{t({ en: "Anti-abuse signals", zh: "防刷提示" })}</h3>
              <div className="mt-2 grid gap-2 text-sm font-bold text-amber-800 dark:text-amber-100">
                {data.antiAbuseAlerts.map((alert) => <p key={text(alert)}>{text(alert)}</p>)}
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={createCampaign} className="soft-panel p-4">
          <h3 className="text-base font-black text-slate-950 dark:text-white">{t({ en: "Create campaign", zh: "建立活動" })}</h3>
          <label className="mt-4 grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Title", zh: "標題" })}</span>
            <input key={`campaign-title-${language}`} name="title" defaultValue={defaultCampaignTitle} className="focus-ring h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="mt-4 grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Budget", zh: "預算" })}</span>
            <input name="budgetPoints" type="number" min={100} max={20000} defaultValue={900} className="focus-ring h-11 rounded-2xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="mt-4 grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Description", zh: "描述" })}</span>
            <textarea key={`campaign-description-${language}`} name="description" rows={3} defaultValue={defaultCampaignDescription} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <button type="submit" disabled={isBusy || !selectedClassId} className="focus-ring mt-4 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
            {isBusy ? t({ en: "Saving", zh: "儲存中" }) : t({ en: "Create campaign", zh: "建立活動" })}
          </button>
          {message ? <p className="mt-3 text-sm font-bold text-emerald-700 dark:text-emerald-200">{message}</p> : null}
          <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {data
              ? t({
                  en: `Economy ${data.economy.version}: ${data.economy.expectedWeeklyRewardPoints.min}-${data.economy.expectedWeeklyRewardPoints.max} points per steady week.`,
                  zh: `經濟版本 ${data.economy.version}：穩定學習每週約 ${data.economy.expectedWeeklyRewardPoints.min}-${data.economy.expectedWeeklyRewardPoints.max} 積分。`
                })
              : t({ en: "Economy data loading.", zh: "正在載入積分經濟資料。" })}
          </p>
        </form>
      </div>
    </section>
  );
}
