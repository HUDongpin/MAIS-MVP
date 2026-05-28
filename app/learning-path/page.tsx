"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LearningPathBackToTopButton } from "@/components/learning/LearningPathBackToTopButton";
import { LearningRoadmap } from "@/components/learning/LearningRoadmap";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { isMainlandHjbRoadmapProfile } from "@/data/mainlandHjbRoadmapPresentation";
import { isMainlandPepRoadmapProfile } from "@/data/mainlandPepRoadmapPresentation";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatGradeLabel, formatLearnerName } from "@/lib/i18n";

export default function LearningPathPage() {
  const { currentUser, language, selectedGrade, text, t } = useSettings();
  const [mapView, setMapView] = useState<"primary" | null>(null);

  useEffect(() => {
    const syncMapView = () => {
      const requestedMap = new URLSearchParams(window.location.search).get("map");
      setMapView(requestedMap === "primary" ? "primary" : null);
    };

    syncMapView();
    window.addEventListener("popstate", syncMapView);
    return () => window.removeEventListener("popstate", syncMapView);
  }, []);

  const activeRoadmapGrade = selectedGrade;
  const activeGradeLabel = formatGradeLabel(activeRoadmapGrade, language, true);
  const learnerName = currentUser ? formatLearnerName(currentUser.name, language) : "";
  const isMainlandPepRoadmap = isMainlandPepRoadmapProfile(currentUser?.curriculumProfile);
  const isMainlandHjbRoadmap = isMainlandHjbRoadmapProfile(currentUser?.curriculumProfile);
  let title = t(dictionary.pages.learningPathTitle);
  let description = t(dictionary.pages.learningPathDesc);
  let eyebrow = t(dictionary.pages.learningPathEyebrow);

  if (currentUser && isMainlandHjbRoadmap) {
    title = text({ en: "HJB Mathematics P1-S6 Learning Path", zh: "滬教版數學小一至中六學習路徑", zhHans: "沪教版数学P1-S6学习路径" });
    description = text({
      en: `${learnerName}'s Shanghai Education Press roadmap covers primary, junior-secondary, and senior-secondary mathematics with textbook-unit routes, concept stations, Lesson entries, and approved practice checkpoints where available.`,
      zh: `${learnerName}的滬教版路線圖覆蓋小學、初中和高中數學，按教材單元、概念站點、課節入口和已審核練習檢查組織。`,
      zhHans: `${learnerName}的沪教版路线图覆盖小学、初中和高中数学，按教材单元、概念站点、课节入口和已审核练习检查组织。`
    });
    eyebrow = text({ en: "Mainland HJB personal roadmap", zh: "內地滬教版個人路線圖", zhHans: "内地沪教版个人路线图" });
  } else if (currentUser && isMainlandPepRoadmap) {
    title = text({ en: "PEP Mathematics P1-S6 Learning Path", zh: "人教版數學小一至中六學習路徑", zhHans: "人教版数学P1-S6学习路径" });
    description = text({
      en: `${learnerName}'s Mainland PEP roadmap covers primary, junior-secondary, and senior-secondary mathematics with textbook-unit routes, concept stations, and practice links.`,
      zh: `${learnerName}的人教版路線圖覆蓋小學、初中和高中數學，按教材單元、概念站點和練習入口組織。`,
      zhHans: `${learnerName}的人教版路线图覆盖小学、初中和高中数学，按教材单元、概念站点和练习入口组织。`
    });
    eyebrow = text({ en: "Mainland PEP personal roadmap", zh: "內地人教版個人路線圖", zhHans: "内地人教版个人路线图" });
  } else if (currentUser) {
    title = text({ en: `${activeGradeLabel} Learning Path`, zh: `${activeGradeLabel} 學習路徑`, zhHans: `${activeGradeLabel} 学习路径` });
    description = text({
      en: `Personal roadmap for ${learnerName}'s ${activeGradeLabel} mathematics topics.`,
      zh: `${learnerName}的${activeGradeLabel}數學個人學習路線。`,
      zhHans: `${learnerName}的${activeGradeLabel}数学个人学习路线。`
    });
    eyebrow = text({ en: `${activeGradeLabel} student roadmap`, zh: `${activeGradeLabel}學生路線圖`, zhHans: `${activeGradeLabel}学生路线图` });
  }

  if (mapView === "primary") {
    if (currentUser && isMainlandHjbRoadmap) {
      title = text({ en: "HJB P1-S6 Roadmap", zh: "滬教版小一至中六路線圖", zhHans: "沪教版P1-S6路线图" });
      description = text({
        en: "Full Shanghai Education Press primary and secondary routes, grouped by grade for readable exploration.",
        zh: "完整滬教版小學與中學路線，按年級分組，方便清晰瀏覽。",
        zhHans: "完整沪教版小学与中学路线，按年级分组，方便清晰浏览。"
      });
      eyebrow = text({ en: "HJB full network", zh: "滬教版完整網絡", zhHans: "沪教版完整网络" });
    } else {
      title = text({ en: "Primary Subway Map", zh: "小學地鐵圖", zhHans: "小学地铁图" });
      description = text({
        en: "Full P1-P6 transit-style math routes for the primary curriculum.",
        zh: "小一至小六完整交通風格數學路線圖。",
        zhHans: "小学一年级至六年级完整交通风格数学路线图。"
      });
      eyebrow = text({ en: "Primary network", zh: "小學網絡", zhHans: "小学网络" });
    }
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
              href="/primary-roadmap"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isMainlandHjbRoadmap
                ? text({ en: "Open the HJB P1 to S6 Roadmap", zh: "打開滬教版小一至中六路線圖", zhHans: "打开沪教版P1至S6路线图" })
                : text({ en: "Open the P1 to P6 primary Subway map", zh: "打開小一至小六小學地鐵路線圖", zhHans: "打开小学一年级至六年级小学地铁路线图" })}
              className="focus-ring inline-flex rounded-full border border-emerald-300/40 bg-emerald-400/15 px-5 py-3 text-sm font-black text-emerald-700 shadow-lg transition hover:-translate-y-1 hover:bg-emerald-400/25 dark:text-emerald-100"
            >
              {isMainlandHjbRoadmap
                ? text({ en: "Open HJB P1-S6 Roadmap", zh: "打開滬教版小一至中六路線", zhHans: "打开沪教版P1-S6路线" })
                : text({ en: "Open Primary Subway Map", zh: "打開小學地鐵圖", zhHans: "打开小学地铁图" })}
            </Link>
            <Link
              href="/secondary-roadmap"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isMainlandHjbRoadmap
                ? text({ en: "Open the HJB S1 to S6 secondary Roadmap", zh: "打開滬教版中一至中六中學路線圖", zhHans: "打开沪教版S1至S6中学路线图" })
                : text({ en: "Open the S1 to S6 secondary Subway map", zh: "打開中一至中六中學地鐵路線圖", zhHans: "打开初一至高三中学地铁路线图" })}
              className="focus-ring inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/15 px-5 py-3 text-sm font-black text-cyan-700 shadow-glow transition hover:-translate-y-1 hover:bg-cyan-400/25 dark:text-cyan-100"
            >
              {isMainlandHjbRoadmap
                ? text({ en: "Open HJB Secondary View", zh: "打開滬教版中學視圖", zhHans: "打开沪教版中学视图" })
                : text({ en: "Open Secondary Subway Map", zh: "打開中學地鐵圖", zhHans: "打开中学地铁图" })}
            </Link>
          </div>
        )}
      />
      <LearningRoadmap forcedBand={mapView} />
      <LearningPathBackToTopButton />
    </div>
  );
}
