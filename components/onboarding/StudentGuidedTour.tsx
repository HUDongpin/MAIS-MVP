"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GuidedTour, readGuidedTourRecord } from "@/components/onboarding/GuidedTour";
import type { GuidedTourCopy, GuidedTourRecord, GuidedTourStep } from "@/components/onboarding/GuidedTour";
import { useSettings } from "@/components/providers/AppProviders";
import type { GradeId } from "@/types";

export function studentTourStorageKey(userId?: string) {
  return `mais-student-tour:v1:${userId ?? "guest"}`;
}

export function studentTourReadAloudStorageKey(userId?: string) {
  return `mais-student-tour-read-aloud:v1:${userId ?? "guest"}`;
}

export type StudentTourRecord = GuidedTourRecord;

// The replay buttons live in the navbar and on the dashboard, the tour is
// mounted in the root layout, so they talk through an event instead of lifted state.
export const studentGuidedTourRequestEventName = "mais:student-guided-tour-request";

export function requestStudentGuidedTour() {
  window.dispatchEvent(new CustomEvent(studentGuidedTourRequestEventName));
}

export function readStudentTourRecord(raw: string | null): StudentTourRecord | null {
  return readGuidedTourRecord(raw);
}

// K-2 learners get the larger card, 48px controls, and read-aloud; everyone else
// gets the standard card. Grade ids are track-agnostic ("K", "P1"…"S6"), so the
// youngest band is the same check for HK, mainland, and US learners.
const youngLearnerGrades = new Set<GradeId>(["K", "P1", "P2"]);

// Steps resolve against [data-tour="..."] anchors at open time; anchors that are
// not laid out are skipped, so a sequence degrades to whatever the learner can
// actually see. The navbar steps below are reachable from every page.
const lessonNavStep: GuidedTourStep = {
  id: "lesson",
  anchor: "student-lesson",
  title: { en: "Learn something new", zh: "學新東西", zhHans: "学新东西" },
  body: {
    en: "Lesson takes you to today's teaching. Read the idea, look at the worked example, then try one yourself.",
    zh: "「課時」帶你去今天要學的內容：看概念、看例題，然後自己試一題。",
    zhHans: "“课时”带你去今天要学的内容：看概念、看例题，然后自己试一题。"
  }
};

const practiceNavStep: GuidedTourStep = {
  id: "practice",
  anchor: "student-practice",
  title: { en: "Practice and play", zh: "練習和遊戲", zhHans: "练习和游戏" },
  body: {
    en: "Practice is where you train what you just learned. Finish a set to earn stars, and stars unlock the games on your map.",
    zh: "「練習」讓你把剛學到的練熟。完成一組題可以賺星星，星星能解鎖地圖上的遊戲。",
    zhHans: "“练习”让你把刚学到的练熟。完成一组题可以赚星星，星星能解锁地图上的游戏。"
  }
};

const tutorStep: GuidedTourStep = {
  id: "tutor",
  anchor: "student-tutor",
  title: { en: "Stuck? Ask Nova", zh: "卡住了？問 Nova", zhHans: "卡住了？问 Nova" },
  body: {
    en: "Tap Professor Nova any time and ask in your own words. Want to see this tour again? Tap Show me around, the compass at the top of the screen.",
    zh: "隨時可以按 Nova 導師，用自己的話發問。想重看這個導覽？按畫面頂部的「帶我看看」指南針。",
    zhHans: "随时可以按 Nova 导师，用自己的话发问。想重看这个导览？按画面顶部的“带我看看”指南针。"
  }
};

const dashboardSteps: GuidedTourStep[] = [
  {
    id: "home",
    anchor: "student-home",
    title: { en: "This is your home base", zh: "這裡是你的基地", zhHans: "这里是你的基地" },
    body: {
      en: "Your course, your grade, and how much you have learned so far all live here. You can always come back by tapping your name at the top.",
      zh: "你的課程、年級和學習進度都在這裡。想回來時，按上方你的名字就可以。",
      zhHans: "你的课程、年级和学习进度都在这里。想回来时，按上方你的名字就可以。"
    }
  },
  {
    id: "assignments",
    anchor: "student-assignments",
    title: { en: "Work from your teacher", zh: "老師派給你的功課", zhHans: "老师派给你的功课" },
    body: {
      en: "Anything your teacher sends you shows up here with the day it is due. Start here first.",
      zh: "老師派給你的任務會顯示在這裡，還會寫上截止日期。先從這裡開始。",
      zhHans: "老师派给你的任务会显示在这里，还会写上截止日期。先从这里开始。"
    }
  },
  lessonNavStep,
  practiceNavStep,
  tutorStep
];

