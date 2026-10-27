import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { requestMutationActor, runCredentialMutation } from '@/lib/server/requestMutationActor';

test('HTTP mutation evidence binds signed role, generation, revision and expiry without trusting body identity',async()=>{
  const generation='00000000-0000-4000-8000-000000000001';
  const token=await createSessionToken({userId:'synthetic-owner',sessionRevision:7,accountGeneration:generation,accountRole:'student'});
  const actor=await requestMutationActor(async()=>new Headers({cookie:`${SESSION_COOKIE_NAME}=${token}`}));
  assert.equal(actor?.userId,'synthetic-owner');assert.equal(actor?.sessionRevision,7);assert.equal(actor?.generation,generation);assert.equal(actor?.role,'student');
  assert.ok(actor!.expiresAt>Date.now());
});

test('expired or incomplete cookies cannot become an unbound HTTP mutation',async()=>{
  const token=await createSessionToken({userId:'synthetic-owner',sessionRevision:1});
  await assert.rejects(requestMutationActor(async()=>new Headers({cookie:`${SESSION_COOKIE_NAME}=${token}`})),/authority-actor-rejected/);
  const expired=await createSessionToken({userId:'synthetic-owner',sessionRevision:1,accountGeneration:'00000000-0000-4000-8000-000000000001',accountRole:'student',now:Date.now()-8*24*60*60*1000});
  await assert.rejects(requestMutationActor(async()=>new Headers({cookie:`${SESSION_COOKIE_NAME}=${expired}`})),/authority-actor-rejected/);
  assert.equal(await runCredentialMutation(()=>requestMutationActor(async()=>new Headers({cookie:`${SESSION_COOKIE_NAME}=${expired}`}))),undefined);
});

test('only a missing HTTP scope is treated as a direct server operation; header failures propagate',async()=>{
  assert.equal(await requestMutationActor(async()=>{throw new Error('headers was called outside a request scope');}),undefined);
  await assert.rejects(requestMutationActor(async()=>{throw new Error('unrelated-header-failure');}),/unrelated-header-failure/);
});
