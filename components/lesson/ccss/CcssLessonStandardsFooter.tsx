import type { CurriculumTrack } from "@/types";
import { StandardRef } from "@/components/standards/StandardRef";
import { resolveStandardRef } from "@/lib/standards/standardRef";

type Props = {
  track: CurriculumTrack;
  claimedStandardIds: readonly string[];
  assetStandardIds: readonly string[];
};

/** Displays only standard claims supported by the lesson asset and track binding. */
export function CcssLessonStandardsFooter({ track, claimedStandardIds, assetStandardIds }: Props) {
  const supportedIds = [...new Set(claimedStandardIds)].filter((stateStandardId) =>
    resolveStandardRef({ track, stateStandardId, assetStandardIds }).display !== "hidden"
  );
  if (supportedIds.length === 0) return null;

  return (
    <footer className="mt-5 flex flex-wrap items-center gap-2" aria-label="Standards developed in this lesson">
      {supportedIds.map((stateStandardId) => (
        <StandardRef
          key={stateStandardId}
          track={track}
          stateStandardId={stateStandardId}
          assetStandardIds={assetStandardIds}
          className="chip font-mono"
        />
      ))}
    </footer>
  );
}
