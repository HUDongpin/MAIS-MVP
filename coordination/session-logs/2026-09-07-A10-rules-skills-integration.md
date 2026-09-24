# A10 rules and Skill source integration

- Owner: A10, current task 01a07b9f-f36b-7a23-b496-f320c502966f; A25 intake.
- Branch: codex/a10-rules-skills-integration-20260907.
- Worktree: /Volumes/Starship/MAIS-MVP/.worktrees/a10-rules-skills-integration-20260907.
- Base: 34c10c202972dd901fa72f2aad7b21a3432d387b.
- Source: current root AGENTS/guides and a10-agentops-suite-currentness at 2e95fcc9dbcae2b73227c7fb16553bf17e991265 plus reviewed uncommitted Skill adaptations. Original sources remain untouched.
- Created: 2026-09-07. Expected closeout: 2026-09-08 after review and separately authorized Git disposition. Target PR: pending.
- Scope: AGENTS.md, its three guidance documents, companion CLAUDE.md consistency, coordination/skills/**, this session log. No AgentOps/GraphOps application integration or package change.
- Outcome: source integration candidate prepared; changes retained uncommitted for review. Current native compatibility remains blocked as detailed below. No commit, push, merge, global installation, deployment or cleanup is claimed.

## Acceptance and verification

The root AGENTS and three guides were copied byte-for-byte from the reviewed current root. The five-Skill source contains the September7 instruction changes once; no AgentOps/GraphOps runtime or package files were imported. CLAUDE was adapted to the same authorization/isolation/closeout conditions. A duplicate dated-case label was corrected.

The original manifest is preserved unchanged at coordination/skills/benchmarks/historical-suite-manifest-20260827.json with SHA25646754e1b7927fbac774c6efe8818885bb1595fc87ca6df95ecff62d8b179968b. Current manifest1.1 hashes bind the current source. Historical benchmark/package/installation claims do not certify it; current model evaluation, packaging and installation remain not run/not built/not installed. The 29 behavioral definitions and100 trigger queries are inventories, not new modelbenchmark results.

- Initial suite-tools:18/23 passed;5 failures exposed moved prose sections, changed eval inventory and a dated constant. The tests now target relocated formal contracts while preserving exact schema-field assertions and authority restrictions.
- Suite-tools after adaptation:24/24 passed, including current/hash versus historical-proof separation.
- Initial full offline suite:383/384 passed;the sole failure was a mutable origin/main historical-rejection test. An intermediate repair pinned the historical baseline and retained exact WORKFLOW_JSON_PARSE_UNTRUSTED rejection. Independent quality review then identified that shallow clones or standalone packages would lack this old Git object. The final test uses a fully generated, committed local fixture repository with a non-comparator JSON.parse and retains the same exact rejection assertion; it neither clones process.cwd nor fetches any historical object. The fixed historical attempt log is retained as intermediate evidence, not as the final fixture definition.
- Final full offline suite:384/384 passed, zero failures/skips (16 test files).
- Official quick_validate:5/5 passed. Local Markdown links:43 checked,0 missing. git diff --check passed.
- Application build/type/E2E: not run for this documentation/standalone-Skill source slice; no app/runtime/package integration.
- A11 independent specification review: PASS after source-hash/log refresh. Independent quality review identified one test portability issue; the final self-contained fixture repair passed from both the candidate root and /private/tmp. Independent A10/A11 quality re-review:PASS;the portability finding is closed.

## Native compatibility hold

Read-only discovery against native main34c10c202972dd901fa72f2aad7b21a3432d387b fails closed with WORKFLOW_STRUCTURE_INVALID because its workflow is outside the unchanged closed recognizer. The separate native-compatibility.json and README retain this hold. Frozen historical fixture success and offline suite success do not establish current native execution compatibility. No recognizer, runtime validator, schema, provider or trust boundary was relaxed. Any current-workflow compatibility adaptation requires its own reviewed implementation and evidence.

Source copy manifest and all command logs remain under /Volumes/Starship/MAIS-MVP/.tmp/a10-a12-a17-integration-20260907/. Original dirty worktrees and evidence are retained.

Final portable full suite:384/384 passed,zero skipped. The current source/package-view hashes were refreshed after the test-only change; native compatibility remains blocked.

## Final A25 intake mapping

The actual candidate intake found CLAUDE.md unmapped. Added only that exact path to existing A10-tooling-docs-config and its expectedOwner A10 resolution check in owner-pathspecs.json; all existing routing/policy remains unchanged. Native manifest validation passed35resolutionchecks. Final candidate now has105changedpaths including this small ownership metadata adaptation. No package.json/dependency/app behavior changed. Final intake and patch manifests supersede earlier file counts while preserving their logs.
