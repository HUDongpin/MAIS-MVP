"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect } from "react";
import * as THREE from "three";

export const THREE_D_BOUNDARY_CONTENT_ROOT_NAME = "mais-three-boundary-content-root" as const;
export const THREE_D_BOUNDARY_SNAPSHOT_SYMBOL_KEY = "mais.math.webgl-boundary.snapshot.v1" as const;

export type ThreeDSceneBoundaryIssueKind =
  | "behind-camera"
  | "content-outside-canvas"
  | "depth-outside-camera"
  | "empty-content-root"
  | "invalid-projection"
  | "near-plane-intersection"
  | "unsupported-renderable";

export type ThreeDSceneBoundaryIssue = {
  detail: string;
  kind: ThreeDSceneBoundaryIssueKind;
  objectId: string;
  overflowCssPixels: number;
};

export type ThreeDSceneBoundarySnapshot = {
  canvas: {
    backingHeight: number;
    backingWidth: number;
    cssHeight: number;
    cssWidth: number;
    devicePixelRatio: number;
  };
  contentRootFound: boolean;
  issueCount: number;
  issues: ThreeDSceneBoundaryIssue[];
  maxOverflowCssPixels: number;
  projectedBoundsCss: {
    bottom: number;
    left: number;
    right: number;
    top: number;
  } | null;
  renderableCount: number;
  status: "fail" | "pass";
  supportedRenderableCount: number;
  toleranceCssPixels: number;
  unsupportedRenderableCount: number;
  version: 1;
};

type BoundaryRenderable = THREE.Object3D & {
  geometry?: THREE.BufferGeometry;
  isBatchedMesh?: boolean;
  isInstancedMesh?: boolean;
  isLine?: boolean;
  isLineSegments2?: boolean;
  isMesh?: boolean;
  isPoints?: boolean;
  isSkinnedMesh?: boolean;
  isSprite?: boolean;
  material?: THREE.Material | THREE.Material[];
  morphTargetInfluences?: number[];
};

type BoundarySnapshotHook = () => ThreeDSceneBoundarySnapshot;

const CSS_TOLERANCE_PIXELS = 1;
const CLIP_EPSILON = 1e-7;

function finite(value: number) {
  return Number.isFinite(value);
}

function rounded(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : value;
}

function objectId(object: THREE.Object3D) {
  return object.name || `${object.type || "Object3D"}#${object.uuid.slice(0, 8)}`;
}

function boxCorners(box: THREE.Box3) {
  return [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z)
  ];
}

function materialList(object: BoundaryRenderable) {
  if (!object.material) return [];
  return Array.isArray(object.material) ? object.material : [object.material];
}

function materialPaints(material: THREE.Material) {
  if (!material.visible) return false;
  const opacity = "opacity" in material ? Number(material.opacity) : 1;
  return !Number.isFinite(opacity) || opacity > 0;
}

function isKnownFiniteGridMaterial(material: THREE.Material) {
  if (!(material instanceof THREE.ShaderMaterial)) return false;
  const uniforms = material.uniforms as Record<string, { value?: unknown }>;
  const isGrid = [
    "cellSize",
    "sectionSize",
    "fadeDistance",
    "infiniteGrid",
    "followCamera",
    "worldCamProjPosition",
    "worldPlanePosition"
  ].every((key) => key in uniforms);
  if (!isGrid) return false;
  return uniforms.infiniteGrid?.value === false && uniforms.followCamera?.value === false;
}

function materialIsSupported(object: BoundaryRenderable, material: THREE.Material) {
  if (!(material instanceof THREE.ShaderMaterial)) return true;
  if (object.isLineSegments2 && "isLineMaterial" in material && material.isLineMaterial === true) return true;
  return isKnownFiniteGridMaterial(material);
}

function hasUnsupportedVertexMutation(object: BoundaryRenderable, materials: THREE.Material[]) {
  if (object.isBatchedMesh) {
    return "BatchedMesh draw ranges and per-geometry transforms are not represented by one static geometry bound";
  }
  if (object.isSkinnedMesh) return "SkinnedMesh deformation is not represented by the static geometry bounds";
  if (object.morphTargetInfluences?.some((value) => Math.abs(value) > CLIP_EPSILON)) {
    return "active morph targets are not represented by the static geometry bounds";
  }
  for (const material of materials) {
    if (!materialIsSupported(object, material)) {
      return `unsupported vertex shader material ${material.type || material.constructor.name}`;
    }
    if ("displacementMap" in material && material.displacementMap) {
      return `material ${material.type || material.constructor.name} uses a displacement map`;
    }
  }
  return null;
}

