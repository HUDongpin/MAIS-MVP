import assert from "node:assert/strict";
import test from "node:test";

import { upgradeMathSceneSpecV1ToPackageV3 } from "@/components/visualizations/three/manim/mathScenePackageV3";
import { buildTrigUnitWaveMathSceneSpec } from "@/components/visualizations/three/manim/mathSceneRegistry";
import {
  buildMaisManimMp4ArtifactNames,
  buildMaisManimMp4ReadyManifest,
  buildMaisManimMp4ReadyResult,
  parseMaisManimMp4CliArguments,
  resolveMaisManimMp4Task
} from "./mp4CliContract";

const COMPOSITE_EVIDENCE = {
  captions: true,
  formulaOverlay: true,
  projectedLabels: true,
  webgl: true
} as const;

function packageJson() {
  const scene = buildTrigUnitWaveMathSceneSpec({
    accent: "#38bdf8",
    state: {
      comparison: 7,
      depthValue: 1.8,
      familyId: "three-trig-unit-wave",
      mode: 1,
      primaryValue: 6.8,
      secondaryValue: 7.25,
      stateSummary: "bounded trig capture",
      templateId: "trig-unit-wave",
      value: 6
    }
  });
  return upgradeMathSceneSpecV1ToPackageV3(scene, {
    exportProfiles: [{
      audioPolicy: "omit",
      background: "#020617",
      captionPolicy: "both",
      format: "mp4",
      fps: 30,
      height: 720,
      id: "mp4-720p",
      mimeType: "video/mp4",
      transparent: false,
      width: 1280
    }]
  });
}

test("CLI arguments are explicit and reject duplicate, unknown or remote inputs", () => {
  assert.deepEqual(parseMaisManimMp4CliArguments([
    "--package", "/work/scene.scene-package.json",
    "--output-dir", "/work/out",
    "--profile", "mp4-720p"
  ]), {
    audioPath: null,
    outputDir: "/work/out",
    packagePath: "/work/scene.scene-package.json",
    profileId: "mp4-720p"
  });
  assert.throws(() => parseMaisManimMp4CliArguments(["--package", "/a", "--package", "/b", "--output-dir", "/o"]), /duplicate/);
  assert.throws(() => parseMaisManimMp4CliArguments(["--package", "/a", "--output-dir", "/o", "--wat"]), /unknown/);
  assert.throws(() => parseMaisManimMp4CliArguments(["--package", "https://example.test/p.json", "--output-dir", "/o"]), /local path/);
  assert.throws(() => parseMaisManimMp4CliArguments(["--package", "/a"]), /output-dir/);
});

test("resolves an MP4 profile to an exact scene-clock task", () => {
  const value = packageJson();
  const task = resolveMaisManimMp4Task(value, {
    audioPath: null,
    outputDir: "/work/out",
    packagePath: "/work/scene.scene-package.json",
    profileId: "mp4-720p"
  });
  const duration = value.scene.timeline.reduce((total, step) => total + step.duration, 0);
  assert.equal(task.profile.id, "mp4-720p");
  assert.equal(task.frameCount, Math.ceil(duration * 30));
  assert.equal(task.durationSeconds, task.frameCount / 30);
  assert.equal(task.audioPath, null);
  assert.equal(task.width, 1280);
  assert.equal(task.height, 720);
  assert.throws(
    () => resolveMaisManimMp4Task(value, {
      audioPath: null, outputDir: "/work/out", packagePath: "/work/p.json", profileId: "missing"
    }),
    /MP4_PROFILE_NOT_FOUND/
  );
  value.exportProfiles[0]!.captionPolicy = "sidecar";
  assert.throws(
    () => resolveMaisManimMp4Task(value, {
      audioPath: null, outputDir: "/work/out", packagePath: "/work/p.json", profileId: "mp4-720p"
    }),
    /MP4_CAPTION_POLICY_UNSUPPORTED/
  );
  value.exportProfiles[0]!.captionPolicy = "both";
  value.scene.timeline[0]!.duration = 3_601;
  assert.throws(
    () => resolveMaisManimMp4Task(value, {
      audioPath: null, outputDir: "/work/out", packagePath: "/work/p.json", profileId: "mp4-720p"
    }),
    /MP4_DURATION_LIMIT_EXCEEDED/
  );
});

