/** Lossless learner-owned state. No database, environment, or prototype imports. */
export const authorityComponents = {
  lesson_progress: 'user_id', adaptive_skill_state: 'user_id', adaptive_recommendation_cache: 'user_id',
  submissions: 'student_id', gamification_events: 'student_id', reward_point_ledger: 'student_id',
  attempts: 'user_id', mistakes: 'user_id', learning_events: 'user_id', learning_event_clears: 'user_id',
  visualization_events: 'user_id', visualization_sessions: 'user_id'
} as const;

export type AuthorityComponent = keyof typeof authorityComponents;
export type AuthorityRecord = Record<string, unknown>;
export type LearnerAuthorityState = Record<AuthorityComponent, AuthorityRecord[]>;
export type AuthorityDatabase = Record<string, unknown>;

export class LearnerAuthorityError extends Error {
  constructor(readonly code: string, readonly status = 503) {
    super(code);
    this.name = 'LearnerAuthorityError';
  }
}

export function learnerAuthorityFailureResponse(error: unknown): Response {
  if (!(error instanceof LearnerAuthorityError)) throw error;
  return Response.json({ code: error.code, error: "This request could not be confirmed. Reload before retrying." },
    { status: error.status, headers: { "Cache-Control": "private, no-store" } });
}

export function exactAuthorityKey(value: unknown): string {
  if (typeof value !== 'string' || !value.length || value.includes('\0')
    || Buffer.from(value, 'utf8').toString('utf8') !== value) {
    throw new LearnerAuthorityError('invalid-authority-key', 400);
  }
  return value;
}

export function sortedAuthorityKeys(values: readonly string[]): string[] {
  return [...new Set(values.map(exactAuthorityKey))].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

export function authorityRevision(value: unknown): number {
  if (!(typeof value === 'number' || (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)))) {
    throw new LearnerAuthorityError('invalid-authority-revision');
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new LearnerAuthorityError('invalid-authority-revision');
  return number;
}

function recordArray(value: unknown): AuthorityRecord[] {
  if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new LearnerAuthorityError('malformed-authority-component');
  }
  return value as AuthorityRecord[];
}

function assertAuthorityJson(value: unknown, active = new WeakSet<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || active.has(value)) throw new LearnerAuthorityError('invalid-authority-json');
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) throw new LearnerAuthorityError('invalid-authority-json');
  active.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string')) throw new LearnerAuthorityError('invalid-authority-json');
  if (array) {
    if (Object.keys(descriptors).length !== value.length + 1) throw new LearnerAuthorityError('invalid-authority-json');
    for (let index = 0; index < value.length; index++) if (!Object.hasOwn(descriptors, index)) throw new LearnerAuthorityError('invalid-authority-json');
  }
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (array && key === 'length') continue;
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new LearnerAuthorityError('invalid-authority-json');
    assertAuthorityJson(descriptor.value, active);
  }
  active.delete(value);
}

export function cloneAuthorityJson<T>(value: T): T {
  assertAuthorityJson(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function validateLearnerAuthorityState(value: unknown, userId: string): asserts value is LearnerAuthorityState {
  exactAuthorityKey(userId);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LearnerAuthorityError('missing-authority');
  assertAuthorityJson(value);
  const state = value as Record<string, unknown>;
  if (Object.keys(state).length !== Object.keys(authorityComponents).length
    || Object.keys(state).some(key => !Object.hasOwn(authorityComponents, key))) {
    throw new LearnerAuthorityError('malformed-authority-components');
  }
  for (const [component, owner] of Object.entries(authorityComponents)) {
    if (recordArray(state[component]).some(row => row[owner] !== userId)) {
      throw new LearnerAuthorityError('foreign-authority-record');
    }
  }
}

export function extractLearnerAuthorityState(database: AuthorityDatabase, userId: string): LearnerAuthorityState {
  exactAuthorityKey(userId);
  const result = Object.fromEntries(Object.entries(authorityComponents).map(([component, owner]) =>
    [component, cloneAuthorityJson(recordArray(database[component]).filter(row => row[owner] === userId))]));
  validateLearnerAuthorityState(result, userId);
  return result;
}

/** Overlay last, after legacy normalization. Empty arrays are authoritative. */
export function overlayLearnerAuthorityState<T extends AuthorityDatabase>(database: T, userId: string, state: LearnerAuthorityState): T {
  validateLearnerAuthorityState(state, userId);
  const next: AuthorityDatabase = { ...database };
  for (const [component, owner] of Object.entries(authorityComponents)) {
    const replacement = state[component as AuthorityComponent];
    let index = 0;
    const result: AuthorityRecord[] = [];
    for (const record of recordArray(database[component])) {
      if (record[owner] !== userId) result.push(record);
      else if (index < replacement.length) result.push(cloneAuthorityJson(replacement[index++]));
    }
    result.push(...cloneAuthorityJson(replacement.slice(index)));
    next[component] = result;
  }
  return next as T;
}

export type LearnerAuthorityClaim = {
  component: string; owner: string; generation: string; slot: number;
  id_key: string | null; source_key: string | null; record: AuthorityRecord;
};

export function learnerAuthorityClaims(state: LearnerAuthorityState, userId: string, generation: string): LearnerAuthorityClaim[] {
  validateLearnerAuthorityState(state, userId); exactAuthorityKey(generation);
  return (['submissions', 'gamification_events', 'reward_point_ledger'] as const).flatMap(component =>
    state[component].map((record, slot) => ({
      component, owner: userId, generation, slot,
      id_key: typeof record.id === 'string' && record.id.length ? exactAuthorityKey(record.id) : null,
      source_key: component === 'reward_point_ledger' && typeof record.source_key === 'string' && record.source_key.trim()
        ? exactAuthorityKey(record.source_key) : null,
      record: cloneAuthorityJson(record)
    })));
}
