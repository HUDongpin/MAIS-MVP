# 人教版初中数学试卷安全吸收到 MAIS 内地数学 RAG 计划

- Date: 2026-05-23
- Session ID: S18
- Scope: 先吸收九年级上学期与九年级下学期数学试卷资料
- Status: Planning only; no source document text has been extracted or committed

## 1. 执行摘要

MAIS 对人教版初中数学试卷的吸收应采用“私有来源材料 -> 本地元数据清单 -> 去版权化安全卡片 -> 原创内容生成与人工 QA”的路线，而不是把原始试卷、答案、解析、图片或 OCR 全文直接放进仓库或 RAG。

本计划的第一阶段只处理两个本地压缩包：

- `9上初中数学试卷.zip`
- `9下初中数学试卷.zip`

初步元数据检查结果：

| Archive | Files | `.docx` | `.doc` | `.pdf` | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| 9上初中数学试卷.zip | 641 | 373 | 261 | 7 | 以 Word 文件为主，含少量 PDF |
| 9下初中数学试卷.zip | 223 | 44 | 179 | 0 | 老式 `.doc` 比例较高 |

第一阶段目标不是建立“原题库”，而是建立九年级上/下的安全试卷模式 RAG：章节覆盖、题型结构、能力要求、难度梯度、常见解法策略、易错点与出题风格。任何学生可见练习题、解析或测评题，都必须由 MAIS 重新生成并通过 S18 内容 QA，不能复用原卷题干或原解析措辞。

## 2. 安全吸收原则

1. 原始 ZIP、解压文件、OCR 文本、题干、答案、解析、图片、表格、版式和页面定位信息均不得提交到 Git。
2. 仓库只允许保存抽象后的安全卡片，例如概念标签、题型标签、能力标签、难度区间、误区标签、原创生成指导和禁止复用规则。
3. 本地清单只放在 `.local/` 或 `.tmp/` 等忽略目录，作为可追溯的私有处理记录。
4. RAG 检索返回的是安全卡片，不返回原卷文本。
5. 面向学生、教师、家长或 AI Tutor 的输出必须经过“来源距离检查”：不得出现可识别的原题句式、原图、原表、原答案顺序或官方解析表达。

## 3. 范围

### In Scope

- 九年级上、九年级下人教版数学试卷资料的本地文件清点。
- 文件格式、数量、哈希、去重、年级/学期/章节信号的元数据化。
- 人教版九年级章节体系的安全 RAG 卡片设计：
  - 九上：第 21 章 一元二次方程；第 22 章 二次函数；第 23 章 旋转；第 24 章 圆；第 25 章 概率初步。
  - 九下：第 26 章 反比例函数；第 27 章 相似；第 28 章 锐角三角函数；第 29 章 投影与视图。
- 试卷模式提炼：题型、能力、难度、常见解法、易错点、综合题组合方式。
- S18 内容安全与课程一致性审核。

### Out of Scope

- 把原始试卷或解析导入生产数据库。
- 把原题题干、答案、解析、图片、表格、页面截图、OCR 全文或 MathType/公式图片提交到仓库。
- 未经授权调用在线 OCR、LLM 或第三方解析服务。
- 未经 S18 审核直接生成学生可见题库。
- 扩展到七、八年级或中考真题以外的新材料；这些应作为单独阶段处理。

## 4. 推荐数据分层

| Layer | Storage | Commit? | Content |
| --- | --- | --- | --- |
| L0 原始材料 | Owner local/private storage | No | ZIP、DOC、DOCX、PDF 原文件 |
| L1 本地处理区 | `.tmp/rag-import/mainland-pep-junior-s3-papers/` | No | 解压、转换、OCR 临时输出 |
| L2 本地元数据清单 | `.local/rag/mainland-pep-junior-s3-papers/` | No | 哈希、文件格式、大小、粗分类、章节信号、去重结果 |
| L3 安全卡片 | `data/rag/` by future approved implementation | Yes | 去版权化试卷模式、能力标签、误区标签、原创生成指导 |
| L4 原创候选题 | future QA package | Maybe, after review | MAIS 自生成题目与解析，必须通过 S18 审核 |

## 5. 处理流程

### Phase 0: 授权与范围锁定

