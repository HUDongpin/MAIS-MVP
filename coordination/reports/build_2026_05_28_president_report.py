from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-05-28-president-report.docx"
HKT = timezone(timedelta(hours=8))
GENERATED_AT = datetime.now(HKT).strftime("%Y-%m-%d %H:%M HKT")


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
    cell_para = (
        '<w:p><w:pPr><w:pStyle w:val="TableText"/>'
        + ('<w:jc w:val="center"/>' if header else "")
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
    ["报告日期", "2026-05-28"],
    ["报告窗口", "2026-05-27 08:00 至 2026-05-28 08:00 Asia/Hong_Kong"],
    ["报告会话", "S10 / Automation mais-mvp-9-am-president-report"],
    ["生成时间", GENERATED_AT],
    ["证据范围", "AGENTS.md、automation memory、session logs、blockers、decision record、content-QA artifacts、mtime changed-file scan、fresh deterministic checks"],
]

session_rows = [
    ["Session", "状态", "窗口内结果", "检查 / 风险"],
    ["S01", "Completed", "修复 Home mobile PedaNova/TRUST-MAIS card glow bleed；hero inner panel 改为 opaque gradient，移动端无横向 overflow。", "type-check pass；mobile browser verification pass。"],
    ["S02", "No fresh log", "Dashboard/progress 无本窗口 fresh handoff。", "无新增检查。"],
    ["S03", "Completed", "Primary/secondary roadmap map labels 改为 P1-P6 / S1-S6 compact codes，避免中文长标签。", "type-check pass；primary/secondary roadmap browser checks pass。"],
    ["S04", "Completed + in progress", "完成 BNUP primary v1 public Lesson/Practice integration；07:59 前启动 BNUP primary v2 alongside-v1 3000-row integration，窗口截止时仍 in progress。", "v1 checks pass；fresh question-bank after cutoff fails one count assertion while v2 integration is active。"],
    ["S05", "High activity / completed", "PEP high/junior/primary and HJB primary/junior/high lesson illustrations were generated, approved, promoted, cataloged, and rendered for Lesson pages; review-only packages were created where needed。", "Multiple type-check/build/focused Playwright checks reported pass；HJB high had earlier unrelated compile caveat, but fresh type-check now passes。"],
    ["S06", "No fresh log", "Visualization lead 无本窗口 fresh handoff。", "无新增检查。"],
    ["S07", "In progress at cutoff", "AI Tutor language matching and authenticated-session awareness fixes were started around cutoff; no completed handoff before 08:00。", "Post-cutoff source mtime observed in AI Tutor provider; treat as active work, not closed-window completion。"],
    ["S08", "No fresh log", "State/analytics lead 无本窗口 fresh handoff；S04 v2 touches tests/solvability logic after cutoff and needs coordination。", "无独立检查。"],
    ["S09", "No fresh log", "Copy/i18n/accessibility lead 无本窗口 fresh handoff。", "无新增检查。"],
    ["S10", "Completed", "Built Mainland PEP junior question Image2 pipeline tooling; generated this 2026-05-28 president report and ran fresh gates。", "type-check pass；test:rag pass 225/225；test:question-bank fail 58/59；build fail after compile page-data collection。"],
    ["S11", "No fresh log", "QA/release quality 无本窗口 fresh handoff；release matrix should absorb S05/S12/S18 evidence。", "无新增检查。"],
    ["S12", "Completed", "Fixed login/register next redirect and Lesson direct/public fallback for PEP P4 registered learner flow。", "type-check pass；build pass；targeted production-browser verification pass。"],
    ["S13", "No fresh log", "Teacher console 无本窗口 fresh handoff。", "S07/S10/S18 pipelines may later need teacher UI integration。"],
    ["S14", "No fresh log", "Parent console 无本窗口 fresh handoff。", "无新增检查。"],
    ["S15", "No fresh log", "Adaptive engine 无本窗口 fresh handoff。", "无新增检查。"],
    ["S16", "No fresh log", "Research/learning science 无本窗口 fresh handoff。", "无新增检查。"],
    ["S17", "No fresh log", "Gamification/reward economy 无本窗口 fresh handoff。", "无新增检查。"],
    ["S18", "High activity / mixed gates", "Closed BNU primary v2 QA and approved it for public integration; generated BNU high/junior candidate packages and DeepSeek QA; produced multiple question-illustration audits and built-in image candidate batches。", "BNU primary v2 green；BNU high blocked by 270 remediation rows；BNU junior blocked by 153 remediation rows；credential rotation recommended。"],
    ["S19", "No fresh log", "API/deployment env lead 无本窗口 fresh handoff。", "Needed for provider key rotation and future Image2 credential placement。"],
    ["S20", "No fresh log", "Game-based learning 无本窗口 fresh handoff。", "无新增检查。"],
]

