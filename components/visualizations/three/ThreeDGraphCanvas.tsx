"use client";

import { Grid, Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MathText } from "@/components/math/MathText";
import {
  buildThreeDGraphPanelSamples,
  buildThreeDGraphSurfaceSamples,
  formatThreeDGraphSummary
} from "@/components/visualizations/ThreeDGraphSvgGeometry";

const defaultCamera = {
  azimuthDegrees: 45,
  distance: 4.8,
  elevationDegrees: 35
};
const cameraTarget = new THREE.Vector3(0, 0.35, 0);

export type ThreeDGraphCanvasProps = {
  accent?: string;
  fallback: ReactNode;
  label: string;
  meshResolution?: number;
  panelScale?: number;
  surfaceScale?: number;
};

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

  return `azimuth=${azimuthDegrees.toFixed(2)};elevation=${elevationDegrees.toFixed(2)};distance=${spherical.radius.toFixed(2)}`;
}

function defaultCameraPosition() {
  const spherical = new THREE.Spherical(
    defaultCamera.distance,
    THREE.MathUtils.degToRad(90 - defaultCamera.elevationDegrees),
    THREE.MathUtils.degToRad(defaultCamera.azimuthDegrees)
  );

  return new THREE.Vector3().setFromSpherical(spherical).add(cameraTarget);
}

function buildSurfaceGeometry(meshResolution: number, surfaceScale: number) {
  const samples = buildThreeDGraphSurfaceSamples({ meshResolution, surfaceScale });
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(samples.length * 3);
  const colors = new Float32Array(samples.length * 3);
  const indices: number[] = [];

  samples.forEach((sample, index) => {
    const positionIndex = index * 3;
    positions[positionIndex] = sample.x;
    positions[positionIndex + 1] = sample.z;
    positions[positionIndex + 2] = sample.y;

    const heightRatio = THREE.MathUtils.clamp(sample.z / 1.55, 0, 1);
    const color = new THREE.Color("#38bdf8").lerp(new THREE.Color("#facc15"), heightRatio);
    colors[positionIndex] = color.r;
    colors[positionIndex + 1] = color.g;
    colors[positionIndex + 2] = color.b;
  });

  for (let row = 0; row < meshResolution - 1; row += 1) {
    for (let column = 0; column < meshResolution - 1; column += 1) {
      const topLeft = row * meshResolution + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + meshResolution;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function CameraResetter({
  onCameraState,
  resetSignal
}: {
  onCameraState: (state: string) => void;
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
  }, [resetSignal]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={false}
      enablePan={false}
      makeDefault
      maxDistance={7}
      maxPolarAngle={THREE.MathUtils.degToRad(76)}
      minDistance={2.8}
      minPolarAngle={THREE.MathUtils.degToRad(22)}
      target={cameraTarget}
      onChange={() => onCameraState(formatCameraState(camera))}
    />
  );
}

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(onReady);
    return () => window.cancelAnimationFrame(frame);
  }, [onReady]);

  return null;
}

function ThreeDScene({
  accent,
  meshResolution,
  onCameraState,
  onReady,
  panelScale,
  resetSignal,
  surfaceScale
}: {
  accent: string;
  meshResolution: number;
  onCameraState: (state: string) => void;
  onReady: () => void;
  panelScale: number;
  resetSignal: number;
  surfaceScale: number;
}) {
  const surfaceGeometry = useMemo(
    () => buildSurfaceGeometry(meshResolution, surfaceScale),
    [meshResolution, surfaceScale]
  );
  const panels = useMemo(() => buildThreeDGraphPanelSamples({ panelScale }), [panelScale]);

  useEffect(() => () => surfaceGeometry.dispose(), [surfaceGeometry]);

  return (
    <>
      <color attach="background" args={["#0b1420"]} />
      <ambientLight intensity={0.68} />
      <directionalLight color="#fff8d7" intensity={2.2} position={[3.5, 5.2, 4]} />
      <directionalLight color="#67e8f9" intensity={0.72} position={[-4, 3, -3]} />
      <Grid
        args={[2.6, 2.6]}
        cellColor="#274158"
        cellSize={0.26}
        cellThickness={0.7}
        fadeDistance={5}
        fadeStrength={0.28}
        infiniteGrid={false}
        sectionColor="#facc15"
        sectionSize={1}
        sectionThickness={1.2}
      />
      <Line color="#38bdf8" lineWidth={3} points={[[-1.25, 0.012, 0], [1.25, 0.012, 0]]} />
      <Line color="#f472b6" lineWidth={3} points={[[0, 0.014, -1.25], [0, 0.014, 1.25]]} />
      <Line color="#facc15" lineWidth={3} points={[[0, 0, 0], [0, 1.72, 0]]} />
      <Html center position={[1.38, 0.04, 0]}>
        <span className="rounded-full bg-cyan-200 px-2 py-0.5 text-[10px] font-black text-slate-950">x</span>
      </Html>
      <Html center position={[0, 0.04, 1.38]}>
        <span className="rounded-full bg-pink-200 px-2 py-0.5 text-[10px] font-black text-slate-950">y</span>
      </Html>
      <Html center position={[0, 1.86, 0]}>
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-slate-950">z</span>
      </Html>
      {panels.map((panel, index) => {
        const xValues = panel.corners.map((corner) => corner.x);
        const yValues = panel.corners.map((corner) => corner.y);
        const x = (Math.min(...xValues) + Math.max(...xValues)) / 2;
        const z = (Math.min(...yValues) + Math.max(...yValues)) / 2;
        const warm = index > panels.length * 0.6;

        return (
          <mesh key={panel.id} position={[x, panel.height / 2, z]}>
            <boxGeometry args={[0.23, panel.height, 0.23]} />
            <meshStandardMaterial
              color={warm ? "#facc15" : "#22d3ee"}
              emissive={warm ? "#5f4305" : "#063c4a"}
              emissiveIntensity={0.08}
              metalness={0.05}
              opacity={0.62}
              roughness={0.58}
              transparent
            />
          </mesh>
        );
      })}
      <mesh geometry={surfaceGeometry} position={[0, 0.018, 0]}>
        <meshStandardMaterial
          color={accent}
          metalness={0.08}
          opacity={0.72}
          roughness={0.42}
          side={THREE.DoubleSide}
          transparent
          vertexColors
        />
      </mesh>
      <lineSegments position={[0, 0.024, 0]}>
        <wireframeGeometry args={[surfaceGeometry]} />
        <lineBasicMaterial color="#fff1a6" opacity={0.92} transparent />
      </lineSegments>
      <CameraResetter onCameraState={onCameraState} resetSignal={resetSignal} />
      <SceneReady onReady={onReady} />
    </>
  );
}

