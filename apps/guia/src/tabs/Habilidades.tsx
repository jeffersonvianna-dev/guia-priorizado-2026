import { useState, useMemo, useRef, useEffect } from 'react'
import { type EscopoRow, getHabs, fmtList, isAfSerie, BIM_ORDER, sortSeries } from '../types'
import { Filtros } from '../components/Filtros'
import { PDF_CSS, pdfButtonStyle } from '../utils/pdf'

interface Props {
  escopoAF: EscopoRow[]
  escopoEM: EscopoRow[]
  habBncc?: Record<string, string>
  initialSerie?: string
  initialComp?: string
  initialBim?: string
  initialHab?: string
  onGoToAula: (serie: string, comp: string, bim: string, aula: number) => void
  onGoToAE:   (serie: string, comp: string, ae: string) => void
  onFiltersChange?: (serie: string, comp: string, bim: string) => void
}


export function Habilidades({
  escopoAF, escopoEM, habBncc = {},
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

  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfSeries, setPdfSeries]       = useState<Set<string>>(new Set())
  const [pdfComp,   setPdfComp]         = useState('')
  const [pdfBims,   setPdfBims]         = useState<Set<string>>(new Set(BIM_ORDER))

  const availSeries = useMemo(() =>
    sortSeries([...new Set(allEscopo.map(r => r.serie))]), [allEscopo])

  const pdfAvailComps = useMemo(() => {
    const s = new Set<string>()
    allEscopo.forEach(r => s.add(r.componente))
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allEscopo])

  function openPdfModal() {
    setPdfSeries(serie ? new Set([serie]) : new Set())
    setPdfComp(comp || pdfAvailComps[0] || '')
    setPdfBims(new Set(BIM_ORDER))
    setShowPdfModal(true)
  }

  function togglePdfSerie(s: string) {
    setPdfSeries(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  function togglePdfBim(b: string) {
    setPdfBims(prev => {
      const next = new Set(prev)
      next.has(b) ? next.delete(b) : next.add(b)
      return next
    })
  }

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
    if (!pdfComp || pdfSeries.size === 0 || pdfBims.size === 0) return

    const w = window.open('about:blank', '_blank')
    if (!w) { alert('Permita pop-ups para gerar o PDF.'); return }
    w.document.title = 'SEDUC SP'

    const seriesArr = sortSeries([...pdfSeries])
    const bimsArr   = BIM_ORDER.filter(b => pdfBims.has(b))
    const bimLabel  = bimsArr.length === 4 ? 'Todos os Bimestres' : bimsArr.join(', ')
    const filename  = seriesArr.length === 1
      ? `Habilidades 2026 - ${pdfComp} - ${seriesArr[0]}`
      : `Habilidades 2026 - ${pdfComp}`

    const blocosHtml = seriesArr.map((s, idx) => {
      const rowsSerie = allEscopo.filter(r =>
        r.serie === s && r.componente === pdfComp && pdfBims.has(r.bimestre)
      )

      const habMapSerie = new Map<string, EscopoRow[]>()
      for (const row of rowsSerie) {
        for (const h of getHabs(row.habilidades)) {
          if (!habMapSerie.has(h)) habMapSerie.set(h, [])
          habMapSerie.get(h)!.push(row)
        }
      }
      const habsSerie = [...habMapSerie.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

      const habsHtml = habsSerie.map(h => {
        const aulasSorted = (habMapSerie.get(h) || [])
        const byBimMap = new Map<string, EscopoRow[]>()
        for (const a of aulasSorted) {
          if (!byBimMap.has(a.bimestre)) byBimMap.set(a.bimestre, [])
          byBimMap.get(a.bimestre)!.push(a)
        }
        const grupos = BIM_ORDER
          .map(b => ({ b, aulas: (byBimMap.get(b) || []).sort((x, y) => +x.aula - +y.aula) }))
          .filter(g => g.aulas.length > 0)

        const bimPills = grupos.map(g =>
          `<span class="bim-pill" style="margin-left:6px;font-size:10px;padding:1px 8px">${g.b}</span>`
        ).join('')

        const gruposHtml = grupos.map(({ b, aulas }) => `
          <div class="bim-pill">${b}</div>
          <table>
            <thead><tr><th style="width:54px">Aula</th><th>Título</th></tr></thead>
            <tbody>${aulas.map(a => `<tr><td>${a.aula}</td><td>${a.titulo || '—'}</td></tr>`).join('')}</tbody>
          </table>`).join('')

        return `<div class="ae-block">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:10px">
            <span style="font-size:.9rem;font-weight:800;color:#005BAC">${h}</span>
            ${bimPills}
          </div>
          ${gruposHtml}
        </div>`
      }).join('')

      return `<div class="${idx > 0 ? 'page-break' : ''}">
        <h2 style="margin-bottom:16px">${pdfComp} — ${s}</h2>
        ${habsHtml || '<p style="color:#9ca3af;font-size:.85rem">Nenhuma habilidade encontrada.</p>'}
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>${filename}</title><style>${PDF_CSS}</style>
      <script>window.onbeforeprint=function(){document.title=${JSON.stringify(filename)}}</script>
      </head><body>
      <h1>Habilidades 2026</h1>
      <div class="sub">${pdfComp} &nbsp;·&nbsp; ${bimLabel}</div>
      ${blocosHtml}
      </body></html>`

    w.document.open()
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.document.title = filename; w.print() }, 400)
    setShowPdfModal(false)
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
              <button onClick={openPdfModal} style={pdfButtonStyle}>⬇ Baixar PDF</button>
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
                    title={habBncc[h] || h}
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
                {habBncc[effectiveHab] && (
                  <p style={{
                    margin: '0 0 16px', padding: '10px 14px', background: '#f8fafc',
                    border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '.85rem',
                    color: '#475569', lineHeight: 1.5,
                  }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{effectiveHab}</span>{' — '}
                    {habBncc[effectiveHab]}
                  </p>
                )}
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
      {/* Modal PDF */}
      {showPdfModal && (
        <div
          onClick={e => e.target === e.currentTarget && setShowPdfModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480,
            boxShadow: '0 8px 32px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button onClick={() => setShowPdfModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#9ca3af' }}>✕</button>
            </div>
            {/* Série */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Série</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {availSeries.map(s => {
                  const compSet = new Set(allEscopo.filter(r => r.serie === s).map(r => r.componente))
                  const blocked = !!pdfComp && !compSet.has(pdfComp)
                  const selected = pdfSeries.has(s)
                  return (
                    <span key={s} onClick={() => !blocked && togglePdfSerie(s)} style={{
                      cursor: blocked ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '7px 4px',
                      fontSize: '.8rem', fontWeight: 600, border: '1px solid', textAlign: 'center',
                      background: selected ? '#005BAC' : blocked ? '#f3f4f6' : '#fff',
                      color: selected ? '#fff' : blocked ? '#c4c9d4' : '#374151',
                      borderColor: selected ? '#005BAC' : blocked ? '#e5e7eb' : '#dde2ec',
                      userSelect: 'none', opacity: blocked ? .55 : 1,
                    }}>{s}</span>
                  )
                })}
              </div>
            </div>
            {/* Componente */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Componente</div>
              <select value={pdfComp} onChange={e => setPdfComp(e.target.value)} disabled={pdfSeries.size === 0}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #dde2ec', fontSize: '.88rem', color: '#1a1f36', background: pdfSeries.size === 0 ? '#f3f4f6' : '#fff', cursor: pdfSeries.size === 0 ? 'not-allowed' : 'pointer', outline: 'none' }}>
                {pdfAvailComps.length === 0 && <option value="">—</option>}
                {pdfAvailComps.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Bimestre */}
            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Bimestre</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {BIM_ORDER.map(b => {
                  const selected = pdfBims.has(b)
                  return (
                    <span key={b} onClick={() => togglePdfBim(b)} style={{
                      cursor: 'pointer', borderRadius: 8, padding: '7px 4px', fontSize: '.8rem',
                      fontWeight: 600, border: '1px solid', textAlign: 'center',
                      background: selected ? '#f97316' : '#fff', color: selected ? '#fff' : '#374151',
                      borderColor: selected ? '#f97316' : '#dde2ec', userSelect: 'none',
                    }}>{b}</span>
                  )
                })}
              </div>
            </div>
            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowPdfModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #dde2ec', background: 'none', cursor: 'pointer', fontSize: '.88rem', color: '#6b7280', fontWeight: 600 }}>Cancelar</button>
              <button onClick={generatePdf} disabled={pdfSeries.size === 0 || !pdfComp || pdfBims.size === 0}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: pdfSeries.size === 0 || !pdfComp || pdfBims.size === 0 ? '#c4c9d4' : '#005BAC', color: '#fff', cursor: pdfSeries.size === 0 || !pdfComp || pdfBims.size === 0 ? 'not-allowed' : 'pointer', fontSize: '.88rem', fontWeight: 700 }}>⬇ Baixar PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
