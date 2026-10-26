import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type postgres from 'postgres';
import { assertLearnerAuthoritySchema, lockLearnerAuthority, learnerAuthorityPublicationMatches, publishLearnerAuthorityContent, type AuthoritySql } from './learnerAuthoritySchema';
import { authorityComponents, authorityRevision, cloneAuthorityJson, exactAuthorityKey, extractLearnerAuthorityState, learnerAuthorityClaims, LearnerAuthorityError, overlayLearnerAuthorityState, sortedAuthorityKeys, validateLearnerAuthorityState, type AuthorityDatabase, type AuthorityRecord, type LearnerAuthorityClaim, type LearnerAuthorityState } from './learnerAuthorityState';

type Account = {user_id:string;generation:string;mode:string;account_identity:AuthorityRecord};
type StateRow = Account & {revision:unknown;reset_epoch:unknown;payload:unknown};
const nilGeneration='00000000-0000-4000-8000-000000000000';
const activeModes=new Set(['authoritative','compatibility']);
const contentKeys=['topics','questions','lessons','lesson_blocks'];
const permissionKeys=['teacher_classes','class_enrollments','assignments','school_memberships','teacher_class_collaborators'];
const json=(value:unknown)=>JSON.stringify(value);
const fail=(code:string,status=503):never=>{throw new LearnerAuthorityError(code,status);};

function users(database:AuthorityDatabase):AuthorityRecord[]{
  if(!Array.isArray(database.users))return fail('authority-users-missing');
  return database.users as AuthorityRecord[];
}
function identity(user:AuthorityRecord):AuthorityRecord{
  exactAuthorityKey(user.id);
  if(typeof user.created_at!=='string'||!Number.isFinite(Date.parse(user.created_at)))return fail('authority-account-identity-invalid');
  return {id:user.id,created_at:user.created_at};
}
function validateRow(row:StateRow):LearnerAuthorityState{
  if(!activeModes.has(row.mode))return fail('authority-mode-unavailable');
  if(row.payload===null||row.payload===undefined)return fail('missing-authority');
  authorityRevision(row.revision);authorityRevision(row.reset_epoch);
  validateLearnerAuthorityState(row.payload,row.user_id);return row.payload;
}
async function rows(sql:AuthoritySql):Promise<StateRow[]>{
  return sql<StateRow[]>`SELECT account.*,state.revision,state.reset_epoch,state.payload FROM learner_authority.accounts AS account
    LEFT JOIN learner_authority.states AS state USING(user_id,generation) WHERE account.mode IN ('authoritative','compatibility','frozen')
      OR state.payload IS NOT NULL OR (account.mode='legacy' AND (
        EXISTS(SELECT 1 FROM learner_authority.receipts receipt WHERE receipt.user_id=account.user_id AND receipt.generation=account.generation)
        OR EXISTS(SELECT 1 FROM learner_authority.journal journal WHERE journal.user_id=account.user_id AND journal.generation=account.generation)))
    ORDER BY account.user_id COLLATE "C"`;
}

/** Called only after legacy normalization; authoritative empty arrays stay empty. */
export async function overlayLearnerAuthorities<T extends AuthorityDatabase>(sql:AuthoritySql,database:T):Promise<T>{
  await assertLearnerAuthoritySchema(sql);
  const [control]=await sql<Array<{publication_id:string|null}>>`SELECT publication_id FROM learner_authority.control WHERE id='primary'`;
  if(control.publication_id){
    const accounts=await sql<Account[]>`SELECT * FROM learner_authority.accounts`;
    for(const user of users(database)){
      const account=accounts.find(account=>account.user_id===user.id);
      if(!account||account.mode==='erased'||!isDeepStrictEqual(account.account_identity,identity(user)))return fail('authority-account-identity-mismatch');
    }
  }
  let result=database;
  for(const row of await rows(sql)){
    const user=users(database).find(user=>user.id===row.user_id);
    if(!user||!isDeepStrictEqual(identity(user),row.account_identity))return fail('authority-account-identity-mismatch');
    result=overlayLearnerAuthorityState(result,row.user_id,validateRow(row));
  }
  return result;
}

