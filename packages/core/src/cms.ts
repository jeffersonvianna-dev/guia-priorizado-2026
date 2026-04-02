export type CurriculoSegmento = 'EFAI' | 'EFAF' | 'EM';

export type CascadeTable =
  | 'escopo_af'
  | 'escopo_em'
  | 'ae_detalhes_af'
  | 'ae_detalhes_em';

export type CascadeField =
  | 'habilidades'
  | 'hab_priorizada'
  | 'hab_relacionadas'
  | 'conhecimentos_previos';

export interface CascadeTarget {
  table: CascadeTable;
  field: CascadeField;
}

export interface CascadeRecord {
  id: number;
  value: string | null;
}

export interface CascadePatch {
  table: CascadeTable;
  field: CascadeField;
  id: number;
  nextValue: string | null;
}

export interface CascadeCount {
  table: CascadeTable;
  field: CascadeField;
  count: number;
}

export const HABILIDADE_CASCADE_TARGETS: CascadeTarget[] = [
  { table: 'escopo_af', field: 'habilidades' },
  { table: 'escopo_em', field: 'habilidades' },
  { table: 'ae_detalhes_af', field: 'hab_priorizada' },
  { table: 'ae_detalhes_af', field: 'hab_relacionadas' },
  { table: 'ae_detalhes_af', field: 'conhecimentos_previos' },
  { table: 'ae_detalhes_em', field: 'hab_priorizada' },
  { table: 'ae_detalhes_em', field: 'hab_relacionadas' },
  { table: 'ae_detalhes_em', field: 'conhecimentos_previos' },
];

export function normalizeHabilidadeCode(value: string) {
  return value.trim().toUpperCase();
}

export function splitHabilidadeCodes(value: string | null | undefined) {
  return (value ?? '')
    .split(/\s+/)
    .map((item) => normalizeHabilidadeCode(item))
    .filter(Boolean);
}

export function joinHabilidadeCodes(values: string[]) {
  const joined = values.map((item) => normalizeHabilidadeCode(item)).filter(Boolean).join(' ').trim();
  return joined || null;
}

export function getCurriculoSegmentoFromCodigo(
  codigo: string,
): CurriculoSegmento | null {
  const normalized = normalizeHabilidadeCode(codigo);

  if (/^EF0[1-5]/.test(normalized)) {
    return 'EFAI';
  }

  if (/^EF0[6-9]/.test(normalized)) {
    return 'EFAF';
  }

  if (/^EM/.test(normalized)) {
    return 'EM';
  }

  return null;
}

export function findMissingHabilidades(
  requestedCodes: string[],
  existingCodes: Iterable<string>,
) {
  const existing = new Set(
    [...existingCodes].map((item) => normalizeHabilidadeCode(item)),
  );

  return requestedCodes
    .map((item) => normalizeHabilidadeCode(item))
    .filter((item) => item && !existing.has(item));
}

export function replaceHabilidadeCode(
  value: string | null | undefined,
  oldCode: string,
  newCode: string,
) {
  const normalizedOld = normalizeHabilidadeCode(oldCode);
  const normalizedNew = normalizeHabilidadeCode(newCode);
  const next = splitHabilidadeCodes(value).map((item) =>
    item === normalizedOld ? normalizedNew : item,
  );

  return joinHabilidadeCodes(next);
}

export function removeHabilidadeCode(
  value: string | null | undefined,
  code: string,
) {
  const normalizedCode = normalizeHabilidadeCode(code);
  const next = splitHabilidadeCodes(value).filter((item) => item !== normalizedCode);

  return joinHabilidadeCodes(next);
}

export function buildRenameCascadePatches(
  target: CascadeTarget,
  rows: CascadeRecord[],
  oldCode: string,
  newCode: string,
) {
  return rows
    .map((row) => ({
      table: target.table,
      field: target.field,
      id: row.id,
      nextValue: replaceHabilidadeCode(row.value, oldCode, newCode),
    }) satisfies CascadePatch)
    .filter((patch, index) => patch.nextValue !== rows[index]?.value);
}

export function buildRemoveCascadePatches(
  target: CascadeTarget,
  rows: CascadeRecord[],
  code: string,
) {
  return rows
    .map((row) => ({
      table: target.table,
      field: target.field,
      id: row.id,
      nextValue: removeHabilidadeCode(row.value, code),
    }) satisfies CascadePatch)
    .filter((patch, index) => patch.nextValue !== rows[index]?.value);
}

export function countCascadeReferences(counts: CascadeCount[]) {
  return counts.reduce((sum, item) => sum + item.count, 0);
}
