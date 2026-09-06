# PR167 history parser graft 修复独立复核

**结论：PASS，限定于当前五路径 history parser 修复。** `HISTORY-GRAFT-01` 在冻结 snapshot `d55925927dba880cc34030893c1a5973cc2cf0dc5618de71b18b87fb9211d0f7` 中已解决，没有发现本轮范围内的其他阻塞。原始 REQUEST_CHANGES 报告及原始失败 fixture 保持不变。

实际审查者 `/root/s5_quality_review/s7_binding_contract` 未编写该修复；作者为 `/root/s5_quality_review`。基线 `e04a866ff68ac79fa91c9004c389d8c9e713e8d3`，当前源码目录 `/Volumes/Starship/MAIS-g07-wt`。`snapshotHash` 的算法是 sorted path＋NUL＋SHA256＋LF UTF-8 记录的 SHA256。

## 修复依据

所有 helper Git 读取共用 `readGit`，在其 child environment 中显式用 `node:os.devNull` 覆盖 `GIT_GRAFT_FILE`，并继续使用 `--no-replace-objects`。因此不是只核对 range 内的 parent：对象解析、evidence ancestry、range cutoff、boundary ancestry、完整 raw UTF-8 audit、parent graph、tree/diff 和最终 HEAD 读取都使用同一无 graft 视图。

独立字节比对确认，去掉 devNull import 与这几行 env/comment，helper 即恢复前一版 SHA `fea4184d…`；其余行为未改。测试只有追加七个真实 Git 用例。另三份冻结路径及 17 份保护路径均未变，初末 22 个哈希一致。原 atomic direct-evidence、exact blob、Receipt strict-descendant 与 merge 非缺席父 tuple 相等合同没有放宽。

workflow 原本的第一遍 raw audit 保持原文；它不作为 authority 依据。helper 随后用无 graft 环境重新执行完整 bounded fatal UTF-8 audit，再进行 ancestry／graph／tree 判断。

## 本次真实验证

| 检查 | 结果 |
| --- | --- |
| 旧 workflow 入口独立重跑 | **34/34，通过，0 skip** |
| 新增七个 graft 用例，包含在上述 34 项中 | default／env／linked-common 三父篡改；default／env evidence-boundary；default／env harmless 对照全部通过 |
| 原始失败 fixture 三种环境复核 | default、显式 override、不存在 override 均报 `AUTHORITY_MERGE_CHANGE` |
| 原 fixture graft 哈希 | 前后相同，未修改 |
| main7f／PR167 b583 固定对象复核 | 31／34 commits、11／13 merges；仍是 286ac 的两 A 和 ae63 的一 Receipt A，等于首次独立结果 |
| 作者完整 public 命令 | 106/106，日志 hash 已核对；不冒充本审查者重复执行 |

本次日志、实际脚本和收据在 `/private/tmp/mais-history-review/recheck`。相邻 JSON 记录完整 path/hash、原 fixture 三个真实父提交、命令与逐例结果。

## 范围

可以将此精确 snapshot 交 Root 进行代码提交，再以实际 commit SHA 做 A11 publication 和 currentness 绑定。本报告不构成完整 native collector、Shadow、canonical execution、Receipt／Closure、最终 attestation／index、CI、build、release 或 cleanup 批准。本轮没有改源码、当前仓库 Git/config 或原 fixture graft，也没有访问网络、provider 或真实 secret。
