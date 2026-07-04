# KE-to-MAIS Stealth Assessment Integration Spec

Prepared: June 21, 2026  
Purpose: Convert the Knowledge Explorer learning analytics framework into implementation-ready artifacts for MAIS-MVP.  
Primary website sources: `https://ke.skoonline.org/LAforKE#profile` and `https://ke.skoonline.org/aboutKE.html`  
Machine-readable companion: `KE-to-MAIS behavior-event-dictionary.csv`

## 1. Integration Thesis

Knowledge Explorer should not be embedded into MAIS-MVP as a separate product. MAIS already has the important technical seams:

- `types/index.ts`: current `LearningAnalyticsEvent`, event types, event sources, learner profile pieces, and adaptive state types.
- `lib/learningAnalytics.ts`: event validation, rolling summary, analytics export.
- `app/api/learning-events/route.ts`: authenticated event ingestion.
- `lib/server/lrsClient.ts`: xAPI/LRS statement mapping.
- `lib/adaptiveLearning.ts`: BKT-like mastery update with prior, slip, guess, learn probability, review scheduling, and adaptive recommendations.
- Student/teacher surfaces: dashboard, progress, AI tutor, practice, assessment, lessons, visualization lab, teacher analytics, teacher reports.

Therefore, the correct embedding strategy is to treat KE as a richer assessment argument and event vocabulary for MAIS. The work is not "add a KE page." The work is "upgrade MAIS learning analytics from coarse activity counting into evidence-centered stealth assessment."

## 2. Evidence Boundary

The LAforKE page claims 158 observable behaviors across 18 interaction contexts. The public HTML exposes those behaviors in compressed grouped rows. For example, one visible row may cover `1-3`, `6-9`, or `157-158`. The companion CSV preserves the visible behavior ID ranges without inventing hidden atomic rows.

For implementation, S08 should treat the CSV as a first-pass event dictionary, then expand grouped ranges into atomic MAIS event constants only where the product surface can actually emit distinct events.

## 3. Core Deliverables to Embed

| Deliverable | What it gives MAIS | Primary owner |
|---|---|---|
| Behavior event dictionary | Proposed event names, sources, payload fields, xAPI verbs, model consumers, privacy tiers | S08 + S12 |
| Derived feature schema | Computed features from raw events: dwell, path, Q2L depth, WTB reasoning, Wonderment synthesis, AI collaboration | S08 + S15 |
| Learner profile type | TypeScript shape for stealth assessment profile with evidence trail | S08 |
| Rubrics and prompts | AI-scored Q2L, WTB, Wonderment, and AI-collaboration assessment rubrics | S15 + S07 |
| Surface mapping | Where KE concepts live in MAIS pages and APIs | S02 + S13 + surface owners |
| Teacher workflow | Curriculum builder and class analytics flow | S13 |
| Validation/privacy model | Consent, low-stakes use, evidence confidence, fairness, retention, caution labels | S08 + S12 + S13 |

## 4. Event Architecture Recommendation

### 4.1 Current MAIS Limitation

Current MAIS event types are intentionally coarse:

```ts
export type LearningAnalyticsEventType =
  | "mouse-click"
  | "keyboard"
  | "answer-correct"
  | "answer-wrong"
  | "hint-request"
  | "visualization-slider"
  | "visualization-drag"
  | "visualization-probe"
  | "visualization-simulate"
  | "visualization-reset"
  | "visualization-complete"
  | "page-view"
  | "mistake-review";
```

That works for activity summaries, but it cannot express KE-style signals such as `q2l.question.submitted`, `wtb.diagnosis.verdict_recorded`, or `wonderment.synthesis.viewed`.

### 4.2 Proposed V2 Event Shape

Do not replace the current event shape immediately. Add a V2-compatible envelope that can coexist with the current API.