completed_rows = [
    ["领域", "完成内容", "影响"],
    ["Home/Roadmap UX", "S01 fixed mobile hero-card visual bleed; S03 compacted roadmap grade labels to P1-S6 style codes。", "Improves mobile polish and bilingual map scanability without broad behavior changes。"],
    ["Auth/Lesson routing", "S12 fixed registered learner login redirect/session navigation and direct Lesson fallback for PEP P4 slugs。", "Addresses reported mais.hk path where signed-in user stayed on login or saw Lesson not found。"],
    ["Lesson illustrations", "S05 promoted approved PEP high/junior/primary plus HJB primary/junior/high lesson illustrations, added typed catalogs, and verified focused rendering。", "Mainland PEP and HJB Lesson pages now have approved visual support for concept/worked-example blocks。"],
    ["BNUP primary v1", "S04 completed public BNUP primary v1 integration for Lesson and Practice with 1,500 approved questions and BNU S1-S6 held unavailable。", "BNUP primary is usable publicly while junior/senior remain gated。"],
    ["BNUP primary v2 approval", "S18 closed BNU primary v2 QA: deterministic audit green, DeepSeek broad QA green, hard gate green, 300-row manual sample approved; public integration approval recorded at 07:59:59。", "Clears content-governance basis for S04 v2 integration, which was still active at cutoff。"],
    ["Question illustration planning", "S18 produced PEP/HJB question illustration need audits, queues, dry-run packages, and built-in candidate imports; S10 added a reusable PEP junior Image2/overlay/audit pipeline。", "Creates structured image-generation backlog while keeping question-level images out of product surfaces pending QA。"],
    ["BNU candidate generation", "S18 generated BNU high and BNU junior 1,500-row candidate packages with safe RAG and DeepSeek workflows。", "Expands future content pipeline but both candidate banks remain blocked pending remediation/manual QA。"],
]

in_progress_rows = [
    ["对象", "当前状态", "下一步"],
    ["BNUP primary v2 product integration", "S04 started an owner-authorized 3,000-row v1+v2 public integration immediately before cutoff; post-cutoff files show active edits to BNUP questions/topics/lessons/tests。", "Finish S04 handoff, reconcile full-bank expected count, rerun question-bank/full-bank/build/browser gates。"],
    ["AI Tutor response behavior", "S07 started language/script matching and authenticated-session awareness fixes; no completed handoff by 08:00。", "Complete S07 implementation, run type-check and mocked/local AI Tutor smoke without live provider calls unless approved。"],
    ["HJB/PEP question image generation", "S18 continues built-in one-by-one candidate generation; API batch paths remain blocked without OpenAI Image2 credentials。", "Review pending candidates, regenerate failures, and decide whether S19 should place approved Image2 credentials。"],
    ["BNU high candidate bank", "DeepSeek reviewed 1,500 rows and found 280 issue rows / 270 fail-blocker-major remediation rows。", "S18 adjudicate priority rows, remediate, rerun DeepSeek QA and deterministic audit before any S04 integration。"],
    ["BNU junior candidate bank", "DeepSeek reviewed 1,500 rows and found 153 fail rows, including 13 not-solvable and 16 QA-output concern rows。", "S18 adjudicate 16 concern rows first, repair/regenerate 153 rows, rerun gates。"],
]

