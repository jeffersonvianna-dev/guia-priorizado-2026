import { useState, useEffect, useCallback } from 'react'
import { db } from '../supabase'
import { toast } from '../utils/toast'
import { apiFetch } from '../utils/api'
import { segFromCod } from '../types'

interface CPRow {
  id: number; id_habilidade: string; componente: string
  serie: string; segmento: string; texto: string
}

const SEGS = ['EFAI','EFAF','EM'] as const

export function CurriculoPaulista() {
  const [seg,  setSeg]  = useState('')
  const [comp, setComp] = useState('')
  const [rows, setRows] = useState<CPRow[]>([])
  const [compsAvailable, setCompsAvailable] = useState<string[]>([])
  const [loading,   setLoading]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId,    setEditId]    = useState<number | null>(null)
  const [oldCod,    setOldCod]    = useState('')
  const [form, setForm] = useState({ id_habilidade: '', componente: '', serie: '', texto: '' })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    let q = db.from('curriculo_paulista').select('*').order('componente').order('id_habilidade')
    if (seg)  q = q.eq('segmento', seg)
    if (comp) q = q.eq('componente', comp)
    const { data, error } = await q
    if (error) toast('Erro ao carregar.', 'err')
    else {
      setRows(data || [])
      const uniq = [...new Set((data || []).map((r: CPRow) => r.componente))].sort()
      setCompsAvailable(uniq)
    }
    setLoading(false)
  }, [seg, comp])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { setComp('') }, [seg])

  function openNew() {
    setEditId(null); setOldCod('')
    setForm({ id_habilidade: '', componente: '', serie: '', texto: '' })
    setShowModal(true)
  }

  function openEdit(row: CPRow) {
    setEditId(row.id); setOldCod(row.id_habilidade)
    setForm({ id_habilidade: row.id_habilidade, componente: row.componente, serie: row.serie, texto: row.texto })
    setShowModal(true)
  }

  async function deleteRow(row: CPRow) {
    const pat = `%${row.id_habilidade}%`
    const counts = await Promise.all([
      db.from('escopo_af').select('id', { count: 'exact', head: true }).ilike('habilidades', pat),
      db.from('escopo_em').select('id', { count: 'exact', head: true }).ilike('habilidades', pat),
      db.from('ae_detalhes_af').select('id', { count: 'exact', head: true }).ilike('hab_priorizada', pat),
      db.from('ae_detalhes_af').select('id', { count: 'exact', head: true }).ilike('hab_relacionadas', pat),
      db.from('ae_detalhes_af').select('id', { count: 'exact', head: true }).ilike('conhecimentos_previos', pat),
      db.from('ae_detalhes_em').select('id', { count: 'exact', head: true }).ilike('hab_priorizada', pat),
      db.from('ae_detalhes_em').select('id', { count: 'exact', head: true }).ilike('hab_relacionadas', pat),
      db.from('ae_detalhes_em').select('id', { count: 'exact', head: true }).ilike('conhecimentos_previos', pat),
    ])
    const total = counts.reduce((s, r) => s + (r.count || 0), 0)
    const msg = total > 0
      ? `${row.id_habilidade} está vinculada a ${total} registro(s). Deseja removê-la de todos e excluir?`
      : `Excluir ${row.id_habilidade}?`
    if (!confirm(msg)) return

    try {
      await apiFetch(`/api/curriculo/${row.id}`, { method: 'DELETE' })
      toast('Habilidade excluída.')
      loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir.', 'err')
    }
  }

  async function save() {
    const { id_habilidade: cod, componente, serie, texto } = form
    if (!cod || !componente || !texto) { toast('Preencha os campos obrigatórios (*).', 'err'); return }
    const segmento = segFromCod(cod)
    if (!segmento) { toast('Código inválido. Use EF01-09 ou EM.', 'err'); return }

    if (!editId || cod !== oldCod) {
      const { data: dup } = await db.from('curriculo_paulista').select('id').eq('id_habilidade', cod)
      if (dup && dup.length > 0 && editId !== dup[0].id) {
        toast(`Código ${cod} já existe.`, 'err'); return
      }
    }

    const body = { id_habilidade: cod, componente, serie, texto }

    setSaving(true)
    try {
      if (editId) {
        await apiFetch(`/api/curriculo/${editId}`, { method: 'PATCH', body: JSON.stringify(body) })
        toast('Habilidade atualizada.')
      } else {
        await apiFetch('/api/curriculo', { method: 'POST', body: JSON.stringify(body) })
        toast('Habilidade criada.')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar.', 'err')
    }
    setSaving(false)
  }

  function set(f: keyof typeof form, v: string) { setForm(p => ({ ...p, [f]: v })) }

  return (
    <>
      <div className="cms-filtros">
        <div className="c-filtro-group">
          <label>Segmento</label>
          <select value={seg} onChange={e => setSeg(e.target.value)}>
            <option value="">Todos</option>
            {SEGS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="c-filtro-group">
          <label>Componente</label>
          <select value={comp} onChange={e => setComp(e.target.value)}>
            <option value="">Todos</option>
            {compsAvailable.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="c-btn c-btn-primary" style={{ alignSelf: 'flex-end' }} onClick={openNew}>+ Nova Habilidade</button>
      </div>

      <div className="cms-content">
        <div className="cms-status">{loading ? 'Carregando...' : `${rows.length} habilidade(s)`}</div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead><tr><th>Código</th><th>Segmento</th><th>Componente</th><th>Série</th><th>Texto</th><th></th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td><code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.id_habilidade}</code></td>
                  <td>{row.segmento}</td>
                  <td>{row.componente}</td>
                  <td>{row.serie}</td>
                  <td style={{ maxWidth: 300, fontSize: '.82rem' }}>{row.texto?.substring(0, 80)}{row.texto?.length > 80 ? '…' : ''}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="c-btn-icon" onClick={() => openEdit(row)}>✏️</button>
                    <button className="c-btn-icon danger" onClick={() => deleteRow(row)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>{editId ? 'Editar Habilidade' : 'Nova Habilidade'}</span>
              <button className="c-btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Código BNCC * (ex: EF06MA01)</label>
                <input className="form-input" style={{ fontFamily: 'monospace' }}
                  value={form.id_habilidade}
                  onChange={e => set('id_habilidade', e.target.value.toUpperCase())}
                  placeholder="EF06MA01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Componente *</label>
                <input className="form-input" value={form.componente}
                  onChange={e => set('componente', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Série</label>
                <input className="form-input" value={form.serie}
                  onChange={e => set('serie', e.target.value)}
                  placeholder="ex: 6º Ano" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Texto da Habilidade *</label>
              <textarea className="form-textarea" rows={4} value={form.texto}
                onChange={e => set('texto', e.target.value)} />
            </div>
            {form.id_habilidade && (
              <p style={{ fontSize: '.76rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                Segmento detectado: <strong>{segFromCod(form.id_habilidade) || 'inválido'}</strong>
              </p>
            )}

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
