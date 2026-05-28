from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-05-25-president-report.docx"
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
        + ("<w:jc w:val=\"center\"/>" if header else "")
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
    ["报告窗口", "2026-05-24 08:00 至 2026-05-25 08:00 Asia/Hong_Kong"],
    ["生成时间", GENERATED_AT],
    ["会话", "S10 President report automation"],
    ["证据范围", "AGENTS.md、session logs、blocker reports、decision records、content-QA artifacts、mtime changed-file scan、fresh safe checks"],
]

session_rows = [
    ["Session", "状态", "本窗口摘要", "检查 / 风险"],
    ["S01", "No fresh log", "App shell/home 本窗口没有 08:00 后新日志；上一窗口主页题量统计作为背景存在。", "无新增检查。"],
    ["S02", "No fresh log", "Dashboard/progress 本窗口无新日志。", "无新增检查。"],
    ["S03", "No fresh log", "Roadmap 完成记录在本窗口前；本窗口无 08:00 后新日志。", "无新增检查。"],
    ["S04", "No fresh log", "Practice lead 无独立 fresh log；question-bank regression 由 S10 fresh check 覆盖。", "Fresh test:question-bank passed 42/42。"],
    ["S05", "Completed", "Lesson first-screen performance and Mainland HJB lesson-only controlled release gate were recorded; HJB lessons remain open while practice stays intentionally empty for the release.", "type-check/build/production smoke were logged as passed; HJB practice release remains gated on S18/S04/S08 approval."],
    ["S06", "No fresh log", "Visualization lead 本窗口无新日志。", "无新增检查。"],
    ["S07", "Completed", "AI Tutor UI now passes RAG `evidenceQuery` context through real UI requests so HK/Mainland evidence packs can be triggered from frontend-owned flows.", "type-check passed; final Playwright rerun was blocked by `.next` contention in-session, but fresh S10 build now passes."],
    ["S08", "Completed", "Fixed slow login preview clicks by stopping concurrent build/dev contention, rebuilding clean dev cache, and making unauthenticated learning-event flushes safe no-ops.", "type-check and login Playwright/Chrome smoke passed; build skipped in-session to keep site running."],
    ["S09", "Completed", "Changed login-visible English copy from Shanghai Education Press to SEP.", "type-check passed; `/login` HTML check confirmed `SEP`."],
    ["S10", "Completed", "Coordinated HJB lesson-only release gate and produced this president report; no feature code edited by this report run.", "Fresh checks: type-check, test:rag 150/150, test:question-bank 42/42, test:mvp 24/24, build 86 routes, zh-Hans strict 0 critical/warnings."],
    ["S11", "Completed", "Added homepage functional QA and HJB lesson-only smoke; later HJB release status copy was validated in a clean temporary build/start path.", "Homepage spec passed 8/8 plus 2 skips; HJB lesson-only smoke passed; some Playwright webServer/dev-cache instability remains."],
    ["S12", "No fresh log", "Backend/API platform had no independent fresh log; several sessions touched API/storage-adjacent paths under assignment.", "S12 review recommended for shared `userStore`, storage, and API contract consolidation."],
    ["S13", "No fresh log", "Teacher console 本窗口无新日志。", "无新增检查。"],
    ["S14", "No fresh log", "Parent console 本窗口无新日志。", "无新增检查。"],
    ["S15", "Completed", "Adaptive Engine now injects bounded MAIS-safe RAG evidence into the LLM feature pack for HK, Mainland PEP, and US CA/NC while preserving guarded rerank behavior.", "type-check, test:analytics 21/21, test:rag, mocked adaptive Playwright, and build passed in-session."],
    ["S16", "No fresh log", "Research stream 本窗口无 fresh log。", "无新增检查。"],
    ["S17", "No fresh log", "Reward/gamification economy 本窗口无 fresh log。", "无新增检查。"],
    ["S18", "High activity / mixed gates", "Delivered many safe-RAG and candidate-content QA artifacts: HJB high remediated candidates, HJB junior/primary generated packages, HJB primary/junior assessment-paper safe RAG, Mainland PEP junior v1/v3 QA, and DeepSeek model QA queues.", "RAG fresh check is green; multiple candidate banks remain blocked from public integration pending remediation/adjudication."],
    ["S19", "No fresh log", "API/env lead 无独立日志；S18 used local DeepSeek config with secret values redacted.", "Provider/network stability remains a coordination dependency for future large DeepSeek runs."],
    ["S20", "Completed", "Institutionalized Practice Arena -> Adventure Island -> Fishing Master unlock chain using same-topic Practice round evidence and preserved reward values.", "type-check, build, and targeted desktop game Playwright passed 5/5; mobile/full suite not run."],
]

