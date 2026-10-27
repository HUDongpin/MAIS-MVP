const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const workerDirectory = path.dirname(__filename);
const checkout = process.cwd();
const evidence = path.join(checkout,'.tmp','media-owner-erasure-tests',`${process.pid}-${Date.now()}`);
const media = require(path.join(checkout,'lib/server/mediaObjectStore.ts'));
const helper = require(path.join(checkout,'lib/server/mediaOwnerErasure.ts'));
const deletion = require(path.join(checkout,'lib/server/userStore/accountDeletionPersistence.ts'));
const png = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0x0d]);
const now = new Date('2026-10-01T00:00:00.000Z');
let sequence = 0;
async function fixture() {
  const root = path.join(evidence,'synthetic',`current-${process.pid}-${++sequence}`);
  assert.ok(path.resolve(root).startsWith(path.join(evidence,'synthetic')+path.sep));
  await fsp.mkdir(root,{recursive:true});
  const env = {AI_MEDIA_OBJECT_STORE_DIR:root,AI_MEDIA_ALLOW_DEVELOPMENT_MEDIA_KEY:'true',AI_MEDIA_RETENTION_DAYS:'1'};
  const upload = async (ownerId='owner-a') => {
    const stored = await media.storeMediaObjectFromDataUrl({ownerId,capability:'assignment-image',dataUrl:`data:image/png;base64,${png.toString('base64')}`,env,now});
    assert.equal(stored.status,'stored'); return stored;
  };
  const account = {id:'owner-a',role:'student',created_at:'2026-01-01T00:00:00.000Z'};
  let database = {users:[account,{id:'owner-b',role:'student',created_at:account.created_at}],submissions:[],teacher_classes:[],class_enrollments:[],teacher_class_collaborators:[]};
  const source = fs.readFileSync(path.join(checkout,'lib/server/userStore.ts'),'utf8');
  const ast = ts.createSourceFile('delete.ts',source,ts.ScriptTarget.Latest,true);
  const fn = ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='deleteUserAccount');
  assert.ok(fn);
  let calls=0, failCommit=false, ambiguousCommit=false;
  let queue=Promise.resolve();
  const mutate = operation => {
    const run = queue.then(async()=>{
      calls++;
      const draft=structuredClone(database);
      const result=await operation(draft);
      if (failCommit && calls===1) throw new Error('Synthetic verified rollback');
      database=draft;
      if (ambiguousCommit && calls===1) throw new Error('Synthetic lost commit acknowledgement');
      return result;
    });
    queue=run.catch(()=>{}); return run;
  };
  const module={exports:{}};
  const code=ts.transpileModule(fn.getText(ast)+'\nmodule.exports=deleteUserAccount;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,...helper,...deletion,mutationActorContext:new (require('node:async_hooks').AsyncLocalStorage)(),runAccountErasureRecovery:require(path.join(checkout,'lib/server/requestMutationActor.ts')).runAccountErasureRecovery,mediaStoreRoot:()=>root,storageProvider:'json',mutateDatabase:mutate,randomUUID:require("node:crypto").randomUUID});
  return {root,env,account,upload,deleteAccount:module.exports,mutate,database:()=>database,fail:()=>{failCommit=true;},ambiguous:()=>{ambiguousCommit=true;},files:stored=>[path.join(root,stored.media.objectKey+'.bin'),path.join(root,stored.media.objectKey+'.json')]};
}
const read = (f,stored,owner='owner-a',clock=new Date('2026-10-01T01:00:00.000Z')) => media.readStoredMediaObject({env:f.env,objectKey:stored.media.objectKey,requester:{id:owner,role:owner==='admin'?'admin':'student'},now:clock});

