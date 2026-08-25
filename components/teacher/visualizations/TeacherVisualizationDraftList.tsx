"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import {
  archiveTeacherVisualizationDraft,
  createTeacherVisualizationDraft,
  listTeacherVisualizationDrafts
} from "@/lib/client/teacherVisualizationDraftApi";
import {
  claimTeacherVisualizationDraftWriterLease,
  deleteTeacherVisualizationLocalDraftDataIfWriter,
  getLatestTeacherVisualizationDraftRevision,
  hasDirtyTeacherVisualizationDraftRevisions,
  isLocalTeacherVisualizationDraftId,
  listLatestLocalTeacherVisualizationDraftRevisions,
  loadTeacherVisualizationLocalDraftRevisionIfUnchanged,
  migrateLocalTeacherVisualizationDraft,
  putTeacherVisualizationDraftRevisionIfWriter,
  releaseTeacherVisualizationDraftWriterLease,
  type TeacherVisualizationLocalDraftRevision
} from "@/lib/client/teacherVisualizationDraftIndexedDb";
import {
  buildTeacherVisualizationCopyTitle,
  buildTeacherVisualizationDraftPatch,
  buildTeacherVisualizationLocalDraftRevision,
  createTeacherVisualizationAuthoringStateFromDraft,
  createTeacherVisualizationAuthoringStateFromLocalRevision
} from "@/lib/client/teacherVisualizationAuthoringModel";
import {
  buildTeacherVisualizationScenePackageArtifact,
  downloadTeacherVisualizationBlob
} from "@/lib/client/teacherVisualizationDownloads";
import type { TeacherVisualizationDraftRecord } from "@/types";

