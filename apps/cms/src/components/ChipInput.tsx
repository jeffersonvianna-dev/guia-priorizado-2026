import { useState, useRef } from 'react'

interface ChipInputProps {
  value: string[]           // chips atuais
  onChange: (v: string[]) => void
  max?: number              // máximo de chips
  validate?: (chip: string) => Promise<boolean> | boolean
  placeholder?: string
  disabled?: boolean
}

export function ChipInput({ value, onChange, max, validate, placeholder = 'Código + Enter', disabled = false }: ChipInputProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function addChip(raw: string) {
    const chip = raw.trim().toUpperCase()
    if (!chip) return
    if (value.includes(chip)) { setInput(''); return }
    if (max !== undefined && value.length >= max) {
      import('../utils/toast').then(m => m.toast(`Máximo de ${max} item${max !== 1 ? 's' : ''} permitido.`, 'err'))
      return
    }
    if (validate) {
      setLoading(true)
      try {
        const ok = await validate(chip)
        if (!ok) {
          import('../utils/toast').then(m => m.toast(`"${chip}" não encontrado.`, 'err'))
          return
        }
      } finally { setLoading(false) }
    }
    onChange([...value, chip])
    setInput('')
  }

  function removeChip(chip: string) {
    if (!disabled) onChange(value.filter(c => c !== chip))
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChip(input) }
    if (e.key === 'Backspace' && !input && value.length) removeChip(value[value.length - 1])
  }

  return (
    <div
      className={`chip-wrap${disabled ? ' disabled' : ''}`}
      onClick={() => !disabled && ref.current?.focus()}
    >
      {value.map(c => (
        <span key={c} className="chip">
          {c}
          {!disabled && <button type="button" className="chip-rm" onClick={e => { e.stopPropagation(); removeChip(c) }}>×</button>}
        </span>
      ))}
      {!disabled && (
        <input
          ref={ref}
          className="chip-field"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input.trim()) addChip(input) }}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      )}
      {loading && <span style={{ fontSize: '.74rem', color: 'var(--text-muted)' }}>...</span>}
    </div>
  )
}