async function replaceClaims(sql:AuthoritySql,userId:string,generation:string,state:LearnerAuthorityState){
  const claims=learnerAuthorityClaims(state,userId,generation);
  await sql`DELETE FROM learner_authority.claims WHERE owner=${userId} AND generation=${generation}::uuid`;
  if(claims.length)await sql`INSERT INTO learner_authority.claims(component,owner,generation,slot,id_key,source_key,record)
    SELECT component,owner,generation,slot,id_key,source_key,record FROM jsonb_to_recordset(${json(claims)}::text::jsonb)
      AS value(component text,owner text,generation uuid,slot integer,id_key text,source_key text,record jsonb)`;
  return claims;
}
function resets(previous:LearnerAuthorityState,next:LearnerAuthorityState):boolean{
  if(!isDeepStrictEqual(previous.learning_event_clears,next.learning_event_clears))return true;
  for(const key of Object.keys(authorityComponents) as Array<keyof LearnerAuthorityState>){
    if(key==='adaptive_recommendation_cache'||key==='learning_event_clears')continue;
    const identity=(row:AuthorityRecord)=>key==='lesson_progress'?json([row.topic_id,row.lesson_slug??null])
      :key==='adaptive_skill_state'?json(row.skill_id):key==='mistakes'?json(row.question_id):key==='visualization_sessions'?json(row.module_id)
      :typeof row.id==='string'?json(['id',row.id]):typeof row.source_key==='string'?json(['source',row.source_key]):json(row);
    const remaining=new Map<string,number>();for(const row of next[key]){const id=identity(row);remaining.set(id,(remaining.get(id)??0)+1);}
    for(const row of previous[key]){const id=identity(row),count=remaining.get(id)??0;if(!count)return true;remaining.set(id,count-1);}
  }
  return false;
}
type AuthorityAudit=Record<'accounts'|'states'|'receipts'|'journal'|'invalidations'|'deletions',AuthorityRecord[]>;
export type LearnerAuthorityBaseline={audit:AuthorityAudit;claims:LearnerAuthorityClaim[]};
async function authorityAudit(sql:AuthoritySql):Promise<AuthorityAudit>{
  const [row]=await sql<Array<{image:AuthorityAudit}>>`SELECT jsonb_build_object(
    'accounts',(SELECT COALESCE(jsonb_agg(to_jsonb(value)),'[]') FROM learner_authority.accounts value),
    'states',(SELECT COALESCE(jsonb_agg(to_jsonb(value)),'[]') FROM learner_authority.states value),
    'receipts',(SELECT COALESCE(jsonb_agg(to_jsonb(value)),'[]') FROM learner_authority.receipts value),
    'journal',(SELECT COALESCE(jsonb_agg(to_jsonb(value)),'[]') FROM learner_authority.journal value),
    'invalidations',(SELECT COALESCE(jsonb_agg(to_jsonb(value)),'[]') FROM learner_authority.invalidations value),
    'deletions',(SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id',user_id,'generation',generation)),'[]') FROM learner_authority.deletions)
    ) AS image`;
  return row.image;
}
function orderedAudit(audit:AuthorityAudit):AuthorityAudit{
  const key=(row:AuthorityRecord)=>[row.user_id,row.generation,row.operation_id,row.revision].map(v=>String(v??'')).join('\0');
  for(const values of Object.values(audit))values.sort((a,b)=>Buffer.compare(Buffer.from(key(a)),Buffer.from(key(b))));
  return audit;
}
export async function captureLearnerAuthorityBaseline(sql:AuthoritySql):Promise<LearnerAuthorityBaseline>{
  return {audit:await authorityAudit(sql),claims:[...await sql<LearnerAuthorityClaim[]>`SELECT * FROM learner_authority.claims ORDER BY component COLLATE "C",owner COLLATE "C",generation,slot`]};
}
async function eraseGeneration(sql:AuthoritySql,account:Account,expected:AuthorityAudit){
  for(const table of ['states','receipts','journal','invalidations'])await sql.unsafe(`DELETE FROM learner_authority.${table} WHERE user_id=$1 AND generation=$2::uuid`,[account.user_id,account.generation]);
  await sql`DELETE FROM learner_authority.claims WHERE owner=${account.user_id} AND generation=${account.generation}::uuid`;
  await sql`INSERT INTO learner_authority.deletions(user_id,generation) VALUES(${account.user_id},${account.generation}::uuid) ON CONFLICT DO NOTHING`;
  await sql`UPDATE learner_authority.accounts SET mode='erased',account_identity='{}' WHERE user_id=${account.user_id}`;
  for(const table of ['states','receipts','journal','invalidations'] as const)expected[table]=expected[table].filter(row=>row.user_id!==account.user_id||row.generation!==account.generation);
  if(!expected.deletions.some(row=>row.user_id===account.user_id&&row.generation===account.generation))expected.deletions.push({user_id:account.user_id,generation:account.generation});
  const expectedAccount=expected.accounts.find(row=>row.user_id===account.user_id);
  if(!expectedAccount)return fail('authority-account-identity-mismatch');
  Object.assign(expectedAccount,{mode:'erased',account_identity:{}});
}

/** Exclusive compatibility bridge. The caller has already validated and written
 * the complete legacy snapshot and content projections in this transaction. */
