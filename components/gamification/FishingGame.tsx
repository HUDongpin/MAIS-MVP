"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PracticeQuestionCard } from "@/components/practice/PracticeQuestionCard";
import { useSettings } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import type { AttemptFeedback, GamificationSummary, PublicQuestion } from "@/types";

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
  question: PublicQuestion;
};

type FishingCompletion = {
  status: "awarded" | "duplicate" | "capped" | "not-eligible" | "invalid-run";
  reward: {
    xp: number;
    rewardPoints: number;
  };
  coins: number;
  gamification: GamificationSummary | null;
};
type AdventureIslandEligibility = {
  alreadyCompleted: boolean;
  postAdventurePracticeEligible: boolean;
};

type FishingControl = {
  aimLeft: () => void;
  aimRight: () => void;
  fireNet: () => void;
  resume: () => void;
  stop: () => void;
};

const fishingRoundStorageKey = "hk-math-practice-fishing-round";
const fishingDurationSeconds = 120;
const resourceLoadTimeoutMs = 12_000;
const defaultStats: FishingStats = {
  netsRemaining: 10,
  coins: 0,
  elapsedSeconds: 0,
  netsUsed: 0
};
const creatureNames = ["Small fish", "Shark", "Octopus", "Lobster", "Blue fish", "Golden fish", "Stingray"];
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

  return {
    status: candidate.status as FishingCompletion["status"],
    reward: {
      xp: candidate.reward.xp,
      rewardPoints: candidate.reward.rewardPoints
    },
    coins: candidate.coins,
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
  return phase === "ready" || phase === "casting" || phase === "challenge";
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
  const { currentUser, t } = useSettings();
  const gameRootRef = useRef<HTMLDivElement | null>(null);
  const gameControlRef = useRef<FishingControl | null>(null);
  const phaseRef = useRef<FishingPhase>("loading");
  const statsRef = useRef<FishingStats>(defaultStats);
  const questionsRef = useRef<PublicQuestion[]>([]);
  const payloadRef = useRef<FishingRoundPayload | null>(null);
  const nextQuestionIndexRef = useRef(0);
  const caughtQuestionIdsRef = useRef<Set<string>>(new Set());
  const correctCaughtQuestionIdsRef = useRef<Set<string>>(new Set());
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
  const [statusMessage, setStatusMessage] = useState("");
  const tRef = useRef(t);

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
    const question = availableQuestions[nextQuestionIndexRef.current % availableQuestions.length];
    nextQuestionIndexRef.current += 1;
    return question;
  }, []);

  const submitResult = useCallback(async () => {
    const latestPayload = payloadRef.current;
    if (!latestPayload || hasSubmittedRef.current) return;

    hasSubmittedRef.current = true;
    gameControlRef.current?.stop();
    setGamePhase("submitting");
    setStatusMessage("");

    try {
      const response = await fetch("/api/gamification/fishing-game/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...latestPayload,
          caughtQuestionIds: Array.from(caughtQuestionIdsRef.current),
          correctCaughtQuestionIds: Array.from(correctCaughtQuestionIdsRef.current),
          coins: statsRef.current.coins,
          netsUsed: statsRef.current.netsUsed,
          durationSeconds: Math.min(fishingDurationSeconds, statsRef.current.elapsedSeconds)
        })
      });
      const result = readFishingCompletion(await response.json().catch(() => null));
      const expectedCompletionStatus = response.ok || [403, 409, 422].includes(response.status);
      if (!expectedCompletionStatus || !result) throw new Error("Could not record Fishing reward.");
      setCompletion(result);
      setStatusMessage(tRef.current(completionCopy(result.status)));
      setGamePhase("submitted");
    } catch {
      setStatusMessage(tRef.current({ en: "Could not submit the Fishing run yet.", zh: "暫時未能提交捕魚回合。" }));
      setGamePhase("ended");
      hasSubmittedRef.current = false;
    }
  }, [setGamePhase]);

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
    const activePayload = payload;

    async function loadQuestions() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), resourceLoadTimeoutMs);
      let failureKind = "questions";

      try {
        setGamePhase("loading");
        setQuestionLoadState("loading");
        setRendererLoadState("idle");
        setLoadErrorCode("");
        const eligibilityResponse = await fetch(`/api/gamification/adventure-island?${adventureEligibilitySearchParams(activePayload).toString()}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const eligibility = readAdventureEligibility(await eligibilityResponse.json().catch(() => null));
        if (!eligibilityResponse.ok || !eligibility?.alreadyCompleted || !eligibility.postAdventurePracticeEligible) {
          failureKind = "adventure-chain";
          throw new Error("Adventure Island chain is incomplete.");
        }

        const response = await fetch(`/api/questions?topicId=${encodeURIComponent(activePayload.topicId)}&curriculumTrack=${encodeURIComponent(currentUser?.curriculumTrack ?? "HK")}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const nextQuestions = readQuestions(await response.json().catch(() => null));
        if (!response.ok || !nextQuestions.length) throw new Error("Could not load Fishing questions.");
        if (cancelled) return;

        setQuestionLoadState("ready");
        setQuestions(nextQuestions);
        questionsRef.current = nextQuestions;
        nextQuestionIndexRef.current = 0;
        caughtQuestionIdsRef.current = new Set();
        correctCaughtQuestionIdsRef.current = new Set();
        activeCreatureCountRef.current = 0;
        hasSubmittedRef.current = false;
        setCompletion(null);
        setChallenge(null);
        setStatusMessage("");
        publishStats(defaultStats);
        setGamePhase("welcome");
      } catch {
        if (!cancelled) {
          setQuestionLoadState("failed");
          setRendererLoadState("idle");
          if (controller.signal.aborted) failureKind = "questions-timeout";
          setLoadErrorCode(failureKind);
          setLoadError(
            tRef.current(failureKind === "adventure-chain"
              ? { en: "Clear Adventure Island for this topic, then complete another same-topic 5-question 80%+ round before starting Fishing Master.", zh: "請先通關本課題探险岛，再完成一次同課題 5 題 80%+ 回合，才可開始捕魚達人。" }
              : { en: "Could not prepare Fishing Master questions.", zh: "暫時未能準備捕魚達人題目。" })
          );
          setGamePhase("locked");
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void loadQuestions();

    return () => {
      cancelled = true;
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

    async function bootGame() {
      let loaded: Awaited<ReturnType<typeof importPhaserWithTimeout>>;
      try {
        setRendererLoadState("loading");
        setLoadErrorCode("");
        loaded = await importPhaserWithTimeout();
      } catch {
        if (!destroyed) {
          setRendererLoadState("failed");
          setLoadErrorCode("phaser-timeout");
          setLoadError(tRef.current({ en: "Could not start the Fishing renderer.", zh: "暫時未能啟動捕魚畫面。" }));
          setGamePhase("locked");
        }
        return;
      }

      if (destroyed || !gameRootRef.current) return;

      try {
        const Phaser = ((loaded as { default?: typeof import("phaser") }).default ?? loaded) as typeof import("phaser");
        const root = gameRootRef.current;
        root.innerHTML = "";
        root.dataset.phase = phaseRef.current;
        root.dataset.nets = String(statsRef.current.netsRemaining);
        root.dataset.coins = String(statsRef.current.coins);
        root.dataset.elapsed = String(statsRef.current.elapsedSeconds);

      class FishingScene extends Phaser.Scene {
        private creatures!: Phaser.Physics.Arcade.Group;
        private net!: Phaser.GameObjects.Graphics;
        private cannonBase!: Phaser.GameObjects.Graphics;
        private cannonBarrel!: Phaser.GameObjects.Container;
        private isCasting = false;
        private cannonAngle = -135;
        private readonly cannonX = 805;
        private readonly cannonY = 505;
        private readonly cannonLength = 105;
        private readonly minCannonAngle = -160;
        private readonly maxCannonAngle = -30;
        private readonly aimStep = 7;

        constructor() {
          super("FishingScene");
        }

        create() {
          this.physics.world.setBounds(0, 0, 960, 540);
          this.cameras.main.setBackgroundColor("#075985");
          this.createTextures();
          this.add.rectangle(480, 270, 960, 540, 0x0ea5e9).setAlpha(0.25);
          this.add.rectangle(480, 515, 960, 70, 0x064e3b).setAlpha(0.26);

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
            creature.setVelocity(Number(vx), Number(vy));
            creature.setBounce(1, 1);
            creature.setCollideWorldBounds(true);
            creature.setScale(scale);
          });

          activeCreatureCountRef.current = this.creatures.getLength();
          this.createCannon();
          this.net = this.add.graphics();
          root.dataset.fishCount = String(activeCreatureCountRef.current);
          root.dataset.creatureNames = creatureSeeds.map(([, , , , , name]) => name).join(",");
          root.dataset.lastCast = "";

          gameControlRef.current = {
            aimLeft: () => this.aimCannon(-this.aimStep),
            aimRight: () => this.aimCannon(this.aimStep),
            fireNet: () => this.fireNet(),
            resume: () => {
              this.isCasting = false;
              this.physics.world.resume();
            },
            stop: () => {
              this.physics.world.pause();
            }
          };

          if (phaseRef.current !== "ready") this.physics.world.pause();
        }

        update() {
          this.creatures.getChildren().forEach((child) => {
            const creature = child as Phaser.Physics.Arcade.Sprite;
            if (!creature.active) return;
            if (creature.body?.blocked.left || creature.body?.blocked.right) creature.toggleFlipX();
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
        }

        private createCannon() {
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
        }

        private aimCannon(delta: number) {
          if (this.isCasting || phaseRef.current !== "ready") return;
          this.cannonAngle = Phaser.Math.Clamp(this.cannonAngle + delta, this.minCannonAngle, this.maxCannonAngle);
          this.updateCannonRotation();
        }

        private cannonMuzzle() {
          const radians = Phaser.Math.DegToRad(this.cannonAngle);
          return {
            x: this.cannonX + Math.cos(radians) * this.cannonLength,
            y: this.cannonY + Math.sin(radians) * this.cannonLength
          };
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
                  root.dataset.lastCast = "hit";
                  this.physics.world.pause();
                }
              }
            },
            onComplete: () => {
              this.net.clear();
              if (!caughtTarget) {
                root.dataset.lastCast = "miss";
                this.isCasting = false;
                setStatusMessage(tRef.current({ en: "The net missed. Aim the cannon and try again.", zh: "魚網未命中。調整炮台方向再試一次。" }));
                if (statsRef.current.netsRemaining <= 0) {
                  endGame();
                  return;
                }
                setGamePhase("ready");
                return;
              }

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

              caughtTarget.disableBody(true, true);
              activeCreatureCountRef.current = Math.max(0, activeCreatureCountRef.current - 1);
              root.dataset.fishCount = String(activeCreatureCountRef.current);
              caughtQuestionIdsRef.current.add(question.id);
              this.physics.world.pause();
              setChallenge({
                creatureName: String(caughtTarget.getData("name") ?? creatureNames[nextQuestionIndexRef.current % creatureNames.length]),
                question
              });
              setGamePhase("challenge");
            }
          });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: root,
        width: 960,
        height: 540,
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
        if (!destroyed) setRendererLoadState("ready");
      } catch {
        if (!destroyed) {
          setRendererLoadState("failed");
          setLoadErrorCode("phaser");
          setLoadError(tRef.current({ en: "Could not start the Fishing renderer.", zh: "暫時未能啟動捕魚畫面。" }));
          setGamePhase("locked");
        }
      }
    }

    void bootGame();

    return () => {
      destroyed = true;
      gameControlRef.current = null;
      game?.destroy(true);
    };
  }, [endGame, nextFishingQuestion, payload, publishStats, questions.length, setGamePhase]);

  function startGame() {
    if (phase !== "welcome") return;
    setStatusMessage("");
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
      control.fireNet();
    } catch {
      setStatusMessage(tRef.current({ en: "The cannon jammed. Please try again.", zh: "炮台暫時卡住，請再試一次。" }));
      setGamePhase("ready");
      control.resume();
    }
  }, [endGame, setGamePhase]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === "ArrowLeft" && phaseRef.current === "ready") {
        event.preventDefault();
        gameControlRef.current?.aimLeft();
      }

      if (event.key === "ArrowRight" && phaseRef.current === "ready") {
        event.preventDefault();
        gameControlRef.current?.aimRight();
      }

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        fireNet();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fireNet]);

  const showSettlement = phase === "ended" || phase === "submitting" || phase === "submitted";
  const settlementTitle = phase === "submitting"
    ? t({ en: "Counting your catch", zh: "正在結算收穫" })
    : t({ en: "Fishing Master complete", zh: "捕魚達人完成" });
  const settlementDetail = completion
    ? t({
        en: `${completion.coins} coin(s) converted into ${completion.reward.xp} XP and ${completion.reward.rewardPoints} reward point(s).`,
        zh: `${completion.coins} 枚金幣已兌換成 ${completion.reward.xp} XP 和 ${completion.reward.rewardPoints} 獎勵積分。`
      })
    : phase === "submitting"
      ? t({ en: "Submitting the Fishing run now.", zh: "正在提交捕魚回合。" })
      : t({ en: "The Fishing Master run has ended. You can submit the result again if the network was interrupted.", zh: "捕魚達人回合已結束。如網絡中斷，可以再次提交結果。" });

  function retrySubmitResult() {
    void submitResult();
  }

  function handleChallengeAnswered(question: PublicQuestion, feedback: AttemptFeedback) {
    if (feedback.correct) {
      correctCaughtQuestionIdsRef.current.add(question.id);
      publishStats({ ...statsRef.current, coins: statsRef.current.coins + 1 });
      setStatusMessage(tRef.current({ en: "Correct catch. +1 coin.", zh: "答對捕獲，+1 金幣。" }));
    } else {
      setStatusMessage(tRef.current({ en: "No coin this catch. Keep going.", zh: "這次沒有金幣，繼續努力。" }));
    }

    window.setTimeout(() => {
      setChallenge(null);
      if (
        statsRef.current.netsRemaining <= 0 ||
        statsRef.current.elapsedSeconds >= fishingDurationSeconds ||
        activeCreatureCountRef.current <= 0
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
                en: "Aim the cannon with the left and right arrow keys, then press Space or the Fire net button. A math question appears only when the net reaches a creature.",
                zh: "用左右方向鍵調整炮台，然後按空白鍵或發射魚網按鈕。魚網命中海洋生物時才會出現數學題。"
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
            <button
              type="button"
              onClick={fireNet}
              disabled={phase !== "ready" || stats.netsRemaining <= 0}
              className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {t({ en: "Fire net", zh: "發射魚網" })}
            </button>
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
              className={cn("min-h-[320px] w-full", phase === "challenge" || phase === "submitting" ? "opacity-70" : "opacity-100")}
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
          </div>

          {statusMessage ? (
            <p className="mt-3 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-800 dark:text-cyan-100">
              {statusMessage}
            </p>
          ) : null}

          {showSettlement ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/45 bg-emerald-400/10 p-4">
              <p className="text-lg font-black text-emerald-800 dark:text-emerald-100">
                {settlementTitle}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {settlementDetail}
              </p>
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
                {phase === "ended" ? (
                  <button
                    type="button"
                    onClick={retrySubmitResult}
                    className="focus-ring rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-emerald-300 dark:text-emerald-950"
                  >
                    {t({ en: "Submit result", zh: "提交結果" })}
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
