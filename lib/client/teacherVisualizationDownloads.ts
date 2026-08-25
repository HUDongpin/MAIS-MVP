import type {
  MathScenePackageV3,
  MathScenePackageV3Locale
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import {
  buildMathScenePackageV3WebVtt,
  MathScenePackageV3WebVttError
} from "@/components/visualizations/three/manim/mathScenePackageV3WebVtt";

type ObjectUrlApi = Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;

function safeFileStem(title: string) {
  const stem = title
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return stem || "mais-manim-scene";
}

export function buildTeacherVisualizationScenePackageArtifact(title: string, packageJson: MathScenePackageV3) {
  const stem = safeFileStem(title);
  return {
    blob: new Blob([`${JSON.stringify(packageJson, null, 2)}\n`], { type: "application/json;charset=utf-8" }),
    fileName: `${stem}.scene-package.json`
  };
}

export function buildTeacherVisualizationDownloadArtifacts(title: string, packageJson: MathScenePackageV3) {
  const stem = safeFileStem(title);
  const locales = ["en", "zh", "zhHans"] as const satisfies readonly MathScenePackageV3Locale[];
  return {
    captions: locales.map((locale) => ({
      blob: new Blob([buildMathScenePackageV3WebVtt(packageJson.captions, locale)], { type: "text/vtt;charset=utf-8" }),
      fileName: `${stem}.${locale}.vtt`,
      locale
    })),
    scenePackage: buildTeacherVisualizationScenePackageArtifact(title, packageJson)
  };
}

export function tryBuildTeacherVisualizationDownloadArtifacts(title: string, packageJson: MathScenePackageV3) {
  try {
    return {
      ok: true as const,
      value: buildTeacherVisualizationDownloadArtifacts(title, packageJson)
    };
  } catch (error) {
    return {
      errorCode: error instanceof MathScenePackageV3WebVttError
        ? error.code
        : "CAPTION_EXPORT_FAILED",
      message: error instanceof Error ? error.message : "Caption export is unavailable.",
      ok: false as const
    };
  }
}

export function createTeacherVisualizationObjectUrlLease(blob: Blob, urlApi: ObjectUrlApi = URL) {
  const url = urlApi.createObjectURL(blob);
  let revoked = false;
  return {
    revoke() {
      if (revoked) return;
      revoked = true;
      urlApi.revokeObjectURL(url);
    },
    url
  };
}

export function downloadTeacherVisualizationBlob(fileName: string, blob: Blob) {
  const lease = createTeacherVisualizationObjectUrlLease(blob);
  const anchor = document.createElement("a");
  anchor.href = lease.url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.click();
  window.setTimeout(() => lease.revoke(), 0);
  return lease;
}

export function teacherVisualizationCaptureCapability() {
  return {
    code: "A10_A22_CAPTURE_HARNESS_REQUIRED" as const,
    mp4Command: null,
    requirements: [
      "The existing MP4 CLI scaffold remains unusable from this workbench until its internal capture route and harness are integrated and verified.",
      "WebM requires a connected browser capture executor with explicit success evidence."
    ],
    webmCommand: null
  };
}

export function teacherVisualizationLocalMp4Command(_scenePackageFileName: string): null {
  return teacherVisualizationCaptureCapability().mp4Command;
}