completed_rows = [
    ["领域", "完成内容", "影响"],
    ["Adaptive / AI", "S15 added bounded safe RAG into Adaptive LLM feature packs; S07 added frontend `evidenceQuery` pass-through for AI Tutor.", "The prior DeepSeek RAG-access gap is now addressed in code paths, with live canary still gated by owner-approved credentials."],
    ["HJB lesson-only release", "S05/S10/S11 validated 21 HJB high-school lessons, student/teacher visibility, empty practice state, and no V4 candidate exposure.", "HJB can be previewed as lesson-only; question-supported release remains separate."],
    ["Login responsiveness", "S08 resolved login preview unresponsiveness caused by concurrent `.next` writes and retrying unauthenticated learning-event POSTs.", "Local review workflow is more reliable; anonymous telemetry no-ops avoid retry loops."],
    ["Game unlock chain", "S20 made Adventure Island and Fishing Master depend on authoritative same-topic Practice evidence.", "Practice-to-game progression is more coherent and harder to unlock incorrectly."],
    ["Safe-RAG expansion", "S18 added/verified HJB primary assessment, junior paper-pattern, HJB high assessment, HK DSE topic/mock, and junior zhongkao safe-card layers.", "RAG coverage broadened while preserving metadata-only/source-distance boundaries."],
    ["Candidate content QA", "S18 generated or re-QA'd multiple offline packages: HJB primary 1500, HJB junior v2 1500, PEP junior v1 900 remediation, PEP junior v3 1200, and HJB high remediated candidates.", "The content pipeline is productive, but public promotion is deliberately gated by model and human QA."],
    ["Fresh release checks", "S10 ran final type-check, RAG, question-bank, MVP, production build, and zh-Hans strict audit.", "Final code state compiles and core deterministic gates are green."],
]

in_progress_rows = [
    ["对象", "当前状态", "下一步"],
    ["HJB junior v2 1500", "Generated candidate package exists, but DeepSeek model QA flagged 236 rows for adjudication/remediation.", "S18 triage true defects vs false positives, repair/exclude rows, rerun deterministic and DeepSeek QA."],
    ["HJB primary v1 1500", "Candidate package exists; DeepSeek QA found 55 flagged rows, including 37 fails and 4 blocker-severity findings.", "S18 remediate/regenerate fail rows before any S04/S08/S11 public integration task."],
    ["Mainland PEP junior v3 1200", "Fresh offline v3 candidate package exists; DeepSeek QA flagged 92 rows, including 54 blocker-severity rows.", "S18 blocker-first remediation; keep current public v2 stable."],
    ["Mainland PEP junior v1", "Legacy v1 was remediated after DeepSeek/human review; remaining DeepSeek fails are known false-positive set, but package remains candidate-only.", "Owner/S04/S08 decide whether a filtered/remediated promotion task is worth doing."],
    ["HJB high remediated V3/V4", "Candidate QA remediation is green with 0 P0/P1/P2 in manual sample, but no production switch assigned.", "Owner chooses whether to promote V3-remediated or V4-remediated; then S04/S08/S11 run integration gates."],
    ["Release regression", "Focused checks are green, but broad multi-role/browser/mobile suite was not run.", "S11 build a release matrix in a quiet environment after shared-file ownership stabilizes."],
]