test("an include-audio profile requires matching local audio attachment intent", () => {
  const value = packageJson();
  value.audio = {
    contentHash: `sha256-${"a".repeat(64)}`,
    durationSeconds: 3,
    fileName: "narration.wav",
    mimeType: "audio/wav",
    source: "local-file"
  };
  value.exportProfiles[0]!.audioPolicy = "include-if-attached";
  assert.throws(
    () => resolveMaisManimMp4Task(value, {
      audioPath: null, outputDir: "/work/out", packagePath: "/work/p.json", profileId: "mp4-720p"
    }),
    /MP4_AUDIO_REATTACH_REQUIRED/
  );
  const task = resolveMaisManimMp4Task(value, {
    audioPath: "/work/narration.wav",
    outputDir: "/work/out",
    packagePath: "/work/p.json",
    profileId: "mp4-720p"
  });
  assert.equal(task.audioPath, "/work/narration.wav");
  value.exportProfiles[0]!.audioPolicy = "omit";
  assert.throws(
    () => resolveMaisManimMp4Task(value, {
      audioPath: "/work/narration.wav", outputDir: "/work/out", packagePath: "/work/p.json", profileId: "mp4-720p"
    }),
    /MP4_AUDIO_PROFILE_OMITS_AUDIO/
  );
});

test("artifact names are bounded and ready manifest requires media proof", () => {
  assert.deepEqual(buildMaisManimMp4ArtifactNames("mais-manim-trig-unit-wave", "mp4-720p"), {
    audioHashProof: "mais-manim-trig-unit-wave--mp4-720p.audio-hash-proof.json",
    manifest: "mais-manim-trig-unit-wave--mp4-720p.manifest.json",
    mp4: "mais-manim-trig-unit-wave--mp4-720p.mp4",
    package: "mais-manim-trig-unit-wave--mp4-720p.scene-package.json",
    vtt: "mais-manim-trig-unit-wave--mp4-720p.vtt"
  });
  const value = packageJson();
  const task = resolveMaisManimMp4Task(value, {
    audioPath: null,
    outputDir: "/work/out",
    packagePath: "/work/p.json",
    profileId: "mp4-720p"
  });
  assert.throws(() => buildMaisManimMp4ReadyManifest({
    artifactNames: buildMaisManimMp4ArtifactNames(value.scene.sceneId, "mp4-720p"),
    byteCount: 0,
    compositeEvidence: COMPOSITE_EVIDENCE,
    mediaEvidence: {
      audioCodec: null, audioIncluded: false, durationSeconds: task.durationSeconds,
      formatName: "mov,mp4,m4a,3gp,3g2,mj2", frameCount: task.frameCount,
      height: 720, pixelFormat: "yuv420p", videoCodec: "h264", width: 1280
    },
    packageHash: `sha256-${"b".repeat(64)}`,
    task
  }), /MP4_READY_REQUIRES_NON_ZERO_MEDIA/);
  const manifest = buildMaisManimMp4ReadyManifest({
    artifactNames: buildMaisManimMp4ArtifactNames(value.scene.sceneId, "mp4-720p"),
    byteCount: 4096,
    compositeEvidence: COMPOSITE_EVIDENCE,
    mediaEvidence: {
      audioCodec: null, audioIncluded: false, durationSeconds: task.durationSeconds,
      formatName: "mov,mp4,m4a,3gp,3g2,mj2", frameCount: task.frameCount,
      height: 720, pixelFormat: "yuv420p", videoCodec: "h264", width: 1280
    },
    packageHash: `sha256-${"b".repeat(64)}`,
    task
  });
  assert.equal(manifest.status, "ready");
  assert.equal(manifest.byteCount, 4096);
  assert.equal(manifest.packageHash, `sha256-${"b".repeat(64)}`);
  assert.equal(manifest.codec.video, "h264");
  assert.equal(Object.hasOwn(manifest.artifacts, "audioHashProof"), false);
});

