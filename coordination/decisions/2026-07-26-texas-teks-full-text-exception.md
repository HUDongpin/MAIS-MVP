# Texas TEKS Full-Text Exception to the Safe-RAG Standards Policy

- Date: 2026-07-26
- Session: owner-directed Texas curriculum scoping consultation
- Topic: committing the complete verbatim text of 19 TAC Chapter 111 (Texas Essential Knowledge and Skills for Mathematics)
- Status: Approved by owner; file committed at `docs/curriculum/texas-teks-math-standards.md`

## Decision

The 2026-05-23 U.S. top-10-state safe-RAG decision
(`coordination/decisions/2026-05-23-us-top10-math-safe-rag.md`) prohibits committing
"full official standards/framework text or lightly rewritten official wording." That
prohibition exists for copyright reasons: CCSS is copyrighted by NGA/CCSSO under a public
license, and state framework/guidance publications carry their agencies' copyright.

TEKS is different in kind. The TEKS mathematics standards are the text of the Texas
Administrative Code (Title 19, Part 2, Chapter 111) — a government edict. Under the
government-edicts doctrine (cf. *Georgia v. Public.Resource.Org*, 590 U.S. ___ (2020)),
the text of law and regulation is in the public domain and cannot be copyrighted.

The owner therefore approved committing the complete verbatim Chapter 111 text to the
repository to support building the `US_TX_MATH` curriculum (lesson pages, visualization
labs, practice arena, AI-tutor RAG grounding).

## Scope of the exception

- Applies ONLY to the text of the Texas Administrative Code itself (19 TAC Chapter 111,
  all subchapters), stored at `docs/curriculum/texas-teks-math-standards.md`.
- Everything else in the 2026-05-23 decision remains in force for Texas and every other
  state: no STAAR items (released, sample, or reconstructed), no publisher or textbook
  content, no TEA-authored guidance/framework/companion documents, no OER body text
  outside the attribution lane.
- This is not a precedent for other states by default. CCSS and California framework text
  remain excluded (copyrighted). Any future full-text commit for another state requires
  its own edict-status review — many states publish standards as agency documents rather
  than administrative code, and those are NOT covered by the edicts doctrine.

## Provenance of the committed file

- Retrieved 2026-07-26 from the Cornell Legal Information Institute mirror of the Texas
  Administrative Code (law.cornell.edu/regulations/texas/title-19/part-2/chapter-111),
  34 sections across Subchapters A-D, cross-checked against TEA's TEKS pages.
- One mirror defect corrected: the LII heading for §111.42 reads "Geometry"; the rule body
  is verifiably the Precalculus TEKS (conic sections, parametric equations, polar
  coordinates, vectors). The committed file titles it Precalculus and notes the correction.
- Version status at retrieval: K-8 (§§111.2-111.7, 111.26-111.28) and high-school courses
  (§§111.39-111.48) are the 2012-adopted TEKS; §§111.29-111.31 are the middle school
  advanced mathematics TEKS adopted 2025, effective 7/6/2025 (including Grade 8 Algebra I).

## Follow-up

- Phase 0 of the Texas port builds `data/teksStandards.ts` and the TEKS→CCSS crosswalk
  from this file (see the owner consultation of 2026-07-26).
- The SBOE has an active mathematics TEKS review; re-verify Chapter 111 against TEA
  directly before any production content freeze.