```ts
export type MaisLearningSignalSource =
  | "concept-map"
  | "learning-path"
  | "lesson"
  | "practice"
  | "assessment"
  | "ai-tutor"
  | "q2l"
  | "wtb"
  | "wonderment"
  | "visualization-lab"
  | "dashboard"
  | "progress"
  | "teacher-console"
  | "session";

export type MaisPrivacyTier =
  | "P0_OPERATIONAL"
  | "P1_BEHAVIORAL_PROCESS"
  | "P2_ASSESSMENT_INFERENCE"
  | "P3_LEARNER_GENERATED_CONTENT";

export type MaisLearningSignalEvent = {
  id: string;
  name: string; // e.g. "wtb.diagnosis.submitted"
  source: MaisLearningSignalSource;
  timestamp: string;
  grade: GradeId;
  topicId: string;
  conceptId?: string;
  skillId?: string;
  sessionId?: string;
  sequenceIndex?: number;
  durationMs?: number;
  privacyTier: MaisPrivacyTier;
  object?: {
    type: "concept" | "skill" | "prerequisite" | "edge" | "question" | "scenario" | "clue" | "diagnosis" | "inquiry" | "resource" | "page";
    id: string;
  };
  result?: {
    correct?: boolean;
    score?: number; // 0-1 unless explicitly documented otherwise
    difficulty?: Difficulty;
    rubricId?: string;
    verdict?: "correct" | "partial" | "incorrect" | "not-scorable";
  };
  metrics?: Record<string, number | boolean | string>;
  evidence?: {
    behaviorIdRange?: string;
    modelConsumers?: MaisLearnerModelId[];
    rawTextStored?: false;
    textHash?: string;
  };
};
```

### 4.3 Privacy Tiers

| Tier | Meaning | Examples | Storage rule |
|---|---|---|---|
| P0_OPERATIONAL | Low-risk interaction metadata | open page, click node, switch tab, complete visualization | Store as event metadata. |
| P1_BEHAVIORAL_PROCESS | Process evidence that can imply learning style or engagement | dwell time, path sequence, revisit, abandonment, latency | Store with retention policy and learner-visible explanation. |
| P2_ASSESSMENT_INFERENCE | Scored or inferred learning evidence | correctness, BKT update, Q2L depth score, WTB verdict, Bloom level | Store with confidence and evidence trail. Keep formative by default. |
| P3_LEARNER_GENERATED_CONTENT | Free text or rich learner expression | raw question, diagnosis text, chat prompt, custom observation | Store hashes, rubric scores, and short safe previews by default. Store raw text only with explicit product reason and retention limit. |

## 5. Behavior Event Dictionary

The companion CSV maps the visible KE behavior rows into MAIS-ready fields:

- `ke_behavior_ids`
- `ke_context`
- `ke_context_behavior_count`
- `ke_behavior_summary`
- `ke_assessment_signal`
- `mais_event_name_proposed`
- `mais_source_proposed`
- `mais_current_source_fallback`
- `payload_fields_proposed`
- `xapi_verb`
- `xapi_object_type`
- `privacy_tier`
- `model_consumers`
- `implementation_owner`

### 5.1 Event Source Additions

S08 should add these proposed sources after S12 confirms API/LRS compatibility:

```ts
| "concept-map"
| "assessment"
| "q2l"
| "wtb"
| "wonderment"
| "session"
| "teacher-console"
```

Current fallback sources exist for many of these, but they are too broad. For example, putting WTB under `practice` loses the distinction between ordinary answer attempts and diagnostic reasoning.

### 5.2 Event Name Families

| Family | Example events | MAIS surfaces |
|---|---|---|
| `concept_map.*` | `concept_map.setup_submitted`, `concept_map.opened_or_viewed`, `concept_map.path_recorded` | roadmap, lesson graph, visualization lab |
| `lesson_action.*` | `lesson_action.opened_or_viewed`, `lesson_action.dwell_recorded`, `lesson_action.reengaged` | lesson pages |
| `ai_tutor.*` | `ai_tutor.response_submitted`, `ai_tutor.opened_or_viewed`, `ai_tutor.closed_or_abandoned` | AI tutor |
| `assessment.*` | `assessment.response_submitted`, `assessment.score_recorded`, `assessment.reengaged` | practice, assessment |
| `q2l.*` | `q2l.response_submitted`, `q2l.score_recorded`, `q2l.selected` | AI tutor mode, lesson activity |
| `wtb.*` | `wtb.selected`, `wtb.response_submitted`, `wtb.score_recorded` | diagnostic practice, assessment |
| `wonderment.*` | `wonderment.selected`, `wonderment.response_submitted`, `wonderment.dwell_recorded` | enrichment, lesson inquiry |
| `session.*` | `session.path_recorded`, `session.reengaged`, `session.opened_or_viewed` | dashboard, navigation, progress |

