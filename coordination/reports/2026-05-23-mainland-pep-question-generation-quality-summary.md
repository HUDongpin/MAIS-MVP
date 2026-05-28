# 内地人教版数学题库生成与质量检查专项总结

- 报告日期：2026-05-23
- 报告对象：Dr. Peter Hu / MAIS 项目管理层
- 覆盖范围：内地人教版小学 RAG 安全层与生题结果、小学 DeepSeek 候选题结果、高中 RAG-v2/v3/v4 生题与质量检查结果
- 报告口径：仅使用项目内已生成的 S18 内容 QA 与 RAG 验证产物；未重新生成题目，未调用 live LLM/OCR，未修改题库源数据或应用代码

## 一页式核心结论

1. 小学 RAG 安全层已经具备完整 P1-P6 上下册覆盖：13 张课程安全抽象卡、62 张试卷模式安全抽象卡，均以元数据和安全抽象形式进入 RAG 层，没有提交教材原文、试卷原题、OCR 文本、页码定位或图片源材料。
2. 小学本地 RAG 确定性题库 1200 题已经完整：P1-P6 每级 200 题，已接入应用题库聚合；自动质量对比显示整体分 95.7，数学、课程、结构和来源安全均为 100，但存在模板簇重复风险，仍需 S18 完成人工抽样后再作外部发布声明。
3. 小学 DeepSeek 候选题 600 题已经产出完整：P1-P6 每级 100 题、60/60 批次文件齐备；初始自动对比显示结构和多样性较强，但直接上线数为 0，所有 DeepSeek 行仍需人工数学复核。
4. 小学 DeepSeek 最新可解性修复后，自动 blocker 已清零：147/600 题通过确定性独立解题验证，453/600 题仍为 solver-gap，处于 `pending-s18-review`。结论是“可进入 S18 最终人工签核”，但“尚不可接入 app 或对外发布”。
5. 高中 RAG-v4 已生成 1500 道候选题：S4/S5/S6 各 500 题，且仍保持 candidate-only，不进入当前 3300 道公开高中题库。
6. 高中自动质量对比显示 RAG-v3 最强，RAG-v4 次之：seed-v1 89.4、rag-v2 91.7、rag-v3 99.8、rag-v4 97.4。RAG-v4 分数低于 RAG-v3 的主因是近模板簇和 sample-review 量高，不是答案可解性失败。
7. 高中 RAG-v4 确定性可解性审计为绿色：1500/1500 通过，0 个重复 ID，0 个完全重复题干，0 个失败行。但由于 1458 行被标为 near-duplicate-template-cluster/sample-review，仍需 S18 人工抽样后才可考虑从候选题提升到公开题库。

## 小学 RAG 与本地 1200 题结果

### RAG 安全层状态

| 项目 | 结果 | 说明 |
| --- | ---: | --- |
| 小学课程安全抽象卡 | 13 | 覆盖 P1-P6 上册/下册所有槽位 |
| 小学试卷模式安全抽象卡 | 62 | P1-P5 每学期 5 张，P6 上下册各 6 张 |
| RAG 接口隔离 | 已验证 | 小学查询返回 primary exam-pattern cards；高中查询不返回小学模式卡 |
| 来源安全 | 已验证 | 未发现教材原文、试卷原题、OCR、页码、截图、source locator 等提交模式 |
| RAG gate | 通过 | `npm run test:rag` 在对应验证中通过，新增统一入口一致性回归 |

小学 RAG 的定位是“安全抽象证据层”，不是可还原教材或试卷的向量库。S18 已确认提交内容只包含课程主题、能力标签、题型模式、易错点、生成指导和禁用复用说明等安全元数据。

### 本地 RAG 1200 题题库

| 指标 | 本地 RAG 1200 |
| --- | ---: |
| 题目总数 | 1200/1200 |
| 覆盖 | P1-P6，每级 200 题 |
| 自动整体分 | 95.7 |
| 数学分 | 100 |
| 课程匹配 | 100 |
| Schema | 100 |
| 解释质量 | 96.4 |
| 语言质量 | 90.1 |
| 多样性 | 72.0 |
| 来源安全 | 100 |
| 自动 blocker | 0 |
| 自动 direct launch 标记 | 1200/1200 |

管理结论：本地 RAG 1200 题是当前小学人教版题库的主基线。它具备完整覆盖、确定性答案验证和 0 自动 blocker；但“自动 direct launch”不等于最终内容签核。对外或生产发布前，仍建议 S18 至少按年级、学期、题型和难度完成抽样复核，重点看模板重复、简体中文术语自然度、年级适配和学生可读性。

主要风险：自动报告记录 local-1200 有 1151 个 near-duplicate-template-cluster 标记。这不代表数学错误，但提示题型和语境变化不足，后续应作为题库丰富度优化项。

