"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import type {
  LearnerNote,
  LearnerNoteAiMode,
  LearnerNoteAiSuggestion,
  LearnerNoteAnchor,
  LearnerNotesListResponse
} from "@/types/learnerNotes";

type EditableLearnerNoteAnchor = Omit<LearnerNoteAnchor, "status">;

export type LearnerNoteDraft = {
  requestId: number;
  title?: string;
  body: string;
  anchor: EditableLearnerNoteAnchor;
};

type LearnerNotesPanelProps = {
  lessonSlug: string;
  topicId: string;
  draft?: LearnerNoteDraft | null;
};

type NoteSuggestionState = {
  noteId: string;
  value: LearnerNoteAiSuggestion;
};

type JsonError = { error?: string };

const aiModes: LearnerNoteAiMode[] = ["explain", "summarize", "quiz-me", "next-step"];

function editableAnchor(anchor: LearnerNoteAnchor): EditableLearnerNoteAnchor {
  const { status: _status, ...value } = anchor;
  return value;
}

function splitTags(value: string) {
  return value
    .split(/[,，\n]/u)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function noteEtag(note: LearnerNote) {
  return `"learner-note:${note.id}:v${note.version}"`;
}

async function responseJson<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null) as Promise<T | null>;
}

export function LearnerNotesPanel({ draft, lessonSlug, topicId }: LearnerNotesPanelProps) {
  const { currentUser, language, settingsReady, t } = useSettings();
  const expectedUserId = currentUser?.role === "student" ? currentUser.id : "";
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [notes, setNotes] = useState<LearnerNote[]>([]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"lesson" | "all">("lesson");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [anchor, setAnchor] = useState<EditableLearnerNoteAnchor>({
    type: "lesson",
    lessonSlug,
    topicId
  });
  const [suggestion, setSuggestion] = useState<NoteSuggestionState | null>(null);

  const activeEditingNote = useMemo(
    () => notes.find((note) => note.id === editingNoteId) ?? null,
    [editingNoteId, notes]
  );

  useEffect(() => {
    if (!settingsReady || !expectedUserId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (scope === "lesson") params.set("lessonSlug", lessonSlug);
      if (query.trim()) params.set("q", query.trim());
      try {
        const response = await fetch(`/api/learner-notes?${params.toString()}`, {
          cache: "no-store",
          headers: { "X-MAIS-Expected-User-Id": expectedUserId },
          signal: controller.signal
        });
        const payload = await responseJson<LearnerNotesListResponse & JsonError>(response);
        if (!response.ok) throw new Error(payload?.error || "Could not load notes.");
        setNotes(payload?.notes ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setMessage(error instanceof Error ? error.message : "Could not load notes.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 220 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [expectedUserId, lessonSlug, query, reloadVersion, scope, settingsReady]);

  useEffect(() => {
    if (!draft || draft.anchor.lessonSlug !== lessonSlug) return;
    setEditingNoteId(null);
    setTitle(draft.title ?? "");
    setBody(draft.body);
    setTagsInput("");
    setAnchor(draft.anchor);
    setSuggestion(null);
    setMessage(t({
      en: "Selected lesson text is ready as a private-note draft. Review it before saving.",
      zh: "已把選取的課節文字放入私人筆記草稿；請檢查後再儲存。",
      zhHans: "已把选取的课时文字放入私人笔记草稿；请检查后再保存。"
    }));
    window.requestAnimationFrame(() => bodyRef.current?.focus());
  }, [draft, lessonSlug, t]);

  function resetEditor() {
    setEditingNoteId(null);
    setTitle("");
    setBody("");
    setTagsInput("");
    setAnchor({ type: "lesson", lessonSlug, topicId });
    setSuggestion(null);
  }

  function beginEdit(note: LearnerNote) {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setTagsInput(note.tags.join(", "));
    setAnchor(editableAnchor(note.anchor));
    setSuggestion(null);
    setMessage("");
    window.requestAnimationFrame(() => bodyRef.current?.focus());
  }

  async function saveEditor() {
    if (!expectedUserId || !body.trim()) return;
    const editingNote = activeEditingNote;
    setBusyAction(editingNote ? `save:${editingNote.id}` : "create");
    setMessage("");
    try {
      const response = await fetch(
        editingNote ? `/api/learner-notes/${encodeURIComponent(editingNote.id)}` : "/api/learner-notes",
        {
          method: editingNote ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            "X-MAIS-Expected-User-Id": expectedUserId,
            ...(editingNote ? { "If-Match": noteEtag(editingNote) } : {})
          },
          body: JSON.stringify({ title, body, tags: splitTags(tagsInput), anchor })
        }
      );
      const payload = await responseJson<{ note?: LearnerNote } & JsonError>(response);
      if (!response.ok) {
        if (response.status === 412) {
          throw new Error(t({
            en: "This note changed in another session. It was reloaded; review before saving again.",
            zh: "此筆記已在另一個工作階段變更。已重新載入，請檢查後再儲存。",
            zhHans: "此笔记已在另一个会话中变更。已重新载入，请检查后再保存。"
          }));
        }
        throw new Error(payload?.error || "Could not save note.");
      }
      resetEditor();
      setReloadVersion((value) => value + 1);
      setMessage(t({ en: "Private note saved.", zh: "私人筆記已儲存。", zhHans: "私人笔记已保存。" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save note.");
      setReloadVersion((value) => value + 1);
    } finally {
      setBusyAction("");
    }
  }

  async function eraseNote(note: LearnerNote) {
    const confirmed = window.confirm(t({
      en: "Permanently erase this private note and its revision history? This cannot be undone.",
      zh: "永久清除此私人筆記及其修訂紀錄？此操作無法復原。",
      zhHans: "永久清除此私人笔记及其修订记录？此操作无法撤销。"
    }));
    if (!confirmed || !expectedUserId) return;
    setBusyAction(`delete:${note.id}`);
    setMessage("");
    try {
      const response = await fetch(`/api/learner-notes/${encodeURIComponent(note.id)}?erase=true`, {
        method: "DELETE",
        headers: {
          "If-Match": noteEtag(note),
          "X-MAIS-Expected-User-Id": expectedUserId
        }
      });
      if (!response.ok) {
        const payload = await responseJson<JsonError>(response);
        throw new Error(payload?.error || "Could not erase note.");
      }
      if (editingNoteId === note.id) resetEditor();
      if (suggestion?.noteId === note.id) setSuggestion(null);
      setReloadVersion((value) => value + 1);
      setMessage(t({ en: "Private note permanently erased.", zh: "私人筆記已永久清除。", zhHans: "私人笔记已永久清除。" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not erase note.");
    } finally {
      setBusyAction("");
    }
  }

  async function requestAiSuggestion(note: LearnerNote, mode: LearnerNoteAiMode) {
    if (!expectedUserId) return;
    setBusyAction(`ai:${note.id}:${mode}`);
    setMessage("");
    setSuggestion(null);
    try {
      const selectedText = (note.body.trim() || note.anchor.selectedText || "").slice(0, 2_000);
      const response = await fetch(`/api/learner-notes/${encodeURIComponent(note.id)}/assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MAIS-Expected-User-Id": expectedUserId
        },
        body: JSON.stringify({ mode, selectedText, language })
      });
      const payload = await responseJson<LearnerNoteAiSuggestion & JsonError>(response);
      if (!response.ok || !payload?.suggestion) throw new Error(payload?.error || "AI assistance is unavailable.");
      setSuggestion({ noteId: note.id, value: payload });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI assistance is unavailable.");
    } finally {
      setBusyAction("");
    }
  }

  async function acceptAiSuggestion(note: LearnerNote) {
    if (!expectedUserId || suggestion?.noteId !== note.id) return;
    setBusyAction(`accept:${note.id}`);
    setMessage("");
    try {
      const nextBody = `${note.body.trimEnd()}\n\n${suggestion.value.suggestion}`.trim().slice(0, 20_000);
      const response = await fetch(`/api/learner-notes/${encodeURIComponent(note.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": noteEtag(note),
          "X-MAIS-Expected-User-Id": expectedUserId
        },
        body: JSON.stringify({
          title: note.title,
          body: nextBody,
          tags: note.tags,
          anchor: editableAnchor(note.anchor),
          acceptAiSuggestion: true
        })
      });
      const payload = await responseJson<{ note?: LearnerNote } & JsonError>(response);
      if (!response.ok) throw new Error(payload?.error || "Could not accept AI suggestion.");
      setSuggestion(null);
      setReloadVersion((value) => value + 1);
      setMessage(t({
        en: "You accepted the suggestion and it was appended to the private note.",
        zh: "你已接受建議，內容已附加到私人筆記。",
        zhHans: "你已接受建议，内容已追加到私人笔记。"
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not accept AI suggestion.");
      setReloadVersion((value) => value + 1);
    } finally {
      setBusyAction("");
    }
  }

  function aiModeLabel(mode: LearnerNoteAiMode) {
    const labels: Record<LearnerNoteAiMode, { en: string; zh: string; zhHans: string }> = {
      explain: { en: "Explain", zh: "解釋", zhHans: "解释" },
      summarize: { en: "Summarize", zh: "摘要", zhHans: "摘要" },
      "quiz-me": { en: "Quiz me", zh: "考考我", zhHans: "考考我" },
      "next-step": { en: "Next step", zh: "下一步", zhHans: "下一步" }
    };
    return t(labels[mode]);
  }

  if (!settingsReady || currentUser?.role !== "student") return null;

  return (
    <section
      id="learner-notes"
      data-nova-lens-ignore="true"
      className="mt-8 scroll-mt-28"
      aria-labelledby="learner-notes-title"
    >
      <div className="glass-panel overflow-hidden border-violet-300/35 bg-violet-50/55 dark:bg-violet-950/15">
        <div className="border-b border-violet-200/70 p-5 dark:border-violet-300/15 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                {t({ en: "Private learning space", zh: "私人學習空間", zhHans: "私人学习空间" })}
              </p>
              <h2 id="learner-notes-title" className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {t({ en: "My lesson notes", zh: "我的課節筆記", zhHans: "我的课时笔记" })}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {t({
                  en: "Only your signed-in student account can read these notes. AI suggestions are never saved until you accept them.",
                  zh: "只有你目前登入的學生帳戶可讀取這些筆記；AI 建議在你明確接受前不會儲存。",
                  zhHans: "只有你当前登录的学生账户可读取这些笔记；AI 建议在你明确接受前不会保存。"
                })}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-violet-300/70 bg-white/80 px-3 py-1.5 text-xs font-black text-violet-800 dark:border-violet-300/25 dark:bg-white/[0.07] dark:text-violet-100">
              {t({ en: "Private · owner only", zh: "私人 · 僅限本人", zhHans: "私人 · 仅限本人" })}
            </span>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            className="rounded-3xl border border-violet-200/80 bg-white/85 p-4 shadow-sm dark:border-violet-300/15 dark:bg-white/[0.055] sm:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void saveEditor();
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-slate-950 dark:text-white">
                {editingNoteId
                  ? t({ en: "Edit private note", zh: "編輯私人筆記", zhHans: "编辑私人笔记" })
                  : t({ en: "New private note", zh: "新增私人筆記", zhHans: "新增私人笔记" })}
              </h3>
              {editingNoteId ? (
                <button type="button" onClick={resetEditor} className="focus-ring rounded-full px-3 py-1.5 text-xs font-black text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
                  {t({ en: "Cancel edit", zh: "取消編輯", zhHans: "取消编辑" })}
                </button>
              ) : null}
            </div>

            <label className="mt-4 block text-xs font-black uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
              {t({ en: "Title (optional)", zh: "標題（可選）", zhHans: "标题（可选）" })}
              <input
                value={title}
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                className="focus-ring mt-2 w-full rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-950 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
              />
            </label>

            <label className="mt-4 block text-xs font-black uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
              {t({ en: "Note", zh: "筆記內容", zhHans: "笔记内容" })}
              <textarea
                ref={bodyRef}
                value={body}
                maxLength={20_000}
                rows={8}
                required
                onChange={(event) => setBody(event.target.value)}
                placeholder={t({
                  en: "Write what you understood, what remains unclear, or select lesson text above and choose Save to notes.",
                  zh: "寫下你已理解或仍不清楚的內容；也可在上方劃詞後選擇儲存到筆記。",
                  zhHans: "写下你已理解或仍不清楚的内容；也可在上方划词后选择保存到笔记。"
                })}
                className="focus-ring mt-2 w-full resize-y rounded-2xl border border-slate-200/90 bg-white px-3 py-3 text-sm font-semibold leading-6 normal-case tracking-normal text-slate-950 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
              />
            </label>

            <label className="mt-4 block text-xs font-black uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
              {t({ en: "Tags", zh: "標籤", zhHans: "标签" })}
              <input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder={t({ en: "formula, review", zh: "公式, 重溫", zhHans: "公式, 复习" })}
                className="focus-ring mt-2 w-full rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-950 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
              />
            </label>

            <div className="mt-4 rounded-2xl bg-violet-50 p-3 text-xs font-semibold leading-5 text-violet-900 dark:bg-violet-400/10 dark:text-violet-100">
              <p className="font-black">
                {anchor.type === "text-quote"
                  ? t({ en: "Anchored to selected lesson text", zh: "已錨定至選取的課節文字", zhHans: "已锚定至选取的课时文字" })
                  : t({ en: "Anchored to this lesson", zh: "已錨定至本課節", zhHans: "已锚定至本课时" })}
              </p>
              {anchor.selectedText ? <p className="mt-1 line-clamp-3">“{anchor.selectedText}”</p> : null}
            </div>

            <button
              type="submit"
              disabled={!body.trim() || Boolean(busyAction)}
              className="focus-ring mt-5 w-full rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-700/20 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-300 dark:text-slate-950"
            >
              {busyAction === "create" || busyAction.startsWith("save:")
                ? t({ en: "Saving…", zh: "正在儲存…", zhHans: "正在保存…" })
                : editingNoteId
                  ? t({ en: "Save changes", zh: "儲存變更", zhHans: "保存更改" })
                  : t({ en: "Save private note", zh: "儲存私人筆記", zhHans: "保存私人笔记" })}
            </button>
          </form>

          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="min-w-0 flex-1">
                <span className="sr-only">{t({ en: "Search notes", zh: "搜尋筆記", zhHans: "搜索笔记" })}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setMessage("");
                  }}
                  placeholder={t({ en: "Search title, text, or tags…", zh: "搜尋標題、內容或標籤…", zhHans: "搜索标题、内容或标签…" })}
                  className="focus-ring w-full rounded-full border border-slate-200/90 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                />
              </label>
              <div className="inline-flex rounded-full border border-slate-200/90 bg-white/90 p-1 text-xs font-black dark:border-white/10 dark:bg-white/[0.06]">
                {(["lesson", "all"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setScope(option);
                      setMessage("");
                    }}
                    aria-pressed={scope === option}
                    className={`focus-ring rounded-full px-3 py-2 transition ${scope === option ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"}`}
                  >
                    {option === "lesson"
                      ? t({ en: "This lesson", zh: "本課節", zhHans: "本课时" })
                      : t({ en: "All notes", zh: "全部筆記", zhHans: "全部笔记" })}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 min-h-5 text-sm font-semibold text-slate-600 dark:text-slate-300" role="status" aria-live="polite">
              {message}
            </p>

            <div className="mt-3 space-y-4">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500 dark:border-white/15 dark:text-slate-300">
                  {t({ en: "Loading private notes…", zh: "正在載入私人筆記…", zhHans: "正在加载私人笔记…" })}
                </div>
              ) : notes.length ? notes.map((note) => (
                <article key={note.id} className="rounded-3xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.055] sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-slate-950 dark:text-white">
                        {note.title || t({ en: "Untitled note", zh: "未命名筆記", zhHans: "未命名笔记" })}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {new Intl.DateTimeFormat(language === "en" ? "en" : language === "zh" ? "zh-HK" : "zh-CN", {
                          dateStyle: "medium",
                          timeStyle: "short"
                        }).format(new Date(note.updatedAt))}
                        {" · "}
                        {note.anchor.status === "orphaned"
                          ? t({ en: "Source moved", zh: "來源已移動", zhHans: "来源已移动" })
                          : t({ en: "Anchor active", zh: "錨點有效", zhHans: "锚点有效" })}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-[0.7rem] font-black text-violet-800 dark:bg-violet-400/15 dark:text-violet-100">
                      {t({ en: "Private", zh: "私人", zhHans: "私人" })}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{note.body}</p>
                  {note.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {note.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">#{tag}</span>)}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => beginEdit(note)} className="focus-ring rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10">
                      {t({ en: "Edit", zh: "編輯", zhHans: "编辑" })}
                    </button>
                    {aiModes.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => void requestAiSuggestion(note, mode)}
                        className="focus-ring rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 enabled:hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100"
                      >
                        {busyAction === `ai:${note.id}:${mode}` ? "…" : aiModeLabel(mode)}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => void eraseNote(note)}
                      className="focus-ring ml-auto rounded-full border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 enabled:hover:bg-rose-50 disabled:opacity-50 dark:border-rose-300/20 dark:text-rose-200 dark:enabled:hover:bg-rose-400/10"
                    >
                      {t({ en: "Erase", zh: "清除", zhHans: "清除" })}
                    </button>
                  </div>

                  {suggestion?.noteId === note.id ? (
                    <aside className="mt-4 rounded-2xl border border-cyan-200/80 bg-cyan-50/80 p-4 dark:border-cyan-300/20 dark:bg-cyan-400/10">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-100">
                        {t({ en: "Unsaved AI suggestion", zh: "尚未儲存的 AI 建議", zhHans: "尚未保存的 AI 建议" })}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{suggestion.value.suggestion}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {suggestion.value.provenance.provider} · {suggestion.value.provenance.model}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(busyAction)}
                          onClick={() => void acceptAiSuggestion(note)}
                          className="focus-ring rounded-full bg-cyan-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-cyan-300 dark:text-slate-950"
                        >
                          {t({ en: "Accept and append", zh: "接受並附加", zhHans: "接受并追加" })}
                        </button>
                        <button type="button" onClick={() => setSuggestion(null)} className="focus-ring rounded-full px-4 py-2 text-xs font-black text-slate-600 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10">
                          {t({ en: "Discard", zh: "捨棄", zhHans: "舍弃" })}
                        </button>
                      </div>
                    </aside>
                  ) : null}
                </article>
              )) : (
                <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold leading-6 text-slate-500 dark:border-white/15 dark:text-slate-300">
                  {query.trim()
                    ? t({ en: "No private notes match this search.", zh: "沒有符合此搜尋的私人筆記。", zhHans: "没有符合此搜索的私人笔记。" })
                    : t({ en: "No notes yet. Write one here or select lesson text above.", zh: "尚未有筆記。你可在此撰寫，或在上方選取課節文字。", zhHans: "尚未有笔记。你可在此撰写，或在上方选取课时文字。" })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
