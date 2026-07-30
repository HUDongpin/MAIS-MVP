# MAIS-MVP Learning Design

Status: 2026-06-19
Owner: S10 tooling, docs, and coordination
Input owners: S16 learning science, S18 curriculum QA, S15 adaptive engine, S04 practice, S05 lessons

## Purpose

This document is the project-level learning-design contract for MAIS-MVP. It explains what the platform is trying to help students learn, how knowledge is structured, how lessons and practice should behave, what feedback and evaluation mean, which teaching ideas justify the design, and where AI or adaptive learning must stay bounded.

It is not a final curriculum QA signoff. S18 owns independent content QA and curriculum acceptance. It is not an implementation spec for a single feature. It is the shared instructional frame that S04, S05, S15, S16, S18, S21, S23, S11, and S22 should use when they generate, review, integrate, test, or release learning experiences.

## Required Coverage Map

The owner-requested core sections are covered as follows:

| Required area | Document section |
| --- | --- |
| 学习目标 | Learning Objectives |
| 知识点结构 | Knowledge Point Structure |
| 练习逻辑 | Practice Logic |
| 反馈机制 | Feedback Mechanism |
| 评价方式 | Evaluation And Analytics |
| 教学法依据 | Pedagogical Basis |
| AI/自适应学习边界 | AI And Adaptive Learning Boundaries |

## Current Source Evidence

The current app already exposes the main learning-design objects:

- `types/index.ts`: `Topic`, `Question`, `LessonBlock`, `LessonDetail`, `KnowledgeComponent`, `AdaptiveSkillState`, `AdaptiveLearningDecision`, and `LearningAnalyticsEvent`.
- `data/topics.ts`: curriculum-track topic maps for Hong Kong, mainland China, and US math tracks.
- `data/questions.ts`: practice questions with grade, topic, difficulty, prompt, answer, accepted answers, explanation, diagrams, and assets.
- `data/lessons.ts`: production lesson seeds with concept, worked example, checklist, visualization, extension, and practice-question links.
- `lib/adaptiveLearning.ts`: deterministic knowledge-component generation, Bayesian knowledge tracing state updates, spaced review scheduling, repair/challenge guardrails, and optional LLM-assisted reranking.
- `lib/learningAnalytics.ts`: rolling 7-day analytics over answer, hint, visualization, page-view, duration, and mistake-review events.
- `AGENTS.md`: session ownership, curriculum QA gates, candidate-to-live promotion gates, regression gates, and release gates.

## Learning Objectives

MAIS-MVP should support four nested learning objective layers:

1. Curriculum objectives: students should learn the grade-level mathematics required by their selected curriculum track, including Hong Kong P1-S6, mainland China publisher tracks, and US state math tracks currently represented in the data.
2. Mathematical practice objectives: students should represent quantities, reason with structures, choose strategies, calculate accurately, interpret diagrams, explain steps, and transfer ideas to unfamiliar or exam-style contexts.
3. Self-regulated learning objectives: students should use feedback, hints, worked examples, mistake review, and spaced retrieval to notice what they know, what is unstable, and what to do next.
4. Classroom-support objectives: teachers and parents should see enough evidence to support planning, intervention, encouragement, and review without treating raw platform activity as a high-stakes judgement by itself.

Every live topic, lesson, practice set, visualization, game, and AI tutoring action should map back to at least one curriculum objective and at least one learning-process objective.

## Knowledge Point Structure

The canonical learning unit is the topic. A topic contains:

- curriculum identity: `curriculumTrack`, optional `curriculumProfile`, `region`, `publisher`, and optional `canonicalTopicId`;
- placement: `grade`;
- learner-facing meaning: localized title and description;
- progress metadata: status, difficulty, estimated minutes, and mastery.

S15 adaptive learning decomposes each topic into three knowledge-component stages:

- `foundation`: core concepts and prerequisite language;
- `fluency`: accurate, steady work on procedures and representations;
- `transfer`: unfamiliar, challenge, or exam-style application.

The stage sequence is also the default prerequisite chain: `foundation -> fluency -> transfer`. This is intentionally simple and auditable. More complex prerequisite graphs may be introduced only when S15 owns the engine change and S18 confirms curriculum validity.

