"use client";

import { Grid, Line } from "@react-three/drei";
import type { ReactNode } from "react";
import * as THREE from "three";
import { sceneVariantForThreeDFamily } from "../threeDSceneMath";
import type {
  ThreeDFamilyId,
  ThreeDSceneProps,
  ThreeDSceneVariant,
  ThreeDStateSummary
} from "../threeDSceneTypes";

export { threeDSceneVariantMetadata } from "../threeDSceneVariantMetadata";

export const implementedThreeDSceneVariants = [
  "array-blocks",
  "balance-scale",
  "conic-section-deep",
  "cross-section-slicer",
  "curriculum-crosswalk",
  "distribution-machine",
  "exam-strategy-capstone",
  "fraction-slices",
  "function-ribbon",
  "geometry-axes",
  "measurement-rail",
  "optimization-landscape",
  "place-value-blocks",
  "solid-net-fold",
  "space-vector-plane",
  "statistical-inference",
  "vector-conic-strategy"
] as const satisfies readonly ThreeDSceneVariant[];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalized(state: ThreeDStateSummary) {
  return {
    depth: clamp(state.depthValue, 0.35, 3.4),
    primary: clamp(state.primaryValue, 1, 12),
    secondary: clamp(state.secondaryValue, 1, 12)
  };
}

function point(x: number, y: number, z: number): [number, number, number] {
  return [x, y, z];
}

function ellipsePoints(radiusX: number, radiusZ: number, y: number, segments = 64): Array<[number, number, number]> {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return point(Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ);
  });
}

function parabolaPoints(width: number, height: number, y: number, segments = 60): Array<[number, number, number]> {
  return Array.from({ length: segments }, (_, index) => {
    const t = index / Math.max(1, segments - 1);
    const x = -width + t * width * 2;
    const z = (x * x - width * 0.65) * height;
    return point(x, y + Math.sin(t * Math.PI) * 0.1, z);
  });
}

function railTicks(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const x = -2.4 + (4.8 / Math.max(1, count - 1)) * index;
    return (
      <group key={index} position={[x, 0.08, 0]}>
        <mesh>
          <boxGeometry args={[0.025, index % 5 === 0 ? 0.42 : 0.24, 0.045]} />
          <meshStandardMaterial color={index % 5 === 0 ? "#facc15" : "#bae6fd"} />
        </mesh>
      </group>
    );
  });
}