test('account erasure removes only owner media, including unreferenced uploads; unrelated uploader references survive',async()=>{
  const f=await fixture(), own=await f.upload(), other=await f.upload('owner-b');
  f.database().submissions.push({id:'synthetic-submission',student_id:'owner-a',image_object_key:other.media.objectKey});
  const result=await f.deleteAccount('owner-a');
  assert.equal(result.status,'deleted');
  assert.equal((await read(f,own,'admin')).status,'not-found');
  assert.equal(result.mediaPurge.status,'purged');
  for(const file of f.files(own)) assert.equal(fs.existsSync(file),false);
  assert.equal((await read(f,other,'owner-b')).status,'ok');
  for(const file of f.files(other)) assert.equal(fs.existsSync(file),true);
});
test('late upload after committed erasure is rejected without new media bytes',async()=>{
  const f=await fixture(); await f.upload(); await f.deleteAccount('owner-a');
  const result=await media.storeMediaObjectFromDataUrl({ownerId:'owner-a',capability:'assignment-image',dataUrl:`data:image/png;base64,${png.toString('base64')}`,env:f.env,now});
  assert.equal(result.status,'rejected'); assert.equal(result.code,'media-owner-erased');
});
test('retention expiry physically removes its exact canonical object pair',async()=>{
  const f=await fixture(), own=await f.upload();
  assert.equal((await read(f,own,'owner-a',new Date('2026-10-03T00:00:00.000Z'))).status,'expired');
  for(const file of f.files(own)) assert.equal(fs.existsSync(file),false);
});
test('verified DB rollback restores reads without purging media or leaving its admission',async()=>{
  const f=await fixture(), own=await f.upload(); f.fail();
  await assert.rejects(f.deleteAccount('owner-a'),/rollback/);
  assert.equal(f.database().users.some(row=>row.id==='owner-a'),true);
  assert.equal(await helper.readMediaOwnerErasure(f.root,helper.mediaOwnerHash('owner-a')),null);
  assert.equal((await read(f,own)).status,'ok');
  for(const file of f.files(own)) assert.equal(fs.existsSync(file),true);
});
test('blocked deletion has no marker and leaves every media byte',async()=>{
  const f=await fixture(), own=await f.upload(); f.database().users[0].role='teacher';
  f.database().teacher_classes.push({id:'owned-class',teacher_id:'owner-a'});
  f.database().class_enrollments.push({class_id:'owned-class',student_id:'owner-b'});
  assert.equal((await f.deleteAccount('owner-a')).status,'blocked');
  assert.equal(await helper.readMediaOwnerErasure(f.root,helper.mediaOwnerHash('owner-a')),null);
  for(const file of f.files(own)) assert.equal(fs.existsSync(file),true);
});
test('rollback cannot clear another operation, a different account generation, or committed erasure',async()=>{
  const f=await fixture(); await f.upload();
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account);
  assert.equal(await helper.rollbackMediaOwnerErasure(f.root,{...admission,operationId:'11111111-1111-1111-1111-111111111111'},f.account),false);
  assert.equal(await helper.rollbackMediaOwnerErasure(f.root,admission,{...f.account,created_at:'2026-02-01T00:00:00.000Z'}),false);
  await helper.commitMediaOwnerErasure(f.root,admission);
  assert.equal(await helper.rollbackMediaOwnerErasure(f.root,admission,f.account),false);
  assert.equal(await helper.mediaOwnerErasureIsMarked(f.root,admission.ownerHash),true);
});
test('an admitted late writer keeps deletion pending, is denied on finish, and supports deleted-account retry',async()=>{
  const f=await fixture(), own=await f.upload();
  const lease=await helper.beginMediaUploadLease(f.root,own.metadata);
  const result=await f.deleteAccount('owner-a');
  assert.equal(result.status,'deleted'); assert.equal(result.mediaPurge.status,'pending'); assert.equal(result.mediaPurge.reason,'uploads-active');
  assert.equal((await read(f,own,'admin')).status,'not-found');
  assert.equal(await helper.finishMediaUploadLease(lease),false);
  const retry=await f.deleteAccount('owner-a');
  assert.equal(retry.status,'deleted'); assert.equal(retry.mediaPurge.status,'purged');
  for(const file of f.files(own)) assert.equal(fs.existsSync(file),false);
});
test('postcommit filesystem failure reports pending, retains tombstone, and retries after exact synthetic obstruction repair',async()=>{
  const f=await fixture(), own=await f.upload(), [binary]=f.files(own);
  await fsp.unlink(binary); await fsp.mkdir(binary);
  const result=await f.deleteAccount('owner-a');
  assert.equal(result.status,'deleted'); assert.equal(result.mediaPurge.status,'pending');
  assert.equal(f.database().users.some(row=>row.id==='owner-a'),false);
  assert.equal((await read(f,own,'admin')).status,'not-found');
  await fsp.rmdir(binary);
  assert.equal((await f.deleteAccount('owner-a')).mediaPurge.status,'purged');
});
test('ambiguous commit acknowledgement is resolved from fresh canonical absence',async()=>{
  const f=await fixture(), own=await f.upload(); f.ambiguous();
  const result=await f.deleteAccount('owner-a');
  assert.equal(result.status,'deleted'); assert.equal(result.mediaPurge.status,'purged');
  assert.equal(f.database().users.some(row=>row.id==='owner-a'),false);
  for(const file of f.files(own)) assert.equal(fs.existsSync(file),false);
});
test('owner purge is budgeted and a later exact-owner retry completes the remainder',async()=>{
  const f=await fixture(); for(let n=0;n<3;n++) await f.upload();
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account); await helper.commitMediaOwnerErasure(f.root,admission);
  const first=await helper.purgeMediaObjects(f.root,{ownerHash:admission.ownerHash,limit:1});
  assert.equal(first.status,'pending'); assert.equal(first.reason,'scan-budget'); assert.equal(first.filesRemoved,1);
  const second=await helper.purgeMediaObjects(f.root,{ownerHash:admission.ownerHash,limit:20});
  assert.equal(second.status,'purged'); assert.equal(second.filesRemoved,2);
});
test('malformed metadata is preserved with pending status; full hash mismatch cannot be deleted by prefix',async()=>{
  const f=await fixture(), own=await f.upload(), [binary,metadata]=f.files(own);
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account); await helper.commitMediaOwnerErasure(f.root,admission);
  await fsp.writeFile(metadata,'{synthetic-malformed');
  assert.equal((await helper.purgeMediaObjects(f.root,{ownerHash:admission.ownerHash})).status,'pending');
  assert.equal(fs.existsSync(binary),true); assert.equal(fs.existsSync(metadata),true);
  const otherHash=admission.ownerHash.slice(0,16)+'0'.repeat(48);
  await fsp.writeFile(metadata,JSON.stringify({...own.metadata,ownerHash:otherHash}));
  assert.equal((await helper.purgeMediaObjects(f.root,{ownerHash:admission.ownerHash})).filesRemoved,0);
  assert.equal(fs.existsSync(binary),true); assert.equal(fs.existsSync(metadata),true);
});
test('symlinked owner folder cannot cause out-of-root purge',async()=>{
  const f=await fixture(), own=await f.upload(), folder=path.dirname(f.files(own)[0]);
  const preserved=path.join(evidence,'synthetic',`preserved-${process.pid}-${sequence}`);
  await fsp.rename(folder,preserved); await fsp.symlink(preserved,folder,'dir');
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account); await helper.commitMediaOwnerErasure(f.root,admission);
  assert.equal((await helper.purgeMediaObjects(f.root,{ownerHash:admission.ownerHash})).status,'pending');
  assert.equal(fs.existsSync(path.join(preserved,path.basename(f.files(own)[0]))),true);
});
test('stranded lease recovery requires exact id, full ownership and explicit stopped-worker proof',async()=>{
  const f=await fixture(), own=await f.upload(); const lease=await helper.beginMediaUploadLease(f.root,own.metadata);
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account); await helper.commitMediaOwnerErasure(f.root,admission);
  const leaseId=path.basename(lease.leasePath,'.json');
  await assert.rejects(helper.recoverStoppedMediaUpload(f.root,admission.ownerHash,leaseId,false));
  assert.equal((await helper.purgeMediaObjects(f.root,{ownerHash:admission.ownerHash})).reason,'uploads-active');
  await helper.recoverStoppedMediaUpload(f.root,admission.ownerHash,leaseId,true);
  assert.equal((await helper.purgeMediaObjects(f.root,{ownerHash:admission.ownerHash})).status,'purged');
});

