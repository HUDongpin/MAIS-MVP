import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../userStore.ts', import.meta.url), 'utf8');
const ast = ts.createSourceFile('userStore.ts', source, ts.ScriptTarget.Latest, true);
const names = ['postgresLessonPayloadPatch', 'postgresLessonContentSnapshot', 'postgresLessonContentProjectionsMatch',
  'lessonProgressActorIsCurrent', 'runPostgresLessonProgressTransaction', 'mutateLessonProgressDatabase'];
const parts = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
assert.equal(parts.length, names.length);
const code = ts.transpileModule(parts.map(node => node.getText(ast)).join('\n'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText + `\nexports.parts = {${names.join(',')}};`;

function fixture({ actor, storage = 'postgres', matches = true, comparisonError = false, writeError = false, hot = true } = {}) {
  const events = [], writes = [];
  const user = { id: 'target', role: 'student', disabled_at: null, session_revision: 3 };
  const original = { users: [user], topics: [{ id: 'topic', grade: 'S3', curriculum_track: 'HK', sort_order: 0 }],
    questions: [{ id: 'q', topic_id: 'topic', grade: 'S3', curriculum_track: 'HK' }], lessons: [{ slug: 'lesson' }],
    lesson_blocks: [], lesson_progress: [], learning_events: [], visualization_events: [], reward_point_ledger: [] };
  const sql = async (strings) => {
    if (/FROM public.auth_users/.test(strings.join('?'))) { events.push('actor'); return actor === undefined ? [user] : actor; }
    events.push('content-check');
    if (comparisonError) throw new Error('synthetic comparison failure');
    return [{ topics_match: matches, questions_match: matches }];
  };
  sql.json = value => value;
  const context = { exports: {}, postgresLessonMutationQueue: Promise.resolve(), isDeepStrictEqual, storageProvider: storage, lessonProgressActorRejected: Symbol('rejected'),
    hasAuthorityInstallation: async () => false,
    ensurePostgresStateTable: async () => events.push('ready'),
    configurePostgresAccountWriteTransaction: async () => events.push('timeouts'),
    currentPostgresStorageReadinessState: () => ({}),
    acquirePostgresStorageMutationCapability: async () => { events.push('capability'); return { previousRevision: 1 }; },
    postgresStudentActivityExclusiveLockQuery: async () => events.push('activity'),
    lockPostgresAccountData: async () => events.push('account'), postgresHotAuthTablesEnabled: () => hot,
    normalizeLockedPostgresState: async (_, deferred, capture) => {
      assert.equal(deferred, true); events.push('normalize'); capture(original); return original;
    },
    readScopedPostgresLessonContext: async () => null,
    postgresDatabasePayload: value => value,
    getPostgresClient: () => ({ begin: async callback => {
      try { const result = await callback(sql); events.push('commit'); return result; }
      catch (error) { events.push('rollback'); throw error; }
    } }),
    mutateDatabase: async callback => {
      try { const result = await callback(original); events.push('full-write', 'commit'); return result; }
      catch (error) { events.push('rollback'); throw error; }
    },
    writePostgresDatabaseWith: async (_, value, capability, patch) => {
      assert.equal(capability.previousRevision, 1); events.push('write');
      if (writeError) throw new Error('synthetic writer failure');
      writes.push({ database: structuredClone(value), patch: patch === undefined ? undefined : structuredClone(patch) });
    },
    clearStudentDashboardCacheForUser: id => { assert.equal(id, 'target'); events.push('cache-clear'); }
  };
  vm.runInNewContext(code, context);
  return { ...context.exports.parts, events, writes, original, sql, context };
}
const input = { userId: 'target', expectedSessionRevision: 3, slug: 'lesson', action: 'complete' };
const save = db => { db.lesson_progress.push({ user_id: 'target', status: 'completed' }); return Promise.resolve({ status: 'completed' }); };

test('lesson transaction validates actor before normalization, commits once, then invalidates dashboard cache', async () => {
  const state = fixture(); assert.equal((await state.mutateLessonProgressDatabase(input, save)).status, 'completed');
  assert.deepEqual(state.events, ['ready', 'ready', 'timeouts', 'capability', 'activity', 'account', 'actor', 'normalize', 'content-check', 'write', 'commit', 'cache-clear']);
  assert.deepEqual(state.writes[0].patch, { lesson_progress: [{ user_id: 'target', status: 'completed' }] });
});

test('missing, disabled, non-student and revoked/malformed actors run no normalization, callback or write', async () => {
  for (const actor of [[], [{ role: 'teacher', disabled_at: null, session_revision: 3 }],
    [{ role: 'student', disabled_at: '2026-10-03', session_revision: 3 }],
    [{ role: 'student', disabled_at: null, session_revision: 4 }]]) {
    const state = fixture({ actor }); let calls = 0;
    assert.equal(await state.mutateLessonProgressDatabase(input, async () => { calls++; }), null);
    assert.equal(calls, 0); assert.equal(state.events.includes('normalize'), false); assert.equal(state.events.includes('write'), false);
  }
  for (const revision of [null, NaN, Infinity, 0, -1, 3.5, '3']) {
    const state = fixture(); assert.equal(await state.mutateLessonProgressDatabase({ ...input, expectedSessionRevision: revision }, save), null);
    assert.equal(state.events.includes('normalize'), false);
  }
});

test('locked SQLite actor rejection rolls back without writing; valid action clears cache after commit', async () => {
  const rejected = fixture({ storage: 'sqlite' }); rejected.original.users[0].session_revision = 4;
  assert.equal(await rejected.mutateLessonProgressDatabase(input, save), null);
  assert.deepEqual(rejected.events, ['rollback']);
  const valid = fixture({ storage: 'sqlite' }); await valid.mutateLessonProgressDatabase(input, save);
  assert.deepEqual(valid.events, ['full-write', 'commit', 'cache-clear']);
});

test('unknown nested/raw alias changes, removed keys and hidden seed changes select full fallback without callback replay', async () => {
  for (const change of [db => db.visualization_events.push({ private: true }), db => { delete db.questions; },
    db => { db.topics[0].title = 'changed seed'; }, db => { db.new_unknown_field = []; }]) {
    const state = fixture(); let calls = 0;
    await state.mutateLessonProgressDatabase(input, async db => { calls++; await save(db); change(db); return { status: 'completed' }; });
    assert.equal(calls, 1); assert.equal(state.writes.length, 1); assert.equal(state.writes[0].patch, undefined);
  }
  const state = fixture({ matches: false }); await state.mutateLessonProgressDatabase(input, save);
  assert.equal(state.writes[0].patch, undefined);
  const disabled = fixture({ hot: false }); await disabled.mutateLessonProgressDatabase(input, save);
  assert.equal(disabled.writes[0].patch, undefined);
});

test('JSONB object order is irrelevant; unknown/removal differences cannot be patched', () => {
  const state = fixture();
  assert.deepEqual(Object.keys(state.postgresLessonPayloadPatch({ users: [{ a: 1, b: 2 }], lesson_progress: [] },
    { lesson_progress: [{ x: 1 }], users: [{ b: 2, a: 1 }] })), ['lesson_progress']);
  assert.equal(state.postgresLessonPayloadPatch({ users: [] }, {}), undefined);
  assert.equal(state.postgresLessonPayloadPatch({}, { unexpected: [] }), undefined);
});

test('comparison/writer failures propagate rollback without a successful acknowledgement or postcommit cache invalidation', async () => {
  for (const options of [{ comparisonError: true }, { writeError: true }]) {
    const state = fixture(options); let calls = 0;
    await assert.rejects(state.mutateLessonProgressDatabase(input, async db => { calls++; return save(db); }), /synthetic .* failure/);
    assert.equal(calls, 1); assert.equal(state.events.at(-1), 'rollback'); assert.equal(state.events.includes('cache-clear'), false);
  }
});

test('content comparator rejects duplicate IDs before SQL and creates safe complete scalar/record tuples', async () => {
  const state = fixture(); state.original.questions.push({ ...state.original.questions[0] });
  assert.equal(await state.postgresLessonContentProjectionsMatch(state.sql, state.original), false);
  assert.equal(state.events.includes('content-check'), false);
  state.original.questions.pop(); state.original.questions[0].id = '__proto__';
  let values;
  const sql = async (_, ...params) => { values = params; return [{ topics_match: true, questions_match: true }]; };
  sql.json = value => value;
  assert.equal(await state.postgresLessonContentProjectionsMatch(sql, state.original), true);
  assert.equal(Object.hasOwn(values[3], '__proto__'), true);
  assert.deepEqual(Array.from(values[3].__proto__).slice(0, 5), ['S3', 'topic', 'HK', null, null]);
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('lesson admission prevents connection acquisition until commit and cache retirement, including abandoned callers', async () => {
  const state = fixture(), entered = deferred(), commit = deferred();
  let begins = 0;
  const client = state.context.getPostgresClient();
  state.context.getPostgresClient = () => ({ begin: async callback => {
    begins++;
    const result = await client.begin(callback);
    if (begins === 1) { entered.resolve(); await commit.promise; }
    return result;
  } });
  const first = state.mutateLessonProgressDatabase(input, save);
  await entered.promise;
  let acknowledged = false;
  first.then(() => { acknowledged = true; });
  const second = state.mutateLessonProgressDatabase(input, async () => null);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(begins, 1); assert.equal(acknowledged, false);
  assert.equal(state.events.includes('cache-clear'), false);
  // Merely not awaiting the first caller never releases its active job.
  commit.resolve(); await first; await second;
  assert.equal(begins, 2);
  assert.equal(state.events.filter(event => event === 'cache-clear').length, 1);
});

test('schema, callback, writer and commit rejection preserve the caller error and drain lesson admission', async () => {
  for (const stage of ['schema', 'callback', 'writer', 'commit']) {
    const state = fixture(), failure = new Error('synthetic ' + stage + ' failure');
    let once = true, callbacks = 0;
    if (stage === 'schema') state.context.ensurePostgresStateTable = async () => {
      if (once) { once = false; throw failure; }
    };
    if (stage === 'writer') {
      const write = state.context.writePostgresDatabaseWith;
      state.context.writePostgresDatabaseWith = async (...args) => {
        if (once) { once = false; throw failure; }
        return write(...args);
      };
    }
    if (stage === 'commit') {
      const client = state.context.getPostgresClient();
      state.context.getPostgresClient = () => ({ begin: async callback => {
        const result = await client.begin(callback);
        if (once) { once = false; throw failure; }
        return result;
      } });
    }
    const first = state.mutateLessonProgressDatabase(input, async db => {
      callbacks++;
      if (stage === 'callback') throw failure;
      return save(db);
    });
    const rejected = assert.rejects(first, error => error === failure);
    const second = state.mutateLessonProgressDatabase(input, async () => { callbacks++; return null; });
    await rejected; assert.equal(await second, null);
    assert.equal(callbacks, stage === 'schema' ? 1 : 2);
    assert.equal(state.events.includes('cache-clear'), false);
  }
});

test('queued actors are revalidated after the head settles for revision, role, disable and deletion', async () => {
  for (const change of [user => { user.session_revision++; }, user => { user.role = 'teacher'; },
    user => { user.disabled_at = '2026-10-03'; }, (_, users) => { users.splice(0); }]) {
    const state = fixture(), entered = deferred(), finish = deferred();
    const first = state.mutateLessonProgressDatabase(input, async () => { entered.resolve(); await finish.promise; return null; });
    await entered.promise;
    let calls = 0;
    const second = state.mutateLessonProgressDatabase(input, async () => { calls++; return null; });
    change(state.original.users[0], state.original.users);
    // The fixture SQL reads the live users collection on each transaction.
    const previousSql = state.sql;
    const liveSql = async (strings, ...params) => /FROM public.auth_users/.test(strings.join('?'))
      ? state.original.users : previousSql(strings, ...params);
    liveSql.json = previousSql.json;
    state.context.getPostgresClient = () => ({ begin: async callback => callback(liveSql) });
    finish.resolve(); await first;
    assert.equal(await second, null); assert.equal(calls, 0);
  }
});
