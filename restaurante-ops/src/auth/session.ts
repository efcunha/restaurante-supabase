import { parse, serialize, type SerializeOptions } from 'cookie';
import type { IncomingMessage, ServerResponse } from 'node:http';

const COOKIE_NAME = 'ops_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas
const SESSION_EXPIRED_AT = new Date(0);

function buildCookieOptions(maxAge: number): SerializeOptions {
  const isProduction = process.env.OPS_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
    path: '/',
  };
}

export function setSessionCookie(res: ServerResponse, token: string): void {
  res.setHeader('Set-Cookie', serialize(COOKIE_NAME, token, buildCookieOptions(MAX_AGE_SECONDS)));
}

export function clearSessionCookie(res: ServerResponse): void {
  const options = buildCookieOptions(0);
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, '', {
      ...options,
      expires: SESSION_EXPIRED_AT,
    }),
  );
}

export function getSessionToken(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = parse(cookieHeader);
  return cookies[COOKIE_NAME] ?? null;
}
