from __future__ import annotations

from datetime import datetime, timezone, timedelta
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-05-24-president-report.docx"
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
    props: list[str] = [
        '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/>',
    ]
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
        "<w:p><w:pPr><w:pStyle w:val=\"TableText\"/>"
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
    grid = "<w:tblGrid>" + "".join(f'<w:gridCol w:w="{w}"/>' for w in widths) + "</w:tblGrid>"
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
        '</w:tblBorders>'
        "</w:tblPr>"
    )
    body_rows: list[str] = []
    for row_index, row in enumerate(rows):
        row_props = "<w:trPr><w:tblHeader/></w:trPr>" if row_index == 0 else ""
        body_rows.append(
            "<w:tr>"
            + row_props
            + "".join(cell(value, widths[col], header=(row_index == 0)) for col, value in enumerate(row))
            + "</w:tr>"
        )
    return "<w:tbl>" + props + grid + "".join(body_rows) + "</w:tbl>"


metadata_rows = [
    ["项目", "MAIS-MVP"],
    ["收件人", "Dr. Peter Hu"],
    ["报告窗口", "2026-05-23 08:00 至 2026-05-24 08:00 Asia/Hong_Kong"],
    ["生成时间", GENERATED_AT],
    ["会话", "S10 President report automation"],
    ["证据范围", "AGENTS.md、session logs、coordination reports/content-QA、mtime changed-file scan、fresh safe checks"],
]

session_rows = [
    ["Session", "状态", "本窗口摘要", "检查 / 风险"],
    ["S01", "Completed", "登录/注册课程选择 UI、市场扩展信息、主页四个行动卡、Start Learning 到 /login，以及主页题量统计已更新为 7,485。", "type-check/build/browser checks passed on final homepage stat; earlier UI work有 dev-server hydration caveat。"],
    ["S02", "No fresh log", "Dashboard/progress surface本窗口未见独立日志。", "无新增检查。"],
    ["S03", "Completed with caveat", "完成 Mainland PEP P1-S6 专属 learning-path、primary-roadmap、secondary-roadmap；新增 57 个教材级节点和广州区划语境。", "type-check、question-bank、MVP、zh-Hans strict、build、roadmap QA、CLI smoke passed；长 Playwright spec 仍有本机稳定性 caveat。"],
    ["S04/S08", "Completed", "将 S18-approved high-school RAG-v4 1500 题接入公开 Mainland PEP high-school question aggregate，公共题库总量 7,485。", "qa:mainland-high-rag-v4-public、qa:mainland-high-compare、qa:full-question-bank、test:question-bank 40/40、type-check all passed。"],
    ["S05", "Completed with caveat", "整合/恢复 Mainland PEP lesson artifacts；恢复 primary lesson JSON 以修复 missing module dev build。", "lesson generation/validation and MVP/question/RAG checks passed in log；build/browser曾受本地 Next/.next contention 影响。"],
    ["S06", "Completed with caveat", "Visualization Lab 扩至 100 labs；P1 shape pattern explorer 改为可交互；恢复 stale localhost:3000 visualization route。", "type-check 和 MVP checks passed for catalog；P1 fix仅 TSX syntax pass，完整 browser/type-check一度受本机 CLI stall 影响；最终 route 200/click verified。"],
    ["S07", "Completed", "AI Tutor quota 改为所有 authenticated users 使用统一 AI_TUTOR_TOKEN_LIMIT_5H；默认 200,000,000 tokens/5h。", "type-check passed；未做 live LLM smoke 以避免 quota 消耗。"],
    ["S08", "Covered via S04/S08", "Shared question-bank QA 与 S04 联合作业完成。", "见 S04/S08。"],
    ["S09", "Completed", "更新登录副标题；登录 demo account rows 改为 Mainland/HK/US；新增并重命名 US Student Shirleen / Teacher Scott。", "type-check/build passed；production-mode login API smoke 对新旧账号均 500，需 S12 独立调查。"],
    ["S10", "Completed", "生成 2026-05-23 总裁报告、Mainland PEP question generation summary、修复本地 dev startup、实现 Mainland PEP isolation、完成 DeepSeek RAG access audit，并运行本报告新鲜检查。", "fresh type-check、question-bank 40/40、MVP 24/24、build 86 routes、zh-Hans strict green；fresh test:rag failed on known P5:upper manifest self-test。"],
    ["S11", "Completed / blocked items", "SimpleTex saturation harness、rec-mode A/B、latex_ocr A/B 建立并执行；最终 full latex_ocr vs formula matrix 完成。", "full matrix 184 calls, 181 HTTP 200；latex_ocr 不优于 baseline；provider timeouts/normalization风险仍在。"],
    ["S12", "No fresh log", "无独立 S12 日志；但 S09/S10 跨域触及 auth/storage/API surfaces。", "需接手 login 500、SimpleTex provider-none 分类、durable storage。"],
    ["S13", "No fresh log", "Teacher console无独立日志。", "无新增检查。"],
    ["S14", "No fresh log", "Parent console无独立日志。", "无新增检查。"],
    ["S15", "No fresh log", "Adaptive engine无独立日志；S10 audit发现 Adaptive refresh 未向 DeepSeek 传 RAG evidence。", "需 S15/S07 决定是否实现 bounded RAG evidence injection。"],
    ["S16", "No fresh log", "Research stream本窗口无 fresh mtime 日志。", "无新增检查。"],
    ["S17", "No fresh log", "Gamification/motivation无独立日志。", "无新增检查。"],
    ["S18", "Completed / candidate work remains", "完成大量 Mainland PEP QA：primary/junior/high question QA、high RAG-v4 approval/public gate、7200-row full Mainland bank QA、DeepSeek high candidate remediation、HuJiaoBan/BNU expansion plan、Lesson/Practice activation QA。", "qa rows green for public bank；high DeepSeek remediated 490 rows仍 candidate-only，490 pending teacher signoff，full 2100 generation未完成。"],
    ["S19", "Coordination only", "无独立 S19 日志；S11 提到 SimpleTex UAT/account health coordination。", "SimpleTex quota/API pack/provider reachability仍需 S19/owner确认。"],
    ["S20", "No fresh log", "Game-based learning本窗口无独立日志。", "无新增检查。"],
]

