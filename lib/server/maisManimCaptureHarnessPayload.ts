import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import {
  MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES,
  parseMathScenePackageV3Json,
  type MathSceneExportProfileV3,
  type MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";

type CaptureHarnessPayloadInput = {
  packagePath: string;
  profileId: string;
  repoRoot: string;
  runRoot: string;
};

export type MaisManimCaptureHarnessPayload = {
  packageJson: MathScenePackageV3;
  profile: MathSceneExportProfileV3 & { format: "mp4"; mimeType: "video/mp4" };
};

function isProperDescendant(candidate: string, parent: string) {
  const relative = path.relative(parent, candidate);
  return relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

async function physicalPath(value: string, errorCode: string) {
  try {
    return await realpath(value);
  } catch {
    throw new Error(errorCode);
  }
}

/**
 * Defense-in-depth loader for the token-gated local capture page. The CLI
 * copies its validated input into a run-owned directory; the server refuses
 * any path or symlink that escapes that directory and validates the bytes a
 * second time before passing data to a client renderer.
 */
export async function loadMaisManimCaptureHarnessPayload({
  packagePath,
  profileId,
  repoRoot,
  runRoot
}: CaptureHarnessPayloadInput): Promise<MaisManimCaptureHarnessPayload> {
  const physicalRepoRoot = await physicalPath(repoRoot, "CAPTURE_REPO_ROOT_INVALID");
  const configuredCaptureRoot = path.join(
    physicalRepoRoot,
    ".tmp",
    "mais-manim-v3-capture"
  );
  const physicalCaptureRoot = await physicalPath(
    configuredCaptureRoot,
    "CAPTURE_RUN_ROOT_OUTSIDE_REPO_TMP"
  );
  const physicalRunRoot = await physicalPath(runRoot, "CAPTURE_RUN_ROOT_OUTSIDE_REPO_TMP");
  if (!isProperDescendant(physicalRunRoot, physicalCaptureRoot)) {
    throw new Error("CAPTURE_RUN_ROOT_OUTSIDE_REPO_TMP");
  }
  const physicalPackagePath = await physicalPath(packagePath, "CAPTURE_PACKAGE_OUTSIDE_RUN_ROOT");
  if (!isProperDescendant(physicalPackagePath, physicalRunRoot)) {
    throw new Error("CAPTURE_PACKAGE_OUTSIDE_RUN_ROOT");
  }

  const packageStat = await stat(physicalPackagePath);
  if (!packageStat.isFile()) throw new Error("CAPTURE_PACKAGE_NOT_A_FILE");
  if (packageStat.size > MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES) {
    throw new Error("CAPTURE_PACKAGE_TOO_LARGE");
  }
  const bytes = await readFile(physicalPackagePath);
  if (bytes.byteLength > MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES) {
    throw new Error("CAPTURE_PACKAGE_TOO_LARGE");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("CAPTURE_PACKAGE_INVALID_UTF8");
  }
  const parsed = parseMathScenePackageV3Json(text);
  if (!parsed.ok) throw new Error("CAPTURE_PACKAGE_INVALID");
  const profile = parsed.value.exportProfiles.find(
    (candidate): candidate is MathSceneExportProfileV3 & { format: "mp4"; mimeType: "video/mp4" } =>
      candidate.id === profileId
      && candidate.format === "mp4"
      && candidate.mimeType === "video/mp4"
  );
  if (!profile) throw new Error("CAPTURE_MP4_PROFILE_NOT_FOUND");
  return {
    packageJson: parsed.value,
    profile: structuredClone(profile)
  };
}