export async function refreshLearnerAuthority(sql:AuthoritySql,database:AuthorityDatabase,content:unknown,stateRevision:number,options:{activate:boolean;resetSubjects?:string[];baseline?:LearnerAuthorityBaseline}):Promise<void>{
  await assertLearnerAuthoritySchema(sql);authorityRevision(stateRevision);
  const expected=await authorityAudit(sql);
  const previousClaims=await sql<LearnerAuthorityClaim[]>`SELECT * FROM learner_authority.claims ORDER BY component COLLATE "C",owner COLLATE "C",generation,slot`;
  if(options.baseline&&(!isDeepStrictEqual(orderedAudit(cloneAuthorityJson(expected)),orderedAudit(cloneAuthorityJson(options.baseline.audit)))
    ||!isDeepStrictEqual([...previousClaims],options.baseline.claims)))return fail('authority-prewrite-drift');
  const [previousControl]=await sql<Array<{installation_id:string;publication_id:string|null;definition_epoch:unknown;shared_payload:AuthorityDatabase}>>`SELECT installation_id,publication_id,definition_epoch,shared_payload FROM learner_authority.control WHERE id='primary'`;
  const previousCanonical=previousControl.publication_id
    ? await exactPublishedContent(sql,content,previousControl.installation_id,previousControl.publication_id) : null;
  const [previousFence]=await sql<Array<{narrow:string|null}>>`SELECT current_setting('mais.learner_authority_narrow',true) AS narrow`;
  await sql`SELECT set_config('mais.learner_authority_narrow','false',true)`;
  await sql`SELECT set_config('mais.learner_authority_sealing','true',true)`;
  // Root compatibility callers already supply their complete JSON snapshot.
  // Compare that image directly; a nonmatching optional-field representation
  // still goes through the publication writer's exact JSONB comparison below.
  const canonical=Object.fromEntries(contentKeys.map(key=>[key,database[key]]));
  const publicationId=previousCanonical&&isDeepStrictEqual(previousCanonical,canonical)
    ? previousControl.publication_id! : await publishLearnerAuthorityContent(sql,{source:content,canonical});
  rememberPublication(content,previousControl.installation_id,publicationId,canonical);
  await sql`SELECT set_config('mais.learner_authority_sealing','false',true)`;
  const accounts=await sql<Account[]>`SELECT * FROM learner_authority.accounts ORDER BY user_id COLLATE "C"`;
  const byId=new Map(accounts.map(account=>[account.user_id,account]));
  const existing=new Map((await rows(sql)).map(row=>[row.user_id,row]));
  const currentUsers=users(database),ids=new Set(currentUsers.map(user=>exactAuthorityKey(user.id)));
  if(ids.size!==currentUsers.length)return fail('authority-duplicate-account');
  for(const account of accounts)if(account.mode!=='erased'&&!ids.has(account.user_id))await eraseGeneration(sql,account,expected);
  for(const user of currentUsers){
    const userId=exactAuthorityKey(user.id),accountIdentity=identity(user);let account=byId.get(userId);
    if(account&&account.mode!=='erased'&&!isDeepStrictEqual(account.account_identity,accountIdentity)){
      return fail('authority-account-generation-reuse-requires-erasure',409);
    }
    if(!account||account.mode==='erased'){
      if(expected.deletions.some(row=>row.user_id===userId)
        && Object.values(extractLearnerAuthorityState(database,userId)).some(records=>records.length))return fail('authority-account-reuse-requires-empty-state',409);
      account={user_id:userId,generation:randomUUID(),mode:user.role==='student'&&options.activate?'authoritative':'legacy',account_identity:accountIdentity};
      await sql`INSERT INTO learner_authority.accounts(user_id,generation,mode,account_identity)
        VALUES(${userId},${account.generation}::uuid,${account.mode},${json(accountIdentity)}::text::jsonb)
        ON CONFLICT(user_id) DO UPDATE SET generation=excluded.generation,mode=excluded.mode,account_identity=excluded.account_identity`;
      expected.accounts=expected.accounts.filter(row=>row.user_id!==userId);expected.accounts.push(cloneAuthorityJson(account));
    }
    if(account.mode==='frozen')return fail('authority-mode-unavailable');
    if(account.mode==='legacy'&&user.role==='student'&&options.activate){
      account.mode='authoritative';await sql`UPDATE learner_authority.accounts SET mode='authoritative' WHERE user_id=${userId}`;
      const expectedAccount=expected.accounts.find(row=>row.user_id===userId)!;expectedAccount.mode='authoritative';
    }
    if(!activeModes.has(account.mode))continue;
    const next=extractLearnerAuthorityState(database,userId);
    const previous=existing.get(userId),sameGeneration=previous?.generation===account.generation;
    if(sameGeneration){
      const prior=validateRow(previous);
      if(!isDeepStrictEqual(prior,next)||options.resetSubjects?.includes(userId)){
        // Retire old intents when records are removed/replaced or a clear is
        // explicit. Ordinary appends and updates do not invalidate concurrent
        // commands merely because another activity was recorded.
        const revision=authorityRevision(previous.revision)+1,resetEpoch=authorityRevision(previous.reset_epoch)+(resets(prior,next)||options.resetSubjects?.includes(userId)?1:0);
        await sql`UPDATE learner_authority.states SET payload=${json(next)}::text::jsonb,revision=${revision},reset_epoch=${resetEpoch}
          WHERE user_id=${userId} AND generation=${account.generation}::uuid AND revision=${authorityRevision(previous.revision)}`;
        const operationId=randomUUID();
        await sql`INSERT INTO learner_authority.journal(user_id,generation,revision,operation_id,kind,payload)
          VALUES(${userId},${account.generation}::uuid,${revision},${operationId},'compatibility',NULL)`;
        Object.assign(expected.states.find(row=>row.user_id===userId&&row.generation===account!.generation)!,{payload:cloneAuthorityJson(next),revision,reset_epoch:resetEpoch});
        expected.journal.push({user_id:userId,generation:account.generation,revision,operation_id:operationId,kind:'compatibility',payload:null});
      }
    }else{
      if(previous&&previous.generation===account.generation)return fail('missing-authority');
      await sql`INSERT INTO learner_authority.states(user_id,generation,revision,reset_epoch,payload)
        VALUES(${userId},${account.generation}::uuid,0,0,${json(next)}::text::jsonb)`;
      expected.states.push({user_id:userId,generation:account.generation,revision:0,reset_epoch:0,payload:cloneAuthorityJson(next)});
    }
    await sql`INSERT INTO learner_authority.invalidations(user_id,generation,revision)
      SELECT user_id,generation,revision FROM learner_authority.states WHERE user_id=${userId} AND generation=${account.generation}::uuid
      ON CONFLICT(user_id,generation) DO UPDATE SET revision=excluded.revision`;
    expected.invalidations=expected.invalidations.filter(row=>row.user_id!==userId||row.generation!==account!.generation);
    expected.invalidations.push({user_id:userId,generation:account.generation,revision:expected.states.find(row=>row.user_id===userId&&row.generation===account!.generation)!.revision});
  }
  // Rebuild from the complete compatibility image, including inactive and
  // orphan history. No DISTINCT, uniqueness shortcut or implicit de-duplication.
  await sql`DELETE FROM learner_authority.claims`;
  const liveAccounts=await sql<Account[]>`SELECT * FROM learner_authority.accounts WHERE mode<>'erased'`;
  const generations=new Map(liveAccounts.map(a=>[a.user_id,a.generation]));
  const claims:LearnerAuthorityClaim[]=[];
  for(const component of ['submissions','gamification_events','reward_point_ledger'] as const){
    const records=database[component];if(!Array.isArray(records))return fail('malformed-authority-component');
    const counts=new Map<string,number>();
    for(const record of records as AuthorityRecord[]){
      const hasOwner=typeof record.student_id==='string'&&record.student_id.length>0;
      const owner=hasOwner?exactAuthorityKey(record.student_id):'\u0001orphan';
      const generation=hasOwner?(generations.get(owner)??nilGeneration):nilGeneration;
      const partition=`${owner}\0${generation}`,slot=counts.get(partition)??0;counts.set(partition,slot+1);
      claims.push({component,owner,generation,slot,
        id_key:typeof record.id==='string'&&record.id?exactAuthorityKey(record.id):null,
        source_key:component==='reward_point_ledger'&&typeof record.source_key==='string'&&record.source_key.trim()?exactAuthorityKey(record.source_key):null,record:cloneAuthorityJson(record)});
    }
  }
  if(previousControl.publication_id){
    const identity=(claim:LearnerAuthorityClaim)=>json([claim.component,claim.owner,claim.generation,claim.id_key,claim.source_key]);
    const retained=new Map<string,number>(),after=new Map<string,number>();
    for(const claim of previousClaims){const key=identity(claim);retained.set(key,(retained.get(key)??0)+1);}
    for(const claim of claims)for(const key of claimKeys(claim))after.set(key,(after.get(key)??0)+1);
    for(const claim of claims){
      const key=identity(claim),remaining=retained.get(key)??0;
      if(remaining){retained.set(key,remaining-1);continue;}
      if(claimKeys(claim).some(resource=>(after.get(resource)??0)>1))return fail('authority-global-claim-conflict',409);
    }
  }
  if(claims.length)await sql`INSERT INTO learner_authority.claims(component,owner,generation,slot,id_key,source_key,record)
    SELECT component,owner,generation,slot,id_key,source_key,record FROM jsonb_to_recordset(${json(claims)}::text::jsonb)
      AS value(component text,owner text,generation uuid,slot integer,id_key text,source_key text,record jsonb)`;
  const shared=Object.fromEntries(Object.entries(database).filter(([key])=>!Object.hasOwn(authorityComponents,key)&&!contentKeys.includes(key)));
  const permissions=(value:AuthorityDatabase)=>permissionKeys.map(key=>value[key]??[]);
  const definitionEpoch=authorityRevision(previousControl.definition_epoch)+(isDeepStrictEqual(permissions(previousControl.shared_payload),permissions(shared))?0:1);
  await sql`SELECT set_config('mais.learner_authority_sealing','true',true)`;
  await sql`UPDATE learner_authority.control SET shared_payload=${json(shared)}::text::jsonb,state_revision=${stateRevision},definition_epoch=${definitionEpoch},
    publication_id=${publicationId}::uuid,attested_epoch=content_epoch,mode=${options.activate?'authoritative':'compatibility'} WHERE id='primary'`;
  await sql`SET CONSTRAINTS ALL IMMEDIATE`;
  if(!isDeepStrictEqual(orderedAudit(await authorityAudit(sql)),orderedAudit(expected)))return fail('authority-final-effects');
  const image=await overlayLearnerAuthorities(sql,database);
  for(const component of Object.keys(authorityComponents))if(!isDeepStrictEqual(image[component],database[component]))return fail('authority-final-state');
  const check=await sql<Array<{valid:boolean}>>`SELECT shared_payload=${json(shared)}::text::jsonb AND state_revision=${stateRevision}
    AND publication_id=${publicationId}::uuid AND definition_epoch=${definitionEpoch} AND attested_epoch=content_epoch AND mode=${options.activate?'authoritative':'compatibility'} AS valid FROM learner_authority.control WHERE id='primary'`;
  if(check.length!==1||check[0].valid!==true)return fail('authority-final-state');
  const actual=await sql<LearnerAuthorityClaim[]>`SELECT * FROM learner_authority.claims ORDER BY component COLLATE "C",owner COLLATE "C",generation,slot`;
  const key=(c:LearnerAuthorityClaim)=>`${c.component}\0${c.owner}\0${c.generation}\0${String(c.slot).padStart(10,'0')}`;
  if(!isDeepStrictEqual([...actual],claims.sort((a,b)=>Buffer.compare(Buffer.from(key(a)),Buffer.from(key(b))))))return fail('authority-final-claims');
  await sql`SELECT set_config('mais.learner_authority_sealing','false',true),set_config('mais.learner_authority_narrow',${previousFence.narrow??'false'},true)`;
}

