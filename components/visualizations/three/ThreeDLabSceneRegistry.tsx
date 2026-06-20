"use client";

import { MathSceneRuntime } from "./manim/MathSceneRuntime";
import { isMaisManimFamily } from "./manim/mathSceneRegistry";
import { TemplatePrimitiveScene } from "./scenes/TemplatePrimitiveScene";
import { threeDFamilyIds, type ThreeDFamilyId, type ThreeDSceneProps } from "./threeDSceneTypes";

const readyFamilies = new Set<ThreeDFamilyId>(threeDFamilyIds);

export function isThreeDFamilyReady(familyId: ThreeDFamilyId) {
  return readyFamilies.has(familyId);
}

export function ThreeDLabSceneRegistry(props: ThreeDSceneProps) {
  if (props.runtime === "mais-manim" && isMaisManimFamily(props.state.familyId)) {
    return <MathSceneRuntime accent={props.accent} runtime={props.runtime} state={props.state} />;
  }

  return <TemplatePrimitiveScene accent={props.accent} state={props.state} />;
}
