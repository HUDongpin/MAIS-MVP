from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-06-05-president-report.docx"
HKT = timezone(timedelta(hours=8))
NOW_HKT = datetime.now(HKT).strftime("%Y-%m-%d %H:%M HKT")
NOW_UTC = datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def xml_text(text: str) -> str:
    parts: list[str] = []
    for index, part in enumerate(str(text).split("\n")):
        if index:
            parts.append("<w:br/>")
        parts.append(f'<w:t xml:space="preserve">{escape(part)}</w:t>')
    return "".join(parts)


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


def bullet(text: str) -> str:
    return (
        '<w:p><w:pPr><w:pStyle w:val="Normal"/>'
        '<w:ind w:left="720" w:hanging="360"/>'
        "</w:pPr>"
        + run("• ", bold=True)
        + run(text)
        + "</w:p>"
    )


def cell(text: str, width: int, *, header: bool = False) -> str:
    fill = '<w:shd w:fill="F2F4F7"/>' if header else ""
    align = '<w:jc w:val="center"/>' if header else ""
    text_color = "0B2545" if header else "000000"
    text_size = 18 if header else 17
    margins = (
        '<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/>'
        '<w:start w:w="120" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar>'
    )
    cell_para = (
        '<w:p><w:pPr><w:pStyle w:val="TableText"/>'
        + align
        + "</w:pPr>"
        + run(text, bold=header, color=text_color, size=text_size)
        + "</w:p>"
    )
    return (
        "<w:tc><w:tcPr>"
        f'<w:tcW w:w="{width}" w:type="dxa"/>'
        + margins
        + fill
        + "</w:tcPr>"
        + cell_para
        + "</w:tc>"
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
    ["报告日期", "2026-06-05"],
    ["报告窗口", "2026-06-04 08:00 至 2026-06-05 08:00 Asia/Hong_Kong"],
    ["报告会话", "S10 / Automation mais-mvp-9-am-president-report"],
    ["生成时间", NOW_HKT],
    ["格式预设", "standard_business_brief: Calibri 11pt, restrained tables, simple executive-report layout"],
]

