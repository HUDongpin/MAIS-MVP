"use client";

import { motion } from "@/components/ui/Motion";
import { useSettings } from "@/components/providers/AppProviders";
import { formatTrendLabel } from "@/lib/i18n";
import type { ProgressMetric } from "@/types";

export function ProgressCard({ metric, index }: { metric: ProgressMetric; index: number }) {
  const { language, text } = useSettings();
  return (
    <motion.article
      className="glass-panel p-5"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{text(metric.label)}</p>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">{formatTrendLabel(metric.trend, language)}</span>
      </div>
      <p className="mt-4 text-4xl font-black tracking-tight gradient-text">{metric.value}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{text(metric.detail)}</p>
    </motion.article>
  );
}
