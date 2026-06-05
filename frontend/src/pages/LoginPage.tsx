import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../services/api'

interface Props {
  onLoggedIn: () => void | Promise<void>
}

export function LoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('admin@grupolc.cl')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.login(email, password)
      await onLoggedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <div className="login__brand">
        <h1 className="login__title">Grupo LC</h1>
        <p className="login__sub">Sistema de Trazabilidad — MVP</p>
      </div>

      <form className="login__card" onSubmit={handleSubmit}>
        <p className="login__label">Iniciar sesión</p>

        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@grupolc.cl"
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            className="form-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <div className="alert alert--warning" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button className="btn btn--primary btn--full btn--lg" type="submit" disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar →'}
        </button>

        <p style={{ marginTop: 14, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Demo: admin@grupolc.cl / admin1234
        </p>
      </form>
    </div>
  )
}
