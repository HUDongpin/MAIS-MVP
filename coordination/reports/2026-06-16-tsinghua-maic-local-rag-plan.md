# Tsinghua MAIC Local RAG Development Plan

- Date: 2026-06-16
- Session: S21 with S10-style report packaging
- Objective: Plan a local RAG that distills OpenMAIC source, public OpenMAIC UI observation, and owner-provided ClosedMAIC UI screenshots into safe guidance for future Codex sessions.

## Source Inventory

| Source | Status | Local handling | Notes |
| --- | --- | --- | --- |
| OpenMAIC public source archive | Extracted locally | `.local/rag/tsinghua-maic/openmaic-source/` | 95 MB extraction, 1,163 files. Major file types: 578 `.ts`, 251 `.tsx`, 76 `.md`, 55 `.js`, 35 `.json`. |
| Public OpenMAIC site | Observed on 2026-06-16 | Browser + `curl` metadata only | `https://open.maic.chat/` resolved with title `OpenMAIC` and metadata, but rendered blank in the in-app browser. HTML loads client chunks from `file.maic.chat` and includes the app shell/access guard. |
| ClosedMAIC UI screenshots | Extracted locally | `.local/rag/tsinghua-maic/closed-ui/` | 34 MB extraction, 15 screenshots. Reports summarize the web app only and ignore meeting strip, browser chrome, and macOS Dock. |

`.local/` is git-ignored. Raw extracted source, screenshots, generated contact sheets, and any future raw OCR/chunk output should remain there.

## RAG Goals

1. Help Codex sessions answer: "How does OpenMAIC implement this?" without repeatedly re-reading the whole source tree.
2. Help product/design sessions compare MAIS-MVP with MAIC-style classroom, editor, and teacher-management workflows.
3. Preserve ClosedMAIC UI insights as source-distant observations, not copied screenshots or private UI dumps.
4. Provide a local-only retrieval system that can run while offline or without sending private evidence to an external provider.

## Proposed Architecture

Use a two-lane local RAG:

| Layer | Recommended default | Purpose |
| --- | --- | --- |
| Manifest store | SQLite | Stable IDs, source type, path, privacy class, subsystem, screen/category tags, extraction status. |
| Keyword index | SQLite FTS5 | Fast exact search for routes, component names, provider IDs, UI labels, and feature terms. |
| Vector index | SQLite vector extension, LanceDB, or Chroma local | Semantic retrieval over source-distant summaries and code/doc chunks. |
| Embeddings | Local Ollama embedding model or local sentence-transformer | Avoid uploading ClosedMAIC material. External embeddings require owner approval. |
| Safe cards | JSONL/Markdown under `coordination/reports/` or `coordination/content-qa/` | Human-readable distilled summaries that can be committed safely. |

## Corpus Model

Recommended chunk families:

| Family | Inputs | Chunking method | Privacy class |
| --- | --- | --- | --- |
| `openmaic-docs` | README, CHANGELOG, skill docs | Heading-aware Markdown chunks | Public |
| `openmaic-routes` | `app/**/page.tsx`, `app/api/**/route.ts` | One route/API per record plus summaries | Public |
| `openmaic-components` | `components/**/*.tsx` | Component-level chunks keyed by exported component | Public |
| `openmaic-core-lib` | `lib/**/*.ts(x)` | Subsystem chunks by folder/function/class | Public |
| `openmaic-packages` | `packages/**` | Package manifest plus exported APIs | Public |
| `openmaic-tests` | `tests/**`, `e2e/**` | Test intent and covered subsystem | Public |
| `closedmaic-ui-observations` | Screenshot visual inspection/OCR notes | One source-distant screen card per screenshot | Private-derived safe summary |
| `public-site-observation` | Browser/curl metadata | One observation card per date/check | Public web observation |

## Metadata Fields

Every record should include:

- `id`: stable hash of source path plus chunk type.
- `source_name`: `openmaic-source`, `openmaic-live`, or `closedmaic-ui`.
- `source_path`: local path or public URL; private screenshot paths stay local-only when possible.
- `privacy_class`: `public`, `private-local`, or `private-derived-safe`.
- `subsystem`: e.g. `generation`, `orchestration`, `playback`, `editor`, `settings`, `provider`, `export`, `closed-ui-course-management`.
- `artifact_type`: `code`, `docs`, `route`, `api`, `ui-observation`, `report`, `test`.
- `summary`: source-distant summary.
- `symbols`: exported components/functions/routes/provider IDs where applicable.
- `keywords`: controlled tags.
- `last_observed`: ISO date.
- `safe_to_commit`: boolean.

## Implementation Phases

1. **Preflight and inventory**
   - Verify `.local/` is ignored.
   - Re-run archive listings and aggregate counts.
   - Record source dates, archive names, and unsupported files.

2. **OpenMAIC source extractor**
   - Parse Markdown headings for docs.
   - Parse `package.json`, workspace packages, route files, and config files as structured JSON where possible.
   - Use TypeScript-aware extraction for exported symbols where practical; fallback to `rg` plus file-level summaries.
   - Avoid storing full code in committed outputs.

3. **ClosedMAIC UI observation extractor**
   - Store raw screenshots locally only.
   - Create human-authored or local OCR-assisted screen cards.
   - Redact/avoid internal users, meeting participants, and private watermarks.
   - Tag each screen by workflow: hub, teacher home, playback, AI chat, page transcript, editor, course content, agent config, admin, data, students.

4. **Index build**
   - Build SQLite manifest and FTS5 tables.
   - Add vector embeddings only after choosing a local embedding backend.
   - Keep private vectors local; do not commit vector DB files unless the owner explicitly approves.

5. **Retrieval adapter**
   - Provide a CLI such as `query-maic-rag "how does OpenMAIC export PPTX?"`.
   - Return source IDs, summaries, and safe citation pointers.
   - Include retrieval modes: `source-code`, `ui-pattern`, `tech-stack`, `comparison`, `implementation-plan`.

6. **Validation and safety**
   - Run schema validation.
   - Run secret/internal-identifier scans on committed summaries.
   - Confirm no raw screenshot files or raw chunks are staged.
   - Spot-check top queries against source files and reports.

7. **Handoff**
   - S21 owns local RAG build and package scripts.
   - S10 owns coordination/report packaging.
   - S18 reviews any curriculum or pedagogy claims.
   - S23 plans any candidate-to-live integration.
   - S11/S22 own regression/release gates if this becomes app behavior.

## Initial Query Set

- "What is OpenMAIC's generation pipeline?"
- "Which OpenMAIC components define classroom playback?"
- "How does OpenMAIC configure LLM, TTS, ASR, image, video, and web-search providers?"
- "Which ClosedMAIC screens support teacher course management?"
- "Compare OpenMAIC's home generation UI with ClosedMAIC's MAIC Hub."
- "What MAIC-inspired UI patterns are safe to adapt into MAIS-MVP?"
- "What should not be copied from ClosedMAIC?"

## Stop Conditions

- Do not upload ClosedMAIC screenshots or raw extracted observations to external providers.
- Do not commit raw screenshot images, OCR dumps, internal user identifiers, or private screenshot paths in broad public-facing docs.
- Do not integrate MAIC features into live MAIS-MVP routes without explicit owner assignment and owning-session coordination.
- Do not infer proprietary backend behavior from screenshots beyond visible UI affordances.

## Checks For This Planning Pass

- Verified `.local/` is git-ignored.
- Extracted OpenMAIC and ClosedMAIC evidence into `.local/rag/tsinghua-maic/`.
- Observed the public OpenMAIC URL on 2026-06-16; page resolved but rendered blank in the in-app browser.
- Produced safe summary reports and a reusable Codex skill.

Not run: application tests, because this was planning/report-only work.
