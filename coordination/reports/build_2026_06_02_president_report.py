from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-06-02-president-report.docx"
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
    ["报告日期", "2026-06-02"],
    ["报告窗口", "2026-06-01 08:00 至 2026-06-02 08:00 Asia/Hong_Kong"],
    ["报告会话", "S10 / Automation mais-mvp-9-am-president-report"],
    ["生成时间", NOW_HKT],
    ["证据范围", "AGENTS.md、automation memory、S01-S20 session logs、blockers、decisions、reports、changed-file scan、fresh checks"],
]

session_rows = [
    ["会话", "状态", "本窗口活动", "关注点 / 下一步"],
    ["S01", "Completed", "修复移动首页 PedaNova card overlay；诊断并修复 Lesson nav 灰色/disabled 状态，新增 fast `/api/me?includeLessonEntry=false` 和 E2E regression。", "关注 deployed/WebView cache 与 unrelated GradeId typing carryover；当前 fresh type-check 已通过。"],
    ["S02", "No fresh log", "无 dashboard/progress implementation log。", "S11 发现 dashboard analytics contract red；需判断测试陈旧还是 UI 缺失。"],
    ["S03", "No fresh log", "无 roadmap/curriculum roadmap log。", "Backend publisher switching failure 需 S03/S12/S18 协调。"],
    ["S04", "No fresh log", "无 Practice/Mistake Book implementation log。", "Practice free-selection filter/round start failure需复现；S18 generated banks 不能直接导入。"],
    ["S05", "Completed", "实现 Lesson text/practice-question selection to AI Tutor；更新 Professor Nova 文案；新增 Nova Lens selection onboarding 和 figure help buttons。", "Nova Lens visual browser QA 被本地 `.next` 生成状态阻塞；需健康 dev/build 后补测。"],
    ["S06", "Completed", "修复 Visualization Lab stage/title/card overlap；恢复多类 SVG graph grids、x/y axes、axis labels、ticks。", "S11 后续发现 all-labs/capstone visibility regression，需要再跟进。"],
    ["S07", "No fresh log", "无 AI Tutor provider/session log。", "S11 live matrix 仅 9/81 success，需 S07/S19 优先处理 fallback 行为。"],
    ["S08", "Completed", "新增 HK EASE shared safe RAG layer、retrieval、evidence-pack wiring 和 tests；UP/EPH shared layer passed。", "Row-level EASE ingestion/display 仍需 S18 source-distance 决策。"],
    ["S09", "No fresh log", "无 copy/i18n/accessibility log。", "Duplicate accessible headings、Teacher copy contract、Chinese terminology review需后续。"],
    ["S10", "Completed", "生成 2026-06-01 president report；本次 automation 生成 2026-06-02 report。", "只写 reporting artifacts；不改 feature code。"],
    ["S11", "Completed / defects filed", "新增 Visualization Lab stress spec；389/389 desktop/mobile passed。PEP primary data/API stress passed。学生端 robustness suite 产出多项 P1/P2 defects。", "下一步应转 release-readiness matrix 和 artifact retention wrapper。"],
    ["S12", "No fresh log", "无 backend/API owner log。", "Backend repeat 4 failures x5 repeats：publisher、grade、lesson completion、admin storage health。"],
    ["S13", "No fresh log", "无 Teacher Console implementation log。", "Teacher/student wording mismatch需 S13/S11 判断。"],
    ["S14", "No fresh log", "无 Parent Console implementation log。", "Register role default failure需 S14/S11 判断。"],
    ["S15", "No fresh log", "无 adaptive-engine log。", "Adaptive LLM timeout 和 lesson/adaptive completion state需 S15/S05/S12。"],
    ["S16", "No fresh log", "无 research log。", "无 research-only activity。"],
    ["S17", "No fresh log", "无 gamification architecture log。", "Game rewards/coins 若后续修改需 S17/S20 coordination。"],
    ["S18", "Mixed: many completed, several blocked", "完成大量 content QA / generated package / RAG / illustration work；包括 HK UP safe RAG、US state packages、HJB high V2 default、PEP illustrations、Mainland PEP stress。", "多项 candidate-only 包仍不得集成；DeepSeek credential/transport blockers需 S19/owner。"],
    ["S19", "In progress + analysis completed", "开始 Qwen primary / DeepSeek preserve local env config；完成 SimpleTex/OCR 90% feasibility analysis。", "需要 redacted smoke、key rotation、no-secret env parity；90% OCR claim尚无统计证据。"],
    ["S20", "No fresh log", "无 game-based learning log。", "Adventure Island redirect 与 Fishing heading issue需 S20/S11/S09。"],
]