blocker_rows = [
    ["Blocker", "Evidence", "Required action"],
    ["Concurrent HJB file overwrites", "S18 blocker reports record repeated overwrites in HJB lesson/question/topic/RAG files and manifest scripts.", "Reserve affected files for one writer at a time before further HJB production integration."],
    ["Candidate packages not production-ready", "HJB junior v2, HJB primary v1, PEP junior v3, and other generated banks have DeepSeek/manual QA queues.", "Do not connect to `data/questions.ts` or public Lesson/Practice until S18 remediation and owner approval."],
    ["DeepSeek transport instability", "S18 saw reproducible `fetch failed`/transport failures in HJB junior/high generation before later resumptions or alternate candidate paths.", "S19/provider stability review before another large live generation run."],
    ["Playwright/dev-server contention", "S07/S11/S08 logs show `.next` contention and webServer startup timeouts when build/dev/test overlap.", "Run browser checks in isolated ports or production build/start; avoid concurrent `next build` and `next dev`."],
    ["Shared storage/API ownership", "S05/S15/S20 all touched `lib/server/userStore.ts` under assignments.", "S12 should review storage/API contract drift before production hardening."],
]

risk_rows = [
    ["Risk", "Why it matters", "Mitigation"],
    ["Model QA catches real defects after deterministic pass", "DeepSeek found answer/explanation and single-choice issues in candidate banks that structural audits missed.", "Keep DeepSeek as evidence, then require S18 adjudication and deterministic rerun after remediation."],
    ["Model QA can over-flag", "S18 identified false positives in PEP junior v1 and self-contradictory model rationale in other runs.", "Do not automate deletion/promotion directly from model labels."],
    ["Source-distance/IP boundary", "Owner-provided papers/textbooks are handled as metadata/safe abstractions only.", "Keep `.local/` manifests local-only; never commit source text, file names, paths, answers, OCR, embeddings, or page locators."],
    ["High cross-scope change density", "Window touched app routes, AI, adaptive, games, lessons, APIs, shared storage, RAG, question QA, and E2E.", "Use S11 release matrix plus S12 shared-storage/API review before production claims."],
    ["Non-Git checkout", "Changed-file reporting relies on filesystem mtimes and can include generated/local-only artifacts.", "Treat changed-file list as a coordination scan, not a precise diff."],
    ["Simplified Chinese advisory debt", "Strict zh-Hans audit has 0 critical/warnings but 3,495 advisory issues.", "S09 can reduce advisory debt in future copy passes."],
]

test_rows = [
    ["Check", "Result", "Notes"],
    ["Fresh `npm run type-check`", "Pass", "Final TypeScript strict check passed."],
    ["Fresh `npm run test:rag`", "Pass 150/150", "All manifest self-tests and RAG Node tests passed."],
    ["Fresh `npm run test:question-bank`", "Pass 42/42", "Covers public question-bank solvability, curriculum scoping, and HJB V1 integration checks."],
    ["Fresh `npm run test:mvp`", "Pass 24/24", "Core MVP readiness invariants remain green."],
    ["Fresh `npm run build`", "Pass", "Next build compiled and generated 86 routes."],
    ["Fresh `npm run audit:zh-hans:strict`", "Pass", "0 critical, 0 warnings, 3,495 advisory-only issues."],
    ["S20 game E2E", "Pass 5/5", "Targeted desktop Adventure Island + Fishing Master chain."],
    ["S11 homepage QA", "Pass with env caveat", "8 passed, 2 intentional skips against dev-server path after webServer timeout."],
    ["S11 HJB smoke", "Pass", "Production-start desktop lesson-only smoke passed."],
]

