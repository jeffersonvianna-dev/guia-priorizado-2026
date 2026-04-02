import {
  HABILIDADE_CASCADE_TARGETS,
  buildRemoveCascadePatches,
  buildRenameCascadePatches,
  getCurriculoSegmentoFromCodigo,
  normalizeHabilidadeCode,
  splitHabilidadeCodes,
  type CascadePatch,
  type CascadeRecord,
  type CurriculoPaulistaRow,
} from '@guia-priorizado/core';

import { getAdminClient } from './supabase-admin.js';

export interface CurriculoPayload {
  componente: string;
  id_habilidade: string;
  texto?: string | null;
}

export function normalizeCurriculoPayload(payload: CurriculoPayload) {
  const id_habilidade = normalizeHabilidadeCode(payload.id_habilidade);
  const componente = payload.componente.trim();
  const texto = payload.texto?.trim() || 'preencher habilidade';
  const segmento = getCurriculoSegmentoFromCodigo(id_habilidade);

  if (!componente || !id_habilidade) {
    throw new Error('Componente e código são obrigatórios.');
  }

  if (!segmento) {
    throw new Error('Código de habilidade inválido para o Currículo Paulista.');
  }

  return {
    componente,
    id_habilidade,
    texto,
    segmento,
  };
}

export async function listCurriculo(filters?: {
  segmento?: string;
  componente?: string;
}) {
  const client = getAdminClient();
  let query = client
    .from('curriculo_paulista')
    .select('id, id_habilidade, componente, segmento, serie, texto')
    .order('componente')
    .order('id_habilidade');

  if (filters?.segmento) {
    query = query.eq('segmento', filters.segmento);
  }

  if (filters?.componente) {
    query = query.eq('componente', filters.componente);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as CurriculoPaulistaRow[];
}

export async function getCurriculoById(id: number) {
  const client = getAdminClient();
  const { data, error } = await client
    .from('curriculo_paulista')
    .select('id, id_habilidade, componente, segmento, serie, texto')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CurriculoPaulistaRow | null) ?? null;
}

export async function curriculoCodeExists(code: string, excludeId?: number) {
  const client = getAdminClient();
  const normalizedCode = normalizeHabilidadeCode(code);
  const { data, error } = await client
    .from('curriculo_paulista')
    .select('id')
    .eq('id_habilidade', normalizedCode);

  if (error) {
    throw error;
  }

  return (data ?? []).some((row) => Number(row.id) !== excludeId);
}

export async function createCurriculo(payload: CurriculoPayload) {
  const client = getAdminClient();
  const normalized = normalizeCurriculoPayload(payload);

  if (await curriculoCodeExists(normalized.id_habilidade)) {
    throw new Error(`Código "${normalized.id_habilidade}" já existe no Currículo Paulista.`);
  }

  const { data: lastRow, error: lastRowError } = await client
    .from('curriculo_paulista')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRowError) {
    throw lastRowError;
  }

  const nextId = Number(lastRow?.id ?? 0) + 1;

  const { data, error } = await client
    .from('curriculo_paulista')
    .insert({
      id: nextId,
      ...normalized,
    })
    .select('id, id_habilidade, componente, segmento, serie, texto')
    .single();

  if (error) {
    throw error;
  }

  return data as CurriculoPaulistaRow;
}

async function loadCascadeRows(oldCode: string) {
  const client = getAdminClient();
  const rowsByTarget = new Map<string, CascadeRecord[]>();

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

    rowsByTarget.set(`${target.table}:${target.field}`, matchingRows);
  }

  return rowsByTarget;
}

async function applyCascadePatches(patches: CascadePatch[]) {
  if (patches.length === 0) {
    return;
  }

  const client = getAdminClient();

  for (const patch of patches) {
    const { error } = await client
      .from(patch.table)
      .update({ [patch.field]: patch.nextValue })
      .eq('id', patch.id);

    if (error) {
      throw error;
    }
  }
}

export async function updateCurriculo(id: number, payload: CurriculoPayload) {
  const client = getAdminClient();
  const current = await getCurriculoById(id);

  if (!current) {
    throw new Error('Registro de Currículo Paulista não encontrado.');
  }

  const normalized = normalizeCurriculoPayload(payload);
  const oldCode = normalizeHabilidadeCode(current.id_habilidade);
  const codeChanged = oldCode !== normalized.id_habilidade;

  if (codeChanged && (await curriculoCodeExists(normalized.id_habilidade, id))) {
    throw new Error(`Código "${normalized.id_habilidade}" já existe no Currículo Paulista.`);
  }

  const rowsByTarget = codeChanged ? await loadCascadeRows(oldCode) : null;

  const { data, error } = await client
    .from('curriculo_paulista')
    .update(normalized)
    .eq('id', id)
    .select('id, id_habilidade, componente, segmento, serie, texto')
    .single();

  if (error) {
    throw error;
  }

  if (codeChanged && rowsByTarget) {
    const patches = HABILIDADE_CASCADE_TARGETS.flatMap((target) =>
      buildRenameCascadePatches(
        target,
        rowsByTarget.get(`${target.table}:${target.field}`) ?? [],
        oldCode,
        normalized.id_habilidade,
      ),
    );

    await applyCascadePatches(patches);
  }

  return {
    row: data as CurriculoPaulistaRow,
    codeChanged,
  };
}

export async function deleteCurriculo(id: number) {
  const client = getAdminClient();
  const current = await getCurriculoById(id);

  if (!current) {
    throw new Error('Registro de Currículo Paulista não encontrado.');
  }

  const oldCode = normalizeHabilidadeCode(current.id_habilidade);
  const rowsByTarget = await loadCascadeRows(oldCode);
  const patches = HABILIDADE_CASCADE_TARGETS.flatMap((target) =>
    buildRemoveCascadePatches(
      target,
      rowsByTarget.get(`${target.table}:${target.field}`) ?? [],
      oldCode,
    ),
  );

  if (patches.length > 0) {
    await applyCascadePatches(patches);
  }

  const { error } = await client.from('curriculo_paulista').delete().eq('id', id);

  if (error) {
    throw error;
  }

  return {
    row: current,
    removedReferences: patches.length,
  };
}