test('symlink metadata is preserved with pending status without following its target',async()=>{
  const f=await fixture(), own=await f.upload(), [binary,metadata]=f.files(own);
  const target=path.join(evidence,'synthetic',`metadata-preserved-${process.pid}-${sequence}.json`);
  await fsp.rename(metadata,target); await fsp.symlink(target,metadata);
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account); await helper.commitMediaOwnerErasure(f.root,admission);
  assert.equal((await helper.purgeMediaObjects(f.root,{ownerHash:admission.ownerHash})).reason,'unverifiable-metadata');
  assert.equal(fs.existsSync(binary),true); assert.equal(fs.existsSync(target),true); assert.equal((await fsp.lstat(metadata)).isSymbolicLink(),true);
});
test('control directory symlinks fail closed; owner cleanup never follows their targets',async()=>{
  const f=await fixture(); await f.upload();
  const preserved=path.join(evidence,'synthetic',`control-preserved-${process.pid}-${sequence}`); await fsp.mkdir(preserved);
  await fsp.symlink(preserved,path.join(f.root,'.owner-erasure'),'dir');
  await assert.rejects(helper.admitMediaOwnerErasure(f.root,f.account),/symlinks/);
  await assert.rejects(helper.mediaOwnerErasureIsMarked(f.root,helper.mediaOwnerHash('owner-a')),/symlinks/);
  assert.deepEqual(await fsp.readdir(preserved),[]);
});
test('traversal counts unrelated directory entries and never reports unbounded successful cleanup',async()=>{
  const f=await fixture(); await f.upload();
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account); await helper.commitMediaOwnerErasure(f.root,admission);
  for(let n=0;n<100;n++) await fsp.mkdir(path.join(f.root,'profile-avatar',`invalid-${n}`),{recursive:true});
  const result=await helper.purgeMediaObjects(f.root,{ownerHash:admission.ownerHash,limit:1});
  assert.equal(result.reason,'scan-budget'); assert.equal(result.inspected,0);
});
test('invalid expiry cutoffs cannot erase media; expiry defers while a writer lease is active',async()=>{
  const f=await fixture(), own=await f.upload();
  await assert.rejects(helper.purgeMediaObjects(f.root,{expiredAt:new Date('invalid')}),/valid expiry/);
  const lease=await helper.beginMediaUploadLease(f.root,own.metadata);
  assert.equal((await read(f,own,'owner-a',new Date('2026-10-03T00:00:00.000Z'))).code,'media-purge-pending');
  for(const file of f.files(own)) assert.equal(fs.existsSync(file),true);
  await helper.finishMediaUploadLease(lease);
  assert.equal((await helper.purgeMediaObjects(f.root,{expiredAt:new Date('2026-10-03T00:00:00.000Z')})).status,'purged');
});
test('canonical student-only deletion cannot delete an account whose current role changed',async()=>{
  const f=await fixture(), own=await f.upload(); f.database().users[0].role='parent';
  assert.equal((await f.deleteAccount('owner-a',{requiredRole:'student'})).status,'not-found');
  assert.equal(f.database().users.length,2); assert.equal((await read(f,own,'admin')).status,'ok');
});
test('cleanup-only retry cannot erase a live account even with an admitted marker',async()=>{
  for(const role of ['student','parent','teacher','admin']){
    const f=await fixture(), own=await f.upload();f.database().users[0].role=role;
    const admission=await helper.admitMediaOwnerErasure(f.root,f.database().users[0]);
    const before=JSON.stringify(f.database());
    assert.equal((await f.deleteAccount('owner-a',{requireDeletedAccount:true})).status,'not-found',role);
    assert.equal(JSON.stringify(f.database()),before);assert.equal((await helper.readMediaOwnerErasure(f.root,admission.ownerHash)).operationId,admission.operationId);
    for(const file of f.files(own))assert.equal(fs.existsSync(file),true);
  }
});
test('actual paused upload cannot publish after account commit; owner retry drains the durable lease',async()=>{
  const {fork}=require('node:child_process');
  const f=await fixture(); await f.upload();
  const child=fork(path.join(workerDirectory,'mediaOwnerErasureUploadWorker.cjs'),[],{cwd:checkout,env:{PATH:process.env.PATH},stdio:['ignore','ignore','pipe','ipc']});
  let stderr=''; child.stderr.on('data',chunk=>{stderr+=chunk;});
  const nextMessage=()=>new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error(`Synthetic child timeout: ${stderr}`)),10000);
    child.once('message',message=>{clearTimeout(timeout);resolve(message);});
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
  });
  try{
    const admitted=nextMessage();
    child.send({input:{ownerId:'owner-a',capability:'assignment-image',dataUrl:`data:image/png;base64,${png.toString('base64')}`,env:f.env,now:new Date('2026-10-01T00:00:00.000Z')}});
    // Date serialized over IPC: worker supplies the explicit synthetic clock.
    const ready=await admitted; assert.equal(ready.event,'lease-admitted-before-binary');
    const deleted=await f.deleteAccount('owner-a');
    assert.equal(deleted.status,'deleted'); assert.equal(deleted.mediaPurge.reason,'uploads-active');
    const completed=nextMessage(); child.send({event:'resume'});
    const response=await completed; assert.equal(response.event,'completed');
    assert.equal(response.result.status,'rejected'); assert.equal(response.result.code,'media-owner-erased');
    const retry=await f.deleteAccount('owner-a'); assert.equal(retry.mediaPurge.status,'purged');
    assert.equal(fs.existsSync(ready.file),false); assert.equal(fs.existsSync(ready.file.slice(0,-4)+'.json'),false);
  }finally{if(child.connected)child.disconnect();if(child.exitCode===null)child.kill('SIGTERM');}
});

