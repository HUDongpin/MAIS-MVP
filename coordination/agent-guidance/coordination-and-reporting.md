# Scoped Assignments, Overnight Coordination, And Report Templates

All code, artifact, and command paths in this document are relative to this checkout's root unless explicitly absolute. Read only the sections relevant to the assigned task; these are scoped requirements, not a checklist to load in full. Authorization and ordinary-task completion follow [AGENTS.md](../../AGENTS.md).

## Work Assignment Rules

For delegated, multi-file, release, or overnight work, define a clear package using the fields below. For a small direct request, infer the objective, named write scope, and completion criteria from the request; do not require the owner to fill out a template or choose a role before proceeding.

- Agent ID: one of `A01` to `A25`.
- Lifecycle metadata, when a branch/worktree is created: branch, worktree, branch owner, target PR, creation date, and expected closeout date.
- Objective: the result expected by morning or by the end of the work period.
- Write scope: exact files/directories the session may edit.
- Forbidden scope: files/directories the session must not edit.
- Acceptance criteria: what must be true for the task to be complete.
- Checks: commands or manual checks expected before handoff.
- Stop conditions: decisions that require owner input.

Before editing:

1. Read the effective instructions and relevant sections once; reuse unchanged instructions already in context.
2. Read the current assignment and applicable earlier authorization.
3. Inspect the relevant files and current Git status; preserve pre-existing edits.
4. Identify the intended changes and checks. A short progress note suffices for a bounded edit; use a written plan for complex or staged work.
5. Create/update a durable session log when branch/worktree lifecycle, actual parallel coordination, release intake, overnight reporting, or the assignment requires it. Otherwise the task's progress and final handoff suffice.
6. Verify scope yourself. This is a self-check, not a request for plan approval. Ask only about material missing information or an action outside authorization.

Codex visible progress updates:

- Every Codex progress/status message shown to the owner must name the responsible agent IDs and, when helpful, their role names. Do not describe ownership only as a generic layer such as "code layer", "QA", "release", or "content"; write entries like `A19-owned API configuration readiness`, `A22-owned release engineering`, or `A07-owned AI tutor behavior`.
- If an update involves multiple responsible agents, list each relevant agent ID with its responsibility in the same update, for example `A19-owned redacted provider readiness; A07-owned provider behavior; A22-owned release smoke evidence`.
- If a session is only consuming another agent session's output, state that relationship explicitly rather than implying shared ownership.
- This applies to short live updates, smoke-test narration, blocker descriptions, handoff notes, and report summaries. The owner should be able to tell from the visible Codex text which agent is accountable for each workstream without opening the logs.

After editing, provide a concise handoff covering the applicable items below. Combine items when clearer, omit irrelevant fields, and retain exact evidence for release/Git operations. A template does not authorize extra work.

- What changed.
- Files changed.
- Tests/checks run, with results.
- Tests/checks not run, with reasons.
- Assumptions made.
- Risks found.
- Blockers or follow-up work.
- Working-tree disposition: changes retained uncommitted for review | authorized reviewed commit | owner-approved discard | evidence archive | blocker. Formal release-intake packages use the four final states in Root And Worktree Policy.
- Worktree lifecycle action, when applicable: retained clean | retained with disclosed changes | PR opened | archived | removed | blocker | not applicable. Report the actual action; task completion alone does not authorize Git mutation or cleanup.

## Nightly AI Coordination Meeting

Use this workflow when the owner assigns overnight work or an authorized reporting automation invokes it. This is asynchronous coordination through session logs, blocker reports, handoff notes, and A10's morning synthesis. It does not start a nightly work session, require ordinary tasks to wait for a checkpoint, or authorize creation of an automation.

Default reporting window:

- Previous day 08:00-current day 08:00 Asia/Hong_Kong: A10 or the reporting automation summarizes AI session work, risks, blockers, test status, and decisions needed.
- 08:00 Asia/Hong_Kong: reporting window closes for the daily president report.
- 07:45 Asia/Hong_Kong: assigned agents stop starting large new edits and complete handoff notes for inclusion when practical.
- 07:50-08:00 Asia/Hong_Kong: A10 reviews logs, blockers, changed files, and check results.
- 08:00 Asia/Hong_Kong: A10 or a Codex automation produces the DOCX president report for Dr. Peter Hu.

Participation rules:

1. Only sessions explicitly assigned by the owner for that night may write feature code.
2. Unassigned sessions may be referenced in logs or reports, but they do not write code or make decisions.
3. A10 is the meeting secretary, quality coordinator, and president-report owner.
4. A10 may read every session log and blocker report, but should not edit another session's log except as part of the morning report process.
5. A10's default write scope for nightly coordination is `coordination/`, docs, config, and reports; A10 must not implement feature work inside non-A10 session scopes unless the owner explicitly assigns that work.
6. If no work or assignment exists in the previous-day-08:00-to-current-day-08:00 reporting window, A10's report should state `No assigned work in this reporting window` and summarize only the latest available project status.

Nightly meeting rhythm (within the assigned work window; skip elapsed/out-of-window checkpoints rather than waiting or replaying them):

1. 00:00 kickoff: A10 checks the owner's assignments, confirms each assigned session's write scope, and notes any obvious scope conflicts.
2. 02:30 checkpoint: assigned agents record current progress, risks, changed files so far, and any scope or dependency conflict.
3. 05:30 checkpoint: assigned agents prioritize blockers, test status, cross-role dependencies, and any work that must stop before morning.
4. 07:45 handoff: assigned agents finish their Agent Daily Work Report entries and avoid starting broad new changes.
5. 07:50-08:00 synthesis: A10 reads session logs and blockers from the reporting window, inspects project status, runs safe checks when practical, and writes the president report.

Nightly outputs:

- Agent daily work reports: `coordination/session-logs/YYYY-MM-DD-AXX.md`
- Blocker reports when needed: `coordination/blockers/YYYY-MM-DD-AXX.md`
- President report for Dr. Peter Hu: `coordination/reports/YYYY-MM-DD-president-report.docx`

Pause the affected action and state the concrete blocker when one of the following conditions applies. Continue independent authorized work. Ask only for the material decision or authorization needed; the presence of architecture, a shared file, or an approved credential source alone is not a reason to stop.

- Architecture/product decisions affecting multiple workstreams that exceed the assignment or require an unresolved owner choice. Routine reversible choices within the assigned design may proceed.
- Unapproved destructive operations, important data/evidence deletion, file resets, or replacement of app structure. Ordinary scoped document/code edits are not automatically destructive operations; preserve unrelated edits.
- Unapproved credential access, environment changes, or production access. Follow Local API Key Source for already-authorized lookup/use; this does not authorize environment placement or broader provider/production actions. Real environment edits remain A19-owned and owner-assigned; keep real values out of Git, logs, reports, screenshots, and command output, recording only variable names, environments, readiness, and redacted results.
- Unclear requirements that could send the project in two incompatible directions.
- Merge conflicts outside an authorized merge/conflict-resolution task, or simultaneous writers to the same file. Establish scope and writing order before touching that file; do not overwrite another session's edits. Resolve conflicts already assigned to this session within that scope, asking only when a substantive decision remains ambiguous.
- Package upgrades or dependency changes not included in the assignment.
- Any need to revert unrelated user or session changes.

## 8 AM President Report

When the owner assigns a president report/overnight coordination or an existing authorized reporting automation runs, A10 produces the concise, business-formatted bilingual DOCX president report for Dr. Peter Hu at 08:00 Asia/Hong_Kong. The window is the previous calendar day at 08:00 through the report date at 08:00 Asia/Hong_Kong. This section does not require unrelated tasks to wait for 08:00, create reports, or schedule automations.

The report should be generated from:

- Session logs in `coordination/session-logs/` relevant to the reporting window; consult earlier status only when necessary to explain an ongoing blocker or no-new-work case.
- Relevant blocker reports in `coordination/blockers/`; do not scan unrelated historical records.
- Release-intake and ownership maps in `coordination/release-intake/`, especially the latest A25 daily release intake.
- Integration decisions in `coordination/integration/` and candidate-to-live reports from A23.
- Current project files changed during the reporting window.
- Available check outputs from each session.
- Fresh checks run by the report owner when practical.

The report should summarize:

- Chinese Executive Summary.
- English Executive Summary.
- Reporting-window summary.
- Overall project progress.
- Completed work by session.
- In-progress work.
- Blockers.
- Risks.
- Test/build status.
- Files changed.
- Tomorrow priorities.
- Owner decisions needed.

The final artifact should be `coordination/reports/YYYY-MM-DD-president-report.docx`, with simple business formatting: clear title metadata, concise bilingual executive summaries, readable tables, restrained typography, and no decorative layout. A temporary Markdown outline may be used only as an intermediate working artifact; the deliverable for Dr. Peter Hu is the DOCX file.

