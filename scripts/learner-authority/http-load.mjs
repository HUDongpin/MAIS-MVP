import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import postgres from 'postgres';
const count=Number(process.env.MAIS_HTTP_LEARNERS),run=process.env.MAIS_HTTP_RUN;
const mixed=process.env.MAIS_HTTP_WORKLOAD==='mixed';
assert.ok([2,20].includes(count));assert.ok(process.env.MAIS_HTTP_ARTIFACT_ROOT && run?.startsWith(process.env.MAIS_HTTP_ARTIFACT_ROOT+'/'));
const bases=['http://127.0.0.1:3121','http://127.0.0.1:3122'];
const url=new URL(process.env.MAIS_HTTP_OBSERVER_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55462');assert.equal(url.pathname,'/mais_authority_http_tests');
const sql=postgres(url.href,{max:1,prepare:false,idle_timeout:1});
const receipts=[],users=[],metrics=[],connectionSamples=[];
const password='Synthetic-only-classroom-validation!';
async function call(worker,path,{method='GET',body,user,timeout=20000}={}){
 const start=performance.now();
 const response=await fetch(bases[worker]+path,{method,headers:{'content-type':'application/json',...(user?{cookie:user.cookie,'X-MAIS-Expected-User-Id':user.id}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
 const value=await response.json();const elapsed=performance.now()-start;
 return {status:response.status,value,elapsed,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return {n:values.length,min:sorted[0],p50:sorted[Math.ceil(sorted.length*.5)-1],p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1)};};
const assertOk=(response,label)=>assert.equal(response.status,200,`${label}: ${JSON.stringify(response.value)}`);
let stopMonitor=false;const monitor=(async()=>{while(!stopMonitor){const [sample]=await sql`SELECT count(*)::int AS connections,count(*) FILTER(WHERE state='active')::int AS active FROM pg_stat_activity WHERE usename='mais_authority_http_app'`;connectionSamples.push(sample);await new Promise(r=>setTimeout(r,25));}})();
try{
 for(let index=0;index<count;index++){
  const worker=index%2,username=`authority-http-${count}-${index}-${randomUUID().slice(0,8)}`;
  const registration=await call(worker,'/api/auth/register',{method:'POST',body:{name:`Synthetic learner ${index}`,username,password,role:'student',grade:'P1',curriculumProfile:{region:'HK',publisher:'HK_UNITED_PRIME_MIA'},language:'en',theme:'light',parentalConsent:{acknowledged:true,guardianName:'Synthetic validation guardian',relationship:'parent'}}});
  assert.ok([200,201].includes(registration.status),`registration: ${registration.status} ${JSON.stringify(registration.value)}`);
  const login=await call(worker,'/api/auth/login',{method:'POST',body:{username,password,grade:'P1',language:'en',theme:'light'}});assertOk(login,'login');assert.ok(login.cookie);
  const id=login.value.user?.id;assert.equal(typeof id,'string');
  const target=login.value.lessonEntryTarget;assert.ok(target?.slug,'real login must provide a lesson entry target');
  users.push({id,cookie:login.cookie,slug:target.slug,worker});
  receipts.push({kind:'setup',index,userId:id,registrationStatus:registration.status,loginStatus:login.status});
 }
 assert.equal(new Set(users.map(u=>u.id)).size,count);
 // Measurement follows real registration/login, including each worker's startup
 // admission and exact immutable source proof. Every save rechecks live versions.
 const before=(await sql`SELECT revision FROM public.app_state WHERE id='primary'`)[0].revision;
 for(const [round,action]of ['start','complete','update'].entries()){
  const roundStart=performance.now();
  const results=await Promise.all(users.map(async(user,index)=>{
   const worker=(index+round)%2,start=performance.now();
   const admission=await call(worker,'/api/lesson-progress',{user});assertOk(admission,'intent');assert.equal(typeof admission.value.intent,'string');
   const operationId=randomUUID(),body={slug:user.slug,action,durationSeconds:300+round,checklistState:{http:true},intent:admission.value.intent,operationId};
   const saved=await call(worker,'/api/lesson-progress',{method:'POST',body,user});assertOk(saved,'save');assert.equal(saved.value.lesson?.slug,user.slug);
   user.lastSave={body,result:saved.value};
   if(round>0)assert.equal(saved.value.lesson.status,'completed');
   const result={kind:'save',round,index,userId:user.id,worker,action,operationId,httpMs:saved.elapsed,intentMs:admission.elapsed,flowMs:performance.now()-start};
   receipts.push(result);metrics.push(result);
   return result;
  }));
  const roundSummary={round,action,totalMs:performance.now()-roundStart,http:summary(results.map(r=>r.httpMs)),flow:summary(results.map(r=>r.flowMs))};
  receipts.push({kind:'round',...roundSummary});
  await fs.writeFile(`${run}/http-progress.json`,JSON.stringify({learners:count,rounds:receipts.filter(r=>r.kind==='round'),correctness:'in-progress'},null,2));
  // Paired, opposite-worker reads prove acknowledged writes cross the process boundary.
  await Promise.all(users.map(async(user,index)=>{
   const read=await call((index+round+1)%2,'/api/roadmap?grade=P1',{user});assertOk(read,'roadmap');
   const topics=read.value.roadmap?.topics;assert.ok(Array.isArray(topics));
   const state=(await sql`SELECT payload FROM learner_authority.states WHERE user_id=${user.id}`)[0]?.payload;
   assert.ok(state);const progress=state.lesson_progress.find(row=>row.lesson_slug===user.slug);assert.ok(progress);
   if(round>0){assert.equal(progress.status,'completed');assert.equal(topics.find(t=>t.id===progress.topic_id)?.status,'completed');}
   assert.equal(progress.duration_seconds,300+round);assert.equal(progress.checklist_state.http,true);
   receipts.push({kind:'readback',round,userId:user.id,worker:(index+round+1)%2,httpMs:read.elapsed,verified:true});
  }));
 }
 assert.equal((await sql`SELECT revision FROM public.app_state WHERE id='primary'`)[0].revision,before,'ordinary independent saves must not write the global snapshot');
 if(mixed){
  const questions=await call(0,'/api/questions?grade=P1',{user:users[0]});assertOk(questions,'questions');
  const question=questions.value.questions?.[0];assert.ok(question?.id,'the signed-in learner curriculum must provide a practice question');
  const mixedStart=performance.now(),startIndex=metrics.length;
  const saveMixed=async(user,index)=>{
   const worker=(index+1)%2,start=performance.now();
   const admission=await call(worker,'/api/lesson-progress',{user});assertOk(admission,'mixed intent');
   const operationId=randomUUID(),body={slug:user.slug,action:'complete',durationSeconds:400,checklistState:{http:true,mixed:true},intent:admission.value.intent,operationId};
   const saved=await call(worker,'/api/lesson-progress',{method:'POST',body,user});assertOk(saved,'mixed save');assert.equal(saved.value.lesson.status,'completed');
   user.lastSave={body,result:saved.value};
   const metric={kind:'save',round:3,index,userId:user.id,worker,action:'complete',operationId,httpMs:saved.elapsed,intentMs:admission.elapsed,flowMs:performance.now()-start};metrics.push(metric);receipts.push(metric);
  };
  const jobs=[(async()=>{
   const attempt=await call(0,'/api/attempts',{method:'POST',user:users[0],body:{questionId:question.id,selectedAnswer:'__synthetic_wrong__',durationSeconds:12,submissionId:randomUUID()}});
   assertOk(attempt,'mixed practice');assert.equal(attempt.value.persisted,true);receipts.push({kind:'practice',userId:users[0].id,httpMs:attempt.elapsed,persisted:true});
   await saveMixed(users[0],0);
  })(),...users.slice(1).map((user,index)=>saveMixed(user,index+1)),...users.map(async(user,index)=>{
   const read=await call(index%2,'/api/dashboard?grade=P1',{user});assertOk(read,'mixed dashboard');receipts.push({kind:'mixed-read',userId:user.id,httpMs:read.elapsed});
  })];
  const settled=await Promise.allSettled(jobs);const failed=settled.filter(result=>result.status==='rejected');
  assert.equal(failed.length,0,failed.map(result=>String(result.reason)).join(' | '));
  const values=metrics.slice(startIndex);receipts.push({kind:'round',round:3,action:'mixed-practice-read-save',totalMs:performance.now()-mixedStart,http:summary(values.map(r=>r.httpMs)),flow:summary(values.map(r=>r.flowMs))});
  for(const [index,user] of users.entries()){
   const read=await call((index+1)%2,'/api/roadmap?grade=P1',{user});assertOk(read,'mixed readback');
   const state=(await sql`SELECT payload FROM learner_authority.states WHERE user_id=${user.id}`)[0].payload;
   const progress=state.lesson_progress.find(row=>row.lesson_slug===user.slug);assert.equal(progress.status,'completed');assert.equal(progress.duration_seconds,400);assert.equal(progress.checklist_state.mixed,true);
   assert.equal(read.value.roadmap.topics.find(topic=>topic.id===progress.topic_id)?.status,'completed');
   assert.equal(state.attempts.length,index===0?1:0);
  }
 }
 // Treat the prior acknowledgement as lost and race identical retries through
 // both workers. Receipt replay must return the same response without effects.
 const beforeReplay=await sql`SELECT user_id,generation,revision,reset_epoch,payload FROM learner_authority.states ORDER BY user_id`;
 const replays=await Promise.all(users.flatMap(user=>[0,1].map(async worker=>{
  const replay=await call(worker,'/api/lesson-progress',{method:'POST',body:user.lastSave.body,user});assertOk(replay,'cross-worker receipt replay');
  assert.deepEqual(replay.value,user.lastSave.result);receipts.push({kind:'replay',userId:user.id,worker,httpMs:replay.elapsed});return replay.elapsed;
 })));
 assert.deepEqual(await sql`SELECT user_id,generation,revision,reset_epoch,payload FROM learner_authority.states ORDER BY user_id`,beforeReplay);
 const durable=[];
 for(const user of users){
  const [row]=await sql`SELECT generation,revision,reset_epoch,payload FROM learner_authority.states WHERE user_id=${user.id}`;
  const rewards=row.payload.reward_point_ledger.filter(r=>r.reason==='lesson-complete');assert.equal(rewards.length,1);
  assert.equal(row.payload.gamification_events.filter(r=>r.source==='lesson-complete').length,1);
  assert.equal(Number(row.revision),mixed?(user===users[0]?5:4):3);assert.equal(Number(row.reset_epoch),0);
  assert.equal((await sql`SELECT count(*)::int AS count FROM learner_authority.receipts WHERE user_id=${user.id}`)[0].count,mixed?4:3);
  assert.equal((await sql`SELECT count(*)::int AS count FROM learner_authority.journal WHERE user_id=${user.id}`)[0].count,mixed?(user===users[0]?5:4):3);
  const invalidation=(await sql`SELECT revision FROM learner_authority.invalidations WHERE user_id=${user.id}`)[0];assert.equal(invalidation.revision,row.revision);
  durable.push({userId:user.id,generation:row.generation,revision:Number(row.revision),payloadSha256:createHash('sha256').update(JSON.stringify(row.payload)).digest('hex'),state:row.payload});
 }
 const result={learners:count,workers:2,workload:mixed?'mixed':'saves',driverSha256:process.env.MAIS_HTTP_DRIVER_SHA,configuredGeneralConnectionsPerWorker:1,databaseAppConnectionLimit:2,
  correctnessPassed:true,sloMs:2000,http:summary(metrics.map(r=>r.httpMs)),flow:summary(metrics.map(r=>r.flowMs)),replayHttp:summary(replays),crossWorkerReplayExactlyOnce:true,
  rounds:receipts.filter(r=>r.kind==='round'),maxAppConnections:Math.max(...connectionSamples.map(s=>s.connections)),
  source:process.env.MAIS_HTTP_SOURCE,buildId:process.env.MAIS_HTTP_BUILD_ID,sourceManifestSha256:process.env.MAIS_HTTP_MANIFEST,
  interpretation:'Local synthetic HTTP requests through two production-build workers; not production/user evidence.'};
 result.sloPassed=result.http.max<=2000&&result.flow.max<=2000&&result.replayHttp.max<=2000;
 assert.ok(result.maxAppConnections<=2,'the application exceeded its fixed total connection budget');
 await fs.writeFile(`${run}/durable-state.json`,JSON.stringify(durable,null,2));
 await fs.writeFile(`${run}/requests.json`,JSON.stringify(receipts,null,2));
 await fs.writeFile(`${run}/connection-samples.json`,JSON.stringify(connectionSamples));
 await fs.writeFile(`${run}/http-result.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
 if(!result.sloPassed)process.exitCode=2;
}catch(error){
 await fs.writeFile(`${run}/http-result.json`,JSON.stringify({learners:count,correctnessPassed:false,sloPassed:false,error:String(error),completedSaves:metrics.length},null,2));
 await fs.writeFile(`${run}/requests.json`,JSON.stringify(receipts,null,2));throw error;
}finally{stopMonitor=true;await monitor;await sql.end({timeout:3});}
