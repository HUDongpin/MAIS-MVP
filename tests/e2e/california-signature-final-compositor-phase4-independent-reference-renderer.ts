import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_RENDERER_CLASS_COUNT,
  CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_RENDERER_SCHEMA_VERSION,
  type CaliforniaPhase4IndependentReferenceCandidate,
  type CaliforniaPhase4IndependentReferenceComparison,
  type CaliforniaPhase4IndependentReferenceDiagnosticOnDiskCheckpoints,
  type CaliforniaPhase4IndependentReferenceDiagnosticOnDiskSnapshot,
  type CaliforniaPhase4IndependentReferenceExecutableFile,
  type CaliforniaPhase4IndependentReferenceObservation,
  type CaliforniaPhase4IndependentReferenceRaster,
  type CaliforniaPhase4IndependentReferenceScene,
  type CaliforniaPhase4IndependentReferenceSceneEntry
} from "./california-signature-final-compositor-phase4-independent-reference-renderer-contract";
import {
  CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES,
  CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_TARGET_PLAN_SHA256
} from "./california-signature-final-compositor-phase4-independent-reference-scene-registry";

type Rgba = readonly [number, number, number, number];

const SOURCE_FILE_NAMES = Object.freeze([
  "california-signature-final-compositor-phase4-independent-reference-renderer-contract.ts",
  "california-signature-final-compositor-phase4-independent-reference-renderer.ts",
  "california-signature-final-compositor-phase4-independent-reference-scene-registry.ts"
] as const);
const SOURCE_DIRECTORY = fileURLToPath(new URL(".", import.meta.url));
const AXIS = [91, 107, 123, 255] as const;
const issuedRasterPixels = new WeakMap<CaliforniaPhase4IndependentReferenceRaster, Uint8Array>();

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(value: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function diagnosticFileIdentity(filePath: string, label: string, requireSingleLink: boolean):
CaliforniaPhase4IndependentReferenceExecutableFile {
  const requestedPath = path.resolve(filePath);
  const realPath = realpathSync(requestedPath);
  if (realPath !== requestedPath) {
    throw new Error(`${label}: diagnostic on-disk path traverses a symlink`);
  }
  const before = lstatSync(requestedPath, { bigint: true });
  if (!before.isFile()) {
    throw new Error(`${label}: diagnostic on-disk path is not a regular file`);
  }
  if (requireSingleLink && before.nlink !== BigInt(1)) {
    throw new Error(`${label}: diagnostic on-disk source has multiple hard links`);
  }
  const bytes = readFileSync(requestedPath);
  const after = lstatSync(requestedPath, { bigint: true });
  const identity = (stat: typeof before) => ({
    byteCount: Number(stat.size),
    ctimeNs: String(stat.ctimeNs),
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: Number(stat.mode & BigInt(0o777)),
    mtimeNs: String(stat.mtimeNs),
    nlink: Number(stat.nlink),
    path: requestedPath,
    realPath
  });
  const beforeIdentity = identity(before);
  const afterIdentity = identity(after);
  if (stableJson(beforeIdentity) !== stableJson(afterIdentity) ||
      bytes.length !== beforeIdentity.byteCount) {
    throw new Error(`${label}: diagnostic on-disk file changed while read`);
  }
  return Object.freeze({ ...beforeIdentity, fileSha256: sha256(bytes) });
}

function captureDiagnosticOnDiskSnapshot():
CaliforniaPhase4IndependentReferenceDiagnosticOnDiskSnapshot {
  const sourceFiles = Object.freeze(SOURCE_FILE_NAMES.map((fileName) => Object.freeze({
    ...diagnosticFileIdentity(path.join(SOURCE_DIRECTORY, fileName),
      `${fileName}: California Phase4 independent renderer source`, true),
    fileName
  })));
  const nodeExecutable = diagnosticFileIdentity(realpathSync(process.execPath),
    "California Phase4 independent renderer Node executable", false);
  const snapshotBase = { nodeExecutable, sourceFiles };
  return Object.freeze({
    ...snapshotBase,
    snapshotSha256: sha256(stableJson(snapshotBase))
  });
}

const MODULE_LOAD_DIAGNOSTIC_ON_DISK_SNAPSHOT = captureDiagnosticOnDiskSnapshot();

function beginDiagnosticOnDiskOperation():
CaliforniaPhase4IndependentReferenceDiagnosticOnDiskSnapshot {
  const before = captureDiagnosticOnDiskSnapshot();
  if (before.snapshotSha256 !== MODULE_LOAD_DIAGNOSTIC_ON_DISK_SNAPSHOT.snapshotSha256) {
    throw new Error(
      "California Phase4 diagnostic on-disk source or Node path identity drifted since module load"
    );
  }
  return before;
}

function completeDiagnosticOnDiskOperation(
  before: CaliforniaPhase4IndependentReferenceDiagnosticOnDiskSnapshot
): CaliforniaPhase4IndependentReferenceDiagnosticOnDiskCheckpoints {
  const after = captureDiagnosticOnDiskSnapshot();
  if (before.snapshotSha256 !== MODULE_LOAD_DIAGNOSTIC_ON_DISK_SNAPSHOT.snapshotSha256 ||
      after.snapshotSha256 !== before.snapshotSha256) {
    throw new Error(
      "California Phase4 diagnostic on-disk source or Node path identity drifted during operation"
    );
  }
  const base = {
    afterOperationSnapshotSha256: after.snapshotSha256,
    beforeOperationSnapshotSha256: before.snapshotSha256,
    moduleLoadSnapshot: MODULE_LOAD_DIAGNOSTIC_ON_DISK_SNAPSHOT,
    scope: "diagnostic-on-disk-path-snapshots-not-loaded-code-or-process-image-proof" as const,
    unchanged: true as const
  };
  return Object.freeze({ ...base, checkpointSha256: sha256(stableJson(base)) });
}

function setPixel(pixels: Uint8Array, width: number, height: number,
x: number, y: number, rgba: Rgba): void {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const offset = (y * width + x) * 4;
  pixels[offset] = rgba[0];
  pixels[offset + 1] = rgba[1];
  pixels[offset + 2] = rgba[2];
  pixels[offset + 3] = rgba[3];
}

function stampDisk(pixels: Uint8Array, width: number, height: number,
x: number, y: number, radius: number, rgba: Rgba): void {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(pixels, width, height, x + dx, y + dy, rgba);
      }
    }
  }
}