### 5.3 xAPI Mapping

S12 should extend `lib/server/lrsClient.ts` so V2 events map to xAPI statements:

| MAIS event pattern | xAPI verb | xAPI object |
|---|---|---|
| `*.opened_or_viewed`, `*.dwell_recorded` | `experienced` | concept, page, inquiry, scenario, resource |
| `q2l.response_submitted` | `asked` | question activity |
| `wtb.response_submitted` | `answered` or custom `diagnosed` | diagnostic scenario |
| `assessment.response_submitted` | `answered` | assessment item |
| `*.score_recorded` | `scored` or statement result fields | rubric/result object |
| `*.reengaged`, `mistake-review` | `reviewed` | concept or prior attempt |
| `visualization-complete`, `lesson.complete` | `completed` | simulation or lesson |

Keep deterministic statement IDs using the existing `statementIdForLearningEvent(userId, eventId)` approach.

## 6. Derived Feature Schema

Raw events are not yet assessment. S08/S15 should compute features into a feature store or derived summary layer.

```ts
export type MaisDerivedFeatureFamily =
  | "dwell"
  | "navigation"
  | "help_seeking"
  | "assessment_response"
  | "q2l_depth"
  | "wtb_causal_reasoning"
  | "wonderment_inquiry"
  | "ai_collaboration"
  | "engagement"
  | "growth"
  | "class_context";

export type MaisDerivedFeature = {
  id: string;
  learnerId: string;
  topicId: string;
  conceptId?: string;
  family: MaisDerivedFeatureFamily;
  name: string;
  value: number | string | boolean;
  window: "event" | "session" | "7d" | "30d" | "all";
  confidence: "thin" | "developing" | "strong";
  evidenceEventIds: string[];
  updatedAt: string;
};
```

### 6.1 Feature Inventory

| Feature | Inputs | Model consumers |
|---|---|---|
| `dwell.node_ms` | node/edge/resource dwell events | engagement, Bloom, mastery |
| `navigation.depth_first_ratio` | node sequence, edge traversal, revisits | strategy profile |
| `navigation.prerequisite_repair_rate` | prerequisite clicks, review concept, diagnostic checks | knowledge state, metacognition |
| `help.scaffold_dependence` | simpler, hint, suggested prompt use | mastery, AI collaboration |
| `assessment.fast_correct_rate` | correctness plus response time | BKT, mastery |
| `assessment.slow_correct_rate` | correctness plus response time | mastery, productive struggle |
| `assessment.fast_wrong_rate` | incorrect plus low latency | guessing/overconfidence |
| `misconception.repair_rate` | misconception view, retry, later correctness | growth trajectory |
| `q2l.depth_score` | Q2L rubric dimensions | Bloom, AI collaboration |
| `q2l.independence_ratio` | own question vs suggested prompt | strategy, AI collaboration |
| `wtb.clue_coverage` | clues expanded before diagnosis | causal reasoning |
| `wtb.investigation_depth` | diagnostic questions before diagnosis | Bloom Apply/Analyze |
| `wtb.mechanism_depth_score` | diagnosis rubric | Bloom Analyze |
| `wonderment.critique_openness` | critics dwell plus synthesis request | Bloom Evaluate |
| `wonderment.synthesis_depth` | synthesis dwell plus answer revision | Bloom Create |
| `ai.prompt_precision` | AI tutor prompt rubric | AI collaboration |
| `ai.iteration_depth` | turns, regenerate, follow-up refinement | AI collaboration |
| `engagement.state_emission_vector` | session duration, returns, completions, abandonment | HMM |
| `growth.learning_velocity` | mastery delta over time | trajectory |
| `class.pace_percentile` | class progress distribution | teacher analytics |

