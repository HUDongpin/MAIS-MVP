"use client";

import { GuidedTour, readGuidedTourRecord } from "@/components/onboarding/GuidedTour";
import type { GuidedTourRecord, GuidedTourStep } from "@/components/onboarding/GuidedTour";

export function teacherTourStorageKey(userId?: string) {
  return `mais-teacher-tour:v1:${userId ?? "guest"}`;
}

export type TeacherTourRecord = GuidedTourRecord;

// Steps resolve against [data-tour="..."] anchors at open time; anchors that are
// not on the current page (e.g. dashboard sections while on a sub-page) are
// skipped so the tour works from anywhere the replay button is visible.
const teacherTourSteps: GuidedTourStep[] = [
  {
    id: "nav",
    anchor: "nav",
    title: { en: "Everything is grouped by when you need it", zh: "依使用時機分組的導覽", zhHans: "依使用时机分组的导览" },
    body: {
      en: "Today holds your daily work — grading, messages, live class. Below it: weekly planning, student data, and end-of-term records.",
      zh: "「今日」集中每天的批改、訊息與課堂；往下依序是備課教學、學生數據與校務記錄。", zhHans: "「今日」集中每天的批改、讯息与课堂；往下依序是备课教学、学生数据与校务记录。"
    }
  },
  {
    id: "workspace-header",
    anchor: "workspace-header",
    title: { en: "Focus and search", zh: "聚焦與搜尋", zhHans: "聚焦与搜索" },
    body: {
      en: "Pick one class to focus every page, or search students, assignments, and resources from anywhere.",
      zh: "選擇班級聚焦所有頁面，或隨時搜尋學生、作業與資源。", zhHans: "选择班级聚焦所有页面，或随时搜索学生、作业与资源。"
    }
  },
  {
    id: "kpis",
    anchor: "kpis",
    title: { en: "Today's numbers", zh: "今日數據", zhHans: "今日数据" },
    body: {
      en: "Green means all caught up; amber and red show where work is waiting. Click any number to jump straight to that queue.",
      zh: "綠色代表已處理完；琥珀與紅色代表仍有待辦。點擊數字直達對應佇列。", zhHans: "绿色代表已处理完；琥珀与红色代表仍有待办。点击数字直达对应队列。"
    }
  },
  {
    id: "action-queue",
    anchor: "action-queue",
    title: { en: "What needs attention", zh: "需要跟進事項", zhHans: "需要跟进事项" },
    body: {
      en: "Learning risks and follow-ups gather here so nothing slips through between assignment cycles.",
      zh: "學習風險與待跟進事項集中於此，作業週期之間不再遺漏。", zhHans: "学习风险与待跟进事项集中于此，作业周期之间不再遗漏。"
    }
  },
  {
    id: "workflow",
    anchor: "workflow",
    title: { en: "Color shows where things live", zh: "顏色對應功能分區", zhHans: "颜色对应功能分区" },
    body: {
      en: "Each card's color matches its navigation group on the left, so the same hue always leads to the same place.",
      zh: "卡片顏色對應左側導覽分組，相同色調永遠代表相同區域。", zhHans: "卡片颜色对应左侧导览分组，相同色调永远代表相同区域。"
    }
  },
  {
    id: "replay",
    anchor: "tour-button",
    title: { en: "Replay anytime", zh: "隨時重看", zhHans: "随时重看" },
    body: {
      en: "That's the console! Reopen this walkthrough from the Tour button whenever you need a refresher.",
      zh: "導覽完成！之後可隨時按「導覽」按鈕重看。", zhHans: "导览完成！之后可随时按「导览」按钮重看。"
    }
  }
];

export function readTeacherTourRecord(raw: string | null): TeacherTourRecord | null {
  return readGuidedTourRecord(raw);
}

export function TeacherGuidedTour({
  userId,
  open,
  onClose
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <GuidedTour
      steps={teacherTourSteps}
      open={open}
      onClose={onClose}
      storageKey={teacherTourStorageKey(userId)}
      idPrefix="teacher-tour"
    />
  );
}
