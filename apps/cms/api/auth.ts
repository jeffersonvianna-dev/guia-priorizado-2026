import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  authenticatePassword,
  clearSessionCookie,
  isAuthenticated,
  setSessionCookie,
} from './_lib/auth.js';
import {
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
} from './_lib/http.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method === 'GET') {
    return sendJson(response, {
      ok: true,
      authenticated: isAuthenticated(request),
    });
  }

  if (request.method === 'POST') {
    const body = request.body as Record<string, unknown>;
    const action = typeof body?.action === 'string' ? body.action : '';

    if (action === 'login') {
      const password = typeof body?.password === 'string' ? body.password : '';

      if (!password) {
        return sendBadRequest(response, 'Informe a senha do CMS.');
      }

      if (!authenticatePassword(password)) {
        return sendBadRequest(response, 'Senha inválida.');
      }

      setSessionCookie(response);
      return sendJson(response, {
        ok: true,
        authenticated: true,
      });
    }

    if (action === 'logout') {
      clearSessionCookie(response);
      return sendJson(response, {
        ok: true,
        authenticated: false,
      });
    }

    return sendBadRequest(response, 'Ação de autenticação inválida.');
  }

  return sendMethodNotAllowed(response, ['GET', 'POST']);
}
