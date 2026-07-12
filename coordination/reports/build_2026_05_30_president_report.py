from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-05-30-president-report.docx"
HKT = timezone(timedelta(hours=8))
NOW_HKT = datetime.now(HKT).strftime("%Y-%m-%d %H:%M HKT")
NOW_UTC = datetime.now(timezone.utc).isoformat()


def xml_text(text: str) -> str:
    parts = str(text).split("\n")
    output: list[str] = []
    for index, part in enumerate(parts):
        if index:
            output.append("<w:br/>")
        output.append(f'<w:t xml:space="preserve">{escape(part)}</w:t>')
    return "".join(output)


def run(text: str, *, bold: bool = False, color: str | None = None, size: int | None = None) -> str:
    props = ['<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/>']
    if bold:
        props.append("<w:b/>")
    if color:
        props.append(f'<w:color w:val="{color}"/>')
    if size:
        props.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
    return f"<w:r><w:rPr>{''.join(props)}</w:rPr>{xml_text(text)}</w:r>"


def para(text: str, style: str = "Normal", *, align: str | None = None) -> str:
    ppr = [f'<w:pStyle w:val="{style}"/>']
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    return f"<w:p><w:pPr>{''.join(ppr)}</w:pPr>{run(text)}</w:p>"


def heading(text: str, level: int = 1) -> str:
    return para(text, f"Heading{level}")


def cell(text: str, width: int, *, header: bool = False) -> str:
    fill = '<w:shd w:fill="F2F4F7"/>' if header else ""
    text_color = "0B2545" if header else "000000"
    text_size = 19 if header else 18
    align = '<w:jc w:val="center"/>' if header else ""
    cell_para = (
        '<w:p><w:pPr><w:pStyle w:val="TableText"/>'
        + align
        + "</w:pPr>"
        + run(text, bold=header, color=text_color, size=text_size)
        + "</w:p>"
    )
    margins = (
        '<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/>'
        '<w:start w:w="120" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar>'
    )
    return (
        "<w:tc><w:tcPr>"
        f'<w:tcW w:w="{width}" w:type="dxa"/>'
        f"{margins}{fill}</w:tcPr>{cell_para}</w:tc>"
    )


def table(rows: list[list[str]], widths: list[int]) -> str:
    grid = "<w:tblGrid>" + "".join(f'<w:gridCol w:w="{width}"/>' for width in widths) + "</w:tblGrid>"
    props = (
        "<w:tblPr>"
        '<w:tblW w:w="9360" w:type="dxa"/>'
        '<w:tblInd w:w="120" w:type="dxa"/>'
        '<w:tblLayout w:type="fixed"/>'
        '<w:tblBorders>'
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="DADCE0"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="DADCE0"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="DADCE0"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="DADCE0"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="DADCE0"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="DADCE0"/>'
        "</w:tblBorders>"
        "</w:tblPr>"
    )
    body_rows: list[str] = []
    for row_index, row in enumerate(rows):
        row_props = "<w:trPr><w:tblHeader/></w:trPr>" if row_index == 0 else ""
        body_rows.append(
            "<w:tr>"
            + row_props
            + "".join(cell(value, widths[column_index], header=(row_index == 0)) for column_index, value in enumerate(row))
            + "</w:tr>"
        )
    return "<w:tbl>" + props + grid + "".join(body_rows) + "</w:tbl>"


metadata_rows = [
    ["项目", "MAIS-MVP"],
    ["收件人", "Dr. Peter Hu"],
    ["报告日期", "2026-05-30"],
    ["报告窗口", "2026-05-29 08:00 至 2026-05-30 08:00 Asia/Hong_Kong"],
    ["报告会话", "S10 / Automation mais-mvp-9-am-president-report"],
    ["生成时间", NOW_HKT],
    ["证据范围", "AGENTS.md、automation memory status、session logs、blockers、decisions、mtime scan、git status/log、fresh type-check/build"],
]

