# 2026-06-06 手写板 Bug 简单报告

- 会话：S11
- 范围：Lesson 页面和 Practice Arena 的手写板；包含 desktop Chrome、mobile Chrome，以及真实 `/api/handwriting-recognition` OCR 路由调用。
- 结果：desktop 确认 8 个问题，P0 0 个，P1 5 个，P2 3 个；mobile 复现 7 个问题，P0 0 个，P1 4 个，P2 3 个。
- 安全说明：报告未记录任何 API key、cookie、auth header 或 token 值。

## 主要问题

1. P1 - 新学生设置弹窗挡住 Practice 手写板入口
   - 现象：英文学生进入 Practice 后，全局 `LearnerStartSetupGate` 弹窗挡住 `Handwriting board` tab，而且弹窗文案是简体中文。
   - 影响：学生看得到手写板入口，但点击会被弹窗拦截，手写板流程无法顺利开始。
   - 建议：S01/S09 检查全局弹窗的触发范围、关闭逻辑和双语文案。

2. P1 - 折叠画布后仍可 Convert，但 OCR 请求没有 `imageDataUrl`
   - 现象：学生画完后折叠手写区域，再点 Convert，客户端仍提交 strokes，但因为 canvas 已卸载，请求缺少图片。
   - 影响：真实 OCR 只能拿到 stroke telemetry，识别质量和 provider 路由都会受影响。
   - 建议：S04 修复手写板折叠状态，要么禁止 Convert，要么转换前重新展开并捕获 canvas。

3. P2 - 空白橡皮擦轨迹也会启用 Convert
   - 现象：空白画布上只用 eraser 拖一下，Convert 按钮也会启用。
   - 影响：用户没有写任何可识别内容，却可以触发 OCR。
   - 建议：S04 将 `hasDraft` 改成至少存在可见 pen stroke。

4. P2 - OCR payload 会接受纯 eraser stroke
   - 现象：空白画布 eraser-only 操作会提交到 `/api/handwriting-recognition`。
   - 影响：浪费 OCR 调用，也会污染识别日志或分析数据。
   - 建议：S04/S07 在客户端和 API 边界都过滤无可见墨迹的请求。

5. P1 - OCR 限流错误被替换成误导性的“ handwriting quality ”提示
   - 现象：当 OCR route 返回 429，前端显示 `Draw clearer separated digits...`，没有告诉学生是限流或稍后重试。
   - 影响：学生会误以为自己写得不好，而不是系统暂时不可用。
   - 建议：S04/S07 解析非 2xx 响应 JSON，并显示可操作的错误信息。

6. P1 - Lesson API 有手写题，但 Lesson 页面没有渲染可用手写练习卡
   - 现象：`algebra-basics` Lesson API 返回 handwriting-capable practice question，但 `/student/lessons/algebra-basics` DOM 中没有可见的 fill-in / short-answer / graph 手写练习卡。
   - 影响：Lesson 场景无法覆盖同一套手写板能力。
   - 建议：S05 检查 `LessonView` 对 practiceQuestions 的过滤、标签和渲染逻辑。

7. P1 - 真实 OCR route 对清晰生成图片出现 provider failure / timeout
   - 现象：5 个清晰生成数学图片中，`x^2+4x` 这笔调用 45 秒超时。
   - 影响：学生可能长时间等待 Convert，最终无结果。
   - 补充：mobile 重跑中没有超时，但同一个 `x^2+4x` 返回 HTTP 200 且空文本，说明问题更像 OCR 接受/候选处理不稳定，而不是单纯网络失败。
   - 建议：S07/S19 检查 provider transport、超时、重试和用户提示。

8. P2 - 真实 OCR route 对常见表达式返回 HTTP 200 但空文本
   - 现象：`2x+3=9`、`sin30=1/2` 返回 provider=`simpletex`、`accepted=false`、text 为空，但有 alternatives。
   - mobile 补充：mobile 中 `x^2+4x`、`2x+3=9`、`sin30=1/2` 三个表达式都返回空文本。
   - 影响：可复核候选没有展示给学生，前端只能显示失败。
   - 建议：S07/S04 调整低置信候选处理，把 alternatives 暴露给 UI 或进入人工确认状态。

## 补充观察

- 桌面 harness 已通过并生成详细报告：`coordination/reports/2026-06-06-handwriting-board-bug-hunt.md`。
- 桌面 JSON 结构化证据：`coordination/reports/2026-06-06-handwriting-board-bug-hunt.json`。
- 移动端 harness 已在磁盘空间恢复后通过，并生成报告：`coordination/reports/2026-06-06-handwriting-board-bug-hunt-mobile.md`。
- 移动端 JSON 结构化证据：`coordination/reports/2026-06-06-handwriting-board-bug-hunt-mobile.json`。
- 之前的 `ENOSPC: no space left on device` 已通过释放磁盘空间解决；本次 mobile 重跑没有再出现磁盘写入失败。
