# 3Blue1Brown 技能蒸馏手册

S16 research and learning science lead, with S06 visualization implementation lens

Date: 2026-06-20

## 0. 一句话总纲

3Blue1Brown 的核心不是“用 Manim 做漂亮动画”，而是把数学思想拆成可感知、可连续追踪、可验证的视觉对象，再用代码、镜头、符号、节奏和旁白把这些对象组织成一段认知旅程。

如果 MAIS 要蒸馏 3Blue1Brown 的能力，目标不是复制皮肤，而是复制生产系统：

- 用数学建模确保内容是真的。
- 用视觉语法确保概念看得见。
- 用动画连续性确保学习者跟得上。
- 用工具链确保每个场景可迭代、可复用、可测试。
- 用教学导演能力确保每个镜头都服务理解。

## 1. 来源边界与版权边界

本手册蒸馏的是公开来源中的方法、能力、工具链和可迁移设计原则，不复制 3Blue1Brown 视频、脚本、素材、角色、音频或受版权保护的完整场景。`3b1b/videos` README 明确说明：Manim 库本身是开源软件，但视频代码仓库内容使用 Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License。对 MAIS 来说，正确姿势是学习方法，不直接商品化复制其具体视频内容或受保护素材。

可参考来源包括：

- 3Blue1Brown lesson page: `How I animate 3Blue1Brown | A Manim demo with B...`
- `3b1b/videos` README: 说明 3Blue1Brown 视频代码主要使用 Manim，并解释 Grant 的交互式 workflow。
- `3b1b/manim` README: 说明 ManimGL 是用于精确程序化解释性数学动画的引擎。
- Manim Community README: 说明社区版 Manim 的 Scene、Mobject、Transform、渲染等基础范式。
- `lorenz.py`: 展示一个真实 3b1b Manim demo 如何把微分方程、数值积分、3D 坐标、TeX、镜头和 tracing tail 组织成场景。
- Three.js README: 说明 Three.js 是跨浏览器通用 3D JavaScript 库。
- React Three Fiber README: 说明它把 Three.js 变成可复用、声明式、响应 React 状态的组件系统。

## 2. 3Blue1Brown 的能力地图

可以把 3Blue1Brown 蒸馏为八个能力层：

1. 数学洞察层：找到一个概念里真正需要被看见的结构。
2. 教学叙事层：把概念拆成学习者能连续跟踪的认知节拍。
3. 视觉语义层：用颜色、位置、形状、尺度、透明度表达数学意义。
4. 动画连续层：让对象变形、移动、增长、消失时保持身份连续。
5. 符号-几何绑定层：让公式、变量、图像、向量、区域互相对应。
6. 镜头导演层：用相机位置、角度、缩放和停顿组织注意力。
7. 程序化工具层：用代码生成精确、可复现、可迭代的数学场景。
8. 制作工作流层：用 interactive preview、checkpoint、record、render 支持高速打磨。

任何只学到其中一层都不够。只学视觉风格会变成“深色背景加彩色线条”；只学 Manim API 会变成“会写动画但不会教学”；只学 Three.js 会变成“能画 3D 但不解释数学”。完整蒸馏必须把这八层连起来。

## 3. 数学洞察层：先找到“可视化内核”

3Blue1Brown 的第一技能是选内核。一个数学主题不是直接开始画，而是先问：

- 学生真正卡住的地方是什么？
- 这个概念中哪个不变量、变化量或对应关系最值得被看见？
- 公式背后的几何对象是什么？
- 是否存在一个动态过程能生成这个概念？
- 能否把抽象定义变成可移动、可变形、可追踪的对象？

例如 Lorenz demo 的内核不是“画一个漂亮混沌图形”，而是：

- 微分方程定义状态如何变化。
- 相近初始条件会产生不同轨迹。
- 轨迹在 3D 空间中形成结构。
- 当前状态、近期历史和整体路径需要同时可见。

于是代码自然出现：`lorenz_system` 定义方程，`solve_ivp` 生成轨迹点，`ThreeDAxes` 提供空间，`Tex` 显示方程，`GlowDot` 表示当前状态，`TracingTail` 表示近期历史。这就是从数学内核到视觉场景的转换。