session_rows = [
    ["Session", "状态", "本窗口活动", "关注点 / 下一步"],
    ["S01", "No fresh log", "无 2026-05-29 08:00 后 fresh handoff。", "沿用上一份报告：Home 相关工作已完成；后续只需 release regression。"],
    ["S02", "No fresh log", "无 fresh dashboard/progress log。", "Adaptive Learning UI 大改属于上一窗口 carryover；S11 回归时覆盖。"],
    ["S03", "No fresh log", "无 fresh roadmap log。", "Roadmap preview 仍等待 owner 是否实施的决定。"],
    ["S04", "No fresh log", "无 fresh practice log。", "Practice/Adventure/Fishing 仍是高变更区域；需要 owner/S11 审查。"],
    ["S05", "No fresh log", "无 fresh lesson log。", "Lesson Galaxy 与答案隐藏为上一窗口 carryover；需回归 Lesson 路线。"],
    ["S06", "No fresh log", "无 fresh visualization log。", "Visualization Lab 需纳入下一轮桌面/移动回归。"],
    ["S07", "No fresh log", "无 fresh AI Tutor log。", "Live provider/key 风险沿用上一报告；需要 S19 管控凭据。"],
    ["S08", "No fresh log", "无 fresh shared-state/analytics log。", "HK EASE shared metadata 仍是 carryover in-progress 项。"],
    ["S09", "No fresh log", "无 fresh copy/i18n log。", "下一轮回归应覆盖 en、zh、zh-Hans。"],
    ["S10", "Completed / report-only", "2026-05-29 08:11 生成上一份 president report；2026-05-30 automation 生成本报告并跑 fresh type-check/build。", "未改 feature code；只写 coordination/reporting artifact 和 automation memory。"],
    ["S11", "No fresh log", "无 fresh QA/release log。", "仍建议由 S11 建立 release-readiness regression matrix。"],
    ["S12", "No fresh log", "无 fresh backend/API log。", "当前 build 通过；API regression 仍需按 release 计划覆盖。"],
    ["S13", "No fresh log", "无 fresh teacher-console log。", "Teacher Console carryover 改动需在回归中复测。"],
    ["S14", "No fresh log", "无 fresh parent-console log。", "无 parent-console fresh activity。"],
    ["S15", "No fresh log", "无 fresh adaptive-engine log。", "Adaptive behavior若被后续 UI 调整触及，需要 S15 review。"],
    ["S16", "No fresh log", "无 fresh research log。", "无 research-only fresh activity。"],
    ["S17", "No fresh log", "无 fresh gamification log。", "Fishing/Adventure 若扩展奖励经济，需要 S17 协调。"],
    ["S18", "No fresh log", "无 fresh content-QA log。", "BNU high、BNU junior lesson、EASE full QA 阻塞项仍未解除。"],
    ["S19", "No fresh log", "无 fresh API/env log。", "Credential rotation 和 live-provider hygiene 仍建议由 S19 承接。"],
    ["S20", "No fresh log", "无 fresh game-based-learning log。", "Game route 需在 S11/S20 回归中覆盖。"],
]

completed_rows = [
    ["领域", "本窗口完成内容", "影响"],
    ["Reporting", "S10 在 2026-05-29 08:11 生成 `coordination/reports/2026-05-29-president-report.docx`，并写入 `2026-05-29-S10.md`。", "上一窗口的大量 session activity 已被正式归档。"],
    ["Fresh health check", "本次 2026-05-30 automation 重新执行 `npm run type-check` 和 `npm run build`，均通过。", "说明昨日 08:00 后没有 source mtime 变更导致当前构建退化。"],
    ["Evidence scan", "mtime scan 仅发现上一份 S10 report artifacts 和 `.local/hk-math-db.sqlite*` runtime files；无 fresh blocker 或 decision record。", "支持“本窗口无新功能交付”的结论。"],
]

