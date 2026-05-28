"use client";

import { useMemo, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import { formatNumber } from "@/lib/math";

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function ChartsAndAveragesLab({ topicId }: { topicId: string }) {
  const { recordLearningEvent, t } = useSettings();
  const [values, setValues] = useState([6, 8, 10, 12, 9]);
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;
  const max = Math.max(...values, 1);

  function updateValue(index: number, value: number) {
    setValues((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function recordChartChange() {
    recordLearningEvent({
      type: "visualization-slider",
      source: "probability",
      topicId
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-slate-200/70 bg-slate-950 p-5 dark:border-white/10">
        <svg data-viz-surface role="img" aria-label={t({ en: "Primary 5 chart and average model", zh: "小五圖表與平均數模型" })} viewBox="0 0 640 360" className="h-[340px] w-full sm:h-[380px]">
          <rect x="34" y="34" width="572" height="292" rx="28" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.1)" />
          <line x1="82" x2="548" y1="286" y2="286" stroke="white" strokeWidth="4" opacity="0.45" />
          <line x1="82" x2="82" y1="82" y2="286" stroke="white" strokeWidth="4" opacity="0.45" />
          {values.map((value, index) => {
            const barHeight = (value / max) * 172;
            return (
              <g key={index}>
                <motion.rect
                  data-viz-mark
                  x={124 + index * 76}
                  y={286 - barHeight}
                  width="44"
                  height={barHeight}
                  rx="10"
                  fill={index === 3 ? "#f472b6" : "#38bdf8"}
                  initial={false}
                  animate={{ y: 286 - barHeight, height: barHeight }}
                />
                <text x={146 + index * 76} y="314" textAnchor="middle" className="fill-white/70 text-xs font-bold">D{index + 1}</text>
              </g>
            );
          })}
          <line data-viz-mark x1="82" x2="548" y1={286 - (average / max) * 172} y2={286 - (average / max) * 172} stroke="#facc15" strokeWidth="6" strokeDasharray="10 8" />
          <text x="90" y="56" className="fill-cyan-200 text-sm font-black uppercase tracking-[0.18em]">{t({ en: "Average balances the data", zh: "平均數平衡數據" })}</text>
          <text x="390" y="92" className="fill-white text-3xl font-black">{t({ en: "Mean", zh: "平均數" })}: {formatNumber(average, 1)}</text>
        </svg>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Data values", zh: "數據值" })}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t({ en: "Move the bars and watch the mean line rebalance.", zh: "移動棒形，觀察平均線如何重新平衡。" })}</p>
        </div>
        {values.map((value, index) => (
          <label key={index} className="block rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.055]">
            <span className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200">
              D{index + 1}
              <strong>{value}</strong>
            </span>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={value}
              onChange={(event) => updateValue(index, Number(event.target.value))}
              onPointerUp={recordChartChange}
              onKeyUp={recordChartChange}
              className="mt-3 w-full accent-cyan-500"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function ProbabilitySimulator({ topicId = "probability-s2" }: { topicId?: string }) {
  const { language, recordLearningEvent, t } = useSettings();
  const [counts, setCounts] = useState([0, 0, 0, 0, 0, 0]);
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  const total = counts.reduce((sum, count) => sum + count, 0);
  const max = Math.max(...counts, 1);
  const empiricalEven = useMemo(() => {
    if (total === 0) return 0;
    return ((counts[1] + counts[3] + counts[5]) / total) * 100;
  }, [counts, total]);

  if (topicId === "p5-charts-averages") return <ChartsAndAveragesLab topicId={topicId} />;

  function applyRolls(times: number) {
    const next = [...counts];
    let latest = 1;
    for (let index = 0; index < times; index += 1) {
      latest = rollDie();
      next[latest - 1] += 1;
    }
    setCounts(next);
    setLastRoll(latest);
    recordLearningEvent({
      type: "visualization-simulate",
      source: "probability",
      topicId
    });
    if (total + times >= 20) {
      recordLearningEvent({
        type: "visualization-complete",
        source: "probability",
        topicId
      });
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div data-viz-surface className="rounded-3xl border border-slate-200/70 bg-slate-950 p-5 dark:border-white/10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">{t({ en: "Dice roll simulator", zh: "擲骰模擬器" })}</p>
            <p className="mt-2 text-sm text-white/60">{t({ en: "Compare experimental frequencies with theoretical probability.", zh: "比較實驗頻率與理論概率。" })}</p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-3xl border border-white/10 bg-white/10 text-4xl font-black text-white shadow-glow" aria-live="polite">
            {lastRoll ?? "?"}
          </div>
        </div>

        <div className="grid h-72 grid-cols-6 items-end gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          {counts.map((count, index) => {
            const heightPercent = total === 0 ? 8 : Math.max(8, (count / max) * 100);
            return (
              <div key={index} className="flex h-full flex-col justify-end gap-2 text-center">
                <motion.div
                  data-viz-mark
                  className="rounded-t-2xl bg-gradient-to-t from-cyan-400 via-violet-400 to-fuchsia-400 shadow-glow"
                  initial={false}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ type: "spring", stiffness: 130, damping: 18 }}
                />
                <span data-viz-label className="text-xs font-bold text-white/70">{index + 1}</span>
                <span data-viz-label className="text-[11px] text-white/45">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.055]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-300">{t({ en: "Run experiment", zh: "進行實驗" })}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => applyRolls(1)} className="focus-ring rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:-translate-y-1 dark:bg-white dark:text-slate-950">{t({ en: "Roll 1", zh: "擲 1 次" })}</button>
            <button type="button" onClick={() => applyRolls(20)} className="focus-ring rounded-2xl border border-slate-200/70 bg-white px-4 py-3 font-bold text-slate-800 transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.08] dark:text-white">{t({ en: "Roll 20", zh: "擲 20 次" })}</button>
          </div>
          <button
            type="button"
            onClick={() => {
              setCounts([0, 0, 0, 0, 0, 0]);
              setLastRoll(null);
              recordLearningEvent({
                type: "visualization-reset",
                source: "probability",
                topicId
              });
            }}
            className="focus-ring mt-3 w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 font-bold text-slate-800 transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.08] dark:text-white"
          >
            {t({ en: "Reset simulation", zh: "重設模擬" })}
          </button>
        </div>
        <div className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white/70 p-5 text-sm dark:border-white/10 dark:bg-white/[0.055]">
          <div className="flex justify-between"><span>{t({ en: "Total rolls", zh: "總擲骰次數" })}</span><strong>{total}</strong></div>
          <div className="flex justify-between"><MathText text={isChineseLanguage(language) ? simplifyChineseText(String.raw`理論 \(P(\text{偶數})\)`, language) : String.raw`Theoretical \(P(\text{even})\)`} /><strong>50%</strong></div>
          <div className="flex justify-between"><MathText text={isChineseLanguage(language) ? simplifyChineseText(String.raw`實驗 \(P(\text{偶數})\)`, language) : String.raw`Experimental \(P(\text{even})\)`} /><strong>{formatNumber(empiricalEven, 1)}%</strong></div>
        </div>
        <p className="rounded-2xl bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-700 dark:text-cyan-200">
          {t({ en: "Discussion prompt: Why does the experimental probability become more stable after many trials?", zh: "思考：試驗次數增加後，實驗概率為何更穩定？" })}
        </p>
      </div>
    </div>
  );
}
