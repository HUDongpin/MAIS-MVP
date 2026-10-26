import assert from 'node:assert/strict';
import test from 'node:test';
import postgres from 'postgres';
const url=process.env.MAIS_LEARNER_AUTHORITY_TEST_URL;
if(url){const u=new URL(url);assert.equal(u.protocol,'postgres:');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55461');assert.equal(u.username,'mais_authority_test');assert.equal(u.password,'');assert.equal(u.pathname,'/mais_authority_tests');}

test('native learner authority storage guards and immutable publication', {skip:!url,timeout:60000}, async t=>{
 const m=await import('./learnerAuthoritySchema.ts');const schema=m.default??m;
 const sql=postgres(url,{max:3,prepare:false,idle_timeout:1});const observer=postgres(url,{max:1,prepare:false,idle_timeout:1});t.after(async()=>{await observer.end({timeout:3});await sql.end({timeout:3});});
 // Minimal canonical relations for schema-level tests; integrated-root tests
 // must separately validate the complete existing storage contract.
 await sql`CREATE TABLE public.app_state(id text PRIMARY KEY,payload jsonb NOT NULL,revision bigint NOT NULL)`;
 await sql`INSERT INTO public.app_state VALUES('primary','{}',1)`;
 for(const table of ['projection_topics','projection_questions'])await sql.unsafe(`CREATE TABLE public.${table}(id text PRIMARY KEY,record jsonb NOT NULL)`);
 for(const table of ['auth_users','auth_student_profiles','auth_user_settings','auth_password_reset_tokens','practice_attempts','mistake_book_items','adaptive_skill_states','learning_events','learning_event_clears','reward_point_ledger'])await sql.unsafe(`CREATE TABLE public.${table}(id text PRIMARY KEY,record jsonb NOT NULL)`);
 for(const table of schema.learnerAuthorityRetiredProjectionTables)await sql.unsafe(`CREATE TABLE public.${table}(id text PRIMARY KEY,record jsonb NOT NULL)`);
 await t.test('schema, fencing and backfill publish atomically or leave the legacy installation intact',async()=>{
  const injected=new Error('activation failure');
  await assert.rejects(schema.installLearnerAuthoritySchema(sql,async()=>{throw injected;}),e=>e===injected);
  assert.equal(await schema.hasAuthorityInstallation(sql),false);
  await sql`UPDATE public.app_state SET revision=revision+1`;
 });
 await schema.installLearnerAuthoritySchema(sql);
 await t.test('fresh schema admits adapted compatibility writes and fences unadapted writers from installation',async()=>{
  await sql.begin(async tx=>{assert.equal(await schema.lockLearnerAuthority(tx,'shared'),true);await schema.assertLearnerAuthoritySchema(tx);});
  await assert.rejects(sql`UPDATE public.app_state SET revision=revision+1`,/participant-required/);
  await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx`UPDATE public.app_state SET revision=revision+1`;});
 });
 let publication;
 await t.test('publication structure is immutable and workers must bind to all content, not a digest alone',async()=>{
  await sql.begin(async tx=>{
   await schema.lockLearnerAuthority(tx,'exclusive');
   publication=await schema.publishLearnerAuthorityContent(tx,{topics:[{id:'topic'}],questions:[],lessons:[],lesson_blocks:[]});
   assert.equal(await schema.learnerAuthorityPublicationMatches(tx,publication,{topics:[{id:'topic'}],questions:[],lessons:[],lesson_blocks:[]}),true);
   assert.equal(await schema.learnerAuthorityPublicationMatches(tx,publication,{topics:[{id:'other'}],questions:[],lessons:[],lesson_blocks:[]}),false);
   assert.equal(await schema.learnerAuthorityPublicationMatches(tx,publication,{lesson_blocks:[],lessons:[],questions:[],topics:[{id:'topic'}]}),true,'JSON object key order is not semantic content');
   assert.equal(await schema.learnerAuthorityPublicationMatches(tx,publication,{topics:[{id:'topic',missing:null}],questions:[],lessons:[],lesson_blocks:[]}),false);
  });
  for(const command of ["UPDATE learner_authority.publications SET content='{}'",'DELETE FROM learner_authority.publications','TRUNCATE learner_authority.publications CASCADE']){
   await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx.unsafe(command);}),/immutable/);
  }
 });
 await t.test('every content write invalidates attestation and increments the content epoch',async()=>{
  for(const table of ['projection_topics','projection_questions']){
   for(const command of [`INSERT INTO public.${table} VALUES('x','{}')`,`UPDATE public.${table} SET record='{}'`,`DELETE FROM public.${table}`,`TRUNCATE public.${table}`]){
    await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx`SELECT set_config('mais.learner_authority_sealing','true',true)`;await tx`UPDATE learner_authority.control SET attested_epoch=content_epoch,publication_id=${publication}`;});
    const before=(await sql`SELECT content_epoch FROM learner_authority.control`)[0];
    await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx.unsafe(command);});
    const after=(await sql`SELECT content_epoch,attested_epoch FROM learner_authority.control`)[0];
    assert.equal(Number(after.content_epoch),Number(before.content_epoch)+1);assert.equal(after.attested_epoch,null);
   }
  }
 });
 await t.test('active authority fences old snapshot writers before they can overwrite acknowledged state',async()=>{
  await sql.begin(async tx=>{
   await schema.lockLearnerAuthority(tx,'exclusive');
   await tx`INSERT INTO learner_authority.accounts(user_id,generation,mode,account_identity) VALUES('learner','00000000-0000-4000-8000-000000000001','authoritative','{}')`;
  });
  const before=await sql`SELECT * FROM public.app_state`;
  await assert.rejects(sql`UPDATE public.app_state SET payload='{"stale":true}',revision=revision+1`,/participant-required/);
  assert.deepEqual(await sql`SELECT * FROM public.app_state`,before);
  await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx`UPDATE public.app_state SET revision=revision+1`;});
 });
 await t.test('disabled or missing guards fail closed rather than treating the database as legacy',async()=>{
  const rollback=new Error('rollback test');
  await assert.rejects(sql.begin(async tx=>{
   await schema.lockLearnerAuthority(tx,'exclusive');
   await tx`ALTER TABLE public.projection_topics DISABLE TRIGGER learner_authority_source_guard`;
   await assert.rejects(schema.assertLearnerAuthoritySchema(tx),/authority-schema/);
   throw rollback;
  }),e=>e===rollback);
 });
 await t.test('missing control or installation anchor cannot be mistaken for an uninstalled legacy database',async()=>{
  for(const change of ['DROP TABLE learner_authority.control','ALTER TABLE public.app_state DROP COLUMN learner_authority_installation']){
   const rollback=new Error('missing authority rollback');
   await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx.unsafe(change);await assert.rejects(schema.lockLearnerAuthority(tx,'shared'),/authority-schema/);throw rollback;}),e=>e===rollback);
  }
 });
 await t.test('two shared callers reject source writes instead of upgrading locks or waiting for each other',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});let count=0;
  const jobs=[0,1].map(()=>assert.rejects(sql.begin(async tx=>{
   await schema.lockLearnerAuthority(tx,'shared');await schema.assertLearnerAuthoritySchema(tx);
   if(++count===2)release();await gate;
   await tx`UPDATE public.projection_topics SET record='{}'`;
  }),/exclusive-admission-required/));
  await Promise.all(jobs);
 });
 await t.test('a legacy relation lock cannot make the guard wait on maintenance and deadlock an admitted reader',async()=>{
  let held,proceed,admitted;const heldSignal=new Promise(r=>{held=r;}),proceedSignal=new Promise(r=>{proceed=r;}),admittedSignal=new Promise(r=>{admitted=r;});
  const legacy=assert.rejects(sql.begin(async tx=>{await tx`LOCK TABLE public.projection_topics IN ACCESS EXCLUSIVE MODE`;held();await proceedSignal;await tx`TRUNCATE public.projection_topics`;}),/participant-required/);
  await heldSignal;
  const reader=sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'shared');const [{pid}]=await tx`SELECT pg_backend_pid() AS pid`;admitted(pid);await schema.assertLearnerAuthoritySchema(tx);});
  const pid=await admittedSignal;let waiting=false;
  try{for(let attempt=0;attempt<100;attempt++){
   const [row]=await observer`SELECT wait_event_type FROM pg_stat_activity WHERE pid=${pid}`;
   if(row?.wait_event_type==='Lock'){waiting=true;break;}await new Promise(r=>setTimeout(r,10));
  }assert.equal(waiting,true);}finally{proceed();await legacy;await reader;}
 });
 await t.test('a participant label cannot substitute for actual advisory lock ownership',async()=>{
  await assert.rejects(sql.begin(async tx=>{
   await tx`SELECT set_config('mais.learner_authority_participant',${schema.learnerAuthorityContract},true),set_config('mais.learner_authority_mode','exclusive',true)`;
   await tx`UPDATE public.app_state SET revision=revision+1`;
  }),/storage-admission-required/);
 });
 await t.test('transaction admission cannot upgrade shared to exclusive after taking learner work',async()=>{
  let release;const gate=new Promise(r=>{release=r;});let count=0;
  await Promise.all([0,1].map(()=>assert.rejects(sql.begin(async tx=>{
   await schema.lockLearnerAuthority(tx,'shared');if(++count===2)release();await gate;
   await schema.lockLearnerAuthority(tx,'exclusive');
  }),/upgrade-forbidden/)));
 });
 await t.test('a stale exclusive label is replaced by actual admission and cannot bypass the row fence',async()=>{
  await sql.begin(async tx=>{
   await tx`SELECT set_config('mais.learner_authority_mode','exclusive',true)`;
   await schema.lockLearnerAuthority(tx,'shared');
   assert.equal((await tx`SELECT current_setting('mais.learner_authority_mode') AS mode`)[0].mode,'shared');
  });
 });
 await t.test('source invalidation cannot be suppressed, rewritten or restored to an attested epoch by triggers',async()=>{
  for(const body of ['RETURN NULL;','NEW.content_epoch := OLD.content_epoch; RETURN NEW;']){
   await sql.unsafe(`CREATE FUNCTION public.suppress_invalidation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${body} END $$`);
   await sql`CREATE TRIGGER suppress_invalidation BEFORE UPDATE ON learner_authority.control FOR EACH ROW EXECUTE FUNCTION public.suppress_invalidation()`;
   try{await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx`UPDATE public.projection_topics SET record='{}'`;}),/authority-source-invalidation-failed/);}finally{await sql`DROP TRIGGER suppress_invalidation ON learner_authority.control`;await sql`DROP FUNCTION public.suppress_invalidation()`;}
  }
  await sql`CREATE FUNCTION public.restore_attestation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE learner_authority.control SET attested_epoch=content_epoch; RETURN NULL; END $$`;
  await sql`CREATE TRIGGER restore_attestation AFTER UPDATE ON public.projection_topics FOR EACH STATEMENT EXECUTE FUNCTION public.restore_attestation()`;
  try{await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx`UPDATE public.projection_topics SET record='{}'`;}),/authority-source-sealing-required/);}finally{await sql`DROP TRIGGER restore_attestation ON public.projection_topics`;await sql`DROP FUNCTION public.restore_attestation()`;}
 });
 await t.test('replica trigger mode cannot bypass schema admission or immutable-source writes',async()=>{
  await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'shared');await tx`SET LOCAL session_replication_role=replica`;await schema.assertLearnerAuthoritySchema(tx);}),/replication-role-required/);
  await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx`SET LOCAL session_replication_role=replica`;await tx`UPDATE learner_authority.publications SET content='{}'`;}),/replication-role-required/);
 });
 await t.test('keys, identity collations, revision bounds and foreign keys are part of the live contract',async()=>{
  for(const change of [
   'ALTER TABLE learner_authority.states DROP CONSTRAINT states_pkey',
   'ALTER TABLE learner_authority.receipts DROP CONSTRAINT receipts_pkey',
   'ALTER TABLE learner_authority.states DROP CONSTRAINT states_revision_check',
   'ALTER TABLE learner_authority.states DROP CONSTRAINT states_user_id_generation_fkey',
   'ALTER TABLE learner_authority.claims ALTER COLUMN owner TYPE text COLLATE "default"',
   'ALTER FUNCTION learner_authority.guard_write() RESET search_path'
  ]){
   const rollback=new Error('schema drift rollback');
   await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx.unsafe(change);await assert.rejects(schema.assertLearnerAuthoritySchema(tx),/authority-schema/);throw rollback;}),e=>e===rollback);
  }
 });
 console.log('authority-initial-constraints '+JSON.stringify(await sql`SELECT r.relname,c.conname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='learner_authority' ORDER BY r.relname,c.conname`));
 await t.test('shared authority admission coexists while maintenance waits for both transactions',async()=>{
  const entered=[],releases=[];
  const work=[0,1].map(i=>new Promise(resolve=>{entered[i]=resolve;}));
  const jobs=[0,1].map(i=>sql.begin(async tx=>{
   await schema.lockLearnerAuthority(tx,'shared');
   entered[i]();await new Promise(resolve=>{releases[i]=resolve;});
  }));
  await Promise.all(work);
  let maintained=false,started;const startedSignal=new Promise(resolve=>{started=resolve;});
  const maintenance=sql.begin(async tx=>{const [{pid}]=await tx`SELECT pg_backend_pid() AS pid`;started(pid);await schema.lockLearnerAuthority(tx,'exclusive');maintained=true;});
  const pid=await startedSignal;let waiting=false;
  try{
   for(let attempt=0;attempt<100;attempt++){
    const rows=await observer`SELECT wait_event FROM pg_stat_activity WHERE pid=${pid}`;
    if(rows[0]?.wait_event==='advisory'){waiting=true;break;}
    await new Promise(resolve=>setTimeout(resolve,10));
   }
   assert.equal(waiting,true,'the real maintenance backend must wait for advisory admission');assert.equal(maintained,false);
  }finally{releases.forEach(release=>release());await Promise.all(jobs);await maintenance;}
  assert.equal(maintained,true);
 });
});
