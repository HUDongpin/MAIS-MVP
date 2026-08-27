import {
  deleteLearnerNote,
  getLearnerNote,
  updateLearnerNote
} from "@/lib/server/userStore";
import {
  learnerNoteEtag,
  learnerNoteVersionFromIfMatch
} from "@/lib/server/userStore/learnerNotesPersistence";
import {
  learnerNoteJson,
  learnerNotePayloadHasForbiddenOwnership,
  learnerNotePrivateHeaders,
  readLearnerNoteBody,
  requireLearnerNoteOwner
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function decodedNoteId(params: Promise<{ noteId: string }>) {
  return decodeURIComponent((await params).noteId);
}

export async function GET(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const owner = await requireLearnerNoteOwner(request);
  if ("response" in owner) return owner.response;
  const noteId = await decodedNoteId(params);
  const note = await getLearnerNote(owner.authenticated.user.id, noteId);
  if (!note) return learnerNoteJson({ error: "Note not found." }, { status: 404 });
  return learnerNoteJson({ note }, { headers: { ETag: learnerNoteEtag(note.id, note.version) } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const parsed = await readLearnerNoteBody(request);
  if (!parsed.ok) return learnerNoteJson({ error: parsed.error }, { status: parsed.error.includes("large") ? 413 : 400 });
  const owner = await requireLearnerNoteOwner(request, parsed.value);
  if ("response" in owner) return owner.response;
  if (learnerNotePayloadHasForbiddenOwnership(parsed.value)) {
    return learnerNoteJson({ error: "Note ownership and visibility are server controlled." }, { status: 400 });
  }
  const noteId = await decodedNoteId(params);
  const expectedVersion = learnerNoteVersionFromIfMatch(request.headers.get("if-match"), noteId);
  if (expectedVersion === null) return learnerNoteJson({ error: "A current note ETag is required in If-Match." }, { status: 428 });
  const result = await updateLearnerNote({
    ownerId: owner.authenticated.user.id,
    noteId,
    expectedVersion,
    title: parsed.value.title,
    body: parsed.value.body,
    tags: parsed.value.tags,
    anchor: parsed.value.anchor,
    source: parsed.value.acceptAiSuggestion === true ? "ai-accepted" : "learner"
  });
  if (result.status === "conflict") return learnerNoteJson({ error: "Note version conflict.", currentVersion: result.currentVersion }, { status: 412 });
  if (result.status === "not-found") return learnerNoteJson({ error: "Note not found." }, { status: 404 });
  if (result.status === "forbidden") return learnerNoteJson({ error: "Student access required." }, { status: 403 });
  if (result.status === "invalid") return learnerNoteJson({ error: "Invalid note update." }, { status: 400 });
  if (result.status !== "updated") return learnerNoteJson({ error: "Could not update note." }, { status: 500 });
  return learnerNoteJson({ note: result.note }, { headers: { ETag: learnerNoteEtag(result.note.id, result.note.version) } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const owner = await requireLearnerNoteOwner(request);
  if ("response" in owner) return owner.response;
  const noteId = await decodedNoteId(params);
  const expectedVersion = learnerNoteVersionFromIfMatch(request.headers.get("if-match"), noteId);
  if (expectedVersion === null) return learnerNoteJson({ error: "A current note ETag is required in If-Match." }, { status: 428 });
  const erase = new URL(request.url).searchParams.get("erase") === "true";
  const result = await deleteLearnerNote({ ownerId: owner.authenticated.user.id, noteId, expectedVersion, erase });
  if (result.status === "conflict") return learnerNoteJson({ error: "Note version conflict.", currentVersion: result.currentVersion }, { status: 412 });
  if (result.status === "not-found") return learnerNoteJson({ error: "Note not found." }, { status: 404 });
  if (result.status === "forbidden") return learnerNoteJson({ error: "Student access required." }, { status: 403 });
  if (result.status === "invalid") return learnerNoteJson({ error: "Invalid note deletion." }, { status: 400 });
  if (result.status === "erased") return new Response(null, { status: 204, headers: learnerNotePrivateHeaders });
  if (result.status !== "deleted") return learnerNoteJson({ error: "Could not delete note." }, { status: 500 });
  return learnerNoteJson({ note: result.note }, { headers: { ETag: learnerNoteEtag(result.note.id, result.note.version) } });
}
