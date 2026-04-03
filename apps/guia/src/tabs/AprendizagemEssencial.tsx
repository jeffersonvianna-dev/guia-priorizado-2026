import { useState, useMemo, useEffect, useRef } from 'react'
import { type AeDetalhesRow, type EscopoRow, BIM_ORDER, aeNatSort, getHabs, isAfSerie } from '../types'
import { Filtros } from '../components/Filtros'
import { openPrintWindow, PDF_CSS, pdfButtonStyle } from '../utils/pdf'

interface Props {
  aeAF: AeDetalhesRow[]
  aeEM: AeDetalhesRow[]
  escopoAF: EscopoRow[]
  escopoEM: EscopoRow[]
  initialSerie?: string
  initialComp?: string
  initialAE?: string
  onGoToHab: (serie: string, comp: string, hab: string) => void
  onGoToAula: (serie: string, comp: string, bim: string, aula: number) => void
  onFiltersChange?: (serie: string, comp: string) => void
}

export function AprendizagemEssencial({
  aeAF, aeEM, escopoAF, escopoEM,
  initialSerie = '', initialComp = '', initialAE = '',
  onGoToHab, onGoToAula, onFiltersChange,
}: Props) {
  const [serie, setSerie] = useState(initialSerie)
  const [comp, setComp]   = useState(initialComp)
  const [bim,  setBim]    = useState('')
  const [openAEs, setOpenAEs] = useState<Set<string>>(new Set())
  const targetAERef = useRef('')

  const allEscopo = useMemo(() => [...escopoAF, ...escopoEM], [escopoAF, escopoEM])

  function handleSerie(v: string) {
    const data = isAfSerie(v) ? escopoAF : escopoEM
    const avail = new Set(data.filter(r => r.serie === v).map(r => r.componente))
    const newComp = avail.has(comp) ? comp : ''
    setSerie(v); setComp(newComp); setBim('')
    onFiltersChange?.(v, newComp)
  }
  function handleComp(v: string)  { setComp(v);  setBim('');  onFiltersChange?.(serie, v) }

  const isAF = isAfSerie(serie)
  const aeData = isAF ? aeAF : aeEM
  const escopoData = isAF ? escopoAF : escopoEM

  // AEs filtradas por série + componente
  const aeRows = useMemo(() => {
    if (!serie || !comp) return []
    return aeData
      .filter(r => r.serie === serie && r.componente === comp && (!bim || r.bimestre === bim))
      .sort((a, b) => aeNatSort(a.ae, b.ae))
  }, [aeData, serie, comp, bim])

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
      const aeCode = (row.aprendizagem_essencial || '').match(/^AE\d+/)?.[0]
      const aeCodes = aeCode ? [aeCode] : []
      for (const ae of aeCodes) {
        if (!map.has(ae)) map.set(ae, [])
        map.get(ae)!.push(row)
      }
    }
    return map
  }, [escopoData, serie, comp])

  // Abrir e scrollar para AE solicitada externamente
  useEffect(() => {
    if (!initialAE || initialAE === targetAERef.current) return
    targetAERef.current = initialAE
    // Encontrar a key do card correspondente
    const row = aeRows.find(r => r.ae === initialAE)
    if (!row) return
    const key = `${row.serie}-${row.componente}-${row.ae}`
    setOpenAEs(prev => new Set([...prev, key]))
    setTimeout(() => {
      document.getElementById(`ae-card-${initialAE}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }, [initialAE, aeRows])

  function generatePdf() {
    const filename = `AE 2026 - ${comp} - ${serie}`
    const bimLabel = bim || 'Todos os Bimestres'

    const blocosHtml = byBim.map(({ bim: b, rows }) => {
      const aesHtml = rows.map(ae => {
        const hpChips = ae.hab_priorizada ? getHabs(ae.hab_priorizada) : []
        const hrChips = ae.hab_relacionadas ? getHabs(ae.hab_relacionadas) : []
        const cpChips = ae.conhecimentos_previos ? getHabs(ae.conhecimentos_previos) : []
        const aulas   = (aulasByAE.get(ae.ae) || []).slice().sort((a, b) => a.aula - b.aula)

        // Linha 1: Hab Prioritária (esq) | Conhecimentos Prévios (dir)
        const row1 = (hpChips.length > 0 || cpChips.length > 0) ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;margin-bottom:8px">
            ${hpChips.length > 0 ? `<div>
              <div class="campo-label">Habilidade Prioritária</div>
              <div class="chips" style="margin-top:4px">${hpChips.map(h => `<span class="chip" style="background:#e6f4ea;border-color:#16a34a;color:#16a34a;font-weight:700">${h}</span>`).join('')}</div>
            </div>` : '<div></div>'}
            ${cpChips.length > 0 ? `<div>
              <div class="campo-label">Conhecimentos Prévios</div>
              <div class="chips" style="margin-top:4px">${cpChips.map(h => `<span class="chip" style="background:#f0f0f0;border-color:#ddd;color:#888">${h}</span>`).join('')}</div>
            </div>` : '<div></div>'}
          </div>` : ''

        // Linha 2: Outras Habilidades (esq) | Aulas Vinculadas (dir)
        const row2 = (hrChips.length > 0 || aulas.length > 0) ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;border-top:1px solid #f3f4f6;padding-top:8px">
            ${hrChips.length > 0 ? `<div>
              <div class="campo-label">Outras Habilidades</div>
              <div class="chips" style="margin-top:4px">${hrChips.map(h => `<span class="chip" style="background:#e8f0f9;border-color:#c0d9f0;color:#005BAC">${h}</span>`).join('')}</div>
            </div>` : '<div></div>'}
            ${aulas.length > 0 ? `<div>
              <div class="campo-label">Aulas Vinculadas</div>
              <div class="chips" style="margin-top:4px">${aulas.map(a => `<span class="chip" style="background:#fff3e8;border-color:#f5c99a;color:#F47920;font-weight:700">${a.aula}</span>`).join('')}</div>
            </div>` : '<div></div>'}
          </div>` : ''

        return `<div class="ae-block">
          <div class="ae-header" style="margin-bottom:${row1 || row2 ? '10px' : '0'}">
            <span class="ae-badge">${ae.ae}</span>
            <span class="ae-titulo">${ae.titulo}</span>
          </div>
          ${row1}${row2}
        </div>`
      }).join('')

      return `<div>
        <div class="bim-pill" style="margin-bottom:10px">${b}</div>
        ${aesHtml}
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>${filename}</title><style>${PDF_CSS}
      .ae-block{break-inside:avoid}
      .chip-aula{font-size:10px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      </style>
      <script>window.onbeforeprint=function(){document.title=${JSON.stringify(filename)}}</script>
      </head><body>
      <h1>Aprendizagens Essenciais 2026</h1>
      <div class="sub">${serie} &nbsp;·&nbsp; ${comp} &nbsp;·&nbsp; ${bimLabel} &nbsp;·&nbsp; ${aeRows.length} AE(s)</div>
      ${blocosHtml}
      </body></html>`

    openPrintWindow(html, filename)
  }

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
        serie={serie} comp={comp} bim={bim}
        showBim={true}
        onSerie={handleSerie}
        onComp={handleComp}
        onBim={setBim}
      />
      <div className="c-content">
        {placeholder ? (
          <div className="c-placeholder">
            <div className="icon">{placeholder.icon}</div>
            <h2>{placeholder.title}</h2>
            {placeholder.sub && <p>{placeholder.sub}</p>}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={generatePdf} style={pdfButtonStyle}>⬇ Baixar PDF</button>
            </div>
            {byBim.map(({ bim, rows }) => (
            <div key={bim} style={{ marginBottom: 28 }}>
              <div className="c-section-h">{bim}</div>
              {rows.map(ae => {
                const key = `${ae.serie}-${ae.componente}-${ae.ae}`
                const open = openAEs.has(key)
                const hpChips = ae.hab_priorizada ? getHabs(ae.hab_priorizada).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : []
                const hrChips = ae.hab_relacionadas ? getHabs(ae.hab_relacionadas).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : []
                const cpChips = ae.conhecimentos_previos ? getHabs(ae.conhecimentos_previos).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : []
                const aulas   = (aulasByAE.get(ae.ae) || []).slice().sort((a, b) => a.aula - b.aula)
                return (
                  <div key={key} id={`ae-card-${ae.ae}`} className={`ae-list-item${open ? ' open' : ''}`}>
                    <div className="ae-list-header" onClick={() => toggleAE(key)}>
                      <span className="c-ae-badge">{ae.ae}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.9rem' }}>{ae.titulo}</span>
                      <span className="c-expand-icon" style={{ color: 'var(--text-muted)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </div>
                    {open && (
                      <div className="ae-list-body">
                        {(hpChips.length > 0 || hrChips.length > 0) && (
                          <div style={{ marginTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            {hpChips.length > 0 && (
                              <div>
                                <div className="c-campo-label">Habilidade Prioritária</div>
                                <div className="flex-chips" style={{ marginTop: 6 }}>
                                  {hpChips.map(h => (
                                    <span key={h} className="c-hab-chip-primary" onClick={() => onGoToHab(serie, comp, h)}>{h}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {hrChips.length > 0 && (
                              <div>
                                <div className="c-campo-label">Outras Habilidades</div>
                                <div className="flex-chips" style={{ marginTop: 6 }}>
                                  {hrChips.map(h => (
                                    <span key={h} className="c-hab-chip" onClick={() => onGoToHab(serie, comp, h)}>{h}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {cpChips.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div className="c-campo-label">Conhecimentos Prévios</div>
                            <div className="flex-chips" style={{ marginTop: 6 }}>
                              {cpChips.map(h => (
                                <span key={h} className="c-hab-chip-prev">{h}</span>
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
          ))}
          </>
        )}
      </div>
    </>
  )
}
