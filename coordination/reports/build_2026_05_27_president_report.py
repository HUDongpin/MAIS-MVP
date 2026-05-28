from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-05-27-president-report.docx"
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
    ["报告日期", "2026-05-27"],
    ["报告窗口", "2026-05-26 08:00 至 2026-05-27 08:00 Asia/Hong_Kong"],
    ["生成时间", GENERATED_AT],
    ["Automation ID", "mais-mvp-9-am-president-report"],
    ["证据范围", "AGENTS.md、session logs、blocker reports、decision records、content-QA artifacts、mtime changed-file scan、fresh safe checks"],
]

session_rows = [
    ["Session", "状态", "本窗口摘要", "检查 / 风险"],
    ["S01", "High activity / completed", "Home、Login、Register 与导航视觉迭代密集：PedaNova hero card、mini-stat cards、curriculum selector、Register version cards、external team link等多项完成。日志里有少数早期 plan stub 后续被其它完成项覆盖或等待选择。", "多次 type-check 与浏览器检查通过；未跑 full build。需避免 S01/S03/S09 同时改 `CurriculumTrackSelector`。"],
    ["S02", "No fresh log", "Dashboard/progress 本窗口无 fresh session log。", "无新增检查。"],
    ["S03", "Completed", "课程选择器从 Course/select 到 Login button/static 模式多轮调整；HJB roadmap `虹口区` label 与 P1-S6 紧凑标签完成。", "type-check 与 login/register/roadmap browser checks 通过；未跑 full build。"],
    ["S04", "Completed", "确认 Home Games stat links to Practice Arena；Practice Arena 改为 Adventure Island + Fishing Master 两卡游戏路径。", "type-check 和 Practice Arena browser checks 通过；窄屏存在既有浮动 AI/back-to-top overlap 风险。"],
    ["S05", "Completed", "修复 Lesson routing loop；学生注册 grade/course 成为登录、lesson entry、redirect、session settings 的单一来源；登录 grade/course controls 对 returning student 锁定。", "type-check 与 build 通过；browser 验证通过。触及 shared provider/API/storage，建议 S12 review。"],
    ["S06", "Completed", "Visualization Lab 限制为登录用户 curriculum、全部 lab inline 展开、trig label 碰撞修正、Complex Numbers 改为 complex-plane 模板、grade title 去重。", "type-check 与 browser/curl checks 通过；未跑 full build。"],
    ["S07", "Completed", "新增 EdUHK OpenAPI adapter、focused unit test、teacher-only question-generation API route；无真实 secret 写入 source。", "adapter unit test 5/5 通过；type-check 通过。后续需 S19 环境变量与 S13 UI wiring。"],
    ["S08", "No fresh log", "State/analytics lead 本窗口无 fresh log；但 S05/S12 触及 provider/storage，需后续协调。", "无独立检查。"],
    ["S09", "Completed", "多项 copy/i18n/a11y 更新：HJB copy、US standards copy、Course->Version、MAIS logo wording rollback、登录/注册标题、BNUP coming-soon bold label。", "type-check、rg、curl/Playwright copy checks 通过；未跑 full build。"],
    ["S10", "Completed", "启动本地 dev server；创建 `default accounts.md`；本自动化生成 2026-05-27 总裁报告。", "本次 fresh checks: type-check pass, test:rag 195/195, test:question-bank 48/48, build failed after compile during page data collection."],
    ["S11", "No fresh log", "QA/release quality 本窗口无 fresh log。", "S12 reported app-shell auth E2E 4 pass + 1 unrelated guest-shell timeout；backend suite has existing non-auth failures。"],
    ["S12", "Completed with caveats", "正式 auth/login 方案：email-or-username login、role-aware registration、parent registration、password-reset routing、change-password gate、display account quick-fill。", "type-check passed；auth E2E scenarios passed but one guest-shell language-toggle timeout；`npm run test:backend` failed on existing lesson-progress/admin-cache expectations。"],
    ["S13", "No fresh log", "Teacher console 本窗口无 fresh log；S07 新 question-generation route 尚未接入 teacher UI。", "无新增检查。"],
    ["S14", "No fresh log", "Parent console 本窗口无 fresh log；S12 已允许 parent public registration。", "无新增检查。"],
    ["S15", "No fresh log", "Adaptive engine 本窗口无 fresh log。", "无新增检查。"],
    ["S16", "No fresh log", "Research/learning science 本窗口无 fresh log。", "无新增检查。"],
    ["S17", "No fresh log", "Gamification/reward economy 本窗口无 fresh log。", "Home stat card links existing dashboard/practice only。"],
    ["S18", "High activity / mixed gates", "BNU P4/P5 primary and BNU S2 junior safe-RAG accepted; PEP primary 1200 DeepSeek audit fixed one option issue; PEP high 4800 hard gates green with 40 explanation-only P2 rows; HJB junior 1500 has 139 DeepSeek review rows; BNU v1 blocked; BNU v2 hard gates green but not public-approved。", "test:rag and type-check reported pass in-session; fresh test:rag 195/195 and question-bank 48/48 passed. Live model work used transient credentials; rotate if production-grade。"],
    ["S19", "Completed", "分析 EdUHK credentials/provider contract；确认 prior Java gateway shape；本地 `.env.local` 增加 EdUHK settings，真实值未写入日志。", "configuration-only；未做 live EdUHK request。需 S07 provider behavior coordination。"],
    ["S20", "No fresh log", "Game design/game-based learning 本窗口无 fresh log；S04 只链接 existing game routes，未改 S20 game implementation。", "无新增检查。"],
]

