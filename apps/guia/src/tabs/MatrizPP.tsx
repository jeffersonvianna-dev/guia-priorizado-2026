import { useState, useMemo } from 'react'
import { type AeDetalhesRow, type EscopoRow, type MatrizDescritoresRow, aeNatSort, isAfSerie, sortSeries } from '../types'
import { Filtros } from '../components/Filtros'
import { PDF_CSS, pdfButtonStyle } from '../utils/pdf'

interface Props {
  aeAF: AeDetalhesRow[]
  aeEM: AeDetalhesRow[]
  escopoAF: EscopoRow[]
  escopoEM: EscopoRow[]
  matrizAF: MatrizDescritoresRow[]
  matrizEM: MatrizDescritoresRow[]
  initialSerie?: string
  initialComp?: string
  onGoToHab:  (serie: string, comp: string, hab: string) => void
  onGoToAula: (serie: string, comp: string, bim: string, aula: number) => void
  onFiltersChange?: (serie: string, comp: string) => void
}

const GRUPOS = ['Grupo 1','Grupo 2','Grupo 3']

export function MatrizPP({
  aeAF, aeEM, escopoAF, escopoEM, matrizAF, matrizEM,
  initialSerie = '', initialComp = '',
  onGoToHab, onGoToAula, onFiltersChange,
}: Props) {
  const [serie, setSerie] = useState(initialSerie)
  const [comp, setComp]   = useState(initialComp)
  const [selAE, setSelAE] = useState('')

  const allEscopo = useMemo(() => [...escopoAF, ...escopoEM], [escopoAF, escopoEM])
  const isAF = isAfSerie(serie)
  const aeData    = isAF ? aeAF    : aeEM
  const matrizData= isAF ? matrizAF: matrizEM

  const allAe     = useMemo(() => [...aeAF, ...aeEM], [aeAF, aeEM])
  const allMatriz = useMemo(() => [...matrizAF, ...matrizEM], [matrizAF, matrizEM])

  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfSeries, setPdfSeries]       = useState<Set<string>>(new Set())
  const [pdfComp,   setPdfComp]         = useState('')

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
    setShowPdfModal(true)
  }

  function togglePdfSerie(s: string) {
    setPdfSeries(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  // Suppress unused warnings for cross-tab navigation props
  void onGoToHab; void onGoToAula

  function handleSerie(v: string) {
    const data = isAfSerie(v) ? escopoAF : escopoEM
    const avail = new Set(data.filter(r => r.serie === v).map(r => r.componente))
    const newComp = avail.has(comp) ? comp : ''
    setSerie(v); setComp(newComp); setSelAE('')
    onFiltersChange?.(v, newComp)
  }
  function handleComp(v: string)  { setComp(v);  setSelAE(''); onFiltersChange?.(serie,v) }

  // AEs disponíveis para a série+comp
  const aes = useMemo(() => {
    if (!serie || !comp) return []
    return [...new Set(
      aeData.filter(r => r.serie === serie && r.componente === comp).map(r => r.ae)
    )].sort(aeNatSort)
  }, [aeData, serie, comp])

  const effectiveAE = selAE && aes.includes(selAE) ? selAE : (aes[0] || '')

  // Descritores por grupo
  const descByGrupo = useMemo(() => {
    if (!effectiveAE) return new Map<string, MatrizDescritoresRow[]>()
    const rows = matrizData.filter(r =>
      r.serie === serie && r.componente === comp && r.ae === effectiveAE
    )
    const map = new Map<string, MatrizDescritoresRow[]>()
    for (const r of rows) {
      if (!map.has(r.grupo)) map.set(r.grupo, [])
      map.get(r.grupo)!.push(r)
    }
    return map
  }, [matrizData, serie, comp, effectiveAE])

  const grupoCores: Record<string, string> = {
    'Grupo 1': 'var(--blue)',
    'Grupo 2': 'var(--orange)',
    'Grupo 3': 'var(--green)',
  }

  // Título da AE selecionada
  const aeTitulo = useMemo(() => {
    if (!effectiveAE) return ''
    return aeData.find(r => r.serie === serie && r.componente === comp && r.ae === effectiveAE)?.titulo || ''
  }, [aeData, serie, comp, effectiveAE])

  // Contagem de descritores por AE
  const descCountByAE = useMemo(() => {
    if (!serie || !comp) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const r of matrizData.filter(r => r.serie === serie && r.componente === comp)) {
      map.set(r.ae, (map.get(r.ae) || 0) + 1)
    }
    return map
  }, [matrizData, serie, comp])

  const GRUPO_CLASSES: Record<string, string> = { 'Grupo 1': 'g1', 'Grupo 2': 'g2', 'Grupo 3': 'g3' }

  function generatePdf() {
    if (!pdfComp || pdfSeries.size === 0) return

    const w = window.open('about:blank', '_blank')
    if (!w) { alert('Permita pop-ups para gerar o PDF.'); return }
    w.document.title = 'SEDUC SP'

    const seriesArr = sortSeries([...pdfSeries])
    const filename  = seriesArr.length === 1
      ? `Matriz PP 2026 - ${pdfComp} - ${seriesArr[0]}`
      : `Matriz PP 2026 - ${pdfComp}`

    const blocosHtml = seriesArr.map((s, idx) => {
      const aesSerie = [...new Set(
        allAe.filter(r => r.serie === s && r.componente === pdfComp).map(r => r.ae)
      )].sort(aeNatSort)

      const aesHtml = aesSerie.map(ae => {
        const titulo = allAe.find(r => r.serie === s && r.componente === pdfComp && r.ae === ae)?.titulo || ''
        const descs  = allMatriz.filter(r => r.serie === s && r.componente === pdfComp && r.ae === ae)

        const gruposHtml = GRUPOS.map(grupo => {
          const rows = descs.filter(d => d.grupo === grupo)
          if (rows.length === 0) return ''
          return `<div style="margin-bottom:10px">
            <div class="grupo-header ${GRUPO_CLASSES[grupo]}">${grupo}</div>
            <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">
              ${rows.map(d => `<li style="font-size:.82rem;line-height:1.5">
                ${d.bimestre ? `<span style="font-size:10px;font-weight:700;color:#f97316">${d.bimestre} — </span>` : ''}${d.descritor}
              </li>`).join('')}
            </ul>
          </div>`
        }).join('')

        return `<div class="ae-block">
          <div class="ae-header">
            <span class="ae-badge">${ae}</span>
            <span class="ae-titulo">${titulo}</span>
          </div>
          ${gruposHtml}
        </div>`
      }).join('')

      return `<div class="${idx > 0 ? 'page-break' : ''}">
        <h2 style="margin-bottom:16px">${pdfComp} — ${s}</h2>
        ${aesHtml || '<p style="color:#9ca3af;font-size:.85rem">Nenhuma AE encontrada.</p>'}
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>${filename}</title><style>${PDF_CSS}
      .ae-block{break-inside:avoid}
      </style>
      <script>window.onbeforeprint=function(){document.title=${JSON.stringify(filename)}}</script>
      </head><body>
      <h1>Matriz da Prova Paulista 2026</h1>
      <div class="sub">${pdfComp}</div>
      ${blocosHtml}
      </body></html>`

    w.document.open()
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.document.title = filename; w.print() }, 400)
    setShowPdfModal(false)
  }

  const placeholder = !serie
    ? { icon: '📝', title: 'Selecione uma série', sub: '' }
    : !comp
    ? { icon: '📝', title: 'Selecione o componente', sub: '' }
    : aes.length === 0
    ? { icon: '💭', title: 'Nenhuma AE com descritores', sub: '' }
    : null

  return (
    <>
      <Filtros
        escopo={allEscopo}
        serie={serie} comp={comp} bim=""
        showBim={false}
        onSerie={handleSerie} onComp={handleComp}
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
            {/* Grid de AEs selecionáveis — apenas código */}
            <div className="c-section-h" style={{ marginBottom: 12 }}>Aprendizagens Essenciais</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
              {aes.map(ae => {
                const count = descCountByAE.get(ae) || 0
                return (
                  <div
                    key={ae}
                    className={`c-hab-box${effectiveAE === ae ? ' selected' : ''}`}
                    onClick={() => setSelAE(ae)}
                  >
                    <span className="c-hab-code">{ae}</span>
                    <span className="c-hab-box-meta">{count} descritor{count !== 1 ? 'es' : ''}</span>
                  </div>
                )
              })}
            </div>

            {effectiveAE && (
              <>
                {/* Card título da AE */}
                {aeTitulo && (
                  <div className="c-aula-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 16 }}>
                    <span className="c-ae-badge">{effectiveAE}</span>
                    <span style={{ fontWeight: 600, fontSize: '.88rem' }}>{aeTitulo}</span>
                  </div>
                )}

                {/* Grupos de descritores */}
                <div className="c-section-h">Descritores</div>
                <div className="grid-3" style={{ marginTop: 12 }}>
                  {GRUPOS.map(grupo => {
                    const descs = descByGrupo.get(grupo) || []
                    return (
                      <div key={grupo} className="c-aula-card" style={{ borderTop: `3px solid ${grupoCores[grupo]}` }}>
                        <div style={{ padding: '12px 16px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              background: grupoCores[grupo],
                              color: '#fff', borderRadius: 6,
                              padding: '2px 10px', fontSize: '.76rem', fontWeight: 800,
                              marginBottom: 10,
                            }}
                          >{grupo}</span>
                          {descs.length === 0 ? (
                            <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Nenhum descritor</p>
                          ) : (
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {descs.map(d => (
                                <li key={d.id} className="c-campo" style={{ fontSize: '.84rem', lineHeight: 1.55 }}>
                                  {d.bimestre && (
                                    <span className="c-bim-chip" style={{ marginBottom: 6, display: 'inline-block' }}>{d.bimestre}</span>
                                  )}
                                  <div>{d.descritor}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
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
            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Componente</div>
              <select value={pdfComp} onChange={e => setPdfComp(e.target.value)} disabled={pdfSeries.size === 0}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #dde2ec', fontSize: '.88rem', color: '#1a1f36', background: pdfSeries.size === 0 ? '#f3f4f6' : '#fff', cursor: pdfSeries.size === 0 ? 'not-allowed' : 'pointer', outline: 'none' }}>
                {pdfAvailComps.length === 0 && <option value="">—</option>}
                {pdfAvailComps.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowPdfModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #dde2ec', background: 'none', cursor: 'pointer', fontSize: '.88rem', color: '#6b7280', fontWeight: 600 }}>Cancelar</button>
              <button onClick={generatePdf} disabled={pdfSeries.size === 0 || !pdfComp}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: pdfSeries.size === 0 || !pdfComp ? '#c4c9d4' : '#005BAC', color: '#fff', cursor: pdfSeries.size === 0 || !pdfComp ? 'not-allowed' : 'pointer', fontSize: '.88rem', fontWeight: 700 }}>⬇ Baixar PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