blocker_rows = [
    ["Blocker", "Evidence", "Required action"],
    ["Question-bank count regression", "Fresh `npm run test:question-bank` after cutoff: 58/59 pass, full-bank assertion actual 19,484 vs expected 19,485。", "S04/S08 reconcile BNUP v2 integration count and rerun the suite。"],
    ["Production build page-data failure", "Fresh `npm run build` compiled successfully, then failed collecting page data for API modules such as `/api/admin/storage/health`, `/api/ai-tutor/status`, `/api/ai-tutor`, `/api/analytics/export`。", "Run a clean isolated build after active post-cutoff edits settle; inspect Next generated-state vs route manifest mismatch。"],
    ["BNU high not integration-ready", "S18 DeepSeek BNU high decision: 280 issue rows, 270 fail/blocker/major remediation rows。", "No production import until remediation and manual sampling complete。"],
    ["BNU junior not integration-ready", "S18 DeepSeek BNU junior decision: 153 fail rows, 13 not solvable, 153 answer mismatch, 16 concern rows。", "No production import until remediation and rerun pass。"],
    ["Image2 credential blockers", "Four blocker reports record missing `OPENAI_API_KEY`/budget for PEP primary, HJB primary, HJB junior, and HJB high API batch generation。", "S19/owner decide credential placement and cost limits, or continue built-in manual route。"],
    ["BNU high S6 manifest script conflict", "S18 recorded overlapping use of `scripts/build-mainland-bnu-high-assessment-manifest.py` for S6/S4/S5 variants。", "S10/S18 split or parameterize the manifest builder before more BNU high assessment ingestion。"],
]

risk_rows = [
    ["Risk", "Why it matters", "Mitigation"],
    ["Cutoff overlap", "S04/S07 continued source edits immediately after 08:00, so fresh checks reflect current active workspace, not a frozen cutoff snapshot。", "Require explicit handoff before treating BNUP v2 or AI Tutor fixes as complete。"],
    ["Release gates mixed", "TypeScript and RAG are green, but question-bank and build are red in fresh automation checks。", "Fix count mismatch and clean-build page-data issue before production-ready claim。"],
    ["Content QA backlog", "BNU high/junior generated banks have substantial model-QA remediation queues。", "Keep candidate-only; require S18 math adjudication and reruns before integration。"],
    ["Image QA/manual workload", "Hundreds to thousands of question illustration candidates need manual math and copyright/source-distance review。", "Use smoke batches and deterministic overlays for exact labels/numbers before scaling。"],
    ["Credential hygiene", "S18 logs indicate owner-provided provider key use in chat; no secrets written to artifacts, but exposed keys should be treated as rotated-needed。", "S19 manages future credential placement and rotation; do not log values。"],
    ["Non-Git checkout", "Changed-file reporting is mtime-based and cannot distinguish all user/session edits precisely。", "Use session logs and file mtimes as operational evidence, not a formal diff。"],
]

test_rows = [
    ["Check", "Result", "Notes"],
    ["Fresh `npm run type-check`", "Pass", "Automation run after report cutoff; current workspace compiles under strict TS。"],
    ["Fresh `npm run test:rag`", "Pass 225/225", "All safe-RAG manifest self-tests and RAG Node tests passed。"],
    ["Fresh `npm run test:question-bank`", "Fail 58/59", "BNUP v1+v2 targeted tests passed, but full-bank count assertion failed: 19,484 actual vs 19,485 expected。"],
    ["Fresh `npm run build`", "Fail after compile", "Compiled successfully; page-data collection failed with PageNotFoundError for several API routes despite source route files existing。"],
    ["S05 focused Lesson checks", "Reported pass", "PEP/HJB illustration rollouts reported type-check/build/focused Playwright/browser checks; some full MVP runs still red on known unrelated HJB alias issue。"],
    ["S12 auth/Lesson checks", "Reported pass", "type-check, build, production next-start browser verification passed for reported login/Lesson bug paths。"],
    ["S18 BNU primary v2 gates", "Green", "1,500/1,500 deterministic, broad QA, hard gate, and 300-row manual sample approved。"],
    ["S18 BNU high/junior candidate gates", "Blocked", "BNU high 270 major remediation rows; BNU junior 153 fail rows; neither is integration-ready。"],
]

