# Blocker Report

- Date: 2026-05-27
- Session ID: S18
- Task: Generate Mainland HJB junior question illustrations with GPT Image2.
- Blocker type: Secret/credential
- What happened: The Image2 production package and dry-run queue are implemented, but a real smoke command stopped before any API request because `OPENAI_API_KEY` is not present in the shell environment.
- Files involved:
  - `coordination/content-qa/mainland-hjb-junior-question-illustrations-v1/run-image2-generation.mjs`
  - `coordination/content-qa/mainland-hjb-junior-question-illustrations-v1/image2-generation-queue.jsonl`
- Why the session stopped: GPT Image2 generation requires owner-approved OpenAI API credentials and may incur cost. The script intentionally does not fall back to any other image model.
- Decision needed from owner: Provide or approve local `OPENAI_API_KEY` access for S18/S19 and confirm whether to run the 36-image pilot first.
- Safe next step: After credentials are available, run `OPENAI_API_KEY=... IMAGE2_LIMIT=1 node coordination/content-qa/mainland-hjb-junior-question-illustrations-v1/run-image2-generation.mjs --phase pilot`, review the single image, then run the full 36-image pilot.
