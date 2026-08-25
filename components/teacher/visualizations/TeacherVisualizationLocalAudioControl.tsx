"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import type { MathSceneLocalAudioMetadata } from "@/components/visualizations/three/manim/mathScenePackageV3";
import {
  classifyTeacherVisualizationMicrophoneStartError,
  hashTeacherVisualizationAudioBlob,
  normalizeTeacherVisualizationAudioMimeType,
  safeTeacherVisualizationAudioFileName,
  teacherVisualizationMaximumLocalAudioBytes,
  validateTeacherVisualizationAudioDuration,
  validateTeacherVisualizationAudioFile
} from "@/lib/client/teacherVisualizationLocalAudio";

type AttachedAudio = Exclude<MathSceneLocalAudioMetadata, { source: "none" }>;

type Props = {
  disabled?: boolean;
  metadata: MathSceneLocalAudioMetadata;
  onAttach: (metadata: AttachedAudio, blob: Blob) => Promise<boolean> | boolean;
  onDetach: () => Promise<boolean> | boolean;
  onProcessingChange: (processing: boolean) => void;
};

const audioMetadataTimeoutMilliseconds = 8_000;

function supportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mimeType of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
  }
  return "";
}

function readAudioDuration(blob: Blob) {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    let settled = false;
    let timeoutId: number | undefined;
    const handleLoadedMetadata = () => settle(audio.duration);
    const handleError = () => settle(Number.NaN);
    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
    const settle = (duration: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      const validation = validateTeacherVisualizationAudioDuration(duration);
      if (validation.ok) resolve(validation.durationSeconds);
      else reject(new Error("AUDIO_DECODE_FAILED"));
    };
    audio.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    timeoutId = window.setTimeout(handleError, audioMetadataTimeoutMilliseconds);
    try {
      audio.src = url;
      audio.load();
    } catch {
      handleError();
    }
  });
}