function drawLine(options: {
  dashOff?: number;
  dashOn?: number;
  from: readonly [number, number];
  height: number;
  pixels: Uint8Array;
  radius: number;
  rgba: Rgba;
  to: readonly [number, number];
  width: number;
}): void {
  let [x, y] = options.from;
  const [targetX, targetY] = options.to;
  const dx = Math.abs(targetX - x);
  const sx = x < targetX ? 1 : -1;
  const dy = -Math.abs(targetY - y);
  const sy = y < targetY ? 1 : -1;
  let error = dx + dy;
  let ordinal = 0;
  const period = (options.dashOn ?? 1) + (options.dashOff ?? 0);
  while (true) {
    if ((options.dashOff ?? 0) === 0 || ordinal % period < (options.dashOn ?? 1)) {
      stampDisk(options.pixels, options.width, options.height,
        x, y, options.radius, options.rgba);
    }
    if (x === targetX && y === targetY) break;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
    ordinal += 1;
  }
}

function opaquePixels(width: number, height: number, rgba: Rgba): Uint8Array {
  const pixels = new Uint8Array(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = rgba[0];
    pixels[offset + 1] = rgba[1];
    pixels[offset + 2] = rgba[2];
    pixels[offset + 3] = rgba[3];
  }
  return pixels;
}

function drawNormalizedGrid(pixels: Uint8Array, width: number, height: number,
rgba: Rgba, divisions: number): void {
  for (let index = 0; index <= divisions; index += 1) {
    const x = Math.round(index * (width - 1) / divisions);
    const y = Math.round(index * (height - 1) / divisions);
    drawLine({ from: [x, 0], height, pixels, radius: 0, rgba,
      to: [x, height - 1], width });
    drawLine({ from: [0, y], height, pixels, radius: 0, rgba,
      to: [width - 1, y], width });
  }
}

function renderAbsoluteValue(scene: Extract<CaliforniaPhase4IndependentReferenceScene,
{ kind: "absolute-value-fold" }>, width: number, height: number): Uint8Array {
  const pixels = opaquePixels(width, height, scene.backgroundRgba);
  drawNormalizedGrid(pixels, width, height, scene.gridRgba, 16);
  const centerX = Math.round((width - 1) / 2);
  const centerY = Math.round((height - 1) / 2);
  const axisRadius = Math.max(1, Math.round(Math.min(width, height) / 1_100));
  drawLine({ from: [0, centerY], height, pixels, radius: axisRadius, rgba: AXIS,
    to: [width - 1, centerY], width });
  drawLine({ from: [centerX, 0], height, pixels, radius: axisRadius, rgba: AXIS,
    to: [centerX, height - 1], width });
  const curveRadius = Math.max(2, Math.round(Math.min(width, height) / 440));
  drawLine({ from: [0, 0], height, pixels, radius: curveRadius, rgba: scene.curveRgba,
    to: [centerX, centerY], width });
  drawLine({ from: [centerX, centerY], height, pixels, radius: curveRadius,
    rgba: scene.curveRgba, to: [width - 1, 0], width });
  const dash = Math.max(4, Math.round(Math.min(width, height) / 100));
  drawLine({ dashOff: dash, dashOn: dash, from: [0, height - 1], height, pixels,
    radius: Math.max(1, curveRadius - 1), rgba: scene.insideLineRgba,
    to: [width - 1, 0], width });
  stampDisk(pixels, width, height, centerX, centerY, curveRadius + 2, scene.curveRgba);
  return pixels;
}

