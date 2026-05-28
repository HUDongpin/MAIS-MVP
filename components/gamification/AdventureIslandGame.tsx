"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "@/components/ui/Motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { PracticeQuestionCard } from "@/components/practice/PracticeQuestionCard";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AttemptFeedback, LocalizedText, PublicQuestion } from "@/types";

type AdventureRoundPayload = {
  topicId: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  accuracyPercent: number;
  roundKey: string;
};

type AdventureIslandEligibility = {
  eligible: boolean;
  reason: "ready" | "need-round-context" | "need-attempts" | "need-accuracy" | "mixed-topic" | "already-completed" | "invalid-round";
  dayKey: string;
  topicId: string | null;
  topicTitle: LocalizedText | null;
  roundKey: string;
  roundQuestionCount: number;
  requiredQuestionCount: number;
  attemptCount: number;
  correctCount: number;
  accuracyPercent: number;
  alreadyCompleted: boolean;
  completedAt: string | null;
  postAdventurePracticeEligible: boolean;
  rewardPreview: {
    xp: number;
    rewardPoints: number;
  };
};

type Challenge = {
  enemyId: string;
  enemyName: string;
  kind: "attack" | "contact";
  question: PublicQuestion;
};

type GameStats = {
  coins: number;
  axes: number;
  defeatedEnemies: number;
  lives: number;
  elapsedSeconds: number;
};

type GamePhase = "loading" | "locked" | "welcome" | "ready" | "challenge" | "submitting" | "cleared" | "game-over";

type GameControl = {
  resolveChallenge: (correct: boolean) => void;
  restart: () => void;
};

type MovementControls = {
  left: boolean;
  right: boolean;
  jump: boolean;
  throwAxe: boolean;
};

const adventureIslandApiPath = "/api/gamification/adventure-island";
const adventureRoundStorageKey = "hk-math-practice-adventure-round";
const trophyRequiredDefeats = 3;
const targetGameDurationSeconds = 120;
const levelWidth = 4200;
const levelHeight = 620;
const maxHeroHp = 2;
const invulnerableDurationMs = 3000;
const correctContactInvulnerableDurationMs = 5000;
const defaultStats: GameStats = {
  coins: 0,
  axes: 0,
  defeatedEnemies: 0,
  lives: maxHeroHp,
  elapsedSeconds: 0
};
const defaultMovementControls: MovementControls = {
  left: false,
  right: false,
  jump: false,
  throwAxe: false
};

function readEligibility(value: unknown) {
  const payload = value as Partial<AdventureIslandEligibility> | null;
  if (
    typeof payload?.eligible !== "boolean" ||
    typeof payload.reason !== "string" ||
    typeof payload.attemptCount !== "number" ||
    typeof payload.correctCount !== "number" ||
    typeof payload.accuracyPercent !== "number" ||
    typeof payload.alreadyCompleted !== "boolean"
  ) {
    return null;
  }
  return payload as AdventureIslandEligibility;
}

function readAdventureRoundPayload(value: string | null) {
  if (!value) return null;

  try {
    const payload = JSON.parse(value) as Partial<AdventureRoundPayload> | null;
    if (
      typeof payload?.topicId !== "string" ||
      typeof payload.roundKey !== "string" ||
      typeof payload.accuracyPercent !== "number" ||
      !Array.isArray(payload.roundQuestionIds) ||
      !Array.isArray(payload.correctRoundQuestionIds)
    ) {
      return null;
    }

    const roundQuestionIds = payload.roundQuestionIds.filter((item): item is string => typeof item === "string");
    const correctRoundQuestionIds = payload.correctRoundQuestionIds.filter((item): item is string => typeof item === "string");
    if (payload.accuracyPercent < 80 || roundQuestionIds.length !== 5 || correctRoundQuestionIds.length < 4) return null;

    return {
      topicId: payload.topicId,
      roundQuestionIds,
      correctRoundQuestionIds,
      accuracyPercent: payload.accuracyPercent,
      roundKey: payload.roundKey
    };
  } catch {
    return null;
  }
}

function adventureRoundSearchParams(payload: AdventureRoundPayload) {
  const params = new URLSearchParams({
    topicId: payload.topicId,
    roundKey: payload.roundKey
  });
  payload.roundQuestionIds.forEach((questionId) => params.append("roundQuestionIds", questionId));
  payload.correctRoundQuestionIds.forEach((questionId) => params.append("correctRoundQuestionIds", questionId));
  return params;
}

function readQuestions(value: unknown) {
  const payload = value as { questions?: unknown } | null;
  return Array.isArray(payload?.questions) ? payload.questions as PublicQuestion[] : [];
}

function completionMessage(status: string | undefined) {
  if (status === "awarded") {
    return {
      en: "Trophy clear recorded. XP and reward points were added.",
      zh: "獎盃通關已記錄，XP 和獎勵積分已加入。"
    };
  }
  if (status === "capped") {
    return {
      en: "Trophy clear recorded. The daily reward cap limited the payout.",
      zh: "獎盃通關已記錄；每日獎勵上限限制了本次獎勵。"
    };
  }
  if (status === "duplicate") {
    return {
      en: "You already claimed today's Adventure Island reward.",
      zh: "你今天已領取探险岛獎勵。"
    };
  }
  return {
    en: "The Adventure Island run could not be recorded yet.",
    zh: "暫時未能記錄探险岛回合。"
  };
}

function formatRunTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function CoinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 drop-shadow-sm">
      <defs>
        <radialGradient id="adventure-island-hud-coin" cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#fff7ad" />
          <stop offset="48%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#adventure-island-hud-coin)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#f59e0b" strokeWidth="3" />
      <path d="M11 10.5c1.4-1.5 7.8-2.1 10.2 1" fill="none" stroke="#fff7ed" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function AxeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 drop-shadow-sm">
      <path d="M9 27 23 7" stroke="#92400e" strokeWidth="5" strokeLinecap="round" />
      <path d="M18 4h8c1.4 0 2.3 1.4 1.7 2.7L25 13.2c-.5 1.1-1.6 1.8-2.8 1.8h-8.5c.8-4.7 2.2-8.2 4.3-11Z" fill="#64748b" />
      <path d="M17.4 5.8c3.5.4 6.1 1.9 8.1 4.5" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HammerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 drop-shadow-sm">
      <path d="M6.5 27.5 20 14" stroke="#92400e" strokeWidth="5" strokeLinecap="round" />
      <path d="M15 9.2 21.2 3 29 10.8 22.8 17 15 9.2Z" fill="#475569" />
      <path d="M18.2 8.5 23.5 13.8" stroke="#e2e8f0" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6.5 27.5 12.2 21.8" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EnemyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 drop-shadow-sm">
      <path d="M6 21c0-6.2 4.5-11 10-11s10 4.8 10 11v3H6v-3Z" fill="#ef4444" />
      <path d="M7.4 20.2C9.8 15.4 17 12.8 25 19" fill="none" stroke="#fecaca" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="21" r="2" fill="#0f172a" />
      <circle cx="20" cy="21" r="2" fill="#0f172a" />
      <path d="M10 25h12" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 drop-shadow-sm">
      <circle cx="16" cy="16" r="12" fill="#e0f2fe" stroke="#0891b2" strokeWidth="3" />
      <path d="M16 9v7l5 3" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={cn("h-6 w-6 drop-shadow-sm", filled ? "text-rose-500" : "text-slate-300 dark:text-slate-600")}>
      <path
        d="M16 27S5 20.3 5 11.8C5 7.9 7.6 5 11.1 5c2.1 0 3.9 1 4.9 2.7C17 6 18.8 5 20.9 5 24.4 5 27 7.9 27 11.8 27 20.3 16 27 16 27Z"
        fill="currentColor"
        stroke={filled ? "#be123c" : "#94a3b8"}
        strokeWidth="2"
      />
      {filled ? <path d="M10.3 9.4c1.4-1.4 3.6-.9 4.6.9" fill="none" stroke="#fecdd3" strokeWidth="2.2" strokeLinecap="round" /> : null}
    </svg>
  );
}

