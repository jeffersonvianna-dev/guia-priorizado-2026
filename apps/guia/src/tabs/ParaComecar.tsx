export function ParaComecar() {
  return (
    <div className="c-content">
      <div className="c-comecar-hero">
        <h2>Guia Priorizado 2026</h2>
        <p>
          Este guia apresenta as Aprendizagens Essenciais, o Escopo-Sequência e a Matriz da
          Prova Paulista para cada série e componente curricular.
          Use os filtros em cada aba para navegar pelo conteúdo.
        </p>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div className="c-section-h">Estrutura do Guia</div>
        <div className="grid-3">
          <div className="c-estrutura-card">
            <div className="c-estrutura-icon">🎯</div>
            <div className="c-estrutura-titulo">Aprendizagens Essenciais</div>
            <div className="c-estrutura-desc">
              Aprendizagens prioritárias por série, componente e bimestre,
              com habilidades vinculadas.
            </div>
          </div>
          <div className="c-estrutura-card laranja">
            <div className="c-estrutura-icon">📅</div>
            <div className="c-estrutura-titulo">Escopo-Sequência</div>
            <div className="c-estrutura-desc">
              Organização das aulas por semana ao longo do bimestre,
              com conteúdos e habilidades.
            </div>
          </div>
          <div className="c-estrutura-card verde">
            <div className="c-estrutura-icon">📝</div>
            <div className="c-estrutura-titulo">Matriz Prova Paulista</div>
            <div className="c-estrutura-desc">
              Descritores organizados por grupos cognitivos,
              vinculados às Aprendizagens Essenciais.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div className="c-section-h">Grupos Cognitivos</div>
        <div className="grid-3">
          {[
            { num: '1', label: 'Identificação e Reconhecimento',
              desc: 'Localizar, identificar e reconhecer informações, conceitos e elementos.', color: 'var(--blue)' },
            { num: '2', label: 'Aplicação e Compreensão',
              desc: 'Interpretar, relacionar e aplicar conhecimentos em situações contextualizadas.', color: 'var(--orange)' },
            { num: '3', label: 'Resolução de Problemas',
              desc: 'Analisar, sintetizar e avaliar situações-problema complexas.', color: 'var(--green)' },
          ].map(g => (
            <div key={g.num} className="c-passo-card">
              <div className="c-passo-num" style={{ background: g.color }}>{g.num}</div>
              <div className="c-passo-titulo">{g.label}</div>
              <div className="c-passo-desc">{g.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="c-section-h">Como Navegar</div>
        <div className="grid-3">
          {[
            { n: 1, t: 'Selecione a série', d: 'Use o filtro de série em cada aba.' },
            { n: 2, t: 'Escolha o componente', d: 'O componente curricular filtra os conteúdos.' },
            { n: 3, t: 'Explore as abas', d: 'Navegue entre AE, Escopo e Matriz com os filtros sincronizados.' },
            { n: 4, t: 'Clique nos chips', d: 'Habilidades e AEs são clicáveis e levam à aba correspondente.' },
          ].map(p => (
            <div key={p.n} className="c-passo-card">
              <div className="c-passo-num">{p.n}</div>
              <div className="c-passo-titulo">{p.t}</div>
              <div className="c-passo-desc">{p.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
