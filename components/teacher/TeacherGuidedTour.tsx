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
    title: { en: "Everything is grouped by when you need it", zh: "依使用時機分組的導覽" },
    body: {
      en: "Today holds your daily work — grading, messages, live class. Below it: weekly planning, student data, and end-of-term records.",
      zh: "「今日」集中每天的批改、訊息與課堂；往下依序是備課教學、學生數據與校務記錄。"
    }
  },
  {
    id: "workspace-header",
    anchor: "workspace-header",
    title: { en: "Focus and search", zh: "聚焦與搜尋" },
    body: {
      en: "Pick one class to focus every page, or search students, assignments, and resources from anywhere.",
      zh: "選擇班級聚焦所有頁面，或隨時搜尋學生、作業與資源。"
    }
  },
  {
    id: "kpis",
    anchor: "kpis",
    title: { en: "Today's numbers", zh: "今日數據" },
    body: {
      en: "Green means all caught up; amber and red show where work is waiting. Click any number to jump straight to that queue.",
      zh: "綠色代表已處理完；琥珀與紅色代表仍有待辦。點擊數字直達對應佇列。"
    }
  },
  {
    id: "action-queue",
    anchor: "action-queue",
    title: { en: "What needs attention", zh: "需要跟進事項" },
    body: {
      en: "Learning risks and follow-ups gather here so nothing slips through between assignment cycles.",
      zh: "學習風險與待跟進事項集中於此，作業週期之間不再遺漏。"
    }
  },
  {
    id: "workflow",
    anchor: "workflow",
    title: { en: "Color shows where things live", zh: "顏色對應功能分區" },
    body: {
      en: "Each card's color matches its navigation group on the left, so the same hue always leads to the same place.",
      zh: "卡片顏色對應左側導覽分組，相同色調永遠代表相同區域。"
    }
  },
  {
    id: "replay",
    anchor: "tour-button",
    title: { en: "Replay anytime", zh: "隨時重看" },
    body: {
      en: "That's the console! Reopen this walkthrough from the Tour button whenever you need a refresher.",
      zh: "導覽完成！之後可隨時按「導覽」按鈕重看。"
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
