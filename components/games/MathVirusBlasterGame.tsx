"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  mathVirusBlasterDesignImagePath,
  mathVirusBlasterLevels,
  mathVirusBlasterQuestions,
  mathVirusBlasterTopicMeta,
  type MathVirusBlasterQuestion,
  type MathVirusBlasterUpgrade,
  type MathVirusBlasterVirus
} from "@/data/mathVirusBlaster";
import {
  resolveMathVirusBlasterHit,
  resolveMathVirusBlasterLevelResult,
  type MathVirusBlasterLevelResult
} from "@/lib/mathVirusBlaster";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/providers/AppProviders";
import type { LocalizedText } from "@/types";

type RuntimeVirus = MathVirusBlasterVirus & {
  currentHp: number;
  defeated: boolean;
};

type Popup = {
  id: number;
  x: number;
  y: number;
  text: string;
  tone: "damage" | "coin" | "upgrade" | "shield";
};

type Beam = {
  id: number;
  x: number;
  y: number;
  critical: boolean;
};

type GamePhase = "playing" | "question" | "cleared" | "failed";
type UpgradeLevels = Record<MathVirusBlasterUpgrade["id"], number>;

const level = mathVirusBlasterLevels[0];
const stageStyle: CSSProperties = {
  aspectRatio: "1586 / 992",
  maxWidth: "1586px",
  width: "min(100%, 1586px, calc(159.88vh - 2.4rem))"
};
const upgradeHotspots: Record<MathVirusBlasterUpgrade["id"], { x: number; y: number; w: number; h: number }> = {
  power: { x: 20.4, y: 89, w: 8.4, h: 16.2 },
  fireRate: { x: 29.3, y: 89, w: 8.2, h: 16.2 },
  equationPower: { x: 38.7, y: 89, w: 8.8, h: 16.2 },
  shield: { x: 61.4, y: 89, w: 8.6, h: 16.2 },
  drone: { x: 70.7, y: 89, w: 8.4, h: 16.2 },
  coinBonus: { x: 79.4, y: 89, w: 8.2, h: 16.2 }
};

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function createRuntimeViruses() {
  return level.viruses.map((virus) => ({
    ...virus,
    currentHp: virus.hp,
    defeated: false
  }));
}

function createUpgradeLevels() {
  return level.upgrades.reduce<UpgradeLevels>((levels, upgrade) => {
    levels[upgrade.id] = upgrade.level;
    return levels;
  }, {
    power: 0,
    fireRate: 0,
    equationPower: 0,
    shield: 0,
    drone: 0,
    coinBonus: 0
  });
}

function questionForVirus(virus: RuntimeVirus, offset: number) {
  const candidates = mathVirusBlasterQuestions.filter((question) => question.topic === virus.topic);
  const pool = candidates.length > 0 ? candidates : mathVirusBlasterQuestions;
  return pool[offset % pool.length];
}