MAIS 应该为每个可视化先写“内核卡片”：

- 概念：例如导数、矩阵、概率分布、向量场。
- 核心关系：什么变，什么不变，什么相互对应。
- 视觉对象：点、线、面、区域、网格、箭头、公式。
- 动画动作：增长、旋转、变形、追踪、叠加、拆分。
- 学习目标：学生看完应该能说出什么。

## 4. 教学叙事层：每个镜头只推进一个认知动作

3Blue1Brown 的叙事不是把知识点堆出来，而是逐步构建心理模型。关键原则：

- 先直觉，后形式。
- 先对象，后符号。
- 先变化过程，后静态结论。
- 先一个例子，后一般化。
- 先建立对应，再做推理。
- 每个动画 beat 只让观众追踪一个主要变化。

一个典型 3Blue1Brown 风格场景可以拆成：

1. 问题钩子：展示一个反直觉现象或未解释图形。
2. 最小对象：只放入理解所需的第一批对象。
3. 动态生成：让结果从规则中长出来。
4. 对应绑定：把公式变量和几何元素对齐。
5. 局部变化：调整一个参数，让学生看到因果。
6. 一般化：从特例扩展到一族对象。
7. 压缩总结：把动画经验压回一句定义或公式。

MAIS 的互动可视化也要遵守这个节奏。即使学生可以自由拖动，系统仍然需要“导览模式”：先用导演式动画建立模型，再开放探索模式。

## 5. 视觉语义层：颜色不是装饰，是数学身份

3Blue1Brown 的颜色有语义。变量、向量、曲线、区域、公式 token 的颜色应保持一致。Lorenz demo 中 `x`、`y`、`z` 在 TeX 中分别着色，曲线和 moving dots 也用颜色组织。颜色在这里承担“身份保持”功能。

MAIS 可采用以下视觉语义规范：

- 蓝色/青色：主函数、主轨迹、当前对象。
- 绿色：面积、累积、正向变化、成功路径。
- 黄色/橙色：导数、切线、速度、变化率。
- 红色/玫红：误差、差值、需要注意的偏离。
- 紫色：参数、变换、第二对象。
- 灰色：参考对象、背景网格、已完成历史。

但颜色不能是唯一编码。还要结合：

- 线型：实线、虚线、点线。
- 形状：圆点、方点、箭头、区域填充。
- 透明度：背景对象低透明，当前对象高亮。
- 动效：当前对象有轻微 pulse，历史对象淡出。
- 标签：移动对象要有可读 label 或可 hover label。

## 6. 动画连续层：最重要的不是出现，而是“变成”

3Blue1Brown 风格的核心动画原则是 continuity of identity，也就是身份连续。学习者必须感觉到“这是同一个数学对象在变化”，而不是“旧图没了，新图出现了”。

典型动作包括：

- 点沿曲线移动，而不是在多个位置跳变。
- 曲线按弧长被画出来，而不是瞬间出现。
- 网格被连续变形，而不是替换成新网格。
- 公式中的一项高亮时，对应几何部分同步高亮。
- 向量旋转、拉伸、平移时保留起点、终点和颜色身份。
- 区域从小矩形累积成积分面积。

对 MAIS 的 Three.js 层来说，这意味着要做 `AnimationPrimitive`，而不是在每个场景里临时改 mesh 属性。建议的 primitives：

- `WriteFormula`
- `RevealCurve`
- `MovePointAlongCurve`
- `TraceRecentPath`
- `TransformGraph`
- `DeformGrid`
- `SweepParameter`
- `HighlightCorrespondence`
- `GrowVector`
- `CameraMoveToShot`
- `FadeHistory`
- `ResetToCanonicalView`

这些 primitives 应该接受数学对象，不应该只接受 mesh。

## 7. 符号-几何绑定层：公式必须能指向图形

3Blue1Brown 不是“旁边放一个公式”。公式是场景的一部分。公式里的 token 应能和几何对象绑定：

