import { AsyncLocalStorage } from 'node:async_hooks';
import { headers } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { LearnerAuthorityError } from '@/lib/server/learnerAuthorityState';

const credentialMutation = new AsyncLocalStorage<boolean>();

/** Public credential flows authenticate their submitted credential/token instead
 * of any older browser cookie. This exemption never skips their own checks. */
export function runCredentialMutation<T>(operation: () => T): T {
  return credentialMutation.run(true, operation);
}

/** Only the erasure workflow's own admission/absence proof may enter recovery
 * after the request cookie's subject has already been deleted. */
export function runAccountErasureRecovery<T>(operation: () => T): T {
  return credentialMutation.run(true, operation);
}

export async function requestMutationActor(readHeaders: () => Promise<Pick<Headers, 'get'>> = headers) {
  if (credentialMutation.getStore()) return undefined;
  let incoming: Pick<Headers, 'get'>;
  try { incoming = await readHeaders(); }
  catch (error) {
    // Direct server jobs and native tests have no HTTP request; callers there
    // use their explicit command/actor contract. Other header failures reject.
    if (error instanceof Error && error.message.includes('outside a request scope')) return undefined;
    throw error;
  }
  const cookie = incoming.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!cookie) return undefined;
  let token: string;
  try { token = decodeURIComponent(cookie.slice(SESSION_COOKIE_NAME.length + 1)); }
  catch { throw new LearnerAuthorityError('authority-actor-rejected', 401); }
  const payload = await verifySessionToken(token);
  if (!payload?.ag || !payload.ar) throw new LearnerAuthorityError('authority-actor-rejected', 401);
  return { userId: payload.sub, sessionRevision: payload.sr, generation: payload.ag, role: payload.ar, expiresAt: payload.exp };
}