test('admission failure before database mutation leaves the live subject and original media',async()=>{
  const f=await fixture(), own=await f.upload();
  await fsp.writeFile(path.join(f.root,'.owner-erasure'),'synthetic-control-obstruction');
  await assert.rejects(f.deleteAccount('owner-a'));
  assert.equal(f.database().users.some(user=>user.id==='owner-a'),true);
  for(const file of f.files(own)) assert.equal(fs.existsSync(file),true);
});

async function heldMediaRead(f, own) {
 let enteredResolve, releaseResolve;
 const entered=new Promise(resolve=>{enteredResolve=resolve;}), released=new Promise(resolve=>{releaseResolve=resolve;});
 const originalRead=fsp.readFile;
 fsp.readFile=async function(file,...args) {
  const bytes=await originalRead.call(this,file,...args);
  if (String(file)===f.files(own)[0]) { enteredResolve(); await released; }
  return bytes;
 };
 const result=read(f,own,'admin'); await entered;
 return {result,release:()=>releaseResolve(),restore:()=>{fsp.readFile=originalRead;}};
}
test('independent R29: an admitted media read must not return decrypted bytes after committed owner erasure',async()=>{
 const f=await fixture(), own=await f.upload(); const held=await heldMediaRead(f,own);
 try {
  const deletionResult=await f.deleteAccount('owner-a'); assert.equal(deletionResult.status,'deleted'); assert.equal(deletionResult.mediaPurge.status,'purged');
  held.release(); const outcome=await held.result;
  assert.notEqual(outcome.status,'ok','committed marker must deny bytes despite pre-admission read');
  assert.equal(outcome.bytes,undefined);
 } finally {held.release();held.restore();}
});
test('independent R29 control: verified rollback allows the held authorized media read to complete',async()=>{
 const f=await fixture(), own=await f.upload(); const held=await heldMediaRead(f,own);
 try {
  f.fail(); await assert.rejects(f.deleteAccount('owner-a'),/rollback/);
  held.release(); assert.equal((await held.result).status,'ok');
 } finally {held.release();held.restore();}
});