Only when the owner requests creating/updating the recurring report automation, use the supported automation tool and check for an existing matching automation before creating a duplicate. The following is a prompt template, not an instruction to create one now; resolve `<assigned MAIS-MVP checkout>` to the owner's intended project path:

```text
Every day at 8:00 AM Asia/Hong_Kong, inspect <assigned MAIS-MVP checkout>. Read the applicable AGENTS.md, collect session logs and blockers relevant to the reporting window from coordination/, inspect the project status, run safe relevant checks when practical, and produce a concise bilingual DOCX president report for Dr. Peter Hu at coordination/reports/YYYY-MM-DD-president-report.docx. The reporting window is previous calendar day 08:00 through report date 08:00 Asia/Hong_Kong. The report must include a Chinese Executive Summary, English Executive Summary, reporting-window summary, project progress update, A01-A25 agent session status table, blockers, risks, test/build status, files changed, tomorrow priorities, and owner decisions needed. Use simple business formatting with readable tables and restrained typography. If no assignment or fresh work is found in the reporting window, state "No assigned work in this reporting window" and summarize the latest available project status. Do not edit feature code. Report creation does not authorize sending the report to others.
```

Do not ask the automation to edit feature code unless the owner explicitly assigns that work. The morning automation's default job is reporting and triage.

## Templates

Use only the template for the assigned workflow. These are conditional reference material for coordination/reporting work, not steps that every task must execute. Keep their unique fields and report preferences when applying them; omit irrelevant ordinary-task fields or mark them `not applicable`. A dedicated Skill may carry these details in a separately authorized migration, but do not delete the only copy or require loading unrelated Skills.

### Agent Session Assignment Template

```markdown
# Agent Session Assignment

- Date:
- Agent ID:
- Workstream:
- Branch:
- Worktree:
- Branch owner:
- Target PR: number/URL or `pending`
- Branch creation date:
- Expected closeout date:
- Objective:
- Allowed write scope:
- Forbidden write scope:
- Acceptance criteria:
- Required checks:
- Stop conditions:
- Notes from owner:
```

### Nightly Assignment Template

Use this when the owner assigns night work before resting.

```markdown
# Nightly Assignment

- Date:
- Night work window: 00:00-08:00 Asia/Hong_Kong
- President-report window: Previous day 08:00-current day 08:00 Asia/Hong_Kong
- Assigned agent sessions:
- Meeting secretary: A10
- Reporting deadline: 8:00 AM Asia/Hong_Kong

## Agent Session Packages

| Agent | Workstream | Objective | Allowed write scope | Forbidden write scope | Acceptance criteria | Required checks | Stop conditions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AXX |  |  |  |  |  |  |  |

## Cross-Session Notes

- Shared files reserved tonight:
- Known dependencies:
- Owner priorities:
- Decisions already made:
```

### Session Handoff Template

```markdown
# Session Handoff

- Date:
- Agent ID:
- Workstream:
- Branch:
- Worktree:
- Target PR and status:
- Branch creation date:
- Expected closeout date:
- Worktree lifecycle action: retained clean | retained with disclosed changes | PR opened | archived | removed | A25 review queue | blocker | not applicable
- Status: Completed | In progress | Blocked
- Summary:
- Files changed:
- Checks run:
- Checks not run:
- Assumptions:
- Blockers:
- Risks:
- Follow-up recommendations:
- Next suggested owner/agent:
```

### Agent Daily Work Report Template

For assigned nightly/reporting work or another workflow requiring a durable daily record, append this to the session's own log before handoff. Use the collision-safe path rule under Coordination Rules; ordinary bounded tasks may use a concise final response instead.

```markdown
# Agent Daily Work Report

- Date:
- Agent ID:
- Workstream:
- Branch:
- Worktree:
- Target PR and status:
- Branch creation date:
- Expected closeout date:
- Worktree lifecycle action: retained clean | retained with disclosed changes | PR opened | archived | removed | A25 review queue | blocker | not applicable
- Status: Completed | In progress | Blocked
- Objective:
- Summary of work completed:
- Files changed:
- Checks run:
- Checks not run:
- Blockers:
- Risks:
- Assumptions:
- Coordination notes for other agent sessions:
- Follow-up recommendations:
- Next suggested owner/agent:
```