export async function readLearnerAuthorityIdentity(sql:AuthoritySql,userId:string){
  await assertLearnerAuthoritySchema(sql);
  const [row]=await sql<StateRow[]>`SELECT account.*,state.revision,state.reset_epoch,state.payload FROM learner_authority.accounts AS account
    LEFT JOIN learner_authority.states AS state USING(user_id,generation) WHERE user_id=${exactAuthorityKey(userId)}`;
  if(!row)return null;
  if(row.mode==='legacy'){
    if(row.payload!==null&&row.payload!==undefined)return fail('authority-legacy-state-present');
    const [history]=await sql<Array<{present:boolean}>>`SELECT EXISTS(SELECT 1 FROM learner_authority.receipts WHERE user_id=${userId} AND generation=${row.generation}::uuid)
      OR EXISTS(SELECT 1 FROM learner_authority.journal WHERE user_id=${userId} AND generation=${row.generation}::uuid) AS present`;
    if(history.present)return fail('authority-legacy-state-present');
    return null;
  }
  validateRow(row);
  const [control]=await sql<Array<{publication_id:string;definition_epoch:unknown}>>`SELECT publication_id,definition_epoch FROM learner_authority.control WHERE id='primary'`;
  return {generation:row.generation,revision:authorityRevision(row.revision),resetEpoch:authorityRevision(row.reset_epoch),publicationId:control.publication_id,definitionEpoch:authorityRevision(control.definition_epoch)};
}

