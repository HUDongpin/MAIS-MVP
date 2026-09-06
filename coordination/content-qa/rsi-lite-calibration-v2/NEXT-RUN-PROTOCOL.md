# MAIS RSI-Lite v2 下一轮机器质量审查协议（候选稿）

> **Post-execution note (2026-08-24; not part of the registration):** This file is the immutable pre-execution registration and intentionally retains its historical pre-run authorization and status text. The formal synthetic execution later completed with a disclosed transport/configuration deviation; the current result, repeat-chain limitation, and decision boundaries are recorded in [FORMAL-CONCLUSION.md](./FORMAL-CONCLUSION.md). The registered body below is unchanged.

日期：2026-08-24  
负责人 lane：A16（研究与学习科学）  
状态：`candidate-only-protocol-not-executed`  
协议：`MAIS-RSI-LITE-CAL-V2 / 2.0.0-candidate`  
代码基线：`b6c7c347a49a813e454e707dd3c16399dcf29909`

## 1. 决策结论

DeepSeek 在本协议中只扮演“机器质量审查员”。题目来源仍是 MAIS 冻结候选包；DeepSeek 不负责出题、不修改冻结题目、不替代独立 gold label，也不能直接把内容推进 live question bank。

本轮比较 A′、B′、C0′ 三个 arm；不再保留 C 隔离 arm。原因是上一轮已经证明隔离带来可审计性，但没有显示足以抵消额外复杂度和假阳性负担的质量收益。v2 把资源集中到默认可用的 B′、高召回的 C0′，以及更强的确定性 A′ 基线。

## 2. 研究问题

主要研究问题：在修复投影和 finding 合同之后，B′ 与 C0′ 相对 A′ 能增加多少真实缺陷检出，同时产生多少假阳性、错误 family/code 归因、额外费用和随机波动？

结果必须并列报告三层指标：

1. surface detection：机器是否在正确的题目/课例表面报出任何 finding；
2. family concordance：finding 是否属于正确的 F1-F9 family；
3. accepted-code + family concordance：当 gold 指定可接受 code 时，机器的 code 和 family 是否都正确。

任何一个 surface 上“报了某个问题”都不能自动算作 code/family 命中。

## 3. Matched-triplet 设计

| 地区 | latent bundles | 每 bundle 同构版本 | package runs | 核心 provider calls |
| --- | ---: | ---: | ---: | ---: |
| California | 8 | 3 | 24 | 56 |
| Hong Kong | 8 | 3 | 24 | 56 |
| Mainland China | 8 | 3 | 24 | 56 |
| 合计 | 24 | 3 | 72 | 168 |

每个 latent bundle 生成 V1/V2/V3 三个同构版本，并通过预先承诺的 SHA-256 排序与循环分配随机进入 A′、B′、C0′。每个 bundle 内三个版本必须保持知识成分、推理步数、反应形式、答案表示、数值复杂度、语言复杂度、misconception burden 和 evidence-surface burden 同构。

每个地区维持 8 个 bundle，其中 2 个 clean、6 个 defect-bearing，延续 25% clean bundle 的 specificity 估计结构。具体 seed 在 bundle freeze 时生成并先登记 commitment；原 seed 与 concealed assignment 不进入 reviewer projection。

## 4. 三个 arm

| Arm | 每 package API 调用 | 审查序列 | 计入最终 finding 的角色 |
| --- | ---: | --- | --- |
| A′ (`A_PRIME`) | 0 | deterministic baseline | deterministic baseline |
| B′ (`B_PRIME`) | 2 | deterministic baseline → same-reviewer critique → same-reviewer revision | deterministic baseline + revision；critique 只作为 revision 上下文 |
| C0′ (`C0_PRIME`) | 5 | answer-blind solver → tool verifier → adversarial grader → bilingual curriculum critic → evidence verifier | 五个合资格角色的 allowlisted findings |

核心成功调用数为：A′ 0 + B′ 48 + C0′ 120 = 168。

这里的“成功调用”是通过 schema、role binding、surface topology、closed taxonomy 和语境验证后的 provider response。失败尝试不能冒充成功调用，但必须计入硬预算 ledger。

## 5. v1 根因修复

### 5.1 双语投影保留 `type`

v1 的题目本体有 `type`，但 `bilingualQuestion()` 投影漏掉了它。v2 的 bilingual projection 对 `multiple-choice`、`fill-in`、`short-answer` 都保留明确 `type`。

### 5.2 `MISSING_OPTIONS` 语义门

v2 只有在以下两个条件同时成立时才接受该 code：

- `surface.type === "multiple-choice"`；
- 投影里的 `options` 不存在或为空数组。

fill-in、short-answer 一律不能报 `MISSING_OPTIONS`；multiple-choice 已有非空 options 时也不能报该 code。

### 5.3 Closed taxonomy 与 per-role allowlist

每个 finding 必须包含 `findingId`、`surfaceId`、`family`、`severity`、`code` 和 `detail`。未知 code、code/family 不一致、severity 与 taxonomy 不一致、或角色越权 code 全部使 response 无效。

