import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireCmsAuth } from '../_lib/auth.js';
import { createAe, listAe } from '../_lib/ae.js';
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
      const rows = await listAe({
        serie,
        componente:
          typeof request.query.componente === 'string' ? request.query.componente : undefined,
        bimestre: typeof request.query.bimestre === 'string' ? request.query.bimestre : undefined,
      });

      return sendJson(response, {
        ok: true,
        rows,
      });
    } catch (error) {
      return sendServerError(
        response,
        error instanceof Error ? error.message : 'Erro ao listar AEs.',
      );
    }
  }

  if (request.method === 'POST') {
    const body = request.body as Record<string, unknown>;

    if (!body || typeof body !== 'object') {
      return sendBadRequest(response, 'Body inválido.');
    }

    try {
      const row = await createAe({
        serie: String(body.serie ?? ''),
        componente: String(body.componente ?? ''),
        bimestre: String(body.bimestre ?? ''),
        ae: String(body.ae ?? ''),
        titulo: String(body.titulo ?? ''),
        hab_priorizada: String(body.hab_priorizada ?? ''),
        hab_relacionadas: body.hab_relacionadas == null ? null : String(body.hab_relacionadas),
        conhecimentos_previos:
          body.conhecimentos_previos == null ? null : String(body.conhecimentos_previos),
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
      const message = error instanceof Error ? error.message : 'Erro ao criar AE.';
      return sendBadRequest(response, message);
    }
  }

  return sendMethodNotAllowed(response, ['GET', 'POST']);
}