function renderableKind(object: BoundaryRenderable) {
  if (object.isSprite) return "unsupported-sprite" as const;
  if (object.isLineSegments2) return "wide-line" as const;
  if (object.isPoints) return "points" as const;
  if (object.isLine) return "line" as const;
  if (object.isMesh) return "mesh" as const;
  return null;
}

function objectIsVisibleToCamera(object: THREE.Object3D, camera: THREE.Camera) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return camera.layers.test(object.layers);
}

function localBoundaryPoints(
  object: BoundaryRenderable,
  materials: THREE.Material[]
): { points: THREE.Vector3[]; unsupported: string | null } {
  const geometry = object.geometry;
  if (!geometry) return { points: [], unsupported: "renderable has no BufferGeometry" };

  const gridMaterial = materials.find(isKnownFiniteGridMaterial);
  if (gridMaterial) {
    geometry.computeBoundingBox();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
      return { points: [], unsupported: "finite grid geometry has no finite local bounds" };
    }
    // @react-three/drei Grid maps planeGeometry's local (x, y, 0) vertices to
    // (x, 0, y) in its vertex shader. Reproduce that documented transform so
    // the probe audits the pixels the shader actually places on screen.
    const points = boxCorners(geometry.boundingBox).map((point) => new THREE.Vector3(point.x, point.z, point.y));
    return { points, unsupported: null };
  }

  geometry.computeBoundingBox();
  if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
    return { points: [], unsupported: "geometry has no finite local bounding box" };
  }
  const values = [...geometry.boundingBox.min.toArray(), ...geometry.boundingBox.max.toArray()];
  if (values.some((value) => !finite(value))) {
    return { points: [], unsupported: "geometry bounding box contains a non-finite coordinate" };
  }
  return { points: boxCorners(geometry.boundingBox), unsupported: null };
}

function objectMatrices(object: BoundaryRenderable) {
  if (!object.isInstancedMesh) return [object.matrixWorld.clone()];
  const instanced = object as THREE.InstancedMesh;
  const matrices: THREE.Matrix4[] = [];
  const instanceMatrix = new THREE.Matrix4();
  for (let index = 0; index < instanced.count; index += 1) {
    instanced.getMatrixAt(index, instanceMatrix);
    matrices.push(object.matrixWorld.clone().multiply(instanceMatrix));
  }
  return matrices;
}

function paintPaddingCssPixels(
  object: BoundaryRenderable,
  materials: THREE.Material[],
  minimumCameraDepth: number,
  cssHeight: number,
  devicePixelRatio: number
) {
  if (object.isLineSegments2) {
    return materials.reduce((maximum, material) => {
      const lineMaterial = material as THREE.Material & { linewidth?: number; worldUnits?: boolean };
      if (lineMaterial.worldUnits) return Number.POSITIVE_INFINITY;
      return Math.max(maximum, Math.max(1, Number(lineMaterial.linewidth) || 1) / 2);
    }, 0);
  }
  if (object.isLine) {
    return materials.reduce((maximum, material) => {
      const linewidth = "linewidth" in material ? Number(material.linewidth) : 1;
      return Math.max(maximum, Math.max(1, finite(linewidth) ? linewidth : 1) / 2);
    }, 0);
  }
  if (object.isPoints) {
    return materials.reduce((maximum, material) => {
      if (!(material instanceof THREE.PointsMaterial)) return Number.POSITIVE_INFINITY;
      const size = Math.max(0, material.size);
      if (!material.sizeAttenuation) return Math.max(maximum, size / Math.max(1, devicePixelRatio) / 2);
      if (!(minimumCameraDepth > CLIP_EPSILON)) return Number.POSITIVE_INFINITY;
      // Three.js' PointsMaterial shader uses size * pixelRatio and a viewport
      // scale of backingHeight / 2. Convert the resulting raster diameter back
      // to CSS pixels and retain half as padding around the projected center.
      const radiusCssPixels = (size * cssHeight) / (4 * minimumCameraDepth);
      return Math.max(maximum, radiusCssPixels);
    }, 0);
  }
  return 0;
}

