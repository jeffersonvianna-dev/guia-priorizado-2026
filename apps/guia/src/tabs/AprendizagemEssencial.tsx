import { useState, useMemo } from 'react'
import { AeDetalhesRow, EscopoRow, BIM_ORDER, aeNatSort, getHabs, isAfSerie } from '../types'
import { Filtros } from '../components/Filtros'

interface Props {
  aeAF: AeDetalhesRow[]
  aeEM: AeDetalhesRow[]
  escopoAF: EscopoRow[]
  escopoEM: EscopoRow[]
  initialSerie?: string
  initialComp?: string
  onGoToHab: (serie: string, comp: string, hab: string) => void
  onGoToAula: (serie: string, comp: string, bim: string, aula: number) => void
  onFiltersChange?: (serie: string, comp: string) => void
}

export function AprendizagemEssencial({
  aeAF, aeEM, escopoAF, escopoEM,
  initialSerie = '', initialComp = '',
  onGoToHab, onGoToAula, onFiltersChange,
}: Props) {
  const [serie, setSerie] = useState(initialSerie)
  const [comp, setComp]   = useState(initialComp)
  const [openAEs, setOpenAEs] = useState<Set<string>>(new Set())

  const allEscopo = useMemo(() => [...escopoAF, ...escopoEM], [escopoAF, escopoEM])

  function handleSerie(v: string) { setSerie(v); setComp(''); onFiltersChange?.(v, '') }
  function handleComp(v: string)  { setComp(v);  onFiltersChange?.(serie, v) }

  const isAF = isAfSerie(serie)
  const aeData = isAF ? aeAF : aeEM
  const escopoData = isAF ? escopoAF : escopoEM

  // AEs filtradas por série + componente
  const aeRows = useMemo(() => {
    if (!serie || !comp) return []
    return aeData
      .filter(r => r.serie === serie && r.componente === comp)
      .sort((a, b) => aeNatSort(a.ae, b.ae))
  }, [aeData, serie, comp])

  // Agrupar por bimestre
  const byBim = useMemo(() => {
    const map = new Map<string, AeDetalhesRow[]>()
    for (const ae of aeRows) {
      const b = ae.bimestre || 'Sem Bimestre'
      if (!map.has(b)) map.set(b, [])
      map.get(b)!.push(ae)
    }
    return BIM_ORDER
      .map(b => ({ bim: b, rows: map.get(b) || [] }))
      .filter(g => g.rows.length > 0)
  }, [aeRows])

  // Aulas vinculadas a cada AE (pelo campo aprendizagem_essencial)
  const aulasByAE = useMemo(() => {
    const map = new Map<string, EscopoRow[]>()
    for (const row of escopoData.filter(r => r.serie === serie && r.componente === comp)) {
      const aeCodes = (row.aprendizagem_essencial || '').split(/\s+/).filter(Boolean)
      for (const ae of aeCodes) {
        if (!map.has(ae)) map.set(ae, [])
        map.get(ae)!.push(row)
      }
    }
    return map
  }, [escopoData, serie, comp])

  function toggleAE(key: string) {
    setOpenAEs(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const placeholder = !serie
    ? { icon: '📚', title: 'Selecione uma série', sub: 'Use o filtro acima para carregar as Aprendizagens Essenciais.' }
    : !comp
    ? { icon: '📚', title: 'Selecione o componente', sub: '' }
    : aeRows.length === 0
    ? { icon: '💭', title: 'Nenhuma AE encontrada', sub: `Não há AEs para ${serie} — ${comp}.` }
    : null

  return (
    <>
      <Filtros
        escopo={allEscopo}
        serie={serie} comp={comp} bim=""
        showBim={false}
        onSerie={handleSerie}
        onComp={handleComp}
      />
      <div className="c-content">
        {placeholder ? (
          <div className="c-placeholder">
            <div className="icon">{placeholder.icon}</div>
            <h2>{placeholder.title}</h2>
            {placeholder.sub && <p>{placeholder.sub}</p>}
          </div>
        ) : (
          byBim.map(({ bim, rows }) => (
            <div key={bim} style={{ marginBottom: 28 }}>
              <div className="c-section-h">{bim}</div>
              {rows.map(ae => {
                const key = `${ae.serie}-${ae.componente}-${ae.ae}`
                const open = openAEs.has(key)
                const hpChips = ae.hab_priorizada ? getHabs(ae.hab_priorizada) : []
                const hrChips = ae.hab_relacionadas ? getHabs(ae.hab_relacionadas) : []
                const cpChips = ae.conhecimentos_previos ? getHabs(ae.conhecimentos_previos) : []
                const aulas   = aulasByAE.get(ae.ae) || []
                return (
                  <div key={key} className={`ae-list-item${open ? ' open' : ''}`}>
                    <div className="ae-list-header" onClick={() => toggleAE(key)}>
                      <span className="c-ae-badge">{ae.ae}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.9rem' }}>{ae.titulo}</span>
                      <span className="c-expand-icon" style={{ color: 'var(--text-muted)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </div>
                    {open && (
                      <div className="ae-list-body">
                        {hpChips.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <div className="c-campo-label">Habilidade Prioritária</div>
                            <div className="flex-chips" style={{ marginTop: 6 }}>
                              {hpChips.map(h => (
                                <span key={h} className="c-hab-chip" onClick={() => onGoToHab(serie, comp, h)}>{h}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {hrChips.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div className="c-campo-label">Outras Habilidades</div>
                            <div className="flex-chips" style={{ marginTop: 6 }}>
                              {hrChips.map(h => (
                                <span key={h} className="c-hab-chip" onClick={() => onGoToHab(serie, comp, h)}>{h}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {cpChips.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div className="c-campo-label">Conhecimentos Prévios</div>
                            <div className="flex-chips" style={{ marginTop: 6 }}>
                              {cpChips.map(h => (
                                <span key={h} className="c-hab-chip-lg">{h}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {aulas.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div className="c-campo-label">Aulas Vinculadas</div>
                            <div className="flex-chips" style={{ marginTop: 6 }}>
                              {aulas.map(a => (
                                <span
                                  key={a.id}
                                  className="c-hab-chip"
                                  title={a.titulo}
                                  onClick={() => onGoToAula(serie, comp, a.bimestre, a.aula)}
                                >
                                  Aula {a.aula}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </>
  )
}