## 小学 DeepSeek 600 题结果

### 产出完整性

| 项目 | 结果 |
| --- | ---: |
| 题目总数 | 600/600 |
| 批次文件 | 60/60 |
| 年级覆盖 | P1-P6，每级 100 题 |
| 学期覆盖 | 每级上册 50 题、下册 50 题 |
| 题型配额 | 每学期 20 道选择、18 道填空、12 道简答 |
| 生成方式 | DeepSeek V4 Pro，基于 MAIS safe-RAG 元数据离线生成 |
| 数据状态 | offline candidate-only，未写入生产题库 |

DeepSeek 题库的优势是题面和语境多样性较高，自动报告中 diversity 为 99.1，语言质量为 93.8。它更适合作为补充候选池，而不是直接替代本地确定性基线。

### 自动质量对比

| 指标 | DeepSeek 600 | 本地 RAG 1200 |
| --- | ---: | ---: |
| 题目数 | 600 | 1200 |
| 自动整体分 | 94.1 | 95.7 |
| 数学分 | 82.1 | 100 |
| 课程匹配 | 100 | 100 |
| Schema | 99.9 | 100 |
| 解释质量 | 95.4 | 96.4 |
| 语言质量 | 93.8 | 90.1 |
| 多样性 | 99.1 | 72.0 |
| 来源安全 | 99.8 | 100 |
| 自动 direct launch | 0/600 | 1200/1200 |
| Rewrite | 3 | 0 |
| Blockers | 3 初始，修复后 0 | 0 |

初始质量对比给出的结论是：DeepSeek 输入完整，但它不是最终供应商质量 verdict；所有 DeepSeek 行需要人工数学复核，且初始发现 3 个 blocker/rewrite 行。

### 最新可解性与修复结果

| 项目 | 修复后结果 |
| --- | ---: |
| 审计行数 | 600/600 |
| 确定性通过 | 147 |
| Solver-gap | 453 |
| Answer mismatch | 0 |
| Ambiguous MC | 0 |
| Content error | 0 |
| 自动 blocker | 0 |
| Manual review 状态 | 147 approved-deterministic；453 pending-s18-review |
| App promotability | 不可上线，需人工签核 |

管理结论：小学 DeepSeek 600 题已经从“有 3 个自动 blocker”推进到“自动 blocker 清零”，质量状态明显改善。但 453 行仍未被确定性求解器覆盖，必须由 S18 人工审题，或继续扩展确定性求解器后重跑审计。当前只可作为候选题包，不可接入学生端题库。

## 高中 RAG-v2/v3/v4 结果

### 高中 RAG 安全层状态

| 项目 | 结果 | 说明 |
| --- | ---: | --- |
| 高中课程/教材安全卡 | 已验证 | `data/rag/mainlandPepHigh.ts` 存储安全抽象 |
| 高中试卷模式卡 | 已验证 | `data/rag/mainlandPepHighExamPatterns.ts` 存储聚合模式 |
| 统一证据包 | 已验证 | S4/S5/S6 查询返回 high-school curriculum safe cards 与 `secondaryExamPatternCards` |
| 小学/高中隔离 | 已验证 | 小学 `primaryExamPatternCards` 不泄漏到高中查询 |
| 来源安全 | 已验证 | 不提交教材原文、试卷原题、官方解析、OCR、页码、截图或 source locator |

### 生题批次与质量评分

| 批次 | 数量 | 质量分 | 知识匹配 | 可解性 | 总分 | 状态 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| seed-v1 | 900 | 79.6 | 100 | 88.5 | 89.4 | 公开基线，质量较旧 |
| rag-v2 | 900 | 86.5 | 100 | 88.5 | 91.7 | 第一轮 safe-RAG 扩展 |
| rag-v3 | 1500 | 99.4 | 100 | 100 | 99.8 | 当前自动质量最高 |
| rag-v4 | 1500 | 92.2 | 100 | 100 | 97.4 | candidate-only，未公开 |

RAG-v3 是自动质量评分最高的高中生题批次。RAG-v4 的可解性和知识匹配均为 100，但质量分低于 RAG-v3，主要因为模板簇重复和抽样复核量高。

### RAG-v4 候选题专项审计

| 指标 | 结果 |
| --- | ---: |
| Candidate-only | true |
| 候选题总数 | 1500/1500 |
| S4/S5/S6 分布 | 500 / 500 / 500 |
| 当前公开高中题库 | 3300 |
| Duplicate IDs | 0 |
| Duplicate exact prompts | 0 |
| 确定性通过 | 1500/1500 |
| 失败行 | 0 |
| Answer mismatch | 0 |
| Solver-gap | 0 |
| Release recommendation | 自动审计绿色，人工抽样后再考虑公开 |

### 高中批次风险标记

