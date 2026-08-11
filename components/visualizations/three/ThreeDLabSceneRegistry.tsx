"use client";

import { MathSceneRuntime } from "./manim/MathSceneRuntime";
import { isMaisManimFamily } from "./manim/mathSceneRegistry";
import type { MathSceneRuntimeState } from "./manim/mathSceneRuntimeState";
import type { MathSceneSpec } from "./manim/mathSceneTypes";
import { TemplatePrimitiveScene } from "./scenes/TemplatePrimitiveScene";
import { THREE_D_BOUNDARY_CONTENT_ROOT_NAME } from "./ThreeDSceneBoundaryProbe";
import { threeDFamilyIds, type ThreeDFamilyId, type ThreeDSceneProps } from "./threeDSceneTypes";

const readyFamilies = new Set<ThreeDFamilyId>(threeDFamilyIds);

type ThreeDLabSceneRegistryProps = ThreeDSceneProps & {
  manimElapsedSeconds?: number;
  manimRuntimeState?: MathSceneRuntimeState | null;
  manimScene?: MathSceneSpec | null;
};

export function isThreeDFamilyReady(familyId: ThreeDFamilyId) {
  return readyFamilies.has(familyId);
}

export function ThreeDLabSceneRegistry(props: ThreeDLabSceneRegistryProps) {
  const content = props.runtime === "mais-manim" && isMaisManimFamily(props.state.familyId)
    ? (
      <MathSceneRuntime
        accent={props.accent}
        elapsedSeconds={props.manimElapsedSeconds}
        runtime={props.runtime}
        runtimeState={props.manimRuntimeState}
        scene={props.manimScene}
        state={props.state}
      />
    )
    : <TemplatePrimitiveScene accent={props.accent} state={props.state} />;

  return (
    <group
      name={THREE_D_BOUNDARY_CONTENT_ROOT_NAME}
      userData={{ mathBoundaryContentRoot: true }}
    >
      {content}
    </group>
  );
}
