"use client";

import Link from "next/link";
import { SubwayNetworkMap } from "@/components/learning/SubwayNetworkMap";
import { useSettings } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { primaryGrades, secondaryGrades } from "@/data/grades";
import { isMainlandHjbRoadmapProfile } from "@/data/mainlandHjbRoadmapPresentation";

export default function PrimaryRoadmapPage() {
  const { currentUser, text } = useSettings();
  const isMainlandHjbRoadmap = isMainlandHjbRoadmapProfile(currentUser?.curriculumProfile);

  if (isMainlandHjbRoadmap) {
    return (
      <div className="page-container py-10 sm:py-12">
        <SectionHeader
          eyebrow={text({ en: "Mainland HJB full network", zh: "內地滬教版完整網絡", zhHans: "内地沪教版完整网络" })}
          title={text({ en: "HJB Mathematics P1-S6 Roadmap", zh: "滬教版數學小一至中六路線圖", zhHans: "沪教版数学P1-S6路线图" })}
          description={text({
            en: "Primary and secondary Shanghai Education Press routes are shown together. Each map is filtered by grade so dense textbook-unit routes stay readable.",
            zh: "滬教版小學與中學路線在同一頁呈現。每張地圖都可按年級切換，讓密集教材單元保持清晰可讀。",
            zhHans: "沪教版小学与中学路线在同一页呈现。每张地图都可按年级切换，让密集教材单元保持清晰可读。"
          })}
          action={(
            <Link
              href="/learning-path"
              className="focus-ring inline-flex w-fit rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-800 shadow-lg transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.07] dark:text-white"
            >
              {text({ en: "Back to Learning Path", zh: "返回學習路徑", zhHans: "返回学习路径" })}
            </Link>
          )}
        />

        <div className="mt-10 space-y-12">
          <SubwayNetworkMap
            band="primary"
            grades={primaryGrades}
            eyebrow={{ en: "Whole primary network", zh: "完整小學網絡" }}
            title={{ en: "Primary Math Subway Map", zh: "小學數學路線圖" }}
            description={{
              en: "All P1-P6 Subway-style math routes are shown together as one connected network, from early number sense to pre-secondary problem solving.",
              zh: "小一至小六數學路線會整合成一個連接網絡，由早期數感到升中前解難能力。"
            }}
            spineLabel={{ en: "Primary spine", zh: "小學主線" }}
            ariaLabel={{ en: "Primary math Subway map showing all P1 to P6 concept routes", zh: "顯示小一至小六概念路線的小學數學地圖" }}
            spineColor="#34d399"
            embedded
            denseGradeFilter
            showBackLink={false}
          />
          <SubwayNetworkMap
            band="secondary"
            grades={secondaryGrades}
            eyebrow={{ en: "Whole secondary network", zh: "完整中學網絡" }}
            title={{ en: "Secondary Math Subway Map", zh: "中學數學路線圖" }}
            description={{
              en: "All S1-S6 Subway-style math routes are shown together as one connected network. Click any station to reveal its attached minibus subconcept route in the detail panel.",
              zh: "中一至中六數學路線會整合成一個連接網絡。點擊任何站點，即可在詳情面板查看附屬子概念支線。"
            }}
            spineLabel={{ en: "Secondary spine", zh: "中學主線" }}
            ariaLabel={{ en: "Secondary math Subway map showing all S1 to S6 concept routes", zh: "顯示中一至中六概念路線的中學數學地圖" }}
            spineColor="#22d3ee"
            embedded
            denseGradeFilter
            showBackLink={false}
          />
        </div>
      </div>
    );
  }

  return (
    <SubwayNetworkMap
      band="primary"
      grades={primaryGrades}
      eyebrow={{ en: "Whole primary network", zh: "完整小學網絡" }}
      title={{ en: "Primary Math Subway Map", zh: "小學數學路線圖" }}
      description={{
        en: "All P1-P6 Subway-style math routes are shown together as one connected network, from early number sense to pre-secondary problem solving.",
        zh: "小一至小六數學路線會整合成一個連接網絡，由早期數感到升中前解難能力。"
      }}
      spineLabel={{ en: "Primary spine", zh: "小學主線" }}
      ariaLabel={{ en: "Primary math Subway map showing all P1 to P6 concept routes", zh: "顯示小一至小六概念路線的小學數學地圖" }}
      spineColor="#34d399"
    />
  );
}
