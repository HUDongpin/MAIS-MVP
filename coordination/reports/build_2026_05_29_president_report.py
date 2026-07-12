from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-05-29-president-report.docx"
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
    ["报告日期", "2026-05-29"],
    ["报告窗口", "2026-05-28 08:00 至 2026-05-29 08:00 Asia/Hong_Kong"],
    ["报告会话", "S10 / Automation mais-mvp-9-am-president-report"],
    ["生成时间", NOW_HKT],
    ["证据范围", "AGENTS.md、automation memory、session logs、blockers、decisions、mtime scan、git status/log、fresh checks"],
]

session_rows = [
    ["Session", "状态", "窗口内结果", "检查 / 风险"],
    ["S01", "Completed + one check caveat", "Home mobile hero-card bleed fixed; bottom CTA removed; Home icon refresh was tried then reverted at owner request; Home card copy changed to Curriculum Galaxy / 課程星雲圖 / 课程星云图。", "Earlier type-check/browser checks passed; final S01 type-check attempt failed on then-existing out-of-scope dashboard prop error, later cleared by fresh automation checks。"],
    ["S02", "Completed", "Designed and implemented immersive Adaptive Learning knowledge galaxy, restyled lower mission panels, equalized action buttons, added day/night adaptive visual switching, and produced color/design proposal artifacts。", "Repeated type-check and browser QA reported pass; one known risk is pre-existing duplicate-key console warnings in topic rendering。"],
    ["S03", "Completed / awaiting approval", "Produced Wonderland-island metro preview images for Mainland PEP primary roadmap only; no production roadmap code changed。", "Headless Chrome previews passed; owner approval needed before implementation。"],
    ["S04", "High activity / completed", "BNUP primary v2 connected with v1; EASE export/assets moved into project; PEP group-prefix noise removed; Practice Arena and Adventure Island had multiple UX, i18n, route, and mission-map fixes。", "Many type-check, question-bank, build, Playwright, and browser checks reported pass. Current fresh automation checks also pass; large active Practice diff remains review-heavy。"],
    ["S05", "High activity / completed", "Lesson answer reveal, worked-example hiding, Lesson Galaxy redesign/collapse/loading/panel polish, and localized loader fixes landed。", "Repeated type-check/browser checks reported pass; answer hiding is UI-level only because RSC data still contains source content。"],
    ["S06", "Completed", "Visualization Lab Chinese label cleanup, badge/control fixes, cockpit mockups, selected clinical-white cockpit implementation, day/night theming, and decorative-line removals completed。", "type-check and targeted Playwright/browser checks reported pass; full E2E remains outside this pass。"],
    ["S07", "Completed", "AI Tutor now detects latest-message language/script, improves authenticated-session handling, retries/suppresses misleading guest prompts for signed-in users, and passed one owner-approved live DeepSeek smoke。", "type-check passed; live smoke passed; prior page-data build issue is now cleared by fresh automation build。"],
    ["S08", "In progress", "Started publisher-neutral HK_EASE_SHARED metadata layer for imported EASE JSON/images shared by UP and EPH RAG queries。", "No completed handoff yet; keep as active S08 work。"],
    ["S09", "Completed", "Copy-only fixes: Home Games label emojis, Lesson Galaxy Enter Planet/unit wording, and Adaptive Learning task-bay action label changed to Collect supplies / 領取物資 / 领取物资。", "type-check passed for each copy task; browser checks not run for narrow copy-only changes。"],
    ["S10", "Completed", "Generated prior president report, strengthened `.gitignore`, initialized local-only Git without remote, added `.vercelignore`, moved runtime JSON imports to `data/generated-content`, rebuilt design image, confirmed dev server running。", "Fresh type-check, RAG, question-bank, and production build all pass now. Vercel Hobby upload may still be too large because `public/` remains large。"],
    ["S11", "No fresh log", "No S11 handoff in this reporting window。", "Needs future release matrix after current high-change UI/content work stabilizes。"],
    ["S12", "No fresh log", "No S12 handoff in this reporting window。", "Backend/API build blocker from prior day appears cleared by current fresh build。"],
    ["S13", "Completed", "Teacher console missing page entries added for sidebar targets; Live Classroom heading and start-session panels made shorter/responsive。", "type-check and build passed; Playwright local teacher smoke passed. Live site requires deployment to reflect changes。"],
    ["S14", "No fresh log", "No S14 handoff in this reporting window。", "No parent-console change reported。"],
    ["S15", "No fresh log", "No S15 handoff in this reporting window。", "Adaptive semantics reportedly unchanged; S15 review only needed if behavior changes later。"],
    ["S16", "No fresh log", "No S16 handoff in this reporting window。", "No research-only update reported。"],
    ["S17", "No fresh log", "No S17 handoff in this reporting window。", "S04 touched Fishing Game copy with S20 game-route awareness, not reward economy。"],
    ["S18", "High activity / mixed", "Generated/imported HJB primary/high illustration candidates, ran BNU junior and high DeepSeek QA, approved and launched BNUP AI-generated P1-S6 content, built EASE QA tooling, reformatted U.S. Top-10 DOCX, and inventoried EASE no-question-image rows。", "BNUP launch gates passed. BNU high candidate bank not approved: 405 fail/blocker/major rows. BNU junior lesson QA blocked by missing `lessons.json`. EASE full live QA remains partial/continuation work。"],
    ["S19", "No fresh log", "No S19 handoff in this reporting window。", "Needed for credential rotation and future controlled provider config。"],
    ["S20", "No fresh log", "No S20 handoff in this reporting window。", "Game-specific follow-up only if Fishing/Adventure changes expand beyond copy/route fixes。"],
]