function createTeacherVisualizationRecoveryWriterId() {
  return `recovery-writer:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

export function TeacherVisualizationDraftList({ userId }: { userId: string }) {
  const { language, t } = useSettings();
  const [drafts, setDrafts] = useState<TeacherVisualizationDraftRecord[]>([]);
  const [localDrafts, setLocalDrafts] = useState<TeacherVisualizationLocalDraftRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);
  const recoveryWriterIdRef = useRef(createTeacherVisualizationRecoveryWriterId());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void Promise.all([
      listTeacherVisualizationDrafts({ signal: controller.signal }),
      listLatestLocalTeacherVisualizationDraftRevisions(userId).catch(() => null)
    ]).then(([result, localResult]) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        const cloudDrafts = result.value.filter((draft) => draft.ownerId === userId && draft.status !== "archived");
        const activeCloudIds = new Set(cloudDrafts.map((draft) => draft.id));
        setDrafts(cloudDrafts);
        setLocalDrafts((localResult ?? []).filter((localDraft) => (
          isLocalTeacherVisualizationDraftId(localDraft.draftId)
          || !activeCloudIds.has(localDraft.draftId)
        )));
        setError(localResult === null ? "local-checkpoint-list-unavailable" : "");
      } else {
        setLocalDrafts(localResult ?? []);
        setError(result.kind === "conflict" ? "unexpected-revision-conflict" : result.message);
      }
      setLoading(false);
    });
    return () => controller.abort();
  }, [userId]);

  async function archiveDraft(draft: TeacherVisualizationDraftRecord) {
    setArchivingId(draft.id);
    let hasDirtyLocalCopy: boolean;
    try {
      hasDirtyLocalCopy = await hasDirtyTeacherVisualizationDraftRevisions(userId, draft.id);
    } catch {
      setError("archive-local-safety-check-failed");
      setArchivingId(null);
      return;
    }
    if (hasDirtyLocalCopy) {
      setError("archive-blocked-unsynced-local-copy");
      setArchivingId(null);
      return;
    }
    const result = await archiveTeacherVisualizationDraft({
      baseRevision: draft.revision,
      draftId: draft.id
    });
    if (result.ok) {
      const remainingDrafts = drafts.filter((entry) => entry.id !== draft.id);
      setDrafts(remainingDrafts);
      try {
        const localRecords = await listLatestLocalTeacherVisualizationDraftRevisions(userId);
        const remainingCloudIds = new Set(remainingDrafts.map((entry) => entry.id));
        setLocalDrafts(localRecords.filter((localDraft) => (
          isLocalTeacherVisualizationDraftId(localDraft.draftId)
          || !remainingCloudIds.has(localDraft.draftId)
        )));
        setError(localRecords.some((localDraft) => localDraft.draftId === draft.id)
          ? "cloud-archived-local-copy-retained"
          : "");
      } catch {
        setError("cloud-archived-local-recovery-list-failed");
      }
    } else {
      setError(result.kind === "conflict" ? "archive-revision-conflict" : result.message);
    }
    setArchivingId(null);
  }

  function exportLocalRecovery(localDraft: TeacherVisualizationLocalDraftRevision) {
    const artifact = buildTeacherVisualizationScenePackageArtifact(localDraft.title, localDraft.packageJson);
    downloadTeacherVisualizationBlob(artifact.fileName, artifact.blob);
  }

  function surfaceChangedLocalRecovery(
    displayed: TeacherVisualizationLocalDraftRevision,
    latest: TeacherVisualizationLocalDraftRevision | undefined,
    errorCode = "local-recovery-changed-refresh-required"
  ) {
    setLocalDrafts((current) => {
      const withoutDisplayed = current.filter((entry) => entry.draftId !== displayed.draftId);
      return latest ? [latest, ...withoutDisplayed] : withoutDisplayed;
    });
    setError(errorCode);
  }

  async function deleteLocalRecovery(localDraft: TeacherVisualizationLocalDraftRevision) {
    if (!window.confirm(t({
      en: "Delete this local recovery copy, checkpoint versions and local audio bytes? This cannot be undone.",
      zh: "刪除此本機復原副本、checkpoint 版本及本機音訊位元組？此操作無法復原。"
    }))) return;
    setRecoveringId(localDraft.draftId);
    try {
      const claimed = await claimTeacherVisualizationDraftWriterLease({
        draftId: localDraft.draftId,
        userId,
        writerId: recoveryWriterIdRef.current
      });
      if (!claimed.ok) {
        setError("active-local-writer-conflict");
        return;
      }
      const claimedSnapshot = await loadTeacherVisualizationLocalDraftRevisionIfUnchanged({
        displayed: localDraft,
        loadLatest: () => getLatestTeacherVisualizationDraftRevision(userId, localDraft.draftId)
      });
      if (!claimedSnapshot.ok) {
        surfaceChangedLocalRecovery(localDraft, claimedSnapshot.latest);
        return;
      }
      const freshLocalDraft = claimedSnapshot.snapshot;
      const beforeDelete = await loadTeacherVisualizationLocalDraftRevisionIfUnchanged({
        displayed: freshLocalDraft,
        loadLatest: () => getLatestTeacherVisualizationDraftRevision(userId, localDraft.draftId)
      });
      if (!beforeDelete.ok) {
        surfaceChangedLocalRecovery(localDraft, beforeDelete.latest);
        return;
      }
      const deleted = await deleteTeacherVisualizationLocalDraftDataIfWriter({
        draftId: localDraft.draftId,
        userId,
        writerId: recoveryWriterIdRef.current
      });
      if (!deleted.ok) {
        setError("active-local-writer-conflict");
        return;
      }
      setLocalDrafts((current) => current.filter((entry) => entry.draftId !== localDraft.draftId));
      setError("");
    } catch {
      setError("local-recovery-delete-failed");
    } finally {
      await releaseTeacherVisualizationDraftWriterLease({
        draftId: localDraft.draftId,
        userId,
        writerId: recoveryWriterIdRef.current
      }).catch(() => undefined);
      setRecoveringId(null);
    }
  }

  async function recoverLocalDraftAsNew(localDraft: TeacherVisualizationLocalDraftRevision) {
    setRecoveringId(localDraft.draftId);
    let leasedDraftId = localDraft.draftId;
    try {
      const claimed = await claimTeacherVisualizationDraftWriterLease({
        draftId: localDraft.draftId,
        userId,
        writerId: recoveryWriterIdRef.current
      });
      if (!claimed.ok) {
        setError("active-local-writer-conflict");
        return;
      }
      const claimedSnapshot = await loadTeacherVisualizationLocalDraftRevisionIfUnchanged({
        displayed: localDraft,
        loadLatest: () => getLatestTeacherVisualizationDraftRevision(userId, localDraft.draftId)
      });
      if (!claimedSnapshot.ok) {
        surfaceChangedLocalRecovery(localDraft, claimedSnapshot.latest);
        return;
      }
      const freshLocalDraft = claimedSnapshot.snapshot;
      const recoveryState = createTeacherVisualizationAuthoringStateFromLocalRevision(
        userId,
        freshLocalDraft.draftId,
        freshLocalDraft
      );
      const recoveryPatch = buildTeacherVisualizationDraftPatch({
        ...recoveryState,
        packageContentDirty: true
      });
      const result = await createTeacherVisualizationDraft({
        packageJson: recoveryPatch.packageJson ?? recoveryState.packageJson,
        status: "editing",
        title: buildTeacherVisualizationCopyTitle(freshLocalDraft.title, "recovered copy")
      });
      if (!result.ok) {
        setError(result.kind === "conflict" ? "unexpected-recovery-conflict" : result.message);
        return;
      }
      const renewedSourceLease = await claimTeacherVisualizationDraftWriterLease({
        draftId: freshLocalDraft.draftId,
        userId,
        writerId: recoveryWriterIdRef.current
      });
      if (!renewedSourceLease.ok) {
        setDrafts((current) => [result.value, ...current.filter((entry) => entry.id !== result.value.id)]);
        setError("recovery-cloud-save-succeeded-local-copy-retained");
        return;
      }
      const beforeMigration = await loadTeacherVisualizationLocalDraftRevisionIfUnchanged({
        displayed: freshLocalDraft,
        loadLatest: () => getLatestTeacherVisualizationDraftRevision(userId, freshLocalDraft.draftId)
      });
      if (!beforeMigration.ok) {
        setDrafts((current) => [result.value, ...current.filter((entry) => entry.id !== result.value.id)]);
        surfaceChangedLocalRecovery(
          localDraft,
          beforeMigration.latest,
          "recovery-cloud-save-succeeded-local-copy-changed"
        );
        return;
      }
      const migrated = await migrateLocalTeacherVisualizationDraft({
        fromDraftId: freshLocalDraft.draftId,
        fromRevision: freshLocalDraft.revision,
        toDraftId: result.value.id,
        toRevision: result.value.revision,
        userId,
        writerId: recoveryWriterIdRef.current
      });
      if (!migrated) {
        setError("active-local-writer-conflict");
        return;
      }
      leasedDraftId = result.value.id;
      const stored = await putTeacherVisualizationDraftRevisionIfWriter({
        ...buildTeacherVisualizationLocalDraftRevision(
          createTeacherVisualizationAuthoringStateFromDraft(userId, result.value)
        ),
        dirty: false
      }, recoveryWriterIdRef.current);
      if (!stored.ok) {
        setError("active-local-writer-conflict");
        return;
      }
      setLocalDrafts((current) => current.filter((entry) => entry.draftId !== localDraft.draftId));
      setError("");
      setDrafts((current) => [result.value, ...current.filter((entry) => entry.id !== result.value.id)]);
    } catch {
      setError("recovery-cloud-save-succeeded-local-copy-retained");
    } finally {
      await releaseTeacherVisualizationDraftWriterLease({
        draftId: leasedDraftId,
        userId,
        writerId: recoveryWriterIdRef.current
      }).catch(() => undefined);
      setRecoveringId(null);
    }
  }

  return (
    <main className="grid min-w-0 gap-5" data-teacher-visualization-draft-list>
      <section className="glass-panel overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              MAIS Manim v3 authoring workbench · Beta
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              {t({ en: "Visualization studio", zh: "數學動畫創作室" })}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t({
                en: "Create one bounded teaching draft at a time. Drafts never publish directly to learner courses.",
                zh: "每次只建立一個有界教學草稿；草稿不會直接進入學生課程。"
              })}
            </p>
          </div>
          <Link href="/teacher/visualizations/new" className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950">
            {t({ en: "New bounded draft", zh: "新增有界草稿" })}
          </Link>
        </div>
      </section>

      {!loading && localDrafts.length ? (
        <section className="glass-panel min-w-0 p-5 sm:p-6" aria-label={t({ en: "Local-only drafts and recovery copies", zh: "僅本機草稿與復原副本" })}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">{t({ en: "Local-only drafts and recovery copies", zh: "僅本機草稿與復原副本" })}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{t({ en: "Archived local data is retained visibly until you export, save it as new, or delete it explicitly.", zh: "已封存的本機資料會保持可見，直至你匯出、另存新稿或明確刪除。" })}</p>
            </div>
            <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-100">{localDrafts.length}</span>
          </div>
          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {localDrafts.map((localDraft) => (
              <article key={localDraft.draftId} className="soft-panel flex min-w-0 flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-800 dark:text-amber-100">{isLocalTeacherVisualizationDraftId(localDraft.draftId) ? "Local only" : "Archived/conflicted local recovery"}</span>
                  <span className="text-xs font-bold text-slate-500">{localDraft.dirty ? "unsynced" : "offline copy"}</span>
                </div>
                <h3 className="break-words text-base font-black text-slate-950 dark:text-white">{localDraft.title}</h3>
                <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{localDraft.packageJson.brief.singleLearningObjective}</p>
                {isLocalTeacherVisualizationDraftId(localDraft.draftId) ? (
                  <Link href={`/teacher/visualizations/${encodeURIComponent(localDraft.draftId)}`} className="focus-ring mt-auto inline-flex min-h-10 items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-slate-950">
                    {t({ en: "Recover local draft", zh: "復原本機草稿" })}
                  </Link>
                ) : (
                  <div className="mt-auto grid gap-2">
                    <button type="button" disabled={recoveringId === localDraft.draftId} onClick={() => void recoverLocalDraftAsNew(localDraft)} className="focus-ring min-h-10 rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-50">Save recovery as new</button>
                    <button type="button" disabled={recoveringId === localDraft.draftId} onClick={() => exportLocalRecovery(localDraft)} className="focus-ring min-h-10 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-50 dark:border-white/10 dark:text-slate-300">Export recovery JSON</button>
                    <button type="button" disabled={recoveringId === localDraft.draftId} onClick={() => void deleteLocalRecovery(localDraft)} className="focus-ring min-h-10 rounded-full border border-rose-200 px-4 py-2 text-xs font-black text-rose-700 disabled:opacity-50 dark:border-rose-300/20 dark:text-rose-200">Delete local data</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="glass-panel min-w-0 p-5 sm:p-6" aria-busy={loading}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">
            {t({ en: "Your cloud drafts", zh: "你的雲端草稿" })}
          </h2>
          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-200">
            {drafts.length}
          </span>
        </div>

        {error ? (
          <div
            role={error === "cloud-archived-local-copy-retained" ? "status" : "alert"}
            className={error === "cloud-archived-local-copy-retained"
              ? "mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/[0.08] dark:text-amber-100"
              : "mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 dark:border-rose-300/20 dark:bg-rose-300/[0.08] dark:text-rose-100"}
          >
            {error === "cloud-archived-local-copy-retained"
              ? t({
                en: "Cloud draft archived; local recovery and checkpoint history were retained on this device.",
                zh: "雲端草稿已封存；本機復原副本與 checkpoint 歷史仍保留於此裝置。"
              })
              : error === "archive-blocked-unsynced-local-copy"
              ? t({
                en: "Archive was blocked because this device has unsynced edits. Open the editor to save or export that copy first.",
                zh: "此裝置仍有未同步修改，因此已阻止封存；請先開啟編輯器儲存或匯出該副本。"
              })
              : t({ en: `Draft operation failed (${error}). Local copies remain on this device.`, zh: `草稿操作失敗（${error}）；本機副本仍保留於此裝置。` })}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-label={t({ en: "Loading drafts", zh: "正在載入草稿" })}>
            {[0, 1].map((key) => <div key={key} className="h-36 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-white/[0.06]" />)}
          </div>
        ) : drafts.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-white/15">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">
              {t({ en: "No active drafts yet", zh: "尚未有進行中的草稿" })}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t({ en: "Start from the existing unit-circle to sine-wave golden scene.", zh: "可從現有「單位圓到正弦波」黃金場景開始。" })}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {drafts.map((draft) => (
              <article key={draft.id} className="soft-panel flex min-w-0 flex-col gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-950/[0.06] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                      {draft.status}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">r{draft.revision}</span>
                  </div>
                  <h3 className="mt-3 break-words text-base font-black text-slate-950 dark:text-white">{draft.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {draft.packageJson.brief.singleLearningObjective}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {new Intl.DateTimeFormat(language === "en" ? "en-HK" : language === "zh-Hans" ? "zh-CN" : "zh-HK", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(new Date(draft.updatedAt))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/teacher/visualizations/${encodeURIComponent(draft.id)}`} className="focus-ring rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950">
                    {t({ en: "Open editor", zh: "開啟編輯器" })}
                  </Link>
                  <button
                    type="button"
                    disabled={archivingId === draft.id}
                    onClick={() => void archiveDraft(draft)}
                    className="focus-ring rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
                  >
                    {t({ en: "Archive", zh: "封存" })}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
