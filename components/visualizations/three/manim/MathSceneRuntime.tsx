"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { MathAnimatePlan } from "./mathAnimationBuilder";
import {
  lineOpacityForMobject,
  lineTransparencyForMobject,
  materialPropsForMobject,
  type MobjectMaterialUniformProps
} from "./mathMobjectMaterialUniforms";
import { vmobjectLineProps, vmobjectSurfaceFillMeshProps } from "./mathVMobjectRenderStyle";
import { buildMathSceneAnimatePlans } from "./mathSceneAnimationPlans";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState, type MathSceneRuntimeState, type RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import { sampleSmoothVMobjectPathFromAnchors } from "./mathVMobjectSmoothPath";
import {
  buildRuntimeIndicationOverlayFrames,
  runtimeIndicationOverlayFocusTargetIds,
  type RuntimeIndicationOverlayFrame
} from "./mathRuntimeIndicationOverlay";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import type { MathSceneSpec, Vec3 } from "./mathSceneTypes";
import { mathSceneColorForRole, mathSceneVisualPalette } from "./mathSceneVisualPalette";
import type { ThreeDSceneProps } from "../threeDSceneTypes";

type MathSceneRuntimeProps = ThreeDSceneProps & {
  animationPlans?: MathAnimatePlan[];
  elapsedSeconds?: number;
  runtimeState?: MathSceneRuntimeState | null;
  scene?: MathSceneSpec | null;
};

function clippingPlanesForMaterial(materialProps: MobjectMaterialUniformProps) {
  if (materialProps.clippingPlaneCount === 0) return undefined;

  return materialProps.clippingPlanes.map(
    (plane) => new THREE.Plane(new THREE.Vector3(...plane.normal), plane.constant)
  );
}

function lineMaterialProps(baseOpacity: number, materialProps: MobjectMaterialUniformProps) {
  return {
    opacity: lineOpacityForMobject(baseOpacity, materialProps),
    transparent: lineTransparencyForMobject(baseOpacity, materialProps)
  };
}

function AxisObject({
  materialProps,
  runtimeObject
}: {
  materialProps: MobjectMaterialUniformProps;
  runtimeObject: RuntimeMathObjectNode;
}) {
  if (runtimeObject.renderState.kind !== "axes") return null;

  const xAxisPoints = runtimeObject.renderState.xAxisPoints;
  const yAxisPoints = runtimeObject.renderState.yAxisPoints;
  const zAxisPoints = runtimeObject.renderState.zAxisPoints;
  const xAxisLineProps = lineMaterialProps(mathSceneVisualPalette.axes.x.opacity, materialProps);
  const yAxisLineProps = lineMaterialProps(mathSceneVisualPalette.axes.y.opacity, materialProps);
  const zAxisLineProps = lineMaterialProps(mathSceneVisualPalette.axes.z.opacity, materialProps);

  return (
    <group>
      <Line
        color={mathSceneVisualPalette.axes.x.color}
        lineWidth={mathSceneVisualPalette.axes.x.lineWidth}
        points={xAxisPoints}
        toneMapped={mathSceneVisualPalette.renderer.toneMapped}
        {...xAxisLineProps}
      />
      <Line
        color={mathSceneVisualPalette.axes.z.color}
        lineWidth={mathSceneVisualPalette.axes.z.lineWidth}
        points={zAxisPoints}
        toneMapped={mathSceneVisualPalette.renderer.toneMapped}
        {...zAxisLineProps}
      />
      <Line
        color={mathSceneVisualPalette.axes.y.color}
        lineWidth={mathSceneVisualPalette.axes.y.lineWidth}
        points={yAxisPoints}
        toneMapped={mathSceneVisualPalette.renderer.toneMapped}
        {...yAxisLineProps}
      />
    </group>
  );
}