completed_rows = [
    ["领域", "完成内容", "影响"],
    ["Release baseline", "Fresh automation checks now pass: `npm run type-check`, `npm run test:rag`, `npm run test:question-bank`, and `npm run build`。", "The prior question-bank count and page-data build blockers are cleared in the current workspace。"],
    ["BNUP launch", "S18 recorded owner approval and lifted remaining MAINLAND_BNU S1-S3 gates so approved BNUP P1-S6 content is live across Roadmap, Practice, and authenticated question API surfaces。", "BNUP generated practice content is no longer primary-only; lesson-body enrichment remains separate。"],
    ["Practice Arena", "S04 completed many learner-facing fixes: adaptive mission map redesign/polish, Adventure Island route 200 fix, lesson-to-practice topic context, Simplified Chinese cleanup, real game preview cards, and recommendation panel repositioning。", "Practice UX and post-lesson continuity improved, but the large file diff deserves review。"],
    ["Lesson experience", "S05 hid answer/check text behind reveal controls, removed a targeted illustration, rebuilt Lesson Galaxy into a compact/expandable learning galaxy, and localized loading behavior。", "Lesson pages are more learner-safe and less visually crowded。"],
    ["Adaptive Learning dashboard", "S02 replaced scattered adaptive-learning first screen with a knowledge galaxy, restyled lower task panels, equalized action controls, and added day/night styling。", "Dashboard/adaptive surface is more immersive while preserving adaptive decision semantics。"],
    ["Visualization Lab", "S06 localized visible labels, clarified model comparison controls, implemented selected clinical-white cockpit, and added day/night support across representative modules。", "Visualization surface is cleaner and more bilingual-ready。"],
    ["AI Tutor", "S07 added language/script-aware tutor replies and improved authenticated-session handling; one live DeepSeek smoke succeeded。", "Reduces mismatched script replies and misleading guest prompts for signed-in learners。"],
    ["Teacher console", "S13 added missing teacher page entries and tightened Live Classroom panels。", "Teacher sidebar actions are locally navigable after login。"],
    ["Tooling/deployment", "S10 initialized local Git, added `.gitignore`/`.vercelignore`, moved runtime generated JSON to `data/generated-content`, and wrote a Vercel slimming guide。", "Improves local version control and deployment packaging readiness without creating a remote。"],
]

