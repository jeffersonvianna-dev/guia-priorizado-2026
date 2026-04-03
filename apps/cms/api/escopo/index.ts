import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireCmsAuth } from '../_lib/auth.js';
import { createEscopo, listEscopo } from '../_lib/escopo.js';
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
      const rows = await listEscopo({
        serie,
        componente:
          typeof request.query.componente === 'string' ? request.query.componente : undefined,
        bimestre:
          typeof request.query.bimestre === 'string' ? request.query.bimestre : undefined,
      });

      return sendJson(response, {
        ok: true,
        rows,
      });
    } catch (error) {
      return sendServerError(
        response,
        error instanceof Error ? error.message : 'Erro ao listar o escopo.',
      );
    }
  }

  if (request.method === 'POST') {
    const body = request.body as Record<string, unknown>;

    if (!body || typeof body !== 'object') {
      return sendBadRequest(response, 'Body inválido.');
    }

    try {
      const row = await createEscopo({
        serie: String(body.serie ?? ''),
        componente: String(body.componente ?? ''),
        bimestre: String(body.bimestre ?? ''),
        aula: String(body.aula ?? ''),
        titulo: String(body.titulo ?? ''),
        unidade_tematica:
          body.unidade_tematica == null ? null : String(body.unidade_tematica),
        habilidades: String(body.habilidades ?? ''),
        objeto: body.objeto == null ? null : String(body.objeto),
        conteudo: body.conteudo == null ? null : String(body.conteudo),
        objetivos: body.objetivos == null ? null : String(body.objetivos),
        descritivo: body.descritivo == null ? null : String(body.descritivo),
        referencias: body.referencias == null ? null : String(body.referencias),
        aprendizagem_essencial:
          body.aprendizagem_essencial == null
            ? null
            : String(body.aprendizagem_essencial),
        id_md: body.id_md == null ? null : String(body.id_md),
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
      const message = error instanceof Error ? error.message : 'Erro ao criar aula.';
      return sendBadRequest(response, message);
    }
  }

  return sendMethodNotAllowed(response, ['GET', 'POST']);
}
