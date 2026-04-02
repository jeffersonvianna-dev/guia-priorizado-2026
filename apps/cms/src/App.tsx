import { useState, useEffect } from 'react'
import { EscopoSequencia }    from './modules/EscopoSequencia'
import { AprendizagemEssencial } from './modules/AprendizagemEssencial'
import { MatrizPP }           from './modules/MatrizPP'
import { CurriculoPaulista }  from './modules/CurriculoPaulista'

type ModuleId = 'escopo' | 'ae' | 'matriz' | 'cp'

const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'escopo', label: '📅 Escopo-Sequência' },
  { id: 'ae',     label: '🎯 Aprendizagem Essencial' },
  { id: 'matriz', label: '📝 Matriz Prova Paulista' },
  { id: 'cp',     label: '📚 Currículo Paulista' },
]

const VALID_MODS: ModuleId[] = ['escopo','ae','matriz','cp']

function hashToMod(hash: string): ModuleId {
  const id = hash.replace('#','') as ModuleId
  return VALID_MODS.includes(id) ? id : 'escopo'
}

export default function App() {
  const [active, setActive] = useState<ModuleId>(() => hashToMod(window.location.hash))

  function showModule(id: ModuleId) {
    setActive(id)
    history.replaceState(null, '', '#' + id)
  }

  // Restaurar hash no F5
  useEffect(() => {
    const mod = hashToMod(window.location.hash)
    if (mod !== active) setActive(mod)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
