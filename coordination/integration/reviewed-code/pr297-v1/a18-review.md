# PR297 A18 最终内容审查与冻结绑定 v2

结论：`approved-for-integration-review`。本 A18 决定仅覆盖香港 P1 图形与规律课现行六条标题/操作说明（原英文与繁体四条，加简体两条），以及必要课题和 GeometryExplorer 依赖的当前性。P0、P1、P2、P3 内容问题均为 0。`scope=exact-pr297-runtime-required-check-only` 标识本记录被 PR297 门禁消费的范围，不将 A18 变为整个运行时包的验收方。

审核者为独立会话 `/root/a18_pr297`，未编写、修改或提交候选源码或门禁代码。本轮于 `2026-10-27T01:33:31.952Z` 完成只读核验。

## 实际提交与完整清单

| 绑定 | 独立核验值 |
|---|---|
| B | `b16991a6263d41642266b7b0b5f65446b11e5e1f` |
| S | `0d91ff35fd9a46a070119949ea4509fb8b46a011` |
| S tree | `f7453315bf0925d700ded5aba7e426c70ac0a3ca` |
| 完整 B→S 库存 SHA-256 | `f929d9ff7795a6d6d1cfc71bc3b60ef6f2a8f8c3d31be32c5f971784f73114ed` |
| T | `89d25f1ec03757779a1e7578f4943e69bd63d786` |
| T tree | `bd61657fc00c063eb39365d778ed6536525d175d` |
| S→T 库存 SHA-256 | `f7a293747ceb65eb4d1a8fc37ad2078167efa6ca03f6c787d86b590bc5548ff8` |
| source-checks 原始 SHA-256 | `4a187a9727e2bc7dfead3de555425aef0e70e6c463dfca0407914115d789b8da` |
| runtime-evidence 原始 SHA-256 | `c257505882a6f8720d6e11537ea776d2565a4cf56e993e692fe75ac9b6b56d85` |

我通过 Git 对象重新计算了 B→S 全部 134 个路径的前后 mode、blob ID 和原始 SHA-256，并与冻结 source-inventory 逐项比较一致；S→T 是恰好四个授权 tooling 路径，T 唯一父提交为 S。上述范围核验只确认本 A18 内容没有随 tooling 改动，不替代 A23 的门禁实现审核或 A11 的整合回归判断。

## 内容当前性与判断

| 文件 | 原始 SHA-256 |
|---|---|
| data/lessons.ts | `d41b63a1cb2d04fbfc8c15bec036641a9cd9c91d7d5ee823f79610ef30bf3918` |
| data/topics.ts | `91215da1fd6b955d898459e32169742191442e6942e07a7880ddf7fe198268ff` |
| components/visualizations/GeometryExplorer.tsx | `bed0fc1e081720293cdea19479ec734e3430536597ac22ad4fcaa593bfd7900c` |

这三份文件在 S、T、当前工作副本、r2 内容补审及简体浏览器实际测试源之间字节一致。后两份依赖也与 B 相同。当前 lessons 身份是 `d41b...`；旧 `2b42...` 仅作为历史四条英繁文案审查身份保留。

已独立重新阅读三语文案、项目 P1 课题、实际组件路由、规律序列、目标空位、拖曳、具名按钮、检查反馈和边角属性。观察、选择、检查及计数任务真实可对应，语言自然等价，无新增数学、答案、年级适配或歧义问题。此为项目内课题适配，不是完整官方课程重新认证。未新增外部教材、学术主张、图像或私有语料，也未调用外部模型或读取凭据。

## 被消费的浏览器证据及边界

我已读取两轮既有浏览器回执、AX 文本并实际查看两张留存截图。繁体图显示规律、选择结果、3/3 属性与正确反馈；简体图及 AX 显示新增标题和说明、相同选择及反馈。两张截图原始哈希分别为 `5182e5df8cffea65abbf3178e6ab64076b471c7abb8332f360d9d8f3fe3be4ee` 与 `39de784b0a11e931e4c46913d45de60c6163805f419d3f5d2b71db8887d57898`。

冻结 runtime 中 `p1-browser-r2-receipt`、截图、AX 和 `a18-p1-r2` 原始哈希、字节数及嵌入 JSON 均与保留原件一致。旧英文/繁体/拖曳回执仍绑定 `01f393519b4c823f9dca9c76654c9ffee9131b84`；r2 的实际测试源仍为 `9b924d2559195201d6a01cde72d2423aaac9b93e`。本会话没有重新运行浏览器，不把三个文件等价写成完整树等价或新 S 执行。

source-checks 的实际原始哈希与 T 常量绑定一致，记录确定性回归而非新的 PG/HTTP 执行。冻结 runtime 明确保留旧 lesson-all 注册夹具缺 parentalConsent 的失败和 legacy 直接保存性能预算未通过；这些限制没有改名或改算为通过。

本记录不审批整份 lessons.ts、完整 GeometryExplorer、其他内容包或所有性能模式，不生成 Shadow Receipt，不刷新历史审核，不批准部署或线上行为。`historicalPromotionRevalidated`、`liveAllowed`、`previewAllowed`、`deployAllowed`、`wholePackAccepted`、`historicalAuthorityTransferred` 均为 false。下一步由 A23 消费此真实 T/执行证据绑定，与 A11 独立审查及实际 E 的远端检查共同处理精确 PR297 接纳；部署继续未获本记录授权。

## T2 增量复核与 T1 保留

此次 v2 是对真实 T2 的独立绑定复核，不覆盖 T1 审查。T1 JSON/Markdown 的原始 SHA-256 仍分别为 `c0cfa3d2ea1111e0a1e9186245a4986c870a06153c36850adb24255802c59155` / `1b1038d848e2283f7d00aea7abb1476b6a8d86806bc02de016f2a7edbf18bbc3`，已重新读取确认未变。T1 保全 bundle 的原始 SHA-256 为 `ea30f1f11ce464cfa1a279d43044be38897c54259214d4eacdc00db67f67647b`。

实际 T2 仍是 S 的直接子提交，恰好四个 tooling 路径；与 T1 相比只涉及 checker 的固定 types 参数和证据哈希、一个对应参数断言及说明文档。workflow、所有运行时内容与本 A18 三份源码均未变。

`types` 参数显式新增 `--max-old-space-size=6144`，对应既有 Ubuntu CI 的内存预算，命令环境仍为白名单且不继承外部 `NODE_OPTIONS`。已读取独立执行记录和原始空 stdout/stderr：2026-10-27T01:30:02.415Z 至 01:30:29.438Z，退出码 0，实际执行提交为 T1，记录如实注明 TypeScript 源码与 S 相同；没有把它表述为 T2 上重新执行。其余四项命令记录与 T1 冻结记录完全一致。

已逐对象比较两版 runtime-evidence，唯一变化是 `source_checks/source_checks_raw_sha256`，P1 内容、浏览器事实、历史证据及所有非通过限制完全未变。因此 A18 六条文案的 `approved-for-integration-review` 内容判断不变；本 v2 只将其绑定到已重新核验的实际 T2 与新冻结证据。