Cross-curriculum reuse should happen through `canonicalTopicId` and curriculum profiles, not by silently treating similarly named topics as identical. A mainland, Hong Kong, and US topic can share mathematical DNA while still differing in sequence, notation, examples, assessment expectations, or language.

## Lesson Logic

S05 lesson design should follow a consistent instructional arc:

1. Concept: name the idea, define the representation, and state what problem it helps solve.
2. Worked example: show a complete, inspectable route through the idea before expecting independent work.
3. Checklist: convert the worked example into reusable learner actions.
4. Visualization when useful: let students manipulate a representation that makes the mathematical relation visible.
5. Practice: connect the lesson to reviewed question IDs, not merely to topic labels.
6. Extension: invite transfer or deeper explanation after the core path is stable.

Lesson copy should be bilingual where the surrounding surface is bilingual. Mathematical notation should remain precise across languages. A lesson is production-ready only when S05 can identify the concept target, S18 can validate curriculum alignment, S04 can connect suitable practice, and S11 can cover the route in the relevant regression package.

## Practice Logic

S04 practice design should treat practice as diagnosis plus rehearsal, not as a generic quiz loop.

Practice questions should include:

- grade, topic, curriculum track, and difficulty;
- type: multiple choice, fill-in, short answer, or graph;
- localized prompt;
- correct answer and accepted answer variants where appropriate;
- localized explanation;
- optional diagram or image asset with accessible alt text.

The default practice progression is:

1. Start with topic-appropriate questions at the selected difficulty or adaptive action.
2. Give immediate feedback after an attempt.
3. Record correct or wrong evidence with topic, question, source, and duration when available.
4. Route wrong answers toward explanations, mistake review, repair practice, or a guided lesson.
5. Route stable mastery toward spaced retrieval, mixed practice, transfer, or challenge work.

The current Practice Arena includes complete-round logic and game-unlock evidence, such as requiring strong accuracy in a 5-question topic round before opening some game paths. Game unlocks should remain motivational gates, not substitutes for curriculum mastery.

## Feedback Mechanism

Feedback should answer three learner questions:

- What happened? The response was correct, incomplete, or needs review.
- Why? The explanation names the mathematical relation, operation, diagram feature, or misconception.
- What next? The next step is review, repair, lesson, practice, challenge, or mistake-book review.

Immediate feedback can use the `AttemptFeedback` shape: `correct`, localized `explanation`, and optional `correctAnswer`. Public question payloads should avoid exposing answer and explanation before an attempt.

Feedback should be specific enough to support learning but restrained enough to preserve productive thinking. For example, a first response can point to a structure or worked example rather than simply doing all work for the student. When AI is involved, S07/S15 provider behavior and adaptive semantics must preserve this instructional stance.

Mistake review should be treated as a learning surface. Wrong answers are useful evidence only if they lead to a named repair action, not if they remain as shame markers or raw failure counts.

## Evaluation And Analytics

MAIS-MVP evaluation should combine low-stakes learning evidence with human review.

Formative evidence includes:

- answer correctness and accuracy;
- attempt count, correct streak, and wrong streak;
- hint requests;
- time on answer when available;
- visualization manipulation and completion events;
- lesson progress and checklist completion;
- mistake-book review;
- adaptive mastery probability and next review date.

The current analytics layer summarizes rolling 7-day activity, including answer counts, accuracy, duration buckets, hint requests, visualization events, page views, and mistake reviews. These are evidence for support decisions, not a complete model of student ability.

Adaptive mastery estimates are probabilistic. The current BKT-style state uses mastery prior, learn, slip, guess, mastery threshold, repair threshold, prerequisite threshold, review intervals, and evidence confidence. These values may guide next-step selection but should not become high-stakes grades without separate validation by S16, S18, S11, and the owner.

S18 curriculum QA remains required before candidate content becomes live learning content. S11 regression evidence and S22 release readiness remain required before a learning surface is treated as release-ready.

## Pedagogical Basis

The project should use a compact, inspectable teaching model:

- Mastery learning: do not push students to harder material when prerequisite evidence is weak.
- Worked-example learning: show full reasoning before asking for independent fluency.
- Formative assessment: use attempts, explanations, and mistake review to decide the next teaching move.
- Retrieval practice and spacing: revisit mastered skills after short intervals rather than assuming one correct round is permanent mastery.
- Multiple representations: use diagrams, graphs, number lines, manipulable visualizations, and symbolic notation to connect concrete, visual, and abstract reasoning.
- Productive struggle: preserve thinking time, then offer hints, worked examples, or repair tasks.
- Evidence-centered assessment: keep the student model, evidence model, and task model aligned.