- `x` 对应横坐标、x 方向分量、x 轴投影。
- `f(x)` 对应曲线高度。
- `dx` 对应微小横向增量。
- `dy/dx` 对应切线斜率。
- 矩阵元素对应网格变形或基向量变换。
- 概率项对应直方图柱或面积。

Manim 适合视频，因为 TeX 是它的核心能力之一。Three.js 本身不解决公式排版，所以 MAIS 需要 `FormulaLayer`：

- 用 KaTeX/MathJax 渲染清晰公式。
- 为每个 token 添加 semantic id。
- 允许 token 高亮、淡出、变色。
- 将 token 与 Three.js 对象共享 concept id。
- 用 screen-space overlay 保证公式不随 3D 镜头乱转。
- 对 3D 空间标签，用投影锚点把世界坐标映射到屏幕坐标。

没有这层，Three.js 只能做漂亮空间图；有了这层，才能做“数学解释”。

## 8. 镜头导演层：相机不是自由旋转玩具

Three.js 很容易让用户 orbit，但 3Blue1Brown 风格需要导演式相机。相机服务于理解：

- 先正视图，建立二维关系。
- 再缓慢转入 3D，揭示深度。
- 对局部概念 zoom in。
- 对全局结构 zoom out。
- 关键公式出现时保持屏幕稳定。
- 学生探索后能一键回到 canonical view。

建议 MAIS 定义 `CameraDirector`：

```ts
type CameraShot = {
  id: string;
  target: [number, number, number];
  position: [number, number, number];
  zoom?: number;
  durationMs: number;
  easing: "linear" | "easeInOut" | "smoothStep";
  pedagogicalIntent: string;
};
```

每个高质量场景至少要有：

- `intro`: 初始建立关系。
- `explain`: 最适合讲解的角度。
- `reveal`: 揭示隐藏维度或结构。
- `explore`: 学生可交互角度。
- `reset`: 回到标准视角。

## 9. 程序化工具层：Manim 蒸馏出的技术范式

Manim 的根本范式是“数学动画即代码”。它把解释性视频变成：

- `Scene`: 一个可构建、可播放、可渲染的教学场景。
- `Mobject`: mathematical object，数学/图形对象。
- `Animation`: 对 mobject 的时间化操作。
- `Tex/MathTex`: 数学符号对象。
- `Updater`: 每帧更新对象状态。
- `ValueTracker`: 参数随时间变化。
- `CameraFrame`: 镜头控制对象。
- `Renderer`: 输出帧或视频。

3b1b/manim README 强调 Manim 是 precise programmatic animations 的引擎，目标是 explanatory math videos。Manim Community README 的 `SquareToCircle` 示例展示了最小范式：创建对象、播放创建动画、Transform、FadeOut。这就是 3Blue1Brown 风格的基础语法：对象不是静态图片，而是可变换实体。

MAIS 的 Three.js 版本应当映射为：

| Manim 概念 | MAIS Three.js/R3F 对应 |
| --- | --- |
| `Scene` | `MathScene` / React route / R3F `<Canvas>` |
| `Mobject` | `MathObject`，包装 mesh/line/surface/formula |
| `Animation` | `AnimationPrimitive` / timeline command |
| `Tex` | `FormulaLayer` + KaTeX/MathJax |
| `Updater` | `useFrame` / deterministic update loop |
| `ValueTracker` | React state / timeline signal / spring value |
| `CameraFrame` | `CameraDirector` |
| render video | browser canvas + optional capture/export |
| checkpoint workflow | dev route + scene state snapshots |

## 10. 生产工作流层：3b1b 的 hidden advantage

`3b1b/videos` README 里最关键的信息不是快捷键本身，而是 workflow 思想：

- 可以从某一行进入 interactive scene。
- 可以在 IPython terminal 中和 scene 交互。
- 可以用 `checkpoint_paste()` 运行剪贴板代码片段。
- 以注释开头的片段第一次运行会保存 checkpoint。
- 后续同名 checkpoint 会先还原场景再执行片段。
- 可以 skip animation 快速检查最终状态。
- 可以 record 当前片段输出视频。