changed_rows = [
    ["Area", "Representative changed files / artifacts in reporting window"],
    ["App/UI", "app/login/page.tsx; app/register/page.tsx; app/practice/page.tsx; app/api/auth/register/route.ts; app/api/ai-tutor/route.ts; components/home/HeroSection.tsx; components/learning/SubwayNetworkMap.tsx; components/lesson/LessonView.tsx; components/ui/CurriculumTrackSelector.tsx。"],
    ["Lesson data/assets", "data/mainlandPepHighLessonIllustrations.ts; data/mainlandPepJuniorLessonIllustrations.ts; data/mainlandPepPrimaryLessonIllustrations.ts; data/mainlandHjbPrimaryLessonIllustrations.ts; data/mainlandHjbJuniorLessonIllustrations.ts; data/mainlandHjbHighLessonIllustrations.ts; public/lesson-illustrations/mainland-pep-* and mainland-hjb-* assets。"],
    ["BNU/content QA", "coordination/content-qa/mainland-bnu-primary-generated-bank-v2-1500/*; mainland-bnu-high-generated-bank-v1-1500/*; mainland-bnu-junior-generated-bank-v1-1500/*; BNU safe-RAG assessment decision record。"],
    ["Question illustration QA", "HJB primary/junior/high and PEP primary/junior/high question-illustration audits, queues, candidates, review indexes, validation reports, and generation tooling under coordination/content-qa/。"],
    ["Tests/scripts", "lib/mvpReadiness.test.ts; tests/e2e/mainland-pep-primary-lessons.spec.ts; tests/e2e/mainland-hjb-lesson-only.spec.ts; scripts/build-mainland-bnu-* manifest scripts; S10 PEP junior Image2 pipeline。"],
    ["Blockers/decisions/logs", "6 blocker reports dated 2026-05-27; decision record for BNU junior S1 lower assessment safe-RAG; session logs for S03/S04/S05/S10/S12/S18/S01/S04/S18。"],
    ["Post-cutoff not in window", "After 08:00, source mtimes show active edits to components/ai/AITutorProvider.tsx, data/mainlandBnuPrimary*.ts, lib/questionBankSolvability.ts, and BNUP tests; fresh checks include these current-state changes but changed-file window excludes them。"],
]

priority_rows = [
    ["#", "明日优先级"],
    ["1", "Finish S04 BNUP v2 integration handoff, fix 19,484 vs 19,485 full-bank count mismatch, rerun `npm run test:question-bank` and `npm run build`。"],
    ["2", "Investigate clean-build PageNotFoundError for API routes after active edits settle; avoid release claims until build passes。"],
    ["3", "Complete S07 AI Tutor language/script/session fixes with type-check and mocked/local smoke evidence。"],
    ["4", "S18 adjudicate BNU junior 16 concern rows then 153 fail rows; separately triage BNU high 270 remediation rows。"],
    ["5", "S11 create focused regression matrix for Home/Login/Register/Lesson/Practice/AI Tutor across EN/zh/zh-Hans and mobile widths。"],
    ["6", "S19/owner decide key rotation and whether to provide Image2 credentials/budget or continue manual built-in generation only。"],
]

decision_rows = [
    ["Decision", "Owner action needed"],
    ["BNUP v2 timing", "Confirm whether S04 should finish v2 public integration today or hold until question-bank/build gates are green。"],
    ["Build cleanup", "Approve a clean isolated build pass, including stopping stale Next servers and clearing generated `.next` state only if needed。"],
    ["BNU high/junior candidates", "Confirm that BNU high and BNU junior remain candidate-only until S18 remediation gates pass。"],
    ["Image2 credentials/budget", "Decide whether S19 should place `OPENAI_API_KEY` for batch Image2 generation, and set spend/concurrency limits。"],
    ["Provider key rotation", "Rotate any DeepSeek/OpenAI key pasted into chat if it is production-grade。"],
    ["QA ownership", "Assign S11 to formalize release evidence for lesson illustrations and post-auth flows before public announcement。"],
]


