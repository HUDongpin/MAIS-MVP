from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-06-03-president-report.docx"
HKT = timezone(timedelta(hours=8))
NOW_HKT = datetime.now(HKT).strftime("%Y-%m-%d %H:%M HKT")
NOW_UTC = datetime.now(timezone.utc).isoformat()


def xml_text(text: str) -> str:
    output: list[str] = []
    for index, part in enumerate(str(text).split("\n")):
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
    align = '<w:jc w:val="center"/>' if header else ""
    text_color = "0B2545" if header else "000000"
    text_size = 19 if header else 18
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
    ["报告日期", "2026-06-03"],
    ["报告窗口", "2026-06-02 08:00 至 2026-06-03 08:00 Asia/Hong_Kong"],
    ["报告会话", "S10 / Automation mais-mvp-9-am-president-report"],
    ["生成时间", NOW_HKT],
    ["证据范围", "AGENTS.md、automation memory、S01-S20 session logs、blockers、decisions、reports、changed-file scan、fresh checks"],
]

session_rows = [
    ["会话", "状态", "本窗口活动", "关注点 / 下一步"],
    ["S01", "Completed", "首页/注册页/UI 表面持续打磨：Visualization count 改为 live data，注册页多轮重排，BNUP label 清理，PedaNova 文案缩小，移除 homepage 背景 f(x)/∫。", "多数 type-check/browser checks 通过；一个早期 adaptive test typo blocker 后续已由 fresh type-check 证明清除。"],
    ["S02", "No fresh log", "未发现 dashboard/progress fresh log。", "若注册/parent changes 影响 dashboard entry，需 S02 后续确认。"],
    ["S03", "No fresh log", "未发现 learning-path/roadmap fresh log。", "无 roadmap 直接变更。"],
    ["S04", "No fresh log", "未发现 Practice/Mistake Book fresh log。", "S18 question/illustration packages 不得自动接入 Practice；需另开 S04/S18/S11 integration。"],
    ["S05", "Completed", "Lesson header Visualization Lab function-lens logo 已实现；Nova Lens 蓝点移除，中文 visible label 本地化为 劃詞問Nova / 划词问Nova。", "Lesson UI polish 通过 type-check 与 browser checks；无 API/provider 改动。"],
    ["S06", "No fresh log", "未发现 Visualization Lab owner fresh log。", "Visualization route 只有 S01 copy/count touch；无 S06 direct implementation。"],
    ["S07", "Completed", "AI Tutor guest-mode copy、DeepSeek/Qwen provider config、Qwen realtime reply voice route、voice input UI、reply voice settings、header subtitle removal、attachment menu width等多项完成。", "未做 live DeepSeek/Qwen smoke；Option 3 browser visual verification受本地 dev-server state 阻塞；S19需 env parity。"],
    ["S08", "No fresh log", "未发现 shared state/analytics fresh log。", "Fresh analytics/adaptive tests 21/21 通过。"],
    ["S09", "No fresh log", "未发现 copy/i18n/a11y fresh log。", "未来需评估 S18 illustration microcopy 是否移除/本地化。"],
    ["S10", "Completed", "完成上一日 president report、Next distDir/build blocker fix、Parent Console harness hardening、Phoebe briefs、注册页设计/实现/精简，以及本日报告。", "S10 一些注册实现为 owner-assigned；后续应清理 `.next-*`/private deployment package。"],
    ["S11", "Completed / QA findings", "Parent Console stress/harness、Teacher Console stress、handwriting OCR status、Parent E2E hardening、Mathpix vs SimpleTex 10/20 case live comparisons等完成。", "Teacher stress 暴露 runtime/socket instability；Parent full stress suite未端到端完成；OCR仍需 route forced-fallback QA。"],
    ["S12", "Completed", "Parent API payload/rate-limit guardrails；handwriting OCR SimpleTex/Mathpix risk-based router；mock route verification；10-case human handwriting live route test并收紧 auto-fill arbitration。", "Process-local rate limit与 SQLite snapshot write burst 仍是架构风险；建议 telemetry 与 route-level E2E fixture。"],
    ["S13", "No fresh log", "未发现 Teacher Console owner implementation log。", "S11 teacher stress findings需 S13/S12/S10 后续分流。"],
    ["S14", "Completed", "Parent Console invite code、message subject/body、reply input 加 maxLength，UI constraints 与 server constraints 对齐。", "Mobile visual inspection未重跑；API validation仍为 source of truth。"],
    ["S15", "No fresh log", "未发现 adaptive-engine fresh log。", "Fresh adaptive unit tests pass；无 live adaptive LLM smoke。"],
    ["S16", "No fresh log", "未发现 research fresh log。", "无 research-only activity。"],
    ["S17", "No fresh log", "未发现 gamification fresh log。", "Game reward economy未变更。"],
    ["S18", "Heavy content QA", "完成/推进 Texas K-G5、Arkansas G6-G12、Texas G6-G8、Mainland PEP/BNU/Phoebe/Scott briefs、PEP primary QA/expert review、高中 explanation remediation、CA G6-G8 PASS adjudication、557 missing PEP illustrations。", "大量产物仍是 candidate-only；AR/TX G6-G8 release需 manual/duplicate review；provider key exposure需 S19 rotate。"],
    ["S19", "Completed", "Mathpix fallback local env 配置；Qwen image model local reconfig；Vercel preview deploy failure定位并修复 stale QA script，preview Ready。", "Preview URL受 Vercel SSO 保护；deployment archive 约 1.6GB/32,493 files，需 hygiene。"],
    ["S20", "Completed", "Adventure Island 与 Fishing Master 直接 browser stress 通过；Adventure movement 与 Fishing final submitted state 验证。", "100-run harness未完成，初次 E2E 有 Channel closed/artifact errors；直接 stress作为当前证据。"],
]

