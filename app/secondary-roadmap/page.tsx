import { SubwayNetworkMap } from "@/components/learning/SubwayNetworkMap";
import { secondaryGrades } from "@/data/grades";

export default function SecondaryRoadmapPage() {
  return (
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
    />
  );
}