function SceneObject({
  accent,
  runtimeObject
}: {
  accent: string;
  runtimeObject: RuntimeMathObjectNode;
}) {
  const object = runtimeObject.spec;
  const materialProps = useMemo(() => materialPropsForMobject(runtimeObject.uniforms), [runtimeObject.uniforms]);
  const clippingPlanes = useMemo(() => clippingPlanesForMaterial(materialProps), [materialProps]);

  if (object.type === "axis3d") return <AxisObject materialProps={materialProps} runtimeObject={runtimeObject} />;

  if (object.type === "parametricCurve") {
    const anchors = runtimeObject.renderState.kind === "polyline" ? runtimeObject.renderState.points : object.samples;
    const points = sampleSmoothVMobjectPathFromAnchors({
      conceptId: object.conceptId,
      id: object.id,
      points: anchors
    });
    const curveLineProps = vmobjectLineProps({
      fallbackColorRole: object.colorRole,
      fallbackOpacity: mathSceneVisualPalette.lines.curve.opacity,
      fallbackStrokeWidth: mathSceneVisualPalette.lines.curve.lineWidth,
      materialProps,
      style: runtimeObject.renderState.kind === "polyline" ? runtimeObject.renderState.style : object.style
    });

    return (
      <Line
        color={mathSceneColorForRole(curveLineProps.colorRole, accent)}
        lineWidth={curveLineProps.lineWidth}
        opacity={curveLineProps.opacity}
        points={points}
        toneMapped={mathSceneVisualPalette.renderer.toneMapped}
        transparent={curveLineProps.transparent}
      />
    );
  }

  if (object.type === "parametricSurface") {
    const wireframeRows = runtimeObject.renderState.kind === "surface" ? runtimeObject.renderState.wireframeRows : object.samples;
    const wireframeColumns = runtimeObject.renderState.kind === "surface"
      ? runtimeObject.renderState.wireframeColumns
      : object.samples[0]?.map((_, column) => object.samples.map((row) => row[column]).filter(Boolean)) ?? [];
    const surfaceStyle = runtimeObject.renderState.kind === "surface" ? runtimeObject.renderState.style : object.style;
    const surfaceFillMeshProps = runtimeObject.renderState.kind === "surface"
      ? vmobjectSurfaceFillMeshProps({
        fallbackColorRole: object.colorRole,
        materialProps,
        renderState: runtimeObject.renderState,
        style: surfaceStyle
      })
      : null;
    const surfaceRowLineProps = vmobjectLineProps({
      fallbackColorRole: object.colorRole,
      fallbackOpacity: mathSceneVisualPalette.lines.surfaceRow.opacity,
      fallbackStrokeWidth: mathSceneVisualPalette.lines.surfaceRow.lineWidth,
      materialProps,
      style: surfaceStyle
    });
    const surfaceColumnLineProps = vmobjectLineProps({
      fallbackColorRole: "surface-grid",
      fallbackOpacity: mathSceneVisualPalette.lines.surfaceColumn.opacity,
      fallbackStrokeWidth: mathSceneVisualPalette.lines.surfaceColumn.lineWidth,
      materialProps,
      style: surfaceStyle
    });

    return (
      <group>
        {surfaceFillMeshProps && surfaceFillMeshProps.triangleCount > 0 ? (
          <mesh>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(surfaceFillMeshProps.positions), 3]}
              />
            </bufferGeometry>
            <meshBasicMaterial
              clippingPlanes={clippingPlanes}
              color={mathSceneColorForRole(surfaceFillMeshProps.colorRole, accent)}
              depthWrite={surfaceFillMeshProps.depthWrite}
              opacity={surfaceFillMeshProps.opacity}
              side={THREE.DoubleSide}
              toneMapped={mathSceneVisualPalette.renderer.toneMapped}
              transparent={surfaceFillMeshProps.transparent}
            />
          </mesh>
        ) : null}
        {wireframeRows.filter((points) => points.length >= 2).map((points, index) => (
          <Line
            key={`${object.id}:row:${index}`}
            color={mathSceneColorForRole(surfaceRowLineProps.colorRole, accent)}
            lineWidth={surfaceRowLineProps.lineWidth}
            opacity={surfaceRowLineProps.opacity}
            points={points}
            toneMapped={mathSceneVisualPalette.renderer.toneMapped}
            transparent={surfaceRowLineProps.transparent}
          />
        ))}
        {wireframeColumns.filter((points) => points.length >= 2).map((points, index) => (
          <Line
            key={`${object.id}:column:${index}`}
            color={mathSceneColorForRole(surfaceColumnLineProps.colorRole, accent)}
            lineWidth={surfaceColumnLineProps.lineWidth}
            opacity={surfaceColumnLineProps.opacity}
            points={points}
            toneMapped={mathSceneVisualPalette.renderer.toneMapped}
            transparent={surfaceColumnLineProps.transparent}
          />
        ))}
      </group>
    );
  }

  if (object.type === "movingPoint") {
    const fallbackPosition: Vec3 = [0, 0, 0];
    const position = runtimeObject.renderState.kind === "point" ? runtimeObject.renderState.position : fallbackPosition;
    return (
      <mesh position={position}>
        <sphereGeometry
          args={[
            mathSceneVisualPalette.points.moving.radius,
            mathSceneVisualPalette.points.moving.widthSegments,
            mathSceneVisualPalette.points.moving.heightSegments
          ]}
        />
        {materialProps.shadeIn3D ? (
          <meshStandardMaterial
            clippingPlanes={clippingPlanes}
            color={mathSceneColorForRole(object.colorRole, accent)}
            depthWrite={materialProps.depthWrite}
            emissive="#78350f"
            emissiveIntensity={0.22}
            opacity={materialProps.opacity}
            roughness={0.32}
            toneMapped={mathSceneVisualPalette.renderer.toneMapped}
            transparent={materialProps.transparent}
          />
        ) : (
          <meshBasicMaterial
            clippingPlanes={clippingPlanes}
            color={mathSceneColorForRole(object.colorRole, accent)}
            depthWrite={materialProps.depthWrite}
            opacity={materialProps.opacity}
            toneMapped={mathSceneVisualPalette.renderer.toneMapped}
            transparent={materialProps.transparent}
          />
        )}
      </mesh>
    );
  }

  if (object.type === "trace") {
    const tracePoints = runtimeObject.renderState.kind === "polyline" ? runtimeObject.renderState.points : [];
    const traceLineProps = vmobjectLineProps({
      fallbackColorRole: object.colorRole,
      fallbackOpacity: mathSceneVisualPalette.lines.trace.opacity,
      fallbackStrokeWidth: mathSceneVisualPalette.lines.trace.lineWidth,
      materialProps,
      style: runtimeObject.renderState.kind === "polyline" ? runtimeObject.renderState.style : object.style
    });

    if (tracePoints.length < 2) return null;

    return (
      <Line
        color={mathSceneColorForRole(traceLineProps.colorRole, accent)}
        lineWidth={traceLineProps.lineWidth}
        opacity={traceLineProps.opacity}
        points={tracePoints}
        toneMapped={mathSceneVisualPalette.renderer.toneMapped}
        transparent={traceLineProps.transparent}
      />
    );
  }

  if (object.type === "vector") {
    const vectorPoints = runtimeObject.renderState.kind === "vector"
      ? [runtimeObject.renderState.from, runtimeObject.renderState.to]
      : [object.from, object.to];
    const vectorLineProps = vmobjectLineProps({
      fallbackColorRole: object.colorRole,
      fallbackOpacity: mathSceneVisualPalette.lines.vector.opacity,
      fallbackStrokeWidth: mathSceneVisualPalette.lines.vector.lineWidth,
      materialProps,
      style: runtimeObject.renderState.kind === "vector" ? runtimeObject.renderState.style : object.style
    });

    return (
      <Line
        color={mathSceneColorForRole(vectorLineProps.colorRole, accent)}
        lineWidth={vectorLineProps.lineWidth}
        opacity={vectorLineProps.opacity}
        points={vectorPoints}
        toneMapped={mathSceneVisualPalette.renderer.toneMapped}
        transparent={vectorLineProps.transparent}
      />
    );
  }

  return null;
}

