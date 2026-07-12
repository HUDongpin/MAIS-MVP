# OpenMAIC UI And Technology Stack Summary

- Date observed: 2026-06-16
- Source archive: `/Users/dongpinhu/Downloads/OpenMAIC-main.zip`
- Public source: [THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC)
- Public hosted URL checked: [open.maic.chat](https://open.maic.chat/)

## Evidence Notes

The public hosted URL resolved with title `OpenMAIC` and metadata describing an open-source AI interactive classroom. In the in-app browser, the page rendered a blank white viewport; `curl` confirmed a Next.js HTML shell loading client chunks from `file.maic.chat`. Therefore this report uses the local OpenMAIC source archive, README assets, and source-level UI components as the stable UI evidence.

The local archive was extracted only under ignored `.local/rag/tsinghua-maic/openmaic-source/`.

## UI Summary

OpenMAIC is organized around a single-user/self-hosted classroom-generation workflow:

| Surface | Main UI Pattern | Notes |
| --- | --- | --- |
| Home/generation | Centered logo and prompt composer | Large prompt area with profile greeting, agent bar, PDF attachment, web-search toggle, interactive-mode toggle, voice input, settings, language, theme, and enter-classroom action. |
| Recent classrooms | Collapsible card grid | Local classroom thumbnails, search, import, rename/delete, copy name, and updated date metadata. |
| Access code | Modal guard | Site-level access code status is checked through `/api/access-code/status`; failures default to requiring auth. |
| Classroom playback | Presentation-first learning view | Header with current scene, controls, export, language/theme/settings, edit/pro switch, scene navigation, slide/quiz/interactive/PBL renderers, chat, speech, whiteboard, and agent interaction. |
| Generation preview | Outline and scene review | Editable outline before generation, scene type controls, quiz config, and media generation status. |
| Pro/editor mode | Slide authoring workspace | Slide thumbnails, canvas editing, command bar, insert/format controls, AI assistance, and export continuity. |
| Settings | Provider and media setup | LLM, TTS, ASR, image, video, PDF, web-search, agent, and general preferences are grouped in settings panels. |

Design language: modern AI-product shell, white/dark mode, glass/blur surfaces, violet/cyan accents, icon-first controls, rounded composer, compact toolbar controls, animated affordances, and classroom-card thumbnails.

## Technology Stack

| Area | Observed stack |
| --- | --- |
| Framework | Next.js App Router 16.1.2, React 19.2.3, TypeScript 5, Node >=20.9 |
| Package manager | pnpm workspace |
| Styling/UI | Tailwind CSS 4, Radix UI, Base UI, shadcn-style components, lucide-react, motion/react, animate.css, class-variance-authority, tailwind-merge |
| AI orchestration | Vercel AI SDK `ai` 6, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, LangGraph, LangChain core |
| Providers | OpenAI, Anthropic, Google Gemini, DeepSeek, Qwen, Kimi, MiniMax, Grok, OpenRouter, Doubao, Tencent Hunyuan/TokenHub, Xiaomi MiMo, GLM, Ollama, Lemonade, OpenAI-compatible APIs |
| Media/document | TTS/ASR adapters, Azure voice listing, VoxCPM, image and video provider adapters, unpdf, MinerU, PDF parser routes, web search providers |
| State/storage | Zustand stores, Dexie/local browser storage, local classroom/stage storage utilities |
| Authoring/rendering | `@maic/dsl`, `@maic/importer`, `@maic/renderer`, ProseMirror, KaTeX/Temml, custom slide renderer/editor, canvas and SVG whiteboard |
| Export/import | PPTX export via workspace `pptxgenjs`, MathML-to-OMML conversion, classroom ZIP/resource pack export, HTML asset inlining for offline/intranet playback |
| Testing | Vitest unit tests, Playwright E2E tests, eval runners for whiteboard/orchestration/outline language |
| Deployment | Vercel, Dockerfile, docker-compose, access-code option |
| License | AGPL-3.0 |

## Source Architecture

Key folders:

- `app/`: Next.js pages and API routes, including generation, classroom, chat, PBL, media, verification, parse PDF, web search, transcription, and health endpoints.
- `components/`: UI for generation, settings, chat, roundtable, scene renderers, slide renderer/editor, whiteboard, agent bar, and stage controls.
- `lib/generation/`: two-stage generation pipeline, outline generation, scene generation, prompt formatting, pipeline runner.
- `lib/orchestration/`: LangGraph director graph, agent registry, prompts, tool schemas, state/conversation/whiteboard summarizers.
- `lib/playback/`: classroom playback state machine.
- `lib/action/`: action execution for speech, whiteboard, visual effects, and related classroom actions.
- `lib/ai/` and `lib/server/provider-config.ts`: model/provider registry and server-side provider configuration.
- `lib/media/`, `lib/audio/`, `lib/pdf/`, `lib/web-search/`: provider adapters for auxiliary generation/search/parsing.
- `lib/export/` and `lib/import/`: PPTX, HTML, classroom ZIP, and resource-pack import/export.
- `packages/`: MAIC DSL/importer/renderer plus customized PPTX/math packages.
- `skills/openmaic/`: existing OpenClaw setup/generation SOP.

## RAG-Relevant Takeaways

1. Chunk OpenMAIC by subsystem rather than by arbitrary file size; folder names map well to retrieval intents.
2. Preserve route/API records as first-class RAG objects because they describe integration contracts.
3. Preserve settings/provider records separately because provider setup is broad and safety-sensitive.
4. Keep prompt snippets and generation pipeline summaries searchable, but avoid long copied prompt dumps in committed reports.
5. Preserve UI component summaries for homepage, playback, editor, and settings because they are the most useful for MAIS design adaptation.

## Open Questions

- The public hosted site did not render in the automation browser on 2026-06-16, so a human/browser retest may be useful before claiming hosted UI behavior.
- Live classroom generation was not tested because provider/access-code use was outside this planning assignment.
- No OpenMAIC local dev server was started; the report is source-based.