type AuthorityCommand={userId:string;sessionRevision:number;generation:string;resetEpoch:number;publicationId:string;definitionEpoch:number;operationId:string;expiresAt:number;request:unknown;resources:string[];content:unknown};
export type LearnerAuthorityContext={state:LearnerAuthorityState;shared:AuthorityDatabase;content:AuthorityDatabase;claims:LearnerAuthorityClaim[];generation:string;revision:number};
const publicationProofs=new WeakMap<object,Map<string,AuthorityDatabase>>();
const boundContents=new WeakMap<object,string>();
/** A private immutable copy is the only content eligible for exact-proof reuse. */
export function bindLearnerAuthorityContent(value:unknown):object{
  const copy=cloneAuthorityJson(value) as object;
  function freeze(item:unknown){if(item&&typeof item==='object'){for(const child of Object.values(item))freeze(child);Object.freeze(item);}}
  freeze(copy);boundContents.set(copy,json(copy));return copy;
}
function contentProofs(content:unknown){
  const bound=content&&typeof content==='object'&&boundContents.has(content)?content:null;
  let proofs=bound?publicationProofs.get(bound):undefined;
  if(bound&&!proofs){proofs=new Map();publicationProofs.set(bound,proofs);}
  return {bound,proofs};
}
function rememberPublication(content:unknown,installationId:string,publicationId:string,canonical:AuthorityDatabase){
  const {proofs}=contentProofs(content),key=`${installationId}:${publicationId}`;
  if(proofs&&!proofs.has(key))proofs.set(key,bindLearnerAuthorityContent(JSON.parse(json(canonical))) as AuthorityDatabase);
}
async function exactPublishedContent(sql:AuthoritySql,content:unknown,installationId:string,publicationId:string):Promise<AuthorityDatabase>{
  const {bound,proofs}=contentProofs(content),key=`${installationId}:${publicationId}`;
  const cached=proofs?.get(key);if(cached)return cached;
  const [publication]=await sql<Array<{source_matches:boolean;canonical:AuthorityDatabase}>>`SELECT
    content->'source'=${bound?boundContents.get(bound)!:json(content)}::text::jsonb AS source_matches,content->'canonical' AS canonical
    FROM learner_authority.publications WHERE id=${publicationId}::uuid`;
  if(publication?.source_matches!==true||!publication.canonical||contentKeys.some(key=>!Array.isArray(publication.canonical[key])))return fail('learner-authority-source-version-mismatch');
  const canonical=bindLearnerAuthorityContent(publication.canonical) as AuthorityDatabase;
  proofs?.set(key,canonical);return canonical;
}
/** Called within the reader's repeatable snapshot and shared maintenance fence. */
export async function readLearnerAuthorityContent(sql:AuthoritySql,content:unknown):Promise<AuthorityDatabase>{
  await assertLearnerAuthoritySchema(sql);
  const [control]=await sql<Array<{installation_id:string;publication_id:string;valid:boolean}>>`SELECT installation_id,publication_id,
    mode IN ('authoritative','compatibility') AND attested_epoch=content_epoch
    AND state_revision=(SELECT revision FROM public.app_state WHERE id='primary') AS valid FROM learner_authority.control WHERE id='primary'`;
  if(!control?.publication_id||control.valid!==true)return fail('authority-publication-unattested');
  return exactPublishedContent(sql,content,control.installation_id,control.publication_id);
}
/** A fresh single-learner view for readers whose business scope is only that
 * learner. The caller owns a repeatable snapshot and shared maintenance fence. */
