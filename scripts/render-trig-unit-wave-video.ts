import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { renderTrigUnitWaveSvgFrame } from "../components/visualizations/three/manim/mathTrigUnitWaveVideoFrame";

const DEFAULT_DURATION_SECONDS = 11.8;
const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1920;

function positiveNumber(rawValue: string | undefined, fallback: number, label: string) {
  if (!rawValue?.trim()) return fallback;
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive number.`);
  return value;
}

function positiveInteger(rawValue: string | undefined, fallback: number, label: string) {
  return Math.round(positiveNumber(rawValue, fallback, label));
}

async function rasterizeSvgFrame({
  executable,
  framePath,
  height,
  svg,
  width
}: {
  executable: string;
  framePath: string;
  height: number;
  svg: string;
  width: number;
}) {
  const renderer = spawn(executable, [
    "--format", "png",
    "--width", String(width),
    "--height", String(height),
    "--output", framePath,
    "-"
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let rendererError = "";
  renderer.stderr.setEncoding("utf8");
  renderer.stderr.on("data", (chunk: string) => {
    rendererError += chunk;
  });
  renderer.stdin.end(svg);
  const [exitCode] = await once(renderer, "close") as [number | null, NodeJS.Signals | null];
  if (exitCode !== 0) {
    throw new Error(`SVG rasterizer failed with exit code ${String(exitCode)}: ${rendererError.trim()}`);
  }
}

async function renderVideo() {
  const outputPath = path.resolve(
    process.argv[2] ?? "artifacts/mais-manim-trig-unit-wave-production.mp4"
  );
  const width = positiveInteger(process.env.MAIS_TRIG_VIDEO_WIDTH, DEFAULT_WIDTH, "MAIS_TRIG_VIDEO_WIDTH");
  const height = Math.round(width * 9 / 16);
  const fps = positiveInteger(process.env.MAIS_TRIG_VIDEO_FPS, DEFAULT_FPS, "MAIS_TRIG_VIDEO_FPS");
  const durationSeconds = positiveNumber(
    process.env.MAIS_TRIG_VIDEO_DURATION,
    DEFAULT_DURATION_SECONDS,
    "MAIS_TRIG_VIDEO_DURATION"
  );
  const frameCount = Math.max(1, Math.round(durationSeconds * fps));
  const ffmpegExecutable = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
  const svgRasterizerExecutable = process.env.RSVG_CONVERT_PATH?.trim() || "rsvg-convert";

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  const tempParent = path.resolve(".tmp", "mais-trig-unit-wave-video");
  await fs.promises.mkdir(tempParent, { recursive: true });
  const frameDirectory = await fs.promises.mkdtemp(path.join(tempParent, "frames-"));

  try {
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const elapsedSeconds = frameIndex / fps;
      const svg = renderTrigUnitWaveSvgFrame({ elapsedSeconds, totalDurationSeconds: durationSeconds });
      const framePath = path.join(frameDirectory, `frame-${String(frameIndex).padStart(6, "0")}.png`);
      await rasterizeSvgFrame({
        executable: svgRasterizerExecutable,
        framePath,
        height,
        svg,
        width
      });

      if ((frameIndex + 1) % fps === 0 || frameIndex === frameCount - 1) {
        process.stdout.write(
          `Rendered ${frameIndex + 1}/${frameCount} frames (${((frameIndex + 1) / fps).toFixed(1)}s)\n`
        );
      }
    }

    const ffmpeg = spawn(ffmpegExecutable, [
      "-hide_banner",
      "-loglevel", "error",
      "-framerate", String(fps),
      "-i", path.join(frameDirectory, "frame-%06d.png"),
      "-an",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-r", String(fps),
      "-y",
      outputPath
    ], { stdio: ["ignore", "ignore", "pipe"] });
    let ffmpegError = "";
    ffmpeg.stderr.setEncoding("utf8");
    ffmpeg.stderr.on("data", (chunk: string) => {
      ffmpegError += chunk;
    });
    const [exitCode] = await once(ffmpeg, "close") as [number | null, NodeJS.Signals | null];
    if (exitCode !== 0) {
      throw new Error(`ffmpeg failed with exit code ${String(exitCode)}: ${ffmpegError.trim()}`);
    }

    const stat = await fs.promises.stat(outputPath);
    if (stat.size <= 10_000) throw new Error(`Rendered video is unexpectedly small: ${stat.size} bytes.`);
    process.stdout.write(`Created ${outputPath} (${stat.size} bytes, ${width}x${height}@${fps}fps)\n`);
  } finally {
    await fs.promises.rm(frameDirectory, { recursive: true, force: true });
  }
}

void renderVideo().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