角色边界：

- answer-blind solver：F1/F2；
- tool verifier：F1/F2/F4/F9；
- adversarial grader：F2/F3/F4；
- bilingual curriculum critic：只允许 F6/F7，不允许 `MISSING_OPTIONS`；
- evidence verifier：F5/F8/F9 与 lesson evidence integrity；
- same-reviewer critique/revision：可以使用完整 closed taxonomy；
- deterministic baseline：只允许其可确定验证的 code。

### 5.4 确定性 F8

A′ 新增 `TEMPLATE_IDENTITY_LEAKAGE`：只要 `templateTrace.publicLabel` 不是 null/undefined/空白，确定性审查即报 F8/P0。这个检查直接覆盖上一轮 A 对 F8 的缺口。

## 6. 随机性与重复测量

每次 provider call 必须同时记录：

- 请求的 provider、model、temperature、topP、maxOutputTokens、stream、requestedSeed 和 seedSupport；
- projection SHA-256 与 request-parameter SHA-256；
- 返回的 response ID、observed model、timestamp、finish reason；
- cache-hit input、cache-miss input、output tokens。

候选默认参数为 DeepSeek / `deepseek-v4-pro` / temperature 0 / topP 1 / max output 24,000 / non-streaming。`requestedSeed` 明确记录为 null，`seedSupport` 为 `not-assumed`；因此不得宣称 provider 完全确定。

重复测量在看到结果之前预先选择：California、HK、Mainland 每个地区各选一个 defect-bearing bundle，对其中 B′ 与 C0′ package 各重复一次。共 6 个 package repeats：

- B′：3 × 2 calls = 6 calls；
- C0′：3 × 5 calls = 15 calls；
- repeat supplement：21 successful calls；
- core + repeat：189 successful calls。

重复调用必须复用完全相同的冻结 projection 和请求参数，但绑定不同 provider response ID。21 次不混入“168 次核心 estimand”，应单独报告稳定性。

## 7. 自然 MAIS 泛化样本

合成 induced-defect calibration 不能自动推广到自然题库。v2 另设 180 题独立样本：California、HK、Mainland 各 60 题，并按 response form 与 difficulty 分层。

边界如下：

- 抽样框在机器审查前冻结；
- 样本不能参与 prompt、taxonomy 或规则调优；
- 标签必须有独立来源和方法 provenance；
- 不要求每道生产题由真人签字，也不把真人 receipt 设为每题 release gate；
- 只有独立标签完成后，才允许提出“对自然 MAIS 题目的泛化表现”这一研究结论；
- 样本结果仍不等于 candidate-to-live 批准。

180 题只适合下一阶段的初步 generalization calibration：总体比例的最坏情形 95% 误差约 ±7.3 个百分点；每地区 60 题约 ±12.7 个百分点。若要做强地区差异结论，应扩大样本，而不是过度解释这 180 题。

## 8. DeepSeek API 预算建议

这是 DeepSeek API 的独立外部费用，不是 Codex Pro 20x 的产品额度。

估计以已完成 F3 的观察成本为基础：B 的 12 packages 约 $2.87936，C0 的 12 packages 约 $4.09310。v2 各扩至 24 packages：

- 168-call core 估计：$13.944920；
- 21-call repeat supplement 估计：$1.743115；
- 189 successful calls 合计中心估计：$15.688035。

建议下一轮新的、独立硬上限：

- USD：$25；
- provider attempts：220；
- tokens：40,000,000。

220 calls = 189 个计划成功调用 + 31 个失败/重试预留。该上限只是 proposal，不能与上一轮剩余额度拼接，也尚未获得 owner 的新预算签字。

## 9. 当前不授权的事项

本候选包不包含 live provider runner、DeepSeek adapter、secret loader 或正式 campaign entrypoint。当前状态不授权：

- 构建或发送 24 个真实 frozen bundles；
- DeepSeek live API 调用；
- 168-call core 或 21-call repeats；
- 部署或 candidate-to-live promotion；
- Git commit 或 push。

未来如需启动，owner 指令应同时明确：协议版本、是否包含 repeat supplement、DeepSeek model、外发数据范围、USD/call/token 三重上限，并使用一条新的、单独的正式执行授权。

## 10. 通过条件与停止条件

离线 readiness 至少要求：

- v2 全部测试通过；
- 24 bundles × 3 variants 的同构审计通过；
- 每个 role projection 与 allowlist hash 冻结；
- `MISSING_OPTIONS` 语义门反例通过；
- F8 deterministic positive/negative fixtures 通过；
- scoring 能区分 surface、family 和 exact accepted-code + family；
- natural sample 的抽样框与标签方法独立登记；
- owner 对新预算和正式执行分别授权。

出现下列任一情况即停止：projection 泄漏 arm/gold/seed；未知 code；code/family/severity 不一致；非 multiple-choice 的 `MISSING_OPTIONS`；预算任一上限将被突破；原 F3 冻结证据发生漂移；或执行结果试图直接进入 live content。
