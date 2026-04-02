import { startTransition, useEffect, useMemo, useState } from 'react';
import {
  AF_SERIES,
  EM_SERIES,
  buildAeSections,
  buildHabilidadeDetalhe,
  buildHabilidadeResumos,
  buildMatrizAeDetalhe,
  buildMatrizAeResumos,
  buildEscopoSemanas,
  getAeTableName,
  getComponentesForSerie,
  getEscopoTableName,
  getMatrizTableName,
  getPreferredBimestre,
  getPreferredComponent,
  getSerieColumn,
  mapAeRow,
  mapEscopoRow,
  mapMatrizRow,
  sortBimestres,
  type AeDetalhe,
  type EscopoAula,
  type MatrizDescritor,
} from '@guia-priorizado/core';
import './App.css';
import { supabase, supabaseConfigError } from './lib/supabase';

type TabId = 'comecar' | 'ae' | 'escopo' | 'habilidades' | 'matriz';

const TABS: Array<{ id: TabId; label: string; status: string }> = [
  { id: 'comecar', label: 'Para Começar', status: 'Disponível' },
  { id: 'ae', label: 'Aprendizagem Essencial', status: 'Disponível' },
  { id: 'escopo', label: 'Escopo-Sequência', status: 'Disponível' },
  { id: 'habilidades', label: 'Habilidades', status: 'Disponível' },
  { id: 'matriz', label: 'Matriz Prova Paulista', status: 'Disponível' },
];

const DEFAULT_TAB: TabId = 'escopo';
const DEFAULT_SERIE = AF_SERIES[0];
const DEFAULT_COMPONENTE = 'Matemática';
const ALL_SERIES = [...AF_SERIES, ...EM_SERIES];
const COGNITIVE_GROUPS = [
  {
    grupo: 'Grupo 1',
    titulo: 'Reconhecimento e Identificação',
    descricao:
      'Questões que exigem recordar, reconhecer e identificar conceitos diretamente apresentados no currículo.',
    verbos: ['Identificar', 'Reconhecer', 'Classificar'],
  },
  {
    grupo: 'Grupo 2',
    titulo: 'Aplicação e Comparação',
    descricao:
      'Questões que demandam compreensão mais profunda, aplicação de conceitos e comparação entre situações.',
    verbos: ['Aplicar', 'Comparar', 'Calcular'],
  },
  {
    grupo: 'Grupo 3',
    titulo: 'Resolução de Problemas',
    descricao:
      'Questões complexas que exigem análise, síntese e resolução de problemas em contextos variados.',
    verbos: ['Resolver', 'Analisar', 'Criar'],
  },
] as const;

const GUIDE_OVERVIEW = [
  {
    icon: '🎯',
    title: 'Aprendizagens Essenciais',
    description:
      'Versões claras e objetivas das habilidades priorizadas do Currículo Paulista. Respondem à pergunta: "O que meus estudantes devem aprender neste ano?"',
    accent: 'blue',
  },
  {
    icon: '📅',
    title: 'Escopo-Sequência',
    description:
      'Planejamento bimestral aula a aula com título, conteúdo, objetivos de aprendizagem, habilidades e AE vinculada. As aulas são organizadas em 7 semanas por bimestre.',
    accent: 'blue',
  },
  {
    icon: '📊',
    title: 'Matriz da Prova Paulista',
    description:
      'Descritores organizados em 3 grupos cognitivos, indicando as aulas e AEs avaliadas em cada bimestre da Prova Paulista.',
    accent: 'orange',
  },
] as const;

const GUIDE_STEPS = [
  {
    title: 'Escolha a aba',
    description:
      'Use as abas no topo para acessar as Aprendizagens Essenciais, o Escopo-Sequência ou a Matriz da Prova Paulista.',
  },
  {
    title: 'Selecione o segmento',
    description:
      'Escolha entre Anos Finais (6º ao 9º ano) ou Ensino Médio (1ª à 3ª série).',
  },
  {
    title: 'Filtre o componente',
    description:
      'Selecione o componente curricular, o ano ou série e o bimestre desejados.',
  },
  {
    title: 'Explore as aulas',
    description:
      'No Escopo-Sequência, clique em qualquer aula para ver conteúdo, objetivos, habilidades e AE vinculada.',
  },
] as const;