### Blocker Report Template

```markdown
# Blocker Report

- Date:
- Agent ID:
- Task:
- Blocker type: Architecture | Scope conflict | Secret/credential | Missing requirement | Merge conflict | Dependency change | Other
- What happened:
- Files involved:
- Affected action paused and reason:
- Independent work completed or continuing:
- Decision needed from owner:
- Safe next step:
```

### A25 Daily Release Intake Template

A25 should create or update `coordination/release-intake/YYYY-MM-DD-A25-daily-release-intake.md` before morning synthesis or release planning.

```markdown
# A25 Daily Release Intake

- Date:
- Agent ID: A25
- Scope: Non-destructive dirty-tree and release-intake inventory
- Commands run:
  - `npm run release:dirty-map -- --reason "..."`
- Branch/worktree lifecycle inventory:
  - Local branch count:
  - Registered worktree count:
  - Dirty worktree count:
  - Detached worktree count:
  - Cached `origin/main` commit:
  - Live remote `main` commit:
  - `origin/main` alignment and verification time:
- A25 stale-branch review queue:
  - Branch:
  - Age from recorded creation date:
  - Recorded owner:
  - PR:
  - Review reason: no PR + no owner + older than 7 calendar days
  - Review status:
  - Deletion authorization: none
- Post-cleanup batch verification, if applicable:
  - Batch identifier:
  - Removal mode: normal/non-force
  - Local branch count:
  - Registered worktree count:
  - Dirty worktree count:
  - Detached worktree count:
  - Cached `origin/main` commit:
  - Live remote `main` commit:
  - Alignment result:
- Git status counts:
  - Modified:
  - Deleted:
  - Untracked status entries:
  - Untracked files:
- Largest dirty top-level areas:
- Shared files currently dirty:
- Ownership map:
  - A01:
  - A02:
  - A03:
  - A04:
  - A05:
  - A06:
  - A07:
  - A08:
  - A09:
  - A10:
  - A11:
  - A12:
  - A13:
  - A14:
  - A15:
  - A16:
  - A17:
  - A18:
  - A19:
  - A20:
  - A21:
  - A22:
  - A23:
  - A24:
  - A25:
- Conflict risks:
- Recommended PR/commit slices:
  - Runtime app/API/data:
  - Tests/regression evidence:
  - Docs/coordination evidence:
  - Content/RAG backlog:
  - Release hygiene tooling/config:
  - Local/generated quarantine:
- Release-safe clean-slice candidates:
- Files or directories that must not be staged:
- A22 clean release path:
- A22 generated cleanup status:
  - Dry run command:
  - Apply command, if owner-approved:
  - Playwright traces/reports preserved:
- Owner decisions needed:
```

### A11 Student Regression Split Template

When the student E2E gate is red, A11 should create `coordination/reports/YYYY-MM-DD-A11-student-regression-split.md` and assign each failure cluster to an owning agent session.

```markdown
# A11 Student Regression Split

- Date:
- Agent ID: A11
- Source run/artifacts:
- Overall gate status: Red | Yellow | Green
- Summary:

| Package | Owning agent | Failure cluster | Evidence | Suggested targeted command | Stop condition |
| --- | --- | --- | --- | --- | --- |
| A01 shell/auth | A01 + A09 when labels/selectors are involved |  |  |  |  |
| A02 dashboard/progress/adaptive display | A02 + A15 when semantics are involved |  |  |  |  |
| A03 roadmap | A03 + A09 when i18n/demo labels are involved |  |  |  |  |
| A04 Practice Arena | A04 + A15 when adaptive lock/free-selection semantics are involved |  |  |  |  |
| A05 lessons/textbooks | A05 + A18/A21/A23 when content packages are involved |  |  |  |  |
| A06 Visualization Lab | A06 |  |  |  |  |
| A09 copy/accessibility selectors | A09 with the owning feature session |  |  |  |  |
| A15 adaptive semantics | A15 + A02/A04 when UI surfaces consume adaptive state |  |  |  |  |

- Cross-package blockers:
- Checks to rerun after fixes:
- Owner decisions needed:
```

### A08/A10 Shared Drift Template

A08/A10 should use this when type-check, build, shared schema, or coordination-contract drift blocks other sessions.

