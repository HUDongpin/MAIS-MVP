"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { PracticeQuestionCard } from "@/components/practice/PracticeQuestionCard";
import { GameResultsCeremony } from "@/components/gamification/GameResultsCeremony";
import {
  playEscapeSwim,
  playReelIn,
  playStruggleWiggle,
  spawnBubbleBurst,
  spawnCoinFly,
  spawnCombatText,
  spawnRippleRings
} from "@/components/gamification/phaserGameJuice";
import { useSettings } from "@/components/providers/AppProviders";
import {
  bestRunKey,
  catchReelSpec,
  creatureDisplayNames,
  creatureRarities,
  creatureRarityFor,
  earnedStarCount,
  fishingRunStars,
  fishingSpeciesTotal,
  gameBestStorageKey,
  gameSoundStorageKey,
  isNewBestRun,
  prefersReducedMotion,
  readGameBestRecord,
  readGameSoundEnabled,
  withBestRun,
  type CreatureRarity,
  type RunStar
} from "@/lib/practiceGameJuice";
import { playPracticeSound, type PracticeSoundKind } from "@/lib/practiceSound";
import { cn } from "@/lib/utils";
import type { AttemptFeedback, GamificationSummary, Language, LocalizedText, PublicQuestion } from "@/types";

type FishingRoundPayload = {
  topicId: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  accuracyPercent: number;
  roundKey: string;
};

type FishingStats = {
  netsRemaining: number;
  coins: number;
  elapsedSeconds: number;
  netsUsed: number;
};

type FishingPhase = "loading" | "locked" | "welcome" | "ready" | "casting" | "challenge" | "ended" | "submitting" | "submitted";
type ResourceLoadState = "idle" | "loading" | "ready" | "failed";

type Challenge = {
  creatureName: string;
  rarity: CreatureRarity;
  species: string;
  question: PublicQuestion;
};

type FishingFeedbackKind = "hit" | "miss" | "coin" | "settlement";

type FishingFeedback = {
  id: number;
  kind: FishingFeedbackKind;
  title: string;
  detail: string;
};

type FishingCompletion = {
  status: "awarded" | "duplicate" | "capped" | "not-eligible" | "invalid-run";
  reward: {
    xp: number;
    rewardPoints: number;
  };
  coins: number;
  rarityBonus: number;
  dex: {
    newSpecies: string[];
    caughtCount: number;
    totalSpecies: number;
  } | null;
  gamification: GamificationSummary | null;
};

type FishingDexSnapshot = {
  fishDex: Array<{ species: string; catchCount: number }>;
  totalSpecies: number;
};
type AdventureIslandEligibility = {
  alreadyCompleted: boolean;
  postAdventurePracticeEligible: boolean;
};

type FishingControl = {
  aimLeft: () => void;
  aimRight: () => void;
  aimBy: (delta: number) => void;
  aimAt: (stageX: number, stageY: number) => void;
  fireNet: () => void;
  celebrateCatch: () => void;
  escapeCatch: () => void;
  resume: () => void;
  stop: () => void;
};

const fishingRoundStorageKey = "hk-math-practice-fishing-round";
const fishingDurationSeconds = 120;
const resourceLoadTimeoutMs = 12_000;
const fishingStageWidth = 960;
const fishingStageHeight = 540;
const defaultCannonAngle = -135;
// Near-horizontal sweep on both sides so every reachable creature position
// (including fish hugging the bottom corners) stays inside the aim arc.
const minCannonAngle = -178;
const maxCannonAngle = -2;
const cannonKeyboardNudgeDegrees = 5;
const cannonHoldDegreesPerSecond = 160;
const cannonHoldTickMs = 16;
const settlementRetryDelayMs = 4_000;
const settlementSubmitTimeoutMs = 12_000;
const defaultStats: FishingStats = {
  netsRemaining: 10,
  coins: 0,
  elapsedSeconds: 0,
  netsUsed: 0
};
const creatureNames = ["Small fish", "Shark", "Octopus", "Lobster", "Blue fish", "Golden fish", "Stingray"];
const fishingSimplifiedTextReplacements = [
  ["練", "练"],
  ["魚", "鱼"],
  ["獎", "奖"],
  ["勵", "励"],
  ["記", "记"],
  ["錄", "录"],
  ["這", "这"],
  ["領", "领"],
  ["驗", "验"],
  ["證", "证"],
  ["暫", "暂"],
  ["準", "准"],
  ["備", "备"],
  ["啟", "启"],
  ["畫", "画"],
  ["結", "结"],
  ["獲", "获"],
  ["幣", "币"],
  ["兌", "兑"],
  ["換", "换"],
  ["網", "网"],
  ["狀", "状"],
  ["態", "态"]
] as const;
const fishingCompletionStatuses = new Set<FishingCompletion["status"]>([
  "awarded",
  "duplicate",
  "capped",
  "not-eligible",
  "invalid-run"
]);

function readFishingRoundPayload(value: string | null) {
  if (!value) return null;

  try {
    const payload = JSON.parse(value) as Partial<FishingRoundPayload> | null;
    if (
      typeof payload?.topicId !== "string" ||
      typeof payload.roundKey !== "string" ||
      typeof payload.accuracyPercent !== "number" ||
      !Array.isArray(payload.roundQuestionIds) ||
      !Array.isArray(payload.correctRoundQuestionIds)
    ) {
      return null;
    }

    return {
      topicId: payload.topicId,
      roundQuestionIds: payload.roundQuestionIds.filter((item): item is string => typeof item === "string"),
      correctRoundQuestionIds: payload.correctRoundQuestionIds.filter((item): item is string => typeof item === "string"),
      accuracyPercent: payload.accuracyPercent,
      roundKey: payload.roundKey
    };
  } catch {
    return null;
  }
}

function readQuestions(value: unknown) {
  const response = value as { questions?: unknown } | null;
  return Array.isArray(response?.questions) ? response.questions as PublicQuestion[] : [];
}

function readFishingCompletion(value: unknown): FishingCompletion | null {
  if (typeof value !== "object" || value === null) return null;

  const candidate = value as {
    status?: unknown;
    reward?: { xp?: unknown; rewardPoints?: unknown };
    coins?: unknown;
    gamification?: unknown;
  };

  if (
    typeof candidate.status !== "string" ||
    !fishingCompletionStatuses.has(candidate.status as FishingCompletion["status"]) ||
    typeof candidate.reward?.xp !== "number" ||
    !Number.isFinite(candidate.reward.xp) ||
    typeof candidate.reward.rewardPoints !== "number" ||
    !Number.isFinite(candidate.reward.rewardPoints) ||
    typeof candidate.coins !== "number" ||
    !Number.isFinite(candidate.coins)
  ) {
    return null;
  }

  const extras = value as {
    rarityBonus?: unknown;
    dex?: { newSpecies?: unknown; caughtCount?: unknown; totalSpecies?: unknown } | null;
  };
  const dex = extras.dex && typeof extras.dex === "object" &&
    Array.isArray(extras.dex.newSpecies) &&
    typeof extras.dex.caughtCount === "number" &&
    typeof extras.dex.totalSpecies === "number"
    ? {
        newSpecies: extras.dex.newSpecies.filter((item): item is string => typeof item === "string"),
        caughtCount: extras.dex.caughtCount,
        totalSpecies: extras.dex.totalSpecies
      }
    : null;

  return {
    status: candidate.status as FishingCompletion["status"],
    reward: {
      xp: candidate.reward.xp,
      rewardPoints: candidate.reward.rewardPoints
    },
    coins: candidate.coins,
    rarityBonus: typeof extras.rarityBonus === "number" && Number.isFinite(extras.rarityBonus) ? extras.rarityBonus : 0,
    dex,
    gamification: (candidate.gamification ?? null) as GamificationSummary | null
  };
}

function readAdventureEligibility(value: unknown): AdventureIslandEligibility | null {
  const candidate = value as Partial<AdventureIslandEligibility> | null;
  if (
    typeof candidate?.alreadyCompleted !== "boolean" ||
    typeof candidate.postAdventurePracticeEligible !== "boolean"
  ) {
    return null;
  }
  return candidate as AdventureIslandEligibility;
}

function adventureEligibilitySearchParams(payload: FishingRoundPayload) {
  const params = new URLSearchParams({
    topicId: payload.topicId,
    roundKey: payload.roundKey
  });
  payload.roundQuestionIds.forEach((questionId) => params.append("roundQuestionIds", questionId));
  payload.correctRoundQuestionIds.forEach((questionId) => params.append("correctRoundQuestionIds", questionId));
  return params;
}

