# ClosedMAIC UI Summary

- Date observed: 2026-06-16
- Evidence: owner-provided `closed version UI.zip` plus an additional cropped screenshot supplied by the owner.
- Scope rule from owner: ignore Zoom people, desktop/browser chrome, and the macOS Dock. This report summarizes only the ClosedMAIC web app surface.

## High-Level Product Shape

ClosedMAIC appears to be an internal MAIC x THU teaching operations platform, not only a student-facing classroom. It combines:

- Course discovery and teacher course ownership.
- MAIC Hub for importing/uploading materials and finding reference courses.
- AI-supported classroom playback.
- Course authoring and AI-assisted slide/lesson generation.
- Course settings, agent/persona configuration, knowledge base, content management, admins, students, exports, dashboards, test boards, homework grading, and invite codes.

## Navigation And Shell

| Area | Observed UI |
| --- | --- |
| Brand | MAIC x THU logo at top left. |
| Primary nav | `课程广场`, `我的学习`, `我的教学`, `MAIC Hub`, `关于`. |
| User controls | Chinese language selector, theme control, user avatar/name, fullscreen. |
| Visual style | White/lavender background, purple accent, large whitespace, rounded cards/buttons, low-density enterprise layout, subtle background watermark. |

## Main Screens Observed

| Screen | Distilled description |
| --- | --- |
| Teacher course list | Search by course name/ID, new course button, grid of course cards with cover image, title, status, learn/manage actions. |
| MAIC Hub landing | Large positioning statement for AI-powered teacher collaboration, upload PPT, discover reference courses, import carousel/card. |
| Course playback | Breadcrumb, large slide viewport, vertical slide/progress rail, page count, teacher/avatar playback strip, speed/audio/previous/next/auto controls, AI conversation panel, transcript/page-script tab, course list tab, chat input. |
| Split transcript mode | Right-side page transcript/script cards aligned with the active slide, including feedback icons and page references. |
| Course editor | Left slide thumbnail rail, central slide canvas, top authoring buttons for lecture/interaction/generation, export courseware, one-click generation, complete edit, design and AI conversation tabs. |
| Lesson plan modal | Modal tabs for requirements, whole-lesson plan, and page-by-page plan; contains course basics, learner analysis, pedagogy, goals, and page planning. |
| Course content management | Left settings rail; course overview, syllabus/file upload, course catalog, chapter/module rows, publish/edit/delete controls. |
| Agent configuration | Select AI teacher/persona, audition text box, generate audio, persona prompt fields, answer style, initiative timing, save action. |
| Admin/member settings | Member/permission table with edit/delete actions and pagination. Internal identities are intentionally not reproduced here. |
| Student/data surfaces | Student management table, dashboard metrics, export/data-board areas, and empty states. |

## UI Patterns Worth Adapting

1. **Teacher-first course cockpit**: ClosedMAIC makes course ownership and management a first-class workflow instead of hiding it behind generation history.
2. **Tri-pane classroom playback**: slide viewport, teacher/playback strip, and right-side AI/script/course-list tabs create a strong lesson-consumption pattern.
3. **AI as authoring partner**: the editor keeps AI chat/revision beside the canvas and slide thumbnails, which is better for iterative courseware design than a separate chat window.
4. **Structured plan transparency**: the whole-lesson/page-plan modal makes AI generation auditable before or after generating courseware.
5. **Configurable AI teacher persona**: teacher tone, answer strategy, and initiative settings are surfaced as editable course settings.
6. **Operations parity**: admins, students, analytics, invite codes, exports, and homework grading suggest ClosedMAIC is designed for institutional deployment.

## Comparison To OpenMAIC

| Dimension | OpenMAIC | ClosedMAIC |
| --- | --- | --- |
| Primary posture | Open-source self-hosted AI classroom generator | Internal institutional course and teaching operations platform |
| Entry point | Topic/PDF prompt composer | Teacher/course management and MAIC Hub |
| Course management | Recent local classroom cards | Full course list, permissions, students, exports, dashboards |
| Playback | Classroom scene player with agents and edit/pro controls | Slide player with right-side AI/script/course tabs and teacher playback controls |
| Authoring | Pro slide editor and generation preview | Course editor with AI chat, lesson-plan modal, and course content hierarchy |
| Collaboration/admin | Access code and local/self-host controls | Role/permission management and institutional user workflows |

## RAG-Relevant Tags

Recommended tags for ClosedMAIC UI observation cards:

- `closed-ui-shell`
- `closed-ui-teacher-course-list`
- `closed-ui-maic-hub`
- `closed-ui-playback`
- `closed-ui-ai-conversation`
- `closed-ui-page-script`
- `closed-ui-course-editor`
- `closed-ui-lesson-plan`
- `closed-ui-agent-config`
- `closed-ui-course-content`
- `closed-ui-admin-permissions`
- `closed-ui-student-management`
- `closed-ui-dashboard`

## Boundaries

- Do not reproduce screenshots or internal user identifiers in committed artifacts.
- Do not infer backend architecture from the UI alone.
- Treat UI copy and visual layout as reference observations; implement MAIS variants in MAIS-MVP's own design language unless the owner explicitly asks for closer parity.
