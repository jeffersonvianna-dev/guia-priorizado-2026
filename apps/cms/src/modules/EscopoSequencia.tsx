import { useState, useEffect, useMemo, useCallback } from 'react'
import { db } from '../supabase'
import { toast } from '../utils/toast'
import { apiFetch } from '../utils/api'
import { ChipInput } from '../components/ChipInput'
import {
  ALL_SERIES, BIM_OPTIONS, compsFor, isAF, escopoTbl, serieCol,
} from '../types'

interface EscopoRow {
  id: number
  componente: string
  bimestre: string | null
  aula: number
  titulo: string
  habilidades: string
  unidade_tematica: string | null
  conteudo: string | null
  objetivos: string | null
  ano?: string
  serie?: string
  id_md?: string | null
}

interface FormData {
  serie: string; comp: string; bim: string; aula: string; titulo: string
  ut: string; conteudo: string; objetivos: string
  id_md: string
}

const EMPTY_FORM: FormData = {
  serie: '', comp: '', bim: '', aula: '', titulo: '',
  ut: '', conteudo: '', objetivos: '',
  id_md: '',
}

export function EscopoSequencia() {
  const [serie, setSerie] = useState('6º Ano')
  const [comp, setComp]   = useState('Matemática')
  const [bim,  setBim]    = useState('')
  const [rows, setRows]   = useState<EscopoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId]   = useState<number | null>(null)
  const [form, setForm]       = useState<FormData>(EMPTY_FORM)
  const [habs, setHabs]       = useState<string[]>([])
  const [saving, setSaving]   = useState(false)

  const comps = useMemo(() => serie ? compsFor(serie) : [], [serie])

  const loadData = useCallback(async () => {
    if (!serie) return
    setLoading(true)
    const tbl = escopoTbl(serie)
    const col = serieCol(serie)
    let q = db.from(tbl).select('*').eq(col, serie)
    if (comp) q = q.eq('componente', comp)
    if (bim)  q = q.eq('bimestre', bim)
    const { data, error } = await q
    if (error) { toast('Erro ao carregar dados.', 'err') }
    else setRows((data || []).sort((a: EscopoRow, b: EscopoRow) => {
      const bCmp = (a.bimestre || '').localeCompare(b.bimestre || '')
      return bCmp !== 0 ? bCmp : a.aula - b.aula
    }))
    setLoading(false)
  }, [serie, comp, bim])

  useEffect(() => { loadData() }, [loadData])

  function openNew() {
    setEditId(null)
    setForm({ ...EMPTY_FORM, serie, comp, bim: BIM_OPTIONS[0] })
    setHabs([])
    setShowModal(true)
  }

  function openEdit(row: EscopoRow) {
    const rowSerie = isAF(serie) ? (row.ano || '') : (row.serie || '')
    setEditId(row.id)
    setForm({
      serie: rowSerie, comp: row.componente, bim: row.bimestre || '',
      aula: String(row.aula), titulo: row.titulo,
      ut: row.unidade_tematica || '',
      conteudo: row.conteudo || '', objetivos: row.objetivos || '',
      id_md: row.id_md || '',
    })
    setHabs(row.habilidades ? row.habilidades.split(/\s+/).filter(Boolean) : [])
    setShowModal(true)
  }

  async function deleteRow(row: EscopoRow) {
    const label = `Aula ${row.aula} — ${row.titulo}`
    if (!confirm(`Excluir ${label}?`)) return
    try {
      await apiFetch(`/api/escopo/${row.id}?serie=${encodeURIComponent(serie)}`, { method: 'DELETE' })
      toast('Aula excluída.')
      loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir.', 'err')
    }
  }

  async function validateHab(hab: string): Promise<boolean> {
    const { data } = await db.from('curriculo_paulista')
      .select('id').eq('id_habilidade', hab).maybeSingle()
    return !!data
  }

  async function save() {
    const { serie: fSerie, comp: fComp, bim, aula, titulo } = form
    if (!fSerie || !fComp || !bim || !aula || !titulo) { toast('Preencha os campos obrigatórios (*).', 'err'); return }
    if (!/^\d+$/.test(aula) || parseInt(aula) < 1) { toast('Nº Aula deve ser um número natural (1, 2, 3…).', 'err'); return }
    if (habs.length === 0) { toast('Informe pelo menos uma Habilidade (*).', 'err'); return }

    const tbl = escopoTbl(fSerie)
    const col = serieCol(fSerie)
    let q = db.from(tbl).select('id')
      .eq(col, fSerie).eq('componente', fComp).eq('aula', parseInt(aula))
    if (bim) q = q.eq('bimestre', bim)
    const { data: dup } = await q
    if (dup && dup.length > 0 && editId !== dup[0].id) {
      toast(`Aula ${aula} já existe para ${fSerie}/${fComp}/${bim || 'sem bimestre'}.`, 'err'); return
    }

    const body = {
      serie: fSerie, componente: fComp,
      bimestre: bim || null, aula: parseInt(aula),
      titulo: form.titulo, unidade_tematica: form.ut || null,
      conteudo: form.conteudo || null,
      objetivos: form.objetivos || null,
      habilidades: habs.join(' '),
      id_md: form.id_md || null,
    }

    setSaving(true)
    try {
      if (editId) {
        await apiFetch(`/api/escopo/${editId}`, { method: 'PATCH', body: JSON.stringify(body) })
        toast('Aula atualizada.')
      } else {
        await apiFetch('/api/escopo', { method: 'POST', body: JSON.stringify(body) })
        toast('Aula criada.')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar.', 'err')
    }
    setSaving(false)
  }

  function set(field: keyof FormData, v: string) { setForm(f => ({ ...f, [field]: v })) }

  const displaySerie = (row: EscopoRow) => isAF(serie) ? row.ano : row.serie

  return (
    <>
      {/* Filtros */}
      <div className="cms-filtros">
        <div className="c-filtro-group">
          <label>Série *</label>
          <select value={serie} onChange={e => { const s = e.target.value; setSerie(s); setComp(c => (compsFor(s) as string[]).includes(c) ? c : (compsFor(s)[0] || '')) }}>
            {ALL_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="c-filtro-group">
          <label>Componente</label>
          <select value={comp} onChange={e => setComp(e.target.value)} disabled={!serie}>
            {comps.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="c-filtro-group">
          <label>Bimestre</label>
          <select value={bim} onChange={e => setBim(e.target.value)} disabled={!serie}>
            <option value="">Todos</option>
            {BIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {serie && (
          <button className="c-btn c-btn-primary" style={{ alignSelf: 'flex-end' }} onClick={openNew}>
            + Nova Aula
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="cms-content">
        <div className="cms-status">
          {loading ? 'Carregando...' : `${rows.length} aula(s)`}
        </div>
        {!serie ? (
          <div className="c-placeholder"><div className="icon">📅</div><h2>Selecione uma série</h2></div>
        ) : (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Série</th><th>Componente</th><th>Bimestre</th>
                  <th>Aula</th><th>Título</th><th>Habilidades</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td>{displaySerie(row)}</td>
                    <td>{row.componente}</td>
                    <td>{row.bimestre || '—'}</td>
                    <td>{row.aula}</td>
                    <td style={{ maxWidth: 220 }}>{row.titulo}</td>
                    <td>
                      <div className="flex-chips">
                        {(row.habilidades || '').split(/\s+/).filter(Boolean).map(h => (
                          <span key={h} className="c-hab-chip">{h}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="c-btn-icon" onClick={() => openEdit(row)} title="Editar">✏️</button>
                      <button className="c-btn-icon danger" onClick={() => deleteRow(row)} title="Excluir">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>{editId ? 'Editar Aula' : 'Nova Aula'}</span>
              <button className="c-btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Série *</label>
                <select className="form-select" value={form.serie}
                  onChange={e => { set('serie', e.target.value); set('comp', '') }}>
                  {ALL_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Componente *</label>
                <select className="form-select" value={form.comp} onChange={e => set('comp', e.target.value)}
                  disabled={!form.serie}>
                  {compsFor(form.serie).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bimestre *</label>
                <select className="form-select" value={form.bim} onChange={e => set('bim', e.target.value)}>
                  {BIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nº Aula *</label>
                <input className="form-input" type="number" min="1" value={form.aula}
                  onChange={e => set('aula', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Título *</label>
              <input className="form-input" value={form.titulo} onChange={e => set('titulo', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Habilidades *</label>
              <ChipInput value={habs} onChange={setHabs} validate={validateHab} />
            </div>

            <div className="form-group">
              <label className="form-label">Unidade Temática</label>
              <input className="form-input" value={form.ut} onChange={e => set('ut', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Conteúdo</label>
              <textarea className="form-textarea" value={form.conteudo} onChange={e => set('conteudo', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Objetivos de Aprendizagem</label>
              <textarea className="form-textarea" value={form.objetivos} onChange={e => set('objetivos', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">ID Material Digital</label>
              <input className="form-input" style={{ fontFamily: 'monospace' }} value={form.id_md} onChange={e => set('id_md', e.target.value)} placeholder="ex: MD001" />
            </div>

            <div className="modal-actions">
              <button className="c-btn c-btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="c-btn c-btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Salvando...' : editId ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
