import assert from 'node:assert/strict';
import test from 'node:test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

const url = process.env.MAIS_LEARNER_AUTHORITY_TEST_URL;
if (url) {
  const target = new URL(url);
  assert.equal(target.hostname, '127.0.0.1');
  assert.equal(target.port, '55461');
  assert.equal(target.pathname, '/mais_authority_tests');
  assert.equal(process.env.POSTGRES_URL, url);
}

test('course identity crosses PostgreSQL publication and bounded authority reads', { skip: !url, timeout: 120000 }, async t => {
  process.env.HK_MATH_LEARNER_AUTHORITY = 'independent';
  const topicsModule = await import('../../data/topics.ts');
  const topics = (topicsModule.default ?? topicsModule).topics;
  const source = topics.find(topic => topic.curriculumTrack === 'HK' && topic.grade === 'P1');
  assert.ok(source);
  source.courseId = 'reviewed-seed-course';
  source.courseLabel = { en: 'Geometry', zh: '幾何', zhHans: '几何' };
  const imported = await import('./userStore.ts');
  const root = imported.default ?? imported;
  const practiceModule = await import('./practiceAttemptStore.ts');
  const practice = practiceModule.default ?? practiceModule;
  const authorityModule = await import('./learnerAuthority.ts');
  const authority = authorityModule.default ?? authorityModule;
  const hooks = root.__userStoreScopedLessonTestHooks;
  const sql = postgres(url, { max: 2, prepare: false, idle_timeout: 1 });
  t.after(async () => {
    await practice.__practiceAttemptStoreTestHooks.closePostgresClient();
    await root.__userStoreAiTutorPostgresTestHooks.closePostgresClients();
    await sql.end({ timeout: 3 });
  });
  const userId = 'authority-course-identity';
  const topicId = 'authority-course-topic';
  const slug = 'authority-course-lesson';
  await root.__userStoreAiTutorPostgresTestHooks.ensureSchema();
  await hooks.fullMutate(database => {
    const normalized = hooks.normalize({
      users: [{ id: userId, username: userId, role: 'student', password_hash: 'synthetic', password_salt: 'synthetic', created_at: '2026-10-27T00:00:00Z', session_revision: 1, disabled_at: null, password_must_change: false }],
      student_profiles: [{ user_id: userId, name: userId, grade: source.grade, curriculum_track: 'HK' }],
      user_settings: [{ user_id: userId, language: 'en', theme: 'light', selected_grade: source.grade, updated_at: '2026-10-27T00:00:00Z' }]
    });
    for (const key of ['users', 'student_profiles', 'user_settings']) database[key].push(...normalized[key].filter(row => row.id === userId || row.user_id === userId));
    const originalTopic = database.topics.find(topic => topic.id === source.id);
    const originalLesson = database.lessons.find(lesson => lesson.topic_id === source.id);
    assert.ok(originalTopic); assert.ok(originalLesson);
    const customTopic = { ...originalTopic, id: topicId, canonical_topic_id: topicId };
    for (const key of ['course_id', 'course_label_en', 'course_label_zh', 'course_label_zh_hans']) delete customTopic[key];
    database.topics.push(customTopic);
    database.lessons.push({ ...originalLesson, slug, topic_id: topicId, canonical_topic_id: topicId });
  });
  const identity = () => root.getLearnerAuthoritySaveIdentity(userId);
  const publishedTopic = async id => {
    const [{ content }] = await sql`SELECT publication.content FROM learner_authority.control control JOIN learner_authority.publications publication ON publication.id=control.publication_id`;
    return content.canonical.topics.find(topic => topic.id === id);
  };
  const reads = async id => {
    const roadmap = await root.getRoadmapData(userId, source.grade, 'HK');
    const dashboard = await root.getDashboardData(userId, source.grade, 'HK');
    const result = [roadmap.topics.find(topic => topic.id === id), dashboard.gradeTopics.find(topic => topic.id === id)];
    // The adaptive engine accepts registered source topics; the custom canonical
    // fixture below exercises the complete maintenance/publication path only.
    if (id === source.id) {
      const decision = await root.getAdaptiveLearningDecision({ userId, grade: source.grade, topicId: id, curriculumTrack: 'HK' });
      assert.ok(decision);
      result.push(decision.topic);
    }
    return result;
  };
  await t.test('reviewed seed course metadata survives frozen content publication and every topic DTO', async () => {
    for (const topic of await reads(source.id)) {
      assert.equal(topic?.grade, source.grade);
      assert.equal(topic?.courseId, source.courseId);
      assert.deepEqual(topic?.courseLabel, source.courseLabel);
    }
    assert.equal((await publishedTopic(source.id)).course_id, source.courseId);
  });
  let priorIntent;
  await t.test('complete maintenance publication adds a canonical course mapping without changing grade', async () => {
    priorIntent = await identity();
    await hooks.fullMutate(database => Object.assign(database.topics.find(topic => topic.id === topicId), {
      course_id: 'reviewed-custom-course', course_label_en: 'Geometry', course_label_zh: '幾何', course_label_zh_hans: '几何'
    }));
    assert.notEqual((await identity()).publicationId, priorIntent.publicationId);
    for (const topic of await reads(topicId)) {
      assert.equal(topic?.grade, source.grade);
      assert.equal(topic?.courseId, 'reviewed-custom-course');
      assert.deepEqual(topic?.courseLabel, source.courseLabel);
    }
    assert.equal((await publishedTopic(topicId)).course_id, 'reviewed-custom-course');
  });
  await t.test('withdrawal republishes course metadata, rejects stale intents and keeps independent saves readable', async () => {
    const mappedIntent = await identity();
    await hooks.fullMutate(database => {
      const topic = database.topics.find(record => record.id === topicId);
      for (const key of ['course_id', 'course_label_en', 'course_label_zh', 'course_label_zh_hans']) delete topic[key];
    });
    const current = await identity();
    assert.notEqual(current.publicationId, mappedIntent.publicationId);
    for (const topic of await reads(topicId)) {
      assert.equal(topic?.grade, source.grade);
      assert.equal(topic?.courseId, undefined);
      assert.equal(topic?.courseLabel, undefined);
    }
    assert.equal((await publishedTopic(topicId)).course_id, undefined);
    const save = intent => root.updateLessonProgress({ userId, expectedSessionRevision: 1, slug, action: 'complete', curriculumTrack: 'HK', authority: { ...intent, operationId: randomUUID(), expiresAt: Date.now() + 10000 } });
    await assert.rejects(save(mappedIntent), error => error.code === 'authority-definition-stale' && error.status === 409);
    assert.equal((await save(current)).status, 'completed');
    const dashboard = await root.getDashboardData(userId, source.grade, 'HK');
    const progress = await root.getProgressData(userId, source.grade, '7d', 'HK');
    assert.deepEqual(progress.progressMetrics, dashboard.progressMetrics);
    assert.equal(dashboard.gradeTopics.find(topic => topic.id === topicId).status, 'completed');
  });
  await t.test('a different build source remains rejected instead of silently replacing a publication', async () => {
    const [{ source: publishedSource }] = await sql`SELECT publication.content->'source' AS source FROM learner_authority.control control JOIN learner_authority.publications publication ON publication.id=control.publication_id`;
    publishedSource.topics.find(topic => topic.id === source.id).course_id = 'unmatched-source-version';
    const candidate = authority.bindLearnerAuthorityContent(publishedSource);
    await assert.rejects(sql.begin(tx => authority.readLearnerAuthorityContent(tx, candidate)), /learner-authority-source-version-mismatch/);
  });
});
