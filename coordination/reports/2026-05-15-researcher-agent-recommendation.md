# Researcher Agent Recommendation

- Date: 2026-05-15
- Reporting session: S10
- Project: MAIS-MVP
- Scope: Read-only analysis of whether MAIS-MVP should add `S16` as a research and learning science owner.
- Local evidence reviewed: `AGENTS.md`, `lib/adaptiveLearning.ts`, `lib/adaptiveLearning.test.ts`, S08/S15-related session logs, existing adaptive-learning reports.
- External evidence reviewed: current academic and research sources on BKT, DKT, IRT, knowledge tracing, adaptive sequencing, spaced retrieval, mastery learning, cognitive load, worked examples, and LLM tutor guardrails.

## Executive Recommendation

Recommendation: add `S16 Research and Learning Science Lead` now, but keep it as a research-only coordination role unless Dr. Peter Hu explicitly assigns implementation work.

Reason: `S15` already owns adaptive engine implementation, BKT/LLM rerank guardrails, and recommendation quality. However, MAIS-MVP now needs a separate role that can keep the adaptive engine theory-driven, cite current evidence, design evaluation rubrics, and translate research into actionable backlog items for `S15`, `S07`, `S02`, `S04`, `S05`, and `S11`. This is not bureaucracy; it is a quality-control layer for educational validity.

## Decision Criteria

| Criterion | Met? | Evidence |
| --- | --- | --- |
| Adaptive engine will keep iterating | Yes | Current engine already has BKT-style state, review scheduling, prerequisite repair, guarded LLM rerank, confidence diagnostics, and tests. |
| Project needs to explain why recommendations are educationally sound | Yes | Teacher/parent/adaptive dashboards surface recommendation rationales and audit notes. |
| MAIS-MVP aims to be theory-driven | Yes | Existing reports and code explicitly describe BKT, mastery, spaced review, and guardrails. |
| S15 has heavy implementation load | Yes | S15 owns engine logic, tests, adaptive API routes, recommendation evaluation, and LLM rerank guardrails. |
| Latest education AI and KT literature needs monitoring | Yes | 2024-2025 work is active around LLM-enhanced KT, explainability, and practical DKT limits. |
| Research should become backlog, experiments, and metrics | Yes | Current constants and thresholds need calibration plans, not only code edits. |

Result: 6/6 criteria met. Add `S16` as a formal role after owner approval.

## Current-State Theory Map

| MAIS adaptive design | Current implementation signal | Research basis | Gap or risk |
| --- | --- | --- | --- |
| Skill mastery as probability | `pMastery`, prior, learn, slip, guess constants in `lib/adaptiveLearning.ts` | Bayesian Knowledge Tracing models latent knowledge from observable performance. | Parameters are currently product heuristics, not calibrated against MAIS data. |
| Mastery, repair, and prerequisite thresholds | `adaptiveMasteryThreshold = 0.85`, `adaptiveRepairThreshold = 0.55`, `adaptivePrerequisiteThreshold = 0.65` | Mastery learning and prerequisite sequencing support not advancing too early. | Thresholds need evidence notes, sensitivity tests, or school-pilot calibration. |
| Review before new content | `reviewIntervalsDays = [1, 3, 7, 14]` and due-review priority | Distributed practice and retrieval practice have strong learning support. | Fixed intervals may not fit all grades, skills, or difficulty levels. |
| Repair before challenge | Tests confirm prerequisite gaps choose repair before harder material. | Mastery learning, cognitive load theory, and worked-example research support scaffolding. | Repair policy needs concrete instructional patterns, not only lower difficulty. |
| LLM as guarded reranker | LLM can reorder validated candidates but cannot override repair guards. | Recent AI tutor work highlights answer leakage, over-reliance, and need for pedagogical constraints. | Guardrails should be mapped to explicit tutoring principles and audit metrics. |
| Interpretability over black-box accuracy in MVP | BKT explanations and local confidence metadata are visible. | KT+LLM literature identifies accuracy and interpretability tension. | S16 should define when MAIS is ready for deeper KT models. |

## Literature Review Highlights