in_progress_rows = [
    ["对象", "当前状态", "下一步"],
    ["Fresh assigned work", "No assigned work in this reporting window。", "今天可从 release-control 和 carryover blocker 入手。"],
    ["S08 HK EASE shared metadata", "上一报告记录为 in-progress；本窗口无 fresh update。", "S08 完成实现/handoff 后跑 RAG 与 type checks。"],
    ["S18 EASE full DeepSeek QA", "上一报告记录 pilot 通过但 full 9,339-row QA 未完成；本窗口无 fresh update。", "用前台或批准的 runner 继续，先控成本/速率。"],
    ["BNU junior lesson/textbook QA", "仍依赖缺失的 `mainland-bnu-junior-lessons-v1/lessons.json`。", "S05/S18 或 owner 提供 lesson package。"],
    ["BNU high candidate remediation", "上一报告记录 405 fail/blocker/major rows，未批准上线。", "S18 修复/重跑 deterministic + DeepSeek QA。"],
]

blocker_rows = [
    ["Blocker", "Evidence", "Required action"],
    ["No new blocker record", "本窗口 `coordination/blockers/` 与 `coordination/decisions/` 无 fresh mtime files。", "继续跟踪上一报告列出的 carryover blockers。"],
    ["BNU junior lesson package missing", "Carryover blocker: `coordination/blockers/2026-05-28-S18-bnu-junior-lessons-missing.md`。", "提供或生成 `lessons.json` 后再跑 lesson/textbook QA。"],
    ["BNU high candidate bank not approved", "Carryover: DeepSeek QA 有 405 fail/blocker/major remediation rows。", "继续保持 candidate-only，不进入产品。"],
    ["EASE full QA incomplete", "Carryover: pilot 100 passed, full batch incomplete。", "批准受控 provider run 后继续。"],
    ["Deployment package size risk", "Carryover: `public/` static assets 仍可能使 Vercel Hobby 上传过大。", "压缩/迁移 lesson illustration assets 或调整部署方案。"],
]

risk_rows = [
    ["Risk", "Why it matters", "Mitigation"],
    ["Large dirty working tree", "`git status --short` 仍显示多域 app/components/data/coordination/public/test 变更。", "按 S01-S20 ownership 分批 handoff/commit，再由 S11 做 release gate。"],
    ["No fresh feature logs", "本窗口缺少除 S10 report 之外的 session evidence。", "避免把上一窗口交付误报为今天交付；只作为 latest status/carryover。"],
    ["Local runtime DB files changed", "`.local/hk-math-db.sqlite*` 在 2026-05-29 08:25-08:28 更新，属于本地 runtime artifact。", "不要纳入 Git；如需调查，由 S12/S10 确认生成路径。"],
    ["UI regression breadth", "Practice/Lesson/Adaptive/Visualization/Teacher 改动来自上一窗口且范围大。", "S11 运行桌面/移动、EN/zh/zh-Hans 的 focused regression matrix。"],
    ["Content QA gates", "BNU high、BNU junior lesson、EASE full QA 均未解除。", "S18 先完成 QA 证据，再授权任何 source-data promotion。"],
]

test_rows = [
    ["Check", "Result", "Notes"],
    ["Fresh `npm run type-check`", "Pass", "2026-05-30 08:xx HKT 执行，TypeScript strict check 通过。"],
    ["Fresh `npm run build`", "Pass", "Next.js 15.5.15 production build 通过，生成 88 static pages，路由收集成功。"],
    ["Available window `npm run test:question-bank`", "Pass 66/66", "记录于 `coordination/session-logs/2026-05-29-S10.md`，属于本 reporting window early evidence。"],
    ["Available window `npm run test:rag`", "Pass 225/225", "记录于 `coordination/session-logs/2026-05-29-S10.md`。"],
    ["Broad Playwright E2E", "Not run", "本窗口无 fresh feature code；建议 S11 后续统一跑 release matrix。"],
    ["DOCX render-to-PNG visual QA", "Not run", "本机未找到 `soffice`/LibreOffice；本报告改用 zip、OOXML/text extraction 验证。"],
]

changed_rows = [
    ["Changed file / artifact", "mtime in reporting window", "Notes"],
    ["coordination/reports/2026-05-29-president-report.docx", "2026-05-29 08:11 HKT", "上一份 president report deliverable。"],
    ["coordination/reports/build_2026_05_29_president_report.py", "2026-05-29 08:11 HKT", "上一份 report builder。"],
    ["coordination/session-logs/2026-05-29-S10.md", "2026-05-29 08:12 HKT", "上一份 S10 handoff log。"],
    [".local/hk-math-db.sqlite*", "2026-05-29 08:25-08:28 HKT", "本地 SQLite runtime files；不属于 source/report deliverable。"],
]