completed_rows = [
    ["领域", "完成内容", "影响"],
    ["Home/Login/Register UX", "S01/S03/S09 完成 Home PedaNova/mini-stat polish、Login/Register curriculum selector 与中英文 copy 多轮调整。", "首屏与注册/登录选择体验更接近 owner screenshots，但 shared selector 变更密集，需后续稳定化。"],
    ["Practice/Game入口", "S04 将 Practice Arena 改成 Adventure Island + Fishing Master 两卡路径，并确认 Home Games card 到 `/practice`。", "游戏入口清晰，但实际 game loop/storage 仍归 S20。"],
    ["Lesson/Auth一致性", "S05/S12 完成学生 registered grade/course 锁定、formal login、parent registration、temporary password change gate、display account quick-fill。", "解决 lesson routing loop 和登录误改注册课程风险；shared storage/API 需 review。"],
    ["Visualization Lab", "S06 完成 curriculum-scoped visualization lab、inline 展开、complex-plane 模板、trig overlap 修正。", "Mainland PEP learner 看到更聚焦的 visualization catalog，错误 trig rendering 已修正。"],
    ["AI/API provider", "S07 新增 EdUHK adapter 与 teacher question-generation route；S19 完成本地配置分析与脱敏配置落位。", "为 teacher question generation 打基础，但 teacher UI wiring 和 live smoke 未完成。"],
    ["Safe-RAG / 内容QA", "S18 完成 BNU P4/P5 primary、BNU S2 junior safe-RAG decision；PEP primary/high 与 HJB junior/BNU generated banks 多轮 DeepSeek/deterministic QA。", "RAG coverage 扩大，内容发布门槛更清晰；候选题库仍需人工 adjudication。"],
    ["项目文档/运行", "S10 启动本地 dev server 并新增 local `default accounts.md`。", "方便 owner 本地访问和 demo account 参考；demo password 文档需保持本地/非生产。"],
]

in_progress_rows = [
    ["对象", "当前状态", "下一步"],
    ["Fresh production build", "本次 `npm run build` compiled successfully but failed during page-data collection: missing `.next/server/chunks/ssr/[turbopack]_runtime.js` required by `.next/server/pages/_document.js`。", "在安静环境停止 dev/build contention 后清理 generated `.next` state 并重跑 build；不要把它误判为 TypeScript failure。"],
    ["HJB junior v2 1500", "Integrated/local gates green, but fresh DeepSeek V4 Pro flagged 139 / 1500 rows for S18 review。", "S18 classify confirmed defects vs model false positives, then coordinate any source edits with question-bank owner。"],
    ["BNU primary v1 1500", "DeepSeek reviewer blocked package: 1485/1500 solvable, 1460/1500 answer-question matched, 40 hard-gate issue rows。", "Repair 15 unsolvable/missing-condition rows first, then 25 answer/question mismatch rows；rerun audit and hard gate。"],
    ["BNU primary v2 1500", "Hard gates green: 1500/1500 solvable and answer-question matched; still candidate-only with 11 broader QA warn rows。", "S18 manually adjudicate 11 warn rows before any public integration proposal。"],
    ["PEP high 4800", "Hard gates green; 40 S5 rag-v2 explanation-only P2 rows remain。", "S18/S04 decide whether to repair explanations and rerun targeted check。"],
    ["S12 auth/backend regression", "`test:backend` still failed on existing lesson-progress/admin-cache expectations; one app-shell auth guest language-toggle timeout noted。", "S11/S12 decide whether expectations are stale or product behavior regressed。"],
]