function emptySnapshot(canvas: HTMLCanvasElement, issue: ThreeDSceneBoundaryIssue): ThreeDSceneBoundarySnapshot {
  const box = canvas.getBoundingClientRect();
  const devicePixelRatio = box.width > 0 ? canvas.width / box.width : 1;
  return {
    canvas: {
      backingHeight: canvas.height,
      backingWidth: canvas.width,
      cssHeight: rounded(box.height),
      cssWidth: rounded(box.width),
      devicePixelRatio: rounded(devicePixelRatio)
    },
    contentRootFound: false,
    issueCount: 1,
    issues: [issue],
    maxOverflowCssPixels: rounded(issue.overflowCssPixels),
    projectedBoundsCss: null,
    renderableCount: 0,
    status: "fail",
    supportedRenderableCount: 0,
    toleranceCssPixels: CSS_TOLERANCE_PIXELS,
    unsupportedRenderableCount: issue.kind === "unsupported-renderable" ? 1 : 0,
    version: 1
  };
}

export function captureThreeDSceneBoundarySnapshot({
  camera,
  canvas,
  scene
}: {
  camera: THREE.Camera;
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
}): ThreeDSceneBoundarySnapshot {
  const canvasBox = canvas.getBoundingClientRect();
  if (!(canvasBox.width > 0) || !(canvasBox.height > 0) || canvas.width <= 0 || canvas.height <= 0) {
    return emptySnapshot(canvas, {
      detail: "canvas has no finite positive CSS/backing dimensions",
      kind: "invalid-projection",
      objectId: "canvas",
      overflowCssPixels: 0
    });
  }

  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const contentRoot = scene.getObjectByName(THREE_D_BOUNDARY_CONTENT_ROOT_NAME);
  if (!contentRoot) {
    return emptySnapshot(canvas, {
      detail: `missing explicit content root ${THREE_D_BOUNDARY_CONTENT_ROOT_NAME}`,
      kind: "empty-content-root",
      objectId: THREE_D_BOUNDARY_CONTENT_ROOT_NAME,
      overflowCssPixels: 0
    });
  }

  const issues: ThreeDSceneBoundaryIssue[] = [];
  const issueKeys = new Set<string>();
  const addIssue = (issue: ThreeDSceneBoundaryIssue) => {
    const key = `${issue.kind}|${issue.objectId}|${issue.detail}`;
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push({ ...issue, overflowCssPixels: rounded(issue.overflowCssPixels) });
  };
  const renderables: BoundaryRenderable[] = [];
  contentRoot.traverse((candidate) => {
    const object = candidate as BoundaryRenderable;
    const kind = renderableKind(object);
    if (!kind || !objectIsVisibleToCamera(object, camera)) return;
    const materials = materialList(object);
    if (materials.length > 0 && materials.every((material) => !materialPaints(material))) return;
    renderables.push(object);
  });

  let supportedRenderableCount = 0;
  let unsupportedRenderableCount = 0;
  let aggregateLeft = Number.POSITIVE_INFINITY;
  let aggregateTop = Number.POSITIVE_INFINITY;
  let aggregateRight = Number.NEGATIVE_INFINITY;
  let aggregateBottom = Number.NEGATIVE_INFINITY;
  const devicePixelRatio = canvasBox.width > 0 ? canvas.width / canvasBox.width : 1;
  const viewProjection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

  for (const object of renderables) {
    const id = objectId(object);
    const kind = renderableKind(object);
    if (kind === "unsupported-sprite") {
      unsupportedRenderableCount += 1;
      addIssue({
        detail: "Sprite projection depends on billboard scale and is not covered by the Mesh/Line/Points contract",
        kind: "unsupported-renderable",
        objectId: id,
        overflowCssPixels: 0
      });
      continue;
    }
    const materials = materialList(object).filter(materialPaints);
    if (materials.length === 0) {
      unsupportedRenderableCount += 1;
      addIssue({
        detail: "renderable has no visible material",
        kind: "unsupported-renderable",
        objectId: id,
        overflowCssPixels: 0
      });
      continue;
    }
    const unsupportedMutation = hasUnsupportedVertexMutation(object, materials);
    if (unsupportedMutation) {
      unsupportedRenderableCount += 1;
      addIssue({
        detail: unsupportedMutation,
        kind: "unsupported-renderable",
        objectId: id,
        overflowCssPixels: 0
      });
      continue;
    }
    const localBoundary = localBoundaryPoints(object, materials);
    if (localBoundary.unsupported || localBoundary.points.length === 0) {
      unsupportedRenderableCount += 1;
      addIssue({
        detail: localBoundary.unsupported ?? "renderable produced no boundary points",
        kind: "unsupported-renderable",
        objectId: id,
        overflowCssPixels: 0
      });
      continue;
    }

    const matrices = objectMatrices(object);
    if (matrices.length === 0) continue;
    let objectLeft = Number.POSITIVE_INFINITY;
    let objectTop = Number.POSITIVE_INFINITY;
    let objectRight = Number.NEGATIVE_INFINITY;
    let objectBottom = Number.NEGATIVE_INFINITY;
    let minimumCameraDepth = Number.POSITIVE_INFINITY;
    let validProjectedPointCount = 0;

    for (const matrixWorld of matrices) {
      const modelView = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, matrixWorld);
      const modelViewProjection = new THREE.Matrix4().multiplyMatrices(viewProjection, matrixWorld);
      for (const point of localBoundary.points) {
        const cameraPoint = new THREE.Vector4(point.x, point.y, point.z, 1).applyMatrix4(modelView);
        minimumCameraDepth = Math.min(minimumCameraDepth, -cameraPoint.z);
        const clip = new THREE.Vector4(point.x, point.y, point.z, 1).applyMatrix4(modelViewProjection);
        if (![clip.x, clip.y, clip.z, clip.w].every(finite)) {
          addIssue({
            detail: "model-view-projection produced a non-finite clip coordinate",
            kind: "invalid-projection",
            objectId: id,
            overflowCssPixels: 0
          });
          continue;
        }
        if (clip.w <= CLIP_EPSILON) {
          addIssue({
            detail: `bounding volume reaches behind the camera (clip w=${rounded(clip.w)})`,
            kind: "behind-camera",
            objectId: id,
            overflowCssPixels: 0
          });
          continue;
        }
        if (clip.z < -clip.w - CLIP_EPSILON) {
          addIssue({
            detail: "bounding volume reaches through the camera near plane",
            kind: "near-plane-intersection",
            objectId: id,
            overflowCssPixels: 0
          });
        }
        if (clip.z > clip.w + CLIP_EPSILON) {
          addIssue({
            detail: "bounding volume reaches beyond the camera far plane",
            kind: "depth-outside-camera",
            objectId: id,
            overflowCssPixels: 0
          });
        }
        const ndcX = clip.x / clip.w;
        const ndcY = clip.y / clip.w;
        const x = ((ndcX + 1) / 2) * canvasBox.width;
        const y = ((1 - ndcY) / 2) * canvasBox.height;
        if (![x, y].every(finite)) {
          addIssue({
            detail: "clip-to-CSS conversion produced a non-finite coordinate",
            kind: "invalid-projection",
            objectId: id,
            overflowCssPixels: 0
          });
          continue;
        }
        objectLeft = Math.min(objectLeft, x);
        objectTop = Math.min(objectTop, y);
        objectRight = Math.max(objectRight, x);
        objectBottom = Math.max(objectBottom, y);
        validProjectedPointCount += 1;
      }
    }

    if (validProjectedPointCount === 0) {
      unsupportedRenderableCount += 1;
      addIssue({
        detail: "renderable has no valid projected boundary point",
        kind: "invalid-projection",
        objectId: id,
        overflowCssPixels: 0
      });
      continue;
    }
    const padding = paintPaddingCssPixels(
      object,
      materials,
      minimumCameraDepth,
      canvasBox.height,
      devicePixelRatio
    );
    if (!finite(padding)) {
      unsupportedRenderableCount += 1;
      addIssue({
        detail: object.isLineSegments2
          ? "world-unit LineMaterial thickness cannot be reduced to a stable CSS-pixel padding"
          : "point/line paint padding is not finite",
        kind: "unsupported-renderable",
        objectId: id,
        overflowCssPixels: 0
      });
      continue;
    }
    objectLeft -= padding;
    objectTop -= padding;
    objectRight += padding;
    objectBottom += padding;
    aggregateLeft = Math.min(aggregateLeft, objectLeft);
    aggregateTop = Math.min(aggregateTop, objectTop);
    aggregateRight = Math.max(aggregateRight, objectRight);
    aggregateBottom = Math.max(aggregateBottom, objectBottom);
    supportedRenderableCount += 1;

    const overflow = Math.max(
      0,
      -objectLeft,
      -objectTop,
      objectRight - canvasBox.width,
      objectBottom - canvasBox.height
    );
    if (overflow > CSS_TOLERANCE_PIXELS) {
      addIssue({
        detail: `projected paint bounds ${rounded(objectLeft)},${rounded(objectTop)}..${rounded(objectRight)},${rounded(objectBottom)} exceed ${rounded(canvasBox.width)}x${rounded(canvasBox.height)}`,
        kind: "content-outside-canvas",
        objectId: id,
        overflowCssPixels: overflow
      });
    }
  }

  if (renderables.length === 0) {
    addIssue({
      detail: "explicit content root contains no visible Mesh, Line, or Points renderable",
      kind: "empty-content-root",
      objectId: THREE_D_BOUNDARY_CONTENT_ROOT_NAME,
      overflowCssPixels: 0
    });
  }

  const projectedBoundsCss = supportedRenderableCount > 0
    ? {
        bottom: rounded(aggregateBottom),
        left: rounded(aggregateLeft),
        right: rounded(aggregateRight),
        top: rounded(aggregateTop)
      }
    : null;
  const maxOverflowCssPixels = issues.reduce(
    (maximum, issue) => Math.max(maximum, issue.overflowCssPixels),
    0
  );
  return {
    canvas: {
      backingHeight: canvas.height,
      backingWidth: canvas.width,
      cssHeight: rounded(canvasBox.height),
      cssWidth: rounded(canvasBox.width),
      devicePixelRatio: rounded(devicePixelRatio)
    },
    contentRootFound: true,
    issueCount: issues.length,
    issues,
    maxOverflowCssPixels: rounded(maxOverflowCssPixels),
    projectedBoundsCss,
    renderableCount: renderables.length,
    status: issues.length === 0 ? "pass" : "fail",
    supportedRenderableCount,
    toleranceCssPixels: CSS_TOLERANCE_PIXELS,
    unsupportedRenderableCount,
    version: 1
  };
}