in_progress_rows = [
    ["对象", "当前状态", "下一步"],
    ["HK EASE shared metadata", "S08 has an in-progress log for a publisher-neutral EASE metadata layer。", "Finish S08 implementation/handoff and run relevant RAG/type checks。"],
    ["EASE DeepSeek full QA", "S18 pilot completed and partial full-batch cache exists; detached background run did not stay alive in Codex tool environment。", "Continue in a foreground/approved runner, then adjudicate output before source-data edits。"],
    ["BNU junior lesson/textbook QA", "Runner exists, but preflight is blocked because `coordination/content-qa/mainland-bnu-junior-lessons-v1/lessons.json` is missing。", "S05/S18 provide or authorize the lesson package, then rerun preflight, smoke, and full QA。"],
    ["BNU high candidate remediation", "DeepSeek full-RAG QA found 405 fail/blocker/major remediation rows; not approved for product integration。", "S18 remediate/regenerate, rerun deterministic and DeepSeek QA, then manual sample。"],
    ["Roadmap redesign", "S03 produced previews only; implementation is waiting for owner approval。", "Owner selects whether to implement the Wonderland-island metro direction。"],
]

blocker_rows = [
    ["Blocker", "Evidence", "Required action"],
    ["BNU junior lesson source missing", "Blocker report `coordination/blockers/2026-05-28-S18-bnu-junior-lessons-missing.md` says `mainland-bnu-junior-lessons-v1/lessons.json` is absent。", "Provide/generate the lesson package before DeepSeek lesson QA。"],
    ["BNU high candidate bank not approved", "S18 reports 405 fail/blocker/major remediation rows after DeepSeek full-RAG QA。", "Keep candidate-only; remediate before any S04 integration review。"],
    ["EASE full live QA incomplete", "Pilot 100 passed, but full 9,339-row run needs continuation; detached nohup did not remain alive。", "Run controlled foreground batch or approved automation with cost/rate limits。"],
    ["Image/provider credential hygiene", "S18 notes exposed provider key use in chat context; no secret values were written to files, but rotation is still recommended。", "S19/owner rotate production-grade keys and place future credentials only in approved local/Vercel envs。"],
    ["Vercel package size risk", "S10 notes `public/` remains about 362 MB after `.vercelignore`; Hobby upload may still exceed 100 MB。", "Compress/prune/move static lesson assets or use object storage/CDN before Hobby deployment。"],
]

risk_rows = [
    ["Risk", "Why it matters", "Mitigation"],
    ["Large uncommitted working tree", "Current `git status` shows many modified/untracked files across app/components/data/coordination/public after local Git baseline。", "Ask each owning session to commit or hand off focused changes before broad release review。"],
    ["High UI churn", "Practice, Lesson, Adaptive Learning, and Visualization Lab changed substantially in one window。", "S11 should run a cross-route regression matrix on desktop/mobile and EN/zh/zh-Hans。"],
    ["Generated content governance", "BNUP is live, but BNU high remains failed/blocked and BNU junior lesson QA lacks source package。", "Keep candidate banks and lesson-body packs gated until S18 approval artifacts are green。"],
    ["Runtime bundle/upload size", "Generated JSON was moved for Vercel builds, but public static image assets remain heavy。", "Measure deploy archive; optimize `public/lesson-illustrations` before Vercel Hobby deploy。"],
    ["Live provider usage", "AI Tutor and EASE QA used live provider paths; cost/rate-limit and key exposure risks exist。", "Use S19-managed env placement, explicit owner approval, redacted logs, and small pilots first。"],
]