export default function TeacherVisualizationLocalAudioControl({
  disabled = false,
  metadata,
  onAttach,
  onDetach,
  onProcessingChange
}: Props) {
  const { t } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBytesRef = useRef(0);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const keepRecordingRef = useRef(false);
  const processingRef = useRef(false);
  const processingChangeRef = useRef(onProcessingChange);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  processingChangeRef.current = onProcessingChange;

  function beginProcessing() {
    if (processingRef.current) return;
    processingRef.current = true;
    processingChangeRef.current(true);
    if (mountedRef.current) setBusy(true);
  }

  function finishProcessing() {
    if (!processingRef.current) return;
    processingRef.current = false;
    processingChangeRef.current(false);
    if (mountedRef.current) setBusy(false);
  }

  function stopTracks() {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      startingRef.current = false;
      keepRecordingRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      recorderRef.current = null;
      chunksRef.current = [];
      recordedBytesRef.current = 0;
      stopTracks();
      if (processingRef.current) {
        processingRef.current = false;
        processingChangeRef.current(false);
      }
    };
  }, []);

  async function attachBlob(blob: Blob, fileName: string, source: AttachedAudio["source"]) {
    const validation = validateTeacherVisualizationAudioFile({
      name: fileName,
      size: blob.size,
      type: blob.type
    });
    if (!validation.ok) {
      setMessage(t({ en: `Audio rejected: ${validation.code}.`, zh: `音訊遭拒：${validation.code}。` }));
      finishProcessing();
      return;
    }
    beginProcessing();
    try {
      const [contentHash, resolvedDuration] = await Promise.all([
        hashTeacherVisualizationAudioBlob(blob),
        readAudioDuration(blob)
      ]);
      const durationValidation = validateTeacherVisualizationAudioDuration(resolvedDuration);
      if (!durationValidation.ok) throw new Error("AUDIO_DECODE_FAILED");
      const attached = await onAttach({
        contentHash,
        durationSeconds: durationValidation.durationSeconds,
        fileName: safeTeacherVisualizationAudioFileName(fileName),
        mimeType: validation.mimeType,
        source
      }, blob);
      if (!attached) throw new Error("AUDIO_ATTACH_REJECTED");
      if (mountedRef.current) setMessage(t({ en: "Narration attached on this device.", zh: "旁白已附加於此裝置。" }));
    } catch (error) {
      if (mountedRef.current) {
        setMessage(error instanceof Error && error.message === "AUDIO_DECODE_FAILED"
          ? t({ en: "Audio rejected: AUDIO_DECODE_FAILED.", zh: "音訊遭拒：AUDIO_DECODE_FAILED。" })
          : error instanceof Error && error.message === "AUDIO_ATTACH_REJECTED"
            ? t({ en: "Audio attach stopped because the draft revision or local writer changed.", zh: "草稿 revision 或本機寫入者已變更，因此停止附加音訊。" })
            : t({ en: "Audio could not be stored locally.", zh: "無法在本機儲存音訊。" }));
      }
    } finally {
      finishProcessing();
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const validation = validateTeacherVisualizationAudioFile(file);
    if (!validation.ok) {
      setMessage(t({ en: `Audio rejected: ${validation.code}.`, zh: `音訊遭拒：${validation.code}。` }));
      return;
    }
    await attachBlob(file, file.name, "local-file");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function startRecording() {
    if (disabled || busy || recording || startingRef.current || recorderRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage(t({ en: "Microphone recording is unavailable; file upload and captions still work.", zh: "此瀏覽器無法錄音；檔案上載與字幕仍可使用。" }));
      return;
    }
    beginProcessing();
    startingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!mountedRef.current) {
        for (const track of stream.getTracks()) track.stop();
        finishProcessing();
        return;
      }
      streamRef.current = stream;
      const requestedMimeType = supportedRecorderMimeType();
      const recorder = requestedMimeType === null
        ? null
        : new MediaRecorder(stream, requestedMimeType ? { mimeType: requestedMimeType } : undefined);
      if (!recorder) {
        stopTracks();
        setMessage(t({ en: "Microphone recording is unsupported; attach a file instead.", zh: "不支援麥克風錄音；請改為附加檔案。" }));
        finishProcessing();
        return;
      }
      recorderRef.current = recorder;
      chunksRef.current = [];
      recordedBytesRef.current = 0;
      keepRecordingRef.current = true;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size <= 0) return;
        const nextRecordedBytes = recordedBytesRef.current + event.data.size;
        if (nextRecordedBytes > teacherVisualizationMaximumLocalAudioBytes) {
          keepRecordingRef.current = false;
          chunksRef.current = [];
          recordedBytesRef.current = 0;
          if (mountedRef.current) {
            setMessage(t({
              en: "Recording stopped: AUDIO_TOO_LARGE (100MB maximum).",
              zh: "錄音已停止：AUDIO_TOO_LARGE（上限 100MB）。"
            }));
          }
          if (recorder.state !== "inactive") recorder.stop();
          return;
        }
        recordedBytesRef.current = nextRecordedBytes;
        chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const keepRecording = keepRecordingRef.current;
        keepRecordingRef.current = false;
        const chunks = chunksRef.current;
        chunksRef.current = [];
        recordedBytesRef.current = 0;
        const blob = new Blob(chunks, { type: normalizeTeacherVisualizationAudioMimeType(recorder.mimeType) ?? "audio/webm" });
        recorderRef.current = null;
        stopTracks();
        if (mountedRef.current) setRecording(false);
        if (!keepRecording) {
          finishProcessing();
          return;
        }
        if (blob.size > 0) {
          void attachBlob(blob, "microphone-narration.webm", "microphone");
          return;
        }
        finishProcessing();
      }, { once: true });
      recorder.start(250);
      setRecording(true);
      setMessage(t({ en: "Recording stays on this device until you stop.", zh: "錄音只留在本裝置，直至你停止錄音。" }));
    } catch (error) {
      keepRecordingRef.current = false;
      const failedRecorder = recorderRef.current;
      if (failedRecorder && failedRecorder.state !== "inactive") {
        try { failedRecorder.stop(); } catch { /* recorder never entered a stoppable state */ }
      }
      recorderRef.current = null;
      chunksRef.current = [];
      recordedBytesRef.current = 0;
      stopTracks();
      if (mountedRef.current) {
        setRecording(false);
        const errorCode = classifyTeacherVisualizationMicrophoneStartError(error);
        setMessage(errorCode === "MICROPHONE_PERMISSION_DENIED"
          ? t({ en: "Microphone permission was denied; captions and file upload still work.", zh: "麥克風權限被拒；字幕與檔案上載仍可使用。" })
          : t({ en: "Microphone could not start (MICROPHONE_START_FAILED). Retry or attach a file.", zh: "麥克風無法啟動（MICROPHONE_START_FAILED）；請重試或附加檔案。" }));
      }
      finishProcessing();
    } finally {
      startingRef.current = false;
    }
  }

  async function confirmDetach() {
    const confirmed = window.confirm(t({
      en: "Detach narration and permanently delete its current local Blob plus all saved checkpoint audio snapshots for this draft? This cannot be undone; package Undo cannot restore the audio bytes.",
      zh: "移除旁白並永久刪除此草稿目前的本機 Blob，以及所有已儲存 checkpoint 的音訊快照？此操作無法復原；草稿 Undo 亦無法恢復音訊位元組。"
    }));
    if (!confirmed) return;
    beginProcessing();
    try {
      const detached = await onDetach();
      if (!detached && mountedRef.current) {
        setMessage(t({ en: "Audio detach stopped because the local writer changed.", zh: "本機寫入者已變更，因此停止移除音訊。" }));
      }
    } catch {
      if (mountedRef.current) setMessage(t({ en: "Audio could not be detached locally.", zh: "無法在本機移除音訊。" }));
    } finally {
      finishProcessing();
    }
  }

  function stopRecording(save: boolean) {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    keepRecordingRef.current = save;
    recorder.stop();
    if (!save) setMessage(t({ en: "Recording cancelled.", zh: "錄音已取消。" }));
  }

  return (
    <section className="soft-panel grid gap-3 p-4" aria-labelledby="local-audio-heading">
      <div>
        <h3 id="local-audio-heading" className="text-sm font-black text-slate-950 dark:text-white">
          {t({ en: "Local narration", zh: "本機旁白" })}
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
          {t({
            en: "Only filename, duration and SHA-256 metadata sync. Audio bytes never enter the cloud draft.",
            zh: "雲端草稿只同步檔名、時長與 SHA-256 中繼資料；音訊位元組不會上傳。"
          })}
        </p>
      </div>
      {metadata.source === "none" ? null : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs font-bold text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-300/[0.08] dark:text-emerald-100">
          {metadata.fileName} · {metadata.durationSeconds.toFixed(1)}s · {metadata.source}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="audio/mp4,audio/mpeg,audio/ogg,audio/wav,audio/webm"
          disabled={disabled || busy || recording}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <button
          type="button"
          disabled={disabled || busy || recording}
          onClick={() => inputRef.current?.click()}
          className="focus-ring rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100"
        >
          {t({ en: "Attach audio file", zh: "附加音訊檔" })}
        </button>
        {recording ? (
          <>
            <button type="button" onClick={() => stopRecording(true)} className="focus-ring rounded-full bg-rose-500 px-4 py-2 text-xs font-black text-white">
              {t({ en: "Stop and keep", zh: "停止並保留" })}
            </button>
            <button type="button" onClick={() => stopRecording(false)} className="focus-ring rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:text-slate-200">
              {t({ en: "Cancel", zh: "取消" })}
            </button>
          </>
        ) : (
          <button type="button" disabled={disabled || busy} onClick={() => void startRecording()} className="focus-ring rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100">
            {t({ en: "Record microphone", zh: "麥克風錄音" })}
          </button>
        )}
        {metadata.source === "none" ? null : (
          <button type="button" disabled={disabled || busy || recording} onClick={() => void confirmDetach()} className="focus-ring rounded-full border border-rose-200 px-4 py-2 text-xs font-black text-rose-700 disabled:opacity-50 dark:border-rose-300/20 dark:text-rose-200">
            {t({ en: "Detach and delete local audio", zh: "移除並刪除本機音訊" })}
          </button>
        )}
      </div>
      {message ? <p role="status" className="text-xs font-semibold text-slate-600 dark:text-slate-300">{message}</p> : null}
    </section>
  );
}
