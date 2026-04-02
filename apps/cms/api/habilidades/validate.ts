import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireCmsAuth } from '../_lib/auth.js';
import {
  findMissingHabilidades,
  normalizeHabilidadeCode,
} from '@guia-priorizado/core';
import {
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from '../_lib/http.js';
import { getCurriculoByCodes } from '../_lib/supabase-admin.js';

interface ValidatePayload {
  codes?: string[];
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (!requireCmsAuth(request, response)) {
    return;
  }

  if (request.method !== 'POST') {
    return sendMethodNotAllowed(response, ['POST']);
  }

  const payload = (request.body ?? {}) as ValidatePayload;
  const normalizedCodes = Array.from(
    new Set((payload.codes ?? []).map((item) => normalizeHabilidadeCode(item)).filter(Boolean)),
  );

  if (normalizedCodes.length === 0) {
    return sendBadRequest(response, 'Informe pelo menos um código de habilidade.');
  }

  try {
    const curriculoRows = await getCurriculoByCodes(normalizedCodes);
    const missingCodes = findMissingHabilidades(
      normalizedCodes,
      curriculoRows.map((row) => row.id_habilidade),
    );

    return sendJson(response, {
      ok: true,
      requestedCodes: normalizedCodes,
      validCodes: normalizedCodes.filter((code) => !missingCodes.includes(code)),
      missingCodes,
      matches: curriculoRows.map((row) => ({
        id: row.id,
        id_habilidade: row.id_habilidade,
        componente: row.componente,
        segmento: row.segmento,
        serie: row.serie,
        texto: row.texto,
      })),
    });
  } catch (error) {
    return sendServerError(
      response,
      error instanceof Error ? error.message : 'Erro ao validar habilidades.',
    );
  }
}
