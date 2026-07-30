import type { ReactNode } from "react";

export type LegalDocumentStatus = "draft-pending-review" | "published";

export type LegalDocumentSection = {
  /** Stable anchor id — external parties (districts, auditors) deep-link to these. */
  id: string;
  heading: string;
  body: ReactNode;
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  summary: string;
  status: LegalDocumentStatus;
  /** ISO date the document text last changed. */
  lastUpdated: string;
  sections: readonly LegalDocumentSection[];
  contactNote?: ReactNode;
};

/**
 * Horizontally scrolling wrapper for the wide tables in these documents.
 *
 * A scroll container that is not focusable cannot be scrolled by a keyboard user, which
 * fails WCAG 2.1.1 — axe catches this as `scrollable-region-focusable` at narrow
 * viewports. `tabIndex` makes it reachable and the labelled region gives screen-reader
 * users something to announce when they land on it.
 */
export function LegalScrollableTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      aria-label={label}
      className="legal-table-scroll focus-ring rounded-lg"
      role="region"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

const statusCopy: Record<LegalDocumentStatus, { label: string; detail: string }> = {
  "draft-pending-review": {
    label: "Draft — pending legal review",
    detail:
      "This text is an engineering-authored draft that describes how the platform actually behaves today. " +
      "It has not been reviewed by counsel and is not yet a binding agreement. Do not rely on it for " +
      "procurement or contracting until this notice is removed."
  },
  published: {
    label: "Published",
    detail: "This document is current and in force."
  }
};

/**
 * Shared chrome for the public legal + accessibility documents (/privacy, /terms,
 * /accessibility, /subprocessors).
 *
 * Deliberately a server component with no client state: these routes are the ones a
 * district procurement officer or auditor loads first, so they stay statically
 * rendered and carry no JS cost.
 */
export function LegalDocument({
  eyebrow,
  title,
  summary,
  status,
  lastUpdated,
  sections,
  contactNote
}: LegalDocumentProps) {
  const { label, detail } = statusCopy[status];
  const isDraft = status === "draft-pending-review";

  return (
    <div className="page-container py-10 sm:py-14">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            {title}
          </h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">{summary}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last updated{" "}
            <time dateTime={lastUpdated}>
              {new Date(`${lastUpdated}T00:00:00Z`).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC"
              })}
            </time>
          </p>
        </header>

        <aside
          aria-label="Document status"
          className={
            isDraft
              ? "rounded-2xl border border-amber-300/80 bg-amber-50/90 p-5 dark:border-amber-400/30 dark:bg-amber-950/40"
              : "rounded-2xl border border-emerald-300/80 bg-emerald-50/90 p-5 dark:border-emerald-400/30 dark:bg-emerald-950/40"
          }
        >
          <p
            className={
              isDraft
                ? "text-sm font-bold text-amber-900 dark:text-amber-200"
                : "text-sm font-bold text-emerald-900 dark:text-emerald-200"
            }
          >
            {label}
          </p>
          <p
            className={
              isDraft
                ? "mt-1.5 text-sm leading-6 text-amber-900/90 dark:text-amber-100/80"
                : "mt-1.5 text-sm leading-6 text-emerald-900/90 dark:text-emerald-100/80"
            }
          >
            {detail}
          </p>
        </aside>

        <nav aria-labelledby="legal-toc-heading" className="soft-panel rounded-2xl p-5">
          <h2
            id="legal-toc-heading"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
          >
            On this page
          </h2>
          <ol className="mt-3 flex flex-col gap-1.5 text-sm">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  className="focus-ring rounded-md text-slate-700 underline-offset-4 hover:underline dark:text-slate-300"
                  href={`#${section.id}`}
                >
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">{index + 1}.</span>{" "}
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-9">
          {sections.map((section, index) => (
            <section key={section.id} aria-labelledby={`${section.id}-heading`} id={section.id}>
              <h2
                className="text-xl font-bold tracking-tight text-slate-950 dark:text-white"
                id={`${section.id}-heading`}
              >
                <span className="tabular-nums text-slate-500 dark:text-slate-400">{index + 1}.</span>{" "}
                {section.heading}
              </h2>
              <div className="legal-prose mt-3 flex flex-col gap-3 text-base leading-7 text-slate-700 dark:text-slate-300">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        {contactNote ? (
          <footer className="glass-panel rounded-2xl p-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {contactNote}
          </footer>
        ) : null}
      </article>
    </div>
  );
}
