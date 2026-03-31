export type Segmento = 'AF' | 'EM';

export const AF_SERIES = ['6º Ano', '7º Ano', '8º Ano', '9º Ano'] as const;
export const EM_SERIES = ['1ª Série', '2ª Série', '3ª Série'] as const;

export function isAfSerie(serie: string) {
  return AF_SERIES.includes(serie as (typeof AF_SERIES)[number]);
}

export function getSegmentoFromSerie(serie: string): Segmento {
  return isAfSerie(serie) ? 'AF' : 'EM';
}

export function getSerieColumn(serie: string) {
  return isAfSerie(serie) ? 'ano' : 'serie';
}
