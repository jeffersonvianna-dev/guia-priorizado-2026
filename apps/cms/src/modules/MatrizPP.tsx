import { useState, useEffect, useMemo, useCallback } from 'react'
import { db } from '../supabase'
import { toast } from '../utils/toast'
import { ChipInput } from '../components/ChipInput'
import { ALL_SERIES, BIM_OPTIONS, compsFor, mdeTbl, aeTbl, aeNatSort } from '../types'

interface MdeRow {
  id: number; serie: string; componente: string; ae: string
  bimestre: string | null; grupo: string; descritor: string
}

interface FormData {
  serie: string; comp: string; bim: string; grupo: string; descritor: string
}

const EMPTY: FormData = { serie: '', comp: '', bim: '', grupo: '', descritor: '' }
const GRUPOS = ['Grupo 1','Grupo 2','Grupo 3']

export function MatrizPP() {
  const [serie, setSerie]   = useState('')
  const [comp,  setComp]    = useState('')
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
    let q = db.from(mdeTbl(serie)).select('*')
    if (comp) q = q.eq('componente', comp)
    const { data, error } = await q
    if (error) toast('Erro ao carregar.', 'err')
    else setRows(data || [])
    setLoading(false)
  }, [serie, comp])

  useEffect(() => { loadData() }, [loadData])

  // Quando série ou comp mudam, resetar AE selecionada
  useEffect(() => { setSelAE('') }, [serie, comp])

  const aes = useMemo(() => {
    return [...new Set(rows.map(r => r.ae))].sort(aeNatSort)
  }, [rows])

  const effectiveAE = selAE && aes.includes(selAE) ? selAE : (aes[0] || '')

  const filteredRows = useMemo(() =>
    rows.filter(r => r.ae === effectiveAE),
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
    setForm({ serie: row.serie, comp: row.componente, bim: row.bimestre || '', grupo: row.grupo, descritor: row.descritor })
    setAeChip(row.ae ? [row.ae] : [])
    setShowModal(true)
  }

  async function deleteRow(row: MdeRow) {
    if (!confirm(`Excluir descritor: "${row.descritor.substring(0,50)}…"?`)) return
    const { error } = await db.from(mdeTbl(serie)).delete().eq('id', row.id)
    if (error) toast('Erro ao excluir.', 'err')
    else { toast('Descritor excluído.'); loadData() }
  }

  async function save() {
    const { serie: s, comp: c, bim, grupo, descritor } = form
    if (!s || !c || !grupo || !descritor) { toast('Preencha os campos obrigatórios (*).', 'err'); return }
    if (aeChip.length === 0) { toast('Selecione uma AE (*).', 'err'); return }

    const row = {
      serie: s, componente: c, ae: aeChip[0],
      bimestre: bim || null, grupo, descritor,
    }
    setSaving(true)
    if (editId) {
      const { error } = await db.from(mdeTbl(s)).update(row).eq('id', editId)
      if (error) toast('Erro ao atualizar.', 'err')
      else { toast('Descritor atualizado.'); setShowModal(false); loadData() }
    } else {
      const { error } = await db.from(mdeTbl(s)).insert(row)
      if (error) toast('Erro ao criar.', 'err')
      else { toast('Descritor criado.'); setShowModal(false); loadData() }
    }
    setSaving(false)
  }

  function set(f: keyof FormData, v: string) { setForm(p => ({ ...p, [f]: v })) }

  // Ao mudar série ou comp no formulário, resetar chip de AE
  function handleFormSerie(v: string) { set('serie', v); set('comp', ''); setAeChip([]) }
  function handleFormComp(v: string)  { set('comp', v); setAeChip([]) }

  return (
    <>
      <div className="cms-filtros">
        <div className="c-filtro-group">
          <label>Série *</label>
          <select value={serie} onChange={e => { setSerie(e.target.value); setComp('') }}>
            <option value="">Selecione...</option>
            {ALL_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="c-filtro-group">
          <label>Componente</label>
          <select value={comp} onChange={e => setComp(e.target.value)} disabled={!serie}>
            <option value="">Todos</option>
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
            {/* Grid de AEs */}
            {aes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="c-section-h">Aprendizagens Essenciais</div>
                <div className="hab-grid">
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
                <thead><tr><th>AE</th><th>Bim.</th><th>Grupo</th><th>Descritor</th><th></th></tr></thead>
                <tbody>
                  {filteredRows.map(row => (
                    <tr key={row.id}>
                      <td><span className="c-ae-badge">{row.ae}</span></td>
                      <td>{row.bimestre || '—'}</td>
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
                  <option value="">Selecione...</option>
                  {ALL_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Componente *</label>
                <select className="form-select" value={form.comp} onChange={e => handleFormComp(e.target.value)} disabled={!form.serie}>
                  <option value="">Selecione...</option>
                  {compsFor(form.serie).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bimestre</label>
                <select className="form-select" value={form.bim} onChange={e => set('bim', e.target.value)}>
                  <option value="">Sem bimestre</option>
                  {BIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Grupo *</label>
                <select className="form-select" value={form.grupo} onChange={e => set('grupo', e.target.value)}>
                  <option value="">Selecione...</option>
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
