import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSessionToken } from './session.js';
import { getUserFromToken, type OpsUser } from './supabase.js';
import { logWarn } from '../lib/logger.js';

/**
 * Verifica se a requisicao possui sessao valida.
 * Retorna o OpsUser autenticado ou null se invalido/expirado.
 */
export async function requireAuth(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<OpsUser | null> {
  const token = getSessionToken(req);
  if (!token) {
    logWarn('auth.missing_session', {
      method: req.method,
      path: req.url,
      reason: 'missing_session_cookie',
    });
    redirectToLogin(res);
    return null;
  }

  const user = await getUserFromToken(token);
  if (!user) {
    logWarn('auth.invalid_session', {
      method: req.method,
      path: req.url,
      reason: 'invalid_or_unauthorized_session',
    });
    redirectToLogin(res);
    return null;
  }

  return user;
}

function redirectToLogin(res: ServerResponse): void {
  res.writeHead(302, { Location: '/login' });
  res.end();
}