test_rows = [
    ["Check", "Result", "Notes"],
    ["Fresh `npm run type-check`", "Pass", "Current workspace TypeScript strict check passed。"],
    ["Fresh `npm run test:question-bank`", "Pass 66/66", "Full question-bank, BNUP primary/junior/high, publisher isolation, API scoping, and generated-bank regression tests passed。"],
    ["Fresh `npm run test:rag`", "Pass 225/225", "All safe-RAG manifest self-tests and RAG tests passed。"],
    ["Fresh `npm run build`", "Pass", "Next.js production build compiled, collected page data, generated 88 static pages, and listed API routes successfully。"],
    ["Reported UI/browser checks", "Mostly pass", "S01/S02/S04/S05/S06/S07/S13 logs include targeted browser or Playwright checks; use S11 for broader regression。"],
    ["DOCX visual render", "Not available", "`soffice` is not installed locally; DOCX will be zip/text/OOXML validated instead of PNG-rendered。"],
]

changed_rows = [
    ["Area", "Representative changed files / artifacts in reporting window"],
    ["Window scan volume", "mtime scan excluding generated/local-only dirs found 2,412 files: 1,137 EASE public assets, 1,125 coordination/content-QA artifacts, 39 data files, 29 report files, 20 public/practice assets, 12 session logs, and multiple app/component source files。"],
    ["App/source UI", "app/practice/page.tsx; app/practice/adventure-island/page.tsx; app/lesson/*; app/visualization-lab/page.tsx; app/teacher/*; app/register/page.tsx; components/home/*; components/dashboard/*; components/lesson/*; components/visualizations/*; components/ai/AITutorProvider.tsx。"],
    ["Data/runtime", "data/generated-content/*; data/mainlandBnu*.ts; data/mainlandHjb*.ts; data/mainlandPep*.ts; data/ease/*; data/visualizationLabs.ts。"],
    ["QA/content", "coordination/content-qa/ease-deepseek-qa/*; mainland-bnu-high/junior/primary packages; HJB primary/high illustration candidates; EASE no-question-image inventory; U.S. Top-10 DOCX reformat。"],
    ["Reports/design", "coordination/reports/2026-05-28-adaptive-ui-proposals/*; adaptive planet color proposals; primary roadmap previews; Vercel slimming guide; regenerated adaptive-practice task image; lesson galaxy designs。"],
    ["Tooling", ".gitignore; .vercelignore; local `.git/` baseline created; package.json mtime changed in window though no dependency install was run by this automation。"],
    ["Current uncommitted status", "`git status --short` still shows modified/untracked app, component, data, coordination, public, and test files. This report did not revert or normalize them。"],
]

priority_rows = [
    ["#", "明日优先级"],
    ["1", "Use S11 to run a focused regression matrix across Home, Login/Register, Lesson, Practice, Adaptive Learning, Visualization Lab, Teacher Console, and AI Tutor in EN/zh/zh-Hans/mobile。"],
    ["2", "Stabilize local Git workflow: have each active owner session produce small commits or handoffs for their changed files, then review large Practice/Lesson/Visualization diffs。"],
    ["3", "Continue EASE full DeepSeek QA in a controlled foreground/approved runner; do not edit source question data until S18 adjudicates results。"],
    ["4", "Provide or authorize BNU junior lesson `lessons.json` so S18 can run the lesson/textbook QA pipeline。"],
    ["5", "Keep BNU high candidate bank out of product until the 405 remediation rows are fixed and rerun。"],
    ["6", "Quantify Vercel deploy archive size and reduce `public/lesson-illustrations` if Hobby deployment is still above limit。"],
]

decision_rows = [
    ["Decision", "Owner action needed"],
    ["S11 release gate", "Approve S11 to build a release-readiness matrix now that fresh type-check/question-bank/RAG/build gates pass。"],
    ["BNU junior lesson package", "Decide whether S05/S18 should generate the missing BNU junior `lessons.json` or wait for owner-provided source。"],
    ["BNU high remediation", "Confirm S18 should spend the next content-QA slot repairing the 405 high-school candidate issues before any new bank generation。"],
    ["EASE full QA budget", "Approve provider budget/rate-limit plan for completing 9,339-row EASE DeepSeek QA。"],
    ["Deployment path", "Decide whether to optimize static assets for Vercel Hobby or use Pro/object storage/CDN for lesson illustrations。"],
    ["Credential rotation", "Rotate any production-grade provider key that appeared in chat and route future config through S19。"],
]


