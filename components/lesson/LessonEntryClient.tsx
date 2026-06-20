"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatGradeLabel } from "@/lib/i18n";
import { studentLessonsPath } from "@/lib/lessonLinks";
import { studentRoadmapPath } from "@/lib/roadmapRoutes";
import type { LessonEntryTarget } from "@/types";

type LessonEntryResponse = {
  lessonEntryTarget?: LessonEntryTarget | null;
};

type LessonEntryState = "idle" | "loading" | "error";

function readCurrentPath() {
  if (typeof window === "undefined") return studentLessonsPath;
  return `${window.location.pathname}${window.location.search}`;
}

export function LessonEntryClient() {
  const router = useRouter();
  const { currentUser, language, selectedGrade, settingsReady, studentLessonHref, t } = useSettings();
  const [entryState, setEntryState] = useState<LessonEntryState>("idle");
  const entryGrade = selectedGrade;
  const selectedGradeLabel = formatGradeLabel(entryGrade, language, true);

  useEffect(() => {
    if (!settingsReady) return;

    let cancelled = false;
    const controller = new AbortController();

    async function openSelectedGradeLesson() {
      setEntryState("loading");

      try {
        const canUseAuthenticatedLessonEntry = currentUser?.role === "student" || currentUser?.role === "teacher" || currentUser?.role === "admin";

        if (!canUseAuthenticatedLessonEntry) {
          if (!cancelled) {
            router.replace(`/login?next=${encodeURIComponent(readCurrentPath())}`);
          }
          return;
        }

        if (currentUser?.role === "student" && studentLessonHref) {
          if (!cancelled) {
            router.replace(studentLessonHref);
          }
          return;
        }

        const response = await fetch(`/api/lesson-entry?grade=${encodeURIComponent(entryGrade)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const body = (await response.json()) as LessonEntryResponse;
        const targetHref = body.lessonEntryTarget?.href ?? null;

        if (!response.ok || !targetHref) {
          throw new Error("Could not find a lesson for the selected grade.");
        }

        if (!cancelled) {
          router.replace(targetHref);
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setEntryState("error");
        }
      }
    }

    void openSelectedGradeLesson();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentUser?.role, entryGrade, router, settingsReady, studentLessonHref]);

  const isError = entryState === "error";

  if (!isError) {
    return (
      <div className="page-container py-10 sm:py-12">
        <SectionHeader
          eyebrow={selectedGradeLabel}
          title={t({ en: "Opening your selected lesson", zh: "正在開啟所選年級課節", zhHans: "正在开启所选年级课时" })}
          description={t({
            en: `Finding a ${selectedGradeLabel} lesson that fits your current browsing choice.`,
            zh: `正在根據你目前選擇的 ${selectedGradeLabel} 尋找合適課節。`,
            zhHans: `正在根据你目前选择的 ${selectedGradeLabel} 寻找合适课时。`
          })}
        />
      </div>
    );
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <SectionHeader
        eyebrow={selectedGradeLabel}
        title={t(isError ? { en: "Lesson could not be opened", zh: "暫時未能開啟課節" } : { en: "Opening your selected lesson", zh: "正在開啟所選年級課節" })}
        description={t(
          isError
            ? {
                en: "We could not find a lesson for the selected grade. Open Learning Path to choose one manually.",
                zh: "暫時找不到所選年級的課節。請到學習路徑手動選擇。"
              }
            : {
                en: `Finding a ${selectedGradeLabel} lesson that fits your current browsing choice.`,
                zh: `正在根據你目前選擇的 ${selectedGradeLabel} 尋找合適課節。`
              }
        )}
        action={
          isError ? (
            <Link href={studentRoadmapPath} className="focus-ring rounded-full bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950">
              {t(dictionary.lesson.backToRoadmap)}
            </Link>
          ) : null
        }
      />
    </div>
  );
}
