"use client";

import { useEffect, type ComponentType } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { ccssReadingBandForGrade, type CcssTextbookLessonMeta } from "@/data/ccssTextbookRegistry";

/**
 * Adapter for interactive CCSS textbook lessons ported from the
 * CCSS-Math-Textbook app into `components/lesson/ccss/lessons/`.
 *
 * The lesson bodies are never edited (same rule as the signature-lab port).
 * Everything MAIS-specific is supplied from outside, once:
 *
 *   1. The `.ccss-lesson` theme scope — the upstream design tokens
 *      (`--band-*`, `--ink*`, `--surface*`, `--line`) remapped onto MAIS's
 *      class-based dark mode in `app/globals.css`.
 *   2. Band-tuned reading typography (`reading-early` etc.), keyed off the
 *      lesson's MAIS grade — K–2 students get the larger, roomier text the
 *      upstream app designed for them.
 *   3. Analytics: a `visualization-probe` learning event under source
 *      `"lesson"`, so interactive lessons feed the same funnel as in-lesson
 *      visualization modules.
 */

/** A ported lesson body. They take no props by contract. */
export type CcssLessonComponent = ComponentType<Record<never, never>>;

export type CcssLessonHostProps = {
  meta: CcssTextbookLessonMeta;
  topicId: string;
};

type CcssLessonAdapterProps = CcssLessonHostProps & {
  LessonComponent: CcssLessonComponent;
};

export function CcssLessonAdapter({ LessonComponent, meta, topicId }: CcssLessonAdapterProps) {
  const { recordLearningEvent } = useSettings();
  const readingBand = ccssReadingBandForGrade(meta.grade);

  useEffect(() => {
    recordLearningEvent({ type: "visualization-probe", source: "lesson", topicId });
  }, [recordLearningEvent, topicId]);

  return (
    <div
      className={`ccss-lesson reading-${readingBand}`}
      data-ccss-diagram-state-protocol="finite-visible-button-state-graph-v2"
      data-ccss-lesson={meta.slug}
    >
      <LessonComponent />
      <footer className="mt-5 flex flex-wrap items-center gap-2" aria-label="Standards developed in this lesson">
        {meta.standardIds.map((id) => (
          <span key={id} className="chip font-mono">
            {id}
          </span>
        ))}
      </footer>
    </div>
  );
}

/**
 * Wraps a ported lesson module into the host-props shape LessonView renders.
 * Use with `next/dynamic` so each lesson body stays in its own chunk.
 */
export function createCcssLesson(LessonComponent: CcssLessonComponent) {
  return function CcssLesson({ meta, topicId }: CcssLessonHostProps) {
    return <CcssLessonAdapter LessonComponent={LessonComponent} meta={meta} topicId={topicId} />;
  };
}