session_rows = [
    ["会话", "状态", "本窗口活动", "关注点 / 下一步"],
    ["S01", "完成", "登录移动端修复、favicon透明背景、BNUP登录标签清理、登录表单pre-hydration安全、learner setup全局gate与API持久化。", "type-check与桌面/移动Playwright验证通过；`npm run build`在默认`.next` page-data阶段遇到既有runtime生成物问题。"],
    ["S02", "完成", "Adaptive Learning去装饰线、默认头像改为mascot、Dashboard Galaxy/Lab快捷入口、学生assignment list/detail canonical route。", "type-check通过；assignment route build通过；继续关注assignment detail与teacher API契约。"],
    ["S03", "完成", "`/learning-path`简化为学生日常路径；roadmap迁移到`/student/roadmap*`并保留legacy 308。", "type-check/build/HTTP redirect smoke通过；旧route仅保留redirect常量与测试。"],
    ["S04", "完成/部分受限", "CA/NC live seed topics/questions、Practice Skill Radar、California Math Practice Beta polish、人教版小学Practice图片临时gate。", "type-check通过；CA beta full submission smoke被learner setup overlay限制；PEP图片gate为保护性措施，不是内容修复。"],
    ["S05", "完成/阻塞记录", "Lesson Nova Lens移动修复、BNU logarithm渲染、Lesson Galaxy默认/route迁移、新学生默认第1单元、进入星球收起Galaxy、California lesson readiness报告。", "多项type-check/browser/isolated build通过；California lesson layer因缺app-ready lesson package继续阻塞。"],
    ["S06", "完成", "Visualization persistence GET、all-labs compact目录、`/student/tools/visualizations` route migration。", "type-check/build/route smoke通过；backend-api一次失败归因AI/adaptive/teacher外部问题。"],
    ["S07", "完成/计划输出", "AI Tutor reply voice UX、guest auth messaging、mobile mic错误提示、Qwen ASR/realtime speech plan。", "type-check部分通过；一次后续type-check被无关userStore错误阻塞；真实设备扬声器与Qwen ASR实现仍待。"],
    ["S08", "完成", "共享MathText normalizer补齐大量LaTeX/裸TeX修复，覆盖Practice与Lesson显示。", "18,878 Practice题与325 Lesson seed渲染审计清零；type-check和浏览器smoke通过。"],
    ["S09", "完成（报告）", "California middle-school textbook review route的三语copy、caption、alt text审查。", "PASS_FOR_REVIEW_LAYOUT_WITH_RELEASE_CAVEATS；最终学生release仍需按语言设置分离alt数据并处理英文图片标签。"],
    ["S10", "完成/协调", "生成上一日总裁报告；AGENTS扩展S21/S22；P1 hydration/live-classroom hotfix；AI/provider follow-up；California Beta边界、正式kickoff、CA textbook review layout integration。", "本次S10未改feature code；继续担任report/release-boundary协调。"],
    ["S11", "完成/QA门禁", "生产Practice、生产AI voice、login/mobile、parent/teacher/student P0/P1、adaptive 500-student、Practice mobile fix、California E2E、CA textbook layout regression。", "CA covered desktop flow通过；full release matrix仍未完成；部分早期P1已由S01/S12/S13/S22修复或隔离。"],
    ["S12", "完成", "Lesson-progress stale response、userStore type status、US unavailable fallback、backend regression fixes、Student Shirleen duplicate login、middleware host、student assessment plural route。", "type-check/build/targeted E2E多项通过；部分plain build失败指向默认`.next`状态，不是route代码。"],
    ["S13", "完成/大型实现", "Teacher free-paper builder、assessment analysis、prep toolchain、assignment correction loop、live classroom tools、teacher canonical routes、review lessons、home-school operations、mobile overflow修复。", "多次type-check/build/targeted tests通过；provider latency、default`.next`稳定性、完整E2E仍需S11/S22跟进。"],
    ["S14", "无新日志", "本窗口未发现S14 fresh session log。", "家长端变更主要由S11/S12/S13覆盖；未来UI调整需S14接回。"],
    ["S15", "完成", "100-student simulation和adaptive P1修复；challenge strictness要求Challenge/Exam题，500-student scan无bad challenge。", "`npm run test:analytics` 23/23、type-check通过；HK部分年级与US当前内容仍缺Challenge/Exam覆盖。"],
    ["S16", "无新日志", "本窗口未发现S16 research fresh log。", "无learning-science新决策。"],
    ["S17", "无新日志", "本窗口未发现S17 gamification fresh log。", "Reward economy未变更。"],
    ["S18", "大量完成/多gate", "BNU junior DeepSeek full QA、California packs QA/launch gap、PEP lesson/Practice illustration audits、PEP exact-layer 6,624行全review、HK supplement、Arkansas G6-G12 approval等。", "BNU junior仍blocked；TX G6-G8仍blocked；PEP exact-layer虽5,956行approved但未public packaging/未student-visible。"],
    ["S19", "完成", "Assignment OCR/AI live smoke、SimpleTex transient retry与redacted diagnostics、teacher assignment creation LLM API配置。", "DeepSeek/Qwen/SimpleTex/Mathpix可达；`.env.local`仅本地配置且未读取/记录密钥；SimpleTex仍有transient risk。"],
    ["S20", "完成", "Game route迁移到`/student/practice/games/[gameSlug]`，legacy `/practice/*` redirects。", "type-check与HTTP checks通过；Fishing Playwright被learner setup gate阻挡，需S11/S20更新setup flow。"],
    ["S21", "进行中/候选产物", "US CA high-school、NC K-G5/HS、NY K-G5、TX/AR/HK等illustration/textbook candidate packages；06-05继续NC K-G5 batch。", "全部candidate-only；不得视为S18 final approval或live integration。"],
    ["S22", "完成/Release reliability", "PEP illustration wiring release check、backend E2E per-run isolation、California E2E isolated support。", "type-check/build/question-bank/targeted Playwright通过；建议parallel E2E继续用unique port/dist/db roots。"],
]

