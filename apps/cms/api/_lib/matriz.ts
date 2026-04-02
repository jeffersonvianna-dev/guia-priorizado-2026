import {
  getAeTableName,
  getMatrizTableName,
  type MatrizDescritorRow,
} from '@guia-priorizado/core';

import { getAdminClient } from './supabase-admin.js';

export interface MatrizPayload {
  serie: string;
  componente: string;
  ae: string;
  bimestre: string;
  grupo: string;
  descritor: string;
}

function normalizeAeCode(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeMatrizPayload(payload: MatrizPayload) {
  const serie = payload.serie.trim();
  const componente = payload.componente.trim();
  const ae = normalizeAeCode(payload.ae);
  const bimestre = payload.bimestre.trim();
  const grupo = payload.grupo.trim();
  const descritor = payload.descritor.trim();

  if (!serie || !componente || !ae || !bimestre || !grupo || !descritor) {
    throw new Error('Série, componente, AE, bimestre, grupo e descritor são obrigatórios.');
  }

  return {
    serie,
    componente,
    ae,
    bimestre,
    grupo,
    descritor,
  };
}

async function validateAeReference(payload: ReturnType<typeof normalizeMatrizPayload>) {
  const client = getAdminClient();
  const aeTable = getAeTableName(payload.serie);
  const { data, error } = await client
    .from(aeTable)
    .select('id')
    .eq('serie', payload.serie)
    .eq('componente', payload.componente)
    .eq('ae', payload.ae)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      `A AE ${payload.ae} não foi encontrada para ${payload.serie} / ${payload.componente}.`,
    );
  }
}

export async function listMatriz(filters: {
  serie: string;
  componente?: string;
  ae?: string;
}) {
  const client = getAdminClient();
  const table = getMatrizTableName(filters.serie);
  let query = client
    .from(table)
    .select('*')
    .eq('serie', filters.serie)
    .order('ae')
    .order('grupo')
    .order('id');

  if (filters.componente) {
    query = query.eq('componente', filters.componente);
  }

  if (filters.ae) {
    query = query.eq('ae', normalizeAeCode(filters.ae));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as MatrizDescritorRow[];
}

export async function getMatrizById(serie: string, id: number) {
  const client = getAdminClient();
  const table = getMatrizTableName(serie);
  const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MatrizDescritorRow | null) ?? null;
}

async function getNextMatrizId(serie: string) {
  const client = getAdminClient();
  const table = getMatrizTableName(serie);
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

export async function createMatriz(payload: MatrizPayload) {
  const client = getAdminClient();
  const normalized = normalizeMatrizPayload(payload);
  const table = getMatrizTableName(normalized.serie);
  const nextId = await getNextMatrizId(normalized.serie);

  await validateAeReference(normalized);

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

  return data as MatrizDescritorRow;
}

export async function updateMatriz(id: number, payload: MatrizPayload) {
  const client = getAdminClient();
  const normalized = normalizeMatrizPayload(payload);
  const table = getMatrizTableName(normalized.serie);

  await validateAeReference(normalized);

  const { data, error } = await client
    .from(table)
    .update(normalized)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as MatrizDescritorRow;
}

export async function deleteMatriz(serie: string, id: number) {
  const client = getAdminClient();
  const table = getMatrizTableName(serie);
  const current = await getMatrizById(serie, id);

  if (!current) {
    throw new Error('Registro da Matriz não encontrado.');
  }

  const { error } = await client.from(table).delete().eq('id', id);

  if (error) {
    throw error;
  }

  return current;
}