export async function readLearnerAuthorityView(sql:AuthoritySql,content:unknown,userId:string):Promise<AuthorityDatabase|undefined>{
  const canonical=await readLearnerAuthorityContent(sql,content);
  const [row]=await sql<Array<StateRow&{shared_payload:AuthorityDatabase}>>`SELECT account.*,state.revision,state.reset_epoch,state.payload,control.shared_payload
    FROM learner_authority.accounts account CROSS JOIN learner_authority.control control
    LEFT JOIN learner_authority.states state ON state.user_id=account.user_id AND state.generation=account.generation
    WHERE account.user_id=${exactAuthorityKey(userId)} AND control.id='primary'`;
  if(!row)return fail('authority-account-identity-mismatch');
  if(row.mode==='legacy'){await readLearnerAuthorityIdentity(sql,userId);return undefined;}
  const state=validateRow(row),user=users(row.shared_payload).find(user=>user.id===userId);
  if(!user||!isDeepStrictEqual(identity(user),row.account_identity))return fail('authority-account-identity-mismatch');
  return {...row.shared_payload,...canonical,...cloneAuthorityJson(state)};
}
const admissionQueues=new Map<string,Promise<unknown>>();

function claimKeys(claim:LearnerAuthorityClaim):string[]{
  return [...(claim.id_key?[`id:${claim.component}:${claim.id_key}`]:[]),...(claim.source_key?[`source:${claim.source_key}`]:[])];
}
function isIndependentLessonTransition(before:LearnerAuthorityState,after:LearnerAuthorityState,command:AuthorityCommand,canonical:AuthorityDatabase):boolean{
  for(const key of ['attempts','mistakes','learning_events','learning_event_clears','visualization_events','visualization_sessions'] as const){
    if(!isDeepStrictEqual(before[key],after[key]))return false;
  }
  for(const key of ['reward_point_ledger','gamification_events'] as const){
    if(after[key].length<before[key].length||!isDeepStrictEqual(after[key].slice(after[key].length-before[key].length),before[key]))return false;
  }
  for(const key of ['lesson_progress','adaptive_skill_state','submissions'] as const){
    if(after[key].length<before[key].length)return false;
    for(let index=0;index<before[key].length;index++){
      const a=before[key][index],b=after[key][index];if(isDeepStrictEqual(a,b))continue;
      const stable=key==='lesson_progress'?['topic_id','lesson_slug']:key==='adaptive_skill_state'?['skill_id']:['id'];
      if(stable.every(field=>typeof a[field]==='string'&&Boolean(a[field])&&a[field]===b[field]))continue;
      // Preserve the existing canonical lesson transition's explicit alias
      // rule: the requested published lesson may replace its first topic/slug
      // alias slot. An unrelated same-length replacement is never a reset.
      const request=command.request as {slug?:unknown}|null;
      const lesson=Array.isArray(canonical.lessons)?(canonical.lessons as AuthorityRecord[]).find(row=>row.slug===request?.slug):undefined;
      const alias=key==='lesson_progress'&&lesson&&b.lesson_slug===lesson.slug&&b.topic_id===lesson.topic_id
        && (a.lesson_slug===lesson.slug||a.topic_id===lesson.topic_id);
      if(!alias)return false;
    }
  }
  return true;
}

/** Per-learner local queues stay outside the pool. PostgreSQL admission and
 * account/resource locks provide the corresponding cross-worker ordering. */
