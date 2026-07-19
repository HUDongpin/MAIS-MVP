import type { BadgeDefinition, LevelDefinition, QuestDefinition } from "@/types";

export const gamificationEconomyVersion = "gamification-core-v1" as const;

export const gamificationEconomy = {
  version: gamificationEconomyVersion,
  dailyXpCap: 420,
  dailyRewardPointCap: 160,
  teacherManualDailyPointCap: 120,
  expectedWeeklyRewardPoints: {
    min: 120,
    max: 180
  },
  basicRewardTargetWeeks: "1-2",
  premiumRewardTargetWeeks: "6-8",
  sourceRewards: {
    "lesson-complete": { xp: 90, rewardPoints: 40 },
    "practice-accuracy": { xp: 70, rewardPoints: 30 },
    streak: { xp: 60, rewardPoints: 25 },
    "visualization-complete": { xp: 45, rewardPoints: 20 },
    "mistake-review": { xp: 35, rewardPoints: 15 },
    "teacher-award": { xp: 2, rewardPoints: 1 },
    "quest-complete": { xp: 50, rewardPoints: 15 },
    "campaign-bonus": { xp: 80, rewardPoints: 30 },
    "badge-earned": { xp: 25, rewardPoints: 0 },
    "adventure-island-complete": { xp: 35, rewardPoints: 35 },
    "fishing-game-complete": { xp: 1, rewardPoints: 0 },
    "island-star": { xp: 25, rewardPoints: 10 }
  }
} as const;

export const levelDefinitions: LevelDefinition[] = [
  { level: 1, title: { en: "Starter", zh: "起步探索者" }, minXp: 0, maxXp: 199 },
  { level: 2, title: { en: "Steady Solver", zh: "穩定解題者" }, minXp: 200, maxXp: 499 },
  { level: 3, title: { en: "Pattern Builder", zh: "規律建構者" }, minXp: 500, maxXp: 899 },
  { level: 4, title: { en: "Reasoning Captain", zh: "推理隊長" }, minXp: 900, maxXp: 1399 },
  { level: 5, title: { en: "Exam Strategist", zh: "應試策略家" }, minXp: 1400, maxXp: 2099 },
  { level: 6, title: { en: "Math Mentor", zh: "數學導師" }, minXp: 2100 }
];

export const badgeDefinitions: BadgeDefinition[] = [
  {
    id: "first-lesson",
    name: { en: "First Lesson Complete", zh: "完成第一課" },
    description: { en: "Completed the first tracked lesson.", zh: "完成第一個有紀錄的課節。" },
    icon: "BookOpen",
    category: "learning",
    criteria: { kind: "lesson-complete", target: 1 },
    sortOrder: 10
  },
  {
    id: "accuracy-builder",
    name: { en: "Accuracy Builder", zh: "準確率建構者" },
    description: { en: "Earned strong practice accuracy three times.", zh: "三次達成良好練習準確率。" },
    icon: "Target",
    category: "practice",
    criteria: { kind: "practice-accuracy", target: 3 },
    sortOrder: 20
  },
  {
    id: "three-day-rhythm",
    name: { en: "Three-Day Rhythm", zh: "三日節奏" },
    description: { en: "Kept a three-day learning streak.", zh: "保持三日連續學習。" },
    icon: "Flame",
    category: "consistency",
    criteria: { kind: "streak-days", target: 3 },
    sortOrder: 30
  },
  {
    id: "visual-thinker",
    name: { en: "Visual Thinker", zh: "圖像思考者" },
    description: { en: "Completed two visualization explorations.", zh: "完成兩次視覺化探索。" },
    icon: "Sparkles",
    category: "exploration",
    criteria: { kind: "visualization-complete", target: 2 },
    sortOrder: 40
  },
  {
    id: "mistake-repair",
    name: { en: "Mistake Repair", zh: "錯題修復" },
    description: { en: "Reviewed five mistake-book items.", zh: "重溫五項錯題簿項目。" },
    icon: "Wrench",
    category: "resilience",
    criteria: { kind: "mistake-review", target: 5 },
    sortOrder: 50
  },
  {
    id: "level-three",
    name: { en: "Level 3 Learner", zh: "三級學習者" },
    description: { en: "Reached Level 3 in the growth track.", zh: "在成長軌道達到第 3 級。" },
    icon: "Trophy",
    category: "growth",
    criteria: { kind: "level", target: 3 },
    sortOrder: 60
  },
  {
    id: "adventure-island-clear",
    name: { en: "Practice Quest Clear", zh: "練習勇者" },
    description: { en: "Cleared the grade-level Adventure Island game.", zh: "完成年级探险岛。" },
    icon: "Gamepad2",
    category: "practice",
    criteria: { kind: "adventure-island-complete", target: 1 },
    sortOrder: 70
  },
  {
    id: "island-cartographer",
    name: { en: "Island Cartographer", zh: "島嶼製圖師" },
    description: { en: "Collected nine Practice Island stars.", zh: "收集九顆練習島星星。" },
    icon: "Map",
    category: "practice",
    criteria: { kind: "island-star", target: 9 },
    sortOrder: 80
  }
];

export const dailyQuestDefinitions: QuestDefinition[] = [
  {
    id: "daily-correct-answers",
    title: { en: "Careful practice", zh: "細心練習" },
    description: { en: "Answer 3 practice questions correctly today.", zh: "今天答對 3 道練習題。" },
    targetType: "answer-correct",
    targetCount: 3,
    xp: 45,
    rewardPoints: 10,
    cadence: "daily",
    sortOrder: 10
  },
  {
    id: "daily-lesson-step",
    title: { en: "Lesson step", zh: "課節一步" },
    description: { en: "Complete or continue one lesson today.", zh: "今天完成或推進一個課節。" },
    targetType: "lesson-complete",
    targetCount: 1,
    xp: 60,
    rewardPoints: 15,
    cadence: "daily",
    sortOrder: 20
  },
  {
    id: "daily-repair",
    title: { en: "Repair one mistake", zh: "修正一題錯題" },
    description: { en: "Review one mistake-book item today.", zh: "今天重溫一項錯題簿內容。" },
    targetType: "mistake-review",
    targetCount: 1,
    xp: 35,
    rewardPoints: 10,
    cadence: "daily",
    sortOrder: 30
  }
];
