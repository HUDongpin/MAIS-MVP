import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import postgres from 'postgres';

// Dedicated opt-in fresh database, independent of the minimal AST fixtures.
// Never select an ambient production target or use provider credentials.
const url = process.env.MAIS_SCOPED_LESSON_POSTGRES_TEST_URL;
if (url) {
  const target = new URL(url);
  assert.equal(target.protocol, 'postgres:'); assert.equal(target.hostname, '127.0.0.1');
  assert.equal(target.port, '55437'); assert.equal(target.username, 'mais_priority_test');
  assert.equal(target.password, ''); assert.equal(target.pathname, '/mais_scoped_lesson_tests');
  assert.equal(process.env.POSTGRES_URL, url); assert.equal(process.env.NODE_ENV, 'test');
  assert.equal(process.env.HK_MATH_POSTGRES_HOT_AUTH_TABLES, 'true');
  assert.equal(process.env.HK_MATH_ENABLE_DEMO_USER, 'true');
}
const now = '2026-10-03T17:00:00.000Z';
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

test('actual root PostgreSQL scoped lesson context, fallback, coupled state and rollback', { skip: !url, timeout: 120000 }, async t => {
  const module = await import('../userStore.ts');
  const root = module.default ?? module;
  const hooks = root.__userStoreScopedLessonTestHooks;
  const readiness = root.__userStorePostgresStorageReadinessTestHooks;
  const clients = root.__userStoreAiTutorPostgresTestHooks;
  const practiceModule = await import('../practiceAttemptStore.ts');
  const practice = practiceModule.default ?? practiceModule;
  const sql = postgres(url, { max: 4, prepare: false, connect_timeout: 3, idle_timeout: 1 });
  t.after(async () => {
    hooks.observeContext(); readiness.clearFullWriterFault();
    await practice.__practiceAttemptStoreTestHooks.closePostgresClient();
    await clients.closePostgresClients(); await sql.end({ timeout: 3 });
  });
  await clients.ensureSchema();
  for (const statement of practice.__practiceAttemptStoreTestHooks.postgresStudentActivitySchemaSql()) await sql.unsafe(statement);
  let observed = 0; hooks.observeContext(() => { observed++; });
  const snapshot = async () => (await sql`SELECT payload, revision FROM public.app_state WHERE id='primary'`)[0];
  const student = async name => {
    await hooks.fullMutate(database => {
      const normalized = hooks.normalize({ users: [{ id: name, username: name, role: 'student',
        password_hash: 'synthetic-owned-hash', password_salt: 'synthetic-owned-salt', created_at: now,
        session_revision: 3, disabled_at: null, password_must_change: false }],
        student_profiles: [{ user_id: name, name, grade: 'P1', curriculum_track: 'HK' }],
        user_settings: [{ user_id: name, language: 'en', theme: 'light', selected_grade: 'P1', updated_at: now }] });
      database.users.push(normalized.users.find(record => record.id === name));
      database.student_profiles.push(normalized.student_profiles.find(record => record.user_id === name));
      database.user_settings.push(normalized.user_settings.find(record => record.user_id === name));
    });
    // Canonicalize synthetic setup through the real hot overlays before
    // asserting fast-path eligibility; setup itself is not the measured save.
    await hooks.fullMutate(() => {});
    const database = hooks.normalizeSeedOnly((await snapshot()).payload);
    const lesson = database.lessons.find(record => record.grade === 'P1' && database.topics.some(topic => topic.id === record.topic_id && topic.curriculum_track === 'HK'));
    assert.ok(lesson);
    return { userId: name, slug: lesson.slug, topicId: lesson.topic_id, action: 'complete', curriculumTrack: 'HK', expectedSessionRevision: 3, durationSeconds: 300, checklistState: { a: true } };
  };
  const unchanged = async operation => {
    const before = await snapshot(); await operation(); assert.deepEqual(await snapshot(), before);
  };

  await t.test('candidate content comparator is exactly equivalent for full seed, scalar/record/ID/null drift and duplicates', async () => {
    const input = await student('scoped-comparison');
    const database = hooks.normalizeSeedOnly((await snapshot()).payload);
    const topic = database.topics[0], question = database.questions[0];
    const same = async (executor, expected, result) => {
      const original = await hooks.compareOriginal(executor, expected);
      const candidate = await hooks.compareCandidate(executor, expected);
      assert.equal(candidate, original); assert.equal(candidate, result);
    };
    const elapsed = { original: [], candidate: [] };
    for (let round = 0; round < 3; round++) {
      for (const [name, compare] of [['original', hooks.compareOriginal], ['candidate', hooks.compareCandidate]]) {
        const start = performance.now(); assert.equal(await compare(sql, database), true);
        elapsed[name].push(Math.round((performance.now() - start) * 1000) / 1000);
      }
    }
    console.info('scoped-content-comparator-measurement ' + JSON.stringify(elapsed));
    const changes = [
      tx => tx`UPDATE public.projection_topics SET grade='stale' WHERE id=${topic.id}`,
      tx => tx`UPDATE public.projection_topics SET curriculum_track='stale' WHERE id=${topic.id}`,
      tx => tx`UPDATE public.projection_topics SET curriculum_region='synthetic-stale' WHERE id=${topic.id}`,
      tx => tx`UPDATE public.projection_topics SET textbook_publisher='synthetic-stale' WHERE id=${topic.id}`,
      tx => tx`UPDATE public.projection_topics SET sort_order=sort_order+1 WHERE id=${topic.id}`,
      tx => tx`UPDATE public.projection_topics SET record=record || '{"nested":{"unexpected":true}}'::jsonb WHERE id=${topic.id}`,
      tx => tx`UPDATE public.projection_questions SET grade='stale' WHERE id=${question.id}`,
      tx => tx`UPDATE public.projection_questions SET topic_id='stale' WHERE id=${question.id}`,
      tx => tx`UPDATE public.projection_questions SET curriculum_track='stale' WHERE id=${question.id}`,
      tx => tx`UPDATE public.projection_questions SET curriculum_region='synthetic-stale' WHERE id=${question.id}`,
      tx => tx`UPDATE public.projection_questions SET textbook_publisher='synthetic-stale' WHERE id=${question.id}`,
      tx => tx`UPDATE public.projection_questions SET record=record || '{"answer":"synthetic-stale"}'::jsonb WHERE id=${question.id}`,
      tx => tx`DELETE FROM public.projection_questions WHERE id=${question.id}`,
      tx => tx`UPDATE public.projection_questions SET id=upper(id) WHERE id=${question.id}`
    ];
    for (const change of changes) {
      const rollback = new Error('synthetic-comparator-rollback');
      await assert.rejects(sql.begin(async tx => { await change(tx); await same(tx, database, false); throw rollback; }), error => error === rollback);
    }
    const duplicate = { ...database, questions: [...database.questions, question] };
    await same(sql, duplicate, false);
    const scalarType = { ...database, topics: database.topics.map(record => record.id === topic.id ? { ...record, sort_order: String(record.sort_order) } : record) };
    await same(sql, scalarType, false);
    await same(sql, { ...database, topics: [], questions: [] }, false);
    // Restricted temporary schema tables with identical names exercise the
    // query text against tiny fixtures, without changing canonical projections.
    await sql.begin(async tx => {
      await tx`CREATE TEMP TABLE compare_topics (LIKE public.projection_topics INCLUDING ALL)`;
      await tx`CREATE TEMP TABLE compare_questions (LIKE public.projection_questions INCLUDING ALL)`;
      const executor = Object.assign(async (strings, ...values) => {
        const replaced = strings.map(value => value.replaceAll('public.projection_topics', 'pg_temp.compare_topics').replaceAll('public.projection_questions', 'pg_temp.compare_questions'));
        Object.defineProperty(replaced, 'raw', { value: replaced });
        return tx(replaced, ...values);
      }, { json: value => tx.json(value) });
      await same(executor, { ...database, topics: [], questions: [] }, true);
      const ids = ['__proto__', 'Case-ID', 'case-id', 'é', 'e', 'quote\"-\\-\n'];
      const topics = ids.map((id, index) => ({ ...topic, id, sort_order: index, curriculum_region: null, textbook_publisher: null, nested: { nullValue: null, array: [1, '1'] } }));
      for (const record of topics) await tx`INSERT INTO pg_temp.compare_topics(id,grade,curriculum_track,curriculum_region,textbook_publisher,sort_order,record)
        VALUES (${record.id},${record.grade},${record.curriculum_track},NULL,NULL,${record.sort_order},${tx.json(record)})`;
      await same(executor, { ...database, topics, questions: [] }, true);
      const missingOptional = topics.map(({ curriculum_region, textbook_publisher, ...record }) => record);
      for (const record of missingOptional) await tx`UPDATE pg_temp.compare_topics SET record=${tx.json(record)} WHERE id=${record.id}`;
      await same(executor, { ...database, topics: missingOptional, questions: [] }, true);
      const keyOrder = missingOptional.map(record => Object.fromEntries(Object.entries(record).reverse()));
      await same(executor, { ...database, topics: keyOrder, questions: [] }, true);
      const extra = { ...topic, id: 'extra-row', sort_order: 999 };
      await tx`INSERT INTO pg_temp.compare_topics(id,grade,curriculum_track,sort_order,record)
        VALUES (${extra.id},${extra.grade},${extra.curriculum_track},${extra.sort_order},${tx.json(extra)})`;
      await same(executor, { ...database, topics: missingOptional, questions: [] }, false);
      await tx`DELETE FROM pg_temp.compare_topics WHERE id=${extra.id}`;
      await tx`ALTER TABLE pg_temp.compare_topics ALTER COLUMN record DROP NOT NULL`;
      await tx`UPDATE pg_temp.compare_topics SET record=NULL WHERE id='__proto__'`;
      await same(executor, { ...database, topics: missingOptional, questions: [] }, false);
    });
    const icu = (await sql`SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_collation WHERE collprovider='i') AS available`)[0].available;
    if (icu) {
      await sql.begin(async tx => {
        await tx`CREATE COLLATION pg_temp.scoped_id_nondeterministic (provider=icu, locale='und-u-ks-level1', deterministic=false)`;
        await tx`CREATE TEMP TABLE icu_topics (LIKE public.projection_topics INCLUDING ALL)`;
        await tx`CREATE TEMP TABLE icu_questions (LIKE public.projection_questions INCLUDING ALL)`;
        await tx`ALTER TABLE pg_temp.icu_topics ALTER COLUMN id TYPE text COLLATE pg_temp.scoped_id_nondeterministic`;
        await tx`ALTER TABLE pg_temp.icu_questions ALTER COLUMN id TYPE text COLLATE pg_temp.scoped_id_nondeterministic`;
        const executor = Object.assign(async (strings, ...values) => {
          const replaced = strings.map(value => value.replaceAll('public.projection_topics', 'pg_temp.icu_topics').replaceAll('public.projection_questions', 'pg_temp.icu_questions'));
          Object.defineProperty(replaced, 'raw', { value: replaced });
          return tx(replaced, ...values);
        }, { json: value => tx.json(value) });
        for (const [expectedId, actualId] of [['Case-ID', 'case-id'], ['é', 'e'], ['é', 'e\u0301']]) {
          // Make ordinary equality demonstrably insufficient while keeping
          // record IDs and every other value exactly equal to the source.
          assert.equal((await tx`SELECT ${expectedId}::text COLLATE pg_temp.scoped_id_nondeterministic = ${actualId}::text COLLATE pg_temp.scoped_id_nondeterministic AS equal`)[0].equal, true);
          const expectedTopic = { ...topic, id: expectedId };
          await tx`INSERT INTO pg_temp.icu_topics(id,grade,curriculum_track,curriculum_region,textbook_publisher,sort_order,record)
            VALUES (${actualId},${expectedTopic.grade},${expectedTopic.curriculum_track},${expectedTopic.curriculum_region ?? null},${expectedTopic.textbook_publisher ?? null},${expectedTopic.sort_order},${tx.json(expectedTopic)})`;
          await same(executor, { ...database, topics: [expectedTopic], questions: [] }, false);
          await tx`UPDATE pg_temp.icu_topics SET id=${expectedId}`;
          await same(executor, { ...database, topics: [expectedTopic], questions: [] }, true);
          await tx`DELETE FROM pg_temp.icu_topics`;
          const expectedQuestion = { ...question, id: expectedId };
          await tx`INSERT INTO pg_temp.icu_questions(id,grade,topic_id,curriculum_track,curriculum_region,textbook_publisher,record)
            VALUES (${actualId},${expectedQuestion.grade},${expectedQuestion.topic_id},${expectedQuestion.curriculum_track},${expectedQuestion.curriculum_region ?? null},${expectedQuestion.textbook_publisher ?? null},${tx.json(expectedQuestion)})`;
          await same(executor, { ...database, topics: [], questions: [expectedQuestion] }, false);
          await tx`UPDATE pg_temp.icu_questions SET id=${expectedId}`;
          await same(executor, { ...database, topics: [], questions: [expectedQuestion] }, true);
          await tx`DELETE FROM pg_temp.icu_questions`;
        }
      });
    }
    console.info('scoped-icu-id-controls ' + JSON.stringify({ supported: icu, cases: icu ? 6 : 0 }));
  });

  await t.test('real root scoped path commits once with exact canonical/projection/reward and repeat readback', async () => {
    const input = await student('scoped-root'); const before = await snapshot(), count = observed;
    const result = await root.updateLessonProgress(input); assert.equal(result.status, 'completed');
    assert.equal(observed, count + 1, 'actual root must execute the scoped path');
    const after = await snapshot(); assert.equal(Number(after.revision), Number(before.revision) + 1);
    const cold = after.payload.lesson_progress.find(record => record.user_id === input.userId && record.topic_id === input.topicId);
    const projected = (await sql`SELECT record FROM public.projection_lesson_progress WHERE user_id=${input.userId} AND topic_id=${input.topicId}`)[0].record;
    assert.deepEqual(projected, cold); assert.equal(cold.duration_seconds, 300); assert.equal(cold.mastery, 100);
    assert.equal(after.payload.reward_point_ledger.filter(record => record.student_id === input.userId).length, 1);
    assert.equal((await root.getLessonBySlug(input.userId, input.slug, 'HK')).status, 'completed');
    const repeat = await root.updateLessonProgress({ ...input, action: 'update', durationSeconds: 500 });
    assert.equal(repeat.status, 'completed'); assert.equal(observed, count + 2);
    assert.equal((await snapshot()).payload.reward_point_ledger.filter(record => record.student_id === input.userId).length, 1);
  });

  await t.test('unowned activity evidence and foreign learning clears remain coupled to scoped commit', async () => {
    const input = await student('scoped-coupled'), foreign = await student('scoped-foreign');
    await hooks.fullMutate(database => {
      database.learning_events.push({ id: 'foreign-old-event', user_id: foreign.userId, type: 'page-view', source: 'lesson', grade: 'P1', topic_id: input.topicId, created_at: now });
      database.visualization_events.push({ id: 'foreign-old-vis', user_id: foreign.userId, type: 'opened', source: 'lab', topic_id: 'p1-counting-number-bonds', created_at: now });
    });
    await sql`INSERT INTO public.learning_event_clears(user_id,cleared_at) VALUES (${foreign.userId},${now})`;
    await sql`INSERT INTO public.learning_events(id,user_id,type,source,grade,topic_id,created_at) VALUES ('foreign-new-event',${foreign.userId},'page-view','lesson','P1',${input.topicId},'2026-10-03T18:00:00.000Z')`;
    const count = observed; await root.updateLessonProgress(input); assert.equal(observed, count + 1);
    const after = (await snapshot()).payload;
    assert.equal(after.learning_events.some(record => record.id === 'foreign-old-event'), false);
    assert.equal(after.visualization_events.some(record => record.id === 'foreign-old-vis'), false);
    assert.equal(after.learning_events.some(record => record.id === 'foreign-new-event'), true);
    assert.equal(after.learning_event_clears.find(record => record.user_id === foreign.userId).cleared_at, now);
    assert.equal((await sql`SELECT count(*)::int AS n FROM public.projection_visualization_events WHERE user_id=${foreign.userId}`)[0].n, 0);
  });

  await t.test('legacy content or live scalar drift chooses full fallback before the one callback', async () => {
    const input = await student('scoped-fallback'); let callbacks = 0;
    await sql`UPDATE public.projection_questions SET grade='synthetic-stale' WHERE id=(SELECT id FROM public.projection_questions LIMIT 1)`;
    const count = observed;
    await hooks.mutate(input, async database => { callbacks++; assert.equal(database.users.length > 1, true); return null; });
    assert.equal(callbacks, 1); assert.equal(observed, count);
    assert.equal((await sql`SELECT count(*)::int AS n FROM public.projection_questions WHERE grade='synthetic-stale'`)[0].n, 0);
    await hooks.fullMutate(database => { database.lesson_blocks.push({ id: 'custom-retained-block', lesson_slug: 'custom-retained-lesson', type: 'concept', order: 0 }); });
    await hooks.mutate(input, async database => { callbacks++; assert.equal(database.lesson_blocks.some(record => record.id === 'custom-retained-block'), true); return null; });
    assert.equal(callbacks, 2); assert.equal(observed, count);
    // Return only this synthetic custom fixture to seed-only eligibility via
    // the real full writer; other records remain untouched.
    await hooks.fullMutate(database => { database.lesson_blocks = database.lesson_blocks.filter(record => record.id !== 'custom-retained-block'); });
    await sql`CHECKPOINT`;
  });

  await t.test('auth and AI journal drift fallback, retaining complete current state without callback replay', async () => {
    const input = await student('scoped-overlay'); const count = observed; let callbacks = 0;
    await sql`UPDATE public.auth_users SET password_must_change=true WHERE id=${input.userId}`;
    await hooks.mutate(input, async database => { callbacks++; assert.equal(database.users.find(record => record.id === input.userId).password_must_change, true); return null; });
    assert.equal(callbacks, 1); assert.equal(observed, count);
    const message = { id: 'scoped-journal-message', user_id: input.userId, role: 'user', content: 'Synthetic journal', created_at: now };
    await sql`INSERT INTO public.ai_tutor_message_journal(id,user_id,created_at,record) VALUES (${message.id},${input.userId},${now},${sql.json(message)})`;
    await hooks.mutate(input, async database => { callbacks++; assert.equal(database.ai_tutor_messages.some(record => record.id === message.id), true); return null; });
    assert.equal(callbacks, 2); assert.equal(observed, count);
    assert.equal((await snapshot()).payload.ai_tutor_messages.some(record => record.id === message.id), true);
  });

  await t.test('deleted, disabled, changed-role and revoked actors run no callback or writer', async () => {
    for (const mode of ['revoked', 'disabled', 'role', 'deleted']) {
      const input = await student('scoped-actor-' + mode); let calls = 0;
      if (mode === 'revoked') await sql`UPDATE public.auth_users SET session_revision=4 WHERE id=${input.userId}`;
      if (mode === 'disabled') await sql`UPDATE public.auth_users SET disabled_at=${now} WHERE id=${input.userId}`;
      if (mode === 'role') await sql`UPDATE public.auth_users SET role='teacher' WHERE id=${input.userId}`;
      if (mode === 'deleted') await sql`DELETE FROM public.auth_users WHERE id=${input.userId}`;
      await unchanged(async () => { assert.equal(await hooks.mutate(input, async () => { calls++; return null; }), null); });
      assert.equal(calls, 0);
    }
  });

  await t.test('unsupported scoped callback mutation aborts once, with no canonical or projection change', async () => {
    const input = await student('scoped-invalid'); let calls = 0; const count = observed;
    await unchanged(async () => assert.rejects(hooks.mutate(input, async database => {
      calls++; database.users = [{ id: 'foreign-overwrite' }]; return { status: 'completed' };
    }), /Unsupported scoped/));
    assert.equal(calls, 1); assert.equal(observed, count + 1);
  });

  await t.test('RETURNING suppression/rewrite and final drift roll back all coupled writes', async () => {
    const input = await student('scoped-faults');
    for (const mode of ['suppress-returning', 'rewrite-returning', 'post-returning-drift']) {
      const count = observed, before = await snapshot();
      const beforeProjected = await sql`SELECT record FROM public.projection_lesson_progress WHERE user_id=${input.userId} ORDER BY topic_id`;
      readiness.configureFullWriterFault({ mode, observeStage: () => {} });
      try { await assert.rejects(root.updateLessonProgress(input), /Postgres storage readiness is unavailable/); }
      finally { readiness.clearFullWriterFault(); }
      assert.equal(observed, count + 1); assert.deepEqual(await snapshot(), before);
      assert.deepEqual(await sql`SELECT record FROM public.projection_lesson_progress WHERE user_id=${input.userId} ORDER BY topic_id`, beforeProjected);
      assert.equal((await sql`SELECT count(*)::int AS n FROM public.reward_point_ledger WHERE student_id=${input.userId}`)[0].n, 0);
    }
  });

  await t.test('present incompatible activity schema fails closed before callback and does not replay', async () => {
    const input = await student('scoped-schema'); let calls = 0;
    await sql.begin(async tx => {
      await tx`ALTER TABLE public.learning_events RENAME COLUMN user_id TO fixture_incompatible_subject`;
      // The outer mutation cannot inspect an uncommitted DDL change in another
      // connection. Keep this test as a committed rename with explicit reversal.
    });
    try { await unchanged(async () => assert.rejects(hooks.mutate(input, async () => { calls++; return null; }), /user_id/)); }
    finally { await sql`ALTER TABLE public.learning_events RENAME COLUMN fixture_incompatible_subject TO user_id`; }
    assert.equal(calls, 0);
  });

  await t.test('an accepted hot learning write waits for the scoped transaction and survives its next merge', async () => {
    const input = await student('scoped-hot-order');
    // Ensure the activity schema's cached preparation is settled before the
    // deliberate hold, so the competing operation tests the actual shared lock.
    await practice.ensurePostgresStudentActivityTables();
    const entered = deferred(), release = deferred(); let callbackCount = 0;
    const lesson = hooks.mutate(input, async () => { callbackCount++; entered.resolve(); await release.promise; return null; });
    await entered.promise;
    const event = { id: 'scoped-ordered-hot-event', type: 'page-view', source: 'lesson', grade: 'P1',
      topicId: input.topicId, timestamp: '2026-10-03T19:00:00.000Z' };
    const hot = practice.appendLearningEventsFast(input.userId, [event]);
    try {
      let waited = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const rows = await sql`SELECT count(*)::int AS n FROM pg_catalog.pg_stat_activity
          WHERE datname='mais_scoped_lesson_tests' AND wait_event='advisory'`;
        if (rows[0].n > 0) { waited = true; break; }
        await delay(10);
      }
      assert.equal(waited, true); assert.equal(callbackCount, 1);
    } finally { release.resolve(); }
    await lesson; assert.equal(await hot, 1);
    await root.updateLessonProgress(input);
    assert.equal((await snapshot()).payload.learning_events.some(record => record.id === event.id), true);
  });

  await t.test('queued root lesson saves preserve both learners and exact projection readback', async () => {
    const first = await student('scoped-concurrent-a'), second = await student('scoped-concurrent-b');
    const count = observed; await Promise.all([root.updateLessonProgress(first), root.updateLessonProgress(second)]);
    assert.equal(observed, count + 2);
    const after = (await snapshot()).payload;
    for (const input of [first, second]) {
      const progress = after.lesson_progress.find(record => record.user_id === input.userId && record.topic_id === input.topicId);
      assert.equal(progress.status, 'completed');
      assert.deepEqual((await sql`SELECT record FROM public.projection_lesson_progress WHERE user_id=${input.userId} AND topic_id=${input.topicId}`)[0].record, progress);
    }
  });

  await t.test('demo reward normalization and legacy hot source metadata retain scoped saves and strict unrelated fallback', async () => {
    const previousDemo = process.env.HK_MATH_ENABLE_DEMO_USER;
    process.env.HK_MATH_ENABLE_DEMO_USER = 'true';
    try {
      const input = await student('scoped-demo-rewards'), foreign = await student('scoped-demo-foreign');
      await hooks.fullMutate(database => {
        for (const [index, source_key] of [undefined, '', '   '].entries()) database.reward_point_ledger.unshift({
          id: `demo-legacy-${index}`, student_id: foreign.userId, amount: 17 + index, reason: 'teacher-award',
          label_en: 'Synthetic legacy', label_zh: 'Synthetic legacy', source_key, created_at: now
        });
        database.gamification_events.reverse();
      });
      const count = observed;
      assert.equal((await root.updateLessonProgress(input)).status, 'completed');
      assert.equal(observed, count + 1);
      assert.equal((await root.updateLessonProgress({ ...input, durationSeconds: 500 })).status, 'completed');
      assert.equal(observed, count + 2, 'repeated demo save must remain scoped after a new reward prefix');
      const after = (await snapshot()).payload;
      assert.equal(after.reward_point_ledger.filter(record => record.student_id === input.userId).length, 1);
      for (const index of [0, 1, 2]) assert.equal(after.reward_point_ledger.find(record => record.id === `demo-legacy-${index}`).amount, 17 + index);
      assert.equal(after.reward_point_ledger.filter(record => record.id.startsWith('demo-legacy-')).length, 3);
      const cold = after.lesson_progress.find(record => record.user_id === input.userId && record.topic_id === input.topicId);
      assert.deepEqual((await sql`SELECT record FROM public.projection_lesson_progress WHERE user_id=${input.userId} AND topic_id=${input.topicId}`)[0].record, cold);
      await hooks.fullMutate(database => { delete database.users.find(record => record.id === input.userId).password_must_change; });
      let callbacks = 0;
      await hooks.mutate(input, async database => { callbacks++; assert.equal(database.users.length > 1, true); return null; });
      assert.equal(callbacks, 1); assert.equal(observed, count + 2, 'unrelated registration normalization still falls back before callback');
      await sql`UPDATE public.auth_student_profiles SET name='Synthetic changed profile' WHERE user_id=${input.userId}`;
      await hooks.mutate(input, async database => { callbacks++; assert.equal(database.student_profiles.find(record => record.user_id === input.userId).name, 'Synthetic changed profile'); return null; });
      assert.equal(callbacks, 2); assert.equal(observed, count + 2, 'hot profile drift still falls back before callback');
    } finally {
      if (previousDemo === undefined) delete process.env.HK_MATH_ENABLE_DEMO_USER;
      else process.env.HK_MATH_ENABLE_DEMO_USER = previousDemo;
    }
  });
});