## 7. Learner Profile Type Proposal

```ts
export type MaisLearnerModelId =
  | "knowledge-state"
  | "concept-mastery"
  | "bloom-depth"
  | "strategy-profile"
  | "engagement-hmm"
  | "ai-collaboration"
  | "growth-trajectory"
  | "class-context";

export type MaisEvidenceConfidence = "thin" | "developing" | "strong";

export type MaisStealthAssessmentEvidence = {
  claimId: string;
  modelId: MaisLearnerModelId;
  confidence: MaisEvidenceConfidence;
  eventIds: string[];
  featureIds: string[];
  lastEvidenceAt: string;
  explanation: LocalizedText;
};

export type MaisConceptKnowledgeState = {
  conceptId: string;
  topicId: string;
  pKnown: number; // 0-1 BKT probability
  bloomLevel: 1 | 2 | 3 | 4 | 5 | 6;
  masteryScore: number; // 0-100
  decayedMastery: number; // 0-100
  evidenceCount: number;
  confidence: MaisEvidenceConfidence;
  updatedAt: string;
};

export type MaisLearningStrategyProfile = {
  primaryArchetype:
    | "systematic-explorer"
    | "curiosity-driven-wanderer"
    | "assessment-focused-achiever"
    | "passive-consumer"
    | "help-seeking-struggler"
    | "efficient-expert";
  archetypeProbabilities: Record<string, number>;
  preferredModality: "visual" | "textual" | "hands-on" | "mixed";
  preferredDepth: "surface" | "moderate" | "deep";
  confidence: MaisEvidenceConfidence;
};

export type MaisEngagementProfile = {
  currentState: "S1_HIGHLY_ENGAGED" | "S2_PRODUCTIVE" | "S3_SURFACE" | "S4_STRUGGLING" | "S5_DISENGAGING";
  stateProbabilities: [number, number, number, number, number];
  trend: "improving" | "stable" | "declining";
  sessionsPerWeek: number;
  totalSessions: number;
};

export type MaisAICollaborationProfile = {
  promptPrecision: number;
  iterationDepth: number;
  criticalEvaluation: number;
  integration: number;
  metacognitive: number;
  efficiency: number;
  overallScore: number;
  confidence: MaisEvidenceConfidence;
};

export type MaisStealthLearnerProfile = {
  learnerId: string;
  lastUpdated: string;
  profileVersion: "ke-mais-stealth-v1";
  knowledgeState: {
    concepts: Record<string, MaisConceptKnowledgeState>;
    strongestDomain?: string;
    weakestDomain?: string;
  };
  learningStrategy?: MaisLearningStrategyProfile;
  engagement?: MaisEngagementProfile;
  aiCollaboration?: MaisAICollaborationProfile;
  growthTrajectory?: {
    learningVelocity: number;
    breadthExpansionRate: number;
    depthProgressionRate: number;
    efficiencyTrend: "improving" | "stable" | "declining";
    independenceTrajectory: "improving" | "stable" | "declining";
  };
  classContext?: {
    curriculumProgress: number;
    percentileRank?: number;
    paceRelativeToClass?: "ahead" | "onPace" | "behind";
  };
  evidenceTrail: Record<string, MaisStealthAssessmentEvidence>;
  privacy: {
    learnerVisible: boolean;
    formativeOnly: boolean;
    rawTextStored: false;
    retentionDays: number;
  };
};
```

## 8. Rubrics and Prompt Templates

These prompts are implementation templates. S07 owns provider behavior; S15 owns adaptive/scoring semantics; S08 owns typed result shape.

### 8.1 Q2L Deep Question Rubric

Dimensions, each 0-4:

| Dimension | Measures |
|---|---|
| Mechanism seeking | Asks why/how rather than what/when. |
| Relational depth | Connects at least two concepts, representations, or assumptions. |
| Specificity | Anchored in the scenario or math topic, not generic. |
| Transfer | Applies idea to a new or realistic situation. |
| Boundary/limitation | Probes when a method works, fails, or changes. |
| Originality | Learner-generated rather than copied suggestion. |

Prompt skeleton:

```text
You are scoring a learner's Question-to-Learn question for formative analytics.
Do not grade the learner. Score the question as evidence of inquiry depth.

Topic: {{topicTitle}}
Scenario: {{scenario}}
Learner question: {{learnerQuestion}}
Suggested prompt used: {{suggestedPromptUsed}}

Return JSON only:
{
  "rubricId": "q2l-depth-v1",
  "scores": {
    "mechanismSeeking": 0-4,
    "relationalDepth": 0-4,
    "specificity": 0-4,
    "transfer": 0-4,
    "boundaryReasoning": 0-4,
    "originality": 0-4
  },
  "overall": 0-1,
  "bloomEvidence": 1-6,
  "feedback": {"en": "...", "zh": "..."},
  "privacy": {"rawTextRequiredForStorage": false}
}
```

### 8.2 WTB Causal Diagnosis Rubric

Dimensions, each 0-4:

| Dimension | Measures |
|---|---|
| Evidence coverage | Read enough clues before diagnosis. |
| Diagnostic question quality | Asked targeted, mechanism-revealing questions. |
| Root-cause accuracy | Identified actual cause rather than symptom. |
| Mechanism depth | Explained why the breakdown occurred. |
| Uncertainty calibration | Avoided overconfident unsupported claims. |
| Repair persistence | Retried productively after partial/incorrect verdict. |

Prompt skeleton:

```text
You are scoring a learner's diagnostic reasoning in a When Things Break Down activity.
Use the evidence log and diagnosis text only to compute formative analytics.

Topic: {{topicTitle}}
Scenario: {{scenario}}
Clues available: {{clues}}
Clues opened before diagnosis: {{openedClues}}
Investigation questions: {{investigationTurns}}
Learner diagnosis: {{diagnosisText}}
Correct root cause: {{rootCause}}

Return JSON only:
{
  "rubricId": "wtb-causal-reasoning-v1",
  "verdict": "correct|partial|incorrect|not-scorable",
  "scores": {
    "evidenceCoverage": 0-4,
    "diagnosticQuestionQuality": 0-4,
    "rootCauseAccuracy": 0-4,
    "mechanismDepth": 0-4,
    "uncertaintyCalibration": 0-4,
    "repairPersistence": 0-4
  },
  "overall": 0-1,
  "bloomEvidence": 3-4,
  "overconfidenceFlag": true|false,
  "feedback": {"en": "...", "zh": "..."},
  "privacy": {"rawTextRequiredForStorage": false}
}
```

### 8.3 Wonderment Inquiry and Synthesis Rubric

Dimensions, each 0-4:

| Dimension | Measures |
|---|---|
| Observation originality | Custom curiosity versus selected default. |
| Question generativity | Paradox, inversion, scale, analogy, or reframe quality. |
| Answer effort | Thoughtful initial answer, not one-line compliance. |
| Critique openness | Reads and responds to critics rather than skipping. |
| Synthesis integration | Uses critique to reframe understanding. |
| Cross-domain connection | Connects mathematical idea to another domain or representation. |

Prompt skeleton:

```text
You are scoring a learner's Wonderment inquiry for formative analytics.
Focus on inquiry depth, critique openness, and synthesis.

Topic: {{topicTitle}}
Observation source: {{customOrSelected}}
Observation: {{observation}}
Genius question type: {{questionType}}
Learner answer: {{answerText}}
Critics shown: {{criticsSummary}}
Synthesis viewed: {{synthesisViewed}}
Behavior metrics: {{behaviorMetricsJson}}

Return JSON only:
{
  "rubricId": "wonderment-inquiry-v1",
  "scores": {
    "observationOriginality": 0-4,
    "questionGenerativity": 0-4,
    "answerEffort": 0-4,
    "critiqueOpenness": 0-4,
    "synthesisIntegration": 0-4,
    "crossDomainConnection": 0-4
  },
  "overall": 0-1,
  "bloomEvidence": 5-6,
  "dropoffPhase": "observation|question|answer|critics|synthesis|completed",
  "feedback": {"en": "...", "zh": "..."},
  "privacy": {"rawTextRequiredForStorage": false}
}
```