completed_rows = [
    ["领域", "完成内容", "主要证据 / 检查"],
    ["学生入口与UI", "登录移动端、pre-hydration安全、learner setup gate、dashboard shortcuts、student assignment routes、roadmap/lesson/game/visualization canonical routes均有进展。", "S01/S02/S03/S05/S06/S20 type-check、build、HTTP smoke、Playwright probes多项通过。"],
    ["Practice Beta", "California Math Practice Beta covered desktop authenticated flow通过：teacher assignment创建、student dashboard/adaptive/practice、answer feedback、assignment submit/review。", "S11/S22 California E2E: 1/1 pass；仍不是full release signoff。"],
    ["Teacher Platform", "教师端新增free paper builder、analysis、prep toolchain、assignment correction、live tools、review lessons、operations与移动overflow修复。", "S13多次`npm run type-check`、targeted unit/E2E、isolated/default builds通过；完整矩阵未跑完。"],
    ["Parent/Backend", "Parent API权限/载荷guardrails、duplicate username login、middleware host、student assessment plural route、lesson progress response等修复。", "S12 type-check、backend tests、targeted Playwright/build/API smoke通过。"],
    ["AI/OCR Provider", "AI reply voice UX、SimpleTex retry、DeepSeek assignment grading、Qwen vision fallback、Mathpix reachability、teacher assignment LLM route完成。", "S19 live smoke显示DeepSeek/Qwen/SimpleTex/Mathpix可达；S07语音UI仍需真实设备听感/Qwen ASR实现。"],
    ["Math Rendering", "Practice/Lesson LaTeX渲染审计修复，裸log、frac、sqrt、exponent等case清零。", "S08 exhaustive audit: 18,878 Practice questions + 325 Lesson seeds；type-check/browser smoke通过。"],
    ["Content QA", "California八个candidate packs QA approved；选定CA 3,000题首发lane；PEP exact-layer 6,624行review完成；Arkansas G6-G12 candidate release handoff approved。", "S18 package-local audits、manual decisions、RAG/type/question checks；多项仍candidate-only。"],
    ["Release Engineering", "S22确认PEP asset failure为port collision非产品问题；backend E2E隔离路径落地；California E2E用isolated run pass。", "`npm run build`、`npm run test:backend`、PEP lesson Playwright、California E2E passed。"],
]

in_progress_rows = [
    ["对象", "当前状态", "下一步"],
    ["BNU junior lessons", "DeepSeek full QA completed but 77 P0/P1 remediation rows remain; package remains review-only。", "S21/S18 need transient DeepSeek V4 Pro env rerun after deterministic remediation and Phoebe/manual acceptance。"],
    ["Texas G6-G8", "1,500 inventory exists but audit FAIL: 807 P1, 693 P2; 816 scoped repair targets。", "S19/owner provide runtime DeepSeek key; S21 repair; S18 manual review and final decision。"],
    ["California Practice Beta", "S18 approved selected 3,000-question candidate lane and S11 covered desktop flow pass。", "S04/S08 production integration and S11 mobile/browser/filter/copy matrix before full signoff；Kindergarten gate unresolved。"],
    ["California lesson/textbook layer", "Review route exists and passes layout checks, but S18 blocks final student lesson/textbook release。", "Repair chapter-specific worked examples/practice, validate answers, rerun S09/S11/S18。"],
    ["PEP question illustrations", "5,956 exact-layer rows approved pending packaging; 668 not approved; approval list remains empty and gate active。", "S21 package only approved rows; S04/S08/S11 integrate/test after owner assignment。"],
    ["Teacher platform release", "Large feature expansion compiles in targeted checks, but full release matrix and provider latency checks incomplete。", "S11/S22 schedule broad teacher/parent/student regression in isolated quiet window。"],
    ["S21 illustrations", "Multiple region/grade candidate packages generated or in progress。", "Keep under `coordination/content-qa/`; require S18/S09 review before public/live use。"],
]

blocker_rows = [
    ["Blocker", "Evidence", "Required action"],
    ["BNU junior lesson package blocked", "DeepSeek full QA: 315 sections, 75 P0 + 2 P1, 77 remediation rows, 201 manual-review rows。", "Do not integrate; rerun DeepSeek smoke/full after remediation and S18/Phoebe acceptance。"],
    ["Texas G6-G8 not approved", "S21/S18 blocker: audit FAIL, 807 P1 + 693 P2, all manual decisions pending。", "Runtime DeepSeek repair + local QA + manual workflow before any release。"],
    ["California lesson layer blocked", "S18 final review: review layout only; generated examples/practice reuse mismatched templates。", "Build app-ready lesson modules with chapter-specific examples and validated practice。"],
    ["PEP question illustration gate closed", "`mainlandPepQuestionIllustrationApprovals` remains empty; all PEP question assets hidden from Practice।", "Package approved rows and add promptHash-backed approval records only after S18/S21/S04/S11 path。"],
    ["Default `.next` generated-output instability", "Multiple sessions saw default `.next` missing manifest/chunk/page-data failures while isolated dist builds passed。", "S22 continue release-harness cleanup; avoid interpreting default-cache failures as product bugs without isolated rerun。"],
    ["Full release matrix incomplete", "S11 California desktop pass only; mobile/browser/filter/copy/lesson route coverage not complete。", "Run targeted release matrix before public signoff。"],
    ["Kindergarten launch gate unresolved", "Owner acknowledged need to decide K include/exclude, but no final decision。", "Decide K vs Grade 1-12 wording before California public launch copy/grade selector integration。"],
]