test("MP4 CLI emits the shared parseable ready-result contract with artifact hashes", () => {
  const value = packageJson();
  const task = resolveMaisManimMp4Task(value, {
    audioPath: null,
    outputDir: "/work/out",
    packagePath: "/work/p.json",
    profileId: "mp4-720p"
  });
  const artifactNames = buildMaisManimMp4ArtifactNames(value.scene.sceneId, "mp4-720p");
  const result = buildMaisManimMp4ReadyResult({
    artifactNames,
    audioContentHash: null,
    byteCount: 4096,
    compositeEvidence: COMPOSITE_EVIDENCE,
    captionsVttContentHash: `sha256-${"c".repeat(64)}`,
    createdAtIso: "2026-08-23T12:00:00.000Z",
    exportId: "mp4-export-1",
    mediaContentHash: `sha256-${"d".repeat(64)}`,
    mediaEvidence: {
      audioCodec: null,
      audioIncluded: false,
      durationSeconds: task.durationSeconds,
      formatName: "mov,mp4,m4a,3gp,3g2,mj2",
      frameCount: task.frameCount,
      height: 720,
      pixelFormat: "yuv420p",
      videoCodec: "h264",
      width: 1280
    },
    packageContentHash: `sha256-${"e".repeat(64)}`,
    profileContentHash: `sha256-${"f".repeat(64)}`,
    task
  });
  assert.equal(result.status, "ready");
  assert.equal(result.format, "mp4");
  assert.equal(result.mimeType, "video/mp4");
  assert.equal(result.fileName, artifactNames.mp4);
  assert.equal(result.captionFileName, artifactNames.vtt);
  assert.equal(result.metadataParsed, true);
  assert.equal(result.mediaContentHash, `sha256-${"d".repeat(64)}`);
  assert.throws(() => buildMaisManimMp4ReadyResult({
    artifactNames,
    audioContentHash: `sha256-${"a".repeat(64)}`,
    byteCount: 4096,
    compositeEvidence: COMPOSITE_EVIDENCE,
    captionsVttContentHash: `sha256-${"c".repeat(64)}`,
    createdAtIso: "2026-08-23T12:00:00.000Z",
    exportId: "mp4-export-1",
    mediaContentHash: `sha256-${"d".repeat(64)}`,
    mediaEvidence: {
      audioCodec: null,
      audioIncluded: false,
      durationSeconds: task.durationSeconds,
      formatName: "mov,mp4,m4a,3gp,3g2,mj2",
      frameCount: task.frameCount,
      height: 720,
      pixelFormat: "yuv420p",
      videoCodec: "h264",
      width: 1280
    },
    packageContentHash: `sha256-${"e".repeat(64)}`,
    profileContentHash: `sha256-${"f".repeat(64)}`,
    task
  }), /MP4_READY_RESULT_INVALID/);

  for (const incompleteEvidence of [
    null,
    {},
    { ...COMPOSITE_EVIDENCE, captions: false },
    { ...COMPOSITE_EVIDENCE, source: "hard-coded" }
  ]) {
    assert.throws(() => buildMaisManimMp4ReadyResult({
      artifactNames,
      audioContentHash: null,
      byteCount: 4096,
      captionsVttContentHash: `sha256-${"c".repeat(64)}`,
      compositeEvidence: incompleteEvidence as never,
      createdAtIso: "2026-08-23T12:00:00.000Z",
      exportId: "mp4-export-1",
      mediaContentHash: `sha256-${"d".repeat(64)}`,
      mediaEvidence: {
        audioCodec: null,
        audioIncluded: false,
        durationSeconds: task.durationSeconds,
        formatName: "mov,mp4,m4a,3gp,3g2,mj2",
        frameCount: task.frameCount,
        height: 720,
        pixelFormat: "yuv420p",
        videoCodec: "h264",
        width: 1280
      },
      packageContentHash: `sha256-${"e".repeat(64)}`,
      profileContentHash: `sha256-${"f".repeat(64)}`,
      task
    }), /MP4_COMPOSITE_EVIDENCE_REQUIRED/);
  }
});