priority_rows = [
    ["#", "明日优先级"],
    ["1", "Authorize S11 to run a focused release regression matrix across Home, Login/Register, Lesson, Practice, Adaptive Learning, Visualization Lab, Teacher Console, and AI Tutor。"],
    ["2", "Ask active owner sessions to hand off or commit their large carryover diffs by ownership scope before public release review。"],
    ["3", "Continue S18 EASE full DeepSeek QA with a controlled foreground/approved runner and cost/rate limits。"],
    ["4", "Provide or authorize the BNU junior lesson `lessons.json` package so lesson/textbook QA can proceed。"],
    ["5", "Keep BNU high candidate bank out of product until the 405 remediation rows are fixed and re-tested。"],
    ["6", "Measure deployment archive size and reduce or externalize static lesson illustration assets if Vercel Hobby remains over limit。"],
]

decision_rows = [
    ["Decision", "Owner action needed"],
    ["Release regression", "Approve S11 to spend the next work block on the release-readiness matrix。"],
    ["BNU junior lessons", "Decide whether S05/S18 should generate the missing `lessons.json` or wait for owner-provided source。"],
    ["EASE provider budget", "Approve budget/rate-limit policy for completing 9,339-row live DeepSeek QA。"],
    ["BNU high remediation", "Confirm S18 should prioritize fixing the 405 high-school candidate QA issues before new content generation。"],
    ["Deployment packaging", "Choose Vercel Hobby asset slimming versus Pro/object-storage/CDN path。"],
    ["Credential hygiene", "Have S19 rotate/verify any provider key exposed in chat and manage future env placement。"],
]


