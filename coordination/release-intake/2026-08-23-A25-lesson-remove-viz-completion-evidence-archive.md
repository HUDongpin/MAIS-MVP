# A25 evidence archive — lesson remove-viz/completion WIP

- Generated: `2026-08-22T20:21:00Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: **evidence archive**
- Original branch: `worktree-lesson-remove-viz-completion`
- Original worktree: `/Volumes/Starship/MAIS-MVP/.claude/worktrees/lesson-remove-viz-completion`
- Original branch head: `1d81110c60df2695917947f3198df06b5bc384ba`
- Archive commit: `93cefbd1c0fa101e7d26a1fb7bab2d70fe32978d`
- GitHub archive ref: `origin/archive/lesson-remove-viz-completion-wip-20260823`
- GitHub PR for the original branch: none

## Decision

Preserve the exact dirty tree as an evidence archive. Do not treat it as a reviewed feature package and do not integrate it into `main`.

The original head was already contained by live `origin/main`, but its dirty state was not. The WIP removes the in-lesson visualization surface, lesson-completion checklist and persistence UI, related guided-tour and teacher links, translations, unit tests, and E2E assertions. It spans multiple owners and 14 paths, with 33 insertions and 1,035 deletions. Every resulting worktree blob differs from live `origin/main`; the two deleted checklist files still exist on live main. This is not exact absorption.

The change therefore requires separate A05/A06 product review, A09 copy/accessibility review, A11 regression review, and A13 teacher-console review before any future selective adoption. A25's decision is only to preserve the bytes and close the abandoned worktree safely.

## Owner grouping

| Owner lane | Archived paths / concern |
|---|---|
| A05 lesson | `components/lesson/` implementation and unit tests |
| A06 visualization | Removal of the in-lesson visualization integration |
| A01/A09 onboarding and copy | `components/onboarding/StudentGuidedTour.tsx`, `lib/i18n.ts` |
| A13 teacher | `components/teacher/TeacherLiveView.tsx` visualization routing |
| A11 QA | Three `tests/e2e/` specs |
| A25 intake | Exact archive, remote recovery ref, and closure evidence |

## Archive verification

- Filename/content-pattern secret gate: PASS.
- Exact cached path count: 14.
- Archive commit and GitHub archive ref: identical at `93cefbd1c0fa101e7d26a1fb7bab2d70fe32978d`.
- Post-commit worktree status: clean.
- `git diff --check`: one preserved warning, `components/lesson/lessonContentText.ts:196: new blank line at EOF`.
- Product tests: NOT RUN, because this is an unreviewed destructive evidence archive, not an integration candidate.
- No GitHub remote branch was deleted.

## Recovery

```sh
git fetch origin archive/lesson-remove-viz-completion-wip-20260823
git worktree add /Volumes/Starship/MAIS-lesson-remove-viz-recovered-wt 93cefbd1c0fa101e7d26a1fb7bab2d70fe32978d
```

The original worktree may be removed only with plain non-forced `git worktree remove` after revalidating clean status, both archive tips, the report JSON, and absence of an owner process using the directory. Retain the local branch and GitHub archive ref.

## Post-archive closure

At `2026-08-22T20:21:22Z`, A25 revalidated the JSON manifest, clean worktree, identical local/remote archive tips, and absence of any external process whose cwd was inside the worktree. Plain non-forced `git worktree remove /Volumes/Starship/MAIS-MVP/.claude/worktrees/lesson-remove-viz-completion` succeeded. The path and registration are absent.

The local branch `worktree-lesson-remove-viz-completion` and GitHub archive ref remain at `93cefbd1c0fa101e7d26a1fb7bab2d70fe32978d`. No local or GitHub remote branch was deleted.
