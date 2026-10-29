import { buildCaliforniaInteractiveTextbookGroups } from "@/components/lesson/ccss/californiaInteractiveTextbookData";
import { CcssInteractiveTextbook } from "@/components/lesson/ccss/CcssInteractiveTextbook";
import type { InteractiveTextbookPlacement } from "@/components/lesson/ccss/interactiveTextbookTypes";
import { californiaHighSchoolTextbookChapters, californiaHighSchoolTextbookDraft } from "@/data/usCaliforniaHighSchoolLessonIllustrations";

/**
 * California Grade 9-12 interactive textbook on the internal noindex review
 * route (`/lesson/california-high-school-textbook/review`).
 *
 * Replaced the Codex-reviewed high-school repair package (20 chapters of
 * concept bitmaps plus two text worked examples each) on 2026-09-02. The
 * chapter placement metadata (pathway, conceptual category, domain, and
 * prerequisites) is kept from the S05 placement record; the chapter bodies are
 * the MAIS-authored chapter openers and the ported interactive CCSS lessons the
 * lesson page renders for each chapter topic. The route policy is unchanged:
 * review-only until the owner's final production release decision.
 */
export function CaliforniaHighSchoolTextbookPage() {
  const placementByTopicId = new Map<string, InteractiveTextbookPlacement>(
    californiaHighSchoolTextbookChapters.map((chapter) => [
      chapter.chapterId,
      {
        pathwayLabel: chapter.pathwayLabel,
        conceptualCategory: chapter.conceptualCategory,
        domainCode: chapter.domainCode,
        prerequisiteDomains: chapter.prerequisiteDomains
      }
    ])
  );
  const groups = buildCaliforniaInteractiveTextbookGroups(["S3", "S4", "S5", "S6"], placementByTopicId);

  return (
    <div data-testid="california-high-school-textbook-review-page">
      <CcssInteractiveTextbook
        testIdPrefix="california-high-school-textbook"
        eyebrow="California High School Mathematics · QA Review"
        heading="California High School Mathematics Preview"
        intro="Twenty chapters for Grades 9-12 on the internal review route. Each chapter opens with an interactive lesson that models the chapter's big idea, unfolds a worked example step by step, and ends with a Math check; the interactive lessons for the chapter's standards follow, with a hand-checked chapter check to finish."
        notice={
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
            Review only · {californiaHighSchoolTextbookDraft.routePolicy.productionApproval} · final release gates still required.
          </div>
        }
        groups={groups}
      />
    </div>
  );
}
