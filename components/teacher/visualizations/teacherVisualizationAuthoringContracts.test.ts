import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("teacher visualization routes use cached teacher authentication and pass only bounded identifiers", () => {
  const routes = [
    ["app/teacher/visualizations/page.tsx", "TeacherVisualizationDraftList"],
    ["app/teacher/visualizations/new/page.tsx", "TeacherVisualizationAuthoringWorkspace"],
    ["app/teacher/visualizations/[draftId]/page.tsx", "TeacherVisualizationAuthoringWorkspace"]
  ] as const;
  for (const [path, component] of routes) {
    assert.equal(fs.existsSync(path), true, `${path} must exist`);
    const source = read(path);
    assert.match(source, /getTeacherAuthenticationForPage/);
    assert.match(source, new RegExp(component));
    assert.doesNotMatch(source, /getTeacherFoundationForPage/);
    assert.doesNotMatch(source, /packageJson/);
  }
  assert.match(read(routes[2][0]), /draftId/);
});

test("authoring workspace exposes five bounded steps and honest export capabilities", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");

  for (const marker of [
    "course-objective",
    "misconception-invariants",
    "objects-formulas-localization",
    "timeline-camera-captions-audio",
    "validate-preview-export"
  ]) assert.match(source, new RegExp(marker));
  assert.match(source, /A06_EXTENSION_REQUIRED/);
  assert.match(source, /existing-golden-only/);
  assert.match(source, /captureCapability\.code/);
  assert.match(source, /ready-for-review/);
  assert.doesNotMatch(source, /publish[- ]to[- ]course|Publish to course|發佈到課程/i);
  assert.doesNotMatch(source, /TTS|AI Tutor|text-to-speech/i);
});

test("authoring workspace renders the gate ledger directly from reducer-owned package state", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");

  assert.match(source, /Object\.entries\(state\.packageJson\.reviewLedger\)/);
  assert.match(source, /entry\.status/);
  assert.match(source, /entry\.evidenceIds\.length/);
  assert.doesNotMatch(source, /useState[^\n]*(?:A06|reviewLedger)/);
});

test("zero-class teachers can enter the visualization authoring route while other routes keep EmptyWorkspace", () => {
  const shell = read("components/teacher/TeacherShell.tsx");
  assert.match(shell, /isTeacherVisualizationAuthoringPath/);
  assert.match(shell, /classes\.length === 0/);
  assert.match(shell, /TeacherEmptyWorkspace/);
  assert.match(shell, /\/teacher\/visualizations/);
});

test("learner catalog imports the learner presentation and never the teacher editor or microphone module", () => {
  const lab = read("components/visualizations/VisualizationLabPage.tsx");
  assert.match(lab, /module\.ConfiguredVisualizationLabDirect/);
  assert.doesNotMatch(lab, /components\/teacher\/visualizations/);
  assert.doesNotMatch(lab, /teacherVisualizationLocalAudio/);
  assert.doesNotMatch(lab, /MediaRecorder/);
});

test("teacher navigation links to the authoring surface with a dedicated icon", () => {
  const shell = read("components/teacher/TeacherShell.tsx");
  const icons = read("components/teacher/teacherNavIcons.tsx");
  assert.match(shell, /href: "\/teacher\/visualizations"/);
  assert.match(shell, /icon: "visualizations"/);
  assert.match(icons, /\| "visualizations"/);
  assert.match(icons, /visualizations:/);
});

test("author-only microphone control cancels and unmounts without attaching a late Blob", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationLocalAudioControl.tsx");
  assert.match(source, /keepRecordingRef/);
  assert.match(source, /keepRecordingRef\.current = false/);
  assert.match(source, /if \(!keepRecording\) \{[\s\S]{0,120}finishProcessing\(\);[\s\S]{0,80}return;/);
  assert.match(source, /for \(const track of streamRef\.current\?\.getTracks\(\) \?\? \[\]\) track\.stop\(\)/);
  assert.doesNotMatch(source, /fetch\(|\/api\/|text-to-speech|AI Tutor/i);
});

test("a microphone grant that resolves after unmount is stopped before MediaRecorder starts", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationLocalAudioControl.tsx");
  assert.match(source, /const stream = await navigator\.mediaDevices\.getUserMedia/);
  assert.match(source, /if \(!mountedRef\.current\) \{\s*for \(const track of stream\.getTracks\(\)\) track\.stop\(\);\s*finishProcessing\(\);\s*return;\s*\}/);
});

