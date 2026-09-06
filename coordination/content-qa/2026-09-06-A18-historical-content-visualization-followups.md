# A18 historical content and visualization followups — 2026-09-06

This preserves unresolved findings and corrections from the 200-path root history intake. It does not certify current content, launch provider calls or turn withdrawn content into repaired content. The current reference baseline is `7f692278989b4bf45496d239bccb9263326b5453`; archived source identities are in the A25 JSON.

## RH-F01 — 答案表达与 metadata correctness

Owner lane: A18/A12/A04.

Historical source: CA/HK 原报告及 China 8/27 修正链。

Current evidence paths: `lib/server/answerMatching.ts`, `lib/server/answerMatching.test.ts`.

main 已有中文单位/英文度量/数字词/LaTex/括号/逗号等回归；不能推定历史所有错误题均修复。按存续当前题目 ID/内容 SHA 重验证答案、单位和题意；旧 31.3% grader/530 shuffle 清单等已被后续报告纠正。

## RH-F02 — 题库治理、独立答案与 MC 猜测可利用性

Owner lane: A18/A21/A11.

Historical source: China rebaseline 的 17,700→11,700、全库 24,566→16,499 变化包含 6,000 撤包。

Current evidence paths: No blanket current implementation proof recorded..

撤包不是修复；旧 generation-answer-copy checker 不是独立 correctness oracle。核对当前 promotion 与数据 digest；不得把问题队列重写成通过声明。

## RH-F03 — HK/CN/cross-state 教学适配、数学层级与视觉模型

Owner lane: A06/A18/A11.

Historical source: 10 原图、HK/CN/cross-state 审计。

Current evidence paths: `components/visualizations/ConfiguredVisualizationLab.tsx`, `components/visualizations/configuredVisualizationLabRegressions.test.ts`.

learner 默认已由 1b7927cd 承接；HK place-value 范围、概念/控件适配、3D 数学与本地化仍需现行定向复核。CN 335 census 数字与文末 only-12-screenshots 叙述有范围矛盾；未读取 ignored raw sweep，不认证全量统计。

## RH-F05 — 旧 A23 baseline、PR172 math、PR199 harness 接续

Owner lane: A23/A06/A11.

Historical source: root A23 reaffirmation request、浅历史修复说明和 A06 archive。

Current evidence paths: `scripts/sweep-merged-worktrees.mjs`, `components/visualizations/ConfiguredVisualizationLab.tsx`.

请求未签署不是 live authority。PR172 comparisonDisabled 的旧 number-line-only 争议不能凭 authoring UI 修复关闭；PR199/旧 A06 harness 须准确 source→当前候选归属。

## RH-F06 — 历史 custody 与 CA60 保全证明

Owner lane: A25/A16.

Historical source: a0 CA60 intake、root branch/PR queues、各族 archive receipt。

Current evidence paths: `AGENTS.md`, `CLAUDE.md`, `coordination/session-logs/2026-09-06-A10-continuous-closeout-policy.md`.

保留 archive-vs-product 区分、原 post-copy attestation 缺口和负证据；S5/S6 离线包不会自动证明历史受保护成果真实性。未读 protected 资料。

## Acceptance boundary

For each surviving issue, bind the current item or component ID, source bytes, independent derivation or reproduction, owner decision and actual resulting main commit. Preserve the 2026-08-27 China correction ahead of the 2026-08-26 preliminary conclusion. Counts, file existence and old tests are evidence scope, not current pass receipts.

The historical diagram archive includes author-panel/localization, control-to-concept fit, place-value and 3D reasoning concerns. Existing learner-default changes do not close every mathematical or pedagogical question. The CN census and only-12-screenshots statements have an unresolved coverage discrepancy; no protected raw sweep was read to validate the broader census claim.

PR #225’s historical bank QA and current 105 chapter checks are separate scopes. This record does not approve those new checks, the older lesson projections, or any content promotion.