blocker_rows = [
    ["Blocker", "Evidence", "Required action"],
    ["Production build generated-state failure", "Fresh build fails after compile with `MODULE_NOT_FOUND` for `.next/server/chunks/ssr/[turbopack]_runtime.js` from `_document.js`。", "Run next build in isolated quiet state; owner may authorize generated `.next` cleanup if needed。"],
    ["Candidate banks not public-ready", "HJB junior 139-row DeepSeek queue; BNU v1 40 hard-gate issues; BNU v2 not approved despite green hard gate; PEP high 40 explanation-only rows。", "No import to `data/questions.ts` or public surfaces until S18/S04/S08 owner-authorized remediation。"],
    ["Credential/security hygiene", "S18 live DeepSeek runs used owner-provided transient key pasted in chat; blockers record resolution and rotation note。", "Rotate key if production-grade; S19 should configure future provider credentials through approved secret handling。"],
    ["Shared-file ownership pressure", "S01/S03/S09 all touched `CurriculumTrackSelector`; S05/S12 touched provider/API/storage; S18 touched shared RAG/types/package in assigned scope。", "Reserve shared files per session before next broad UX/auth/content wave。"],
    ["Backend/API regression uncertainty", "S12 `npm run test:backend` failed on lesson-progress/admin-cache expectations outside the narrow auth path。", "S11/S12 triage before release claims。"],
]

risk_rows = [
    ["Risk", "Why it matters", "Mitigation"],
    ["High velocity UI churn", "Home/Login/Register selector behavior changed many times in one day, increasing hidden regression risk across guest/student/parent flows。", "S11 focused browser matrix for login/register/home in EN/zh/zh-Hans and mobile。"],
    ["Model QA is not deterministic truth", "DeepSeek found real issues but can self-contradict or over-flag rows。", "Use model output as review queue; require S18 math adjudication before editing or promoting。"],
    ["Source-distance/IP boundary", "Owner-provided BNU textbooks are represented only as metadata/safe abstraction cards。", "Keep PDFs, filenames, paths, OCR/body text, page anchors, hashes, and embeddings out of Git/reports。"],
    ["Local secret file touched", "mtime scan saw `.env.local`; S19 reports only redacted EdUHK settings placement。", "Do not inspect or print secret values; keep `.env.local` out of Git and reports。"],
    ["Non-Git checkout", "`git status` is unavailable, so changed-file reporting is mtime-based and includes generated/local-only artifacts。", "Treat changed-file section as operational scan, not a precise diff。"],
    ["Dev/build contention", "S10/S12/S18 logs and fresh build indicate `.next`/Next server state can become inconsistent under concurrent dev/build/test。", "Use isolated ports, stop stale servers, and run release build from clean generated state。"],
]

test_rows = [
    ["Check", "Result", "Notes"],
    ["Fresh `npm run type-check`", "Pass", "Final TypeScript strict check passed in this automation run。"],
    ["Fresh `npm run test:rag`", "Pass 195/195", "All manifest self-tests and RAG Node tests passed。"],
    ["Fresh `npm run test:question-bank`", "Pass 48/48", "Public question-bank solvability, curriculum scoping, HJB integration, and API scoping tests passed。"],
    ["Fresh `npm run build`", "Fail after compile", "Compiled successfully in 3.7s, then page-data collection failed with missing `.next` Turbopack runtime module。"],
    ["S05 reported `npm run build`", "Pass", "Lesson/auth routing task build passed before later generated-state failure。"],
    ["S12 E2E/backend", "Mixed", "Focused auth scenarios passed; one guest-shell language-toggle timeout; backend suite failed on existing non-auth expectations。"],
    ["S18 live DeepSeek PEP primary", "1200/1200 checked", "1199 pass + 1 review row fixed by option-dedup source change; later question-bank tests passed 48/48。"],
    ["S18 live DeepSeek PEP high", "Hard gates green", "4800/4800 solvable and answer-match; 40 explanation-only P2 rows。"],
    ["S18 live DeepSeek HJB junior", "Review queue", "1361 pass, 139 needs review, 0 P0。"],
    ["S18 BNU v2 hard gate", "Green", "1500/1500 solvable and answer-match; not public-approved yet。"],
]

