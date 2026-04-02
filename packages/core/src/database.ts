export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export const GUIA_SCHEMA = '2026_guia_priorizado' as const;
export const SUPABASE_PROJECT_REF = 'aingjvjyqhijogpyikii' as const;
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

export type Segmento = 'AF' | 'EM';
export type GuiaSchemaName = typeof GUIA_SCHEMA;

type NullableText = string | null;

export interface AeDetalhesRow {
  ae: NullableText;
  bimestre: NullableText;
  componente: NullableText;
  conhecimentos_previos: NullableText;
  hab_priorizada: NullableText;
  hab_relacionadas: NullableText;
  id: number;
  segmento: NullableText;
  serie: NullableText;
  titulo: NullableText;
}

export interface CurriculoPaulistaRow {
  componente: NullableText;
  id: number;
  id_habilidade: string;
  segmento: NullableText;
  serie: NullableText;
  texto: NullableText;
}

export interface EscopoAfRow {
  ano: NullableText;
  aprendizagem_essencial: NullableText;
  aula: NullableText;
  bimestre: NullableText;
  componente: NullableText;
  conteudo: NullableText;
  descritivo: NullableText;
  habilidades: NullableText;
  id: number;
  objetivos: NullableText;
  objeto: NullableText;
  referencias: NullableText;
  titulo: NullableText;
  unidade_tematica: NullableText;
}

export interface EscopoEmRow {
  aprendizagem_essencial: NullableText;
  aula: NullableText;
  bimestre: NullableText;
  componente: NullableText;
  conteudo: NullableText;
  descritivo: NullableText;
  habilidades: NullableText;
  id: number;
  objetivos: NullableText;
  objeto: NullableText;
  referencias: NullableText;
  serie: NullableText;
  titulo: NullableText;
  unidade_tematica: NullableText;
}

export interface MatrizDescritorRow {
  ae: NullableText;
  bimestre: NullableText;
  componente: NullableText;
  descritor: NullableText;
  grupo: NullableText;
  id: number;
  serie: NullableText;
}

type TableDefinition<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  [GUIA_SCHEMA]: {
    Tables: {
      ae_detalhes_af: TableDefinition<AeDetalhesRow>;
      ae_detalhes_em: TableDefinition<AeDetalhesRow>;
      curriculo_paulista: TableDefinition<CurriculoPaulistaRow>;
      escopo_af: TableDefinition<EscopoAfRow>;
      escopo_em: TableDefinition<EscopoEmRow>;
      matriz_descritores_af: TableDefinition<MatrizDescritorRow>;
      matriz_descritores_em: TableDefinition<MatrizDescritorRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type TableName = keyof Database[GuiaSchemaName]['Tables'];

export type TableRow<TName extends TableName> =
  Database[GuiaSchemaName]['Tables'][TName]['Row'];