function renderSquare(scene: Extract<CaliforniaPhase4IndependentReferenceScene,
{ kind: "square-defining-attributes" }>, width: number, height: number): Uint8Array {
  const pixels = opaquePixels(width, height, scene.backgroundRgba);
  drawNormalizedGrid(pixels, width, height, scene.gridRgba, 20);
  const centerX = Math.round((width - 1) / 2);
  const centerY = Math.round((height - 1) / 2);
  const scaleNumerator = Math.min(width, height);
  const half = Math.round(scaleNumerator * scene.halfExtentWorldMilli /
    (2 * scene.worldRadiusMilli));
  const points = [
    [centerX - half, centerY - half],
    [centerX + half, centerY - half],
    [centerX + half, centerY + half],
    [centerX - half, centerY + half]
  ] as const;
  const outlineRadius = Math.max(2, Math.round(Math.min(width, height) / 440));
  for (let index = 0; index < points.length; index += 1) {
    drawLine({ from: points[index]!, height, pixels, radius: outlineRadius,
      rgba: scene.outlineRgba, to: points[(index + 1) % points.length]!, width });
  }
  const badgeRadius = outlineRadius + 2;
  for (const [x, y] of points) {
    stampDisk(pixels, width, height, x, y, badgeRadius, scene.badgeRgba);
  }
  const tickHalf = Math.max(4, Math.round(Math.min(width, height) / 90));
  drawLine({ from: [centerX, centerY - half - tickHalf], height, pixels, radius: 1,
    rgba: scene.badgeRgba, to: [centerX, centerY - half + tickHalf], width });
  drawLine({ from: [centerX + half - tickHalf, centerY], height, pixels, radius: 1,
    rgba: scene.badgeRgba, to: [centerX + half + tickHalf, centerY], width });
  drawLine({ from: [centerX, centerY + half - tickHalf], height, pixels, radius: 1,
    rgba: scene.badgeRgba, to: [centerX, centerY + half + tickHalf], width });
  drawLine({ from: [centerX - half - tickHalf, centerY], height, pixels, radius: 1,
    rgba: scene.badgeRgba, to: [centerX - half + tickHalf, centerY], width });
  return pixels;
}

function renderEntry(entry: CaliforniaPhase4IndependentReferenceSceneEntry):
CaliforniaPhase4IndependentReferenceRaster {
  const { height, width } = entry.target.backingSize;
  const pixels = entry.scene.kind === "absolute-value-fold"
    ? renderAbsoluteValue(entry.scene, width, height)
    : renderSquare(entry.scene, width, height);
  const raster = Object.freeze({
    backingHeight: height,
    backingWidth: width,
    bindingKey: entry.target.bindingKey,
    classId: entry.target.classId,
    pixelByteCount: pixels.length,
    projectName: entry.target.projectName,
    readPixels(): Uint8Array {
      return Uint8Array.from(authenticateIssuedRasterBytes(raster));
    },
    rgbaSha256: sha256(pixels),
    sceneId: entry.scene.sceneId,
    sceneSha256: sha256(stableJson(entry.scene)),
    targetSha256: entry.target.targetSha256
  });
  issuedRasterPixels.set(raster, pixels);
  return raster;
}

function authenticateIssuedRasterBytes(
  raster: CaliforniaPhase4IndependentReferenceRaster
): Uint8Array {
  const pixels = issuedRasterPixels.get(raster);
  if (!pixels) {
    throw new Error(`${raster.classId}: independent raster bytes lack module-private provenance`);
  }
  if (pixels.length !== raster.pixelByteCount ||
      pixels.length !== raster.backingWidth * raster.backingHeight * 4) {
    throw new Error(`${raster.classId}: module-private independent raster byte count drifted`);
  }
  if (sha256(pixels) !== raster.rgbaSha256) {
    throw new Error(`${raster.classId}: module-private independent raster hash drifted`);
  }
  return pixels;
}