这说明高质量动画来自“短反馈回路”。Grant 不需要每次完整渲染整支视频；他能像调试代码一样调试动画。

MAIS 要复制的不是 Sublime 插件，而是短反馈回路：

- 每个可视化 family 有 dev playground。
- 可以选择 scene spec。
- 可以调整参数、镜头、颜色、时间线。
- 可以保存 checkpoint。
- 可以从任意 step 开始播放。
- 可以跳过动画查看最终状态。
- 可以导出截图/短片段。
- 可以运行 Playwright canvas-pixel check。
- 可以把通过验证的 scene spec promotion 到正式课程。

## 11. Lorenz demo 的完整蒸馏

`lorenz.py` 可以作为最小真实案例拆解：

### 数学层

- 定义 Lorenz system: `dx/dt`, `dy/dt`, `dz/dt`。
- 用 `solve_ivp` 做数值积分。
- 用多个相差 `epsilon` 的初始状态展示敏感性。

### 空间层

- 创建 `ThreeDAxes`。
- 设置 `x_range`, `y_range`, `z_range`。
- 把 ODE 点集通过 `axes.c2p` 映射到场景坐标。

### 符号层

- 用 `Tex` 写微分方程。
- 给 `x`, `y`, `z` 分别着色。
- `fix_in_frame()` 让公式固定在屏幕，不随 3D 空间旋转。

### 视觉层

- 用 `VMobject().set_points_smoothly` 生成平滑曲线。
- 用蓝色渐变区分多条轨迹。
- 用 `GlowDot` 标记当前状态。
- 用 `TracingTail` 保留近期历史。

### 时间层

- 用 `ShowCreation` 让曲线按时间被画出。
- `run_time=evolution_time` 把数学演化时间变成动画时间。
- `rate_func=linear` 让动态系统的推进均匀。

### 镜头层

- `self.frame.reorient(...)` 选择空间视角。
- `add_updater` 让镜头缓慢旋转，揭示 3D 结构。

这段 demo 的启发是：一个 3Blue1Brown 场景同时是数学程序、空间构图、符号解释、动画时间线和镜头导演。MAIS 的 Three.js 层也要把这些维度作为一等公民。

## 12. Three.js/R3F 可继承什么，不能直接得到什么

Three.js 能直接给 MAIS：

- WebGL/WebGPU 渲染。
- `Scene`, `Camera`, `Geometry`, `Material`, `Mesh`。
- 动画循环。
- 3D 曲面、曲线、粒子、光照、后处理。
- 浏览器实时交互。

React Three Fiber 能直接给 MAIS：

- 用 JSX 声明 Three.js 场景。
- 用 React state 驱动 3D 变化。
- 用 `useFrame` 参与 render loop。
- 用组件封装可复用对象。
- 与 Next.js/React 19 产品界面整合。

但它们不会自动给 MAIS：

- 数学对象语义。
- 公式 token 与几何对象绑定。
- 教学节奏。
- Manim-style transform。
- 可验证的课程状态。
- 统一视觉语言。
- 解释性动画 authoring workflow。

所以 “Three.js 能达到 3Blue1Brown 质量” 的完整条件是：

Three.js + R3F + MathScene layer + FormulaLayer + CameraDirector + AnimationPrimitive library + SceneSpec + QA harness。

## 13. MAIS 应建设的 3Blue1Brown-style 内部框架

建议命名为 `MathSceneKit` 或 `MaisMathScene`，包含：

### 13.1 `SceneSpec`

结构化描述教学场景：

```ts
type SceneSpec = {
  id: string;
  conceptId: string;
  title: LocalizedText;
  formula: string;
  parameters: ParameterSpec[];
  objects: MathObjectSpec[];
  beats: AnimationBeatSpec[];
  cameraShots: CameraShot[];
  assessmentSignals: string[];
};
```

### 13.2 `MathObject`

包装数学语义：

- `PointObject`
- `VectorObject`
- `AxisSystem`
- `FunctionCurve`
- `ParametricCurve`
- `SurfaceObject`
- `AreaRegion`
- `AngleMarker`
- `GridObject`
- `FormulaToken`

