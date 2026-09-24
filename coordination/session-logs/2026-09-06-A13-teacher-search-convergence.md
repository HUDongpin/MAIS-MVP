# A13 teacher search convergence — 2026-09-06

Owner: A13 with focused A11 validation. Existing PR: #167.

The original `6ebbf9907cedc9cecd6a4799bba0e073ffe741b1` fix was still absent from
main `7f692278989b4bf45496d239bccb9263326b5453`. The old branch was refreshed by
an ordinary merge of that main; current three-language UI and the later canonical
workspace browser journey are preserved. Parameter navigation from a mounted
`/teacher` shell now targets `/teacher/dashboard`, retaining other query fields.
The dated August source log remains historical evidence.

Fresh validation used the merged source and the added transition test, before
the merge commit was written. The existing source regression suite passed 25/25.
The managed production build and the transition browser test passed: desktop
and mobile Chromium, three repetitions each, six passes, zero retries or skips.
The test retains a mounted workspace while reproducing the legacy pathname,
then checks an encoded query and clearing the query without losing `classId`.
This is a controlled transition regression, not an assertion that every router
timing has been exhausted.

The run used an isolated test SQLite database, a minimal environment, disabled
providers, and port 3097; no real environment files were present. Port 3097 had
no listener after completion. Reviewed source hashes and original logs are held
in the external convergence run under `PR167-transition-validation/`.

Keep this branch/worktree until current-head PR checks, main merge and source
custody have completed. Expected closeout: 2026-09-07. No deployment is included.
