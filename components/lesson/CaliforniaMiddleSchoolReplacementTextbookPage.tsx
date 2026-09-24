import { buildCaliforniaInteractiveTextbookGroups } from "@/components/lesson/ccss/californiaInteractiveTextbookData";
import { CcssInteractiveTextbook } from "@/components/lesson/ccss/CcssInteractiveTextbook";

/**
 * California Grade 6-8 interactive textbook (student route
 * `/student/lessons/california-middle-school-textbook`).
 *
 * Replaced the Codex text-only "replacement lessons" package
 * (us-ca-math-middle-school-textbooks-v2, S21 generator, 15 domain overviews
 * with concept bitmaps) on 2026-09-02. Every chapter now opens with a
 * MAIS-authored interactive lesson and continues with the ported interactive
 * CCSS lessons the lesson page renders for the same chapter topic. This is a
 * chapter-by-chapter interactive textbook for the California Common Core
 * standards each chapter lists; it does not claim to be a complete course.
 */
export function CaliforniaMiddleSchoolReplacementTextbookPage() {
  const groups = buildCaliforniaInteractiveTextbookGroups(["P6", "S1", "S2"]);

  return (
    <CcssInteractiveTextbook
      testIdPrefix="california-textbook"
      eyebrow="California Middle School Mathematics · Interactive textbook"
      heading="Interactive Grade 6-8 Textbook"
      intro="Fifteen chapters for Grades 6, 7, and 8. Each chapter opens with an interactive lesson that models the chapter's big idea, unfolds a worked example step by step, and ends with a Math check; the interactive lessons for every standard in the chapter follow, with a hand-checked chapter check to finish."
      groups={groups}
    />
  );
}
