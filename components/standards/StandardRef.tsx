import { resolveStandardRef, type StandardRefInput } from "@/lib/standards/standardRef";

/**
 * The validated display component for a curriculum-standard label. Ported
 * California lesson prose still contains inline CCSS codes, which are checked
 * against asset metadata by `standardClaimRendering.test.tsx` and restricted
 * to the California track by `CcssLessonAdapter`.
 *
 * Renders nothing at all when the claim cannot be supported — a missing label
 * is a smaller error than a false one.
 */
export function StandardRef({ track, stateStandardId, assetStandardIds, className }: StandardRefInput & { className?: string }) {
  const resolved = resolveStandardRef({ track, stateStandardId, assetStandardIds });

  if (resolved.display === "hidden") return null;

  if (resolved.display === "qualified") {
    return (
      <span className={className} data-standard-ref={resolved.relation}>
        {resolved.qualifier}{" "}
        <abbr title={`Curriculum standard ${resolved.code}`}>{resolved.code}</abbr>
      </span>
    );
  }

  return (
    <span className={className} data-standard-ref="exact">
      <abbr title={`Curriculum standard ${resolved.code}`}>{resolved.code}</abbr>
    </span>
  );
}
