import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// Executes actual production persistence functions with synthetic SQL;
// SQL semantics/locks/rollback below are synthetic, never a PostgreSQL connection.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = process.cwd();
const candidate = process.env.MAIS_REPAIR_SOURCE_ROOT ?? root;
function selected(relative, names, bindings = {}) {
  const file = path.join(candidate, relative);
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const nodes = [];
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && names.includes(node.name?.text)) nodes.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(nodes.length, names.length, 'All executed functions originate in the proposed source');
  const selectedText = nodes.map(n => ts.isMethodDeclaration(n) ? n.getText(ast).replace(/^async\s+/, 'async function ') : n.getText(ast)).join('\n');
  const code = ts.transpileModule(selectedText, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  // These legacy fixtures model a database without an authority installation;
  // the native authority participant suite covers installed request admission.
  const context = { exports: {}, console, Date, hasAuthorityInstallation: async () => false,
    learnerAuthorityIsInstalled: async () => false, lockLearnerAuthority: async () => false,
    validateMutationActor: async () => undefined, validateMutationDeadline: () => {}, ...bindings };
  vm.createContext(context);
  vm.runInContext(code + '\nexports.functions = {' + names.join(',') + '};', context, { filename: file });
  return context.exports.functions;
}
const tableNames = ['practice_attempts', 'mistake_book_items', 'adaptive_skill_states', 'learning_events', 'learning_event_clears', 'reward_point_ledger', 'ai_tutor_message_journal', 'ai_tutor_usage_journal', 'ai_governance_rate_limit_events'];
const helperContext = { exports: {}, require: (name) => {
  if (name === "@/lib/server/userStore/teacherNoticeEmailOutboxPersistence") return { teacherNoticeEmailOutboxTombstoneRetentionMs: 400 * 86400000 };
  if (name === "./learnerAuthoritySchema") return { lockLearnerAuthority: async () => false };
  if (name === "@/lib/server/requestMutationActor") return { requestMutationActor: async () => undefined };
  if (name === "@/lib/server/learnerAuthorityState") return { LearnerAuthorityError: Error };
  throw new Error(`Unexpected helper dependency: ${name}`);
}, Date };
const helperSource = fs.readFileSync(path.join(root, "lib/server/accountDataPostgres.ts"), "utf8");
vm.runInNewContext(ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, helperContext);
const helper = helperContext.exports;
const identityContext = { exports: {} };
const identitySource = fs.readFileSync(path.join(candidate, "lib/server/practiceSubmissionIdentity.ts"), "utf8");
vm.runInNewContext(ts.transpileModule(identitySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, identityContext);
const practiceIdentity = identityContext.exports;

function deferred() {
  let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve };
}
function database() {
  const state = {
    accounts: new Set(['target', 'other']),
    tables: Object.fromEntries(tableNames.map(name => [name, [{ id: name + '-target', user_id: 'target', created_at: '2026-10-01T09:00:00.000Z' }, { id: name + '-other', user_id: 'other', created_at: '2026-10-01T09:00:00.000Z' }]])),
    outbox: [], clock: '2026-10-01T09:01:00.000Z', queries: [], transactions: 0, hook: null, locks: new Map(), absentTables: new Set()
  };
  state.tables.learning_events = []; state.tables.learning_event_clears = [];
  function sqlFor(tx) {
    async function execute(strings, values) {
      const text = strings.join('?'); state.queries.push({ text, values });
      if (text.includes('pg_advisory_xact_lock')) {
        const key = values[0]; const existing = state.locks.get(key);
        if (existing && existing.tx !== tx) { await existing.gate.promise; return execute(strings, values); }
        if (!existing) state.locks.set(key, { tx, gate: deferred() });
        return [];
      }
      if (text.includes('AS account_exists')) return [{ account_exists: state.accounts.has(values[0]) }];
      if (text.includes('AS relation_exists')) return [{ relation_exists: !state.absentTables.has(values[0] || 'public.teacher_notice_email_outbox') }];
      if (text.includes('schema_ready')) return [{ schema_ready: true }];
      if (text.includes('set_config')) return [];
      if (text.includes('SELECT GREATEST(')) {
        const marker = state.tables.learning_event_clears.find(row => row.user_id === values[0])?.cleared_at;
        const eventTimes = state.tables.learning_events.filter(row => row.user_id === values[1]).map(row => row.created_at);
        const floor = [state.clock, marker, ...eventTimes, values[2], values[3]].filter(Boolean).map(Date.parse);
        if (state.hook) await state.hook('watermark', text, values);
        return [{ cleared_at: new Date(Math.max(...floor)).toISOString() }];
      }
      if (text.includes('SELECT cleared_at')) {
        const rows = state.tables.learning_event_clears.filter(row => row.user_id === values[0]);
        if (state.hook) await state.hook('marker-read', text, values);
        return structuredClone(rows);
      }
      if (text.includes('DELETE FROM public.learning_events')) { state.tables.learning_events = state.tables.learning_events.filter(row => row.user_id !== values[0]); return []; }
      if (text.includes('INSERT INTO public.learning_event_clears')) {
        const previous = state.tables.learning_event_clears.find(row => row.user_id === values[0]);
        const cutoff = previous && Date.parse(previous.cleared_at) > Date.parse(values[1]) ? previous.cleared_at : values[1];
        state.tables.learning_event_clears = [...state.tables.learning_event_clears.filter(row => row.user_id !== values[0]), { user_id: values[0], cleared_at: cutoff }]; return [];
      }
      if (text.includes('INSERT INTO public.learning_events')) {
        const rows = values[0].rows; const ids = new Set(state.tables.learning_events.map(row => row.id));
        const inserted = rows.filter(row => !ids.has(row.id)); state.tables.learning_events.push(...inserted); return inserted.map(row => ({ id: row.id }));
      }
      if (text.includes('UPDATE public.teacher_notice_email_outbox')) {
        const subject = values[1];
        for (const row of state.outbox) {
          if (![row.recipient_id, row.student_id, row.guardian_id].includes(subject)) continue;
          if (['pending', 'retryable', 'leased'].includes(row.status)) { row.status = 'blocked'; row.last_error_code = 'account-erased'; }
          row.completed_at ??= state.clock; row.lease_token = null; row.lease_expires_at = null;
          for (const key of ['recipient_id', 'student_id', 'guardian_id', 'teacher_id', 'queued_by_id', 'class_id', 'email', 'locale']) row[key] = null;
          row.updated_at = state.clock; row.pii_expires_at = state.clock; row.pii_purged_at = state.clock;
          row.tombstone_expires_at = new Date(Math.max(Date.parse(row.tombstone_expires_at || state.clock), Date.parse(state.clock) + values[0])).toISOString();
        }
        return [];
      }
      throw new Error('Unexpected synthetic SQL: ' + text);
    }
    function sql(strings, ...values) { if (!strings.raw) return { rows: strings }; return execute(strings, values); }
    sql.json = value => value;
    sql.unsafe = async (text, values) => {
      state.queries.push({ text, values });
      const match = /^DELETE FROM public\.(\w+) WHERE (user_id|student_id) = \$1$/.exec(text);
      const table = match?.[1]; const column = match?.[2]; assert.ok(tableNames.includes(table));
      assert.equal(column, table === 'reward_point_ledger' ? 'student_id' : 'user_id');
      state.tables[table] = state.tables[table].filter(row => row[column] !== values[0]); return [];
    };
    return sql;
  }
  const client = {
    async begin(options, operation) {
      if (typeof options === 'function') { operation = options; options = null; }
      if (options !== null) assert.equal(options, 'isolation level read committed');
      const tx = ++state.transactions;
      try { return await operation(sqlFor(tx)); }
      finally { for (const [key, lock] of state.locks) { if (lock.tx === tx) { state.locks.delete(key); lock.gate.resolve(); } } }
    }
  };
  const funcs = selected('lib/server/practiceAttemptStore.ts', ['analyticsEventDurationSeconds', 'eventIsAfterClear', 'appendLearningEventsFast', 'clearLearningEventsFast', 'persistQuestionAttempt'], {
    ...helper, ...practiceIdentity, postgresRowsEnabled: () => true, ensurePostgresStudentActivityTables: async () => {}, getPostgresClient: () => client,
    profileFields: () => ({}), randomUUID: () => 'test-id', writeMistakeRow: async () => { throw Error('unexpected mistake write'); }, writeAdaptiveSkillState: async () => { throw Error('unexpected adaptive write'); }, maybeWritePracticeAccuracyReward: async () => { throw Error('unexpected reward write'); }
  });
  return { state, client, funcs };
}
const oldEvent = { id: 'old', type: 'page-view', source: 'lesson', grade: 'S3', topicId: 'topic', timestamp: '2026-10-01T09:00:00.000Z' };

