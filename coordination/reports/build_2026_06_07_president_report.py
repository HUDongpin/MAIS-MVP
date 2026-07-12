from __future__ import annotations

from datetime import datetime, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


OUT = Path("coordination/reports/2026-06-07-president-report.docx")
BLUE = "2E74B5"
DARK_BLUE = "1F4D78"
INK = "111827"
MUTED = "4B5563"
LIGHT = "F2F4F7"
CALLOUT = "F8FAFC"
BORDER = "C9D1D9"


def e(text: str) -> str:
    return escape(text, quote=True)


def sz(points: float) -> str:
    return str(int(round(points * 2)))


def run(text: str, points: float = 11, bold: bool = False, color: str = INK) -> str:
    bold_xml = "<w:b/><w:bCs/>" if bold else ""
    return (
        "<w:r><w:rPr>"
        '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/>'
        f'<w:sz w:val="{sz(points)}"/><w:szCs w:val="{sz(points)}"/>'
        f"{bold_xml}<w:color w:val=\"{color}\"/>"
        f"</w:rPr><w:t xml:space=\"preserve\">{e(text)}</w:t></w:r>"
    )


def p(
    text: str = "",
    *,
    style: str | None = None,
    points: float = 11,
    bold: bool = False,
    color: str = INK,
    before: int | None = None,
    after: int = 120,
    line: int = 264,
    num_id: int | None = None,
    align: str | None = None,
) -> str:
    props: list[str] = []
    if style:
        props.append(f'<w:pStyle w:val="{style}"/>')
    if num_id is not None:
        props.append(f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num_id}"/></w:numPr>')
    spacing_attrs = [f'w:after="{after}"', f'w:line="{line}"', 'w:lineRule="auto"']
    if before is not None:
        spacing_attrs.insert(0, f'w:before="{before}"')
    props.append(f"<w:spacing {' '.join(spacing_attrs)}/>")
    if align:
        props.append(f'<w:jc w:val="{align}"/>')
    ppr = f"<w:pPr>{''.join(props)}</w:pPr>"
    return f"<w:p>{ppr}{run(text, points, bold, color)}</w:p>"


def bullet_items(items: list[str]) -> str:
    return "".join(p(item, num_id=1, after=160, line=280) for item in items)


def numbered_items(items: list[str]) -> str:
    return "".join(p(item, num_id=2, after=160, line=280) for item in items)


def cell(text: str, width: int, *, fill: str | None = None, bold: bool = False, points: float = 8.6) -> str:
    shading = f'<w:shd w:fill="{fill}"/>' if fill else ""
    return (
        "<w:tc><w:tcPr>"
        f'<w:tcW w:w="{width}" w:type="dxa"/>{shading}'
        '<w:tcMar><w:top w:w="80" w:type="dxa"/><w:start w:w="120" w:type="dxa"/>'
        '<w:bottom w:w="80" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar>'
        '<w:vAlign w:val="center"/>'
        "</w:tcPr>"
        f"{p(text, points=points, bold=bold, after=0, line=250)}"
        "</w:tc>"
    )


def table(headers: list[str], rows: list[list[str]], widths: list[int], *, points: float = 8.5) -> str:
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    borders = "".join(
        f'<w:{side} w:val="single" w:sz="4" w:space="0" w:color="{BORDER}"/>'
        for side in ("top", "left", "bottom", "right", "insideH", "insideV")
    )
    header_row = "<w:tr>" + "".join(
        cell(header, widths[i], fill=LIGHT, bold=True, points=points) for i, header in enumerate(headers)
    ) + "</w:tr>"
    body_rows = "".join(
        "<w:tr>" + "".join(cell(value, widths[i], points=points) for i, value in enumerate(row)) + "</w:tr>"
        for row in rows
    )
    return (
        "<w:tbl><w:tblPr>"
        '<w:tblStyle w:val="TableGrid"/>'
        f'<w:tblW w:w="{sum(widths)}" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
        '<w:tblLayout w:type="fixed"/>'
        f"<w:tblBorders>{borders}</w:tblBorders>"
        "</w:tblPr>"
        f"<w:tblGrid>{grid}</w:tblGrid>{header_row}{body_rows}</w:tbl>"
        + p("", after=120)
    )


