import {
  createLearnerNote,
  listLearnerNotes
} from "@/lib/server/userStore";
import { learnerNoteEtag } from "@/lib/server/userStore/learnerNotesPersistence";
import {
  learnerNoteJson,
  learnerNotePayloadHasForbiddenOwnership,
  readLearnerNoteBody,
  requireLearnerNoteOwner
} from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const owner = await requireLearnerNoteOwner(request);
  if ("response" in owner) return owner.response;
  const url = new URL(request.url);
  const result = await listLearnerNotes({
    ownerId: owner.authenticated.user.id,
    query: url.searchParams.get("q") ?? "",
    lessonSlug: url.searchParams.get("lessonSlug") ?? "",
    limit: Number(url.searchParams.get("limit") ?? "50")
  });
  if (!result) return learnerNoteJson({ error: "Student access required." }, { status: 403 });
  return learnerNoteJson(result);
}

export async function POST(request: Request) {
  const parsed = await readLearnerNoteBody(request);
  if (!parsed.ok) return learnerNoteJson({ error: parsed.error }, { status: parsed.error.includes("large") ? 413 : 400 });
  const owner = await requireLearnerNoteOwner(request, parsed.value);
  if ("response" in owner) return owner.response;
  if (learnerNotePayloadHasForbiddenOwnership(parsed.value)) {
    return learnerNoteJson({ error: "Note ownership and visibility are server controlled." }, { status: 400 });
  }
  const result = await createLearnerNote({
    ownerId: owner.authenticated.user.id,
    title: parsed.value.title,
    body: parsed.value.body,
    tags: parsed.value.tags,
    anchor: parsed.value.anchor
  });
  if (result.status === "forbidden") return learnerNoteJson({ error: "Student access required." }, { status: 403 });
  if (result.status === "invalid") return learnerNoteJson({ error: "A non-empty body and valid lesson anchor are required." }, { status: 400 });
  if (result.status !== "created") return learnerNoteJson({ error: "Could not create note." }, { status: 500 });
  return learnerNoteJson({ note: result.note }, {
    status: 201,
    headers: {
      ETag: learnerNoteEtag(result.note.id, result.note.version),
      Location: `/api/learner-notes/${encodeURIComponent(result.note.id)}`
    }
  });
}
