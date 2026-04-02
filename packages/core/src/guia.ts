import {
  type AeDetalhesRow,
  type EscopoAfRow,
  type EscopoEmRow,
  type MatrizDescritorRow,
  type Segmento,
} from './database.js';

export const AF_SERIES = ['6º Ano', '7º Ano', '8º Ano', '9º Ano'] as const;
export const EM_SERIES = ['1ª Série', '2ª Série', '3ª Série'] as const;
export const ALL_SERIES = [...AF_SERIES, ...EM_SERIES] as const;
export const BIMESTRES = [
  '1º Bimestre',
  '2º Bimestre',
  '3º Bimestre',
  '4º Bimestre',
] as const;

export const COMPONENTES_AF = [
  'Arte',
  'Ciências',
  'Educação Física',
  'Geografia',
  'História',
  'Inglês',
  'Língua Portuguesa',
  'Matemática',
] as const;

export const COMPONENTES_EM = [
  'Arte',
  'Biologia',
  'Educação Física',
  'Filosofia',
  'Física',
  'Geografia',
  'História',
  'Inglês',
  'Língua Portuguesa',
  'Matemática',
  'Química',
  'Sociologia',
] as const;

export type Serie = (typeof ALL_SERIES)[number];
export type SerieColumn = 'ano' | 'serie';
export type EscopoTableName = 'escopo_af' | 'escopo_em';
export type AeTableName = 'ae_detalhes_af' | 'ae_detalhes_em';
export type MatrizTableName =
  | 'matriz_descritores_af'
  | 'matriz_descritores_em';

export interface EscopoAula {
  id: number;
  segmento: Segmento;
  serie: string;
  componente: string;
  bimestre: string;
  aula: number;
  titulo: string;
  conteudo: string[];
  objetivos: string[];
  habilidades: string[];
  aprendizagemEssencial: string;
  descritivo: string;
  objeto: string;
  referencias: string;
  unidadeTematica: string;
}

export interface EscopoSemana {
  bimestre: string;
  semana: number;
  aulas: EscopoAula[];
}

export interface AeCodeReference {
  code: string;
  description: string;
}

export interface AeDetalhe {
  id: number;
  segmento: Segmento | null;
  serie: string;
  componente: string;
  bimestre: string;
  ae: string;
  titulo: string;
  habPriorizada: string;
  habRelacionadas: string[];
  conhecimentosPrevios: string[];
}

export interface AeCard extends AeDetalhe {
  outrasHabilidades: string[];
  aulasVinculadas: number[];
}

export interface AeSection {
  bimestre: string;
  items: AeCard[];
}

export interface HabilidadeResumo {
  codigo: string;
  aulasCount: number;
}

export interface HabilidadeAula {
  id: number;
  aula: number;
  bimestre: string;
  semana: number;
  titulo: string;
  conteudo: string[];
  objetivos: string[];
  aeCodigo: string;
  aeDescricao: string;
}

export interface HabilidadeDetalhe {
  codigo: string;
  aeCodigos: string[];
  aulas: HabilidadeAula[];
}

export interface MatrizDescritor {
  id: number;
  serie: string;
  componente: string;
  ae: string;
  bimestre: string;
  grupo: string;
  descritor: string;
}

export interface MatrizAeResumo {
  ae: string;
  aulasCount: number;
  descritoresCount: number;
}

export interface MatrizAeDetalhe {
  ae: string;
  titulo: string;
  habilidades: string[];
  aulasPorBimestre: Array<{ bimestre: string; aulas: number[] }>;
  grupos: {
    grupo1: string[];
    grupo2: string[];
    grupo3: string[];
  };
}

const SERIE_ORDER = [...ALL_SERIES];
const BIMESTRE_ORDER = [...BIMESTRES];

export function isAfSerie(serie: string) {
  return AF_SERIES.includes(serie as (typeof AF_SERIES)[number]);
}

export function getSegmentoFromSerie(serie: string): Segmento {
  return isAfSerie(serie) ? 'AF' : 'EM';
}

export function getSerieColumn(serie: string): SerieColumn {
  return isAfSerie(serie) ? 'ano' : 'serie';
}

export function getEscopoTableName(serie: string): EscopoTableName {
  return isAfSerie(serie) ? 'escopo_af' : 'escopo_em';
}

export function getAeTableName(serie: string): AeTableName {
  return isAfSerie(serie) ? 'ae_detalhes_af' : 'ae_detalhes_em';
}