test('late disclosure fails closed when marker state becomes unavailable after binary read',async()=>{
 const f=await fixture(), own=await f.upload(); const held=await heldMediaRead(f,own);
 try {
  await fsp.writeFile(path.join(f.root,'.owner-erasure'),'synthetic-control-obstruction');
  held.release(); const outcome=await held.result;
  assert.equal(outcome.status,'rejected'); assert.equal(outcome.code,'media-purge-pending'); assert.equal(outcome.bytes,undefined);
 } finally {held.release();held.restore();}
});

test('retention scan pages reach expired unread media after more than the maximum retained prefix',async()=>{
 const f=await fixture(),expired=await f.upload();
 const future=await media.storeMediaObjectFromDataUrl({ownerId:'owner-a',capability:'profile-avatar',dataUrl:`data:image/png;base64,${png.toString('base64')}`,env:f.env,now:new Date('2026-10-10T00:00:00.000Z')});
 assert.equal(future.status,'stored');
 const encrypted=await fsp.readFile(f.files(future)[0]);
 for(let index=0;index<1000;index++){
  const objectKey=future.metadata.objectKey.split('/').slice(0,-1).concat(require('node:crypto').randomUUID()).join('/');
  const metadata={...future.metadata,objectKey};assert.ok(helper.canonicalMediaProof(metadata,objectKey));
  await fsp.writeFile(path.join(f.root,objectKey+'.bin'),encrypted);
  await fsp.writeFile(path.join(f.root,objectKey+'.json'),JSON.stringify(metadata));
 }
 assert.equal(typeof helper.purgeMediaObjectPages,'function');
 const pages=[];
 for await(const page of helper.purgeMediaObjectPages(f.root,{expiredAt:new Date('2026-10-03T00:00:00.000Z'),limit:1000}))pages.push(page);
 assert.ok(pages.length>=2);assert.equal(pages[0].status,'pending');assert.equal(pages[0].reason,'scan-budget');
 assert.equal(pages[0].inspected,1000);assert.equal(pages[0].filesRemoved,0);
 assert.equal(pages.at(-1).status,'purged');assert.equal(pages.reduce((sum,page)=>sum+page.filesRemoved,0),1);
 assert.equal(pages.reduce((sum,page)=>sum+page.inspected,0),1002);
 for(const file of f.files(expired))assert.equal(fs.existsSync(file),false);
 for(const file of f.files(future))assert.equal(fs.existsSync(file),true);
});
test('scan pages bound directory traversal and close live handles on caller break and one-page compatibility return',async()=>{
 const f=await fixture();await f.upload();
 for(let index=0;index<160;index++)await fsp.mkdir(path.join(f.root,'profile-avatar',`invalid-${index}`),{recursive:true});
 const original=fsp.opendir;let opened=0,closed=0,visited=0;
 fsp.opendir=async function(...args){
  const directory=await original.apply(this,args);opened++;
  return {async *[Symbol.asyncIterator](){try{for await(const entry of directory){visited++;yield entry;}}finally{closed++;}}};
 };
 try{
  assert.equal(typeof helper.purgeMediaObjectPages,'function');
  const scan=helper.purgeMediaObjectPages(f.root,{expiredAt:new Date('2026-10-03T00:00:00.000Z'),limit:1});
  const first=await scan.next();assert.equal(first.done,false);assert.equal(first.value.reason,'scan-budget');assert.equal(first.value.inspected,0);
  assert.ok(visited<=73,'directory work must remain bounded, including one look-ahead entry');
  assert.ok(opened>closed,'the exact traversal remains live between pages');
  await scan.return();assert.equal(opened,closed,'caller return closes all nested directories');
  const before=visited;const legacy=await helper.purgeMediaObjects(f.root,{expiredAt:new Date('2026-10-03T00:00:00.000Z'),limit:1});
  assert.equal(legacy.reason,'scan-budget');assert.ok(visited-before<=73);assert.equal(opened,closed,'legacy one-page wrapper closes rather than leaking continuation');
  const pages=[];let previous=visited;
  for await(const page of helper.purgeMediaObjectPages(f.root,{expiredAt:new Date('2026-10-03T00:00:00.000Z'),limit:1})){
   assert.ok(visited-previous<=73);previous=visited;pages.push(page);
  }
  assert.ok(pages.length>=3);assert.equal(pages.at(-1).status,'purged');assert.equal(pages.reduce((sum,page)=>sum+page.filesRemoved,0),1);assert.equal(opened,closed);
 }finally{fsp.opendir=original;}
});
test('paged scope keeps unverifiable metadata pending across pages while cleaning later proven expiry',async()=>{
 const f=await fixture(),first=await f.upload(),second=await f.upload();
 await fsp.writeFile(f.files(first)[1],'synthetic interrupted metadata');
 assert.equal(typeof helper.purgeMediaObjectPages,'function');
 const pages=[];for await(const page of helper.purgeMediaObjectPages(f.root,{expiredAt:new Date('2026-10-03T00:00:00.000Z'),limit:1}))pages.push(page);
 assert.equal(pages.at(-1).status,'pending');assert.equal(pages.at(-1).reason,'unverifiable-metadata');
 assert.equal(pages.reduce((sum,page)=>sum+page.filesRemoved,0),1);
 for(const file of f.files(first))assert.equal(fs.existsSync(file),true);
 for(const file of f.files(second))assert.equal(fs.existsSync(file),false);
});
test('expiry pages preserve an active or unknown owner lease and still inspect unrelated expired owners',async()=>{
 const f=await fixture(),own=await f.upload(),other=await f.upload('owner-b');
 const lease=await helper.beginMediaUploadLease(f.root,own.metadata);
 await fsp.writeFile(lease.leasePath,'synthetic unknown lease');
 assert.equal(typeof helper.purgeMediaObjectPages,'function');
 const pages=[];for await(const page of helper.purgeMediaObjectPages(f.root,{expiredAt:new Date('2026-10-03T00:00:00.000Z'),limit:1}))pages.push(page);
 assert.equal(pages.at(-1).status,'pending');assert.equal(pages.at(-1).reason,'uploads-active');
 assert.equal(pages.reduce((sum,page)=>sum+page.filesRemoved,0),1);
 for(const file of f.files(own))assert.equal(fs.existsSync(file),true);
 for(const file of f.files(other))assert.equal(fs.existsSync(file),false);
 assert.equal(fs.existsSync(lease.leasePath),true);
});