completed_rows = [
    ["领域", "完成内容", "影响"],
    ["Mainland PEP content", "Public question bank now reports 7,485 total questions: 7,200 Mainland PEP rows plus 285 HK baseline; high-school RAG-v4 1,500 rows are public-integrated after S18/S04/S08 green gates.", "Mainland PEP P1-S6 learning/practice coverage moved closer to app-wide release readiness."],
    ["Roadmaps", "Dedicated Mainland PEP roadmap presentation data, Guangzhou-context subway maps, and route behavior were added for logged-in MAINLAND_PEP accounts.", "Students can see curriculum-specific progression rather than generic HK/default maps."],
    ["Lessons/practice", "Mainland PEP Lesson/Practice activation and lesson artifact recovery were completed, with public P1-S6 path checks in S18/S05 logs.", "Mainland accounts can access real 人教版 learning paths while HK/US stay scoped."],
    ["Visualization", "Visualization Lab catalog expanded to 100 labs; P1 shape-pattern module now has visible learner interaction.", "Math visualization surface is broader and less static."],
    ["AI Tutor/RAG", "Quota is unified for authenticated users; S10 confirmed direct AI Tutor API can send safe RAG evidence to DeepSeek v4 pro.", "Quota policy is simpler, but UI/adaptive RAG gaps are now explicit."],
    ["QA/Tooling", "Fresh S10 checks: type-check pass, question-bank 40/40, MVP 24/24, production build 86 routes, zh-Hans strict 0 critical/warnings.", "Final app state compiles despite large cross-session changes."],
]