每个对象需要：

- `id`
- `conceptRole`
- `mathDefinition`
- `visualEncoding`
- `accessibilityLabel`
- `testState`

### 13.3 `AnimationBeat`

每个 beat 是一个教学动作：

```ts
type AnimationBeat = {
  id: string;
  intent: string;
  action: AnimationPrimitive;
  durationMs: number;
  focusObjectIds: string[];
  narrationHint?: string;
};
```

### 13.4 `FormulaLayer`

负责：

- 渲染公式。
- token 高亮。
- token 与对象的 semantic mapping。
- 屏幕固定与世界锚点两种模式。
- 移动端避让。

### 13.5 `QA Harness`

负责：

- canvas nonblank。
- 公式存在。
- 参数状态正确。
- 相机状态可读。
- 关键对象数量正确。
- 移动端无重叠。
- reduced-motion 可用。

## 14. 可复制的场景模式库

### 14.1 曲线生成模式

输入：函数或参数方程。

输出：曲线逐渐被画出，点沿曲线移动，公式同步出现。

用于：函数、三角函数、参数曲线、轨迹。

### 14.2 局部线性化模式

输入：函数和某点。

输出：点移动到局部，切线出现，局部 zoom，公式显示导数。

用于：导数、切线、近似、微分。

### 14.3 面积累积模式

输入：函数和区间。

输出：小矩形或条带累积，逐渐形成面积，最后对应积分符号。

用于：积分、概率密度、面积模型。

### 14.4 网格变形模式

输入：映射或矩阵。

输出：网格连续变形，基向量移动，面积/方向变化被高亮。

用于：线性代数、变换、Jacobian。

### 14.5 参数滑动模式

输入：参数化函数。

输出：学生拖动参数，曲线、公式 token、关键点同步变化。

用于：二次函数、三角函数、指数函数、概率分布。

### 14.6 动态系统模式

输入：状态方程。

输出：当前点、速度箭头、轨迹、tracing tail、相空间。

用于：微分方程、混沌、迭代、递推。

### 14.7 多表示绑定模式

输入：同一概念的公式、图像、表格、几何对象。

输出：一个表示变化时，其他表示同步响应。

用于：函数理解、统计、代数-几何转换。

## 15. 训练路径：如何培养 MAIS 团队的 3Blue1Brown 能力

### 第一阶段：临摹基本语法

目标不是发布，而是练基本功。

练习：

- 用 Manim Community 写 `SquareToCircle`。
- 用 Three.js/R3F 写同样效果。
- 用 KaTeX 写公式 overlay。
- 做一个点沿曲线移动。
- 做一条曲线按弧长 reveal。

验收：

- 对象身份连续。
- 颜色语义稳定。
- 公式清晰。
- 动画不跳变。

### 第二阶段：复刻 Lorenz demo 的结构

不能直接复制视频作为产品，但可以实现同类结构：

- 定义 ODE。
- 生成轨迹。
- 建 3D 坐标。
- 添加公式 overlay。
- 添加 moving dots。
- 添加 tracing tail。
- 添加 camera director。

验收：

- 数学状态可测试。
- 轨迹来自方程而不是手画。
- 公式 token 与颜色一致。
- 移动端可见。

### 第三阶段：做 MAIS 课程场景

选择 MAIS 课程中最需要可视化的知识点：

- 一次函数斜率。
- 二次函数参数。
- 分数等值变形。
- 圆与角。
- 三角函数周期。
- 向量加法。
- 概率分布。

每个场景必须有：

- `SceneSpec`
- `MathObject`
- `AnimationBeat`
- `FormulaLayer`
- QA evidence

### 第四阶段：建立场景库

把成功场景抽象为可复用 family：

- `FunctionCurveFamily`
- `GeometryConstructionFamily`
- `VectorTransformFamily`
- `ProbabilityDistributionFamily`
- `DynamicSystemFamily`
- `SurfaceAndFieldFamily`

## 16. 质量评分表

每个 3Blue1Brown-style 场景按 100 分评分：

