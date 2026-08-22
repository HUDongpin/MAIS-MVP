"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MathText } from "@/components/math/MathText";
import { californiaCourseTitleForGrade, cleanLessonDisplayTitle, cleanLessonUnitTitle } from "@/components/lesson/lessonContentText";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel } from "@/lib/i18n";
import { lessonHrefForSlug } from "@/lib/lessonLinks";
import type { LessonDetail, LessonSummary } from "@/types";

export type LessonGalaxyItemKind =
  | "concept"
  | "worked-example"
  | "practice"
  | "extension"
  | "teacher-guide";

export type LessonGalaxyItem = {
  description: string;
  id: string;
  kind: LessonGalaxyItemKind;
  subtitle: string;
  targetId: string;
  title: string;
};

type LessonGalaxyDirectoryProps = {
  currentSlug: string;
  items: LessonGalaxyItem[];
  lesson: LessonDetail;
  modules: LessonSummary[];
};

function compactModuleTitle(title: string) {
  return cleanLessonUnitTitle(title);
}

function formatLessonPartTitle({
  itemIndex,
  title,
  unitIndex
}: {
  itemIndex: number;
  title: string;
  unitIndex: number;
}) {
  return `${unitIndex + 1}.${itemIndex + 1} ${title}`;
}

function modulePreviewItems({
  description,
  module,
  t
}: {
  description: string;
  module: LessonSummary;
  t: ReturnType<typeof useSettings>["t"];
}): LessonGalaxyItem[] {
  return [
    {
      description,
      id: `${module.slug}-preview-concept`,
      kind: "concept",
      subtitle: t({ en: "Concept reading", zh: "概念閱讀", zhHans: "概念阅读" }),
      targetId: "",
      title: t({ en: "Concept explanation", zh: "概念說明", zhHans: "概念说明" })
    },
    {
      description: "",
      id: `${module.slug}-preview-example`,
      kind: "worked-example",
      subtitle: t({ en: "Guided example", zh: "引導例題", zhHans: "引导例题" }),
      targetId: "",
      title: t({ en: "Worked example", zh: "例題", zhHans: "例题" })
    },
    {
      description: "",
      id: `${module.slug}-preview-practice`,
      kind: "practice",
      subtitle: t({ en: "Lesson practice", zh: "課節練習", zhHans: "课时练习" }),
      targetId: "",
      title: t({ en: "Practice check", zh: "練習檢查", zhHans: "练习检查" })
    }
  ];
}

const californiaK5LessonBetaGrades = new Set(["K", "P1", "P2", "P3", "P4", "P5"]);