in_progress_rows = [
    ["对象", "当前状态", "下一步"],
    ["DeepSeek high-school candidate package", "490/2100 rows remediated; 0 row-level blockers, but 490 pending teacher signoff and S5/S6 generation incomplete.", "S18 teacher-level signoff and full package generation before any integration."],
    ["HuJiaoBan / BNU expansion", "S18 created documentation-only safe-ingestion plan; no production behavior changed.", "Wait for owner-provided source set, then inventory/crosswalk/safe-RAG plan."],
    ["RAG evidence in product flows", "Direct AI Tutor API passes criterion with context.evidenceQuery; frontend TutorContext and Adaptive Engine do not.", "S07/S15 design implementation with S19/S18 guardrails if owner approves."],
    ["SimpleTex OCR", "A/B evidence exists; endpoint switch not recommended. Normalization and timeout/provider classification remain open.", "S12/S19/S11 sequence: account health, route resilience, normalization, rerun targeted matrix."],
]

blocker_rows = [
    ["Blocker", "Evidence", "Required action"],
    ["Fresh test:rag failure", "`npm run test:rag` stopped in `scripts/build-mainland-pep-primary-paper-manifest.py` with `KeyError: 'P5:upper'` after earlier manifest self-tests passed.", "Fix primary paper manifest self-test/coverage metadata, then rerun RAG suite."],
    ["SimpleTex provider stability and account health", "S11 saw provider:none/402/connect-timeout phases; final A/B had 3 non-consecutive timeouts.", "S19/owner confirm UAT/API pack; S12 classify/retry timeouts safely."],
    ["AI Tutor UI / Adaptive RAG gap", "S10 audit: Adaptive sends feature pack only; frontend omits evidenceQuery.", "Assign S07/S15 if RAG evidence should reach live DeepSeek from UI/adaptive flows."],
    ["Production storage/env readiness", "Carried from prior reports: durable Postgres/storage and deployment parity remain not proven.", "S12/S19 production storage health and redacted env parity smoke."],
    ["Login API smoke 500", "S09 production-mode smoke returned 500 for both new US demo users and existing HK Student Peter.", "S12 isolate auth/session/local DB or production-mode config issue."],
]

risk_rows = [
    ["Risk", "Why it matters", "Mitigation"],
    ["External quality claims too early", "Deterministic checks are green, but S18 still calls for pass-sample/manual review before broad public claims.", "Complete 189-row pass-sample and relevant human curriculum sampling."],
    ["Cross-scope change density", "Window touched app shell, APIs, storage, RAG, data, lessons, roadmaps, tests, and package scripts.", "S11 should run a formal multi-role regression matrix in a quiet environment."],
    ["Legacy MAINLAND_PEP_HIGH naming", "Internal label now represents broader Mainland PEP compatibility and may confuse future owners.", "Assign S08/S03 cleanup after release pressure drops."],
    ["Generated content dependency", "S05 notes production imports can depend on generated coordination artifacts if folders are cleaned.", "Move production-consumed lesson packs into `data/` through S05/S18/S10 coordination."],
    ["OCR silent wrong accepted", "SimpleTex outputs include star/up-arrow/escaped percent/currency spacing artifacts that can auto-fill incorrectly.", "Normalize/gate risky symbols before further endpoint switching."],
]

test_rows = [
    ["Check", "Result", "Notes"],
    ["Fresh `npm run type-check`", "Pass", "Final state passed after earlier HomePageClient typing blocker was resolved."],
    ["Fresh `npm run test:question-bank`", "Pass 40/40", "Covers Mainland PEP primary/junior/high/public RAG-v4/full-bank gates."],
    ["Fresh `npm run test:mvp`", "Pass 24/24", "MVP route/content invariants remain green."],
    ["Fresh `npm run build`", "Pass", "Next build compiled and generated 86 app routes."],
    ["Fresh `npm run audit:zh-hans:strict`", "Pass", "0 critical, 0 warnings, 3,474 advisory-only items."],
    ["Fresh `npm run test:rag`", "Fail", "Known `P5:upper` KeyError in primary paper manifest self-test."],
    ["S11 SimpleTex A/B", "Completed with warning", "184 direct calls; 181 HTTP 200; no endpoint switch recommended."],
]