completed_rows = [
    ["领域", "完成内容", "主要证据 / 检查"],
    ["注册/首页 UI", "注册页从 preview rail 移除到 card-flow/left navigation/精简 copy，多轮 owner-directed polish；首页 Visualization count 与背景符号修正。", "多次 `npm run type-check` passed；Browser/Playwright DOM/visual checks passed。"],
    ["Lesson UI", "Lesson header Visualization Lab button 使用 selected function-lens logo；Nova Lens button 去掉小蓝点并中英本地化。", "`npm run type-check` passed；desktop/mobile Lesson browser checks passed。"],
    ["AI Tutor", "DeepSeek text + Qwen image/voice provider config；新增 `/api/ai-tutor/voice` Qwen realtime route；voice input/settings UI；guest-mode/header/attachment UI polish。", "Provider tests、`npm run test:analytics`、`npm run type-check`、多次 `npm run build` in S07 logs passed；live provider smoke未跑。"],
    ["Parent Console", "S12 API guardrails + S14 UI maxLength + S11/S10 isolated E2E harness current-source dev mode hardening。", "Parent desktop E2E 6/6 passed；stress API subcase passed；type/build checks passed in S10/S11/S12/S14 logs。"],
    ["Handwriting OCR", "SimpleTex primary + Mathpix risk backup router实现；decimal comma normalization、provider disagreement review guard、10-case live route safety pass。", "Focused routing tests 9/9；compiled handwriting/SimpleTex tests 12/12；10-case route final wrong auto-accept 0。"],
    ["Teacher QA", "S11 新增 teacher stress suites并执行初始压力测试。", "Build最终 passed；baseline 13 passed / 2 failed / 1 skipped；API stress 50-way class create socket hang up，soak未启动。"],
    ["Content QA", "S18 多个 state/curriculum candidate packs、PEP primary/high remediation、Phoebe/Scott briefs、BNU/PEP status docs、557 missing PEP question illustration SVG/PNG pairs。", "大量 package-local Node checks、RAG tests、type-check、question-bank tests、DOCX render QA passed per S18 logs。"],
    ["Deployment", "S19 修 stale RAG-v4 candidate QA script导致的 Vercel build failure；preview deploy Ready。", "`npm run type-check` passed；`npm run build` passed；Vercel deployment Ready；HEAD 401 attributed to Preview Protection/SSO。"],
    ["Games", "S20 直接 stress Adventure Island/Fishing Master，确认 canvas非空、movement/coins/submission状态正常。", "`npm run type-check` passed；`npm run build` passed；direct browser stress passed；screenshots recorded。"],
]