const GUIDE_LINKS = [
  {
    icon: '📄',
    title: 'Currículo Paulista — Ensino Fundamental',
    description: 'Documento oficial da SEDUC-SP',
    href: 'https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/2023/02/Curriculo_Paulista-etapas-Educação-Infantil-e-Ensino-Fundamental-ISBN.pdf',
  },
  {
    icon: '📄',
    title: 'Currículo Paulista — Ensino Médio',
    description: 'Documento oficial da SEDUC-SP',
    href: 'https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/2023/02/CURRÍCULO-PAULISTA-etapa-Ensino-Médio_ISBN.pdf',
  },
  {
    icon: '🗂️',
    title: 'Acervo do Repositório',
    description: 'Materiais digitais de apoio por componente',
    href: 'https://repositorio.educacao.sp.gov.br/',
  },
  {
    icon: '📆',
    title: 'Calendário Pedagógico 2026',
    description: 'Planejamento do ano letivo',
    href: 'https://docs.google.com/presentation/d/1UVLXPQrTLs4Jw433CcUK8CK-YwX74WL2dVVGubnI7_E/edit?usp=sharing',
  },
] as const;

function getInitialTab(): TabId {
  const hash = window.location.hash.replace('#', '');
  return TABS.some((tab) => tab.id === hash) ? (hash as TabId) : DEFAULT_TAB;
}

function PlaceholderTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="placeholder-panel">
      <span className="placeholder-kicker">MigraÃ§Ã£o em andamento</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const [serie, setSerie] = useState<string>(DEFAULT_SERIE);
  const [componentes, setComponentes] = useState<string[]>([]);
  const [componente, setComponente] = useState<string>(DEFAULT_COMPONENTE);
  const [bimestre, setBimestre] = useState<string>('1º Bimestre');
  const [escopoRows, setEscopoRows] = useState<EscopoAula[]>([]);
  const [aeRows, setAeRows] = useState<AeDetalhe[]>([]);
  const [matrizRows, setMatrizRows] = useState<MatrizDescritor[]>([]);
  const [selectedHabilidade, setSelectedHabilidade] = useState<string>('');
  const [selectedMatrizAe, setSelectedMatrizAe] = useState<string>('');
  const [openEscopoCards, setOpenEscopoCards] = useState<Record<number, boolean>>({});
  const [openAeCards, setOpenAeCards] = useState<Record<number, boolean>>({});
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    let ignore = false;

    async function loadComponents() {
      const client = supabase;

      if (!client) {
        return;
      }

      setLoadingFilters(true);
      setError(null);

      const escopoTable = getEscopoTableName(serie);
      const serieColumn = getSerieColumn(serie);
      const { data, error: queryError } = await client
        .from(escopoTable)
        .select('componente')
        .eq(serieColumn, serie);

      if (ignore) {
        return;
      }

      setLoadingFilters(false);

      if (queryError) {
        setError(queryError.message);
        setComponentes(getComponentesForSerie(serie));
        return;
      }

      const nextComponents = Array.from(
        new Set(
          ((data as Array<{ componente: string | null }> | null) ?? [])
            .map((row) => row.componente)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right, 'pt-BR'));

      setComponentes(nextComponents);

      const nextComponent = nextComponents.includes(componente)
        ? componente
        : getPreferredComponent(nextComponents);

      if (nextComponent !== componente) {
        setComponente(nextComponent);
      }
    }

    loadComponents();

    return () => {
      ignore = true;
    };
  }, [componente, serie]);

  useEffect(() => {
    if (!componente) {
      return;
    }

    let ignore = false;

    async function loadContent() {
      const client = supabase;

      if (!client) {
        return;
      }

      setLoadingContent(true);
      setError(null);

      const escopoTable = getEscopoTableName(serie);
      const aeTable = getAeTableName(serie);
      const matrizTable = getMatrizTableName(serie);
      const serieColumn = getSerieColumn(serie);

      const [
        { data: escopoData, error: escopoError },
        { data: aeData, error: aeError },
        { data: matrizData, error: matrizError },
      ] =
        await Promise.all([
          client
            .from(escopoTable)
            .select('*')
            .eq(serieColumn, serie)
            .eq('componente', componente),
          client
            .from(aeTable)
            .select('*')
            .eq('serie', serie)
            .eq('componente', componente),
          client
            .from(matrizTable)
            .select('*')
            .eq('serie', serie)
            .eq('componente', componente),
        ]);

      if (ignore) {
        return;
      }

      setLoadingContent(false);

      if (escopoError || aeError || matrizError) {
        setError(
          escopoError?.message ??
            aeError?.message ??
            matrizError?.message ??
            'Erro desconhecido.',
        );
        setEscopoRows([]);
        setAeRows([]);
        setMatrizRows([]);
        return;
      }

      const mappedEscopoRows = (
        (escopoData as Array<Record<string, unknown>> | null) ?? []
      ).map((row) => mapEscopoRow(row as never));

      const mappedAeRows = (
        (aeData as Array<Record<string, unknown>> | null) ?? []
      ).map((row) => mapAeRow(row as never));
      const mappedMatrizRows = (
        (matrizData as Array<Record<string, unknown>> | null) ?? []
      ).map((row) => mapMatrizRow(row as never));

      setEscopoRows(mappedEscopoRows);
      setAeRows(mappedAeRows);
      setMatrizRows(mappedMatrizRows);
      setOpenEscopoCards(
        mappedEscopoRows.length > 0 ? { [mappedEscopoRows[0].id]: true } : {},
      );
      setOpenAeCards(mappedAeRows.length > 0 ? { [mappedAeRows[0].id]: true } : {});
    }

    loadContent();

    return () => {
      ignore = true;
    };
  }, [componente, serie]);

  const bimestres = useMemo(
    () =>
      sortBimestres(
        escopoRows.map((row) => row.bimestre).filter((value): value is string => Boolean(value)),
      ),
    [escopoRows],
  );

  const effectiveBimestre = useMemo(() => {
    if (bimestre === 'Todos' || bimestres.includes(bimestre)) {
      return bimestre;
    }

    return getPreferredBimestre(bimestres);
  }, [bimestre, bimestres]);

  const filteredEscopoRows = useMemo(
    () =>
      effectiveBimestre === 'Todos'
        ? escopoRows
        : escopoRows.filter((row) => row.bimestre === effectiveBimestre),
    [effectiveBimestre, escopoRows],
  );

  const escopoSections = useMemo(
    () => buildEscopoSemanas(filteredEscopoRows),
    [filteredEscopoRows],
  );
  const aeSections = useMemo(() => buildAeSections(aeRows, escopoRows), [aeRows, escopoRows]);
  const habilidadeResumos = useMemo(
    () => buildHabilidadeResumos(filteredEscopoRows),
    [filteredEscopoRows],
  );
  const effectiveSelectedHabilidade = useMemo(() => {
    if (
      selectedHabilidade &&
      habilidadeResumos.some((item) => item.codigo === selectedHabilidade)
    ) {
      return selectedHabilidade;
    }

    return habilidadeResumos[0]?.codigo ?? '';
  }, [habilidadeResumos, selectedHabilidade]);
  const habilidadeDetalhe = useMemo(
    () =>
      effectiveSelectedHabilidade
        ? buildHabilidadeDetalhe(filteredEscopoRows, effectiveSelectedHabilidade)
        : null,
    [effectiveSelectedHabilidade, filteredEscopoRows],
  );
  const filteredMatrizRows = useMemo(
    () =>
      effectiveBimestre === 'Todos'
        ? matrizRows
        : matrizRows.filter((row) => row.bimestre === effectiveBimestre),
    [effectiveBimestre, matrizRows],
  );
  const matrizAeResumos = useMemo(
    () => buildMatrizAeResumos(aeRows, filteredEscopoRows, filteredMatrizRows),
    [aeRows, filteredEscopoRows, filteredMatrizRows],
  );
  const effectiveSelectedMatrizAe = useMemo(() => {
    if (
      selectedMatrizAe &&
      matrizAeResumos.some((item) => item.ae === selectedMatrizAe)
    ) {
      return selectedMatrizAe;
    }

    return matrizAeResumos[0]?.ae ?? '';
  }, [matrizAeResumos, selectedMatrizAe]);
  const matrizAeDetalhe = useMemo(
    () =>
      effectiveSelectedMatrizAe
        ? buildMatrizAeDetalhe(
            effectiveSelectedMatrizAe,
            aeRows,
            filteredEscopoRows,
            filteredMatrizRows,
          )
        : null,
    [aeRows, effectiveSelectedMatrizAe, filteredEscopoRows, filteredMatrizRows],
  );
  const totalHabilidades = useMemo(
    () => new Set(escopoRows.flatMap((row) => row.habilidades)).size,
    [escopoRows],
  );

  function toggleEscopoCard(id: number) {
    setOpenEscopoCards((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function toggleAeCard(id: number) {
    setOpenAeCards((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function openAeByCode(code: string) {
    const target = aeRows.find((row) => row.ae === code);

    if (target) {
      setOpenAeCards((current) => ({
        ...current,
        [target.id]: true,
      }));
    }

    startTransition(() => {
      setActiveTab('ae');
    });
  }

  function openHabilidade(codigo: string) {
    setSelectedHabilidade(codigo);

    startTransition(() => {
      setActiveTab('habilidades');
    });
  }

  function openEscopoByAula(aeCode: string, aula: number) {
    const target = escopoRows.find((row) => {
      const hasAe = row.aprendizagemEssencial.includes(aeCode);
      return row.aula === aula && hasAe;
    });

    if (!target) {
      return;
    }

    setBimestre(target.bimestre);
    setOpenEscopoCards((current) => ({
      ...current,
      [target.id]: true,
    }));

    startTransition(() => {
      setActiveTab('escopo');
    });
  }

  function openEscopoByRowId(rowId: number, rowBimestre: string) {
    setBimestre(rowBimestre);
    setOpenEscopoCards((current) => ({
      ...current,
      [rowId]: true,
    }));

    startTransition(() => {
      setActiveTab('escopo');
    });
  }

  return (
    <div className="ds-page guide-page">
      <header className="ds-header">
        <div className="ds-header-inner">
          <div className="ds-brand">
            <span className="ds-logo">GP</span>
            <div className="ds-header-copy">
              <h1>Guia do Currículo Priorizado 2026</h1>
              <p>SEDUC SP</p>
            </div>
          </div>
        </div>
      </header>

      <div className="ds-tabs-bar">
        <div className="ds-shell guide-shell-frame">
          <nav className="ds-tabs" aria-label="Abas do guia">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={tab.id === activeTab ? 'ds-tab is-active' : 'ds-tab'}
                onClick={() => {
                  startTransition(() => {
                    setActiveTab(tab.id);
                  });
                }}
                type="button"
              >
                <span className="ds-tab-label">{tab.label}</span>
                <span className="ds-tab-status">{tab.status}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab !== 'comecar' ? (
        <div className="ds-filter-bar">
          <div className="ds-shell guide-shell-frame">
            <section
              className={activeTab === 'ae' ? 'filters filters-two' : 'filters'}
              aria-label="Filtros do guia"
            >
              <label className="field">
                <span>Ano / Série</span>
                <select value={serie} onChange={(event) => setSerie(event.target.value)}>
                  {ALL_SERIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Componente curricular</span>
                <select
                  value={componente}
                  onChange={(event) => setComponente(event.target.value)}
                  disabled={loadingFilters || componentes.length === 0}
                >
                  {componentes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {activeTab !== 'ae' ? (
                <label className="field">
                  <span>Bimestre</span>
                  <select
                    value={effectiveBimestre}
                    onChange={(event) => setBimestre(event.target.value)}
                    disabled={loadingContent}
                  >
                    <option value="Todos">Todos</option>
                    {bimestres.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      <div className="ds-shell guide-content-shell">
        <main className="content">
          {!error && activeTab !== 'comecar' ? (
            <section className="guide-status">
              <div>
                <h2 className="guide-status-title">
                  {serie} · {componente}
                </h2>
                <p className="guide-status-meta">{effectiveBimestre}</p>
              </div>
              <div className="guide-status-chips">
                <span>{escopoRows.length} aulas</span>
                <span>{aeRows.length} AEs</span>
                <span>{totalHabilidades} habilidades</span>
              </div>
            </section>
          ) : null}
        {error ? (
          <section className="state-card error">
            <h2>Configuração pendente</h2>
            <p>{error}</p>
            <p className="muted">
              O app está apontando para <code>aingjvjyqhijogpyikii</code>; se o
              ambiente não carregar, revise as variáveis do Vite e do deploy.
            </p>
          </section>
        ) : null}

        {!error && loadingContent ? (
          <section className="state-card">
            <h2>Carregando dados do guia</h2>
            <p>Consultando Escopo-Sequência e Aprendizagem Essencial no projeto novo.</p>
          </section>
        ) : null}

        {activeTab === 'comecar' && !error && !loadingContent ? (
          <section className="comecar-wrap">
            <div className="comecar-hero">
              <h2>Guia de Aprendizagem 2026</h2>
              <p>
                Professor(a) e gestor(a), este Guia reúne as{' '}
                <strong>Aprendizagens Essenciais</strong>, o{' '}
                <strong>Escopo-Sequência</strong> e a{' '}
                <strong>Matriz da Prova Paulista</strong> do Currículo Paulista,
                organizado por componente curricular para os Anos Finais do Ensino
                Fundamental e para o Ensino Médio.
              </p>
            </div>

            <div className="comecar-section">
              <h3>O que você encontra neste Guia</h3>
              <div className="estrutura-grid">
                {GUIDE_OVERVIEW.map((item) => (
                  <article
                    className={
                      item.accent === 'orange'
                        ? 'estrutura-card estrutura-card-orange'
                        : 'estrutura-card'
                    }
                    key={item.title}
                  >
                    <div className="estrutura-icon">{item.icon}</div>
                    <div className="estrutura-titulo">{item.title}</div>
                    <div className="estrutura-desc">{item.description}</div>
                  </article>
                ))}
              </div>
            </div>

            <div className="comecar-section">
              <h3>Grupos Cognitivos — Matriz da Prova Paulista</h3>
              <div className="grupos-grid">
                {COGNITIVE_GROUPS.map((group) => (
                  <article className="grupo-card" key={group.grupo}>
                    <div className="grupo-num">{group.grupo}</div>
                    <div className="grupo-titulo">{group.titulo}</div>
                    <div className="grupo-desc">{group.descricao}</div>
                    <div className="grupo-verbos">
                      {group.verbos.map((verbo) => (
                        <span className="grupo-verbo" key={verbo}>
                          {verbo}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="comecar-section">
              <h3>Como navegar</h3>
              <div className="como-usar-grid">
                {GUIDE_STEPS.map((step, index) => (
                  <article className="passo-card" key={step.title}>
                    <div className="passo-num">{index + 1}</div>
                    <div className="passo-titulo">{step.title}</div>
                    <div className="passo-desc">{step.description}</div>
                  </article>
                ))}
              </div>
            </div>

            <div className="comecar-section">
              <h3>Links Importantes</h3>
              <div className="links-aviso">
                Os links abrem materiais externos da Secretaria da Educação do
                Estado de São Paulo.
              </div>
              <div className="links-grid">
                {GUIDE_LINKS.map((link) => (
                  <a
                    className="link-card"
                    href={link.href}
                    key={link.title}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="link-icon">{link.icon}</div>
                    <div>
                      <div className="link-titulo">{link.title}</div>
                      <div className="link-desc">{link.description}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'escopo' && !error && !loadingContent ? (
          escopoSections.length > 0 ? (
            <section className="aulas">
              {escopoSections.map((section) => (
                <div className="week-block" key={`${section.bimestre}-${section.semana}`}>
                  <div className="semana-header">
                    <span className="semana-label">Semana {section.semana}</span>
                    <div className="semana-divider" />
                    <span className="semana-meta">
                      {section.aulas.length > 1
                        ? `Aulas ${section.aulas[0]?.aula}–${section.aulas[section.aulas.length - 1]?.aula}`
                        : `Aula ${section.aulas[0]?.aula ?? '—'}`}
                    </span>
                  </div>

                  <div className="semana-cards">
                    {section.aulas.map((aula) => (
                      <article
                        className={openEscopoCards[aula.id] ? 'aula-card open' : 'aula-card'}
                        key={aula.id}
                      >
                        <button
                          className="aula-card-header"
                          onClick={() => toggleEscopoCard(aula.id)}
                          type="button"
                        >
                          <div className="aula-numero">{aula.aula}</div>
                          <div className="aula-titulo">{aula.titulo || 'Título não informado'}</div>
                          <div className="habs-preview">
                            {aula.habilidades.slice(0, 3).map((habilidade) => (
                              <button
                                className="hab-chip"
                                key={habilidade}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openHabilidade(habilidade);
                                }}
                                type="button"
                              >
                                {habilidade}
                              </button>
                            ))}
                          </div>
                          <div className="expand-icon">{openEscopoCards[aula.id] ? '▴' : '▾'}</div>
                        </button>

                        {openEscopoCards[aula.id] ? (
                          <div className="aula-card-body">
                            <div className="aula-grid">
                              <div className="campo full">
                                <div className="campo-label">Conteúdo</div>
                                <div className="campo-valor">
                                  <ul>
                                  {aula.conteudo.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                  </ul>
                                </div>
                              </div>

                              <div className="campo full">
                                <div className="campo-label">Objetivos de Aprendizagem</div>
                                <div className="campo-valor">
                                  <ul>
                                  {aula.objetivos.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                  </ul>
                                </div>
                              </div>

                              <div className="campo">
                                <div className="campo-label">Habilidades</div>
                                <div className="campo-valor">
                                  <div className="habs-lista">
                                  {aula.habilidades.map((item) => (
                                    <button
                                      className="hab-chip-lg nav"
                                      key={item}
                                      onClick={() => openHabilidade(item)}
                                      type="button"
                                    >
                                      {item}
                                    </button>
                                  ))}
                                  </div>
                                </div>
                              </div>

                              <div className="campo">
                                <div className="campo-label">Aprendizagem Essencial</div>
                                <div className="campo-valor">
                                  {(() => {
                                    const aeCode =
                                      aula.aprendizagemEssencial.match(/^AE\d+/)?.[0] ?? '';

                                    return aeCode ? (
                                      <button
                                        className="ae-badge nav"
                                        onClick={() => openAeByCode(aeCode)}
                                        type="button"
                                      >
                                        {aula.aprendizagemEssencial}
                                      </button>
                                    ) : (
                                      <span className="ae-badge">
                                        {aula.aprendizagemEssencial || '—'}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <section className="state-card">
              <h2>Nenhuma aula encontrada</h2>
              <p>Ajuste a série, o componente ou o bimestre para carregar uma combinação válida.</p>
            </section>
          )
        ) : null}

        {activeTab === 'ae' && !error && !loadingContent ? (
          aeSections.length > 0 ? (
            <section className="ae-wrap">
              {aeSections.map((section) => (
                <div className="ae-bim-block" key={section.bimestre || 'sem-bimestre'}>
                  <div className="ae-bim-header">
                    <span className="ae-bim-label">
                      {section.bimestre || 'Sem bimestre definido'}
                    </span>
                    <div className="ae-bim-divider" />
                    <span className="ae-bim-meta">
                      {section.items.length} AE{section.items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="ae-list">
                    {section.items.map((item) => (
                      <article
                        className={openAeCards[item.id] ? 'ae-list-item open' : 'ae-list-item'}
                        key={item.id}
                      >
                        <button
                          className="ae-list-header"
                          onClick={() => toggleAeCard(item.id)}
                          type="button"
                        >
                          <span className="ae-num-badge">{item.ae}</span>
                          <div className="ae-list-titulo">
                            {item.titulo || 'Título não informado'}
                          </div>
                          <span className="ae-list-chevron">{openAeCards[item.id] ? '▴' : '▾'}</span>
                        </button>

                        {openAeCards[item.id] ? (
                          <div className="ae-list-body">
                            <div>
                              <div className="ae-detail-label">Habilidade Prioritária</div>
                              <div className="ae-detail-chips">
                                  {item.habPriorizada ? (
                                    <button
                                      className="hab-chip-lg nav"
                                      onClick={() => openHabilidade(item.habPriorizada)}
                                      type="button"
                                    >
                                      {item.habPriorizada}
                                    </button>
                                  ) : (
                                    <span className="ae-detail-empty">—</span>
                                  )}
                              </div>
                            </div>

                            {item.outrasHabilidades.length > 0 ? (
                              <div>
                                <div className="ae-detail-label">Outras Habilidades</div>
                                <div className="ae-detail-chips">
                                  {item.outrasHabilidades.map((habilidade) => (
                                    <button
                                      className="hab-chip-lg nav"
                                      key={habilidade}
                                      onClick={() => openHabilidade(habilidade)}
                                      type="button"
                                    >
                                      {habilidade}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {item.conhecimentosPrevios.length > 0 ? (
                              <div>
                                <div className="ae-detail-label">Habilidades Prévias</div>
                                <div className="ae-detail-chips">
                                  {item.conhecimentosPrevios.map((habilidade) => (
                                      <span className="hab-chip-lg" key={habilidade}>
                                        {habilidade}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            ) : null}

                            {item.aulasVinculadas.length > 0 ? (
                              <div>
                                <div className="ae-detail-label">Aulas Vinculadas</div>
                                <div className="ae-detail-chips">
                                  {item.aulasVinculadas.map((aula) => (
                                      <button
                                        className="aula-num-chip nav"
                                        key={aula}
                                        onClick={() => openEscopoByAula(item.ae, aula)}
                                        type="button"
                                      >
                                        {aula}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <section className="state-card">
              <h2>Nenhuma AE encontrada</h2>
              <p>Essa combinação ainda não retornou registros em <code>ae_detalhes_*</code>.</p>
            </section>
          )
        ) : null}

        {activeTab === 'habilidades' && !error && !loadingContent ? (
          habilidadeDetalhe ? (
            <section className="aulas">
              <div className="week-block">
                <div className="week-header">
                  <div>
                    <span className="pill">Habilidades do filtro atual</span>
                    <h2>Selecione uma habilidade</h2>
                  </div>
                  <span className="week-meta">
                    {habilidadeResumos.length} habilidade
                    {habilidadeResumos.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="chips selector-grid">
                  {habilidadeResumos.map((item) => (
                    <button
                      className={
                        item.codigo === effectiveSelectedHabilidade
                          ? 'chip selector-chip selected'
                          : 'chip selector-chip'
                      }
                      key={item.codigo}
                      onClick={() => setSelectedHabilidade(item.codigo)}
                      type="button"
                    >
                      {item.codigo} · {item.aulasCount} aula
                      {item.aulasCount === 1 ? '' : 's'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="week-block">
                <div className="week-header">
                  <div>
                    <span className="pill">{habilidadeDetalhe.codigo}</span>
                    <h2>Aulas relacionadas</h2>
                  </div>
                  <span className="week-meta">
                    {habilidadeDetalhe.aulas.length} aula
                    {habilidadeDetalhe.aulas.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="chips">
                  {habilidadeDetalhe.aeCodigos.map((codigo) => (
                    <button
                      className="chip action-chip"
                      key={codigo}
                      onClick={() => openAeByCode(codigo)}
                      type="button"
                    >
                      {codigo}
                    </button>
                  ))}
                </div>

                <div className="card-list with-gap">
                  {habilidadeDetalhe.aulas.map((aula) => (
                    <article className="lesson-card open" key={aula.id}>
                      <div className="lesson-body static-body">
                        <div className="lesson-topline">
                          <div className="chips">
                            <span className="chip lesson">{aula.bimestre}</span>
                            <span className="chip neutral">Semana {aula.semana || '?'}</span>
                          </div>
                          <button
                            className="chip action-chip"
                            onClick={() => openEscopoByRowId(aula.id, aula.bimestre)}
                            type="button"
                          >
                            Abrir no Escopo
                          </button>
                        </div>

                        <div className="lesson-summary standalone">
                          <strong>
                            Aula {aula.aula}: {aula.titulo || 'TÃ­tulo não informado'}
                          </strong>
                        </div>

                        <div className="meta-grid">
                          <section className="panel">
                            <span className="label">Conteudo</span>
                            <ul>
                              {aula.conteudo.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </section>

                          <section className="panel">
                            <span className="label">Objetivos de aprendizagem</span>
                            <ul>
                              {aula.objetivos.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </section>

                          <section className="panel">
                            <span className="label">Habilidade</span>
                            <div className="chips">
                              <span className="chip">{habilidadeDetalhe.codigo}</span>
                            </div>
                          </section>

                          <section className="panel">
                            <span className="label">Aprendizagem essencial</span>
                            <div className="chips">
                              {aula.aeCodigo ? (
                                <button
                                  className="chip action-chip"
                                  onClick={() => openAeByCode(aula.aeCodigo)}
                                  type="button"
                                >
                                  {aula.aeCodigo}
                                </button>
                              ) : (
                                <span className="muted">NÃ£o informada</span>
                              )}
                            </div>
                          </section>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="state-card">
              <h2>Nenhuma habilidade encontrada</h2>
              <p>Esse filtro do escopo ainda não retornou habilidades para seleção.</p>
            </section>
          )
        ) : null}

        {activeTab === 'matriz' && !error && !loadingContent ? (
          matrizAeDetalhe ? (
            <section className="aulas">
              <div className="week-block">
                <div className="week-header">
                  <div>
                    <span className="pill">AEs da matriz</span>
                    <h2>Selecione uma AE</h2>
                  </div>
                  <span className="week-meta">
                    {matrizAeResumos.length} AE{matrizAeResumos.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="chips selector-grid">
                  {matrizAeResumos.map((item) => (
                    <button
                      className={
                        item.ae === effectiveSelectedMatrizAe
                          ? 'chip selector-chip selected'
                          : 'chip selector-chip'
                      }
                      key={item.ae}
                      onClick={() => setSelectedMatrizAe(item.ae)}
                      type="button"
                    >
                      {item.ae} · {item.aulasCount} aulas · {item.descritoresCount} descritores
                    </button>
                  ))}
                </div>
              </div>

              <div className="week-block">
                <div className="week-header">
                  <div>
                    <span className="pill">{matrizAeDetalhe.ae}</span>
                    <h2>{matrizAeDetalhe.titulo}</h2>
                  </div>
                </div>

                <div className="meta-grid">
                  <section className="panel">
                    <span className="label">Habilidades</span>
                    <div className="chips">
                      {matrizAeDetalhe.habilidades.length > 0 ? (
                        matrizAeDetalhe.habilidades.map((habilidade) => (
                          <button
                            className="chip action-chip"
                            key={habilidade}
                            onClick={() => openHabilidade(habilidade)}
                            type="button"
                          >
                            {habilidade}
                          </button>
                        ))
                      ) : (
                        <span className="muted">Nenhuma habilidade encontrada.</span>
                      )}
                    </div>
                  </section>

                  <section className="panel">
                    <span className="label">Aulas</span>
                    <div className="stack-list">
                      {matrizAeDetalhe.aulasPorBimestre.length > 0 ? (
                        matrizAeDetalhe.aulasPorBimestre.map((entry) => (
                          <div className="stack-item" key={entry.bimestre}>
                            <strong>{entry.bimestre}</strong>
                            <div className="chips">
                              {entry.aulas.map((aula) => (
                                <button
                                  className="chip lesson action-chip"
                                  key={`${entry.bimestre}-${aula}`}
                                  onClick={() =>
                                    openEscopoByAula(matrizAeDetalhe.ae, aula)
                                  }
                                  type="button"
                                >
                                  Aula {aula}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="muted">Nenhuma aula encontrada para esta AE.</span>
                      )}
                    </div>
                  </section>
                </div>

                <div className="detail-grid">
                  <section className="panel">
                    <span className="label">Grupo 1</span>
                    <ul>
                      {matrizAeDetalhe.grupos.grupo1.length > 0 ? (
                        matrizAeDetalhe.grupos.grupo1.map((item) => <li key={item}>{item}</li>)
                      ) : (
                        <li>Sem descritores.</li>
                      )}
                    </ul>
                  </section>

                  <section className="panel">
                    <span className="label">Grupo 2</span>
                    <ul>
                      {matrizAeDetalhe.grupos.grupo2.length > 0 ? (
                        matrizAeDetalhe.grupos.grupo2.map((item) => <li key={item}>{item}</li>)
                      ) : (
                        <li>Sem descritores.</li>
                      )}
                    </ul>
                  </section>

                  <section className="panel">
                    <span className="label">Grupo 3</span>
                    <ul>
                      {matrizAeDetalhe.grupos.grupo3.length > 0 ? (
                        matrizAeDetalhe.grupos.grupo3.map((item) => <li key={item}>{item}</li>)
                      ) : (
                        <li>Sem descritores.</li>
                      )}
                    </ul>
                  </section>
                </div>
              </div>
            </section>
          ) : (
            <section className="state-card">
              <h2>Nenhum dado de matriz encontrado</h2>
              <p>Essa seleção ainda não retornou AEs ou descritores em <code>matriz_descritores_*</code>.</p>
            </section>
          )
        ) : null}

        {!['comecar', 'escopo', 'ae', 'habilidades', 'matriz'].includes(activeTab) ? (
          <PlaceholderTab
            title={TABS.find((tab) => tab.id === activeTab)?.label ?? 'Aba'}
            description="A estrutura, as regras e a navegaÃ§Ã£o cruzada já estÃ£o mapeadas. A prÃ³xima etapa Ã© reutilizar esse mesmo core no CMS e fechar o backend seguro de edição."
          />
        ) : null}
      </main>
    </div>
    </div>
  );
}

export default App;