changed_rows = [
    ["Area", "Representative changed files in reporting window"],
    ["App/UI", "app/page.tsx; app/login/page.tsx; app/register/page.tsx; app/practice/page.tsx; app/learning-path/page.tsx; app/visualization-lab/page.tsx; components/home/*; components/ui/CurriculumTrackSelector.tsx; components/learning/*; components/visualizations/*; components/lesson/LessonView.tsx"],
    ["API/server", "app/api/ai-tutor/route.ts; app/api/questions/route.ts; app/api/classes/join/route.ts; app/api/teacher/classes/[classId]/students/route.ts; lib/server/userStore.ts"],
    ["Data/RAG", "data/questions.ts; data/lessons.ts; data/mainlandPepPrimaryQuestions.ts; data/mainlandPepJuniorQuestions.ts; data/mainlandPepHighQuestions.ts; data/mainlandPepRoadmap*.ts; data/rag/mainlandPepJunior*.ts; data/topics.ts; data/visualizationLabs.ts"],
    ["Lib/tests/scripts", "lib/questionBankSolvability.ts; lib/fullQuestionBankSolvability.test.ts; lib/mainlandPep*QuestionBank.test.ts; lib/mvpReadiness.test.ts; lib/rag/mainlandPep*.ts; scripts/audit-full-question-bank-solvability.ts; scripts/audit-mainland-high-rag-v4-public-solvability.ts; tests/e2e/*.spec.ts; SimpleTex harnesses"],
    ["Config/docs", "package.json; .env.local.example; coordination/session-logs/*; coordination/reports/*; coordination/content-qa/*"],
    ["Generated/local observed", ".local/next-runner, .playwright-cli logs/screenshots, .DS_Store, local sqlite/WAL files were observed by mtime scan and should not be treated as product-source changes."],
]

priority_rows = [
    ["#", "Tomorrow priority"],
    ["1", "Fix the `test:rag` `P5:upper` primary paper manifest self-test and rerun RAG suite."],
    ["2", "Run S11 release matrix for Mainland/HK/US student and teacher flows, including roadmaps, lessons, practice, AI Tutor, OCR, and mobile where practical."],
    ["3", "Complete S18 manual/pass-sample QA for public Mainland PEP quality claims and high DeepSeek candidate teacher signoff."],
    ["4", "Assign S12/S19/S11 SimpleTex recovery: account health, timeout classification, normalization, then targeted rerun."],
    ["5", "Decide whether S07/S15 should implement RAG evidence injection for AI Tutor frontend and Adaptive Engine."],
    ["6", "Continue durable storage / Vercel env parity work before production enablement."],
]

decision_rows = [
    ["Decision", "Owner action needed"],
    ["Production Mainland PEP enablement", "Confirm whether to move beyond local/demo readiness after S18/S11/S19 gates, and where to set `MAINLAND_PEP_CONTENT_ENABLED=true`."],
    ["RAG in live product flows", "Choose whether direct API-only RAG evidence is sufficient, or assign S07/S15 implementation for UI/adaptive flows."],
    ["SimpleTex investment", "Approve normalization/retry work before any endpoint-switch effort; confirm UAT/API pack health."],
    ["Curriculum expansion", "After providing HuJiaoBan/BNU materials, confirm source inventory scope and publisher identifiers before any app integration."],
    ["Technical cleanup", "Decide whether to rename legacy `MAINLAND_PEP_HIGH` and move production-consumed generated lesson artifacts out of `coordination/`."],
]