risk_rows = [
    ["Risk", "Why it matters", "Mitigation"],
    ["Very dirty worktree", "Current `git status --short` count is 3,165 entries; many sessions touched shared files。", "Review by session scope; avoid broad revert/stage/commit until owner chooses release package。"],
    ["Huge mtime artifact surface", "Window scan found 33,259 files, including 14,405 public question illustration files and 11,024 content-QA files。", "Separate source changes from candidate assets/local scratch; update ignore/deploy hygiene。"],
    ["Secrets hygiene", "S19 touched `.env.local` for local provider config; report did not read values。", "Keep real secrets out of Git/logs/reports; rotate only if owner confirms exposure risk。"],
    ["Static asset weight", "PEP and textbook image packages can inflate Vercel upload/runtime payload。", "Lazy load; package only approved rows; keep candidate assets out of public unless needed。"],
    ["Provider latency/transience", "SimpleTex had transient fetch failure; assignment grading previously timed out but latest smoke passed。", "Use redacted diagnostics, retry budgets, and fallback provider order。"],
    ["Candidate approval semantics", "S18 approvals often mean candidate handoff, not live production approval。", "Reports and product copy must preserve candidate/review/beta wording。"],
]

test_rows = [
    ["Check", "Result", "Notes"],
    ["Fresh S10 `npm run type-check`", "Passed", "Run at 2026-06-05 report time on current tree。"],
    ["Fresh S10 `npm run test:analytics`", "Passed 23/23", "learningAnalytics + adaptiveLearning tests。"],
    ["Fresh S10 `npm run build`", "Not run", "Report-only task; many logs already include successful builds and known default `.next` caveats。"],
    ["S11/S22 California E2E", "Passed 1/1", "Desktop authenticated California Practice Beta flow; not full signoff。"],
    ["S22 PEP assets", "Passed", "type-check, build, asset localization audit, question-bank, PEP primary lessons desktop/mobile Playwright all passed。"],
    ["S13 teacher checks", "Mostly passed", "type-check/build/targeted tests passed repeatedly; some broader suites not run or blocked by unrelated default output issues。"],
    ["S18 content checks", "Mixed by package", "California/Arkansas/PEP exact layer advanced; BNU and TX G6-G8 remain blocked。"],
    ["S19 provider smoke", "Passed for sampled providers", "DeepSeek assignment, Qwen vision, SimpleTex rerun, Mathpix endpoint reachable; no secrets logged。"],
]

changed_rows = [
    ["Area", "Files changed in HKT window", "Notes"],
    ["Total mtime scan", "33,259 files", "Excludes `.git`, `node_modules`, `.next`, `.tmp`, `test-results`; still includes many local/candidate outputs。"],
    ["Current Git status", "3,165 entries", "Large dirty tree; this report did not stage, commit, branch, merge, push, delete, or revert。"],
    ["public/question-illustrations", "14,405 files", "Mainland PEP generated question-illustration SVG/PNG expansion; student visibility still gated。"],
    ["coordination/content-qa", "11,024 files", "S18/S21 packages, review batches, QA reports, exact-layer renders, candidate images。"],
    ["local scratch outputs", "tmp 4,577; private 1,113; output 556", "Generated verification/deployment/test artifacts; release hygiene risk。"],
    ["app/api", "64 files", "Teacher, parent, auth, assignment, classroom, AI tutor, visualization-session route families。"],
    ["app/teacher", "40 files", "Teacher console pages, canonical routes, operations/prep/live/assessment surfaces。"],
    ["tests/e2e", "38 files", "Backend, California, teacher/parent, visualizations, practice, games, route updates。"],
    ["coordination/reports", "38 files", "QA reports, boundary docs, release diagnostics, previous president report。"],
    ["lib/rag", "31 files", "Illustration text-match standard added to regional RAG evidence flows。"],
    [".env.local", "1 local-only file", "Touched by S19 local config; secret values were not read or printed。"],
]

