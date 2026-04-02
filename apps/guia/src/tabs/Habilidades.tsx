import { useState, useMemo, useRef, useEffect } from 'react'
import { type EscopoRow, getHabs, fmtList, aeNatSort, isAfSerie, BIM_ORDER } from '../types'
import { Filtros } from '../components/Filtros'

interface Props {
  escopoAF: EscopoRow[]
  escopoEM: EscopoRow[]
  initialSerie?: string
  initialComp?: string
  initialBim?: string
  initialHab?: string
  onGoToAula: (serie: string, comp: string, bim: string, aula: number) => void
  onGoToAE:   (serie: string, comp: string, ae: string) => void
  onFiltersChange?: (serie: string, comp: string, bim: string) => void
}

const SEMANAS = 7

function calcSemana(aulaNum: number, allAulas: number[]): number {
  const sorted = [...new Set(allAulas)].sort((a, b) => a - b)
  const per = Math.ceil(sorted.length / SEMANAS)
  const idx = sorted.indexOf(aulaNum)
  return idx === -1 ? 0 : Math.floor(idx / per) + 1
}

export function Habilidades({
  escopoAF, escopoEM,
  initialSerie = '', initialComp = '', initialBim = '', initialHab = '',
  onGoToAula, onGoToAE, onFiltersChange,
}: Props) {
  const [serie, setSerie] = useState(initialSerie)
  const [comp, setComp]   = useState(initialComp)
  const [bim, setBim]     = useState(initialBim)
  const [selHab, setSelHab] = useState(initialHab)
  const [openCards, setOpenCards] = useState<Set<number>>(new Set())

  const allEscopo = useMemo(() => [...escopoAF, ...escopoEM], [escopoAF, escopoEM])
  const escopoData = isAfSerie(serie) ? escopoAF : escopoEM

  function handleSerie(v: string) { setSerie(v); setComp(''); setBim(''); setSelHab(''); onFiltersChange?.(v,'','') }
  function handleComp(v: string)  { setComp(v);  setBim(''); setSelHab(''); onFiltersChange?.(serie,v,'') }
  function handleBim(v: string)   { setBim(v);   setSelHab(''); onFiltersChange?.(serie,comp,v) }

  // Linhas filtradas
  const rows = useMemo(() => {
    if (!serie || !comp) return []
    return escopoData.filter(r =>
      r.serie === serie && r.componente === comp && (!bim || r.bimestre === bim)
    )
  }, [escopoData, serie, comp, bim])

  // Construir habMap
  const habMap = useMemo(() => {
    const map = new Map<string, { aulas: EscopoRow[] }>()
    for (const row of rows) {
      for (const h of getHabs(row.habilidades)) {
        if (!map.has(h)) map.set(h, { aulas: [] })
        map.get(h)!.aulas.push(row)
      }
    }
    return map
  }, [rows])

  const habs = useMemo(() => [...habMap.keys()].sort(), [habMap])

  // Selecionar primeira hab automaticamente
  const firstHab = habs[0] || ''
  const effectiveHab = selHab && habMap.has(selHab) ? selHab : firstHab

  // Todas as aulas da série+comp+bim para cálculo de semana
  const allAulaNums = useMemo(() => rows.map(r => r.aula), [rows])

  const targetRef = useRef<string>('')
  useEffect(() => {
    if (initialHab && initialHab !== targetRef.current) {
      targetRef.current = initialHab
      setSelHab(initialHab)
    }
  }, [initialHab])

  const aulasSel = habMap.get(effectiveHab)?.aulas || []

  // Abrir primeira aula quando hab selecionada muda
  useEffect(() => {
    const first = aulasSel[0]?.aula
    if (first !== undefined) setOpenCards(new Set([first]))
    else setOpenCards(new Set())
  }, [effectiveHab])

  function toggleCard(id: number) {
    setOpenCards(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const placeholder = !serie
    ? { icon: '📚', title: 'Selecione uma série', sub: '' }
    : !comp
    ? { icon: '📚', title: 'Selecione o componente', sub: '' }
    : habs.length === 0
    ? { icon: '💭', title: 'Nenhuma habilidade encontrada', sub: '' }
    : null

  // Agrupar aulas por bimestre para exibição
  const aulasAgrupadas = useMemo(() => {
    const map = new Map<string, EscopoRow[]>()
    for (const a of aulasSel) {
      const b = a.bimestre
      if (!map.has(b)) map.set(b, [])
      map.get(b)!.push(a)
    }
    return BIM_ORDER.map(b => ({ bim: b, aulas: map.get(b) || [] })).filter(g => g.aulas.length > 0)
  }, [aulasSel])

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
            {/* Grid de habilidades — apenas código, sem meta */}
            <div className="hab-grid">
              {habs.map(h => (
                <div
                  key={h}
                  className={`c-hab-box${effectiveHab === h ? ' selected' : ''}`}
                  onClick={() => setSelHab(h)}
                >
                  <span className="c-hab-code">{h}</span>
                </div>
              ))}
            </div>

            {effectiveHab && (
              <div>
                <div className="c-section-h">Aulas com {effectiveHab}</div>
                {aulasAgrupadas.map(({ bim: b, aulas }) => (
                  <div key={b} style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8 }}><span className="c-bim-chip">{b}</span></div>
                    {aulas.map(aula => {
                      const open = openCards.has(aula.aula)
                      const semana = calcSemana(aula.aula, allAulaNums)
                      const aeCodes = (aula.aprendizagem_essencial || '').split(/\s+/).filter(Boolean)
                      const conteudoItems = fmtList(aula.conteudo)
                      const objItems = fmtList(aula.objetivos)
                      return (
                        <div key={aula.id} className={`c-aula-card${open ? ' open' : ''}`} style={{ marginBottom: 8 }}>
                          <div className="c-aula-card-header" onClick={() => toggleCard(aula.aula)}>
                            <div className="c-aula-numero">{aula.aula}</div>
                            <div className="c-aula-titulo">
                              <div>{aula.titulo}</div>
                              {!open && (
                                <div className="flex-chips" style={{ marginTop: 4 }}>
                                  {semana > 0 && <span className="c-semana-chip">Semana {semana}</span>}
                                  <span
                                    className="c-hab-chip"
                                    onClick={e => { e.stopPropagation(); onGoToAula(serie, comp, b, aula.aula) }}
                                    title="Ir para Escopo-Sequência"
                                  >
                                    Ver na Sequência
                                  </span>
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
                                    <div className="c-campo-label">Objetivos</div>
                                    <div className="c-campo-valor">
                                      {objItems.length > 1
                                        ? <ul>{objItems.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                        : objItems[0]
                                      }
                                    </div>
                                  </div>
                                )}
                                {aeCodes.length > 0 && (
                                  <div className="c-campo">
                                    <div className="c-campo-label">AE</div>
                                    <div className="flex-chips" style={{ marginTop: 4 }}>
                                      {aeCodes.sort((a, b) => aeNatSort(a, b)).map(ae => (
                                        <span key={ae} className="c-ae-badge nav" onClick={() => onGoToAE(serie, comp, ae)}>{ae}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="c-campo">
                                  <div className="c-campo-label">Ir para</div>
                                  <div className="flex-chips" style={{ marginTop: 4 }}>
                                    {semana > 0 && <span className="c-semana-chip">Semana {semana}</span>}
                                    <span
                                      className="c-hab-chip"
                                      onClick={() => onGoToAula(serie, comp, b, aula.aula)}
                                      title="Ir para Escopo-Sequência"
                                    >
                                      Ver na Sequência
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
