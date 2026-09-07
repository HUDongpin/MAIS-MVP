# AGENTS.md — MAIS-MVP Project Contract

This contract applies to this checkout and its descendants. Resolve the physical checkout, Git identity, and current branch; historical Desktop/Starship paths and `main` labels are not live state.

## Rule Scope, Authorization, And Completion

- Follow system/runtime instructions and actual tool permissions first. The owner's current task and still-applicable earlier authorization govern scope. Codex combines its global rules with project rules from the Git root down to the working directory; a more specific applicable directory rule overrides an earlier project default, not system/runtime permissions or an explicit owner restriction. A task-specific exception applies only to its named action and scope; it does not authorize unrelated operations.
- Use the applicable instructions already supplied by the host. Read missing instructions only when their directory scope or an explicit reference applies to the task; do not search unrelated ancestors or reread unchanged rules before each edit. `CLAUDE.md` is a companion summary, automatically loaded by Claude Code but not assumed loaded in other tools. Read its relevant section when working on the corresponding Git/server/release operation.
- `CLAUDE.md` summarizes worktree discipline; `RELEASE.md` supplies deployment procedures when release/deploy work is assigned. Apply their procedures within the authorization and task conditions below. This AGENTS contract and its linked scoped references define the project task conditions; interpret a shorter companion summary within those conditions rather than as new authorization or an unconditional workflow. If a material conflict remains, quote the conflicting file locations, continue unaffected work, and ask only about the dependent action. File instructions do not grant extra tool permissions.
- **Explanation, inspection, review, and diagnosis** authorize relevant read-only investigation and the requested findings or proposed diff. They do not automatically authorize repairs, dependency changes, Git mutations, or cleanup. An explicit request to both inspect and optimize/fix includes implementation within its stated scope.
- **Implementation requests** authorize the stated edits and proportionate local verification. Complete that work and make the result reviewable; do not stop at a plan or ask again to perform an already-authorized step. Use reasonable, reversible implementation choices within scope. Ask only when missing information would materially change the result, a real ownership conflict cannot be resolved within the assignment, or the next action exceeds authorization.
- Keep separate authorization boundaries for stage/commit/branch/merge/rebase/push, deployment (including Preview), production promotion, publication, sending messages to others, credential/environment changes, and deletion of important data or evidence. Preserve existing authorizations and the narrow first-upstream-push policy below. A passing check, completed edit, or clean worktree does not by itself authorize the next operation.
- A blocker pauses only the dependent action. Finish independent authorized work, preserve partial results, and state what remains. Do not label requested implementation complete while required work remains; distinguish completed edits from unrun verification, release intake, deployment, and cleanup.
- **Completion for ordinary work:** deliver the requested answer or edits, perform the applicable checks, and report the result and material limits. Uncommitted edits retained for review are a valid outcome when committing is not assigned. Formal release packages retain their separate disposition requirements below.
- Use a Skill only when explicitly requested or when its actual scope fits the task; read only the relevant Skill and necessary references. A Skill's workflow is not a requirement for unrelated tasks. Preserve explicitly assigned model/provider routing and limits; do not switch models/providers or add external model calls merely to satisfy a generic workflow.
- The role registry does not require all roles, multiple models, or subagents for every task. Delegate bounded independent work when useful and permitted by the runtime/task; delegated work inherits the same scope and permissions. Required independent A18 QA and release checks remain independent. A read-only helper does not need a separate branch/worktree; independent editing sessions follow the isolation policy.

## Load Only The Relevant Guidance

These references remain part of the project contract for their named scopes. Use headings or targeted searches to read the applicable section; do not load all three for an ordinary edit.

| When needed | Source |
| --- | --- |
| Identify a lane, a shared-file owner, a content boundary, or a server/session coordination rule | [Roles and ownership](coordination/agent-guidance/roles-and-ownership.md) |
| Select checks for the behavior or artifact being changed | [Verification by change type](coordination/agent-guidance/verification.md) |
| Assign/delegate work, produce a formal handoff, perform overnight coordination, or prepare a president report | [Coordination and report templates](coordination/agent-guidance/coordination-and-reporting.md) |

## Workflow Selection

