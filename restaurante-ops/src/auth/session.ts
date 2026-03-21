import { parse, serialize } from 'cookie';
import type { IncomingMessage, ServerResponse } from 'node:http';

const COOKIE_NAME = 'ops_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

export function setSessionCookie(res: ServerResponse, token: string): void {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.OPS_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE_SECONDS,
      path: '/',
    }),
  );
}

export function clearSessionCookie(res: ServerResponse): void {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.OPS_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    }),
  );
}

export function getSessionToken(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = parse(cookieHeader);
  return cookies[COOKIE_NAME] ?? null;
}
