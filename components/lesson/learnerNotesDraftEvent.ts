import type { LearnerNoteAnchor } from "@/types/learnerNotes";

export const learnerNoteDraftRequestEventName = "mais:learner-note-draft-request";

export type LearnerNoteDraftRequest = {
  title?: string;
  body: string;
  anchor: Omit<LearnerNoteAnchor, "status">;
};

export function dispatchLearnerNoteDraftRequest(detail: LearnerNoteDraftRequest) {
  window.dispatchEvent(new CustomEvent<LearnerNoteDraftRequest>(learnerNoteDraftRequestEventName, { detail }));
}
