#!/usr/bin/env -S node --import tsx

import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { createServer, connect } from "node:net";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import {
  MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES,
  parseMathScenePackageV3Json,
  type MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import { buildMathScenePackageV3WebVtt } from "@/components/visualizations/three/manim/mathScenePackageV3WebVtt";
import {
  buildMaisManimMp4ArtifactNames,
  buildMaisManimMp4ReadyManifest,
  buildMaisManimMp4ReadyResult,
  parseMaisManimMp4CliArguments,
  parseMaisManimObservedCompositeEvidence,
  resolveMaisManimMp4Task,
  type MaisManimMp4Task
} from "./mais-manim-v3/mp4CliContract";
import type { MathSceneCompositeCaptureEvidence } from "@/components/visualizations/three/manim/mathSceneVideoExportContract";
import {
  buildExactFrameTimes,
  buildFfmpegMp4Args,
  buildFfprobeArgs,
  buildMp4CaptureRunLayout,
  captureHarnessUrl,
  parseFfprobeMp4Evidence,
  validateCompletePngFrameSet
} from "./mais-manim-v3/mp4RenderCore.mjs";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokenHeader = "x-mais-manim-capture-token";
const serverStartTimeoutMs = 90_000;
const harnessReadyTimeoutMs = 90_000;
const maxLocalAudioBytes = 100 * 1024 * 1024;

type CaptureHarnessReady = {
  durationSeconds: number;
  profileId: string;
  sceneId: string;
  status: "ready";
};

type CaptureFrameResult = {
  compositeEvidence: MathSceneCompositeCaptureEvidence;
  elapsedSeconds: number;
  frameIndex: number;
  ready: true;
};

declare global {
  interface Window {
    __MAIS_MANIM_MP4_CAPTURE__?: {
      captureFrame(input: { elapsedSeconds: number; frameIndex: number }): Promise<CaptureFrameResult>;
      ready(): CaptureHarnessReady;
    };
  }
}

function usage() {
  return [
    "MAIS Manim v3 local MP4 renderer",
    "",
    "Usage:",
    "  node --import tsx scripts/render-mais-manim-mp4.ts \\",
    "    --package /absolute/scene.scene-package.json \\",
    "    --output-dir /absolute/output-dir [--profile mp4-profile-id] [--audio /absolute/narration.wav]",
    "",
    "The command refuses remote paths and existing output artifacts. The selected profile must use captionPolicy=both; it writes a ready manifest only after ffprobe succeeds."
  ].join("\n");
}

function sha256(bytes: Uint8Array | string): `sha256-${string}` {
  return `sha256-${createHash("sha256").update(bytes).digest("hex")}`;
}

async function sha256File(filePath: string): Promise<`sha256-${string}`> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return `sha256-${hash.digest("hex")}`;
}

async function readValidatedPackage(packagePath: string) {
  const fileStat = await stat(packagePath);
  if (!fileStat.isFile()) throw new Error("MP4_PACKAGE_NOT_A_FILE");
  if (fileStat.size > MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES) {
    throw new Error("MP4_PACKAGE_TOO_LARGE");
  }
  const bytes = await readFile(packagePath);
  if (bytes.byteLength > MATH_SCENE_PACKAGE_V3_MAX_JSON_BYTES) {
    throw new Error("MP4_PACKAGE_TOO_LARGE");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("MP4_PACKAGE_INVALID_UTF8");
  }
  const parsed = parseMathScenePackageV3Json(text);
  if (!parsed.ok) {
    const codes = [...new Set(parsed.errors.map((error) => error.code))].join(",");
    throw new Error(`MP4_PACKAGE_INVALID:${codes}`);
  }
  return { inputPackageHash: sha256(bytes), packageJson: parsed.value };
}

async function verifyAudioHash(task: MaisManimMp4Task) {
  if (!task.audioPath || !task.audioExpectedHash) return null;
  const audioStat = await stat(task.audioPath);
  if (!audioStat.isFile() || audioStat.size <= 0) throw new Error("MP4_AUDIO_NOT_A_NON_ZERO_FILE");
  if (audioStat.size > maxLocalAudioBytes) throw new Error("MP4_AUDIO_TOO_LARGE");
  const actual = await sha256File(task.audioPath);
  if (actual !== task.audioExpectedHash) throw new Error("MP4_AUDIO_HASH_MISMATCH");
  return actual;
}

