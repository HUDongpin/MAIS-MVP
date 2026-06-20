"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { buildTimelineState } from "./mathTimeline";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState, type RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import type { MathObjectSpec, MathSceneSpec, Vec3 } from "./mathSceneTypes";
import type { ThreeDSceneProps } from "../threeDSceneTypes";

function colorForRole(role: string, accent: string) {
  if (role === "function") return accent;
  if (role === "probe") return "#facc15";
  if (role === "trace") return "#22d3ee";
  return "#e0f2fe";
}

function AxisObject() {
  const xAxisPoints: Vec3[] = [[-2.55, 0.12, 0], [2.55, 0.12, 0]];
  const zAxisPoints: Vec3[] = [[0, 0.12, -0.7], [0, 0.12, 0.7]];
  const yAxisPoints: Vec3[] = [[0, 0, 0], [0, 2.35, 0]];

  return (
    <group data-viz-manim-object="axes">
      <Line color="#38bdf8" lineWidth={3} points={xAxisPoints} />
      <Line color="#f472b6" lineWidth={3} points={zAxisPoints} />
      <Line color="#e0f2fe" lineWidth={2} points={yAxisPoints} />
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

  if (object.type === "axis3d") return <AxisObject />;

  if (object.type === "parametricCurve") {
    const points = runtimeObject.renderState.kind === "polyline" ? runtimeObject.renderState.points : object.samples;
    return <Line color={colorForRole(object.colorRole, accent)} lineWidth={5} points={points} />;
  }

  if (object.type === "movingPoint") {
    const fallbackPosition: Vec3 = [0, 0, 0];
    const position = runtimeObject.renderState.kind === "point" ? runtimeObject.renderState.position : fallbackPosition;
    return (
      <mesh position={position}>
        <sphereGeometry args={[0.11, 24, 16]} />
        <meshStandardMaterial color={colorForRole(object.colorRole, accent)} emissive="#78350f" emissiveIntensity={0.22} roughness={0.32} />
      </mesh>
    );
  }

  if (object.type === "trace") {
    const tracePoints = runtimeObject.renderState.kind === "polyline" ? runtimeObject.renderState.points : [];

    return <Line color={colorForRole(object.colorRole, accent)} lineWidth={3} points={tracePoints} transparent opacity={0.55} />;
  }

  if (object.type === "vector") {
    return <Line color={colorForRole(object.colorRole, accent)} lineWidth={5} points={[object.from, object.to]} />;
  }

  return null;
}

export function MathSceneRuntime({ accent, state }: ThreeDSceneProps) {
  const scene = useMemo(() => buildMathSceneSpecForThreeDFamily({ accent, state }), [accent, state]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useFrame((_, delta) => {
    setElapsedSeconds((current) => {
      const totalDuration = scene ? buildTimelineState(scene.timeline, current).totalDuration : 0;
      if (totalDuration === 0) return 0;
      return (current + delta) % totalDuration;
    });
  });

  if (!scene) return null;

  const timeline = buildTimelineState(scene.timeline, elapsedSeconds);
  const runtimeState = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, elapsedSeconds));

  return (
    <group data-viz-manim-scene={scene.sceneId} data-viz-manim-active-step={timeline.activeStep?.type ?? "none"}>
      {scene.objects.map((object) => (
        <SceneObject
          key={object.id}
          accent={accent}
          runtimeObject={runtimeState.objectGraph.byId[object.id]}
        />
      ))}
    </group>
  );
}