completed_rows = [
    ["领域", "完成内容", "主要证据 / 检查"],
    ["Home / Navigation", "S01 修复移动 PedaNova card 渐变遮罩问题；Lesson nav 不再在 session resolution 时灰掉。", "mobile Playwright checks passed；targeted Lesson nav E2E passed；`npm run build` passed。"],
    ["Lesson + AI Tutor UX", "S05 完成 selected text/question -> Nova AI Tutor context；新增 Nova Lens onboarding 与 image help buttons。", "`npm run type-check`/`npm run build`/lesson-ai-selection E2E passed；Nova Lens browser visual QA blocked。"],
    ["Visualization Lab", "S06 修复布局碰撞并增强 graph-like labs axes/grids；S11 增加 389-lab stress coverage。", "S06 browser sweeps passed；S11 desktop/mobile stress 389/389 passed。"],
    ["HK EASE RAG", "S08 加入 HK_EASE_SHARED 安全问题/图像 pattern cards，并接入 HK evidence pack。", "`npm run test:rag` 252/252 passed；`npm run type-check` passed。"],
    ["QA / Release evidence", "S11 完成 Visualization Lab stress、PEP primary practice data/API stress、student robustness defect report、SimpleTex saturation preflight report。", "Final build/type-check in S11 run passed；student suite exposed deterministic red gates。"],
    ["Content QA / RAG", "S18 完成 HK UP Chinese/English textbook/resource safe RAG、US CA/NC/TX/AR candidate packages、HJB high V2 default production-bank switch、Mainland PEP secondary content stress、6643 PEP question illustrations。", "多次 `npm run type-check`/`npm run test:rag` passed；HJB high `test:question-bank` 66/66 passed；HJB build passed。"],
    ["API env / OCR", "S19 分析 Qwen/DeepSeek local provider env；评估 SimpleTex/OCR 是否可宣称 90%。", "Focused compiled OCR tests 12/12 passed；SimpleTex dry-run env ready但 live benchmark未跑。"],
]

in_progress_rows = [
    ["对象", "当前状态", "下一步"],
    ["AI Tutor live quality", "S11 live matrix: 9/81 success，72 fallback；status endpoint live但质量 gate red。", "S07/S19 诊断 provider fallback/context-summary fallback；matrix green 前不要跑 180-request soak。"],
    ["Backend/API repeat failures", "S11 backend repeat 20/20 failed，同 4 项失败重复 5 次。", "S12 优先修 curriculum publisher、grade/session、lesson completion、admin storage authorization。"],
    ["Lesson/adaptive completion", "Lesson completion API/前端 adaptive summary 不一致，lesson status stays `in-progress`。", "S05/S12/S15 统一 completion state contract。"],
    ["Practice free-selection", "Desktop/mobile free-selection path 在 filter/answer transition 后无法稳定启动 expected round。", "S04 在隔离环境复现并修复或更新 QA contract。"],
    ["S18 generated content", "多个 QA-clean package 仍是 candidate-only；CA G6-G8 DeepSeek pack 仍有 Codex/DeepSeek non-PASS rows和 manual review pending。", "S18 先完成 repair/adjudication；S04/S11 不应提前集成。"],
    ["S19 provider env", "Qwen primary configuration仍在进行；`.env.local` local-only secret file 有变更。", "只做 redacted smoke；owner 应轮换聊天中暴露过的 key。"],
]

