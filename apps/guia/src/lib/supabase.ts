import { createClient } from '@supabase/supabase-js';
import { type Database, GUIA_SCHEMA, SUPABASE_URL } from '@guia-priorizado/core';

const configuredSchema = import.meta.env.VITE_SUPABASE_SCHEMA || GUIA_SCHEMA;
const configuredUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError = configuredAnonKey
  ? null
  : 'Defina VITE_SUPABASE_ANON_KEY em apps/guia/.env.local para habilitar a leitura do projeto novo.';

export const supabase = configuredAnonKey
  ? createClient<Database>(configuredUrl, configuredAnonKey, {
      db: { schema: configuredSchema },
    })
  : null;
