# Curriculum Track Architecture Decision

- Date: 2026-05-16
- Session: S10
- Topic: MAIS curriculum architecture for Hong Kong students and Mainland PEP students
- Status: Recorded as product memory for future roadmap, data, AI Tutor, and content-ingestion work

## Decision

MAIS should be designed as:

```text
One learning platform
Two curriculum tracks
One internal mathematics knowledge graph
```

The two student-facing curriculum tracks are:

- Hong Kong Curriculum Track: for Hong Kong students who must learn the Hong Kong curriculum.
- Mainland PEP Curriculum Track: for Mainland students who must learn the Mainland People's Education Press mathematics curriculum.

The student-facing product must keep these tracks clearly separated. A student should see learning paths, lessons, questions, AI explanations, progress reports, and recommendations from the curriculum track assigned to that student.

Internally, MAIS may connect both tracks through a shared mathematics knowledge graph so that the platform understands common mathematical concepts across curricula without mixing the student-facing syllabus sequence or terminology.

## Product Principle

Do not present the choice as a political or identity choice. Present it as a learning-material choice:

```text
Which mathematics curriculum are you studying?
- Hong Kong Curriculum
- Mainland PEP Mathematics
```

For Chinese UI, use neutral product wording such as:

```text
你正在学习哪套数学课程？
- 香港课程
- 人教版数学
```

## Track Separation Requirements

Every curriculum-dependent object should eventually carry a curriculum-track field, for example:

```ts
type CurriculumTrack = "HK" | "MAINLAND_PEP";
```

This applies to:

- grade and roadmap nodes
- lessons
- practice questions
- worked examples
- common mistakes
- AI Tutor retrieval documents
- adaptive-learning recommendations
- progress analytics
- parent and teacher reports

The AI Tutor must not freely blend Hong Kong and PEP content. When answering a student, it should retrieve only from that student's assigned curriculum track unless an owner-approved cross-curriculum comparison mode is explicitly added later.

## Knowledge Graph Approach

The public curriculum structure should stay track-specific, while the internal concept model can be shared.

Example:

```text
Global concept: linear-equations

Hong Kong Curriculum Track:
- S1 / Algebra / Linear equations

Mainland PEP Curriculum Track:
- 七年级上 / 第三章 / 一元一次方程
```

This allows MAIS to:

- preserve the student's required local curriculum order
- compare progress across curricula at the concept level
- support future transfer or bridging workflows
- let AI explanations respect the student's textbook terminology
- avoid duplicating all adaptive-learning logic for each curriculum

## Suggested Data Shape

Future implementation can use a structure similar to:

```ts
type CurriculumTrack = "HK" | "MAINLAND_PEP";

type CurriculumNode = {
  id: string;
  track: CurriculumTrack;
  grade: string;
  term?: string;
  chapter: string;
  lesson: string;
  concepts: string[];
  language: "en" | "zh-Hant" | "zh-Hans";
};
```

Hong Kong should be treated as a curriculum track with possible school or textbook-edition configuration. Mainland PEP should be treated as a specific textbook-version track with grade, volume, chapter, and lesson structure.

## Content Ingestion Method

Codex or future content agents should not simply ingest full textbooks and let the model improvise. Content absorption should be structured into layers:

- Source layer: curriculum standards, authorized textbook material, public syllabi, owner-approved references, and original MAIS-created content.
- Structure layer: grade, term, chapter, lesson, concept, worked-example type, misconception, and practice difficulty.
- Knowledge graph layer: shared MAIS concept IDs mapped to track-specific curriculum nodes.
- Retrieval layer: AI Tutor and adaptive systems retrieve only the documents permitted for the student's curriculum track.

Copyright and licensing must be checked before storing or reproducing textbook passages, examples, images, or exercises. Prefer owner-approved sources, public standards, licensed content, and MAIS-original explanations/questions.

## User Experience Direction

Hong Kong students should see:

- P1-P6 and S1-S6 structure
- Hong Kong curriculum progress
- English, Traditional Chinese, and Hong Kong terminology support where appropriate
- future DSE or school-version alignment where appropriate

Mainland PEP students should see:

- Mainland grade structure
- PEP mathematics
- 上册/下册, chapter, and lesson sequencing
- Simplified Chinese terminology

The student home page, learning path, practice arena, AI Tutor, and reports should default to the student's assigned track.

## Coordination Notes

Relevant session ownership for future implementation:

- S03: curriculum roadmap, grade/topic structure, and learning-path UI
- S04: practice question-bank integration
- S05: lesson content surfaces
- S07: AI Tutor retrieval and answer guardrails
- S08: shared types and provider state
- S09: bilingual copy and terminology
- S15: adaptive-learning recommendations and concept-level mapping
- S16: research and learning-science evidence
- S18: curriculum/content QA and Hong Kong / Mainland alignment verification

Do not implement this architecture by editing shared types, roadmap data, question banks, or AI routes unless the owner assigns the relevant session and write scope.

## Open Decisions

- Which exact Hong Kong curriculum references and school textbook versions are owner-approved for ingestion?
- Which exact PEP editions and grade volumes are in scope first?
- Should MAIS support student transfer or bridge mode between Hong Kong and PEP later?
- What licensing model will be used for textbook-derived examples, images, or exercises?
- Should the first implementation begin with content mapping, AI retrieval isolation, or student onboarding track selection?