test('append before reset: reset waits for insertion then removes it', async () => {
  const { state, funcs } = database(); const observed = deferred(); const proceed = deferred();
  state.hook = async kind => { if (kind === 'marker-read') { observed.resolve(); await proceed.promise; } };
  const append = funcs.appendLearningEventsFast('target', [oldEvent]); await observed.promise;
  let resetDone = false; const reset = funcs.clearLearningEventsFast('target').then(() => { resetDone = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(resetDone, false);
  proceed.resolve(); assert.equal(await append, 1); await reset;
  assert.equal(state.tables.learning_events.length, 0);
});
test('reset before append: append waits then rejects pre-reset event', async () => {
  const { state, funcs } = database(); const observed = deferred(); const proceed = deferred();
  state.hook = async kind => { if (kind === 'watermark') { observed.resolve(); await proceed.promise; } };
  const reset = funcs.clearLearningEventsFast('target'); await observed.promise;
  let appendDone = false; const append = funcs.appendLearningEventsFast('target', [oldEvent]).then(n => { appendDone = true; return n; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(appendDone, false);
  proceed.resolve(); await reset; assert.equal(await append, 0); assert.equal(state.tables.learning_events.length, 0);
});
test('repeated older reset cannot lower marker, including prior future event and snapshot floor', async () => {
  const { state, client } = database();
  state.tables.learning_events.push({ id: 'future', user_id: 'target', created_at: '2026-10-03T09:00:00.000Z' });
  let cutoff = await client.begin(async sql => { await helper.lockPostgresAccountData(sql, 'target'); return helper.resetPostgresLearningEventsInTransaction(sql, 'target', undefined, '2026-10-04T09:00:00.000Z'); });
  assert.equal(cutoff, '2026-10-04T09:00:00.000Z');
  cutoff = await client.begin(async sql => { await helper.lockPostgresAccountData(sql, 'target'); return helper.resetPostgresLearningEventsInTransaction(sql, 'target', '2026-09-01T09:00:00.000Z'); });
  assert.equal(cutoff, '2026-10-04T09:00:00.000Z');
});
test('erasure purges precisely nine subject tables, preserving other learners and actor-only notices', async () => {
  const { state, client } = database();
  for (const name of tableNames) { const column = name === 'reward_point_ledger' ? 'student_id' : 'user_id'; state.tables[name] = [{ [column]: 'target' }, { [column]: 'other' }]; }
  const pii = { recipient_id: 'parent', student_id: 'target', guardian_id: 'parent', teacher_id: 'teacher', queued_by_id: 'teacher', class_id: 'class', email: 'synthetic@example.test', locale: 'en', status: 'leased', lease_token: 'token', lease_expires_at: state.clock, completed_at: null, tombstone_expires_at: null };
  state.outbox = [{ id: 'subject', ...pii }, { id: 'other', ...pii, student_id: 'other', teacher_id: 'target', queued_by_id: 'target' }];
  await client.begin(async sql => { await helper.lockPostgresAccountData(sql, 'target'); await helper.erasePostgresAccountData(sql, 'target'); });
  for (const name of tableNames) assert.deepEqual(state.tables[name], [{ [name === 'reward_point_ledger' ? 'student_id' : 'user_id']: 'other' }]);
  const erased = state.outbox[0]; assert.equal(erased.status, 'blocked'); assert.equal(erased.last_error_code, 'account-erased'); assert.equal(erased.lease_token, null);
  for (const key of ['recipient_id', 'student_id', 'guardian_id', 'teacher_id', 'queued_by_id', 'class_id', 'email', 'locale']) assert.equal(erased[key], null);
  assert.ok(erased.pii_purged_at); assert.ok(erased.tombstone_expires_at); assert.equal(state.outbox[1].email, pii.email);
  assert.equal(state.queries.filter(q => /^DELETE FROM public\./.test(q.text)).length, 9);
});
test('terminal notice evidence retained while PII removed; absent optional hot table needs no DDL', async () => {
  const { state, client } = database(); state.absentTables.add('public.practice_attempts');
  state.outbox = [{ recipient_id: 'target', student_id: 'target', status: 'provider-accepted', provider_message_id: 'non-pii-receipt', completed_at: '2026-09-01T00:00:00.000Z', tombstone_expires_at: '2028-01-01T00:00:00.000Z' }];
  await client.begin(sql => helper.erasePostgresAccountData(sql, 'target'));
  assert.equal(state.outbox[0].status, 'provider-accepted'); assert.equal(state.outbox[0].provider_message_id, 'non-pii-receipt'); assert.equal(state.outbox[0].tombstone_expires_at, '2028-01-01T00:00:00.000Z');
  assert.equal(state.queries.some(q => /CREATE|ALTER/.test(q.text)), false);
});
test('late hot append/reset/practice writes stop at canonical absent-user guard', async () => {
  const { state, funcs } = database(); state.accounts.delete('target');
  assert.equal(await funcs.appendLearningEventsFast('target', [oldEvent]), 0);
  assert.equal(await funcs.clearLearningEventsFast('target'), false);
  assert.equal((await funcs.persistQuestionAttempt({ userId: 'target', question: {}, now: oldEvent.timestamp })).persisted, false);
  assert.equal(state.queries.some(q => /INSERT INTO/.test(q.text)), false);
});
test('late hot writer waiting for deletion lock observes absence after deletion commits', async () => {
  const { state, client, funcs } = database(); const acquired = deferred(); const finish = deferred();
  const deletion = client.begin(async sql => { await helper.lockPostgresAccountData(sql, 'target'); acquired.resolve(); await finish.promise; await helper.erasePostgresAccountData(sql, 'target'); state.accounts.delete('target'); });
  await acquired.promise; let appendDone = false;
  const append = funcs.appendLearningEventsFast('target', [oldEvent]).then(n => { appendDone = true; return n; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(appendDone, false);
  finish.resolve(); await deletion; assert.equal(await append, 0);
});
test('absent-user message/usage journals are handled true, never snapshot fallback', async () => {
  const { state, client } = database(); state.accounts.delete('target');
  const journals = selected('lib/server/userStore.ts', ['recordAITutorMessageFromPostgresJournal', 'recordAITutorUsageFromPostgresJournal'], {
    ...helper, storageProvider: 'postgres', aiTutorPersistenceLane: { run: fn => fn() }, getPostgresClient: () => client,
    postgresMutationTransactionTimeouts: () => ({ lockTimeoutMs: 1000, statementTimeoutMs: 5000 }),
    acquirePostgresStorageMutationCapability: async () => ({}), currentPostgresStorageReadinessState: () => ({})
  });
  const record = { id: 'late-record', user_id: 'target', created_at: oldEvent.timestamp };
  assert.equal(await journals.recordAITutorMessageFromPostgresJournal(record), true);
  assert.equal(await journals.recordAITutorUsageFromPostgresJournal(record), true);
  assert.equal(state.queries.some(q => /INSERT INTO|UPDATE public.app_state/.test(q.text)), false);
});
test('absent-user hot settings stops after global capability before account lock; no UPSERT', async () => {
  const { state, client } = database(); state.accounts.delete('target'); const order = [];
  const settings = selected('lib/server/userStore.ts', ['updateUserSettingsInPostgresHotTables'], {
    ...helper, lockExistingPostgresAccountData: async (...args) => { order.push('account'); return helper.lockExistingPostgresAccountData(...args); },
    postgresHotAuthTablesEnabled: () => true, ensurePostgresStateTable: async () => {}, getPostgresClient: () => client,
    acquirePostgresStorageMutationCapability: async () => { order.push('global'); }, currentPostgresStorageReadinessState: () => ({})
  });
  assert.equal(await settings.updateUserSettingsInPostgresHotTables('target', {}), null);
  assert.deepEqual(order, ['global', 'account']); assert.equal(state.queries.some(q => /INSERT INTO/.test(q.text)), false);
});
test('absent-user hot rate admission is denied and handled without logging an orphan', async () => {
  const { state, client } = database(); state.accounts.delete('target');
  const rate = selected('lib/server/userStore.ts', ['consumeAiCapabilityRateLimitFromPostgresHotPath'], {
    ...helper, storageProvider: 'postgres', aiTutorAdmissionOperationSignal: s => s, aiTutorRateAdmissionOperationTimeoutMs: 2000,
    throwIfAiTutorAdmissionAborted: () => {}, aiTutorRateAdmissionSlot: { run: (_, fn) => fn() },
    getAiTutorRateAdmissionPostgresClient: () => client, runAbortBoundedAiTutorPostgresOperation: ({ operation }) => operation(),
    runCancellableAiTutorAdmissionQuery: ({ createQuery }) => createQuery(), aiTutorAdmissionLockTimeoutMs: 1000,
    aiTutorAdmissionStatementTimeoutMs: 2000, hotAuthSchemaVersion: 4
  });
  const decision = await rate.consumeAiCapabilityRateLimitFromPostgresHotPath({ userId: 'target', capability: 'ai-tutor-chat', rules: [], now: new Date(state.clock) });
  assert.equal(decision.allowed, false); assert.equal(state.queries.some(q => /INSERT INTO/.test(q.text)), false);
});
test('snapshot AI tutor/usage/governance/rate fallbacks cannot recreate erased user', async () => {
  const db = { users: [], ai_tutor_messages: [], ai_tutor_usage: [], ai_governance_events: [] };
  const ai = selected('lib/server/userStore/aiGovernancePersistence.ts', ['recordAITutorMessage', 'recordAITutorUsage', 'consumeAiCapabilityRateLimit', 'recordAiGovernanceEvent'], {
    createId: () => 'record', currentTime: () => new Date(oldEvent.timestamp), cleanTutorContextValue: x => x,
    recordAITutorMessageBeforeSnapshot: undefined, recordAITutorUsageBeforeSnapshot: undefined,
    consumeAiCapabilityRateLimitBeforeSnapshot: undefined, mutateDatabase: fn => fn(db)
  });
  await ai.recordAITutorMessage({ userId: 'target', role: 'student', content: 'synthetic' });
  await ai.recordAITutorUsage({ userId: 'target', model: 'synthetic' });
  await ai.recordAiGovernanceEvent({ userId: 'target', action: 'request-admitted', capability: 'ai-tutor-chat', reason: 'ok' });
  assert.equal((await ai.consumeAiCapabilityRateLimit({ userId: 'target', capability: 'ai-tutor-chat', rules: [] })).allowed, false);
  assert.equal(db.ai_tutor_messages.length + db.ai_tutor_usage.length + db.ai_governance_events.length, 0);
});
test('snapshot activity fallbacks stop for absent user; local clear remains monotonic for live user', async () => {
  const db = { users: [], learning_events: [], visualization_events: [], learning_event_clears: [] };
  const activity = selected('lib/server/userStore/studentActivityPersistence.ts', ['updateLessonProgress', 'submitQuestionAttempt', 'appendLearningEvents', 'clearLearningEventsForUser', 'markVisualizationSession'], {
    mutateLessonProgress: undefined, runMutation: fn => fn(db), defaultCurriculumTrack: 'hk', now: () => new Date('2026-10-01T09:01:00.000Z'),
    learningEventsFor: x => x.learning_events, visualizationEventsFor: x => x.visualization_events,
    learningEventClearsFor: x => x.learning_event_clears
  });
  assert.equal(await activity.updateLessonProgress({ userId: 'target' }), null);
  assert.equal(await activity.submitQuestionAttempt({ userId: 'target' }), null);
  assert.equal(await activity.appendLearningEvents('target', [oldEvent]), 0);
  assert.equal(await activity.markVisualizationSession({ userId: 'target' }), null);
  await activity.clearLearningEventsForUser('target'); assert.equal(db.learning_event_clears.length, 0);
  db.users.push({ id: 'target' }); db.learning_event_clears.push({ user_id: 'target', cleared_at: '2026-10-04T00:00:00.000Z' });
  await activity.clearLearningEventsForUser('target', oldEvent.timestamp);
  assert.equal(db.learning_event_clears[0].cleared_at, '2026-10-04T00:00:00.000Z');
});
test('unified PostgreSQL reset writes same marker to hot rows and snapshot, preserves other user', async () => {
  const { state, client } = database(); const db = { users: [{ id: 'target' }], learning_events: [{ user_id: 'target', created_at: '2026-10-04T00:00:00.000Z' }, { user_id: 'other', created_at: oldEvent.timestamp }], visualization_events: [{ user_id: 'target' }, { user_id: 'other' }], learning_event_clears: [] };
  const unified = selected('lib/server/userStore.ts', ['clearLearningEventsForUser'], {
    ...helper, storageProvider: 'postgres', ensurePostgresStudentActivityTables: async () => {},
    mutatePostgresAccountData: (userId, fn) => client.begin(async sql => { await helper.lockPostgresAccountData(sql, userId); return fn(db, sql); })
  });
  await unified.clearLearningEventsForUser('target');
  assert.equal(db.learning_event_clears[0].cleared_at, state.tables.learning_event_clears[0].cleared_at);
  assert.equal(db.learning_events.length, 1); assert.equal(db.learning_events[0].user_id, 'other');
  assert.equal(db.visualization_events.length, 1); assert.equal(db.visualization_events[0].user_id, 'other');
});
test('snapshot account transaction order and failure propagate before successful completion', async () => {
  const { client } = database(); const order = []; const db = {}; let failWrite = false;
  const mutator = selected('lib/server/userStore.ts', ['mutatePostgresAccountData'], {
    ...helper, ensurePostgresStateTable: async () => {}, getPostgresClient: () => client,
    readPostgresDatabaseForMutation: async () => { order.push('global'); return { database: db, storageCapability: {} }; },
    lockPostgresAccountData: async () => { order.push('account'); }, databaseIndexCache: { delete: () => {} },
    writePostgresDatabaseWith: async () => { order.push('snapshot+projections'); if (failWrite) throw Error('injected snapshot failure'); }
  });
  await mutator.mutatePostgresAccountData('target', async () => { order.push('hot-purge'); });
  assert.deepEqual(order, ['global', 'account', 'hot-purge', 'snapshot+projections']);
  failWrite = true; await assert.rejects(mutator.mutatePostgresAccountData('target', async () => {}), /injected snapshot failure/);
});

test('analytics reset handles large retained histories without argument-limit failure', async () => {
  const db = { users: [{ id: 'target' }], learning_events: Array.from({ length: 200000 }, () => ({ user_id: 'target', created_at: oldEvent.timestamp })), visualization_events: [], learning_event_clears: [] };
  const activity = selected('lib/server/userStore/studentActivityPersistence.ts', ['clearLearningEventsForUser'], {
    runMutation: fn => fn(db), now: () => new Date('2026-10-01T09:01:00Z'),
    learningEventsFor: x => x.learning_events, visualizationEventsFor: x => x.visualization_events,
    learningEventClearsFor: x => x.learning_event_clears
  });
  await activity.clearLearningEventsForUser('target');
  assert.equal(db.learning_events.length, 0);
  assert.equal(db.learning_event_clears[0].cleared_at, '2026-10-01T09:01:00.000Z');
});