export function ThreeDGraphCanvas({
  accent = "#facc15",
  fallback,
  label,
  meshResolution = 25,
  panelScale = 1,
  surfaceScale = 1
}: ThreeDGraphCanvasProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [cameraState, setCameraState] = useState("azimuth=45.00;elevation=35.00;distance=4.80");
  const summary = formatThreeDGraphSummary({ meshResolution, panelScale, surfaceScale });

  useEffect(() => {
    setWebglSupported(canUseWebGL());
  }, []);

  useEffect(() => {
    setCanvasReady(false);
  }, [meshResolution, panelScale, surfaceScale]);

  if (webglSupported !== true) return <>{fallback}</>;

  function resetCamera() {
    setResetSignal((current) => current + 1);
  }

  return (
    <div
      data-viz-surface
      data-viz-canvas-ready={canvasReady ? "true" : "false"}
      data-viz-camera-state={cameraState}
      data-viz-mark-count="1"
      data-viz-mesh-resolution={meshResolution}
      data-viz-panel-count="25"
      data-viz-panel-scale={panelScale.toFixed(2)}
      data-viz-renderer="three-r3f"
      data-viz-state-summary={summary}
      data-viz-surface-scale={surfaceScale.toFixed(2)}
      role="application"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Home") {
          event.preventDefault();
          resetCamera();
        }
      }}
      className="relative aspect-[16/9] w-full overflow-hidden rounded-[28px] border border-slate-900/10 bg-slate-950 shadow-inner shadow-cyan-500/10 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-white/10"
    >
      <span data-viz-mark data-viz-name="three-d-r3f-surface" className="sr-only">
        {summary}
      </span>
      <Canvas
        camera={{ fov: 42, near: 0.1, far: 100, position: defaultCameraPosition().toArray() }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ camera }) => setCameraState(formatCameraState(camera))}
      >
        <ThreeDScene
          accent={accent}
          meshResolution={meshResolution}
          onCameraState={setCameraState}
          onReady={() => setCanvasReady(true)}
          panelScale={panelScale}
          resetSignal={resetSignal}
          surfaceScale={surfaceScale}
        />
      </Canvas>
      <div
        data-viz-three-formula
        className="pointer-events-none absolute left-3 top-3 rounded-2xl border border-white/10 bg-slate-950/72 px-3.5 py-2.5 text-sm font-black leading-tight text-cyan-50 shadow-lg shadow-slate-950/20 [&_.katex]:text-[1.08em]"
      >
        <MathText
          text="$z = h(1 - x^2 - y^2)$"
          ariaLabel="z equals h times one minus x squared minus y squared"
          normalizeMath={false}
        />
      </div>
      <button
        type="button"
        data-viz-three-reset-camera
        onClick={resetCamera}
        className="focus-ring absolute bottom-3 right-3 rounded-2xl border border-white/15 bg-white/92 px-3 py-2 text-xs font-black text-slate-900 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-100 dark:bg-slate-900/88 dark:text-cyan-50 dark:hover:bg-slate-800"
      >
        Reset camera
      </button>
    </div>
  );
}
