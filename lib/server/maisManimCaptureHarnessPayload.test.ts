import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { upgradeMathSceneSpecV1ToPackageV3 } from "@/components/visualizations/three/manim/mathScenePackageV3";
import { buildTrigUnitWaveMathSceneSpec } from "@/components/visualizations/three/manim/mathSceneRegistry";
import { loadMaisManimCaptureHarnessPayload } from "@/lib/server/maisManimCaptureHarnessPayload";

function scenePackage() {
  const scene = buildTrigUnitWaveMathSceneSpec({
    accent: "#38bdf8",
    state: {
      comparison: 7,
      depthValue: 1.8,
      familyId: "three-trig-unit-wave",
      mode: 1,
      primaryValue: 6.8,
      secondaryValue: 7.25,
      stateSummary: "capture harness payload",
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

async function fixture(t: test.TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), "mais-manim-capture-payload-"));
  t.after(async () => rm(root, { force: true, recursive: true }));
  const repoRoot = path.join(root, "repo");
  const runRoot = path.join(repoRoot, ".tmp", "mais-manim-v3-capture", "run-1");
  await mkdir(runRoot, { recursive: true });
  const packagePath = path.join(runRoot, "input.scene-package.json");
  await writeFile(packagePath, JSON.stringify(scenePackage()));
  return { packagePath, repoRoot, root, runRoot };
}

test("loads only a validated MP4 profile from the owned capture run", async (t) => {
  const value = await fixture(t);
  const result = await loadMaisManimCaptureHarnessPayload({
    packagePath: value.packagePath,
    profileId: "mp4-720p",
    repoRoot: value.repoRoot,
    runRoot: value.runRoot
  });
  assert.equal(result.packageJson.schemaVersion, "mais-manim-scene-package/v3");
  assert.equal(result.packageJson.scene.sceneId, "mais-manim-trig-unit-wave");
  assert.equal(result.profile.id, "mp4-720p");
  assert.equal(result.profile.format, "mp4");
});

test("rejects package and run paths outside the owned repo capture root", async (t) => {
  const value = await fixture(t);
  const outsidePath = path.join(value.root, "outside.json");
  await writeFile(outsidePath, JSON.stringify(scenePackage()));
  await assert.rejects(() => loadMaisManimCaptureHarnessPayload({
    packagePath: outsidePath,
    profileId: "mp4-720p",
    repoRoot: value.repoRoot,
    runRoot: value.runRoot
  }), /CAPTURE_PACKAGE_OUTSIDE_RUN_ROOT/);
  await assert.rejects(() => loadMaisManimCaptureHarnessPayload({
    packagePath: value.packagePath,
    profileId: "mp4-720p",
    repoRoot: value.repoRoot,
    runRoot: path.join(value.root, "outside-run")
  }), /CAPTURE_RUN_ROOT_OUTSIDE_REPO_TMP/);
});

test("rejects symlink escapes, malformed packages, oversized bytes and non-MP4 profiles", async (t) => {
  const value = await fixture(t);
  const outsidePath = path.join(value.root, "outside.json");
  await writeFile(outsidePath, JSON.stringify(scenePackage()));
  const linkPath = path.join(value.runRoot, "linked.scene-package.json");
  await symlink(outsidePath, linkPath);
  await assert.rejects(() => loadMaisManimCaptureHarnessPayload({
    packagePath: linkPath,
    profileId: "mp4-720p",
    repoRoot: value.repoRoot,
    runRoot: value.runRoot
  }), /CAPTURE_PACKAGE_OUTSIDE_RUN_ROOT/);

  await writeFile(value.packagePath, "{bad-json");
  await assert.rejects(() => loadMaisManimCaptureHarnessPayload({
    packagePath: value.packagePath,
    profileId: "mp4-720p",
    repoRoot: value.repoRoot,
    runRoot: value.runRoot
  }), /CAPTURE_PACKAGE_INVALID/);

  await writeFile(value.packagePath, "x".repeat(1_048_577));
  await assert.rejects(() => loadMaisManimCaptureHarnessPayload({
    packagePath: value.packagePath,
    profileId: "mp4-720p",
    repoRoot: value.repoRoot,
    runRoot: value.runRoot
  }), /CAPTURE_PACKAGE_TOO_LARGE/);

  await writeFile(value.packagePath, JSON.stringify(scenePackage()));
  await assert.rejects(() => loadMaisManimCaptureHarnessPayload({
    packagePath: value.packagePath,
    profileId: "missing",
    repoRoot: value.repoRoot,
    runRoot: value.runRoot
  }), /CAPTURE_MP4_PROFILE_NOT_FOUND/);
});
