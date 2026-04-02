import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireCmsAuth } from '../_lib/auth.js';
import { deleteAe, updateAe } from '../_lib/ae.js';
import {
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
} from '../_lib/http.js';

function parseId(rawId: string | string[] | undefined) {
  const value = Array.isArray(rawId) ? rawId[0] : rawId;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (!requireCmsAuth(request, response)) {
    return;
  }

  const id = parseId(request.query.id);

  if (!id) {
    return sendBadRequest(response, 'ID inválido.');
  }

  if (request.method === 'PATCH') {
    const body = request.body as Record<string, unknown>;

    if (!body || typeof body !== 'object') {
      return sendBadRequest(response, 'Body inválido.');
    }

    try {
      const row = await updateAe(id, {
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

      return sendJson(response, {
        ok: true,
        row,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar AE.';
      return sendBadRequest(response, message);
    }
  }

  if (request.method === 'DELETE') {
    const serie =
      typeof request.query.serie === 'string'
        ? request.query.serie
        : typeof request.body?.serie === 'string'
          ? request.body.serie
          : '';

    if (!serie) {
      return sendBadRequest(response, 'Informe a série para excluir a AE.');
    }

    try {
      const row = await deleteAe(serie, id);
      return sendJson(response, {
        ok: true,
        row,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao excluir AE.';
      return sendBadRequest(response, message);
    }
  }

  return sendMethodNotAllowed(response, ['PATCH', 'DELETE']);
}