changed_rows = [
    ["Area", "Representative changed files / artifacts in reporting window"],
    ["App/UI", "app/login/page.tsx; app/register/page.tsx; app/practice/page.tsx; app/lesson/page.tsx; app/lesson/[slug]/page.tsx; app/lesson/LessonEntryClient.tsx; app/visualization-lab/page.tsx; app/change-password/page.tsx; app/forgot-password/page.tsx; app/reset-password/page.tsx"],
    ["Components", "components/home/HeroSection.tsx; components/ui/CurriculumTrackSelector.tsx; components/ui/GradeSelector.tsx; components/layout/Navbar.tsx; components/learning/SubwayNetworkMap.tsx; components/providers/AppProviders.tsx; components/visualizations/ConfiguredVisualizationLab.tsx; components/lesson/LessonView.tsx"],
    ["API/server", "app/api/auth/login/route.ts; app/api/auth/register/route.ts; app/api/auth/password-reset/request/route.ts; app/api/lesson-entry/route.ts; app/api/me/route.ts; app/api/me/settings/route.ts; app/api/teacher/question-generation/route.ts; lib/server/userStore.ts; lib/server/eduhkOpenApi.ts"],
    ["Data/RAG", "data/mainlandHjbRoadmap.ts; data/mainlandPepPrimaryQuestions.ts; data/visualizationLabs.ts; data/rag/mainlandBnuPrimary.ts; data/rag/mainlandBnuPrimaryAssessmentPatterns.ts; data/rag/mainlandBnuJunior.ts; lib/rag/mainlandBnuPrimary.ts; lib/rag/mainlandBnuJunior.ts"],
    ["Scripts/tests/config", "scripts/build-mainland-bnu-primary-manifest.py; scripts/build-mainland-bnu-junior-manifest.py; scripts/build-mainland-bnu-primary-assessment-manifest.py; package.json; types/index.ts; middleware.ts; tests/e2e/*.spec.ts updates; lib/*QuestionBank.test.ts updates"],
    ["Coordination", "coordination/session-logs/2026-05-26-S01/S03/S04/S05/S06/S07/S09/S10/S12/S18/S19.md; coordination/session-logs/2026-05-27-S18.md; 3 blocker reports; 3 decision records; many S18 content-QA artifacts。"],
    ["Secrets/local/generated", "`.env.local` mtime changed but was not read; `.env.local.example` changed. mtime scan also saw `.local`, `.playwright-cli`, `test-results`, `output`, `.next`, `.tmp`, and `.DS_Store` style artifacts; these are not product-source deliverables。"],
]

priority_rows = [
    ["#", "Tomorrow priority"],
    ["1", "Resolve fresh `npm run build` failure from generated `.next` Turbopack runtime state in a quiet build environment。"],
    ["2", "S18 adjudicate HJB junior 139-row queue and BNU v1 40 hard-gate issue rows before any production data edit。"],
    ["3", "S18 finish BNU v2 11 warn-row manual review and decide whether it can proceed to a separate integration proposal。"],
    ["4", "S11/S12 triage backend suite failures and guest language-toggle timeout after formal auth changes。"],
    ["5", "S11 run a multi-role browser matrix for Home/Login/Register/Lesson/Practice/Visualization across EN/zh/zh-Hans and mobile-critical widths。"],
    ["6", "S19 rotate any transient DeepSeek key if production-grade and formalize EdUHK/DeepSeek env placement without logging secrets。"],
]

decision_rows = [
    ["Decision", "Owner action needed"],
    ["Generated build cleanup", "Confirm whether S10 may stop stale Next servers and remove generated `.next` state to rerun production build。"],
    ["BNU v2 integration", "Decide whether to fund an S18/S04/S08/S11 integration task after the 11 warn rows are adjudicated。"],
    ["BNU v1 remediation", "Decide if v1 should be repaired or superseded by v2 for future BNU primary content。"],
    ["HJB junior production posture", "Decide whether current HJB junior V2 remains live while S18 reviews 139 DeepSeek rows, or whether selected rows should be quarantined。"],
    ["PEP high explanation repair", "Approve or defer the narrow repair of 40 S5 rag-v2 explanation-only rows。"],
    ["Teacher question generation", "Decide when S13/S07 should wire EdUHK teacher question-generation route into teacher UI and run live smoke with S19-approved credentials。"],
]


