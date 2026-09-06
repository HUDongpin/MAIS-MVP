import assert from "node:assert/strict";
import test from "node:test";

import {
  createParentPostgresScopedMutationAdapter,
  type ParentPostgresClient,
  type ParentPostgresSql
} from "./parentPostgresScopedMutations";

const state = {
  id: "primary",
  tenantId: "platform",
  stateKind: "app-snapshot",
  schemaVersion: 1
};

type Statement = {
  text: string;
  transactionActive: boolean;
};

function createFakeClient({ capabilityFailure }: { capabilityFailure?: Error } = {}) {
  const statements: Statement[] = [];
  const events: string[] = [];
  let transactionActive = false;
  const capability = Object.freeze({ opaque: true });
  const sql = (async (strings: TemplateStringsArray) => {
    const text = strings.join("$value");
    statements.push({ text, transactionActive });
    if (text.includes("parent_message_create_scope")) {
      return [{
        schema_valid: true,
        authorized_thread_count: 0,
        global_thread_count: 0,
        users: [],
        student_profiles: [],
        guardian_links: [],
        class_enrollments: [],
        teacher_classes: [],
        school_memberships: [],
        teacher_reports: [],
        teacher_messages: [],
        teacher_message_entries: []
      }];
    }
    if (text.includes("parent_scoped_mutation_current_revision")) {
      events.push("revision");
      return [{ revision: 7 }];
    }
    if (text.includes("parent_state_scope_lock")) return [{ id: state.id }];
    return [];
  }) as ParentPostgresSql;
  sql.json = (value: unknown) => value;
  const client = Object.assign(sql, {
    begin: async <T>(operation: (transaction: ParentPostgresSql) => Promise<T>) => {
      transactionActive = true;
      try {
        return await operation(sql);
      } finally {
        transactionActive = false;
      }
    }
  }) as ParentPostgresClient;
  return {
    acquireStorageMutationCapability: async () => {
      events.push("capability");
      if (capabilityFailure) throw capabilityFailure;
      return capability;
    },
    advanceStorageReadinessAfterMutation: async (
      _sql: ParentPostgresSql,
      receivedCapability: unknown,
      revision: number
    ) => {
      assert.equal(receivedCapability, capability);
      assert.equal(revision, 7);
      events.push("advance");
    },
    client,
    events,
    statements
  };
}

test("parent scoped mutations acquire storage capability before scope access and re-attest the committed revision", async () => {
  const fake = createFakeClient();
  const adapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => fake.client,
    state,
    acquireStorageMutationCapability: fake.acquireStorageMutationCapability,
    advanceStorageReadinessAfterMutation: fake.advanceStorageReadinessAfterMutation
  });

  const result = await adapter.mutateMessageDatabase({
    kind: "create",
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-1",
    reportId: null,
    idempotencyKeyHash: "a".repeat(64)
  }, () => ({ status: "no-delta" as const }));

  assert.deepEqual(result, { status: "no-delta" });
  assert.deepEqual(fake.events, ["capability", "revision", "advance"]);
  assert.equal(
    fake.statements.some((statement) => statement.text.includes("parent_state_scope_lock")),
    false,
    "the adapter must not take the app_state row before the shared storage advisory/relation protocol"
  );
  const timeoutIndex = fake.statements.findIndex((statement) => (
    statement.text.includes("parent_scoped_mutation_timeouts")
  ));
  const scopeIndex = fake.statements.findIndex((statement) => (
    statement.text.includes("parent_message_create_scope")
  ));
  const revisionIndex = fake.statements.findIndex((statement) => (
    statement.text.includes("parent_scoped_mutation_current_revision")
  ));
  assert.ok(timeoutIndex >= 0 && scopeIndex > timeoutIndex && revisionIndex > scopeIndex);
  assert.ok(fake.statements.every((statement) => statement.transactionActive));
});

test("a failed storage capability stops parent scoped mutation before family data or mutator access", async () => {
  const fake = createFakeClient({ capabilityFailure: new Error("capability unavailable") });
  const adapter = createParentPostgresScopedMutationAdapter({
    ensureSchema: async () => undefined,
    getClient: () => fake.client,
    state,
    acquireStorageMutationCapability: fake.acquireStorageMutationCapability,
    advanceStorageReadinessAfterMutation: fake.advanceStorageReadinessAfterMutation
  });
  let mutatorCalled = false;

  await assert.rejects(adapter.mutateMessageDatabase({
    kind: "create",
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-1",
    reportId: null,
    idempotencyKeyHash: "a".repeat(64)
  }, () => {
    mutatorCalled = true;
    return null;
  }), /capability unavailable/u);

  assert.equal(mutatorCalled, false);
  assert.equal(fake.statements.some((statement) => (
    statement.text.includes("parent_message_create_scope")
  )), false);
  assert.deepEqual(fake.events, ["capability"]);
});
