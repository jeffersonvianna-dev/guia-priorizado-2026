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

const SERIES_FOR_SEG: Record<string, string[]> = {
  EFAI: ['1º Ano','2º Ano','3º Ano','4º Ano','5º Ano'],
  EFAF: ['6º Ano','7º Ano','8º Ano','9º Ano'],
  EM:   ['1ª Série','2ª Série','3ª Série'],
}

const PREFIX_SERIE: Record<string, string> = {
  EF01: '1º Ano', EF02: '2º Ano', EF03: '3º Ano', EF04: '4º Ano', EF05: '5º Ano',
  EF06: '6º Ano', EF07: '7º Ano', EF08: '8º Ano', EF09: '9º Ano',
  EF15: '1º Ano 2º Ano 3º Ano 4º Ano 5º Ano',
  EF35: '3º Ano 4º Ano 5º Ano',
  EF67: '6º Ano 7º Ano',
  EF69: '6º Ano 7º Ano 8º Ano 9º Ano',
  EF89: '8º Ano 9º Ano',
  EM13: '1ª Série 2ª Série 3ª Série',
}

// "6º Ano 7º Ano" → ["6º Ano", "7º Ano"]
function parseSeries(s: string): string[] {
  const words = (s || '').trim().split(/\s+/)
  const result: string[] = []
  for (let i = 0; i + 1 < words.length; i += 2) result.push(words[i] + ' ' + words[i + 1])
  return result
}

function buildSerie(selected: Set<string>, seg: string): string {
  return (SERIES_FOR_SEG[seg] || []).filter(s => selected.has(s)).join(' ')
}

export function CurriculoPaulista() {
  const [seg,         setSeg]         = useState('EFAF')
  const [comp,        setComp]        = useState('Matemática')
  const [serieFilter, setSerieFilter] = useState('')
  const [rows,        setRows]        = useState<CPRow[]>([])
  const [compsAvailable, setCompsAvailable] = useState<string[]>([])
  const [loading,   setLoading]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editId,    setEditId]    = useState<number | null>(null)
  const [oldCod,    setOldCod]    = useState('')
  const [form,      setForm]      = useState({ id_habilidade: '', componente: '', serie: '', texto: '' })
  const [saving,    setSaving]    = useState(false)

  // Segmento detectado do código no form
  const formSeg = segFromCod(form.id_habilidade) || seg

  // Séries selecionadas no form (Set)
  const selectedSeries = new Set(parseSeries(form.serie))

  function toggleSerie(s: string) {
    setForm(p => {
      const cur = new Set(parseSeries(p.serie))
      cur.has(s) ? cur.delete(s) : cur.add(s)
      return { ...p, serie: buildSerie(cur, formSeg) }
    })
  }

  const loadComps = useCallback(async () => {
    let q = db.from('curriculo_paulista').select('componente')
    if (seg) q = q.eq('segmento', seg)
    const { data } = await q
    const uniq = [...new Set((data || []).map((r: { componente: string }) => r.componente))].sort()
    setCompsAvailable(uniq)
  }, [seg])

  const loadData = useCallback(async () => {
    setLoading(true)
    let q = db.from('curriculo_paulista').select('*').order('componente').order('id_habilidade')
    if (seg)         q = q.eq('segmento', seg)
    if (comp)        q = q.eq('componente', comp)
    if (serieFilter) q = q.ilike('serie', `%${serieFilter}%`)
    const { data, error } = await q
    if (error) toast('Erro ao carregar.', 'err')
    else setRows(data || [])
    setLoading(false)
  }, [seg, comp, serieFilter])

  useEffect(() => { loadComps() }, [loadComps])
  useEffect(() => { loadData()  }, [loadData])
  useEffect(() => { setComp(''); setSerieFilter('') }, [seg])
  useEffect(() => { setComp(prev => prev || compsAvailable[0] || '') }, [compsAvailable])

  // Auto-preencher série quando o código muda
  useEffect(() => {
    const pfx = form.id_habilidade.slice(0, 4)
    if (PREFIX_SERIE[pfx]) setForm(p => ({ ...p, serie: PREFIX_SERIE[pfx] }))
  }, [form.id_habilidade])

  function openNew() {
    setEditId(null); setOldCod('')
    setForm({ id_habilidade: '', componente: comp || compsAvailable[0] || '', serie: '', texto: '' })
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

    setSaving(true)
    try {
      const body = { id_habilidade: cod, componente, serie, texto, segmento }
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
            {compsAvailable.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="c-filtro-group">
          <label>Série</label>
          <select value={serieFilter} onChange={e => setSerieFilter(e.target.value)} disabled={!seg}>
            <option value="">Todas</option>
            {(SERIES_FOR_SEG[seg] || []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="c-btn c-btn-primary" style={{ alignSelf: 'flex-end' }} onClick={openNew}>+ Nova Habilidade</button>
      </div>

      <div className="cms-content">
        <div className="cms-status">{loading ? 'Carregando...' : `${rows.length} habilidade(s)`}</div>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead><tr>
              <th style={{ width: 130 }}>Código</th>
              <th style={{ width: 80 }}>Segmento</th>
              <th style={{ width: 130 }}>Componente</th>
              <th style={{ width: 160 }}>Série</th>
              <th>Título</th>
              <th style={{ width: 72 }}></th>
            </tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td><code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.id_habilidade}</code></td>
                  <td>{row.segmento}</td>
                  <td>{row.componente}</td>
                  <td>
                    <div className="flex-chips" style={{ gap: 4 }}>
                      {parseSeries(row.serie).map(s => (
                        <span key={s} className="c-hab-chip" style={{ fontSize: '.72rem', padding: '2px 6px' }}>{s}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '.82rem' }}>{row.texto?.substring(0, 100)}{row.texto?.length > 100 ? '…' : ''}</td>
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
                <label className="form-label">Código da Habilidade * (ex: EF06MA01)</label>
                <input className="form-input" style={{ fontFamily: 'monospace' }}
                  value={form.id_habilidade}
                  onChange={e => set('id_habilidade', e.target.value.toUpperCase())}
                  placeholder="EF06MA01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Componente *</label>
                <select className="form-select" value={form.componente} onChange={e => set('componente', e.target.value)}>
                  {compsAvailable.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Séries</label>
              <div className="flex-chips" style={{ gap: 6, padding: '8px 0' }}>
                {(SERIES_FOR_SEG[formSeg] || []).map(s => (
                  <span
                    key={s}
                    className="c-hab-chip"
                    style={{
                      cursor: 'pointer', padding: '5px 10px', fontSize: '.8rem',
                      background: selectedSeries.has(s) ? 'var(--blue)' : 'var(--blue-pale)',
                      color: selectedSeries.has(s) ? '#fff' : 'var(--blue)',
                      transition: 'all .15s',
                    }}
                    onClick={() => toggleSerie(s)}
                  >
                    {s}
                  </span>
                ))}
              </div>
              {form.id_habilidade.length >= 4 && (
                <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Segmento detectado: <strong>{formSeg}</strong>
                  {PREFIX_SERIE[form.id_habilidade.slice(0,4)] && ' · série preenchida automaticamente pelo código'}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Texto da Habilidade *</label>
              <textarea className="form-textarea" rows={4} value={form.texto}
                onChange={e => set('texto', e.target.value)} />
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