test("microphone recording stops at the same 100MB local-audio ceiling as file attach", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationLocalAudioControl.tsx");
  assert.match(source, /teacherVisualizationMaximumLocalAudioBytes/);
  assert.match(source, /recordedBytesRef/);
  assert.match(source, /AUDIO_TOO_LARGE/);
  assert.match(source, /recorder\.stop\(\)/);
});

test("an undecodable attached audio file is rejected without fabricated duration metadata", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationLocalAudioControl.tsx");
  assert.match(source, /AUDIO_DECODE_FAILED/);
  assert.match(source, /validateTeacherVisualizationAudioDuration/);
  assert.doesNotMatch(source, /audio\.addEventListener\("error", \(\) => settle\(0\.001\)/);
});

test("file and microphone narration both require decoded media duration with a bounded metadata watchdog", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationLocalAudioControl.tsx");
  assert.match(source, /readAudioDuration\(blob\)/);
  assert.match(source, /audioMetadataTimeout/);
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /window\.clearTimeout/);
  assert.match(source, /removeEventListener\("loadedmetadata"/);
  assert.match(source, /removeEventListener\("error"/);
  assert.doesNotMatch(source, /duration && duration > 0/);
  assert.doesNotMatch(source, /performance\.now\(\) - startedAtRef\.current/);
  assert.doesNotMatch(source, /attachBlob\([^\n]+durationSeconds/);
});

test("microphone start has a synchronous latch so double-click cannot orphan a recorder", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationLocalAudioControl.tsx");
  assert.match(source, /startingRef/);
  assert.match(source, /startingRef\.current = true/);
  assert.match(source, /startingRef\.current = false/);
  assert.match(source, /startingRef\.current \|\| recorderRef\.current/);
  assert.match(source, /streamRef\.current = stream/);
});

test("a failed recorder start clears every latch so microphone attach can be retried honestly", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationLocalAudioControl.tsx");
  const catchStart = source.indexOf("classifyTeacherVisualizationMicrophoneStartError");
  assert.equal(catchStart >= 0, true);
  assert.match(source, /recorderRef\.current = null/);
  assert.match(source, /chunksRef\.current = \[\]/);
  assert.match(source, /recordedBytesRef\.current = 0/);
  assert.match(source, /MICROPHONE_START_FAILED/);
  assert.match(source, /MICROPHONE_PERMISSION_DENIED/);
});

test("detaching narration explicitly confirms deletion of current and saved-checkpoint audio", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationLocalAudioControl.tsx");
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  assert.match(source, /window\.confirm/);
  assert.match(source, /all saved checkpoint audio snapshots/);
  assert.match(source, /cannot be undone/);
  assert.match(source, /if \(!confirmed\) return/);
  assert.match(workspace, /deleteTeacherVisualizationAudioRevisions[\s\S]{0,1400}setCheckpoints\(await listTeacherVisualizationCheckpoints/);
});

test("audio decode and hashing hold the workspace revision until Blob and metadata attach together", () => {
  const control = read("components/teacher/visualizations/TeacherVisualizationLocalAudioControl.tsx");
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");

  assert.match(control, /onProcessingChange/);
  assert.match(control, /function beginProcessing[\s\S]{0,220}processingChangeRef\.current\(true\)/);
  assert.match(control, /beginProcessing\(\)[\s\S]{0,300}readAudioDuration\(blob\)/);
  assert.match(control, /function finishProcessing[\s\S]{0,220}processingChangeRef\.current\(false\)/);
  assert.match(control, /finally[\s\S]{0,180}finishProcessing\(\)/);
  assert.match(workspace, /audioProcessingBusyRef\.current/);
  assert.match(workspace, /cloudSaveBusyRef\.current/);
  assert.match(workspace, /audioProcessingTargetRef/);
  assert.match(workspace, /teacherVisualizationAudioProcessingTargetMatches/);
  assert.match(workspace, /audioProcessingBusyRef\.current[\s\S]{0,200}return/);
  assert.match(workspace, /<LocalAudioControl[\s\S]{0,300}onProcessingChange=/);
  assert.match(workspace, /const busy =[^;]*audioProcessingBusy/);
});

