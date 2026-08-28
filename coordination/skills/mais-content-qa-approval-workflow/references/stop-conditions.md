# Stop Conditions

Return `blocked`, `needs-repair`, or `rejected` as appropriate when:

- exact candidate identity, immutable digest, reviewed scope, or A18 authority is missing;
- any P0/P1 correctness, answer-key, ambiguity, source-distance, rights, age-fit, or answer-critical visual issue is unresolved;
- solver-gap or machine-clean rows are being treated as independently accepted without the required content review;
- a candidate changed after its machine or human review and old evidence is being reused;
- protected source wording, diagrams, answers, private corpus, credentials, provider responses, or personal data would be exposed;
- the requested public or production claim exceeds the exact reviewed scope;
- a request asks this skill to manufacture RSI, natural-sample, Promotion, regression, release, deployment, or live evidence;
- production state is requested but the complete same-candidate/same-SHA external evidence bundle is absent or inconsistent.

Do not clear a stop condition by renaming a verdict, sampling fewer rows without registration, or treating CI/READY as live proof.