def build_document_xml() -> str:
    parts: list[str] = []
    parts.append(para("MAIS-MVP 每日总裁报告", "Title", align="center"))
    parts.append(para("Daily President Report for Dr. Peter Hu", "Subtitle", align="center"))
    parts.append(table(metadata_rows, [1800, 7560]))

    parts.append(heading("中文 Executive Summary", 1))
    parts.append(para("本窗口有实质推进：移动端首页视觉修复、roadmap P/S grade label 简化、登录/注册/Lesson 路由问题修复、PEP 与 HJB Lesson illustrations 大规模上线、BNUP primary v1 public integration 完成，以及 BNUP primary v2 在 S18 侧通过 QA 并于 07:59:59 记录 public integration approval。"))
    parts.append(para("当前最大风险是 release gate 不稳定，而不是 TypeScript：fresh `npm run type-check` 通过，`npm run test:rag` 225/225 通过；但 `npm run test:question-bank` 在 post-cutoff 当前工作区失败 1 个 full-bank count assertion，`npm run build` 编译通过后在 page-data collection 阶段失败。BNUP v2 与 AI Tutor 在 08:00 后仍有 active edits，需先完成 handoff 再判定完成。"))

    parts.append(heading("English Executive Summary", 1))
    parts.append(para("The window moved the project forward across mobile home polish, roadmap readability, auth/Lesson bugfixes, lesson illustration rollout, BNUP primary v1 public integration, and S18 approval evidence for BNUP primary v2. S18 also expanded future content pipelines for BNU high/junior and question-level illustration generation, while keeping risky candidate banks out of public surfaces."))
    parts.append(para("Release health is mixed. Fresh TypeScript and RAG gates are green, but the current workspace fails one full question-bank count assertion and production build fails during page-data collection. Because S04 and S07 continued source edits just after the 08:00 cutoff, these fresh checks should be treated as current-state warnings and not as a stable release sign-off."))

    parts.append(heading("报告窗口摘要", 1))
    parts.append(para("报告窗口：2026-05-27 08:00 至 2026-05-28 08:00 Asia/Hong_Kong。活跃或相关日志：S03、S04、S05、S10、S12、S18、S01、S04(2026-05-28)、S18(2026-05-28)，并读取 S07 cutoff-adjacent in-progress handoff。No assigned work in this reporting window: No。"))
    parts.append(para("窗口内 coordination 产物非常多，主要来自 S18 content-QA 与 S05 Lesson illustration assets。文件变更统计采用 filesystem mtime，因为本目录不是 Git repository；post-cutoff 08:00 后 active source edits 已单独标注，避免把它们混入闭合报告窗口。"))

    parts.append(heading("整体项目进展", 1))
    parts.append(para("产品层面，学生可见的 Home、Roadmap、Lesson、Practice/BNUP primary、Login/Register/Lesson entry 均有进展。内容层面，BNUP primary v1 已进入 public surfaces，BNUP v2 已获得 S18 approval 但 S04 integration 尚未稳定收口；BNU high/junior generated banks 暂不具备发布条件。"))
    parts.append(para("质量层面，TypeScript 与 RAG 基础健康良好；但 question-bank full count 与 production build 是当前 release blocker。建议今天优先稳定 BNUP v2 integration 和 clean build，再扩大 E2E/visual release evidence。"))

    parts.append(heading("S01-S20 会话状态表", 1))
    parts.append(table(session_rows, [850, 1350, 4300, 2860]))

    parts.append(heading("已完成工作", 1))
    parts.append(table(completed_rows, [1800, 4860, 2700]))

    parts.append(heading("进行中工作", 1))
    parts.append(table(in_progress_rows, [2200, 4260, 2900]))

    parts.append(heading("Blockers", 1))
    parts.append(table(blocker_rows, [2300, 4360, 2700]))

    parts.append(heading("风险", 1))
    parts.append(table(risk_rows, [1900, 4160, 3300]))

    parts.append(heading("测试 / 构建状态", 1))
    parts.append(table(test_rows, [2600, 1700, 5060]))

    parts.append(heading("变更文件摘要", 1))
    parts.append(table(changed_rows, [2000, 7360]))

    parts.append(heading("明日优先级", 1))
    parts.append(table(priority_rows, [700, 8660]))

    parts.append(heading("需要 Owner 决策", 1))
    parts.append(table(decision_rows, [2500, 6860]))

    parts.append(heading("验证说明", 1))
    parts.append(para("本 DOCX 使用 standard_business_brief preset 和 memo_masthead-style opening：US Letter、1 inch margins、Calibri / Microsoft YaHei、fixed DXA tables、simple business formatting。报告生成后执行 zip archive、OOXML/text extraction、textutil extraction，并尝试 render_docx visual gate；如本机缺少 LibreOffice/soffice 或无法在 sandbox 中渲染，则在 handoff 中记录 caveat。"))

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
  <dc:title>MAIS-MVP 2026-05-28 President Report</dc:title>
  <dc:subject>Daily bilingual president report</dc:subject>
  <dc:creator>S10 Codex automation</dc:creator>
  <cp:lastModifiedBy>S10 Codex automation</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{datetime.now(timezone.utc).isoformat()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{datetime.now(timezone.utc).isoformat()}</dcterms:modified>
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

