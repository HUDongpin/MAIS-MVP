# A25 Owner Closure Work Order - A13

Generated: 2026-07-02T15:48:19.470Z

Queue source: `coordination/release-intake/latest-A25-owner-closure-action-queue.json`

Dirty map signature: `aab9818713f7df7ad2d9e281c7534227bc41a877b346ef4339ea49f3b0123cb2`

Expanded dirty entries: 3505

This work order is coordination evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Owner

- Agent: A13
- Owner: A13 teacher console lead
- Pending items: 5
- Recorded blocker reports: 0
- Pending blocker reports: 1
- Cleanup-authorized rows: 0
- Executable rows: 0

## Recommended Worktrees

- `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-teacher-console-closure`

## Next Safe Actions

1. Read `AGENTS.md` and this work order.
2. Work only inside the listed owner scope or write a blocker report.
3. Resolve package blockers in an isolated owner worktree, or record a formal blocker.
4. Do not run any physical cleanup unless a current authorization artifact and owner instruction name the exact approval ID, final state, command, and working directory.

## Owner Package Assignments

| Assignment | Worktree | Packages | Blocking reasons |
| --- | --- | --- | --- |
| owner-package-blocker-a13 | /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-teacher-console-closure | A25/A10/A22 governance and release hygiene<br>A01 app shell<br>A02/A15 dashboard adaptive<br>A03 roadmap<br>A04 practice<br>A05 lesson<br>A18/A21/A23/A24 content evidence<br>A06 visualization<br>A07 AI tutor<br>A09 copy/i18n/accessibility<br>A11 regression evidence<br>A13/A14 console<br>A17/A20 games and motivation | 7 dirty entries are outside the A25/A10/A22 pathspec union<br>npm run type-check failed<br>A01 app shell typeCheck failed<br>A01 app shell appShellPlaywright failed<br>A02/A15 dashboard adaptive testAnalytics failed<br>A02/A15 dashboard adaptive typeCheck failed<br>A02/A15 dashboard adaptive dashboardAdaptivePlaywright failed<br>A03 roadmap typeCheck failed<br>A03 roadmap roadmapPlaywright failed<br>A04 practice testQuestionBank failed<br>A04 practice typeCheck failed<br>A04 practice practicePlaywright failed<br>A05 lesson typeCheck failed<br>A05 lesson lessonPlaywright failed<br>A18/A21/A23/A24 content evidence testRag failed<br>A18/A21/A23/A24 content evidence testQuestionBank failed<br>A18/A21/A23/A24 content evidence typeCheck failed<br>A06 visualization typeCheck failed<br>A06 visualization visualizationNodeTests failed<br>A06 visualization visualizationPlaywright failed<br>A07 AI tutor typeCheck failed<br>A07 AI tutor aiTutorPlaywright failed<br>A09 copy/i18n/accessibility typeCheck failed<br>A11 regression evidence typeCheck failed<br>A11 regression evidence regressionPlaywright failed<br>A13/A14 console typeCheck failed<br>A13/A14 console consolePlaywright failed<br>A17/A20 games and motivation typeCheck failed<br>A17/A20 games and motivation gameMotivationPlaywright failed |

## Blocker Report Starters

| Report | Assignment | Status | Worktree |
| --- | --- | --- | --- |
| owner-package-blocker-report-a13 | owner-package-blocker-a13 | pending-owner-report | /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-teacher-console-closure |

## Authorization Starters

| Approval | Kind | Subject | Selected action | Cleanup authorized | Executable |
| --- | --- | --- | --- | --- | --- |
| a13-teacher-console | owner-package | coordination/release-intake/latest-A25-effective-owner-a13-teacher-console.pathspec | owner-selected-final-state | no | no |
| codex-a13-a14-console-closure | physical-lifecycle | codex/A13-A14-console-closure | owner-selected-lifecycle-final-state | no | no |

## Remaining Completion Assignments

| Assignment | Objective | Blockers |
| --- | --- | --- |
| remaining-completion-owner-packages | Resolve or formally block Wave 02-05 owner package readiness failures in isolated owner worktrees. | task-4-wave02: incomplete<br>task-5-waves03-05: incomplete<br>task-6-content-qa: incomplete |
