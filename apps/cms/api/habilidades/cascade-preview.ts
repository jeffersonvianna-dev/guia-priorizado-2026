import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireCmsAuth } from '../_lib/auth.js';
import {
  HABILIDADE_CASCADE_TARGETS,
  buildRemoveCascadePatches,
  buildRenameCascadePatches,
  countCascadeReferences,
  findMissingHabilidades,
  normalizeHabilidadeCode,
  splitHabilidadeCodes,
  type CascadeCount,
  type CascadeRecord,
} from '@guia-priorizado/core';
import {
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
} from '../_lib/http.js';
import { getCurriculoByCodes, getAdminClient } from '../_lib/supabase-admin.js';

type CascadeAction = 'rename' | 'delete';

interface CascadePreviewPayload {
  action?: CascadeAction;
  oldCode?: string;
  newCode?: string;
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

  const payload = (request.body ?? {}) as CascadePreviewPayload;
  const action = payload.action;
  const oldCode = normalizeHabilidadeCode(payload.oldCode ?? '');
  const newCode = normalizeHabilidadeCode(payload.newCode ?? '');

  if (action !== 'rename' && action !== 'delete') {
    return sendBadRequest(response, 'Use action igual a "rename" ou "delete".');
  }

  if (!oldCode) {
    return sendBadRequest(response, 'Informe oldCode.');
  }

  if (action === 'rename' && !newCode) {
    return sendBadRequest(response, 'Informe newCode para renomeação.');
  }

  try {
    const curriculoRows = await getCurriculoByCodes(
      action === 'rename' ? [oldCode, newCode] : [oldCode],
    );

    const missingCodes = findMissingHabilidades(
      action === 'rename' ? [oldCode, newCode] : [oldCode],
      curriculoRows.map((row) => row.id_habilidade),
    );

    if (missingCodes.includes(oldCode)) {
      return sendBadRequest(
        response,
        `A habilidade ${oldCode} não existe em curriculo_paulista.`,
      );
    }

    if (action === 'rename' && missingCodes.includes(newCode)) {
      return sendBadRequest(
        response,
        `A habilidade ${newCode} não existe em curriculo_paulista.`,
      );
    }

    const client = getAdminClient();
    const counts: CascadeCount[] = [];
    const patchesByTarget = [];

    for (const target of HABILIDADE_CASCADE_TARGETS) {
      const { data, error } = await client
        .from(target.table)
        .select(`id, ${target.field}`)
        .not(target.field, 'is', null);

      if (error) {
        throw error;
      }

      const matchingRows = ((data ?? []) as Array<Record<string, string | number | null>>)
        .map((row) => ({
          id: Number(row.id),
          value: (row[target.field] as string | null) ?? null,
        }) satisfies CascadeRecord)
        .filter((row) => splitHabilidadeCodes(row.value).includes(oldCode));

      const patches =
        action === 'rename'
          ? buildRenameCascadePatches(target, matchingRows, oldCode, newCode)
          : buildRemoveCascadePatches(target, matchingRows, oldCode);

      counts.push({
        table: target.table,
        field: target.field,
        count: patches.length,
      });

      if (patches.length > 0) {
        patchesByTarget.push({
          table: target.table,
          field: target.field,
          affectedRows: patches.length,
          samples: patches.slice(0, 5),
        });
      }
    }

    return sendJson(response, {
      ok: true,
      action,
      oldCode,
      newCode: action === 'rename' ? newCode : null,
      totalReferences: countCascadeReferences(counts),
      counts,
      patchesPreview: patchesByTarget,
    });
  } catch (error) {
    return sendServerError(
      response,
      error instanceof Error ? error.message : 'Erro ao montar preview de cascade.',
    );
  }
}