function RuntimeIndicationOverlay({
  accent,
  frames
}: {
  accent: string;
  frames: RuntimeIndicationOverlayFrame[];
}) {
  return (
    <group>
      {frames.map((frame) => {
        if (frame.type === "line") {
          return (
            <Line
              key={`${frame.objectId}:${frame.segmentId}:indication-overlay`}
              color={mathSceneColorForRole(frame.colorRole, accent)}
              lineWidth={frame.lineWidth}
              opacity={frame.opacity}
              points={frame.points}
              toneMapped={mathSceneVisualPalette.renderer.toneMapped}
              transparent
            />
          );
        }

        return (
          <mesh key={`${frame.objectId}:point:indication-overlay`} position={frame.position}>
            <sphereGeometry
              args={[
                frame.radius,
                mathSceneVisualPalette.points.indication.widthSegments,
                mathSceneVisualPalette.points.indication.heightSegments
              ]}
            />
            <meshBasicMaterial
              color={mathSceneColorForRole(frame.colorRole, accent)}
              opacity={frame.opacity}
              toneMapped={mathSceneVisualPalette.renderer.toneMapped}
              transparent
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function MathSceneRuntime({
  accent,
  animationPlans,
  elapsedSeconds = 0,
  runtimeState: providedRuntimeState,
  scene: providedScene,
  state
}: MathSceneRuntimeProps) {
  const scene = useMemo(() => providedScene ?? buildMathSceneSpecForThreeDFamily({ accent, state }), [accent, providedScene, state]);

  if (!scene) return null;

  const runtimeState = providedRuntimeState ?? (() => {
    const baseRuntimeState = buildMathSceneRuntimeState(scene, elapsedSeconds);
    const resolvedAnimationPlans = animationPlans ?? buildMathSceneAnimatePlans(scene, baseRuntimeState);
    return applyMathUpdaters(baseRuntimeState.sourceScene, baseRuntimeState, { animationPlans: resolvedAnimationPlans });
  })();
  const runtimeIndicationOverlayFrames = useMemo(
    () =>
      buildRuntimeIndicationOverlayFrames(runtimeState, {
        focusTargetIds: runtimeIndicationOverlayFocusTargetIds(runtimeState)
      }),
    [runtimeState]
  );

  return (
    <group>
      {runtimeState.sceneGraph.renderGroups.all.map((objectId) => {
        const runtimeObject = runtimeState.objectGraph.byId[objectId];
        if (!runtimeObject) return null;

        return (
          <SceneObject
            key={objectId}
            accent={accent}
            runtimeObject={runtimeObject}
          />
        );
      })}
      <RuntimeIndicationOverlay accent={accent} frames={runtimeIndicationOverlayFrames} />
    </group>
  );
}
