# Survey: the US-curriculum language record is internally contradictory

- **Date:** 2026-08-27 (Asia/Hong_Kong)
- **Trigger:** owner reaffirmed that American curriculum, California included, ships English only, with no multi-language support. This survey checks what the repository actually records, because the QA report of 2026-08-26 filed the opposite as its largest finding.
- **Status:** survey only. No content or UI changed by this record.

## What the repository actually says

| Source | Date | States |
|---|---|---|
| `components/ui/LanguageToggle.tsx:81` | **2026-07-12** | The US-curriculum language restriction was removed as **BUG-008 (P2)**: *"header language selector works for US-curriculum users (removed the silent English-only lock)"*. Commit `76eb979c63`, **`Co-Authored-By: Claude Fable 5`** — agent-produced, committed under the owner's git identity. See the authority note below. |
| `ccss-textbook-practice-v1` header | 2026-07-19 | `languageVariant: "en-first (owner decision 2026-07-19: US California track ships English lesson bodies; zh/zhHans mirror en **until the localization workstream**)"` |
| `us-ca-k5-knowledge-point-practice-v1` header | 2026-06-23 | `languageVariant: "en-zh-zhHans"` — declares itself trilingual, and its 492 live items are fully translated |
| `us-ca-math-g6-g12-generated-bank-v2-1500` | 2026-06-01 | no `languageVariant` at all; its 1,500 live items are fully translated |
| Owner statement | 2026-08-27 | American curriculum is English only; no multi-language support |

No decision record in `coordination/decisions/` establishes a US English-only policy. The only prior written statement is the 2026-07-19 `en-first` note, and it is explicitly conditional — *"until the localization workstream"*.

## The user-visible consequence, today

The language selector is **not** curriculum-gated: `visibleLanguageOptions = languageOptions`, rendered unconditionally in `Navbar.tsx:233`. A California student can select Traditional or Simplified Chinese right now.

When they do, they receive:
- **Chinese** for 1,992 items (492 knowledge-point + 1,500 G6–G12)
- **English** for 810 items (`ccss-textbook-practice-v1`), which also *leads* practice selection

So the track is half-translated in a product that offers the language. That inconsistency is real and predates this session.

## What this means for the 2026-08-26 QA report

The report's largest finding — *"810 live items have no Chinese translation"*, filed P0 — was **half right**.

- **Right:** the CA track is internally inconsistent about language, in a product that lets CA students choose Chinese. A student switching language gets a half-Chinese experience.
- **Wrong:** the report asserted the remedy (translate the 810) without checking policy, and characterised the 2026-07-19 `en-first` header as the pack *admitting* a defect. It was a dated owner decision describing intended behaviour, and re-reading it as a confession is what produced the wrong fix direction.

The accurate finding was *"the CA track's language support is inconsistent and the product exposes a language the content does not fully cover"*, which is resolvable in either direction. The owner has now chosen English-only.

## Correction: BUG-008 was not an owner ruling

An earlier version of this record called the 2026-07-12 removal owner-authored and
treated it as an owner decision in tension with today's policy. That overstated it.

- The commit carries `Co-Authored-By: Claude Fable 5`. Git authorship in this repository
  is always the owner's identity — 500 recent commits are all authored by it, and 93 of
  them carry an explicit agent co-author trailer. Authorship therefore does not indicate
  the owner made the call.
- BUG-008 was rated **P2** in a batch of ten, and its stated reasoning is a UX
  observation — the selector was "a silent no-op" — not a policy ruling.
- The source document, "MAIS Teacher Console bug detection report (2026-07-09
  exploratory QA)", **is not in the repository**. `git grep BUG-008` returns nothing;
  the only surviving records are the commit message and the code comment. There is no
  evidence the owner reviewed that specific item.

So the record contains one owner statement about US-track language — today's, English
only — and one agent's P2 reclassification of a deliberate restriction as a defect.
That is the same category of error this session's QA report made with the `en-first`
header: an agent read an intentional constraint as a bug. It happened twice,
independently, to the same constraint.

Re-gating the selector for US accounts therefore **reverses an agent's classification,
not an owner decision**, and does not need to be recorded as superseding an owner ruling.

## Open consequence of the English-only decision

Stripping Chinese from the remaining 1,992 items makes the content consistently English — but it re-creates the condition BUG-008 removed on 2026-07-12: a CA student can still open the selector, choose Chinese, and get an English experience. **The header selector becomes a partial no-op for US accounts again.**

Resolving English-only therefore needs a UI decision as well as a content one:

1. Strip the 1,992 items **and** re-gate the selector for US-curriculum accounts — coherent, and per the correction above this reverses an agent's P2 call rather than an owner decision; or
2. Strip the content and leave the selector open, accepting that Chinese is selectable but the maths is English; or
3. Keep the selector open and treat the CA track as genuinely trilingual, which is what two of its three live packs already assume.

Not decided here.