def build_document_xml() -> str:
    parts: list[str] = []
    parts.append(para("MAIS-MVP 每日总裁报告", "Title", align="center"))
    parts.append(para("Daily President Report for Dr. Peter Hu", "Subtitle", align="center"))
    parts.append(table(metadata_rows, [1800, 7560]))

    parts.append(heading("中文执行摘要", 1))
    parts.append(para("本报告窗口不是空窗期。MAIS-MVP 的核心进展是 Mainland PEP 从内容建设推进到更完整的 P1-S6 应用级体验：公开题库达到 7,485 题，其中 Mainland PEP 7,200 题，HK baseline 285 题；RAG-v4 high-school 1,500 题已在 S18/S04/S08 绿灯后接入公开 high-school aggregate；主页题量、登录/注册课程体验、专属 roadmap、Lesson/Practice、100 Visualization Labs、AI Tutor quota 和 RAG/DeepSeek 审计都有实质更新。"))
    parts.append(para("最终状态偏向 local/demo readiness green/yellow：fresh type-check、question-bank、MVP、production build、zh-Hans strict 均通过；但 fresh RAG suite 因 primary paper manifest `P5:upper` self-test 失败而不绿。生产就绪仍需解决 durable storage/env parity、SimpleTex provider/normalization、AI Tutor UI/Adaptive RAG evidence gap、S18 manual pass-sample 与 S11 multi-role browser regression。"))

    parts.append(heading("English Executive Summary", 1))
    parts.append(para("This was an active reporting window. MAIS-MVP advanced Mainland PEP from content build-out toward integrated P1-S6 product experience: the public bank now totals 7,485 questions, including 7,200 Mainland PEP questions; the high-school RAG-v4 1,500-question slice is public-integrated after S18/S04/S08 gates; the home count, login/register curriculum UX, dedicated roadmaps, Lesson/Practice activation, 100 Visualization Labs, AI Tutor quota, and DeepSeek RAG audit all moved forward."))
    parts.append(para("Fresh final checks are mostly green: type-check passed, question-bank passed 40/40, MVP passed 24/24, production build generated 86 routes, and zh-Hans strict has 0 critical/warnings. The fresh RAG suite is red because the primary paper manifest self-test raises `KeyError: P5:upper`. Production readiness remains gated by durable storage/env parity, SimpleTex reliability/normalization, AI Tutor UI/Adaptive RAG evidence gaps, manual content QA, and broad browser regression."))

    parts.append(heading("报告窗口摘要", 1))
    parts.append(para("窗口：2026-05-23 08:00 至 2026-05-24 08:00 Asia/Hong_Kong。S10 使用 filesystem mtime 作为 changed-file 依据，因为当前目录不是 Git repository。窗口内未发现 `coordination/blockers/` 实体 blocker report 文件，但 blocker evidence 存在于 S11/S18/S10 session logs 和 QA reports。"))

    parts.append(heading("整体项目进展", 1))
    parts.append(para("Mainland PEP 路线已经从“候选内容与 QA”推进为“可被账号课程 profile 选择、可进入 Lesson/Practice/Roadmap/Home 统计的产品面”。这提高了本地演示完整度，也增加了跨课程隔离、内容质量、浏览器回归和生产环境配置的验证压力。"))
    parts.append(para("AI/LLM 方面，DeepSeek v4 pro live 配置可用，直接 AI Tutor API 能携带 safe RAG evidence；但实际前端 TutorContext 与 Adaptive Engine 还没有把 RAG evidence 送入 live provider。OCR 方面，SimpleTex endpoint A/B 已给出明确方向：不要单纯切到 `latex_ocr`，先修 normalization、wrong-accepted gating 和 provider stability。"))

    parts.append(heading("S01-S20 会话状态表", 1))
    parts.append(table(session_rows, [850, 1350, 4550, 2610]))

    parts.append(heading("已完成工作", 1))
    parts.append(table(completed_rows, [1800, 4360, 3200]))

    parts.append(heading("进行中工作", 1))
    parts.append(table(in_progress_rows, [1900, 4160, 3300]))

    parts.append(heading("Blockers", 1))
    parts.append(table(blocker_rows, [1900, 4460, 3000]))

    parts.append(heading("风险", 1))
    parts.append(table(risk_rows, [1900, 4060, 3400]))

    parts.append(heading("测试 / 构建状态", 1))
    parts.append(table(test_rows, [2500, 1500, 5360]))

    parts.append(heading("变更文件摘要", 1))
    parts.append(table(changed_rows, [1900, 7460]))

    parts.append(heading("明日优先级", 1))
    parts.append(table(priority_rows, [700, 8660]))

    parts.append(heading("需要 Owner 决策", 1))
    parts.append(table(decision_rows, [2500, 6860]))

    parts.append(heading("验证说明", 1))
    parts.append(para("DOCX 生成后将进行 zip archive、OOXML/text extraction 结构检查，并尝试 render gate。若 render tool 因本机缺少 LibreOffice/soffice 或 pdf2image 而失败，本报告只声明结构/文本验证通过，不声明页面级视觉 QA 通过。"))

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
  <dc:title>MAIS-MVP 2026-05-24 President Report</dc:title>
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