async function reserveLoopbackPort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("MP4_CAPTURE_PORT_UNAVAILABLE")));
        return;
      }
      const port = address.port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForLoopbackPort(port: number, child: ChildProcess) {
  const deadline = Date.now() + serverStartTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`MP4_CAPTURE_SERVER_EXITED:${child.exitCode}`);
    const ready = await new Promise<boolean>((resolve) => {
      const socket = connect({ host: "127.0.0.1", port });
      socket.setTimeout(500);
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("timeout", () => { socket.destroy(); resolve(false); });
      socket.once("error", () => resolve(false));
    });
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("MP4_CAPTURE_SERVER_START_TIMEOUT");
}

function startCaptureServer({
  nextDistDir,
  packagePath,
  port,
  profileId,
  runRoot,
  token
}: {
  nextDistDir: string;
  packagePath: string;
  port: number;
  profileId: string;
  runRoot: string;
  token: string;
}) {
  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [
    nextBin,
    "dev",
    "--hostname", "127.0.0.1",
    "--port", String(port)
  ], {
    cwd: repoRoot,
    env: {
      ...process.env,
      MAIS_MANIM_CAPTURE_HARNESS: "1",
      MAIS_MANIM_CAPTURE_PACKAGE_PATH: packagePath,
      MAIS_MANIM_CAPTURE_PROFILE_ID: profileId,
      MAIS_MANIM_CAPTURE_RUN_ROOT: runRoot,
      MAIS_MANIM_CAPTURE_TOKEN: token,
      NEXT_DIST_DIR: path.relative(repoRoot, nextDistDir),
      NODE_ENV: "development"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let logTail = "";
  const append = (chunk: Buffer) => {
    logTail = `${logTail}${chunk.toString("utf8")}`.slice(-16_384).replaceAll(token, "[redacted-token]");
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  return { child, logTail: () => logTail };
}

async function stopCaptureServer(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise<boolean>((resolve) => child.once("exit", () => resolve(true))),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000))
  ]);
  if (!exited && child.exitCode === null) child.kill("SIGKILL");
}

async function assertHarnessReady(page: Page, task: MaisManimMp4Task) {
  await page.locator("[data-mais-manim-capture-ready='true']").waitFor({
    state: "attached",
    timeout: harnessReadyTimeoutMs
  });
  const ready = await page.evaluate(() => window.__MAIS_MANIM_MP4_CAPTURE__?.ready());
  if (
    !ready
    || ready.status !== "ready"
    || ready.sceneId !== task.sceneId
    || ready.profileId !== task.profile.id
    || Math.abs(ready.durationSeconds - task.sceneDurationSeconds) > 0.000_001
  ) {
    throw new Error("MP4_CAPTURE_HARNESS_METADATA_MISMATCH");
  }
}

async function captureFrames(page: Page, task: MaisManimMp4Task, framesDir: string) {
  const surface = page.locator("[data-mais-manim-capture-surface]");
  const bounds = await surface.boundingBox();
  if (!bounds || Math.round(bounds.width) !== task.width || Math.round(bounds.height) !== task.height) {
    throw new Error("MP4_CAPTURE_SURFACE_DIMENSIONS_MISMATCH");
  }
  const times = buildExactFrameTimes({ frameCount: task.frameCount, fps: task.fps });
  let observedCompositeEvidence: MathSceneCompositeCaptureEvidence | null = null;
  for (let frameIndex = 0; frameIndex < times.length; frameIndex += 1) {
    const elapsedSeconds = Math.min(times[frameIndex]!, task.sceneDurationSeconds);
    const result = await page.evaluate(async ({ elapsedSeconds, frameIndex }) => {
      const capture = window.__MAIS_MANIM_MP4_CAPTURE__;
      if (!capture) throw new Error("MP4_CAPTURE_HARNESS_API_MISSING");
      return capture.captureFrame({ elapsedSeconds, frameIndex });
    }, { elapsedSeconds, frameIndex });
    if (
      !result?.ready
      || result.frameIndex !== frameIndex
      || Math.abs(result.elapsedSeconds - elapsedSeconds) > 0.000_001
    ) {
      throw new Error(`MP4_CAPTURE_FRAME_NOT_READY:${frameIndex}`);
    }
    const frameCompositeEvidence = parseMaisManimObservedCompositeEvidence(result.compositeEvidence);
    if (
      observedCompositeEvidence &&
      JSON.stringify(observedCompositeEvidence) !== JSON.stringify(frameCompositeEvidence)
    ) {
      throw new Error(`MP4_CAPTURE_COMPOSITE_EVIDENCE_CHANGED:${frameIndex}`);
    }
    observedCompositeEvidence = frameCompositeEvidence;
    await surface.screenshot({
      animations: "disabled",
      path: path.join(framesDir, `frame-${String(frameIndex).padStart(6, "0")}.png`),
      type: "png"
    });
  }
  if (!observedCompositeEvidence) throw new Error("MP4_CAPTURE_COMPOSITE_EVIDENCE_MISSING");
  return observedCompositeEvidence;
}

