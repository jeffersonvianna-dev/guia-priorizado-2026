import { useState, useMemo, useEffect } from 'react'
import { type EscopoRow, getHabs, fmtList, isAfSerie } from '../types'
import { Filtros } from '../components/Filtros'

interface Props {
  escopoAF: EscopoRow[]
  escopoEM: EscopoRow[]
  initialSerie?: string
  initialComp?: string
  initialBim?: string
  onGoToHab:  (serie: string, comp: string, hab: string) => void
  onGoToAE:   (serie: string, comp: string, ae: string) => void
  onFiltersChange?: (serie: string, comp: string, bim: string) => void
  scrollToAula?: number | null
}

const SEMANAS = 7

function calcSemanas(aulas: EscopoRow[]) {
  const sorted = [...aulas].sort((a, b) => a.aula - b.aula)
  const per = Math.ceil(sorted.length / SEMANAS)
  const chunks: EscopoRow[][] = []
  for (let i = 0; i < SEMANAS; i++) {
    const slice = sorted.slice(i * per, (i + 1) * per)
    if (slice.length) chunks.push(slice)
  }
  return chunks
}

export function EscopoSequencia({
  escopoAF, escopoEM,
  initialSerie = '', initialComp = '', initialBim = '',
  onGoToHab, onGoToAE, onFiltersChange, scrollToAula,
}: Props) {
  const [serie, setSerie] = useState(initialSerie)
  const [comp, setComp]   = useState(initialComp)
  const [bim, setBim]     = useState(initialBim)
  const [openCards, setOpenCards] = useState<Set<number>>(new Set())

  const allEscopo = useMemo(() => [...escopoAF, ...escopoEM], [escopoAF, escopoEM])
  const escopoData = isAfSerie(serie) ? escopoAF : escopoEM

  function handleSerie(v: string) { setSerie(v); setComp(''); setBim(''); onFiltersChange?.(v,'','') }
  function handleComp(v: string)  { setComp(v);  setBim(''); onFiltersChange?.(serie,v,'') }
  function handleBim(v: string)   { setBim(v);   onFiltersChange?.(serie,comp,v) }

  const aulas = useMemo(() => {
    if (!serie || !comp) return []
    return escopoData.filter(r =>
      r.serie === serie && r.componente === comp && (!bim || r.bimestre === bim)
    ).sort((a, b) => a.aula - b.aula)
  }, [escopoData, serie, comp, bim])

  const semanas = useMemo(() => calcSemanas(aulas), [aulas])

  // Stats card — derivado de `aulas`, portanto reativo ao filtro de bimestre
  const stats = useMemo(() => {
    const totalAulas = aulas.length
    const totalAEs = new Set(
      aulas.flatMap(r => (r.aprendizagem_essencial || '').split(/\s+/).filter(Boolean))
    ).size
    const totalHabs = new Set(
      aulas.flatMap(r => getHabs(r.habilidades))
    ).size
    return { totalAulas, totalAEs, totalHabs }
  }, [aulas])

  // Abrir primeira aula quando série/comp/bimestre mudam
  useEffect(() => {
    if (aulas.length > 0) setOpenCards(new Set([aulas[0].aula]))
    else setOpenCards(new Set())
  }, [serie, comp, bim])

  function toggleCard(aulaNum: number) {
    setOpenCards(prev => {
      const next = new Set(prev)
      next.has(aulaNum) ? next.delete(aulaNum) : next.add(aulaNum)
      return next
    })
  }

  // Scroll para aula específica quando solicitado externamente
  useMemo(() => {
    if (!scrollToAula) return
    setOpenCards(prev => new Set([...prev, scrollToAula]))
    setTimeout(() => {
      document.getElementById(`aula-${scrollToAula}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }, [scrollToAula])

  const placeholder = !serie
    ? { icon: '📅', title: 'Selecione uma série', sub: '' }
    : !comp
    ? { icon: '📅', title: 'Selecione o componente', sub: '' }
    : aulas.length === 0
    ? { icon: '💭', title: 'Nenhuma aula encontrada', sub: '' }
    : null

  return (
    <>
      <Filtros
        escopo={allEscopo}
        serie={serie} comp={comp} bim={bim}
        onSerie={handleSerie} onComp={handleComp} onBim={handleBim}
      />
      <div className="c-content">
        {placeholder ? (
          <div className="c-placeholder">
            <div className="icon">{placeholder.icon}</div>
            <h2>{placeholder.title}</h2>
          </div>
        ) : (
          <>
            {/* Stats card — reativo ao bimestre */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Aulas',       value: stats.totalAulas, color: 'var(--blue)' },
                { label: 'AEs',         value: stats.totalAEs,   color: 'var(--orange)' },
                { label: 'Habilidades', value: stats.totalHabs,  color: 'var(--green)' },
              ].map(s => (
                <div key={s.label} className="c-campo" style={{ flex: 1, textAlign: 'center' }}>
                  <div className="c-campo-label">{s.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {semanas.map((semAulas, si) => {
              const first = semAulas[0].aula
              const last  = semAulas[semAulas.length - 1].aula
              return (
                <div key={si}>
                  <div className="c-semana-header">
                    <span className="c-semana-label">Semana {si + 1}</span>
                    <span className="c-semana-meta">Aulas {first}{first !== last ? `–${last}` : ''} · {semAulas.length} aula{semAulas.length > 1 ? 's' : ''}</span>
                    <div className="c-semana-divider" />
                  </div>
                  {semAulas.map(aula => {
                    const open = openCards.has(aula.aula)
                    const habs = getHabs(aula.habilidades)
                    const aeCodes = (aula.aprendizagem_essencial || '').split(/\s+/).filter(Boolean)
                    const conteudoItems = fmtList(aula.conteudo)
                    const objItems     = fmtList(aula.objetivos)
                    return (
                      <div key={aula.id} id={`aula-${aula.aula}`} className={`c-aula-card${open ? ' open' : ''}`}>
                        <div className="c-aula-card-header" onClick={() => toggleCard(aula.aula)}>
                          <div className="c-aula-numero">{aula.aula}</div>
                          <div className="c-aula-titulo">
                            <div>{aula.titulo}</div>
                            {!open && habs.length > 0 && (
                              <div className="flex-chips" style={{ marginTop: 4 }}>
                                {habs.slice(0, 4).map(h => (
                                  <span key={h} className="c-hab-chip" style={{ fontSize: '.72rem' }}
                                    onClick={e => { e.stopPropagation(); onGoToHab(serie, comp, h) }}>
                                    {h}
                                  </span>
                                ))}
                                {habs.length > 4 && <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>+{habs.length - 4}</span>}
                              </div>
                            )}
                          </div>
                          <span className="c-expand-icon">▾</span>
                        </div>
                        {open && (
                          <div className="c-aula-card-body">
                            <div className="c-aula-grid">
                              {conteudoItems.length > 0 && (
                                <div className="c-campo full">
                                  <div className="c-campo-label">Conteúdo</div>
                                  <div className="c-campo-valor">
                                    {conteudoItems.length > 1
                                      ? <ul>{conteudoItems.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                      : conteudoItems[0]
                                    }
                                  </div>
                                </div>
                              )}
                              {objItems.length > 0 && (
                                <div className="c-campo full">
                                  <div className="c-campo-label">Objetivos de Aprendizagem</div>
                                  <div className="c-campo-valor">
                                    {objItems.length > 1
                                      ? <ul>{objItems.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                      : objItems[0]
                                    }
                                  </div>
                                </div>
                              )}
                              {habs.length > 0 && (
                                <div className="c-campo full">
                                  <div className="c-campo-label">Habilidades</div>
                                  <div className="flex-chips" style={{ marginTop: 6 }}>
                                    {habs.map(h => (
                                      <span key={h} className="c-hab-chip-lg"
                                        onClick={() => onGoToHab(serie, comp, h)}>
                                        {h}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {aeCodes.length > 0 && (
                                <div className="c-campo">
                                  <div className="c-campo-label">Aprendizagem Essencial</div>
                                  <div className="flex-chips" style={{ marginTop: 6 }}>
                                    {aeCodes.map(ae => (
                                      <span key={ae} className="c-ae-badge nav"
                                        onClick={() => onGoToAE(serie, comp, ae)}>
                                        {ae}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {aula.unidade_tematica && (
                                <div className="c-campo">
                                  <div className="c-campo-label">Unidade Temática</div>
                                  <div className="c-campo-valor">{aula.unidade_tematica}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </>
        )}
      </div>
    </>
  )
}