def build_document_xml() -> str:
    parts: list[str] = []
    parts.append(para("MAIS-MVP 每日总裁报告", "Title", align="center"))
    parts.append(para("Daily President Report for Dr. Peter Hu", "Subtitle", align="center"))
    parts.append(table(metadata_rows, [1800, 7560]))

    parts.append(heading("中文执行摘要", 1))
    parts.append(para("本报告窗口有大量 owner-directed 进展，主要集中在 Home/Login/Register 体验、正式 auth/lesson routing、一体化 Visualization Lab、EdUHK question-generation backend、以及 S18 的 RAG/题库质量门控。Fresh `npm run type-check`、`npm run test:rag` 195/195、`npm run test:question-bank` 48/48 均通过。"))
    parts.append(para("最大风险不是 TypeScript 或当前 public question-bank gate，而是发布治理：fresh `npm run build` 在编译后因 `.next` generated Turbopack runtime 缺失失败；多个候选题库仍有 DeepSeek review/adjudication 队列；S12 backend regression 仍需 S11/S12 判断；S18 live model run 使用了 transient key，若为生产级密钥应轮换。"))

    parts.append(heading("English Executive Summary", 1))
    parts.append(para("This reporting window delivered substantial owner-directed progress across Home/Login/Register UX, formal auth and lesson routing, Visualization Lab behavior, EdUHK-backed teacher question-generation infrastructure, and S18 curriculum/content QA. Fresh checks passed for TypeScript, RAG 195/195, and question-bank 48/48."))
    parts.append(para("The release posture is mixed: code type health and deterministic public question-bank gates are green, but the fresh production build fails after compilation because generated `.next` Turbopack runtime state is inconsistent. Candidate content packages must stay gated until S18 adjudicates model review queues and S11/S12 triage auth/backend regression signals."))

    parts.append(heading("报告窗口摘要", 1))
    parts.append(para("窗口：2026-05-26 08:00 至 2026-05-27 08:00 Asia/Hong_Kong。活跃日志包括 S01、S03、S04、S05、S06、S07、S09、S10、S12、S18、S19，并有 2026-05-27 S18 continuation。目录不是 Git repository，因此 changed-file 部分使用 filesystem mtime，并过滤解释为 operational scan。"))

    parts.append(heading("整体项目进展", 1))
    parts.append(para("产品体验方面，首页、登录、注册、Practice、Lesson、Visualization Lab 均有直接用户可见改善。平台方面，auth/registration/password/reset/session behavior 更正式，EdUHK adapter 与 teacher question-generation route 已落地。内容方面，BNU safe-RAG coverage 扩到 P4/P5/S2，PEP/HJB/BNU 题库 QA 进入更严格的 DeepSeek + deterministic 双轨门控。"))
    parts.append(para("当前状态适合继续做 focused QA 和修复，不适合直接宣称 production-ready。Fresh build 需要先修复 generated-state failure；候选题库需要 S18 明确 green decision + owner-authorized integration task；shared files 需要 one-writer coordination。"))

    parts.append(heading("S01-S20 会话状态表", 1))
    parts.append(table(session_rows, [850, 1350, 4300, 2860]))

    parts.append(heading("已完成工作", 1))
    parts.append(table(completed_rows, [1800, 4660, 2900]))

    parts.append(heading("进行中工作", 1))
    parts.append(table(in_progress_rows, [2050, 4210, 3100]))

    parts.append(heading("Blockers", 1))
    parts.append(table(blocker_rows, [2150, 4210, 3000]))

    parts.append(heading("风险", 1))
    parts.append(table(risk_rows, [1900, 4060, 3400]))

    parts.append(heading("测试 / 构建状态", 1))
    parts.append(table(test_rows, [2600, 1700, 5060]))

    parts.append(heading("变更文件摘要", 1))
    parts.append(table(changed_rows, [2000, 7360]))

    parts.append(heading("明日优先级", 1))
    parts.append(table(priority_rows, [700, 8660]))

    parts.append(heading("需要 Owner 决策", 1))
    parts.append(table(decision_rows, [2500, 6860]))

    parts.append(heading("验证说明", 1))
    parts.append(para("本 DOCX 使用 standard_business_brief 风格：US Letter、1 inch margins、Calibri / Microsoft YaHei、固定 DXA 表格、简洁表头。报告生成后应执行 zip archive、OOXML/text extraction 和 render gate 尝试；如本机缺少 LibreOffice/soffice 或渲染依赖，则声明结构/文本验证结果并记录 render caveat。"))

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
  <dc:title>MAIS-MVP 2026-05-27 President Report</dc:title>
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
