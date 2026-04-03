import { useMemo } from 'react'
import { type EscopoRow, sortSeries, sortBim, BIM_ORDER } from '../types'

interface FiltrosProps {
  escopo: EscopoRow[]          // dados completos (AF + EM)
  serie: string
  comp: string
  bim: string
  showBim?: boolean
  hideBimTodos?: boolean
  onSerie: (v: string) => void
  onComp:  (v: string) => void
  onBim?:  (v: string) => void
}

export function Filtros({ escopo, serie, comp, bim, showBim = true, hideBimTodos = false, onSerie, onComp, onBim }: FiltrosProps) {
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

  // Cascade resets are handled by the parent's onSerie/onComp callbacks
  function handleSerie(v: string) { onSerie(v) }
  function handleComp(v: string)  { onComp(v) }

  return (
    <div className="c-filtros">
      <div className="c-filtro-group">
        <label>Série / Ano</label>
        <select value={serie} onChange={e => handleSerie(e.target.value)}>
          {series.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="c-filtro-group">
        <label>Componente Curricular</label>
        <select value={comp} onChange={e => handleComp(e.target.value)} disabled={!serie}>
          {comps.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {showBim && onBim && (
        <div className="c-filtro-group">
          <label>Bimestre</label>
          <select value={bim} onChange={e => onBim(e.target.value)} disabled={!comp}>
            {!hideBimTodos && <option value="">Todos</option>}
            {BIM_ORDER.filter(b => bims.includes(b)).map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
