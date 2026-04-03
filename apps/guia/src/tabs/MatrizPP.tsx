import { useState, useMemo } from 'react'
import { type AeDetalhesRow, type EscopoRow, type MatrizDescritoresRow, aeNatSort, isAfSerie } from '../types'
import { Filtros } from '../components/Filtros'
import { openPrintWindow, PDF_CSS, pdfButtonStyle } from '../utils/pdf'

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
    const filename = `Matriz PP 2026 - ${comp} - ${serie}`

    const aesHtml = aes.map((ae, idx) => {
      const titulo = aeData.find(r => r.serie === serie && r.componente === comp && r.ae === ae)?.titulo || ''
      const descs  = matrizData.filter(r => r.serie === serie && r.componente === comp && r.ae === ae)

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

      return `<div class="${idx > 0 ? 'page-break' : ''}">
        <div class="ae-block">
          <div class="ae-header">
            <span class="ae-badge">${ae}</span>
            <span class="ae-titulo">${titulo}</span>
          </div>
          <h2 style="margin-top:8px">Descritores</h2>
          ${gruposHtml}
        </div>
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>${filename}</title><style>${PDF_CSS}
      .ae-block{border:none;padding:0}
      </style>
      <script>window.onbeforeprint=function(){document.title=${JSON.stringify(filename)}}</script>
      </head><body>
      <h1>Matriz da Prova Paulista 2026</h1>
      <div class="sub">${serie} &nbsp;·&nbsp; ${comp} &nbsp;·&nbsp; ${aes.length} AE(s)</div>
      ${aesHtml}
      </body></html>`

    openPrintWindow(html, filename)
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
              <button onClick={generatePdf} style={pdfButtonStyle}>⬇ Baixar PDF</button>
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
    </>
  )
}