- Owner 确认两个 ZIP 为可用于内部研发参考的资料。
- 明确本阶段只处理九年级上/下，不扩展范围。
- 确认不得把任何原始内容、OCR 内容或解析内容提交进 Git。

### Phase 1: 本地清单与证据保全

- 计算两个 ZIP 的 SHA-256。
- 建立本地 manifest，字段建议包括：
  - `archiveId`
  - `archiveSha256`
  - `entryId`
  - `entrySha256`
  - `extension`
  - `byteSize`
  - `gradeScope`: `S3`
  - `semesterScope`: `upper` or `lower`
  - `documentRole`: `paper` / `answer` / `solution` / `mixed` / `unknown`
  - `chapterSignals`
  - `yearSignals`
  - `regionSignals`
  - `duplicateGroupId`
  - `safetyFlags`
- 由于 ZIP 文件名编码在终端中可能乱码，manifest 工具需要保留原始字节路径，同时生成内部规范化 ID，避免人工误判。

### Phase 2: 隔离转换与抽取

- 在离线/隔离目录中处理 `.doc`、`.docx`、`.pdf`。
- `.doc` 使用 LibreOffice headless 或等价工具转换，必须禁用宏和外部网络访问。
- 对嵌入对象、宏、外链、异常大图片、损坏文件做安全标记。
- OCR 或公式识别只用于本地分析，不把全文或图片进入仓库。

### Phase 3: 试卷结构识别

- 识别文档角色：试卷、答案、解析、答案+解析、混合资料。
- 识别层级：整卷 -> 大题 -> 小题 -> 知识点 -> 解法策略。
- 仅保留统计与抽象信号，例如：
  - 选择/填空/解答/证明/应用题比例。
  - 代数、函数、几何、概率统计覆盖比例。
  - 中低/中/中高/压轴难度分布。
  - 常见综合方式，如“圆+相似”“二次函数+几何”“反比例函数+面积”。

### Phase 4: 安全卡片生成

每张安全卡片应表达一种“可用于原创出题和辅导的模式”，而不是复述原卷。

建议字段：

```ts
type JuniorPaperPatternSafeCard = {
  id: string;
  grade: "S3";
  semester: "upper" | "lower";
  curriculumTrack: "MAINLAND_PEP";
  chapterIds: string[];
  conceptTags: string[];
  competencyTags: string[];
  itemTypeTags: string[];
  difficultyBand: "foundation" | "core" | "challenge" | "capstone";
  patternSummary: string;
  generationGuidance: string[];
  misconceptionTags: string[];
  sourceReuseRestrictions: string[];
};
```

卡片中不得出现：

- 原题题干或相近改写。
- 原答案、原解析或评分措辞。
- 原图、原表、原版式。
- 具体学校卷面可识别细节。
- 本地文件路径或 ZIP entry 名称。

### Phase 5: S18 QA

S18 审核四类质量：

- 课程一致性：是否贴合人教版九上/九下章节。
- 数学正确性：概念、解法、难度标签是否合理。
- 来源距离：是否已经脱离原卷表达与结构。
- 教学价值：是否能支持原创题生成、错因诊断、AI Tutor 讲解和教师备课。

### Phase 6: RAG 集成

如 owner 后续批准代码实现，建议由 S18 主导内容，S08/S10 协调共享类型和脚本，可能涉及：

- 本地 manifest script：`scripts/build-mainland-pep-junior-paper-manifest.py`
- 安全卡片数据：`data/rag/mainlandPepJuniorPaperPatterns.ts`
- 检索逻辑：`lib/rag/mainlandPepJuniorPaperPatterns.ts`
- 统一 evidence pack：`lib/rag/mainlandPep.ts`
- 类型：`types/index.ts`
- 测试：`lib/rag/mainlandPep.test.ts`
- 脚本：`package.json`

集成必须保持隔离：

- S3 试卷模式只在九年级查询中出现。
- 九上/九下按 semester 过滤。
- 不污染 P1-P6、S1-S2、高中或 HK/US curriculum tracks。
- AI Tutor 只能接收安全 evidence pack，不接收源文档。

## 6. 验收标准

第一阶段计划完成的验收标准：

