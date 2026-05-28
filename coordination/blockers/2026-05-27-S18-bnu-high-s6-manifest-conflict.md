# Blocker Report

- Date: 2026-05-27
- Session ID: S18
- Task: 北师大版高三（不分上下册）测评题 RAG 吸收计划
- Blocker type: Scope conflict
- What happened: The requested exact manifest script path, `scripts/build-mainland-bnu-high-assessment-manifest.py`, is being used by overlapping BNU high-school S18 workstreams for S4/S5 archive manifests. During this implementation the file changed repeatedly between S6, S4 upper, and S4 lower variants, including while local validation commands were running.
- Files involved: `scripts/build-mainland-bnu-high-assessment-manifest.py`; `package.json`; `coordination/session-logs/2026-05-27-S18.md`.
- Why the session stopped: Overwriting that script again would risk reverting another active session's work and violating the one-writer/shared-file coordination rule.
- Decision needed from owner: Decide whether the shared script should become a multi-target BNU high manifest builder, or whether each grade/package should get a distinct script name such as `build-mainland-bnu-high-s6-assessment-manifest.py`.
- Safe next step: Keep the committed S6 RAG data/types/helpers/tests, and schedule a short S10/S18 coordination pass to split or merge the BNU high manifest scripts before running the two S6 ZIPs through a committed manifest command.