priority_rows = [
    ["#", "明日优先级"],
    ["1", "Freeze broad feature expansion and run S11/S22 release matrix in isolated quiet window。"],
    ["2", "Resolve active content blockers: BNU junior rerun gate and Texas G6-G8 repair/manual QA。"],
    ["3", "Decide California Kindergarten include/exclude and then finish Practice Beta production integration path。"],
    ["4", "Package only S18-approved PEP exact-layer rows; keep all not-approved rows hidden。"],
    ["5", "Run provider live smoke on production/preview with redacted evidence and no secret output。"],
    ["6", "Clean deployment/package hygiene for public images, candidate assets, and local scratch outputs。"],
    ["7", "Stabilize full teacher/parent/student E2E matrix after S13/S12/S22 changes。"],
]

decision_rows = [
    ["Decision", "Owner action needed"],
    ["California Kindergarten gate", "Choose K included or first launch is Grade 1-12; affects copy, grade selector, QA matrix。"],
    ["Content promotion", "Confirm whether selected CA 3,000-question lane should enter live integration now。"],
    ["BNU/TX provider rerun", "Approve/prepare transient DeepSeek V4 Pro runtime for S18/S21 reruns without logging secrets。"],
    ["PEP illustration scope", "Decide whether to package 5,956 approved exact-layer rows now or wait for smaller pilot。"],
    ["Release target", "Choose whether next deploy is preview-only or production candidate; current dirty tree is very broad。"],
    ["Provider secrets", "Confirm no rotation is needed, or ask S19 to rotate any key that may have been exposed outside safe env storage。"],
]


