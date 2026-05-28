# Parent Console Terminology Decision

- Date: 2026-05-13
- Session: S10
- Topic: Mature-market wording for Parent Console demo and role language
- Status: Recorded for future product and market copy decisions

## Decision

For a mature MAIS website and market-facing demo, prefer:

```text
Peter's Guardian
```

Avoid:

```text
Parent's Parent
```

## Rationale

`Peter's Guardian` is clearer, more formal, and more inclusive for a mature education product. It can cover parents, grandparents, legal guardians, and other caregivers without assuming one family structure. This also matches the existing product model name `GuardianLink`, so the market wording and data model can grow together.

`Peter's Parent` is still friendly and easy to understand for early demos. It pairs naturally with `Student Peter`, so it is acceptable for a warm MVP demo account.

`Parent's Parent` should not be used. In English, it means "the parent of a parent", which reads as a grandparent relationship and does not clearly mean "Peter's parent/guardian".

## Recommended Usage

- Product entry: `Parent Console` / `家长端`
- Formal role label: `Parent / Guardian`
- Mature-market demo account: `Peter's Guardian`
- Warm MVP demo account: `Peter's Parent`
- Data model: keep using `GuardianLink`
- Avoid in UI, docs, and test data: `Parent's Parent`

## Implementation Note

The current default demo account may remain `Peter's Parent` during MVP testing. When MAIS is ready for more polished external demos or school-facing market material, update the parent demo username/profile label to `Peter's Guardian` in:

- `components/providers/AppProviders.tsx`
- `lib/server/userStore.ts`

Future tests and docs should import or reference the shared demo account constant where possible instead of hardcoding either label.