### 8.4 AI Collaboration Rubric

Dimensions, each 0-4:

| Dimension | Measures |
|---|---|
| Prompt precision | Gives enough context and asks a focused question. |
| Iteration depth | Refines based on response rather than stopping immediately. |
| Critical evaluation | Challenges, verifies, or asks for limitations. |
| Concept integration | Connects AI answer to lesson/practice concept. |
| Metacognitive awareness | Requests help type that matches need. |
| Efficiency | Reaches useful support without excessive loops. |

## 9. MAIS Surface Mapping

| KE concept | MAIS location | Implementation notes | Owner |
|---|---|---|---|
| Concept map | Roadmap, lesson graph, visualization lab | Use `concept-map` events for graph exploration. Do not need a standalone KE clone first. | S03 + S06 + S08 |
| Q2L | AI tutor mode inside lesson or practice review | Add "Ask a deeper question" mode; store rubric scores, not raw question by default. | S07 + S15 + S05 |
| WTB | Practice/assessment diagnostic mode | Add scenario, clue expansion, investigation turns, diagnosis verdict. Strongest P1/P2 stealth assessment candidate. | S04 + S15 |
| Wonderment | Lesson enrichment/inquiry mode | Use after core lesson or as challenge extension; measures Bloom 5-6. | S05 + S15 + S07 |
| Learner profile | Dashboard, progress, teacher analytics | Learner sees formative profile; teacher sees evidence confidence and caution labels. | S02 + S13 + S08 |
| Teacher curriculum builder | Teacher console resources, lesson kits, assessments | AI expands concept list into draft map; teacher reviews, edits, assigns. | S13 + S12 + S07 |
| xAPI/LRS | Existing `/api/learning-events` and `lrsClient` | Extend event shape and statement mapping. | S12 + S08 |

## 10. Teacher Workflow Distillation

The About KE page's teacher-side workflow should become a MAIS teacher console flow:

1. Teacher selects grade, curriculum profile, topic, and initial concepts.
2. AI proposes a curriculum graph: concepts, prerequisites, skills, misconceptions, sample diagnostics.
3. Teacher edits graph and rejects weak/irrelevant nodes.
4. Teacher assigns graph/activity sequence to class.
5. Students complete lessons/practice/Q2L/WTB/Wonderment.
6. MAIS summarizes class evidence: mastery, causal reasoning, inquiry depth, engagement state, scaffold dependence.
7. Teacher dashboard shows low-stakes intervention cues with evidence confidence.

Teacher-facing caution language:

```text
These signals are formative indicators from learning activity, not fixed labels.
Use them to choose support, not to grade identity or ability.
Check the evidence trail before acting on any alert.
```

## 11. Validation and Privacy Model

### 11.1 Policy

- Learners and families should know that learning analytics are collected.
- "Stealth" means embedded and low-friction, not secret.
- Use KE-derived signals for formative support unless separately validated for grading.
- Store raw learner text only when necessary; prefer hashes, rubric scores, short previews, and evidence IDs.
- Every inferred profile claim needs confidence and evidence trail.

### 11.2 Validation Checks

| Check | Purpose | Owner |
|---|---|---|
| Expert content review | Verify behaviors map to real math competencies | S16 + S18 |
| Response process interviews | Check whether behavior interpretations match learner intent | S16 |
| Human-AI rubric agreement | Calibrate Q2L/WTB/Wonderment scoring | S15 + S07 |
| Internal structure | Check whether features cluster into proposed models | S08 |
| External relation | Compare with independent assessments and teacher ratings | S16 + S13 |
| Fairness audit | Check subgroup/device/language bias | S08 + S11 |
| Consequence audit | Ensure dashboards help rather than label learners | S13 + S02 + S16 |