function validateRegistry(): void {
  if (CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES.length !==
    CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_RENDERER_CLASS_COUNT) {
    throw new Error("California Phase4 independent reference registry lost an exact target class");
  }
  const targets = CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES.map((entry) => entry.target);
  if (sha256(stableJson(targets)) !==
    CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_TARGET_PLAN_SHA256) {
    throw new Error("California Phase4 independent reference target plan identity drifted");
  }
  for (const entry of CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES) {
    const { targetSha256, ...base } = entry.target;
    if (sha256(stableJson(base)) !== targetSha256) {
      throw new Error(`${entry.target.classId}: independent reference target identity drifted`);
    }
  }
}

export async function renderCaliforniaPhase4IndependentReferenceCandidate():
Promise<CaliforniaPhase4IndependentReferenceCandidate> {
  if (arguments.length !== 0) {
    throw new Error(
      "California Phase4 independent reference renderer takes no caller-authored scene or target"
    );
  }
  const before = beginDiagnosticOnDiskOperation();
  try {
    validateRegistry();
    const rasters = Object.freeze(
      CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES.map(renderEntry));
    const diagnosticOnDiskIdentity = completeDiagnosticOnDiskOperation(before);
    const producer = Object.freeze({
      browserScreenshotReadback: false as const,
      diagnosticOnDiskIdentity,
      importsTestedComponent: false as const,
      renderer: "independent-pure-node-software-renderer" as const,
      samePageCanvasReadback: false as const
    });
    const base = {
      formalExecutionAuthorized: false as const,
      humanReviewReceiptAvailable: false as const,
      independentExpectedRasterAvailable: false as const,
      producer,
      rasters,
      sceneRegistrySha256: sha256(stableJson(CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES)),
      schemaVersion: CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_RENDERER_SCHEMA_VERSION as 1,
      status: "diagnostic-independent-reference-raster-candidate-v1" as const,
      targetPlanSha256: CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_TARGET_PLAN_SHA256
    };
    const candidateIdentity = {
      ...base,
      rasters: rasters.map(({ readPixels: _readPixels, ...identity }) => identity)
    };
    return Object.freeze({
      ...base,
      candidateSha256: sha256(stableJson(candidateIdentity))
    });
  } catch (error) {
    completeDiagnosticOnDiskOperation(before);
    throw error;
  }
}

export async function compareCaliforniaPhase4IndependentReferenceObservation(
  observation: CaliforniaPhase4IndependentReferenceObservation
): Promise<CaliforniaPhase4IndependentReferenceComparison> {
  const before = beginDiagnosticOnDiskOperation();
  try {
    validateRegistry();
    const entry = CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_SCENES.find((candidate) =>
      candidate.target.classId === observation.classId);
    if (!entry) throw new Error("California Phase4 independent comparison class is not reviewed");
    if (observation.targetSha256 !== entry.target.targetSha256) {
      throw new Error(`${entry.target.classId}: independent comparison target identity drifted`);
    }
    if (observation.backingWidth !== entry.target.backingSize.width ||
        observation.backingHeight !== entry.target.backingSize.height) {
      throw new Error(`${entry.target.classId}: independent comparison dimensions drifted`);
    }
    if (!(observation.pixels instanceof Uint8Array) ||
        observation.pixels.length !== observation.backingWidth * observation.backingHeight * 4) {
      throw new Error(`${entry.target.classId}: independent comparison RGBA byte count drifted`);
    }
    const expected = renderEntry(entry);
    const expectedPixels = authenticateIssuedRasterBytes(expected);
    let mismatchPixelCount = 0;
    let firstMismatchPixelIndex: number | null = null;
    for (let offset = 0; offset < expectedPixels.length; offset += 4) {
      if (expectedPixels[offset] !== observation.pixels[offset] ||
          expectedPixels[offset + 1] !== observation.pixels[offset + 1] ||
          expectedPixels[offset + 2] !== observation.pixels[offset + 2] ||
          expectedPixels[offset + 3] !== observation.pixels[offset + 3]) {
        firstMismatchPixelIndex ??= offset / 4;
        mismatchPixelCount += 1;
      }
    }
    const base = {
      currentPixelsSha256: sha256(observation.pixels),
      diagnosticOnDiskCheckpointSha256:
        completeDiagnosticOnDiskOperation(before).checkpointSha256,
      expectedPixelsSha256: expected.rgbaSha256,
      firstMismatchPixelIndex,
      formalExecutionAuthorized: false as const,
      independentExpectedRasterAvailable: false as const,
      matches: mismatchPixelCount === 0,
      mismatchPixelCount,
      targetSha256: entry.target.targetSha256
    };
    return Object.freeze({ ...base, comparisonSha256: sha256(stableJson(base)) });
  } catch (error) {
    completeDiagnosticOnDiskOperation(before);
    throw error;
  }
}