in_progress_rows = [
    ["对象", "当前状态", "下一步"],
    ["AI Tutor live provider", "S07/S19完成配置和UI/route代码，但未进行 live DeepSeek/Qwen text/image/voice smoke。", "用 owner-approved credentials 做 redacted status + one text/image/voice smoke；记录成本/限流。"],
    ["Teacher Console stability", "S11 初始 stress 暴露 isolated app refusal/socket hang-up；8-hour soak未启动。", "S10 先稳定 harness/build lifecycle，S12查 `/api/teacher/classes` concurrency，S13评估 workflow impact。"],
    ["Parent Console stress", "Harness/API hardening完成；full stress suite未端到端跑完。", "Quiet window rerun full parent stress；S12规划 distributed rate-limit/storage migration。"],
    ["S18 candidate packages", "Texas K-G5 QA PASS；Arkansas G6-G12 generation complete但manual/duplicate review pending；Texas G6-G8 generation complete但QA/repair pending。", "S18 完成 manual/duplicate/solvability gates；S04/S11不得提前集成。"],
    ["PEP question illustrations", "Resource coverage 7200/7200；student visibility仍未接入 `questionAssets`。", "S04/S08设计 resolver/attachment，S11测 page weight/performance，S09/S18处理微文案。"],
    ["Deployment package hygiene", "S19 preview Ready但 direct archive 约 1.6GB/32,493 files；mtime scan发现 `.next-register-slider`/`private/` scratch outputs。", "S10更新 `.vercelignore`/cleanup policy，避免上传 local build scratch和private files。"],
]

blocker_rows = [
    ["Blocker", "Evidence", "Required action"],
    ["Resolved in-window blocker: Texas K-G5", "S18 blocker file记录1480/1500 DeepSeek transport failure；同日后续 log 显示 missing 20 rows完成、DeepSeek solvability 1500/1500、final audit PASS。", "保留 blocker artifact as history；报告中不视为 active blocker。"],
    ["Teacher stress runtime/API instability", "S11 teacher API stress: 50-way class create `socket hang up`；browser stress `/teacher/assignments/new` `ERR_CONNECTION_REFUSED`。", "S10/S12/S13/S11 分工复现和修复；不要启动8小时soak直到初始压力通过。"],
    ["AI Tutor live smoke gap", "S07 logs明确未跑 live DeepSeek/Qwen image/voice request；S19 image model未做 live recognition。", "S19 env parity；S07做小成本 live smoke并记录 redacted evidence。"],
    ["S07 Option 3 browser visual verification", "Local ports blocked by pre-existing Next overlays；temp clean server alias resolution failed。", "安静窗口用 updated isolated app helper补 desktop/mobile visual check。"],
    ["Candidate content not integrated", "S18 多个 packages/docs 标注 candidate-only；illustrations未挂 `questionAssets`。", "Owner明确分配 S04/S08/S11 integration后才进入学生端。"],
    ["Provider key hygiene", "S18 logs多次提示 runtime key在 chat 暴露，但未写入 repo/logs。", "Owner/S19 rotate exposed keys；继续只记录变量 presence/status。"],
    ["Vercel preview access", "Preview deploy Ready，但 HTTP HEAD returned 401 due Preview Deployment Protection/SSO。", "需要 authenticated browser/SSO smoke或临时授权后再做 UI preview verification。"],
]

risk_rows = [
    ["Risk", "Why it matters", "Mitigation"],
    ["Large artifact surface", "mtime scan: 5,316 modified files in window；Git status: 2,706 changed/untracked entries。", "按 session/area review；不要一次性 promotion/release。"],
    ["Generated/local scratch files", "`private/` 687 files and `.next-register-slider` 343 files modified in window；Vercel archive already too large。", "Add ignore/cleanup rules and remove scratch outputs only with owner-approved cleanup scope。"],
    ["Static asset weight", "新增 1,114 PEP question illustration files，未来全接入可能影响 route payload/performance。", "Asset resolver + lazy loading + S11 page-weight regression。"],
    ["Provider live uncertainty", "Qwen realtime/image and DeepSeek runtime behavior mostly未 live-smoked；OCR provider comparison sample小。", "小样本 smoke + larger labeled benchmark before claims。"],
    ["Process-local rate limiting", "S12指出 parent link limiter process-local，不适合 multi-instance deployment。", "迁移 Redis/Postgres-backed rate limit/idempotency。"],
    ["Candidate QA semantics", "S18 PASS/ready-for-curated-promotion不是 publisher/expert/release approval。", "报告和 integration tasks继续区分 QA candidate vs production。"],
]

