# -*- coding: utf-8 -*-
"""Build the 2026-06-14 MAIS-MVP president report DOCX."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "coordination/reports/2026-06-14-president-report.docx"

BLUE = "2E74B5"
DARK_BLUE = "1F4D78"
MUTED = "555555"
HEADER_FILL = "F2F4F7"
GOOD_FILL = "E2F0D9"
WARN_FILL = "FFF2CC"
RISK_FILL = "FCE4D6"


def dxa(inches: float) -> int:
    return int(round(inches * 1440))


def set_run_font(run, size: float | None = None, bold: bool | None = None, color: str | None = None) -> None:
    run.font.name = "Calibri"
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.rFonts
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.append(r_fonts)
    r_fonts.set(qn("w:ascii"), "Calibri")
    r_fonts.set(qn("w:hAnsi"), "Calibri")
    r_fonts.set(qn("w:eastAsia"), "Microsoft YaHei")


def style_doc(doc: Document) -> None:
    section = doc.sections[0]
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.header_distance = Inches(0.492)
    section.footer_distance = Inches(0.492)

    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.1

    for name, size, color, before, after in [
        ("Heading 1", 16, BLUE, 16, 8),
        ("Heading 2", 13, BLUE, 12, 6),
        ("Heading 3", 12, DARK_BLUE, 8, 4),
    ]:
        style = doc.styles[name]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)
        style.font.bold = True
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)


def add_title(doc: Document) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run("MAIS-MVP President Report")
    set_run_font(r, 20, True, DARK_BLUE)

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(10)
    r = p.add_run("Daily AI coordination report for Dr. Peter Hu / Dr. Peter Hu 每日 AI 协作报告")
    set_run_font(r, 10.5, False, MUTED)


def add_para(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    r = p.add_run(text)
    set_run_font(r, 11)


def add_bullets(doc: Document, items: list[str]) -> None:
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(item)
        set_run_font(r, 10.3)


def shade_cell(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top: int = 80, start: int = 120, bottom: int = 80, end: int = 120) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_widths(table, widths: list[float]) -> None:
    table.autofit = False
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    width_dxa = [dxa(width) for width in widths]

    for row in table.rows:
        for cell, width_in, width_twips in zip(row.cells, widths, width_dxa):
            cell.width = Inches(width_in)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell)
            tc_pr = cell._tc.get_or_add_tcPr()
            tc_w = tc_pr.first_child_found_in("w:tcW")
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            tc_w.set(qn("w:w"), str(width_twips))
            tc_w.set(qn("w:type"), "dxa")

    tbl = table._tbl
    tbl_pr = tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(sum(width_dxa)))
    tbl_w.set(qn("w:type"), "dxa")

    grid = tbl.tblGrid
    if grid is None:
        grid = OxmlElement("w:tblGrid")
        tbl.insert(0, grid)
    for child in list(grid):
        grid.remove(child)
    for width in width_dxa:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)


def set_cell_text(cell, text: str, bold: bool = False, size: float = 8.4, color: str | None = None) -> None:
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(text)
    set_run_font(r, size, bold, color)


def keep_row_together(row, repeat_header: bool = False) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    if tr_pr.find(qn("w:cantSplit")) is None:
        tr_pr.append(OxmlElement("w:cantSplit"))
    if repeat_header and tr_pr.find(qn("w:tblHeader")) is None:
        tr_pr.append(OxmlElement("w:tblHeader"))


def add_table(
    doc: Document,
    headers: list[str],
    rows: list[list[str]],
    widths: list[float],
    font_size: float = 8.4,
    status_column: int | None = None,
) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    set_table_widths(table, widths)
    keep_row_together(table.rows[0], True)
    for i, header in enumerate(headers):
        shade_cell(table.rows[0].cells[i], HEADER_FILL)
        set_cell_text(table.rows[0].cells[i], header, True, font_size, DARK_BLUE)
    for row_data in rows:
        row = table.add_row()
        keep_row_together(row)
        for i, text in enumerate(row_data):
            if status_column is not None and i == status_column:
                if any(token in text for token in ["完成", "通过", "恢复", "PASS", "Ready"]):
                    shade_cell(row.cells[i], GOOD_FILL)
                elif any(token in text for token in ["阻塞", "失败", "Blocked", "红", "未通过"]):
                    shade_cell(row.cells[i], RISK_FILL)
                elif any(token in text for token in ["进行", "待", "需", "候选", "部分"]):
                    shade_cell(row.cells[i], WARN_FILL)
            set_cell_text(row.cells[i], text, False, font_size)
    set_table_widths(table, widths)
    doc.add_paragraph()


def add_kv_table(doc: Document, rows: list[tuple[str, str]]) -> None:
    table = doc.add_table(rows=0, cols=2)
    table.style = "Table Grid"
    for key, value in rows:
        row = table.add_row()
        shade_cell(row.cells[0], HEADER_FILL)
        set_cell_text(row.cells[0], key, True, 9.3, DARK_BLUE)
        set_cell_text(row.cells[1], value, False, 9.3)
    set_table_widths(table, [1.65, 4.85])
    doc.add_paragraph()


def main() -> None:
    now = datetime.now(ZoneInfo("Asia/Hong_Kong")).strftime("%Y-%m-%d %H:%M HKT")

    doc = Document()
    style_doc(doc)
    add_title(doc)

    add_kv_table(
        doc,
        [
            ("Report date", "2026-06-14"),
            ("Report time", "8:00 AM Asia/Hong_Kong"),
            ("Runtime", f"Generated at {now}"),
            ("Project", "MAIS-MVP"),
            ("Reporting session", "S10 automation"),
            ("Audience", "Dr. Peter Hu"),
            ("Reporting window", "2026-06-13 08:00 to 2026-06-14 08:00 Asia/Hong_Kong"),
            ("Automation ID", "mais-mvp-9-am-president-report"),
        ],
    )

    doc.add_heading("中文 Executive Summary", level=1)
    add_bullets(
        doc,
        [
            "本窗口不是空转：S01/S06/S08/S10/S11/S12/S18/S19/S21/S22 都留下了新日志或可验证证据，核心推进集中在登录恢复、Visualization Lab 企业级验证、内容/RAG 管线和生产部署。",
            "生产侧有实质恢复：S19 更换并连接新的 Neon/Postgres 资源，生产 auth 不再返回 503；S12 随后修复 public demo account 登录路径并在 `www.mais.hk` 完成 Student/Teacher smoke。",
            "Visualization Lab 的运行证据显著增强：S06 对 756/756 labs 做了 direct URL、mobile、semantic invariant、practice-link、persistence 等多轮扫测，最终 0 runtime issue；但正式 S11 Playwright harness 仍旧等待过时的 all-labs 控件。",
            "内容与 RAG 管线推进很快：S21 完成多批 HK EPH / HK Modern local-private intake，S18 完成 PEP 英文可见字段修复、PEP high 插图严格审查、California K-G5 DOCX 审查；这些仍需 S18/S24/S23/S11/S22 按 gate 推进，不能直接当作生产批准。",
            "今天最大风险从昨天的 dirty-tree 扩展到 fresh build gate：`npm run type-check` 和 `npm run test:analytics` 新鲜通过，但本次 `npm run build` 在 page data 阶段因 `.next` 缺少 Turbopack runtime chunk 失败，需要 S22/S10 做 clean build isolation 复核。",
        ],
    )

    doc.add_heading("English Executive Summary", level=1)
    add_bullets(
        doc,
        [
            "This was an active reporting window: S01, S06, S08, S10, S11, S12, S18, S19, S21, and S22 produced fresh logs or verification evidence.",
            "Production login recovered. S19 replaced the exhausted Neon/Postgres resource, and S12 fixed the public demo-account auth path with production browser/API smoke for Student and Teacher accounts.",
            "Visualization Lab evidence is materially stronger: S06 validated 756/756 labs across direct URLs, mobile layout, semantic invariants, practice entry, and explored-state persistence, with no runtime issue remaining in S06-owned scope.",
            "Content/RAG velocity remains high, but most outputs are candidate-only, local-private, or review-only. S18/S24/S23/S11/S22 gates remain mandatory before live promotion.",
            "Fresh report checks passed for type-check and analytics tests, but `npm run build` failed after compilation because a `.next` server page could not load a Turbopack runtime chunk. Treat this as a release-engineering follow-up, not a feature-code conclusion.",
        ],
    )

    doc.add_heading("报告窗口摘要", level=1)
    add_kv_table(
        doc,
        [
            ("Window", "2026-06-13 08:00 至 2026-06-14 08:00 HKT"),
            ("Active sessions", "S01, S06, S08, S10, S11, S12, S18, S19, S21, S22"),
            ("Fresh 2026-06-14 logs", "S06, S18, S21；另有 S06/S18/S21 blockers。"),
            ("No fresh logs", "S02, S03, S04, S05, S07, S09, S13, S14, S15, S16, S17, S20, S23, S24, S25"),
            ("Fresh decision records", "未发现窗口内新的 `coordination/decisions/` 记录；最近决策仍是 2026-06-11 Practice Adventure UI direction。"),
            ("Blocker reports", "4 个窗口内 blocker：S06 visualization harness scope；S21 missing P6 ZIP；S18 PEP high route harness conflict；S18 CA high-school final owner approval。"),
            ("Changed-file inventory", "窗口内 850 个文件时间戳变更：content-qa 560、public 60、session-logs 53、data 40、components 20、lib 19、reports 13、app 7、tests 7、blockers 4。"),
            ("Dirty tree snapshot", "Fresh inventory before report artifact: 3,752 `git status --short` entries；295 modified、48 deleted、3,409 untracked。"),
        ],
    )

    doc.add_heading("整体项目进展", level=1)
    add_para(
        doc,
        "MAIS-MVP 在本窗口从产品功能补强转向生产恢复、验证深化和内容流水线扩张并行推进。生产登录从 auth/storage 503 恢复到 public demo Student/Teacher 可登录；Visualization Lab 从可运行提升到可机器验证和可深链复现；RAG/content 团队继续把香港 EPH、香港现代、PEP、California K-G5 的候选材料推进到可审查工件。"
    )
    add_para(
        doc,
        "质量状态是混合的：共享 TypeScript 和 analytics/adaptive 单元测试新鲜通过，S06/S12/S18/S19/S21/S22 各自也有大量局部绿色证据；但 fresh `npm run build` 没有通过，正式 Visualization E2E harness 也仍需 S11 修正。当前不应宣称 root tree release-ready。"
    )
    add_para(
        doc,
        "管理重点仍是 gate discipline。内容包、插图、RAG safe cards、public assets、production deployments、auth storage recovery 都有不同的批准边界。必须继续用 S25/S22 做 release slicing，用 S11 做 maintained regression，用 S18/S24/S23 控制 candidate-to-live。"
    )

    doc.add_heading("S01-S25 Session 状态表", level=1)
    session_rows = [
        ["S01", "完成", "实现 guest 在 Lesson/Practice/Personalized Learning/Visualization 停留 10 秒后的 login/register prompt。", "desktop 4/4、mobile 4/4 guest-login prompt Playwright 通过；`npm run type-check` 通过。", "S11 可把该行为纳入稳定回归。"],
        ["S02", "无新日志", "Dashboard/progress 无窗口内新证据。", "未运行专项检查。", "等待下一次 dashboard assignment。"],
        ["S03", "无新日志", "Learning path / roadmap 无窗口内新证据。", "未运行专项检查。", "等待 curriculum roadmap assignment。"],
        ["S04", "无新日志", "Practice owner 无窗口内新日志；但 S06 Start Practice link 复用现有 `/practice?topicId=` route。", "S06 guest/logged-in browser checks 覆盖入口行为；未改 S04 文件。", "Practice 回归仍归 S04/S11。"],
        ["S05", "无新日志", "Lesson owner 无窗口内新日志。", "未运行专项 lesson suite。", "CA/PEP lesson integration 需 S05/S18/S23/S11。"],
        ["S06", "完成/阻塞", "Visualization Lab 企业 QA：direct-lab permalink/copy link、Start Practice hash-free link、mobile padding、semantic invariants、Mark explored persistence。", "`npm run type-check` 通过；756/756 labs direct URL + mobile scans 通过；final full sweep 46,250 invariants、0 runtime issues。", "S11 更新 `tests/e2e/visualization-values.spec.ts` 或 owner 扩大 S06 scope。"],
        ["S07", "无新日志", "AI Tutor provider/UI 无窗口内新日志。", "未运行专项 AI checks。", "Provider/env 变更仍需 S07/S19/S15 协调。"],
        ["S08", "完成", "三档 Difficulty 合约迁移：Low/Medium/High 成为 app-wide contract，legacy values 作为 boundary input。", "`npm run type-check` 通过；`npm run test:analytics` 23/23 通过；question-bank failure 当时记录为 unrelated。", "S18/S21 生成包继续用 adapter，避免 legacy 字段泄漏到 live types。"],
        ["S09", "无新日志", "Copy/accessibility 无窗口内新日志。", "未运行专项检查。", "CA/PEP visual release 前仍需 copy exposure gate。"],
        ["S10", "完成", "窗口开头完成 2026-06-13 president report、render QA、fresh green checks；本次窗口末生成 2026-06-14 report。", "上一报 type/analytics/build 通过；本次 type/analytics 通过，build 失败并记录。", "继续 daily synthesis；把 build failure 转给 S22/S10。"],
        ["S11", "完成", "独立确认四个 guest target route 在当时没有 10 秒 login modal；为 S01 实现提供红证据。", "Read-only Playwright probe：4 routes HTTP 200、12 秒后 visible dialog count 0。", "跟进 S01 实现后维护回归；修 Visualization harness。"],
        ["S12", "完成/已部署", "修复生产 demo account 登录路径：默认 seed public example accounts，demo fast-path invalid 后窄重试。", "targeted Node tests 通过；`npm run type-check`、`npm run build`、release preflight/staging dry-run 通过；production Student/Teacher smoke 200。", "记录和 S19 的存储恢复边界；避免 dirty tree 继续混入 auth release。"],
        ["S13", "无新日志", "Teacher Console 无窗口内新日志。", "未运行专项 teacher suite。", "后续需要 S11 maintained E2E。"],
        ["S14", "无新日志", "Parent Console 无窗口内新日志。", "未运行专项 parent suite。", "后续需要 S11 maintained E2E。"],
        ["S15", "无新日志", "Adaptive engine 无窗口内新日志。", "本次 fresh analytics/adaptive tests 23/23 通过。", "US_CA/US_NC adaptive content 集成仍需 S15 gate。"],
        ["S16", "无新日志", "Research/evaluation 无窗口内新日志。", "未运行。", "可支持后续学习科学评估。"],
        ["S17", "无新日志", "Gamification/reward economy 无窗口内新日志。", "未运行。", "游戏接入奖励前仍需 S17/S12。"],
        ["S18", "完成/有 gates", "修复 Mainland PEP 英文可见字段 CJK 泄漏；完成 PEP high 插图严格审查；完成 California K-G5 textbook/illustration DOCX 审查。", "`npm run test:question-bank` 75/75 通过；`npm run type-check` 通过；`npm run test:mvp` 30/30；DOCX render QA 通过。", "CA K-G5 verdict candidate-only/needs-repair；PEP high 0 production-approved。"],
        ["S19", "完成/部分未部署", "恢复生产 auth/storage：新 Neon/Postgres resource，断开 quota-exhausted resource；修正误导性 auth setup copy 和登录 fast path。", "生产 register/login/me smoke 200；`npm run type-check`、`npm run build`、local built-server SQLite smoke 通过。", "源代码 latency/error fixes 尚未部署；旧资源数据迁移需 owner 批准。"],
        ["S20", "无新日志", "Game-based learning 无窗口内新日志。", "未运行专项 game checks。", "Internal draft games 不应进入导航/生产。"],
        ["S21", "完成/阻塞", "完成多批 HK EPH/HK Modern local-private RAG intake；准备 P6 non-textbook resource builder。", "多包 `py_compile`、self-test、full intake、safe scan、git-ignore checks 通过；P6 builder self-test 通过。", "P6 full intake 阻塞：缺 `/Users/dongpinhu/Downloads/香港小学现代出版社/六年级 中文版.zip`。"],
        ["S22", "完成/风险高", "按 owner 要求通过 pruned staging package 发布当前最新 `www.mais.hk`。", "release preflight、`npm run type-check`、`npm run build`、Vercel Ready、home/login/visualization production smoke 通过。", "低磁盘和 dirty-root deploy 仍是 release risk；本次 fresh build failure 需 S22 复核。"],
        ["S23", "无新日志", "Integration/promotion 无窗口内新日志。", "未运行。", "S18/S21/S24 包进入 live 前需要 S23。"],
        ["S24", "无新日志", "Exact-layer illustration 无窗口内新日志。", "未运行。", "PEP/CA exact-layer 仍需 S24/human gate。"],
        ["S25", "无新日志", "Git hygiene/release intake 无窗口内新日志。", "Fresh dirty-tree inventory: 3,752 entries。", "最优先：ownership map 和 release slice plan。"],
    ]
    add_table(doc, ["S", "状态", "窗口工作", "证据/检查", "下一步"], session_rows, [0.45, 0.75, 2.55, 1.65, 1.10], 7.1, 1)

    doc.add_heading("已完成工作", level=1)
    add_bullets(
        doc,
        [
            "S19/S12 恢复生产登录：auth/storage 503 解除，public demo Student/Teacher 登录路径在 `www.mais.hk` 验证通过。",
            "S22 完成 owner-requested production deploy：pruned staging package 3,001 files，Ready deployment，`mais.hk` / `www.mais.hk` aliases 生效。",
            "S06 完成 Visualization Lab enterprise proof：756/756 labs direct URL/mobile/browser contract 通过，semantic invariant 覆盖最终达到 46,250 checks，0 runtime issue。",
            "S01 完成 guest 10 秒 login prompt，并用 desktop/mobile Playwright 验证目标路由。",
            "S08 完成三档 Difficulty contract migration，type-check 和 analytics/adaptive tests 通过。",
            "S18 完成 PEP 英文可见字段 CJK leakage 修复，question-bank 75/75 通过；完成 PEP high 与 California K-G5 内容/插图审查。",
            "S21 完成多批 HK EPH/HK Modern local-private RAG intake，提交 committed-safe aggregate artifacts，raw/private corpus 留在 ignored `.local/`。",
        ],
    )

    doc.add_heading("进行中工作", level=1)
    add_bullets(
        doc,
        [
            "Visualization Lab release gate 还缺 S11-owned durable E2E：当前 spec 等待旧 all-labs expansion button，无法到达新 direct-lab assertions。",
            "S21 P6 non-textbook resource intake 已准备好 builder，但真实 ZIP 不在文件系统，不能生成 local/private corpus。",
            "S19/S12 的源代码层 latency/error-copy fixes 部分未部署到 `www.mais.hk`，因为 dirty worktree 不适合直接再发生产。",
            "California K-G5 textbook/illustration package 是 `candidate-only / needs-repair`，不是 student-facing release。",
            "PEP high replacement concepts 22/22 通过 concept-only review，但 production-approved rows 仍为 0；worked examples 还需 S24 deterministic exact-layer。",
        ],
    )

    doc.add_heading("Blockers", level=1)
    add_bullets(
        doc,
        [
            "S06 blocker：`tests/e2e/visualization-values.spec.ts` 属于 S11，且当前 helper 仍等待旧 UI 控件；需要 S11 修 spec 或 owner 明确扩大 S06 scope。",
            "S21 blocker：缺少 `/Users/dongpinhu/Downloads/香港小学现代出版社/六年级 中文版.zip`，HK Modern P6 resource intake 不能正式运行。",
            "S18 blocker：PEP high route harness 仍期待 2 张已撤回旧图，和当前 `withdrawn-owner-rejected` live source of truth 冲突。",
            "S18 blocker：US California high-school illustration package 所有自动化 gate 已完成，但 production/student-facing release 仍缺 owner final approval record。",
            "Fresh build blocker：本次 `npm run build` 编译成功后在 page data 阶段失败，原因是 `.next/server/pages/_document.js` 找不到 `../chunks/ssr/[turbopack]_runtime.js`。",
        ],
    )

    doc.add_heading("Risks", level=1)
    add_bullets(
        doc,
        [
            "Root dirty tree 仍非常大：3,752 status entries 会放大 review、rollback、deployment attribution 和 merge risk。",
            "Dirty-root production deploy 虽然在 S22/S12 owner-requested 场景下成功，但不能成为默认 release process。",
            "Fresh build failure 可能是 stale/generated `.next` 或 build-isolation 问题，也可能暴露配置/packaging drift；在 S22 复核前不能宣称 release-ready。",
            "Neon/Postgres recovery 后，旧 quota-exhausted resource 里的仅存生产数据仍不可用；数据恢复/迁移需要明确 owner 批准和红acted runbook。",
            "RAG intake 的 raw/private OCR/chunk artifacts 在 `.local/` 中，只能作为 local/private corpus；不得提交、截图、粘贴或上传外部 provider。",
            "内容和插图包存在 candidate-only、integration-review、owner-review、production-approved 多种状态；混用状态词会造成错误上线风险。",
        ],
    )

    doc.add_heading("Test / Build 状态", level=1)
    test_rows = [
        ["Fresh S10", "`npm run type-check`", "通过", "`tsc --noEmit --incremental false` 通过。"],
        ["Fresh S10", "`npm run test:analytics`", "通过", "learningAnalytics + adaptiveLearning 23/23 tests PASS。"],
        ["Fresh S10", "`npm run build`", "失败", "Compiled successfully, then page data failed: missing `.next` Turbopack runtime module required by `_document.js`。"],
        ["S06", "Visualization sweeps", "通过", "756/756 direct URL and mobile contract scans；final semantic sweep 46,250 invariants、0 runtime issues。"],
        ["S12", "Auth fix checks", "通过", "targeted Node tests、type-check、build、release preflight、production Student/Teacher smoke 通过。"],
        ["S18", "Question/content checks", "通过", "`npm run test:question-bank` 75/75；`npm run test:mvp` 30/30；California K-G5 DOCX render QA 通过。"],
        ["S19", "Storage/auth recovery checks", "通过/部分未部署", "Production API smoke 200；source fixes type/build/local smoke 通过但未部署。"],
        ["S21", "RAG package checks", "通过/阻塞", "多包 py_compile/self-test/full intake/safe scan 通过；P6 full intake 因缺 ZIP 未运行。"],
        ["S22", "Production deployment checks", "通过", "preflight、type-check、build、Vercel Ready、production home/login/visualization smoke 通过。"],
        ["S11", "Full E2E release suite", "未运行", "本窗口无 full E2E；Visualization formal spec 当前阻塞。"],
    ]
    add_table(doc, ["Source", "Check", "Status", "Notes"], test_rows, [0.8, 1.75, 0.7, 3.25], 8.2, 2)

    doc.add_heading("Changed Files", level=1)
    add_para(
        doc,
        "窗口内时间戳变更约 850 个文件；root dirty-tree 快照为 3,752 entries。以下按业务含义归纳，不展开 raw/private 或大量 generated candidate assets。"
    )
    changed_rows = [
        ["Auth / production", "`lib/server/userStore.ts`, `lib/server/userStoreDemoLogin.test.ts`, `lib/server/userStoreDemoFastPath.test.ts`, `components/providers/AppProviders.tsx`, `lib/server/authRouteGuards.ts`, S19/S12/S22 logs。"],
        ["Visualization", "`components/visualizations/VisualizationLabPage.tsx`, `visualizationDiagnostics.ts`, `visualizationDiagnostics.test.ts`, `visualizationTheme.ts`, `VisualizationCard.tsx`, S06 sweep scripts/json/png evidence。"],
        ["Student shell", "`app/layout.tsx`, `components/layout/GuestLoginPromptGate.tsx`, `tests/e2e/guest-login-prompt.spec.ts`, S01/S11 logs。"],
        ["Difficulty / shared data", "`types/index.ts`, `lib/difficulty.ts`, `lib/adaptiveLearning.ts`, generated-content adapters, live question/topic/lesson data modules touched by S08。"],
        ["Content QA / RAG", "`coordination/content-qa/hk-eph-*`, `hk-modern-primary-*`, `mainland-pep-high-concept-redraw-v1`, `us-ca-k-g5-textbook-illustration-audit-2026-06-14`。"],
        ["Public/content assets", "`public/question-illustrations/`, `public/lesson-illustrations/`, selected generated-content and safe manifest files。"],
        ["Reports/blockers", "`coordination/blockers/2026-06-14-S06.md`, `2026-06-14-S21.md`, S18 blocker reports, S10 president report outputs。"],
        ["Release/config evidence", "`coordination/session-logs/2026-06-13-S22.md`, Vercel staging/deploy scripts evidence, `.vercelignore`/release hygiene context。"],
    ]
    add_table(doc, ["Group", "Representative paths"], changed_rows, [1.35, 5.15], 8.3)

    doc.add_heading("明日优先级", level=1)
    add_bullets(
        doc,
        [
            "S22/S10：先复核 fresh build failure，优先用 clean/pruned build output 或 clean `.next` strategy 证明这是 generated-state 问题还是真实 release blocker。",
            "S11：更新 Visualization Lab formal Playwright spec，使用 S06 `buildVisualizationLabHref` / section selector contract，不再等待旧 all-labs directory button。",
            "S25：对 3,752-entry dirty tree 做 ownership map 和 release slice recommendation，先隔离 auth/deployment、visualization、content/RAG、public assets 四类切片。",
            "S21：等待 owner 恢复/提供 P6 ZIP 绝对路径；恢复后运行 prepared builder，再交 S18/S23。",
            "S18/S24/S23：继续把 CA K-G5、PEP high、US CA high-school、HK RAG safe cards 分清 reject / repair / owner-review / production-approved 状态。",
            "S19/S12/S22：决定源代码层 auth latency/error-copy fixes 是否通过 clean release slice 部署，避免再从 dirty root 直接混发。",
        ],
    )

    doc.add_heading("Owner Decisions Needed", level=1)
    add_bullets(
        doc,
        [
            "是否把 S06 Visualization E2E repair 指派给 S11，或临时扩大 S06 scope 修改 `tests/e2e/visualization-values.spec.ts`？",
            "请恢复 `/Users/dongpinhu/Downloads/香港小学现代出版社/六年级 中文版.zip`，或提供新的绝对路径，解除 S21 P6 RAG intake blocker。",
            "是否批准 US California high-school illustration package 进入 production/student-facing release workflow？若批准，需按 blocker 中指定批准句写入 owner approval record。",
            "旧 Neon/Postgres quota-exhausted resource 中的数据是否需要恢复/迁移到新 resource？若需要，需单独授权 S19/S12 制定红acted migration plan。",
            "后续是否继续允许 owner-requested dirty-root guarded deploy，还是要求 S25/S22 先切 clean release slice 后再发布？",
            "下一条内容/插图 production priority 是 CA K-G5 修复、PEP high concept-only、US CA high-school final approval、HK Modern/EPH RAG，还是 PEP question illustrations？",
        ],
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
