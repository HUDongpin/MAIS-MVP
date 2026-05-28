# Hong Kong Traditional Chinese Word Audit

- Generated: 2026-05-13T06:46:22.657Z
- Mode: report-only baseline
- Scanned files: 165
- Chinese text occurrences: 2926
- Glossary entries: 53
- Documented exceptions: 19

## Gate Summary

| Status | Count |
| --- | ---: |
| Tracked glossary match | 1727 |
| Documented exception | 15 |
| Untracked baseline item | 1179 |
| Issue: simplified/rejected | 5 |

Current `npm run check:hk-zh` runs this audit in report-only mode so S09 can build the first approved baseline without blocking all existing copy. To enforce the gate, run:

```bash
node scripts/audit-hk-chinese.mjs --mode=strict
```

Strict mode fails on any untracked Chinese text, likely Simplified Chinese character, or rejected Hong Kong terminology variant.

## Standards

- edbMathGlossary2020: [教育局《數學科常用英漢辭彙》2020年7月8日版](https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/ma/res/Glossary20200708.pdf)
- edbMathGlossaryNotes: [教育局數學科英漢辭彙使用說明](https://www.edb.gov.hk/tc/curriculum-development/kla/ma/res/glossary-notes.html)
- edbPrimaryLexicalList: [教育局香港小學學習字詞表](https://www.edbchinese.hk/lexlist_ch/)
- edbChineseCoreWords: [教育局中英對照香港學校中文學習基礎字詞](https://www.edbchinese.hk/lexlist_en/)
- maisProductDecision: [MAIS 既有產品語氣與 coordination/decisions 記錄](coordination/decisions/)

## Blocking Issues

| Location | Source | Text | Issue |
| --- | --- | --- | --- |
| components/dashboard/LearningAnalyticsReport.tsx:593 | object-property:fastPace | 作答速度快，提交前可加入一次檢查。 | Use「速率」instead of「速度」 |
| data/lessons.ts:878 | zh-property | 比較單價、速度和其他率的情境。 | Use「速率」instead of「速度」 |
| data/lessons.ts:2079 | template-static-text | 若一部分佔 ${} 分，應用 ${} 分鐘完成，速度是每分 ${} 分鐘。${} 分題約需 ${} 分鐘。 | Use「速率」instead of「速度」 |
| data/questions.ts:1837 | template-static-text | 百分比 | Use「百分數」instead of「百分比」 |
| data/topics.ts:188 | zh-property | 比較單價、速度和其他率的情境。 | Use「速率」instead of「速度」 |


## Untracked Baseline For S09 Review

| Count | First Location | Text | Status / Issue |
| ---: | --- | --- | --- |
| 7 | components/teacher/TeacherDashboardView.tsx:222 | 作業 | untracked |
| 5 | components/parent/ParentViews.tsx:65 | 平均掌握 | untracked |
| 5 | data/questions.ts:475 | 計算 ${}。 | untracked |
| 5 | components/learning/LearningRoadmap.tsx:529 | 重點 | untracked |
| 5 | data/questions.ts:172 | 統計 | untracked |
| 5 | components/learning/LearningRoadmap.tsx:492 | 路線 | untracked |
| 5 | app/classroom/join/page.tsx:45 | 邀請碼 | untracked |
| 4 | data/questions.ts:1423 | 化簡 ${}。 | untracked |
| 4 | lib/i18n.ts:497 | 至 | untracked |
| 4 | components/dashboard/StudentRewardsPanel.tsx:23 | 等待批核 | untracked |
| 4 | components/teacher/TeacherDashboardView.tsx:226 | 進行中 | untracked |
| 4 | components/teacher/TeacherManagementViews.tsx:669 | 類型 | untracked |
| 4 | components/visualizations/CoordinatePlaneDemo.tsx:506 | 變換 | untracked |
| 3 | app/practice/page.tsx:669 | 已完成 | untracked |
| 3 | components/dashboard/StudentRewardsPanel.tsx:24 | 已批核 | untracked |
| 3 | components/dashboard/StudentRewardsPanel.tsx:26 | 已派發 | untracked |
| 3 | components/learning/SubwayNetworkMap.tsx:247 | 支 | untracked |
| 3 | app/assessment/[assessmentId]/page.tsx:150 | 正確 | untracked |
| 3 | components/visualizations/FunctionModelComparer.tsx:21 | 多項式 | untracked |
| 3 | components/teacher/TeacherManagementViews.tsx:140 | 年級 | untracked |
| 3 | components/teacher/TeacherAnalyticsView.tsx:40 | 低活躍 | untracked |
| 3 | components/teacher/TeacherManagementViews.tsx:506 | 完成率 | untracked |
| 3 | data/lessons.ts:60 | 例題 | untracked |
| 3 | components/dashboard/DashboardGradeSelectorGrid.tsx:72 | 固定年級 | untracked |
| 3 | components/parent/ParentShell.tsx:106 | 尚未綁定孩子 | untracked |
| 3 | components/teacher/TeacherManagementViews.tsx:512 | 狀態 | untracked |
| 3 | data/questions.ts:102 | 若 ${}，${} 是多少？ | untracked |
| 3 | data/questions.ts:1543 | 若 ${}，求 ${}。 | untracked |
| 3 | components/learning/LearningRoadmap.tsx:483 | 核心概念 | untracked |
| 3 | data/visualizationLabs.ts:216 | 基礎 | untracked |
| 3 | components/learning/LearningRoadmap.tsx:483 | 視覺模型 | untracked |
| 3 | data/questions.ts:46 | 第二象限 | untracked |
| 3 | components/visualizations/GeometryExplorer.tsx:501 | 單位 | untracked |
| 3 | components/parent/ParentViews.tsx:172 | 掌握 | untracked |
| 3 | components/teacher/TeacherManagementViews.tsx:512 | 提交 | untracked |
| 3 | app/messages/page.tsx:137 | 發送回覆 | untracked |
| 3 | data/questions.ts:487 | 圓形 | untracked |
| 3 | components/parent/ParentShell.tsx:17 | 綁定孩子 | untracked |
| 3 | components/teacher/TeacherManagementViews.tsx:448 | 標題 | untracked |
| 3 | components/teacher/TeacherResourceAssessmentViews.tsx:145 | 難度 | untracked |
| 2 | components/dashboard/LearningAnalyticsReport.tsx:324 | 1 至 3 分鐘 | untracked |
| 2 | data/questions.ts:518 | 一扇課室門 | untracked |
| 2 | components/dashboard/StudentRewardsPanel.tsx:25 | 已拒絕 | untracked |
| 2 | components/teacher/TeacherLiveView.tsx:101 | 已提交 | untracked |
| 2 | components/teacher/TeacherResourceAssessmentViews.tsx:254 | 已提交試卷 | untracked |
| 2 | components/dashboard/StudentRewardsPanel.tsx:197 | 已預留 | untracked |
| 2 | components/dashboard/StudentRewardsPanel.tsx:196 | 已賺取 | untracked |
| 2 | components/teacher/TeacherResourceAssessmentViews.tsx:140 | 不指定 | untracked |
| 2 | data/questions.ts:687 | 公升 | untracked |
| 2 | data/questions.ts:688 | 公斤 | untracked |
| 2 | data/questions.ts:686 | 公里 | untracked |
| 2 | components/dashboard/LearningAnalyticsReport.tsx:322 | 少於 1 分鐘 | untracked |
| 2 | components/learning/LearningRoadmap.tsx:545 | 支線${}- | untracked |
| 2 | lib/i18n.ts:527 | 日 | untracked |
| 2 | app/messages/page.tsx:156 | 主題 | untracked |
| 2 | data/questions.ts:110 | 代入 ${}：${}。 | untracked |
| 2 | app/classroom/join/page.tsx:49 | 加入 | untracked |
| 2 | components/teacher/TeacherLiveView.tsx:141 | 加入碼 | untracked |
| 2 | components/teacher/TeacherResourceAssessmentViews.tsx:254 | 平均分 | untracked |
| 2 | components/teacher/TeacherFoundationViews.tsx:9 | 未設定 | untracked |
| 2 | components/teacher/TeacherResourceAssessmentViews.tsx:112 | 本週 | untracked |
| 2 | components/teacher/TeacherDashboardView.tsx:185 | 本週加分 | untracked |
| 2 | data/questions.ts:489 | 正方形 | untracked |
| 2 | components/teacher/TeacherLiveView.tsx:109 | 正確率 | untracked |
| 2 | components/visualizations/GeometryExplorer.tsx:150 | 列 | untracked |
| 2 | data/questions.ts:1165 | 向下 | untracked |
| 2 | components/teacher/TeacherDashboardView.tsx:37 | 回覆 | untracked |
| 2 | components/teacher/TeacherManagementViews.tsx:578 | 收件匣 | untracked |
| 2 | components/teacher/TeacherAnalyticsView.tsx:280 | 次錯誤 | untracked |
| 2 | components/visualizations/GeometryExplorer.tsx:149 | 行 | untracked |
| 2 | components/teacher/TeacherManagementViews.tsx:77 | 行政安排 | untracked |
| 2 | components/teacher/TeacherAnalyticsView.tsx:38 | 低掌握 | untracked |
| 2 | components/teacher/TeacherLiveView.tsx:113 | 判斷 | untracked |
| 2 | components/teacher/TeacherAnalyticsView.tsx:76 | 均時 | untracked |
| 2 | components/teacher/TeacherLiveView.tsx:255 | 快速投票 | untracked |
| 2 | components/dashboard/LearningAnalyticsReport.tsx:321 | 快速檢查 | untracked |
| 2 | app/practice/page.tsx:628 | 我的作業 | untracked |
| 2 | components/teacher/TeacherDashboardView.tsx:36 | 批改 | untracked |
| 2 | app/progress/page.tsx:30 | 技能範圍 | untracked |
| 2 | app/progress/page.tsx:27 | 每週學習活動 | untracked |

Showing 80 of 979 grouped entries.

## Documented Exceptions

| Count | First Location | Text | Status / Issue |
| ---: | --- | --- | --- |
| 2 | components/teacher/TeacherAnalyticsView.tsx:41 | AI 求助偏高 | exception |
| 1 | components/learning/SubwayNetworkMap.tsx:998 | 九龍 | exception |
| 1 | components/ui/LanguageToggle.tsx:10 | 使用简体中文 | exception |
| 1 | components/layout/Footer.tsx:82 | 胡 | exception |
| 1 | components/learning/SubwayNetworkMap.tsx:999 | 香港島 | exception |
| 1 | components/teacher/TeacherManagementViews.tsx:336 | 最近 AI 訊息 | exception |
| 1 | components/teacher/TeacherAnalyticsView.tsx:208 | 提示 / AI 使用 | exception |
| 1 | components/learning/SubwayNetworkMap.tsx:997 | 新界 | exception |
| 1 | components/ui/LanguageToggle.tsx:10 | 简 | exception |
| 1 | components/teacher/TeacherManagementViews.tsx:275 | AI 7日 | exception |
| 1 | components/dashboard/StudentProfilePanel.tsx:20 | Delta 漸層 | exception |
| 1 | components/dashboard/StudentProfilePanel.tsx:26 | Pi 專注 | exception |
| 1 | components/dashboard/StudentProfilePanel.tsx:32 | Sigma 掌握 | exception |
| 1 | components/dashboard/StudentProfilePanel.tsx:38 | Theta 探索 | exception |


## Glossary Domain Match Summary

- math: 1479
- ui: 537
- assessment: 342
- curriculum: 180
- role: 165
- accessibility: 49
- brand: 3
