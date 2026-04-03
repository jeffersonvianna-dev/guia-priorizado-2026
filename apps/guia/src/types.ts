export type Segmento = 'AF' | 'EM'

/** Row de escopo_af (col. série = 'ano') */
export interface EscopoAFRow {
  id: number
  componente: string
  ano: string        // col. de série em escopo_af
  bimestre: string
  aula: number
  titulo: string
  conteudo: string | null
  objetivos: string | null
  habilidades: string   // espaço-separado
  aprendizagem_essencial: string | null
  unidade_tematica: string | null
  objeto: string | null
  descritivo: string | null
  referencias: string | null
  id_md: string | null
}

/** Row de escopo_em (col. série = 'serie') */
export interface EscopoEMRow {
  id: number
  componente: string
  serie: string
  bimestre: string
  aula: number
  titulo: string
  conteudo: string | null
  objetivos: string | null
  habilidades: string
  aprendizagem_essencial: string | null
  unidade_tematica: string | null
  objeto: string | null
  descritivo: string | null
  referencias: string | null
  id_md: string | null
}

/** Shape unificado para uso nos componentes */
export interface EscopoRow {
  id: number
  componente: string
  serie: string      // valor de ano (AF) ou serie (EM)
  bimestre: string
  aula: number
  titulo: string
  conteudo: string | null
  objetivos: string | null
  habilidades: string
  aprendizagem_essencial: string | null
  unidade_tematica: string | null
  objeto: string | null
  descritivo: string | null
  referencias: string | null
  id_md: string | null
  segmento: Segmento
}

export interface AeDetalhesRow {
  id: number
  segmento: Segmento
  serie: string
  componente: string
  bimestre: string | null
  ae: string
  titulo: string
  hab_priorizada: string
  hab_relacionadas: string | null
  conhecimentos_previos: string | null
}

export interface MatrizDescritoresRow {
  id: number
  serie: string
  componente: string
  ae: string
  bimestre: string | null
  grupo: string
  descritor: string
}

/** Todas as séries em ordem */
export const SERIE_ORDER = [
  '6º Ano','7º Ano','8º Ano','9º Ano',
  '1ª Série','2ª Série','3ª Série',
]

export const BIM_ORDER = [
  '1º Bimestre','2º Bimestre','3º Bimestre','4º Bimestre',
]

export const AF_SERIES = ['6º Ano','7º Ano','8º Ano','9º Ano'] as const
export const EM_SERIES = ['1ª Série','2ª Série','3ª Série'] as const

export function isAfSerie(serie: string): boolean {
  return (AF_SERIES as readonly string[]).includes(serie)
}

export function getHabs(habilidades: string): string[] {
  return habilidades.split(/\s+/).filter(Boolean)
}

export function sortSeries(arr: string[]): string[] {
  return [...new Set(arr)].sort((a, b) => {
    const ia = SERIE_ORDER.findIndex(s => s === a)
    const ib = SERIE_ORDER.findIndex(s => s === b)
    if (ia !== -1 && ib !== -1) return ia - ib
    return a.localeCompare(b, 'pt-BR')
  })
}

export function sortBim(arr: string[]): string[] {
  return [...new Set(arr)].sort((a, b) => {
    const ia = BIM_ORDER.findIndex(s => s === a)
    const ib = BIM_ORDER.findIndex(s => s === b)
    if (ia !== -1 && ib !== -1) return ia - ib
    return a.localeCompare(b, 'pt-BR')
  })
}

export function aeNatSort(a: string, b: string): number {
  return (parseInt(a.replace(/\D+/g,'')) || 0) - (parseInt(b.replace(/\D+/g,'')) || 0)
}

export function fmtList(txt: string | null): string[] {
  if (!txt) return []
  const items = txt.split(/\s*[-–•]\s+/).map(s => s.trim()).filter(Boolean)
  return items.length > 1 ? items : [txt]
}
