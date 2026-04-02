import {
  getEscopoTableName,
  getSerieColumn,
  isAfSerie,
  parseAeReferences,
  type EscopoAfRow,
  type EscopoEmRow,
} from '@guia-priorizado/core';
import { splitHabilidadeCodes } from '@guia-priorizado/core';

import { getCurriculoByCodes, getAdminClient } from './supabase-admin.js';

export interface EscopoPayload {
  serie: string;
  componente: string;
  bimestre: string;
  aula: number | string;
  titulo: string;
  unidade_tematica?: string | null;
  habilidades: string;
  objeto?: string | null;
  conteudo?: string | null;
  objetivos?: string | null;
  descritivo?: string | null;
  referencias?: string | null;
  aprendizagem_essencial?: string | null;
}

export type EscopoRow = EscopoAfRow | EscopoEmRow;

export function normalizeEscopoPayload(payload: EscopoPayload) {
  const serie = payload.serie.trim();
  const componente = payload.componente.trim();
  const bimestre = payload.bimestre.trim();
  const titulo = payload.titulo.trim();
  const aulaText = String(payload.aula ?? '').trim();
  const aula = Number(aulaText);
  const habilidades = splitHabilidadeCodes(payload.habilidades).join(' ');

  if (!serie || !componente || !bimestre || !titulo || !aulaText) {
    throw new Error('Série, componente, bimestre, aula e título são obrigatórios.');
  }

  if (!/^\d+$/.test(aulaText) || !Number.isFinite(aula) || aula < 1) {
    throw new Error('Nº Aula deve ser um número natural (1, 2, 3...).');
  }

  if (!habilidades) {
    throw new Error('Informe pelo menos uma habilidade.');
  }

  return {
    serie,
    componente,
    bimestre,
    aula,
    titulo,
    unidade_tematica: payload.unidade_tematica?.trim() || null,
    habilidades,
    objeto: payload.objeto?.trim() || null,
    conteudo: payload.conteudo?.trim() || null,
    objetivos: payload.objetivos?.trim() || null,
    descritivo: payload.descritivo?.trim() || null,
    referencias: payload.referencias?.trim() || null,
    aprendizagem_essencial: payload.aprendizagem_essencial?.trim() || null,
  };
}

async function validateEscopoHabilidades(habilidades: string) {
  const codes = splitHabilidadeCodes(habilidades);
  const rows = await getCurriculoByCodes(codes);
  const found = new Set(rows.map((row) => row.id_habilidade));
  const missing = codes.filter((code) => !found.has(code));

  if (missing.length > 0) {
    throw new Error(`Código(s) não encontrado(s) no Currículo Paulista: ${missing.join(', ')}`);
  }
}

async function validateEscopoAeReferences(payload: ReturnType<typeof normalizeEscopoPayload>) {
  const references = parseAeReferences(payload.aprendizagem_essencial);
  if (references.length === 0) {
    return;
  }

  const aeCodes = references.map((item) => item.code);
  const client = getAdminClient();
  const aeTable = isAfSerie(payload.serie) ? 'ae_detalhes_af' : 'ae_detalhes_em';
  const { data, error } = await client
    .from(aeTable)
    .select('ae')
    .eq('serie', payload.serie)
    .eq('componente', payload.componente)
    .in('ae', aeCodes);

  if (error) {
    throw error;
  }

  const found = new Set((data ?? []).map((row) => String(row.ae ?? '').trim().toUpperCase()));
  const missing = aeCodes.filter((code) => !found.has(code));

  if (missing.length > 0) {
    throw new Error(
      `AE(s) não encontrada(s) para ${payload.serie} / ${payload.componente}: ${missing.join(', ')}`,
    );
  }
}

async function getNextEscopoId(serie: string) {
  const client = getAdminClient();
  const table = getEscopoTableName(serie);
  const { data, error } = await client
    .from(table)
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Number(data?.id ?? 0) + 1;
}

