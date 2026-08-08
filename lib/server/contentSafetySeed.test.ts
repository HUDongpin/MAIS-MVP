import assert from "node:assert/strict";
import test from "node:test";

/**
 * `/teacher/safety` had no seeded alerts, so its triage flow could not be exercised at all —
 * All/New/Acknowledged/Resolved all rendered (0), which is indistinguishable from a broken
 * surface (S11 in coordination/ff-ledger.md).
 *
 * The gate below is the part that matters: a deployment with HK_MATH_ENABLE_DEMO_USER=false must
 * never show fabricated child-safety alerts. A fake alert in production is not cosmetic — it
 * could mask or discredit a real one.
 */

async function seedWithDemoFlag(value: string | undefined) {
  const previous = process.env.HK_MATH_ENABLE_DEMO_USER;
  if (value === undefined) delete process.env.HK_MATH_ENABLE_DEMO_USER;
  else process.env.HK_MATH_ENABLE_DEMO_USER = value;
  delete require.cache[require.resolve("@/lib/server/userStore")];
  const mod = await import("@/lib/server/userStore");
  const flags = mod.seedContentSafetyFlags("2026-01-01T00:00:00.000Z");
  if (previous === undefined) delete process.env.HK_MATH_ENABLE_DEMO_USER;
  else process.env.HK_MATH_ENABLE_DEMO_USER = previous;
  return flags;
}

test("demo seeding off produces no safety alerts", async () => {
  const flags = await seedWithDemoFlag("false");
  assert.deepEqual(flags, [], "a non-demo deployment must never carry fabricated safety alerts");
});

test("demo seeding on produces one actionable and one already-handled alert", async () => {
  const flags = await seedWithDemoFlag("true");
  assert.equal(flags.length, 2);
  const statuses = flags.map((flag) => flag.status).sort();
  assert.deepEqual(statuses, ["acknowledged", "new"], "one 'new' makes triage drivable; one 'acknowledged' makes the filters discriminate");
});

test("seeded alerts are attributed and non-graphic", async () => {
  const flags = await seedWithDemoFlag("true");
  for (const flag of flags) {
    assert.equal(flag.student_id, "student-peter");
    assert.equal(flag.category, "harassment", "demo data uses the mildest category deliberately");
    assert.match(flag.excerpt, /^Sample flagged message/, "excerpt must read as obviously synthetic");
    assert.equal(flag.blocked_reply, false);
  }
});
