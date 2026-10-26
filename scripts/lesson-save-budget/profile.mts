import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import postgres from 'postgres';
import {pathToFileURL} from 'node:url';
const run=process.env.MAIS_BUDGET_RUN!;
const url=process.env.POSTGRES_URL!;
const target=new URL(url);
assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'55457');
assert.equal(target.pathname,'/mais_classroom_tests');assert.equal(target.username,'mais_classroom');assert.equal(target.password,'');
const sql=postgres(url,{max:1,prepare:false,idle_timeout:1});
let mod:any;
const spans:any[]=[];
const measureJson=process.env.MAIS_BUDGET_JSON_COUNTERS!=='false';
let active=false,jsonCosts:any={};
const stringify=JSON.stringify,parse=JSON.parse;
const resetJson=()=>jsonCosts={stringifyMs:0,parseMs:0,stringifyCalls:0,parseCalls:0,stringifyBytes:0,parseBytes:0};
(JSON as any).stringify=(...args:any[])=>{if(!active)return (stringify as any)(...args);const t=performance.now();const result=(stringify as any)(...args);jsonCosts.stringifyMs+=performance.now()-t;jsonCosts.stringifyCalls++;if(typeof result==='string')jsonCosts.stringifyBytes+=Buffer.byteLength(result);return result;};
(JSON as any).parse=(...args:any[])=>{if(!active)return (parse as any)(...args);const t=performance.now();const result=(parse as any)(...args);jsonCosts.parseMs+=performance.now()-t;jsonCosts.parseCalls++;if(typeof args[0]==='string')jsonCosts.parseBytes+=Buffer.byteLength(args[0]);return result;};
(globalThis as any).__lessonBudgetSpan=(name:string,start:number,end:number)=>spans.push({name,start,end,ms:end-start});
const stats=async()=>await sql`SELECT queryid::text,query,calls::float8,total_plan_time,total_exec_time,rows::float8,temp_blks_written::float8 FROM pg_stat_statements WHERE dbid=(SELECT oid FROM pg_database WHERE datname=current_database()) AND query NOT LIKE '%pg_stat_statements%'`;
const delta=(before:any[],after:any[])=>after.map(row=>{const prev=before.find(p=>p.queryid===row.queryid);return {...row,calls:row.calls-(prev?.calls??0),total_plan_time:row.total_plan_time-(prev?.total_plan_time??0),total_exec_time:row.total_exec_time-(prev?.total_exec_time??0),rows:row.rows-(prev?.rows??0),temp_blks_written:row.temp_blks_written-(prev?.temp_blks_written??0)};}).filter(r=>r.calls>0);
try{
 const identity=(await sql`SELECT current_database() AS db,current_user AS role,host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('data_directory') AS data`)[0];
 assert.equal(identity.role,'mais_classroom');assert.ok(identity.data.startsWith(run+'/'));
 await sql`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`;
 mod=await import(pathToFileURL(process.env.MAIS_BUDGET_MODULE!).href);mod=mod.default??mod;
 const hooks=mod.__userStoreScopedLessonTestHooks;
 let scoped=0;hooks.observeContext(()=>scoped++);
 const raw=(await sql`SELECT payload FROM app_state WHERE id='primary'`)[0].payload;
 const normalized=hooks.normalizeSeedOnly(raw);
 const fixtureUsers=JSON.parse(readFileSync(run+'/fixture.json','utf8')).userIds;
 const inputs=fixtureUsers.map((id:string)=>raw.lesson_progress.find((p:any)=>p.user_id===id&&p.status==='completed')).map((p:any)=>({userId:p.user_id,slug:p.lesson_slug,topicId:p.topic_id,action:'update',curriculumTrack:'HK',expectedSessionRevision:raw.users.find((u:any)=>u.id===p.user_id).session_revision,durationSeconds:30,checklistState:{a:true}}));
 assert.equal(inputs.length,20);assert.equal(new Set(inputs.map((p:any)=>p.userId)).size,20);
 let captured:any;
 const fake=async(strings:readonly string[],...values:unknown[])=>{captured={strings:[...strings],values};return [{topics_match:true,questions_match:true}];};
 assert.equal(await hooks.compareCandidate(fake,normalized),true);
 const parameters=captured.values.filter((v:any)=>typeof v==='string'&&v.length>1000);
 const micro:any[]=[];
 for(let i=0;i<4;i++){
  const before=await stats(),start=performance.now();
  const bytes=(await sql`/* lesson_budget_text_transport */ SELECT octet_length(${parameters[0]}::text) + octet_length(${parameters[1]}::text) AS bytes`)[0].bytes;
  micro.push({kind:'text-transport',iteration:i,ms:performance.now()-start,bytes,sql:delta(before,await stats())});
  const before2=await stats(),start2=performance.now();
  assert.equal(await hooks.compareCandidate(sql,normalized),true);
  micro.push({kind:'exact-comparison',iteration:i,ms:performance.now()-start2,sql:delta(before2,await stats())});
 }
 const explainStrings=[...captured.strings];explainStrings[0]='EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, FORMAT JSON) '+explainStrings[0];Object.assign(explainStrings,{raw:[...explainStrings]});
 const rawPlan=(await (sql as any)(explainStrings,...captured.values))[0]['QUERY PLAN'][0];
 const keep=['Node Type','Join Type','Strategy','Relation Name','Alias','Actual Rows','Actual Loops','Plan Rows','Plan Width','Hash Batches','Original Hash Batches','Peak Memory Usage','Temp Read Blocks','Temp Written Blocks'];
 const clean=(p:any):any=>Object.fromEntries([...keep.filter(k=>k in p).map(k=>[k,p[k]]),['Plans',(p.Plans??[]).map(clean)]]);
 const plan={planningMs:rawPlan['Planning Time'],executionMs:rawPlan['Execution Time'],root:clean(rawPlan.Plan)};
 await mod.updateLessonProgress(inputs[0]); // setup/warmup outside measured saves
 const saves:any[]=[];
 for(let i=0;i<6;i++){
  const before=await stats();spans.length=0;resetJson();active=measureJson;const count=scoped,start=performance.now();
  const result=await mod.updateLessonProgress({...inputs[i],durationSeconds:31+i});
  const end=performance.now();active=false;assert.ok(result);assert.equal(scoped,count+1);
  saves.push({iteration:i,ms:end-start,jsonCosts:{...jsonCosts},spans:[...spans],sql:delta(before,await stats())});
 }
 spans.length=0;const before=await stats();resetJson();active=measureJson;const start=performance.now(),count=scoped;
 const burst=await Promise.all(inputs.map(async(input:any,index:number)=>{const called=performance.now();const result=await mod.updateLessonProgress({...input,durationSeconds:50+index});assert.ok(result);return {index,called:called-start,completed:performance.now()-start,ms:performance.now()-called};}));
 assert.equal(scoped,count+20);
 active=false;const burstSpans=[...spans],burstSql=delta(before,await stats());
 const final=(await sql`SELECT payload FROM app_state WHERE id='primary'`)[0].payload;
 for(const [i,input] of inputs.entries()){
  const canonical=final.lesson_progress.find((p:any)=>p.user_id===input.userId&&p.topic_id===input.topicId);
  const projection=(await sql`SELECT record FROM projection_lesson_progress WHERE user_id=${input.userId} AND topic_id=${input.topicId}`)[0].record;
  assert.deepEqual(projection,canonical);assert.equal(canonical.duration_seconds,50+i);
 }
 const record={kind:measureJson?'instrumented-direct-save-profile':'direct-save-latency',jsonMeasured:measureJson,canonicalPayloadBytes:Buffer.byteLength(stringify(raw)),http:false,syntheticOnly:true,plan,parameters:parameters.map((p:string)=>({utf8Bytes:Buffer.byteLength(p)})),micro,saves,burst,burstSpans,burstSql,burstJsonCosts:jsonCosts,durableReadback:true,scopedMeasured:26,budgetPassed:Math.max(...burst.map(x=>x.ms))<=2000 && saves.every(x=>x.ms<=100),limits:{serialEnvelopeMs:100,serialTargetMs:90,burstTailMs:2000}};
 writeFileSync(run+'/profile.json',JSON.stringify(record,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({meanSaveMs:saves.reduce((n,x)=>n+x.ms,0)/saves.length,burstTailMs:Math.max(...burst.map(x=>x.ms)),durableReadback:true}));
}finally{active=false;JSON.stringify=stringify;JSON.parse=parse;if(mod){mod.__userStoreScopedLessonTestHooks.observeContext();await mod.__userStoreAiTutorPostgresTestHooks.closePostgresClients();}await sql.end({timeout:3});}
