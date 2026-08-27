# A25 evidence archive — blocked Google OAuth loop

- Generated: `2026-08-22T20:31:00Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: **evidence archive**
- Original branch: `codex/a01-a12-google-oauth-loop`
- Original worktree: `/Volumes/Starship/MAIS-google-oauth-wt`
- Original branch head: `b1b89d4cd5f2fc128275d6f84c6361c8ec12808f`
- Archive commit: `22d7c0f645837f8e1ef2094fdacb037879eb37af`
- GitHub archive ref: `origin/archive/google-oauth-loop-blocked-20260823`
- GitHub PR for the original branch: none
- Repository visibility at archive time: `PRIVATE`

## Decision

Preserve the complete 57-path OAuth implementation and its governance/legal evidence as a private remote archive. Do not open a merge PR, publish legal pages, configure provider credentials, or deploy this package.

The original baseline is contained by live `origin/main`, but none of the 57 working-tree paths exactly matched live main. The archive records 7,186 insertions and 354 deletions. It includes OAuth/OIDC/PKCE implementation, auth and persistence hardening, UI and public-site changes, draft Privacy/Terms pages, tests, release gates, activation/legal reports, and the owner-lane session handoff.

The handoff records extensive historical local verification, but also identifies hard external and product gates: no approved Google production client or secret, no final owner/counsel approval for the legal texts, no completed operator/provider/retention/deletion/minor-account facts, no real-provider acceptance, and no clean current-main integration/release gate. An evidence archive preserves this work without misrepresenting it as releaseable.

## Owner grouping

| Owner lane | Archived concern |
|---|---|
| A01 | public shell, homepage, login, layout and footer integration |
| A08 | shared provider/auth state semantics |
| A09 | bilingual/error/legal copy and metadata |
| A10 | CI, package scripts, governance, legal/activation reports |
| A11 | OAuth browser and release regression contracts |
| A12 | OAuth routes, login/session/storage/media authorization |
| A19 | redacted environment/readiness contracts; no real secret is archived |
| A22 | build, production certification, deploy and rollback gates |
| A25 | exact archive, private recovery ref, and closure evidence |

## Archive verification

- Repository visibility: PRIVATE, verified with GitHub before pushing the draft/legal evidence.
- Secret-pattern gate: PASS for private keys and common Google/OpenAI/GitHub key prefixes.
- `.env.local.example` Google client-secret assignment gate: PASS; no real assigned secret found.
- Exact cached path count: 57.
- Live-main byte comparison: 0 of 57 paths exactly equal live `origin/main`.
- Archive commit and GitHub archive ref: identical at `22d7c0f645837f8e1ef2094fdacb037879eb37af`.
- Post-commit worktree status: clean.
- `git diff --check`: WARNING only for eight preserved Markdown two-space line breaks across the historical runbook, legal packet, and session log; no source-code whitespace finding was reported.
- Current-turn product tests: NOT RUN; historical results remain in the archived handoff and must not be treated as current-main/live acceptance.
- No provider, Vercel, legal-publication, or deployment mutation was performed.
- No GitHub remote branch was deleted.

## Recovery

```sh
git fetch origin archive/google-oauth-loop-blocked-20260823
git worktree add /Volumes/Starship/MAIS-google-oauth-recovered-wt 22d7c0f645837f8e1ef2094fdacb037879eb37af
```

Future work must integrate from fresh `origin/main`, preserve owner path boundaries, obtain final legal/operator decisions and separate environment-specific Google clients, rerun all code/browser/build/governance gates, and complete real-provider durable acceptance before any production claim. The original worktree may be removed only with plain non-forced removal after manifest, clean/ref, and process checks. Retain both archive refs.

## Post-archive closure

At `2026-08-22T20:31:01Z`, A25 revalidated the JSON manifest, clean status, identical local and private-GitHub archive tips, and absence of any process whose cwd was inside the worktree. Plain non-forced `git worktree remove /Volumes/Starship/MAIS-google-oauth-wt` succeeded. The path and registration are absent.

The local branch `codex/a01-a12-google-oauth-loop` and private GitHub archive ref remain at `22d7c0f645837f8e1ef2094fdacb037879eb37af`. No local or GitHub remote branch was deleted.
