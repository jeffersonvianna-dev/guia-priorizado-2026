import {
  getAeTableName,
  getSegmentoFromSerie,
  joinHabilidadeCodes,
  normalizeHabilidadeCode,
  splitHabilidadeCodes,
  type AeDetalhesRow,
} from '@guia-priorizado/core';

import { getCurriculoByCodes, getAdminClient } from './supabase-admin.js';

export interface AePayload {
  serie: string;
  componente: string;
  bimestre: string;
  ae: string;
  titulo: string;
  hab_priorizada: string;
  hab_relacionadas?: string | null;
  conhecimentos_previos?: string | null;
}

function normalizeAeCode(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeAePayload(payload: AePayload) {
  const serie = payload.serie.trim();
  const componente = payload.componente.trim();
  const bimestre = payload.bimestre.trim();
  const ae = normalizeAeCode(payload.ae);
  const titulo = payload.titulo.trim();
  const hab_priorizada = normalizeHabilidadeCode(payload.hab_priorizada);
  const hab_relacionadas = joinHabilidadeCodes(splitHabilidadeCodes(payload.hab_relacionadas));
  const conhecimentos_previos = joinHabilidadeCodes(
    splitHabilidadeCodes(payload.conhecimentos_previos),
  );

  if (!serie || !componente || !bimestre || !ae || !titulo || !hab_priorizada) {
    throw new Error('Série, componente, bimestre, AE, título e habilidade priorizada são obrigatórios.');
  }

  return {
    serie,
    componente,
    bimestre,
    ae,
    titulo,
    hab_priorizada,
    hab_relacionadas,
    conhecimentos_previos,
    segmento: getSegmentoFromSerie(serie),
  };
}

export async function validateAeHabilidades(payload: ReturnType<typeof normalizeAePayload>) {
  const codes = [
    payload.hab_priorizada,
    ...splitHabilidadeCodes(payload.hab_relacionadas),
    ...splitHabilidadeCodes(payload.conhecimentos_previos),
  ];

  const rows = await getCurriculoByCodes(codes);
  const found = new Set(rows.map((row) => normalizeHabilidadeCode(row.id_habilidade)));
  const missing = codes.filter((code) => !found.has(code));

  if (missing.length > 0) {
    throw new Error(`Código(s) não encontrado(s) no Currículo Paulista: ${missing.join(', ')}`);
  }
}

export async function listAe(filters: {
  serie: string;
  componente?: string;
  bimestre?: string;
}) {
  const client = getAdminClient();
  const table = getAeTableName(filters.serie);
  let query = client
    .from(table)
    .select('*')
    .eq('serie', filters.serie)
    .order('bimestre')
    .order('ae');

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

  return (data ?? []) as AeDetalhesRow[];
}

export async function getAeById(serie: string, id: number) {
  const client = getAdminClient();
  const table = getAeTableName(serie);
  const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AeDetalhesRow | null) ?? null;
}

async function getNextAeId(serie: string) {
  const client = getAdminClient();
  const table = getAeTableName(serie);
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

export async function createAe(payload: AePayload) {
  const client = getAdminClient();
  const normalized = normalizeAePayload(payload);
  const table = getAeTableName(normalized.serie);
  const nextId = await getNextAeId(normalized.serie);

  await validateAeHabilidades(normalized);

  const { data: duplicate, error: duplicateError } = await client
    .from(table)
    .select('id')
    .eq('serie', normalized.serie)
    .eq('componente', normalized.componente)
    .eq('titulo', normalized.titulo)
    .maybeSingle();

  if (duplicateError) {
    throw duplicateError;
  }

  if (duplicate) {
    throw new Error(`Já existe uma AE com este título para ${normalized.serie} / ${normalized.componente}.`);
  }

  const { data, error } = await client
    .from(table)
    .insert({
      id: nextId,
      ...normalized,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as AeDetalhesRow;
}

export async function updateAe(id: number, payload: AePayload) {
  const client = getAdminClient();
  const normalized = normalizeAePayload(payload);
  const table = getAeTableName(normalized.serie);

  await validateAeHabilidades(normalized);

  const { data: duplicateRows, error: duplicateError } = await client
    .from(table)
    .select('id')
    .eq('serie', normalized.serie)
    .eq('componente', normalized.componente)
    .eq('titulo', normalized.titulo);

  if (duplicateError) {
    throw duplicateError;
  }

  if ((duplicateRows ?? []).some((row) => Number(row.id) !== id)) {
    throw new Error(`Já existe uma AE com este título para ${normalized.serie} / ${normalized.componente}.`);
  }

  const { data, error } = await client
    .from(table)
    .update(normalized)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as AeDetalhesRow;
}

export async function deleteAe(serie: string, id: number) {
  const client = getAdminClient();
  const table = getAeTableName(serie);
  const current = await getAeById(serie, id);

  if (!current) {
    throw new Error('Registro de Aprendizagem Essencial não encontrado.');
  }

  const { error } = await client.from(table).delete().eq('id', id);

  if (error) {
    throw error;
  }

  return current;
}
