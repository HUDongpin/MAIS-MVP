import type { ReactNode } from "react";

/**
 * The "Math Check" callout. Every interactive lesson states, in plain language,
 * the fact the visualization is demonstrating and why it is true — the
 * conceptual-accuracy guarantee a teacher can stand behind.
 */
export function MathCheck({
  title = "Math check",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside
      className="my-6 rounded-2xl border p-5"
      style={{
        borderColor: "color-mix(in oklab, var(--band-upper) 40%, var(--line))",
        background: "color-mix(in oklab, var(--band-upper) 8%, var(--surface))",
      }}
    >
      <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
        <span
          aria-hidden
          className="grid h-6 w-6 place-items-center rounded-full text-white"
          style={{ background: "var(--band-upper)" }}
        >
          ✓
        </span>
        {title}
      </div>
      <div className="prose-lesson text-[15px] [&_p:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}
