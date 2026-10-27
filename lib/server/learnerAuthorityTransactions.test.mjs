import assert from 'node:assert/strict';
import test from 'node:test';
import postgres from 'postgres';
const url=process.env.MAIS_LEARNER_AUTHORITY_TEST_URL;
if(url){const u=new URL(url);assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55461');assert.equal(u.pathname,'/mais_authority_tests');}
test('independent learner authority transactions',{skip:!url,timeout:60000},async t=>{
 const m=await import('./learnerAuthority.ts');const store=m.default??m;
 const sm=await import('./learnerAuthoritySchema.ts');const schema=sm.default??sm;
 const vm=await import('./learnerAuthorityState.ts');const state=vm.default??vm;
 const sql=postgres(url,{max:3,prepare:false,idle_timeout:1});t.after(()=>sql.end({timeout:3}));
 await sql`CREATE TABLE public.app_state(id text PRIMARY KEY,payload jsonb NOT NULL,revision bigint NOT NULL)`;
 await sql`INSERT INTO public.app_state VALUES('primary','{}',1)`;
 for(const name of ['projection_topics','projection_questions','auth_users','auth_student_profiles','auth_user_settings','auth_password_reset_tokens','practice_attempts','mistake_book_items','adaptive_skill_states','learning_events','learning_event_clears','reward_point_ledger'])await sql.unsafe(`CREATE TABLE public.${name}(id text PRIMARY KEY,record jsonb NOT NULL)`);
 for(const name of schema.learnerAuthorityRetiredProjectionTables)await sql.unsafe(`CREATE TABLE public.${name}(id text PRIMARY KEY,record jsonb NOT NULL)`);
 await schema.installLearnerAuthoritySchema(sql);
 const content={topics:[],questions:[],lessons:[],lesson_blocks:[]};
 const db={...Object.fromEntries(Object.keys(state.authorityComponents).map(key=>[key,[]])),...content,users:['a','b'].map(id=>({id,role:'student',disabled_at:null,session_revision:1,created_at:'2026-10-19T00:00:00Z'}))};
 db.adaptive_skill_state=[{user_id:'a',skill_id:'duplicate',value:1},{user_id:'a',skill_id:'duplicate',value:2}];
 db.reward_point_ledger=[{id:'foreign-id',student_id:'inactive',source_key:'foreign-source',amount:7},
  ...['a','b'].map(student_id=>({id:'legacy-shared-id',student_id,source_key:'legacy-shared-source',amount:1}))];
 const refresh=async database=>sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await store.refreshLearnerAuthority(tx,database,content,1,{activate:true});});
 await refresh(db);
 const currentImage=async tx=>store.overlayLearnerAuthorities(tx,{...db,...(await tx`SELECT shared_payload FROM learner_authority.control WHERE id='primary'`)[0].shared_payload});
 const identity=async userId=>sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'shared');return store.readLearnerAuthorityIdentity(tx,userId);});
 const command=async(userId,id,change,extra={})=>{
  const current=await identity(userId);
  return store.runLearnerAuthorityTransaction(sql,{userId,sessionRevision:1,generation:current.generation,resetEpoch:current.resetEpoch,publicationId:current.publicationId,definitionEpoch:current.definitionEpoch,operationId:id,expiresAt:Date.now()+5000,request:{id},resources:[],content,...extra},async context=>{await change(context);return {saved:id};});
 };
 await t.test('two actual transactions enter separate learner callbacks simultaneously and preserve ordered duplicates',async()=>{
  let count=0,release;const gate=new Promise(r=>release=r);
  await Promise.all(['a','b'].map(id=>command(id,'parallel',async context=>{if(++count===2)release();await gate;context.state.lesson_progress.push({user_id:id,status:'completed'});} )));
  assert.equal(count,2);
  const image=await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'shared');return store.overlayLearnerAuthorities(tx,db);});
  assert.equal(image.lesson_progress.length,2);assert.deepEqual(image.adaptive_skill_state,db.adaptive_skill_state);
 });
 await t.test('same operation replays committed response without callback, but changed input conflicts',async()=>{
  let called=0;const current=await identity('a');const options={userId:'a',sessionRevision:1,generation:current.generation,resetEpoch:current.resetEpoch,publicationId:current.publicationId,definitionEpoch:current.definitionEpoch,operationId:'receipt',expiresAt:Date.now()+5000,request:{x:1},resources:[],content};
  const work=()=>store.runLearnerAuthorityTransaction(sql,options,context=>{called++;context.state.lesson_progress.push({user_id:'a',slug:'receipt'});return {value:42};});
  assert.deepEqual(await work(),{value:42});assert.deepEqual(await work(),{value:42});assert.equal(called,1);
  await assert.rejects(store.runLearnerAuthorityTransaction(sql,{...options,request:{x:2}},()=>{throw new Error('must not run');}),/operation-conflict/);
 });
 await t.test('foreign inactive rewards retain global claims and concurrent source collisions cannot both commit',async()=>{
  await command('a','foreign-check',context=>{assert.equal(context.claims.some(c=>c.source_key==='foreign-source'),true);},{resources:['source:foreign-source']});
  const writes=['a','b'].map(id=>command(id,'claim-'+id,context=>{
   context.state.reward_point_ledger.unshift({student_id:id,id:'id-'+id,source_key:'shared-source',amount:1});
  },{resources:['source:shared-source','id:reward_point_ledger:id-'+id]}));
  const result=await Promise.allSettled(writes);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.match(result.find(r=>r.status==='rejected').reason.message,/global-claim-conflict/);
 });
 await t.test('deleting one duplicate claimant cannot make a new owner collide with a surviving historical claim',async()=>{
  await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');const image=await currentImage(tx);image.users.push({id:'c',created_at:'2026-10-19T00:00:00Z',role:'student',disabled_at:null,session_revision:1});await store.refreshLearnerAuthority(tx,image,content,1,{activate:true});});
  await assert.rejects(sql.begin(async tx=>{
   await schema.lockLearnerAuthority(tx,'exclusive');const image=await currentImage(tx);image.users=image.users.filter(u=>u.id!=='a');
   for(const [component,owner]of Object.entries(state.authorityComponents))image[component]=image[component].filter(row=>row[owner]!=='a');
   image.reward_point_ledger.push({id:'replacement-id',student_id:'c',source_key:'legacy-shared-source',amount:5});
   await store.refreshLearnerAuthority(tx,image,content,1,{activate:true});
  }),/authority-global-claim-conflict/);
  assert.equal((await sql`SELECT count(*)::int AS count FROM learner_authority.claims WHERE source_key='legacy-shared-source'`)[0].count,2);
 });
 await t.test('missing authority and unknown dynamic resources fail closed before any acknowledged mutation',async()=>{
  await assert.rejects(command('a','dynamic',context=>{context.state.reward_point_ledger.unshift({student_id:'a',id:'undeclared',amount:3});}),/undeclared-authority-resource/);
  const rollback=new Error('rollback');await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await tx`DELETE FROM learner_authority.states WHERE user_id='a'`;await assert.rejects(store.overlayLearnerAuthorities(tx,db),/missing-authority/);throw rollback;}),e=>e===rollback);
 });
 await t.test('clear epochs, compatibility fallback, revocation and account reuse keep stale commands out',async()=>{
  const old=await identity('a');let current=await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');return currentImage(tx);});
  current.lesson_progress=current.lesson_progress.filter(r=>r.user_id!=='a');await refresh(current);
  await assert.rejects(command('a','stale-reset',()=>{}, {generation:old.generation,resetEpoch:old.resetEpoch}),/authority-intent-stale/);
  const cleared=await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'shared');return currentImage(tx);});assert.equal(cleared.lesson_progress.some(r=>r.user_id==='a'),false);
  current=cleared;current.users[0].disabled_at='2026-10-19T01:00:00Z';await refresh(current);
  await assert.rejects(command('a','revoked',()=>{}),/authority-actor-rejected/);
  current.users=current.users.filter(u=>u.id!=='a');for(const [component,owner]of Object.entries(state.authorityComponents))current[component]=current[component].filter(r=>r[owner]!=='a');await refresh(current);
  current.users.push({id:'a',role:'student',disabled_at:null,session_revision:1,created_at:'2026-10-19T02:00:00Z'});await refresh(current);
  assert.notEqual((await identity('a')).generation,old.generation);
  await assert.rejects(command('a','old-generation',()=>{},{generation:old.generation}),/authority-intent-stale/);
  assert.equal((await sql`SELECT * FROM learner_authority.receipts WHERE user_id='a'`).length,0);
 });
 await t.test('late trigger drift rolls back learner state, receipt, journal and invalidation together',async()=>{
  const before=await sql`SELECT * FROM learner_authority.states WHERE user_id='b'`;
  await sql`CREATE FUNCTION public.corrupt_authority() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE learner_authority.states SET payload=jsonb_set(payload,'{lesson_progress}','[]') WHERE user_id=NEW.user_id; RETURN NEW; END $$`;
  await sql`CREATE TRIGGER drift AFTER INSERT ON learner_authority.journal FOR EACH ROW EXECUTE FUNCTION public.corrupt_authority()`;
  try{await assert.rejects(command('b','drift',context=>{context.state.lesson_progress.push({user_id:'b',slug:'must-rollback'});}),/authority-final-state/);}finally{await sql`DROP TRIGGER drift ON learner_authority.journal`;await sql`DROP FUNCTION public.corrupt_authority()`;}
  assert.deepEqual(await sql`SELECT * FROM learner_authority.states WHERE user_id='b'`,before);
  assert.equal((await sql`SELECT * FROM learner_authority.receipts WHERE operation_id='drift'`).length,0);
 });
 await t.test('compatibility verifies versions, journal, invalidation and erasure absence, including suppressed writes',async()=>{
  await command('a','erase-receipt',context=>{context.state.lesson_progress.push({user_id:'a',slug:'erase-proof'});});
  const cases=[
   {table:'states',event:'UPDATE',body:'NEW.revision := OLD.revision; RETURN NEW;',erase:false},
   {table:'journal',event:'INSERT',body:'RETURN NULL;',erase:false},
   {table:'invalidations',event:'UPDATE',body:'NEW.revision := OLD.revision; RETURN NEW;',erase:false},
   {table:'receipts',event:'DELETE',body:'RETURN NULL;',erase:true}
  ];
  for(const item of cases){
   const before=await sql`SELECT * FROM learner_authority.states ORDER BY user_id`;
   await sql.unsafe(`CREATE FUNCTION public.suppress_effect() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${item.body} END $$`);
   await sql.unsafe(`CREATE TRIGGER suppress_effect BEFORE ${item.event} ON learner_authority.${item.table} FOR EACH ROW EXECUTE FUNCTION public.suppress_effect()`);
   try{await assert.rejects(sql.begin(async tx=>{
    await schema.lockLearnerAuthority(tx,'exclusive');const image=await currentImage(tx);
    if(item.erase){image.users=image.users.filter(u=>u.id!=='a');for(const [component,owner]of Object.entries(state.authorityComponents))image[component]=image[component].filter(r=>r[owner]!=='a');}
    else image.lesson_progress.push({user_id:'a',slug:'suppressed-effects'});
    await store.refreshLearnerAuthority(tx,image,content,1,{activate:true});
   }),/authority-final-effects/);}finally{await sql.unsafe(`DROP TRIGGER suppress_effect ON learner_authority.${item.table}`);await sql`DROP FUNCTION public.suppress_effect()`;}
   assert.deepEqual(await sql`SELECT * FROM learner_authority.states ORDER BY user_id`,before);
  }
 });
 await t.test('shared writes cannot alter another learner or previous operation history through late triggers',async()=>{
  await command('b','history',()=>{});
  for(const body of [
   "UPDATE learner_authority.states SET payload=jsonb_set(payload,'{lesson_progress}','[]') WHERE user_id='a';",
   "UPDATE learner_authority.receipts SET result='{}' WHERE user_id='b' AND operation_id='history';",
   "DELETE FROM learner_authority.journal WHERE user_id='b' AND operation_id='history';"
  ]){
   await sql.unsafe(`CREATE FUNCTION public.forbidden_effect() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${body} RETURN NEW; END $$`);
   await sql`CREATE TRIGGER forbidden_effect AFTER INSERT ON learner_authority.journal FOR EACH ROW EXECUTE FUNCTION public.forbidden_effect()`;
   try{await assert.rejects(command('b','forbidden',context=>{context.state.lesson_progress.push({user_id:'b',slug:'forbidden'});}),/authority-(foreign|history)-write/);}finally{await sql`DROP TRIGGER forbidden_effect ON learner_authority.journal`;await sql`DROP FUNCTION public.forbidden_effect()`;}
  }
 });
 await t.test('expired asynchronous work and reset-capable callbacks roll back; explicit no-op resets retire old intents',async()=>{
  const before=await sql`SELECT * FROM learner_authority.states WHERE user_id='b'`;
  let entered=false;const expiresAt=Date.now()+250;
  await assert.rejects(command('b','expired-callback',async context=>{entered=true;await new Promise(r=>setTimeout(r,Math.max(1,expiresAt-Date.now()+10)));context.state.lesson_progress.push({user_id:'b',slug:'expired'});},{expiresAt}),/authority-intent-expired/);
  assert.equal(entered,true,'expiry must be observed after entering the asynchronous callback');
  await assert.rejects(command('b','reset-callback',context=>{context.state.lesson_progress=[];}),/authority-reset-requires-maintenance/);
  await assert.rejects(command('b','same-length-reset',context=>{context.state.lesson_progress=context.state.lesson_progress.map(row=>({...row,topic_id:'replacement',lesson_slug:'replacement',slug:'replacement'}));}),/authority-reset-requires-maintenance/);
  assert.deepEqual(await sql`SELECT * FROM learner_authority.states WHERE user_id='b'`,before);
  const old=await identity('b');
  await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');const image=await currentImage(tx);await store.refreshLearnerAuthority(tx,image,content,1,{activate:true,resetSubjects:['b']});});
  assert.equal((await identity('b')).resetEpoch,old.resetEpoch+1);
 });
 await t.test('reused identities cannot adopt old cold records and orphan claims survive an exact sentinel account ID',async()=>{
  await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');const image=await currentImage(tx);image.users.find(u=>u.id==='b').created_at='2026-10-19T03:00:00Z';await store.refreshLearnerAuthority(tx,image,content,1,{activate:true});}),/generation-reuse-requires-erasure/);
  await sql.begin(async tx=>{
   await schema.lockLearnerAuthority(tx,'exclusive');const image=await currentImage(tx);
   image.users.push({id:'\u0001orphan',created_at:'2026-10-19T00:00:00Z',role:'student',disabled_at:null,session_revision:1});
   image.reward_point_ledger.push({id:'orphan-history',source_key:'orphan-source',amount:2});
   await store.refreshLearnerAuthority(tx,image,content,1,{activate:true});
  });
  await command('\u0001orphan','preserve-orphan',context=>{context.state.lesson_progress.push({user_id:'\u0001orphan',slug:'own'});});
  const [claim]=await sql`SELECT generation,record FROM learner_authority.claims WHERE id_key='orphan-history'`;
  assert.equal(claim.generation,'00000000-0000-4000-8000-000000000000');assert.equal(claim.record.source_key,'orphan-source');
 });
 await t.test('exclusive compatibility commands retain the narrow history fence until verified synchronization',async()=>{
  await sql`CREATE FUNCTION public.compatibility_history_drift() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE learner_authority.receipts SET result='{}' WHERE user_id=NEW.user_id AND operation_id='history'; RETURN NEW; END $$`;
  await sql`CREATE TRIGGER compatibility_history_drift AFTER INSERT ON learner_authority.journal FOR EACH ROW EXECUTE FUNCTION public.compatibility_history_drift()`;
  try{
   const current=await identity('b');
   await assert.rejects(store.runLearnerAuthorityTransaction(sql,{userId:'b',sessionRevision:1,generation:current.generation,resetEpoch:current.resetEpoch,publicationId:current.publicationId,definitionEpoch:current.definitionEpoch,operationId:'compatibility-drift',expiresAt:Date.now()+5000,request:{},resources:[],content},()=>({saved:true}),{prepare:async()=>{},write:async()=>{}}),/authority-history-write-forbidden/);
  }finally{await sql`DROP TRIGGER compatibility_history_drift ON learner_authority.journal`;await sql`DROP FUNCTION public.compatibility_history_drift()`;}
 });
 await t.test('a later BEFORE trigger cannot retarget an extra claim outside the final-tuple guard',async()=>{
  await sql`CREATE FUNCTION public.retarget_claim() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id_key='injected-claim' THEN NEW.owner:='a';SELECT generation INTO NEW.generation FROM learner_authority.accounts WHERE user_id='a';END IF;RETURN NEW;END $$`;
  await sql`CREATE TRIGGER zz_retarget BEFORE INSERT ON learner_authority.claims FOR EACH ROW EXECUTE FUNCTION public.retarget_claim()`;
  await sql`CREATE FUNCTION public.add_extra_claim() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO learner_authority.claims(component,owner,generation,slot,id_key,record) VALUES('reward_point_ledger',NEW.user_id,NEW.generation,999,'injected-claim','{}');RETURN NEW;END $$`;
  await sql`CREATE TRIGGER add_extra_claim AFTER INSERT ON learner_authority.journal FOR EACH ROW EXECUTE FUNCTION public.add_extra_claim()`;
  try{await assert.rejects(command('b','retarget',()=>{}),/authority-foreign-write/);}finally{
   await sql`DROP TRIGGER add_extra_claim ON learner_authority.journal`;await sql`DROP TRIGGER zz_retarget ON learner_authority.claims`;await sql`DROP FUNCTION public.add_extra_claim()`;await sql`DROP FUNCTION public.retarget_claim()`;
  }
  assert.equal((await sql`SELECT count(*)::int AS count FROM learner_authority.claims WHERE id_key='injected-claim'`)[0].count,0);
 });
 await t.test('publication rewrite and incompatible worker source both roll back before sealing',async()=>{
  const before=(await sql`SELECT publication_id FROM learner_authority.control`)[0].publication_id;
  await sql`CREATE FUNCTION public.rewrite_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.content:=jsonb_set(NEW.content,'{canonical,lessons}','[]');RETURN NEW;END $$`;
  await sql`CREATE TRIGGER rewrite_publication BEFORE INSERT ON learner_authority.publications FOR EACH ROW EXECUTE FUNCTION public.rewrite_publication()`;
  try{await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');const image=await currentImage(tx);image.lessons=[{slug:'canonical-new'}];await store.refreshLearnerAuthority(tx,image,content,1,{activate:true});}),/authority-publication-write-failed/);}finally{await sql`DROP TRIGGER rewrite_publication ON learner_authority.publications`;await sql`DROP FUNCTION public.rewrite_publication()`;}
  await assert.rejects(sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');await store.refreshLearnerAuthority(tx,await currentImage(tx),{...content,staleWorker:true},1,{activate:true});}),/source-version-mismatch/);
  assert.equal((await sql`SELECT publication_id FROM learner_authority.control`)[0].publication_id,before);
 });
 await t.test('changed definitions retire old intents and receipts cannot adopt a new version vector',async()=>{
  const old=await identity('b');let called=0;
  const options={userId:'b',sessionRevision:1,generation:old.generation,resetEpoch:old.resetEpoch,publicationId:old.publicationId,definitionEpoch:old.definitionEpoch,operationId:'definition-receipt',expiresAt:Date.now()+5000,request:{x:1},resources:[],content};
  await store.runLearnerAuthorityTransaction(sql,options,()=>{called++;return {ok:true};});
  await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');const image=await currentImage(tx);image.teacher_classes=[{id:'new-class',teacher_id:'teacher'}];await store.refreshLearnerAuthority(tx,image,content,1,{activate:true});});
  const next=await identity('b');assert.equal(next.definitionEpoch,old.definitionEpoch+1);
  await assert.rejects(store.runLearnerAuthorityTransaction(sql,options,()=>{called++;}),/authority-definition-stale/);
  await assert.rejects(store.runLearnerAuthorityTransaction(sql,{...options,definitionEpoch:next.definitionEpoch},()=>{called++;}),/authority-operation-conflict/);
  await sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'exclusive');const image=await currentImage(tx);image.lessons=[{slug:'new-published-lesson',topic_id:'new-topic'}];await store.refreshLearnerAuthority(tx,image,content,1,{activate:true});});
  await assert.rejects(store.runLearnerAuthorityTransaction(sql,{...options,definitionEpoch:next.definitionEpoch,operationId:'old-publication'},()=>{called++;}),/authority-definition-stale/);
  assert.equal(called,1);
 });
 await t.test('a command that expires in the real account-lock queue never enters its callback or writes a receipt',async()=>{
  const before=await sql`SELECT * FROM learner_authority.states WHERE user_id='b'`;
  let entered,release;const held=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
  const blocker=sql.begin(async tx=>{await schema.lockLearnerAuthority(tx,'shared');await tx`SELECT pg_advisory_xact_lock(hashtextextended('mais:account-data:b',0))`;entered();await gate;});
  await held;let callback=false;const expiresAt=Date.now()+200;
  const pending=command('b','expired-in-queue',()=>{callback=true;},{expiresAt}).then(()=>null,error=>error);
  try{
   let waiting=false;
   for(let attempt=0;attempt<100;attempt++){
    const [row]=await sql`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory' AND pid<>pg_backend_pid()) AS waiting`;
    if(row.waiting){waiting=true;break;}await new Promise(resolve=>setTimeout(resolve,5));
   }
   assert.equal(waiting,true,'observe the actual backend waiting for the held account lock');
   await new Promise(resolve=>setTimeout(resolve,Math.max(1,expiresAt-Date.now()+10)));
  }finally{release();await blocker;}
  assert.match((await pending)?.message??'',/authority-intent-expired/);assert.equal(callback,false);
  assert.deepEqual(await sql`SELECT * FROM learner_authority.states WHERE user_id='b'`,before);
  assert.equal((await sql`SELECT count(*)::int AS count FROM learner_authority.receipts WHERE operation_id='expired-in-queue'`)[0].count,0);
 });
});
