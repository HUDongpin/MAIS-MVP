# 中国大陆数学 Visualization Labs：65 项语义 RED 批量修复蓝图

日期：2026-08-10

角色：A18 课程 QA（只读审计；未修改产品、catalog、Configured renderer、E2E 或 oracle）

配套机器文件：`2026-08-10-A18-mainland-visualization-65-red-remediation-blueprint.v1.json`

## 结论

当前 335 个中国大陆 Visualization Labs 的 exact-current 语义合同，经冻结 v1 oracle 与已审 delta overlay 合并后，是：

- 270 项候选 `pass:exact`
- 65 项 `repair-required`
- 65 项可收敛为 21 个复用修复组，不应按 65 个孤立页面逐个打补丁
- 其中覆盖收益最高的四组是多位数四则、小数运算、有理数/实数/根式、分数运算，共覆盖 24/65
- 四个最新 P5 分数路由仍保持硬 RED；“已经算对答案”不等于“已经呈现课程承诺的数学过程”

本报告是 `candidate-only` 的实现蓝图，不是浏览器或生产放行。

## 主要 bug 形态

### 1. 课程标题/说明与实际模型不一致

最常见根因是 catalog 声明了一个专业主题，但 renderer 只按通用 `templateId` 或旧 family 显示一个更窄、甚至不相关的模型。例如：

- 多位数乘除法仍显示小型 rows × columns 数组
- 小数加减/除法仍显示位值比较或小数面积乘法
- 圆的弦、切线、圆周角与正多边形仍只显示扇形
- 坐标路线/相对位置仍只显示一个点
- 章节综合题只显示一个子主题

修复规则：专业标题不可通过删除核心数学承诺来“变绿”；必须实现 exact family，或建立有序 composite，或明确从 Lab catalog 省略。

### 2. 数学结果正确，但过程模型缺失

这一类会造成危险的假绿：公式 badge 或最终数值正确，但学生看不到题目承诺的推理结构。例如 P5 分数乘法虽能给出精确乘积，却没有重复组、一个量的几分之几、缩放、面积模型与约分；分数除法虽能算商，却没有倒数、包含除/等分除与逆运算检验。

修复规则：每个命名过程都必须有可见状态、可操作控件、机器可读 invariant，以及与同一 semantic state 绑定的图形标记。

### 3. 一个通用 state 被错误复用于多个不同主题

典型表现是只改 `focus`、`formula` 或 mode label，却没有 renderer 分支；元数据变化不会自动产生新的数学模型。结果是多个课程主题共享相同的滑块和 SVG，但 UI 文案暗示它们是不同实验。

修复规则：resolver 必须按 exact family/variant/composite 路由；没有 exact 实现时 fail closed，不能回退到 humanized template 或“最接近”的模型。

### 4. 复合章节丢失子主题

`几何图形`、`根式—勾股—四边形`、`反比例—相似—三角—投影`、`图形—位置—时间`、`运算—分数`、`大数—乘法—估算` 六个标题需要 exact ordered composite。只显示第一项或最后一项都会让页面看似可用但课程语义不完整。

修复规则：复合 Lab 必须暴露有序 strand identity、每个 strand 的可见 capability label、独立 child model/state/mode/control，以及一次 reset 后所有 child 都回到 exact 初态。

### 5. 精确量被整数/近似状态偷换

有理数、无理数、根式当前常退化为整数跳跃；学生看不到精确分数点、根式符号、近似值和误差界。类似问题也会出现在小数浮点运算、统计平均值和几何残差。

修复规则：用 scaled integer、exact rational 或符号量作为 source of truth；近似值必须带 precision/error receipt，不能反过来成为数学真值。

### 6. 几何“看起来像”但没有定理级不变量

通用角、三角形或圆形 SVG 可能视觉上合理，却没有共享顶点、平行叉积为零、垂直点积为零、对应边/角标记、弦切角关系、分解面积守恒等可验证合同。

修复规则：显示的 path/mark 必须和序列化状态共同证明定理，不接受仅靠文案或随机形状。

### 7. 复用控件没有覆盖真实动态域

当一个控件改变另一个控件的合法范围时，静态 Cartesian endpoints 会产生无效状态，或者 UI 暗中 clamp 后保留旧 raw 值。典型例子是分母下降时分子必须原子收窄，之后分母上升不能复活旧分子。

修复规则：显式版本化 dynamic-domain metadata；记录 controller、affected control、projection、reason、requested/expected/observed；任何未声明 clamp 都是 RED。

## 21 个复用修复组

