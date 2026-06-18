import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

// Política de contraseña (debe coincidir con el backend, core/security.py).
const RULES: { test: (p: string) => boolean; label: string }[] = [
  { test: p => p.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: p => /[A-Z]/.test(p), label: 'Una mayúscula' },
  { test: p => /[a-z]/.test(p), label: 'Una minúscula' },
  { test: p => /\d/.test(p), label: 'Un número' },
  { test: p => /[^A-Za-z0-9]/.test(p), label: 'Un símbolo' },
]

export function passwordChecks(pw: string) {
  return RULES.map(r => ({ label: r.label, ok: r.test(pw) }))
}

export function isPasswordValid(pw: string): boolean {
  return RULES.every(r => r.test(pw))
}

/** Puntaje 0–6: reglas cumplidas (0–5) + bonus por longitud ≥ 12. */
function strengthScore(pw: string): number {
  if (!pw) return 0
  let s = RULES.filter(r => r.test(pw)).length
  if (pw.length >= 12) s += 1
  return s
}

function strengthLevel(pw: string): { pct: string; label: string; cls: string } {
  const s = strengthScore(pw)
  if (s >= 6) return { pct: '100%', label: 'Fuerte', cls: 'strong' }
  if (s === 5) return { pct: '80%', label: 'Buena', cls: 'good' }
  if (s >= 3) return { pct: '55%', label: 'Media', cls: 'medium' }
  return { pct: '30%', label: 'Débil', cls: 'weak' }
}

interface Props {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  meter?: boolean
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'new-password',
  meter = true,
}: Props) {
  const [show, setShow] = useState(false)
  const level = strengthLevel(value)
  const checks = passwordChecks(value)

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input
          id={id}
          className="form-input pw-input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={show}
        >
          {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>

      {meter && value.length > 0 && (
        <>
          <div className="pw-meter" role="progressbar" aria-label="Seguridad de la contraseña">
            <div className={`pw-meter__fill pw-meter--${level.cls}`} style={{ width: level.pct }} />
          </div>
          <div className={`pw-meter__label pw-meter__label--${level.cls}`}>Seguridad: {level.label}</div>
          <ul className="pw-checks">
            {checks.map(c => (
              <li key={c.label} className={c.ok ? 'ok' : ''}>{c.ok ? '✓' : '○'} {c.label}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
