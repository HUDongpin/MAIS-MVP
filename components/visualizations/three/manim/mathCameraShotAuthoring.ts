import type { MathSceneSpec } from "./mathSceneTypes";

export const CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT =
  "CameraShot authoring: named CameraFrame shots map cameraTo timeline beats to selectable shot controls" as const;

export type CameraShotCatalogEntry = {
  elapsedSeconds: number;
  hasTimelineBeat: boolean;
  isCanonical: boolean;
  label: string;
  shotId: string;
};

export type CameraShotCatalog = CameraShotCatalogEntry[] & {
  missingTimelineShotIds: string[];
};

export type CameraShotCatalogSummary = {
  activeShotId: string;
  canonicalShotId: string;
  missingTimelineShotCount: number;
  missingTimelineShotIds: string;
  shotCount: number;
  shotIds: string;
  sourceContract: typeof CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT;
  summary: string;
  timelineShotIds: string;
};

export type CameraShotCatalogPayload = CameraShotCatalogSummary & {
  entries: CameraShotCatalogEntry[];
  missingTimelineShotIdList: string[];
  version: "mais-manim-camera-shot-authoring/v1";
};

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function roundedSeconds(value: number) {
  return Number(value.toFixed(3));
}

export function buildCameraShotCatalog(scene: MathSceneSpec): CameraShotCatalog {
  let elapsedSeconds = 0;
  const firstTimelineBeatByShotId = new Map<string, number>();

  scene.timeline.forEach((step) => {
    if (step.type === "cameraTo" && !firstTimelineBeatByShotId.has(step.shotId)) {
      firstTimelineBeatByShotId.set(step.shotId, roundedSeconds(elapsedSeconds));
    }

    elapsedSeconds += Math.max(0, Number.isFinite(step.duration) ? step.duration : 0);
  });

  const canonicalShotId = scene.cameraShots[0]?.id ?? "default";
  const declaredShotIds = new Set(scene.cameraShots.map((shot) => shot.id));
  const missingTimelineShotIds = Array.from(firstTimelineBeatByShotId.keys()).filter((shotId) => !declaredShotIds.has(shotId));

  const entries = scene.cameraShots.map((shot, index) => {
    const timelineElapsedSeconds = firstTimelineBeatByShotId.get(shot.id);

    return {
      elapsedSeconds: shot.id === canonicalShotId ? 0 : timelineElapsedSeconds ?? 0,
      hasTimelineBeat: timelineElapsedSeconds !== undefined,
      isCanonical: shot.id === canonicalShotId,
      label: `${index + 1}. ${shot.id}`,
      shotId: shot.id
    };
  });

  return Object.assign(entries, { missingTimelineShotIds });
}

export function summarizeCameraShotCatalog(catalog: CameraShotCatalogEntry[] & { missingTimelineShotIds?: string[] }, activeShotId: string): CameraShotCatalogSummary {
  const shotIds = catalog.map((entry) => entry.shotId).join(",") || "none";
  const timelineShotIds = catalog
    .filter((entry) => entry.hasTimelineBeat)
    .map((entry) => entry.shotId)
    .join(",") || "none";
  const canonicalShotId = catalog.find((entry) => entry.isCanonical)?.shotId ?? "none";
  const normalizedActiveShotId = catalog.some((entry) => entry.shotId === activeShotId) ? activeShotId : canonicalShotId;
  const missingTimelineShotIdList = catalog.missingTimelineShotIds ?? [];
  const missingTimelineShotIds = missingTimelineShotIdList.join(",") || "none";
  const summaryParts = [
    `shots=${catalog.length}`,
    `canonical=${canonicalShotId}`,
    `active=${normalizedActiveShotId}`,
    `timelineShots=${timelineShotIds}`
  ];

  if (missingTimelineShotIdList.length > 0) {
    summaryParts.push(`missingTimelineShots=${missingTimelineShotIds}`);
  }

  return {
    activeShotId: normalizedActiveShotId,
    canonicalShotId,
    missingTimelineShotCount: missingTimelineShotIdList.length,
    missingTimelineShotIds,
    shotCount: catalog.length,
    shotIds,
    sourceContract: CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT,
    summary: summaryParts.join(";"),
    timelineShotIds
  };
}

export function serializeCameraShotCatalog(
  catalog: CameraShotCatalogEntry[] & { missingTimelineShotIds?: string[] },
  activeShotId: string
) {
  const summary = summarizeCameraShotCatalog(catalog, activeShotId);

  return stableSerialize({
    ...summary,
    entries: [...catalog],
    missingTimelineShotIdList: catalog.missingTimelineShotIds ?? [],
    version: "mais-manim-camera-shot-authoring/v1"
  } satisfies CameraShotCatalogPayload);
}

export function cameraShotCatalogDataAttributes(summary: CameraShotCatalogSummary) {
  return {
    "data-viz-manim-camera-shot-count": String(summary.shotCount),
    "data-viz-manim-camera-shot-ids": summary.shotIds,
    "data-viz-manim-camera-shot-missing-count": String(summary.missingTimelineShotCount),
    "data-viz-manim-camera-shot-missing-ids": summary.missingTimelineShotIds,
    "data-viz-manim-camera-shot-selected": summary.activeShotId,
    "data-viz-manim-camera-shot-source-contract": summary.sourceContract,
    "data-viz-manim-camera-shot-summary": summary.summary
  } as const;
}
