export type LearnerNoteVisibility = "private";
export type LearnerNoteAnchorStatus = "active" | "orphaned";
export type LearnerNoteMutationSource = "learner" | "ai-accepted" | "delete";
export type LearnerNoteAiMode = "explain" | "summarize" | "quiz-me" | "next-step";

export type LearnerNoteAnchor = {
  type: "lesson" | "lesson-block" | "text-quote";
  lessonSlug: string;
  topicId: string;
  blockId?: string;
  blockType?: string;
  selectedText?: string;
  surroundingText?: string;
  sourceRevision?: string;
  status: LearnerNoteAnchorStatus;
};

export type LearnerNote = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  anchor: LearnerNoteAnchor;
  visibility: LearnerNoteVisibility;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type LearnerNoteRevision = {
  version: number;
  title: string;
  body: string;
  tags: string[];
  anchor: LearnerNoteAnchor;
  source: LearnerNoteMutationSource;
  createdAt: string;
};

export type LearnerNoteSearchResult = {
  note: LearnerNote;
  excerpt: string;
  matchedFields: Array<"title" | "body" | "tags">;
  score: number;
};

export type LearnerNotesListResponse = {
  notes: LearnerNote[];
  results?: LearnerNoteSearchResult[];
  total: number;
};

export type LearnerNoteAiSuggestion = {
  mode: LearnerNoteAiMode;
  suggestion: string;
  provenance: {
    provider: string;
    model: string;
    generatedAt: string;
    inputCharacters: number;
    persisted: false;
  };
};