blocker_rows = [
    ["Blocker", "Evidence", "Required action"],
    ["Local Next generated artifacts", "多轮 browser/dev/build smoke 出现 `.next` manifest/runtime ENOENT；S11/S05 browser checks受阻。", "S10/S12 在安静窗口清理/再生成 `.next`，然后 rerun build/browser smoke。"],
    ["AI Tutor live fallback", "S11 AI Tutor role/language matrix 9/81 success，72 fallback。", "S07/S19 排查 provider、prompt/context summary、env parity。"],
    ["Adaptive LLM timeout", "S11 adaptive LLM live canary 30s timeout。", "S15/S07/S19 检查 latency、provider、guardrails。"],
    ["SimpleTex saturation blocked", "S11 SimpleTex live saturation 0 OCR calls；preflight detected concurrent local process。", "安静窗口 rerun，避免消耗配额前环境不干净。"],
    ["HK UP junior DeepSeek package", "S18 package 465/1500 generated；DeepSeek transport `terminated` even at concurrency 1。", "S19/provider 检查 transport；owner 批准后继续同 route 或改 stop condition。"],
    ["Texas K-G5 DeepSeek package", "S18 1480/1500 generated，final Grade 5 batches blocked by response-read/transport failure。", "用 rotated runtime key 与 low concurrency resume，再跑 solvability/manual/final audit。"],
    ["Provider credentials missing", "S18 AR G6-G12、TX G6-G8、CA high-school v5 packages prepared but blocked by absent runtime DeepSeek key。", "S19 配置 key as runtime env only；不要写入 logs/files。"],
    ["BNU junior lesson DeepSeek QA", "QA runner refused configured DashScope endpoint because gate requires DeepSeek V4 Pro。", "配置 approved DeepSeek endpoint/model，或 owner 批准改 gate。"],
]

risk_rows = [
    ["Risk", "Why it matters", "Mitigation"],
    ["Large changed-file surface", "窗口内约 13,286 public illustration files、4,932 coordination artifacts、多个 app/data/lib/test edits。", "分 session ownership review；不要一次性 release。"],
    ["Candidate content mistaken as production", "大量 generated banks/textbooks are QA artifacts, not live `data/questions.ts` integration。", "所有导入必须另开 S04/S18/S11 assignment。"],
    ["Provider secret hygiene", "S18/S19 logs note key was exposed in chat; `.env.local` changed local-only。", "Rotate keys；只记录 variable presence/status，不记录 values。"],
    ["Deployment package size", "新增/既有 public static assets 可能继续推高 deployment archive size。", "测量 Vercel package；必要时 CDN/object storage 或 asset slimming。"],
    ["QA contract drift", "Dashboard、register role、teacher wording、Visualization capstone、Adventure redirect等可能是产品变更或测试陈旧。", "S11 与对应 owner 做 rebaseline vs bug decision。"],
    ["OCR accuracy claim", "S19 认为当前证据不足以承诺 broad 90% exact recognition。", "建立 100-300 labeled handwriting benchmark 后再 claim。"],
]

test_rows = [
    ["Check", "Result", "Notes"],
    ["Fresh report-owner `npm run type-check`", "Pass", "2026-06-02 automation run；当前 checkout TypeScript check green。"],
    ["Fresh report-owner `npm run test:analytics`", "Pass 21/21", "Learning analytics + adaptive unit tests passed。"],
    ["Process preflight", "Blocked by sandbox", "`ps` inspection returned operation not permitted；noted as environment limitation。"],
    ["S01 checks", "Targeted pass", "mobile screenshots/DOM metrics, mobile PedaNova E2E, desktop Lesson nav E2E, build passed；one earlier type-check failure later cleared。"],
    ["S05 checks", "Mostly pass", "Lesson AI selection E2E 3/3, type/build pass；Nova Lens browser visual QA blocked by `.next` state。"],
    ["S06 checks", "Pass", "type-check passed；Playwright/browser sweeps and bounding checks passed across desktop/mobile/light/dark。"],
    ["S08 checks", "Pass", "targeted RAG 27/27, `npm run test:rag` 252/252, type-check passed。"],
    ["S11 Visualization stress", "Pass", "389/389 desktop and 389/389 mobile health checks，0 console/page/request errors。"],
    ["S11 student robustness", "Red gates", "final type/build passed；desktop 23/50 pass, 19 fail；mobile 15 pass, 10 fail；backend repeat 20/20 fail；AI Tutor 9/81。"],
    ["S18 content/RAG checks", "Mixed", "Many type/rag/build/package gates passed；several provider/generated packages remain blocked or candidate-only。"],
    ["S19 OCR checks", "Partial", "compiled handwriting/SimpleTex tests 12/12 passed；live OCR saturation not run。"],
    ["DOCX visual render QA", "Blocked", "`render_docx.py` failed because Python `pdf2image` is missing；manual LibreOffice conversion hung without producing PDF。"],
]

