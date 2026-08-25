export type Mp4MediaEvidence = {
  audioCodec: "aac" | null;
  audioIncluded: boolean;
  durationSeconds: number;
  formatName: string;
  frameCount: number;
  height: number;
  pixelFormat: "yuv420p";
  videoCodec: "h264";
  width: number;
};

export const MAIS_MANIM_MP4_MAX_DURATION_SECONDS: number;
export const MAIS_MANIM_MP4_MAX_FPS: number;
export const MAIS_MANIM_MP4_MAX_DIMENSION: number;
export const MAIS_MANIM_MP4_MAX_FRAME_COUNT: number;
export const MAIS_MANIM_MP4_MAX_PIXEL_WORK: number;
export const MAIS_MANIM_MP4_ESTIMATED_PNG_BYTES_PER_PIXEL: number;
export const MAIS_MANIM_MP4_MAX_ESTIMATED_FRAME_DISK_BYTES: number;

export function buildExactFrameTimes(input: { frameCount: number; fps: number }): number[];
export function preflightMp4RenderWork(input: {
  frameCount: number;
  height: number;
  width: number;
}): {
  estimatedFrameDiskBytes: number;
  ok: true;
  pixelWork: number;
};
export function buildFfmpegMp4Args(input: {
  audioPath: string | null;
  fps: number;
  framePattern: string;
  outputPath: string;
}): string[];
export function buildFfprobeArgs(outputPath: string): string[];
export function buildMp4CaptureRunLayout(repoRoot: string, runId: string): {
  framesDir: string;
  nextDistDir: string;
  runRoot: string;
};
export function captureHarnessUrl(input: { hostname: string; port: number }): string;
export function parseFfprobeMp4Evidence(probeJson: string, expectedTask: {
  audioPath: string | null;
  durationSeconds: number;
  fps: number;
  frameCount: number;
  height: number;
  outputBaseName: string;
  width: number;
}): Mp4MediaEvidence;
export function validateCompletePngFrameSet(
  fileNames: readonly string[],
  frameCount: number
):
  | { expectedFrameCount: number; ok: true }
  | {
      errorCode: "MP4_FRAME_SET_INCOMPLETE";
      missingFrameNames?: string[];
      ok: false;
      unexpectedFrameNames?: string[];
    };