def build_document_xml() -> str:
    parts: list[str] = []
    parts.append(para("MAIS-MVP 每日总裁报告", "Title", align="center"))
    parts.append(para("Daily President Report for Dr. Peter Hu", "Subtitle", align="center"))
    parts.append(table(metadata_rows, [1800, 7560]))

    parts.append(heading("Chinese Executive Summary", 1))
    parts.append(para("No assigned work in this reporting window. 本窗口从 2026-05-29 08:00 到 2026-05-30 08:00 HKT，除上一份 S10 president report artifact、S10 handoff log 和本地 SQLite runtime files 外，未发现 fresh assigned feature work、fresh blocker record 或 fresh decision record。"))
    parts.append(para("当前项目健康度没有退化：本次 automation 重新执行 `npm run type-check` 与 `npm run build` 均通过；上一份 S10 log 中记录的 question-bank 66/66、RAG 225/225 和 production build 也仍是本窗口内可用证据。主要工作重点应转向 release control：清理/提交大型 carryover diff、S11 回归矩阵、S18 内容 QA blockers 和部署包体积。"))

    parts.append(heading("English Executive Summary", 1))
    parts.append(para("No assigned work in this reporting window. The only current-window changes were the previous S10 president-report artifacts, one S10 handoff log, and local SQLite runtime files; no new feature-session handoff, blocker, or decision record appeared after 2026-05-29 08:00 HKT."))
    parts.append(para("Current health is stable: fresh `npm run type-check` and `npm run build` both passed for this report. The main focus should now be release control: ownership-based handoffs or commits for the large carryover working tree, S11 regression coverage, S18 content-QA blockers, and deployment-size planning."))

    parts.append(heading("报告窗口摘要", 1))
    parts.append(para("报告窗口：2026-05-29 08:00 至 2026-05-30 08:00 Asia/Hong_Kong。读取范围包括 AGENTS.md、automation memory 状态、coordination/session-logs、coordination/blockers、coordination/decisions、mtime changed-file scan、git status/log、package scripts，以及本次 fresh checks。"))
    parts.append(para("结论：No assigned work in this reporting window。S01-S09、S11-S20 无 fresh log；S10 只有 report-only activity。`git log` 在窗口内无 commit；`git status --short` 仍显示上一窗口遗留的大量未提交变更。"))

    parts.append(heading("整体项目进展", 1))
    parts.append(para("本窗口没有新的产品功能交付。最新可用项目状态仍沿用 2026-05-29 president report：学生端 Home/Practice/Lesson/Adaptive/Visualization、Teacher Console、AI Tutor、BNUP 内容上线和部署准备在上一窗口有大量推进；当前的 fresh type-check/build 说明这些 carryover changes 至少仍可编译和生产构建。"))
    parts.append(para("下一阶段应以“可控发布”为目标，而不是继续扩大功能面：先建立 S11 regression matrix，再由各 owner session 对其 scope 内的大 diff 进行 handoff/commit/review。内容侧继续保持 BNU high candidate-only、BNU junior lesson QA blocked、EASE full QA pending 的 gating 状态。"))

    parts.append(heading("S01-S20 会话状态表", 1))
    parts.append(table(session_rows, [850, 1350, 4200, 2960]))

    parts.append(heading("已完成工作", 1))
    parts.append(table(completed_rows, [1900, 5060, 2400]))

    parts.append(heading("进行中工作", 1))
    parts.append(table(in_progress_rows, [2200, 4260, 2900]))

    parts.append(heading("Blockers", 1))
    parts.append(table(blocker_rows, [2300, 4360, 2700]))

    parts.append(heading("风险", 1))
    parts.append(table(risk_rows, [1900, 4160, 3300]))

    parts.append(heading("测试 / 构建状态", 1))
    parts.append(table(test_rows, [2800, 1600, 4960]))

    parts.append(heading("变更文件", 1))
    parts.append(table(changed_rows, [3600, 1900, 3860]))

    parts.append(heading("明日优先级", 1))
    parts.append(table(priority_rows, [700, 8660]))

    parts.append(heading("需要 Owner 决策", 1))
    parts.append(table(decision_rows, [2500, 6860]))

    parts.append(heading("验证说明", 1))
    parts.append(para("本 DOCX 使用 standard_business_brief preset：US Letter、1 inch margins、Calibri / Microsoft YaHei、fixed DXA tables、simple business formatting。由于本机未安装 `soffice`/LibreOffice，无法执行 render_docx PNG visual QA；已执行 zip、OOXML/text extraction、textutil extraction 验证。"))

    body = "".join(parts)
    section = (
        "<w:sectPr>"
        '<w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>'
        "</w:sectPr>"
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
        'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
        'xmlns:o="urn:schemas-microsoft-com:office:office" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
        'xmlns:v="urn:schemas-microsoft-com:vml" '
        'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:w10="urn:schemas-microsoft-com:office:word" '
        'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
        'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
        'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
        'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" '
        'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
        'mc:Ignorable="w14 wp14"><w:body>'
        + body
        + section
        + "</w:body></w:document>"
    )


STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="160" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="0B2545"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="200" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:color w:val="555555"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="2E74B5"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="2E74B5"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
</w:styles>
'''

CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
'''

RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
'''

DOCUMENT_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>
'''

SETTINGS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
</w:settings>
'''

CORE = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>MAIS-MVP 2026-05-30 President Report</dc:title>
  <dc:subject>Daily bilingual president report</dc:subject>
  <dc:creator>S10 Codex automation</dc:creator>
  <cp:lastModifiedBy>S10 Codex automation</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{NOW_UTC}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{NOW_UTC}</dcterms:modified>
</cp:coreProperties>
'''

APP = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex OOXML Builder</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>MAIS</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>
'''


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUT, "w", compression=ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES)
        zf.writestr("_rels/.rels", RELS)
        zf.writestr("docProps/core.xml", CORE)
        zf.writestr("docProps/app.xml", APP)
        zf.writestr("word/_rels/document.xml.rels", DOCUMENT_RELS)
        zf.writestr("word/document.xml", build_document_xml())
        zf.writestr("word/styles.xml", STYLES)
        zf.writestr("word/settings.xml", SETTINGS)
    print(OUT)


if __name__ == "__main__":
    main()
