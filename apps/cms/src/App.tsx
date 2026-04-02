import { useEffect, useMemo, useState } from 'react';
import {
  AF_SERIES,
  BIMESTRES,
  EM_SERIES,
  getComponentesForSerie,
} from '@guia-priorizado/core';

import './App.css';

const SEGMENTOS = ['EFAI', 'EFAF', 'EM'] as const;
const CMS_TABS = [
  { id: 'curriculo', label: 'Currículo Paulista' },
  { id: 'ae', label: 'Aprendizagem Essencial' },
  { id: 'escopo', label: 'Escopo-Sequência' },
  { id: 'matriz', label: 'Matriz Prova Paulista' },
] as const;
const SERIES = [...AF_SERIES, ...EM_SERIES];
const MATRIZ_GRUPOS = ['Grupo 1', 'Grupo 2', 'Grupo 3'] as const;

type CmsTab = (typeof CMS_TABS)[number]['id'] | 'toolkit';

interface HealthResponse {
  ok: boolean;
  message: string;
}

interface CurriculoRow {
  id: number;
  id_habilidade: string;
  componente: string | null;
  segmento: string | null;
  serie: string | null;
  texto: string | null;
}

interface CurriculoListResponse {
  ok: boolean;
  rows: CurriculoRow[];
}

interface CurriculoMutationResponse {
  ok: boolean;
  row: CurriculoRow;
  codeChanged?: boolean;
  removedReferences?: number;
}

interface AeRow {
  id: number;
  serie: string | null;
  componente: string | null;
  bimestre: string | null;
  ae: string | null;
  titulo: string | null;
  hab_priorizada: string | null;
  hab_relacionadas: string | null;
  conhecimentos_previos: string | null;
}

interface AeListResponse {
  ok: boolean;
  rows: AeRow[];
}

interface AeMutationResponse {
  ok: boolean;
  row: AeRow;
}

interface EscopoRow {
  id: number;
  ano?: string | null;
  serie?: string | null;
  componente: string | null;
  bimestre: string | null;
  aula: string | null;
  titulo: string | null;
  unidade_tematica: string | null;
  habilidades: string | null;
  objeto: string | null;
  conteudo: string | null;
  objetivos: string | null;
  descritivo: string | null;
  referencias: string | null;
  aprendizagem_essencial: string | null;
}

interface EscopoListResponse {
  ok: boolean;
  rows: EscopoRow[];
}

interface EscopoMutationResponse {
  ok: boolean;
  row: EscopoRow;
}

interface MatrizRow {
  id: number;
  serie: string | null;
  componente: string | null;
  ae: string | null;
  bimestre: string | null;
  grupo: string | null;
  descritor: string | null;
}

interface MatrizListResponse {
  ok: boolean;
  rows: MatrizRow[];
}

interface MatrizMutationResponse {
  ok: boolean;
  row: MatrizRow;
}

interface ValidateResponse {
  ok: boolean;
  validCodes: string[];
  missingCodes: string[];
}

interface CascadeResponse {
  ok: boolean;
  action: 'rename' | 'delete';
  oldCode: string;
  newCode: string | null;
  totalReferences: number;
  counts: Array<{ table: string; field: string; count: number }>;
}

interface CurriculoFormState {
  id: number | null;
  componente: string;
  id_habilidade: string;
  texto: string;
}

interface AeFormState {
  id: number | null;
  serie: string;
  componente: string;
  bimestre: string;
  ae: string;
  titulo: string;
  hab_priorizada: string;
  hab_relacionadas: string;
  conhecimentos_previos: string;
}

interface MatrizFormState {
  id: number | null;
  serie: string;
  componente: string;
  ae: string;
  bimestre: string;
  grupo: string;
  descritor: string;
}

interface EscopoFormState {
  id: number | null;
  originalSerie: string;
  serie: string;
  componente: string;
  bimestre: string;
  aula: string;
  titulo: string;
  unidade_tematica: string;
  habilidades: string;
  objeto: string;
  conteudo: string;
  objetivos: string;
  descritivo: string;
  referencias: string;
  aprendizagem_essencial: string;
}

const INITIAL_CURRICULO_FORM: CurriculoFormState = {
  id: null,
  componente: 'MatemÃ¡tica',
  id_habilidade: '',
  texto: 'preencher habilidade',
};

const INITIAL_AE_FORM: AeFormState = {
  id: null,
  serie: AF_SERIES[0],
  componente: 'MatemÃ¡tica',
  bimestre: BIMESTRES[0],
  ae: '',
  titulo: '',
  hab_priorizada: '',
  hab_relacionadas: '',
  conhecimentos_previos: '',
};

const INITIAL_MATRIZ_FORM: MatrizFormState = {
  id: null,
  serie: AF_SERIES[0],
  componente: 'MatemÃ¡tica',
  ae: '',
  bimestre: BIMESTRES[0],
  grupo: MATRIZ_GRUPOS[0],
  descritor: '',
};

const INITIAL_ESCOPO_FORM: EscopoFormState = {
  id: null,
  originalSerie: AF_SERIES[0],
  serie: AF_SERIES[0],
  componente: 'MatemÃ¡tica',
  bimestre: BIMESTRES[0],
  aula: '',
  titulo: '',
  unidade_tematica: '',
  habilidades: '',
  objeto: '',
  conteudo: '',
  objetivos: '',
  descritivo: '',
  referencias: '',
  aprendizagem_essencial: '',
};

async function readJson<TResponse>(url: string) {
  const response = await fetch(url);
  const data = (await response.json()) as TResponse & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'Erro inesperado.');
  }

  return data;
}

async function sendJson<TResponse>(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as TResponse & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'Erro inesperado na API.');
  }

  return data;
}

async function fetchCurriculoRows(segmento: string) {
  const data = await readJson<CurriculoListResponse>(
    `/api/curriculo?segmento=${encodeURIComponent(segmento)}`,
  );
  return data.rows;
}

async function fetchAeRows(filters: {
  serie: string;
  componente: string;
  bimestre: string;
}) {
  const params = new URLSearchParams({ serie: filters.serie });
  if (filters.componente) {
    params.set('componente', filters.componente);
  }
  if (filters.bimestre && filters.bimestre !== 'Todos') {
    params.set('bimestre', filters.bimestre);
  }

  const data = await readJson<AeListResponse>(`/api/ae?${params.toString()}`);
  return data.rows;
}

async function fetchMatrizRows(filters: {
  serie: string;
  componente: string;
  ae: string;
}) {
  const params = new URLSearchParams({ serie: filters.serie });
  if (filters.componente) {
    params.set('componente', filters.componente);
  }
  if (filters.ae && filters.ae !== 'Todos') {
    params.set('ae', filters.ae);
  }

  const data = await readJson<MatrizListResponse>(`/api/matriz?${params.toString()}`);
  return data.rows;
}

async function fetchEscopoRows(filters: {
  serie: string;
  componente: string;
  bimestre: string;
}) {
  const params = new URLSearchParams({ serie: filters.serie });
  if (filters.componente) {
    params.set('componente', filters.componente);
  }
  if (filters.bimestre) {
    params.set('bimestre', filters.bimestre);
  }

  const data = await readJson<EscopoListResponse>(`/api/escopo?${params.toString()}`);
  return data.rows;
}

