import assert from "node:assert/strict";
import test from "node:test";

import { createGoldenTrigVisualizationAuthoringState } from "./teacherVisualizationAuthoringModel";
import * as downloadHelpers from "./teacherVisualizationDownloads";
import {
  buildTeacherVisualizationDownloadArtifacts,
  createTeacherVisualizationObjectUrlLease,
  teacherVisualizationLocalMp4Command,
  tryBuildTeacherVisualizationDownloadArtifacts
} from "./teacherVisualizationDownloads";

test("download artifacts contain a valid scene package and three WebVTT sidecars", async () => {
  const state = createGoldenTrigVisualizationAuthoringState("teacher-1");
  const artifacts = buildTeacherVisualizationDownloadArtifacts(state.title, state.packageJson);

  assert.equal(artifacts.scenePackage.fileName.endsWith(".scene-package.json"), true);
  assert.equal(JSON.parse(await artifacts.scenePackage.blob.text()).schemaVersion, "mais-manim-scene-package/v3");
  assert.deepEqual(artifacts.captions.map((item) => item.locale), ["en", "zh", "zhHans"]);
  for (const caption of artifacts.captions) {
    assert.match(await caption.blob.text(), /^WEBVTT\n/);
  }
});

test("object URL leases revoke exactly once and unavailable capture formats never expose a fake command", () => {
  const revoked: string[] = [];
  const lease = createTeacherVisualizationObjectUrlLease(new Blob(["x"]), {
    createObjectURL: () => "blob:local-only",
    revokeObjectURL: (value) => revoked.push(value)
  });

  assert.equal(lease.url, "blob:local-only");
  lease.revoke();
  lease.revoke();
  assert.deepEqual(revoked, ["blob:local-only"]);
  assert.equal(teacherVisualizationLocalMp4Command("scene package.json"), null);
  const capabilityHelper = (downloadHelpers as unknown as Record<string, unknown>)
    .teacherVisualizationCaptureCapability;
  assert.equal(typeof capabilityHelper, "function");
  assert.deepEqual((capabilityHelper as () => unknown)(), {
    code: "A10_A22_CAPTURE_HARNESS_REQUIRED",
    mp4Command: null,
    requirements: [
      "The existing MP4 CLI scaffold remains unusable from this workbench until its internal capture route and harness are integrated and verified.",
      "WebM requires a connected browser capture executor with explicit success evidence."
    ],
    webmCommand: null
  });
});

test("temporary invalid captions return a typed unavailable result instead of throwing during render", () => {
  const state = createGoldenTrigVisualizationAuthoringState("teacher-1");
  state.packageJson.captions[0]!.text.en = "";

  const invalid = tryBuildTeacherVisualizationDownloadArtifacts(state.title, state.packageJson);
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.errorCode, "CAPTION_TEXT_EMPTY");

  state.packageJson.captions[0]!.text.en = "Restored caption";
  const fixed = tryBuildTeacherVisualizationDownloadArtifacts(state.title, state.packageJson);
  assert.equal(fixed.ok, true);
  if (fixed.ok) assert.equal(fixed.value.captions.length, 3);
});
