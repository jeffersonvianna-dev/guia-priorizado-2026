import { useMemo } from 'react'
import { EscopoRow, sortSeries, sortBim, isAfSerie, BIM_ORDER } from '../types'

interface FiltrosProps {
  escopo: EscopoRow[]          // dados completos (AF + EM)
  serie: string
  comp: string
  bim: string
  showBim?: boolean
  onSerie: (v: string) => void
  onComp:  (v: string) => void
  onBim?:  (v: string) => void
}

export function Filtros({ escopo, serie, comp, bim, showBim = true, onSerie, onComp, onBim }: FiltrosProps) {
  const series = useMemo(() => {
    const all = [...escopo.map(r => r.serie)]
    return sortSeries(all)
  }, [escopo])

  const comps = useMemo(() => {
    if (!serie) return []
    return [...new Set(escopo.filter(r => r.serie === serie).map(r => r.componente))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [escopo, serie])

  const bims = useMemo(() => {
    if (!serie || !comp) return []
    const raw = [...new Set(
      escopo.filter(r => r.serie === serie && r.componente === comp).map(r => r.bimestre)
    )]
    return sortBim(raw)
  }, [escopo, serie, comp])

  function handleSerie(v: string) {
    onSerie(v)
    onComp('')
    if (onBim) onBim('')
  }

  function handleComp(v: string) {
    onComp(v)
    if (onBim) onBim('')
  }

  const isAfFilter = serie ? isAfSerie(serie) : false
  const segLabel = serie ? (isAfFilter ? 'Anos Finais' : 'Ensino Médio') : ''

  return (
    <div className="c-filtros">
      <div className="c-filtro-group">
        <label>Série / Ano{segLabel ? ` — ${segLabel}` : ''}</label>
        <select value={serie} onChange={e => handleSerie(e.target.value)}>
          <option value="">Selecione...</option>
          {series.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="c-filtro-group">
        <label>Componente Curricular</label>
        <select value={comp} onChange={e => handleComp(e.target.value)} disabled={!serie}>
          <option value="">Selecione...</option>
          {comps.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {showBim && onBim && (
        <div className="c-filtro-group">
          <label>Bimestre</label>
          <select value={bim} onChange={e => onBim(e.target.value)} disabled={!comp}>
            <option value="">Todos</option>
            {BIM_ORDER.filter(b => bims.includes(b)).map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