async function stoppedPartialMetadataUpload(f) {
 const {fork}=require('node:child_process');
 const child=fork(path.join(workerDirectory,'mediaOwnerErasurePartialUploadWorker.cjs'),[],{cwd:checkout,env:{PATH:process.env.PATH,HK_MATH_DB_PATH:process.env.HK_MATH_DB_PATH,MAIS_STORAGE_PROVIDER:'sqlite'},stdio:['ignore','ignore','pipe','ipc']});
 let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});let timeout;
 const boundary=new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(new Error(`Synthetic partial upload did not pause: ${stderr}`)),15000);child.once('message',resolve);child.once('error',reject);});
 child.send({ownerId:'owner-a',capability:'assignment-image',dataUrl:`data:image/png;base64,${png.toString('base64')}`,env:f.env,now:now.toISOString()});
 try{
  const paused=await boundary;assert.equal(paused.event,'partial-metadata-durable');assert.equal(paused.pid,child.pid);assert.ok(paused.metadataPath.startsWith(f.root+path.sep));
  const stopped=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
  child.kill('SIGTERM');assert.equal((await stopped).signal,'SIGTERM');
  const ownerHash=helper.mediaOwnerHash('owner-a'),directory=path.join(f.root,'.upload-leases',ownerHash);
  const filenames=(await fsp.readdir(directory)).filter(name=>name.endsWith('.json'));assert.equal(filenames.length,1);
  const leasePath=path.join(directory,filenames[0]),metadata=JSON.parse(await fsp.readFile(leasePath,'utf8'));
  assert.ok(helper.canonicalMediaProof(metadata,metadata.objectKey));
  return {leasePath,leaseId:path.basename(leasePath,'.json'),metadata,metadataPath:paused.metadataPath};
 }finally{clearTimeout(timeout);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');}
}
test('verified stopped upload with partial regular metadata recovers after canonical committed erasure',async()=>{
 const f=await fixture(),other=await f.upload('owner-b'),partial=await stoppedPartialMetadataUpload(f);
 const deleted=await f.deleteAccount('owner-a');assert.equal(deleted.status,'deleted');assert.equal(deleted.mediaPurge.reason,'uploads-active');
 await helper.recoverStoppedMediaUpload(f.root,partial.metadata.ownerHash,partial.leaseId,true);
 assert.equal(fs.existsSync(partial.leasePath),false);assert.equal(fs.existsSync(partial.metadataPath),false);assert.equal(fs.existsSync(partial.metadataPath.slice(0,-5)+'.bin'),false);
 assert.equal((await f.deleteAccount('owner-a')).mediaPurge.status,'purged');
 for(const file of f.files(other))assert.equal(fs.existsSync(file),true);
});
test('partial metadata recovery still requires explicit stop and a valid committed owner marker',async()=>{
 for(const state of ['absent','admitted','malformed','committed-false-stop']){
  const f=await fixture(),own=await f.upload(),lease=await helper.beginMediaUploadLease(f.root,own.metadata);
  await fsp.writeFile(f.files(own)[1],'{"version":');
  if(state!=='absent'){
   const admission=await helper.admitMediaOwnerErasure(f.root,f.account);
   if(state==='malformed')await fsp.writeFile(path.join(f.root,'.owner-erasure',admission.ownerHash+'.json'),'synthetic invalid marker');
   if(state==='committed-false-stop')await helper.commitMediaOwnerErasure(f.root,admission);
  }
  await assert.rejects(helper.recoverStoppedMediaUpload(f.root,own.metadata.ownerHash,path.basename(lease.leasePath,'.json'),state!=='committed-false-stop'));
  assert.equal(fs.existsSync(lease.leasePath),true);for(const file of f.files(own))assert.equal(fs.existsSync(file),true);
 }
});
test('stopped recovery cannot borrow missing, malformed or foreign canonical lease ownership',async()=>{
 for(const state of ['missing','malformed','foreign']){
  const f=await fixture(),own=await f.upload(),lease=await helper.beginMediaUploadLease(f.root,own.metadata);
  await fsp.writeFile(f.files(own)[1],'{"version":');
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account);await helper.commitMediaOwnerErasure(f.root,admission);
  if(state==='missing')await fsp.unlink(lease.leasePath);
  if(state==='malformed')await fsp.writeFile(lease.leasePath,'synthetic malformed lease');
  if(state==='foreign')await fsp.writeFile(lease.leasePath,JSON.stringify({...own.metadata,ownerHash:helper.mediaOwnerHash('owner-b')}));
  await assert.rejects(helper.recoverStoppedMediaUpload(f.root,own.metadata.ownerHash,path.basename(lease.leasePath,'.json'),true));
  for(const file of f.files(own))assert.equal(fs.existsSync(file),true);
  if(state!=='missing')assert.equal(fs.existsSync(lease.leasePath),true);
 }
});
test('valid contradictory or unverifiable JSON metadata cannot be erased using a stopped lease',async()=>{
 for(const state of ['fullhash','object-key','capability','unverifiable']){
  const f=await fixture(),own=await f.upload(),lease=await helper.beginMediaUploadLease(f.root,own.metadata);
  const value={...own.metadata};
  if(state==='fullhash')value.ownerHash=own.metadata.ownerHash.slice(0,16)+(own.metadata.ownerHash.slice(16)==='f'.repeat(48)?'e':'f').repeat(48);
  if(state==='object-key')value.objectKey=value.objectKey.split('/').slice(0,-1).concat(require('node:crypto').randomUUID()).join('/');
  if(state==='capability')value.capability='profile-avatar';
  const text=JSON.stringify(state==='unverifiable'?{version:1}:value);await fsp.writeFile(f.files(own)[1],text);
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account);await helper.commitMediaOwnerErasure(f.root,admission);
  await assert.rejects(helper.recoverStoppedMediaUpload(f.root,own.metadata.ownerHash,path.basename(lease.leasePath,'.json'),true));
  assert.equal(fs.existsSync(lease.leasePath),true);assert.equal(await fsp.readFile(f.files(own)[1],'utf8'),text);assert.equal(fs.existsSync(f.files(own)[0]),true);
 }
});
test('stopped recovery rejects symlink metadata and symlink canonical parents without touching targets',async()=>{
 for(const state of ['metadata','parent']){
  const f=await fixture(),own=await f.upload(),lease=await helper.beginMediaUploadLease(f.root,own.metadata);
  const admission=await helper.admitMediaOwnerErasure(f.root,f.account);await helper.commitMediaOwnerErasure(f.root,admission);
  const target=path.join(evidence,'synthetic',`recovery-preserved-${process.pid}-${sequence}`);
  if(state==='metadata'){await fsp.rename(f.files(own)[1],target);await fsp.symlink(target,f.files(own)[1]);}
  else{const directory=path.dirname(f.files(own)[1]);await fsp.rename(directory,target);await fsp.symlink(target,directory,'dir');}
  await assert.rejects(helper.recoverStoppedMediaUpload(f.root,own.metadata.ownerHash,path.basename(lease.leasePath,'.json'),true));
  assert.equal(fs.existsSync(lease.leasePath),true);assert.equal(fs.existsSync(target),true);assert.equal(fs.existsSync(f.files(own)[0]),true);
 }
});
test('ordinary canonical cleanup still rejects partial JSON and failed stopped cleanup keeps its durable lease',async()=>{
 const f=await fixture(),own=await f.upload(),lease=await helper.beginMediaUploadLease(f.root,own.metadata);
 await fsp.writeFile(f.files(own)[1],'{"version":');
 await assert.rejects(helper.removeCanonicalMediaPair(f.root,own.metadata),SyntaxError);
 const admission=await helper.admitMediaOwnerErasure(f.root,f.account);await helper.commitMediaOwnerErasure(f.root,admission);
 const original=fsp.unlink;fsp.unlink=async function(file){if(String(file)===f.files(own)[0])throw Object.assign(new Error('Synthetic unlink denial'),{code:'EACCES'});return original.call(this,file);};
 try{await assert.rejects(helper.recoverStoppedMediaUpload(f.root,own.metadata.ownerHash,path.basename(lease.leasePath,'.json'),true),/Synthetic unlink/);}
 finally{fsp.unlink=original;}
 assert.equal(fs.existsSync(lease.leasePath),true);for(const file of f.files(own))assert.equal(fs.existsSync(file),true);
 await helper.recoverStoppedMediaUpload(f.root,own.metadata.ownerHash,path.basename(lease.leasePath,'.json'),true);assert.equal(fs.existsSync(lease.leasePath),false);
});
