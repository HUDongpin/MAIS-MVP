# S18 Launch Approval - Mainland BNU AI-Generated Content

- Date: 2026-05-28
- Session ID: S18
- Owner approval: "批准北师大AI生成的教材上线"
- Decision: approved-for-public-launch
- Product scope: Mainland BNU / BNUP P1-S6 AI-generated mathematics learning and practice content.
- Launch behavior: Remove the BNUP S1-S3 coming-soon gate and expose the already S18-approved junior question package through Roadmap, Practice, and authenticated question API surfaces.

## Approval Basis

- BNUP primary P1-P6 generated packages are already approved and public.
- BNUP junior S1-S3 generated package is already S18-approved for data-layer integration after DeepSeek issue review, remediation, and manual queue approval.
- BNUP senior S4-S6 generated package is already S18-approved for product integration through the approved deterministic pack.
- This approval records the owner decision to treat the BNUP generated content family as launchable across P1-S6.

## Guardrails

- Keep publisher isolation as `publisher: "MAINLAND_BNU"` and do not mix BNUP rows into PEP, HJB, HK, or US profiles.
- Product code must continue importing approved/remediated packs only.
- No live provider calls, secret edits, or unapproved source textbook text are authorized by this launch approval.
- Separate lesson-textbook source-pack QA remains a future S18/S05 task if the owner wants richer generated lesson bodies beyond existing app lesson scaffolding and approved practice content.
