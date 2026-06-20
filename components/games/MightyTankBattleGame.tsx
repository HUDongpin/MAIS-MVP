"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  mightyTankBattleLevels,
  mightyTankBattlePowerUps,
  mightyTankBattleQuestions,
  type MightyTankBattleLevel,
  type MightyTankBattlePowerUp,
  type MightyTankBattleQuestion,
  type MightyTankBattleQuestionOption
} from "@/data/mightyTankBattle";
import {
  resolveMightyTankBattleEngagement,
  resolveMightyTankBattleResult,
  type MightyTankBattleResult,
  type MightyTankBattleShell,
  type MightyTankBattleTarget
} from "@/lib/mightyTankBattle";
import { useSettings } from "@/components/providers/AppProviders";

type TankEnemy = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
};

type PendingShot = {
  target: MightyTankBattleTarget;
  targetId: string;
  targetName: string;
  targetHp: number;
  shell: MightyTankBattleShell;
  question: MightyTankBattleQuestion;
};

type BattleRuntime = {
  timeRemaining: number;
  playerBaseHp: number;
  enemyBaseHp: number;
  playerKills: number;
  enemyKills: number;
  coins: number;
  combo: number;
  cooldownUntil: number;
  activeShell: MightyTankBattleShell;
  specialCharge: number;
  questionsAnswered: number;
  correctAnswers: number;
  enemies: TankEnemy[];
  powerUps: Record<MightyTankBattlePowerUp["id"], number>;
  feedback: string;
};

type GamePhase = "battle" | "question" | "cleared" | "failed";

type Hotspot = {
  id: string;
  label: string;
  style: CSSProperties;
  onClick: () => void;
  disabled?: boolean;
};

const desktopAsset = "/games/mighty-tank-battle/desktop-reference.png";
const mobileAsset = "/games/mighty-tank-battle/mobile-reference.png";

function createEnemies(level: MightyTankBattleLevel): TankEnemy[] {
  const hpBoost = level.order === 1 ? 0 : 25;

  return [
    { id: "vanguard", name: "Vanguard", hp: 110 + hpBoost, maxHp: 110 + hpBoost },
    { id: "raider", name: "Raider", hp: 95 + hpBoost, maxHp: 95 + hpBoost },
    { id: "sentinel", name: "Sentinel", hp: 120 + hpBoost, maxHp: 120 + hpBoost }
  ];
}

function createPowerUpInventory() {
  return mightyTankBattlePowerUps.reduce<Record<MightyTankBattlePowerUp["id"], number>>(
    (inventory, powerUp) => {
      inventory[powerUp.id] = powerUp.charges;
      return inventory;
    },
    { repair: 0, piercing: 0, boost: 0, stealth: 0 }
  );
}

function createRuntime(level: MightyTankBattleLevel): BattleRuntime {
  return {
    timeRemaining: level.timeLimitSeconds,
    playerBaseHp: level.playerBaseHp,
    enemyBaseHp: level.enemyBaseHp,
    playerKills: 3,
    enemyKills: 2,
    coins: 680,
    combo: 1,
    cooldownUntil: 0,
    activeShell: "standard",
    specialCharge: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    enemies: createEnemies(level),
    powerUps: createPowerUpInventory(),
    feedback: "Ready"
  };
}

function statResult(level: MightyTankBattleLevel, runtime: BattleRuntime) {
  return resolveMightyTankBattleResult({
    enemyBaseHp: runtime.enemyBaseHp,
    playerBaseHp: runtime.playerBaseHp,
    playerKills: runtime.playerKills,
    enemyKills: runtime.enemyKills,
    elapsedSeconds: level.timeLimitSeconds - runtime.timeRemaining,
    timeLimitSeconds: level.timeLimitSeconds,
    questionsAnswered: runtime.questionsAnswered,
    correctAnswers: runtime.correctAnswers,
    coins: runtime.coins
  });
}

function chooseQuestion(seed: number) {
  return mightyTankBattleQuestions[seed % mightyTankBattleQuestions.length];
}

function formatResult(result: MightyTankBattleResult) {
  if (result.reason === "enemy-base-destroyed") return "Enemy base destroyed";
  if (result.reason === "kill-lead-timeout") return "Kill lead secured";
  if (result.reason === "player-base-destroyed") return "Player base destroyed";
  if (result.reason === "kill-trail-timeout") return "Enemy held the lead";
  return "Battle in progress";
}