test("checkpoint restore requires explicit destructive confirmation before any mutation", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  const restoreStart = workspace.indexOf("async function restoreCheckpoint");
  const restoreEnd = workspace.indexOf("async function deleteCheckpoint", restoreStart);
  const restoreSource = workspace.slice(restoreStart, restoreEnd);

  assert.match(restoreSource, /window\.confirm/);
  assert.match(restoreSource, /current unsaved local working state/);
  assert.match(restoreSource, /package Undo history/);
  assert.match(restoreSource, /cannot be undone with Undo/);
  assert.match(restoreSource, /if \(!confirmed\) return/);
  assert.equal(
    restoreSource.indexOf("if (!confirmed) return") < restoreSource.indexOf("ensureTeacherVisualizationDraftWriterLease"),
    true,
    "cancel must return before lease renewal or IndexedDB/state mutation"
  );
  assert.equal(
    restoreSource.indexOf("if (!confirmed) return") < restoreSource.indexOf("restoreTeacherVisualizationCheckpoint"),
    true
  );
});

test("invariant and numeric fields preserve keyboard intermediate states until blur or Enter commit", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  const editors = read("components/teacher/visualizations/TeacherVisualizationStructuredEditors.tsx");

  assert.match(workspace, /normalizeTeacherVisualizationInvariants/);
  assert.match(workspace, /type: "set-invariants"[\s\S]{0,180}split\("\\n"\)/);
  assert.match(workspace, /onBlur=[\s\S]{0,220}normalizeTeacherVisualizationInvariants/);
  assert.match(editors, /function DeferredNumberInput/);
  assert.match(editors, /function DeferredCommaListInput/);
  assert.match(editors, /inputMode="decimal"/);
  assert.match(editors, /commitTeacherVisualizationNumberDraft/);
  assert.match(editors, /normalizeTeacherVisualizationCommaListDraft/);
  assert.match(editors, /onBlur=\{commit\}/);
  assert.match(editors, /event\.key === "Enter"[\s\S]{0,100}blur\(\)/);
  assert.doesNotMatch(editors, /function numberValue/);
  assert.doesNotMatch(editors, /Number\(event\.target\.value\)/);
});

test("same-draft parallel tabs fail closed before autosave or cloud save and retain an export path", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  const indexedDb = read("lib/client/teacherVisualizationDraftIndexedDb.ts");
  assert.match(workspace, /claimTeacherVisualizationDraftWriterLease/);
  assert.match(workspace, /putTeacherVisualizationDraftRevisionIfWriter/);
  assert.match(workspace, /writerLeaseState !== "held"/);
  assert.match(workspace, /Another tab owns this draft's local writer lease/);
  assert.match(workspace, /Export current local copy/);
  assert.match(indexedDb, /writer-leases/);
  assert.match(workspace, /if \(result\.ok\)[\s\S]{0,500}ensureTeacherVisualizationDraftWriterLease/);
  assert.match(workspace, /replaceTeacherVisualizationWorkingCopyIfWriter/);
  assert.match(workspace, /replaceLocalCheckpointWithServerDraft[\s\S]{0,500}replaceTeacherVisualizationWorkingCopyIfWriter/);
});

