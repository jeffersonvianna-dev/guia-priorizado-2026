import { useState, useEffect } from 'react'
import { EscopoSequencia }    from './modules/EscopoSequencia'
import { AprendizagemEssencial } from './modules/AprendizagemEssencial'
import { MatrizPP }           from './modules/MatrizPP'
import { CurriculoPaulista }  from './modules/CurriculoPaulista'
import { apiFetch }           from './utils/api'
import { toast }              from './utils/toast'

type ModuleId = 'escopo' | 'ae' | 'matriz' | 'cp'

const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'escopo', label: '📅 Escopo-Sequência' },
  { id: 'ae',     label: '🎯 Aprendizagem Essencial' },
  { id: 'matriz', label: '📝 Matriz Prova Paulista' },
  { id: 'cp',     label: '📚 Currículo Paulista' },
]

const VALID_MODS: ModuleId[] = ['escopo', 'ae', 'matriz', 'cp']

function hashToMod(hash: string): ModuleId {
  const id = hash.replace('#', '') as ModuleId
  return VALID_MODS.includes(id) ? id : 'escopo'
}

export default function App() {
  const [active,   setActive]   = useState<ModuleId>(() => hashToMod(window.location.hash))
  const [authed,   setAuthed]   = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [logging,  setLogging]  = useState(false)

  useEffect(() => {
    apiFetch('/api/auth')
      .then((d: { authenticated: boolean }) => setAuthed(d.authenticated))
      .catch(() => setAuthed(false))
  }, [])

  // Restaurar hash no F5
  useEffect(() => {
    const mod = hashToMod(window.location.hash)
    if (mod !== active) setActive(mod)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showModule(id: ModuleId) {
    setActive(id)
    history.replaceState(null, '', '#' + id)
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true)
    try {
      await apiFetch('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'login', password }),
      })
      setAuthed(true)
      setPassword('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Senha inválida.', 'err')
    }
    setLogging(false)
  }

  async function logout() {
    await apiFetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => {})
    setAuthed(false)
  }

  if (authed === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Verificando sessão…
      </div>
    )
  }

  if (!authed) {
    return (
      <>
        <div id="toast-root" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 280 }}>
            <h2 style={{ margin: 0 }}>CMS — Guia Priorizado 2026</h2>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <button className="c-btn c-btn-primary" type="submit" disabled={logging || !password}>
              {logging ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Toast container */}
      <div id="toast-root" />

      {/* Header */}
      <header className="cms-header">
        <div className="cms-header-inner">
          <div className="cms-logo">GP</div>
          <div>
            <h1>CMS — Guia Priorizado 2026</h1>
            <p>Painel de edição de conteúdo</p>
          </div>
          <button className="c-btn c-btn-ghost" style={{ marginLeft: 'auto' }} onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      {/* Module tabs */}
      <div className="mod-tabs">
        {MODULES.map(m => (
          <button
            key={m.id}
            className={`mod-tab${active === m.id ? ' active' : ''}`}
            onClick={() => showModule(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Active module */}
      {active === 'escopo' && <EscopoSequencia />}
      {active === 'ae'     && <AprendizagemEssencial />}
      {active === 'matriz' && <MatrizPP />}
      {active === 'cp'     && <CurriculoPaulista />}
    </>
  )
}
