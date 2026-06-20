import { buildCurveObject, partialCurveByArcRange, pointAtArcProgress } from "./mathCurveObject";
import type { MathObjectSpec, Vec3 } from "./mathSceneTypes";
import type { MathSceneRuntimeState, RuntimeMathObjectNode } from "./mathSceneRuntimeState";

export type MathUpdaterEntry = {
  id: string;
  objectId: string;
  type: "move-along-path" | "reveal-curve" | "trace-recent-path";
};

export type MathUpdaterRegistry = {
  byObjectId: Record<string, string[]>;
  entries: MathUpdaterEntry[];
};

function pathObject(objects: MathObjectSpec[], objectId: string) {
  return objects.find(
    (object): object is Extract<MathObjectSpec, { type: "parametricCurve" }> => object.type === "parametricCurve" && object.id === objectId
  );
}

function curveObjectForSpec(curve: Extract<MathObjectSpec, { type: "parametricCurve" }>) {
  return buildCurveObject({
    colorRole: curve.colorRole,
    conceptId: curve.conceptId,
    id: curve.id,
    samples: curve.samples
  });
}

function withUpdater(registry: MathUpdaterRegistry, entry: MathUpdaterEntry) {
  registry.entries.push(entry);
  registry.byObjectId[entry.objectId] = [...(registry.byObjectId[entry.objectId] ?? []), entry.type];
}

export function buildMathUpdaterRegistry(objects: MathObjectSpec[]): MathUpdaterRegistry {
  const registry: MathUpdaterRegistry = { byObjectId: {}, entries: [] };

  objects.forEach((object) => {
    if (object.type === "parametricCurve") {
      withUpdater(registry, { id: `${object.id}:reveal`, objectId: object.id, type: "reveal-curve" });
    }

    if (object.type === "movingPoint") {
      withUpdater(registry, { id: `${object.id}:move`, objectId: object.id, type: "move-along-path" });
    }

    if (object.type === "trace") {
      withUpdater(registry, { id: `${object.id}:trace`, objectId: object.id, type: "trace-recent-path" });
    }
  });

  return registry;
}

function updateObject(state: MathSceneRuntimeState, object: RuntimeMathObjectNode) {
  if (object.spec.type === "parametricCurve") {
    const progress = state.trackers.byId[`${object.id}:progress`]?.value ?? 1;
    const curve = curveObjectForSpec(object.spec);
    return {
      ...object,
      renderState: {
        kind: "polyline" as const,
        points: partialCurveByArcRange(curve, 0, Math.max(0.08, progress))
      }
    };
  }

  if (object.spec.type === "movingPoint") {
    const curve = pathObject(state.sourceScene.objects, object.spec.pathObjectId);
    const progress = state.trackers.byId[`${object.id}:progress`]?.value ?? 1;
    const curveObject = curve ? curveObjectForSpec(curve) : null;
    const fallbackPosition: Vec3 = [0, 0, 0];
    return {
      ...object,
      renderState: {
        kind: "point" as const,
        position: curveObject ? pointAtArcProgress(curveObject, progress) : fallbackPosition
      }
    };
  }

  if (object.spec.type === "trace") {
    const traceSpec = object.spec;
    const source = state.sourceScene.objects.find(
      (entry): entry is Extract<MathObjectSpec, { type: "movingPoint" }> => entry.type === "movingPoint" && entry.id === traceSpec.sourceObjectId
    );
    const curve = source ? pathObject(state.sourceScene.objects, source.pathObjectId) : null;
    const progress = source ? state.trackers.byId[`${source.id}:progress`]?.value ?? 1 : 1;
    const curveObject = curve ? curveObjectForSpec(curve) : null;
    const startProgress = Math.max(0, progress - 0.18);
    const tracePoints = curveObject ? partialCurveByArcRange(curveObject, startProgress, progress) : [];

    return {
      ...object,
      renderState: {
        kind: "polyline" as const,
        points: tracePoints
      }
    };
  }

  return object;
}

export function applyMathUpdaters(stateScene: MathSceneRuntimeState["sourceScene"], state: MathSceneRuntimeState): MathSceneRuntimeState {
  const byId = Object.fromEntries(
    Object.values(state.objectGraph.byId).map((object) => {
      const updated = updateObject(state, object);
      return [updated.id, updated];
    })
  );

  return {
    ...state,
    objectGraph: {
      ...state.objectGraph,
      byId
    },
    sourceScene: stateScene
  };
}
