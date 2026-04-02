import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL as string
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const SCHEMA = (import.meta.env.VITE_SUPABASE_SCHEMA as string) || '2026_guia_priorizado'

export const db = createClient(URL, KEY, {
  db: { schema: SCHEMA },
})
