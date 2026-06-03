import type { User } from '../types'
import { ROL_LABELS } from '../types'

interface Props {
  title: string
  user: User
  onBack?: () => void
  onLogout: () => void
}

export function Header({ title, user, onBack, onLogout }: Props) {
  return (
    <header className="header">
      <div className="header__left">
        {onBack && (
          <button className="header__back" onClick={onBack}>←</button>
        )}
        <span className="header__title">{title}</span>
      </div>
      <div className="header__right">
        <div className="header__user">
          <strong>{user.nombre}</strong>
          <span>{ROL_LABELS[user.rol]}</span>
        </div>
        <button className="header__logout" onClick={onLogout}>Salir</button>
      </div>
    </header>
  )
}