changed_rows = [
    ["Area", "Files changed in window", "Notes"],
    ["public", "13,286 files", "Question-illustration assets: primary 2,304 files, junior 1,382, high 9,600。"],
    ["coordination", "4,932 files", "S18 content-QA packages, S11 reports, blockers, session logs, generated QA artifacts。"],
    ["app", "3 files", "`app/api/ai-tutor/route.ts`, `app/api/me/route.ts`, `app/visualization-lab/page.tsx`。"],
    ["components", "13 files", "AI Tutor provider, Home hero, Navbar, LessonView, Practice card, AppProviders, Visualization components。"],
    ["data", "17 files", "Generated-content question packs, RAG data, HJB high default, `data/questions.ts`。"],
    ["lib", "16 files", "RAG helpers/tests, question-bank tests, solvability/audit helpers, `lib/server/userStore.ts`。"],
    ["scripts", "6 files", "HK UP junior manifest builders, Mainland PEP junior paper manifest, US math safe-library manifest。"],
    ["tests/e2e", "9 files", "Home, lesson AI selection, visualization stress/value/overlap, student matrix, HJB lesson spec。"],
    ["types/package/env", "1 `types/index.ts`, 1 `package.json`, `.env.local` local-only", "Shared RAG/type/script additions；`.env.local` was not read or printed by this report。"],
]

priority_rows = [
    ["#", "明日优先级"],
    ["1", "S11 建立 release-readiness matrix：Home/auth、Dashboard、Lesson、Practice、Adaptive、Visualization、Teacher、AI Tutor、games。"],
    ["2", "S12 先修 backend repeat P1 failures；这是 release gate 的最高平台风险。"],
    ["3", "S07/S19 修 AI Tutor live fallback；matrix 不过前不要跑 soak 或 public demo。"],
    ["4", "S18 关闭 active provider/content blockers：HK UP junior、TX K-G5、TX G6-G8、AR G6-G12、CA high v5。"],
    ["5", "S10/S12 在安静窗口处理 `.next` generated-artifact instability，并 rerun build/browser smoke。"],
    ["6", "S04/S05/S06/S20 分别处理 Practice、Lesson visual QA、Visualization capstone、game accessibility/redirect issues。"],
    ["7", "按 ownership 拆分 review/commit 13k+ static assets 与 4.9k coordination artifacts，避免不可审查大包。"],
]

decision_rows = [
    ["Decision", "Owner action needed"],
    ["Release path", "批准 S11 把下一工作块用于 release matrix，而不是继续扩大功能面。"],
    ["Credential hygiene", "确认 S19 轮换聊天中暴露过的 provider key，并以 runtime/local env 方式配置。"],
    ["Qwen vs DeepSeek", "决定 Qwen 是否成为 AI Tutor primary provider，以及 DeepSeek 是否仅保留给 S18 content-QA。"],
    ["Content integration", "决定哪些 S18 candidate packs可以进入下一步 S04/S18/S11 integration；未批准前不得导入 live practice。"],
    ["DeepSeek transport", "决定 HK UP junior/TX K-G5 是否继续同 endpoint retry、等待 provider repair，或批准 alternate route。"],
    ["Deployment assets", "决定是否压缩/外置 static illustrations，或使用更高部署容量方案。"],
    ["OCR accuracy", "决定是否投入 labeled handwriting benchmark；当前不能对 broad P1-S6 宣称 90% exact recognition。"],
]


