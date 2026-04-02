import { useState, useMemo } from 'react'
import { type AeDetalhesRow, type EscopoRow, type MatrizDescritoresRow, aeNatSort, isAfSerie } from '../types'
import { Filtros } from '../components/Filtros'

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

  function handleSerie(v: string) { setSerie(v); setComp(''); setSelAE(''); onFiltersChange?.(v,'') }
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
            {/* Grid de AEs selecionáveis — apenas código */}
            <div className="c-section-h" style={{ marginBottom: 12 }}>Aprendizagens Essenciais</div>
            <div className="hab-grid" style={{ marginBottom: 24 }}>
              {aes.map(ae => (
                <div
                  key={ae}
                  className={`c-hab-box${effectiveAE === ae ? ' selected' : ''}`}
                  onClick={() => setSelAE(ae)}
                >
                  <span className="c-hab-code">{ae}</span>
                </div>
              ))}
            </div>

            {effectiveAE && (
              <>
                {/* Grupos de descritores */}
                <div className="c-section-h">Descritores — {effectiveAE}</div>
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