export function LessonGalaxyDirectory({ currentSlug, items, lesson, modules }: LessonGalaxyDirectoryProps) {
  const { language, t, text } = useSettings();
  const visibleModules = modules.length ? modules : [lesson];
  const activeModuleIndex = Math.max(0, visibleModules.findIndex((module) => module.slug === currentSlug || module.slug === lesson.slug));
  const activeModule = visibleModules[activeModuleIndex] ?? lesson;
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(activeModuleIndex);
  const completedModuleCount = visibleModules.filter((module) => module.status === "completed").length;
  const isCaliforniaCourse =
    activeModule.publisher === "US_CA_MATH" ||
    activeModule.curriculumProfile?.publisher === "US_CA_MATH" ||
    lesson.publisher === "US_CA_MATH" ||
    lesson.curriculumProfile?.publisher === "US_CA_MATH";
  const californiaCourseTitle = isCaliforniaCourse ? californiaCourseTitleForGrade(activeModule.grade) : null;
  const courseTitle = californiaCourseTitle ? t(californiaCourseTitle) : cleanLessonDisplayTitle(text(lesson.topic.title));
  const isCaliforniaK5LessonBeta = isCaliforniaCourse && californiaK5LessonBetaGrades.has(activeModule.grade);
  const gradeLabel = formatGradeLabel(activeModule.grade, language, true);
  const courseLabel = isCaliforniaK5LessonBeta
    ? t({
        en: `${gradeLabel} Mathematics beta`,
        zh: `${gradeLabel}數學 beta`,
        zhHans: `${gradeLabel}数学 beta`
      })
    : t({
        en: `${gradeLabel} Mathematics`,
        zh: `${gradeLabel}數學`,
        zhHans: `${gradeLabel}数学`
      });
  const routeSummary = t({
    en: `${visibleModules.length} units / ${completedModuleCount} completed`,
    zh: `${visibleModules.length} 個單元 / 已完成 ${completedModuleCount} 個`,
    zhHans: `${visibleModules.length} 个单元 / 已完成 ${completedModuleCount} 个`
  });

  useEffect(() => {
    setSelectedModuleIndex(activeModuleIndex);
  }, [activeModuleIndex]);

  function scrollToLessonItem(targetId: string) {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <aside
      className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-950/10 dark:border-white/10 dark:bg-slate-950/80 lg:rounded-l-none lg:border-l-0"
      aria-label={t({ en: "Course unit directory", zh: "課程單元目錄", zhHans: "课程单元目录" })}
    >
      <div className="border-b border-slate-200/80 p-5 dark:border-white/10 sm:p-6">
        <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100">
          {courseLabel}
        </span>
        <MathText
          as="h2"
          text={courseTitle}
          className="mt-4 text-3xl font-black leading-tight text-slate-950 dark:text-white"
        />
        <p className="mt-3 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
          {routeSummary}
        </p>
      </div>

      <div className="divide-y divide-slate-200/80 dark:divide-white/10">
        {visibleModules.map((module, index) => {
          const isSelected = index === selectedModuleIndex;
          const isCurrent = module.slug === currentSlug || module.slug === lesson.slug;
          const moduleTitle = compactModuleTitle(text(module.title));
          const moduleDescription = text(module.description);
          const moduleHref = lessonHrefForSlug(module.slug);
          const moduleItems = isCurrent && items.length
            ? items.slice(0, 8)
            : modulePreviewItems({
              description: moduleDescription,
              module,
              t
            });

          return (
            <div key={module.slug} className={isSelected ? "bg-cyan-50/45 dark:bg-cyan-300/5" : "bg-white/60 dark:bg-transparent"}>
              <button
                type="button"
                aria-current={isCurrent ? "page" : undefined}
                aria-expanded={isSelected}
                onClick={() => setSelectedModuleIndex((currentIndex) => (currentIndex === index ? null : index))}
                className="focus-ring grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-4 px-5 py-5 text-left transition hover:bg-cyan-50/70 dark:hover:bg-cyan-300/5 sm:px-6"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-cyan-700 dark:text-cyan-200">
                    {t({ en: `Unit ${index + 1}`, zh: `Unit ${index + 1}`, zhHans: `Unit ${index + 1}` })}
                  </span>
                  <MathText
                    as="span"
                    text={moduleTitle}
                    className="mt-2 block text-2xl font-black leading-tight text-slate-950 dark:text-white"
                  />
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-2 inline-flex h-9 w-9 items-center justify-center text-2xl font-black text-slate-600 transition dark:text-slate-200 ${
                    isSelected ? "rotate-180 text-slate-700 dark:text-slate-100" : ""
                  }`}
                >
                  ⌄
                </span>
              </button>

              {isSelected ? (
                <div className="px-4 pb-5 sm:px-5">
                  <div className="grid gap-2">
                    {moduleItems.map((item, itemIndex) => {
                      const numberedItemTitle = formatLessonPartTitle({
                        itemIndex,
                        title: item.title,
                        unitIndex: index
                      });

                      return isCurrent && item.targetId ? (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => scrollToLessonItem(item.targetId)}
                          className="focus-ring rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.045] dark:hover:bg-cyan-300/10"
                        >
                          <MathText as="span" text={numberedItemTitle} className="block line-clamp-2 text-sm font-black leading-5 text-slate-900 dark:text-white" />
                        </button>
                      ) : (
                        <Link
                          key={item.id}
                          href={moduleHref}
                          aria-label={t({
                            en: `Open ${moduleTitle}: ${numberedItemTitle}`,
                            zh: `開啟 ${moduleTitle}: ${numberedItemTitle}`,
                            zhHans: `开启 ${moduleTitle}: ${numberedItemTitle}`
                          })}
                          className="focus-ring rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/[0.045] dark:hover:bg-cyan-300/10"
                        >
                          <MathText as="span" text={numberedItemTitle} className="block line-clamp-2 text-sm font-black leading-5 text-slate-900 dark:text-white" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