| Task condition | Applicable workflow and completion evidence |
| --- | --- |
| Explanation, diagnosis, or review only | Relevant rules/files and evidence-backed findings; no automatic edits, log creation, worktree creation, or repair. |
| Bounded implementation or document edit | Assigned scope, status inspection, proportionate checks, and concise handoff. Use an assigned isolated checkout, or an explicit in-place exception under Root And Worktree Policy. |
| Independent branch/worktree work | Baseline and lifecycle metadata; authorized Git actions; preserve the reviewable slice. |
| Release planning, morning synthesis, release slicing, or deploy preflight | Applicable A25 intake and A11/A22/A23 gates below; `RELEASE.md` for deployment. Readiness does not authorize deployment. |
| Assigned overnight work or recurring president report | Nightly/report workflow and its templates; ordinary tasks do not start this workflow or create an automation. |

## Project Snapshot

- Project: `MAIS-MVP`, a bilingual math learning platform that began with Hong Kong P1-S6 and now also includes mainland China and US curriculum/RAG/question-bank expansion work.
- Stack: Next.js App Router, React 19, TypeScript strict mode, Tailwind CSS, Framer Motion.
- Package manager: use `npm` scripts from `package.json`.
- Important scripts:
  - `npm run dev` starts the local Next.js dev server; use `npm run dev:isolated` for concurrent/shared-checkout work as described under Coordination Rules.
  - `npm run build` runs a production Next build.
  - `npm run type-check` runs `tsc --noEmit --incremental false`.
  - `npm run test:analytics` runs the configured analytics test runner (`scripts/run-analytics-tests.mjs`).
- Checkout state is live, not a project constant: verify the physical path, Git worktree/common directory, branch/HEAD, and `git status --short` before editing. Preserve existing owner/agent changes; use literal checkout targeting if Git configuration redirects the worktree. Do not stage, commit, branch, merge, rebase, push, revert, or delete existing files without the owner's assignment for that operation. The only standing push exception is the first upstream push for an already-authorized session branch under the continuous-closeout policy; it does not override A25's stricter Git-mutation ban.
- Do not hand-edit or stage generated/local runtime outputs such as `node_modules/`, `.next/`, `.tmp/`, `tsconfig.tsbuildinfo`, or `.DS_Store`. Authorized build/test/dev tools may generate their normal isolated outputs; this is not permission to delete existing evidence. Real `.env`, `.env.local`, and other secret-file edits remain restricted to owner-assigned A19 configuration work. Assigned candidate content/artifacts follow the content scopes below.

## Purpose

The goal is steady project progress without conflicting edits, lost work, or unreviewable changes, with many AI sessions able to work in parallel while the owner is offline or sleeping.

## Operating Model — Core Invariant

The unit of coordination is the session slice, not the agent identity:

- **One independent editing session = one assigned worktree/branch = one reviewable slice.** Do not share a branch/worktree between independent writers. Read-only work, a helper reviewing the same slice, and explicitly assigned in-place inventory/reporting/document edits do not require creating another worktree. This is an isolation requirement, not authorization to create a branch or worktree.
- The `A01`-`A25` role IDs in the linked registry are a **routing taxonomy, not a staffing plan**: they provide attribution (session logs, reports), routing vocabulary ("this belongs in A04's lane"), and default scope boundaries for assignments. Most days only a few lanes are active; an unstaffed lane is normal, not a gap.
- Roles come in two tiers:
  - **Gate-wired** (operational teeth — referenced by scripts, gates, and standing reports): `A10` coordination/reporting, `A11` QA/regression gates, `A22` release engineering, `A23` candidate-to-live promotion, `A25` git hygiene/release intake.
  - **Domain lanes** (routing vocabulary): the remaining roles. Sharpen an existing lane before inventing structure; never add `A26+` without owner approval.
- Release-intake ownership and package boundaries are recorded in `coordination/release-intake/owner-pathspecs.json` / `owner-package-manifest.json`; relevant gates enforce part of the contract. The role table supplies default routing and write boundaries when an assignment is silent. An explicit owner assignment can grant a cross-lane slice; it does not cancel independent QA, active-writer coordination, or release gates. Role `Available` status does not establish current file/worktree occupancy.

Every agent/session must:

- Read the applicable instructions once as described under Rule Scope, Authorization, And Completion.
- Declare its agent ID (or the lane it is borrowing), such as `A01`, in its first note or session log.
- Work only inside its assigned write scope (its session slice).
- Keep changes small, reviewable, and aligned with the existing project style.
- Leave a concise handoff at completion or when blocked; the final response suffices for an ordinary bounded task unless a durable session/release/nightly record is required by the assignment or lifecycle workflow.
- Never revert unrelated user or agent changes.

