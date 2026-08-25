"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import type { TeacherVisualizationDraftRecord } from "@/types";
import {
  validateMathScenePackageV3,
  type MathSceneLocalAudioMetadata,
  type MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import {
  analyzeTeacherVisualizationAuthoringCapability,
  applyTeacherVisualizationAuthoringAction,
  awaitTeacherVisualizationConflictOperationLease,
  buildTeacherVisualizationCopyTitle,
  buildTeacherVisualizationDraftPatch,
  buildTeacherVisualizationLocalDraftRevision,
  captureTeacherVisualizationConflictOperationTarget,
  createGoldenTrigVisualizationAuthoringState,
  createTeacherVisualizationAuthoringStateFromDraft,
  createTeacherVisualizationAuthoringStateFromLocalRevision,
  deriveTeacherVisualizationAuthoringProductStatus,
  normalizeTeacherVisualizationInvariants,
  teacherVisualizationActionInvalidatesPackageValidation,
  teacherVisualizationConflictOperationTargetMatches,
  type TeacherVisualizationAuthoringAction,
  type TeacherVisualizationConflictOperationTarget,
  type TeacherVisualizationAuthoringState
} from "@/lib/client/teacherVisualizationAuthoringModel";
import {
  createTeacherVisualizationDraft,
  getTeacherVisualizationDraft,
  patchTeacherVisualizationDraft
} from "@/lib/client/teacherVisualizationDraftApi";
import {
  claimTeacherVisualizationDraftWriterLease,
  copyTeacherVisualizationCheckpointsToDraft,
  createTeacherVisualizationCheckpoint,
  deleteTeacherVisualizationAudioRevisionsIfWriter,
  deleteTeacherVisualizationCheckpoint,
  getLatestTeacherVisualizationDraftRevision,
  getTeacherVisualizationAudioRevision,
  isLocalTeacherVisualizationDraftId,
  listTeacherVisualizationCheckpoints,
  migrateLocalTeacherVisualizationDraft,
  putTeacherVisualizationAudioRevisionIfWriter,
  putTeacherVisualizationDraftRevisionIfWriter,
  reconcileLegacyTeacherVisualizationLocalDraftDirtiness,
  releaseTeacherVisualizationDraftWriterLease,
  replaceTeacherVisualizationWorkingCopyIfWriter,
  restoreTeacherVisualizationCheckpoint,
  type TeacherVisualizationLocalAudioRevision,
  type TeacherVisualizationLocalCheckpoint
} from "@/lib/client/teacherVisualizationDraftIndexedDb";
import {
  buildTeacherVisualizationScenePackageArtifact,
  downloadTeacherVisualizationBlob,
  teacherVisualizationCaptureCapability,
  tryBuildTeacherVisualizationDownloadArtifacts
} from "@/lib/client/teacherVisualizationDownloads";
import {
  captureTeacherVisualizationAudioProcessingTarget,
  teacherVisualizationAudioProcessingTargetMatches,
  type TeacherVisualizationAudioProcessingTarget
} from "@/lib/client/teacherVisualizationLocalAudio";
import {
  TeacherVisualizationObjectsAndLocalizationEditor,
  TeacherVisualizationTimelineAndCaptionEditor
} from "./TeacherVisualizationStructuredEditors";

type GoldenPreviewProps = { labId?: string; topicId?: string };
const ExistingGoldenPreview = dynamic<GoldenPreviewProps>(
  () => import("@/components/visualizations/ConfiguredVisualizationLab")
    .then((module) => module.ConfiguredVisualizationLabDirect as ComponentType<GoldenPreviewProps>),
  {
    loading: () => <div className="grid min-h-[360px] place-items-center rounded-3xl bg-slate-100 text-sm font-black text-slate-500 dark:bg-white/[0.05] dark:text-slate-300">Loading existing golden preview…</div>,
    ssr: false
  }
);

const LocalAudioControl = dynamic(
  () => import("./TeacherVisualizationLocalAudioControl"),
  {
    loading: () => <div className="h-36 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-white/[0.06]" />,
    ssr: false
  }
);

type Props = {
  draftId?: string;
  userId: string;
};

type StepId =
  | "course-objective"
  | "misconception-invariants"
  | "objects-formulas-localization"
  | "timeline-camera-captions-audio"
  | "validate-preview-export";

const steps: Array<{ id: StepId; en: string; zh: string }> = [
  { id: "course-objective", en: "Course & objective", zh: "課程與目標" },
  { id: "misconception-invariants", en: "Misconception & invariants", zh: "誤解與不變量" },
  { id: "objects-formulas-localization", en: "Objects & labels", zh: "物件與標籤" },
  { id: "timeline-camera-captions-audio", en: "Timeline & narration", zh: "時間軸與旁白" },
  { id: "validate-preview-export", en: "Validate & export", zh: "驗證與匯出" }
];

const fieldClass = "focus-ring min-h-11 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.07] dark:text-white";
const primaryButton = "focus-ring inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-slate-950";
const secondaryButton = "focus-ring inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200";
const captureCapability = teacherVisualizationCaptureCapability();
const teacherVisualizationDraftWriterHeartbeatMilliseconds = 5_000;

function createTeacherVisualizationDraftWriterId() {
  return `writer:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

function errorMessage(result: { kind: string; message?: string }) {
  return result.message ?? result.kind;
}

export function TeacherVisualizationAuthoringWorkspace({ userId, draftId }: Props) {
  const router = useRouter();
  const { t } = useSettings();
  const [state, setState] = useState<TeacherVisualizationAuthoringState | null>(() => (
    draftId ? null : createGoldenTrigVisualizationAuthoringState(userId)
  ));
  const [activeStep, setActiveStep] = useState<StepId>("course-objective");
  const [loadError, setLoadError] = useState("");
  const [localStoreWarning, setLocalStoreWarning] = useState("");
  const [validationErrors, setValidationErrors] = useState<Array<{ code: string; message: string; path: string }>>([]);
  const [validationPassed, setValidationPassed] = useState(false);
  const [audioNeedsReattach, setAudioNeedsReattach] = useState(false);
  const [checkpointMessage, setCheckpointMessage] = useState("");
  const [checkpoints, setCheckpoints] = useState<TeacherVisualizationLocalCheckpoint[]>([]);
  const [checkpointBusy, setCheckpointBusy] = useState(false);
  const [audioProcessingBusy, setAudioProcessingBusy] = useState(false);
  const [cloudSaveOperationBusy, setCloudSaveOperationBusy] = useState(false);
  const [selectedBeat, setSelectedBeat] = useState(0);
  const [conflictResolutionBusy, setConflictResolutionBusy] = useState(false);
  const [writerLeaseState, setWriterLeaseState] = useState<"acquiring" | "conflict" | "held" | "unavailable">("acquiring");
  const writerIdRef = useRef(createTeacherVisualizationDraftWriterId());
  const checkpointBusyRef = useRef(false);
  const audioProcessingBusyRef = useRef(false);
  const cloudSaveBusyRef = useRef(false);
  const conflictResolutionBusyRef = useRef(false);
  const conflictResolutionOperationRef = useRef<TeacherVisualizationConflictOperationTarget | null>(null);
  const audioProcessingTargetRef = useRef<TeacherVisualizationAudioProcessingTarget | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function handleAudioProcessingChange(processing: boolean) {
    if (processing) {
      const current = stateRef.current;
      audioProcessingTargetRef.current = captureTeacherVisualizationAudioProcessingTarget(
        current,
        cloudSaveBusyRef.current || conflictResolutionBusyRef.current
      );
    } else {
      audioProcessingTargetRef.current = null;
    }
    audioProcessingBusyRef.current = processing;
    setAudioProcessingBusy(processing);
  }

  const capability = useMemo(
    () => state ? analyzeTeacherVisualizationAuthoringCapability(state.packageJson) : null,
    [state]
  );
  const productStatus = useMemo(
    () => state ? deriveTeacherVisualizationAuthoringProductStatus(state.packageJson) : null,
    [state]
  );
  const downloadArtifactsResult = useMemo(() => {
    if (!state || !validationPassed) {
      return {
        errorCode: "CAPTION_EXPORT_VALIDATION_REQUIRED" as const,
        message: "Validate the current package before building caption downloads.",
        ok: false as const
      };
    }
    return tryBuildTeacherVisualizationDownloadArtifacts(state.title, state.packageJson);
  }, [state, validationPassed]);

  function dispatch(action: Parameters<typeof applyTeacherVisualizationAuthoringAction>[1]) {
    if (conflictResolutionBusyRef.current) return;
    if (teacherVisualizationActionInvalidatesPackageValidation(action)) {
      setValidationPassed(false);
      setValidationErrors([]);
    }
    setState((current) => current ? applyTeacherVisualizationAuthoringAction(current, action) : current);
  }

  function conflictResolutionOperationIsCurrent(target: TeacherVisualizationConflictOperationTarget) {
    return conflictResolutionOperationRef.current === target
      && teacherVisualizationConflictOperationTargetMatches(target, stateRef.current);
  }

  function commitConflictResolutionAction(
    target: TeacherVisualizationConflictOperationTarget,
    action: TeacherVisualizationAuthoringAction
  ) {
    const current = stateRef.current;
    if (!conflictResolutionOperationIsCurrent(target) || !current) return false;
    const next = applyTeacherVisualizationAuthoringAction(current, action);
    stateRef.current = next;
    setState(next);
    return true;
  }

  useEffect(() => {
    if (!draftId) return;
    const controller = new AbortController();
    setLoadError("");
    void (async () => {
      const [serverResult, local] = await Promise.all([
        getTeacherVisualizationDraft({ draftId, signal: controller.signal }),
        getLatestTeacherVisualizationDraftRevision(userId, draftId).catch(() => undefined)
      ]);
      if (controller.signal.aborted) return;
      if (serverResult.ok) {
        if (serverResult.value.ownerId !== userId) {
          setLoadError("visualization-draft-owner-mismatch");
          return;
        }
        const reconciledLocal = local
          ? reconcileLegacyTeacherVisualizationLocalDraftDirtiness(local, serverResult.value.packageJson)
          : undefined;
        if (reconciledLocal?.dirty && reconciledLocal.baseRevision !== serverResult.value.revision) {
          const restored = createTeacherVisualizationAuthoringStateFromLocalRevision(userId, draftId, reconciledLocal);
          setState(applyTeacherVisualizationAuthoringAction(restored, {
            type: "save-conflict",
            currentRevision: serverResult.value.revision,
            serverVersion: serverResult.value
          }));
          setLocalStoreWarning(t({
            en: "This device has unsynced edits based on an older revision. The local copy was preserved for conflict review.",
            zh: "此裝置有基於較舊版本的未同步編輯；本機副本已保留以供衝突檢視。"
          }));
        } else if (reconciledLocal?.dirty && reconciledLocal.baseRevision === serverResult.value.revision) {
          setState(createTeacherVisualizationAuthoringStateFromLocalRevision(userId, draftId, reconciledLocal));
          setLocalStoreWarning(t({ en: "Recovered an unsynced local copy.", zh: "已復原尚未同步的本機副本。" }));
        } else {
          setState(createTeacherVisualizationAuthoringStateFromDraft(userId, serverResult.value));
        }
        return;
      }
      if (local) {
        setState(createTeacherVisualizationAuthoringStateFromLocalRevision(userId, draftId, local));
        setLoadError(t({ en: "Cloud draft is unavailable; editing the local copy offline.", zh: "雲端草稿暫不可用；現正離線編輯本機副本。" }));
      } else {
        setLoadError(errorMessage(serverResult));
      }
    })();
    return () => controller.abort();
  }, [draftId, t, userId]);

  useEffect(() => {
    const activeDraftId = state?.draftId;
    if (!activeDraftId) {
      setWriterLeaseState("acquiring");
      return;
    }
    let active = true;
    setWriterLeaseState("acquiring");
    const claimLease = async () => {
      try {
        const result = await claimTeacherVisualizationDraftWriterLease({
          draftId: activeDraftId,
          userId,
          writerId: writerIdRef.current
        });
        if (!active) return;
        setWriterLeaseState(result.ok ? "held" : "conflict");
      } catch {
        if (active) setWriterLeaseState("unavailable");
      }
    };
    void claimLease();
    const interval = window.setInterval(() => void claimLease(), teacherVisualizationDraftWriterHeartbeatMilliseconds);
    const releaseOnPageHide = () => {
      void releaseTeacherVisualizationDraftWriterLease({
        draftId: activeDraftId,
        userId,
        writerId: writerIdRef.current
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", releaseOnPageHide, { once: true });
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("pagehide", releaseOnPageHide);
    };
  }, [state?.draftId, userId]);

  useEffect(() => {
    if (
      !state
      || writerLeaseState !== "held"
      || state.syncState === "clean"
      || state.syncState === "loading"
      || state.syncState === "saving"
    ) return;
    const timer = window.setTimeout(() => {
      void putTeacherVisualizationDraftRevisionIfWriter(
        buildTeacherVisualizationLocalDraftRevision(state),
        writerIdRef.current
      ).then((result) => {
        if (!result.ok) setWriterLeaseState("conflict");
      }).catch(() => {
        setWriterLeaseState("unavailable");
        setLocalStoreWarning(t({ en: "Offline draft storage is unavailable in this browser.", zh: "此瀏覽器無法使用離線草稿儲存。" }));
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state, t, writerLeaseState]);

  async function ensureTeacherVisualizationDraftWriterLease(activeDraftId: string) {
    try {
      const result = await claimTeacherVisualizationDraftWriterLease({
        draftId: activeDraftId,
        userId,
        writerId: writerIdRef.current
      });
      setWriterLeaseState(result.ok ? "held" : "conflict");
      return result.ok;
    } catch {
      setWriterLeaseState("unavailable");
      return false;
    }
  }

  useEffect(() => {
    const audio = state?.packageJson.audio;
    if (!state || !audio || audio.source === "none") {
      setAudioNeedsReattach(false);
      return;
    }
    let active = true;
    void getTeacherVisualizationAudioRevision(userId, state.draftId, state.revision)
      .then((record) => {
        if (active) setAudioNeedsReattach(!record || record.contentHash !== audio.contentHash);
      })
      .catch(() => {
        if (active) setAudioNeedsReattach(true);
      });
    return () => { active = false; };
  }, [state?.draftId, state?.packageJson.audio, state?.revision, userId]);

  useEffect(() => {
    const activeDraftId = state?.draftId;
    if (!activeDraftId) {
      setCheckpoints([]);
      return;
    }
    let active = true;
    void listTeacherVisualizationCheckpoints(userId, activeDraftId)
      .then((storedCheckpoints) => {
        if (active) setCheckpoints(storedCheckpoints);
      })
      .catch(() => {
        if (active) {
          setCheckpoints([]);
          setCheckpointMessage(t({
            en: "Saved checkpoints could not be listed on this device.",
            zh: "無法列出此裝置上的 checkpoint。"
          }));
        }
      });
    return () => { active = false; };
  }, [state?.draftId, t, userId]);

  async function storeCheckpoint() {
    if (
      !state
      || conflictResolutionBusyRef.current
      || checkpointBusyRef.current
      || audioProcessingBusyRef.current
      || cloudSaveBusyRef.current
      || writerLeaseState !== "held"
    ) return;
    checkpointBusyRef.current = true;
    setCheckpointBusy(true);
    try {
      if (!await ensureTeacherVisualizationDraftWriterLease(state.draftId)) return;
      const result = await createTeacherVisualizationCheckpoint(
        buildTeacherVisualizationLocalDraftRevision(state),
        { writerId: writerIdRef.current }
      );
      if (!result.ok) {
        setWriterLeaseState("conflict");
        return;
      }
      setCheckpoints(await listTeacherVisualizationCheckpoints(userId, state.draftId));
      setCheckpointMessage(t({
        en: "Versioned local checkpoint saved. Later autosave will not overwrite it.",
        zh: "已儲存具版本的本機 checkpoint；後續自動儲存不會覆寫它。"
      }));
    } catch {
      setCheckpointMessage(t({ en: "Checkpoint could not be stored.", zh: "無法儲存 checkpoint。" }));
    } finally {
      checkpointBusyRef.current = false;
      setCheckpointBusy(false);
    }
  }

  async function restoreCheckpoint(checkpoint: TeacherVisualizationLocalCheckpoint) {
    if (
      !state
      || conflictResolutionBusyRef.current
      || checkpointBusyRef.current
      || audioProcessingBusyRef.current
      || cloudSaveBusyRef.current
      || writerLeaseState !== "held"
    ) return;
    if (checkpoint.userId !== userId || checkpoint.draftId !== state.draftId) {
      setCheckpointMessage("checkpoint-owner-or-draft-mismatch");
      return;
    }
    const confirmed = window.confirm(t({
      en: "Restore this checkpoint? It replaces the current unsaved local working state and package Undo history. Save a checkpoint first if you need the current state. This cannot be undone with Undo.",
      zh: "復原此 checkpoint？這會取代目前未儲存的本機工作狀態及草稿 Undo 歷史。如需保留目前狀態，請先另存 checkpoint。此操作不能以 Undo 復原。"
    }));
    if (!confirmed) return;
    checkpointBusyRef.current = true;
    setCheckpointBusy(true);
    try {
      if (!await ensureTeacherVisualizationDraftWriterLease(state.draftId)) return;
      const result = await restoreTeacherVisualizationCheckpoint(
        checkpoint,
        writerIdRef.current
      );
      if (!result.ok) {
        setWriterLeaseState("conflict");
        return;
      }
      const restored = result.revision;
      setState(createTeacherVisualizationAuthoringStateFromLocalRevision(userId, state.draftId, restored));
      setValidationPassed(false);
      setValidationErrors([]);
      setAudioNeedsReattach(
        restored.packageJson.audio.source !== "none"
        && checkpoint.audioRevision?.contentHash !== restored.packageJson.audio.contentHash
      );
      setCheckpointMessage(t({
        en: "Checkpoint restored exactly as unsynced editing content. Validate before saving.",
        zh: "已將 checkpoint 精確復原為未同步的編輯內容；儲存前請重新驗證。"
      }));
    } catch {
      setCheckpointMessage(t({ en: "Checkpoint could not be restored.", zh: "無法復原 checkpoint。" }));
    } finally {
      checkpointBusyRef.current = false;
      setCheckpointBusy(false);
    }
  }

  async function deleteCheckpoint(checkpoint: TeacherVisualizationLocalCheckpoint) {
    if (
      !state
      || conflictResolutionBusyRef.current
      || checkpointBusyRef.current
      || audioProcessingBusyRef.current
      || cloudSaveBusyRef.current
      || writerLeaseState !== "held"
    ) return;
    if (checkpoint.userId !== userId || checkpoint.draftId !== state.draftId) return;
    if (!window.confirm(t({
      en: "Delete this local checkpoint and its private audio snapshot? This cannot be undone.",
      zh: "刪除此本機 checkpoint 及其私人音訊快照？此操作無法復原。"
    }))) return;
    checkpointBusyRef.current = true;
    setCheckpointBusy(true);
    try {
      if (!await ensureTeacherVisualizationDraftWriterLease(state.draftId)) return;
      const result = await deleteTeacherVisualizationCheckpoint(
        checkpoint,
        writerIdRef.current
      );
      if (!result.ok) {
        setWriterLeaseState("conflict");
        return;
      }
      setCheckpoints(await listTeacherVisualizationCheckpoints(userId, state.draftId));
      setCheckpointMessage(t({ en: "Checkpoint deleted from this device.", zh: "已從此裝置刪除 checkpoint。" }));
    } catch {
      setCheckpointMessage(t({ en: "Checkpoint could not be deleted.", zh: "無法刪除 checkpoint。" }));
    } finally {
      checkpointBusyRef.current = false;
      setCheckpointBusy(false);
    }
  }

  function validateCurrentPackage() {
    if (!state) return false;
    const result = validateMathScenePackageV3(state.packageJson);
    if (result.ok) {
      setValidationErrors([]);
      setValidationPassed(true);
      return true;
    }
    setValidationErrors(result.errors);
    setValidationPassed(false);
    return false;
  }

  async function saveDraft() {
    const currentState = stateRef.current;
    if (
      !currentState
      || conflictResolutionBusyRef.current
      || checkpointBusyRef.current
      || audioProcessingBusyRef.current
      || cloudSaveBusyRef.current
      || writerLeaseState !== "held"
      || currentState.syncState === "saving"
      || currentState.syncState === "conflict"
    ) return;
    if (
      !isLocalTeacherVisualizationDraftId(currentState.draftId)
      && !currentState.packageContentDirty && !currentState.metadataDirty
    ) return;
    if (!validateCurrentPackage()) {
      setActiveStep("validate-preview-export");
      return;
    }
    cloudSaveBusyRef.current = true;
    setCloudSaveOperationBusy(true);
    try {
      const beforeSave = currentState;
      if (!await ensureTeacherVisualizationDraftWriterLease(beforeSave.draftId)) return;
      try {
      const localWrite = await putTeacherVisualizationDraftRevisionIfWriter(
        buildTeacherVisualizationLocalDraftRevision(beforeSave),
        writerIdRef.current
      );
      if (!localWrite.ok) {
        setWriterLeaseState("conflict");
        return;
      }
    } catch {
      setWriterLeaseState("unavailable");
      setLocalStoreWarning(t({
        en: "Cloud save was stopped because this tab could not prove its local writer lease.",
        zh: "此分頁無法證明其本機寫入租約，因此已停止雲端儲存。"
      }));
      return;
      }
      dispatch({ type: "save-started" });
      const draftPatch = buildTeacherVisualizationDraftPatch(beforeSave);
      const result = isLocalTeacherVisualizationDraftId(beforeSave.draftId)
        ? await createTeacherVisualizationDraft({
          packageJson: draftPatch.packageJson ?? beforeSave.packageJson,
          status: beforeSave.status,
          title: beforeSave.title
        })
        : await patchTeacherVisualizationDraft(draftPatch);

    if (result.ok) {
      const stillOwnsPreSaveDraft = await ensureTeacherVisualizationDraftWriterLease(beforeSave.draftId);
      if (stillOwnsPreSaveDraft) {
        try {
          const cleanRecord = {
            ...buildTeacherVisualizationLocalDraftRevision(
              createTeacherVisualizationAuthoringStateFromDraft(userId, result.value)
            ),
            dirty: false
          };
          if (isLocalTeacherVisualizationDraftId(beforeSave.draftId)) {
            const migrated = await migrateLocalTeacherVisualizationDraft({
              fromDraftId: beforeSave.draftId,
              fromRevision: beforeSave.revision,
              toDraftId: result.value.id,
              toRevision: result.value.revision,
              userId,
              writerId: writerIdRef.current
            });
            if (!migrated) {
              setWriterLeaseState("conflict");
              throw new Error("active-writer-conflict");
            }
            const exactServerWrite = await putTeacherVisualizationDraftRevisionIfWriter(
              cleanRecord,
              writerIdRef.current
            );
            if (!exactServerWrite.ok) {
              setWriterLeaseState("conflict");
              throw new Error("active-writer-conflict");
            }
          } else {
            const localAudio = beforeSave.packageJson.audio.source === "none"
              ? undefined
              : await getTeacherVisualizationAudioRevision(
                userId,
                beforeSave.draftId,
                beforeSave.revision
              ).catch(() => undefined);
            const localCommit = await replaceTeacherVisualizationWorkingCopyIfWriter({
              audioRevision: localAudio,
              record: cleanRecord,
              writerId: writerIdRef.current
            });
            if (!localCommit.ok) {
              setWriterLeaseState("conflict");
              throw new Error("active-writer-conflict");
            }
          }
        } catch {
          setLocalStoreWarning(t({
            en: "Cloud save succeeded, but this tab lost or could not prove its local writer lease, so it did not overwrite the newer local working copy.",
            zh: "雲端儲存成功，但此分頁已失去或無法證明本機寫入租約，因此沒有覆寫較新的本機工作副本。"
          }));
        }
      } else {
        setLocalStoreWarning(t({
          en: "Cloud save succeeded, but another tab now owns the local writer lease. This tab left that newer local working copy untouched.",
          zh: "雲端儲存成功，但另一分頁現已持有本機寫入租約；本分頁未改動該較新的本機工作副本。"
        }));
      }
      dispatch({ type: "save-succeeded", draft: result.value });
      if (isLocalTeacherVisualizationDraftId(beforeSave.draftId)) {
        router.replace(`/teacher/visualizations/${encodeURIComponent(result.value.id)}`);
      }
      return;
    }
    if (result.kind === "conflict") {
      dispatch({
        type: "save-conflict",
        currentRevision: result.conflict.currentRevision,
        serverVersion: result.conflict.serverVersion
      });
      return;
    }
      dispatch({ type: "save-failed", errorCode: errorMessage(result) });
    } finally {
      cloudSaveBusyRef.current = false;
      setCloudSaveOperationBusy(false);
    }
  }

  async function attachAudio(metadata: Exclude<MathSceneLocalAudioMetadata, { source: "none" }>, blob: Blob) {
    const target = audioProcessingTargetRef.current;
    let current = stateRef.current;
    if (
      !current
      || conflictResolutionBusyRef.current
      || writerLeaseState !== "held"
      || !teacherVisualizationAudioProcessingTargetMatches(target, current)
    ) return false;
    if (!await ensureTeacherVisualizationDraftWriterLease(current.draftId)) return false;
    current = stateRef.current;
    if (!current || !teacherVisualizationAudioProcessingTargetMatches(target, current)) return false;
    const targetDraftId = current.draftId;
    const targetRevision = current.revision;
    const localWrite = await putTeacherVisualizationAudioRevisionIfWriter({
      blob,
      contentHash: metadata.contentHash,
      draftId: targetDraftId,
      fileName: metadata.fileName,
      mimeType: metadata.mimeType,
      revision: targetRevision,
      userId
    }, writerIdRef.current);
    if (!localWrite.ok) {
      setWriterLeaseState("conflict");
      return false;
    }
    if (!teacherVisualizationAudioProcessingTargetMatches(target, stateRef.current)) {
      setLocalStoreWarning(t({
        en: "Audio bytes were preserved at the original revision, but metadata was not attached because the draft revision changed.",
        zh: "音訊位元組已保留於原 revision，但因草稿 revision 已變更，沒有附加其中繼資料。"
      }));
      return false;
    }
    dispatch({ type: "set-audio", audio: metadata });
    setAudioNeedsReattach(false);
    return true;
  }

  async function findMatchingConflictAudio(
    conflictState: TeacherVisualizationAuthoringState,
    packageJson: MathScenePackageV3
  ): Promise<TeacherVisualizationLocalAudioRevision | undefined> {
    if (packageJson.audio.source === "none") return undefined;
    const revisions = conflictState.conflict
      ? [conflictState.conflict.currentRevision, conflictState.revision]
      : [conflictState.revision];
    for (const revision of [...new Set(revisions)]) {
      const record = await getTeacherVisualizationAudioRevision(
        userId,
        conflictState.draftId,
        revision
      ).catch(() => undefined);
      if (record?.contentHash === packageJson.audio.contentHash) return record;
    }
    return undefined;
  }

  async function rebaseMetadataConflict() {
    const current = stateRef.current;
    if (
      !current?.conflict
      || current.packageContentDirty
      || conflictResolutionBusyRef.current
      || checkpointBusyRef.current
      || audioProcessingBusyRef.current
      || cloudSaveBusyRef.current
      || writerLeaseState !== "held"
    ) return;
    const operationTarget = captureTeacherVisualizationConflictOperationTarget(current, "rebase-metadata");
    if (!operationTarget) return;
    conflictResolutionBusyRef.current = true;
    conflictResolutionOperationRef.current = operationTarget;
    setConflictResolutionBusy(true);
    try {
      const leaseCurrent = await awaitTeacherVisualizationConflictOperationLease({
        ensureLease: ensureTeacherVisualizationDraftWriterLease,
        readCurrentState: () => stateRef.current,
        target: operationTarget
      });
      if (!leaseCurrent || !conflictResolutionOperationIsCurrent(operationTarget)) return;
      const conflictState = stateRef.current;
      if (!conflictState) return;
      const serverVersion = operationTarget.conflict.serverVersion;
      const matchingAudio = await findMatchingConflictAudio(conflictState, serverVersion.packageJson);
      if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
      if (matchingAudio) {
        const copied = await putTeacherVisualizationAudioRevisionIfWriter({
          ...matchingAudio,
          draftId: conflictState.draftId,
          revision: serverVersion.revision,
          userId
        }, writerIdRef.current);
        if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
        if (!copied.ok) {
          setWriterLeaseState("conflict");
          return;
        }
      }
      if (!commitConflictResolutionAction(operationTarget, { type: "keep-local-conflict-copy" })) return;
      setAudioNeedsReattach(serverVersion.packageJson.audio.source !== "none" && !matchingAudio);
    } finally {
      if (conflictResolutionOperationRef.current === operationTarget) {
        conflictResolutionOperationRef.current = null;
        conflictResolutionBusyRef.current = false;
        setConflictResolutionBusy(false);
      }
    }
  }

  async function replaceLocalCheckpointWithServerDraft(
    draft: TeacherVisualizationDraftRecord,
    audio?: TeacherVisualizationLocalAudioRevision
  ) {
    const cleanState = createTeacherVisualizationAuthoringStateFromDraft(userId, draft);
    const result = await replaceTeacherVisualizationWorkingCopyIfWriter({
      audioRevision: audio,
      record: {
        ...buildTeacherVisualizationLocalDraftRevision(cleanState),
        dirty: false
      },
      writerId: writerIdRef.current
    });
    if (!result.ok) {
      setWriterLeaseState("conflict");
      return false;
    }
    return true;
  }

  async function resolveConflictWithServerVersion() {
    const current = stateRef.current;
    if (
      !current?.conflict
      || conflictResolutionBusyRef.current
      || checkpointBusyRef.current
      || audioProcessingBusyRef.current
      || cloudSaveBusyRef.current
      || writerLeaseState !== "held"
    ) return;
    const operationTarget = captureTeacherVisualizationConflictOperationTarget(current, "use-server");
    if (!operationTarget) return;
    conflictResolutionBusyRef.current = true;
    conflictResolutionOperationRef.current = operationTarget;
    setConflictResolutionBusy(true);
    try {
      const leaseCurrent = await awaitTeacherVisualizationConflictOperationLease({
        ensureLease: ensureTeacherVisualizationDraftWriterLease,
        readCurrentState: () => stateRef.current,
        target: operationTarget
      });
      if (!leaseCurrent || !conflictResolutionOperationIsCurrent(operationTarget)) return;
      const conflictState = stateRef.current;
      if (!conflictState) return;
      const serverVersion = operationTarget.conflict.serverVersion;
      const serverAudio = await findMatchingConflictAudio(
        conflictState,
        serverVersion.packageJson
      );
      if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
      const replaced = await replaceLocalCheckpointWithServerDraft(
        serverVersion,
        serverAudio
      );
      if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
      if (!replaced) {
        setLocalStoreWarning(t({
          en: "The server version was not written locally because another tab owns this draft. The existing local copy remains untouched.",
          zh: "另一分頁持有此草稿，因此沒有在本機寫入伺服器版本；現有本機副本維持不變。"
        }));
        return;
      }
      if (!commitConflictResolutionAction(operationTarget, { type: "adopt-server-conflict" })) return;
      setLocalStoreWarning("");
    } catch {
      if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
      setLocalStoreWarning(t({
        en: "The server version was selected, but this device could not replace its stale offline conflict copy.",
        zh: "已選用伺服器版本，但此裝置無法替換過期的離線衝突副本。"
      }));
      commitConflictResolutionAction(operationTarget, { type: "adopt-server-conflict" });
    } finally {
      if (conflictResolutionOperationRef.current === operationTarget) {
        conflictResolutionOperationRef.current = null;
        conflictResolutionBusyRef.current = false;
        setConflictResolutionBusy(false);
      }
    }
  }

  async function saveConflictAsNewDraft() {
    const current = stateRef.current;
    if (
      !current?.conflict
      || conflictResolutionBusyRef.current
      || checkpointBusyRef.current
      || audioProcessingBusyRef.current
      || cloudSaveBusyRef.current
      || writerLeaseState !== "held"
    ) return;
    const operationTarget = captureTeacherVisualizationConflictOperationTarget(current, "save-as-new");
    if (!operationTarget) return;
    conflictResolutionBusyRef.current = true;
    conflictResolutionOperationRef.current = operationTarget;
    setConflictResolutionBusy(true);
    try {
      const leaseCurrent = await awaitTeacherVisualizationConflictOperationLease({
        ensureLease: ensureTeacherVisualizationDraftWriterLease,
        readCurrentState: () => stateRef.current,
        target: operationTarget
      });
      if (!leaseCurrent || !conflictResolutionOperationIsCurrent(operationTarget)) return;
      const conflictState = stateRef.current;
      if (!conflictState) return;
      const serverVersion = operationTarget.conflict.serverVersion;
      const draftPatch = buildTeacherVisualizationDraftPatch(conflictState);
      const result = await createTeacherVisualizationDraft({
        packageJson: draftPatch.packageJson ?? conflictState.packageJson,
        status: conflictState.packageContentDirty ? "editing" : conflictState.status,
        title: buildTeacherVisualizationCopyTitle(conflictState.title, "conflict copy")
      });
      if (!conflictResolutionOperationIsCurrent(operationTarget)) {
        if (result.ok) {
          setLocalStoreWarning(t({
            en: "A new cloud copy was created, but this conflict changed while the request was in flight. The newer local edit was preserved and no local copy was replaced.",
            zh: "請求進行期間衝突內容已變更；雲端副本雖已建立，但較新的本機修改已保留，亦沒有替換任何本機副本。"
          }));
        }
        return;
      }
      if (!result.ok) {
        setLocalStoreWarning(t({
          en: `The local conflict copy could not be saved as a new draft (${errorMessage(result)}).`,
          zh: `無法將本機衝突副本另存為新草稿（${errorMessage(result)}）。`
        }));
        return;
      }
      const sourceLeaseCurrent = await awaitTeacherVisualizationConflictOperationLease({
        ensureLease: ensureTeacherVisualizationDraftWriterLease,
        readCurrentState: () => stateRef.current,
        target: operationTarget
      });
      if (!sourceLeaseCurrent || !conflictResolutionOperationIsCurrent(operationTarget)) {
        setLocalStoreWarning(t({
          en: "The new cloud draft was saved, but another tab now owns or changed the original local copy. Local checkpoints and working state were left untouched.",
          zh: "新雲端草稿已儲存，但另一分頁現已持有或變更原本本機副本；本機 checkpoint 與工作狀態均未被修改。"
        }));
        return;
      }
      const [localAudio, serverAudio] = await Promise.all([
        findMatchingConflictAudio(conflictState, conflictState.packageJson),
        findMatchingConflictAudio(conflictState, serverVersion.packageJson)
      ]);
      if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
      if (!await ensureTeacherVisualizationDraftWriterLease(result.value.id)) {
        setLocalStoreWarning(t({
          en: "The new cloud draft was saved, but another tab opened it before checkpoint copy. Its local checkpoints and working state were not touched.",
          zh: "新雲端草稿已儲存，但另一分頁已在複製 checkpoint 前開啟該草稿；其本機 checkpoint 與工作狀態未被修改。"
        }));
        return;
      }
      if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
      const copiedCheckpoints = await copyTeacherVisualizationCheckpointsToDraft({
        fromDraftId: conflictState.draftId,
        toDraftId: result.value.id,
        toRevision: result.value.revision,
        userId,
        writerId: writerIdRef.current
      });
      if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
      if (!copiedCheckpoints.ok) {
        setLocalStoreWarning(t({
          en: "The new cloud draft was saved, but checkpoint copy stopped because a writer lease changed. Both local checkpoint sets were preserved.",
          zh: "新雲端草稿已儲存，但因寫入租約已變更而停止複製 checkpoint；兩邊的本機 checkpoint 均獲保留。"
        }));
        return;
      }
      if (!await replaceLocalCheckpointWithServerDraft(result.value, localAudio)) {
        throw new Error("active-writer-conflict");
      }
      if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
      const originalLeaseCurrent = await awaitTeacherVisualizationConflictOperationLease({
        ensureLease: ensureTeacherVisualizationDraftWriterLease,
        readCurrentState: () => stateRef.current,
        target: operationTarget
      });
      if (!originalLeaseCurrent || !conflictResolutionOperationIsCurrent(operationTarget)) {
        throw new Error("active-writer-conflict");
      }
      if (!await replaceLocalCheckpointWithServerDraft(serverVersion, serverAudio)) {
        throw new Error("active-writer-conflict");
      }
      if (!conflictResolutionOperationIsCurrent(operationTarget)) return;
      if (!commitConflictResolutionAction(operationTarget, { type: "save-succeeded", draft: result.value })) return;
      setAudioNeedsReattach(result.value.packageJson.audio.source !== "none");
      router.replace(`/teacher/visualizations/${encodeURIComponent(result.value.id)}`);
    } catch {
      if (conflictResolutionOperationIsCurrent(operationTarget)) {
        setLocalStoreWarning(t({
          en: "The new draft was saved, but this device could not safely finish checkpoint copy or replace the original conflict working state.",
          zh: "新草稿已儲存，但此裝置無法安全完成 checkpoint 複製或替換原有衝突工作狀態。"
        }));
      }
    } finally {
      if (conflictResolutionOperationRef.current === operationTarget) {
        conflictResolutionOperationRef.current = null;
        conflictResolutionBusyRef.current = false;
        setConflictResolutionBusy(false);
      }
    }
  }

  async function detachAudio() {
    const target = audioProcessingTargetRef.current;
    let current = stateRef.current;
    if (
      !current
      || conflictResolutionBusyRef.current
      || writerLeaseState !== "held"
      || !teacherVisualizationAudioProcessingTargetMatches(target, current)
    ) return false;
    if (!await ensureTeacherVisualizationDraftWriterLease(current.draftId)) return false;
    current = stateRef.current;
    if (!current || !teacherVisualizationAudioProcessingTargetMatches(target, current)) return false;
    const targetDraftId = current.draftId;
    try {
      const deleted = await deleteTeacherVisualizationAudioRevisionsIfWriter({
        draftId: targetDraftId,
        userId,
        writerId: writerIdRef.current
      });
      if (!deleted.ok) {
        setWriterLeaseState("conflict");
        return false;
      }
    } catch {
      setLocalStoreWarning(t({
        en: "Narration could not be detached because its local Blob could not be deleted. Try again.",
        zh: "無法刪除本機旁白 Blob，因此尚未解除旁白；請重試。"
      }));
      return false;
    }
    if (!teacherVisualizationAudioProcessingTargetMatches(target, stateRef.current)) return false;
    try {
      setCheckpoints(await listTeacherVisualizationCheckpoints(userId, targetDraftId));
    } catch {
      setCheckpoints([]);
      setLocalStoreWarning(t({
        en: "Narration was detached, but the audio-free checkpoint list could not be refreshed. Reload before restoring a checkpoint.",
        zh: "旁白已移除，但無法重新整理已清除音訊的 checkpoint 清單；復原 checkpoint 前請重新載入。"
      }));
    }
    dispatch({ type: "set-audio", audio: { source: "none" } });
    setAudioNeedsReattach(false);
    return true;
  }

  function downloadScenePackage(packageJson: MathScenePackageV3, title: string) {
    const artifact = buildTeacherVisualizationScenePackageArtifact(title, packageJson);
    downloadTeacherVisualizationBlob(artifact.fileName, artifact.blob);
  }

  if (!state) {
    return (
      <main className="glass-panel grid min-h-[360px] place-items-center p-8 text-center" aria-busy="true">
        <div><p className="text-sm font-black text-slate-800 dark:text-slate-100">{t({ en: "Loading visualization draft…", zh: "正在載入動畫草稿…" })}</p>{loadError ? <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-200">{loadError}</p> : null}</div>
      </main>
    );
  }

  const writerLeaseBlocked = writerLeaseState === "conflict" || writerLeaseState === "unavailable";
  const busy = state.syncState === "saving"
    || conflictResolutionBusy
    || checkpointBusy
    || audioProcessingBusy
    || cloudSaveOperationBusy
    || writerLeaseState !== "held";
  const currentStepIndex = steps.findIndex((step) => step.id === activeStep);
  const artifacts = downloadArtifactsResult.ok ? downloadArtifactsResult.value : null;

  return (
    <main className="grid min-w-0 gap-5" data-teacher-visualization-authoring-workspace>
      <section className="glass-panel min-w-0 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-black text-amber-800 dark:text-amber-100">
                v3 authoring workbench · {productStatus?.label ?? "Beta"} · {state.syncState}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">r{state.revision}</span>
            </div>
            <label className="mt-4 grid max-w-3xl gap-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
              {t({ en: "Draft title", zh: "草稿標題" })}
              <input value={state.title} disabled={busy} onChange={(event) => dispatch({ type: "set-title", title: event.target.value })} className={`${fieldClass} text-lg font-black normal-case tracking-normal`} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={state.status} disabled={busy || state.syncState === "conflict"} onChange={(event) => dispatch({ type: "set-status", status: event.target.value as "editing" | "ready-for-review" })} className={secondaryButton} aria-label={t({ en: "Draft review status", zh: "草稿評審狀態" })}>
              <option value="editing">editing</option>
              <option value="ready-for-review">ready-for-review</option>
            </select>
            <button type="button" disabled={busy || state.syncState === "clean" || state.syncState === "conflict"} onClick={() => void saveDraft()} className={primaryButton}>{state.syncState === "saving" ? t({ en: "Saving…", zh: "儲存中…" }) : t({ en: "Save cloud draft", zh: "儲存雲端草稿" })}</button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10" aria-label={t({ en: "Author controls", zh: "作者控制" })}>
          <select value="three-trig-unit-wave" disabled className={secondaryButton} aria-label={t({ en: "Scene selector", zh: "場景選擇器" })}><option value="three-trig-unit-wave">three-trig-unit-wave · golden starter</option></select>
          <button type="button" disabled={state.historyIndex <= 0 || busy} onClick={() => dispatch({ type: "undo" })} className={secondaryButton}>Undo</button>
          <button type="button" disabled={state.historyIndex >= state.history.length - 1 || busy} onClick={() => dispatch({ type: "redo" })} className={secondaryButton}>Redo</button>
          <button type="button" disabled={busy || checkpointBusy} onClick={() => void storeCheckpoint()} className={secondaryButton}>{checkpointBusy ? t({ en: "Checkpoint working…", zh: "Checkpoint 處理中…" }) : "Checkpoint"}</button>
          <select value={selectedBeat} onChange={(event) => setSelectedBeat(Number(event.target.value))} className={secondaryButton} aria-label={t({ en: "Run from beat", zh: "從節拍執行" })}>{state.packageJson.scene.timeline.map((_step, index) => <option key={index} value={index}>Beat {index + 1}</option>)}</select>
          <button type="button" disabled title="A06_EXTENSION_REQUIRED" className={secondaryButton}>Run from beat {selectedBeat + 1}</button>
          <button type="button" disabled title="A06_EXTENSION_REQUIRED" className={secondaryButton}>Final frame</button>
          {checkpointMessage ? <span role="status" className="text-xs font-bold text-slate-500 dark:text-slate-400">{checkpointMessage}</span> : null}
        </div>
        <details className="mt-3 rounded-2xl border border-slate-200/80 bg-white/50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <summary className="focus-ring cursor-pointer rounded-lg text-xs font-black text-slate-700 dark:text-slate-200">
            {t({ en: `Saved checkpoints (${checkpoints.length})`, zh: `已儲存的 checkpoint（${checkpoints.length}）` })}
          </summary>
          {checkpoints.length ? (
            <ol className="mt-3 grid min-w-0 gap-2">
              {checkpoints.map((checkpoint) => (
                <li key={checkpoint.checkpointId} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.05]">
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <p className="truncate text-xs font-black text-slate-900 dark:text-white">{checkpoint.snapshot.title}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      <time dateTime={checkpoint.createdAt}>{new Date(checkpoint.createdAt).toLocaleString()}</time>
                      {` · base r${checkpoint.snapshot.baseRevision}`}
                      {checkpoint.snapshot.packageJson.audio.source === "none"
                        ? " · no audio"
                        : checkpoint.audioRevision
                          ? " · audio included"
                          : " · audio re-attach required"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy || checkpointBusy} onClick={() => void restoreCheckpoint(checkpoint)} className={secondaryButton}>
                      {t({ en: "Restore checkpoint", zh: "復原 checkpoint" })}
                    </button>
                    <button type="button" disabled={busy || checkpointBusy} onClick={() => void deleteCheckpoint(checkpoint)} className={secondaryButton}>
                      {t({ en: "Delete checkpoint", zh: "刪除 checkpoint" })}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-xs font-semibold text-slate-500">{t({ en: "No versioned checkpoints on this device yet.", zh: "此裝置尚無具版本的 checkpoint。" })}</p>
          )}
        </details>
      </section>

      {writerLeaseBlocked ? (
        <section role="alert" data-local-writer-conflict className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-sm font-bold text-rose-900 dark:border-rose-300/25 dark:bg-rose-300/[0.08] dark:text-rose-100">
          <p>{writerLeaseState === "conflict"
            ? t({
              en: "Another tab owns this draft's local writer lease. Autosave and cloud save are stopped so neither tab can silently overwrite the other. Close the other tab, then wait or reload this one.",
              zh: "另一個分頁持有此草稿的本機寫入租約。自動儲存及雲端儲存已停止，以免兩個分頁互相靜默覆寫。請關閉另一分頁，然後等待或重新載入本頁。"
            })
            : t({
              en: "This tab cannot prove an exclusive local writer lease. Editing, autosave and cloud save are stopped until local storage is available.",
              zh: "此分頁無法證明擁有專用本機寫入租約；在本機儲存恢復前，編輯、自動儲存及雲端儲存已停止。"
            })}</p>
          <button type="button" onClick={() => downloadScenePackage(state.packageJson, `${state.title}-local-writer-conflict`)} className={`${secondaryButton} mt-3`}>
            {t({ en: "Export current local copy", zh: "匯出目前本機副本" })}
          </button>
        </section>
      ) : writerLeaseState === "acquiring" ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
          {t({ en: "Securing this draft's single-tab local writer lease…", zh: "正在取得此草稿的單分頁本機寫入租約……" })}
        </p>
      ) : null}

      {loadError || localStoreWarning ? <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50/85 p-4 text-sm font-bold text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/[0.08] dark:text-amber-100">{loadError || localStoreWarning}</div> : null}

      {state.conflict ? (
        <section role="alert" className="glass-panel border-t-4 border-rose-500 p-5">
          <h2 className="text-lg font-black text-rose-800 dark:text-rose-100">{t({ en: "Revision conflict — local work preserved", zh: "Revision 衝突——本機工作已保留" })}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t({ en: `The server is at revision ${state.conflict.currentRevision}. No force overwrite is available.`, zh: `伺服器目前是 revision ${state.conflict.currentRevision}；此處不提供強制覆寫。` })}</p>
          <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-300">{t({ en: "Saved checkpoints remain available when you use the server version; save-as-new also copies them to the new draft.", zh: "採用伺服器版本時，已儲存的 checkpoint 仍會保留；另存新稿時亦會複製至新草稿。" })}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="soft-panel p-4"><p className="text-xs font-black uppercase text-slate-500">Local copy</p><p className="mt-2 font-black text-slate-900 dark:text-white">{state.title}</p><p className="mt-1 text-xs text-slate-500">base r{state.revision}</p></div>
            <details className="soft-panel p-4"><summary className="focus-ring cursor-pointer rounded-lg text-xs font-black uppercase text-slate-500">Server version · r{state.conflict.serverVersion.revision}</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-700 dark:text-slate-200">{JSON.stringify({ title: state.conflict.serverVersion.title, status: state.conflict.serverVersion.status, brief: state.conflict.serverVersion.packageJson.brief }, null, 2)}</pre></details>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!state.packageContentDirty ? (
              <button type="button" disabled={busy} onClick={() => void rebaseMetadataConflict()} className={secondaryButton}>
                {t({ en: `Rebase metadata changes onto server r${state.conflict.currentRevision}`, zh: `將中繼資料修改重放至伺服器 r${state.conflict.currentRevision}` })}
              </button>
            ) : (
              <p className="basis-full text-xs font-bold text-rose-700 dark:text-rose-200">
                {t({ en: "Package-content conflicts cannot be rebased without a field-level three-way merge. Use the server, save local as new, or export it.", zh: "若沒有逐欄位三方合併，內容衝突不可重放；請採用伺服器版本、另存新稿或匯出本機副本。" })}
              </p>
            )}
            <button type="button" disabled={busy} onClick={() => void resolveConflictWithServerVersion()} className={secondaryButton}>
              {t({ en: "Use server version", zh: "採用伺服器版本" })}
            </button>
            <button type="button" disabled={busy} onClick={() => void saveConflictAsNewDraft()} className={primaryButton}>
              {t({ en: "Save local copy as a new draft", zh: "將本機副本另存為新草稿" })}
            </button>
            <button type="button" disabled={busy} onClick={() => downloadScenePackage(state.packageJson, `${state.title}-local-conflict`)} className={secondaryButton}>
              {t({ en: "Export local copy", zh: "匯出本機副本" })}
            </button>
          </div>
        </section>
      ) : null}

      <section className="glass-panel min-w-0 overflow-hidden">
        <div className="overflow-x-auto border-b border-slate-200/80 p-3 dark:border-white/10">
          <ol className="flex min-w-[760px] gap-2">
            {steps.map((step, index) => <li key={step.id} className="flex-1"><button type="button" data-step-id={step.id} aria-current={activeStep === step.id ? "step" : undefined} onClick={() => setActiveStep(step.id)} className={`focus-ring flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-xs font-black transition ${activeStep === step.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-950/[0.04] text-slate-600 hover:bg-slate-950/[0.07] dark:bg-white/[0.05] dark:text-slate-300"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400/20">{index + 1}</span><span>{t({ en: step.en, zh: step.zh })}</span></button></li>)}
          </ol>
        </div>

        <div className="min-w-0 p-4 sm:p-6">
          {activeStep === "course-objective" ? (
            <div className="grid gap-4" data-authoring-step="course-objective">
              <div><h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "1. Course and one learning objective", zh: "1. 課程與單一學習目標" })}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t({ en: "Natural language starts a brief; it does not publish or replace mathematical confirmation.", zh: "自然語言只用來起草簡報；不會自動發佈，也不取代數學確認。" })}</p></div>
              {([[
                "courseGoal", { en: "Course goal", zh: "課程目標" }
              ], ["singleLearningObjective", { en: "Single learning objective", zh: "單一學習目標" }], ["ageBand", { en: "Age band", zh: "年齡段" }], ["targetSurface", { en: "Target surface", zh: "目標介面" }]] as const).map(([field, label]) => <label key={field} className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t(label)}<textarea rows={field === "singleLearningObjective" ? 3 : 2} disabled={busy} value={state.packageJson.brief[field]} onChange={(event) => dispatch({ type: "set-brief-field", field, value: event.target.value })} className={fieldClass} /></label>)}
            </div>
          ) : null}

          {activeStep === "misconception-invariants" ? (
            <div className="grid gap-4" data-authoring-step="misconception-invariants">
              <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "2. Misconception, learner action and invariants", zh: "2. 誤解、學習者操作與數學不變量" })}</h2>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t({ en: "Misconception", zh: "常見誤解" })}<textarea rows={3} disabled={busy} value={state.packageJson.brief.misconception} onChange={(event) => dispatch({ type: "set-brief-field", field: "misconception", value: event.target.value })} className={fieldClass} /></label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t({ en: "Observable learner action", zh: "可觀察的學習者操作" })}<textarea rows={3} disabled={busy} value={state.packageJson.brief.learnerAction} onChange={(event) => dispatch({ type: "set-brief-field", field: "learnerAction", value: event.target.value })} className={fieldClass} /></label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t({ en: "Mathematical invariants · one per line", zh: "數學不變量 · 每行一項" })}<textarea rows={5} disabled={busy} value={state.packageJson.brief.invariants.join("\n")} onChange={(event) => dispatch({ type: "set-invariants", invariants: event.target.value.split("\n") })} onBlur={(event) => dispatch({ type: "set-invariants", invariants: normalizeTeacherVisualizationInvariants(event.target.value.split("\n")) })} className={fieldClass} /></label>
            </div>
          ) : null}

          {activeStep === "objects-formulas-localization" ? <div data-authoring-step="objects-formulas-localization"><TeacherVisualizationObjectsAndLocalizationEditor disabled={busy} packageJson={state.packageJson} onChange={(packageJson) => dispatch({ type: "replace-package", packageJson })} /></div> : null}

          {activeStep === "timeline-camera-captions-audio" ? (
            <div className="grid gap-5" data-authoring-step="timeline-camera-captions-audio">
              <TeacherVisualizationTimelineAndCaptionEditor disabled={busy} packageJson={state.packageJson} onChange={(packageJson) => dispatch({ type: "replace-package", packageJson })} />
              {audioNeedsReattach ? <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/[0.08] dark:text-amber-100">{t({ en: "This cloud draft has narration metadata, but this device does not have the audio Blob. Re-attach it to include audio in local exports.", zh: "雲端草稿包含旁白中繼資料，但此裝置沒有音訊 Blob；請重新附加，才可在本機匯出中包含音訊。" })}</div> : null}
              <p data-audio-history-contract className="text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                {t({ en: "Audio attach and detach reset package undo history because local audio bytes are not versioned by editor history.", zh: "附加或移除音訊會重設草稿復原歷史，因為本機音訊位元組不會隨編輯器歷史建立版本。" })}
              </p>
              <LocalAudioControl disabled={busy} metadata={state.packageJson.audio} onAttach={attachAudio} onDetach={detachAudio} onProcessingChange={handleAudioProcessingChange} />
            </div>
          ) : null}

          {activeStep === "validate-preview-export" ? (
            <div className="grid gap-5" data-authoring-step="validate-preview-export">
              <div><h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "5. Validate, preview, save and export", zh: "5. 驗證、預覽、儲存與匯出" })}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t({ en: "ready-for-review is a draft status, not teaching approval or release readiness.", zh: "ready-for-review 只是草稿狀態，不代表教學批准或可發佈。" })}</p></div>

              <section className="soft-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Schema validation", zh: "Schema 驗證" })}</h3><button type="button" onClick={validateCurrentPackage} className={secondaryButton}>{t({ en: "Validate package", zh: "驗證 Scene Package" })}</button></div>
                {validationPassed ? <p role="status" className="mt-3 text-sm font-black text-emerald-700 dark:text-emerald-200">{t({ en: "Scene Package structure is valid. Gates remain separate.", zh: "Scene Package 結構有效；各門禁狀態仍須獨立確認。" })}</p> : null}
                {validationErrors.length ? <ul className="mt-3 grid gap-2">{validationErrors.slice(0, 20).map((error, index) => <li key={`${error.path}-${index}`} className="rounded-xl bg-rose-500/10 p-3 text-xs font-bold text-rose-800 dark:text-rose-100"><code>{error.code}</code> · {error.path} · {error.message}</li>)}</ul> : null}
              </section>

              <section data-preview-mode="existing-golden-only" className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-300/20 dark:bg-amber-300/[0.06]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800 dark:text-amber-100">{capability?.code}: {capability?.previewMode}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{t({ en: "The canvas below is the existing golden scene only. It does not claim to render arbitrary edits from this package until the A06 injection handoff lands.", zh: "下方畫布只預覽現有黃金場景；在 A06 注入交接完成前，不會聲稱已呈現此 Scene Package 的任意修改。" })}</p>
                {capability?.preservedHandoffPaths.length ? (
                  <details className="mt-3 rounded-2xl border border-amber-300/50 bg-white/60 p-3 dark:border-amber-200/15 dark:bg-white/[0.04]">
                    <summary className="focus-ring cursor-pointer rounded-lg text-xs font-black text-amber-900 dark:text-amber-100">
                      {capability.preservedHandoffPaths.length} {t({ en: "exact A06 handoff paths", zh: "個精確 A06 交接路徑" })}
                    </summary>
                    <ul className="mt-3 grid max-h-72 gap-1 overflow-auto text-[11px] font-bold text-amber-900 dark:text-amber-100">
                      {capability.preservedHandoffPaths.map((handoffPath) => (
                        <li key={handoffPath}><code>{handoffPath}</code> · A06_EXTENSION_REQUIRED</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </section>
              <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10"><ExistingGoldenPreview labId="s4-trig-wave" topicId="s4-trig-wave" /></div>

              <section className="soft-panel grid gap-4 p-4">
                <h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Export", zh: "匯出" })}</h3>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={!artifacts} onClick={() => {
                    if (artifacts) downloadTeacherVisualizationBlob(artifacts.scenePackage.fileName, artifacts.scenePackage.blob);
                  }} className={primaryButton}>{t({ en: "Download Scene Package", zh: "下載 Scene Package" })}</button>
                  {(artifacts?.captions ?? []).map((caption) => <button key={caption.locale} type="button" onClick={() => downloadTeacherVisualizationBlob(caption.fileName, caption.blob)} className={secondaryButton}>WebVTT · {caption.locale}</button>)}
                  {!artifacts ? <button type="button" disabled title={downloadArtifactsResult.errorCode} className={secondaryButton}>WebVTT · {downloadArtifactsResult.errorCode}</button> : null}
                  <button type="button" disabled title={captureCapability.code} className={secondaryButton}>WebM · {captureCapability.code}</button>
                  <button type="button" disabled title={captureCapability.code} className={secondaryButton}>MP4 · {captureCapability.code}</button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  <p className="font-black">{captureCapability.code}</p>
                  <ul className="mt-2 grid gap-1">
                    {captureCapability.requirements.map((requirement) => <li key={requirement}>· {requirement}</li>)}
                  </ul>
                  <p className="mt-2">{t({
                    en: "An MP4 CLI scaffold is present, but this workbench keeps MP4 disabled until the internal capture route is integrated and verified. The WebM executor remains unconnected.",
                    zh: "MP4 CLI 骨架已存在，但在內部錄製路由完成整合及驗證前，本工作台仍停用 MP4；WebM 執行器亦尚未接通。"
                  })}</p>
                </div>
              </section>

              <section className="soft-panel p-4"><h3 className="text-sm font-black text-slate-950 dark:text-white">Gate ledger</h3><div className="mt-3 grid gap-2 sm:grid-cols-4">{Object.entries(state.packageJson.reviewLedger).map(([gate, entry]) => <div key={gate} className="rounded-2xl border border-slate-200/80 p-3 dark:border-white/10"><p className="text-sm font-black text-slate-900 dark:text-white">{gate}</p><p className="mt-1 text-xs font-bold text-slate-500">{entry.status} · {entry.evidenceIds.length} evidence</p></div>)}</div></section>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
            <button type="button" disabled={currentStepIndex <= 0} onClick={() => setActiveStep(steps[currentStepIndex - 1]!.id)} className={secondaryButton}>{t({ en: "Previous", zh: "上一步" })}</button>
            <span className="text-xs font-black text-slate-500">{currentStepIndex + 1} / {steps.length}</span>
            <button type="button" disabled={currentStepIndex >= steps.length - 1} onClick={() => setActiveStep(steps[currentStepIndex + 1]!.id)} className={primaryButton}>{t({ en: "Next", zh: "下一步" })}</button>
          </div>
        </div>
      </section>
    </main>
  );
}
