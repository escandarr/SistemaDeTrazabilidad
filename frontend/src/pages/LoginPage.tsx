import { User, USERS } from '../mock'

const ROL_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  jefe_bodega: 'Jefe de Bodega',
  operario: 'Operario',
}

interface Props {
  onLogin: (u: User) => void
}

export function LoginPage({ onLogin }: Props) {
  return (
    <div className="login">
      <div className="login__brand">
        <div className="login__logo">🏭</div>
        <h1 className="login__title">Grupo LC</h1>
        <p className="login__sub">Sistema de Trazabilidad — MVP</p>
      </div>

      <div className="login__card">
        <p className="login__label">Selecciona tu usuario</p>
        <div className="login__users">
          {USERS.map(u => (
            <button key={u.id} className="login__user-btn" onClick={() => onLogin(u)}>
              <div>
                <div className="login__user-name">{u.nombre}</div>
                <div className="login__user-role">{ROL_LABELS[u.rol]}</div>
              </div>
              <span className="login__arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