async function ensureUniqueAula(
  payload: ReturnType<typeof normalizeEscopoPayload>,
  excludeId?: number,
) {
  const client = getAdminClient();
  const table = getEscopoTableName(payload.serie);
  const serieColumn = getSerieColumn(payload.serie);
  const { data, error } = await client
    .from(table)
    .select('id')
    .eq(serieColumn, payload.serie)
    .eq('componente', payload.componente)
    .eq('bimestre', payload.bimestre)
    .eq('aula', payload.aula);

  if (error) {
    throw error;
  }

  if ((data ?? []).some((row) => Number(row.id) !== excludeId)) {
    throw new Error(
      `Aula ${payload.aula} já existe para ${payload.serie} / ${payload.componente} / ${payload.bimestre}.`,
    );
  }
}

function buildEscopoRow(
  payload: ReturnType<typeof normalizeEscopoPayload>,
  id?: number,
): Record<string, string | number | null> {
  return {
    ...(id ? { id } : {}),
    [getSerieColumn(payload.serie)]: payload.serie,
    componente: payload.componente,
    bimestre: payload.bimestre,
    aula: payload.aula,
    titulo: payload.titulo,
    unidade_tematica: payload.unidade_tematica,
    habilidades: payload.habilidades,
    objeto: payload.objeto,
    conteudo: payload.conteudo,
    objetivos: payload.objetivos,
    descritivo: payload.descritivo,
    referencias: payload.referencias,
    aprendizagem_essencial: payload.aprendizagem_essencial,
  };
}

export async function listEscopo(filters: {
  serie: string;
  componente?: string;
  bimestre?: string;
}) {
  const client = getAdminClient();
  const table = getEscopoTableName(filters.serie);
  const serieColumn = getSerieColumn(filters.serie);
  let query = client
    .from(table)
    .select('*')
    .eq(serieColumn, filters.serie)
    .order('aula', { ascending: true });

  if (filters.componente) {
    query = query.eq('componente', filters.componente);
  }

  if (filters.bimestre) {
    query = query.eq('bimestre', filters.bimestre);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as EscopoRow[];
}

export async function getEscopoById(serie: string, id: number) {
  const client = getAdminClient();
  const table = getEscopoTableName(serie);
  const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();

  if (error) {
    throw error;
  }

  return (data as EscopoRow | null) ?? null;
}

export async function createEscopo(payload: EscopoPayload) {
  const client = getAdminClient();
  const normalized = normalizeEscopoPayload(payload);
  const table = getEscopoTableName(normalized.serie);
  const nextId = await getNextEscopoId(normalized.serie);

  await validateEscopoHabilidades(normalized.habilidades);
  await validateEscopoAeReferences(normalized);
  await ensureUniqueAula(normalized);

  const { data, error } = await client
    .from(table)
    .insert(buildEscopoRow(normalized, nextId))
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as EscopoRow;
}

export async function updateEscopo(
  id: number,
  originalSerie: string,
  payload: EscopoPayload,
) {
  const client = getAdminClient();
  const normalized = normalizeEscopoPayload(payload);
  const current = await getEscopoById(originalSerie, id);

  if (!current) {
    throw new Error('Registro de Escopo-Sequência não encontrado.');
  }

  await validateEscopoHabilidades(normalized.habilidades);
  await validateEscopoAeReferences(normalized);
  await ensureUniqueAula(normalized, id);

  const originalTable = getEscopoTableName(originalSerie);
  const nextTable = getEscopoTableName(normalized.serie);
  const changingSegment = originalTable !== nextTable;

  if (changingSegment) {
    const nextId = await getNextEscopoId(normalized.serie);
    const { data: inserted, error: insertError } = await client
      .from(nextTable)
      .insert(buildEscopoRow(normalized, nextId))
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    const { error: deleteError } = await client.from(originalTable).delete().eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return inserted as EscopoRow;
  }

  const { data, error } = await client
    .from(nextTable)
    .update(buildEscopoRow(normalized))
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as EscopoRow;
}

export async function deleteEscopo(serie: string, id: number) {
  const client = getAdminClient();
  const table = getEscopoTableName(serie);
  const current = await getEscopoById(serie, id);

  if (!current) {
    throw new Error('Registro de Escopo-Sequência não encontrado.');
  }

  const { error } = await client.from(table).delete().eq('id', id);

  if (error) {
    throw error;
  }

  return current;
}
