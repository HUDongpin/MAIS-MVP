import path from "node:path";

export const MAIS_MANIM_MP4_MAX_DURATION_SECONDS = 60 * 60;
export const MAIS_MANIM_MP4_MAX_FPS = 120;
export const MAIS_MANIM_MP4_MAX_DIMENSION = 7680;
export const MAIS_MANIM_MP4_MAX_FRAME_COUNT = 1_000_000;
export const MAIS_MANIM_MP4_MAX_PIXEL_WORK = 50_000_000_000;
export const MAIS_MANIM_MP4_ESTIMATED_PNG_BYTES_PER_PIXEL = 4;
export const MAIS_MANIM_MP4_MAX_ESTIMATED_FRAME_DISK_BYTES = 64 * 1024 * 1024 * 1024;

const safeBaseNamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const safeRunIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;
const frameNamePattern = /^frame-(\d{6})\.png$/;

function fail(message) {
  throw new TypeError(message);
}

function isPlainRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function boundedInteger(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

function localPathOrNull(value, label) {
  if (value === null) return null;
  if (typeof value !== "string" || !value || value.includes("\0")) {
    fail(`${label} must be a non-empty local file path or null.`);
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) {
    fail(`${label} must be a local file path, not a URL or URI.`);
  }
  if (!path.isAbsolute(value)) fail(`${label} must be an absolute local file path.`);
  return path.normalize(value);
}

export function preflightMp4RenderWork({ frameCount, height, width }) {
  boundedInteger(width, "width", 16, MAIS_MANIM_MP4_MAX_DIMENSION);
  boundedInteger(height, "height", 16, MAIS_MANIM_MP4_MAX_DIMENSION);
  boundedInteger(frameCount, "frameCount", 1, MAIS_MANIM_MP4_MAX_FRAME_COUNT);
  const pixelWorkBigInt = BigInt(width) * BigInt(height) * BigInt(frameCount);
  if (pixelWorkBigInt > BigInt(MAIS_MANIM_MP4_MAX_PIXEL_WORK)) {
    throw new Error("MP4_PIXEL_WORK_LIMIT_EXCEEDED");
  }
  const estimatedFrameDiskBytesBigInt = pixelWorkBigInt * BigInt(MAIS_MANIM_MP4_ESTIMATED_PNG_BYTES_PER_PIXEL);
  if (estimatedFrameDiskBytesBigInt > BigInt(MAIS_MANIM_MP4_MAX_ESTIMATED_FRAME_DISK_BYTES)) {
    throw new Error("MP4_FRAME_DISK_ESTIMATE_LIMIT_EXCEEDED");
  }
  return {
    estimatedFrameDiskBytes: Number(estimatedFrameDiskBytesBigInt),
    ok: true,
    pixelWork: Number(pixelWorkBigInt)
  };
}

export function normalizeMp4RenderTask(value) {
  if (!isPlainRecord(value)) fail("MP4 render task must be a plain object.");
  const width = boundedInteger(value.width, "width", 16, MAIS_MANIM_MP4_MAX_DIMENSION);
  const height = boundedInteger(value.height, "height", 16, MAIS_MANIM_MP4_MAX_DIMENSION);
  if (width % 2 !== 0 || height % 2 !== 0) {
    fail("width and height must be even for yuv420p output.");
  }
  const fps = boundedInteger(value.fps, "fps", 1, MAIS_MANIM_MP4_MAX_FPS);
  if (
    typeof value.durationSeconds !== "number"
    || !Number.isFinite(value.durationSeconds)
    || value.durationSeconds <= 0
    || value.durationSeconds > MAIS_MANIM_MP4_MAX_DURATION_SECONDS
  ) {
    fail(`durationSeconds must be greater than 0 and at most ${MAIS_MANIM_MP4_MAX_DURATION_SECONDS}.`);
  }
  const expectedFrameCount = value.durationSeconds * fps;
  if (!Number.isSafeInteger(expectedFrameCount)) {
    fail("durationSeconds * fps must be an exact integer frame count.");
  }
  const frameCount = boundedInteger(value.frameCount, "frameCount", 1, MAIS_MANIM_MP4_MAX_FRAME_COUNT);
  if (frameCount !== expectedFrameCount) {
    fail("frameCount must equal durationSeconds * fps exactly.");
  }
  preflightMp4RenderWork({ frameCount, height, width });
  if (typeof value.outputBaseName !== "string" || !safeBaseNamePattern.test(value.outputBaseName)) {
    fail("outputBaseName must be a safe file base name without path separators.");
  }
  return {
    audioPath: localPathOrNull(value.audioPath, "audioPath"),
    durationSeconds: value.durationSeconds,
    fps,
    frameCount,
    height,
    outputBaseName: value.outputBaseName,
    width
  };
}

export function buildExactFrameTimes({ frameCount, fps }) {
  boundedInteger(frameCount, "frameCount", 1, MAIS_MANIM_MP4_MAX_FRAME_COUNT);
  boundedInteger(fps, "fps", 1, MAIS_MANIM_MP4_MAX_FPS);
  return Array.from({ length: frameCount }, (_, frameIndex) => frameIndex / fps);
}

export function expectedPngFrameName(frameIndex) {
  boundedInteger(frameIndex, "frameIndex", 0, 999_999);
  return `frame-${String(frameIndex).padStart(6, "0")}.png`;
}

export function validateCompletePngFrameSet(fileNames, frameCount) {
  if (!Array.isArray(fileNames) || fileNames.some((fileName) => typeof fileName !== "string")) {
    fail("fileNames must be an array of strings.");
  }
  boundedInteger(frameCount, "frameCount", 1, MAIS_MANIM_MP4_MAX_FRAME_COUNT);
  const present = new Set(fileNames.filter((fileName) => frameNamePattern.test(fileName)));
  const expected = new Set(Array.from({ length: frameCount }, (_, index) => expectedPngFrameName(index)));
  const missingFrameNames = [...expected].filter((fileName) => !present.has(fileName));
  const unexpectedFrameNames = [...present].filter((fileName) => !expected.has(fileName)).sort();
  if (missingFrameNames.length > 0 || unexpectedFrameNames.length > 0) {
    return {
      ok: false,
      errorCode: "MP4_FRAME_SET_INCOMPLETE",
      ...(missingFrameNames.length > 0 ? { missingFrameNames } : {}),
      ...(unexpectedFrameNames.length > 0 ? { unexpectedFrameNames } : {})
    };
  }
  return { ok: true, expectedFrameCount: frameCount };
}

function requiredLocalPath(value, label) {
  const normalized = localPathOrNull(value, label);
  if (normalized === null) fail(`${label} is required.`);
  return normalized;
}

export function buildFfmpegMp4Args({ audioPath, fps, framePattern, outputPath }) {
  boundedInteger(fps, "fps", 1, MAIS_MANIM_MP4_MAX_FPS);
  const normalizedFramePattern = requiredLocalPath(framePattern, "framePattern");
  const normalizedOutputPath = requiredLocalPath(outputPath, "outputPath");
  const normalizedAudioPath = localPathOrNull(audioPath, "audioPath");
  const args = [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    "-framerate", String(fps), "-start_number", "0",
    "-i", normalizedFramePattern
  ];
  if (normalizedAudioPath) args.push("-i", normalizedAudioPath);
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart");
  if (normalizedAudioPath) {
    args.push("-c:a", "aac", "-b:a", "192k", "-af", "apad", "-shortest");
  } else {
    args.push("-an");
  }
  args.push(normalizedOutputPath);
  return args;
}

export function buildFfprobeArgs(outputPath) {
  return [
    "-v", "error", "-show_streams", "-show_format", "-count_frames", "-of", "json",
    requiredLocalPath(outputPath, "outputPath")
  ];
}

function parseFiniteNumber(value, errorCode) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(errorCode);
  return parsed;
}

