const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const test=require('node:test'),assert=require('node:assert/strict');
const {NextResponse}=require('next/server');
function fixture(overrides={}){
  let deletionCalls=[];
  const state={admin:true,authenticated:true,subject:{tables:{users:[{role:'student'}]}},marker:null,result:{status:'deleted',summary:{totalRemoved:5},mediaPurge:{status:'purged',filesRemoved:1,inspected:1}},...overrides};
  function load(relative){
    const filename=path.join(process.cwd(),relative),source=fs.readFileSync(filename,'utf8'),module={exports:{}};
    const code=ts.transpileModule(source,{fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
    vm.runInNewContext(code,{module,exports:module.exports,Date,Request,Response,require:name=>{
      if(name==='next/server')return{NextResponse};
      if(name==='@/lib/server/auth')return{
        requireAuthenticatedUser:async()=>state.authenticated?{user:{id:'owner-a',role:'student'}}:null,
        bodyExpectedUserConstraints:()=>['owner-a'],expectedUserConstraintsFromRequest:()=>['owner-a'],guardExpectedAuthenticatedUser:()=>null
      };
      if(name==='@/lib/server/authRouteGuards')return{withAuthRouteJsonBoundary:(_name,fn)=>fn()};
      if(name==='@/lib/server/sessionCookie')return{sessionCookieOptions:()=>({path:'/',maxAge:0,httpOnly:true,sameSite:'lax'})};
      if(name==='@/lib/session')return{SESSION_COOKIE_NAME:'mais_session'};
      if(name==='@/lib/server/learnerAuthorityState')return require(path.join(process.cwd(),'lib/server/learnerAuthorityState.ts'));
      if(name==='@/lib/server/userStore')return{
        withAuthenticatedMutation:async(_authenticated,operation)=>operation(),
        exportUserAccountData:async()=>state.subject,
        deleteUserAccount:async(...args)=>{deletionCalls.push(args);return state.result;}
      };
      if(name.endsWith('provisioning/_shared'))return{requireAdmin:async()=>state.admin?{user:{id:'synthetic-admin',role:'admin'}}:{response:NextResponse.json({error:'Admin required'},{status:403})}};
      if(name==='@/lib/server/mediaOwnerErasure')return{mediaStoreRoot:()=>'/synthetic-only',mediaOwnerHash:id=>`full-hash:${id}`,readMediaOwnerErasure:async()=>state.marker};
      throw new Error(`Unexpected mock import: ${name}`);
    }});
    return module.exports;
  }
  return{state,deletionCalls,self:load('app/api/me/account/route.ts'),admin:load('app/api/admin/learner-data/[userId]/route.ts')};
}
const request=(body={confirm:'DELETE',userId:'owner-a'})=>new Request('http://localhost/synthetic',{method:'DELETE',headers:{'Content-Type':'application/json','x-mais-expected-user-id':'owner-a'},body:JSON.stringify(body)});
const context={params:Promise.resolve({userId:'owner-a'})};
test('self complete erasure clears dead cookie and reports physical completion',async()=>{
  const f=fixture(),response=await f.self.DELETE(request()),body=await response.json();
  assert.equal(response.status,200);assert.equal(body.ok,true);assert.equal(body.accountDeleted,true);assert.equal(body.mediaPurgePending,false);
  assert.match(response.headers.get('set-cookie'),/mais_session=;/);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
});
test('self postcommit purge failure clears dead cookie and cannot report erasure success',async()=>{
  const f=fixture({result:{status:'deleted',summary:{totalRemoved:5},mediaPurge:{status:'pending',filesRemoved:0,inspected:0,reason:'filesystem-error'}}});
  const response=await f.self.DELETE(request()),body=await response.json();
  assert.equal(response.status,503);assert.equal(body.ok,false);assert.equal(body.accountDeleted,true);assert.equal(body.mediaPurgePending,true);assert.equal(body.code,'account-media-erasure-pending');
  assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
});
test('blocked self deletion keeps the active cookie and never claims account removal',async()=>{
  const f=fixture({result:{status:'blocked',blockers:[{reason:'synthetic-owned-class'}]}}),response=await f.self.DELETE(request());
  assert.equal(response.status,409);assert.equal(response.headers.get('set-cookie'),null);assert.equal((await response.json()).code,'deletion-blocked');
});
test('current admin exact learner retry accepts durable student marker after account erasure',async()=>{
  const f=fixture({subject:null,marker:{role:'student'}}),response=await f.admin.DELETE(request(),context);
  assert.equal(response.status,200);assert.equal((await response.json()).mediaPurgePending,false);assert.deepEqual(f.deletionCalls[0][0],'owner-a');assert.equal(f.deletionCalls[0][1].requireDeletedAccount,true);
  assert.equal(response.headers.get('set-cookie'),null);
});
test('admin postcommit purge failure reports deleted plus pending without clearing admin cookie',async()=>{
  const f=fixture({result:{status:'deleted',summary:{totalRemoved:5},mediaPurge:{status:'pending',filesRemoved:0,inspected:0}}}),response=await f.admin.DELETE(request(),context),body=await response.json();
  assert.equal(response.status,503);assert.equal(body.ok,false);assert.equal(body.accountDeleted,true);assert.equal(body.mediaPurgePending,true);assert.equal(response.headers.get('set-cookie'),null);
});
test('admin cleanup retry cannot target an unknown account without an erasure marker',async()=>{
  const f=fixture({subject:null}),response=await f.admin.DELETE(request(),context);assert.equal(response.status,404);assert.equal(f.deletionCalls.length,0);
});
test('admin may retry physical cleanup for any already-deleted account role',async()=>{
  for(const role of ['parent','teacher','admin']){
    const f=fixture({subject:null,marker:{role}}),response=await f.admin.DELETE(request(),context);
    assert.equal(response.status,200,role);assert.equal(f.deletionCalls.length,1);assert.equal(f.deletionCalls[0][1].requireDeletedAccount,true);
  }
});
test('exact confirmation and current admin authorization remain required for cleanup retry',async()=>{
  const f=fixture({subject:null,marker:{role:'student'}});
  assert.equal((await f.admin.DELETE(request({confirm:'DELETE',userId:'other'}),context)).status,400);assert.equal(f.deletionCalls.length,0);
  f.state.admin=false;assert.equal((await f.admin.DELETE(request(),context)).status,403);assert.equal(f.deletionCalls.length,0);
});
test('existing non-student account remains outside the learner deletion endpoint',async()=>{
  const f=fixture({subject:{tables:{users:[{role:'teacher'}]}}}),response=await f.admin.DELETE(request(),context);assert.equal(response.status,403);assert.equal(f.deletionCalls.length,0);
});