export function getMatrizTableName(serie: string): MatrizTableName {
  return isAfSerie(serie)
    ? 'matriz_descritores_af'
    : 'matriz_descritores_em';
}

export function getComponentesForSerie(serie: string) {
  return isAfSerie(serie)
    ? [...COMPONENTES_AF]
    : [...COMPONENTES_EM];
}

export function sortSeries(series: string[]) {
  return [...new Set(series)].sort((left, right) => {
    const leftIndex = SERIE_ORDER.indexOf(left as Serie);
    const rightIndex = SERIE_ORDER.indexOf(right as Serie);

    if (leftIndex !== -1 && rightIndex !== -1) {
      return leftIndex - rightIndex;
    }

    return left.localeCompare(right, 'pt-BR');
  });
}

export function sortBimestres(values: string[]) {
  return [...new Set(values)].sort((left, right) => {
    const leftIndex = BIMESTRE_ORDER.indexOf(
      left as (typeof BIMESTRES)[number],
    );
    const rightIndex = BIMESTRE_ORDER.indexOf(
      right as (typeof BIMESTRES)[number],
    );

    if (leftIndex !== -1 && rightIndex !== -1) {
      return leftIndex - rightIndex;
    }

    return left.localeCompare(right, 'pt-BR');
  });
}

export function sortAulas(rows: EscopoAula[]) {
  return [...rows].sort((left, right) => {
    const byBimestre =
      BIMESTRE_ORDER.indexOf(left.bimestre as (typeof BIMESTRES)[number]) -
      BIMESTRE_ORDER.indexOf(right.bimestre as (typeof BIMESTRES)[number]);

    if (byBimestre !== 0) {
      return byBimestre;
    }

    return left.aula - right.aula;
  });
}

export function splitBulletedText(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const normalized = value
    .split(/\s*[-–•]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalized.length > 1) {
    return normalized;
  }

  return [value.trim()].filter(Boolean);
}

export function splitCodes(value: string | null | undefined) {
  return (value ?? '')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseAeReferences(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return [] as AeCodeReference[];
  }

  return value
    .split(/(?=AE\d+\s*-)/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(AE\d+)\s*-\s*(.+)$/s);
      if (!match) {
        return null;
      }

      return {
        code: match[1],
        description: match[2].trim().replace(/\s+/g, ' ').replace(/\.$/, ''),
      } satisfies AeCodeReference;
    })
    .filter((item): item is AeCodeReference => Boolean(item));
}

export function getPreferredComponent(components: string[]) {
  if (components.includes('Matemática')) {
    return 'Matemática';
  }

  return components[0] ?? '';
}

export function getPreferredBimestre(bimestres: string[]) {
  if (bimestres.includes('1º Bimestre')) {
    return '1º Bimestre';
  }

  return bimestres[0] ?? 'Todos';
}

export function mapAeRow(row: AeDetalhesRow): AeDetalhe {
  return {
    id: row.id,
    segmento:
      row.segmento === 'AF' || row.segmento === 'EM' ? row.segmento : null,
    serie: row.serie ?? '',
    componente: row.componente ?? '',
    bimestre: row.bimestre ?? '',
    ae: row.ae ?? '',
    titulo: row.titulo ?? '',
    habPriorizada: row.hab_priorizada ?? '',
    habRelacionadas: splitCodes(row.hab_relacionadas),
    conhecimentosPrevios: splitCodes(row.conhecimentos_previos),
  };
}

export function mapMatrizRow(row: MatrizDescritorRow): MatrizDescritor {
  return {
    id: row.id,
    serie: row.serie ?? '',
    componente: row.componente ?? '',
    ae: row.ae ?? '',
    bimestre: row.bimestre ?? '',
    grupo: row.grupo ?? '',
    descritor: row.descritor ?? '',
  };
}