const lessonSteps: GuidedTourStep[] = [
  {
    id: "lesson-map",
    anchor: "student-lesson-map",
    title: { en: "Your map of lessons", zh: "你的課時地圖", zhHans: "你的课时地图" },
    body: {
      en: "Every lesson in this world sits here. The one you are reading is highlighted, and you can jump to any other one.",
      zh: "這個世界的所有課時都在這裡，你正在看的那一課會標示出來，也可以跳去其他課。",
      zhHans: "这个世界的所有课时都在这里，你正在看的那一课会标示出来，也可以跳去其他课。"
    }
  },
  {
    id: "lesson-body",
    anchor: "student-lesson-body",
    title: { en: "The new idea", zh: "新的概念", zhHans: "新的概念" },
    body: {
      en: "Read the idea, then look at the worked example right under it. Take your time — nothing here is timed.",
      zh: "先看概念，再看下面的例題。慢慢來，這裡沒有計時。",
      zhHans: "先看概念，再看下面的例题。慢慢来，这里没有计时。"
    }
  },
  {
    id: "lesson-practice",
    anchor: "student-lesson-practice",
    title: { en: "Try it yourself", zh: "自己試一試", zhHans: "自己试一试" },
    body: {
      en: "A few questions on what you just read. Getting one wrong is fine — that is how MAIS learns what to help you with.",
      zh: "這是剛才學到的幾題練習。做錯沒關係，MAIS 就是這樣知道要怎樣幫你。",
      zhHans: "这是刚才学到的几题练习。做错没关系，MAIS 就是这样知道要怎样帮你。"
    }
  },
  tutorStep
];

const practiceSteps: GuidedTourStep[] = [
  {
    id: "practice-map",
    anchor: "student-practice-map",
    title: { en: "Your island map", zh: "你的島嶼地圖", zhHans: "你的岛屿地图" },
    body: {
      en: "Each pin on the island is a set of questions. Earn stars to light up new pins and the games hiding behind them.",
      zh: "島上每個標記都是一組題目。賺到星星就能點亮新的標記，還有藏在後面的遊戲。",
      zhHans: "岛上每个标记都是一组题目。赚到星星就能点亮新的标记，还有藏在后面的游戏。"
    }
  },
  {
    id: "practice-start",
    anchor: "student-practice-start",
    title: { en: "Start a mission", zh: "開始任務", zhHans: "开始任务" },
    body: {
      en: "Not sure which pin to pick? Tap Start Mission and MAIS chooses the right questions for you.",
      zh: "不知道選哪個標記？按「開始任務」，MAIS 會幫你挑合適的題目。",
      zhHans: "不知道选哪个标记？按“开始任务”，MAIS 会帮你挑合适的题目。"
    }
  },
  tutorStep
];

const assignmentSteps: GuidedTourStep[] = [
  {
    id: "assignment-list",
    anchor: "student-assignment-list",
    title: { en: "Everything your teacher sent", zh: "老師派給你的全部", zhHans: "老师派给你的全部" },
    body: {
      en: "Open any card to read the task and hand in your answer. The date on the card is the day it is due.",
      zh: "點開任何一張卡就能看題目和交答案，卡上的日期就是截止日。",
      zhHans: "点开任何一张卡就能看题目和交答案，卡上的日期就是截止日。"
    }
  },
  tutorStep
];

const roadmapSteps: GuidedTourStep[] = [
  {
    id: "roadmap-path",
    anchor: "student-roadmap-path",
    title: { en: "Where you are going", zh: "你正在走的路", zhHans: "你正在走的路" },
    body: {
      en: "This is your whole year, in order. Finished stops are filled in, and the next one is waiting for you.",
      zh: "這是你整年的學習路線。完成的站會填滿顏色，下一站正在等你。",
      zhHans: "这是你整年的学习路线。完成的站会填满颜色，下一站正在等你。"
    }
  },
  tutorStep
];

// /student/roadmap/primary and /secondary are a different surface from the
// roadmap itself: the whole-band network map, not this learner's path.
const networkMapSteps: GuidedTourStep[] = [
  {
    id: "network-map",
    anchor: "student-network-map",
    title: { en: "The whole map", zh: "整張地圖", zhHans: "整张地图" },
    body: {
      en: "Every topic in your school years, joined up like a train map. Drag to move around, and tap a station to see what it leads to.",
      zh: "這裡有你整個學程的所有課題，像鐵路圖一樣連起來。拖動可以移動，點一個站就看到它通往哪裡。",
      zhHans: "这里有你整个学程的所有课题，像铁路图一样连起来。拖动可以移动，点一个站就看到它通往哪里。"
    }
  },
  tutorStep
];