test("checkpoint and audio operations block cloud save and use atomic writer-guarded storage", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  const indexedDb = read("lib/client/teacherVisualizationDraftIndexedDb.ts");

  assert.match(workspace, /checkpointBusyRef\.current/);
  assert.match(workspace, /audioProcessingBusyRef\.current/);
  assert.match(workspace, /async function saveDraft\(\)[\s\S]{0,260}checkpointBusyRef\.current/);
  assert.match(workspace, /async function saveDraft\(\)[\s\S]{0,300}audioProcessingBusyRef\.current/);
  assert.match(workspace, /cloudSaveBusyRef\.current = true[\s\S]{0,260}ensureTeacherVisualizationDraftWriterLease/);
  assert.match(workspace, /finally[\s\S]{0,160}cloudSaveBusyRef\.current = false/);
  assert.match(workspace, /handleAudioProcessingChange[\s\S]{0,220}cloudSaveBusyRef\.current/);
  assert.match(workspace, /const busy =[^;]*checkpointBusy[^;]*audioProcessingBusy/);
  assert.match(workspace, /createTeacherVisualizationCheckpoint\([\s\S]{0,180}writerId/);
  assert.match(workspace, /restoreTeacherVisualizationCheckpoint\([\s\S]{0,180}writerId/);
  assert.match(workspace, /deleteTeacherVisualizationCheckpoint\([\s\S]{0,180}writerId/);
  assert.match(indexedDb, /createTeacherVisualizationCheckpoint[\s\S]{0,600}writerStore/);
  assert.match(indexedDb, /restoreTeacherVisualizationCheckpoint[\s\S]{0,600}writerStore/);
  assert.match(indexedDb, /deleteTeacherVisualizationCheckpoint[\s\S]{0,600}writerStore/);
  for (const [name, nextName] of [
    ["storeCheckpoint", "restoreCheckpoint"],
    ["restoreCheckpoint", "deleteCheckpoint"],
    ["deleteCheckpoint", "validateCurrentPackage"]
  ] as const) {
    const start = workspace.indexOf(`async function ${name}`);
    const operation = workspace.slice(start, workspace.indexOf(`function ${nextName}`, start));
    assert.equal(
      operation.indexOf("checkpointBusyRef.current = true")
        < operation.indexOf("ensureTeacherVisualizationDraftWriterLease"),
      true,
      `${name} must lock cloud save before its first async lease check`
    );
  }
});

test("opening a stale dirty local copy surfaces a conflict instead of silently selecting the server", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  assert.match(source, /reconciledLocal\?\.dirty && reconciledLocal\.baseRevision !== serverResult\.value\.revision/);
  assert.match(source, /type: "save-conflict"/);
  assert.match(source, /serverVersion: serverResult\.value/);
  assert.match(source, /Rebase metadata changes onto server/);
  assert.match(source, /adopt-server-conflict/);
  assert.match(source, /saveConflictAsNewDraft/);
  assert.match(source, /Save local copy as a new draft/);
  assert.match(source, /rebaseMetadataConflict/);
  assert.match(source, /putTeacherVisualizationAudioRevisionIfWriter/);
});

test("local restore and PATCH distinguish metadata dirtiness from package-content dirtiness", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  const model = read("lib/client/teacherVisualizationAuthoringModel.ts");

  assert.match(workspace, /createTeacherVisualizationAuthoringStateFromLocalRevision/);
  assert.match(workspace, /reconcileLegacyTeacherVisualizationLocalDraftDirtiness/);
  assert.doesNotMatch(workspace, /local\.dirty\s*\?\s*applyTeacherVisualizationAuthoringAction[\s\S]{0,160}replace-package/);
  assert.match(workspace, /buildTeacherVisualizationDraftPatch\(beforeSave\)/);
  assert.match(model, /packageContentDirty/);
  assert.match(model, /metadataDirty/);
  assert.match(workspace, /state\.syncState === "clean"/);
  assert.match(workspace, /!currentState\.packageContentDirty && !currentState\.metadataDirty/);
});