S16 learning-science input should keep this basis current and evidence-grounded. Local Professor David Shaffer corpus evidence supports a practice-and-evidence lens: thick authenticity links personal meaning, real-world purpose, disciplinary thinking, and authentic assessment; pedagogical praxis treats technology as a way to reorganize participation in meaningful practices; evidence-centered assessment requires an inferential chain from observable performance to student-model claims. Those sources inform this document as design guidance, not as proof that the current implementation has already achieved those ideals.

## AI And Adaptive Learning Boundaries

AI and adaptive learning should assist instruction; they must not become unreviewed curriculum authorities.

S15 adaptive engine boundaries:

- Deterministic guardrails remain authoritative for due review, repair-required, weak-prerequisite, new-lesson, mastery-practice, challenge-ready, and fallback cases.
- LLM-assisted reranking may choose among validated candidates only when provider status, format, guardrails, and candidate signatures pass.
- The engine must not recommend challenge work when hard guardrails indicate repair or due review.
- The engine must expose evidence, confidence, guard flags, and teacher audit notes where applicable.

S07 AI tutor and provider boundaries:

- API keys and provider credentials remain server-side and secret.
- Local helper mode must remain usable when live provider keys are absent.
- AI feedback should explain, question, scaffold, or suggest next steps; it should not silently invent curriculum, certify mastery, or override S18 QA.
- AI should not diagnose disability, emotional condition, or long-term ability from limited activity data.

Privacy and safety boundaries:

- Learning analytics should record only what is needed for learning support.
- Reports and logs must not expose real credentials, raw private corpus text, or unnecessary student-identifiable detail.
- Teacher or parent views should distinguish evidence from interpretation.

## Content Quality And Promotion Gates

Candidate content should follow this route:

1. S21 content pipeline creates candidate packages or RAG outputs in approved candidate locations.
2. S18 curriculum QA independently reviews accuracy, alignment, answer validity, age fit, language, and source-distance risk.
3. S23 integration plans candidate-to-live promotion and records owning-session handoffs.
4. S04 integrates approved practice content or S05 integrates approved lesson content only inside explicitly assigned scope.
5. S11 adds or runs targeted regression evidence for the affected learning journey.
6. S22 confirms release readiness through clean or isolated release gates.

No generated question, lesson, illustration, or RAG-derived item should go directly into live learning surfaces without this gate sequence unless the owner explicitly grants a narrow exception and accepts the risk.

## Readiness Checklist

A topic is learning-design ready when it has:

- clear grade and curriculum-track placement;
- localized title and description;
- known prerequisite relationship or an explicit reason no prerequisite is needed;
- aligned lesson, practice, and feedback path;
- S18-reviewed curriculum alignment for live content.

A lesson is learning-design ready when it has:

- concept, worked example, checklist, and extension;
- visualization only when it clarifies the math rather than decorating the page;
- linked practice questions or a clear diagnostic route;
- bilingual mathematical language checked for precision.

A practice item is learning-design ready when it has:

- one unambiguous correct answer or accepted-answer set;
- explanation that teaches the mathematical reason;
- difficulty that matches the intended stage;
- accessible diagram or image metadata when assets are used;
- S18 QA evidence before live promotion.

An adaptive recommendation is learning-design ready when it has:

- a visible action type;
- evidence count and confidence;
- mastery or attempt evidence;
- guard flags when applicable;
- question IDs drawn from the validated allowed set;
- a teacher-auditable reason.

## Open Maintenance Rules

Update this document when any of the following changes:

- S15 changes adaptive stages, thresholds, guardrails, or LLM rerank semantics.
- S04 changes practice round logic, feedback semantics, game unlock learning criteria, or question types.
- S05 changes lesson block structure or production-ready lesson criteria.
- S16 adds a stronger learning-science basis or evaluation design.
- S18 changes curriculum QA acceptance rules.
- S23 changes candidate-to-live promotion gates.
- S11 or S22 changes the regression or release readiness evidence required for learning surfaces.

S10 owns keeping the document findable and structurally current. Domain owners remain accountable for the correctness of their respective claims.
