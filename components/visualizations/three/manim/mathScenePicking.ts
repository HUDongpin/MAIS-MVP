import type { MobjectBoundingBoxRow, MobjectBoundingBoxTable } from "./mathMobjectBoundingBox";
import type { MathSceneRenderGroup, MathSceneRenderGroups } from "./mathSceneGraph";
import type { Vec3 } from "./mathSceneTypes";

export const SCENE_PICKING_SOURCE_CONTRACT =
  "Scene.point_to_mobject: iterate reversed(search_set) and return first mobject whose geometry touches point" as const;

export type MathScenePickResult = {
  buff: number;
  conceptId: string;
  distanceToCenter: number;
  group: MathSceneRenderGroup;
  objectId: string;
  renderIndex: number;
  searchOrderIndex: number;
  sourceContract: typeof SCENE_PICKING_SOURCE_CONTRACT;
  summary: string;
};

export type MathScenePickInput = {
  boundingBoxes: MobjectBoundingBoxTable;
  buff?: number;
  point: Vec3;
  renderGroups: MathSceneRenderGroups;
  searchSetIds?: string[];
};

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function finiteBuff(value: number | undefined) {
  return Math.max(0, finite(value));
}

function safePoint(point: Vec3): Vec3 {
  return [finite(point[0]), finite(point[1]), finite(point[2])];
}

function uniqueIds(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function rowMap(table: MobjectBoundingBoxTable) {
  return new Map(table.rows.map((row) => [row.objectId, row]));
}

function objectGroup(renderGroups: MathSceneRenderGroups, objectId: string): MathSceneRenderGroup {
  if (renderGroups.fixedInFrame.includes(objectId)) return "fixedInFrame";
  if (renderGroups.foreground.includes(objectId)) return "foreground";
  return "scene";
}

function pointTouchesRow(row: MobjectBoundingBoxRow | undefined, point: Vec3, buff: number) {
  if (!row?.finite) return false;
  return point.every((coordinate, axis) => {
    const min = finite(row.min[axis], 0) - buff;
    const max = finite(row.max[axis], 0) + buff;
    return coordinate >= min && coordinate <= max;
  });
}

function distanceToCenter(row: MobjectBoundingBoxRow, point: Vec3) {
  const squared = point.reduce((sum, coordinate, axis) => {
    const delta = coordinate - finite(row.center[axis], 0);
    return sum + delta * delta;
  }, 0);

  return Math.sqrt(squared);
}

function fixedNumber(value: number) {
  const safe = Math.abs(value) < 0.0005 ? 0 : finite(value);
  return safe.toFixed(3);
}

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

function pickSummary(result: Omit<MathScenePickResult, "summary">) {
  return [
    "pick",
    "hit",
    result.objectId,
    `group=${result.group}`,
    `renderIndex=${result.renderIndex}`,
    `buff=${String(result.buff)}`
  ].join(":");
}

// Manim source contract: Scene.point_to_mobject iterates over reversed(search_set)
// and returns the first mobject whose geometry touches the point.
export function pointToSceneMobject(input: MathScenePickInput): MathScenePickResult | null {
  const buff = finiteBuff(input.buff);
  const point = safePoint(input.point);
  const rows = rowMap(input.boundingBoxes);
  const searchIds = uniqueIds(input.searchSetIds ?? input.renderGroups.all)
    .filter((objectId) => rows.get(objectId)?.finite)
    .reverse();

  for (let searchOrderIndex = 0; searchOrderIndex < searchIds.length; searchOrderIndex += 1) {
    const objectId = searchIds[searchOrderIndex];
    const row = rows.get(objectId);
    if (!pointTouchesRow(row, point, buff) || !row) continue;

    const baseResult = {
      buff,
      conceptId: row.conceptId,
      distanceToCenter: distanceToCenter(row, point),
      group: objectGroup(input.renderGroups, objectId),
      objectId,
      renderIndex: input.renderGroups.all.indexOf(objectId),
      searchOrderIndex,
      sourceContract: SCENE_PICKING_SOURCE_CONTRACT
    };

    return {
      ...baseResult,
      summary: pickSummary(baseResult)
    };
  }

  return null;
}

export function scenePickDataAttributes(result: MathScenePickResult | null): Record<string, string> {
  if (!result) {
    return {
      "data-viz-manim-pick-buff": "0",
      "data-viz-manim-pick-concept-id": "none",
      "data-viz-manim-pick-distance-to-center": "0.000",
      "data-viz-manim-pick-group": "none",
      "data-viz-manim-pick-hit": "false",
      "data-viz-manim-pick-object-id": "none",
      "data-viz-manim-pick-render-index": "-1",
      "data-viz-manim-pick-search-order-index": "-1",
      "data-viz-manim-pick-source-contract": SCENE_PICKING_SOURCE_CONTRACT,
      "data-viz-manim-pick-summary": "pick:miss"
    };
  }

  return {
    "data-viz-manim-pick-buff": String(result.buff),
    "data-viz-manim-pick-concept-id": result.conceptId,
    "data-viz-manim-pick-distance-to-center": fixedNumber(result.distanceToCenter),
    "data-viz-manim-pick-group": result.group,
    "data-viz-manim-pick-hit": "true",
    "data-viz-manim-pick-object-id": result.objectId,
    "data-viz-manim-pick-render-index": String(result.renderIndex),
    "data-viz-manim-pick-search-order-index": String(result.searchOrderIndex),
    "data-viz-manim-pick-source-contract": result.sourceContract,
    "data-viz-manim-pick-summary": result.summary
  };
}

export function serializeScenePickResult(result: MathScenePickResult | null) {
  return stableSerialize(result);
}