def build_document_xml() -> str:
    parts: list[str] = []
    parts.append(para("MAIS-MVP 每日总裁报告", "Title", align="center"))
    parts.append(para("Daily President Report for Dr. Peter Hu", "Subtitle", align="center"))
    parts.append(table(metadata_rows, [1800, 7560]))

    parts.append(heading("Chinese Executive Summary", 1))
    parts.append(para("本窗口有大量实际进展，但不是 release-ready 状态。S01/S05/S06/S08 完成了前端、Lesson AI、Visualization 和 HK EASE RAG 改进；S11 扩大了 QA/压力测试并暴露多个 P1/P2 release blockers；S18 产出大量内容 QA、RAG、state curriculum 和 illustration artifacts；S19 开始 provider env 配置并完成 OCR 可行性分析。"))
    parts.append(para("当前最佳策略是先做 release control，而不是继续扩展内容量。最新 fresh checks 显示 `npm run type-check` 通过，`npm run test:analytics` 21/21 通过；但 AI Tutor live matrix、backend repeat、lesson/adaptive completion、Practice free-selection、`.next` generated artifacts、DeepSeek transport/credential、SimpleTex saturation、deployment asset size 仍是重点风险。"))

    parts.append(heading("English Executive Summary", 1))
    parts.append(para("The window contained substantial activity, but the product is not release-ready. S01, S05, S06, and S08 delivered frontend, Lesson AI, Visualization Lab, and HK EASE RAG improvements. S11 expanded QA coverage and exposed several P1/P2 release blockers. S18 produced a large set of content-QA/RAG/state-curriculum artifacts and illustration assets. S19 began provider-environment work and completed an OCR feasibility analysis."))
    parts.append(para("The next work block should prioritize release control over more generation. Fresh report-owner checks are green: `npm run type-check` passed and `npm run test:analytics` passed 21/21. The main risks remain AI Tutor live fallback, backend repeat failures, lesson/adaptive completion state, Practice free-selection, local `.next` artifact instability, DeepSeek provider/credential blockers, SimpleTex saturation, and deployment asset size."))

    parts.append(heading("报告窗口摘要", 1))
    parts.append(para("报告窗口：2026-06-01 08:00 至 2026-06-02 08:00 Asia/Hong_Kong。读取范围包括 AGENTS.md、automation memory、coordination/session-logs、coordination/blockers、coordination/decisions、coordination/reports、mtime changed-file scan、git status、package scripts，以及本次 fresh checks。"))
    parts.append(para("本窗口活跃会话：S01、S05、S06、S08、S10、S11、S18、S19。无 fresh log 会话仍在 S01-S20 formal scope 中列出。`coordination/decisions/` 本窗口未发现 fresh decision record。"))

    parts.append(heading("整体项目进展", 1))
    parts.append(para("项目功能面继续扩张，尤其是 Lesson AI selection、Visualization Lab graph readability、HK/US/Mainland curriculum RAG 和大型 content QA packages。与此同时，S11 的 robustness run 把 enterprise-readiness 风险具体化，说明当前应进入缺陷收敛、测试基线统一、content-candidate gating 和部署资产治理阶段。"))
    parts.append(para("S18 产出的 6,643 个 missing Mainland PEP question illustration targets 对应 13,286 SVG/PNG public files，解决了 missing-asset 计数，但尚未接入 live question data。所有 S18 generated banks/textbooks 均应视为 candidate/review artifacts，除 HJB high V2 default 这类明确生产池选择外，不应自动进入学生端。"))

    parts.append(heading("S01-S20 会话状态表", 1))
    parts.append(table(session_rows, [850, 1350, 4200, 2960]))

    parts.append(heading("已完成工作", 1))
    parts.append(table(completed_rows, [1900, 5060, 2400]))

    parts.append(heading("进行中工作", 1))
    parts.append(table(in_progress_rows, [2200, 4360, 2780]))

    parts.append(heading("Blockers", 1))
    parts.append(table(blocker_rows, [2300, 4260, 2780]))

    parts.append(heading("风险", 1))
    parts.append(table(risk_rows, [1900, 4160, 3300]))

    parts.append(heading("测试 / 构建状态", 1))
    parts.append(table(test_rows, [2700, 1800, 4860]))

    parts.append(heading("变更文件", 1))
    parts.append(table(changed_rows, [2200, 2000, 5160]))

    parts.append(heading("明日优先级", 1))
    parts.append(table(priority_rows, [700, 8660]))

    parts.append(heading("需要 Owner 决策", 1))
    parts.append(table(decision_rows, [2500, 6860]))

    parts.append(heading("验证说明", 1))
    parts.append(para("本 DOCX 使用 standard_business_brief preset：US Letter、1 inch margins、Calibri / Microsoft YaHei、fixed DXA tables、simple business formatting。已选择 restrained business style，无装饰布局。已通过 zip、text extraction、OOXML heading checks。render-to-PNG visual QA 未完成：`render_docx.py` 缺少 Python `pdf2image`；manual LibreOffice conversion 在 sandbox 中 hang 且未生成 PDF。"))

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
  <dc:title>MAIS-MVP 2026-06-02 President Report</dc:title>
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