const assessmentSteps: GuidedTourStep[] = [
  {
    id: "assessment-questions",
    anchor: "student-assessment-questions",
    title: { en: "Answer at your own pace", zh: "按你的節奏作答", zhHans: "按你的节奏作答" },
    body: {
      en: "Work down the questions and fill in what you can. You can change an answer before you hand it in.",
      zh: "由上而下逐題作答，做到多少寫多少。交出去之前都可以改。",
      zhHans: "由上而下逐题作答，做到多少写多少。交出去之前都可以改。"
    }
  },
  {
    id: "assessment-submit",
    anchor: "student-assessment-submit",
    title: { en: "Hand it in here", zh: "在這裡提交", zhHans: "在这里提交" },
    body: {
      en: "Your score so far is on the left. When you are ready, tap Submit assessment and your teacher gets it.",
      zh: "左邊是你目前的分數。準備好就按「提交測驗」，老師就會收到。",
      zhHans: "左边是你目前的分数。准备好就按“提交测验”，老师就会收到。"
    }
  },
  tutorStep
];

const personalizedLearningSteps: GuidedTourStep[] = [
  {
    id: "learning-paths",
    anchor: "student-learning-paths",
    title: { en: "Your teacher's plan", zh: "老師為你排的計劃", zhHans: "老师为你排的计划" },
    body: {
      en: "Your teacher can lay out steps for you to do in order. Finish one and the next one opens up.",
      zh: "老師可以為你排好一步步的學習，完成一步就會打開下一步。",
      zhHans: "老师可以为你排好一步步的学习，完成一步就会打开下一步。"
    }
  },
  {
    id: "galaxy",
    anchor: "student-galaxy",
    title: { en: "Your skills as stars", zh: "你的技能星圖", zhHans: "你的技能星图" },
    body: {
      en: "Every star is something you are learning. Bright ones you already know, dim ones are next. MAIS picks your next star from what you have done.",
      zh: "每一顆星都是你正在學的東西。亮的是你已經會的，暗的是接下來要學的。MAIS 會按你做過的內容挑下一顆星。",
      zhHans: "每一颗星都是你正在学的东西。亮的是你已经会的，暗的是接下来要学的。MAIS 会按你做过的内容挑下一颗星。"
    }
  },
  tutorStep
];

const toolsSteps: GuidedTourStep[] = [
  {
    id: "tools-catalog",
    anchor: "student-tools-catalog",
    title: { en: "Things you can play with", zh: "可以動手玩的工具", zhHans: "可以动手玩的工具" },
    body: {
      en: "Every card here is a picture of a maths idea you can drag and change. Open one and see what moves.",
      zh: "這裡每一張卡都是一個可以拖動、改變的數學圖像。打開一個，看看甚麼會動。",
      zhHans: "这里每一张卡都是一个可以拖动、改变的数学图像。打开一个，看看什么会动。"
    }
  },
  tutorStep
];

// Opening a single lab is a different surface from the catalogue that lists them.
const toolWorkspaceSteps: GuidedTourStep[] = [
  {
    id: "tool-workspace",
    anchor: "student-tool-workspace",
    title: { en: "Try moving it", zh: "動手玩玩看", zhHans: "动手玩玩看" },
    body: {
      en: "Drag, tap and change the numbers to see what happens. Nothing here can break, and nothing is being marked.",
      zh: "拖動、點擊、改數字，看看會發生甚麼。這裡不會弄壞任何東西，也不會計分。",
      zhHans: "拖动、点击、改数字，看看会发生什么。这里不会弄坏任何东西，也不会计分。"
    }
  },
  tutorStep
];

// Anywhere the tour has no page-specific sequence, the navbar steps still work.
const anywhereSteps: GuidedTourStep[] = [lessonNavStep, practiceNavStep, tutorStep];

