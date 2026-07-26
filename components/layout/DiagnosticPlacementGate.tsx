"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { ccssGradeBandForGradeId } from "@/data/ccssStandards";
import type { PlacementProbe, PlacementResponse } from "@/lib/diagnosticPlacement";
import type { LocalizedText } from "@/types";

const placementPathnames = new Set(["/dashboard"]);

const copy = {
  badge: { en: "30-second check", zh: "30 秒定位", zhHans: "30 秒定位" },
  title: {
    en: "Quick check so your map starts accurate",
    zh: "快速定位，讓你的星圖一開始就準確",
    zhHans: "快速定位，让你的星图一开始就准确"
  },
  description: {
    en: "Tap how you feel about each skill. No scoring — it just seeds your knowledge map so day one is personalized.",
    zh: "點一下你對每個技能的感覺。不計分，只用來初始化你的知識星圖，讓第一天就個人化。",
    zhHans: "点一下你对每个技能的感觉。不计分，只用来初始化你的知识星图，让第一天就个性化。"
  },
  prompt: { en: "How comfortable are you with", zh: "你對以下技能有多熟悉", zhHans: "你对以下技能有多熟悉" },
  gotIt: { en: "I've got this", zh: "我會了", zhHans: "我会了" },
  notYet: { en: "Not yet", zh: "還不會", zhHans: "还不会" },
  skip: { en: "Skip the check", zh: "跳過定位", zhHans: "跳过定位" },
  close: { en: "Close placement check", zh: "關閉定位", zhHans: "关闭定位" },
  saving: { en: "Setting up your map…", zh: "正在建立你的星圖…", zhHans: "正在建立你的星图…" }
} satisfies Record<string, LocalizedText>;

type BlueprintResponse = {
  needsPlacement?: boolean;
  probes?: PlacementProbe[];
  grade?: string;
};

export function DiagnosticPlacementGate() {
  const pathname = usePathname();
  const { currentUser, settingsReady, t, text } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [probes, setProbes] = useState<PlacementProbe[]>([]);
  const [grade, setGrade] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<PlacementResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dismissedForSession, setDismissedForSession] = useState(false);

  // Placement owns CA students below the high-school band; the CA-HS band is served by the
  // separate 15-second learner start-setup gate.
  const isCaliforniaNonHighSchoolStudent = Boolean(
    currentUser?.role === "student" &&
    currentUser.curriculumTrack === "US_CA_MATH" &&
    ccssGradeBandForGradeId[currentUser.grade] !== "HS"
  );
  const shouldConsider = Boolean(
    settingsReady &&
    isCaliforniaNonHighSchoolStudent &&
    !currentUser?.passwordMustChange &&
    placementPathnames.has(pathname)
  );

  const currentUserId = currentUser?.id;

  useEffect(() => {
    setDismissedForSession(false);
  }, [currentUserId]);

  useEffect(() => {
    if (!shouldConsider || !currentUserId || dismissedForSession) {
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    fetch("/api/adaptive-learning/placement", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Placement request failed: ${response.status}`);
        return (await response.json()) as BlueprintResponse;
      })
      .then((body) => {
        if (body.needsPlacement === true && Array.isArray(body.probes) && body.probes.length > 0) {
          setProbes(body.probes);
          setGrade(typeof body.grade === "string" ? body.grade : null);
          setIndex(0);
          setResponses([]);
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.warn("Diagnostic placement gate is unavailable.", error);
        setIsOpen(false);
      });

    return () => controller.abort();
  }, [currentUserId, dismissedForSession, shouldConsider]);

  const submit = useCallback(
    async (finalResponses: PlacementResponse[], reloadOnDone: boolean) => {
      setDismissedForSession(true);
      setSubmitting(true);
      try {
        const response = await fetch("/api/adaptive-learning/placement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade, responses: finalResponses })
        });
        if (!response.ok) throw new Error(`Placement save failed: ${response.status}`);
        setIsOpen(false);
        if (reloadOnDone && typeof window !== "undefined") window.location.reload();
      } catch (error) {
        console.warn("Diagnostic placement save failed.", error);
        setIsOpen(false);
      } finally {
        setSubmitting(false);
      }
    },
    [grade]
  );

  const answer = useCallback(
    (correct: boolean) => {
      const probe = probes[index];
      if (!probe) return;
      const nextResponses = [...responses, { skillId: probe.skillId, correct }];
      setResponses(nextResponses);
      if (index + 1 >= probes.length) {
        void submit(nextResponses, true);
      } else {
        setIndex(index + 1);
      }
    },
    [index, probes, responses, submit]
  );

  const skip = useCallback(() => {
    // Empty responses still seed grade-level priors, so the map is informed rather than flat.
    void submit([], false);
  }, [submit]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") skip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, skip]);

  const probe = useMemo(() => probes[index] ?? null, [index, probes]);

  if (!isOpen || !shouldConsider || !currentUserId || !probe) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-slate-950/[0.76] px-4 py-8 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="placement-title"
        aria-describedby="placement-description"
        className="relative w-full max-w-lg rounded-3xl border border-white/80 bg-white/[0.97] px-6 py-7 shadow-[0_28px_90px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-slate-900/[0.97] sm:px-9"
      >
        <button
          type="button"
          onClick={skip}
          disabled={submitting}
          aria-label={t(copy.close)}
          className="focus-ring absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-50 text-2xl font-light leading-none text-slate-500 transition hover:text-slate-900 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
        >
          ×
        </button>

        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3.5 py-1.5 text-xs font-black uppercase text-cyan-700 dark:border-cyan-300/30 dark:bg-cyan-300/10 dark:text-cyan-200">
            <span aria-hidden="true">✦</span>
            {t(copy.badge)}
          </span>
          <h2 id="placement-title" className="mx-auto mt-3 max-w-sm text-2xl font-black leading-tight text-slate-950 dark:text-white">
            {t(copy.title)}
          </h2>
          <p id="placement-description" className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500 dark:text-slate-300">
            {t(copy.description)}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-6 text-center dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            {index + 1} / {probes.length}
          </p>
          <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-300">{t(copy.prompt)}</p>
          <p className="mt-1 text-lg font-black leading-tight text-slate-950 dark:text-white">{text(probe.title)}</p>
          {probe.ccssClusterId ? (
            <span className="mt-2 inline-block rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[0.7rem] font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {probe.ccssClusterId}
            </span>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => answer(false)}
              disabled={submitting}
              className="focus-ring min-h-14 rounded-xl border border-slate-200 bg-white px-4 text-base font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-amber-300 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              {t(copy.notYet)}
            </button>
            <button
              type="button"
              onClick={() => answer(true)}
              disabled={submitting}
              className="focus-ring min-h-14 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 px-4 text-base font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {t(copy.gotIt)}
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <button
            type="button"
            onClick={skip}
            disabled={submitting}
            className="focus-ring rounded-lg px-4 py-2 text-sm font-black text-slate-500 transition hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:text-white"
          >
            {submitting ? t(copy.saving) : t(copy.skip)}
          </button>
        </div>
      </section>
    </div>
  );
}
