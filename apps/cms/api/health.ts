import type { VercelRequest, VercelResponse } from '@vercel/node';

import { sendJson, sendMethodNotAllowed } from './_lib/http.js';

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    return sendMethodNotAllowed(response, ['GET']);
  }

  return sendJson(response, {
    ok: true,
    scope: 'cms-api',
    message: 'CMS backend base ready for auth and mutation routes.',
  });
}
