import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireCmsAuth } from '../_lib/auth.js';
import {
  deleteCurriculo,
  updateCurriculo,
} from '../_lib/curriculo.js';
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
      const result = await updateCurriculo(id, {
        componente: String(body.componente ?? ''),
        id_habilidade: String(body.id_habilidade ?? ''),
        texto: body.texto == null ? null : String(body.texto),
      });

      return sendJson(response, {
        ok: true,
        ...result,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao atualizar habilidade.';
      return sendBadRequest(response, message);
    }
  }

  if (request.method === 'DELETE') {
    try {
      const result = await deleteCurriculo(id);
      return sendJson(response, {
        ok: true,
        ...result,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao excluir habilidade.';
      return sendBadRequest(response, message);
    }
  }

  return sendMethodNotAllowed(response, ['PATCH', 'DELETE']);
}
