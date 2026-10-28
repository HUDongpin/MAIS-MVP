# Exact PR301 Nova voice and formatting admission

PR301 is the current-main successor to PR258. It preserves the compiled `ws` transport, settles synchronous send errors, decodes escaped prose newlines without corrupting delimited math/code or recognized math commands, and preserves displayed paragraph breaks. Its selected browser tests also exposed and repaired absolute build-path handling and a bounded Dashboard grid/name-wrapping issue that prevented normal mobile launcher access. No auth/data policy, provider configuration, credentials or live curriculum content was changed.

## Frozen source and runtime evidence

- Base B: `638d6e7e0a16f1693a6a1afca72bb43ef9debbac`.
- Source S: `5e20119b246f3b4d34d8fbfc079f12cae17affdc`; exact parent `324355a3c6245f24fbee1f7d3a28b9e2595c1790`.
- Source tree: `f2b917b9b696fc85464810412bf8a611e46450e7`.
- B → S inventory: `ac767603f4afb4ac1767ddc84317a11abf1125945ca95775d2b9c02c86cd526e`, exactly twelve paths.
- Fresh source-check record SHA-256: `c51a01272d74dd9958ee33ea78590732380e348078411377c3ce03a0828f6a23`.
- Local runtime record SHA-256: `a16f7217aa8598c57e3ba4d35c7e9a63f331dae8ec0f56e32ca4eb2794c9d859`.

The source inventory includes the original nine functional/test/config paths, a new lifecycle record, the narrow CI compiled-voice step and the Dashboard sizing correction. The original PR258 source and its historical log remain independently recoverable; this is a reviewed port, not a claim that the original branch history has landed.

The runtime record consumes an actual clean, stable production build of S: build `M-lRkZo1mG8k0xmqg5RWi`, 2,560 artifact files and SHA-256 artifact root `558f6f163d478da769bd9a8021370bc90a3a57d5be190f46206cf093b74ac60e`. Its complete artifact tree was rechecked after runtime tests. A compiled-route WebSocket test sent a real long frame through a loopback server. Desktop tests passed 3/3, mobile 1/1 and the full backend gate 6/6, with no skips, retries or flaky results. The long display-name fixture and ordinary mobile click were retained; page-width, paragraph geometry, rendered LaTeX and page-error assertions passed. Both screenshots were visually inspected.

The record binds raw build/report/log/screenshot hashes, exact test titles and commands, chronology, the source tree, and twenty-two source/dependency files. The existing gate compares those dependency bytes with S and current HEAD. Earlier harness and mobile failures remain separate records and are not counted as successful acceptance.

## Exact tooling and evidence partition

T is a direct child of S and changes exactly this document, the new checker/test and deterministic Promotion workflow additions before PR300 v2. E is a direct child of T and first-adds eight files under `coordination/integration/reviewed-code/pr301-v1/`: admission, source inventory/checks, runtime evidence, and actual independent A11/A23 JSON/Markdown pairs. Reviewers inspect immutable T, source execution, runtime reports and images before E is sealed. Synthetic contract-test fixtures are never actual approval records.

Only same-repository PR301 at exact base B and head E is admitted. An authorized main merge must have ordered parents `[B,E]` and E's exact tree. Changed source/tooling/evidence paths, forks, wrong bases, descendants, stale/future reviews, malformed authority JSON, altered runtime claims and permission widening fail closed. Removing the deterministic selector/mode/check/upload insertions reconstructs S's full previous workflow byte-for-byte. A failing present marker cannot fall back to an older approval.

The gate freshly executes 41 adversarial contracts, strict TypeScript, and 40 provider/newline/display unit cases with exact complete TAP names/counts and zero failures/skips/cancellations/TODOs. Child environments exclude inherited provider/database credentials, `NODE_OPTIONS` and `NODE_PATH`; output is confined to a fresh private directory outside the repository. Source state and full materialization are checked before and after execution. The macOS long-path limitation does not waive the unchanged Ubuntu materialization guard.

## Claim boundaries and ownership

Local production-build/runtime evidence is consumed by hash; the Promotion job does not replay the build or browser sessions. `buildReexecutedInPromotion=false`, `browserReexecutedInCi=false` and `liveVoiceProven=false` remain explicit. Ordinary CI separately builds the final head and executes the compiled voice test after that build. Its result and the exact required check must both pass before acceptance.

All six admission permissions remain false. No native content Manifest/Shadow Receipt, historical Promotion revalidation, live provider, microphone/speaker acceptance, deployment or production-health recovery is asserted. Browser/backend execution used synthetic identities, mocked providers and loopback services.

A07 owns the source, with bounded A02 layout support and A10/A22 tooling; A11 `/root/pr286_source_review` and A23 `/root/pr300_a23` review independently. Branch `codex/pr258-current-main-20261029` reuses `/Users/dongpinhu/.codex/worktrees/p286/MAIS-MVP`. Target PR301 succeeds PR258. Created 2026-10-29 Asia/Taipei; closeout follows actual PR/main checks and evidence preservation. The remaining owner sequence is PR269 → PR275 → PR225; historical sources remain deferred.
