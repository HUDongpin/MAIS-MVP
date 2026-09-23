"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { ccssReadingBandForGrade, type CcssTextbookLessonMeta } from "@/data/ccssTextbookRegistry";
import type { CurriculumTrack } from "@/types";
import { CcssLessonStandardsFooter } from "./CcssLessonStandardsFooter";

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
  track: CurriculumTrack;
  /** The lesson block's requested claim, checked against the ported asset metadata. */
  claimedStandardIds: readonly string[];
};

type CcssLessonAdapterProps = CcssLessonHostProps & {
  LessonComponent: CcssLessonComponent;
};

export function CcssLessonAdapter({ LessonComponent, meta, topicId, track, claimedStandardIds }: CcssLessonAdapterProps) {
  const { recordLearningEvent, t } = useSettings();
  const readingBand = ccssReadingBandForGrade(meta.grade);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (track !== "US_CA_MATH") return;
    recordLearningEvent({ type: "visualization-probe", source: "lesson", topicId });
  }, [recordLearningEvent, topicId, track]);

  // The ported bodies contain inline CCSS codes. They are only reviewed for
  // California; another track needs a separate prose and standards review.
  if (track !== "US_CA_MATH") {
    return (
      <p role="status" data-ccss-lesson-unavailable="true" className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        {t({
          en: "This interactive lesson is available for California Math only.",
          zh: "此互動課文目前僅供加州數學課程使用。",
          zhHans: "此互动课文目前仅供加州数学课程使用。"
        })}
      </p>
    );
  }

  return (
    <div
      className={`ccss-lesson reading-${readingBand}`}
      data-ccss-diagram-hydrated={isHydrated ? "true" : "false"}
      data-ccss-diagram-state-protocol="finite-visible-button-state-graph-v2"
      data-ccss-lesson={meta.slug}
    >
      <LessonComponent />
      <CcssLessonStandardsFooter
        track={track}
        claimedStandardIds={claimedStandardIds}
        assetStandardIds={meta.standardIds}
      />
    </div>
  );
}

/**
 * Wraps a ported lesson module into the host-props shape LessonView renders.
 * Use with `next/dynamic` so each lesson body stays in its own chunk.
 */
export function createCcssLesson(LessonComponent: CcssLessonComponent) {
  return function CcssLesson({ meta, topicId, track, claimedStandardIds }: CcssLessonHostProps) {
    return <CcssLessonAdapter LessonComponent={LessonComponent} meta={meta} topicId={topicId} track={track} claimedStandardIds={claimedStandardIds} />;
  };
}