def callout(text: str) -> str:
    return table([""], [[text]], [9360], points=10.5).replace('<w:shd w:fill="F2F4F7"/>', f'<w:shd w:fill="{CALLOUT}"/>', 1)


def styles_xml() -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="{INK}"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="{BLUE}"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="{BLUE}"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="Heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="{DARK_BLUE}"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:uiPriority w:val="59"/><w:rsid w:val="00000000"/></w:style>
</w:styles>'''


def numbering_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>'''


def document_xml(body: str) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>{body}
    <w:sectPr>
      <w:footerReference w:type="default" r:id="rId4"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>'''


def footer_xml() -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">{p("MAIS-MVP Daily President Report | S10 Automation", points=8.5, color=MUTED, align="right", after=0)}</w:ftr>'''


def content_types_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''


def package_rels_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''


def document_rels_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>'''


def core_xml() -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>MAIS-MVP President Report - 2026-06-07</dc:title>
  <dc:subject>Daily AI coordination report</dc:subject>
  <dc:creator>S10 Codex automation</dc:creator>
  <cp:lastModifiedBy>S10 Codex automation</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>'''


def app_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>MAIS-MVP</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>'''


def heading(text: str, level: int = 1) -> str:
    if level == 1:
        return p(text, style="Heading1", points=16, bold=True, color=BLUE, before=320, after=160)
    if level == 2:
        return p(text, style="Heading2", points=13, bold=True, color=BLUE, before=240, after=120)
    return p(text, style="Heading3", points=12, bold=True, color=DARK_BLUE, before=160, after=80)


def write_docx(body: str) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUT, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types_xml())
        z.writestr("_rels/.rels", package_rels_xml())
        z.writestr("docProps/core.xml", core_xml())
        z.writestr("docProps/app.xml", app_xml())
        z.writestr("word/document.xml", document_xml(body))
        z.writestr("word/_rels/document.xml.rels", document_rels_xml())
        z.writestr("word/styles.xml", styles_xml())
        z.writestr("word/numbering.xml", numbering_xml())
        z.writestr("word/settings.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/></w:settings>')
        z.writestr("word/footer1.xml", footer_xml())


def build() -> None:
    session_rows = [
        ["S01", "完成", "注册流程顺序、登录年级过滤、注册视觉复刻/归档、首页 eyebrow/CTA 文案与按钮设计更新。", "避免继续扩大 auth/home UI；需要与 S09/S11 保持 copy/regression 对齐。", "多次 focused TS/Playwright 通过；当前 S10 fresh type-check green。"],
        ["S02", "完成", "Adaptive guest screen 二级 CTA 改为 Register/注册并跳转 `/register`。", "仅 UI CTA；无 adaptive engine 语义改动。", "`git diff --check` 通过；full type-check 当时受 nested copy 阻塞。"],
        ["S03", "无新鲜日志", "未见本窗口独立 roadmap/curriculum handoff。", "等待内容集成/roadmap owner assignment。", "无。"],
        ["S04", "完成/有部署 caveat", "California Math Practice Beta live practice data integration、3000 题 beta lane、本地 build/E2E/question checks；另有 Practice header/filter UI follow-ups。", "Vercel preview timeout 记录；public naming 必须保留 Beta。", "局部 compile、full-bank tests、build、CA E2E passed；当前 fresh green。"],
        ["S05", "完成", "Lesson heading 仅 Enter Planet 后显示；BNU junior/high formal lessons 本地集成；California 95 lesson seeds 加入 beta lesson layer。", "BNU/California 仍需 S18/S09/S11/S22 公开发布门；不应越权宣称完整课程。", "BNU high 37/37、junior 7/7、primary 11/11、MVP 29/29；CA focused compile/runtime audit passed。"],
        ["S06", "完成", "Visualization Lab 删除“综合衔接/Capstone bridge”和“深入实验/deep-dive”可见标签。", "未改核心 visualization 行为。", "目标 `rg` 检查通过；当时 full type-check 受 unrelated dirty tree 阻塞。"],
        ["S07", "完成/后续项", "AI Tutor voice echo suppression、简体默认、Nova Lens enterprise agents/API/governance、voice/provider audit。", "发现 voice route invalid empty-text 会先消耗 quota；image upload live completion 仍为媒体后续。", "type-check passed；Nova Lens API/UI specs passed；live text 27/27；Qwen voice smoke passed。"],
        ["S08", "无新鲜日志", "Shared state/types 被其他会话触及，但无 S08 独立 handoff。", "需审 `types/index.ts`、provider/userStore 共享契约后再 release。", "无。"],
        ["S09", "完成", "Teacher reports US heading、login/register/forgot copy eyebrow cleanup；California copy review artifact。", "建议补 US teacher reports E2E；继续守住 California Beta 命名。", "narrow `rg`/targeted diagnostics/browser checks；部分 copy-only 未跑 full build。"],
        ["S10", "完成", "Nova Lens release gate synthesis与continuation、production auth/storage coordination、urgent-five report、当前 president report。", "S10 不执行 feature code；继续 release intake/reporting。", "type-check/build/test:analytics/test:mvp 在 urgent/current runs 通过。"],
        ["S11", "完成/生产红灯", "Parent bug audit与回归、学生 P1 blocker repair、handwriting reports、PEP/BNU/CA route smokes、release matrix continuation。", "production auth/API preflight 仍 RED：missing-user login/questions/lessons 500；full production write smoke gated。", "本地多项 Playwright passed；production preflight repeated RED；当前 fresh build/type/test green only证明本地。"],
        ["S12", "完成/外部阻塞", "Nova Lens backend policy/redaction fixes、Parent backend closure、Postgres residual tooling/runbook、password reset delivery code/tests。", "历史 Postgres 旧数据迁移、临时 admin cleanup、production storage health需外部/owner路径。", "type-check passed；password reset focused 12/12；storage merge self-test passed。"],
        ["S13", "完成", "Teacher Operations Nova Lens UX gate PASS；assignment 删除 UI/API/store tombstone cleanup。", "需要 S11 后续 assignment delete regression。", "teacher-operations 4/4；Nova Lens targeted 18/18；type-check/build passed。"],
        ["S14", "完成", "Parent navigation child focus、notices deep link/receipt、messages URL/thread state 修复并由 S11 回归。", "继续监控 parent seeded-data 覆盖。", "parent focused regressions passed；type-check later passed。"],
        ["S15", "无新鲜日志", "Adaptive tests 被 S10 fresh run 覆盖；无 S15 独立 adaptive handoff。", "California/adaptive semantics 如上线需 S15 review。", "fresh analytics/adaptive tests passed 23/23。"],
        ["S16", "无新鲜日志", "本窗口无新鲜 learning-science/research log。", "无。", "无。"],
        ["S17", "无新鲜日志", "无 reward economy/gamification 独立 handoff。", "游戏与 reward 发布需 S17/S20 协调。", "无。"],
        ["S18", "完成", "BNU high final QA/local registry promotion、US standards crosswalk granularity、California middle-school textbook repair/final QA、California practice beta QA。", "S18 QA 不等于 dirty-root production deploy 许可。", "BNU focused tests passed；CA textbook validator 0 issues；browser desktop/mobile checks passed。"],
        ["S19", "完成/需复核线上", "Production Postgres recovery/admin health、Resend Production env parity via approved DOCX、release env preflight green。", "真实 publish 仍被 S22 dirty source gate 阻止；production API 500 需重新查 logs。", "`release:env-preflight` passed；`publish-preflight` fails only dirty gate per S19 blocker。"],
        ["S20", "无新鲜日志", "有 game QA report artifact，但无正式 S20 session log。", "实际 game release 需 S20 owner handoff。", "无正式 S20 checks。"],
        ["S21", "完成", "PEP high S4-S6 lesson resend、Compulsory 1/2 private RAG intake、AR/TX official standard expansion 4570 rows。", "Raw/private RAG stays local；live source edits需 S18/S23/S04/S05。", "validators/self-tests/line counts/safety scans passed；无 app checks因未改 live TS。"],
        ["S22", "完成/active blocker", "Release hygiene guardrails、direct root deploy blocker、Vercel staging dry-run、publish/root preflight scripts。", "Direct deploy from root remains blocked until clean reviewed source or approved pruned staging。", "vercel:stage dry-run passed；root/publish preflight correctly blocks dirty tree。"],
        ["S23", "完成/协调", "Textbook sequencing、BNU junior integration gate、PEP high refresh、California post-launch/release handoff evidence。", "不要把 candidate textbook/illustrations 宣称 live curriculum。", "report/evidence checks；PEP high smoke 4/4 with S11 evidence。"],
        ["S24", "无新鲜日志", "无 exact-layer 独立 handoff。", "Question illustration exact-layer 仍需 S24 before final visual release。", "无。"],
        ["S25", "完成/active release intake", "California release closure、tsconfig excludes、gitignore/playwright temp tsconfig cleanup、copy guardrail、release decision保持 Beta。", "仍需 clean PR/release slice；不能 stage/commit/deploy。", "type-check passed；question-bank 72/72；MVP 29/29；zh-Hans audit pass；CA E2E 2/2。"],
    ]

    body = ""
    body += p("MAIS-MVP 每日总裁报告 / Daily President Report", points=20, bold=True, color=INK, after=60)
    body += p("Report date: 2026-06-07 08:00 HKT | Reporting window: 2026-06-06 08:00 to 2026-06-07 08:00 Asia/Hong_Kong", color=MUTED)
    body += p("Prepared for: Dr. Peter Hu | Prepared by: S10 Tooling, Docs, and Executive Reporting Automation", color=MUTED)

    body += heading("Chinese Executive Summary / 中文执行摘要")
    body += bullet_items([
        "本窗口不是空窗期：S01/S02/S04/S05/S06/S07/S09/S10/S11/S12/S13/S14/S18/S19/S21/S22/S23/S25 均有新鲜日志或报告证据，工作集中在发布治理、生产环境、California/BNU 内容、Nova Lens/AI Tutor、Parent/Teacher Console 与学生 P1 修复。",
        "本地质量基线明显改善：本次 S10 新鲜检查 `npm run type-check` 通过，`npm run test:analytics` 通过 23/23，`npm run build` 通过并生成 122 个静态页面。",
        "Nova Lens 文本/治理门从 HOLD 推进到 PASS：S07/S12/S13/S11/S10 后续完成 live provider、策略/审计、Teacher Operations UI 与 18/18 目标 E2E 证据；AI Tutor 图像上传 live completion 仍是非阻塞媒体后续项。",
        "内容进展较大但仍需分层发布：BNU P1-S6 formal lessons 已本地进入 lesson registry；California lesson layer 新增 95 个 beta lesson seeds；California G6-G8 textbook route 修复并通过 S18 QA；US AR/TX 标准 crosswalk 完成 item-level 扩展包。",
        "生产发布仍不能直接从当前根目录执行：工作区仍有 3346 条 status entries、32350 个 untracked files，S22/S25 明确阻止 dirty-root deploy；生产发布必须走 clean reviewed source 或 S22 pruned staging。",
        "最大风险从“代码是否能构建”转为“能否从干净、可审查、可回滚的源发布，并确认 mais.hk 生产 API/storage 仍健康”。S11 01:13 的生产 preflight 仍显示 storage-backed API 500，需要 S12/S19/S22 复核线上日志与恢复状态。",
    ])

    body += heading("English Executive Summary")
    body += bullet_items([
        "The window delivered substantial progress across release hygiene, AI governance, production environment readiness, content integration, and regression coverage; it was not an idle reporting period.",
        "The current local baseline is green: fresh S10 `type-check`, analytics/adaptive tests, and production build all passed.",
        "Nova Lens text/governance is now release-gate green on the targeted evidence set, while AI Tutor media/image completion remains a separate follow-up.",
        "California and BNU content advanced, but public release claims must remain conservative: California stays `California Math Practice Beta`, and BNU/California textbook layers still need clean-source release sequencing.",
        "The main blocker is release hygiene rather than local compilation: the root worktree is too dirty for direct production deployment, and production API/storage health needs a current S12/S19/S22 confirmation before broad live smoke.",
    ])

    body += heading("报告窗口摘要")
    body += bullet_items([
        "窗口：2026-06-06 08:00 至 2026-06-07 08:00（香港时间）。",
        "活跃会话/证据：S01、S02、S04、S05、S06、S07、S09、S10、S11、S12、S13、S14、S18、S19、S21、S22、S23、S25；S03/S08/S15/S16/S17/S20/S24 无新鲜正式日志。",
        "新鲜 blocker：S05 BNU high formal lessons（本地解决）、S12 password reset credentials（由 S19 后续 env parity 解决）、S12 Postgres residual external actions、S19 Resend env（已解决）、S22 dirty worktree direct deploy（仍 active）。",
        "变更窗口内 `git status` mtime 证据：约 190 个 dirty status paths，其中 coordination 103、components 20、tests 17、app 14、data 10、lib 10、scripts 7，以及配置/文档文件。",
        "当前根目录 dirty-tree 规模：3346 status entries；244 tracked modified；4 tracked deleted；3098 untracked status lines；32350 untracked files；tracked diff 248 files, +32018/-10917。",
    ])

    body += heading("整体项目进展")
    body += bullet_items([
        "产品体验：注册、登录、首页 CTA、Lesson Galaxy、Visualization Lab 标签、学生 P1 阻塞、Parent Console、Teacher Operations/assignment deletion 等多个用户面细节得到修复或验证。",
        "AI 能力：AI Tutor 语音互斥/回声、简体中文默认、Nova Lens 全局选择、策略、审计、Teacher governance 与 live provider smoke 形成较完整证据链。",
        "内容能力：California 题库/lesson beta、BNU 初中/高中正式 lesson seeds、Mainland PEP high lessons、US standards crosswalk、RAG intake 均有推进；多数仍需 S18/S09/S11/S22 release gate 分层签核。",
        "平台能力：S19 已完成 Resend Production env parity；S12/S19 完成 Postgres recovery/runbook/temporary admin health 路径；但线上 API 500 的最新 S11 证据必须复核。",
        "发布能力：S22/S25 增加 direct-root-deploy guard、publish preflight、production wrapper、tsconfig/gitignore cleanup；发布路径更安全，但还未形成 clean reviewed release source。",
    ])

    body += heading("S01-S25 会话状态表")
    body += table(["会话", "状态", "窗口内完成/证据", "阻塞/下一步", "检查"], session_rows, [620, 920, 3720, 2600, 1500], points=7.6)

    body += heading("已完成工作")
    body += bullet_items([
        "本地 baseline 恢复为 green：fresh type-check、analytics/adaptive tests、production build 均通过。",
        "Nova Lens 文本/治理 release gate 完整闭环：API policy、redaction、retention、audit events、Teacher UI、targeted E2E、live provider smoke 均有通过证据。",
        "Parent Console P1/P2 修复与回归闭环：child focus、notices、messages、invite-code 安全和 multi-child state 通过 focused regressions。",
        "Student P1 blocker repair 完成：learner setup gate 限制到 dashboard、direct lesson slug、dashboard heading、handwriting UI/API、student/game regressions green。",
        "BNU P1-S6 formal lessons 在本地 production lesson registry 形成完整覆盖；BNU high S18 final QA 完成。",
        "California lesson layer 增加 95 topic seeds，G6-G8 textbook route 从 review-only blocker 修复为 student-facing repaired route。",
        "S21 完成 AR/TX 4570 行 official standard expansion package，并完成 PEP high Compulsory 1/2 private RAG intake。",
        "S22/S25 增加 release guardrails，阻止 dirty root deploy，并把 nested checkout TypeScript 污染从 root checks 中隔离。",
    ])

    body += heading("进行中工作")
    body += bullet_items([
        "生产 API/storage 健康复核：S11 生产 preflight 仍显示 login/questions/lessons 500；需要 S12/S19/S22 重新看 Vercel logs、admin health、Postgres state。",
        "发布切片：当前 root 可 build，但不能直接发布；需要 clean branch/PR 或 S22 pruned staging source，并通过 `release:publish-preflight`。",
        "内容 promotion：BNU junior/high、California lessons/textbook、US standards crosswalk 需要逐包 S18/S09/S11/S22/S23 gate。",
        "Password reset：S19 env parity 已完成；仍需在安全测试账号上验证 production Resend email delivery，不记录 secret。",
        "AI Tutor media：Nova Lens text/governance green；image upload live completion 与 voice quota-order bug 仍需单独 follow-up。",
    ])

    body += heading("阻塞项")
    body += table(["事项", "状态", "证据", "需要的下一步"], [
        ["Dirty root deploy", "Active", "S22/S25: root has 3346 status entries and 32350 untracked files; direct deploy blocked.", "Use clean reviewed source or approved S22 pruned staging; require publish preflight pass."],
        ["Production API/storage", "Active verification gap", "S11 repeated production preflight RED at 01:13 HKT for login/questions/lessons 500.", "S12/S19/S22 inspect current production logs/admin health before full production smoke."],
        ["Resend/password reset", "Env parity resolved; smoke pending", "S19 configured Production variables from approved DOCX and env preflight passed.", "Run controlled production reset-delivery smoke after release-source decision."],
        ["Postgres historical data", "External blocker", "Fresh Postgres is live, but old quota-exhausted historical registrations need export/migration path.", "Owner approve old-resource recovery/export and S12 migration dry-run/apply plan."],
        ["BNU/California content public release", "Gate required", "Local QA/integration green for several packages, but deployment/public naming not authorized from dirty tree.", "Promote one package at a time through S18/S09/S11/S22/S23."],
    ], [1450, 1150, 4250, 2510], points=8.5)

    body += heading("风险")
    body += bullet_items([
        "发布风险：local build green 不能抵消 dirty-root release risk；直接发布会混入大量未审 app/API/data/public assets。",
        "生产状态风险：S19 早前 recovery green 与 S11 后续 production preflight RED 之间存在冲突证据，必须以最新 production logs 与 admin health 为准。",
        "内容声明风险：California 仍是 Math Practice Beta；BNU/California textbook 不能在未完成 gate 前宣传为完整课程或正式 curriculum。",
        "数据风险：fresh Postgres 恢复了当前 auth/storage，但旧 resource 独有历史 registration 仍不可用，迁移需审批。",
        "测试环境风险：过去 24 小时多次出现 `.next` contention、ENOSPC、webServer timeout；S22 isolation work 仍必要。",
    ])

    body += heading("测试/构建状态")
    body += table(["检查", "结果", "说明"], [
        ["Fresh S10 `npm run type-check`", "PASS", "2026-06-07 report run; current workspace tsc passed."],
        ["Fresh S10 `npm run test:analytics`", "PASS", "23/23 passed across learningAnalytics/adaptiveLearning tests."],
        ["Fresh S10 `npm run build`", "PASS", "Next production build compiled, checked types, and generated 122 static pages."],
        ["S25 question-bank/MVP/zh-Hans", "PASS", "`test:question-bank` 72/72; `test:mvp` 29/29; strict zh-Hans audit 0 critical/warnings."],
        ["S11 production auth API preflight", "RED", "Missing-user login and public questions/lessons returned 500 empty body on www.mais.hk; full production write smoke skipped."],
        ["S19 release env preflight", "PASS", "After DOCX-sourced Resend key, Production env variable inventory passed redacted preflight."],
        ["S19/S22 publish preflight", "BLOCKED", "Fails on dirty release-source gate; this is expected and protective."],
        ["Nova Lens target gate", "PASS", "Targeted current-source API/UI/provider evidence green; image-upload live completion remains separate follow-up."],
    ], [2700, 1050, 5610], points=8.6)

    body += heading("变更文件")
    body += callout("本节是窗口内 changed-file evidence 摘要，不是提交计划。S10 没有 stage、commit、branch、push、reset 或 revert。")
    body += table(["区域", "数量/范围", "说明"], [
        ["coordination/", "103 窗口内 dirty paths", "session logs、blockers、release reports、content QA、integration/release-intake artifacts。"],
        ["components/", "20", "AI Tutor/Nova Lens、Teacher/Parent UI、Lesson/Practice/Visualization/Home/Auth UI。"],
        ["tests/e2e/", "17", "Nova Lens、Teacher Operations、Parent Console、California、release matrix、handwriting/student/game regressions。"],
        ["app/", "14", "Auth/reset/register routes/pages、AI Tutor/Nova Lens APIs、teacher/parent/student lesson routes。"],
        ["data/", "10", "California/BNU lesson/question generated-content adapters and lesson registry。"],
        ["lib/", "10", "userStore, password reset delivery/request, LLM/provider/adaptive/question-bank support。"],
        ["scripts/", "7", "release env/root/publish guards, Vercel staging/production wrappers, Resend smoke, storage snapshot merge。"],
        ["config/docs", "10+", ".env.local.example, .gitignore, .vercelignore, README.md, package.json, playwright.config.ts, tsconfig.json, types/index.ts, public assets。"],
    ], [1800, 1600, 5960], points=8.6)

    body += heading("明日优先事项")
    body += numbered_items([
        "先清 release source：S22/S25/S10 形成 clean reviewed branch/PR 或批准的 pruned staging source，并让 `npm run release:publish-preflight` 通过。",
        "复核 production API/storage：S12/S19/S22 对照 S11 RED preflight 拉最新 logs/admin health，确认 mais.hk login/questions/lessons 是否恢复。",
        "做 controlled production password-reset delivery smoke：验证 Resend delivery，不泄露 token/key/link内容。",
        "只选一个内容包推进 public release gate：建议从 California Math Practice Beta lesson/textbook 或 BNU formal lessons 中二选一，按 S18/S09/S11/S22/S23 顺序走。",
        "补关键 regressions：assignment delete、AI Tutor voice quota-order、California/BNU lesson entry、parent/teacher high-risk flows。",
    ])

    body += heading("需要 Dr. Peter Hu 决策")
    body += table(["决策项", "问题", "建议"], [
        ["Release source", "是否要求 clean Git branch/PR，还是授权 S22 pruned staging 作为下一次生产源？", "推荐 clean reviewed source；dirty-root 继续禁止。"],
        ["Production API recovery", "是否授权 S12/S19 使用现有 admin session/安全 smoke 路径复核 storage health 与 API 500？", "需要，因 S11 线上 preflight RED。"],
        ["Content release priority", "下一包优先公开：California lesson/textbook、BNU junior/high formal lessons、还是 US standards/question bank？", "建议一次只推一个包。"],
        ["Postgres historical data", "是否恢复旧 Neon resource quota/export 并执行 S12 snapshot migration dry-run？", "决定历史 registration 是否必须找回。"],
        ["Public naming", "是否继续保持 `California Math Practice Beta`，并禁止完整 California curriculum/course wording？", "推荐保持 Beta，直到全 release gate 通过。"],
    ], [1800, 4700, 2860], points=8.6)

    write_docx(body)


if __name__ == "__main__":
    build()
