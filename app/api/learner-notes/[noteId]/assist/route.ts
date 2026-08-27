import { generateLearnerNoteSuggestion } from "@/lib/server/learnerNotesAssist";
import { getLearnerNote } from "@/lib/server/userStore";
import type { LearnerNoteAiMode } from "@/types/learnerNotes";
import {
  learnerNoteJson,
  readLearnerNoteBody,
  requireLearnerNoteOwner
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validModes = new Set<LearnerNoteAiMode>(["explain", "summarize", "quiz-me", "next-step"]);
const validLanguages = new Set(["en", "zh", "zh-Hans"]);

export async function POST(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const parsed = await readLearnerNoteBody(request);
  if (!parsed.ok) return learnerNoteJson({ error: parsed.error }, { status: parsed.error.includes("large") ? 413 : 400 });
  const owner = await requireLearnerNoteOwner(request, parsed.value);
  if ("response" in owner) return owner.response;
  const noteId = decodeURIComponent((await params).noteId);
  const note = await getLearnerNote(owner.authenticated.user.id, noteId);
  if (!note) return learnerNoteJson({ error: "Note not found." }, { status: 404 });

  const mode = parsed.value.mode as LearnerNoteAiMode;
  const selectedText = typeof parsed.value.selectedText === "string" ? parsed.value.selectedText.trim().slice(0, 2_000) : "";
  const language = validLanguages.has(parsed.value.language as string)
    ? parsed.value.language as "en" | "zh" | "zh-Hans"
    : "zh-Hans";
  if (!validModes.has(mode) || !selectedText) return learnerNoteJson({ error: "A supported mode and selected note text are required." }, { status: 400 });

  const belongsToOwnedNote = note.body.includes(selectedText) || note.anchor.selectedText?.includes(selectedText);
  if (!belongsToOwnedNote) return learnerNoteJson({ error: "Selected text must come from the owned note." }, { status: 400 });
  const result = await generateLearnerNoteSuggestion({
    mode,
    selectedText,
    topicLabel: note.anchor.topicId,
    language
  });
  if (result.status === "missing-config") return learnerNoteJson({ error: "AI note assistance is not configured." }, { status: 503 });
  if (result.status === "invalid") return learnerNoteJson({ error: "Invalid AI note request." }, { status: 400 });
  if (result.status === "provider-error") return learnerNoteJson({ error: "AI note assistance is temporarily unavailable." }, { status: 502 });
  return learnerNoteJson(result.value);
}
