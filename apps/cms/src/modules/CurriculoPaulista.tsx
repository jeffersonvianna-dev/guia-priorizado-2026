import { useState, useEffect, useCallback } from 'react'
import { db } from '../supabase'
import { toast } from '../utils/toast'
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
      // Atualizar lista de componentes disponíveis para o segmento
      const uniq = [...new Set((data || []).map((r: CPRow) => r.componente))].sort()
      setCompsAvailable(uniq)
    }
    setLoading(false)
  }, [seg, comp])

  useEffect(() => { loadData() }, [loadData])
  // Ao mudar segmento, resetar componente
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
    // Contar vínculos
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

    if (total > 0) {
      await Promise.all([
        removeCodFromField('escopo_af', 'habilidades', row.id_habilidade),
        removeCodFromField('escopo_em', 'habilidades', row.id_habilidade),
        removeCodFromField('ae_detalhes_af', 'hab_priorizada', row.id_habilidade),
        removeCodFromField('ae_detalhes_af', 'hab_relacionadas', row.id_habilidade),
        removeCodFromField('ae_detalhes_af', 'conhecimentos_previos', row.id_habilidade),
        removeCodFromField('ae_detalhes_em', 'hab_priorizada', row.id_habilidade),
        removeCodFromField('ae_detalhes_em', 'hab_relacionadas', row.id_habilidade),
        removeCodFromField('ae_detalhes_em', 'conhecimentos_previos', row.id_habilidade),
      ])
    }
    await db.from('curriculo_paulista').delete().eq('id', row.id)
    toast('Habilidade excluída.')
    loadData()
  }

  async function removeCodFromField(table: string, field: string, cod: string) {
    const { data } = await db.from(table).select(`id,${field}`).ilike(field, `%${cod}%`)
    for (const r of data || []) {
      const updated = ((r[field] as string) || '')
        .split(/\s+/).filter((h: string) => h !== cod).join(' ').trim() || null
      await db.from(table).update({ [field]: updated }).eq('id', r.id)
    }
  }

  async function renameCodInField(table: string, field: string, oldC: string, newC: string) {
    const { data } = await db.from(table).select(`id,${field}`).ilike(field, `%${oldC}%`)
    for (const r of data || []) {
      const updated = ((r[field] as string) || '')
        .split(/\s+/).map((h: string) => h === oldC ? newC : h).join(' ').trim() || null
      await db.from(table).update({ [field]: updated }).eq('id', r.id)
    }
  }

  async function save() {
    const { id_habilidade: cod, componente, serie, texto } = form
    if (!cod || !componente || !texto) { toast('Preencha os campos obrigatórios (*).', 'err'); return }
    const segmento = segFromCod(cod)
    if (!segmento) { toast('Código inválido. Use EF01-09 ou EM.', 'err'); return }

    // Verificar unicidade do código
    if (!editId || cod !== oldCod) {
      const { data: dup } = await db.from('curriculo_paulista').select('id').eq('id_habilidade', cod)
      if (dup && dup.length > 0 && editId !== dup[0].id) {
        toast(`Código ${cod} já existe.`, 'err'); return
      }
    }

    setSaving(true)
    const row = { id_habilidade: cod, componente, serie, segmento, texto }

    if (editId) {
      // Cascade rename se o código mudou
      if (cod !== oldCod) {
        await Promise.all([
          renameCodInField('escopo_af', 'habilidades', oldCod, cod),
          renameCodInField('escopo_em', 'habilidades', oldCod, cod),
          renameCodInField('ae_detalhes_af', 'hab_priorizada', oldCod, cod),
          renameCodInField('ae_detalhes_af', 'hab_relacionadas', oldCod, cod),
          renameCodInField('ae_detalhes_af', 'conhecimentos_previos', oldCod, cod),
          renameCodInField('ae_detalhes_em', 'hab_priorizada', oldCod, cod),
          renameCodInField('ae_detalhes_em', 'hab_relacionadas', oldCod, cod),
          renameCodInField('ae_detalhes_em', 'conhecimentos_previos', oldCod, cod),
        ])
      }
      const { error } = await db.from('curriculo_paulista').update(row).eq('id', editId)
      if (error) toast('Erro ao atualizar.', 'err')
      else { toast('Habilidade atualizada.'); setShowModal(false); loadData() }
    } else {
      const { error } = await db.from('curriculo_paulista').insert(row)
      if (error) toast('Erro ao criar.', 'err')
      else { toast('Habilidade criada.'); setShowModal(false); loadData() }
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