function hiddenAnswerLabel(option: MightyTankBattleQuestionOption, question: MightyTankBattleQuestion) {
  return `Answer ${option.label} for ${question.prompt.en}`;
}

function HotspotButton({ hotspot }: { hotspot: Hotspot }) {
  return (
    <button
      type="button"
      aria-label={hotspot.label}
      title={hotspot.label}
      disabled={hotspot.disabled}
      onClick={hotspot.onClick}
      className="absolute z-20 rounded-md border border-transparent bg-transparent text-transparent outline-none transition focus-visible:border-cyan-200 focus-visible:bg-cyan-300/15 disabled:pointer-events-none"
      style={hotspot.style}
    >
      {hotspot.label}
    </button>
  );
}

function AssetFrame({
  asset,
  alt,
  aspectRatio,
  className,
  hotspots,
  testId
}: {
  asset: string;
  alt: string;
  aspectRatio: number;
  className: string;
  hotspots: Hotspot[];
  testId: string;
}) {
  return (
    <div className={className} data-testid={testId} style={{ aspectRatio }}>
      <img
        src={asset}
        alt={alt}
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-fill"
      />
      {hotspots.map((hotspot) => (
        <HotspotButton key={hotspot.id} hotspot={hotspot} />
      ))}
    </div>
  );
}

