import { useEffect, useState } from 'react'
import { db } from '../supabase'

interface ModuleCard {
  id: string
  icon: string
  label: string
  desc: string
  color: string
  countQuery?: () => Promise<number>
}

interface Props {
  onGo: (id: string) => void
}

async function sumCounts(tables: string[]): Promise<number> {
  const results = await Promise.all(
    tables.map(async t => {
      const { count } = await db.from(t).select('id', { count: 'exact', head: true })
      return count ?? 0
    })
  )
  return results.reduce((a, b) => a + b, 0)
}

async function countOne(table: string): Promise<number> {
  const { count } = await db.from(table).select('id', { count: 'exact', head: true })
  return count ?? 0
}

const MODULES: ModuleCard[] = [
  {
    id: 'escopo',
    icon: '📅',
    label: 'Escopo-Sequência',
    desc: 'Aulas organizadas por série, componente e bimestre. Vincula habilidades, conteúdos e objetivos a cada aula.',
    color: '#005BAC',
    countQuery: () => sumCounts(['escopo_af', 'escopo_em']),
  },
  {
    id: 'ae',
    icon: '🎯',
    label: 'Aprendizagem Essencial',
    desc: 'Aprendizagens Essenciais com habilidades priorizadas e relacionadas, por bimestre e componente.',
    color: '#16a34a',
    countQuery: () => sumCounts(['ae_detalhes_af', 'ae_detalhes_em']),
  },
  {
    id: 'matriz',
    icon: '📝',
    label: 'Matriz Prova Paulista',
    desc: 'Descritores da Prova Paulista vinculados às AEs, organizados por grupo e componente.',
    color: '#7c3aed',
    countQuery: () => countOne('matriz_descritores_af'),
  },
  {
    id: 'cp',
    icon: '📚',
    label: 'Currículo Paulista',
    desc: 'Habilidades do Currículo Paulista com código BNCC, série e componente, organizadas por segmento.',
    color: '#b45309',
    countQuery: () => countOne('curriculo_paulista'),
  },
]

export function Dashboard({ onGo }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    MODULES.forEach(m => {
      if (!m.countQuery) return
      m.countQuery()
        .then(n => setCounts(prev => ({ ...prev, [m.id]: n })))
        .catch(() => {})
    })
  }, [])

  return (
    <div className="dash-root">
      {/* Cards */}
      <div className="dash-content">
        <p className="dash-section-label">Módulos de Conteúdo</p>
        <div className="dash-grid">
          {MODULES.map(m => (
            <div key={m.id} className="dash-card" onClick={() => onGo(m.id)}>
              <div className="dash-card-icon" style={{ background: m.color + '18', color: m.color }}>
                {m.icon}
              </div>
              <div className="dash-card-body">
                <div className="dash-card-title">{m.label}</div>
                <p className="dash-card-desc">{m.desc}</p>
              </div>
              <div className="dash-card-footer">
                {counts[m.id] !== undefined && (
                  <span className="dash-count">{counts[m.id].toLocaleString('pt-BR')} registros</span>
                )}
                <button
                  className="c-btn c-btn-primary c-btn-sm"
                  style={{ background: m.color, borderColor: m.color }}
                  onClick={e => { e.stopPropagation(); onGo(m.id) }}
                >
                  Acessar →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