| Source | Year | Core finding | MAIS implication |
| --- | --- | --- | --- |
| Corbett & Anderson, "Knowledge tracing" ([DOI record](https://cir.nii.ac.jp/crid/1364233269756361984)) | 1995 | BKT models acquisition of procedural knowledge through latent mastery and observable responses. | Keep BKT as the explainable MVP safety floor. |
| Piech et al., "Deep Knowledge Tracing" ([NeurIPS page](https://papers.nips.cc/paper/5654-deep-knowledge-tracing)) | 2015 | RNN-based KT can model long student interaction sequences. | Treat DKT as a future offline-ranking candidate, not the MVP primary sequencer. |
| Ghosh et al., "Context-Aware Attentive Knowledge Tracing" ([arXiv](https://arxiv.org/abs/2007.12324)) | 2020 | Attention-based KT seeks both accuracy and interpretability. | Useful future direction if MAIS collects enough sequential data. |
| Cho et al., "A Systematic Review of Knowledge Tracing with Large Language Models" ([arXiv](https://arxiv.org/abs/2412.09248)) | 2024 | KT models often struggle to achieve both high accuracy and interpretability; LLMs introduce opportunities and risks. | Maintain transparent guardrails and require explanation/evaluation before deeper LLM-KT use. |
| Yamkovenko et al., "Practical Evaluation of Deep Knowledge Tracing Models" ([EDM 2025 PDF](https://educationaldatamining.org/edm2025/proceedings/2025.EDM.industry-papers.46/2025.EDM.industry-papers.46.pdf)) | 2025 | Deep KT can face practical limits including cold start, incorrect-answer prediction, and ordering sensitivity. | Avoid replacing BKT with DKT until MAIS has enough data and offline benchmarks. |
| Yu & Douglas, "Modeling Learning With Item Response Theory" ([SAGE](https://journals.sagepub.com/doi/abs/10.3102/10769986231193096)) | 2023 | Item-specific learning effects can improve measurement of learning and efficiency. | Add item difficulty and learning-effect metadata to the research backlog. |
| Dunlosky et al., "Improving Students' Learning With Effective Learning Techniques" ([SAGE](https://journals.sagepub.com/doi/10.1177/1529100612453266)) | 2013 | Practice testing and distributed practice have high utility across learning contexts. | Current due-review and practice design are directionally research-backed. |
| Murray et al., math spacing/retrieval meta-analysis ([ERIC](https://eric.ed.gov/?id=EJ1478558)) | 2025 | Spacing improved math outcomes; retrieval-practice effects were less consistent in subgroup findings. | Keep spaced math review, but measure effects locally instead of assuming all retrieval designs work. |
| Bloom, "The 2 Sigma Problem" ([MIT PDF](https://web.mit.edu/5.95/readings/bloom-two-sigma.pdf)) | 1984 | Mastery learning and tutoring motivate large learning gains under strong instructional support. | MAIS should use adaptive recommendations to approximate tutor-like mastery support, with teacher oversight. |
| van Gog, Paas, and Sweller, "Cognitive Load Theory and worked examples" ([Springer](https://link.springer.com/article/10.1007/s10648-010-9145-4)) | 2010 | Worked examples can reduce unnecessary cognitive load for novice learners. | Repair actions should sometimes recommend worked examples or faded examples, not only more questions. |
| Chowdhury et al., "Investigating Design Choices for LLM-Infused ITS" ([arXiv](https://arxiv.org/abs/2402.09216)) | 2024 | LLM tutors can leak answers or lack structured pedagogy without careful design. | Validate the current LLM rerank pattern: LLM explains/reorders, but does not freely tutor or generate answers. |
| Pedagogical Steering for LLM Tutors ([ACL Findings 2025 PDF](https://aclanthology.org/2025.findings-acl.1348.pdf)) | 2025 | LLM tutor systems need teacher/learning-scientist control, field evaluation, and privacy/over-reliance caution. | S16 should define pedagogy rules and field-study metrics with S07, S11, and S15. |

## Gap Analysis

| Gap | Why it matters | Recommended owner split |
| --- | --- | --- |
| Hard-coded BKT constants | Prior, learn, slip, guess, mastery, repair, and prerequisite thresholds influence every recommendation. | `S16` researches calibration options and writes parameter memos; `S15` implements approved changes. |
| Limited item-difficulty model | Current question selection can be safe but not psychometrically calibrated. | `S16` defines item difficulty and learning-effect rubric; `S04/S05` add content metadata by assignment; `S15` consumes it. |
| Fixed review intervals | `[1, 3, 7, 14]` is plausible but not proven for MAIS grade/skill mix. | `S16` proposes spaced-review experiments; `S11` defines QA/evaluation gates; `S15` implements approved scheduling variants. |
| Repair action lacks instructional-design policy | A low-mastery repair can be practice, worked example, prerequisite lesson, or teacher review. | `S16` defines repair pedagogy patterns; `S04/S05` map them to practice/lesson content. |
| LLM rerank guardrails need education-language rules | Guardrails are technically strong, but claims should map to pedagogy and safety literature. | `S16` defines tutor pedagogy principles; `S07` owns AI tutor/provider behavior; `S15` owns adaptive rerank behavior. |
| No formal adaptive evaluation scorecard | Accuracy alone is not enough; recommendations also need safety, interpretability, learning gain, and teacher trust. | `S16` designs metrics; `S11` turns them into release-quality gates; `S15` provides engine instrumentation. |

## MVP Boundaries

Do not do these in the MVP phase unless separately approved:

1. Replace BKT with neural KT as the live primary sequencer.
2. Let an LLM generate questions, answers, or prerequisite paths without QA and teacher audit.
3. Claim "research-backed" without source, year, population, and uncertainty.
4. Tune thresholds to one demo account or a tiny pilot without documenting uncertainty.
5. Give `S16` default write access to production feature code.

## Proposed S16 Role

Recommended `AGENTS.md` row, if Dr. Peter Hu approves adding S16:

| Session | Owner/role | Workstream | Allowed files/modules | Forbidden files/modules | Status | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- |
| `S16` | Research and learning science lead | Adaptive learning research, education theory, knowledge tracing literature, AI tutor pedagogy, evaluation design | `coordination/reports/`, future `coordination/research/`, literature reviews, research notes, algorithm recommendation reports, experiment plans, evaluation rubrics | Feature code unless explicitly assigned, `lib/adaptiveLearning.ts`, AI Tutor / LLM provider code, real student data analysis without approval, unverified latest-research claims without source/date | Available | Log in `coordination/session-logs/YYYY-MM-DD-S16.md` |

## Proposed Shared Coordination Rules

Add these rules only if `S16` is approved:

- `S16` owns research evidence, literature reviews, theory assumptions, experiment design, and educational validity memos.
- `S15` remains the implementation owner for adaptive engine code, adaptive API routes, adaptive tests, and recommendation behavior.
- `S16` may propose algorithm changes but must not edit `lib/adaptiveLearning.ts`, adaptive routes, AI tutor code, or shared types unless explicitly assigned.
- `S16` must cite source, year, source type, population/context when making research claims.
- `S16` coordinates with `S07` on AI tutor pedagogy and LLM safety, `S04/S05` on practice and lesson design, `S11` on evaluation gates, and `S15` on adaptive engine backlog.
- `S16` should maintain a research decision register covering mastery thresholds, spaced review intervals, item difficulty, repair pedagogy, LLM guardrails, teacher-facing explanations, and evaluation metrics.

## First 30-Day Research Agenda

| Window | Output | Purpose | Partner sessions |
| --- | --- | --- | --- |
| Week 1 | Adaptive theory baseline memo and source library | Document current MAIS assumptions and classify each as supported, heuristic, or unknown. | S15, S10 |
| Week 2 | BKT parameter and spaced-review calibration memo | Recommend how to validate prior/learn/slip/guess, thresholds, and review intervals. | S15, S11 |
| Week 3 | Repair pedagogy and worked-example policy | Define when repair should mean prerequisite lesson, worked example, faded example, or practice set. | S04, S05, S15 |
| Week 3 | LLM rerank pedagogy and safety memo | Translate tutor/LLM literature into concrete allowed and forbidden adaptive explanations. | S07, S15 |
| Week 4 | Adaptive evaluation scorecard | Define learning-gain, harmful-recommendation, calibration, teacher-trust, and interpretability metrics. | S11, S15, S02 |
| Week 4 | 30-day owner briefing | Recommend the first research-backed backlog items for implementation. | S10, S15 |

## Final Recommendation

Add `S16` after explicit owner approval.

S16 should not replace S15. S16 should make S15 faster and safer by producing evidence summaries, experiment designs, threshold recommendations, and evaluation rubrics before code changes happen. If after 30 days S16 produces only one-time literature notes and no actionable engineering decisions, downgrade the role to occasional S15/S10 research assignments.

## Validation Checklist

- S16 does not overlap with S15 implementation ownership: confirmed by research-only write scope.
- Research outputs are actionable: confirmed by proposed parameter memos, experiment plans, scorecards, and backlog recommendations.
- Sources are current and dated: confirmed through 1995 foundational BKT through 2025 KT/LLM and math learning sources.
- No code change was made: confirmed.
- `AGENTS.md` was not changed for S16: confirmed, pending owner approval.