const tourSurfaces: Array<{ match: (pathname: string) => boolean; steps: GuidedTourStep[] }> = [
  { match: (pathname) => pathname === "/dashboard", steps: dashboardSteps },
  {
    match: (pathname) => pathname.startsWith("/student/lessons/") || pathname.startsWith("/lesson/"),
    steps: lessonSteps
  },
  { match: (pathname) => pathname === "/practice", steps: practiceSteps },
  { match: (pathname) => pathname === "/student/assignments", steps: assignmentSteps },
  // Order matters: the sub-routes render the network map, not the learner's own
  // path, so they are matched before the roadmap itself.
  { match: (pathname) => pathname.startsWith("/student/roadmap/"), steps: networkMapSteps },
  { match: (pathname) => pathname === "/student/roadmap", steps: roadmapSteps },
  { match: (pathname) => pathname.startsWith("/student/assessments/"), steps: assessmentSteps },
  { match: (pathname) => pathname === "/personalized-learning", steps: personalizedLearningSteps },
  // Order matters: an open lab is matched before the catalogue it was opened from.
  {
    match: (pathname) =>
      pathname.startsWith("/student/tools/visualizations/") || pathname.startsWith("/visualization-lab/"),
    steps: toolWorkspaceSteps
  },
  // The catalogue is reachable at both its student path and the older top-level
  // route, and both render the same page, so both need the sequence.
  {
    match: (pathname) =>
      pathname.startsWith("/student/tools/visualizations") || pathname.startsWith("/visualization-lab"),
    steps: toolsSteps
  }
];

export function stepsForPathname(pathname: string) {
  return tourSurfaces.find((surface) => surface.match(pathname))?.steps ?? anywhereSteps;
}

const studentTourCopy: Partial<GuidedTourCopy> = {
  progress: (step, total) => ({
    en: `${step} of ${total}`,
    zh: `第 ${step} / ${total} 步`,
    zhHans: `第 ${step} / ${total} 步`
  }),
  skip: { en: "Skip", zh: "略過", zhHans: "跳过" },
  back: { en: "Back", zh: "上一步", zhHans: "上一步" },
  next: { en: "Next", zh: "下一步", zhHans: "下一步" },
  done: { en: "Let's go!", zh: "開始學習！", zhHans: "开始学习！" },
  readAloudOn: { en: "Reading to you — tap to stop", zh: "正在讀給你聽 —— 點一下停止", zhHans: "正在读给你听 —— 点一下停止" },
  readAloudOff: { en: "Read this to me", zh: "讀給我聽", zhHans: "读给我听" }
};

export function StudentGuidedTour() {
  const pathname = usePathname();
  const { currentUser, settingsReady } = useSettings();
  const [open, setOpen] = useState(false);
  // Bumped on every replay request and used as the tour's key, so pressing
  // "Show me around" while the tour is already open restarts it at step one
  // instead of leaving the learner wherever they had got to.
  const [replayNonce, setReplayNonce] = useState(0);

  const userId = currentUser?.id;
  const isStudent = Boolean(
    settingsReady && currentUser?.role === "student" && !currentUser.passwordMustChange
  );
  const isYoungLearner = Boolean(currentUser && youngLearnerGrades.has(currentUser.grade));
  const steps = useMemo(() => stepsForPathname(pathname), [pathname]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    // The replay buttons reopen the tour from anywhere, even after it has been
    // completed — replay is deliberately not gated on the stored record.
    if (!isStudent) return;
    const onRequest = () => {
      setReplayNonce((nonce) => nonce + 1);
      setOpen(true);
    };
    window.addEventListener(studentGuidedTourRequestEventName, onRequest);
    return () => window.removeEventListener(studentGuidedTourRequestEventName, onRequest);
  }, [isStudent]);

  useEffect(() => {
    // First-visit auto-launch: signed-in students on the dashboard only, never
    // under test automation, and never once the learner has finished or skipped it.
    if (!isStudent || !userId || open) return;
    if (pathname !== "/dashboard") return;
    if (typeof navigator !== "undefined" && navigator.webdriver) return;
    try {
      if (readStudentTourRecord(window.localStorage.getItem(studentTourStorageKey(userId)))) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => {
      // The 15-second setup gate is also a first-visit modal; whoever opened
      // first keeps the screen.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      setOpen(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [isStudent, open, pathname, userId]);

  if (!isStudent || !userId) return null;

  return (
    <GuidedTour
      key={replayNonce}
      steps={steps}
      open={open}
      onClose={close}
      storageKey={studentTourStorageKey(userId)}
      idPrefix="student-tour"
      size={isYoungLearner ? "kid" : "standard"}
      copy={studentTourCopy}
      readAloud={isYoungLearner}
      readAloudStorageKey={studentTourReadAloudStorageKey(userId)}
    />
  );
}
