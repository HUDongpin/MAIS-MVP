import { createHash } from "node:crypto";

import type { ConfiguredVisualizationSemanticSliderInput } from "../../components/visualizations/configuredVisualizationSemanticControls";

export type ChinaVisualizationTargetState = {
  kind: "default" | "mode" | "range" | "range-endpoints" | "reset" | "strand";
  labId: string;
  modeId: string | null;
  modeIndex: number | null;
  rangeIndex: number | null;
  requestedValues: Partial<
    Record<ConfiguredVisualizationSemanticSliderInput, number>
  >;
  requiresInteraction: boolean;
  stateId: string;
  stateName: string;
  strandFamily: string | null;
  strandIndex: number | null;
  strandVariant: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalValue(value: unknown, path = "evidence"): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError(`${path} must contain only finite numbers.`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      canonicalValue(entry, `${path}[${index}]`),
    );
  }
  if (!isPlainObject(value)) {
    throw new TypeError(
      `${path} must contain only JSON-compatible plain values.`,
    );
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalValue(value[key], `${path}.${key}`)]),
  );
}

export function chinaVisualizationTargetStateEvidenceSha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalValue(value)))
    .digest("hex");
}

function parseStateIdentity(stateId: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stateId);
  } catch {
    throw new TypeError(
      `Target state id is not valid JSON: ${JSON.stringify(stateId)}.`,
    );
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    typeof parsed[0] !== "string" ||
    parsed[0].trim().length === 0 ||
    typeof parsed[1] !== "string" ||
    parsed[1].trim().length === 0
  ) {
    throw new TypeError("Target state id must encode [labId, stateName].");
  }
  return { labId: parsed[0], stateName: parsed[1] };
}

function parseNonNegativeInteger(label: string, value: string) {
  if (!/^\d+$/u.test(value))
    throw new TypeError(`${label} must be a non-negative integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed))
    throw new TypeError(`${label} is outside the safe integer range.`);
  return parsed;
}

function parseFiniteNumber(label: string, value: string) {
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(value)) {
    throw new TypeError(`${label} must be a finite decimal number.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${label} must be finite.`);
  return parsed;
}

function parsePrefix(value: string) {
  if (value === "direct") return { strandIndex: null };
  const match = /^strand=(\d+)$/u.exec(value);
  if (!match) return null;
  return { strandIndex: parseNonNegativeInteger("strand index", match[1]) };
}

function baseTarget(
  stateId: string,
  labId: string,
  stateName: string,
): Omit<ChinaVisualizationTargetState, "kind"> {
  return {
    labId,
    modeId: null,
    modeIndex: null,
    rangeIndex: null,
    requestedValues: {},
    requiresInteraction: true,
    stateId,
    stateName,
    strandFamily: null,
    strandIndex: null,
    strandVariant: null,
  };
}

export function parseChinaVisualizationTargetStateId(
  stateId: string,
): ChinaVisualizationTargetState {
  const { labId, stateName } = parseStateIdentity(stateId);
  const base = baseTarget(stateId, labId, stateName);
  if (stateName === "default") {
    return { ...base, kind: "default", requiresInteraction: false };
  }
  if (stateName === "reset") return { ...base, kind: "reset" };

  const strandReceipt = /^strand=(\d+):([^/]+)\/([^/]+)$/u.exec(stateName);
  if (strandReceipt) {
    return {
      ...base,
      kind: "strand",
      strandFamily: strandReceipt[2],
      strandIndex: parseNonNegativeInteger("strand index", strandReceipt[1]),
      strandVariant: strandReceipt[3],
    };
  }

  const segments = stateName.split("/");
  const prefix = parsePrefix(segments.shift() ?? "");
  if (!prefix) {
    throw new TypeError(
      `${labId}: unsupported target state ${JSON.stringify(stateName)}.`,
    );
  }
  base.strandIndex = prefix.strandIndex;

  const modeSegment = segments[0];
  if (modeSegment?.startsWith("mode=")) {
    const modeMatch = /^mode=(\d+):([^/]+)$/u.exec(modeSegment);
    if (!modeMatch) {
      throw new TypeError(
        `${labId}: unsupported target state ${JSON.stringify(stateName)}.`,
      );
    }
    base.modeIndex = parseNonNegativeInteger("mode index", modeMatch[1]);
    base.modeId = modeMatch[2];
    segments.shift();
  }

  if (segments.length === 0 && base.modeIndex !== null) {
    return { ...base, kind: "mode" };
  }
  if (segments.length !== 1) {
    throw new TypeError(
      `${labId}: unsupported target state ${JSON.stringify(stateName)}.`,
    );
  }

  const action = segments[0];
  const rangeMatch =
    /^range=(\d+):([a-z][a-z0-9-]*)=(-?(?:\d+(?:\.\d+)?|\.\d+))$/iu.exec(
      action,
    );
  if (rangeMatch) {
    const controlId =
      rangeMatch[2] as ConfiguredVisualizationSemanticSliderInput;
    return {
      ...base,
      kind: "range",
      rangeIndex: parseNonNegativeInteger("range index", rangeMatch[1]),
      requestedValues: {
        [controlId]: parseFiniteNumber(
          `${controlId} range value`,
          rangeMatch[3],
        ),
      },
    };
  }

  const endpointMatch = /^range-endpoints=(.+)$/u.exec(action);
  if (endpointMatch) {
    const requestedValues: Partial<
      Record<ConfiguredVisualizationSemanticSliderInput, number>
    > = {};
    for (const entry of endpointMatch[1].split(",")) {
      const pair = /^([a-z][a-z0-9-]*):(-?(?:\d+(?:\.\d+)?|\.\d+))$/iu.exec(
        entry,
      );
      if (!pair) {
        throw new TypeError(
          `${labId}: unsupported target state ${JSON.stringify(stateName)}.`,
        );
      }
      const controlId = pair[1] as ConfiguredVisualizationSemanticSliderInput;
      if (Object.prototype.hasOwnProperty.call(requestedValues, controlId)) {
        throw new TypeError(
          `${labId}: target state contains duplicate ${controlId} endpoint values.`,
        );
      }
      requestedValues[controlId] = parseFiniteNumber(
        `${controlId} endpoint value`,
        pair[2],
      );
    }
    if (Object.keys(requestedValues).length === 0) {
      throw new TypeError(`${labId}: target endpoint state is empty.`);
    }
    return { ...base, kind: "range-endpoints", requestedValues };
  }

  throw new TypeError(
    `${labId}: unsupported target state ${JSON.stringify(stateName)}.`,
  );
}
