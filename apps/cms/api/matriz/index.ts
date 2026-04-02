import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireCmsAuth } from '../_lib/auth.js';
import { createMatriz, listMatriz } from '../_lib/matriz.js';
import {
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from '../_lib/http.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (!requireCmsAuth(request, response)) {
    return;
  }

  if (request.method === 'GET') {
    const serie = typeof request.query.serie === 'string' ? request.query.serie : '';

    if (!serie) {
      return sendBadRequest(response, 'Informe a série.');
    }

    try {
      const rows = await listMatriz({
        serie,
        componente:
          typeof request.query.componente === 'string' ? request.query.componente : undefined,
        ae: typeof request.query.ae === 'string' ? request.query.ae : undefined,
      });

      return sendJson(response, {
        ok: true,
        rows,
      });
    } catch (error) {
      return sendServerError(
        response,
        error instanceof Error ? error.message : 'Erro ao listar a matriz.',
      );
    }
  }

  if (request.method === 'POST') {
    const body = request.body as Record<string, unknown>;

    if (!body || typeof body !== 'object') {
      return sendBadRequest(response, 'Body inválido.');
    }

    try {
      const row = await createMatriz({
        serie: String(body.serie ?? ''),
        componente: String(body.componente ?? ''),
        ae: String(body.ae ?? ''),
        bimestre: String(body.bimestre ?? ''),
        grupo: String(body.grupo ?? ''),
        descritor: String(body.descritor ?? ''),
      });

      return sendJson(
        response,
        {
          ok: true,
          row,
        },
        201,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar descritor.';
      return sendBadRequest(response, message);
    }
  }

  return sendMethodNotAllowed(response, ['GET', 'POST']);
}