- 两个 ZIP 的文件数量、格式分布、哈希和处理状态有本地 manifest 记录。
- 仓库中没有新增原始试卷、题干、答案、解析、OCR、图片或文件路径。
- 至少形成九上与九下各一组安全卡片草案，覆盖主要章节。
- 每张安全卡片都有明确的章节、题型、能力、难度、误区和原创生成限制。
- S18 完成内容安全与课程一致性 review。
- RAG 检索测试能证明：
  - 九上问题优先检索九上卡片。
  - 九下问题优先检索九下卡片。
  - 其他年级不会误取 S3 卡片。
  - evidence pack 中没有源文档文本。

## 7. 推荐首批安全卡片覆盖

九上建议优先卡片：

1. 一元二次方程：解法选择、判别式、根与系数关系、应用建模。
2. 二次函数：图像性质、顶点式、最值、与方程/不等式综合。
3. 旋转：中心、角度、全等构造、网格与坐标旋转。
4. 圆：垂径定理、圆周角、切线判定与性质、圆与相似综合。
5. 概率初步：列表法、树状图、简单随机事件与频率估计。

九下建议优先卡片：

1. 反比例函数：图像性质、比例系数几何意义、面积与函数综合。
2. 相似：判定、性质、位似、比例线段、几何证明。
3. 锐角三角函数：三角函数定义、特殊角、解直角三角形、实际测量。
4. 投影与视图：三视图、展开与还原、空间想象。
5. 九年级综合：二次函数+几何、圆+相似、函数图像+面积、实际问题建模。

## 8. 风险与缓解

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `.doc` 老格式转换失败 | 资料覆盖不完整 | 记录失败文件，抽样人工打开验证，必要时单独转 PDF |
| 文件名编码乱码 | 学期/章节误判 | manifest 同时保存原始字节路径和规范化 ID，不依赖终端显示 |
| 资料含版权内容 | 法务和产品风险 | 只做私有参考与安全抽象，不提交原文，不向用户展示原卷 |
| 答案/解析与试卷重复混杂 | 去重和角色识别困难 | 建立 `documentRole` 与 `duplicateGroupId` |
| OCR/公式识别错误 | 知识点误标 | 只把 OCR 当辅助信号，关键卡片由 S18 审核 |
| 生成题过度贴近原题 | 来源距离风险 | 加入 source-distance gate，命中相似模式则重写或丢弃 |
| 九上/九下跨学期混淆 | 检索误导 | 每张卡片必须有 `semester` 与 chapter IDs |

## 9. 停止条件

遇到以下情况应停止并请 owner 决策：

- 资料来源或使用授权不清楚。
- 需要把原题/原解析直接放入仓库或产品才能推进。
- 发现真实学生个人信息、成绩、联系方式等 PII，且不能可靠清除。
- 需要新增第三方服务、OCR/LLM 付费调用或上传源文件。
- 需要修改共享 RAG 类型、package scripts 或生产 API，但没有 S08/S10/S12/S07 协调授权。

## 10. 建议下一步任务包

如果 owner 要进入执行阶段，建议下一个明确 assignment：

```markdown
# Session Assignment

- Date: 2026-05-23
- Session ID: S18
- Workstream: Mainland PEP S3 paper-pattern safe RAG
- Objective: Safely absorb local 9上/9下 junior math paper archives as S3 upper/lower paper-pattern RAG guidance.
- Allowed write scope:
  - scripts/build-mainland-pep-junior-paper-manifest.py
  - data/rag/mainlandPepJuniorPaperPatterns.ts
  - lib/rag/mainlandPepJuniorPaperPatterns.ts
  - lib/rag/mainlandPep.ts
  - lib/rag/mainlandPep.test.ts
  - types/index.ts
  - package.json
  - coordination/content-qa/
  - coordination/session-logs/2026-05-23-S18.md
- Forbidden write scope:
  - Original ZIPs and extracted source documents in Git
  - app UI pages
  - AI Tutor route/provider behavior
  - production API/storage routes
  - real env files
- Acceptance criteria:
  - Local metadata-only manifest generated for 9上/9下
  - S3 upper/lower safe paper-pattern cards committed
  - RAG tests prove grade/semester separation and source-content safety
  - S18 verification report written
- Required checks:
  - manifest self-test
  - local manifest run on both ZIPs
  - npm run test:rag
  - npm run type-check
- Stop conditions:
  - Source authorization unclear
  - source text/images needed in committed artifacts
  - shared-file conflict or TypeScript/package changes not coordinated
```