changed_rows = [
    ["Area", "Representative changed files / artifacts in reporting window"],
    ["App/UI", "app/lesson/page.tsx; app/lesson/LessonEntryClient.tsx; app/practice/page.tsx; app/register/page.tsx; components/ai/AITutorProvider.tsx; components/lesson/LessonView.tsx; components/providers/AppProviders.tsx; components/layout/Navbar.tsx; components/ui/CurriculumTrackSelector.tsx; components/gamification/AdventureIslandGame.tsx; components/gamification/FishingGame.tsx"],
    ["API/server", "app/api/ai-tutor/route.ts; app/api/learning-events/route.ts; app/api/lesson-entry/route.ts; app/api/lessons/[slug]/route.ts; app/api/gamification/adventure-island/route.ts; app/api/gamification/fishing-game/complete/route.ts; lib/server/userStore.ts"],
    ["Data/RAG", "data/mainlandHjbHighLessons.ts; data/mainlandHjbHighQuestions.ts; data/mainlandHjbHighTopics.ts; data/questions.ts; data/topics.ts; data/rag/hongKongDse*.ts; data/rag/mainlandHjb*.ts; data/rag/mainlandJuniorZhongkaoExamPatterns.ts; data/rag/mainlandPepJuniorExamPatterns.ts"],
    ["Lib/scripts/tests", "lib/questionBankSolvability.ts; lib/fullQuestionBankSolvability.test.ts; lib/mainlandPepHighQuestionBank.test.ts; lib/mvpReadiness.test.ts; lib/rag/*.ts; scripts/build-*-manifest.py; scripts/audit-full-question-bank-solvability.ts; tests/e2e/home-functional.spec.ts; tests/e2e/mainland-hjb-lesson-only.spec.ts; tests/e2e/adaptive-llm-smoke.spec.ts; tests/e2e/adventure-island.spec.ts; tests/e2e/fishing-game.spec.ts; tests/e2e/ai-tutor-deepseek.spec.ts"],
    ["Coordination", "coordination/session-logs/2026-05-24-S05/S07/S08/S09/S10/S11/S15/S18/S20.md; coordination/session-logs/2026-05-25-S18.md; 8 blocker reports; 11 decision records; many S18 content-QA reports and candidate package artifacts."],
    ["Generated/local observed", "mtime scan also saw `.playwright-cli`, `test-results`, `output`, `.DS_Store`, `.next`, `.tmp`, and `.local` style artifacts; these are not product-source deliverables."],
]

priority_rows = [
    ["#", "Tomorrow priority"],
    ["1", "Reserve HJB shared integration files for one writer and resolve stale/concurrent overwrite reports."],
    ["2", "Triage S18 candidate QA queues: HJB junior v2 236 rows, HJB primary v1 55 flagged rows, PEP junior v3 92 flagged rows."],
    ["3", "Run S11 multi-role release matrix across Mainland PEP, HJB lesson-only, HK, US, AI Tutor, adaptive, games, and mobile-critical flows."],
    ["4", "Have S12 review `lib/server/userStore.ts` and adjacent API/storage contracts after S05/S15/S20 changes."],
    ["5", "Decide whether to run owner-approved live DeepSeek canaries for the new S07/S15 RAG evidence paths."],
    ["6", "Reduce zh-Hans advisory debt on high-visibility student/login/lesson/game surfaces."],
]

decision_rows = [
    ["Decision", "Owner action needed"],
    ["HJB question-supported release", "Choose whether HJB stays lesson-only or assign a separate S18/S04/S08/S11 promotion task for V3/V4 remediated candidates."],
    ["PEP junior candidate path", "Decide whether current public v2 remains stable or if remediated v1 / v3 should be considered after QA repair."],
    ["Live LLM validation", "Approve or defer live DeepSeek canaries for Adaptive RAG and AI Tutor UI `evidenceQuery` paths."],
    ["Shared-file lock", "Confirm owner/session for HJB production integration files before another patch attempt."],
    ["Provider/network stability", "Ask S19 to validate DeepSeek/provider stability before the next large generation run."],
    ["Production readiness", "Confirm whether S12/S19 should prioritize durable storage/env parity before any public launch setting changes."],
]


