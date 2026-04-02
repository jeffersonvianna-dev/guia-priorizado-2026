import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireCmsAuth } from '../_lib/auth.js';
import {
  createCurriculo,
  listCurriculo,
} from '../_lib/curriculo.js';
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
    try {
      const rows = await listCurriculo({
        segmento:
          typeof request.query.segmento === 'string' ? request.query.segmento : undefined,
        componente:
          typeof request.query.componente === 'string' ? request.query.componente : undefined,
      });

      return sendJson(response, {
        ok: true,
        rows,
      });
    } catch (error) {
      return sendServerError(
        response,
        error instanceof Error ? error.message : 'Erro ao listar currículo.',
      );
    }
  }

  if (request.method === 'POST') {
    const body = request.body as Record<string, unknown>;

    if (!body || typeof body !== 'object') {
      return sendBadRequest(response, 'Body inválido.');
    }

    try {
      const row = await createCurriculo({
        componente: String(body.componente ?? ''),
        id_habilidade: String(body.id_habilidade ?? ''),
        texto: body.texto == null ? null : String(body.texto),
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
      const message =
        error instanceof Error ? error.message : 'Erro ao criar habilidade.';
      return sendBadRequest(response, message);
    }
  }

  return sendMethodNotAllowed(response, ['GET', 'POST']);
}