| 批次 | 主要风险 | 数量 |
| --- | --- | ---: |
| seed-v1 | near-duplicate-template-cluster | 830 |
| seed-v1 | exact-prompt-duplicate | 649 |
| seed-v1 | answer-not-shown-in-explanation | 516 |
| rag-v2 | near-duplicate-template-cluster | 820 |
| rag-v2 | answer-not-shown-in-explanation | 518 |
| rag-v2 | exact-prompt-duplicate | 312 |
| rag-v3 | near-duplicate-template-cluster | 108 |
| rag-v4 | near-duplicate-template-cluster | 1458 |

管理结论：高中 RAG-v4 可以被视为“自动可解性通过的候选扩容包”，但不应直接公开。后续若要把高中公开题库从 3300 增至 4800，应先完成 S18 人工抽样，重点检查 rag-v4 的模板重复、题面变化、场景自然度和讲解质量。

## 综合质量检查表

| 模块 | 当前结论 | 可上线建议 |
| --- | --- | --- |
| 小学 RAG 安全层 | 覆盖完整，来源安全边界清楚 | 可作为生成证据层继续使用 |
| 小学本地 RAG 1200 | 自动质量最稳，0 blocker，但模板簇高 | 作为主基线；S18 抽样后再作发布声明 |
| 小学 DeepSeek 600 | 完整候选包，自动 blocker 已清零，但 453 行待人工复核 | 不可接入 app；先完成 `pending-s18-review` |
| 高中 RAG-v3 | 自动评分最高，质量优于 seed-v1/rag-v2 | 可作为高中 RAG 扩展的当前参考批次 |
| 高中 RAG-v4 | 1500/1500 可解性通过，但模板簇高，candidate-only | 暂不公开；人工抽样后再评估提升 |

## 风险与待办

1. S18 人工复核仍是上线前关键门槛。本报告中的自动分数用于 triage，不替代数学正确性、年级适配、术语自然度和学生可读性的人工签核。
2. 小学 DeepSeek 的 453 个 solver-gap 是当前最大质量待办。处理路径只有两种：人工逐题批准，或按 solver-gap cluster 扩展确定性求解器后重跑审计。
3. 模板重复是本地小学题库和高中 rag-v4 的共同风险。本地小学题库数学稳定但多样性弱；高中 rag-v4 可解性强但 sample-review 量高。
4. 候选题不得直接进入生产题库。小学 DeepSeek 和高中 rag-v4 均应保持 offline/candidate-only，直到 S18 签核和 S04/S08 后续集成任务明确批准。
5. 报告没有覆盖高中 DeepSeek 生题结果，因为项目内没有完成的高中 DeepSeek 题库、CSV、JSON 或 QA 报告产物；只有生成脚本目录存在。用户已澄清 DeepSeek 指小学产物。

## 可上线性建议

| 优先级 | 建议 |
| --- | --- |
| P0 | 继续把小学本地 RAG 1200 作为主基线；安排 S18 抽样签核，不把自动 direct-launch 当作最终发布批准 |
| P0 | 小学 DeepSeek 600 保持候选状态；完成 453 行 `pending-s18-review` 或扩展确定性求解器后重跑审计 |
| P1 | 高中 rag-v4 继续保持 candidate-only；先按 480-row sample queue 或至少 150 题完成 S18 人工抽样 |
| P1 | 针对模板簇风险做二轮去模板化生成或人工改写，优先处理小学 local-1200 和高中 rag-v4 |
| P2 | 任何对外质量声明应区分“自动 QA 通过”“人工内容签核通过”“已集成到学生端”三个状态 |

## Evidence / Source Artifact List

本报告使用以下本地项目产物作为证据来源：

1. `coordination/content-qa/2026-05-23-S18-mainland-pep-primary-rag-verification.md`
2. `coordination/content-qa/mainland-pep-primary-generated-bank-v1/qa-report.md`
3. `coordination/content-qa/2026-05-23-S18-mainland-pep-primary-deepseek-vs-local-quality-report.md`
4. `coordination/content-qa/mainland-pep-primary-generated-bank-v1/solvability-audit.md`
5. `coordination/content-qa/mainland-pep-primary-generated-bank-v1/s18-promotability-decision.md`
6. `coordination/content-qa/2026-05-23-S18-mainland-pep-high-rag-verification.md`
7. `coordination/content-qa/2026-05-23-S18-mainland-high-seed-v1-vs-rag-v2-vs-rag-v3-vs-rag-v4-candidate-quality-report.md`
8. `coordination/content-qa/2026-05-23-S18-mainland-high-rag-v4-candidate-solvability-audit.md`
9. `coordination/session-logs/2026-05-23-S18.md`

## Verification Note

- 已验证：本报告仅引用项目内既有 QA/RAG 产物，不重新生成题目，不调用 live LLM/OCR，不修改生产题库或 app 代码。
- Not run: documentation-only change.
