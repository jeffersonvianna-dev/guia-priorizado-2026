import { useState, useEffect, useMemo, useCallback } from 'react'
import { db } from '../supabase'
import { toast } from '../utils/toast'
import { ChipInput } from '../components/ChipInput'
import { ALL_SERIES, BIM_OPTIONS, compsFor, aeTbl, segFor, aeNatSort } from '../types'

interface AERow {
  id: number; segmento: string; serie: string; componente: string
  bimestre: string | null; ae: string; titulo: string
  hab_priorizada: string; hab_relacionadas: string | null; conhecimentos_previos: string | null
}

interface FormData {
  serie: string; comp: string; bim: string; ae: string; titulo: string
}

const EMPTY: FormData = { serie: '', comp: '', bim: '', ae: '', titulo: '' }

export function AprendizagemEssencial() {
  const [serie, setSerie] = useState('')
  const [comp,  setComp]  = useState('')
  const [bim,   setBim]   = useState('')
  const [rows,  setRows]  = useState<AERow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [showModal,setShowModal]= useState(false)
  const [editId,   setEditId]   = useState<number | null>(null)
  const [form,     setForm]     = useState<FormData>(EMPTY)
  const [hp, setHp] = useState<string[]>([])
  const [hr, setHr] = useState<string[]>([])
  const [cp, setCp] = useState<string[]>([])
  const [saving,   setSaving]   = useState(false)

  const comps = useMemo(() => serie ? compsFor(serie) : [], [serie])

  const loadData = useCallback(async () => {
    if (!serie) return
    setLoading(true)
    let q = db.from(aeTbl(serie)).select('*').order('ae')
    if (comp) q = q.eq('componente', comp)
    if (bim)  q = q.eq('bimestre', bim)
    const { data, error } = await q
    if (error) toast('Erro ao carregar.', 'err')
    else setRows((data || []).sort((a: AERow, b: AERow) => aeNatSort(a.ae, b.ae)))
    setLoading(false)
  }, [serie, comp, bim])

  useEffect(() => { loadData() }, [loadData])

  function openNew() {
    setEditId(null); setForm({ ...EMPTY, serie, comp })
    setHp([]); setHr([]); setCp([]); setShowModal(true)
  }

  function openEdit(row: AERow) {
    setEditId(row.id)
    setForm({ serie: row.serie, comp: row.componente, bim: row.bimestre || '', ae: row.ae, titulo: row.titulo })
    setHp(row.hab_priorizada ? row.hab_priorizada.split(/\s+/).filter(Boolean) : [])
    setHr(row.hab_relacionadas ? row.hab_relacionadas.split(/\s+/).filter(Boolean) : [])
    setCp(row.conhecimentos_previos ? row.conhecimentos_previos.split(/\s+/).filter(Boolean) : [])
    setShowModal(true)
  }

  async function deleteRow(row: AERow) {
    if (!confirm(`Excluir ${row.ae} — ${row.titulo}?`)) return
    const { error } = await db.from(aeTbl(serie)).delete().eq('id', row.id)
    if (error) toast('Erro ao excluir.', 'err')
    else { toast('AE excluída.'); loadData() }
  }

  async function validateHab(h: string): Promise<boolean> {
    const { data } = await db.from('curriculo_paulista').select('id').eq('id_habilidade', h).maybeSingle()
    return !!data
  }

  async function save() {
    const { serie: s, comp: c, bim: b, ae, titulo } = form
    if (!s || !c || !ae || !titulo) { toast('Preencha os campos obrigatórios (*).', 'err'); return }
    if (!/^AE\d+$/.test(ae)) { toast('Código AE inválido. Use AE1, AE2…', 'err'); return }
    if (hp.length === 0) { toast('Habilidade Prioritária obrigatória (*).', 'err'); return }

    const tbl = aeTbl(s)
    // Unicidade de código
    const { data: dupCode } = await db.from(tbl).select('id').eq('serie', s).eq('componente', c).eq('ae', ae)
    if (dupCode && dupCode.length > 0 && editId !== dupCode[0].id) {
      toast(`Código ${ae} já existe para ${s}/${c}.`, 'err'); return
    }
    // Unicidade de título
    const { data: dupTitle } = await db.from(tbl).select('id').eq('serie', s).eq('componente', c).eq('titulo', titulo)
    if (dupTitle && dupTitle.length > 0 && editId !== dupTitle[0].id) {
      toast(`Título já existe para ${s}/${c}.`, 'err'); return
    }

    const row = {
      segmento: segFor(s), serie: s, componente: c, bimestre: b || null,
      ae, titulo,
      hab_priorizada: hp.join(' '),
      hab_relacionadas: hr.length ? hr.join(' ') : null,
      conhecimentos_previos: cp.length ? cp.join(' ') : null,
    }

    setSaving(true)
    if (editId) {
      const { error } = await db.from(tbl).update(row).eq('id', editId)
      if (error) toast('Erro ao atualizar.', 'err')
      else { toast('AE atualizada.'); setShowModal(false); loadData() }
    } else {
      const { error } = await db.from(tbl).insert(row)
      if (error) toast('Erro ao criar.', 'err')
      else { toast('AE criada.'); setShowModal(false); loadData() }
    }
    setSaving(false)
  }

  function set(f: keyof FormData, v: string) { setForm(prev => ({ ...prev, [f]: v })) }

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
        <div className="c-filtro-group">
          <label>Bimestre</label>
          <select value={bim} onChange={e => setBim(e.target.value)} disabled={!serie}>
            <option value="">Todos</option>
            {BIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {serie && (
          <button className="c-btn c-btn-primary" style={{ alignSelf: 'flex-end' }} onClick={openNew}>+ Nova AE</button>
        )}
      </div>

      <div className="cms-content">
        <div className="cms-status">{loading ? 'Carregando...' : `${rows.length} AE(s)`}</div>
        {!serie ? (
          <div className="c-placeholder"><div className="icon">🎯</div><h2>Selecione uma série</h2></div>
        ) : (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead><tr><th>Série</th><th>Comp.</th><th>Bim.</th><th>AE</th><th>Título</th><th>Hab. Prioritária</th><th></th></tr></thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td>{row.serie}</td><td>{row.componente}</td>
                    <td>{row.bimestre || '—'}</td>
                    <td><span className="c-ae-badge">{row.ae}</span></td>
                    <td style={{ maxWidth: 200 }}>{row.titulo}</td>
                    <td><span className="c-hab-chip">{row.hab_priorizada}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="c-btn-icon" onClick={() => openEdit(row)}>✏️</button>
                      <button className="c-btn-icon danger" onClick={() => deleteRow(row)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>{editId ? 'Editar AE' : 'Nova AE'}</span>
              <button className="c-btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Série *</label>
                <select className="form-select" value={form.serie}
                  onChange={e => { set('serie', e.target.value); set('comp', '') }}>
                  <option value="">Selecione...</option>
                  {ALL_SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Componente *</label>
                <select className="form-select" value={form.comp} onChange={e => set('comp', e.target.value)} disabled={!form.serie}>
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
                <label className="form-label">Código AE * (ex: AE1)</label>
                <input className="form-input" value={form.ae} onChange={e => set('ae', e.target.value.toUpperCase())} placeholder="AE1" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Título *</label>
              <input className="form-input" value={form.titulo} onChange={e => set('titulo', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Habilidade Prioritária * (máx. 1)</label>
              <ChipInput value={hp} onChange={setHp} max={1} validate={validateHab} />
            </div>
            <div className="form-group">
              <label className="form-label">Habilidades Relacionadas</label>
              <ChipInput value={hr} onChange={setHr} validate={validateHab} />
            </div>
            <div className="form-group">
              <label className="form-label">Conhecimentos Prévios</label>
              <ChipInput value={cp} onChange={setCp} validate={validateHab} />
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