### 11.3 Retention Defaults

| Data | Default retention |
|---|---|
| P0 event metadata | 365 days or school-year archive |
| P1 behavioral process | 180 days unless needed for longitudinal pilot |
| P2 assessment inference | School-year archive with evidence trail |
| P3 raw learner-generated text | Do not store by default; if stored, 30-90 days with explicit purpose |
| Aggregated class analytics | School-year archive |

## 12. Model Roadmap

### P0: Fit KE into Existing MAIS Analytics

Owners: S08, S12, S02

- Add V2 event schema behind current `LearningAnalyticsEvent`.
- Extend event sources and validation.
- Extend xAPI/LRS mapping.
- Add learner-visible analytics explanation.
- Use existing BKT state as the first knowledge-state layer.

### P1: Add Assessment-Rich Modes

Owners: S15, S07, S04, S05

- Q2L as AI tutor/lesson activity.
- WTB as diagnostic practice/assessment mode.
- Wonderment as enrichment/inquiry mode.
- Rubric scoring with human-audited prompt outputs.
- Derived feature store for Q2L/WTB/Wonderment.

### P2: Add Unified Learner Profile and Teacher Analytics

Owners: S02, S13, S08

- Build `MaisStealthLearnerProfile`.
- Student dashboard: formative profile and recommended next actions.
- Teacher dashboard: class map, evidence confidence, intervention cues.
- Growth trajectory and class context features.

### P3: Validate and Scale

Owners: S16, S11, S13

- Pilot study.
- Fairness and consequence audits.
- Teacher workflow refinement.
- Decide whether any signal is valid for higher-stakes use. Default answer should remain "no" until proven.

## 13. Exact Session Ownership

| Session | Accountable scope for this integration |
|---|---|
| S08 analytics/types | Owns event schema, source/type unions, validation, derived features, learner profile type, analytics tests. |
| S15 adaptive semantics | Owns BKT/mastery integration, Bloom evidence rules, Q2L/WTB/Wonderment rubric semantics, recommendation use. |
| S12 event API/LRS | Owns `/api/learning-events`, persistence contract, LRS/xAPI statement mapping, privacy-preserving ingestion. |
| S02 dashboard/profile | Owns student dashboard/profile display, learner-facing explanations, progress summaries, export language. |
| S13 teacher console | Owns teacher analytics, curriculum builder workflow, evidence caution labels, class intervention views. |

Adjacent but not core:

- S07 owns provider prompts and AI tutor behavior.
- S03 owns roadmap/concept graph surfaces.
- S04 owns practice/assessment surfaces.
- S05 owns lesson/Wonderment surfaces.
- S11 owns regression/fairness test harness once implementation begins.
- S16 owns research validity and pilot design.

## 14. Acceptance Criteria for First Implementation Slice

A first MAIS implementation slice is complete when:

1. S08 can validate at least one V2 event from each source family: concept map, assessment, q2l, wtb, wonderment, session.
2. S12 can convert those events to deterministic xAPI statements without storing raw P3 text.
3. S15 can compute at least five derived features: `q2l.depth_score`, `wtb.clue_coverage`, `wtb.mechanism_depth_score`, `wonderment.synthesis_depth`, and `ai.iteration_depth`.
4. S02 can show learner-facing formative language for the profile.
5. S13 can show teacher-facing evidence with confidence and caution labels.
6. S16/S11 can run or specify a validation/fairness checklist before any high-stakes use.

## 15. Files to Hand to Implementers

- Main spec: `KE-to-MAIS Stealth Assessment Integration Spec.md`
- Event dictionary: `KE-to-MAIS behavior-event-dictionary.csv`
- Human concept brief: `Knowledge Explorer as a stealth assessment.md`
- Provenance: `Knowledge Explorer as a stealth assessment.provenance.md`

