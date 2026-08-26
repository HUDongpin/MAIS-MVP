import { resolveStandardRef, type StandardRefInput } from "@/lib/standards/standardRef";

/**
 * The single component through which a curriculum standard code may reach the
 * DOM.
 *
 * Every other surface must route through here rather than interpolating a code
 * into prose, because only this path checks the claim against what the asset
 * itself carries. See `lib/standards/standardRef.ts` for the rules and
 * `components/standards/standardRef.test.ts` for the gate that keeps raw codes
 * out of lesson bodies.
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
