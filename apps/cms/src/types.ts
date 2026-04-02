export const AF_SERIES = ['6º Ano','7º Ano','8º Ano','9º Ano'] as const
export const EM_SERIES = ['1ª Série','2ª Série','3ª Série'] as const
export type Serie = (typeof AF_SERIES)[number] | (typeof EM_SERIES)[number]

export const ALL_SERIES = [...AF_SERIES, ...EM_SERIES]

export const AF_COMPS = [
  'Arte','Ciências','Educação Física','Geografia','História',
  'Língua Inglesa','Língua Portuguesa','Matemática',
] as const

export const EM_COMPS = [
  'Arte','Biologia','Educação Física','Filosofia','Física',
  'Geografia','História','Língua Inglesa','Língua Portuguesa',
  'Matemática','Química','Sociologia',
] as const

export const BIM_OPTIONS = [
  '1º Bimestre','2º Bimestre','3º Bimestre','4º Bimestre',
] as const

export function isAF(s: string): boolean {
  return (AF_SERIES as readonly string[]).includes(s)
}
export function escopoTbl(s: string) { return isAF(s) ? 'escopo_af' : 'escopo_em' }
export function aeTbl(s: string)     { return isAF(s) ? 'ae_detalhes_af' : 'ae_detalhes_em' }
export function mdeTbl(s: string)    { return isAF(s) ? 'matriz_descritores_af' : 'matriz_descritores_em' }
export function serieCol(s: string)  { return isAF(s) ? 'ano' : 'serie' }
export function segFor(s: string)    { return isAF(s) ? 'AF' : 'EM' }
export function compsFor(s: string)  { return isAF(s) ? [...AF_COMPS] : [...EM_COMPS] }

export function aeNatSort(a: string, b: string): number {
  return (parseInt(a.replace(/\D+/g,'')) || 0) - (parseInt(b.replace(/\D+/g,'')) || 0)
}

export function segFromCod(cod: string): string {
  if (/^EF0[1-5]/.test(cod)) return 'EFAI'
  if (/^EF0[6-9]/.test(cod)) return 'EFAF'
  if (/^EM/.test(cod))       return 'EM'
  return ''
}