| 组 | 覆盖 | 目标修复 | 复用策略 |
| --- | ---: | --- | --- |
| G01 多位数四则 | 9 | 位值分解、部分积/部分商、进退位、余数、估算与逆向重构 | 新建共享 `multi-digit-operations` |
| G02 小数运算 | 4 | 对齐位值、精确 scaled integer、加减乘除与舍入误差 | 新建共享 `decimal-arithmetic` |
| G03 有理数/实数/根式 | 6 | 精确分数点、根式、近似与误差界、绝对值距离 | 扩展 `signed-real-number-line` |
| G04 分数运算 | 5 | 通分、等值、约分、比较、带分数、乘除法意义与估算 | 扩展为 `fraction-operations-v2` |
| G05 百分数应用 | 2 | 求部分/整体、增减、折扣、逆向基数 | 扩展 `percent-model` |
| G06 比和比例 | 1 | 等值比、正/反比例、比例尺 | 扩展 `ratio-proportion` |
| G07 式、整式、分式 | 7 | 同类项、展开/因式分解、分式定义域/约分/残差 | 扩展 tiles，并新增分式 child family |
| G08 方程、不等式、方程组 | 4 | 平衡、端点开闭、负数变号、双残差、交点 | 组合现有 solver families |
| G09 集合与逻辑 | 1 | Venn 区域、命题方向、充分必要、反例 | 扩展 `set-logic` |
| G10 函数/数据/导数综合 | 2 | 表—式—图一致、导数、极值、单调、不等式、数据趋势 | exact composite |
| G11 数据与统计 | 2 | 原始数据、单位换算、均值/中位/极差、回归/独立性 | 新增 bivariate/independence child |
| G12 点线射线线段与角 | 3 | 几何原语、共享顶点、平行/垂直/相交残差 | 新建共享 `line-angle-geometry` |
| G13 圆定理与正多边形 | 3 | 弦、切线、圆周角、直径垂弦、中心角 | 新建 `circle-geometry-suite` |
| G14 坐标位置/路线/变换 | 3 | 起点终点、路线、相对位置、变换前后坐标、数据 | 扩展 coordinate family |
| G15 等腰三角形与全等 | 2 | 对应关系、全等判定、等边等角、对称轴 | 扩展 triangle family |
| G16 周长面积与线关系 | 1 | rectangle cover/boundary + 平行/垂直/相交 | exact composite |
| G17 多边形面积分解 | 1 | 平移/剪拼、面积守恒、三种公式 | 扩展 polygon area |
| G18 三角/向量/解析几何综合 | 1 | 向量、三角比、直线圆关系与残差 | exact composite |
| G19 钱币/时间/数据复习 | 1 | 钱币组成、钟表/经过时间、分类条形图 | exact composite |
| G20 六个多主题章节 | 6 | exact ordered child strands | 子模型全部通过后再组合 |
| G21 数学习惯 | 1 | 优先从可视化目录省略；若保留须为专门元认知交互 | 禁止用无关数轴代替 |

完整 65 个 exact IDs、每组可见状态、invariants、controls、modes 和复用说明在配套 JSON 中。组成员无重复且与 exact-current 65 RED 集合完全相等。

## 四个 P5 分数硬红的最新判定

1. `bnu-primary-p5-lower-fraction-add-sub`

   加/减法运算隔离和精确结果已正确，但 tenths-only 双条模型没有通分、带分数、约分、估算；catalog 公式仍只是 `part / whole`。

2. `bnu-primary-p5-lower-fraction-division`

   商可以算对，但没有逆运算、倒数、包含除/等分除、方程求解。

3. `bnu-primary-p5-lower-fraction-multiplication`

   积可以算对，但没有重复组、一个量的几分之几、缩放、面积模型、可见约分。

4. `hjb-primary-p5-lower-fractions-equivalence-operations`

   加减法可以算对，但专业标题还要求等值、约分、通分、比较、显式整体，目前都缺失。

这四项不能通过缩小标题、降低分母范围或只加公式标签来放行。

## 最小实施顺序

1. 先做 G01–G04：一次覆盖 24 项，并为后续复合章节提供整数、小数、实数、分数 exact engines。
2. 再做 G07–G08：建立符号 state、定义域、等价变换、方程/不等式残差。
3. 再做 G12–G17：统一几何原语、关系、定理 mark 和分解守恒。
4. 再做 G05、G06、G09–G11、G18、G19：应用题、统计、逻辑、函数与综合专题。
5. 子模型全部通过后才组合 G20 六个复合章节。
6. G21 优先省略；只有课程 QA 批准 dedicated metacognitive interaction 才保留。

## 每组共同的放行门

静态/纯数学：

- exact model state 与公式、marks、summary 一致
- 每个 declared mode 有不同且可达的数学状态
- 每个 control 的 min/mid/max 与动态域状态都有 requested/expected/observed receipts
- reset 恢复 exact module/topic 初态
- 专业标题和 ordered strand 不得丢失

真实浏览器（本蓝图未运行）：

- 真 lesson/directory 路由，不是 data URL 或 SSR 字符串
- zh/zh-Hans/en、light/dark、mobile/desktop
- 所有 mode、所有 control endpoints、合法组合状态
- 0 文本碰撞、0 页面横溢、44×44 触控、fail-closed 数值对比度
- 首次真实交互才创建 exact `(user,module,topic)` session；mount 不写；重复完成幂等
- POST 有 exact-user durable outbox/ACK，并以服务器/SQLite reread 为终态
- 大状态空间按确定性 chunk 执行；不得因 deadline、grep、skip 或局部 runner 退出而假绿

## 独立检查结果

- 配套 JSON 可解析。
- 21 组的成员并集 = exact-current 65 RED；无重复、无缺失、无额外 ID。
- sorted set SHA-256 = `df92ab887b0192639ef93f5fc959902567e89c31894ab775eb3f843983658d7c`。
- 四个 P5 rationale 与 reviewed delta overlay 逐字一致。
- 当前 overlay static oracle suite：5 项结构/identity/hash/routing/mode contract PASS，最后的 release gate 精确因 65 项 RED 而失败；这是预期的诚实红门。
- 当前纯模型/控件/SSR/composite focused suites：162/162 PASS；这些通过只证明已实现 family 的静态数学，不会覆盖 65 项缺失的课程能力。

## Overlay 独立审查

当前 `mainlandVisualizationSemanticOracle.test.ts` 只把冻结 v1 与 SHA 锁定的 reviewed delta 叠加：

- 108 项只按候选授权把 `narrow-before-live` 更新为 exact focus/promise；
- 6 项 route decision 完整来自候选 delta；
- 110 项被批准的 changed IDs 与 4 项 changed RED、61 项 untouched RED 互斥；
- exact-current 仍为 270 PASS / 65 RED；
- 没有发现超出 candidate 授权的额外 promote。

因此 overlay 可以继续作为候选集成视图，但最终 oracle 与学生放行仍必须等 65 项真正实现并通过上述浏览器/持久化门。