export function parseFfprobeMp4Evidence(probeJson, expectedTask) {
  const expected = normalizeMp4RenderTask(expectedTask);
  let probe;
  try {
    probe = JSON.parse(probeJson);
  } catch {
    throw new Error("MP4_PROBE_INVALID_JSON");
  }
  if (!isPlainRecord(probe) || !isPlainRecord(probe.format) || !Array.isArray(probe.streams)) {
    throw new Error("MP4_PROBE_INVALID_SHAPE");
  }
  const video = probe.streams.find((stream) => isPlainRecord(stream) && stream.codec_type === "video");
  const audio = probe.streams.find((stream) => isPlainRecord(stream) && stream.codec_type === "audio");
  if (!video || video.codec_name !== "h264") throw new Error("MP4_PROBE_VIDEO_CODEC_MISMATCH");
  if (video.pix_fmt !== "yuv420p") throw new Error("MP4_PROBE_PIXEL_FORMAT_MISMATCH");
  if (video.width !== expected.width || video.height !== expected.height) {
    throw new Error("MP4_PROBE_DIMENSIONS_MISMATCH");
  }
  const frameCount = parseFiniteNumber(video.nb_read_frames ?? video.nb_frames, "MP4_PROBE_FRAME_COUNT_MISSING");
  if (!Number.isSafeInteger(frameCount) || frameCount !== expected.frameCount) {
    throw new Error("MP4_PROBE_FRAME_COUNT_MISMATCH");
  }
  const durationSeconds = parseFiniteNumber(probe.format.duration ?? video.duration, "MP4_PROBE_DURATION_MISSING");
  if (Math.abs(durationSeconds - expected.durationSeconds) > 1 / expected.fps) {
    throw new Error("MP4_PROBE_DURATION_MISMATCH");
  }
  const formatName = typeof probe.format.format_name === "string" ? probe.format.format_name : "";
  if (!formatName.split(",").includes("mp4")) throw new Error("MP4_PROBE_CONTAINER_MISMATCH");
  const audioExpected = expected.audioPath !== null;
  if (audioExpected && (!audio || audio.codec_name !== "aac")) {
    throw new Error("MP4_PROBE_AUDIO_CODEC_MISMATCH");
  }
  if (!audioExpected && audio) throw new Error("MP4_PROBE_UNEXPECTED_AUDIO");
  return {
    audioCodec: audio ? "aac" : null,
    audioIncluded: Boolean(audio),
    durationSeconds,
    formatName,
    frameCount,
    height: video.height,
    pixelFormat: "yuv420p",
    videoCodec: "h264",
    width: video.width
  };
}

export function buildMp4CaptureRunLayout(repoRoot, runId) {
  if (typeof repoRoot !== "string" || !path.isAbsolute(repoRoot)) {
    fail("repoRoot must be an absolute path.");
  }
  if (typeof runId !== "string" || !safeRunIdPattern.test(runId)) {
    fail("runId must be a safe path segment.");
  }
  const runRoot = path.resolve(repoRoot, ".tmp", "mais-manim-v3-capture", runId);
  const ownedRoot = path.resolve(repoRoot, ".tmp", "mais-manim-v3-capture");
  const relative = path.relative(ownedRoot, runRoot);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail("runRoot must be a proper child of the capture root.");
  }
  return {
    framesDir: path.join(runRoot, "frames"),
    nextDistDir: path.join(runRoot, "next-dist"),
    runRoot
  };
}

export function isLoopbackHostname(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1" || hostname === "[::1]";
}

export function captureHarnessUrl({ hostname, port }) {
  if (!isLoopbackHostname(hostname)) fail("capture harness must bind to loopback.");
  boundedInteger(port, "port", 1, 65_535);
  return new URL("/internal/mais-manim-capture", `http://${hostname}:${port}`).toString();
}