```markdown
# A08/A10 Shared Drift Report

- Date:
- Primary owner: A08 shared state/types | A10 docs/config/tooling
- Consuming sessions:
- Drift type: Type schema | App provider state | Config/build | Coordination contract | Test harness
- Evidence:
- Dirty files involved:
- Ownership:
- Minimal cleanup slice:
- Required checks:
- A08-owned scope:
- A10-owned scope:
- A22-owned scope, if build/release isolation is affected:
- A11-owned scope, if regression harness assertions are affected:
- Stop conditions:
```

### A23 Candidate-To-Live Gate Template

A23 should use this before any A18/A21 content package is promoted into live app surfaces.

```markdown
# A23 Candidate-To-Live Gate

- Date:
- Agent ID: A23
- Candidate package:
- Upstream owner: A21
- Independent QA owner: A18
- Exact-layer owner, if needed: A24
- Live-surface owner: A04 practice | A05 lesson | A03 roadmap | other
- Regression owner: A11
- Release owner: A22
- Current decision: Candidate-only | Approved for integration review | Integrated, hold production | Promoted to production

## Required Evidence

- A21 candidate artifacts complete:
- A18 QA decision:
- A24 exact-layer decision, if needed:
- Owning live-surface integration plan:
- A11 targeted regression:
- A22 clean release slice or release blocker:
- Owner production approval: required before production promotion; not applicable to candidate-only/integration-review decisions:

## Promotion Decision

- Decision:
- Files allowed into live integration:
- Files explicitly excluded:
- Release path:
- Rollback/downlist path:
- Owner decisions needed:
```

### President Report DOCX Content Template

Use this content order for an assigned DOCX president report. The DOCX should be concise, bilingual, and business-formatted with clear headings, readable tables, and restrained typography. Retain the A01-A25 table; mark roles without supporting activity evidence `Not assigned` or `No update available` rather than inferring activity or creating agents to fill the table.

```text
President Report

Report date:
Report time: 8:00 AM Asia/Hong_Kong
Project: MAIS-MVP
Reporting agent: A10
Audience: Dr. Peter Hu
Reporting window: Previous day 08:00-current day 08:00 Asia/Hong_Kong

中文 Executive Summary

用中文简要说明项目健康度、报告窗口内是否推进、最重要成果、最大风险，以及今天最需要 Dr. Peter Hu 决策的事项。

English Executive Summary

Briefly summarize project health, whether work in the reporting window moved the project forward, the most important outcomes, the largest risks, and decisions needed from Dr. Peter Hu.

Reporting Window Summary

Assigned agent sessions:
Active sessions:
No assigned work in this reporting window: Yes | No
Coordination highlights:
Cross-session dependencies:

Project Progress

Short summary of current product progress, quality status, and whether the work improved speed, quality, or readiness.

Agent Session Results

Create a table with columns:
Agent | Status | Completed | In progress | Blockers | Files changed | Checks

Include rows for A01 through A25.

Completed Work

-

In-Progress Work

-

Blockers

-

Risks

-

Test and Build Status

`npm run type-check`:
`npm run test:analytics`:
`npm run build`:
Other checks:

Files Changed

-

Recommended Priorities

1.
2.
3.

Owner Decisions Needed

-
```

## Quick Start For Tonight

Apply this checklist only to owner-assigned overnight coordination; use only the steps whose release, regression, or content conditions apply.

1. Start with A25 daily release intake when the tree is dirty, especially before any release, deploy, or PR/commit slicing decision.
2. Pick only the sessions you want to run, for example `A02`, `A04`, `A06`, `A08`, and `A11`.
3. Give each selected session one package using the Nightly Assignment Template.
4. Keep write scopes separate. Example: do not assign both `A04` and `A08` to edit `types/index.ts` overnight.
5. Tell A11 to split any red student E2E gate into owner-routed regression packages instead of one broad bug bucket.
6. Tell A22 to use clean worktrees, pruned staging, or build/dev-server isolation for release work; dirty-root deploys require explicit owner risk acceptance.
7. Use A08/A10-owned shared schema/type-check/build-drift cleanup when multiple sessions are blocked by shared files or config.
8. Tell A23 to hold A18/A21 content packages at the candidate-to-live gate until QA, integration, regression, and release evidence are recorded.
9. Tell each selected session to create or update its own log in `coordination/session-logs/`.
10. Tell A10 to act as meeting secretary and prepare `coordination/reports/YYYY-MM-DD-president-report.docx`.
11. If no assignment is given, the 8:00 AM report should say `No assigned work in this reporting window`.
