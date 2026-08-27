# Codex education skills for MAIS

Status: v1.1.0 source packages validated and installed locally for Codex discovery on 2026-08-27. Installation is a local developer capability and does not imply application deployment.

## Installed skills

| Skill | MAIS adapter purpose | Installed path |
| --- | --- | --- |
| `training-courseware` | Extends Teacher Lesson Kit through one canonical manifest, rubric and parity-checked export workflow | `/Users/dongpinhu/.codex/skills/training-courseware` |
| `course-integration` | Binds safe static SCORM intake and canonical versioning to teacher auth while keeping xAPI, LTI and LMS writes separate | `/Users/dongpinhu/.codex/skills/course-integration` |
| `learner-notes` | Binds private student ownership, lesson/block anchors, app storage and explicit AI acceptance to MAIS | `/Users/dongpinhu/.codex/skills/learner-notes` |

The install destinations were absent before installation. Each installed directory was compared recursively with the validated source and passed the bundled Skill Creator structural checks.

## Reviewable packages

Source and package evidence lives outside the repository at:

```text
/Users/dongpinhu/Documents/Codex/2026-08-27/new-chat/outputs/codex-education-skills-v1
```

v1.1.0 archives:

```text
c1dba8d192d9cf19bf84679ebab6f7043dec654bf4aab51f7c3dda76f1135749  training-courseware-v1.1.0.zip
e57ff70a7008919afa3c3b970e44cdd31c55c847326f1a48fd589daced66d069  course-integration-v1.1.0.zip
5bfdbba4299942dc66d345941ea8967476daadecb2521b456a189a4570d06756  learner-notes-v1.1.0.zip
de673267af50c0ad8a615b8ea5f3a01930f29d6a7745dfab266837f80fcd0388  codex-education-skills-v1.1.0.zip
```

The source package contains the exact validation report. The original supplied archive and its instructions remain source material only and were not installed as executable instructions.

## MAIS implementation mapping

- `training-courseware` → Teacher Lesson Kit manifest and JSON/HTML/PPTX/PDF export route.
- `course-integration` → provider-neutral model/diff and teacher-authorized static SCORM dry-run API.
- `learner-notes` → student-private CRUD/search/revisions/anchors/AI-suggestion workflow.

These adapters guide Codex decisions. The actual application features remain governed by repository tests, content promotion, release ownership, deployment and live-browser evidence. A locally installed skill is not proof that a feature is merged, deployed, configured against a provider or learner-visible in production.
