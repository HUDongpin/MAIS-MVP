"use client";

import { useAITutor } from "@/components/ai/AITutorProvider";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import type { TutorContext } from "@/components/ai/AITutorProvider";
import { cn } from "@/lib/utils";

export function AITutorButton({
  context,
  className,
  label
}: {
  context: TutorContext;
  className?: string;
  label?: string;
}) {
  const { openTutor } = useAITutor();
  const { t } = useSettings();

  return (
    <button
      type="button"
      onClick={() => openTutor(context)}
      className={cn(
        "focus-ring group relative isolate inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-cyan-200/70 bg-slate-950 px-4 py-2 text-sm font-black text-cyan-50 shadow-[0_14px_34px_rgba(14,116,144,0.22)] transition duration-300 hover:-translate-y-0.5 hover:border-fuchsia-200/70 hover:shadow-[0_18px_42px_rgba(217,70,239,0.22)] dark:border-cyan-200/35 dark:bg-white/[0.08]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_24%_18%,rgba(103,232,249,0.72),transparent_34%)] opacity-90"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950"
      />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 -left-10 -z-10 w-8 rotate-12 bg-white/35 blur-md transition-transform duration-700 group-hover:translate-x-48"
      />
      <span aria-hidden="true" className="relative grid h-5 w-5 shrink-0 place-items-center">
        <span className="absolute inset-0 rounded-full bg-cyan-300/30 blur-md transition duration-300 group-hover:bg-fuchsia-300/35" />
        <span className="absolute inset-[2px] rounded-full border border-cyan-100/70 border-t-fuchsia-200/90 animate-[spin_5s_linear_infinite]" />
        <span className="h-2 w-2 rounded-full bg-cyan-100 shadow-[0_0_16px_rgba(103,232,249,0.95)] transition duration-300 group-hover:bg-fuchsia-100 group-hover:shadow-[0_0_18px_rgba(240,171,252,0.95)]" />
      </span>
      <span className="truncate">{label ?? t(dictionary.aiTutor.ask)}</span>
    </button>
  );
}
