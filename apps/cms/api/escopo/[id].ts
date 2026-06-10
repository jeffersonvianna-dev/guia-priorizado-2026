import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireCmsAuth } from '../_lib/auth.js';
import { deleteEscopo, updateEscopo } from '../_lib/escopo.js';
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

    const originalSerie =
      typeof body.originalSerie === 'string' && body.originalSerie.trim()
        ? body.originalSerie
        : typeof body.serie === 'string'
          ? body.serie
          : '';

    if (!originalSerie) {
      return sendBadRequest(response, 'Informe a série original para atualizar a aula.');
    }

    try {
      const row = await updateEscopo(id, originalSerie, {
        serie: String(body.serie ?? ''),
        componente: String(body.componente ?? ''),
        bimestre: String(body.bimestre ?? ''),
        aula: String(body.aula ?? ''),
        titulo: String(body.titulo ?? ''),
        unidade_tematica:
          body.unidade_tematica == null ? null : String(body.unidade_tematica),
        habilidades: String(body.habilidades ?? ''),
        conteudo: body.conteudo == null ? null : String(body.conteudo),
        objetivos: body.objetivos == null ? null : String(body.objetivos),
        aprendizagem_essencial:
          body.aprendizagem_essencial == null
            ? null
            : String(body.aprendizagem_essencial),
        id_md: body.id_md == null ? null : String(body.id_md),
      });

      return sendJson(response, {
        ok: true,
        row,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar aula.';
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
      return sendBadRequest(response, 'Informe a série para excluir a aula.');
    }

    try {
      const row = await deleteEscopo(serie, id);
      return sendJson(response, {
        ok: true,
        row,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao excluir aula.';
      return sendBadRequest(response, message);
    }
  }

  return sendMethodNotAllowed(response, ['PATCH', 'DELETE']);
}
