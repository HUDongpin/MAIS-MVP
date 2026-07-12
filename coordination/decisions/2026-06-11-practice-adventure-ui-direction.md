# Practice Arena Adventure UI Direction Decision

- Date: 2026-06-11
- Session: S10
- Topic: Practice Arena Adventure UI direction
- Status: Owner-approved product decision

## Decision

Adventure UI is approved as the formal Practice Arena direction.

The live Practice Arena should continue moving toward the Adventure UI model rather than returning to the prior generic Practice Arena header or reopening the 2026-06-10 alternate concepts as active candidates.

## Product Direction

Adventure UI is now the canonical direction for:

- the `/practice` entry surface
- grade/topic mission selection
- five-question same-topic practice rounds
- Adventure Island and Fishing Master handoff visibility
- future Practice Arena polish that turns the remaining functional controls into one coherent mission surface

Scheme B, Cosmic Math Mission Control, and Scheme C, Smart Study Scrapbook, remain saved references only. They are not active directions for the next Practice Arena integration pass.

## Coordination Notes

- S04 owns the next deeper Practice Arena integration pass.
- S11 owns regression coverage and release evidence for the approved Adventure UI direction.
- S04 should keep Practice Arena answer behavior, question loading, adaptive evidence, and game-unlock semantics unchanged unless separately assigned.
- S11 should treat the earlier open owner decision on Practice Arena direction as resolved by this record.
- Future president reports should not list Practice Arena visual direction as an unresolved owner decision unless the owner reopens it.

## Regression Entry Criteria

S11 can begin targeted regression from the current live Adventure UI state once the working tree has a runnable baseline.

Minimum S11 coverage should include:

- desktop `/practice` render at common laptop and wide viewports
- mobile `/practice` render at narrow and tall viewports
- no horizontal overflow on hero, grade chips, mission cards, setup controls, question round, summary dialog, and game path
- grade chip selection updates the underlying Practice Arena grade state
- Topic Mission selection updates the underlying topic state
- adaptive and free-selection question rounds still render and accept answers
- same-topic five-question completion still exposes game handoff when eligible
- Adventure Island and Fishing Master links remain reachable without duplicate navigation
- unauthenticated and authenticated states remain understandable

## S04 Deeper Integration Focus

The next S04 pass should prioritize:

- restyling remaining lower practice surfaces into the Adventure UI language
- replacing placeholder or non-durable metrics only when a real source exists
- making empty/error states visually consistent with Adventure UI
- preserving bilingual copy and dark/mobile responsiveness
- keeping question, adaptive, and game-unlock logic stable while the surface is polished

