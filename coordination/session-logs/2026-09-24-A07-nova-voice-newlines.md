# A07 Nova Tutor voice and reply formatting, 2026-09-24

- Owner: A07 (Nova Tutor)
- Session branch: `codex/a07-nova-voice-newlines-20260924`
- Worktree: `/Users/dongpinhu/.codex/worktrees/a07-nova-voice-newlines-20260924/MAIS-MVP`
- Baseline: `main@8aeeda5565a03c41d56c139c298344466da813a9`
- Target PR: pending
- Creation date: 2026-09-24 (Asia/Hong_Kong)
- Expected closeout date: 2026-09-27 (Asia/Hong_Kong)
- Assigned slice: Nova Tutor voice packaging and reply newline rendering, with focused regression tests and real provider/browser verification.
- Authorization: owner approved creation of this A07 isolated worktree, then authorized a clean dependency build, A07 commit, upstream push, and draft PR for independent review. Deployment, merge, and cleanup remain separate actions.

## Baseline observations

- The owner-requested `main` retest found that its compiled voice route bundles `ws` with an empty optional `bufferutil` module. Sending a long realtime frame throws `TypeError: b.mask is not a function`.
- Literal provider `\\n` remains visible in rendered replies; consecutive actual line breaks are collapsed by `normalizeMathTextForDisplay`.
- The current worktree was clean before this session log was added. The original shared checkout and the other linked worktrees were not modified.

## Progress

- Added `serverExternalPackages: ["ws"]` so the production voice route loads the working Node package; its synchronous send path now settles errors instead of leaving the request pending.
- Added provider-boundary conversion of literal newline escapes and preserved consecutive line breaks through MathText formatting. A further plain-text-provider case exposed a bypass of the initial normalization location; the conversion was moved to the common final provider-reply path.
- RED evidence: three new unit/component assertions failed on baseline; the baseline compiled voice-bundle test failed; the mocked provider API and Chrome display tests failed specifically on literal/actual paragraph breaks. Baseline voice route bundle SHA-256: `937e5ba2c9b478f49fe70ebf46506e61f80c8a7e05170215b565bbb5dca5f332`.
- GREEN evidence: final production build exited 0; final type-check exited 0; 51 focused tests passed; 583 component tests passed; the compiled external `ws` long-frame test passed; mocked provider API cases (including JSON and plain-text literal newlines) and Chrome paragraph/LaTeX display cases passed. The bundle and mocked-provider tests were run again against the final build after the plain-text adjustment. The bundle check is wired into the existing Playwright Nova spec and its targeted wrapper passed.
- Live Qwen, using an owner-approved DOCX credential only in transient process memory: isolated authenticated voice API returned WAV (24 kHz mono, 84,524 bytes), and isolated authenticated speech API returned the expected synthetic transcript. Chrome Nova UI returned voice 200 and resolved `audio.play()`; its fake microphone path returned speech 200 and sent the recognized transcript as the next tutor input. This validates the browser flow with a repeatable audio fixture, not a physical microphone or speaker.
- On owner request, removed only the A07 ignored dependency symlink and prior A07 generated build, then ran `npm ci --no-audit --no-fund` with an external npm cache. It exited 0 and installed a real, worktree-local `node_modules`; `npm ls --depth=0` exited 0, and `package-lock.json` stayed byte-identical.
- A fresh `npm run build` with `NEXT_DIST_DIR=.tmp/a07-nova-clean-build-20260924` exited 0 and compiled successfully in 32.1 seconds. The generated voice route trace includes 16 `ws` package files. Its compiled long-frame test passed, followed by three targeted Playwright tests against that build: compiled voice, provider reply parsing, and Chrome paragraph/LaTeX display. The build attestation reports `sourceTreeClean: false` and `sourceTreeStable: false` because this was a verification build of uncommitted A07 changes; it is not a release-source attestation.
- No credential values were written to this worktree, log, shell output, or test artifacts. The shared primary checkout was not edited. Deployment and worktree cleanup have not occurred.

## Handoff and limits

- Status: implementation and scoped verification complete; preparing the owner-authorized A07 commit and draft PR for independent review.
- The browser microphone path used a Chromium fake media device fed with a synthetic Qwen-generated WAV. A physical microphone, speakers, and human listening still require device-level acceptance.
- The final clean build used worktree-local dependencies. Build and runtime behavior passed locally; this is not a Preview or production deployment proof.
- Shared-file review at integration should include A10 for `next.config.ts`, A09 for `components/math/mathTextFormatting.ts`, and A11 for the E2E assertions. No formal release-intake or independent QA signoff is claimed here.