export function mapEscopoRow(row: EscopoAfRow | EscopoEmRow): EscopoAula {
  const segmento = 'ano' in row ? 'AF' : 'EM';
  const serie = 'ano' in row ? row.ano ?? '' : row.serie ?? '';
  const aula = Number.parseInt(row.aula ?? '0', 10);

  return {
    id: row.id,
    segmento,
    serie,
    componente: row.componente ?? '',
    bimestre: row.bimestre ?? '',
    aula: Number.isNaN(aula) ? 0 : aula,
    titulo: row.titulo ?? '',
    conteudo: splitBulletedText(row.conteudo),
    objetivos: splitBulletedText(row.objetivos),
    habilidades: splitCodes(row.habilidades),
    aprendizagemEssencial: row.aprendizagem_essencial ?? '',
    descritivo: row.descritivo ?? '',
    objeto: row.objeto ?? '',
    referencias: row.referencias ?? '',
    unidadeTematica: row.unidade_tematica ?? '',
  };
}

export function buildAeSections(aeRows: AeDetalhe[], escopoRows: EscopoAula[]) {
  const escopoByAe = new Map<
    string,
    { habilidades: Set<string>; aulas: Set<number> }
  >();

  for (const row of escopoRows) {
    for (const ae of parseAeReferences(row.aprendizagemEssencial)) {
      const current = escopoByAe.get(ae.code) ?? {
        habilidades: new Set<string>(),
        aulas: new Set<number>(),
      };

      row.habilidades.forEach((habilidade) => current.habilidades.add(habilidade));
      if (row.aula) {
        current.aulas.add(row.aula);
      }

      escopoByAe.set(ae.code, current);
    }
  }

  const rowsByBimestre = new Map<string, AeDetalhe[]>();

  for (const row of aeRows) {
    const current = rowsByBimestre.get(row.bimestre) ?? [];
    current.push(row);
    rowsByBimestre.set(row.bimestre, current);
  }

  return sortBimestres([...rowsByBimestre.keys()]).map((bimestre) => {
    const items = [...(rowsByBimestre.get(bimestre) ?? [])]
      .sort((left, right) => {
        const leftValue = Number.parseInt(left.ae.replace(/\D+/g, ''), 10) || 0;
        const rightValue = Number.parseInt(right.ae.replace(/\D+/g, ''), 10) || 0;
        return leftValue - rightValue;
      })
      .map((row) => {
        const escopoLink = escopoByAe.get(row.ae);
        const outrasHabilidades = [...(escopoLink?.habilidades ?? new Set<string>())]
          .filter((item) => item !== row.habPriorizada)
          .sort((left, right) => left.localeCompare(right, 'pt-BR'));

        return {
          ...row,
          outrasHabilidades,
          aulasVinculadas: [...(escopoLink?.aulas ?? new Set<number>())].sort(
            (left, right) => left - right,
          ),
        } satisfies AeCard;
      });

    return {
      bimestre,
      items,
    } satisfies AeSection;
  });
}

export function calcSemanaForAula(rows: EscopoAula[], aulaId: number) {
  const target = rows.find((row) => row.id === aulaId);
  if (!target) {
    return 0;
  }

  const aulasDoBimestre = [...new Set(
    rows
      .filter((row) => row.bimestre === target.bimestre)
      .map((row) => row.aula),
  )].sort((left, right) => left - right);

  const aulasPorSemana = Math.max(1, Math.ceil(aulasDoBimestre.length / 7));
  const index = aulasDoBimestre.indexOf(target.aula);

  return index === -1 ? 0 : Math.floor(index / aulasPorSemana) + 1;
}

export function buildHabilidadeResumos(rows: EscopoAula[]) {
  const map = new Map<string, Set<number>>();

  for (const row of rows) {
    for (const habilidade of row.habilidades) {
      const current = map.get(habilidade) ?? new Set<number>();
      current.add(row.id);
      map.set(habilidade, current);
    }
  }

  return [...map.entries()]
    .map(([codigo, aulaIds]) => ({
      codigo,
      aulasCount: aulaIds.size,
    }) satisfies HabilidadeResumo)
    .sort((left, right) => left.codigo.localeCompare(right.codigo, 'pt-BR'));
}

export function buildHabilidadeDetalhe(rows: EscopoAula[], codigo: string) {
  const habilidadeRows = rows.filter((row) => row.habilidades.includes(codigo));

  const aeCodigos = [...new Set(
    habilidadeRows.flatMap((row) =>
      parseAeReferences(row.aprendizagemEssencial).map((item) => item.code),
    ),
  )].sort((left, right) => left.localeCompare(right, 'pt-BR'));

  const aulas = habilidadeRows
    .map((row) => {
      const [ae] = parseAeReferences(row.aprendizagemEssencial);

      return {
        id: row.id,
        aula: row.aula,
        bimestre: row.bimestre,
        semana: calcSemanaForAula(rows, row.id),
        titulo: row.titulo,
        conteudo: row.conteudo,
        objetivos: row.objetivos,
        aeCodigo: ae?.code ?? '',
        aeDescricao: row.aprendizagemEssencial,
      } satisfies HabilidadeAula;
    })
    .sort((left, right) => left.aula - right.aula);

  return {
    codigo,
    aeCodigos,
    aulas,
  } satisfies HabilidadeDetalhe;
}

