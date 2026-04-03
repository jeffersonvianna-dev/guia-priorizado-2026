import { useState, useMemo, useEffect } from 'react'
import { type EscopoRow, type MdTarefaRow, getHabs, fmtList, isAfSerie } from '../types'
import { Filtros } from '../components/Filtros'

interface Props {
  escopoAF: EscopoRow[]
  escopoEM: EscopoRow[]
  mdTarefas: MdTarefaRow[]
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
  escopoAF, escopoEM, mdTarefas,
  initialSerie = '', initialComp = '', initialBim = '',
  onGoToHab, onGoToAE, onFiltersChange, scrollToAula,
}: Props) {
  const [serie, setSerie] = useState(initialSerie)
  const [comp, setComp]   = useState(initialComp)
  const [bim, setBim]     = useState(initialBim)
  const [openCards, setOpenCards] = useState<Set<number>>(new Set())

  const allEscopo = useMemo(() => [...escopoAF, ...escopoEM], [escopoAF, escopoEM])

  const tarefaSet = useMemo(() => {
    const s = new Set<string>()
    mdTarefas.forEach(t => s.add(`${t.serie}|${t.componente}|${t.aula}`))
    return s
  }, [mdTarefas])

  function hasTarefa(a: EscopoRow) {
    return tarefaSet.has(`${a.serie}|${a.componente}|${a.aula}`)
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

  function downloadPdf() {
    const bimLabel = bim || 'Todos os Bimestres'
    const title = `Escopo-Sequência — ${serie} / ${comp}`
    const rowsHtml = aulas.map(a => {
      const aeCode = (a.aprendizagem_essencial || '').match(/^AE\d+/)?.[0] || ''
      const habs = getHabs(a.habilidades)
      const tarefa = hasTarefa(a)
      return `<tr>
        <td>${a.aula}</td>
        <td>${a.titulo}${tarefa ? ' <span class="tag-tarefa">📋 Tarefa</span>' : ''}</td>
        <td>${aeCode || '—'}</td>
        <td class="habs">${habs.join(' · ')}</td>
      </tr>`
    }).join('')
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>${title}</title><style>
      body{font-family:'Segoe UI',sans-serif;color:#1a1f36;margin:36px;font-size:13px}
      h1{font-size:17px;margin:0 0 4px;color:#005BAC}
      .sub{font-size:12px;color:#6b7280;margin-bottom:24px}
      table{width:100%;border-collapse:collapse}
      th{background:#005BAC;color:#fff;padding:8px 10px;text-align:left;font-size:12px;font-weight:700}
      td{padding:7px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
      tr:nth-child(even) td{background:#f8faff}
      .habs{font-size:11px;color:#4b5563}
      .tag-tarefa{font-size:10px;background:#f5f3ff;border:1px solid #c4b5fd;color:#7c3aed;border-radius:8px;padding:1px 6px;margin-left:6px;white-space:nowrap}
      @media print{@page{margin:18mm}body{margin:0}}
      </style></head><body>
      <h1>${title}</h1>
      <div class="sub">${bimLabel} &nbsp;·&nbsp; ${aulas.length} aula(s) &nbsp;·&nbsp; ${stats.totalHabs} habilidade(s)</div>
      <table><thead><tr><th style="width:48px">Aula</th><th>Título</th><th style="width:48px">AE</th><th>Habilidades</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) { alert('Permita pop-ups para gerar o PDF.'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 350)
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
              <button onClick={downloadPdf} title={`Baixar PDF — ${serie} / ${comp}`} style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: '1px solid var(--gray-mid, #dde2ec)',
                borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600,
              }}>
                ⬇ PDF
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