function percentStyle({ x, y, w, h }: { x: number; y: number; w: number; h: number }): CSSProperties {
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${w}%`,
    height: `${h}%`,
    transform: "translate(-50%, -50%)"
  };
}

function screenReaderText(localized: LocalizedText, t: (value: LocalizedText) => string) {
  return t(localized);
}

export function MathVirusBlasterGame() {
  const { t } = useSettings();
  const [viruses, setViruses] = useState<RuntimeVirus[]>(() => createRuntimeViruses());
  const [coins, setCoins] = useState(level.initialState.coins);
  const [runCoins, setRunCoins] = useState(0);
  const [combo, setCombo] = useState(level.initialState.combo);
  const [maxCombo, setMaxCombo] = useState(level.initialState.combo);
  const [shield, setShield] = useState(level.initialState.shield);
  const [elapsedSeconds, setElapsedSeconds] = useState(level.initialState.elapsedSeconds);
  const [overcharge, setOvercharge] = useState(level.initialState.overcharge);
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [selectedVirusId, setSelectedVirusId] = useState(level.viruses[0].id);
  const [pendingVirusId, setPendingVirusId] = useState<string | null>(null);
  const [questionOffset, setQuestionOffset] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [upgradeLevels, setUpgradeLevels] = useState<UpgradeLevels>(() => createUpgradeLevels());
  const [autoFire, setAutoFire] = useState(true);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [beam, setBeam] = useState<Beam | null>(null);
  const [finalResult, setFinalResult] = useState<MathVirusBlasterLevelResult | null>(null);
  const [feedback, setFeedback] = useState<LocalizedText | null>(null);

  const baseUpgradeLevels = useMemo(() => createUpgradeLevels(), []);
  const pendingVirus = pendingVirusId ? viruses.find((virus) => virus.id === pendingVirusId) ?? null : null;
  const selectedVirus = viruses.find((virus) => virus.id === selectedVirusId && !virus.defeated) ?? viruses.find((virus) => !virus.defeated) ?? null;
  const pendingQuestion: MathVirusBlasterQuestion | null = pendingVirus ? questionForVirus(pendingVirus, questionOffset) : null;
  const defeatedClearValue = viruses.reduce((total, virus) => total + (virus.defeated ? virus.clearValue : 0), 0);
  const defeatedViruses = level.initialDefeatedViruses + defeatedClearValue;
  const progressPercent = Math.min(100, Math.round((defeatedViruses / level.totalViruses) * 100));
  const timeRemaining = Math.max(0, level.timeLimitSeconds - elapsedSeconds);
  const accuracyPercent = questionsAnswered === 0 ? 100 : Math.round((correctAnswers / questionsAnswered) * 100);
  const effectiveBaseDamage =
    level.baseDamage +
    Math.max(0, upgradeLevels.power - baseUpgradeLevels.power) * 2 +
    Math.max(0, upgradeLevels.equationPower - baseUpgradeLevels.equationPower) * 3;
  const coinMultiplier = 1 + Math.max(0, upgradeLevels.coinBonus - baseUpgradeLevels.coinBonus) * 0.08;

  const addPopup = useCallback((popup: Omit<Popup, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setPopups((items) => [...items, { ...popup, id }]);
    window.setTimeout(() => {
      setPopups((items) => items.filter((item) => item.id !== id));
    }, 950);
  }, []);

  const setTemporaryFeedback = useCallback((message: LocalizedText) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 1800);
  }, []);

  const resolveFinalResult = useCallback(
    (input: {
      nextDefeatedViruses: number;
      nextElapsedSeconds: number;
      nextMaxCombo: number;
      nextQuestionsAnswered: number;
      nextCorrectAnswers: number;
      nextRunCoins: number;
    }) =>
      resolveMathVirusBlasterLevelResult({
        totalViruses: level.totalViruses,
        defeatedViruses: input.nextDefeatedViruses,
        elapsedSeconds: input.nextElapsedSeconds,
        timeLimitSeconds: level.timeLimitSeconds,
        maxCombo: input.nextMaxCombo,
        questionsAnswered: input.nextQuestionsAnswered,
        correctAnswers: input.nextCorrectAnswers,
        coins: input.nextRunCoins
      }),
    []
  );

  const finishRun = useCallback(
    (result: MathVirusBlasterLevelResult) => {
      setFinalResult(result);
      setPhase(result.cleared ? "cleared" : "failed");
    },
    []
  );

  const resetRun = useCallback(() => {
    setViruses(createRuntimeViruses());
    setCoins(level.initialState.coins);
    setRunCoins(0);
    setCombo(level.initialState.combo);
    setMaxCombo(level.initialState.combo);
    setShield(level.initialState.shield);
    setElapsedSeconds(level.initialState.elapsedSeconds);
    setOvercharge(level.initialState.overcharge);
    setSelectedVirusId(level.viruses[0].id);
    setPendingVirusId(null);
    setQuestionOffset(0);
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setUpgradeLevels(createUpgradeLevels());
    setPhase("playing");
    setFinalResult(null);
    setFeedback(null);
    setBeam(null);
    setPopups([]);
  }, []);

  useEffect(() => {
    document.body.classList.add("math-virus-blaster-immersive");
    return () => {
      document.body.classList.remove("math-virus-blaster-immersive");
    };
  }, []);

  const fireAtSelectedVirus = useCallback(() => {
    if (phase !== "playing" || !selectedVirus) return;
    setPendingVirusId(selectedVirus.id);
    setPhase("question");
  }, [phase, selectedVirus]);

  const answerQuestion = useCallback(
    (optionId: string) => {
      if (!pendingVirus || !pendingQuestion) return;

      const option = pendingQuestion.options.find((item) => item.id === optionId);
      if (!option) return;

      const wasCorrect = option.correct;
      const hit = resolveMathVirusBlasterHit({
        targetHp: pendingVirus.currentHp,
        targetCoinValue: pendingVirus.coinValue,
        baseDamage: effectiveBaseDamage,
        combo,
        mathCorrect: wasCorrect,
        topicMatched: pendingQuestion.topic === pendingVirus.topic,
        overcharged: overcharge >= 70
      });
      const earnedCoins = Math.round(hit.coins * coinMultiplier);
      const nextCombo = hit.nextCombo;
      const nextQuestionsAnswered = questionsAnswered + 1;
      const nextCorrectAnswers = correctAnswers + (wasCorrect ? 1 : 0);
      const nextMaxCombo = Math.max(maxCombo, nextCombo);
      const nextRunCoins = runCoins + earnedCoins;
      let nextDefeatedViruses = defeatedViruses;
      let targetX = pendingVirus.x;
      let targetY = pendingVirus.y;

      const nextViruses = viruses.map((virus) => {
        if (virus.id !== pendingVirus.id) return virus;
        const currentHp = Math.max(0, virus.currentHp - hit.damage);
        const defeated = virus.defeated || hit.defeated || currentHp <= 0;
        if (!virus.defeated && defeated) {
          nextDefeatedViruses += virus.clearValue;
        }
        targetX = virus.x;
        targetY = virus.y;
        return {
          ...virus,
          currentHp,
          defeated
        };
      });

      setViruses(nextViruses);
      setCoins((value) => value + earnedCoins);
      setRunCoins(nextRunCoins);
      setCombo(nextCombo);
      setMaxCombo(nextMaxCombo);
      setQuestionsAnswered(nextQuestionsAnswered);
      setCorrectAnswers(nextCorrectAnswers);
      setQuestionOffset((value) => value + 1);
      setOvercharge((value) => (value >= 70 && wasCorrect ? hit.overchargeGain : Math.min(100, value + hit.overchargeGain)));
      setPendingVirusId(null);
      setBeam({ id: Date.now(), x: targetX, y: targetY, critical: hit.feedback === "critical" });
      window.setTimeout(() => setBeam(null), 520);
      addPopup({
        x: targetX,
        y: targetY + 7,
        text: `-${hit.damage}`,
        tone: "damage"
      });

      if (earnedCoins > 0) {
        addPopup({
          x: targetX + 6,
          y: targetY - 7,
          text: `+${earnedCoins}`,
          tone: "coin"
        });
      }

      if (!wasCorrect) {
        setShield((value) => Math.max(0, value - 1));
        setTemporaryFeedback({
          en: pendingQuestion.explanation.en,
          zh: pendingQuestion.explanation.zh,
          zhHans: pendingQuestion.explanation.zhHans
        });
      } else {
        setTemporaryFeedback({
          en: hit.defeated ? "Virus cleared. Coins burst collected." : "Correct. Beam overcharged.",
          zh: hit.defeated ? "病毒已清除，金幣已收集。" : "答對了，光束已過載。",
          zhHans: hit.defeated ? "病毒已清除，金币已收集。" : "答对了，光束已过载。"
        });
      }

      const result = resolveFinalResult({
        nextDefeatedViruses,
        nextElapsedSeconds: elapsedSeconds,
        nextMaxCombo,
        nextQuestionsAnswered,
        nextCorrectAnswers,
        nextRunCoins
      });

      if (result.cleared || nextViruses.every((virus) => virus.defeated)) {
        finishRun(result);
      } else {
        setPhase("playing");
        const nextTarget = nextViruses.find((virus) => !virus.defeated);
        if (nextTarget) setSelectedVirusId(nextTarget.id);
      }
    },
    [
      addPopup,
      coinMultiplier,
      combo,
      correctAnswers,
      defeatedViruses,
      effectiveBaseDamage,
      elapsedSeconds,
      finishRun,
      maxCombo,
      overcharge,
      pendingQuestion,
      pendingVirus,
      questionsAnswered,
      resolveFinalResult,
      runCoins,
      setTemporaryFeedback,
      viruses
    ]
  );

  const buyUpgrade = useCallback(
    (upgrade: MathVirusBlasterUpgrade) => {
      const currentLevel = upgradeLevels[upgrade.id];
      const cost = upgrade.cost + Math.max(0, currentLevel - upgrade.level) * 120;
      if (coins < cost) {
        setTemporaryFeedback({
          en: "Not enough coins for this upgrade yet.",
          zh: "金幣暫時不足，未能升級。",
          zhHans: "金币暂时不足，未能升级。"
        });
        return;
      }

      setCoins((value) => value - cost);
      setUpgradeLevels((levels) => ({
        ...levels,
        [upgrade.id]: levels[upgrade.id] + 1
      }));
      addPopup({
        x: upgradeHotspots[upgrade.id].x,
        y: upgradeHotspots[upgrade.id].y - 9,
        text: "LV+1",
        tone: "upgrade"
      });
    },
    [addPopup, coins, setTemporaryFeedback, upgradeLevels]
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => {
        const nextElapsed = Math.min(level.timeLimitSeconds, value + 1);
        if (nextElapsed >= level.timeLimitSeconds) {
          const result = resolveFinalResult({
            nextDefeatedViruses: defeatedViruses,
            nextElapsedSeconds: nextElapsed,
            nextMaxCombo: maxCombo,
            nextQuestionsAnswered: questionsAnswered,
            nextCorrectAnswers: correctAnswers,
            nextRunCoins: runCoins
          });
          finishRun(result);
        }
        return nextElapsed;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    correctAnswers,
    defeatedViruses,
    finishRun,
    maxCombo,
    phase,
    questionsAnswered,
    resolveFinalResult,
    runCoins
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        fireAtSelectedVirus();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const aliveViruses = viruses.filter((virus) => !virus.defeated);
        const currentIndex = Math.max(0, aliveViruses.findIndex((virus) => virus.id === selectedVirusId));
        const nextIndex =
          event.key === "ArrowLeft"
            ? Math.max(0, currentIndex - 1)
            : Math.min(aliveViruses.length - 1, currentIndex + 1);
        const nextVirus = aliveViruses[nextIndex];
        if (nextVirus) setSelectedVirusId(nextVirus.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fireAtSelectedVirus, selectedVirusId, viruses]);

  return (
    <main className="fixed inset-0 z-[120] grid place-items-center overflow-hidden bg-slate-950 px-2 py-3 text-white sm:px-4 sm:py-5" data-testid="math-virus-blaster-game">
      <style>{`
        body.math-virus-blaster-immersive header,
        body.math-virus-blaster-immersive footer,
        body.math-virus-blaster-immersive button[class*="fixed"][class*="z-[70]"],
        body.math-virus-blaster-immersive [aria-label="AI Tutor"] {
          display: none !important;
        }
        body.math-virus-blaster-immersive {
          overflow: hidden;
          background: #020617;
        }
      `}</style>
      <section className="relative mx-auto overflow-hidden rounded-lg border border-cyan-300/40 bg-slate-950 shadow-2xl shadow-cyan-950/60" style={stageStyle}>
        <Image
          src={mathVirusBlasterDesignImagePath}
          alt="Math Master: Virus Blaster design background"
          fill
          priority
          sizes="100vw"
          className="pointer-events-none select-none object-cover"
        />

        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(14,165,233,0.08),transparent_34%)]" />

        {beam ? (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line
              x1="50"
              y1="69"
              x2={beam.x}
              y2={beam.y}
              className={beam.critical ? "virus-beam-critical" : "virus-beam"}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : null}

        {viruses.map((virus) => (
          <button
            key={virus.id}
            type="button"
            onClick={() => {
              if (!virus.defeated) setSelectedVirusId(virus.id);
            }}
            disabled={virus.defeated || phase !== "playing"}
            aria-label={`${screenReaderText(virus.name, t)}, ${virus.currentHp} HP`}
            className={cn(
              "absolute rounded-full border-2 transition focus-ring",
              "border-cyan-200/0 hover:border-cyan-200/80 hover:bg-cyan-300/10",
              virus.defeated && "border-lime-200/70 bg-lime-300/10 opacity-60"
            )}
            style={{
              left: `${virus.x}%`,
              top: `${virus.y}%`,
              width: `${virus.size}%`,
              aspectRatio: "1",
              transform: "translate(-50%, -50%)"
            }}
          >
            {virus.currentHp !== virus.hp || virus.defeated ? (
              <span className="absolute left-1/2 top-1/2 grid h-[38%] w-[48%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-slate-950/65 text-[clamp(0.7rem,1.6vw,1.6rem)] font-black text-white shadow-[0_0_18px_rgba(14,165,233,0.75)]">
                {virus.defeated ? "0" : virus.currentHp}
              </span>
            ) : null}
          </button>
        ))}

        {popups.map((popup) => (
          <div
            key={popup.id}
            className={cn(
              "virus-popup pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[clamp(0.85rem,2vw,2.25rem)] font-black",
              popup.tone === "damage" && "text-orange-100 drop-shadow-[0_0_12px_rgba(251,146,60,0.95)]",
              popup.tone === "coin" && "text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.95)]",
              popup.tone === "upgrade" && "text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.95)]",
              popup.tone === "shield" && "text-sky-100 drop-shadow-[0_0_12px_rgba(56,189,248,0.95)]"
            )}
            style={{ left: `${popup.x}%`, top: `${popup.y}%` }}
          >
            {popup.text}
          </div>
        ))}

        <button
          type="button"
          onClick={fireAtSelectedVirus}
          disabled={phase !== "playing" || !selectedVirus}
          aria-label={t({ en: "Fire at selected virus", zh: "向選中的病毒開火", zhHans: "向选中的病毒开火" })}
          className="absolute left-[50%] top-[88.6%] grid aspect-square w-[10.8%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-amber-100/30 bg-amber-300/0 text-transparent transition hover:scale-105 hover:bg-amber-300/20 focus:bg-amber-300/25 focus-ring disabled:opacity-50"
        >
          FIRE
        </button>

        <button
          type="button"
          onClick={() => setAutoFire((value) => !value)}
          aria-label={autoFire ? "Turn auto fire off" : "Turn auto fire on"}
          className={cn(
            "absolute left-[6.1%] top-[91.3%] h-[8%] w-[10%] -translate-x-1/2 -translate-y-1/2 rounded-lg border transition focus-ring",
            autoFire ? "border-lime-200/40 bg-lime-300/5 hover:bg-lime-300/15" : "border-slate-200/30 bg-slate-700/20 hover:bg-slate-500/25"
          )}
        />

        {level.upgrades.map((upgrade) => {
          const hotspot = upgradeHotspots[upgrade.id];
          const currentLevel = upgradeLevels[upgrade.id];
          const cost = upgrade.cost + Math.max(0, currentLevel - upgrade.level) * 120;

          return (
            <button
              key={upgrade.id}
              type="button"
              onClick={() => buyUpgrade(upgrade)}
              aria-label={`${screenReaderText(upgrade.label, t)} level ${currentLevel}, cost ${cost}`}
              className="absolute rounded-lg border border-cyan-100/0 bg-cyan-300/0 text-transparent transition hover:border-cyan-100/70 hover:bg-cyan-300/10 focus:bg-cyan-300/15 focus-ring"
              style={percentStyle(hotspot)}
            >
              {screenReaderText(upgrade.label, t)}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setTemporaryFeedback({
              en: "Bag is a visual placeholder in this draft. Upgrade economy is local only.",
              zh: "背包暫為草稿視覺佔位；升級經濟只保存在本局。",
              zhHans: "背包暂为草稿视觉占位；升级经济只保存在本局。"
            })
          }
          aria-label={t({ en: "Open bag placeholder", zh: "打開背包佔位", zhHans: "打开背包占位" })}
          className="absolute left-[92.8%] top-[89.6%] h-[9.2%] w-[12%] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-cyan-100/0 bg-cyan-300/0 transition hover:border-cyan-100/70 hover:bg-cyan-300/10 focus:bg-cyan-300/15 focus-ring"
        />

        {phase === "question" && pendingQuestion && pendingVirus ? (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/50 px-5 backdrop-blur-[2px]">
            <div className="w-full max-w-xl rounded-lg border border-cyan-200/70 bg-slate-950/88 p-5 text-center shadow-2xl shadow-cyan-950/60">
              <p className="text-sm font-black uppercase tracking-normal text-cyan-200">
                {t({ en: "Solve to overcharge", zh: "解題啟動過載", zhHans: "解题启动过载" })}
              </p>
              <h2 className="mt-3 text-4xl font-black text-white drop-shadow-[0_0_16px_rgba(56,189,248,0.75)]">
                {t(pendingQuestion.prompt)}
              </h2>
              <p className="mt-2 text-sm font-semibold text-sky-100/80">
                {t(pendingVirus.name)} · {mathVirusBlasterTopicMeta[pendingVirus.topic].mark} · {pendingVirus.currentHp} HP
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {pendingQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => answerQuestion(option.id)}
                    className="rounded-lg border border-cyan-100/40 bg-cyan-300/10 px-4 py-4 text-3xl font-black text-white shadow-lg shadow-cyan-950/40 transition hover:-translate-y-0.5 hover:border-amber-200/80 hover:bg-amber-300/20 focus-ring"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {(phase === "cleared" || phase === "failed") && finalResult ? (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/62 px-5 backdrop-blur-[2px]">
            <div className="w-full max-w-2xl rounded-lg border border-amber-200/70 bg-slate-950/90 p-6 text-center shadow-2xl shadow-amber-950/40">
              <p className={cn("text-sm font-black uppercase tracking-normal", finalResult.cleared ? "text-amber-200" : "text-sky-200")}>
                {finalResult.cleared ? "Level Clear" : "Run Complete"}
              </p>
              <h2 className="mt-3 text-4xl font-black text-white">
                {finalResult.cleared
                  ? t({ en: "Algebra Lab Secured", zh: "代數實驗室已守住", zhHans: "代数实验室已守住" })
                  : t({ en: "Virus Wave Escaped", zh: "病毒波次尚未清除", zhHans: "病毒波次尚未清除" })}
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <ResultTile label="Stars" value={"★".repeat(finalResult.stars) || "-"} />
                <ResultTile label="Coins" value={`+${finalResult.reward.coins}`} />
                <ResultTile label="Accuracy" value={`${finalResult.accuracyPercent}%`} />
                <ResultTile label="Clear" value={`${finalResult.virusClearPercent}%`} />
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={resetRun}
                  className="rounded-lg border border-cyan-200/50 bg-cyan-300/15 px-5 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/25 focus-ring"
                >
                  {t({ en: "Play Again", zh: "再玩一次", zhHans: "再玩一次" })}
                </button>
                <a
                  href="/"
                  className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 focus-ring"
                >
                  {t({ en: "Exit Draft", zh: "離開草稿", zhHans: "离开草稿" })}
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {feedback ? (
          <div className="absolute left-1/2 top-[73.6%] -translate-x-1/2 rounded-lg border border-cyan-200/60 bg-slate-950/80 px-4 py-2 text-center text-[clamp(0.65rem,1.1vw,1rem)] font-bold text-cyan-50 shadow-lg shadow-cyan-950/50">
            {t(feedback)}
          </div>
        ) : null}
      </section>

      <style>{`
        .virus-beam,
        .virus-beam-critical {
          stroke-linecap: round;
          stroke-width: 0.55;
          filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.95));
          animation: virus-beam-flash 520ms ease-out both;
        }

        .virus-beam {
          stroke: rgba(56, 189, 248, 0.95);
        }

        .virus-beam-critical {
          stroke: rgba(251, 191, 36, 0.98);
          filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.95));
        }

        .virus-popup {
          animation: virus-popup-rise 950ms ease-out both;
          text-shadow: 0 0 12px rgba(2, 6, 23, 0.95);
        }

        @keyframes virus-beam-flash {
          0% {
            opacity: 0;
            stroke-width: 0.15;
          }
          16% {
            opacity: 1;
            stroke-width: 0.75;
          }
          100% {
            opacity: 0;
            stroke-width: 0.2;
          }
        }

        @keyframes virus-popup-rise {
          0% {
            opacity: 0;
            transform: translate(-50%, -30%) scale(0.8);
          }
          18% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -115%) scale(1.1);
          }
        }
      `}</style>
    </main>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-normal text-white/55">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
