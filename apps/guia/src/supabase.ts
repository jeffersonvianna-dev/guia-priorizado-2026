import { createClient } from '@supabase/supabase-js'

const URL  = import.meta.env.VITE_SUPABASE_URL as string
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const SCHEMA = (import.meta.env.VITE_SUPABASE_SCHEMA as string) || '2026_guia_priorizado'

export const supabase = createClient(URL, KEY, {
  db: { schema: SCHEMA },
})

/** Paginação automática — busca todas as rows de uma tabela */
export async function fetchAll<T>(table: string): Promise<T[]> {
  let all: T[] = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`)
    if (!data || data.length === 0) break
    all = all.concat(data as T[])
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}