test("all AnimationStep fields are structured and destructive type switches expose per-path A06 handoffs", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationStructuredEditors.tsx");

  for (const field of [
    "compositionId",
    "trackerId",
    "targetValue",
    "easing",
    "conceptId",
    "formulaTokenIds",
    "fromValue",
    "objectId",
    "pathObjectId",
    "targetObjectId",
    "lagRatio",
    "path",
    "shotId",
    "holdOnWait",
    "ignorePresenterMode",
    "maxTime",
    "note",
    "presenterMode",
    "presenterReleaseAfterFrames",
    "stopConditionId",
    "stopConditionSatisfiedAt"
  ]) assert.match(source, new RegExp(field), field);

  assert.match(source, /analyzeTeacherVisualizationAnimationTypeSwitch/);
  assert.match(source, /A06_EXTENSION_REQUIRED/);
  assert.match(source, /handoff\.path/);
});

test("caption beat selection updates canonical beatId and hidden beatIndex atomically", () => {
  const source = read("components/teacher/visualizations/TeacherVisualizationStructuredEditors.tsx");

  assert.match(source, /canonicalMathSceneBeatId/);
  assert.match(source, /beatIndex/);
  assert.match(source, /beatId:\s*canonicalMathSceneBeatId\(beatIndex\)/);
  assert.doesNotMatch(source, /value=\{cue\.beatId\}[\s\S]{0,180}beatId:\s*event\.target\.value/);
});

test("package edits invalidate prior validation and capability UI shows exact handoff paths", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");

  assert.match(workspace, /teacherVisualizationActionInvalidatesPackageValidation/);
  assert.match(workspace, /setValidationPassed\(false\)/);
  assert.match(workspace, /setValidationErrors\(\[\]\)/);
  assert.match(workspace, /preservedHandoffPaths/);
  assert.match(workspace, /handoffPath/);
});

test("exact A06 handoffs include semantic ordered-array reorder operations", () => {
  const model = read("lib/client/teacherVisualizationAuthoringModel.ts");
  for (const path of [
    "scene.objects.$reorder",
    "scene.formulas.$reorder",
    "scene.formulas[${index}].tokens.$reorder",
    "scene.cameraShots.$reorder",
    "scene.timeline.$reorder",
    "captions.$reorder"
  ]) assert.equal(model.includes(path), true, path);
});

test("capture and product labels are evidence-derived and never expose a nonexistent CLI", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  const downloads = read("lib/client/teacherVisualizationDownloads.ts");

  assert.match(workspace, /deriveTeacherVisualizationAuthoringProductStatus/);
  assert.match(workspace, /v3 authoring workbench/);
  assert.doesNotMatch(workspace, />v3 RC · \{state\.syncState\}/);
  assert.match(workspace, /captureCapability\.code/);
  assert.match(downloads, /A10_A22_CAPTURE_HARNESS_REQUIRED/);
  assert.doesNotMatch(workspace, /render-mais-manim-mp4\.mjs/);
  assert.doesNotMatch(downloads, /render-mais-manim-mp4\.mjs/);
  assert.match(workspace, /An MP4 CLI scaffold is present/);
  assert.match(workspace, /capture route is integrated and verified/);
  assert.match(workspace, /WebM executor remains unconnected/);
  assert.doesNotMatch(workspace, /No WebM or MP4 command exists/);
});

test("temporary invalid captions cannot throw from render and keep downloads unavailable until validation", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");

  assert.match(workspace, /tryBuildTeacherVisualizationDownloadArtifacts/);
  assert.match(workspace, /validationPassed/);
  assert.match(workspace, /downloadArtifactsResult\.ok/);
  assert.match(workspace, /CAPTION_EXPORT_VALIDATION_REQUIRED/);
  assert.doesNotMatch(workspace, /const artifacts = buildTeacherVisualizationDownloadArtifacts\(state\.title, state\.packageJson\)/);
});

test("detach and archive clear bounded local IndexedDB data", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  const list = read("components/teacher/visualizations/TeacherVisualizationDraftList.tsx");

  assert.match(workspace, /deleteTeacherVisualizationAudioRevisions/);
  assert.match(workspace, /await deleteTeacherVisualizationAudioRevisions/);
  assert.match(list, /hasDirtyTeacherVisualizationDraftRevisions/);
  assert.match(list, /deleteTeacherVisualizationLocalDraftData/);
  assert.match(list, /archive-blocked-unsynced-local-copy/);
  assert.match(list, /baseRevision: draft\.revision/);
  assert.match(workspace, /Audio attach and detach reset package undo history/);
});

