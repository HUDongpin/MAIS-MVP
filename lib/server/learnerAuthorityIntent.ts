import { createHmac, timingSafeEqual } from 'node:crypto';
import { LearnerAuthorityError } from './learnerAuthorityState';

type AuthorityIntent={userId:string;sessionRevision:number;generation:string;resetEpoch:number;publicationId:string;definitionEpoch:number;expiresAt:number};
function secret(){
  const value=process.env.AUTH_SESSION_SECRET??process.env.NEXTAUTH_SECRET;
  if(value)return value;
  if(process.env.NODE_ENV==='production')throw new LearnerAuthorityError('authority-session-service-unavailable');
  return 'hk-math-lab-local-development-secret';
}
function signature(body:string){return createHmac('sha256',secret()).update(`mais:lesson-intent:v1:${body}`).digest('base64url');}
export function issueLearnerAuthorityIntent(identity:Omit<AuthorityIntent,'expiresAt'>,now=Date.now()){
  const data={...identity,expiresAt:now+120_000};
  const body=Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${body}.${signature(body)}`;
}
export function readLearnerAuthorityIntent(token:unknown,actor:{userId:string;sessionRevision:number},now=Date.now()):AuthorityIntent{
  const reject=():never=>{throw new LearnerAuthorityError('authority-intent-invalid',409);};
  if(typeof token!=='string'||token.length>2048)return reject();
  const parts=token.split('.');if(parts.length!==2)return reject();
  const expected=Buffer.from(signature(parts[0])),actual=Buffer.from(parts[1]);
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return reject();
  let value:AuthorityIntent;
  try{value=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));}catch{return reject();}
  if(!value||value.userId!==actor.userId||value.sessionRevision!==actor.sessionRevision
    ||typeof value.generation!=='string'||!/^[0-9a-f-]{36}$/.test(value.generation)
    ||typeof value.publicationId!=='string'||!/^[0-9a-f-]{36}$/.test(value.publicationId)
    ||!Number.isSafeInteger(value.definitionEpoch)||value.definitionEpoch<0
    ||!Number.isSafeInteger(value.resetEpoch)||value.resetEpoch<0||!Number.isSafeInteger(value.expiresAt)
    ||value.expiresAt<now||value.expiresAt>now+120_000)return reject();
  return value;
}