### 数学准确性 25 分

- 数学模型明确：5
- 参数范围合理：5
- 图形由模型生成：5
- 公式和图形一致：5
- 边界情况处理：5

### 教学清晰度 25 分

- 每个 beat 只有一个认知动作：5
- 先直觉后形式：5
- 重点对象突出：5
- 学生能说出核心关系：5
- 结束有压缩总结：5

### 视觉语义 20 分

- 颜色绑定稳定：5
- 图形不拥挤：5
- 标签清晰：5
- 移动端不重叠：5

### 动画质量 20 分

- 运动连续：5
- easing 合理：5
- 镜头服务理解：5
- 历史/当前状态区分清楚：5

### 工程可维护性 10 分

- SceneSpec 可读：2
- primitives 可复用：2
- 状态可测试：2
- reduced-motion 支持：2
- 性能可接受：2

90 分以上才可称为 MAIS 内部的 3Blue1Brown-quality candidate。

## 17. 常见误区

误区一：以为深色背景和彩色曲线就是 3Blue1Brown。

纠正：那只是表层。真正核心是数学对象身份、连续变形、符号绑定和教学节奏。

误区二：直接用 Three.js 写每个场景。

纠正：这样会导致不可复用、不可测试、风格不一致。要先建 MathScene layer。

误区三：公式只是装饰。

纠正：公式必须参与动画和对象绑定。

误区四：交互越多越好。

纠正：学习场景先要有导览，再开放探索。无限自由会增加认知负担。

误区五：视觉越炫越好。

纠正：3Blue1Brown 的美来自克制、清晰和数学意义，不是堆特效。

## 18. MAIS 的最终目标

MAIS 要蒸馏的不是一个工具，而是一套“数学解释操作系统”：

- 把课程知识点转成数学对象。
- 把数学对象转成可连续追踪的动画。
- 把动画转成可互动的学习场景。
- 把学习场景转成可测试、可维护、可复用的产品模块。

最终形态应该是：

```text
Curriculum concept
  -> Mathematical model
  -> SceneSpec
  -> MathObject graph
  -> Animation beats
  -> Formula bindings
  -> Camera shots
  -> Three.js/R3F render
  -> QA evidence
  -> Student learning interaction
```

如果这个链条跑通，MAIS 就不是在模仿 3Blue1Brown 的外观，而是在吸收它最重要的能力：用动画让数学思想变得可见、可感、可操作。

## 19. 下一步建议

建议 S06 建一个最小 prototype：

- 主题：二次函数 `y = ax^2 + bx + c`。
- 功能：拖动 `a`，曲线曲率变化，公式中的 `a` 同步高亮。
- 技术：Three.js/R3F + KaTeX overlay + `SceneSpec`。
- 验证：canvas nonblank、参数 state、公式 token、移动端布局。

第二个 prototype：

- 主题：Lorenz-like dynamic system，不直接复制 3b1b 场景素材。
- 功能：ODE 轨迹、moving dots、tracing tail、camera shots。
- 目的：验证 Three.js 能否承载 3B1B-style 3D 动态系统解释。

第三个 prototype：

- 主题：矩阵变换网格。
- 功能：基向量变换、网格连续变形、面积缩放、行列式公式绑定。
- 目的：验证 symbolic-geometric correspondence。

这三类场景跑通后，MAIS 才真正拥有可扩展的 3Blue1Brown-style visualization foundation。

## 20. Sources

- 3Blue1Brown lesson page, "How I animate 3Blue1Brown | A Manim demo with B...": https://www.3blue1brown.com/lessons/manim-demo
- 3Blue1Brown video-code repository README: https://github.com/3b1b/videos?tab=readme-ov-file
- 3Blue1Brown ManimGL repository: https://github.com/3b1b/manim
- Manim Community repository: https://github.com/ManimCommunity/manim/
- Lorenz demo source: https://github.com/3b1b/videos/blob/master/_2024/manim_demo/lorenz.py
- Three.js repository: https://github.com/mrdoob/three.js/
- React Three Fiber repository: https://github.com/pmndrs/react-three-fiber