export function MightyTankBattleGame() {
  const { t } = useSettings();
  const level = mightyTankBattleLevels[0];
  const [runtime, setRuntime] = useState(() => createRuntime(level));
  const [phase, setPhase] = useState<GamePhase>("question");
  const [pendingShot, setPendingShot] = useState<PendingShot>(() => ({
    target: "enemy-base",
    targetId: "enemy-base",
    targetName: "Enemy Base",
    targetHp: level.enemyBaseHp,
    shell: "standard",
    question: mightyTankBattleQuestions[0]
  }));

  const result = useMemo(() => statResult(level, runtime), [level, runtime]);

  useEffect(() => {
    document.documentElement.classList.add("mighty-tank-battle-active");

    return () => {
      document.documentElement.classList.remove("mighty-tank-battle-active");
    };
  }, []);

  const resetGame = useCallback(() => {
    const nextRuntime = createRuntime(level);
    setRuntime(nextRuntime);
    setPhase("question");
    setPendingShot({
      target: "enemy-base",
      targetId: "enemy-base",
      targetName: "Enemy Base",
      targetHp: nextRuntime.enemyBaseHp,
      shell: "standard",
      question: mightyTankBattleQuestions[0]
    });
  }, [level]);

  const openQuestion = useCallback(
    (target: MightyTankBattleTarget = "enemy-base", targetId = "enemy-base", targetName = "Enemy Base") => {
      const targetHp =
        target === "enemy-base"
          ? runtime.enemyBaseHp
          : runtime.enemies.find((enemy) => enemy.id === targetId)?.hp ?? 100;
      const question = chooseQuestion(runtime.questionsAnswered);

      setPendingShot({
        target,
        targetId,
        targetName,
        targetHp,
        shell: runtime.activeShell,
        question
      });
      setRuntime((current) => ({ ...current, feedback: `Loaded: ${question.prompt.en}` }));
      setPhase("question");
    },
    [runtime.activeShell, runtime.enemies, runtime.enemyBaseHp, runtime.questionsAnswered]
  );

  const answerQuestion = useCallback(
    (option: MightyTankBattleQuestionOption) => {
      const shot = pendingShot;
      const engagement = resolveMightyTankBattleEngagement({
        target: shot.target,
        targetHp: shot.targetHp,
        baseDamage: level.baseDamage,
        mathCorrect: option.correct,
        combo: runtime.combo,
        shell: shot.shell,
        cooldownMs: Math.max(650, runtime.cooldownUntil || 1300)
      });

      setRuntime((current) => {
        const nextEnemies =
          shot.target === "enemy-tank"
            ? current.enemies.map((enemy) =>
                enemy.id === shot.targetId ? { ...enemy, hp: Math.max(0, enemy.hp - engagement.damage) } : enemy
              )
            : current.enemies;
        const enemyDestroyed =
          shot.target === "enemy-tank" &&
          nextEnemies.find((enemy) => enemy.id === shot.targetId)?.hp === 0 &&
          current.enemies.find((enemy) => enemy.id === shot.targetId)?.hp !== 0;
        const nextEnemyBaseHp =
          shot.target === "enemy-base" ? Math.max(0, current.enemyBaseHp - engagement.damage) : current.enemyBaseHp;
        const nextRuntime: BattleRuntime = {
          ...current,
          enemyBaseHp: nextEnemyBaseHp,
          playerKills: current.playerKills + (enemyDestroyed ? 1 : 0),
          coins: current.coins + engagement.coins,
          combo: engagement.nextCombo,
          cooldownUntil: engagement.nextCooldownMs,
          specialCharge: Math.min(100, current.specialCharge + engagement.specialCharge),
          activeShell: shot.shell === "standard" ? current.activeShell : "standard",
          questionsAnswered: current.questionsAnswered + 1,
          correctAnswers: current.correctAnswers + (option.correct ? 1 : 0),
          enemies: nextEnemies,
          feedback: option.correct
            ? `Hit ${shot.targetName}: +${engagement.damage} damage, +${engagement.coins} coins`
            : `Glancing hit: +${engagement.damage} damage`
        };
        const nextResult = statResult(level, nextRuntime);

        if (nextResult.reason !== "battle-in-progress") {
          setPhase(nextResult.cleared ? "cleared" : "failed");
        } else {
          setPhase("battle");
        }

        return nextRuntime;
      });
    },
    [level, pendingShot, runtime.combo, runtime.cooldownUntil]
  );

  const usePowerUp = useCallback((powerUpId: MightyTankBattlePowerUp["id"]) => {
    setRuntime((current) => {
      const charges = current.powerUps[powerUpId] ?? 0;
      if (charges <= 0) return current;

      if (powerUpId === "repair") {
        return {
          ...current,
          playerBaseHp: Math.min(level.playerBaseHp, current.playerBaseHp + 180),
          powerUps: { ...current.powerUps, [powerUpId]: charges - 1 },
          feedback: "Repair kit restored base armor"
        };
      }

      const powerUp = mightyTankBattlePowerUps.find((item) => item.id === powerUpId);
      return {
        ...current,
        activeShell: powerUp?.shell ?? current.activeShell,
        powerUps: { ...current.powerUps, [powerUpId]: charges - 1 },
        feedback: `${powerUp?.label.en ?? "Power-up"} armed`
      };
    });
  }, [level.playerBaseHp]);

  const answerOptions = pendingShot.question.options;
  const desktopOptions = answerOptions.length >= 4 ? answerOptions : [...answerOptions, { id: "visual-d", label: "42", correct: false }];
  const inactive = phase === "cleared" || phase === "failed";

  const desktopHotspots: Hotspot[] = [
    {
      id: "desktop-fire",
      label: "Fire shell",
      style: { left: "86.1%", top: "78.8%", width: "9.7%", height: "17.4%" },
      onClick: () => openQuestion("enemy-base", "enemy-base", "Enemy Base"),
      disabled: inactive
    },
    {
      id: "desktop-rocket",
      label: "Arm piercing shell",
      style: { left: "75.3%", top: "81.2%", width: "7.1%", height: "12.3%" },
      onClick: () => usePowerUp("piercing"),
      disabled: inactive
    },
    {
      id: "desktop-joystick",
      label: "Move tank",
      style: { left: "2.4%", top: "71.2%", width: "16.5%", height: "24.8%" },
      onClick: () =>
        setRuntime((current) => ({
          ...current,
          feedback: "Virtual joystick engaged"
        })),
      disabled: inactive
    },
    ...desktopOptions.slice(0, 4).map((option, index) => ({
      id: `desktop-answer-${option.id}`,
      label: hiddenAnswerLabel(option, pendingShot.question),
      style: {
        left: `${38.6 + index * 8.75}%`,
        top: "72.8%",
        width: "5.8%",
        height: "8.8%"
      },
      onClick: () => answerQuestion(option),
      disabled: inactive
    })),
    ...answerOptions.slice(0, 4).map((option, index) => ({
      id: `desktop-side-answer-${option.id}`,
      label: `Panel ${hiddenAnswerLabel(option, pendingShot.question)}`,
      style: {
        left: `${75 + (index % 2) * 10.8}%`,
        top: `${34.6 + Math.floor(index / 2) * 10.4}%`,
        width: "8.2%",
        height: "7.8%"
      },
      onClick: () => answerQuestion(option),
      disabled: inactive
    }))
  ];

  const mobileHotspots: Hotspot[] = [
    {
      id: "mobile-fire",
      label: "Fire shell",
      style: { left: "67.2%", top: "61.8%", width: "23.8%", height: "13.8%" },
      onClick: () => openQuestion("enemy-base", "enemy-base", "Enemy Base"),
      disabled: inactive
    },
    {
      id: "mobile-joystick",
      label: "Move tank",
      style: { left: "3.8%", top: "62.1%", width: "27.2%", height: "14.9%" },
      onClick: () =>
        setRuntime((current) => ({
          ...current,
          feedback: "Virtual joystick engaged"
        })),
      disabled: inactive
    },
    ...answerOptions.slice(0, 3).map((option, index) => ({
      id: `mobile-answer-${option.id}`,
      label: hiddenAnswerLabel(option, pendingShot.question),
      style: {
        left: `${6.5 + index * 30.8}%`,
        top: "86%",
        width: "25.4%",
        height: "9.7%"
      },
      onClick: () => answerQuestion(option),
      disabled: inactive
    }))
  ];

  return (
    <main className="fixed inset-0 z-[120] grid overflow-hidden bg-[#05080e] text-white" data-testid="mighty-tank-battle">
      <style>{`
        .mighty-tank-battle-active [aria-label="Ask AI Tutor"],
        .mighty-tank-battle-active [aria-label="AI Tutor"],
        .mighty-tank-battle-active [aria-label="AI Tutor selected text agent"] {
          display: none !important;
        }
      `}</style>
      <h1 className="sr-only">Mighty Tank Battle - 威猛坦克大战</h1>

      <AssetFrame
        asset={desktopAsset}
        alt="Mighty Tank Battle desktop battle screen using the owner-designed game UI artwork."
        aspectRatio={1672 / 941}
        className="relative hidden h-[100dvh] max-h-[100dvh] w-auto max-w-[100vw] place-self-center overflow-hidden lg:block"
        hotspots={desktopHotspots}
        testId="mighty-tank-desktop-asset"
      />

      <AssetFrame
        asset={mobileAsset}
        alt="Mighty Tank Battle mobile battle screen using the owner-designed game UI artwork."
        aspectRatio={941 / 1672}
        className="relative h-auto max-h-[100dvh] w-[100vw] max-w-[calc(100dvh*941/1672)] place-self-center overflow-hidden lg:hidden"
        hotspots={mobileHotspots}
        testId="mighty-tank-mobile-asset"
      />

      <div className="sr-only" aria-live="polite" data-testid="mighty-tank-status">
        {t(level.title)}. Phase: {phase}. Coins: {runtime.coins}. Player kills: {runtime.playerKills}. Enemy kills:{" "}
        {runtime.enemyKills}. Enemy base HP: {runtime.enemyBaseHp}. Player base HP: {runtime.playerBaseHp}. Combo:{" "}
        {runtime.combo}. Accuracy: {result.accuracyPercent}. Result: {formatResult(result)}. Feedback:{" "}
        {runtime.feedback}.
      </div>

      {(phase === "cleared" || phase === "failed") && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/70 px-5 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-lg border border-cyan-200/50 bg-slate-950/90 p-5 text-center shadow-2xl shadow-cyan-950/40">
            <p className="text-sm font-black uppercase tracking-normal text-cyan-200">
              {phase === "cleared" ? "Mission Clear" : "Mission Failed"}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-normal text-white">{formatResult(result)}</h2>
            <p className="mt-3 text-sm text-white/75">
              {result.stars} stars · {result.reward.coins} coins · {result.reward.xp} XP · {result.accuracyPercent}% accuracy
            </p>
            <button
              type="button"
              onClick={resetGame}
              className="mt-5 rounded-md border border-cyan-200/70 bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100"
            >
              Replay draft
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