## Current Coordination Posture

- Do not add `A26+` roles for the current workload. The present bottleneck is coordination and release control, not missing headcount.
- When a new surface appears inside an existing workstream, sharpen the relevant `A01`-`A25` scope first instead of creating a new agent.
- Current priority pressure points are dirty-tree slicing, shared schema/build isolation, A11/A22 regression gates, and A18/A21/A23/A24 candidate-to-live gates.
- New parallel assignments should prefer smaller packages for existing owners, especially A25 release intake, A22 build/dev-server isolation, A11 targeted regression, and A08/A10 shared-schema cleanup.

## Root And Worktree Policy

- The companion digest lives in `CLAUDE.md`. When changing this policy, synchronize that file only if it is in the authorized write scope; otherwise supply a proposed diff and identify remaining drift. Claude-specific settings deny broad `git add`, and `scripts/claude-root-git-guard.mjs` guards its configured primary root. Do not assume those hooks cover another path or another agent runtime, and do not bypass a rejected action.
- Treat the shared primary checkout as an integration inventory and release-intake area, not the default feature workspace. Verify its actual path and branch; the historical Desktop path and `main` references are not live state. In a shared primary checkout, do not run `git switch`, `git checkout`, `git stash`, `git rebase`, or `git reset --hard`. `git restore` also requires scoped recovery authorization; it is not a generic way to clear others' edits.
- A01-A25 implementation work uses its assigned isolated branch/worktree (naming in practice: `feat/*`, `fix/*`, `chore/*`, `docs/*`, session-generated `claude/*`, or legacy `codex/Axx-short-scope`; use the runtime's default prefix when specified) or an owner-approved clean clone. Read-only investigation needs no new worktree. The owner may explicitly assign in-place inventory/reporting or bounded documentation/configuration edits to named files; record that scope and preserve unrelated content. This exception does not authorize feature work or dirty-root deployment.
- Before creating an authorized isolated worktree, verify the baseline branch/commit. Inspect dependency state and run relevant baseline checks only when the implementation needs them; documentation-only work needs no dependency installation or application build. Record pre-existing failures instead of expanding the task to repair them.
- At handoff, if commits are authorized, commit only the assigned reviewable slice from that worktree. If they are not, retain the edits and report `completed; changes retained uncommitted for review`. Do not mix unrelated dirty-root inventory files into the slice or request a commit merely to satisfy a template.
- Never use `git add .`, `git add -A`, or an equivalent broad wildcard for release packages. Stage only the exact owner-approved pathspecs for the assigned slice. Broad staging is also prohibited outside release work.
- `coordination/release-intake/owner-pathspecs.json` and `owner-package-manifest.json` are the release-intake source of truth for owner routing, package boundaries, checks, and staging scope.
- Every formal release-intake package must end in exactly one recorded final state: `reviewed commit`, `owner-approved discard`, `evidence archive`, or `blocker report`. This does not force ordinary edits into release intake or authorize a disposition operation; report an unresolved release disposition separately from completed implementation.
- The root may collect assigned A25 dirty-tree maps, A10/A25 coordination reports, A22 release-readiness evidence, and explicitly assigned in-place document/configuration edits. Dirty-root deployment is prohibited except for the named, explicitly recorded owner risk exception in Daily Operational Gates and `RELEASE.md`; an in-place editing exception is not that approval.

## Continuous Branch And Worktree Closeout

These closeout rules apply to tasks that create, use, or explicitly close a session branch/worktree. Read-only answers and bounded in-place edits do not trigger repository-wide lifecycle cleanup:

- Maintain one independent editing session per assigned branch/worktree as defined in the Operating Model; the pair is its reviewable and recoverable unit.
- When creating a branch/worktree, record its `owner`, `target PR` (number/URL or `pending`), `creation date`, and `expected closeout date` in the session log or A25 lifecycle/release-intake record.
- Once an assignment authorizes branch creation and commits, push promptly and establish an upstream after the first valid, reviewable commit so the only recoverable copy never remains local; this standing lifecycle authorization does not permit pushing `main`, unrelated refs, work explicitly marked local-only, or any push forbidden by a stricter role-specific rule such as A25's mutation ban.
- Keep a branch with an open PR until the PR is completed or explicitly closed; an open-PR branch is not a cleanup candidate.
- After a branch is merged, target same-day removal of its linked worktree when cleanup for that exact worktree is owner-authorized. First prove it is clean, has no active writer, and contains no uncommitted/untracked work requiring preservation. If cleanup is not authorized or those checks fail, retain it and report the pending closeout; merge success does not itself grant removal authority.
- Never remove a dirty worktree. Treat any staged, unstaged, or untracked content reported by `git status --porcelain --untracked-files=all` as dirty, and resolve it to a recorded final state before removal.
- A branch with no PR, no recorded owner, and an age greater than 7 calendar days, measured from its recorded creation date, must enter the A25 review queue; it must never be deleted automatically.
- Never use `git stash` as an isolation mechanism across worktrees.
- Prohibit destructive cleanup shortcuts: `git branch -D $(...)`, wildcard or bulk branch deletion, `git worktree remove --force`, `git clean -fdx`, and `git reset --hard`.
- After every authorized cleanup batch, freshly record the local branch count, registered worktree count, dirty worktree count, detached worktree count, and `origin/main` alignment. Count detached worktrees from `git worktree list --porcelain`, and use live remote verification such as `git ls-remote --heads origin main` before claiming remote-main state rather than relying only on a cached tracking ref.

## Daily Operational Gates

Apply each gate when its named workflow is assigned or its release condition is reached. They are not prerequisites for unrelated questions, diagnosis, or ordinary scoped edits. The standing release controls remain in effect:

1. Before release planning, morning synthesis, slicing existing work across branches/worktrees, or deploy preflight, obtain a current A25 non-destructive ownership/intake map with `npm run release:dirty-map -- --reason "<reason>"`, identify shared-file conflicts, and recommend PR/commit slices. Verify and reuse a current map for the same checkout/state when available; rerun when relevant state has changed. Merely inspecting a branch or editing a bounded document does not trigger this gate. A25 must not stage, commit, branch, push, reset, delete, revert, or clean files unless the owner explicitly assigns that exact Git operation.
2. A22 release builds and publishing must use a clean worktree, clean clone, reviewed clean release slice, or pruned staging directory. This release-source requirement does not prohibit isolated local verification of an assigned uncommitted change. A22 must not publish from a dirty repository root. The only exception is an explicit owner instruction accepting dirty-root production risk for a named deployment scope, recorded in a release report. Follow `RELEASE.md`; readiness or a green dry run does not replace deploy authorization.
3. A11 QA must split a red student E2E gate into small regression packages and route each package to the owning agent sessions instead of treating the red gate as one large fix. Current student red-gate routing should use A01 for shell/auth entry, A02 for dashboard/progress/adaptive display, A03 for roadmap, A04 for Practice Arena, A05 for lessons/textbooks, A06 for Visualization Lab, A09 for copy/accessibility selectors, and A15 for adaptive semantics.
4. A08/A10-owned shared schema, type-check, build-drift, and coordination-contract cleanup must lead multi-agent drift fixes. A08-owned scope covers shared app types/state semantics; A10-owned scope covers docs/config/tooling/reporting coordination. A22 joins when build or release isolation is affected, and A11 joins when regression harness drift is affected.
5. A23 remains the candidate-to-live gatekeeper for A18/A21 content packages. Content generated by A21 must not go directly into live question, topic, lesson, asset, or route surfaces without A18 independent QA, A23 promotion planning, owning live-surface implementation, A11 regression evidence, and A22 release readiness.
6. When a merge/release source contains mixed dirty work, A10/A25 must separate it into small review packages: runtime app/API/data, tests/regression evidence, docs/coordination evidence, content/RAG backlog, release hygiene tooling/config, and local/generated quarantine. Review and regression-check packages independently, committing only with authorization. Assess the actual tree; do not assume it is permanently large or dirty, and do not expand a bounded task into whole-repository slicing.
7. Assigned A22 generated-artifact cleanup starts with `node scripts/cleanup-generated-artifacts.mjs --dry-run`. Run `node scripts/cleanup-generated-artifacts.mjs --apply` only with cleanup authorization and after confirming the selected scope contains no Playwright traces, reports, logs, or other evidence requiring preservation. A dry run alone does not authorize deletion. Do not use broad destructive commands such as `git clean -fdx` for release hygiene.

## Project Conventions

- Use the `@/` path alias for project imports.
- Add `"use client";` only for components that need hooks, browser APIs, Framer Motion client behavior, or local storage.
- Keep shared types in `types/index.ts`.
- Keep reusable mock data in `data/`.
- Keep pure math, analytics, and utility logic in `lib/`.
- Keep bilingual UI copy as `{ en, zh }` localized text where the surrounding code already uses the dictionary or `LocalizedText`.
- Preserve the current design language: `page-container`, `glass-panel`, `soft-panel`, `gradient-text`, `focus-ring`, Tailwind utility classes, dark-mode support, and responsive layouts.
- Keep server-only LLM configuration in `.env.local`; never expose secrets through `NEXT_PUBLIC_` variables unless the owner explicitly approves. A19-owned API configuration work may configure real local and Vercel environment variables only when explicitly assigned by the owner, and must never write secret values into Git, session logs, reports, screenshots, or command output.

## Local API Key Source

- Owner-approved local credential source: `/Users/dongpinhu/Desktop/MAIS-MVP/All API Keys.docx`.
- Only when authorized MAIS-MVP work actually requires a provider credential, first check that local DOCX for the needed provider before asking the owner. This includes DeepSeek credentials, which the owner has authorized Codex to read and use for assigned tasks requiring live DeepSeek access. Do not inspect credentials for unrelated diagnosis, documentation, or rule audits. Credential access is not permission to change provider/model routing or run unrelated live calls.
- Never copy, print, summarize, commit, stage, screenshot, or log real credential values from `All API Keys.docx`, `.env.local`, Vercel, or any other secret source. Only record variable names, provider names, target environments, and redacted status.
- If a required credential is absent, pause the credential-dependent action and ask the owner to provide or acquire it; continue independent authorized work. Treat historical examples of unpurchased OpenAI/video-provider keys as examples, not a current inventory. Never guess, fabricate, or silently substitute another provider's credentials.
- API environment placement, local/Vercel parity, and redacted credential inventories remain A19-owned. Provider behavior changes still require coordination with the owning API/provider session.

## Everyday Coordination And Verification

- Name the responsible A01–A25 lane in every Codex-visible progress/status message, including brief updates, blockers, checks, and handoffs. For multiple lanes, name each responsibility; distinguish producing an output from consuming another lane's evidence.
- One file has one writer at a time. Use the explicit assignment as the write boundary; relevant reading needs no write ownership. Pause only a conflicting/out-of-scope edit, preserve other writers' content, and continue independent authorized work. An unstaffed lane does not require spawning an agent or asking again for an already assigned edit.
- A bounded edit may use a short progress note and final handoff. Persistent logs/plans apply when the assignment, worktree lifecycle, actual parallel coordination, release intake, or nightly workflow requires them. Same-day sessions borrowing a lane use distinct log suffixes. Do not create records solely to fill a template or edit another session's log outside assigned report work.
- For code changes, select the applicable requirements in [Verification by change type](coordination/agent-guidance/verification.md). Run relevant existing checks once against the changed state; rerun or broaden only for a new change, failure, or unresolved concern. Documentation/Skill-text edits require consistency, references, metadata, and relevant contract checks, not an application build. Preserve required release/content gates.
- Use mocked provider checks by default; existing task/provider authorization governs live calls. If a required check cannot run, report the concrete limitation and remaining uncertainty, finish unaffected work, and distinguish completed implementation from unverified behavior or release readiness.
- Start dev/preview servers from the assigned checkout, with an owned port and isolated `NEXT_DIST_DIR`. For concurrent/shared checkout work use `npm run dev:isolated` or `NEXT_DIST_DIR=.tmp/<label>`; never share root `.next` between sessions. Before stopping a listener with `npm run kill-port -- <port>`, verify it still belongs to this session. Prefer normal termination; force only a verified owned process that fails to exit. See the roles reference for the specific `.next`/`BUILD_ID` failure mechanism.
- Root AGENTS and its references contain project requirements, not an instruction to schedule automations. Only assigned overnight/reporting work uses the 08:00 Asia/Hong_Kong workflow and bilingual DOCX templates; creating a report does not authorize sending it to others.