test_rows = [
    ["Check", "Result", "Notes"],
    ["Fresh S10 `npm run type-check`", "Passed", "2026-06-03 08:xx HKT report-owner check green。"],
    ["Fresh S10 `npm run test:analytics`", "Passed 21/21", "learningAnalytics + adaptiveLearning node tests passed。"],
    ["Fresh S10 `npm run build`", "Not run", "Report-only task；avoid extra generated-output churn. S07/S10/S12/S14/S19/S20 logs already include successful builds in window。"],
    ["S07 provider/voice checks", "Passed, no live provider", "type-check/build/provider tests passed；live Qwen/DeepSeek smoke intentionally not run。"],
    ["S10 harness/build checks", "Passed", "Next distDir blocker fix: type-check/build/local dev smoke/question-bank passed；parent harness default dev-isolated mode verified。"],
    ["S11 Parent checks", "Mixed", "Parent desktop E2E 6/6 and stress API subcase passed；full stress suite not run end-to-end。"],
    ["S11 Teacher checks", "Red/inconclusive", "Initial stress found socket/refused runtime instability；8-hour soak not run。"],
    ["S11 OCR comparisons", "Completed live", "Generated 10-case and human 20-case Mathpix/SimpleTex comparisons; both providers HTTP 200 final rows。"],
    ["S12 OCR router", "Passed", "Pure routing tests, mock route tests, type/build, and 10-case live local route final safety pass。"],
    ["S18 content checks", "Mostly package-local pass", "Multiple node audits, type/rag/question-bank checks, DOCX render QA; some packages remain pending manual/duplicate QA。"],
    ["S19 deployment", "Ready", "Local build passed; Vercel preview Ready; preview protected by SSO 401。"],
    ["S20 games", "Passed direct stress", "type/build passed; direct Adventure/Fishing browser stress passed; 100-run harness not completed。"],
]

changed_rows = [
    ["Area", "Files changed in HKT window", "Notes"],
    ["Total mtime scan", "5,316 files", "Excludes `.git`, `node_modules`, `.next`, `.tmp`; includes local generated scratch outside those names。"],
    ["Git status", "2,706 entries", "Large dirty worktree; do not revert unrelated session/user work。"],
    ["coordination/content-qa", "2,988 files", "S18 generated banks, QA reports, DOCX render outputs, manuals, package scripts。"],
    ["public/question-illustrations", "1,114 files", "557 missing PEP question illustration SVG/PNG pairs generated: primary 48, junior 509。"],
    ["private + `.next-register-slider`", "1,030 files", "Local generated build scratch; also a deployment-package hygiene risk。"],
    ["coordination/reports", "35 files", "Parent/handwriting reports, Phoebe/Scott DOCX/PDF renders, next-dist blocker report, prior president report。"],
    ["session logs/blockers", "12 files", "Fresh S01/S05/S07/S10/S11/S12/S14/S18/S19/S20 logs plus S18 blocker artifacts。"],
    ["app/api", "7 files", "AI Tutor routes/status/voice, handwriting route, parent child-link/messages routes。"],
    ["components", "14 files", "AI Tutor, background, home, lesson, parent, UI selector changes。"],
    ["lib/tests/scripts/config", "25+ files", "OCR routing, LLM provider, parent constraints, adaptive tests, E2E harness/specs, Next/Playwright config。"],
    [".env.local", "1 local-only file", "Touched by S19 local env config; this report did not read or print secret values。"],
]

priority_rows = [
    ["#", "明日优先级"],
    ["1", "Run S11 release-readiness matrix in a quiet window, with teacher/parent/AI Tutor/game routes split by owner。"],
    ["2", "S10/S11 stabilize isolated Next lifecycle and remove deployment scratch/package bloat (`.next-*`, `private/`, generated test artifacts)。"],
    ["3", "S07/S19 perform redacted live DeepSeek/Qwen text/image/voice smoke after credential rotation/parity。"],
    ["4", "S12 investigate teacher class-create concurrency/socket reset and plan distributed parent rate-limit/storage migration。"],
    ["5", "S18 finish AR G6-G12 manual/duplicate review and TX G6-G8 repair/solvability/manual QA before any integration discussion。"],
    ["6", "S04/S08/S11 design and validate PEP illustration/questionAssets integration only after owner assignment。"],
    ["7", "S20/S11 rerun game harness once Playwright artifact instability is fixed; keep direct stress evidence as interim。"],
]

