import { useState, useMemo, useRef, useEffect } from 'react'
import { type EscopoRow, getHabs, fmtList, isAfSerie, BIM_ORDER } from '../types'
import { Filtros } from '../components/Filtros'
import { openPrintWindow, PDF_CSS, pdfButtonStyle } from '../utils/pdf'

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

  function handleSerie(v: string) {
    const data = isAfSerie(v) ? escopoAF : escopoEM
    const avail = new Set(data.filter(r => r.serie === v).map(r => r.componente))
    const newComp = avail.has(comp) ? comp : ''
    setSerie(v); setComp(newComp); setBim(''); setSelHab('')
    onFiltersChange?.(v, newComp, '')
  }
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

  const habs = useMemo(() =>
    [...habMap.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  , [habMap])

  // Selecionar primeira hab automaticamente
  const firstHab = habs[0] || ''
  const effectiveHab = selHab && habMap.has(selHab) ? selHab : firstHab


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

  function generatePdf() {
    const filename = `Habilidades 2026 - ${comp} - ${serie}`
    const bimLabel = bim || 'Todos os Bimestres'

    const habsHtml = habs.map(h => {
      const aulasSorted = (habMap.get(h)?.aulas || [])
      // Agrupar por bimestre
      const byBimMap = new Map<string, EscopoRow[]>()
      for (const a of aulasSorted) {
        if (!byBimMap.has(a.bimestre)) byBimMap.set(a.bimestre, [])
        byBimMap.get(a.bimestre)!.push(a)
      }
      const grupos = BIM_ORDER
        .map(b => ({ b, aulas: (byBimMap.get(b) || []).sort((x, y) => +x.aula - +y.aula) }))
        .filter(g => g.aulas.length > 0)

      const gruposHtml = grupos.map(({ b, aulas }) => `
        <div class="bim-pill">${b}</div>
        <table>
          <thead><tr><th style="width:54px">Aula</th><th>Título</th></tr></thead>
          <tbody>${aulas.map(a => `<tr><td>${a.aula}</td><td>${a.titulo || '—'}</td></tr>`).join('')}</tbody>
        </table>`).join('')

      const bimPills = grupos.map(g =>
        `<span class="bim-pill" style="margin-left:6px;font-size:10px;padding:1px 8px">${g.b}</span>`
      ).join('')

      return `<div class="ae-block">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:10px">
          <span style="font-size:.9rem;font-weight:800;color:#005BAC">${h}</span>
          ${bimPills}
        </div>
        ${gruposHtml}
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>${filename}</title><style>${PDF_CSS}</style>
      <script>window.onbeforeprint=function(){document.title=${JSON.stringify(filename)}}</script>
      </head><body>
      <h1>Habilidades 2026</h1>
      <div class="sub">${serie} &nbsp;·&nbsp; ${comp} &nbsp;·&nbsp; ${bimLabel} &nbsp;·&nbsp; ${habs.length} habilidade(s)</div>
      ${habsHtml}
      </body></html>`

    openPrintWindow(html, filename)
  }

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
    return BIM_ORDER.map(b => ({ bim: b, aulas: (map.get(b) || []).sort((a, b) => a.aula - b.aula) })).filter(g => g.aulas.length > 0)
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={generatePdf} style={pdfButtonStyle}>⬇ Baixar PDF</button>
            </div>
            {/* Grid de habilidades — apenas código, sem meta */}
            <div className="hab-grid">
              {habs.map(h => {
                const aulaCount = habMap.get(h)?.aulas.length ?? 0
                return (
                  <div
                    key={h}
                    className={`c-hab-box${effectiveHab === h ? ' selected' : ''}`}
                    onClick={() => setSelHab(h)}
                  >
                    <span className="c-hab-code">{h}</span>
                    <span className="c-hab-box-meta">{aulaCount} aula{aulaCount !== 1 ? 's' : ''}</span>
                  </div>
                )
              })}
            </div>

            {effectiveHab && (
              <div>
                <div className="c-section-h">Aulas com {effectiveHab}</div>
                {aulasAgrupadas.map(({ bim: b, aulas }) => (
                  <div key={b} style={{ marginBottom: 16 }}>
                    <div style={{ marginBottom: 8 }}><span className="c-bim-chip">{b}</span></div>
                    {aulas.map(aula => {
                      const open = openCards.has(aula.aula)
                      const aeCode = (aula.aprendizagem_essencial || '').match(/^AE\d+/)?.[0] || ''
                      const conteudoItems = fmtList(aula.conteudo)
                      const objItems = fmtList(aula.objetivos)
                      return (
                        <div key={aula.id} className={`c-aula-card${open ? ' open' : ''}`} style={{ marginBottom: 8 }}>
                          <div className="c-aula-card-header" onClick={() => toggleCard(aula.aula)}>
                            <div
                              className="c-aula-numero"
                              onClick={e => { e.stopPropagation(); onGoToAula(serie, comp, b, aula.aula) }}
                              title="Ir para Escopo-Sequência"
                              style={{ cursor: 'pointer' }}
                            >
                              Aula {aula.aula}
                            </div>
                            <div className="c-aula-titulo">{aula.titulo}</div>
                            {aeCode && (
                              <span
                                className="c-ae-badge nav"
                                style={{ fontSize: '.72rem', padding: '2px 8px', flexShrink: 0 }}
                                onClick={e => { e.stopPropagation(); onGoToAE(serie, comp, aeCode) }}
                              >
                                {aeCode}
                              </span>
                            )}
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
