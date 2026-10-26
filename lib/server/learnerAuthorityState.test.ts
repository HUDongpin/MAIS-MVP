import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authorityComponents, extractLearnerAuthorityState, overlayLearnerAuthorityState,
  validateLearnerAuthorityState, exactAuthorityKey, sortedAuthorityKeys, authorityRevision,
  learnerAuthorityClaims
} from './learnerAuthorityState';

const fixture = () => Object.fromEntries(Object.entries(authorityComponents).map(([component, owner]) => [component, [
  { [owner]: 'foreign', id: 'before', nested: { value: null } },
  { [owner]: 'learner', id: 'duplicate', index: 1 },
  { [owner]: 'foreign', id: 'between' },
  { [owner]: 'learner', id: 'duplicate', index: 2 }
]]));

test('all ordered learner slots and duplicate IDs survive extract and round-trip overlay', () => {
  const database = fixture(), before = structuredClone(database);
  const owned = extractLearnerAuthorityState(database, 'learner');
  for (const rows of Object.values(owned)) assert.deepEqual(rows.map(row => row.index), [1, 2]);
  assert.deepEqual(overlayLearnerAuthorityState(database, 'learner', owned), database);
  assert.deepEqual(database, before);
  owned.lesson_progress[0].changed = true;
  assert.deepEqual(database, before, 'owned callback cannot mutate baseline aliases');
});

test('authoritative empty arrays erase only that owner and never fall back to cold rows', () => {
  const database = fixture(), owned = extractLearnerAuthorityState(database, 'learner');
  for (const key of Object.keys(authorityComponents) as Array<keyof typeof authorityComponents>) owned[key] = [];
  const result = overlayLearnerAuthorityState(database, 'learner', owned);
  for (const [key, owner] of Object.entries(authorityComponents)) {
    assert.deepEqual(result[key], database[key].filter(row => row[owner] === 'foreign'));
  }
  assert.deepEqual(extractLearnerAuthorityState(result, 'learner'), owned);
});

test('new owner records preserve owner order and the relative order of foreign records', () => {
  const database = fixture(), owned = extractLearnerAuthorityState(database, 'learner');
  owned.lesson_progress.unshift({ user_id: 'learner', id: 'new' });
  const result = overlayLearnerAuthorityState(database, 'learner', owned);
  assert.deepEqual(extractLearnerAuthorityState(result, 'learner'), owned);
  assert.deepEqual(result.lesson_progress.filter(row => row.user_id === 'foreign'), database.lesson_progress.filter(row => row.user_id === 'foreign'));
});

test('malformed or foreign authority fails closed without mutating the supplied baseline', () => {
  for (const change of [
    (state: any) => { delete state.lesson_progress; },
    (state: any) => { state.lesson_progress = null; },
    (state: any) => { state.lesson_progress.push({ user_id: 'foreign' }); },
    (state: any) => { state.reward_point_ledger.push(null); },
    (state: any) => { state.unknown_component = []; }
  ]) {
    const database = fixture(), before = structuredClone(database), owned = extractLearnerAuthorityState(database, 'learner');
    change(owned);
    assert.throws(() => validateLearnerAuthorityState(owned, 'learner'), /authority/);
    assert.throws(() => overlayLearnerAuthorityState(database, 'learner', owned), /authority/);
    assert.deepEqual(database, before);
  }
});

test('identity is exact UTF-8 bytes, including case and canonical Unicode distinctions', () => {
  assert.deepEqual(sortedAuthorityKeys(['é', 'e\u0301', 'Case', 'case', 'Case']), ['Case', 'case', 'e\u0301', 'é']);
  assert.equal(exactAuthorityKey('__proto__'), '__proto__');
  for (const value of ['', '\u0000', '\ud800', null, 1]) assert.throws(() => exactAuthorityKey(value), /key/);
});

test('CAS revisions reject coercion, overflow and invalid counters', () => {
  for (const value of [0, '0', 1, '9007199254740991']) assert.equal(authorityRevision(value), Number(value));
  for (const value of [-1, 1.2, ' 1', '', '01', true, null, NaN, Infinity, '9007199254740992']) assert.throws(() => authorityRevision(value), /revision/);
});

test('global claim records preserve duplicates and legacy blank/null sources without false ownership', () => {
  const state = extractLearnerAuthorityState(fixture(), 'learner');
  state.reward_point_ledger = [
    { student_id: 'learner', id: 'same', source_key: 'global-source', amount: 40 },
    { student_id: 'learner', id: 'same', source_key: 'global-source', amount: 7 },
    { student_id: 'learner', id: null, source_key: null, amount: 3 },
    { student_id: 'learner', id: '', source_key: ' \u00a0 ', amount: 2 }
  ];
  const claims = learnerAuthorityClaims(state, 'learner', 'generation').filter(row => row.component === 'reward_point_ledger');
  assert.equal(claims.length, 4);
  assert.deepEqual(claims.map(row => row.slot), [0, 1, 2, 3]);
  assert.deepEqual(claims.map(row => row.source_key), ['global-source', 'global-source', null, null]);
  assert.deepEqual(claims.map(row => row.record.amount), [40, 7, 3, 2]);
});

test('non-JSON values, coercion hooks, sparse arrays and cycles cannot silently change authority', () => {
  for (const bad of [NaN, Infinity, undefined, ()=>1, new Date(), { toJSON: () => ({ user_id:'foreign' }) }]) {
    const state = extractLearnerAuthorityState(fixture(), 'learner');
    state.lesson_progress[0].invalid = bad;
    assert.throws(() => validateLearnerAuthorityState(state, 'learner'), /authority.*json/);
    assert.throws(() => overlayLearnerAuthorityState(fixture(), 'learner', state), /authority.*json/);
  }
  const sparse=extractLearnerAuthorityState(fixture(),'learner');delete sparse.lesson_progress[0];
  assert.throws(()=>validateLearnerAuthorityState(sparse,'learner'),/authority/);
  const cycle=extractLearnerAuthorityState(fixture(),'learner');cycle.lesson_progress[0].cycle=cycle;
  assert.throws(()=>validateLearnerAuthorityState(cycle,'learner'),/authority.*json/);
  const coercion=extractLearnerAuthorityState(fixture(),'learner');
  coercion.lesson_progress[0].toJSON=()=>({user_id:'foreign'});
  assert.throws(()=>overlayLearnerAuthorityState(fixture(),'learner',coercion),/authority.*json/);
});