decision_rows = [
    ["Decision", "Owner action needed"],
    ["Provider key rotation", "Confirm S19 rotates any provider key exposed in chat and records only redacted status。"],
    ["AI Tutor provider path", "Approve the exact live smoke set for DeepSeek text, Qwen image, and Qwen realtime voice, including cost/rate-limit expectations。"],
    ["Content promotion", "Decide which S18 candidate packages, if any, enter S04/S18/S11 production integration; default remains no integration。"],
    ["PEP illustrations", "Decide whether every PEP question should show an illustration or only an illustration-required subset。"],
    ["Deployment hygiene", "Approve cleanup/ignore changes for local generated directories before next Vercel deploy。"],
    ["Teacher Console stress", "Prioritize S12/S13 fixes before another overnight soak, or accept current stress red gate as release blocker。"],
    ["OCR accuracy claim", "Do not claim broad 90% handwriting recognition until a labeled benchmark is built and passed。"],
]


def build_document_xml() -> str:
    parts: list[str] = []
    parts.append(para("MAIS-MVP 每日总裁报告", "Title", align="center"))
    parts.append(para("Daily President Report for Dr. Peter Hu", "Subtitle", align="center"))
    parts.append(table(metadata_rows, [1800, 7560]))

    parts.append(heading("Chinese Executive Summary", 1))
    parts.append(para("本窗口是高产但高风险的推进日：注册页/首页/AI Tutor/Parent API/Handwriting OCR/Game QA均有实质进展，S18 也完成大量内容 QA、专家简报与插图资源补齐。Fresh report-owner checks 显示 `npm run type-check` 通过，`npm run test:analytics` 21/21 通过。"))
    parts.append(para("当前不建议把新增内容或功能直接推向 release。最重要的约束是：AI Tutor/Qwen/DeepSeek live smoke 未完成；Teacher stress 暴露 runtime/API instability；S18 大量包仍是 candidate-only；新增静态资产和本地 scratch 输出会扩大部署包；provider key 需要轮换并保持 redacted 记录。"))

    parts.append(heading("English Executive Summary", 1))
    parts.append(para("This was a high-output but high-risk reporting window. Registration/home UI, AI Tutor provider and voice work, Parent API hardening, handwriting OCR routing, game stress testing, and S18 content-QA/illustration work all moved forward. Fresh report-owner checks passed: `npm run type-check` is green and `npm run test:analytics` passed 21/21."))
    parts.append(para("The project should not treat the new functionality or content artifacts as release-ready by default. The main constraints are missing live AI Tutor/Qwen/DeepSeek smoke evidence, Teacher Console runtime/API stress failures, candidate-only S18 packages, deployment package bloat from static assets and local scratch output, and provider-key rotation/secret hygiene."))

    parts.append(heading("报告窗口摘要", 1))
    parts.append(para("报告窗口：2026-06-02 08:00 至 2026-06-03 08:00 Asia/Hong_Kong。活跃日志：S01、S05、S07、S10、S11、S12、S14、S18、S19、S20。`coordination/decisions/` 未发现本窗口 decision record。"))
    parts.append(para("changed-file mtime scan 显示窗口内 5,316 个文件改动；Git status 当前 2,706 个 changed/untracked entries。最大改动来自 S18 content-QA、PEP question illustrations、report artifacts 和 local generated scratch output。"))

    parts.append(heading("整体项目进展", 1))
    parts.append(para("产品侧的主要进展集中在注册页体验、AI Tutor 语音/模型配置、Parent Console guardrails、OCR 路由安全、Vercel preview unblock 和两款游戏压力验证。内容侧，S18 将 PEP question illustration resource coverage 补到 7,200/7,200，并推进多个中国/美国 curriculum QA packages 与专家简报。"))
    parts.append(para("管理上最重要的结论是：功能速度已经超过 release-control 速度。明日应优先做 release matrix、provider live smoke、teacher/runtime stability、candidate content gating 和 deployment hygiene，而不是继续扩大生成内容范围。"))

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
    parts.append(para("本 DOCX 使用 Documents skill 的 `standard_business_brief` 方向：US Letter、1 inch margins、Calibri / Microsoft YaHei、fixed DXA tables、simple business formatting、无装饰布局。本报告未读取或打印 `.env.local` secret values。DOCX archive/text/OOXML checks passed；visual render QA 未完成，因为 `render_docx.py` 缺少 Python `pdf2image`，LibreOffice fallback conversion 90 秒 timeout 且未生成 PDF。"))

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
  <dc:title>MAIS-MVP 2026-06-03 President Report</dc:title>
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
