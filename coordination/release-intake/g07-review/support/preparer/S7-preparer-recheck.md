# S7 准备器修复独立再审 — PASS

**当前五路径候选通过代码与修复边界再审。** subject digest：`bcdf71daaf99e13cf62f68df0b8d39705994c2798326409ce166422bca61099b`，算法为按 subject 原顺序排列 `{path,sha256}` 的紧凑 JSON SHA256。原 `eb0e412d…` 的 REQUEST_CHANGES 保留为历史，不能把两种序列化算法的 digest 直接比较。

本轮关闭两项原发现及修复过程中发现的两个边界：

|项目|结论|
|---|---|
|S7-IR-01 当前物理字节绑定|完整 snapshot/specialFiles/sensitiveAnchors、实际字节/mode/Git object 在 native scan 前、后、接受前核验。|
|S7-IR-02 不合法公历日期|真实公历天数及时间范围校验；非法月日/非闰29/24:00拒绝，合法闰日及正负offset保留。|
|原生 resolver anchor|使用 TARGET_BASELINE_PROJECTION_PATHS，纳入 tsconfig.next.json 的真实字节/mode及new-mode delta。|
|FIFO 阻塞|最终组件先检查regular；O_NOFOLLOW+O_NONBLOCK和fstat拒绝稳定/替换FIFO；读取上限为size+1，核验字节数及inode/dev/mode/time。|

**独立微型验证30/30符合预期：15日期、15物理文件案例。** 除普通内容、二进制、权限、native snapshot/anchor和缺失record外，还实际验证了外部fixture中的最终/祖先symlink、稳定FIFO、open前受控FIFO替换、描述符读取期间受控增长。没有修改真实Git index flags、工作区源码或凭据。原生review fixture声明仅在内存中复用，变异与拒绝/接受断言由本次审阅独立编写。

独立重新运行两个聚焦文件：**51项、50 pass、0 fail、1历史条件skip**。浅仓库专用检查因当前仓库有完整历史而跳过。命令为：

```text
node --test scripts/promotion-runtime-topology-review.test.mjs scripts/rebase-promotion-baseline.test.mjs
```

日志 `recheck-focused.log` SHA256：`d1ddaf96e69818dc6ac4192eac592997d946d815f9cfa4bb9abe711e44d7fc6f`。微型负例结果 `recheck-behavior.json` SHA256：`26519be676997cfd3d35f4674fc972c436a559035a598e8a898c44f838612cf6`。同名JSON记录逐路径源码hash、保护文件hash、输入/输出来源与每项关闭证据。

Root提供的真实main7f物理正例也已阅读并绑定到相同 preparer 代码hash：3815个runtime covered文件、3819个protected physical文件（含tsconfig.next.json）通过，binding digest `3dd93ea266d34bc1dd0a6ac01f358ecc772ed3e84752f339b97d3dc911f4784d`。该较大读取由Root执行，本子任务没有重复；它仍不是完整historical source/target collector。

五个路径在微型测试前后与最终重读均保持冻结字节；v2.6的8文件checker bundle、ledger、required-check、workflow及package保护哈希没有变化。新路径分类仅用于新topology模式，旧模式默认范围保持。文档明确这些检查依赖冻结写入者窗口，不声称对任意并发writer构成文件系统事务。

**本次PASS的上限是准备器代码与修复边界。** 完整clean committed collector、真实committed index/role currentness、实际evidence/bindings两个阶段、Shadow/canonical/fresh/replay、Receipt/Closure/Registry、build/CI/merge/deploy/cleanup都没有在本轮完成，不能据此宣称full Promotion PASS。Root后续worktree移动、inode/ref/path验证也未由本报告预先验收。

未发现其他新增阻塞，范围限于已检查代码与以上实际验证。Root可以进入其已授权的code commit/恢复保管，再按原生流程执行待完成collector/真实输入和下游门禁；若内容或目标发生漂移，必须重新绑定。