function MeasurementRail({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const markerX = -2.4 + (clamp(values.primary, 1, 12) / 12) * 4.8;

  return (
    <group>
      <Line color="#bae6fd" lineWidth={5} points={[point(-2.55, 0.08, 0), point(2.55, 0.08, 0)]} />
      {railTicks(13)}
      <mesh position={[markerX, 0.34, 0]}>
        <sphereGeometry args={[0.18, 24, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.16} roughness={0.35} />
      </mesh>
      <mesh position={[markerX, 0.16, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial color="#fb7185" roughness={0.45} />
      </mesh>
    </group>
  );
}

function PlaceValueBlocks({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const tens = Math.max(2, Math.round(values.primary / 2));
  const ones = Math.max(3, Math.round(values.secondary / 1.5));

  return (
    <group position={[-1.9, 0, -0.4]}>
      {Array.from({ length: tens }, (_, column) => (
        <mesh key={`ten-${column}`} position={[column * 0.34, 0.52, 0]}>
          <boxGeometry args={[0.24, 1.02, 0.24]} />
          <meshStandardMaterial color={accent} roughness={0.42} />
        </mesh>
      ))}
      {Array.from({ length: ones }, (_, index) => (
        <mesh key={`one-${index}`} position={[2.3 + (index % 5) * 0.28, 0.13 + Math.floor(index / 5) * 0.28, 0.04]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color="#facc15" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function ArrayBlocks({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const rows = clamp(Math.round(values.primary / 2), 2, 6);
  const columns = clamp(Math.round(values.secondary / 2), 2, 6);

  return (
    <group position={[-columns * 0.22, 0.07, -rows * 0.22]}>
      {Array.from({ length: rows * columns }, (_, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        return (
          <mesh key={index} position={[column * 0.44, 0.09 + index * 0.002, row * 0.44]}>
            <boxGeometry args={[0.36, 0.18 + row * 0.015, 0.36]} />
            <meshStandardMaterial color={row % 2 === 0 ? accent : "#34d399"} roughness={0.46} />
          </mesh>
        );
      })}
    </group>
  );
}

function FractionSlices({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const slices = clamp(Math.round(values.secondary), 4, 10);
  const active = clamp(Math.round(values.primary / 12 * slices), 1, slices);

  return (
    <group>
      {Array.from({ length: slices }, (_, index) => {
        const angle = (index / slices) * Math.PI * 2;
        const radius = 1.1;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * radius * 0.42, 0.18, Math.sin(angle) * radius * 0.42]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.68, 0.22, 0.2]} />
            <meshStandardMaterial color={index < active ? accent : "#475569"} roughness={0.4} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.12, 1.12, 0.05, 48]} />
        <meshStandardMaterial color="#0f172a" metalness={0.05} roughness={0.7} />
      </mesh>
    </group>
  );
}

function DistributionMachine({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const bars = 7;

  return (
    <group position={[-1.7, 0, 0]}>
      {Array.from({ length: bars }, (_, index) => {
        const wave = Math.sin(index * 0.9 + values.primary * 0.4);
        const height = 0.35 + Math.abs(wave) * 1.2 + values.depth * 0.18;
        return (
          <mesh key={index} position={[index * 0.55, height / 2, 0]}>
            <boxGeometry args={[0.34, height, 0.42]} />
            <meshStandardMaterial color={index % 2 === 0 ? accent : "#facc15"} roughness={0.5} />
          </mesh>
        );
      })}
      {Array.from({ length: 10 }, (_, index) => (
        <mesh key={`dot-${index}`} position={[-0.2 + index * 0.38, 1.9 + Math.sin(index + values.secondary) * 0.18, -0.62]}>
          <sphereGeometry args={[0.08, 16, 12]} />
          <meshStandardMaterial color="#f472b6" emissive="#5b102d" emissiveIntensity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

function GeometryAxes({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const angle = (values.primary / 12) * Math.PI * 0.85;
  const hypotenuse = 1.4 + values.depth * 0.25;
  const end = point(Math.cos(angle) * hypotenuse, 0.12, Math.sin(angle) * hypotenuse);

  return (
    <group>
      <Line color="#38bdf8" lineWidth={4} points={[point(-1.8, 0.08, 0), point(1.8, 0.08, 0)]} />
      <Line color="#f472b6" lineWidth={4} points={[point(0, 0.08, -1.8), point(0, 0.08, 1.8)]} />
      <Line color={accent} lineWidth={6} points={[point(0, 0.14, 0), end]} />
      <Line color="#facc15" lineWidth={4} points={[end, point(end[0], 0.14, 0), point(0, 0.14, 0)]} />
      <mesh position={end}>
        <sphereGeometry args={[0.16, 24, 16]} />
        <meshStandardMaterial color={accent} roughness={0.36} />
      </mesh>
    </group>
  );
}

function BalanceScene({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const tilt = clamp((values.primary - values.secondary) / 18, -0.3, 0.3);

  return (
    <group>
      <mesh position={[0, 0.58, 0]} rotation={[0, 0, tilt]}>
        <boxGeometry args={[3.4, 0.1, 0.12]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[0.12, 0.62, 0.12]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.4} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.35, 0.16 - side * tilt, 0]}>
          <mesh>
            <cylinderGeometry args={[0.46, 0.56, 0.14, 32]} />
            <meshStandardMaterial color={side < 0 ? accent : "#facc15"} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.22 + (side < 0 ? values.primary : values.secondary) * 0.025, 0]}>
            <sphereGeometry args={[0.18, 20, 12]} />
            <meshStandardMaterial color={side < 0 ? "#22d3ee" : "#fb7185"} roughness={0.42} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function functionPoints(state: ThreeDStateSummary) {
  const values = normalized(state);
  return Array.from({ length: 56 }, (_, index) => {
    const t = index / 55;
    const x = -2.35 + t * 4.7;
    const wave = Math.sin((x + values.secondary * 0.12) * 1.8);
    const curve = state.familyId === "three-calculus-rate-area" ? x * x * 0.15 : Math.cos(x * 1.1) * 0.2;
    const y = 0.36 + wave * (0.36 + values.primary * 0.035) + curve;
    return point(x, y, -0.25 + t * 0.5);
  });
}

function FunctionRibbon({ accent, state }: ThreeDSceneProps) {
  const points = functionPoints(state);
  const values = normalized(state);

  return (
    <group>
      <Line color={accent} lineWidth={5} points={points} />
      <Line color="#facc15" lineWidth={3} points={points.map((entry) => point(entry[0], entry[1] - 0.28, entry[2] - 0.28))} />
      {points.filter((_, index) => index % 9 === 0).map((entry, index) => (
        <mesh key={index} position={entry}>
          <sphereGeometry args={[0.09 + values.depth * 0.01, 16, 12]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#22d3ee" : "#f472b6"} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function StrategyStack({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const coneHeight = 0.9 + values.depth * 0.28;

  return (
    <group>
      <mesh position={[-0.9, coneHeight / 2, 0]} rotation={[0, values.primary * 0.08, 0]}>
        <coneGeometry args={[0.58, coneHeight, 48]} />
        <meshStandardMaterial color={accent} metalness={0.08} roughness={0.4} />
      </mesh>
      <mesh position={[0.75, 0.62, 0]} rotation={[Math.PI / 2, 0, values.secondary * 0.08]}>
        <torusGeometry args={[0.62, 0.055, 12, 48]} />
        <meshStandardMaterial color="#facc15" roughness={0.35} />
      </mesh>
      <Line color="#38bdf8" lineWidth={5} points={[point(-1.8, 0.18, -0.75), point(-0.2, 1.25, 0.1), point(1.65, 0.38, 0.75)]} />
      {[-1.5, -0.45, 0.6, 1.55].map((x, index) => (
        <mesh key={index} position={[x, 0.16 + index * 0.18, -0.7 + index * 0.46]}>
          <boxGeometry args={[0.28, 0.28, 0.28]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#34d399" : "#f472b6"} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function SolidNetFoldScene({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const fold = clamp((values.primary - 1) / 11, 0, 1);
  const foldAngle = -fold * Math.PI * 0.48;
  const panelMaterial = { color: accent, roughness: 0.44 };
  const openMaterial = { color: "#facc15", roughness: 0.5 };

  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.86, 0.08, 0.86]} />
        <meshStandardMaterial {...panelMaterial} />
      </mesh>
      <mesh position={[0, 0.08, -0.86]} rotation={[foldAngle, 0, 0]}>
        <boxGeometry args={[0.86, 0.08, 0.82]} />
        <meshStandardMaterial {...openMaterial} />
      </mesh>
      <mesh position={[0.86, 0.08, 0]} rotation={[0, 0, -foldAngle]}>
        <boxGeometry args={[0.82, 0.08, 0.86]} />
        <meshStandardMaterial color="#34d399" roughness={0.46} />
      </mesh>
      <mesh position={[-0.86, 0.08, 0]} rotation={[0, 0, foldAngle]}>
        <boxGeometry args={[0.82, 0.08, 0.86]} />
        <meshStandardMaterial color="#f472b6" roughness={0.46} />
      </mesh>
      <mesh position={[0, 0.08, 0.86]} rotation={[-foldAngle, 0, 0]}>
        <boxGeometry args={[0.86, 0.08, 0.82]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.46} />
      </mesh>
      <mesh position={[0, 0.52 + values.depth * 0.04, 0]}>
        <boxGeometry args={[0.74, 0.74, 0.74]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.22} roughness={0.2} />
      </mesh>
      <Line color="#f8fafc" lineWidth={2} points={[point(-0.44, 0.16, -0.43), point(0.44, 0.16, -0.43)]} />
      <Line color="#f8fafc" lineWidth={2} points={[point(0.43, 0.16, -0.44), point(0.43, 0.16, 0.44)]} />
    </group>
  );
}

function CrossSectionSlicerScene({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const sliceY = 0.36 + values.primary * 0.055;
  const tilt = (values.secondary - 6) * 0.035;

  return (
    <group>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 1.7, 48]} />
        <meshStandardMaterial color={accent} transparent opacity={0.28} roughness={0.25} />
      </mesh>
      <mesh position={[0, sliceY, 0]} rotation={[tilt, 0.14, 0]}>
        <boxGeometry args={[2.45, 0.035, 1.75]} />
        <meshStandardMaterial color="#facc15" transparent opacity={0.58} roughness={0.35} />
      </mesh>
      <Line color="#fb7185" lineWidth={5} points={ellipsePoints(0.72 + Math.abs(tilt) * 2.2, 0.42, sliceY + 0.045)} />
      <Line color="#bae6fd" lineWidth={3} points={[point(-1.25, 0.06, -0.86), point(1.25, 0.06, -0.86)]} />
    </group>
  );
}

function SpaceVectorPlaneScene({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const vectorEnd = point(0.34 + values.primary * 0.12, 0.42 + values.depth * 0.22, -0.95 + values.secondary * 0.08);

  return (
    <group>
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, (values.secondary - 6) * 0.035]}>
        <planeGeometry args={[3.5, 2.4]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.2} side={THREE.DoubleSide} roughness={0.5} />
      </mesh>
      <Line color="#f8fafc" lineWidth={3} points={[point(-2, 0.2, 0), point(2, 0.2, 0)]} />
      <Line color="#f8fafc" lineWidth={3} points={[point(0, 0.2, -1.35), point(0, 0.2, 1.35)]} />
      <Line color={accent} lineWidth={7} points={[point(-1.45, 0.14, -0.85), vectorEnd]} />
      <Line color="#facc15" lineWidth={4} points={[point(0.85, 0.2, -1.15), point(-0.35, 1.55, 0.7)]} />
      <mesh position={vectorEnd}>
        <coneGeometry args={[0.16, 0.36, 24]} />
        <meshStandardMaterial color={accent} roughness={0.35} />
      </mesh>
      {[-1.2, 0, 1.2].map((x, index) => (
        <mesh key={index} position={[x, 0.24 + index * 0.08, -0.45 + index * 0.35]}>
          <sphereGeometry args={[0.11, 18, 12]} />
          <meshStandardMaterial color={index === 1 ? "#facc15" : "#f472b6"} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function ConicSectionDeepScene({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const tilt = 0.22 + values.secondary * 0.025;
  const y = 0.84;

  return (
    <group>
      <mesh position={[0, 1.08, 0]}>
        <coneGeometry args={[0.86, 1.6, 64, 1, true]} />
        <meshStandardMaterial color={accent} transparent opacity={0.25} side={THREE.DoubleSide} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.86, 1.6, 64, 1, true]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.18} side={THREE.DoubleSide} roughness={0.32} />
      </mesh>
      <mesh position={[0, y, 0]} rotation={[tilt, 0.22, 0]}>
        <boxGeometry args={[2.55, 0.035, 1.95]} />
        <meshStandardMaterial color="#facc15" transparent opacity={0.5} roughness={0.36} />
      </mesh>
      <Line color="#fb7185" lineWidth={5} points={ellipsePoints(0.52 + values.primary * 0.025, 0.26 + values.depth * 0.04, y + 0.06)} />
      <Line color="#e0f2fe" lineWidth={4} points={parabolaPoints(1.1, 0.32, 0.3)} />
    </group>
  );
}

function OptimizationLandscapeScene({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const gridValues = [-1.2, -0.6, 0, 0.6, 1.2];
  const pathPoints = Array.from({ length: 8 }, (_, index) => {
    const t = index / 7;
    const x = -1.65 + t * 2.9;
    const z = 1.2 - t * 2.1;
    const y = 0.22 + (x * x + z * z) * 0.14 + Math.sin(t * Math.PI + values.secondary) * 0.06;
    return point(x, y, z);
  });

  return (
    <group>
      {gridValues.flatMap((x) =>
        gridValues.map((z) => {
          const height = 0.12 + (x * x + z * z) * 0.16 + Math.sin(values.primary + x * z) * 0.04;
          return (
            <mesh key={`${x}-${z}`} position={[x, height / 2, z]}>
              <boxGeometry args={[0.34, height, 0.34]} />
              <meshStandardMaterial color={height > 0.45 ? accent : "#34d399"} roughness={0.42} />
            </mesh>
          );
        })
      )}
      <Line color="#facc15" lineWidth={6} points={pathPoints} />
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.18, 24, 16]} />
        <meshStandardMaterial color="#fb7185" emissive="#7f1d1d" emissiveIntensity={0.18} roughness={0.3} />
      </mesh>
    </group>
  );
}

function StatisticalInferenceScene({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const meanX = -1.5 + (values.primary / 12) * 3;
  const interval = 0.34 + values.depth * 0.06;

  return (
    <group>
      <mesh position={[meanX, 0.34, 0]}>
        <boxGeometry args={[interval * 2, 0.12, 1.8]} />
        <meshStandardMaterial color="#facc15" transparent opacity={0.44} roughness={0.38} />
      </mesh>
      <Line color={accent} lineWidth={5} points={[point(meanX, 0.1, -1.05), point(meanX, 1.45, -1.05)]} />
      {Array.from({ length: 18 }, (_, index) => {
        const row = Math.floor(index / 6);
        const column = index % 6;
        const x = -1.5 + column * 0.6 + Math.sin(index + values.secondary) * 0.08;
        const y = 0.18 + row * 0.28;
        const z = -0.4 + Math.cos(index * 0.7 + values.primary) * 0.48;
        return (
          <mesh key={index} position={[x, y, z]}>
            <sphereGeometry args={[0.09, 16, 12]} />
            <meshStandardMaterial color={column % 2 === 0 ? accent : "#f472b6"} roughness={0.36} />
          </mesh>
        );
      })}
      <Line color="#bae6fd" lineWidth={3} points={[point(-1.95, 0.08, -1.1), point(1.95, 0.08, -1.1)]} />
    </group>
  );
}

function CurriculumCrosswalkScene({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const columns = [
    { color: accent, x: -1.45 },
    { color: "#facc15", x: 0 },
    { color: "#f472b6", x: 1.45 }
  ];
  const levels = [0.18, 0.68, 1.18];

  return (
    <group>
      {columns.map((column, columnIndex) =>
        levels.map((y, levelIndex) => (
          <mesh key={`${column.x}-${y}`} position={[column.x, y, -0.45 + levelIndex * 0.45]}>
            <sphereGeometry args={[0.15 + levelIndex * 0.025, 24, 16]} />
            <meshStandardMaterial color={column.color} roughness={0.36} />
          </mesh>
        ))
      )}
      {levels.map((y, index) => (
        <Line
          key={index}
          color={index === 1 ? "#facc15" : "#bae6fd"}
          lineWidth={4}
          points={[
            point(-1.45, y, -0.45 + index * 0.45),
            point(0, y + Math.sin(values.primary + index) * 0.08, -0.45 + index * 0.45),
            point(1.45, y + Math.cos(values.secondary + index) * 0.08, -0.45 + index * 0.45)
          ]}
        />
      ))}
      <Line color="#34d399" lineWidth={5} points={[point(-1.45, 0.18, -0.45), point(0, 0.68, 0), point(1.45, 1.18, 0.45)]} />
    </group>
  );
}

function ExamStrategyCapstoneScene({ accent, state }: ThreeDSceneProps) {
  const values = normalized(state);
  const stages = 5;
  const pathPoints = Array.from({ length: stages }, (_, index) =>
    point(-1.8 + index * 0.9, 0.32 + index * 0.2, -0.6 + Math.sin(index + values.secondary) * 0.18)
  );

  return (
    <group>
      {Array.from({ length: stages }, (_, index) => {
        const height = 0.22 + index * 0.18 + values.depth * 0.03;
        return (
          <mesh key={index} position={[-1.8 + index * 0.9, height / 2, 0.42 - index * 0.16]}>
            <boxGeometry args={[0.48, height, 0.48]} />
            <meshStandardMaterial color={index % 2 === 0 ? accent : "#facc15"} roughness={0.45} />
          </mesh>
        );
      })}
      <Line color="#f8fafc" lineWidth={5} points={pathPoints} />
      <mesh position={pathPoints[pathPoints.length - 1]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.04, 12, 36]} />
        <meshStandardMaterial color="#fb7185" emissive="#7f1d1d" emissiveIntensity={0.12} roughness={0.32} />
      </mesh>
      <mesh position={[-2.12, 0.22, 0.72]}>
        <sphereGeometry args={[0.12, 18, 12]} />
        <meshStandardMaterial color="#34d399" roughness={0.32} />
      </mesh>
    </group>
  );
}

export const threeDSceneRendererByVariant: Record<ThreeDSceneVariant, (props: ThreeDSceneProps) => ReactNode> = {
  "array-blocks": ArrayBlocks,
  "balance-scale": BalanceScene,
  "conic-section-deep": ConicSectionDeepScene,
  "cross-section-slicer": CrossSectionSlicerScene,
  "curriculum-crosswalk": CurriculumCrosswalkScene,
  "distribution-machine": DistributionMachine,
  "exam-strategy-capstone": ExamStrategyCapstoneScene,
  "fraction-slices": FractionSlices,
  "function-ribbon": FunctionRibbon,
  "geometry-axes": GeometryAxes,
  "measurement-rail": MeasurementRail,
  "optimization-landscape": OptimizationLandscapeScene,
  "place-value-blocks": PlaceValueBlocks,
  "solid-net-fold": SolidNetFoldScene,
  "space-vector-plane": SpaceVectorPlaneScene,
  "statistical-inference": StatisticalInferenceScene,
  "vector-conic-strategy": StrategyStack
};

function renderFamilyScene(familyId: ThreeDFamilyId, props: ThreeDSceneProps): ReactNode {
  const variant = sceneVariantForThreeDFamily(familyId);
  const SceneComponent = threeDSceneRendererByVariant[variant];

  return <SceneComponent accent={props.accent} state={props.state} />;
}

export function TemplatePrimitiveScene({ accent, state }: ThreeDSceneProps) {
  return (
    <group rotation={[0, Math.sin(state.secondaryValue) * 0.05, 0]}>
      <Grid
        args={[5.5, 5.5]}
        cellColor="#274158"
        cellSize={0.5}
        cellThickness={0.65}
        fadeDistance={6}
        fadeStrength={0.25}
        infiniteGrid={false}
        sectionColor="#facc15"
        sectionSize={1}
        sectionThickness={1.1}
      />
      <Line color="#38bdf8" lineWidth={3} points={[point(-2.7, 0.015, 0), point(2.7, 0.015, 0)]} />
      <Line color="#f472b6" lineWidth={3} points={[point(0, 0.018, -2.7), point(0, 0.018, 2.7)]} />
      {renderFamilyScene(state.familyId, { accent, state })}
    </group>
  );
}
