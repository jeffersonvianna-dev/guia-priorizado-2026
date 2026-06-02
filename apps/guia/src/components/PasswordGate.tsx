import { useState, type FormEvent, type ReactNode } from 'react'

const SENHA = 'guia2026'

export function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const [value, setValue] = useState('')
  const [erro, setErro] = useState(false)

  if (unlocked) return <>{children}</>

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (value === SENHA) {
      setUnlocked(true)
    } else {
      setErro(true)
      setValue('')
    }
  }

  return (
    <div className="c-gate">
      <form className="c-gate-card" onSubmit={onSubmit}>
        <div className="c-gate-logo">GP</div>
        <h1>Guia do Currículo Priorizado 2026</h1>
        <p className="c-gate-sub">Acesso restrito · digite a senha para continuar</p>

        <input
          type="password"
          className="c-gate-input"
          placeholder="Senha"
          value={value}
          autoFocus
          onChange={e => { setValue(e.target.value); setErro(false) }}
        />

        {erro && <p className="c-gate-erro">Senha incorreta. Tente novamente.</p>}

        <button type="submit" className="c-gate-btn">Entrar</button>
      </form>
    </div>
  )
}
