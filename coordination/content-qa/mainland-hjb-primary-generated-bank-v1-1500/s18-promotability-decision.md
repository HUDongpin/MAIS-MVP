# S18 Promotability Decision - Mainland HJB Primary Generated Bank V1

- Date: 2026-05-25
- Session ID: S18
- Decision: production-integrated-after-owner-approval
- Generated rows: 1500
- Deterministic audit: pass, 0 inventory issues, 300 manual/semi-manual queue rows; post-integration full question-bank gate pass 10485/10485 after four deterministic MC distractor repairs.
- DeepSeek-v4-pro QA: pass 1500, warn 0, fail 0, blocker 0.
- Release threshold: 0 P0/P1 structural/source-distance blockers, 0 duplicate IDs, 0 duplicate exact prompts, valid RAG evidence IDs, valid option/answer structure, and 0 DeepSeek-v4-pro warn/fail rows after remediation.
- Reason: The initial DeepSeek-v4-pro QA found 55 risk rows, including 4 blocker findings. S18 remediated targeted candidate rows, reran deterministic audit, refreshed all 84 DeepSeek QA batches, and the final full DeepSeek summary is green.
- Owner approval: On 2026-05-25, the owner explicitly approved production/public launch for 沪教版数学小学 P1-P6 into dedicated HJB Lesson and Practice Arena.
- Production integration status: Integrated into `data/mainlandHjbPrimaryQuestions.ts`, `data/mainlandHjbPrimaryTopics.ts`, `data/mainlandHjbPrimaryLessons.ts`, `data/questions.ts`, `data/topics.ts`, and `data/lessons.ts`.
- Production exposure: Dedicated `MAINLAND_HJB` P1-P6 students receive HJB primary topics, 250 questions per grade in Practice Arena, and HJB primary lessons with 8-question checkpoints.
