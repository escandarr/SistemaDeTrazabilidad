import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../services/api'
import type { InvitacionInfo } from '../types'
import { PasswordField, isPasswordValid } from '../components/PasswordField'

interface Props {
  token: string
  onDone: () => void
}

export function AceptarInvitacionPage({ token, onDone }: Props) {
  const [info, setInfo] = useState<InvitacionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    api.getInvitacion(token)
      .then(setInfo)
      .catch(() => setInfo({ valido: false, nombre: null, email: null, motivo: 'No se pudo validar la invitación.' }))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!isPasswordValid(password)) {
      setError('La contraseña no cumple los requisitos de seguridad.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSaving(true)
    try {
      await api.aceptarInvitacion(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="login">
      <div className="login__brand">
        <h1 className="login__title">Grupo LC</h1>
        <p className="login__sub">Activación de cuenta</p>
      </div>

      <div className="login__card">
        {loading ? (
          <p className="login__label">Validando invitación…</p>
        ) : done ? (
          <>
            <p className="login__label">¡Cuenta activada!</p>
            <p style={{ fontSize: 14, color: 'var(--gris-600)', marginBottom: 18 }}>
              Tu contraseña quedó configurada. Ya puedes iniciar sesión.
            </p>
            <button className="btn btn--primary btn--full btn--lg" onClick={onDone}>Ir a iniciar sesión</button>
          </>
        ) : !info?.valido ? (
          <>
            <p className="login__label">Invitación no válida</p>
            <div className="alert alert--warning">{info?.motivo ?? 'La invitación no es válida.'}</div>
            <button className="btn btn--secondary btn--full" onClick={onDone}>Ir al inicio</button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="login__label">Crea tu contraseña</p>
            <p style={{ fontSize: 14, color: 'var(--gris-600)', marginBottom: 18 }}>
              Hola <strong>{info.nombre}</strong>. Define una contraseña para <strong>{info.email}</strong>.
            </p>

            <PasswordField id="inv-pw" label="Nueva contraseña" value={password} onChange={setPassword} />
            <PasswordField id="inv-pw2" label="Repite la contraseña" value={confirm} onChange={setConfirm} meter={false} />

            {error && <div className="alert alert--warning" style={{ marginBottom: 12 }}>{error}</div>}

            <button
              className="btn btn--primary btn--full btn--lg"
              type="submit"
              disabled={saving || !isPasswordValid(password) || password !== confirm}
            >
              {saving ? 'Guardando…' : 'Crear contraseña y activar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