function splitCodesInput(value: string | null | undefined) {
  return (value ?? '')
    .split(/[\s,;]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function messageClassName(message: string) {
  return message.toLowerCase().includes('erro') ? 'error-text' : 'success-text';
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<CmsTab>('curriculo');
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const [segmento, setSegmento] = useState<string>('EFAF');
  const [componenteFiltro, setComponenteFiltro] = useState<string>('');
  const [curriculoRows, setCurriculoRows] = useState<CurriculoRow[]>([]);
  const [curriculoLoading, setCurriculoLoading] = useState(false);
  const [curriculoError, setCurriculoError] = useState('');
  const [curriculoForm, setCurriculoForm] = useState<CurriculoFormState>(
    INITIAL_CURRICULO_FORM,
  );
  const [curriculoMessage, setCurriculoMessage] = useState('');
  const [curriculoSubmitting, setCurriculoSubmitting] = useState(false);
  const [curriculoDeletingId, setCurriculoDeletingId] = useState<number | null>(null);

  const [aeSerie, setAeSerie] = useState<string>(AF_SERIES[0]);
  const [aeComponente, setAeComponente] = useState<string>('MatemÃ¡tica');
  const [aeBimestre, setAeBimestre] = useState<string>('Todos');
  const [aeRows, setAeRows] = useState<AeRow[]>([]);
  const [aeLoading, setAeLoading] = useState(false);
  const [aeError, setAeError] = useState('');
  const [aeForm, setAeForm] = useState<AeFormState>(INITIAL_AE_FORM);
  const [aeMessage, setAeMessage] = useState('');
  const [aeSubmitting, setAeSubmitting] = useState(false);
  const [aeDeletingId, setAeDeletingId] = useState<number | null>(null);

  const [escopoSerie, setEscopoSerie] = useState<string>(AF_SERIES[0]);
  const [escopoComponente, setEscopoComponente] = useState<string>('MatemÃ¡tica');
  const [escopoBimestre, setEscopoBimestre] = useState<string>(BIMESTRES[0]);
  const [escopoRows, setEscopoRows] = useState<EscopoRow[]>([]);
  const [escopoLoading, setEscopoLoading] = useState(false);
  const [escopoError, setEscopoError] = useState('');
  const [escopoForm, setEscopoForm] = useState<EscopoFormState>(INITIAL_ESCOPO_FORM);
  const [escopoMessage, setEscopoMessage] = useState('');
  const [escopoSubmitting, setEscopoSubmitting] = useState(false);
  const [escopoDeletingId, setEscopoDeletingId] = useState<number | null>(null);

  const [matrizSerie, setMatrizSerie] = useState<string>(AF_SERIES[0]);
  const [matrizComponente, setMatrizComponente] = useState<string>('MatemÃ¡tica');
  const [matrizAeFiltro, setMatrizAeFiltro] = useState<string>('Todos');
  const [matrizRows, setMatrizRows] = useState<MatrizRow[]>([]);
  const [matrizLoading, setMatrizLoading] = useState(false);
  const [matrizError, setMatrizError] = useState('');
  const [matrizForm, setMatrizForm] = useState<MatrizFormState>(INITIAL_MATRIZ_FORM);
  const [matrizMessage, setMatrizMessage] = useState('');
  const [matrizSubmitting, setMatrizSubmitting] = useState(false);
  const [matrizDeletingId, setMatrizDeletingId] = useState<number | null>(null);

  const [codesInput, setCodesInput] = useState('EF06MA01');
  const [validateResult, setValidateResult] = useState<ValidateResponse | null>(null);
  const [validateError, setValidateError] = useState('');
  const [cascadeAction, setCascadeAction] = useState<'rename' | 'delete'>('rename');
  const [oldCode, setOldCode] = useState('EF06MA01');
  const [newCode, setNewCode] = useState('EF06MA01');
  const [cascadeResult, setCascadeResult] = useState<CascadeResponse | null>(null);
  const [cascadeError, setCascadeError] = useState('');

  useEffect(() => {
    readJson<HealthResponse>('/api/health')
      .then(setHealth)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    readJson<{ ok: boolean; authenticated: boolean }>('/api/auth')
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthMessage('');

    try {
      await sendJson<{ ok: boolean; authenticated: boolean }>('/api/auth', 'POST', {
        action: 'login',
        password: loginPassword,
      });
      setAuthenticated(true);
      setLoginPassword('');
      setAuthMessage('');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Erro ao autenticar no CMS.');
      setAuthenticated(false);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await sendJson('/api/auth', 'POST', { action: 'logout' });
    } catch {
      // Ignore logout errors and clear local state anyway.
    }

    setAuthenticated(false);
    setAuthMessage('');
  }

  useEffect(() => {
    if (authenticated !== true) {
      return;
    }

    let ignore = false;

    async function run() {
      setCurriculoLoading(true);
      setCurriculoError('');

      try {
        const rows = await fetchCurriculoRows(segmento);
        if (!ignore) {
          setCurriculoRows(rows);
        }
      } catch (loadError) {
        if (!ignore) {
          setCurriculoRows([]);
          setCurriculoError(
            loadError instanceof Error ? loadError.message : 'Erro ao carregar currÃ­culo.',
          );
        }
      } finally {
        if (!ignore) {
          setCurriculoLoading(false);
        }
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, [authenticated, segmento]);

  const curriculoComponentes = useMemo(
    () =>
      Array.from(
        new Set(
          curriculoRows
            .map((row) => row.componente)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right, 'pt-BR')),
    [curriculoRows],
  );

  const filteredCurriculoRows = useMemo(
    () =>
      componenteFiltro
        ? curriculoRows.filter((row) => row.componente === componenteFiltro)
        : curriculoRows,
    [componenteFiltro, curriculoRows],
  );

  function resetCurriculoForm() {
    setCurriculoForm({
      ...INITIAL_CURRICULO_FORM,
      componente: curriculoComponentes[0] ?? INITIAL_CURRICULO_FORM.componente,
    });
    setCurriculoMessage('');
  }

  function startCurriculoEdit(row: CurriculoRow) {
    setCurriculoForm({
      id: row.id,
      componente: row.componente ?? '',
      id_habilidade: row.id_habilidade,
      texto: row.texto ?? '',
    });
    setCurriculoMessage('');
  }

  async function handleCurriculoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCurriculoSubmitting(true);
    setCurriculoMessage('');

    try {
      const payload = {
        componente: curriculoForm.componente,
        id_habilidade: curriculoForm.id_habilidade.toUpperCase(),
        texto: curriculoForm.texto,
      };
      const result = curriculoForm.id
        ? await sendJson<CurriculoMutationResponse>(
            `/api/curriculo/${curriculoForm.id}`,
            'PATCH',
            payload,
          )
        : await sendJson<CurriculoMutationResponse>('/api/curriculo', 'POST', payload);

      const rows = await fetchCurriculoRows(segmento);
      setCurriculoRows(rows);
      setCurriculoMessage(
        curriculoForm.id
          ? result.codeChanged
            ? 'Habilidade atualizada com cascade aplicado.'
            : 'Habilidade atualizada.'
          : 'Habilidade criada.',
      );
      resetCurriculoForm();
    } catch (submitError) {
      setCurriculoMessage(
        submitError instanceof Error ? submitError.message : 'Erro ao salvar habilidade.',
      );
    } finally {
      setCurriculoSubmitting(false);
    }
  }

  async function handleCurriculoDelete(row: CurriculoRow) {
    if (!window.confirm(`Excluir a habilidade "${row.id_habilidade}"?`)) {
      return;
    }

    setCurriculoDeletingId(row.id);
    setCurriculoMessage('');

    try {
      const result = await sendJson<CurriculoMutationResponse>(
        `/api/curriculo/${row.id}`,
        'DELETE',
      );
      const rows = await fetchCurriculoRows(segmento);
      setCurriculoRows(rows);
      setCurriculoMessage(
        result.removedReferences
          ? `Habilidade excluÃ­da com ${result.removedReferences} vÃ­nculo(s) removido(s).`
          : 'Habilidade excluÃ­da.',
      );

      if (curriculoForm.id === row.id) {
        resetCurriculoForm();
      }
    } catch (deleteError) {
      setCurriculoMessage(
        deleteError instanceof Error ? deleteError.message : 'Erro ao excluir habilidade.',
      );
    } finally {
      setCurriculoDeletingId(null);
    }
  }

  const aeComponentes = useMemo(() => getComponentesForSerie(aeSerie), [aeSerie]);
  const aeFormComponentes = useMemo(
    () => getComponentesForSerie(aeForm.serie),
    [aeForm.serie],
  );

  useEffect(() => {
    if (!aeComponentes.some((item) => item === aeComponente)) {
      setAeComponente(aeComponentes[0] ?? '');
    }
  }, [aeComponentes, aeComponente]);

  useEffect(() => {
    if (!aeFormComponentes.some((item) => item === aeForm.componente)) {
      setAeForm((current) => ({
        ...current,
        componente: aeFormComponentes[0] ?? '',
      }));
    }
  }, [aeForm.componente, aeFormComponentes]);

  useEffect(() => {
    if (authenticated !== true) {
      return;
    }

    if (!aeComponente) {
      return;
    }

    let ignore = false;

    async function run() {
      setAeLoading(true);
      setAeError('');

      try {
        const rows = await fetchAeRows({
          serie: aeSerie,
          componente: aeComponente,
          bimestre: aeBimestre,
        });
        if (!ignore) {
          setAeRows(rows);
        }
      } catch (loadError) {
        if (!ignore) {
          setAeRows([]);
          setAeError(loadError instanceof Error ? loadError.message : 'Erro ao carregar AEs.');
        }
      } finally {
        if (!ignore) {
          setAeLoading(false);
        }
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, [aeSerie, aeComponente, aeBimestre, authenticated]);

  function resetAeForm() {
    setAeForm({
      ...INITIAL_AE_FORM,
      serie: aeSerie,
      componente: aeComponente,
      bimestre: aeBimestre === 'Todos' ? BIMESTRES[0] : aeBimestre,
    });
    setAeMessage('');
  }

  function startAeEdit(row: AeRow) {
    setAeForm({
      id: row.id,
      serie: row.serie ?? aeSerie,
      componente: row.componente ?? aeComponente,
      bimestre: row.bimestre ?? BIMESTRES[0],
      ae: row.ae ?? '',
      titulo: row.titulo ?? '',
      hab_priorizada: row.hab_priorizada ?? '',
      hab_relacionadas: row.hab_relacionadas ?? '',
      conhecimentos_previos: row.conhecimentos_previos ?? '',
    });
    setAeMessage('');
  }

  async function handleAeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAeSubmitting(true);
    setAeMessage('');

    try {
      const payload = {
        serie: aeForm.serie,
        componente: aeForm.componente,
        bimestre: aeForm.bimestre,
        ae: aeForm.ae.toUpperCase(),
        titulo: aeForm.titulo,
        hab_priorizada: aeForm.hab_priorizada.toUpperCase(),
        hab_relacionadas: aeForm.hab_relacionadas,
        conhecimentos_previos: aeForm.conhecimentos_previos,
      };

      await (aeForm.id
        ? sendJson<AeMutationResponse>(`/api/ae/${aeForm.id}`, 'PATCH', payload)
        : sendJson<AeMutationResponse>('/api/ae', 'POST', payload));

      setAeSerie(aeForm.serie);
      setAeComponente(aeForm.componente);
      setAeBimestre(aeForm.bimestre);
      const rows = await fetchAeRows({
        serie: aeForm.serie,
        componente: aeForm.componente,
        bimestre: aeForm.bimestre,
      });
      setAeRows(rows);
      setAeMessage(aeForm.id ? 'AE atualizada.' : 'AE criada.');
      setAeForm({
        ...INITIAL_AE_FORM,
        serie: aeForm.serie,
        componente: aeForm.componente,
        bimestre: aeForm.bimestre,
      });
    } catch (submitError) {
      setAeMessage(submitError instanceof Error ? submitError.message : 'Erro ao salvar AE.');
    } finally {
      setAeSubmitting(false);
    }
  }

  async function handleAeDelete(row: AeRow) {
    const code = row.ae ?? `ID ${row.id}`;
    if (!window.confirm(`Excluir a AE "${code}"?`)) {
      return;
    }

    setAeDeletingId(row.id);
    setAeMessage('');

    try {
      await sendJson<AeMutationResponse>(
        `/api/ae/${row.id}?serie=${encodeURIComponent(row.serie ?? aeSerie)}`,
        'DELETE',
      );
      const rows = await fetchAeRows({
        serie: aeSerie,
        componente: aeComponente,
        bimestre: aeBimestre,
      });
      setAeRows(rows);
      setAeMessage('AE excluÃ­da.');

      if (aeForm.id === row.id) {
        resetAeForm();
      }
    } catch (deleteError) {
      setAeMessage(deleteError instanceof Error ? deleteError.message : 'Erro ao excluir AE.');
    } finally {
      setAeDeletingId(null);
    }
  }

  const escopoComponentes = useMemo(
    () => getComponentesForSerie(escopoSerie),
    [escopoSerie],
  );
  const escopoFormComponentes = useMemo(
    () => getComponentesForSerie(escopoForm.serie),
    [escopoForm.serie],
  );

  useEffect(() => {
    if (!escopoComponentes.some((item) => item === escopoComponente)) {
      setEscopoComponente(escopoComponentes[0] ?? '');
    }
  }, [escopoComponentes, escopoComponente]);

  useEffect(() => {
    if (!escopoFormComponentes.some((item) => item === escopoForm.componente)) {
      setEscopoForm((current) => ({
        ...current,
        componente: escopoFormComponentes[0] ?? '',
      }));
    }
  }, [escopoForm.componente, escopoFormComponentes]);

  useEffect(() => {
    if (authenticated !== true) {
      return;
    }

    if (!escopoComponente || !escopoBimestre) {
      return;
    }

    let ignore = false;

    async function run() {
      setEscopoLoading(true);
      setEscopoError('');

      try {
        const rows = await fetchEscopoRows({
          serie: escopoSerie,
          componente: escopoComponente,
          bimestre: escopoBimestre,
        });
        if (!ignore) {
          setEscopoRows(rows);
        }
      } catch (loadError) {
        if (!ignore) {
          setEscopoRows([]);
          setEscopoError(
            loadError instanceof Error ? loadError.message : 'Erro ao carregar o escopo.',
          );
        }
      } finally {
        if (!ignore) {
          setEscopoLoading(false);
        }
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, [authenticated, escopoSerie, escopoComponente, escopoBimestre]);

  function resetEscopoForm() {
    setEscopoForm({
      ...INITIAL_ESCOPO_FORM,
      originalSerie: escopoSerie,
      serie: escopoSerie,
      componente: escopoComponente,
      bimestre: escopoBimestre,
    });
    setEscopoMessage('');
  }

  function startEscopoEdit(row: EscopoRow) {
    const rowSerie = row.ano ?? row.serie ?? escopoSerie;
    setEscopoForm({
      id: row.id,
      originalSerie: rowSerie,
      serie: rowSerie,
      componente: row.componente ?? escopoComponente,
      bimestre: row.bimestre ?? escopoBimestre,
      aula: row.aula ?? '',
      titulo: row.titulo ?? '',
      unidade_tematica: row.unidade_tematica ?? '',
      habilidades: row.habilidades ?? '',
      objeto: row.objeto ?? '',
      conteudo: row.conteudo ?? '',
      objetivos: row.objetivos ?? '',
      descritivo: row.descritivo ?? '',
      referencias: row.referencias ?? '',
      aprendizagem_essencial: row.aprendizagem_essencial ?? '',
    });
    setEscopoMessage('');
  }

  async function handleEscopoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEscopoSubmitting(true);
    setEscopoMessage('');

    try {
      const payload = {
        originalSerie: escopoForm.originalSerie,
        serie: escopoForm.serie,
        componente: escopoForm.componente,
        bimestre: escopoForm.bimestre,
        aula: escopoForm.aula,
        titulo: escopoForm.titulo,
        unidade_tematica: escopoForm.unidade_tematica,
        habilidades: escopoForm.habilidades.toUpperCase(),
        objeto: escopoForm.objeto,
        conteudo: escopoForm.conteudo,
        objetivos: escopoForm.objetivos,
        descritivo: escopoForm.descritivo,
        referencias: escopoForm.referencias,
        aprendizagem_essencial: escopoForm.aprendizagem_essencial,
      };

      await (escopoForm.id
        ? sendJson<EscopoMutationResponse>(`/api/escopo/${escopoForm.id}`, 'PATCH', payload)
        : sendJson<EscopoMutationResponse>('/api/escopo', 'POST', payload));

      setEscopoSerie(escopoForm.serie);
      setEscopoComponente(escopoForm.componente);
      setEscopoBimestre(escopoForm.bimestre);
      const rows = await fetchEscopoRows({
        serie: escopoForm.serie,
        componente: escopoForm.componente,
        bimestre: escopoForm.bimestre,
      });
      setEscopoRows(rows);
      setEscopoMessage(escopoForm.id ? 'Aula atualizada.' : 'Aula criada.');
      setEscopoForm({
        ...INITIAL_ESCOPO_FORM,
        originalSerie: escopoForm.serie,
        serie: escopoForm.serie,
        componente: escopoForm.componente,
        bimestre: escopoForm.bimestre,
      });
    } catch (submitError) {
      setEscopoMessage(
        submitError instanceof Error ? submitError.message : 'Erro ao salvar aula.',
      );
    } finally {
      setEscopoSubmitting(false);
    }
  }

  async function handleEscopoDelete(row: EscopoRow) {
    const rowSerie = row.ano ?? row.serie ?? escopoSerie;
    if (
      !window.confirm(
        `Excluir a Aula ${row.aula ?? ''} - "${row.titulo ?? ''}" (${row.bimestre ?? ''})?`,
      )
    ) {
      return;
    }

    setEscopoDeletingId(row.id);
    setEscopoMessage('');

    try {
      await sendJson<EscopoMutationResponse>(
        `/api/escopo/${row.id}?serie=${encodeURIComponent(rowSerie)}`,
        'DELETE',
      );
      const rows = await fetchEscopoRows({
        serie: escopoSerie,
        componente: escopoComponente,
        bimestre: escopoBimestre,
      });
      setEscopoRows(rows);
      setEscopoMessage('Aula excluÃ­da.');

      if (escopoForm.id === row.id) {
        resetEscopoForm();
      }
    } catch (deleteError) {
      setEscopoMessage(
        deleteError instanceof Error ? deleteError.message : 'Erro ao excluir aula.',
      );
    } finally {
      setEscopoDeletingId(null);
    }
  }

  const matrizComponentes = useMemo(
    () => getComponentesForSerie(matrizSerie),
    [matrizSerie],
  );
  const matrizFormComponentes = useMemo(
    () => getComponentesForSerie(matrizForm.serie),
    [matrizForm.serie],
  );
  const matrizAeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          matrizRows
            .map((row) => row.ae)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right, 'pt-BR')),
    [matrizRows],
  );

  useEffect(() => {
    if (!matrizComponentes.some((item) => item === matrizComponente)) {
      setMatrizComponente(matrizComponentes[0] ?? '');
    }
  }, [matrizComponentes, matrizComponente]);

  useEffect(() => {
    if (!matrizFormComponentes.some((item) => item === matrizForm.componente)) {
      setMatrizForm((current) => ({
        ...current,
        componente: matrizFormComponentes[0] ?? '',
      }));
    }
  }, [matrizForm.componente, matrizFormComponentes]);

  useEffect(() => {
    if (authenticated !== true) {
      return;
    }

    if (!matrizComponente) {
      return;
    }

    let ignore = false;

    async function run() {
      setMatrizLoading(true);
      setMatrizError('');

      try {
        const rows = await fetchMatrizRows({
          serie: matrizSerie,
          componente: matrizComponente,
          ae: matrizAeFiltro,
        });
        if (!ignore) {
          setMatrizRows(rows);
        }
      } catch (loadError) {
        if (!ignore) {
          setMatrizRows([]);
          setMatrizError(
            loadError instanceof Error ? loadError.message : 'Erro ao carregar a matriz.',
          );
        }
      } finally {
        if (!ignore) {
          setMatrizLoading(false);
        }
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, [authenticated, matrizSerie, matrizComponente, matrizAeFiltro]);

  function resetMatrizForm() {
    setMatrizForm({
      ...INITIAL_MATRIZ_FORM,
      serie: matrizSerie,
      componente: matrizComponente,
      ae: matrizAeFiltro !== 'Todos' ? matrizAeFiltro : '',
    });
    setMatrizMessage('');
  }

  function startMatrizEdit(row: MatrizRow) {
    setMatrizForm({
      id: row.id,
      serie: row.serie ?? matrizSerie,
      componente: row.componente ?? matrizComponente,
      ae: row.ae ?? '',
      bimestre: row.bimestre ?? BIMESTRES[0],
      grupo: row.grupo ?? MATRIZ_GRUPOS[0],
      descritor: row.descritor ?? '',
    });
    setMatrizMessage('');
  }

  async function handleMatrizSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMatrizSubmitting(true);
    setMatrizMessage('');

    try {
      const payload = {
        serie: matrizForm.serie,
        componente: matrizForm.componente,
        ae: matrizForm.ae.toUpperCase(),
        bimestre: matrizForm.bimestre,
        grupo: matrizForm.grupo,
        descritor: matrizForm.descritor,
      };

      await (matrizForm.id
        ? sendJson<MatrizMutationResponse>(`/api/matriz/${matrizForm.id}`, 'PATCH', payload)
        : sendJson<MatrizMutationResponse>('/api/matriz', 'POST', payload));

      setMatrizSerie(matrizForm.serie);
      setMatrizComponente(matrizForm.componente);
      setMatrizAeFiltro(matrizForm.ae || 'Todos');
      const rows = await fetchMatrizRows({
        serie: matrizForm.serie,
        componente: matrizForm.componente,
        ae: matrizForm.ae || 'Todos',
      });
      setMatrizRows(rows);
      setMatrizMessage(matrizForm.id ? 'Descritor atualizado.' : 'Descritor criado.');
      setMatrizForm({
        ...INITIAL_MATRIZ_FORM,
        serie: matrizForm.serie,
        componente: matrizForm.componente,
        ae: matrizForm.ae,
      });
    } catch (submitError) {
      setMatrizMessage(
        submitError instanceof Error ? submitError.message : 'Erro ao salvar descritor.',
      );
    } finally {
      setMatrizSubmitting(false);
    }
  }

  async function handleMatrizDelete(row: MatrizRow) {
    const preview = row.descritor && row.descritor.length > 80
      ? `${row.descritor.slice(0, 80)}...`
      : row.descritor ?? '';

    if (
      !window.confirm(
        `Excluir o descritor "${row.ae ?? ''} / ${row.grupo ?? ''}"?\n\n"${preview}"`,
      )
    ) {
      return;
    }

    setMatrizDeletingId(row.id);
    setMatrizMessage('');

    try {
      await sendJson<MatrizMutationResponse>(
        `/api/matriz/${row.id}?serie=${encodeURIComponent(row.serie ?? matrizSerie)}`,
        'DELETE',
      );
      const rows = await fetchMatrizRows({
        serie: matrizSerie,
        componente: matrizComponente,
        ae: matrizAeFiltro,
      });
      setMatrizRows(rows);
      setMatrizMessage('Descritor excluÃ­do.');

      if (matrizForm.id === row.id) {
        resetMatrizForm();
      }
    } catch (deleteError) {
      setMatrizMessage(
        deleteError instanceof Error ? deleteError.message : 'Erro ao excluir descritor.',
      );
    } finally {
      setMatrizDeletingId(null);
    }
  }

  async function handleValidateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const result = await sendJson<ValidateResponse>('/api/habilidades/validate', 'POST', {
        codes: splitCodesInput(codesInput),
      });
      setValidateResult(result);
      setValidateError('');
    } catch (validateErrorValue) {
      setValidateError(
        validateErrorValue instanceof Error
          ? validateErrorValue.message
          : 'Erro ao validar habilidades.',
      );
      setValidateResult(null);
    }
  }

  async function handleCascadeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const result = await sendJson<CascadeResponse>(
        '/api/habilidades/cascade-preview',
        'POST',
        {
          action: cascadeAction,
          oldCode,
          newCode: cascadeAction === 'rename' ? newCode : undefined,
        },
      );
      setCascadeResult(result);
      setCascadeError('');
    } catch (cascadeErrorValue) {
      setCascadeError(
        cascadeErrorValue instanceof Error
          ? cascadeErrorValue.message
          : 'Erro ao gerar preview de cascade.',
      );
      setCascadeResult(null);
    }
  }

  return (
    <div className="ds-page">
      <header className="ds-header">
        <div className="ds-header-inner">
          <div className="ds-brand">
            <span className="ds-logo">GP</span>
            <div className="ds-header-copy">
              <h1>CMS do Currículo Priorizado 2026</h1>
              <p>SEDUC SP</p>
            </div>
          </div>
          <div className="cms-header-actions">
            {authenticated ? (
              <button className="c-btn c-btn-ghost c-btn-sm" onClick={handleLogout} type="button">
                Sair
              </button>
            ) : null}
            <span className="ds-header-meta">Painel de Edição</span>
          </div>
        </div>
      </header>

      <main className="ds-shell cms-shell">
        {authenticated === null ? (
          <section className="ds-panel cms-auth-card">
            <span className="label">Autenticação</span>
            <h2>Carregando sessão do CMS</h2>
            <p className="muted">Validando acesso antes de carregar os módulos administrativos.</p>
          </section>
        ) : null}

        {authenticated === false ? (
          <section className="ds-panel cms-auth-card">
            <span className="label">Acesso restrito</span>
            <h2>Entrar no CMS</h2>
            <p>
              Informe a senha para acessar o painel de edição do Guia Priorizado 2026.
            </p>
            <form className="tool-form cms-auth-form" onSubmit={handleLogin}>
              <label className="field field-full">
                <span>Senha do CMS</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Digite a senha de acesso"
                />
              </label>
              <div className="form-actions">
                <button className="c-btn c-btn-primary" disabled={authSubmitting} type="submit">
                  {authSubmitting ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </form>
            {authMessage ? <p className="error-text">{authMessage}</p> : null}
          </section>
        ) : null}

        {authenticated === true ? (
          <>
        <div className="ds-tabs-bar">
          <div className="ds-shell cms-shell-frame">
            <nav className="cms-modules" aria-label="Módulos do CMS">
              {CMS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={tab.id === activeTab ? 'cms-module-tab active' : 'cms-module-tab'}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <section className="cms-intro">
          <div>
            <span className="label">Painel de edição</span>
            <h2>{CMS_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Módulo'}</h2>
            <p>Selecione filtros, edite registros e publique as alterações do guia.</p>
          </div>
          <div className="cms-intro-meta">
            <span>Currículo Paulista</span>
            <span>Aprendizagem Essencial</span>
            <span>Escopo-Sequência</span>
            <span>Matriz</span>
            {health?.ok ? <span>API online</span> : null}
          </div>
        </section>
        {activeTab === 'curriculo' ? (
          <section className="cms-grid cms-grid-wide">
            <article className="cms-card ds-card">
              <div className="section-head">
                <div>
                  <span className="label">Currículo Paulista</span>
                  <h2>Lista e filtros</h2>
                </div>
                <button className="c-btn c-btn-ghost" onClick={resetCurriculoForm} type="button">
                  Nova habilidade
                </button>
              </div>

              <div className="filter-grid">
                <label className="field">
                  <span>Segmento</span>
                  <select
                    value={segmento}
                    onChange={(event) => {
                      setSegmento(event.target.value);
                      setComponenteFiltro('');
                    }}
                  >
                    {SEGMENTOS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Componente</span>
                  <select
                    value={componenteFiltro}
                    onChange={(event) => setComponenteFiltro(event.target.value)}
                  >
                    <option value="">Todos</option>
                    {curriculoComponentes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="status-line">
                {curriculoLoading
                  ? 'Carregando currÃ­culo...'
                  : `${filteredCurriculoRows.length} habilidade(s) encontrada(s)`}
              </div>
              {curriculoError ? <p className="error-text">{curriculoError}</p> : null}

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Componente</th>
                      <th>CÃ³digo</th>
                      <th>Texto</th>
                      <th>AÃ§Ãµes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCurriculoRows.length > 0 ? (
                      filteredCurriculoRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.componente || 'Sem componente'}</td>
                          <td className="td-mono">{row.id_habilidade}</td>
                          <td className="td-wrap">{row.texto || ''}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="c-btn c-btn-ghost c-btn-sm"
                                onClick={() => startCurriculoEdit(row)}
                                type="button"
                              >
                                Editar
                              </button>
                              <button
                                className="c-btn c-btn-danger c-btn-sm"
                                disabled={curriculoDeletingId === row.id}
                                onClick={() => handleCurriculoDelete(row)}
                                type="button"
                              >
                                {curriculoDeletingId === row.id ? 'Excluindo...' : 'Excluir'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="empty-row" colSpan={4}>
                          Nenhuma habilidade encontrada para esse filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="cms-card ds-card">
              <span className="label">
                {curriculoForm.id ? 'Editar habilidade' : 'Nova habilidade'}
              </span>
              <h2>FormulÃ¡rio seguro</h2>

              <form className="tool-form" onSubmit={handleCurriculoSubmit}>
                <label className="field">
                  <span>Componente</span>
                  <select
                    value={curriculoForm.componente}
                    onChange={(event) =>
                      setCurriculoForm((current) => ({
                        ...current,
                        componente: event.target.value,
                      }))
                    }
                  >
                    {curriculoComponentes.length > 0 ? (
                      curriculoComponentes.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))
                    ) : (
                      <option value={curriculoForm.componente}>{curriculoForm.componente}</option>
                    )}
                  </select>
                </label>

                <label className="field">
                  <span>CÃ³digo</span>
                  <input
                    value={curriculoForm.id_habilidade}
                    onChange={(event) =>
                      setCurriculoForm((current) => ({
                        ...current,
                        id_habilidade: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="EF06MA01"
                  />
                </label>

                <label className="field field-full">
                  <span>Texto da habilidade</span>
                  <textarea
                    rows={6}
                    value={curriculoForm.texto}
                    onChange={(event) =>
                      setCurriculoForm((current) => ({
                        ...current,
                        texto: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="form-actions">
                  <button
                    className="c-btn c-btn-primary"
                    disabled={curriculoSubmitting}
                    type="submit"
                  >
                    {curriculoSubmitting
                      ? 'Salvando...'
                      : curriculoForm.id
                        ? 'Salvar alteraÃ§Ãµes'
                        : 'Criar habilidade'}
                  </button>
                  <button className="c-btn c-btn-ghost" onClick={resetCurriculoForm} type="button">
                    Limpar
                  </button>
                </div>
              </form>

              {curriculoMessage ? (
                <p className={messageClassName(curriculoMessage)}>{curriculoMessage}</p>
              ) : null}
            </article>
          </section>
        ) : null}
        {activeTab === 'ae' ? (
          <section className="cms-grid cms-grid-wide">
            <article className="cms-card ds-card">
              <div className="section-head">
                <div>
                  <span className="label">Aprendizagem Essencial</span>
                  <h2>Lista e filtros</h2>
                </div>
                <button className="c-btn c-btn-ghost" onClick={resetAeForm} type="button">
                  Nova AE
                </button>
              </div>

              <div className="filter-grid filter-grid-triple">
                <label className="field">
                  <span>SÃ©rie</span>
                  <select value={aeSerie} onChange={(event) => setAeSerie(event.target.value)}>
                    {SERIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Componente</span>
                  <select
                    value={aeComponente}
                    onChange={(event) => setAeComponente(event.target.value)}
                  >
                    {aeComponentes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Bimestre</span>
                  <select value={aeBimestre} onChange={(event) => setAeBimestre(event.target.value)}>
                    <option value="Todos">Todos</option>
                    {BIMESTRES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="status-line">
                {aeLoading ? 'Carregando AEs...' : `${aeRows.length} AE(s) encontrada(s)`}
              </div>
              {aeError ? <p className="error-text">{aeError}</p> : null}

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SÃ©rie</th>
                      <th>Componente</th>
                      <th>Bimestre</th>
                      <th>CÃ³digo</th>
                      <th>Aprendizagem Essencial</th>
                      <th>Hab. priorizada</th>
                      <th>AÃ§Ãµes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aeRows.length > 0 ? (
                      aeRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.serie || ''}</td>
                          <td>{row.componente || ''}</td>
                          <td>{row.bimestre || ''}</td>
                          <td className="td-mono">{row.ae || ''}</td>
                          <td className="td-wrap">{row.titulo || ''}</td>
                          <td className="td-mono">{row.hab_priorizada || ''}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="c-btn c-btn-ghost c-btn-sm"
                                onClick={() => startAeEdit(row)}
                                type="button"
                              >
                                Editar
                              </button>
                              <button
                                className="c-btn c-btn-danger c-btn-sm"
                                disabled={aeDeletingId === row.id}
                                onClick={() => handleAeDelete(row)}
                                type="button"
                              >
                                {aeDeletingId === row.id ? 'Excluindo...' : 'Excluir'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="empty-row" colSpan={7}>
                          Nenhuma AE encontrada para esse filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="cms-card ds-card">
              <span className="label">{aeForm.id ? 'Editar AE' : 'Nova AE'}</span>
              <h2>Cadastro com validaÃ§Ã£o de habilidades</h2>

              <form className="tool-form" onSubmit={handleAeSubmit}>
                <label className="field">
                  <span>SÃ©rie</span>
                  <select
                    value={aeForm.serie}
                    onChange={(event) =>
                      setAeForm((current) => ({
                        ...current,
                        serie: event.target.value,
                      }))
                    }
                  >
                    {SERIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Componente</span>
                  <select
                    value={aeForm.componente}
                    onChange={(event) =>
                      setAeForm((current) => ({
                        ...current,
                        componente: event.target.value,
                      }))
                    }
                  >
                    {aeFormComponentes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Bimestre</span>
                  <select
                    value={aeForm.bimestre}
                    onChange={(event) =>
                      setAeForm((current) => ({
                        ...current,
                        bimestre: event.target.value,
                      }))
                    }
                  >
                    {BIMESTRES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>CÃ³digo AE</span>
                  <input
                    value={aeForm.ae}
                    onChange={(event) =>
                      setAeForm((current) => ({
                        ...current,
                        ae: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="AE1"
                  />
                </label>

                <label className="field field-full">
                  <span>TÃ­tulo</span>
                  <textarea
                    rows={4}
                    value={aeForm.titulo}
                    onChange={(event) =>
                      setAeForm((current) => ({
                        ...current,
                        titulo: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Habilidade priorizada</span>
                  <input
                    value={aeForm.hab_priorizada}
                    onChange={(event) =>
                      setAeForm((current) => ({
                        ...current,
                        hab_priorizada: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="EF06MA01"
                  />
                </label>

                <label className="field field-full">
                  <span>Outras habilidades</span>
                  <textarea
                    rows={3}
                    value={aeForm.hab_relacionadas}
                    onChange={(event) =>
                      setAeForm((current) => ({
                        ...current,
                        hab_relacionadas: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Separe por espaÃ§o, vÃ­rgula ou ponto e vÃ­rgula."
                  />
                </label>

                <label className="field field-full">
                  <span>Habilidades prÃ©vias</span>
                  <textarea
                    rows={3}
                    value={aeForm.conhecimentos_previos}
                    onChange={(event) =>
                      setAeForm((current) => ({
                        ...current,
                        conhecimentos_previos: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Separe por espaÃ§o, vÃ­rgula ou ponto e vÃ­rgula."
                  />
                </label>

                <div className="form-actions">
                  <button className="c-btn c-btn-primary" disabled={aeSubmitting} type="submit">
                    {aeSubmitting ? 'Salvando...' : aeForm.id ? 'Salvar AE' : 'Criar AE'}
                  </button>
                  <button className="c-btn c-btn-ghost" onClick={resetAeForm} type="button">
                    Limpar
                  </button>
                </div>
              </form>

              <div className="result-stack">
                <div className="result-group">
                  <span className="label">PrÃ©via dos cÃ³digos relacionados</span>
                  <div className="chip-list">
                    {splitCodesInput(aeForm.hab_relacionadas).length > 0 ? (
                      splitCodesInput(aeForm.hab_relacionadas).map((code) => (
                        <span className="chip neutral-chip" key={`rel-${code}`}>
                          {code}
                        </span>
                      ))
                    ) : (
                      <span className="muted">Nenhuma habilidade adicional informada.</span>
                    )}
                  </div>
                </div>

                <div className="result-group">
                  <span className="label">PrÃ©via das habilidades prÃ©vias</span>
                  <div className="chip-list">
                    {splitCodesInput(aeForm.conhecimentos_previos).length > 0 ? (
                      splitCodesInput(aeForm.conhecimentos_previos).map((code) => (
                        <span className="chip neutral-chip" key={`prev-${code}`}>
                          {code}
                        </span>
                      ))
                    ) : (
                      <span className="muted">Nenhuma habilidade prÃ©via informada.</span>
                    )}
                  </div>
                </div>
              </div>

              {aeMessage ? <p className={messageClassName(aeMessage)}>{aeMessage}</p> : null}
            </article>
          </section>
        ) : null}
        {activeTab === 'escopo' ? (
          <section className="cms-grid cms-grid-wide">
            <article className="cms-card ds-card">
              <div className="section-head">
                <div>
                  <span className="label">Escopo-Sequência</span>
                  <h2>Lista e filtros</h2>
                </div>
                <button className="c-btn c-btn-ghost" onClick={resetEscopoForm} type="button">
                  Nova aula
                </button>
              </div>

              <div className="filter-grid filter-grid-triple">
                <label className="field">
                  <span>SÃ©rie</span>
                  <select value={escopoSerie} onChange={(event) => setEscopoSerie(event.target.value)}>
                    {SERIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Componente</span>
                  <select
                    value={escopoComponente}
                    onChange={(event) => setEscopoComponente(event.target.value)}
                  >
                    {escopoComponentes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Bimestre</span>
                  <select
                    value={escopoBimestre}
                    onChange={(event) => setEscopoBimestre(event.target.value)}
                  >
                    {BIMESTRES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="status-line">
                {escopoLoading
                  ? 'Carregando escopo...'
                  : `${escopoRows.length} aula(s) encontrada(s)`}
              </div>
              {escopoError ? <p className="error-text">{escopoError}</p> : null}

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bimestre</th>
                      <th>Aula</th>
                      <th>TÃ­tulo</th>
                      <th>Componente</th>
                      <th>Habilidades</th>
                      <th>AÃ§Ãµes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {escopoRows.length > 0 ? (
                      escopoRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.bimestre || ''}</td>
                          <td>{row.aula || ''}</td>
                          <td className="td-wrap">{row.titulo || ''}</td>
                          <td>{row.componente || ''}</td>
                          <td className="td-mono td-wrap">
                            {splitCodesInput(row.habilidades).join(' · ')}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="c-btn c-btn-ghost c-btn-sm"
                                onClick={() => startEscopoEdit(row)}
                                type="button"
                              >
                                Editar
                              </button>
                              <button
                                className="c-btn c-btn-danger c-btn-sm"
                                disabled={escopoDeletingId === row.id}
                                onClick={() => handleEscopoDelete(row)}
                                type="button"
                              >
                                {escopoDeletingId === row.id ? 'Excluindo...' : 'Excluir'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="empty-row" colSpan={6}>
                          Nenhuma aula encontrada para esse filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="cms-card ds-card">
              <span className="label">{escopoForm.id ? 'Editar aula' : 'Nova aula'}</span>
              <h2>Cadastro de Escopo-Sequência</h2>

              <form className="tool-form" onSubmit={handleEscopoSubmit}>
                <label className="field">
                  <span>SÃ©rie</span>
                  <select
                    value={escopoForm.serie}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        serie: event.target.value,
                      }))
                    }
                  >
                    {SERIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Componente</span>
                  <select
                    value={escopoForm.componente}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        componente: event.target.value,
                      }))
                    }
                  >
                    {escopoFormComponentes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Bimestre</span>
                  <select
                    value={escopoForm.bimestre}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        bimestre: event.target.value,
                      }))
                    }
                  >
                    {BIMESTRES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Nº Aula</span>
                  <input
                    min="1"
                    type="number"
                    value={escopoForm.aula}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        aula: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="field field-full">
                  <span>TÃ­tulo</span>
                  <input
                    value={escopoForm.titulo}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        titulo: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="field field-full">
                  <span>Unidade temÃ¡tica</span>
                  <input
                    value={escopoForm.unidade_tematica}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        unidade_tematica: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="field field-full">
                  <span>Habilidades</span>
                  <textarea
                    rows={3}
                    value={escopoForm.habilidades}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        habilidades: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Separe por espaÃ§o, vÃ­rgula ou ponto e vÃ­rgula."
                  />
                </label>

                <label className="field field-full">
                  <span>Aprendizagem essencial</span>
                  <textarea
                    rows={3}
                    value={escopoForm.aprendizagem_essencial}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        aprendizagem_essencial: event.target.value,
                      }))
                    }
                    placeholder="Ex.: AE1 - NÃºmeros naturais e decimais."
                  />
                </label>

                <label className="field field-full">
                  <span>Objeto de conhecimento</span>
                  <input
                    value={escopoForm.objeto}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        objeto: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="field field-full">
                  <span>ConteÃºdo</span>
                  <textarea
                    rows={3}
                    value={escopoForm.conteudo}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        conteudo: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="field field-full">
                  <span>Objetivos</span>
                  <textarea
                    rows={3}
                    value={escopoForm.objetivos}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        objetivos: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="field field-full">
                  <span>Descritivo</span>
                  <textarea
                    rows={3}
                    value={escopoForm.descritivo}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        descritivo: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="field field-full">
                  <span>ReferÃªncias</span>
                  <textarea
                    rows={2}
                    value={escopoForm.referencias}
                    onChange={(event) =>
                      setEscopoForm((current) => ({
                        ...current,
                        referencias: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="form-actions">
                  <button
                    className="c-btn c-btn-primary"
                    disabled={escopoSubmitting}
                    type="submit"
                  >
                    {escopoSubmitting
                      ? 'Salvando...'
                      : escopoForm.id
                        ? 'Salvar aula'
                        : 'Criar aula'}
                  </button>
                  <button className="c-btn c-btn-ghost" onClick={resetEscopoForm} type="button">
                    Limpar
                  </button>
                </div>
              </form>

              <div className="result-stack">
                <div className="result-group">
                  <span className="label">PrÃ©via das habilidades</span>
                  <div className="chip-list">
                    {splitCodesInput(escopoForm.habilidades).length > 0 ? (
                      splitCodesInput(escopoForm.habilidades).map((code) => (
                        <span className="chip neutral-chip" key={code}>
                          {code}
                        </span>
                      ))
                    ) : (
                      <span className="muted">Nenhuma habilidade informada.</span>
                    )}
                  </div>
                </div>
              </div>

              {escopoMessage ? (
                <p className={messageClassName(escopoMessage)}>{escopoMessage}</p>
              ) : null}
            </article>
          </section>
        ) : null}
        {activeTab === 'matriz' ? (
          <section className="cms-grid cms-grid-wide">
            <article className="cms-card ds-card">
              <div className="section-head">
                <div>
                  <span className="label">Matriz Prova Paulista</span>
                  <h2>Lista e filtros</h2>
                </div>
                <button className="c-btn c-btn-ghost" onClick={resetMatrizForm} type="button">
                  Novo descritor
                </button>
              </div>

              <div className="filter-grid filter-grid-triple">
                <label className="field">
                  <span>SÃ©rie</span>
                  <select
                    value={matrizSerie}
                    onChange={(event) => {
                      setMatrizSerie(event.target.value);
                      setMatrizAeFiltro('Todos');
                    }}
                  >
                    {SERIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Componente</span>
                  <select
                    value={matrizComponente}
                    onChange={(event) => {
                      setMatrizComponente(event.target.value);
                      setMatrizAeFiltro('Todos');
                    }}
                  >
                    {matrizComponentes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>AE</span>
                  <select
                    value={matrizAeFiltro}
                    onChange={(event) => setMatrizAeFiltro(event.target.value)}
                  >
                    <option value="Todos">Todas</option>
                    {matrizAeOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="status-line">
                {matrizLoading
                  ? 'Carregando matriz...'
                  : `${matrizRows.length} descritor(es) encontrado(s)`}
              </div>
              {matrizError ? <p className="error-text">{matrizError}</p> : null}

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>AE</th>
                      <th>Bimestre</th>
                      <th>Grupo</th>
                      <th>Descritor</th>
                      <th>AÃ§Ãµes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrizRows.length > 0 ? (
                      matrizRows.map((row) => (
                        <tr key={row.id}>
                          <td className="td-mono">{row.ae || ''}</td>
                          <td>{row.bimestre || ''}</td>
                          <td>{row.grupo || ''}</td>
                          <td className="td-wrap">{row.descritor || ''}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="c-btn c-btn-ghost c-btn-sm"
                                onClick={() => startMatrizEdit(row)}
                                type="button"
                              >
                                Editar
                              </button>
                              <button
                                className="c-btn c-btn-danger c-btn-sm"
                                disabled={matrizDeletingId === row.id}
                                onClick={() => handleMatrizDelete(row)}
                                type="button"
                              >
                                {matrizDeletingId === row.id ? 'Excluindo...' : 'Excluir'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="empty-row" colSpan={5}>
                          Nenhum descritor encontrado para esse filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="cms-card ds-card">
              <span className="label">
                {matrizForm.id ? 'Editar descritor' : 'Novo descritor'}
              </span>
              <h2>Cadastro vinculado à AE</h2>

              <form className="tool-form" onSubmit={handleMatrizSubmit}>
                <label className="field">
                  <span>SÃ©rie</span>
                  <select
                    value={matrizForm.serie}
                    onChange={(event) =>
                      setMatrizForm((current) => ({
                        ...current,
                        serie: event.target.value,
                      }))
                    }
                  >
                    {SERIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Componente</span>
                  <select
                    value={matrizForm.componente}
                    onChange={(event) =>
                      setMatrizForm((current) => ({
                        ...current,
                        componente: event.target.value,
                      }))
                    }
                  >
                    {matrizFormComponentes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>AE</span>
                  <input
                    value={matrizForm.ae}
                    onChange={(event) =>
                      setMatrizForm((current) => ({
                        ...current,
                        ae: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="AE1"
                  />
                </label>

                <label className="field">
                  <span>Bimestre</span>
                  <select
                    value={matrizForm.bimestre}
                    onChange={(event) =>
                      setMatrizForm((current) => ({
                        ...current,
                        bimestre: event.target.value,
                      }))
                    }
                  >
                    {BIMESTRES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Grupo</span>
                  <select
                    value={matrizForm.grupo}
                    onChange={(event) =>
                      setMatrizForm((current) => ({
                        ...current,
                        grupo: event.target.value,
                      }))
                    }
                  >
                    {MATRIZ_GRUPOS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field-full">
                  <span>Descritor</span>
                  <textarea
                    rows={6}
                    value={matrizForm.descritor}
                    onChange={(event) =>
                      setMatrizForm((current) => ({
                        ...current,
                        descritor: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="form-actions">
                  <button
                    className="c-btn c-btn-primary"
                    disabled={matrizSubmitting}
                    type="submit"
                  >
                    {matrizSubmitting
                      ? 'Salvando...'
                      : matrizForm.id
                        ? 'Salvar descritor'
                        : 'Criar descritor'}
                  </button>
                  <button className="c-btn c-btn-ghost" onClick={resetMatrizForm} type="button">
                    Limpar
                  </button>
                </div>
              </form>

              {matrizMessage ? (
                <p className={messageClassName(matrizMessage)}>{matrizMessage}</p>
              ) : null}
            </article>
          </section>
        ) : null}
        {activeTab === 'toolkit' ? (
          <section className="cms-grid">
            <article className="cms-card ds-card">
              <span className="label">ValidaÃ§Ã£o de habilidades</span>
              <h2>Consultar cÃ³digos no currÃ­culo</h2>

              <form className="tool-form" onSubmit={handleValidateSubmit}>
                <label className="field field-full">
                  <span>CÃ³digos</span>
                  <textarea
                    value={codesInput}
                    onChange={(event) => setCodesInput(event.target.value)}
                    rows={5}
                    placeholder="EF06MA01 EF06MA02"
                  />
                </label>

                <div className="form-actions">
                  <button className="c-btn c-btn-primary" type="submit">
                    Validar cÃ³digos
                  </button>
                </div>
              </form>

              {validateError ? <p className="error-text">{validateError}</p> : null}
              {validateResult ? (
                <div className="result-stack">
                  <div className="result-group">
                    <span className="label">VÃ¡lidos</span>
                    <div className="chip-list">
                      {validateResult.validCodes.map((code) => (
                        <span className="chip" key={code}>
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="result-group">
                    <span className="label">Ausentes</span>
                    <div className="chip-list">
                      {validateResult.missingCodes.length > 0 ? (
                        validateResult.missingCodes.map((code) => (
                          <span className="chip neutral-chip" key={code}>
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="muted">Nenhum cÃ³digo ausente.</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </article>

            <article className="cms-card ds-card">
              <span className="label">Preview de cascade</span>
              <h2>Simular rename ou delete</h2>

              <form className="tool-form" onSubmit={handleCascadeSubmit}>
                <label className="field">
                  <span>AÃ§Ã£o</span>
                  <select
                    value={cascadeAction}
                    onChange={(event) =>
                      setCascadeAction(event.target.value === 'delete' ? 'delete' : 'rename')
                    }
                  >
                    <option value="rename">Rename</option>
                    <option value="delete">Delete</option>
                  </select>
                </label>

                <label className="field">
                  <span>CÃ³digo atual</span>
                  <input
                    value={oldCode}
                    onChange={(event) => setOldCode(event.target.value.toUpperCase())}
                  />
                </label>

                {cascadeAction === 'rename' ? (
                  <label className="field">
                    <span>Novo cÃ³digo</span>
                    <input
                      value={newCode}
                      onChange={(event) => setNewCode(event.target.value.toUpperCase())}
                    />
                  </label>
                ) : null}

                <div className="form-actions">
                  <button className="c-btn c-btn-primary" type="submit">
                    Gerar preview
                  </button>
                </div>
              </form>

              {cascadeError ? <p className="error-text">{cascadeError}</p> : null}
              {cascadeResult ? (
                <div className="result-stack">
                  <div className="chip-list">
                    <span className="chip">{cascadeResult.action}</span>
                    <span className="chip">{cascadeResult.oldCode}</span>
                    {cascadeResult.newCode ? (
                      <span className="chip">{cascadeResult.newCode}</span>
                    ) : null}
                    <span className="chip lesson-chip">
                      {cascadeResult.totalReferences} referÃªncia(s)
                    </span>
                  </div>

                  <div className="count-grid">
                    {cascadeResult.counts.map((item) => (
                      <div className="count-card" key={`${item.table}-${item.field}`}>
                        <strong>{item.count}</strong>
                        <span>{item.table}</span>
                        <small>{item.field}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          </section>
        ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}

export default App;


