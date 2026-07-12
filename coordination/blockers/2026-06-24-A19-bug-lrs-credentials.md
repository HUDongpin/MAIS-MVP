# Blocker Report

- Date: 2026-06-24
- Reporting agent: A11 QA and release quality, consuming A10 tooling output
- Owning follow-up: A19 API configuration and deployment env lead
- Related workstream: `team-bugfix` BUG_LRS read -> fix -> close loop
- Status: Resolved for local BUG_LRS queue reading

## What Happened

The `team-bugfix` workflow requires the canonical BUG_LRS queue command:

```bash
node scripts/bug-triage.js --since 30d
```

A10 restored the missing `scripts/bug-triage.js` CLI, and the command now executes and writes `bug-triage-report.md`.

The generated report shows the BUG_LRS queue is not configured in this local checkout:

- `Configured: no`
- Missing env names:
  - `BUG_LRS_ENDPOINT`
  - `BUG_LRS_USERNAME`
  - `BUG_LRS_PASSWORD`

## Credential Source Check

Following the MAIS-MVP credential rule, A11 checked the owner-approved local credential DOCX by variable name only.

Result:

- `BUG_LRS_ENDPOINT`: absent by name
- `BUG_LRS_USERNAME`: absent by name
- `BUG_LRS_PASSWORD`: absent by name
- `BUG_APP_ID`: absent by name

No credential values were copied, printed, summarized, screenshot, staged, committed, or written to this report.

## Impact

A11 cannot fetch authoritative live BUG_LRS P0 queue items, inspect `bug-triage-report.md` as real queue evidence, or run the required `--mark-fixed` close-loop for verified P0 fixes.

Local fallback P0 fixes and regressions can continue, but the full `team-bugfix` objective remains unproven until BUG_LRS credentials are configured.

## Required A19 Action

Configure the BUG_LRS environment for local and target release environments using approved secret handling:

- `BUG_LRS_ENDPOINT`
- `BUG_LRS_USERNAME`
- `BUG_LRS_PASSWORD`
- optional/recommended `BUG_APP_ID`
- optional/recommended `APP_URL`

Do not expose real values in Git, logs, reports, screenshots, shell history, or chat.

## Verification Command After A19 Completes

```bash
node scripts/bug-triage.js --since 30d
```

Expected after configuration:

- `bug-triage-report.md` shows `Configured: yes`.
- The report lists real BUG_LRS summary counts for the selected range.
- A11 can triage open P0-equivalent items and use `node scripts/bug-triage.js --mark-fixed <errorId> "<redacted note>"` only after verified fixes.

## Checks Already Run

- `node --check scripts/bug-triage.js` - pass.
- `node scripts/bug-triage.js --self-test` - pass.
- `node scripts/bug-triage.js --since 30d` - executes and writes `bug-triage-report.md`, but report is `Configured: no`.
- `git check-ignore -v bug-triage-report.md bug-fix-log.json` - pass.

## Resolution

A19 configured the local BUG_LRS variables through approved secret handling:

- `BUG_LRS_ENDPOINT`
- `BUG_LRS_USERNAME`
- `BUG_LRS_PASSWORD`

A19 also updated the local owner-approved credential DOCX so the `LRS` section uses the canonical `BUG_LRS_*` variable names. No real credential values were copied, printed, summarized, screenshot, staged, committed, or written to this report.

A10 then fixed the restored triage CLI so normal learning xAPI events are not misclassified as bugs. The CLI now only admits xAPI `failed` statements into the BUG queue.

A11 reran the live command:

```bash
node scripts/bug-triage.js --since 30d
```

Result:

- `Configured: yes`
- Total statements: 2175
- Unique bugs: 0
- Open: 0

No `--mark-fixed` command was run for the former 28 event-derived IDs because they were false positives from CLI filtering, not real `failed` bug statements.

Preview/Production BUG_LRS parity remains separate A19/A22 work if deployment environments need the same queue access.
