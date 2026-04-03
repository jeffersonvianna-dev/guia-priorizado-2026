const GRUPOS = [
  {
    num: 'Grupo 1', label: 'Reconhecimento e Identificação',
    desc: 'Questões que exigem recordar, reconhecer e identificar conceitos diretamente apresentados no currículo.',
    color: 'var(--blue)',
    verbos: ['Identificar', 'Reconhecer', 'Classificar'],
  },
  {
    num: 'Grupo 2', label: 'Aplicação e Comparação',
    desc: 'Questões que demandam compreensão mais profunda, aplicação de conceitos e comparação entre situações.',
    color: 'var(--orange)',
    verbos: ['Aplicar', 'Comparar', 'Calcular'],
  },
  {
    num: 'Grupo 3', label: 'Resolução de Problemas',
    desc: 'Questões complexas que exigem análise, síntese e resolução de problemas em contextos variados.',
    color: 'var(--green)',
    verbos: ['Resolver', 'Analisar', 'Criar'],
  },
]

const PASSOS = [
  { n: 1, t: 'Escolha a aba', d: 'Use as abas no topo para acessar as Aprendizagens Essenciais, o Escopo-Sequência ou a Matriz da Prova Paulista.' },
  { n: 2, t: 'Selecione o segmento', d: 'Escolha entre Anos Finais (6º ao 9º ano) ou Ensino Médio (1ª à 3ª série).' },
  { n: 3, t: 'Filtre o componente', d: 'Selecione o componente curricular, o ano/série e o bimestre desejados.' },
  { n: 4, t: 'Explore as aulas', d: 'No Escopo-Sequência, clique em qualquer aula para ver conteúdo, objetivos, habilidades e AE vinculada.' },
]

const LINKS = [
  {
    icon: '📄',
    titulo: 'Currículo Paulista — Ensino Fundamental',
    desc: 'Documento oficial da SEDUC-SP',
    href: 'https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/2023/02/Curriculo_Paulista-etapas-Educação-Infantil-e-Ensino-Fundamental-ISBN.pdf',
  },
  {
    icon: '📄',
    titulo: 'Currículo Paulista — Ensino Médio',
    desc: 'Documento oficial da SEDUC-SP',
    href: 'https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/2023/02/CURRÍCULO-PAULISTA-etapa-Ensino-Médio_ISBN.pdf',
  },
  {
    icon: '🗂️',
    titulo: 'Acervo do Repositório',
    desc: 'Materiais digitais de apoio por componente',
    href: 'https://repositorio.educacao.sp.gov.br/',
  },
  {
    icon: '📆',
    titulo: 'Calendário Pedagógico 2026',
    desc: 'Planejamento do ano letivo',
    href: 'https://docs.google.com/presentation/d/1UVLXPQrTLs4Jw433CcUK8CK-YwX74WL2dVVGubnI7_E/edit?usp=sharing',
  },
  {
    icon: '🏫',
    titulo: 'Escola Total',
    desc: 'Portal da Secretaria da Educação',
    href: 'https://escolatotal.educacao.sp.gov.br/',
  },
  {
    icon: '🧭',
    titulo: 'Horizontes Pedagógicos',
    desc: 'Orientações pedagógicas complementares',
    href: 'https://docs.google.com/document/d/1hNtsdGuthL4maltw3rU7FKvNRxSSUHTLTNrmg63Nd9k/edit?usp=sharing',
  },
]

export function ParaComecar() {
  return (
    <div className="c-content">

      {/* Hero */}
      <div className="c-comecar-hero">
        <h2>Guia de Aprendizagem 2026</h2>
        <p>
          Professor(a) e gestor(a), este Guia reúne as <strong>Aprendizagens Essenciais</strong>,
          o <strong>Escopo-Sequência</strong> e a <strong>Matriz da Prova Paulista</strong> do
          Currículo Paulista — organizado por componente curricular, para os Anos Finais do
          Ensino Fundamental e para o Ensino Médio.
        </p>
      </div>

      {/* Estrutura */}
      <div style={{ marginBottom: 28 }}>
        <div className="c-section-h">O que você encontra neste Guia</div>
        <div className="grid-3">
          <div className="c-estrutura-card">
            <div className="c-estrutura-icon">🎯</div>
            <div className="c-estrutura-titulo">Aprendizagens Essenciais</div>
            <div className="c-estrutura-desc">
              Versões claras e objetivas das habilidades priorizadas do Currículo Paulista.
              Respondem à pergunta: <em>"O que meus estudantes devem aprender neste ano?"</em>{' '}
              Estruturadas com verbo de comando + objeto de conhecimento + modificadores,
              organizados pela Taxonomia de Bloom.
            </div>
          </div>
          <div className="c-estrutura-card laranja">
            <div className="c-estrutura-icon">📅</div>
            <div className="c-estrutura-titulo">Escopo-Sequência</div>
            <div className="c-estrutura-desc">
              Planejamento bimestral aula-a-aula com título, conteúdo, objetivos de
              aprendizagem, habilidades e AE vinculada. As aulas são organizadas em{' '}
              <strong>7 semanas por bimestre</strong>.
            </div>
          </div>
          <div className="c-estrutura-card verde">
            <div className="c-estrutura-icon">📊</div>
            <div className="c-estrutura-titulo">Matriz da Prova Paulista</div>
            <div className="c-estrutura-desc">
              Descritores organizados em 3 Grupos cognitivos (Taxonomia de Bloom), indicando
              as aulas e AEs avaliadas em cada bimestre da Prova Paulista.
            </div>
          </div>
        </div>
      </div>

      {/* Grupos Cognitivos */}
      <div style={{ marginBottom: 28 }}>
        <div className="c-section-h">Grupos Cognitivos — Matriz da Prova Paulista</div>
        <div className="grid-3">
          {GRUPOS.map(g => (
            <div key={g.num} className="c-passo-card">
              <div className="c-grupo-num" style={{ background: g.color }}>{g.num}</div>
              <div className="c-passo-titulo">{g.label}</div>
              <div className="c-passo-desc">{g.desc}</div>
              <div className="c-grupo-verbos">
                {g.verbos.map(v => <span key={v} className="c-grupo-verbo">{v}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Como Navegar */}
      <div style={{ marginBottom: 28 }}>
        <div className="c-section-h">Como Navegar</div>
        <div className="grid-3">
          {PASSOS.map(p => (
            <div key={p.n} className="c-passo-card">
              <div className="c-passo-num">{p.n}</div>
              <div className="c-passo-titulo">{p.t}</div>
              <div className="c-passo-desc">{p.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Links Importantes */}
      <div>
        <div className="c-section-h">Links Importantes</div>
        <div className="c-links-aviso">⚠️ Os links abrem materiais externos da Secretaria da Educação do Estado de São Paulo.</div>
        <div className="c-links-grid">
          {LINKS.map(l => (
            <a key={l.href} className="c-link-card" href={l.href} target="_blank" rel="noreferrer">
              <div className="c-link-icon">{l.icon}</div>
              <div>
                <div className="c-link-titulo">{l.titulo}</div>
                <div className="c-link-desc">{l.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}
