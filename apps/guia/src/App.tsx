import { useRef, useState } from 'react'
import { useGuiaData } from './hooks/useGuiaData'
import { useNavigation, type TabId } from './hooks/useNavigation'
import { Header } from './components/Header'
import { ParaComecar } from './tabs/ParaComecar'
import { AprendizagemEssencial } from './tabs/AprendizagemEssencial'
import { EscopoSequencia } from './tabs/EscopoSequencia'
import { Habilidades } from './tabs/Habilidades'
import { MatrizPP } from './tabs/MatrizPP'

const TABS: { id: TabId; label: string }[] = [
  { id: 'comecar',     label: 'Para Começar' },
  { id: 'ae',         label: 'Aprendizagem Essencial' },
  { id: 'escopo',     label: 'Escopo-Sequência' },
  { id: 'habilidades',label: 'Habilidades' },
  { id: 'matriz',     label: 'Matriz Prova Paulista' },
]

export default function App() {
  const data = useGuiaData()
  const { activeTab, goToTab, updateFilters, filtersPerTab } = useNavigation()

  // Estado de cross-tab: hab a selecionar quando chegar em Habilidades
  const [targetHab,  setTargetHab]  = useState('')
  const [scrollAula, setScrollAula] = useState<number | null>(null)
  const scrollAulaTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  /* ── Cross-tab navigation ──────────────────────────────────── */

  function goToHab(serie: string, comp: string, hab: string) {
    setTargetHab(hab)
    goToTab('habilidades', { serie, comp, bim: '' })
  }

  function goToAula(serie: string, comp: string, bim: string, aula: number) {
    clearTimeout(scrollAulaTimer.current)
    setScrollAula(null)
    goToTab('escopo', { serie, comp, bim })
    // Após render, scroll para a aula
    scrollAulaTimer.current = setTimeout(() => {
      setScrollAula(aula)
      setTimeout(() => setScrollAula(null), 500)
    }, 80)
  }

  function goToAE(serie: string, comp: string, ae: string) {
    goToTab('ae', { serie, comp, bim: '' })
    // Abrir o card de AE correspondente após render
    setTimeout(() => {
      const el = document.getElementById(`ae-card-${ae}`)
      if (el) { el.classList.add('open'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
    }, 80)
  }

  /* ── Render ────────────────────────────────────────────────── */

  if (data.loading) {
    return (
      <>
        <Header />
        <div className="spinner-wrap"><div className="spinner" /></div>
      </>
    )
  }

  if (data.error) {
    return (
      <>
        <Header />
        <div className="c-content">
          <div className="c-placeholder">
            <div className="icon">⚠️</div>
            <h2>Erro ao carregar dados</h2>
            <p>{data.error}</p>
          </div>
        </div>
      </>
    )
  }

  const f = filtersPerTab[activeTab]

  return (
    <>
      <Header />

      {/* Tab nav */}
      <nav className="c-tabs-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`c-tab-btn${activeTab === t.id ? ' active' : ''}`}
            onClick={() => goToTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Tab panels */}
      {activeTab === 'comecar' && <ParaComecar />}

      {activeTab === 'ae' && (
        <AprendizagemEssencial
          aeAF={data.aeAF}
          aeEM={data.aeEM}
          escopoAF={data.escopoAF}
          escopoEM={data.escopoEM}
          initialSerie={f.serie}
          initialComp={f.comp}
          onGoToHab={goToHab}
          onGoToAula={goToAula}
          onFiltersChange={(s, c) => updateFilters('ae', { serie: s, comp: c })}
        />
      )}

      {activeTab === 'escopo' && (
        <EscopoSequencia
          escopoAF={data.escopoAF}
          escopoEM={data.escopoEM}
          initialSerie={f.serie}
          initialComp={f.comp}
          initialBim={f.bim}
          onGoToHab={goToHab}
          onGoToAE={goToAE}
          onFiltersChange={(s, c, b) => updateFilters('escopo', { serie: s, comp: c, bim: b })}
          scrollToAula={scrollAula}
        />
      )}

      {activeTab === 'habilidades' && (
        <Habilidades
          escopoAF={data.escopoAF}
          escopoEM={data.escopoEM}
          initialSerie={f.serie}
          initialComp={f.comp}
          initialBim={f.bim}
          initialHab={targetHab}
          onGoToAula={goToAula}
          onGoToAE={goToAE}
          onFiltersChange={(s, c, b) => updateFilters('habilidades', { serie: s, comp: c, bim: b })}
        />
      )}

      {activeTab === 'matriz' && (
        <MatrizPP
          aeAF={data.aeAF}
          aeEM={data.aeEM}
          escopoAF={data.escopoAF}
          escopoEM={data.escopoEM}
          matrizAF={data.matrizAF}
          matrizEM={data.matrizEM}
          initialSerie={f.serie}
          initialComp={f.comp}
          onGoToHab={goToHab}
          onGoToAula={goToAula}
          onFiltersChange={(s, c) => updateFilters('matriz', { serie: s, comp: c })}
        />
      )}
    </>
  )
}
