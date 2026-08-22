import { createHash } from "node:crypto";

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(value: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

/*
 * Deliberately pure exports only. In particular this module exposes no
 * arbitrary-authority constructor, driver constructor, binder, or lease. The
 * production entry point remains an unconditional zero-argument HOLD; the
 * structurally isolated *.test-support module owns its branded test engine.
 */
export const californiaSignatureFinalCompositorPhase4InternalStableJson = stableJson;
export const californiaSignatureFinalCompositorPhase4InternalSha256 = sha256;
