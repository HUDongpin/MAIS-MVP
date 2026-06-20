"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MathText } from "@/components/math/MathText";
import { MathFormulaOverlay } from "./manim/MathFormulaOverlay";
import { buildCameraDirectorState } from "./manim/mathCameraDirector";
import { summarizeFormulaBindings } from "./manim/mathFormulaBindings";
import { buildMathSceneSpecForThreeDFamily } from "./manim/mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./manim/mathSceneRuntimeState";
import { buildTimelineState } from "./manim/mathTimeline";
import { ThreeDLabSceneRegistry } from "./ThreeDLabSceneRegistry";
import { formatThreeDCanvasCameraState, threeDCanvasCameraContract } from "./threeDCanvasCameraContract";
import { formulaForThreeDScene } from "./threeDCanvasContract";
import { threeDCanvasLightingContract } from "./threeDCanvasLightingContract";
import { threeDCanvasRendererContract } from "./threeDCanvasRendererContract";
import { threeDCanvasWebGLContract } from "./threeDCanvasWebGLContract";
import { sceneVariantForThreeDFamily } from "./threeDSceneMath";
import { threeDSceneVariantMetadata } from "./threeDSceneVariantMetadata";
import type { ThreeDLabCanvasProps } from "./threeDSceneTypes";

const cameraTarget = new THREE.Vector3(
  threeDCanvasCameraContract.cameraTarget.x,
  threeDCanvasCameraContract.cameraTarget.y,
  threeDCanvasCameraContract.cameraTarget.z
);

function canUseWebGL() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function formatCameraState(camera: THREE.Camera) {
  const position = camera.position.clone().sub(cameraTarget);
  const spherical = new THREE.Spherical().setFromVector3(position);
  const azimuthDegrees = THREE.MathUtils.radToDeg(spherical.theta);
  const elevationDegrees = 90 - THREE.MathUtils.radToDeg(spherical.phi);
  return formatThreeDCanvasCameraState({
    azimuthDegrees,
    distance: spherical.radius,
    elevationDegrees
  });
}

function defaultCameraPosition() {
  const { defaultCamera } = threeDCanvasCameraContract;
  const spherical = new THREE.Spherical(
    defaultCamera.distance,
    THREE.MathUtils.degToRad(90 - defaultCamera.elevationDegrees),
    THREE.MathUtils.degToRad(defaultCamera.azimuthDegrees)
  );

  return new THREE.Vector3().setFromSpherical(spherical).add(cameraTarget);
}

function CameraContract({
  onCameraState,
  resetSignal
}: {
  onCameraState: (value: string) => void;
  resetSignal: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  function resetCamera() {
    camera.position.copy(defaultCameraPosition());
    camera.lookAt(cameraTarget);
    controlsRef.current?.target.copy(cameraTarget);
    controlsRef.current?.update();
    onCameraState(formatCameraState(camera));
  }

  useEffect(() => {
    resetCamera();
  }, [camera, onCameraState, resetSignal]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={threeDCanvasCameraContract.orbitBounds.enableDamping}
      enablePan={threeDCanvasCameraContract.orbitBounds.enablePan}
      makeDefault
      maxDistance={threeDCanvasCameraContract.orbitBounds.maxDistance}
      maxPolarAngle={THREE.MathUtils.degToRad(threeDCanvasCameraContract.orbitBounds.maxPolarAngleDegrees)}
      minDistance={threeDCanvasCameraContract.orbitBounds.minDistance}
      minPolarAngle={THREE.MathUtils.degToRad(threeDCanvasCameraContract.orbitBounds.minPolarAngleDegrees)}
      target={cameraTarget}
      onChange={() => onCameraState(formatCameraState(camera))}
    />
  );
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(onReady);
    return () => window.cancelAnimationFrame(frame);
  }, [onReady]);

  return null;
}