async function assertTargetsAbsent(outputDir: string, artifactNames: ReturnType<typeof buildMaisManimMp4ArtifactNames>) {
  await mkdir(outputDir, { recursive: true });
  for (const fileName of Object.values(artifactNames)) {
    try {
      await access(path.join(outputDir, fileName));
      throw new Error(`MP4_OUTPUT_EXISTS:${fileName}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

async function publishArtifacts({
  audioHashProofText,
  artifactNames,
  manifestText,
  mp4Path,
  outputDir,
  packageText,
  vttText
}: {
  audioHashProofText: string | null;
  artifactNames: ReturnType<typeof buildMaisManimMp4ArtifactNames>;
  manifestText: string;
  mp4Path: string;
  outputDir: string;
  packageText: string;
  vttText: string;
}) {
  const targets = {
    audioHashProof: path.join(outputDir, artifactNames.audioHashProof),
    manifest: path.join(outputDir, artifactNames.manifest),
    mp4: path.join(outputDir, artifactNames.mp4),
    package: path.join(outputDir, artifactNames.package),
    vtt: path.join(outputDir, artifactNames.vtt)
  };
  const created: string[] = [];
  try {
    await copyFile(mp4Path, targets.mp4, 1); created.push(targets.mp4);
    await writeFile(targets.package, packageText, { encoding: "utf8", flag: "wx" }); created.push(targets.package);
    await writeFile(targets.vtt, vttText, { encoding: "utf8", flag: "wx" }); created.push(targets.vtt);
    if (audioHashProofText !== null) {
      await writeFile(targets.audioHashProof, audioHashProofText, { encoding: "utf8", flag: "wx" });
      created.push(targets.audioHashProof);
    }
    // Manifest is deliberately last: its `ready` state is a receipt for all
    // other artifacts, never a plan or a partial write.
    await writeFile(targets.manifest, manifestText, { encoding: "utf8", flag: "wx" }); created.push(targets.manifest);
    return {
      manifest: targets.manifest,
      mp4: targets.mp4,
      package: targets.package,
      vtt: targets.vtt,
      ...(audioHashProofText !== null ? { audioHashProof: targets.audioHashProof } : {})
    };
  } catch (error) {
    await Promise.all(created.map((target) => rm(target, { force: true })));
    throw error;
  }
}

async function run() {
  if (process.argv.slice(2).includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const cli = parseMaisManimMp4CliArguments(process.argv.slice(2));
  const { inputPackageHash, packageJson } = await readValidatedPackage(cli.packagePath);
  const task = resolveMaisManimMp4Task(packageJson, cli);
  const audioHashProof = await verifyAudioHash(task);
  const artifactNames = buildMaisManimMp4ArtifactNames(task.sceneId, task.profile.id);
  await assertTargetsAbsent(task.outputDir, artifactNames);

  const runId = `${Date.now()}-${process.pid}-${randomBytes(6).toString("hex")}`;
  const token = randomBytes(32).toString("hex");
  const layout = buildMp4CaptureRunLayout(repoRoot, runId);
  await mkdir(layout.framesDir, { recursive: true });
  const packageCopyPath = path.join(layout.runRoot, "input.scene-package.json");
  const canonicalPackageText = `${JSON.stringify(packageJson, null, 2)}\n`;
  const packageHash = sha256(canonicalPackageText);
  await writeFile(packageCopyPath, canonicalPackageText, { encoding: "utf8", flag: "wx" });

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let server: ReturnType<typeof startCaptureServer> | undefined;
  try {
    const port = await reserveLoopbackPort();
    server = startCaptureServer({
      nextDistDir: layout.nextDistDir,
      packagePath: packageCopyPath,
      port,
      profileId: task.profile.id,
      runRoot: layout.runRoot,
      token
    });
    await waitForLoopbackPort(port, server.child);
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      deviceScaleFactor: 1,
      extraHTTPHeaders: { [tokenHeader]: token },
      viewport: { height: task.height, width: task.width }
    });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 1_000)));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text().slice(0, 1_000));
    });
    await page.goto(captureHarnessUrl({ hostname: "127.0.0.1", port }), {
      waitUntil: "domcontentloaded",
      timeout: harnessReadyTimeoutMs
    });
    await assertHarnessReady(page, task);
    const compositeEvidence = await captureFrames(page, task, layout.framesDir);
    if (pageErrors.length > 0) {
      throw new Error(`MP4_CAPTURE_BROWSER_ERROR:${pageErrors.slice(0, 5).join(" | ")}`);
    }
    const frameSet = validateCompletePngFrameSet(await readdir(layout.framesDir), task.frameCount);
    if (!frameSet.ok) throw new Error(`${frameSet.errorCode}:${JSON.stringify(frameSet)}`);

    const mp4Path = path.join(layout.runRoot, artifactNames.mp4);
    const framePattern = path.join(layout.framesDir, "frame-%06d.png");
    const ffmpeg = process.env.MAIS_MANIM_FFMPEG_PATH?.trim() || "ffmpeg";
    const ffprobe = process.env.MAIS_MANIM_FFPROBE_PATH?.trim() || "ffprobe";
    await execFileAsync(ffmpeg, buildFfmpegMp4Args({
      audioPath: task.audioPath,
      fps: task.fps,
      framePattern,
      outputPath: mp4Path
    }), { maxBuffer: 4 * 1024 * 1024, timeout: 30 * 60 * 1_000 });
    const mp4Stat = await stat(mp4Path);
    if (!mp4Stat.isFile() || mp4Stat.size <= 0) throw new Error("MP4_ENCODER_ZERO_BYTES");
    const probe = await execFileAsync(ffprobe, buildFfprobeArgs(mp4Path), {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 60_000
    });
    const mediaEvidence = parseFfprobeMp4Evidence(probe.stdout, {
      audioPath: task.audioPath,
      durationSeconds: task.durationSeconds,
      fps: task.fps,
      frameCount: task.frameCount,
      height: task.height,
      outputBaseName: task.outputBaseName,
      width: task.width
    });
    const vtt = buildMathScenePackageV3WebVtt(
      packageJson.captions,
      packageJson.localization.defaultLocale
    );
    const captionsVttContentHash = sha256(vtt);
    const mediaContentHash = await sha256File(mp4Path);
    const profileContentHash = sha256(JSON.stringify(
      task.profile,
      Object.keys(task.profile).sort()
    ));
    const createdAtIso = new Date().toISOString();
    const readyResult = buildMaisManimMp4ReadyResult({
      artifactNames,
      audioContentHash: audioHashProof,
      byteCount: mp4Stat.size,
      compositeEvidence,
      captionsVttContentHash,
      createdAtIso,
      exportId: `mp4-${runId}`,
      mediaContentHash,
      mediaEvidence,
      packageContentHash: packageHash,
      profileContentHash,
      task
    });
    const manifest = {
      ...buildMaisManimMp4ReadyManifest({
        artifactNames,
        byteCount: mp4Stat.size,
        compositeEvidence,
        mediaEvidence,
        packageHash,
        task
      }),
      audioHashProof,
      audioHashProofFileName: audioHashProof ? artifactNames.audioHashProof : null,
      captionFileName: artifactNames.vtt,
      captionsVttContentHash,
      inputPackageHash,
      mediaContentHash,
      profileContentHash,
      readyResult
    };
    const audioHashProofText = audioHashProof && packageJson.audio.source !== "none"
      ? `${JSON.stringify({
          schemaVersion: "mais-manim-audio-hash-proof/v1",
          contentHash: audioHashProof,
          createdAtIso,
          durationSeconds: packageJson.audio.durationSeconds,
          fileName: packageJson.audio.fileName,
          mimeType: packageJson.audio.mimeType
        }, null, 2)}\n`
      : null;
    const targets = await publishArtifacts({
      audioHashProofText,
      artifactNames,
      manifestText: `${JSON.stringify(manifest, null, 2)}\n`,
      mp4Path,
      outputDir: task.outputDir,
      packageText: canonicalPackageText,
      vttText: vtt
    });
    process.stdout.write(`${JSON.stringify({ status: "ready", targets }, null, 2)}\n`);
  } catch (error) {
    const serverTail = server?.logTail().trim();
    if (serverTail) process.stderr.write(`capture server tail:\n${serverTail}\n`);
    throw error;
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    if (server) await stopCaptureServer(server.child);
    await rm(layout.runRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`mais-manim-mp4: failed: ${message}\n`);
  process.exitCode = 1;
});
