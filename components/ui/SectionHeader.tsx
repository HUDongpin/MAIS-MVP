import type { ReactNode } from "react";

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{eyebrow}</p> : null}
        <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl md:text-5xl">{title}</h1>
        {description ? <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