function publishSnapshot(canvas: HTMLCanvasElement, snapshot: ThreeDSceneBoundarySnapshot) {
  canvas.dataset.vizWebglBoundaryProbe = "ready";
  canvas.dataset.vizWebglBoundaryStatus = snapshot.status;
  canvas.dataset.vizWebglBoundaryIssueCount = String(snapshot.issueCount);
  canvas.dataset.vizWebglBoundaryRenderableCount = String(snapshot.renderableCount);
  canvas.dataset.vizWebglBoundarySupportedCount = String(snapshot.supportedRenderableCount);
  canvas.dataset.vizWebglBoundaryUnsupportedCount = String(snapshot.unsupportedRenderableCount);
  canvas.dataset.vizWebglBoundaryMaxOverflow = snapshot.maxOverflowCssPixels.toFixed(3);
  canvas.dataset.vizWebglBoundarySummary = [
    `status=${snapshot.status}`,
    `renderables=${snapshot.renderableCount}`,
    `supported=${snapshot.supportedRenderableCount}`,
    `unsupported=${snapshot.unsupportedRenderableCount}`,
    `issues=${snapshot.issueCount}`,
    `overflow=${snapshot.maxOverflowCssPixels.toFixed(3)}`
  ].join(";");
}

export function ThreeDSceneBoundaryProbe({ stateSignature }: { stateSignature: string }) {
  const { camera, gl, scene } = useThree();
  const capture = useCallback<BoundarySnapshotHook>(() => {
    const snapshot = captureThreeDSceneBoundarySnapshot({ camera, canvas: gl.domElement, scene });
    publishSnapshot(gl.domElement, snapshot);
    return snapshot;
  }, [camera, gl.domElement, scene]);

  useEffect(() => {
    const canvas = gl.domElement as HTMLCanvasElement & { [key: symbol]: BoundarySnapshotHook | undefined };
    const symbol = Symbol.for(THREE_D_BOUNDARY_SNAPSHOT_SYMBOL_KEY);
    canvas[symbol] = capture;
    canvas.dataset.vizWebglBoundaryProbe = "ready";
    const frame = window.requestAnimationFrame(() => capture());
    return () => {
      window.cancelAnimationFrame(frame);
      if (canvas[symbol] === capture) delete canvas[symbol];
    };
  }, [capture, gl.domElement, stateSignature]);

  return null;
}