export async function runLearnerAuthorityTransaction<T>(client:postgres.Sql,command:AuthorityCommand,mutate:(context:LearnerAuthorityContext)=>T|Promise<T>,compatibility?:{
  prepare:(sql:postgres.TransactionSql)=>Promise<void>;write:(sql:postgres.TransactionSql)=>Promise<void>
}):Promise<T>{
  const run=async()=>client.begin(async tx=>{
    await tx`SELECT set_config('search_path','pg_catalog,public',true),set_config('lock_timeout','1000ms',true),set_config('statement_timeout','5000ms',true)`;
    if(!await lockLearnerAuthority(tx,compatibility?'exclusive':'shared'))return fail('authority-not-installed');
    await assertLearnerAuthoritySchema(tx);
    await compatibility?.prepare(tx);
    await tx`SELECT pg_advisory_xact_lock_shared(hashtextextended('mais:student-activity',0))`;
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`mais:account-data:${exactAuthorityKey(command.userId)}`},0))`;
    const resources=sortedAuthorityKeys(command.resources);
    for(const resource of resources)await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`mais:authority-resource:${resource}`},0))`;
    const [control]=await tx<Array<{installation_id:string;publication_id:string;mode:string;content_epoch:unknown;definition_epoch:unknown;attested_epoch:unknown;shared_payload:AuthorityDatabase;state_revision:unknown;current_revision:unknown}>>`
      SELECT control.*,state.revision AS current_revision FROM learner_authority.control AS control,public.app_state AS state WHERE control.id='primary' AND state.id='primary'`;
    if(!control||!['authoritative','compatibility'].includes(control.mode)||!control.publication_id
      ||authorityRevision(control.content_epoch)!==authorityRevision(control.attested_epoch)
      ||authorityRevision(control.state_revision)!==authorityRevision(control.current_revision))return fail('authority-publication-unattested');
    const canonical=await exactPublishedContent(tx,command.content,control.installation_id,control.publication_id);
    const [row]=await tx<StateRow[]>`SELECT account.*,state.revision,state.reset_epoch,state.payload FROM learner_authority.accounts AS account
      LEFT JOIN learner_authority.states AS state USING(user_id,generation) WHERE user_id=${command.userId} FOR UPDATE OF account`;
    if(!row)return fail('authority-actor-rejected',401);
    const state=cloneAuthorityJson(validateRow(row));
    const beforeState=cloneAuthorityJson(state);
    const actor=users(control.shared_payload).find(user=>user.id===command.userId);
    if(!actor||actor.role!=='student'||actor.disabled_at!==null||actor.session_revision!==command.sessionRevision
      ||!Number.isSafeInteger(command.sessionRevision)||command.sessionRevision<1||!isDeepStrictEqual(identity(actor),row.account_identity))return fail('authority-actor-rejected',401);
    if(row.generation!==command.generation||authorityRevision(row.reset_epoch)!==command.resetEpoch)return fail('authority-intent-stale',409);
    if(!Number.isSafeInteger(command.expiresAt)||Date.now()>command.expiresAt)return fail('authority-intent-expired',409);
    exactAuthorityKey(command.operationId);
    if(command.publicationId!==control.publication_id||command.definitionEpoch!==authorityRevision(control.definition_epoch))return fail('authority-definition-stale',409);
    const receiptRequest=cloneAuthorityJson({request:command.request,publicationId:command.publicationId,definitionEpoch:command.definitionEpoch});
    const receipt=await tx<Array<{request:unknown;result:T;session_revision:unknown;reset_epoch:unknown}>>`SELECT request,result,session_revision,reset_epoch FROM learner_authority.receipts
      WHERE user_id=${command.userId} AND generation=${command.generation}::uuid AND operation_id=${command.operationId}`;
    if(receipt.length){
      if(receipt.length!==1||!isDeepStrictEqual(receipt[0].request,receiptRequest)||authorityRevision(receipt[0].session_revision)!==command.sessionRevision||authorityRevision(receipt[0].reset_epoch)!==command.resetEpoch)return fail('authority-operation-conflict',409);
      return receipt[0].result;
    }
    const claims=await tx<LearnerAuthorityClaim[]>`SELECT * FROM learner_authority.claims WHERE owner=${command.userId}
      OR ('source:'||source_key)=ANY(${resources}::text[]) OR ('id:'||component||':'||id_key)=ANY(${resources}::text[]) ORDER BY component COLLATE "C",owner COLLATE "C",slot`;
    const before=learnerAuthorityClaims(state,command.userId,row.generation);
    const ownClaims=claims.filter(claim=>claim.owner===command.userId&&claim.generation===row.generation);
    const orderClaims=(values:LearnerAuthorityClaim[])=>values.sort((a,b)=>Buffer.compare(Buffer.from(a.component),Buffer.from(b.component))||a.slot-b.slot);
    if(!isDeepStrictEqual(orderClaims(ownClaims),orderClaims(cloneAuthorityJson(before))))return fail('authority-claims-incomplete');
    const result=cloneAuthorityJson(await mutate({state,shared:cloneAuthorityJson(control.shared_payload),content:canonical,claims:cloneAuthorityJson([...claims]),generation:row.generation,revision:authorityRevision(row.revision)}));
    validateLearnerAuthorityState(state,command.userId);
    if(Date.now()>command.expiresAt)return fail('authority-intent-expired',409);
    if(!isIndependentLessonTransition(beforeState,state,command,canonical))return fail('authority-reset-requires-maintenance',409);
    const next=learnerAuthorityClaims(state,command.userId,row.generation);
    const counts=(values:LearnerAuthorityClaim[])=>{const map=new Map<string,number>();for(const c of values)for(const key of claimKeys(c))map.set(key,(map.get(key)??0)+1);return map;};
    const previousKeys=counts(before),nextKeys=counts(next);
    for(const [key,count]of nextKeys)if(count>(previousKeys.get(key)??0)){
      if(!resources.includes(key))return fail('undeclared-authority-resource');
      if(count>1||claims.some(claim=>claimKeys(claim).includes(key)))return fail('authority-global-claim-conflict',409);
    }
    const revision=authorityRevision(row.revision)+1,resetEpoch=authorityRevision(row.reset_epoch);
    await tx`SELECT set_config('mais.learner_authority_user',${command.userId},true),set_config('mais.learner_authority_generation',${command.generation},true),
      set_config('mais.learner_authority_operation',${command.operationId},true),set_config('mais.learner_authority_revision',${String(revision)},true),set_config('mais.learner_authority_narrow','true',true)`;
    const updated=await tx<Array<{valid:boolean}>>`UPDATE learner_authority.states SET payload=${json(state)}::text::jsonb,revision=${revision}
      WHERE user_id=${command.userId} AND generation=${command.generation}::uuid AND revision=${revision-1} AND reset_epoch=${resetEpoch}
      RETURNING payload=${json(state)}::text::jsonb AND revision=${revision} AND reset_epoch=${resetEpoch} AS valid`;
    if(updated.length!==1||updated[0].valid!==true)return fail('authority-state-conflict',409);
    await replaceClaims(tx,command.userId,command.generation,state);
    await tx`INSERT INTO learner_authority.receipts(user_id,generation,operation_id,session_revision,reset_epoch,request,result,previous_revision,revision)
      VALUES(${command.userId},${command.generation}::uuid,${command.operationId},${command.sessionRevision},${resetEpoch},${json(receiptRequest)}::text::jsonb,${json(result)}::text::jsonb,${revision-1},${revision})`;
    await tx`INSERT INTO learner_authority.journal(user_id,generation,revision,operation_id,kind,payload)
      VALUES(${command.userId},${command.generation}::uuid,${revision},${command.operationId},'lesson',NULL)`;
    await tx`INSERT INTO learner_authority.invalidations(user_id,generation,revision) VALUES(${command.userId},${command.generation}::uuid,${revision})
      ON CONFLICT(user_id,generation) DO UPDATE SET revision=excluded.revision`;
    await compatibility?.write(tx);
    await tx`SET CONSTRAINTS ALL IMMEDIATE`;
    const check=await tx<Array<{valid:boolean}>>`SELECT state.payload=${json(state)}::text::jsonb AND state.revision=${revision} AND state.reset_epoch=${resetEpoch}
      AND receipt.request=${json(receiptRequest)}::text::jsonb AND receipt.result=${json(result)}::text::jsonb AND receipt.previous_revision=${revision-1}
      AND receipt.revision=${revision} AND receipt.session_revision=${command.sessionRevision} AND receipt.reset_epoch=${resetEpoch}
      AND journal.operation_id=${command.operationId} AND journal.kind='lesson' AND journal.payload IS NULL AND invalidation.revision=${revision} AS valid
      FROM learner_authority.states state JOIN learner_authority.receipts receipt USING(user_id,generation)
      JOIN learner_authority.journal journal ON journal.user_id=state.user_id AND journal.generation=state.generation AND journal.revision=state.revision
      JOIN learner_authority.invalidations invalidation ON invalidation.user_id=state.user_id AND invalidation.generation=state.generation
      WHERE state.user_id=${command.userId} AND state.generation=${command.generation}::uuid AND receipt.operation_id=${command.operationId}`;
    const actual=await tx<LearnerAuthorityClaim[]>`SELECT * FROM learner_authority.claims WHERE owner=${command.userId} AND generation=${command.generation}::uuid ORDER BY component COLLATE "C",slot`;
    if(check.length!==1||check[0].valid!==true||!isDeepStrictEqual([...actual],next.sort((a,b)=>Buffer.compare(Buffer.from(a.component),Buffer.from(b.component))||a.slot-b.slot)))return fail('authority-final-state');
    const finalControl=await tx<Array<{valid:boolean}>>`SELECT publication_id=${control.publication_id}::uuid AND installation_id=${control.installation_id}::uuid
      AND shared_payload=${json(control.shared_payload)}::text::jsonb AND mode IN ('authoritative','compatibility')
      AND definition_epoch=${command.definitionEpoch}
      AND state_revision=(SELECT revision FROM public.app_state WHERE id='primary') AND attested_epoch=content_epoch AS valid
      FROM learner_authority.control WHERE id='primary'`;
    if(finalControl.length!==1||finalControl[0].valid!==true)return fail('authority-final-control');
    if(Date.now()>command.expiresAt)return fail('authority-intent-expired',409);
    return result;
  }) as Promise<T>;
  const key=`${command.userId}\0${command.generation}`,previous=admissionQueues.get(key)??Promise.resolve();
  const work=previous.catch(()=>undefined).then(run);admissionQueues.set(key,work);
  try{return await work;}finally{if(admissionQueues.get(key)===work)admissionQueues.delete(key);}
}