test("conflict choices never convert a dirty local package into a force-overwrite patch", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");

  assert.match(workspace, /state\.packageContentDirty/);
  assert.match(workspace, /Save local copy as a new draft/);
  assert.match(workspace, /Export local copy/);
  assert.match(workspace, /resolveConflictWithServerVersion/);
  assert.match(workspace, /replaceTeacherVisualizationWorkingCopyIfWriter/);
  assert.match(workspace, /copyTeacherVisualizationCheckpointsToDraft/);
  assert.match(workspace, /putTeacherVisualizationDraftRevision/);
});

test("conflict resolution preserves explicit checkpoints and copies them into save-as-new drafts", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  assert.match(workspace, /replaceLocalCheckpointWithServerDraft[\s\S]{0,900}replaceTeacherVisualizationWorkingCopyIfWriter/);
  assert.doesNotMatch(workspace, /replaceLocalCheckpointWithServerDraft[\s\S]{0,900}deleteTeacherVisualizationLocalDraftData/);
  assert.match(workspace, /copyTeacherVisualizationCheckpointsToDraft\([\s\S]{0,300}fromDraftId: conflictState\.draftId/);
  assert.match(workspace, /Saved checkpoints remain available/);
});

test("conflict actions lock synchronously and revalidate exact conflict identity after deferred leases", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  assert.match(workspace, /conflictResolutionBusyRef/);
  assert.match(workspace, /captureTeacherVisualizationConflictOperationTarget/);
  assert.match(workspace, /awaitTeacherVisualizationConflictOperationLease/);
  assert.match(workspace, /teacherVisualizationConflictOperationTargetMatches/);
  assert.match(workspace, /function dispatch[\s\S]{0,180}conflictResolutionBusyRef\.current[\s\S]{0,80}return/);
  for (const [name, nextName] of [
    ["resolveConflictWithServerVersion", "saveConflictAsNewDraft"],
    ["saveConflictAsNewDraft", "detachAudio"]
  ] as const) {
    const start = workspace.indexOf(`async function ${name}`);
    const operation = workspace.slice(start, workspace.indexOf(`async function ${nextName}`, start));
    assert.equal(
      operation.indexOf("conflictResolutionBusyRef.current = true")
        < operation.indexOf("awaitTeacherVisualizationConflictOperationLease"),
      true,
      `${name} must synchronously lock before its first lease await`
    );
    assert.match(operation, /stateRef\.current/);
    assert.match(operation, /conflictResolutionOperationIsCurrent/);
  }
});