export function ThreeDLabCanvas({
  accent,
  coverageTier = "standard-3d",
  fallback,
  label,
  premiumLaunch = false,
  regionalPriority,
  runtime = "primitive",
  state
}: ThreeDLabCanvasProps) {
  const [canvasReady, setCanvasReady] = useState(false);
  const [cameraState, setCameraState] = useState(formatThreeDCanvasCameraState(threeDCanvasCameraContract.defaultCamera));
  const [resetSignal, setResetSignal] = useState(0);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const background = useMemo(() => new THREE.Color(threeDCanvasRendererContract.backgroundColor), []);
  const sceneVariant = sceneVariantForThreeDFamily(state.familyId);
  const sceneMetadata = threeDSceneVariantMetadata[sceneVariant];
  const formulaText = formulaForThreeDScene(state.familyId, state.templateId);
  const manimScene = useMemo(
    () => (runtime === "mais-manim" ? buildMathSceneSpecForThreeDFamily({ accent, state }) : null),
    [accent, runtime, state]
  );
  const manimSummary = useMemo(() => (manimScene ? summarizeFormulaBindings(manimScene) : null), [manimScene]);
  const manimTimeline = useMemo(() => (manimScene ? buildTimelineState(manimScene.timeline, 0) : null), [manimScene]);
  const manimRuntimeState = useMemo(() => (manimScene ? buildMathSceneRuntimeState(manimScene, 0) : null), [manimScene]);
  const manimCameraDirector = useMemo(() => (manimScene ? buildCameraDirectorState(manimScene, 0) : null), [manimScene]);
  const runtimeDiagnostics = {
    activeStep: manimTimeline?.activeStep?.type ?? "none",
    activeConceptId: manimTimeline?.activeConceptId ?? "none",
    cameraCanonicalShot: manimCameraDirector?.canonicalShotId ?? "default",
    cameraShot: manimCameraDirector?.activeShotId ?? "default",
    formulaTokenCount: manimSummary?.tokenCount ?? 0,
    mathObjectCount: manimRuntimeState?.diagnostics.mathObjectCount ?? 0,
    objectCount: manimSummary?.objectCount ?? 0,
    reducedMotion: "false",
    sceneId: manimScene?.sceneId ?? `primitive-${state.familyId}`,
    semanticBindingCount: manimSummary?.bindingCount ?? 0,
    trackerCount: manimRuntimeState?.diagnostics.trackerCount ?? 0,
    updaterCount: manimRuntimeState?.diagnostics.updaterCount ?? 0
  };

  useEffect(() => {
    setWebglSupported(canUseWebGL());
  }, []);

  useEffect(() => {
    setCanvasReady(false);
  }, [state.stateSummary]);

  if (webglSupported === null) {
    return (
      <div
        data-viz-three-webgl-status={threeDCanvasWebGLContract.detectingStatus}
        role="status"
        aria-label={`${label} 3D renderer loading`}
        className="relative aspect-[16/9] w-full overflow-hidden rounded-[28px] border border-slate-900/10 bg-slate-950 shadow-inner shadow-cyan-500/10 dark:border-white/10"
      >
        <span
          data-viz-mark
          data-viz-name="three-d-webgl-detecting"
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/35 bg-cyan-300/15 shadow-lg shadow-cyan-300/20"
        />
        <span className="sr-only">Loading 3D model</span>
      </div>
    );
  }

  if (webglSupported === false) {
    return (
      <div
        data-viz-three-fallback-reason={threeDCanvasWebGLContract.fallbackReason}
        data-viz-three-webgl-status={threeDCanvasWebGLContract.fallbackStatus}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      data-viz-surface
      data-viz-canvas-ready={canvasReady ? "true" : "false"}
      data-viz-camera-state={cameraState}
      data-viz-coverage-tier={coverageTier}
      data-viz-depth-value={state.depthValue.toFixed(3)}
      data-viz-family-id={state.familyId}
      data-viz-mark-count={sceneMetadata.minPrimitiveCount}
      data-viz-premium-launch={premiumLaunch ? "true" : "false"}
      data-viz-primary-value={state.primaryValue.toFixed(3)}
      data-viz-regional-priority={regionalPriority ?? "standard"}
      data-viz-renderer={threeDCanvasRendererContract.renderer}
      data-viz-runtime={runtime}
      data-viz-scene-pedagogical-role={sceneMetadata.pedagogicalRole}
      data-viz-scene-primitive-floor={sceneMetadata.minPrimitiveCount}
      data-viz-scene-spatial-model={sceneMetadata.spatialModel}
      data-viz-scene-variant={sceneVariant}
      data-viz-scene-id={runtimeDiagnostics.sceneId}
      data-viz-secondary-value={state.secondaryValue.toFixed(3)}
      data-viz-active-step={runtimeDiagnostics.activeStep}
      data-viz-camera-shot={runtimeDiagnostics.cameraShot}
      data-viz-camera-canonical-shot={runtimeDiagnostics.cameraCanonicalShot}
      data-viz-formula-token-count={runtimeDiagnostics.formulaTokenCount}
      data-viz-math-object-count={runtimeDiagnostics.mathObjectCount}
      data-viz-object-count={runtimeDiagnostics.objectCount}
      data-viz-reduced-motion={runtimeDiagnostics.reducedMotion}
      data-viz-semantic-binding-count={runtimeDiagnostics.semanticBindingCount}
      data-viz-state-summary={state.stateSummary}
      data-viz-template-id={state.templateId}
      data-viz-three-webgl-status={threeDCanvasWebGLContract.readyStatus}
      data-viz-tracker-count={runtimeDiagnostics.trackerCount}
      data-viz-updater-count={runtimeDiagnostics.updaterCount}
      role="application"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Home") {
          event.preventDefault();
          setResetSignal((current) => current + 1);
        }
      }}
      className="relative aspect-[16/9] w-full overflow-hidden rounded-[28px] border border-slate-900/10 bg-slate-950 shadow-inner shadow-cyan-500/10 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-white/10"
    >
      <span
        data-viz-mark
        data-viz-name="three-d-r3f-surface"
        className="pointer-events-none absolute left-2 top-2 h-2 w-2 rounded-full bg-cyan-200 opacity-10"
      />
      <Canvas
        camera={{
          fov: threeDCanvasCameraContract.defaultCamera.fov,
          near: threeDCanvasCameraContract.defaultCamera.near,
          far: threeDCanvasCameraContract.defaultCamera.far,
          position: defaultCameraPosition().toArray()
        }}
        dpr={threeDCanvasRendererContract.devicePixelRatioRange}
        gl={threeDCanvasRendererContract.gl}
        onCreated={({ camera, gl, scene }) => {
          scene.background = background;
          gl.setClearColor(background);
          setCameraState(formatCameraState(camera));
        }}
      >
        <ambientLight intensity={threeDCanvasLightingContract.ambient.intensity} />
        {threeDCanvasLightingContract.directional.map((light) => (
          <directionalLight key={light.name} color={light.color} intensity={light.intensity} position={light.position} />
        ))}
        <ThreeDLabSceneRegistry accent={accent} runtime={runtime} state={state} />
        <CameraContract onCameraState={setCameraState} resetSignal={resetSignal} />
        <ReadySignal onReady={() => setCanvasReady(true)} />
      </Canvas>
      {manimScene ? (
        <>
          <MathFormulaOverlay activeConceptId={runtimeDiagnostics.activeConceptId} scene={manimScene} />
          {manimScene.objects.map((object) => (
            <span
              key={object.id}
              data-viz-concept-id={"conceptId" in object ? object.conceptId : `${object.id}:trace`}
              data-viz-manim-mark={object.id}
              data-viz-manim-object-type={object.type}
              className="sr-only"
            />
          ))}
        </>
      ) : (
        <div
          data-viz-three-formula
          className="pointer-events-none absolute left-3 top-3 rounded-2xl border border-white/10 bg-slate-950/72 px-3.5 py-2.5 text-sm font-black leading-tight text-cyan-50 shadow-lg shadow-slate-950/20 [&_.katex]:text-[1.08em]"
        >
          <MathText text={formulaText} ariaLabel="Three dimensional visualization formula" normalizeMath={false} />
        </div>
      )}
      <button
        type="button"
        data-viz-three-reset-camera
        onClick={() => setResetSignal((current) => current + 1)}
        className="focus-ring absolute bottom-3 right-3 rounded-2xl border border-white/15 bg-white/92 px-3 py-2 text-xs font-black text-slate-900 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-100 dark:bg-slate-900/88 dark:text-cyan-50 dark:hover:bg-slate-800"
      >
        Reset camera
      </button>
    </div>
  );
}
