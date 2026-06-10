import { useState, useMemo, useEffect } from 'react'
import { type EscopoRow, type MdTarefaRow, getHabs, fmtList, isAfSerie, BIM_ORDER, sortSeries } from '../types'
import { Filtros } from '../components/Filtros'

interface Props {
  escopoAF: EscopoRow[]
  escopoEM: EscopoRow[]
  mdTarefas: MdTarefaRow[]
  habBncc?: Record<string, string>
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
  escopoAF, escopoEM, mdTarefas, habBncc = {},
  initialSerie = '', initialComp = '', initialBim = '',
  onGoToHab, onGoToAE, onFiltersChange, scrollToAula,
}: Props) {
  const [serie, setSerie] = useState(initialSerie)
  const [comp, setComp]   = useState(initialComp)
  const [bim, setBim]     = useState(initialBim)
  const [openCards, setOpenCards] = useState<Set<number>>(new Set())
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfSeries, setPdfSeries] = useState<Set<string>>(new Set())
  const [pdfComp, setPdfComp]     = useState('')
  const [pdfBims, setPdfBims]     = useState<Set<string>>(new Set(BIM_ORDER))

  const allEscopo = useMemo(() => [...escopoAF, ...escopoEM], [escopoAF, escopoEM])

  // md_tarefas.bimestre vem como "B1".."B4"; escopo.bimestre é "1º Bimestre"..
  // Sem o bimestre na chave, o nº de aula (que reseta por bimestre) acende tarefa de
  // bimestres diferentes. Normalizamos "B1" -> "1º Bimestre" e incluímos na chave.
  const TAREFA_BIM: Record<string, string> = {
    B1: '1º Bimestre', B2: '2º Bimestre', B3: '3º Bimestre', B4: '4º Bimestre',
  }
  const tarefaSet = useMemo(() => {
    const s = new Set<string>()
    mdTarefas.forEach(t => {
      const bim = TAREFA_BIM[t.bimestre] || t.bimestre
      s.add(`${t.serie}|${t.componente}|${bim}|${t.aula}`)
    })
    return s
  }, [mdTarefas])

  function hasTarefa(a: EscopoRow) {
    return tarefaSet.has(`${a.serie}|${a.componente}|${a.bimestre}|${a.aula}`)
  }
  const escopoData = isAfSerie(serie) ? escopoAF : escopoEM

  function handleSerie(v: string) {
    const data = isAfSerie(v) ? escopoAF : escopoEM
    const avail = new Set(data.filter(r => r.serie === v).map(r => r.componente))
    const newComp = avail.has(comp) ? comp : ''
    setSerie(v); setComp(newComp); setBim('1º Bimestre')
    onFiltersChange?.(v, newComp, '1º Bimestre')
  }
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
    const totalTarefas = aulas.filter(hasTarefa).length
    return { totalAulas, totalAEs, totalHabs, totalTarefas }
  }, [aulas])

  // Abrir primeira aula quando série/comp/bimestre mudam
  useEffect(() => {
    if (aulas.length > 0) setOpenCards(new Set([aulas[0].aula]))
    else setOpenCards(new Set())
  }, [serie, comp, bim])

  // Séries disponíveis no dataset (para o modal de PDF)
  const availSeries = useMemo(() => sortSeries([...new Set(allEscopo.map(r => r.serie))]), [allEscopo])

  // Componentes disponíveis: todos os componentes do dataset (independe da seleção de série)
  const pdfAvailComps = useMemo(() => {
    const s = new Set<string>()
    allEscopo.forEach(r => s.add(r.componente))
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allEscopo])

  function openPdfModal() {
    setPdfSeries(serie ? new Set([serie]) : new Set())
    setPdfComp(comp || '')
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

  function generatePdf() {
    if (!pdfComp || pdfSeries.size === 0 || pdfBims.size === 0) return

    // Abrir janela IMEDIATAMENTE (contexto de gesto do usuário)
    // — antes de qualquer processamento, senão o browser bloqueia o popup
    const w = window.open('about:blank', '_blank')
    if (!w) { alert('Permita pop-ups para gerar o PDF.'); return }
    w.document.title = 'SEDUC SP'

    const seriesArr = sortSeries([...pdfSeries])
    const bimsArr   = BIM_ORDER.filter(b => pdfBims.has(b))
    const bimLabel  = bimsArr.length === 4 ? 'Todos os Bimestres' : bimsArr.join(', ')

    const filename = seriesArr.length === 1
      ? `Escopo-Sequência 2026 - ${pdfComp} - ${seriesArr[0]}`
      : `Escopo-Sequência 2026 - ${pdfComp}`

    // Gera um bloco por série, cada um com nova página
    const blocosHtml = seriesArr.map((s, idx) => {
      const rowsSerie = allEscopo
        .filter(r => r.serie === s && r.componente === pdfComp && pdfBims.has(r.bimestre))
        .sort((a, b) => {
          const bA = BIM_ORDER.indexOf(a.bimestre), bB = BIM_ORDER.indexOf(b.bimestre)
          return bA !== bB ? bA - bB : a.aula - b.aula
        })

      const rowsHtml = rowsSerie.map(a => {
        const aeCode = (a.aprendizagem_essencial || '').match(/^AE\d+/)?.[0] || ''
        const habs = getHabs(a.habilidades)
        const tarefa = hasTarefa(a)
        return `<tr>
          <td>${a.bimestre}</td>
          <td>${a.aula}</td>
          <td>${a.titulo || '—'}${tarefa ? ' <span class="tag-tarefa">📋 Tarefa</span>' : ''}</td>
          <td>${aeCode || '—'}</td>
          <td class="habs">${habs.join(' · ')}</td>
        </tr>`
      }).join('')

      return `<div class="${idx > 0 ? 'page-break' : ''}">
        <h1>${pdfComp} — ${s}</h1>
        <div class="sub">${bimLabel} &nbsp;·&nbsp; ${rowsSerie.length} aula(s)</div>
        <table>
          <thead><tr>
            <th style="width:110px">Bimestre</th>
            <th style="width:44px">Aula</th>
            <th>Título</th>
            <th style="width:44px">AE</th>
            <th>Habilidades</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>${filename}</title><style>
      body{font-family:'Segoe UI',sans-serif;color:#1a1f36;margin:36px;font-size:13px}
      h1{font-size:17px;margin:0 0 4px;color:#005BAC}
      .sub{font-size:12px;color:#6b7280;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#005BAC;color:#fff;padding:8px 10px;text-align:left;font-size:12px;font-weight:700}
      td{padding:7px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
      tr:nth-child(even) td{background:#f8faff}
      .habs{font-size:11px;color:#4b5563}
      .tag-tarefa{font-size:10px;background:#f5f3ff;border:1px solid #c4b5fd;color:#7c3aed;border-radius:8px;padding:1px 6px;margin-left:6px;white-space:nowrap}
      .page-break{page-break-before:always;padding-top:8px}
      @media print{@page{margin:18mm}body{margin:0}.page-break{page-break-before:always}}
      </style>
      <script>window.onbeforeprint=function(){document.title=${JSON.stringify(filename)}}</script>
      </head><body>
      ${blocosHtml}
      </body></html>`

    w.document.open()
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.document.title = filename; w.print() }, 400)
    setShowPdfModal(false)
  }

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
            {/* Stats pills + PDF */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
              {[
                { label: 'Aulas',       value: stats.totalAulas,    color: 'var(--blue)',   border: 'var(--blue)',          bg: 'var(--blue-light, #e8f0fe)' },
                { label: 'AEs',         value: stats.totalAEs,      color: 'var(--orange)', border: 'var(--orange-border)', bg: 'var(--orange-light)' },
                { label: 'Habilidades', value: stats.totalHabs,     color: 'var(--green)',  border: 'var(--green)',         bg: 'var(--green-light, #e6f4ea)' },
                { label: 'Tarefas',     value: stats.totalTarefas,  color: '#7c3aed',       border: '#c4b5fd',              bg: '#f5f3ff' },
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
              <button onClick={openPdfModal} title="Baixar PDF" style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                background: '#005BAC', border: 'none',
                borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
                fontSize: '.8rem', color: '#fff', fontWeight: 700,
                boxShadow: '0 1px 4px rgba(0,91,172,.25)',
              }}>
                ⬇ Baixar PDF
              </button>
            </div>

            {semanas.map((semAulas, si) => {
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
                          {hasTarefa(aula) && (
                            <span title="Esta aula possui Tarefa" style={{
                              fontSize: '.68rem', fontWeight: 700, letterSpacing: '.03em',
                              color: '#7c3aed', background: '#f5f3ff', border: '1px solid #c4b5fd',
                              borderRadius: 10, padding: '1px 7px', flexShrink: 0, whiteSpace: 'nowrap',
                            }}>📋 Tarefa</span>
                          )}
                          <div className="flex-chips c-aula-habs-preview">
                            {aeCode && (
                              <span className="c-ae-badge nav" style={{ fontSize: '.72rem', padding: '2px 8px' }}
                                onClick={e => { e.stopPropagation(); onGoToAE(serie, comp, aeCode) }}>
                                {aeCode}
                              </span>
                            )}
                            {habs.slice(0, 4).map(h => (
                              <span key={h} className="c-hab-chip" style={{ fontSize: '.72rem' }}
                                title={habBncc[h] || h}
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

      {/* Modal PDF — 100% inline styles (guia não tem classes de modal) */}
      {showPdfModal && (
        <div
          onClick={e => e.target === e.currentTarget && setShowPdfModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480,
            boxShadow: '0 8px 32px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {/* Fechar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button onClick={() => setShowPdfModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#9ca3af', lineHeight: 1,
              }}>✕</button>
            </div>

            {/* Série — grid 4 colunas, mesmo tamanho */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Série</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {availSeries.map(s => {
                  const compSet = new Set(allEscopo.filter(r => r.serie === s).map(r => r.componente))
                  const blocked = !!pdfComp && !compSet.has(pdfComp)
                  const selected = pdfSeries.has(s)
                  return (
                    <span key={s} onClick={() => !blocked && togglePdfSerie(s)} style={{
                      cursor: blocked ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '7px 4px', fontSize: '.8rem',
                      fontWeight: 600, border: '1px solid', textAlign: 'center',
                      background: selected ? '#005BAC' : blocked ? '#f3f4f6' : '#fff',
                      color: selected ? '#fff' : blocked ? '#c4c9d4' : '#374151',
                      borderColor: selected ? '#005BAC' : blocked ? '#e5e7eb' : '#dde2ec',
                      userSelect: 'none', transition: 'all .15s',
                      opacity: blocked ? .55 : 1,
                    }}>{s}</span>
                  )
                })}
              </div>
            </div>

            {/* Componente — único */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Componente</div>
              <select
                value={pdfComp}
                onChange={e => setPdfComp(e.target.value)}
                disabled={pdfSeries.size === 0}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid #dde2ec', fontSize: '.88rem', color: '#1a1f36',
                  background: pdfSeries.size === 0 ? '#f3f4f6' : '#fff',
                  cursor: pdfSeries.size === 0 ? 'not-allowed' : 'pointer',
                  outline: 'none',
                }}
              >
                {pdfAvailComps.length === 0 && <option value="">—</option>}
                {pdfAvailComps.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Bimestre — grid 4 colunas, mesmo estilo da série */}
            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Bimestre</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {BIM_ORDER.map(b => {
                  const selected = pdfBims.has(b)
                  return (
                    <span key={b} onClick={() => togglePdfBim(b)} style={{
                      cursor: 'pointer', borderRadius: 8, padding: '7px 4px', fontSize: '.8rem',
                      fontWeight: 600, border: '1px solid', textAlign: 'center',
                      background: selected ? '#f97316' : '#fff',
                      color: selected ? '#fff' : '#374151',
                      borderColor: selected ? '#f97316' : '#dde2ec',
                      userSelect: 'none', transition: 'all .15s',
                    }}>{b}</span>
                  )
                })}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowPdfModal(false)} style={{
                padding: '9px 20px', borderRadius: 8, border: '1px solid #dde2ec',
                background: 'none', cursor: 'pointer', fontSize: '.88rem', color: '#6b7280', fontWeight: 600,
              }}>Cancelar</button>
              <button
                onClick={generatePdf}
                disabled={pdfSeries.size === 0 || !pdfComp || pdfBims.size === 0}
                style={{
                  padding: '9px 20px', borderRadius: 8, border: 'none',
                  background: pdfSeries.size === 0 || !pdfComp || pdfBims.size === 0 ? '#c4c9d4' : '#005BAC',
                  color: '#fff',
                  cursor: pdfSeries.size === 0 || !pdfComp || pdfBims.size === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '.88rem', fontWeight: 700,
                  boxShadow: pdfSeries.size === 0 || !pdfComp || pdfBims.size === 0 ? 'none' : '0 1px 4px rgba(0,91,172,.3)',
                }}
              >⬇ Baixar PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
