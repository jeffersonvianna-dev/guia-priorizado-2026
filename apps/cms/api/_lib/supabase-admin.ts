import { GUIA_SCHEMA, SUPABASE_URL, type CurriculoPaulistaRow } from '@guia-priorizado/core';
import { createClient } from '@supabase/supabase-js';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const schema = (process.env.SUPABASE_SCHEMA || GUIA_SCHEMA) as typeof GUIA_SCHEMA;
const url = process.env.SUPABASE_URL || SUPABASE_URL;

export function getAdminClient() {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured for CMS API routes.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema,
    },
    global: {
      headers: {
        'Accept-Profile': schema,
        'Content-Profile': schema,
      },
    },
  });
}

export async function getCurriculoByCodes(codes: string[]) {
  if (codes.length === 0) {
    return [] as CurriculoPaulistaRow[];
  }

  const client = getAdminClient();
  const { data, error } = await client
    .from('curriculo_paulista')
    .select('id, id_habilidade, componente, segmento, serie, texto')
    .in('id_habilidade', codes);

  if (error) {
    throw error;
  }

  return (data ?? []) as CurriculoPaulistaRow[];
}
