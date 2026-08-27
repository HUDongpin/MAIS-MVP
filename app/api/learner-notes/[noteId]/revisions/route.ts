import { listLearnerNoteRevisions } from "@/lib/server/userStore";
import { learnerNoteJson, requireLearnerNoteOwner } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const owner = await requireLearnerNoteOwner(request);
  if ("response" in owner) return owner.response;
  const noteId = decodeURIComponent((await params).noteId);
  const revisions = await listLearnerNoteRevisions(owner.authenticated.user.id, noteId);
  if (!revisions) return learnerNoteJson({ error: "Note not found." }, { status: 404 });
  return learnerNoteJson({ noteId, revisions });
}
