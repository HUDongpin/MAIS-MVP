import assert from 'node:assert/strict';
import test from 'node:test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
const url=process.env.MAIS_LEARNER_AUTHORITY_TEST_URL;
if(url){const target=new URL(url);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'55461');assert.equal(target.pathname,'/mais_authority_tests');assert.equal(process.env.POSTGRES_URL,url);}
test('actual application learner authority and compatibility bridge',{skip:!url,timeout:120000},async t=>{
 process.env.HK_MATH_LEARNER_AUTHORITY='independent';
 const m=await import('./userStore.ts'),root=m.default??m;
 const p=await import('./practiceAttemptStore.ts'),practice=p.default??p;
 const hooks=root.__userStoreScopedLessonTestHooks;
 const sql=postgres(url,{max:2,prepare:false,idle_timeout:1});
 t.after(async()=>{await practice.__practiceAttemptStoreTestHooks.closePostgresClient();await root.__userStoreAiTutorPostgresTestHooks.closePostgresClients();await sql.end({timeout:3});});
 await root.__userStoreAiTutorPostgresTestHooks.ensureSchema();
 await sql`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`;
 await hooks.fullMutate(database=>{
  for(const name of ['authority-app-a','authority-app-b']){
   const normalized=hooks.normalize({users:[{id:name,username:name,role:'student',password_hash:'synthetic',password_salt:'synthetic',created_at:'2026-10-19T00:00:00Z',session_revision:3,disabled_at:null,password_must_change:false}],student_profiles:[{user_id:name,name,grade:'P1',curriculum_track:'HK'}],user_settings:[{user_id:name,language:'en',theme:'light',selected_grade:'P1',updated_at:'2026-10-19T00:00:00Z'}]});
   for(const key of ['users','student_profiles','user_settings'])database[key].push(...normalized[key].filter(row=>row.id===name||row.user_id===name));
  }
 });
 const snapshot=async()=> (await sql`SELECT revision,payload FROM public.app_state WHERE id='primary'`)[0];
 const database=hooks.normalizeSeedOnly((await snapshot()).payload);
 const lesson=database.lessons.find(record=>record.grade==='P1'&&database.topics.some(topic=>topic.id===record.topic_id&&topic.curriculum_track==='HK'));assert.ok(lesson);
 const command=async userId=>({...await root.getLearnerAuthoritySaveIdentity(userId),operationId:'app-complete',expiresAt:Date.now()+10000});
 const save=async(userId,overrides={})=>root.updateLessonProgress({userId,expectedSessionRevision:3,slug:lesson.slug,action:'update',curriculumTrack:'HK',authority:{...await command(userId),operationId:randomUUID()},...overrides});
 await t.test('real business completion writes only each learner authority and survives a full compatibility write',async()=>{
  const before=await snapshot();
  const results=await Promise.all(['authority-app-a','authority-app-b'].map(async userId=>root.updateLessonProgress({userId,expectedSessionRevision:3,slug:lesson.slug,action:'complete',curriculumTrack:'HK',durationSeconds:300,checklistState:{a:true},authority:await command(userId)})));
  assert.equal(results.length,2);assert.ok(results.every(result=>result?.status==='completed'));assert.deepEqual(await snapshot(),before);
  let observed;
  await hooks.fullMutate(database=>{observed=database.lesson_progress.filter(row=>row.lesson_slug===lesson.slug&&row.user_id.startsWith('authority-app-'));});
  assert.equal(observed.length,2);assert.ok(observed.every(row=>row.status==='completed'));
  const rows=await sql`SELECT user_id,payload,revision FROM learner_authority.states WHERE user_id LIKE 'authority-app-%' ORDER BY user_id`;
  assert.equal(rows.length,2);for(const row of rows){assert.equal(row.payload.reward_point_ledger.length,1);assert.equal(row.payload.gamification_events.length,1);assert.ok(row.payload.adaptive_skill_state.length);}
 });
 await t.test('the bounded dashboard read matches the complete compatibility image and observes independent revisions',async()=>{
  const module=await import('./userStore/studentActivityPersistence.ts'),activity=module.default??module;
  let expected;
  await hooks.fullMutate(db=>{expected=activity.studentActivityDashboardDataForDatabase(db,'authority-app-a','P1','HK',{now:()=>new Date(),contentUnavailableForProfile:()=>null});});
  assert.deepEqual(await root.getDashboardData('authority-app-a','P1','HK'),expected);
  const other=database.lessons.find(record=>record.grade==='P1'&&record.slug!==lesson.slug&&database.topics.some(topic=>topic.id===record.topic_id&&topic.curriculum_track==='HK'));assert.ok(other);
  await save('authority-app-a',{slug:other.slug,action:'start'});
  const read=await root.getDashboardData('authority-app-a','P1','HK');
  assert.equal(read.gradeTopics.find(topic=>topic.id===other.topic_id).status,'in-progress');
  await hooks.fullMutate(db=>{expected=activity.studentActivityDashboardDataForDatabase(db,'authority-app-a','P1','HK',{now:()=>new Date(),contentUnavailableForProfile:()=>null});});
  assert.deepEqual(read,expected);
 });
 await t.test('Progress observes an independent completion before any full writer refreshes projections',async()=>{
  const other=database.lessons.find(record=>record.grade==='P1'&&record.slug!==lesson.slug&&database.topics.some(topic=>topic.id===record.topic_id&&topic.curriculum_track==='HK'));assert.ok(other);
  const before=await snapshot();
  const beforeRead=await root.getProgressData('authority-app-b','P1','7d','HK');
  const completed=await save('authority-app-b',{slug:other.slug,action:'complete',durationSeconds:120});assert.equal(completed.status,'completed');
  assert.deepEqual(await snapshot(),before,'independent save must leave legacy app_state and projections untouched');
  const dashboard=await root.getDashboardData('authority-app-b','P1','HK');
  const fullSnapshotReads=async()=>Number((await sql`SELECT COALESCE(SUM(calls),0) AS calls FROM pg_stat_statements WHERE query LIKE '%ai_tutor_message_records%' AND query LIKE '%FROM public.app_state AS state%' AND query NOT LIKE '%pg_stat_statements%'`)[0].calls);
  const snapshotReadsBefore=await fullSnapshotReads();
  const progress=await root.getProgressData('authority-app-b','P1','7d','HK');
  assert.equal(await fullSnapshotReads(),snapshotReadsBefore,'Progress must use the bounded learner authority view without loading the complete app_state payload');
  assert.equal(dashboard.gradeTopics.find(topic=>topic.id===other.topic_id).status,'completed');
  assert.deepEqual(progress.progressMetrics,dashboard.progressMetrics,'Progress and Dashboard must consume the same fresh authority state');
  assert.notDeepEqual(progress.progressMetrics,beforeRead.progressMetrics,'Progress must observe the independent completion');
 });
 await t.test('actual signed route intent replays a committed save and rejects changed input or another actor',async()=>{
  const sessions=await import('../session.ts'),session=sessions.default??sessions;
  const routeModule=await import('../../app/api/lesson-progress/route.ts'),route=routeModule.default??routeModule;
  const requests=async id=>{
   const generation=await root.getLearnerAuthoritySessionGeneration(id);
   const token=await session.createSessionToken({userId:id,sessionRevision:3,accountGeneration:generation});
   return {'Content-Type':'application/json','X-MAIS-Expected-User-Id':id,Cookie:`${session.SESSION_COOKIE_NAME}=${token}`};
  };
  const headers=await requests('authority-app-a');const admission=await route.GET(new Request('http://localhost/api/lesson-progress',{headers}));
  assert.equal(admission.status,200);const {intent}=await admission.json();assert.equal(typeof intent,'string');
  const body={slug:lesson.slug,action:'update',durationSeconds:401,intent,operationId:randomUUID()};
  const call=async(value=body,head=headers)=>route.POST(new Request('http://localhost/api/lesson-progress',{method:'POST',headers:head,body:JSON.stringify(value)}));
  const first=await call();assert.equal(first.status,200);const answer=await first.json();
  const revision=await root.getLearnerAuthoritySaveIdentity('authority-app-a');
  const repeat=await call();assert.equal(repeat.status,200);assert.deepEqual(await repeat.json(),answer);assert.deepEqual(await root.getLearnerAuthoritySaveIdentity('authority-app-a'),revision);
  assert.equal((await call({...body,durationSeconds:402})).status,409);
  assert.equal((await call(body,await requests('authority-app-b'))).status,409);
 });
 await t.test('compatibility mode keeps acknowledged progress and uses the full writer when independent writes are disabled',async()=>{
  process.env.HK_MATH_LEARNER_AUTHORITY='compatibility';
  try{
   const before=await snapshot();const result=await save('authority-app-b',{durationSeconds:502});assert.ok(result);
   assert.equal(Number((await snapshot()).revision),Number(before.revision)+1);
   const exported=await root.exportUserAccountData('authority-app-b');assert.ok(exported.tables['learner_authority.receipts'].length);
   assert.equal(exported.tables.lesson_progress.find(row=>row.lesson_slug===lesson.slug).duration_seconds,502);
  }finally{process.env.HK_MATH_LEARNER_AUTHORITY='independent';}
 });
 await t.test('a maintenance writer that already invalidated source attestation completes the full synchronization path',async()=>{
  const before=await sql`SELECT user_id,generation,revision,payload FROM learner_authority.states ORDER BY user_id`;
  await root.__userStorePostgresStorageReadinessTestHooks.rewriteCurrentSnapshot();
  assert.deepEqual(await sql`SELECT user_id,generation,revision,payload FROM learner_authority.states ORDER BY user_id`,before);
  assert.equal((await sql`SELECT attested_epoch=content_epoch AND state_revision=(SELECT revision FROM public.app_state WHERE id='primary') AS valid FROM learner_authority.control`)[0].valid,true);
 });
 await t.test('global foreign reward claims and duplicate owned records survive actual lesson callbacks',async()=>{
  const other=database.lessons.find(record=>record.slug!==lesson.slug&&record.grade==='P1'&&database.topics.some(topic=>topic.id===record.topic_id&&topic.curriculum_track==='HK'));assert.ok(other);
  const source=`lesson-complete:authority-app-a:${other.slug}`.trim().replace(/\s+/g,'-').slice(0,240);
  await hooks.fullMutate(db=>{
   db.reward_point_ledger.push({id:'foreign-conflict',student_id:'authority-app-b',source_key:source,amount:5,reason:'lesson-complete',label_en:'synthetic',label_zh:'synthetic',created_at:new Date().toISOString()});
   const skill=db.adaptive_skill_state.find(row=>row.user_id==='authority-app-a');assert.ok(skill);db.adaptive_skill_state.push({...skill,p_mastery:0.123});
  });
  const before=(await sql`SELECT payload FROM learner_authority.states WHERE user_id='authority-app-a'`)[0].payload;
  await save('authority-app-a',{slug:other.slug,action:'complete'});
  const after=(await sql`SELECT payload FROM learner_authority.states WHERE user_id='authority-app-a'`)[0].payload;
  assert.equal(after.reward_point_ledger.length,before.reward_point_ledger.length);
  assert.equal(after.gamification_events.length,before.gamification_events.length);
  assert.equal(after.adaptive_skill_state.filter(row=>row.skill_id===before.adaptive_skill_state[0].skill_id).length,2);
 });
 await t.test('clears retire pending intents and exports/readers preserve authoritative emptiness over cold data',async()=>{
  await hooks.fullMutate(db=>{db.learning_events.push({id:'clear-me',user_id:'authority-app-a',type:'lesson-complete',source:'lesson',grade:'P1',topic_id:lesson.topic_id,created_at:new Date().toISOString()});});
  const old=await command('authority-app-a');
  await root.clearLearningEventsForUser('authority-app-a');
  await assert.rejects(save('authority-app-a',{authority:{...old,operationId:randomUUID()}}),/authority-intent-stale/);
  const exported=await root.exportUserAccountData('authority-app-a');assert.equal(exported.tables.learning_events?.length??0,0);
  const state=(await sql`SELECT payload FROM learner_authority.states WHERE user_id='authority-app-a'`)[0].payload;
  assert.equal(state.learning_events.length,0);assert.equal(state.learning_event_clears.length,1);
 });
 await t.test('revocation is rechecked after the account lock, and stale auth cannot mint a new generation cookie',async()=>{
  const old=await command('authority-app-a');
  await root.revokeAllUserSessions('authority-app-a');
  await assert.rejects(save('authority-app-a',{authority:{...old,operationId:randomUUID()}}),/authority-actor-rejected/);
  const cookieModule=await import('./sessionCookie.ts'),cookie=cookieModule.default??cookieModule;
  const nextModule=await import('next/server.js'),next=nextModule.default??nextModule;
  await assert.rejects(cookie.setSessionCookie(next.NextResponse.json({ok:true}),'authority-app-a',new Request('http://localhost/login'),4,randomUUID()),e=>e.code==='revision-mismatch');
 });
 await t.test('legacy writers and snapshot restore are fenced while acknowledged state remains readable',async()=>{
  const before=await snapshot();await assert.rejects(sql`UPDATE public.app_state SET payload=payload`,/participant-required/);assert.deepEqual(await snapshot(),before);
  const restore=await import('../../scripts/storage-admin-snapshot-merge.mjs');
  await assert.rejects(sql.begin(tx=>restore.applyMergedSnapshotInTransaction(tx,{schemaVersion:1},before.payload)),/generation-aware restore/);
  const progress=await root.getRoadmapData('authority-app-b','P1','HK');assert.ok(progress);
 });
});