async function importPhaserWithTimeout() {
  let timeout: number | null = null;

  try {
    return await Promise.race([
      import("phaser"),
      new Promise<never>((_, reject) => {
        timeout = window.setTimeout(() => reject(new Error("Phaser import timed out.")), resourceLoadTimeoutMs);
      })
    ]);
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

function formatGameTime(seconds: number) {
  const elapsed = Math.min(fishingDurationSeconds, Math.max(0, seconds));
  const minutes = Math.floor(elapsed / 60);
  const rest = elapsed % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function timerRunsInPhase(phase: FishingPhase) {
  // The round clock intentionally stops during "challenge": a caught question
  // must stay answerable without time pressure, and must never be force-closed
  // mid-answer by the 120-second cutoff.
  return phase === "ready" || phase === "casting";
}

function aimingAllowedInPhase(phase: FishingPhase) {
  // Re-aiming while a net is in flight keeps the cannon responsive; the net
  // already in the water keeps its captured path.
  return phase === "ready" || phase === "casting";
}

function normalizeFishingSimplifiedText(value: string, language: Language) {
  if (language !== "zh-Hans") return value;

  return fishingSimplifiedTextReplacements.reduce(
    (current, [source, replacement]) => current.split(source).join(replacement),
    value
  );
}

function completionCopy(status: FishingCompletion["status"] | undefined) {
  if (status === "awarded") return { en: "Fishing Master reward recorded.", zh: "捕魚達人獎勵已記錄。" };
  if (status === "capped") return { en: "Fishing Master reward recorded, limited by today's cap.", zh: "捕魚達人獎勵已記錄，並受今日上限限制。" };
  if (status === "duplicate") return { en: "This Fishing Master round reward was already claimed.", zh: "這個捕魚達人回合獎勵已領取。" };
  if (status === "not-eligible") return { en: "This round is not eligible for Fishing Master rewards.", zh: "這個回合未符合捕魚達人獎勵資格。" };
  if (status === "invalid-run") return { en: "The Fishing Master run could not be verified.", zh: "未能驗證捕魚達人回合。" };
  return { en: "Fishing Master run ended.", zh: "捕魚達人回合結束。" };
}

export function FishingGame() {
  const { currentUser, language, t: settingsT } = useSettings();
  const t = useCallback(
    (localized: LocalizedText) => normalizeFishingSimplifiedText(settingsT(localized), language),
    [language, settingsT]
  );
  const gameRootRef = useRef<HTMLDivElement | null>(null);
  const gameControlRef = useRef<FishingControl | null>(null);
  const phaseRef = useRef<FishingPhase>("loading");
  const statsRef = useRef<FishingStats>(defaultStats);
  const questionsRef = useRef<PublicQuestion[]>([]);
  const payloadRef = useRef<FishingRoundPayload | null>(null);
  const nextQuestionIndexRef = useRef(0);
  const caughtQuestionIdsRef = useRef<Set<string>>(new Set());
  const correctCaughtQuestionIdsRef = useRef<Set<string>>(new Set());
  const correctCaughtSpeciesRef = useRef<Record<string, string>>({});
  const activeCreatureCountRef = useRef(0);
  const hasSubmittedRef = useRef(false);
  const [payload, setPayload] = useState<FishingRoundPayload | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [stats, setStats] = useState<FishingStats>(defaultStats);
  const [phase, setPhase] = useState<FishingPhase>("loading");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadErrorCode, setLoadErrorCode] = useState("");
  const [questionLoadState, setQuestionLoadState] = useState<ResourceLoadState>("idle");
  const [rendererLoadState, setRendererLoadState] = useState<ResourceLoadState>("idle");
  const [completion, setCompletion] = useState<FishingCompletion | null>(null);
  const [ceremony, setCeremony] = useState<{ stars: RunStar[]; newBest: boolean; rewardLine: string | null; bonusLine: string | null } | null>(null);
  const [dexSnapshot, setDexSnapshot] = useState<FishingDexSnapshot | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [cannonAngle, setCannonAngle] = useState(defaultCannonAngle);
  const [impactFeedback, setImpactFeedback] = useState<FishingFeedback | null>(null);
  const [rewardFeedback, setRewardFeedback] = useState<FishingFeedback | null>(null);
  const [settlementDelayed, setSettlementDelayed] = useState(false);
  const aimHoldTimerRef = useRef<number | null>(null);
  const aimHoldDirectionRef = useRef(0);
  const aimPointerIdRef = useRef<number | null>(null);
  const feedbackIdRef = useRef(0);
  const settlementDelayTimerRef = useRef<number | null>(null);
  const settlementTimeoutTimerRef = useRef<number | null>(null);
  const submitAbortControllerRef = useRef<AbortController | null>(null);
  const submitRunIdRef = useRef(0);
  const tRef = useRef(t);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  const playGameSound = useCallback((kind: PracticeSoundKind) => {
    if (soundEnabledRef.current) playPracticeSound(kind);
  }, []);

  useEffect(() => {
    const enabled = readGameSoundEnabled(window.localStorage.getItem(gameSoundStorageKey(currentUser?.id)));
    soundEnabledRef.current = enabled;
    setSoundEnabled(enabled);
  }, [currentUser?.id]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((current) => {
      const next = !current;
      soundEnabledRef.current = next;
      window.localStorage.setItem(gameSoundStorageKey(currentUser?.id), String(next));
      return next;
    });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "student") {
      setDexSnapshot(null);
      return;
    }
    let cancelled = false;

    async function loadDex() {
      try {
        const response = await fetch("/api/gamification/collections", { cache: "no-store" });
        const payload = await response.json().catch(() => null) as {
          fishDex?: Array<{ species?: unknown; catchCount?: unknown }>;
          totalSpecies?: unknown;
        } | null;
        if (cancelled || !response.ok || !Array.isArray(payload?.fishDex)) return;
        setDexSnapshot({
          fishDex: payload.fishDex
            .filter((entry): entry is { species: string; catchCount: number } =>
              typeof entry?.species === "string" && typeof entry.catchCount === "number")
            .map((entry) => ({ species: entry.species, catchCount: entry.catchCount })),
          totalSpecies: typeof payload.totalSpecies === "number" ? payload.totalSpecies : fishingSpeciesTotal
        });
      } catch {
        // The dex strip is decorative; a failed fetch just hides it.
      }
    }

    void loadDex();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const setGamePhase = useCallback((nextPhase: FishingPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
    if (gameRootRef.current) gameRootRef.current.dataset.phase = nextPhase;
  }, []);

  const publishStats = useCallback((nextStats: FishingStats) => {
    statsRef.current = nextStats;
    setStats(nextStats);
    const root = gameRootRef.current;
    if (!root) return;
    root.dataset.nets = String(nextStats.netsRemaining);
    root.dataset.coins = String(nextStats.coins);
    root.dataset.elapsed = String(nextStats.elapsedSeconds);
  }, []);

  const nextFishingQuestion = useCallback(() => {
    const availableQuestions = questionsRef.current;
    if (!availableQuestions.length) return null;
    // Skip questions already answered correctly: the reward API only pays one
    // coin per distinct correct question, so re-serving a banked question
    // would let on-screen coins drift away from the server's count.
    for (let step = 0; step < availableQuestions.length; step += 1) {
      const question = availableQuestions[nextQuestionIndexRef.current % availableQuestions.length];
      nextQuestionIndexRef.current += 1;
      if (!correctCaughtQuestionIdsRef.current.has(question.id)) return question;
    }
    const question = availableQuestions[nextQuestionIndexRef.current % availableQuestions.length];
    nextQuestionIndexRef.current += 1;
    return question;
  }, []);

  const clearSettlementTimers = useCallback(() => {
    if (settlementDelayTimerRef.current !== null) {
      window.clearTimeout(settlementDelayTimerRef.current);
      settlementDelayTimerRef.current = null;
    }
    if (settlementTimeoutTimerRef.current !== null) {
      window.clearTimeout(settlementTimeoutTimerRef.current);
      settlementTimeoutTimerRef.current = null;
    }
  }, []);

  const nextFeedback = useCallback((kind: FishingFeedbackKind, title: LocalizedText, detail: LocalizedText): FishingFeedback => {
    feedbackIdRef.current += 1;
    return {
      id: feedbackIdRef.current,
      kind,
      title: tRef.current(title),
      detail: tRef.current(detail)
    };
  }, []);

  const showImpactFeedback = useCallback((kind: "hit" | "miss", title: LocalizedText, detail: LocalizedText) => {
    setImpactFeedback(nextFeedback(kind, title, detail));
  }, [nextFeedback]);

  const showRewardFeedback = useCallback((title: LocalizedText, detail: LocalizedText) => {
    setRewardFeedback(nextFeedback("coin", title, detail));
  }, [nextFeedback]);

  const submitResult = useCallback(async () => {
    const latestPayload = payloadRef.current;
    if (!latestPayload || hasSubmittedRef.current) return;

    hasSubmittedRef.current = true;
    const runId = submitRunIdRef.current + 1;
    submitRunIdRef.current = runId;
    const controller = new AbortController();
    submitAbortControllerRef.current = controller;
    clearSettlementTimers();
    setSettlementDelayed(false);
    gameControlRef.current?.stop();
    setGamePhase("submitting");
    setStatusMessage(tRef.current({ en: "Securing your reward. This usually takes a moment.", zh: "正在記錄你的獎勵，通常只需片刻。" }));
    settlementDelayTimerRef.current = window.setTimeout(() => {
      if (submitRunIdRef.current === runId && phaseRef.current === "submitting") {
        setSettlementDelayed(true);
        setStatusMessage(tRef.current({ en: "Still securing your reward. You can retry if this keeps waiting.", zh: "仍在記錄獎勵。如等待太久，可以重試提交。" }));
      }
    }, settlementRetryDelayMs);
    settlementTimeoutTimerRef.current = window.setTimeout(() => {
      if (submitRunIdRef.current === runId && phaseRef.current === "submitting") controller.abort();
    }, settlementSubmitTimeoutMs);

    try {
      const response = await fetch("/api/gamification/fishing-game/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...latestPayload,
          caughtQuestionIds: Array.from(caughtQuestionIdsRef.current),
          correctCaughtQuestionIds: Array.from(correctCaughtQuestionIdsRef.current),
          caughtSpecies: correctCaughtSpeciesRef.current,
          coins: statsRef.current.coins,
          netsUsed: statsRef.current.netsUsed,
          durationSeconds: Math.min(fishingDurationSeconds, statsRef.current.elapsedSeconds)
        })
      });
      const result = readFishingCompletion(await response.json().catch(() => null));
      const expectedCompletionStatus = response.ok || [403, 409, 422].includes(response.status);
      if (!expectedCompletionStatus || !result) throw new Error("Could not record Fishing reward.");
      if (submitRunIdRef.current !== runId) return;
      clearSettlementTimers();
      submitAbortControllerRef.current = null;
      setSettlementDelayed(false);
      setCompletion(result);
      // Stars follow the server-confirmed coin count, so the ceremony can
      // never celebrate more than the reward pipeline actually verified.
      const runStars = fishingRunStars(result.coins);
      const starCount = earnedStarCount(runStars);
      const bestStorageKey = gameBestStorageKey(currentUser?.id);
      const bestRecord = readGameBestRecord(window.localStorage.getItem(bestStorageKey));
      const runKey = bestRunKey("fishing-master", latestPayload.topicId);
      const newBest = isNewBestRun(bestRecord, runKey, starCount);
      window.localStorage.setItem(bestStorageKey, JSON.stringify(withBestRun(bestRecord, runKey, starCount)));
      const rewardLine = (result.status === "awarded" || result.status === "capped") && result.coins > 0
        ? tRef.current({
            en: `+${result.reward.xp} XP · +${result.reward.rewardPoints} points`,
            zh: `+${result.reward.xp} XP · +${result.reward.rewardPoints} 積分`
          })
        : null;
      const bonusParts: string[] = [];
      if (result.rarityBonus > 0) {
        bonusParts.push(tRef.current({ en: `Rarity bonus +${result.rarityBonus}`, zh: `稀有度獎勵 +${result.rarityBonus}` }));
      }
      if (result.dex?.newSpecies.length) {
        const names = result.dex.newSpecies
          .map((species) => tRef.current(creatureDisplayNames[species] ?? { en: species, zh: species }))
          .join(", ");
        bonusParts.push(tRef.current({ en: `New species: ${names}`, zh: `新物種：${names}` }));
      }
      if (result.dex) {
        bonusParts.push(tRef.current({
          en: `Fish-dex ${result.dex.caughtCount}/${result.dex.totalSpecies}`,
          zh: `魚類圖鑑 ${result.dex.caughtCount}/${result.dex.totalSpecies}`
        }));
      }
      setCeremony({ stars: runStars, newBest, rewardLine, bonusLine: bonusParts.length ? bonusParts.join(" · ") : null });
      setStatusMessage(tRef.current(completionCopy(result.status)));
      setGamePhase("submitted");
      if ((result.status === "awarded" || result.status === "capped") && result.coins > 0) playGameSound("fanfare");
    } catch (error) {
      if (submitRunIdRef.current !== runId) return;
      clearSettlementTimers();
      submitAbortControllerRef.current = null;
      setSettlementDelayed(error instanceof DOMException && error.name === "AbortError");
      setStatusMessage(tRef.current(
        error instanceof DOMException && error.name === "AbortError"
          ? { en: "Reward submission took too long. Please retry when you are ready.", zh: "獎勵提交等待過久。準備好後請重試。" }
          : { en: "Could not submit the Fishing run yet. Please retry.", zh: "暫時未能提交捕魚回合，請重試。" }
      ));
      setGamePhase("ended");
      hasSubmittedRef.current = false;
    }
  }, [clearSettlementTimers, currentUser?.id, playGameSound, setGamePhase]);

  useEffect(() => {
    return () => {
      clearSettlementTimers();
      submitAbortControllerRef.current?.abort();
      submitAbortControllerRef.current = null;
    };
  }, [clearSettlementTimers]);

  const endGame = useCallback(() => {
    if (phaseRef.current === "ended" || phaseRef.current === "submitting" || phaseRef.current === "submitted") return;
    setChallenge(null);
    setGamePhase("ended");
    void submitResult();
  }, [setGamePhase, submitResult]);

  useEffect(() => {
    const nextPayload = readFishingRoundPayload(window.sessionStorage.getItem(fishingRoundStorageKey));
    if (!currentUser) {
      setPayload(null);
      payloadRef.current = null;
      setQuestionLoadState("idle");
      setRendererLoadState("idle");
      setLoadErrorCode("auth");
      setLoadError(tRef.current({ en: "Log in to play Fishing Master.", zh: "登入後才可進入捕魚達人。" }));
      setGamePhase("locked");
      return;
    }

    if (!nextPayload || nextPayload.accuracyPercent < 80 || nextPayload.roundQuestionIds.length !== 5) {
      setPayload(null);
      payloadRef.current = null;
      setQuestionLoadState("idle");
      setRendererLoadState("idle");
      setLoadErrorCode("eligibility");
      setLoadError(tRef.current({ en: "Clear Adventure Island, then complete another same-topic 5-question Practice Arena round with 80%+ accuracy first.", zh: "請先通關探险岛，再完成同課題另一次 5 題練習場回合並達到 80%+ 準確率。" }));
      setGamePhase("locked");
      return;
    }

    setPayload(nextPayload);
    payloadRef.current = nextPayload;
    setQuestionLoadState("idle");
    setRendererLoadState("idle");
    setLoadErrorCode("");
    setLoadError("");
  }, [currentUser, setGamePhase]);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    const controller = new AbortController();
    const activeTimeouts = new Set<number>();
    const activePayload = payload;

    async function withQuestionLoadTimeout<T>(task: Promise<T>) {
      let timeout: number | null = null;
      try {
        return await Promise.race([
          task,
          new Promise<never>((_, reject) => {
            timeout = window.setTimeout(() => {
              controller.abort();
              reject(new Error("questions-timeout"));
            }, resourceLoadTimeoutMs);
            activeTimeouts.add(timeout);
          })
        ]);
      } finally {
        if (timeout !== null) {
          window.clearTimeout(timeout);
          activeTimeouts.delete(timeout);
        }
      }
    }

    async function loadQuestions() {
      let failureKind = "questions";

      try {
        setGamePhase("loading");
        setQuestionLoadState("loading");
        setRendererLoadState("idle");
        setLoadErrorCode("");
        const eligibilityResponse = await withQuestionLoadTimeout(fetch(`/api/gamification/adventure-island?${adventureEligibilitySearchParams(activePayload).toString()}`, {
          cache: "no-store",
          signal: controller.signal
        }));
        const eligibility = readAdventureEligibility(await withQuestionLoadTimeout(eligibilityResponse.json().catch(() => null)));
        if (!eligibilityResponse.ok || !eligibility?.alreadyCompleted || !eligibility.postAdventurePracticeEligible) {
          failureKind = "adventure-chain";
          throw new Error("Adventure Island chain is incomplete.");
        }

        const response = await withQuestionLoadTimeout(fetch(`/api/questions?topicId=${encodeURIComponent(activePayload.topicId)}&curriculumTrack=${encodeURIComponent(currentUser?.curriculumTrack ?? "HK")}`, {
          cache: "no-store",
          signal: controller.signal
        }));
        const nextQuestions = readQuestions(await withQuestionLoadTimeout(response.json().catch(() => null)));
        if (!response.ok || !nextQuestions.length) throw new Error("Could not load Fishing questions.");
        if (cancelled) return;

        setQuestionLoadState("ready");
        setQuestions(nextQuestions);
        questionsRef.current = nextQuestions;
        nextQuestionIndexRef.current = 0;
        caughtQuestionIdsRef.current = new Set();
        correctCaughtQuestionIdsRef.current = new Set();
        correctCaughtSpeciesRef.current = {};
        activeCreatureCountRef.current = 0;
        hasSubmittedRef.current = false;
        setCompletion(null);
        setCeremony(null);
        setChallenge(null);
        setStatusMessage("");
        setImpactFeedback(null);
        setRewardFeedback(null);
        setSettlementDelayed(false);
        publishStats(defaultStats);
        setGamePhase("welcome");
      } catch (error) {
        if (!cancelled) {
          setQuestionLoadState("failed");
          setRendererLoadState("idle");
          if (controller.signal.aborted || (error instanceof Error && error.message === "questions-timeout")) failureKind = "questions-timeout";
          setLoadErrorCode(failureKind);
          setLoadError(
            tRef.current(failureKind === "adventure-chain"
              ? { en: "Clear Adventure Island for this topic, then complete another same-topic 5-question 80%+ round before starting Fishing Master.", zh: "請先通關本課題探险岛，再完成一次同課題 5 題 80%+ 回合，才可開始捕魚達人。" }
              : { en: "Could not prepare Fishing Master questions.", zh: "暫時未能準備捕魚達人題目。" })
          );
          setGamePhase("locked");
        }
      }
    }

    void loadQuestions();

    return () => {
      cancelled = true;
      controller.abort();
      activeTimeouts.forEach((timeout) => window.clearTimeout(timeout));
      activeTimeouts.clear();
    };
  }, [currentUser?.curriculumTrack, payload, publishStats, setGamePhase]);

  useEffect(() => {
    if (!timerRunsInPhase(phase)) return;

    const timer = window.setInterval(() => {
      const nextElapsedSeconds = Math.min(fishingDurationSeconds, statsRef.current.elapsedSeconds + 1);
      publishStats({ ...statsRef.current, elapsedSeconds: nextElapsedSeconds });
      if (nextElapsedSeconds >= fishingDurationSeconds) endGame();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endGame, phase, publishStats]);

  useEffect(() => {
    if (!payload || questions.length === 0 || !gameRootRef.current) return;

    let destroyed = false;
    let game: Phaser.Game | null = null;
    let rendererResolved = false;
    let rendererTimeout: number | null = null;

    const clearRendererTimeout = () => {
      if (rendererTimeout !== null) {
        window.clearTimeout(rendererTimeout);
        rendererTimeout = null;
      }
    };

    const failRendererStart = (code: "phaser" | "phaser-timeout") => {
      if (destroyed || rendererResolved) return;
      rendererResolved = true;
      clearRendererTimeout();
      gameControlRef.current = null;
      game?.destroy(true);
      game = null;
      setRendererLoadState("failed");
      setLoadErrorCode(code);
      setLoadError(tRef.current({ en: "Could not start the Fishing renderer.", zh: "暫時未能啟動捕魚畫面。" }));
      setGamePhase("locked");
    };

    const markRendererReady = () => {
      if (destroyed || rendererResolved) return;
      rendererResolved = true;
      clearRendererTimeout();
      setRendererLoadState("ready");
    };

    const startRendererTimeout = () => {
      clearRendererTimeout();
      rendererTimeout = window.setTimeout(() => failRendererStart("phaser-timeout"), resourceLoadTimeoutMs);
    };

    async function bootGame() {
      let loaded: Awaited<ReturnType<typeof importPhaserWithTimeout>>;
      try {
        setRendererLoadState("loading");
        setLoadErrorCode("");
        startRendererTimeout();
        loaded = await importPhaserWithTimeout();
      } catch {
        failRendererStart("phaser-timeout");
        return;
      }

      if (destroyed || !gameRootRef.current) return;

      try {
        const Phaser = ((loaded as { default?: typeof import("phaser") }).default ?? loaded) as typeof import("phaser");
        const root = gameRootRef.current;
        root.innerHTML = "";
        root.dataset.nets = String(statsRef.current.netsRemaining);
        root.dataset.coins = String(statsRef.current.coins);
        root.dataset.elapsed = String(statsRef.current.elapsedSeconds);

      class FishingScene extends Phaser.Scene {
        private creatures!: Phaser.Physics.Arcade.Group;
        private net!: Phaser.GameObjects.Graphics;
        private cannonBase!: Phaser.GameObjects.Graphics;
        private cannonBarrel!: Phaser.GameObjects.Container;
        private aimGuide!: Phaser.GameObjects.Graphics;
        private isCasting = false;
        private cannonAngle = defaultCannonAngle;
        private lastCatch: { species: string; name: string } | null = null;
        private readonly cannonX = 805;
        private readonly cannonY = 505;
        private readonly cannonLength = 105;

        constructor() {
          super("FishingScene");
        }

        create() {
          this.physics.world.setBounds(0, 0, fishingStageWidth, fishingStageHeight);
          this.cameras.main.setBackgroundColor("#075985");
          this.createTextures();
          this.add.rectangle(480, 270, fishingStageWidth, fishingStageHeight, 0x0ea5e9).setAlpha(0.25);
          this.add.rectangle(480, 515, fishingStageWidth, 70, 0x064e3b).setAlpha(0.26);

          for (let index = 0; index < 16; index += 1) {
            this.add.circle(80 + index * 58, 70 + (index % 5) * 74, 3 + (index % 4), 0xe0f2fe, 0.35);
          }

          this.creatures = this.physics.add.group({ allowGravity: false });
          const creatureSeeds: Array<[string, number, number, number, number, string, number]> = [
            ["smallFish", 130, 120, 86, 18, "Small fish", 1],
            ["shark", 310, 215, -62, 10, "Shark", 1.15],
            ["octopus", 520, 145, 48, -12, "Octopus", 1],
            ["stingray", 600, 310, 58, -8, "Stingray", 1.08],
            ["lobster", 760, 285, -76, 16, "Lobster", 1],
            ["blueFish", 210, 365, 70, -10, "Blue fish", 1],
            ["goldFish", 690, 405, -54, 14, "Golden fish", 1]
          ];
          creatureSeeds.forEach(([texture, x, y, vx, vy, name, scale]) => {
            const creature = this.creatures.create(Number(x), Number(y), String(texture)) as Phaser.Physics.Arcade.Sprite;
            creature.setData("name", String(name));
            creature.setData("species", String(texture));
            creature.setVelocity(Number(vx), Number(vy));
            creature.setBounce(1, 1);
            creature.setCollideWorldBounds(true);
            creature.setScale(scale);
            // Rare and epic creatures glow so aiming at them feels like a
            // deliberate, higher-stakes shot.
            const rarity = creatureRarityFor(String(texture));
            if (rarity.tier >= 2) {
              const glow = this.add.circle(Number(x), Number(y), 38, rarity.glowColor, 0.22).setDepth(1);
              creature.setData("glow", glow);
              this.tweens.add({
                targets: glow,
                alpha: 0.42,
                scale: 1.15,
                duration: 700,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
              });
            }
          });

          activeCreatureCountRef.current = this.creatures.getLength();
          this.createCannon();
          this.net = this.add.graphics();
          root.dataset.fishCount = String(activeCreatureCountRef.current);
          root.dataset.creatureNames = creatureSeeds.map(([, , , , , name]) => name).join(",");
          root.dataset.lastCast = "";
          root.dataset.catchEffect = "";
          root.dataset.lastRarity = "";

          gameControlRef.current = {
            aimLeft: () => this.aimCannon(-cannonKeyboardNudgeDegrees),
            aimRight: () => this.aimCannon(cannonKeyboardNudgeDegrees),
            aimBy: (delta) => this.aimCannon(delta),
            aimAt: (stageX, stageY) => this.aimAtPoint(stageX, stageY),
            fireNet: () => this.fireNet(),
            celebrateCatch: () => this.celebrateCatch(),
            escapeCatch: () => this.escapeCatch(),
            resume: () => {
              this.isCasting = false;
              this.physics.world.resume();
            },
            stop: () => {
              this.physics.world.pause();
            }
          };

          if (phaseRef.current !== "ready") this.physics.world.pause();
          markRendererReady();
        }

        update() {
          this.creatures.getChildren().forEach((child) => {
            const creature = child as Phaser.Physics.Arcade.Sprite;
            if (!creature.active) return;
            if (creature.body?.blocked.left || creature.body?.blocked.right) creature.toggleFlipX();
            const glow = creature.getData("glow") as Phaser.GameObjects.Arc | undefined;
            if (glow) glow.setPosition(creature.x, creature.y);
          });
        }

        private createTextures() {
          const fish = this.make.graphics({ x: 0, y: 0 }, false);
          fish.fillStyle(0x22d3ee, 1);
          fish.fillEllipse(28, 18, 48, 25);
          fish.fillTriangle(6, 18, 0, 6, 0, 30);
          fish.fillStyle(0x0f172a, 1);
          fish.fillCircle(42, 15, 3);
          fish.generateTexture("smallFish", 58, 36);
          fish.clear();
          fish.fillStyle(0x38bdf8, 1);
          fish.fillEllipse(28, 18, 48, 25);
          fish.fillTriangle(6, 18, 0, 6, 0, 30);
          fish.fillStyle(0xf8fafc, 1);
          fish.fillCircle(42, 15, 3);
          fish.generateTexture("blueFish", 58, 36);
          fish.clear();
          fish.fillStyle(0xfacc15, 1);
          fish.fillEllipse(28, 18, 48, 25);
          fish.fillTriangle(6, 18, 0, 6, 0, 30);
          fish.fillStyle(0x7c2d12, 1);
          fish.fillCircle(42, 15, 3);
          fish.generateTexture("goldFish", 58, 36);
          fish.destroy();

          const stingray = this.make.graphics({ x: 0, y: 0 }, false);
          stingray.fillStyle(0x8b5cf6, 1);
          stingray.fillTriangle(16, 30, 48, 6, 88, 30);
          stingray.fillTriangle(16, 30, 48, 54, 88, 30);
          stingray.fillTriangle(85, 29, 116, 18, 98, 35);
          stingray.fillTriangle(85, 31, 116, 44, 98, 25);
          stingray.fillStyle(0xf0abfc, 0.95);
          stingray.fillCircle(43, 25, 3);
          stingray.fillCircle(58, 25, 3);
          stingray.generateTexture("stingray", 122, 62);
          stingray.destroy();

          const shark = this.make.graphics({ x: 0, y: 0 }, false);
          shark.fillStyle(0x64748b, 1);
          shark.fillEllipse(46, 24, 82, 34);
          shark.fillTriangle(12, 24, 0, 6, 0, 42);
          shark.fillTriangle(50, 8, 68, 0, 63, 18);
          shark.fillStyle(0x0f172a, 1);
          shark.fillCircle(72, 19, 3);
          shark.generateTexture("shark", 92, 52);
          shark.destroy();

          const octopus = this.make.graphics({ x: 0, y: 0 }, false);
          octopus.fillStyle(0xc084fc, 1);
          octopus.fillCircle(28, 22, 20);
          [10, 20, 30, 40, 50].forEach((x) => octopus.fillRoundedRect(x, 35, 7, 20, 4));
          octopus.fillStyle(0x0f172a, 1);
          octopus.fillCircle(21, 19, 3);
          octopus.fillCircle(34, 19, 3);
          octopus.generateTexture("octopus", 62, 60);
          octopus.destroy();

          const lobster = this.make.graphics({ x: 0, y: 0 }, false);
          lobster.fillStyle(0xfb7185, 1);
          lobster.fillEllipse(36, 25, 50, 22);
          lobster.fillCircle(66, 18, 10);
          lobster.fillCircle(66, 32, 10);
          lobster.fillRect(8, 18, 16, 14);
          lobster.generateTexture("lobster", 82, 52);
          lobster.destroy();

          const coin = this.make.graphics({ x: 0, y: 0 }, false);
          coin.fillStyle(0xfacc15, 1);
          coin.fillCircle(13, 13, 11);
          coin.lineStyle(3, 0xf59e0b, 1);
          coin.strokeCircle(13, 13, 8);
          coin.generateTexture("fishingCoin", 26, 26);
          coin.destroy();
        }

        private createCannon() {
          this.aimGuide = this.add.graphics().setDepth(6);
          this.cannonBase = this.add.graphics().setDepth(8);
          this.cannonBase.fillStyle(0xf59e0b, 1);
          this.cannonBase.fillRoundedRect(this.cannonX - 48, this.cannonY - 18, 96, 32, 10);
          this.cannonBase.fillStyle(0x78350f, 1);
          this.cannonBase.fillCircle(this.cannonX, this.cannonY, 30);
          this.cannonBase.fillStyle(0xfacc15, 1);
          this.cannonBase.fillCircle(this.cannonX, this.cannonY, 20);
          this.cannonBase.fillStyle(0x0f766e, 1);
          this.cannonBase.fillCircle(this.cannonX, this.cannonY, 10);

          const barrel = this.add.graphics();
          barrel.fillStyle(0xfbbf24, 1);
          barrel.fillRoundedRect(0, -14, this.cannonLength, 28, 12);
          barrel.fillStyle(0xfef3c7, 1);
          barrel.fillRoundedRect(76, -20, 34, 40, 12);
          barrel.fillStyle(0x78350f, 1);
          barrel.fillCircle(this.cannonLength + 4, 0, 16);
          barrel.fillStyle(0x155e75, 1);
          barrel.fillCircle(this.cannonLength + 4, 0, 9);
          this.cannonBarrel = this.add.container(this.cannonX, this.cannonY, [barrel]).setDepth(9);
          this.updateCannonRotation();
        }

        private updateCannonRotation() {
          this.cannonBarrel.setRotation(Phaser.Math.DegToRad(this.cannonAngle));
          root.dataset.cannonAngle = String(Math.round(this.cannonAngle));
          setCannonAngle(Math.round(this.cannonAngle));
          this.drawAimGuide();
        }

        private aimCannon(delta: number) {
          if (!aimingAllowedInPhase(phaseRef.current)) return;
          this.cannonAngle = Phaser.Math.Clamp(this.cannonAngle + delta, minCannonAngle, maxCannonAngle);
          this.updateCannonRotation();
        }

        private aimAtPoint(stageX: number, stageY: number) {
          if (!aimingAllowedInPhase(phaseRef.current)) return;
          const dx = stageX - this.cannonX;
          const dy = stageY - this.cannonY;
          if (Math.hypot(dx, dy) < 24) return;
          this.cannonAngle = Phaser.Math.Clamp(Phaser.Math.RadToDeg(Math.atan2(dy, dx)), minCannonAngle, maxCannonAngle);
          this.updateCannonRotation();
        }

        private cannonMuzzle() {
          const radians = Phaser.Math.DegToRad(this.cannonAngle);
          return {
            x: this.cannonX + Math.cos(radians) * this.cannonLength,
            y: this.cannonY + Math.sin(radians) * this.cannonLength
          };
        }

        private drawAimGuide() {
          if (!this.aimGuide) return;
          const start = this.cannonMuzzle();
          const radians = Phaser.Math.DegToRad(this.cannonAngle);
          const end = {
            x: start.x + Math.cos(radians) * 320,
            y: start.y + Math.sin(radians) * 320
          };

          this.aimGuide.clear();
          this.aimGuide.lineStyle(3, 0xfef9c3, 0.62);
          this.aimGuide.lineBetween(start.x, start.y, end.x, end.y);
          this.aimGuide.lineStyle(1, 0x0f172a, 0.32);
          this.aimGuide.strokeCircle(end.x, end.y, 13);
        }

        private showImpactBurst(x: number, y: number, kind: "hit" | "miss") {
          const clampedX = Phaser.Math.Clamp(x, 36, fishingStageWidth - 36);
          const clampedY = Phaser.Math.Clamp(y, 36, fishingStageHeight - 36);
          const color = kind === "hit" ? 0xfacc15 : 0x7dd3fc;
          const label = kind === "hit" ? "CATCH!" : "SPLASH";
          const burst = this.add.graphics().setDepth(14);
          const text = this.add.text(clampedX, clampedY - 44, label, {
            color: kind === "hit" ? "#fef3c7" : "#e0f2fe",
            fontFamily: "Arial, sans-serif",
            fontSize: "22px",
            fontStyle: "bold",
            stroke: "#0f172a",
            strokeThickness: 5
          }).setOrigin(0.5).setDepth(15);

          burst.lineStyle(5, color, 0.95);
          burst.strokeCircle(clampedX, clampedY, 18);
          burst.lineStyle(2, 0xffffff, 0.75);
          burst.strokeCircle(clampedX, clampedY, 31);

          this.tweens.add({
            targets: burst,
            alpha: 0,
            scale: 1.8,
            duration: 540,
            ease: "Sine.easeOut",
            onComplete: () => burst.destroy()
          });
          this.tweens.add({
            targets: text,
            y: clampedY - 74,
            alpha: 0,
            duration: 720,
            ease: "Back.easeOut",
            onComplete: () => text.destroy()
          });
        }

        private hitCreatureAt(x: number, y: number) {
          const activeCreatures = this.creatures.getChildren().filter((child) => (child as Phaser.Physics.Arcade.Sprite).active);
          for (const child of activeCreatures) {
            const creature = child as Phaser.Physics.Arcade.Sprite;
            const hitRadius = Math.max(28, Math.min(58, Math.max(creature.displayWidth, creature.displayHeight) * 0.45));
            if (Phaser.Math.Distance.Between(x, y, creature.x, creature.y) <= hitRadius) return creature;
          }
          return null;
        }

        private fireNet() {
          if (this.isCasting || phaseRef.current !== "ready") return;
          const currentStats = statsRef.current;
          if (currentStats.netsRemaining <= 0) {
            endGame();
            return;
          }
          if (activeCreatureCountRef.current <= 0) {
            endGame();
            return;
          }

          publishStats({
            ...currentStats,
            netsRemaining: currentStats.netsRemaining - 1,
            netsUsed: currentStats.netsUsed + 1
          });
          this.isCasting = true;
          setStatusMessage("");
          setGamePhase("casting");
          playGameSound("throw");
          root.dataset.lastCast = "casting";
          this.net.clear();
          this.net.lineStyle(4, 0xf8fafc, 0.9);
          const start = this.cannonMuzzle();
          const radians = Phaser.Math.DegToRad(this.cannonAngle);
          const end = {
            x: start.x + Math.cos(radians) * 920,
            y: start.y + Math.sin(radians) * 920
          };
          let caughtTarget: Phaser.Physics.Arcade.Sprite | null = null;
          let catchX = 0;
          let catchY = 0;

          this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 700,
            ease: "Sine.easeOut",
            onUpdate: (tween) => {
              const progress = Number(tween.getValue() ?? 0);
              const x = start.x + (end.x - start.x) * progress;
              const y = start.y + (end.y - start.y) * progress;
              this.net.clear();
              this.net.lineStyle(3, 0xf8fafc, 0.9);
              this.net.strokeCircle(x, y, 20 + progress * 12);
              this.net.lineBetween(start.x, start.y, x, y);
              if (!caughtTarget) {
                const hit = this.hitCreatureAt(x, y);
                if (hit) {
                  caughtTarget = hit;
                  catchX = x;
                  catchY = y;
                  const rarity = creatureRarityFor(String(hit.getData("species") ?? ""));
                  const hitName = String(hit.getData("name") ?? "Sea creature");
                  root.dataset.lastCast = "hit";
                  root.dataset.lastFeedback = "hit";
                  root.dataset.lastRarity = rarity.id;
                  this.showImpactBurst(x, y, "hit");
                  spawnRippleRings(this, x, y);
                  playGameSound("splash");
                  showImpactFeedback(
                    "hit",
                    { en: `Nice catch! ${"★".repeat(rarity.stars)}`, zh: `捕獲成功！${"★".repeat(rarity.stars)}` },
                    {
                      en: `${hitName} — ${rarity.label.en}. Reel it in, then solve the challenge to bank the coin.`,
                      zh: `${hitName} — ${rarity.label.zh}。收線後答對挑戰即可收入金幣。`
                    }
                  );
                  this.physics.world.pause();
                }
              }
            },
            onComplete: () => {
              this.net.clear();
              if (!caughtTarget) {
                const rippleX = Phaser.Math.Clamp(end.x, 36, fishingStageWidth - 36);
                const rippleY = Phaser.Math.Clamp(end.y, 36, fishingStageHeight - 36);
                root.dataset.lastCast = "miss";
                root.dataset.lastFeedback = "miss";
                this.showImpactBurst(end.x, end.y, "miss");
                spawnRippleRings(this, rippleX, rippleY);
                playGameSound("splash");
                this.isCasting = false;
                showImpactFeedback(
                  "miss",
                  { en: "Missed the catch", zh: "這次未命中" },
                  { en: "The splash shows where the net landed. Adjust and fire again.", zh: "水花標出魚網落點，調整方向再試一次。" }
                );
                setStatusMessage(tRef.current({ en: "The net missed. Aim the cannon and try again.", zh: "魚網未命中。調整炮台方向再試一次。" }));
                if (statsRef.current.netsRemaining <= 0) {
                  endGame();
                  return;
                }
                setGamePhase("ready");
                return;
              }

              this.playCatchAndReel(caughtTarget, catchX, catchY);
            }
          });
        }

        // The M2 catch celebration: the wrapped creature struggles, then the
        // net reels it along a sagging rope to the cannon, and only then does
        // the math challenge open. Coins stay tied to distinct correct
        // answers — nothing here touches the reward evidence.
        private playCatchAndReel(creature: Phaser.Physics.Arcade.Sprite, catchX: number, catchY: number) {
          const question = nextFishingQuestion();
          if (!question) {
            this.isCasting = false;
            if (statsRef.current.netsRemaining <= 0) endGame();
            else {
              this.physics.world.resume();
              setGamePhase("ready");
            }
            return;
          }

          const species = String(creature.getData("species") ?? "");
          const creatureName = String(creature.getData("name") ?? creatureNames[nextQuestionIndexRef.current % creatureNames.length]);
          const rarity = creatureRarityFor(species);
          this.lastCatch = { species, name: creatureName };
          root.dataset.catchEffect = "reeling";

          const glow = creature.getData("glow") as Phaser.GameObjects.Arc | undefined;
          glow?.destroy();
          creature.setData("glow", undefined);
          creature.disableBody(true, false);
          creature.setDepth(15);
          activeCreatureCountRef.current = Math.max(0, activeCreatureCountRef.current - 1);
          root.dataset.fishCount = String(activeCreatureCountRef.current);
          playGameSound("catch");
          spawnBubbleBurst(this, catchX, catchY);

          const muzzle = this.cannonMuzzle();
          const openChallenge = () => {
            this.net.clear();
            creature.setVisible(false);
            root.dataset.catchEffect = "landed";
            // The 120s clock keeps running while reeling; if the round ended
            // mid-reel the settlement owns the screen and no question may open.
            if (phaseRef.current === "ended" || phaseRef.current === "submitting" || phaseRef.current === "submitted") return;
            caughtQuestionIdsRef.current.add(question.id);
            this.physics.world.pause();
            setChallenge({ creatureName, rarity, species, question });
            setGamePhase("challenge");
          };

          if (prefersReducedMotion()) {
            this.time.delayedCall(catchReelSpec.reducedMotionDelayMs, openChallenge);
            return;
          }

          playStruggleWiggle(this, creature, () => {
            playGameSound("reel");
            playReelIn(this, creature, muzzle, (x, y, progress) => {
              const netRadius = catchReelSpec.netRadiusStartPx - (catchReelSpec.netRadiusStartPx - catchReelSpec.netRadiusEndPx) * progress;
              this.net.clear();
              this.net.lineStyle(3, 0xf8fafc, 0.9);
              this.net.lineBetween(muzzle.x, muzzle.y, x, y);
              this.net.strokeCircle(x, y, netRadius);
            }, openChallenge);
          });
        }

        // Correct answer: the catch is banked — a coin arcs from the cannon
        // to the HUD counter.
        private celebrateCatch() {
          const muzzle = this.cannonMuzzle();
          spawnCoinFly(this, muzzle.x, muzzle.y - 12, 1, "fishingCoin");
          spawnCombatText(this, muzzle.x, muzzle.y - 46, "+1", { color: "#facc15" });
          this.lastCatch = null;
        }

        // Wrong answer: the one that got away swims back off screen.
        private escapeCatch() {
          if (!this.lastCatch) return;
          const muzzle = this.cannonMuzzle();
          playEscapeSwim(this, muzzle.x, muzzle.y - 8, this.lastCatch.species, -90);
          this.lastCatch = null;
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: root,
        width: fishingStageWidth,
        height: fishingStageHeight,
        backgroundColor: "#075985",
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
          }
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: FishingScene
      });
      } catch {
        failRendererStart("phaser");
      }
    }

    void bootGame();

    return () => {
      destroyed = true;
      clearRendererTimeout();
      gameControlRef.current = null;
      game?.destroy(true);
    };
  }, [endGame, nextFishingQuestion, payload, playGameSound, publishStats, questions.length, setGamePhase, showImpactFeedback]);

  function startGame() {
    if (phase !== "welcome") return;
    setStatusMessage("");
    setImpactFeedback(null);
    setRewardFeedback(null);
    setGamePhase("ready");
    gameControlRef.current?.resume();
  }

  const fireNet = useCallback(() => {
    if (phaseRef.current !== "ready") return;

    if (statsRef.current.netsRemaining <= 0 || activeCreatureCountRef.current <= 0) {
      endGame();
      return;
    }

    const control = gameControlRef.current;
    if (!control) {
      setStatusMessage(tRef.current({ en: "The cannon is still getting ready.", zh: "炮台仍在準備中。" }));
      return;
    }

    try {
      setImpactFeedback(null);
      setRewardFeedback(null);
      control.fireNet();
    } catch {
      setStatusMessage(tRef.current({ en: "The cannon jammed. Please try again.", zh: "炮台暫時卡住，請再試一次。" }));
      setGamePhase("ready");
      control.resume();
    }
  }, [endGame, setGamePhase]);

  const stopAimHold = useCallback(() => {
    aimHoldDirectionRef.current = 0;
    if (aimHoldTimerRef.current !== null) {
      window.clearInterval(aimHoldTimerRef.current);
      aimHoldTimerRef.current = null;
    }
  }, []);

  const startAimHold = useCallback((direction: -1 | 1) => {
    if (!aimingAllowedInPhase(phaseRef.current)) return;
    aimHoldDirectionRef.current = direction;
    gameControlRef.current?.aimBy(direction * cannonKeyboardNudgeDegrees);
    if (aimHoldTimerRef.current !== null) return;

    aimHoldTimerRef.current = window.setInterval(() => {
      if (!aimingAllowedInPhase(phaseRef.current) || aimHoldDirectionRef.current === 0) {
        stopAimHold();
        return;
      }
      gameControlRef.current?.aimBy(
        aimHoldDirectionRef.current * cannonHoldDegreesPerSecond * (cannonHoldTickMs / 1000)
      );
    }, cannonHoldTickMs);
  }, [stopAimHold]);

  const aimAtStagePointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!aimingAllowedInPhase(phaseRef.current)) return;
    const canvas = event.currentTarget.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    const ratioX = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
    const ratioY = Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height)));
    gameControlRef.current?.aimAt(ratioX * fishingStageWidth, ratioY * fishingStageHeight);
  }, []);

  const handleStagePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!aimingAllowedInPhase(phaseRef.current) || event.button > 0) return;
    event.preventDefault();
    aimPointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    aimAtStagePointer(event);
  }, [aimAtStagePointer]);

  const handleStagePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (aimPointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    aimAtStagePointer(event);
  }, [aimAtStagePointer]);

  const releaseStagePointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (aimPointerIdRef.current !== event.pointerId) return;
    aimPointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleAimButtonKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, direction: -1 | 1) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    gameControlRef.current?.aimBy(direction * cannonKeyboardNudgeDegrees);
  }, []);

  useEffect(() => stopAimHold, [stopAimHold]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === "ArrowLeft" && aimingAllowedInPhase(phaseRef.current)) {
        event.preventDefault();
        if (!event.repeat) startAimHold(-1);
      }

      if (event.key === "ArrowRight" && aimingAllowedInPhase(phaseRef.current)) {
        event.preventDefault();
        if (!event.repeat) startAimHold(1);
      }

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        fireNet();
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") stopAimHold();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      stopAimHold();
    };
  }, [fireNet, startAimHold, stopAimHold]);

  const showSettlement = phase === "ended" || phase === "submitting" || phase === "submitted";
  const settlementTitle = phase === "submitting"
    ? t({ en: "Securing your reward", zh: "正在記錄獎勵" })
    : t({ en: "Fishing Master complete", zh: "捕魚達人完成" });
  const settlementDetail = completion
    ? t({
        en: `${completion.coins} coin(s) converted into ${completion.reward.xp} XP and ${completion.reward.rewardPoints} reward point(s).`,
        zh: `${completion.coins} 枚金幣已兌換成 ${completion.reward.xp} XP 和 ${completion.reward.rewardPoints} 獎勵積分。`
      })
    : phase === "submitting"
      ? settlementDelayed
        ? t({ en: "The server is taking longer than usual. Your catch is safe here while we keep trying.", zh: "伺服器比平時更慢。你的捕獲仍保留在這裡，我們會繼續嘗試。" })
        : t({ en: "Submitting the Fishing run now. Keep this page open for the reward receipt.", zh: "正在提交捕魚回合。請保留此頁以完成獎勵記錄。" })
      : t({ en: "The Fishing Master run has ended. You can submit the result again if the network was interrupted.", zh: "捕魚達人回合已結束。如網絡中斷，可以再次提交結果。" });
  const showRetrySubmit = phase === "ended" || (phase === "submitting" && settlementDelayed);

  function retrySubmitResult() {
    if (phaseRef.current === "submitting") {
      submitRunIdRef.current += 1;
      submitAbortControllerRef.current?.abort();
      submitAbortControllerRef.current = null;
      hasSubmittedRef.current = false;
      clearSettlementTimers();
      setSettlementDelayed(false);
    }
    void submitResult();
  }

  function handleChallengeAnswered(question: PublicQuestion, feedback: AttemptFeedback) {
    if (feedback.correct) {
      correctCaughtQuestionIdsRef.current.add(question.id);
      if (challenge?.species) correctCaughtSpeciesRef.current[question.id] = challenge.species;
      // Coins must equal the number of distinct correct catches: the reward
      // API rejects the whole run when the two counts disagree.
      publishStats({ ...statsRef.current, coins: correctCaughtQuestionIdsRef.current.size });
      playGameSound("coin");
      gameControlRef.current?.celebrateCatch();
      showRewardFeedback(
        { en: "+1 coin landed", zh: "+1 金幣入袋" },
        { en: "Correct catch. The reward counter updated.", zh: "答對捕獲，獎勵已加入計數。" }
      );
      setStatusMessage(tRef.current({ en: "Correct catch. +1 coin.", zh: "答對捕獲，+1 金幣。" }));
    } else {
      playGameSound("escape");
      gameControlRef.current?.escapeCatch();
      setRewardFeedback(nextFeedback(
        "settlement",
        { en: "No coin this catch — the fish got away", zh: "這次沒有金幣，魚兒溜走了" },
        { en: "Keep fishing and answer the next catch.", zh: "繼續捕魚，下一次捕獲再挑戰。" }
      ));
      setStatusMessage(tRef.current({ en: "No coin this catch. Keep going.", zh: "這次沒有金幣，繼續努力。" }));
    }

    window.setTimeout(() => {
      setChallenge(null);
      if (
        statsRef.current.netsRemaining <= 0 ||
        statsRef.current.elapsedSeconds >= fishingDurationSeconds ||
        activeCreatureCountRef.current <= 0 ||
        correctCaughtQuestionIdsRef.current.size >= questionsRef.current.length
      ) {
        endGame();
        return;
      }
      setGamePhase("ready");
      gameControlRef.current?.resume();
    }, 850);
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Practice Arena Fishing Master", zh: "練習場捕魚達人" })}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
              {t({ en: "Fishing Master", zh: "捕魚達人" })}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base sm:leading-7">
              {t({
                en: "Aim with the left and right arrow keys or by dragging on the water — you can keep re-aiming while a net is flying. Press Space or the Fire net button to cast. A math question appears only when the net reaches a creature.",
                zh: "用左右方向鍵或直接拖曳水面瞄準炮台，魚網飛行時也可以繼續調整方向。按空白鍵或發射魚網按鈕開炮。魚網命中海洋生物時才會出現數學題。"
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-300/45 bg-cyan-400/10 p-4 dark:border-cyan-200/20">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-100">
              {t({ en: "Fishing status", zh: "捕魚狀態" })}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/[0.06]">
                <p className="text-2xl font-black text-slate-950 dark:text-white">{stats.netsRemaining}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "nets", zh: "網" })}</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/[0.06]">
                <p className="text-2xl font-black text-amber-600 dark:text-amber-200">{stats.coins}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "coins", zh: "金幣" })}</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/[0.06]">
                <p className="text-2xl font-black text-cyan-700 dark:text-cyan-200">{formatGameTime(stats.elapsedSeconds)}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "time", zh: "時間" })}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loadError ? (
        <section className="glass-panel p-6 text-center">
          <p className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Fishing Master locked", zh: "捕魚達人尚未解鎖" })}</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{loadError}</p>
          <Link href="/practice" className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Back to Practice Arena", zh: "返回練習場" })}
          </Link>
        </section>
      ) : null}

      {!loadError ? (
        <section className="glass-panel overflow-hidden p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {payload ? t({ en: `Round accuracy ${payload.accuracyPercent}%`, zh: `回合準確率 ${payload.accuracyPercent}%` }) : null}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2" data-testid="fishing-aim-controls">
              <button
                type="button"
                data-testid="fishing-sound-toggle"
                aria-pressed={soundEnabled}
                aria-label={soundEnabled
                  ? t({ en: "Turn game sound off", zh: "關閉遊戲音效" })
                  : t({ en: "Turn game sound on", zh: "開啟遊戲音效" })}
                onClick={toggleSound}
                className="focus-ring grid h-11 w-11 place-items-center rounded-xl border border-slate-300/70 bg-white/90 text-base shadow-sm dark:border-white/10 dark:bg-slate-950/75"
              >
                <span aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>
              </button>
              {[
                { direction: -1 as const, label: "↖", aria: t({ en: "Aim cannon left", zh: "炮台向左瞄準" }) },
                { direction: 1 as const, label: "↗", aria: t({ en: "Aim cannon right", zh: "炮台向右瞄準" }) }
              ].map((control) => (
                <button
                  key={control.direction}
                  type="button"
                  data-testid={control.direction < 0 ? "fishing-aim-left" : "fishing-aim-right"}
                  aria-label={control.aria}
                  title={control.aria}
                  disabled={!aimingAllowedInPhase(phase)}
                  onClick={(event) => {
                    if (event.detail === 0) gameControlRef.current?.aimBy(control.direction * cannonKeyboardNudgeDegrees);
                  }}
                  onKeyDown={(event) => handleAimButtonKeyDown(event, control.direction)}
                  onPointerDown={(event) => {
                    if (event.button > 0) return;
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    startAimHold(control.direction);
                  }}
                  onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                    stopAimHold();
                  }}
                  onPointerCancel={stopAimHold}
                  onPointerLeave={stopAimHold}
                  onBlur={stopAimHold}
                  className="focus-ring grid h-11 min-w-11 touch-none place-items-center rounded-xl border border-slate-300/70 bg-white/90 text-lg font-black text-slate-800 shadow-sm transition enabled:hover:bg-cyan-100 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-950/75 dark:text-white dark:enabled:hover:bg-cyan-950"
                >
                  {control.label}
                </button>
              ))}
              <output
                data-testid="fishing-cannon-angle"
                aria-label={t({ en: "Cannon angle", zh: "炮台角度" })}
                className="min-w-[4.25rem] rounded-xl border border-cyan-300/45 bg-cyan-400/10 px-3 py-2 text-center text-sm font-black text-cyan-800 dark:text-cyan-100"
              >
                {cannonAngle}°
              </output>
              <button
                type="button"
                onClick={fireNet}
                disabled={phase !== "ready" || stats.netsRemaining <= 0}
                className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
              >
                {t({ en: "Fire net", zh: "發射魚網" })}
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-sky-900 dark:border-white/10">
            <div
              ref={gameRootRef}
              data-testid="fishing-game-stage"
              data-nets={stats.netsRemaining}
              data-coins={stats.coins}
              data-elapsed={stats.elapsedSeconds}
              data-phase={phase}
              data-question-load={questionLoadState}
              data-renderer-load={rendererLoadState}
              data-load-error={loadErrorCode}
              data-cannon-angle={cannonAngle}
              data-sound-enabled={soundEnabled}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={releaseStagePointer}
              onPointerCancel={releaseStagePointer}
              className={cn(
                "min-h-[320px] w-full",
                aimingAllowedInPhase(phase) ? "touch-none cursor-crosshair" : "",
                phase === "challenge" || phase === "submitting" ? "opacity-70" : "opacity-100"
              )}
            />
            <div className="pointer-events-none absolute right-3 top-3 flex flex-wrap justify-end gap-2">
              {[
                { label: t({ en: "Nets", zh: "魚網" }), value: stats.netsRemaining },
                { label: t({ en: "Coins", zh: "金幣" }), value: stats.coins },
                { label: t({ en: "Time", zh: "時間" }), value: formatGameTime(stats.elapsedSeconds) }
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200/70 bg-white/85 px-3 py-2 text-xs font-black text-slate-950 shadow-sm dark:border-white/10 dark:bg-slate-950/75 dark:text-white">
                  <span className="text-slate-500 dark:text-slate-400">{item.label}</span>{" "}
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
            {impactFeedback ? (
              <div
                key={impactFeedback.id}
                data-testid="fishing-impact-feedback"
                className={cn(
                  "pointer-events-none absolute left-3 top-3 z-30 max-w-[min(22rem,calc(100%-1.5rem))] rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md animate-pulse",
                  impactFeedback.kind === "hit"
                    ? "border-amber-200/80 bg-amber-300/90 text-slate-950 shadow-amber-950/20"
                    : "border-sky-100/80 bg-sky-100/90 text-sky-950 shadow-sky-950/20"
                )}
              >
                <p className="text-sm font-black">{impactFeedback.title}</p>
                <p className="mt-1 text-xs font-bold leading-5 opacity-85">{impactFeedback.detail}</p>
              </div>
            ) : null}
            {rewardFeedback ? (
              <div
                key={rewardFeedback.id}
                data-testid="fishing-reward-feedback"
                className={cn(
                  "pointer-events-none absolute bottom-3 left-3 z-30 max-w-[min(21rem,calc(100%-1.5rem))] rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md",
                  rewardFeedback.kind === "coin"
                    ? "border-yellow-200/80 bg-yellow-300/95 text-slate-950 shadow-yellow-950/20 animate-bounce"
                    : "border-slate-200/80 bg-white/90 text-slate-900 shadow-slate-950/20"
                )}
              >
                <p className="text-sm font-black">{rewardFeedback.title}</p>
                <p className="mt-1 text-xs font-bold leading-5 opacity-85">{rewardFeedback.detail}</p>
              </div>
            ) : null}
            {phase === "welcome" ? (
              <div
                data-testid="fishing-welcome"
                className="absolute inset-0 z-20 flex min-h-[320px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(125,211,252,0.48),transparent_34%),linear-gradient(180deg,#0ea5e9_0%,#075985_58%,#083344_100%)] p-5 text-center"
              >
                <div className="absolute left-[8%] top-[12%] h-14 w-14 rounded-full border border-white/30 bg-white/15" />
                <div className="absolute right-[12%] top-[18%] h-9 w-9 rounded-full border border-white/25 bg-white/10" />
                <div className="absolute bottom-[9%] left-[10%] h-20 w-32 rounded-t-full bg-cyan-950/40" />
                <div className="absolute bottom-[8%] right-[8%] h-28 w-44 rounded-t-full bg-purple-950/35" />
                <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-50/90">
                    {t({ en: "Math Fishing", zh: "數學捕魚" })}
                  </p>
                  <h2 className="mt-3 text-4xl font-black leading-tight text-white drop-shadow sm:text-5xl">
                    {t({ en: "Fishing Master", zh: "捕魚達人" })}
                  </h2>
                  <p className="mt-4 max-w-md text-sm font-bold leading-6 text-cyan-50/90 sm:text-base">
                    {t({
                      en: "Catch sea creatures with the cannon net. Solve the math question only after a real catch.",
                      zh: "用炮台發射魚網捕捉海洋生物。真正命中後才回答數學題。"
                    })}
                  </p>
                  {dexSnapshot ? (
                    <div data-testid="fishing-dex-strip" className="mt-4 w-full max-w-md">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-50/80">
                        {t({ en: `Fish-dex ${dexSnapshot.fishDex.length}/${dexSnapshot.totalSpecies}`, zh: `魚類圖鑑 ${dexSnapshot.fishDex.length}/${dexSnapshot.totalSpecies}` })}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                        {Object.keys(creatureRarities).map((species) => {
                          const caught = dexSnapshot.fishDex.find((entry) => entry.species === species);
                          const rarity = creatureRarityFor(species);
                          return (
                            <span
                              key={species}
                              data-species={species}
                              data-caught={Boolean(caught)}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[0.65rem] font-black",
                                caught
                                  ? "border-white/50 bg-white/15 text-white"
                                  : "border-white/20 bg-white/5 text-cyan-100/50"
                              )}
                              style={caught ? { borderColor: rarity.color } : undefined}
                            >
                              {caught
                                ? `${"★".repeat(rarity.stars)} ${t(creatureDisplayNames[species] ?? { en: species, zh: species })}`
                                : "?"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    data-testid="fishing-start-button"
                    onClick={startGame}
                    className="focus-ring mt-8 rounded-full border border-yellow-200 bg-gradient-to-b from-yellow-200 to-amber-500 px-10 py-4 text-lg font-black text-sky-950 shadow-[0_10px_0_rgba(120,53,15,0.55)] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_5px_0_rgba(120,53,15,0.55)]"
                  >
                    {t({ en: "Start Game", zh: "开始游戏" })}
                  </button>
                </div>
              </div>
            ) : null}
            {phase === "submitted" && completion && ceremony ? (
              <GameResultsCeremony
                show
                testId="fishing-results-ceremony"
                title={{ en: "Fishing Master!", zh: "捕魚達人！" }}
                subtitle={t(completionCopy(completion.status))}
                stars={ceremony.stars}
                countUpLabel={{ en: "Coins banked", zh: "入袋金幣" }}
                countUpValue={completion.coins}
                stats={[
                  { label: { en: "Coins", zh: "金幣" }, value: String(completion.coins) },
                  { label: { en: "Nets used", zh: "魚網" }, value: String(stats.netsUsed) },
                  { label: { en: "Time", zh: "時間" }, value: formatGameTime(stats.elapsedSeconds) }
                ]}
                rewardLine={ceremony.rewardLine}
                bonusLine={ceremony.bonusLine}
                newBest={ceremony.newBest}
                t={t}
                playSound={playGameSound}
              />
            ) : null}
          </div>

          {statusMessage ? (
            <p className="mt-3 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-800 dark:text-cyan-100">
              {statusMessage}
            </p>
          ) : null}

          {showSettlement ? (
            <div
              data-testid="fishing-settlement-panel"
              className={cn(
                "mt-4 rounded-2xl border p-4",
                phase === "submitting"
                  ? "border-cyan-300/45 bg-cyan-400/10"
                  : "border-emerald-300/45 bg-emerald-400/10"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={cn(
                    "text-lg font-black",
                    phase === "submitting" ? "text-cyan-800 dark:text-cyan-100" : "text-emerald-800 dark:text-emerald-100"
                  )}>
                    {settlementTitle}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {settlementDetail}
                  </p>
                </div>
                {phase === "submitting" ? (
                  <div className="rounded-full border border-cyan-300/45 bg-white/70 px-3 py-1.5 text-xs font-black text-cyan-800 dark:bg-white/[0.08] dark:text-cyan-100">
                    {settlementDelayed ? t({ en: "Still working", zh: "仍在處理" }) : t({ en: "Recording", zh: "記錄中" })}
                  </div>
                ) : null}
              </div>
              {phase === "submitting" ? (
                <div data-testid="fishing-settlement-progress" className="mt-4 overflow-hidden rounded-full bg-white/80 shadow-inner dark:bg-white/[0.08]">
                  <div className={cn(
                    "h-3 rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-emerald-300",
                    settlementDelayed ? "w-full animate-pulse" : "w-2/3 animate-pulse"
                  )} />
                </div>
              ) : null}
              <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 sm:grid-cols-3">
                <div className="rounded-xl bg-white/70 px-4 py-3 dark:bg-white/[0.06]">
                  {t({ en: "Coins", zh: "金幣" })}: {completion?.coins ?? stats.coins}
                </div>
                <div className="rounded-xl bg-white/70 px-4 py-3 dark:bg-white/[0.06]">
                  {t({ en: "Nets used", zh: "已用魚網" })}: {stats.netsUsed}
                </div>
                <div className="rounded-xl bg-white/70 px-4 py-3 dark:bg-white/[0.06]">
                  {t({ en: "Time", zh: "時間" })}: {formatGameTime(stats.elapsedSeconds)}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {showRetrySubmit ? (
                  <button
                    type="button"
                    data-testid="fishing-retry-submit"
                    onClick={retrySubmitResult}
                    className="focus-ring rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-emerald-300 dark:text-emerald-950"
                  >
                    {phase === "submitting"
                      ? t({ en: "Retry submit", zh: "重試提交" })
                      : t({ en: "Submit result", zh: "提交結果" })}
                  </button>
                ) : null}
                <Link href="/practice" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
                  {t({ en: "Back to Practice Arena", zh: "返回練習場" })}
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {challenge ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section
            data-testid="fishing-challenge"
            data-question-id={challenge.question.id}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950"
          >
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                {t({ en: "Caught-fish challenge", zh: "捕獲挑戰" })}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {challenge.creatureName}
              </h2>
              <p
                data-testid="fishing-challenge-rarity"
                className="mt-1 text-sm font-black tracking-wide"
                style={{ color: challenge.rarity.color }}
              >
                <span aria-hidden="true">{"★".repeat(challenge.rarity.stars)}</span> {t(challenge.rarity.label)}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {t({ en: "Answer correctly to earn 1 coin from this catch.", zh: "答對即可從這次捕獲取得 1 枚金幣。" })}
              </p>
            </div>
            <PracticeQuestionCard question={challenge.question} onAnswered={handleChallengeAnswered} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
