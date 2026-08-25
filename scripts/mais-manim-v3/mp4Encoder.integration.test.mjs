import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  buildFfmpegMp4Args,
  buildFfprobeArgs,
  parseFfprobeMp4Evidence,
  validateCompletePngFrameSet
} from "./mp4RenderCore.mjs";

const execFileAsync = promisify(execFile);

test("local FFmpeg produces a parseable non-zero H.264/yuv420p MP4 with exact frames", async (t) => {
  const ffmpeg = process.env.MAIS_MANIM_FFMPEG_PATH || "ffmpeg";
  const ffprobe = process.env.MAIS_MANIM_FFPROBE_PATH || "ffprobe";
  const runRoot = await mkdtemp(path.join(os.tmpdir(), "mais-manim-v3-mp4-"));
  t.after(async () => rm(runRoot, { recursive: true, force: true }));
  const framesDir = path.join(runRoot, "frames");
  await mkdir(framesDir);
  const framePattern = path.join(framesDir, "frame-%06d.png");
  const outputPath = path.join(runRoot, "encoder-proof.mp4");

  await execFileAsync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    "-f", "lavfi", "-i", "color=c=0x0ea5e9:s=320x180:r=2:d=1",
    "-frames:v", "2", "-start_number", "0", framePattern
  ], { timeout: 15_000 });

  assert.deepEqual(
    validateCompletePngFrameSet(await readdir(framesDir), 2),
    { ok: true, expectedFrameCount: 2 }
  );
  await execFileAsync(ffmpeg, buildFfmpegMp4Args({
    audioPath: null,
    fps: 2,
    framePattern,
    outputPath
  }), { timeout: 15_000 });

  const outputStat = await stat(outputPath);
  assert.ok(outputStat.size > 0);
  const { stdout } = await execFileAsync(ffprobe, buildFfprobeArgs(outputPath), {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
    timeout: 15_000
  });
  const evidence = parseFfprobeMp4Evidence(stdout, {
    audioPath: null,
    durationSeconds: 1,
    fps: 2,
    frameCount: 2,
    height: 180,
    outputBaseName: "encoder-proof",
    width: 320
  });
  assert.equal(evidence.videoCodec, "h264");
  assert.equal(evidence.pixelFormat, "yuv420p");
  assert.equal(evidence.audioIncluded, false);
  assert.equal(evidence.frameCount, 2);
  assert.ok((await readFile(outputPath)).byteLength > 0);
});
