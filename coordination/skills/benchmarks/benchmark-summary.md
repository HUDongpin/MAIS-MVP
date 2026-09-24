# MAIS Question-QA Five-Skill Benchmark Summary

This is a redacted benchmark summary for source commit `e33bf615846b708edf8339a4a82c6b760574c349`. Raw responses, grading transcripts, static review pages, package archives, credentials, protected questions, item identifiers, and provider bodies remain outside Git.

## Outcome

| Gate | Result |
| --- | --- |
| Offline source tests | 383/383 passed |
| Official Skill Creator validation | 5/5 Skills passed |
| Public Schema parity | 3/3 self-contained Schemas passed |
| Public CLI safety | 9/9 help checks and 9/9 fail-closed no-argument checks passed |
| Behavior round 1 | WITH Skill 141/141; baseline 55/141 |
| Behavior round 2 | WITH Skill 141/141; baseline 57/141 |
| Routing proxy round 1 | 100/100; zero canonical negative false triggers |
| Routing proxy round 2 | 100/100; zero canonical negative false triggers |
| Package/readback | 5/5 archive trees matched source package views |
| Installed readback | 5/5 installed trees matched source package views |
| Compatibility rollback drill | 2/2 prior Skills restored and new Skills reinstalled with exact hashes |

Across both behavior rounds, WITH Skill passed 282/282 assertion decisions; the baseline passed 112/282. The unweighted mean per-evaluation pass rate was 100% WITH Skill and 44.94% without Skill. Evidence classification, authorization blocking, claim ceiling, currentness, independent review, and handoff fields each improved strictly in both rounds.

## Current Read-Only Regressions

- RSI-Lite v2: the existing exact suite passed 51/51; the pre-existing dirty worktree status hash was identical before and after. This remains synthetic-calibration evidence, not natural-bank, integration, deployment, or live proof.
- Natural CA60 V5-R11: immutable runner registration tests passed 3/3 and the independent A11 review suite passed 15/15 in a clean temporary clone. The redacted resolver returned `RUNNER_INDEPENDENTLY_VERIFIED`, known-zero attempts/completed calls/egress, `INCONCLUSIVE_MACHINE_REFERENCE`, and a blocked next step pending reference preflight authority and a trusted route anchor.
- Promotion on the then-live `origin/main` commit `56b4c1bb644725effe14d58cca0596202a36c7eb`: the repository-native Promotion suite passed 40/40 and exact active-Manifest validation passed with `liveAllowed=false`. The specialist discovery parser conservatively returned `WORKFLOW_JSON_PARSE_UNTRUSTED`; therefore no current Promotion lifecycle/currentness envelope was claimed and no Shadow was executed.

## Evidence Limits

The behavior agents shared a filesystem; blindness was required by prompt and artifact access declarations but was not technically sandbox-enforced. The routing result is a manual independent proxy against a frozen five-way oracle, not Codex runtime discovery. `run_loop.py` and `improve_description.py` were not run because the required Claude CLI was unavailable. `aggregate_benchmark.py` was exercised only on a compatibility copy because it converts unavailable telemetry to zero and cannot consume the canonical `null` representation; its telemetry and run-count metadata are not authoritative. Time, token, tool-call, and error telemetry remain unavailable rather than being reported as zero.

## 中文结论

五个 Skill 的源代码、离线测试、两轮行为评测、两轮路由代理评测、打包、安装读回和旧版恢复演练均有独立证据。这里的“通过”只表示 Skill suite 本身达到既定验收门槛；它不表示题库已经集成、自然总体已经 PASS、Promotion 已获得当前授权、应用已经部署，或 live 行为已经得到证明。