export function buildMatrizAeResumos(
  aeRows: AeDetalhe[],
  escopoRows: EscopoAula[],
  matrizRows: MatrizDescritor[],
) {
  const aes = [...new Set([
    ...aeRows.map((row) => row.ae).filter(Boolean),
    ...matrizRows.map((row) => row.ae).filter(Boolean),
  ])].sort((left, right) => {
    const leftValue = Number.parseInt(left.replace(/\D+/g, ''), 10) || 0;
    const rightValue = Number.parseInt(right.replace(/\D+/g, ''), 10) || 0;
    return leftValue - rightValue;
  });

  return aes.map((ae) => {
    const aulasCount = new Set(
      escopoRows
        .filter((row) =>
          parseAeReferences(row.aprendizagemEssencial).some((item) => item.code === ae),
        )
        .map((row) => row.id),
    ).size;

    const descritoresCount = matrizRows.filter((row) => row.ae === ae).length;

    return {
      ae,
      aulasCount,
      descritoresCount,
    } satisfies MatrizAeResumo;
  });
}

export function buildMatrizAeDetalhe(
  aeCode: string,
  aeRows: AeDetalhe[],
  escopoRows: EscopoAula[],
  matrizRows: MatrizDescritor[],
) {
  const relatedAe = aeRows.find((row) => row.ae === aeCode);
  const relatedEscopoRows = escopoRows.filter((row) =>
    parseAeReferences(row.aprendizagemEssencial).some((item) => item.code === aeCode),
  );
  const relatedMatrizRows = matrizRows.filter((row) => row.ae === aeCode);

  const habilidades = [...new Set(
    relatedEscopoRows.flatMap((row) => row.habilidades),
  )].sort((left, right) => left.localeCompare(right, 'pt-BR'));

  const aulasPorBimestre = sortBimestres(
    relatedEscopoRows.map((row) => row.bimestre).filter(Boolean),
  ).map((bimestre) => ({
    bimestre,
    aulas: [...new Set(
      relatedEscopoRows
        .filter((row) => row.bimestre === bimestre)
        .map((row) => row.aula),
    )].sort((left, right) => left - right),
  }));

  const titleFromEscopo =
    parseAeReferences(relatedEscopoRows[0]?.aprendizagemEssencial).find(
      (item) => item.code === aeCode,
    )?.description ?? '';

  return {
    ae: aeCode,
    titulo: relatedAe?.titulo || titleFromEscopo || aeCode,
    habilidades,
    aulasPorBimestre,
    grupos: {
      grupo1: relatedMatrizRows
        .filter((row) => row.grupo === 'Grupo 1')
        .map((row) => row.descritor),
      grupo2: relatedMatrizRows
        .filter((row) => row.grupo === 'Grupo 2')
        .map((row) => row.descritor),
      grupo3: relatedMatrizRows
        .filter((row) => row.grupo === 'Grupo 3')
        .map((row) => row.descritor),
    },
  } satisfies MatrizAeDetalhe;
}

export function buildEscopoSemanas(rows: EscopoAula[]) {
  const groupedByBimestre = new Map<string, EscopoAula[]>();

  for (const row of sortAulas(rows)) {
    const current = groupedByBimestre.get(row.bimestre) ?? [];
    current.push(row);
    groupedByBimestre.set(row.bimestre, current);
  }

  const sections: EscopoSemana[] = [];

  for (const bimestre of sortBimestres([...groupedByBimestre.keys()])) {
    const aulas = groupedByBimestre.get(bimestre) ?? [];
    const aulasPorSemana = Math.max(1, Math.ceil(aulas.length / 7));

    for (let index = 0; index < aulas.length; index += aulasPorSemana) {
      sections.push({
        bimestre,
        semana: Math.floor(index / aulasPorSemana) + 1,
        aulas: aulas.slice(index, index + aulasPorSemana),
      });
    }
  }

  return sections;
}
