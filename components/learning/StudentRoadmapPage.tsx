"use client";

import Link from "next/link";
import { LearningPathBackToTopButton } from "@/components/learning/LearningPathBackToTopButton";
import { LearningRoadmap } from "@/components/learning/LearningRoadmap";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { isMainlandHjbRoadmapProfile } from "@/data/mainlandHjbRoadmapPresentation";
import { isMainlandPepRoadmapProfile } from "@/data/mainlandPepRoadmapPresentation";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatGradeLabel, formatLearnerName } from "@/lib/i18n";
import { studentPrimaryRoadmapPath, studentSecondaryRoadmapPath } from "@/lib/roadmapRoutes";

export function StudentRoadmapPage() {
  const { currentUser, language, selectedGrade, text, t } = useSettings();
  const activeRoadmapGrade = selectedGrade;
  const activeGradeLabel = formatGradeLabel(activeRoadmapGrade, language, true);
  const learnerName = currentUser ? formatLearnerName(currentUser.name, language) : "";
  const isMainlandPepRoadmap = isMainlandPepRoadmapProfile(currentUser?.curriculumProfile);
  const isMainlandHjbRoadmap = isMainlandHjbRoadmapProfile(currentUser?.curriculumProfile);
  let title = t(dictionary.pages.learningPathTitle);
  let description = t(dictionary.pages.learningPathDesc);
  let eyebrow = t(dictionary.pages.learningPathEyebrow);

  if (currentUser && isMainlandHjbRoadmap) {
    title = text({ en: `${activeGradeLabel} HJB Learning Path`, zh: `${activeGradeLabel} 滬教版學習路徑`, zhHans: `${activeGradeLabel} 沪教版学习路径` });
    description = text({
      en: `${learnerName}'s current-grade Shanghai Education Press path highlights the next lesson, progress, and the few topics that matter now.`,
      zh: `${learnerName}目前年級的滬教版路徑會優先顯示下一課、學習進度和當前最重要的幾個主題。`,
      zhHans: `${learnerName}当前年级的沪教版路径会优先显示下一课、学习进度和当前最重要的几个主题。`
    });
    eyebrow = text({ en: "HJB daily learning path", zh: "滬教版每日學習路徑", zhHans: "沪教版每日学习路径" });
  } else if (currentUser && isMainlandPepRoadmap) {
    title = text({ en: `${activeGradeLabel} PEP Learning Path`, zh: `${activeGradeLabel} 人教版學習路徑`, zhHans: `${activeGradeLabel} 人教版学习路径` });
    description = text({
      en: `${learnerName}'s current-grade PEP path highlights the next lesson, progress, and the few topics that matter now.`,
      zh: `${learnerName}目前年級的人教版路徑會優先顯示下一課、學習進度和當前最重要的幾個主題。`,
      zhHans: `${learnerName}当前年级的人教版路径会优先显示下一课、学习进度和当前最重要的几个主题。`
    });
    eyebrow = text({ en: "PEP daily learning path", zh: "人教版每日學習路徑", zhHans: "人教版每日学习路径" });
  } else if (currentUser) {
    title = text({ en: `${activeGradeLabel} Learning Path`, zh: `${activeGradeLabel} 學習路徑`, zhHans: `${activeGradeLabel} 学习路径` });
    description = text({
      en: `${learnerName}'s current path keeps the next lesson, progress, and nearby topics in view.`,
      zh: `${learnerName}目前的路徑會集中顯示下一課、學習進度和附近主題。`,
      zhHans: `${learnerName}当前的路径会集中显示下一课、学习进度和附近主题。`
    });
    eyebrow = text({ en: `${activeGradeLabel} daily learning path`, zh: `${activeGradeLabel}每日學習路徑`, zhHans: `${activeGradeLabel}每日学习路径` });
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <SectionHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        action={(
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={studentPrimaryRoadmapPath}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isMainlandHjbRoadmap
                ? text({ en: "Open the HJB P1 to S6 Roadmap", zh: "打開滬教版小一至中六路線圖", zhHans: "打开沪教版P1至S6路线图" })
                : text({ en: "Open the P1 to P6 primary Subway map", zh: "打開小一至小六小學地鐵路線圖", zhHans: "打开小学一年级至六年级小学地铁路线图" })}
              className="focus-ring inline-flex justify-center rounded-full border border-slate-200/80 bg-white/80 px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]"
            >
              {isMainlandHjbRoadmap
                ? text({ en: "Full HJB Roadmap", zh: "完整滬教版路線", zhHans: "完整沪教版路线" })
                : text({ en: "Full Primary Map", zh: "完整小學地圖", zhHans: "完整小学地图" })}
            </Link>
            <Link
              href={studentSecondaryRoadmapPath}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isMainlandHjbRoadmap
                ? text({ en: "Open the HJB S1 to S6 secondary Roadmap", zh: "打開滬教版中一至中六中學路線圖", zhHans: "打开沪教版S1至S6中学路线图" })
                : text({ en: "Open the S1 to S6 secondary Subway map", zh: "打開中一至中六中學地鐵路線圖", zhHans: "打开初一至高三中学地铁路线图" })}
              className="focus-ring inline-flex justify-center rounded-full border border-slate-200/80 bg-white/80 px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]"
            >
              {isMainlandHjbRoadmap
                ? text({ en: "Secondary Overview", zh: "中學總覽", zhHans: "中学总览" })
                : text({ en: "Full Secondary Map", zh: "完整中學地圖", zhHans: "完整中学地图" })}
            </Link>
          </div>
        )}
      />
      <div data-tour="student-roadmap-path">
        <LearningRoadmap mode="student" />
      </div>
      <LearningPathBackToTopButton />
    </div>
  );
}
