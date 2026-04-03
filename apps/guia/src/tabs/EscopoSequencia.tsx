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

  function handleSerie(v: string) { setSerie(v); setComp(''); setBim('1º Bimestre'); onFiltersChange?.(v,'','1º Bimestre') }
  function handleComp(v: string)  { setComp(v);  setBim('1º Bimestre'); onFiltersChange?.(serie,v,'1º Bimestre') }
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
      aulas.map(r => (r.aprendizagem_essencial || '').match(/^AE\d+/)?.[0]).filter(Boolean)
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
        hideBimTodos={true}
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
            {/* Stats pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Aulas',       value: stats.totalAulas, color: 'var(--blue)',   border: 'var(--blue)',          bg: 'var(--blue-light, #e8f0fe)' },
                { label: 'AEs',         value: stats.totalAEs,   color: 'var(--orange)', border: 'var(--orange-border)', bg: 'var(--orange-light)' },
                { label: 'Habilidades', value: stats.totalHabs,  color: 'var(--green)',  border: 'var(--green)',         bg: 'var(--green-light, #e6f4ea)' },
              ].map(s => (
                <div key={s.label} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: s.bg, border: `1px solid ${s.border}`,
                  borderRadius: 20, padding: '4px 12px',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '.9rem', color: s.color }}>{s.value}</span>
                  <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{s.label}</span>
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
                    <span className="c-semana-meta">{semAulas.length} aula{semAulas.length > 1 ? 's' : ''}</span>
                    <div className="c-semana-divider" />
                  </div>
                  {semAulas.map(aula => {
                    const open = openCards.has(aula.aula)
                    const habs = getHabs(aula.habilidades)
                    const aeCode = (aula.aprendizagem_essencial || '').match(/^AE\d+/)?.[0] || ''
                    const conteudoItems = fmtList(aula.conteudo)
                    const objItems     = fmtList(aula.objetivos)
                    return (
                      <div key={aula.id} id={`aula-${aula.aula}`} className={`c-aula-card${open ? ' open' : ''}`}>
                        <div className="c-aula-card-header" onClick={() => toggleCard(aula.aula)}>
                          <div className="c-aula-numero">Aula {aula.aula}</div>
                          <div className="c-aula-titulo">{aula.titulo}</div>
                          <div className="flex-chips c-aula-habs-preview">
                            {aeCode && (
                              <span className="c-ae-badge nav" style={{ fontSize: '.72rem', padding: '2px 8px' }}
                                onClick={e => { e.stopPropagation(); onGoToAE(serie, comp, aeCode) }}>
                                {aeCode}
                              </span>
                            )}
                            {habs.slice(0, 4).map(h => (
                              <span key={h} className="c-hab-chip" style={{ fontSize: '.72rem' }}
                                onClick={e => { e.stopPropagation(); onGoToHab(serie, comp, h) }}>
                                {h}
                              </span>
                            ))}
                            {habs.length > 4 && <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>+{habs.length - 4}</span>}
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