def build_document_xml() -> str:
    parts: list[str] = []
    parts.append(para("MAIS-MVP 每日总裁报告", "Title", align="center"))
    parts.append(para("Daily President Report for Dr. Peter Hu", "Subtitle", align="center"))
    parts.append(table(metadata_rows, [1800, 7560]))

    parts.append(heading("Chinese Executive Summary", 1))
    parts.append(para("本窗口是高产出日：Home、Practice、Lesson、Adaptive Learning、Visualization Lab、Teacher Console、AI Tutor、BNUP 内容上线和部署工具链都有实质推进。最重要的状态变化是 fresh release checks 已全部转绿：TypeScript、question-bank、RAG 和 production build 在当前工作区均通过。"))
    parts.append(para("主要风险从“是否能构建”转为“是否可控发布”：工作树仍有大量未提交跨域变更，Practice/Lesson/Visualization/Adaptive UI 的改动密集，BNU high candidate bank 仍不合格，BNU junior lesson QA 缺少 `lessons.json`，EASE full QA 仍需继续。建议今天先做 S11 regression matrix 和分会话提交/交接。"))

    parts.append(heading("English Executive Summary", 1))
    parts.append(para("The project made broad progress across student-facing UI, teacher navigation, AI Tutor behavior, BNUP launch readiness, EASE ingestion/QA tooling, and deployment preparation. The biggest improvement is current release health: fresh `type-check`, `test:question-bank`, `test:rag`, and `build` all pass."))
    parts.append(para("The remaining work is release control. The workspace has many active uncommitted changes across multiple ownership areas, and the high-risk content streams remain gated: BNU high needs remediation, BNU junior lesson QA needs the missing lesson package, and EASE full live QA needs controlled continuation."))

    parts.append(heading("报告窗口摘要", 1))
    parts.append(para("报告窗口：2026-05-28 08:00 至 2026-05-29 08:00 Asia/Hong_Kong。读取范围包括 AGENTS.md、automation memory、2026-05-28 session logs、S18 blocker、coordination decisions、mtime changed-file scan、git status/log、package scripts，以及本次 automation fresh checks。No assigned work in this reporting window: No。"))
    parts.append(para("正式 S01-S20 覆盖中，S01/S02/S03/S04/S05/S06/S07/S08/S09/S10/S13/S18 有 fresh activity 或 fresh log；S11/S12/S14/S15/S16/S17/S19/S20 无本窗口 fresh handoff。"))

    parts.append(heading("整体项目进展", 1))
    parts.append(para("产品进展集中在学生主路径：Home 更简洁，Practice mission card 与游戏入口更接近 owner 截图，Lesson Galaxy 改为可折叠体验并隐藏答案，Adaptive Learning 成为知识星系，Visualization Lab 进入临床白实验室 cockpit。Teacher Console 的缺失页面也已补齐。"))
    parts.append(para("内容进展集中在 BNUP 与 EASE：BNUP P1-S6 approved generated practice content 已 live；EASE 9,339-row QA pipeline 已搭好且 pilot 通过；但 BNU high candidate bank 和 BNU junior lesson/textbook QA 仍不能发布。"))

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
    parts.append(para("本 DOCX 使用 standard_business_brief preset 和 memo_masthead-style opening：US Letter、1 inch margins、Calibri / Microsoft YaHei、fixed DXA tables、simple business formatting。由于本机缺少 `soffice`，未能执行 render_docx PNG visual QA；已执行 zip、OOXML/text extraction、textutil extraction 验证。"))

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
  <dc:title>MAIS-MVP 2026-05-29 President Report</dc:title>
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