def build_document_xml() -> str:
    parts: list[str] = []
    parts.append(para("MAIS-MVP 每日总裁报告", "Title", align="center"))
    parts.append(para("Daily President Report for Dr. Peter Hu", "Subtitle", align="center"))
    parts.append(table(metadata_rows, [1800, 7560]))

    parts.append(heading("中文执行摘要", 1))
    parts.append(para("本报告窗口有明显进展，且最终代码健康度较好。S15/S07 分别补上 Adaptive Engine 与 AI Tutor UI 的 safe RAG evidence 通路，S20 完成 Practice -> Adventure Island -> Fishing Master 的同主题解锁链，S05/S10/S11 完成 HJB lesson-only controlled release gate，S08 修复登录预览卡顿，S18 继续大规模推进 HJB/PEP safe-RAG 与候选题库 QA。"))
    parts.append(para("Fresh checks 全部通过：`npm run type-check`、`npm run test:rag` 150/150、`npm run test:question-bank` 42/42、`npm run test:mvp` 24/24、`npm run build` 86 routes、`npm run audit:zh-hans:strict` 0 critical/0 warnings。主要限制不是编译，而是内容发布治理：多个候选题库被 DeepSeek QA 标出需要 S18 人工判定和修复，且 HJB 生产集成文件出现过并发覆盖，需要先锁定单一写入者。"))

    parts.append(heading("English Executive Summary", 1))
    parts.append(para("The window shows meaningful product and content progress with a green final code-health sweep. S15 and S07 added safe-RAG evidence paths for Adaptive Engine and AI Tutor UI, S20 completed the same-topic Practice-to-game unlock chain, S05/S10/S11 validated a HJB lesson-only release gate, S08 stabilized login preview behavior, and S18 advanced a large amount of HJB/PEP safe-RAG and candidate-bank QA work."))
    parts.append(para("Fresh checks all passed: type-check, RAG 150/150, question-bank 42/42, MVP 24/24, production build with 86 routes, and strict Simplified Chinese audit with 0 critical/warnings. The main gating issue is content governance, not compilation: several candidate banks have DeepSeek QA queues requiring S18 adjudication/remediation, and HJB production integration files need one-writer coordination before further promotion work."))

    parts.append(heading("报告窗口摘要", 1))
    parts.append(para("窗口：2026-05-24 08:00 至 2026-05-25 08:00 Asia/Hong_Kong。当前目录不是 Git repository，因此 changed-file 统计使用 filesystem mtime 与 session logs / blockers / decisions / reports 交叉校验。08:00 前的 2026-05-24 日志只作为背景，不计为本窗口 fresh work。"))

    parts.append(heading("整体项目进展", 1))
    parts.append(para("产品面：HJB lesson-only 预览路径已经可用；Mainland PEP/HJB/HK RAG layers 更完整；Adaptive 与 AI Tutor 的 RAG evidence 通路从审计问题进入代码修复阶段；游戏学习链路从松散奖励变成服务器校验的同主题 progression。"))
    parts.append(para("质量面：最终 fresh checks 全绿，说明当前代码、RAG、题库、MVP、build 和 zh-Hans strict gate 处于可继续集成状态。但候选题库不能因 deterministic pass 或生成完成就发布；DeepSeek QA 已证明仍有答案、解释、多选唯一性、题型/条件不一致等问题需要人工判定和修复。"))

    parts.append(heading("S01-S20 会话状态表", 1))
    parts.append(table(session_rows, [850, 1250, 4200, 3060]))

    parts.append(heading("已完成工作", 1))
    parts.append(table(completed_rows, [1800, 4600, 2960]))

    parts.append(heading("进行中工作", 1))
    parts.append(table(in_progress_rows, [2000, 4160, 3200]))

    parts.append(heading("Blockers", 1))
    parts.append(table(blocker_rows, [2100, 4260, 3000]))

    parts.append(heading("风险", 1))
    parts.append(table(risk_rows, [1900, 4060, 3400]))

    parts.append(heading("测试 / 构建状态", 1))
    parts.append(table(test_rows, [2600, 1600, 5160]))

    parts.append(heading("变更文件摘要", 1))
    parts.append(table(changed_rows, [2000, 7360]))

    parts.append(heading("明日优先级", 1))
    parts.append(table(priority_rows, [700, 8660]))

    parts.append(heading("需要 Owner 决策", 1))
    parts.append(table(decision_rows, [2500, 6860]))

    parts.append(heading("验证说明", 1))
    parts.append(para("本 DOCX 使用 standard_business_brief 风格：US Letter、1 inch margins、Calibri / Microsoft YaHei、固定 DXA 表格、简洁表头。生成后执行 zip archive、OOXML/text extraction 和 render gate 尝试；若本机缺少 LibreOffice/soffice 或渲染依赖，则只声明结构/文本验证通过。"))

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
  <dc:title>MAIS-MVP 2026-05-25 President Report</dc:title>
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