def build_document_xml() -> str:
    parts: list[str] = []
    parts.append(para("MAIS-MVP 每日总裁报告", "Title", align="center"))
    parts.append(para("Daily President Report for Dr. Peter Hu", "Subtitle", align="center"))
    parts.append(table(metadata_rows, [1800, 7560]))

    parts.append(heading("中文 Executive Summary", 1))
    parts.append(para("本窗口是一个高产、复杂、但必须谨慎控盘的工作日。S01-S13/S15/S18-S22多条线同时推进：学生入口、Practice Beta、Teacher Platform、Parent/API、AI/OCR provider、Visualization、Games、Content QA和Release Engineering都有实质产出。Fresh S10 checks显示当前树`npm run type-check`通过，`npm run test:analytics` 23/23通过。"))
    parts.append(para("关键结论：California Math Practice Beta已具备一条桌面端认证流程的通过证据，且S18已经选择并批准3,000题candidate lane用于后续集成；但这仍不是完整release signoff。BNU junior lessons和Texas G6-G8仍blocked，California lesson/textbook layer仍blocked，PEP question illustrations仍gate关闭。"))
    parts.append(para("今天的管理重点应从“继续扩大功能和内容”转向“封装、隔离、验证、发布控制”：先做release matrix、provider live smoke、content gate closure、deployment hygiene和owner decisions，再考虑更多生成内容或新功能。"))

    parts.append(heading("English Executive Summary", 1))
    parts.append(para("This was a high-output, high-complexity window. Many workstreams advanced at once: student entry, Practice Beta, Teacher Platform, Parent/API hardening, AI/OCR providers, visualizations, games, content QA, and release engineering. Fresh S10 checks passed on the current tree: `npm run type-check` and `npm run test:analytics` passed 23/23."))
    parts.append(para("The main management conclusion is not to treat the current tree as release-ready by default. California Math Practice Beta has a passing covered desktop flow and a selected 3,000-question candidate lane, but full signoff still needs mobile/browser/filter/copy coverage and owner decisions. BNU junior, Texas G6-G8, California lesson layer, and PEP public illustration packaging remain gated."))

    parts.append(heading("报告窗口摘要", 1))
    parts.append(para("报告窗口：2026-06-04 08:00 至 2026-06-05 08:00 Asia/Hong_Kong。活跃日志覆盖S01、S02、S03、S04、S05、S06、S07、S08、S10、S11、S12、S13、S15、S18、S19、S20、S21、S22；S09虽无session log但有copy/accessibility review report；S14/S16/S17无fresh log。"))
    parts.append(para("本窗口新增/修改的coordination证据非常多，尤其是S18/S21 content-QA和S11/S22 release QA artifacts。`coordination/decisions/`未发现本窗口fresh decision record；owner decisions主要记录在S18/S10 session logs和reports中。"))

    parts.append(heading("整体项目进展", 1))
    parts.append(para("项目已从早期学生MVP扩展成一个包含学生、教师、家长、AI Tutor、OCR、可视化、游戏、美国/中国/HK内容QA和release engineering的多域系统。今天最明显的进展是：Teacher Platform功能深度快速增加；California Practice Beta从候选内容进入可测流程；PEP exact-layer review完成全量6,624行；backend/release harness isolation明显改善。"))
    parts.append(para("同时，工作树和候选资产规模显著膨胀。当前不是做大范围生产发布的理想时刻，除非先冻结范围并由S11/S22跑完隔离矩阵。建议明天把“可上线证据”作为主线，而不是继续堆叠更多候选内容。"))

    parts.append(heading("S01-S22 会话状态表", 1))
    parts.append(table(session_rows, [780, 1180, 4450, 2950]))

    parts.append(heading("已完成工作", 1))
    parts.append(table(completed_rows, [1800, 5140, 2420]))

    parts.append(heading("进行中工作", 1))
    parts.append(table(in_progress_rows, [2100, 4500, 2760]))

    parts.append(heading("Blockers", 1))
    parts.append(table(blocker_rows, [2300, 4550, 2510]))

    parts.append(heading("风险", 1))
    parts.append(table(risk_rows, [2200, 4300, 2860]))

    parts.append(heading("测试 / 构建状态", 1))
    parts.append(table(test_rows, [2300, 1700, 4860]))

    parts.append(heading("Changed Files", 1))
    parts.append(table(changed_rows, [2500, 2100, 4760]))

    parts.append(heading("明日优先级", 1))
    parts.append(table(priority_rows, [650, 8710]))

    parts.append(heading("Owner Decisions Needed", 1))
    parts.append(table(decision_rows, [2600, 6760]))

    parts.append(heading("报告备注", 1))
    parts.append(bullet("本报告未读取、打印或写入真实`.env.local`密钥值。"))
    parts.append(bullet("本报告未改feature code；仅生成DOCX报告和S10日志/automation memory。"))
    parts.append(bullet("DOCX使用standard_business_brief预设：US Letter、1 inch margins、Calibri 11pt、fixed-width tables、简洁商务版式。"))

    sect = (
        "<w:sectPr>"
        '<w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>'
        "</w:sectPr>"
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(parts)
        + sect
        + "</w:body></w:document>"
    )


STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:before="0" w:after="120"/><w:jc w:val="center"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="0B2545"/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="180"/><w:jc w:val="center"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:color w:val="53657D"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="320" w:after="160" w:line="264" w:lineRule="auto"/><w:keepNext/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="2E74B5"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="120" w:line="264" w:lineRule="auto"/><w:keepNext/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="2E74B5"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="80" w:line="264" w:lineRule="auto"/><w:keepNext/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:color w:val="1F4D78"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="0" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr></w:style>
</w:styles>"""


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""


ROOT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""


DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""


CORE = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>MAIS-MVP 2026-06-05 President Report</dc:title>
  <dc:creator>Codex S10 Automation</dc:creator>
  <cp:lastModifiedBy>Codex S10 Automation</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{NOW_UTC}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{NOW_UTC}</dcterms:modified>
</cp:coreProperties>"""


APP = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>MAIS</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>1.0</AppVersion>
</Properties>"""


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUT, "w", ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", CONTENT_TYPES)
        docx.writestr("_rels/.rels", ROOT_RELS)
        docx.writestr("word/_rels/document.xml.rels", DOC_RELS)
        docx.writestr("word/document.xml", build_document_xml())
        docx.writestr("word/styles.xml", STYLES)
        docx.writestr("docProps/core.xml", CORE)
        docx.writestr("docProps/app.xml", APP)
    print(OUT)


if __name__ == "__main__":
    main()
