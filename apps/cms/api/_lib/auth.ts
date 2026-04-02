import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

const COOKIE_NAME = 'cms_session';
const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

function getRequiredEnv(name: 'CMS_ADMIN_PASSWORD' | 'CMS_SESSION_SECRET') {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured for CMS auth.`);
  }
  return value.trim();
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf-8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf-8');
}

function sign(payload: string) {
  const secret = getRequiredEnv('CMS_SESSION_SECRET');
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function parseCookies(cookieHeader: string | undefined) {
  const result = new Map<string, string>();
  if (!cookieHeader) {
    return result;
  }

  for (const chunk of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = chunk.trim().split('=');
    if (!rawName) {
      continue;
    }
    result.set(rawName, rawValue.join('='));
  }

  return result;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function buildToken() {
  const now = Date.now();
  const payload = base64UrlEncode(
    JSON.stringify({
      iat: now,
      exp: now + ONE_WEEK_MS,
    }),
  );

  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return false;
  }

  if (!safeEqual(sign(payload), signature)) {
    return false;
  }

  try {
    const data = JSON.parse(base64UrlDecode(payload)) as { exp?: number };
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function setSessionCookie(response: VercelResponse) {
  const token = buildToken();
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(
      ONE_WEEK_MS / 1000,
    )}`,
  );
}

export function clearSessionCookie(response: VercelResponse) {
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  );
}

export function isAuthenticated(request: VercelRequest) {
  const cookies = parseCookies(request.headers.cookie);
  return verifyToken(cookies.get(COOKIE_NAME));
}

export function authenticatePassword(password: string) {
  const expected = getRequiredEnv('CMS_ADMIN_PASSWORD');
  return safeEqual(password, expected);
}

export function requireCmsAuth(request: VercelRequest, response: VercelResponse) {
  if (isAuthenticated(request)) {
    return true;
  }

  response.status(401).json({
    ok: false,
    error: 'Sessão expirada ou acesso não autorizado.',
  });
  return false;
}