test("recovery cards are re-read after lease claim and stale save or delete confirmations abort", () => {
  const list = read("components/teacher/visualizations/TeacherVisualizationDraftList.tsx");
  assert.match(list, /getLatestTeacherVisualizationDraftRevision/);
  assert.match(list, /loadTeacherVisualizationLocalDraftRevisionIfUnchanged/);
  assert.match(list, /local-recovery-changed-refresh-required/);
  const deleteStart = list.indexOf("async function deleteLocalRecovery");
  const recoverStart = list.indexOf("async function recoverLocalDraftAsNew");
  const deleteSource = list.slice(deleteStart, recoverStart);
  const recoverSource = list.slice(recoverStart, list.indexOf("return (", recoverStart));
  assert.equal(
    deleteSource.indexOf("claimTeacherVisualizationDraftWriterLease")
      < deleteSource.indexOf("loadTeacherVisualizationLocalDraftRevisionIfUnchanged"),
    true
  );
  assert.equal(
    deleteSource.lastIndexOf("loadTeacherVisualizationLocalDraftRevisionIfUnchanged")
      < deleteSource.indexOf("deleteTeacherVisualizationLocalDraftDataIfWriter"),
    true
  );
  assert.equal(
    recoverSource.indexOf("claimTeacherVisualizationDraftWriterLease")
      < recoverSource.indexOf("loadTeacherVisualizationLocalDraftRevisionIfUnchanged"),
    true
  );
  assert.match(recoverSource, /createTeacherVisualizationAuthoringStateFromLocalRevision\([\s\S]{0,180}freshLocalDraft/);
  assert.match(recoverSource, /fromRevision: freshLocalDraft\.revision/);
  assert.equal(
    recoverSource.lastIndexOf("loadTeacherVisualizationLocalDraftRevisionIfUnchanged")
      < recoverSource.indexOf("migrateLocalTeacherVisualizationDraft"),
    true
  );
});

test("local-only offline drafts are visible and reopen the exact local draft id", () => {
  const list = read("components/teacher/visualizations/TeacherVisualizationDraftList.tsx");
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");

  assert.match(list, /listLatestLocalTeacherVisualizationDraftRevisions/);
  assert.match(list, /Local-only drafts and recovery copies/);
  assert.match(list, /encodeURIComponent\(localDraft\.draftId\)/);
  assert.match(list, /Local only/);
  assert.match(workspace, /await putTeacherVisualizationDraftRevision/);
});

test("explicit checkpoints use unique local versions and can be listed and restored", () => {
  const workspace = read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx");
  const indexedDb = read("lib/client/teacherVisualizationDraftIndexedDb.ts");

  assert.match(indexedDb, /checkpointStore: "checkpoints"/);
  assert.match(indexedDb, /createTeacherVisualizationCheckpoint/);
  assert.match(indexedDb, /listTeacherVisualizationCheckpoints/);
  assert.match(indexedDb, /restoreTeacherVisualizationCheckpoint/);
  assert.match(indexedDb, /deleteTeacherVisualizationCheckpoint/);
  assert.match(indexedDb, /teacherVisualizationMaximumCheckpointsPerDraft/);
  assert.match(workspace, /createTeacherVisualizationCheckpoint/);
  assert.match(workspace, /listTeacherVisualizationCheckpoints/);
  assert.match(workspace, /restoreTeacherVisualizationCheckpoint/);
  assert.match(workspace, /Saved checkpoints/);
  assert.match(workspace, /Restore checkpoint/);
  assert.match(workspace, /Delete checkpoint/);
  assert.match(read("components/teacher/visualizations/TeacherVisualizationDraftList.tsx"), /checkpoint versions and local audio bytes/);
});

test("an archived cloud id with retained local data remains discoverable without a PATCH path", () => {
  const list = read("components/teacher/visualizations/TeacherVisualizationDraftList.tsx");

  assert.match(list, /Archived\/conflicted local recovery/);
  assert.match(list, /Save recovery as new/);
  assert.match(list, /Export recovery JSON/);
  assert.match(list, /Delete local data/);
  assert.match(list, /recoverLocalDraftAsNew/);
  assert.match(list, /isLocalTeacherVisualizationDraftId\(localDraft\.draftId\)/);
  assert.match(list, /cloud-archived-local-copy-retained/);
  assert.match(list, /Cloud draft archived; local recovery and checkpoint history were retained/);
  assert.match(list, /buildTeacherVisualizationCopyTitle/);
  assert.match(read("components/teacher/visualizations/TeacherVisualizationAuthoringWorkspace.tsx"), /buildTeacherVisualizationCopyTitle/);
});

test("recovery save-as-new and deletion cannot mutate a copy owned by another editor tab", () => {
  const list = read("components/teacher/visualizations/TeacherVisualizationDraftList.tsx");
  const indexedDb = read("lib/client/teacherVisualizationDraftIndexedDb.ts");

  assert.match(list, /claimTeacherVisualizationDraftWriterLease/);
  assert.match(list, /recoveryWriterIdRef/);
  assert.match(list, /migrateLocalTeacherVisualizationDraft\([\s\S]{0,240}writerId/);
  assert.match(list, /deleteTeacherVisualizationLocalDraftDataIfWriter/);
  assert.match(list, /active-local-writer-conflict/);
  assert.match(indexedDb, /deleteTeacherVisualizationLocalDraftDataIfWriter/);
  assert.match(indexedDb, /deleteTeacherVisualizationLocalDraftDataIfWriter[\s\S]{0,800}writerStore/);
});