export function AdventureIslandGame() {
  const { currentUser, language, t, text } = useSettings();
  const gameRootRef = useRef<HTMLDivElement | null>(null);
  const gameControlRef = useRef<GameControl | null>(null);
  const questionsRef = useRef<PublicQuestion[]>([]);
  const roundPayloadRef = useRef<AdventureRoundPayload | null>(null);
  const translateRef = useRef(t);
  const phaseRef = useRef<GamePhase>("loading");
  const movementControlsRef = useRef<MovementControls>({ ...defaultMovementControls });
  const usedChallengeQuestionIdsRef = useRef<Set<string>>(new Set());
  const correctQuestionIdsRef = useRef<Set<string>>(new Set());
  const runStartedAtRef = useRef<number>(Date.now());
  const submittingRef = useRef(false);
  const [eligibility, setEligibility] = useState<AdventureIslandEligibility | null>(null);
  const [roundPayload, setRoundPayload] = useState<AdventureRoundPayload | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [loadError, setLoadError] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [stats, setStats] = useState<GameStats>(defaultStats);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const [showTrophyCelebration, setShowTrophyCelebration] = useState(false);
  const [runBootKey, setRunBootKey] = useState(0);

  const canPlay = Boolean(eligibility?.eligible || eligibility?.alreadyCompleted);
  const currentGradeLabel = currentUser ? formatGradeLabel(currentUser.grade, language, true) : "";
  const topicTitle = eligibility?.topicTitle ? text(eligibility.topicTitle) : "";
  const questTitle = topicTitle
    ? t({ en: `${topicTitle} Adventure`, zh: `${topicTitle} 探险任務` })
    : currentGradeLabel
    ? t({ en: `${currentGradeLabel} Practice Quest`, zh: `${currentGradeLabel} 練習勇者任務` })
    : t({ en: "Practice Quest", zh: "練習勇者任務" });
  const trophyObjectiveCopy = t({
    en: `Goal: defeat ${trophyRequiredDefeats} enemies with axes, then reach the trophy.`,
    zh: `目標：先用斧頭擊敗 ${trophyRequiredDefeats} 個敵人，再抵達獎盃。`
  });

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  const setGamePhase = useCallback((nextPhase: GamePhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase !== "ready") {
      movementControlsRef.current = { ...defaultMovementControls };
    }
    if (phase === "cleared") {
      setShowTrophyCelebration(true);
    }
  }, [phase]);

  const refreshEligibility = useCallback(async (payload = roundPayloadRef.current) => {
    const query = payload ? `?${adventureRoundSearchParams(payload).toString()}` : "";
    const response = await fetch(`${adventureIslandApiPath}${query}`, { cache: "no-store" });
    const nextEligibility = readEligibility(await response.json().catch(() => null));
    if (!response.ok || !nextEligibility) throw new Error("Could not load Adventure Island eligibility.");
    setEligibility(nextEligibility);
    return nextEligibility;
  }, []);

  const nextChallengeQuestion = useCallback(() => {
    const available = questionsRef.current.filter((question) => !usedChallengeQuestionIdsRef.current.has(question.id));
    const nextQuestion = available[0] ?? questionsRef.current[0] ?? null;
    if (nextQuestion) usedChallengeQuestionIdsRef.current.add(nextQuestion.id);
    return nextQuestion;
  }, []);

  const submitCompletion = useCallback(async (nextStats: GameStats) => {
    const latestPayload = roundPayloadRef.current;
    if (submittingRef.current || !latestPayload) return;
    submittingRef.current = true;
    setGamePhase("submitting");
    setStatusMessage("");

    try {
      const durationSeconds = Math.max(30, Math.round((Date.now() - runStartedAtRef.current) / 1000));
      const response = await fetch(adventureIslandApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...latestPayload,
          correctQuestionIds: Array.from(correctQuestionIdsRef.current),
          durationSeconds,
          defeatedEnemies: nextStats.defeatedEnemies,
          coinsCollected: nextStats.coins
        })
      });
      const payload = await response.json().catch(() => null) as { status?: string; reward?: { xp?: number; rewardPoints?: number } } | null;
      setStatusMessage(t(completionMessage(payload?.status)));
      if (response.ok) {
        setGamePhase("cleared");
        await refreshEligibility(latestPayload);
      } else {
        setShowTrophyCelebration(false);
        setGamePhase("ready");
      }
    } catch {
      setShowTrophyCelebration(false);
      setGamePhase("ready");
      setStatusMessage(t({ en: "Could not submit the trophy clear yet.", zh: "暫時未能提交獎盃通關紀錄。" }));
    } finally {
      submittingRef.current = false;
    }
  }, [refreshEligibility, setGamePhase, t]);

  const submitCompletionRef = useRef(submitCompletion);

  useEffect(() => {
    submitCompletionRef.current = submitCompletion;
  }, [submitCompletion]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    if (!canPlay) return;

    function updateMovementControl(event: KeyboardEvent, pressed: boolean) {
      const key = event.key === " " ? "Space" : event.key;
      const playableKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "Spacebar", "a", "A", "d", "D", "w", "W", "t", "T"].includes(key);
      if (!playableKey || (pressed && phaseRef.current !== "ready")) return;

      event.preventDefault();
      if (pressed && event.repeat) return;
      movementControlsRef.current = {
        ...movementControlsRef.current,
        left: key === "ArrowLeft" || key === "a" || key === "A" ? pressed : movementControlsRef.current.left,
        right: key === "ArrowRight" || key === "d" || key === "D" ? pressed : movementControlsRef.current.right,
        jump: key === "ArrowUp" || key === "w" || key === "W" || key === "Space" || key === "Spacebar" ? pressed : movementControlsRef.current.jump,
        throwAxe: (key === "t" || key === "T") && pressed && !event.repeat ? true : movementControlsRef.current.throwAxe
      };
    }

    function handleKeyDown(event: KeyboardEvent) {
      updateMovementControl(event, true);
    }

    function handleKeyUp(event: KeyboardEvent) {
      updateMovementControl(event, false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      movementControlsRef.current = { ...defaultMovementControls };
    };
  }, [canPlay]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdventureIslandGame() {
      const nextPayload = readAdventureRoundPayload(window.sessionStorage.getItem(adventureRoundStorageKey));
      setRoundPayload(nextPayload);
      roundPayloadRef.current = nextPayload;

      if (!currentUser) {
        setGamePhase("locked");
        setLoadError(translateRef.current({ en: "Log in to use the Adventure Island game.", zh: "登入後才可使用探险岛遊戲。" }));
        return;
      }

      if (!nextPayload) {
        setGamePhase("locked");
        setLoadError(translateRef.current({
          en: "Complete a same-topic 5-question Practice Arena round at 80%+ first.",
          zh: "請先在練習場完成同一課題 5 題並達到 80%+。"
        }));
        return;
      }

      try {
        setLoadError("");
        const [nextEligibility, topicQuestionResponse] = await Promise.all([
          refreshEligibility(nextPayload),
          fetch(`/api/questions?topicId=${encodeURIComponent(nextPayload.topicId)}&curriculumTrack=${encodeURIComponent(currentUser.curriculumTrack)}`, { cache: "no-store" })
        ]);
        const nextQuestions = readQuestions(await topicQuestionResponse.json().catch(() => null));
        if (!topicQuestionResponse.ok || nextQuestions.length < trophyRequiredDefeats) throw new Error("Could not load practice questions.");
        if (cancelled) return;
        setQuestions(nextQuestions);
        setGamePhase(nextEligibility.eligible || nextEligibility.alreadyCompleted ? "welcome" : "locked");
      } catch {
        if (!cancelled) {
          setGamePhase("locked");
          setLoadError(translateRef.current({ en: "Could not prepare this topic's Adventure Island game.", zh: "暫時未能準備本課題探险岛遊戲。" }));
        }
      }
    }

    void loadAdventureIslandGame();

    return () => {
      cancelled = true;
    };
  }, [currentUser, refreshEligibility, setGamePhase]);

  useEffect(() => {
    if (!canPlay || runBootKey === 0 || !gameRootRef.current || questions.length < trophyRequiredDefeats) return;
    let destroyed = false;
    let game: Phaser.Game | null = null;

    async function bootGame() {
      const loaded = await import("phaser");
      if (destroyed || !gameRootRef.current) return;
      const Phaser = ((loaded as { default?: typeof import("phaser") }).default ?? loaded) as typeof import("phaser");
      const root = gameRootRef.current;
      root.innerHTML = "";
      root.dataset.playerX = "90";
      root.dataset.coins = "0";
      root.dataset.axes = "0";
      root.dataset.defeated = "0";
      root.dataset.lives = String(maxHeroHp);
      root.dataset.upperCoins = "0";
      root.dataset.invulnerable = "false";
      root.dataset.challengeKind = "";
      root.dataset.snail1X = "";
      root.dataset.phase = phaseRef.current;
      runStartedAtRef.current = Date.now();
      correctQuestionIdsRef.current = new Set();
      usedChallengeQuestionIdsRef.current = new Set();
      movementControlsRef.current = { ...defaultMovementControls };
      setStats(defaultStats);

      class QuadraticQuestScene extends Phaser.Scene {
        private player!: Phaser.Physics.Arcade.Sprite;
        private platforms!: Phaser.Physics.Arcade.StaticGroup;
        private coins!: Phaser.Physics.Arcade.StaticGroup;
        private axePickups!: Phaser.Physics.Arcade.StaticGroup;
        private enemies!: Phaser.Physics.Arcade.Group;
        private thrownAxes!: Phaser.Physics.Arcade.Group;
        private trophy!: Phaser.Physics.Arcade.Sprite;
        private activeEnemy: Phaser.Physics.Arcade.Sprite | null = null;
        private activeChallengeKind: Challenge["kind"] | null = null;
        private isChallenging = false;
        private invulnerableUntil = 0;
        private contactCooldownUntil = 0;
        private throwCooldownUntil = 0;
        private trophyNoticeUntil = 0;
        private upperCoinsCollected = 0;
        private localStats: GameStats = { ...defaultStats };

        constructor() {
          super("QuadraticQuestScene");
        }

        create() {
          this.upperCoinsCollected = 0;
          this.invulnerableUntil = 0;
          this.contactCooldownUntil = 0;
          this.throwCooldownUntil = 0;
          this.activeEnemy = null;
          this.activeChallengeKind = null;
          root.dataset.upperCoins = "0";
          root.dataset.invulnerable = "false";
          root.dataset.challengeKind = "";
          root.dataset.snail1X = "";
          this.physics.world.setBounds(0, 0, levelWidth, levelHeight);
          this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);
          this.cameras.main.setBackgroundColor("#e0f7ff");
          this.createTextures();

          this.add.rectangle(levelWidth / 2, 560, levelWidth, 120, 0x164e63).setAlpha(0.18);
          this.add.rectangle(levelWidth / 2, 596, levelWidth, 48, 0x0f766e).setAlpha(0.24);
          this.add.text(30, 26, questTitle, {
            fontFamily: "Arial",
            fontSize: "24px",
            fontStyle: "900",
            color: "#0f172a"
          }).setScrollFactor(0);

          this.platforms = this.physics.add.staticGroup();
          this.addPlatform(levelWidth / 2, 540, levelWidth, 34);
          [
            [430, 455, 260, 28],
            [640, 430, 230, 28],
            [1040, 370, 240, 28],
            [1510, 448, 300, 28],
            [2020, 392, 260, 28],
            [2580, 455, 320, 28],
            [3090, 382, 260, 28],
            [3580, 438, 300, 28]
          ].forEach(([x, y, width, height]) => this.addPlatform(x, y, width, height));

          this.player = this.physics.add.sprite(90, 460, "quadraticHero");
          this.player.setCollideWorldBounds(true);
          this.player.setBounce(0.06);
          this.player.setData("facing", 1);
          this.player.body?.setSize(30, 42, true);
          root.dataset.playerX = String(Math.round(this.player.x));
          this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
          this.physics.add.collider(this.player, this.platforms);

          this.coins = this.physics.add.staticGroup();
          [
            [170, 480, 0],
            [310, 465, 1],
            [382, 440, 1],
            [430, 420, 1],
            [478, 440, 1],
            [585, 392, 1],
            [700, 392, 1],
            [880, 326, 1],
            [1030, 326, 1],
            [1210, 470, 0],
            [1430, 405, 1],
            [1660, 405, 1],
            [1900, 350, 1],
            [2150, 350, 1],
            [2390, 470, 0],
            [2620, 412, 1],
            [2880, 412, 1],
            [3160, 340, 1],
            [3420, 402, 1],
            [3710, 402, 1],
            [3920, 480, 0]
          ].forEach(([x, y, upper]) => this.addCoin(x, y, Boolean(upper)));
          this.physics.add.overlap(this.player, this.coins, (_player, coin) => this.collectCoin(coin as Phaser.Physics.Arcade.Sprite));

          this.axePickups = this.physics.add.staticGroup();
          [240, 650, 1010, 1370, 1810, 2320, 2820, 3350].forEach((x, index) => {
            const y = index < 3 ? 480 : index % 2 === 0 ? 345 : 410;
            this.axePickups.create(x, y, "quadraticAxePickup").refreshBody();
          });
          this.physics.add.overlap(this.player, this.axePickups, (_player, axe) => this.collectAxe(axe as Phaser.Physics.Arcade.Sprite));

          this.enemies = this.physics.add.group({ allowGravity: false });
          this.addEnemy("snail-1", 560, 418, "quadraticSnail", "Giant snail");
          this.addEnemy("mushroom-1", 880, 488, "quadraticMushroom", "Mushroom rover");
          this.addEnemy("snail-2", 1240, 493, "quadraticSnail", "Giant snail");
          this.addEnemy("mushroom-2", 1620, 402, "quadraticMushroom", "Mushroom rover");
          this.addEnemy("snail-5", 1840, 493, "quadraticSnail", "Giant snail");
          this.addEnemy("snail-3", 2140, 346, "quadraticSnail", "Giant snail");
          this.addEnemy("mushroom-4", 2500, 488, "quadraticMushroom", "Mushroom rover");
          this.addEnemy("mushroom-3", 2900, 408, "quadraticMushroom", "Mushroom rover");
          this.addEnemy("snail-4", 3500, 392, "quadraticSnail", "Giant snail");
          this.addEnemy("mushroom-5", 3820, 488, "quadraticMushroom", "Mushroom rover");
          this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => this.handleEnemyContact(enemy as Phaser.Physics.Arcade.Sprite));
          this.updateEnemyPatrols();

          this.thrownAxes = this.physics.add.group({ allowGravity: false });
          this.physics.add.overlap(this.thrownAxes, this.enemies, (axe, enemy) =>
            this.handleAxeEnemyHit(axe as Phaser.Physics.Arcade.Sprite, enemy as Phaser.Physics.Arcade.Sprite)
          );

          this.trophy = this.physics.add.staticSprite(4050, 491, "quadraticTrophy") as Phaser.Physics.Arcade.Sprite;
          this.trophy.refreshBody();
          this.physics.add.overlap(this.player, this.trophy, () => this.handleTrophyTouch());

          this.resetInputState();

          this.publishStats({ ...defaultStats });

          gameControlRef.current = {
            resolveChallenge: (correct) => this.resolveChallenge(correct),
            restart: () => {
              this.resetInputState();
              this.scene.restart();
            }
          };
        }

        update() {
          if (!this.player || this.isChallenging) return;

          const movementControls = movementControlsRef.current;
          const moveLeft = movementControls.left;
          const moveRight = movementControls.right;
          const grounded = Boolean(this.player.body?.blocked.down || this.player.body?.touching.down);

          if (moveLeft) {
            this.player.setVelocityX(-235);
            this.player.setFlipX(true);
            this.player.setData("facing", -1);
          } else if (moveRight) {
            this.player.setVelocityX(235);
            this.player.setFlipX(false);
            this.player.setData("facing", 1);
          } else {
            this.player.setVelocityX(0);
          }

          if (movementControls.jump && grounded) {
            this.player.setVelocityY(-555);
          }

          if (movementControls.throwAxe) {
            movementControlsRef.current = { ...movementControlsRef.current, throwAxe: false };
            this.throwAxe();
          }

          const elapsedSeconds = Math.floor((Date.now() - runStartedAtRef.current) / 1000);
          if (elapsedSeconds !== this.localStats.elapsedSeconds) {
            this.publishStats({ ...this.localStats, elapsedSeconds });
          }

          root.dataset.playerX = String(Math.round(this.player.x));
          root.dataset.phase = phaseRef.current;
          root.dataset.invulnerable = String(this.time.now < this.invulnerableUntil);

          this.updateEnemyPatrols();
        }

        private createTextures() {
          const hero = this.make.graphics({ x: 0, y: 0 }, false);
          hero.fillStyle(0x2563eb, 1);
          hero.fillRect(7, 12, 30, 34);
          hero.fillStyle(0xfacc15, 1);
          hero.fillCircle(22, 12, 12);
          hero.fillStyle(0x0f172a, 1);
          hero.fillRect(28, 10, 4, 4);
          hero.generateTexture("quadraticHero", 44, 52);
          hero.destroy();

          const platform = this.make.graphics({ x: 0, y: 0 }, false);
          platform.fillStyle(0x0f766e, 1);
          platform.fillRect(0, 0, 64, 22);
          platform.fillStyle(0x22d3ee, 0.7);
          platform.fillRect(0, 0, 64, 5);
          platform.generateTexture("quadraticPlatform", 64, 22);
          platform.destroy();

          const coin = this.make.graphics({ x: 0, y: 0 }, false);
          coin.fillStyle(0xfacc15, 1);
          coin.fillCircle(14, 14, 12);
          coin.lineStyle(3, 0xf59e0b, 1);
          coin.strokeCircle(14, 14, 9);
          coin.generateTexture("quadraticCoin", 28, 28);
          coin.destroy();

          const axePickup = this.make.graphics({ x: 0, y: 0 }, false);
          axePickup.fillStyle(0x92400e, 1);
          axePickup.fillRect(19, 16, 8, 30);
          axePickup.fillStyle(0x475569, 1);
          axePickup.fillRect(4, 6, 34, 12);
          axePickup.fillStyle(0xe2e8f0, 1);
          axePickup.fillTriangle(4, 6, 4, 18, 0, 12);
          axePickup.generateTexture("quadraticAxePickup", 44, 50);
          axePickup.destroy();

          const thrownAxe = this.make.graphics({ x: 0, y: 0 }, false);
          thrownAxe.fillStyle(0x92400e, 1);
          thrownAxe.fillRect(8, 13, 34, 6);
          thrownAxe.fillStyle(0x475569, 1);
          thrownAxe.fillTriangle(4, 8, 18, 16, 4, 24);
          thrownAxe.fillTriangle(42, 8, 30, 16, 42, 24);
          thrownAxe.generateTexture("quadraticThrownAxe", 48, 32);
          thrownAxe.destroy();

          const snail = this.make.graphics({ x: 0, y: 0 }, false);
          snail.fillStyle(0x84cc16, 1);
          snail.fillEllipse(26, 28, 46, 28);
          snail.fillStyle(0x16a34a, 1);
          snail.fillCircle(20, 22, 14);
          snail.fillStyle(0x0f172a, 1);
          snail.fillCircle(38, 18, 3);
          snail.generateTexture("quadraticSnail", 56, 46);
          snail.destroy();

          const mushroom = this.make.graphics({ x: 0, y: 0 }, false);
          mushroom.fillStyle(0xf8fafc, 1);
          mushroom.fillRoundedRect(17, 22, 22, 28, 8);
          mushroom.fillStyle(0xef4444, 1);
          mushroom.fillEllipse(28, 22, 54, 30);
          mushroom.fillStyle(0xfef2f2, 1);
          mushroom.fillCircle(16, 16, 5);
          mushroom.fillCircle(31, 11, 4);
          mushroom.fillCircle(42, 20, 5);
          mushroom.fillStyle(0x0f172a, 1);
          mushroom.fillCircle(23, 32, 2);
          mushroom.fillCircle(34, 32, 2);
          mushroom.generateTexture("quadraticMushroom", 58, 54);
          mushroom.destroy();

          const trophy = this.make.graphics({ x: 0, y: 0 }, false);
          trophy.fillStyle(0xfacc15, 1);
          trophy.fillRoundedRect(14, 10, 32, 30, 8);
          trophy.lineStyle(5, 0xf59e0b, 1);
          trophy.strokeCircle(13, 24, 10);
          trophy.strokeCircle(47, 24, 10);
          trophy.fillStyle(0x92400e, 1);
          trophy.fillRect(27, 40, 6, 18);
          trophy.fillRoundedRect(16, 56, 28, 8, 3);
          trophy.fillStyle(0xffffff, 0.8);
          trophy.fillCircle(25, 20, 5);
          trophy.generateTexture("quadraticTrophy", 60, 66);
          trophy.destroy();
        }

        private addPlatform(x: number, y: number, width: number, height: number) {
          const platform = this.platforms.create(x, y, "quadraticPlatform") as Phaser.Physics.Arcade.Sprite;
          platform.setDisplaySize(width, height);
          platform.refreshBody();
        }

        private addCoin(x: number, y: number, upper: boolean) {
          const coin = this.coins.create(x, y, "quadraticCoin") as Phaser.Physics.Arcade.Sprite;
          coin.setData("collected", false);
          coin.setData("upper", upper);
          coin.setDisplaySize(30, 30);
          coin.refreshBody();
          coin.body?.setSize(58, 58, true);
        }

        private addEnemy(id: string, x: number, y: number, texture: string, name: string) {
          const enemy = this.enemies.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
          enemy.setData("id", id);
          enemy.setData("name", name);
          enemy.setData("startX", x);
          const speed = texture === "quadraticMushroom" ? -92 : 76;
          enemy.setData("range", texture === "quadraticMushroom" ? 110 : 95);
          enemy.setData("speed", speed);
          enemy.setCollideWorldBounds(true);
          enemy.setImmovable(true);
          enemy.setVelocityX(speed);
          enemy.setFlipX(speed > 0);
          enemy.body?.setSize(enemy.width * 0.82, enemy.height * 0.78, true);
        }

        private updateEnemyPatrols() {
          this.enemies.getChildren().forEach((child) => {
            const enemy = child as Phaser.Physics.Arcade.Sprite;
            const id = String(enemy.getData("id"));
            const startX = Number(enemy.getData("startX"));
            const range = Number(enemy.getData("range"));
            const speed = Number(enemy.getData("speed"));
            const shouldTurnRight = speed < 0 && enemy.x <= startX - range;
            const shouldTurnLeft = speed > 0 && enemy.x >= startX + range;
            const nextSpeed = shouldTurnRight || shouldTurnLeft ? -speed : speed;

            if (enemy.active) {
              enemy.setData("speed", nextSpeed);
              enemy.setVelocityX(nextSpeed);
              enemy.setFlipX(nextSpeed > 0);
              if (id === "snail-1") root.dataset.snail1X = String(Math.round(enemy.x));
            }
          });
        }

        private publishStats(nextStats: GameStats) {
          this.localStats = nextStats;
          root.dataset.coins = String(nextStats.coins);
          root.dataset.axes = String(nextStats.axes);
          root.dataset.defeated = String(nextStats.defeatedEnemies);
          root.dataset.lives = String(nextStats.lives);
          root.dataset.phase = phaseRef.current;
          setStats(nextStats);
        }

        private resetInputState() {
          movementControlsRef.current = { ...defaultMovementControls };
          this.input.keyboard?.resetKeys();
        }

        private collectCoin(coin: Phaser.Physics.Arcade.Sprite) {
          if (!coin.active) return;
          if (coin.getData("upper")) {
            this.upperCoinsCollected += 1;
            root.dataset.upperCoins = String(this.upperCoinsCollected);
          }
          coin.disableBody(true, true);
          this.publishStats({ ...this.localStats, coins: this.localStats.coins + 1 });
        }

        private collectAxe(axe: Phaser.Physics.Arcade.Sprite) {
          if (!axe.active) return;
          axe.disableBody(true, true);
          this.publishStats({ ...this.localStats, axes: this.localStats.axes + 1 });
        }

        private throwAxe() {
          if (this.time.now < this.throwCooldownUntil) return;
          this.throwCooldownUntil = this.time.now + 360;

          if (this.localStats.axes <= 0) {
            setStatusMessage(translateRef.current({ en: "Pick up an axe before throwing.", zh: "先拾取斧頭，再投擲攻擊。" }));
            return;
          }

          const direction = Number(this.player.getData("facing")) || 1;
          this.publishStats({ ...this.localStats, axes: this.localStats.axes - 1 });
          const axe = this.thrownAxes.create(this.player.x + direction * 32, this.player.y - 4, "quadraticThrownAxe") as Phaser.Physics.Arcade.Sprite;
          axe.setData("startX", this.player.x);
          axe.setData("direction", direction);
          axe.setVelocityX(direction * 640);
          axe.setVelocityY(-18);
          axe.setAngularVelocity(direction * 920);
          axe.body?.setSize(52, 150, true);
          this.time.delayedCall(1400, () => {
            if (axe.active) axe.disableBody(true, true);
          });
        }

        private handleAxeEnemyHit(axe: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
          if (this.isChallenging || !axe.active || !enemy.active) return;
          axe.disableBody(true, true);
          this.startChallenge(enemy, "attack");
        }

        private handleEnemyContact(enemy: Phaser.Physics.Arcade.Sprite) {
          if (
            this.isChallenging ||
            !enemy.active ||
            this.time.now < this.invulnerableUntil ||
            this.time.now < this.contactCooldownUntil ||
            phaseRef.current !== "ready"
          ) return;

          this.startChallenge(enemy, "contact");
        }

        private startChallenge(enemy: Phaser.Physics.Arcade.Sprite, kind: Challenge["kind"]) {
          if (this.isChallenging || !enemy.active) return;
          const question = nextChallengeQuestion();
          if (!question) return;
          this.isChallenging = true;
          this.resetInputState();
          this.activeEnemy = enemy;
          this.activeChallengeKind = kind;
          this.player.setVelocity(0, 0);
          this.enemies.setVelocityX(0);
          this.physics.world.pause();
          setChallenge({
            enemyId: String(enemy.getData("id")),
            enemyName: String(enemy.getData("name")),
            kind,
            question
          });
          setGamePhase("challenge");
          root.dataset.phase = "challenge";
          root.dataset.challengeKind = kind;
        }

        private resolveChallenge(correct: boolean) {
          this.physics.world.resume();
          this.isChallenging = false;
          this.resetInputState();
          const kind = this.activeChallengeKind ?? "attack";

          if (kind === "attack" && correct && this.activeEnemy) {
            this.contactCooldownUntil = this.time.now + 2600;
            this.invulnerableUntil = Math.max(this.invulnerableUntil, this.time.now + 1200);
            root.dataset.invulnerable = "true";
            this.player.setVelocity(0, 0);
            this.time.delayedCall(1200, () => {
              if (this.player.active && phaseRef.current === "ready") {
                root.dataset.invulnerable = String(this.time.now < this.invulnerableUntil);
              }
            });
            this.activeEnemy.disableBody(true, true);
            this.publishStats({
              ...this.localStats,
              defeatedEnemies: this.localStats.defeatedEnemies + 1,
              coins: this.localStats.coins + 2
            });
          } else if (kind === "contact") {
            this.resolveContactChallenge(correct);
            if (phaseRef.current === "game-over") return;
          } else if (this.activeEnemy) {
            this.contactCooldownUntil = this.time.now + 700;
            this.player.setVelocity(this.player.x < this.activeEnemy.x ? -220 : 220, -180);
          }

          this.activeEnemy = null;
          this.activeChallengeKind = null;
          setChallenge(null);
          setGamePhase("ready");
          root.dataset.phase = "ready";
          root.dataset.challengeKind = "";
        }

        private resolveContactChallenge(correct: boolean) {
          const enemy = this.activeEnemy;

          this.contactCooldownUntil = this.time.now + 1000;

          if (correct) {
            this.player.setVelocity(0, 0);
            this.startInvulnerability(correctContactInvulnerableDurationMs, 0x22c55e);
            return;
          }

          const pushDirection = !enemy || this.player.x < enemy.x ? -1 : 1;
          this.player.setVelocity(pushDirection * 180, -160);

          const nextLives = Math.max(0, this.localStats.lives - 1);
          this.publishStats({
            ...this.localStats,
            lives: nextLives
          });

          if (nextLives <= 0) {
            this.triggerGameOver();
            return;
          }

          this.startInvulnerability();
        }

        private startInvulnerability(durationMs = invulnerableDurationMs, tint = 0xfb7185) {
          this.invulnerableUntil = this.time.now + durationMs;
          root.dataset.invulnerable = "true";
          this.player.setTint(tint);
          this.tweens.add({
            targets: this.player,
            alpha: 0.38,
            duration: 130,
            yoyo: true,
            repeat: Math.ceil(durationMs / 260),
            onComplete: () => {
              if (!this.player.active) return;
              this.player.setAlpha(1);
              this.player.clearTint();
              root.dataset.invulnerable = String(this.time.now < this.invulnerableUntil);
            }
          });
        }

        private triggerGameOver() {
          this.resetInputState();
          this.player.setAlpha(1);
          this.player.clearTint();
          this.player.setVelocity(0, 0);
          this.physics.world.pause();
          this.activeEnemy = null;
          this.activeChallengeKind = null;
          setChallenge(null);
          setGamePhase("game-over");
          root.dataset.phase = "game-over";
          root.dataset.challengeKind = "";
          root.dataset.invulnerable = "false";
        }

        private launchTrophyFireworks() {
          const bursts = [
            { x: this.trophy.x - 145, y: this.trophy.y - 178, delay: 0 },
            { x: this.trophy.x - 25, y: this.trophy.y - 220, delay: 170 },
            { x: this.trophy.x + 120, y: this.trophy.y - 172, delay: 320 },
            { x: this.trophy.x + 20, y: this.trophy.y - 118, delay: 480 }
          ];
          const colors = [0xfacc15, 0x38bdf8, 0xfb7185, 0x34d399, 0xa78bfa, 0xf97316];

          this.cameras.main.flash(420, 255, 255, 255);
          this.cameras.main.shake(220, 0.0025);

          bursts.forEach((burst, burstIndex) => {
            this.time.delayedCall(burst.delay, () => {
              const ring = this.add.circle(burst.x, burst.y, 9, colors[burstIndex % colors.length], 0.3).setDepth(35);
              this.tweens.add({
                targets: ring,
                alpha: 0,
                scale: 8,
                duration: 680,
                ease: "Cubic.easeOut",
                onComplete: () => ring.destroy()
              });

              Array.from({ length: 22 }, (_, sparkIndex) => {
                const angle = Phaser.Math.DegToRad((360 / 22) * sparkIndex + burstIndex * 11);
                const distance = Phaser.Math.Between(62, 132);
                const color = colors[(sparkIndex + burstIndex) % colors.length];
                const spark = sparkIndex % 5 === 0
                  ? this.add.star(burst.x, burst.y, 5, 4, 12, color, 1)
                  : this.add.circle(burst.x, burst.y, Phaser.Math.Between(4, 7), color, 1);
                spark.setDepth(36);
                this.tweens.add({
                  targets: spark,
                  x: burst.x + Math.cos(angle) * distance,
                  y: burst.y + Math.sin(angle) * distance + Phaser.Math.Between(-12, 20),
                  alpha: 0,
                  scale: 0.2,
                  duration: Phaser.Math.Between(680, 980),
                  ease: "Cubic.easeOut",
                  onComplete: () => spark.destroy()
                });
              });
            });
          });
        }

        private handleTrophyTouch() {
          if (phaseRef.current === "submitting" || phaseRef.current === "cleared" || submittingRef.current) return;
          if (this.localStats.defeatedEnemies < trophyRequiredDefeats) {
            if (this.time.now > this.trophyNoticeUntil) {
              this.trophyNoticeUntil = this.time.now + 1800;
              setStatusMessage(translateRef.current({
                en: `Defeat ${trophyRequiredDefeats} enemies with axes before claiming the trophy.`,
                zh: `先用斧頭擊敗 ${trophyRequiredDefeats} 個敵人，再領取獎盃。`
              }));
            }
            this.player.setVelocityX(-160);
            return;
          }

          this.player.setVelocity(0, 0);
          this.launchTrophyFireworks();
          setShowTrophyCelebration(true);
          this.physics.world.pause();
          setGamePhase("submitting");
          root.dataset.phase = "submitting";
          void submitCompletionRef.current(this.localStats);
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: root,
        width: 960,
        height: 540,
        backgroundColor: "#e0f7ff",
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 980 },
            debug: false
          }
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: QuadraticQuestScene
      });
    }

    void bootGame();

    return () => {
      destroyed = true;
      gameControlRef.current = null;
      game?.destroy(true);
    };
  }, [canPlay, nextChallengeQuestion, questions.length, runBootKey, setGamePhase]);

  function resetRunState() {
    correctQuestionIdsRef.current = new Set();
    usedChallengeQuestionIdsRef.current = new Set();
    movementControlsRef.current = { ...defaultMovementControls };
    runStartedAtRef.current = Date.now();
    setChallenge(null);
    setStatusMessage(trophyObjectiveCopy);
    setShowTrophyCelebration(false);
    setStats(defaultStats);
  }

  function startGame() {
    resetRunState();
    setGamePhase("ready");
    setRunBootKey((currentKey) => currentKey + 1);
  }

  function restartRun() {
    resetRunState();
    setGamePhase("ready");
    if (!gameControlRef.current) {
      setRunBootKey((currentKey) => currentKey + 1);
      return;
    }
    gameControlRef.current?.restart();
  }

  function handleChallengeAnswered(question: PublicQuestion, feedback: AttemptFeedback) {
    const challengeKind = challenge?.kind ?? "attack";
    if (feedback.correct && challengeKind === "attack") correctQuestionIdsRef.current.add(question.id);
    const nextMessage = feedback.correct
      ? challengeKind === "attack"
        ? t({ en: "Answer accepted. Enemy defeated and 2 coins earned.", zh: "答案正確，擊敗敵人並獲得 2 枚金幣。" })
        : t({ en: "Correct. No HP lost. You are invulnerable for 5 seconds.", zh: "答對了，沒有扣 HP；你會獲得 5 秒無敵時間。" })
      : challengeKind === "attack"
        ? t({ en: "That throw missed the math target. Regroup and keep moving.", zh: "這次投擲未命中數學目標；整理思路後繼續前進。" })
        : t({ en: "Incorrect contact answer. HP drops and you are invulnerable for 3 seconds.", zh: "接觸題答錯，扣 1 點 HP，並獲得 3 秒無敵時間。" });
    setStatusMessage(nextMessage);
    window.setTimeout(() => {
      setChallenge(null);
      gameControlRef.current?.resolveChallenge(feedback.correct);
    }, 900);
  }

  function setVirtualControl(control: keyof MovementControls, pressed: boolean) {
    if (phaseRef.current !== "ready") return;
    movementControlsRef.current = {
      ...movementControlsRef.current,
      [control]: control === "throwAxe" ? pressed || movementControlsRef.current.throwAxe : pressed
    };
  }

  const lockCopy = eligibility?.reason === "need-accuracy"
    ? t({
        en: `This topic round is ${eligibility.accuracyPercent}%. Reach 80%+ in a complete 5-question round to unlock Adventure Island.`,
        zh: `本課題回合準確率為 ${eligibility.accuracyPercent}%。完整 5 題達到 80%+ 才可解鎖探险岛。`
      })
    : eligibility?.reason === "mixed-topic"
      ? t({
          en: "Adventure Island only unlocks from one Practice Arena topic at a time.",
          zh: "探险岛每次只接受同一個練習場課題解鎖。"
        })
      : eligibility?.reason === "already-completed"
        ? t({
            en: "Adventure Island is already complete for this topic. Return to Practice Arena and finish another same-topic round to unlock Fishing Master.",
            zh: "本課題探险岛已通關。返回練習場再完成同課題回合，即可解鎖捕魚達人。"
          })
        : t({
            en: `Complete ${Math.max(0, 5 - (eligibility?.attemptCount ?? 0))} more tracked same-topic Practice Arena attempt(s), then keep accuracy at 80%+.`,
            zh: `請再完成 ${Math.max(0, 5 - (eligibility?.attemptCount ?? 0))} 題同課題有紀錄練習，並保持 80%+ 準確率。`
          });

  return (
    <div className="space-y-6">
      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
              {t({ en: "Practice Arena Adventure Island", zh: "练习场探险岛" })}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
              {questTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base sm:leading-7">
              {t({
                en: "A side-scrolling Adventure Island run with collectible coins, axe throws, topic-bound practice battles, and a trophy finish.",
                zh: "橫向探险岛：收集金幣、投擲斧頭、完成同課題練習戰鬥，最後抵達獎盃。"
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-300/45 bg-cyan-400/10 p-4 dark:border-cyan-200/20">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-100">
              {t({ en: "Unlock evidence", zh: "解鎖證據" })}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/[0.06]">
                <p className="text-2xl font-black text-slate-950 dark:text-white">{eligibility?.attemptCount ?? 0}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "attempts", zh: "練習" })}</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/[0.06]">
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-200">{eligibility?.accuracyPercent ?? 0}%</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "accuracy", zh: "準確率" })}</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/[0.06]">
                <p className="text-2xl font-black text-amber-600 dark:text-amber-200">+{eligibility?.rewardPreview.rewardPoints ?? 35}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "points", zh: "積分" })}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loadError ? (
        <div className="glass-panel border-amber-300/40 bg-amber-400/10 p-5 text-sm font-bold text-amber-800 dark:text-amber-100">
          {loadError}
        </div>
      ) : null}

      {!canPlay && phase !== "loading" ? (
        <section className="glass-panel p-6 text-center">
          <p className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Adventure Island locked", zh: "探险岛尚未解鎖" })}</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{lockCopy}</p>
          <Link href="/practice" className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t(dictionary.pages.practiceTitle)}
          </Link>
        </section>
      ) : null}

      {canPlay ? (
        <section className="glass-panel overflow-hidden p-4 sm:p-5">
          {phase !== "welcome" ? (
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={restartRun} className="focus-ring rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-white">
                {t({ en: "Restart", zh: "重新開始" })}
              </button>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-sky-50 dark:border-white/10 dark:bg-slate-900">
            <div
              ref={gameRootRef}
              data-testid="adventure-island-stage"
              data-coins={stats.coins}
              data-axes={stats.axes}
              data-defeated={stats.defeatedEnemies}
              data-lives={stats.lives}
              data-phase={phase}
              data-challenge-kind={challenge?.kind ?? ""}
              className={cn("min-h-[360px] w-full sm:min-h-[420px]", phase === "challenge" || phase === "submitting" ? "opacity-70" : "opacity-100")}
            />
            {phase === "welcome" ? (
              <div
                data-testid="adventure-island-welcome"
                className="absolute inset-0 z-20 flex min-h-[360px] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#7dd3fc_0%,#34d399_48%,#14532d_100%)] p-5 text-center sm:min-h-[420px]"
              >
                <div className="absolute inset-x-0 bottom-0 h-[30%] bg-[linear-gradient(180deg,rgba(20,83,45,0)_0%,rgba(20,83,45,0.9)_100%)]" />
                <div className="absolute left-0 top-0 h-full w-[34%] bg-[linear-gradient(90deg,rgba(69,26,3,0.5)_0%,rgba(21,128,61,0.3)_44%,rgba(21,128,61,0)_100%)]" />
                <div className="absolute left-[4%] top-[8%] h-[76%] w-8 rounded-full bg-amber-950/70 shadow-[28px_12px_0_rgba(69,26,3,0.42),54px_-8px_0_rgba(69,26,3,0.28)]" />
                <div className="absolute left-[2%] top-[2%] h-28 w-44 rounded-b-full bg-emerald-800/70 blur-[1px]" />
                <div className="absolute left-[18%] top-[14%] h-20 w-36 rounded-b-full bg-lime-700/55 blur-[1px]" />
                <div className="absolute right-[8%] top-[10%] h-16 w-28 rounded-b-full bg-cyan-100/30" />
                <div className="absolute bottom-[16%] right-[8%] h-12 w-48 rounded-lg border border-amber-300/50 bg-amber-800/75 shadow-[0_8px_0_rgba(69,26,3,0.45)]" />
                <div className="absolute bottom-[28%] right-[21%] h-10 w-40 rounded-lg border border-amber-300/45 bg-amber-700/75 shadow-[0_8px_0_rgba(69,26,3,0.36)]" />
                <div className="absolute bottom-[18%] left-[10%] grid h-12 w-12 place-items-center rounded-full border border-yellow-100/80 bg-yellow-300 shadow-[0_6px_0_rgba(146,64,14,0.6)]">
                  <CoinIcon />
                </div>
                <div className="absolute bottom-[34%] left-[23%] grid h-12 w-12 place-items-center rounded-full border border-yellow-100/70 bg-yellow-300 shadow-[0_6px_0_rgba(146,64,14,0.5)]">
                  <CoinIcon />
                </div>
                <div className="absolute bottom-[19%] right-[24%] grid h-14 w-14 rotate-[-8deg] place-items-center rounded-2xl border border-slate-100/70 bg-white/80 shadow-lg">
                  <HammerIcon />
                </div>
                <div className="absolute bottom-[18%] right-[11%] grid h-14 w-16 place-items-center rounded-t-full border border-rose-200/70 bg-rose-500/85 shadow-[0_6px_0_rgba(127,29,29,0.4)]">
                  <EnemyIcon />
                </div>
                <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-50/95">
                    {t({ en: "Adventure Island", zh: "探险岛" })}
                  </p>
                  <h2 className="mt-3 text-4xl font-black leading-tight text-white drop-shadow sm:text-5xl">
                    {t({ en: "Adventure Island", zh: "探险岛" })}
                  </h2>
                  <p className="mt-4 max-w-md text-sm font-bold leading-6 text-emerald-50/95 sm:text-base">
                    {t({
                      en: "Jump across storybook steps, collect coins and hammers, and solve math battles to defeat monsters before reaching the trophy 🏆.",
                      zh: "在故事書般的台階上跳躍，收集金幣和錘子，回答數學挑戰擊敗怪物，最後抵達獎盃 🏆。"
                    })}
                  </p>
                  <p
                    data-testid="adventure-island-objective-tip"
                    className="mt-4 max-w-md border-l-4 border-yellow-200 pl-3 text-left text-sm font-black leading-6 text-white drop-shadow"
                  >
                    {trophyObjectiveCopy}
                  </p>
                  <button
                    type="button"
                    data-testid="adventure-island-start-button"
                    onClick={startGame}
                    className="focus-ring mt-8 rounded-full border border-yellow-200 bg-gradient-to-b from-yellow-200 to-amber-500 px-10 py-4 text-lg font-black text-sky-950 shadow-[0_10px_0_rgba(120,53,15,0.55)] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_5px_0_rgba(120,53,15,0.55)]"
                  >
                    {t({ en: "Start Game", zh: "开始游戏" })}
                  </button>
                </div>
              </div>
            ) : null}
            <AnimatePresence>
              {showTrophyCelebration ? (
                <motion.div
                  aria-live="polite"
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-950/10 p-4 backdrop-blur-[1px]"
                  data-testid="adventure-island-clear-celebration"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.68, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.88, y: -10 }}
                    transition={{ type: "spring", stiffness: 230, damping: 17 }}
                    className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-amber-200/80 bg-white/95 px-6 py-5 text-center shadow-2xl shadow-amber-900/15 ring-1 ring-white/80 dark:border-amber-200/25 dark:bg-slate-950/95 dark:ring-white/10"
                  >
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-cyan-300 to-emerald-400" />
                    <motion.div
                      aria-hidden="true"
                      initial={{ scale: 0.5, rotate: -12 }}
                      animate={{ scale: [0.5, 1.14, 1], rotate: [-12, 8, 0] }}
                      transition={{ duration: 0.62, ease: "easeOut" }}
                      className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-300/20 text-4xl ring-8 ring-amber-300/15"
                    >
                      <span className="text-amber-500">★</span>
                    </motion.div>
                    <p className="mt-4 text-3xl font-black leading-tight text-slate-950 dark:text-white">
                      {t({ en: "Congratulations!", zh: "恭喜通關！" })}
                    </p>
                    <p className="mx-auto mt-2 max-w-[16rem] text-sm font-bold leading-5 text-slate-600 dark:text-slate-300">
                      {phase === "submitting"
                        ? t({ en: "Recording your trophy clear...", zh: "正在記錄獎盃通關..." })
                        : t({ en: "Trophy clear complete.", zh: "獎盃通關完成。" })}
                    </p>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {phase !== "welcome" ? (
              <>
                <div className="pointer-events-none absolute right-3 top-3 flex flex-wrap justify-end gap-2" data-testid="adventure-island-hud">
                  {[
                    { key: "coins", label: t({ en: "Coins", zh: "金幣" }), icon: <CoinIcon />, value: stats.coins },
                    { key: "axes", label: t({ en: "Axes", zh: "斧頭" }), icon: <AxeIcon />, value: stats.axes },
                    { key: "enemies", label: t({ en: "Axe defeats", zh: "斧頭擊敗" }), icon: <EnemyIcon />, value: `${stats.defeatedEnemies}/${trophyRequiredDefeats}` },
                    {
                      key: "hp",
                      label: t({ en: "HP", zh: "HP" }),
                      icon: null,
                      value: (
                        <span className="flex items-center gap-0.5" aria-hidden="true">
                          {Array.from({ length: maxHeroHp }, (_, index) => <HeartIcon key={index} filled={index < stats.lives} />)}
                        </span>
                      )
                    },
                    { key: "time", label: t({ en: "Time", zh: "時間" }), icon: <ClockIcon />, value: `${formatRunTime(stats.elapsedSeconds)} / ${formatRunTime(targetGameDurationSeconds)}` }
                  ].map((item) => (
                    <div
                      key={item.key}
                      aria-label={`${item.label} ${typeof item.value === "number" || typeof item.value === "string" ? item.value : stats.lives}`}
                      data-testid={`adventure-island-hud-${item.key}`}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2 text-xs font-black text-slate-950 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
                    >
                      {item.icon}
                      <span className="sr-only">{item.label}</span>
                      <span className={cn(item.key === "hp" ? "min-w-[3.25rem]" : "min-w-4 text-center")}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-3 left-3 flex gap-3">
                  {[
                    { label: "←", control: "left", title: "Move left" },
                    { label: "→", control: "right", title: "Move right" },
                    { label: "␣", control: "jump", title: "Jump" },
                    { label: "T", control: "throwAxe", title: "Throw axe" }
                  ].map((control) => (
                    <button
                      key={control.label}
                      type="button"
                      title={control.title}
                      aria-label={control.title}
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setVirtualControl(control.control as keyof MovementControls, true);
                      }}
                      onPointerUp={(event) => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                        }
                        setVirtualControl(control.control as keyof MovementControls, false);
                      }}
                      onPointerCancel={() => setVirtualControl(control.control as keyof MovementControls, false)}
                      onPointerLeave={() => setVirtualControl(control.control as keyof MovementControls, false)}
                      className="focus-ring grid h-12 min-w-12 touch-none place-items-center rounded-xl border border-slate-300/70 bg-white/85 px-3 text-base font-black text-slate-700 shadow-sm transition hover:bg-cyan-100 active:scale-95 active:bg-cyan-200 dark:border-white/10 dark:bg-slate-950/75 dark:text-white dark:hover:bg-cyan-950"
                    >
                      {control.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {statusMessage ? (
            <p data-testid="adventure-island-status-message" className="mt-3 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-800 dark:text-cyan-100">
              {statusMessage}
            </p>
          ) : null}

          {phase === "cleared" ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/45 bg-emerald-400/10 p-4">
              <p className="text-lg font-black text-emerald-800 dark:text-emerald-100">{t({ en: "Practice Quest trophy clear", zh: "練習任務獎盃通關" })}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {eligibility?.alreadyCompleted
                  ? t({ en: "This topic's Adventure Island reward has been claimed. Replay any time for practice.", zh: "本課題探险岛獎勵已領取；仍可重玩練習。" })
                  : t({ en: "Check the Motivation Hub for XP, badge, and point updates.", zh: "可到激勵中心查看 XP、徽章和積分更新。" })}
              </p>
              <div className="mt-4 grid gap-3 rounded-2xl border border-cyan-300/40 bg-cyan-400/10 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                    {t({ en: "More practice path", zh: "更多練習路線" })}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
                    {t({
                      en: "Return to the same Practice Arena unit, complete another 5-question 80%+ round, then Fishing Master will unlock.",
                      zh: "返回同一個練習場單元，再完成一次 5 題 80%+ 回合，即可解鎖捕魚達人。"
                    })}
                  </p>
                </div>
                <Link
                  href={roundPayload?.topicId ? `/practice?topicId=${encodeURIComponent(roundPayload.topicId)}#free-selection` : "/practice#free-selection"}
                  aria-label={t({ en: "Go back to the same Practice Arena unit", zh: "返回同一個練習場單元" })}
                  className="focus-ring inline-flex justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
                >
                  {t({ en: "Practice Same Unit", zh: "練習同一單元" })}
                </Link>
              </div>
            </div>
          ) : null}

          <AnimatePresence>
            {phase === "game-over" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
              >
                <motion.section
                  data-testid="adventure-island-game-over"
                  initial={{ opacity: 0, scale: 0.7, rotateX: 18, y: 36 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -18 }}
                  transition={{ type: "spring", stiffness: 210, damping: 18 }}
                  className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-rose-200/70 bg-white p-7 text-center shadow-2xl dark:border-rose-200/20 dark:bg-slate-950"
                >
                  <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-rose-500 via-amber-300 to-cyan-400" />
                  <motion.div
                    aria-hidden="true"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
                    transition={{ duration: 0.65, ease: "easeOut" }}
                    className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-rose-500/15 text-rose-500 ring-8 ring-rose-500/10"
                  >
                    <HeartIcon filled={false} />
                  </motion.div>
                  <motion.p
                    initial={{ letterSpacing: "0.02em" }}
                    animate={{ letterSpacing: "0.12em" }}
                    transition={{ duration: 0.45 }}
                    className="mt-5 text-4xl font-black text-rose-600 dark:text-rose-200 sm:text-5xl"
                  >
                    GAME OVER
                  </motion.p>
                  <p className="mx-auto mt-3 max-w-sm text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                    {t({ en: "Both HP hearts are gone. Restart the run, answer contact challenges carefully, and keep axes ready for attacks.", zh: "兩點 HP 已用完。重新開始後，謹慎回答接觸題，並準備斧頭攻擊。" })}
                  </p>
                  <button
                    type="button"
                    onClick={restartRun}
                    className="focus-ring mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 dark:bg-white dark:text-slate-950"
                  >
                    {t({ en: "Restart run", zh: "重新開始" })}
                  </button>
                </motion.section>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      ) : null}

      {challenge ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                {challenge.kind === "attack"
                  ? t({ en: "Axe hit challenge", zh: "斧頭命中挑戰" })
                  : t({ en: "Contact challenge", zh: "接觸挑戰" })}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {challenge.enemyName}
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {challenge.kind === "attack"
                  ? t({ en: "Solve the practice challenge to finish the hit.", zh: "完成練習挑戰，完成這次攻擊。" })
                  : t({ en: "Solve the practice challenge to avoid HP damage. The enemy will keep patrolling.", zh: "完成練習挑戰以避免扣 HP；敵人仍會繼續巡邏。" })}
              </p>
            </div>
            <PracticeQuestionCard question={challenge.question} onAnswered={handleChallengeAnswered} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
