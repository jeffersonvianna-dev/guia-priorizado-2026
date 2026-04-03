import { useState, useEffect, useMemo, useCallback } from 'react'
import { db } from '../supabase'
import { toast } from '../utils/toast'
import { apiFetch } from '../utils/api'
import { ChipInput } from '../components/ChipInput'
import { ALL_SERIES, compsFor, mdeTbl, aeTbl, aeNatSort } from '../types'

interface MdeRow {
  id: number; serie: string; componente: string; ae: string
  bimestre: string | null; grupo: string; descritor: string
}

interface FormData {
  serie: string; comp: string; grupo: string; descritor: string
}

const EMPTY: FormData = { serie: '', comp: '', grupo: '', descritor: '' }
const GRUPOS = ['Grupo 1','Grupo 2','Grupo 3']

export function MatrizPP() {
  const [serie, setSerie]   = useState('6º Ano')
  const [comp,  setComp]    = useState('Matemática')
  const [rows,  setRows]    = useState<MdeRow[]>([])
  const [selAE, setSelAE]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId,    setEditId]    = useState<number | null>(null)
  const [form,      setForm]      = useState<FormData>(EMPTY)
  const [aeChip,    setAeChip]    = useState<string[]>([])
  const [saving,    setSaving]    = useState(false)

  const comps = useMemo(() => serie ? compsFor(serie) : [], [serie])

  const loadData = useCallback(async () => {
    if (!serie) return
    setLoading(true)
    let q = db.from(mdeTbl(serie)).select('*').eq('serie', serie)
    if (comp) q = q.eq('componente', comp)
    const { data, error } = await q
    if (error) toast('Erro ao carregar.', 'err')
    else setRows(data || [])
    setLoading(false)
  }, [serie, comp])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { setSelAE('') }, [serie, comp])

  const aes = useMemo(() => {
    return [...new Set(rows.map(r => r.ae))].sort(aeNatSort)
  }, [rows])

  const effectiveAE = selAE && aes.includes(selAE) ? selAE : (aes[0] || '')

  const filteredRows = useMemo(() =>
    rows
      .filter(r => r.ae === effectiveAE)
      .sort((a, b) => a.grupo.localeCompare(b.grupo)),
    [rows, effectiveAE]
  )

  async function validateAE(ae: string): Promise<boolean> {
    if (!form.serie || !form.comp) { toast('Selecione série e componente antes de adicionar AE.', 'err'); return false }
    const { data } = await db.from(aeTbl(form.serie))
      .select('id').eq('serie', form.serie).eq('componente', form.comp).eq('ae', ae).maybeSingle()
    return !!data
  }

  function openNew() {
    setEditId(null); setForm({ ...EMPTY, serie, comp }); setAeChip([]); setShowModal(true)
  }

  function openEdit(row: MdeRow) {
    setEditId(row.id)
    setForm({ serie: row.serie, comp: row.componente, grupo: row.grupo, descritor: row.descritor })
    setAeChip(row.ae ? [row.ae] : [])
    setShowModal(true)
  }

  async function deleteRow(row: MdeRow) {
    if (!confirm(`Excluir descritor: "${row.descritor.substring(0,50)}…"?`)) return
    try {
      await apiFetch(`/api/matriz/${row.id}`, { method: 'DELETE' })
      toast('Descritor excluído.')
      loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir.', 'err')
    }
  }

  async function save() {
    const { serie: s, comp: c, grupo, descritor } = form
    if (!s || !c || !grupo || !descritor) { toast('Preencha os campos obrigatórios (*).', 'err'); return }
    if (aeChip.length === 0) { toast('Selecione uma AE (*).', 'err'); return }

    const body = {
      serie: s, componente: c, ae: aeChip[0],
      grupo, descritor,
    }
    setSaving(true)
    try {
      if (editId) {
        await apiFetch(`/api/matriz/${editId}`, { method: 'PATCH', body: JSON.stringify(body) })
        toast('Descritor atualizado.')
      } else {
        await apiFetch('/api/matriz', { method: 'POST', body: JSON.stringify(body) })
        toast('Descritor criado.')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar.', 'err')
    }
    setSaving(false)
  }

  function set(f: keyof FormData, v: string) { setForm(p => ({ ...p, [f]: v })) }
  function handleFormSerie(v: string) { set('serie', v); set('comp', ''); setAeChip([]) }
  function handleFormComp(v: string)  { set('comp', v); setAeChip([]) }

  return (
    <>
      <div className="cms-filtros">
        <div className="c-filtro-group">
          <label>Série *</label>
          <select value={serie} onChange={e => { const s = e.target.value; setSerie(s); setComp(c => compsFor(s).includes(c) ? c : (compsFor(s)[0] || '')) }}>
            {ALL_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="c-filtro-group">
          <label>Componente</label>
          <select value={comp} onChange={e => setComp(e.target.value)} disabled={!serie}>
            {comps.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {serie && <button className="c-btn c-btn-primary" style={{ alignSelf: 'flex-end' }} onClick={openNew}>+ Novo Descritor</button>}
      </div>

      <div className="cms-content">
        {!serie ? (
          <div className="c-placeholder"><div className="icon">📝</div><h2>Selecione uma série</h2></div>
        ) : (
          <>
            {aes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="c-section-h">Aprendizagens Essenciais</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
                  {aes.map(ae => {
                    const cnt = rows.filter(r => r.ae === ae).length
                    return (
                      <div key={ae} className={`c-hab-box${effectiveAE === ae ? ' selected' : ''}`}
                        onClick={() => setSelAE(ae)}>
                        <span className="c-hab-code">{ae}</span>
                        <span className="c-hab-box-meta">{cnt} descritor{cnt !== 1 ? 'es' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="cms-status">{loading ? 'Carregando...' : `${filteredRows.length} descritor(es)`}</div>
            <div className="cms-table-wrap">
              <table className="cms-table">
                <thead><tr>
                  <th style={{ width: 60 }}>AE</th>
                  <th style={{ width: 90 }}>Grupo</th>
                  <th>Descritor</th>
                  <th style={{ width: 72 }}></th>
                </tr></thead>
                <tbody>
                  {filteredRows.map(row => (
                    <tr key={row.id}>
                      <td><span className="c-ae-badge">{row.ae}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.grupo}</td>
                      <td style={{ maxWidth: 300, fontSize: '.82rem' }}>{row.descritor}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="c-btn-icon" onClick={() => openEdit(row)}>✏️</button>
                        <button className="c-btn-icon danger" onClick={() => deleteRow(row)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>{editId ? 'Editar Descritor' : 'Novo Descritor'}</span>
              <button className="c-btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Série *</label>
                <select className="form-select" value={form.serie} onChange={e => handleFormSerie(e.target.value)}>
                  {ALL_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Componente *</label>
                <select className="form-select" value={form.comp} onChange={e => handleFormComp(e.target.value)} disabled={!form.serie}>
                  {compsFor(form.serie).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Grupo *</label>
                <select className="form-select" value={form.grupo} onChange={e => set('grupo', e.target.value)}>
                  {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">AE * (máx. 1, validado vs AEs da série/componente)</label>
              <ChipInput
                value={aeChip} onChange={v => setAeChip(v.slice(-1))}
                max={1} validate={validateAE}
                placeholder="Ex: AE1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Descritor *</label>
              <textarea className="form-textarea" value={form.descritor}
                onChange={e => set('descritor', e.target.value)} rows={3} />
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
