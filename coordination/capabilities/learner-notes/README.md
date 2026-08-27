# MAIS learner-notes capability

Status: private learner-note MVP implemented and locally verified on the feature worktree. This document does not claim deployment or production verification.

## Product behavior

Authenticated students can:

- create, read, edit and permanently erase private notes;
- save a lesson-text selection as a text-quote anchor;
- keep notes attached to a lesson or stable lesson block;
- search the current lesson or all of their own notes by title, body and tags;
- request explain, summarize, quiz-me or next-step AI suggestions;
- explicitly accept and append an AI suggestion, or discard it without persistence.

The lesson entry point is `components/lesson/LearnerNotesPanel.tsx`, integrated with the existing selection surface in `components/lesson/LessonView.tsx`.

## Persistence and API

Notes use the existing server-side MAIS application snapshot path, which is backed by the configured SQLite or PostgreSQL store. The root snapshot gains a normalized `learner_notes` collection; no browser local storage is used for note content.

API surface:

```text
GET    /api/learner-notes
POST   /api/learner-notes
GET    /api/learner-notes/:noteId
PATCH  /api/learner-notes/:noteId
DELETE /api/learner-notes/:noteId?erase=true
GET    /api/learner-notes/:noteId/revisions
POST   /api/learner-notes/:noteId/assist
```

Updates and deletion require an exact `If-Match` ETag. A stale version fails with HTTP 412 instead of overwriting another session. Requests also require the exact `X-MAIS-Expected-User-Id`, which prevents a stale browser document from acting after the signed-in account changes.

## Privacy boundary

- Visibility is server-forced to `private`; clients cannot set or broaden it.
- The authenticated student ID is the owner authority. Owner IDs supplied by a client are rejected.
- Ownership, deletion state and lesson scope are filtered before search ranking or excerpt generation.
- Teachers, parents, administrators and other students have no note-read path in this MVP.
- Normal responses set private, no-store browser and CDN cache headers.
- Note text is rendered as React text, never injected as HTML.
- Permanent erase removes the note and its in-snapshot revision history.

Operational backup retention is controlled by the deployment's database/backup policy. The application can prove deletion from the live application snapshot, but it must not claim immediate removal from historical infrastructure backups without separate provider evidence.

## Anchor behavior

Anchors store stable MAIS identifiers (`lessonSlug`, `topicId`, optional `blockId`/`blockType`) plus an optional selected quote and surrounding context. If the referenced lesson or block no longer exists, the note remains available and its anchor becomes `orphaned`; content is not silently deleted or reattached.

## AI boundary

AI assistance is an explicit, user-triggered action. The provider request includes only bounded note text and a topic label—never the note ID or owner ID. Note text is delimited as untrusted data, provider calls are uncached, and the returned suggestion has `persisted: false`. Persistence occurs only through a later learner-authorized PATCH marked `ai-accepted`.

Missing provider configuration or provider failure returns a recoverable error and does not interrupt note CRUD. No real provider request is part of local verification.

## Verification

Focused tests cover private CRUD, revision history, optimistic concurrency, cross-user and cross-role denial, search isolation, orphan handling, markup safety, expected-user guarding, request bounds, no-store headers, AI prompt boundaries, no implicit AI persistence, and the lesson-selection integration.

## Deliberate non-claims

- No sharing, classroom visibility or teacher surveillance is implemented.
- Search is deterministic lexical search, not vector or semantic search.
- No production database, live provider, deployment or browser session is proved by the local test suite.
