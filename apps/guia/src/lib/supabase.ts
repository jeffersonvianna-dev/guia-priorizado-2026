import { createClient } from '@supabase/supabase-js';

const GUIA_SCHEMA = '2026_guia_priorizado';
const SUPABASE_URL_DEFAULT = 'https://aingjvjyqhijogpyikii.supabase.co';

const configuredSchema = import.meta.env.VITE_SUPABASE_SCHEMA || GUIA_SCHEMA;
const configuredUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_DEFAULT;
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError = configuredAnonKey
  ? null
  : 'Defina VITE_SUPABASE_ANON_KEY em apps/guia/.env.local para habilitar a leitura do projeto novo.';

export const supabase = configuredAnonKey
  ? createClient(configuredUrl, configuredAnonKey, {
      db: { schema: configuredSchema },
    })
  : null;
