import type { Page, Rol, User } from '../types'
import { ROL_LABELS } from '../types'

interface NavItem {
  id: Page
  label: string
  roles: Rol[]
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Inicio', roles: ['administrador', 'supervisor', 'operario_bodega', 'jefe_bodega'] },
  { id: 'solicitudes', label: 'Solicitudes', roles: ['administrador', 'supervisor', 'jefe_bodega'] },
  { id: 'nueva-solicitud', label: 'Nueva solicitud', roles: ['administrador', 'supervisor'] },
  { id: 'stock', label: 'Inventario', roles: ['administrador', 'supervisor', 'jefe_bodega'] },
  { id: 'usuarios', label: 'Usuarios', roles: ['administrador'] },
]

interface SoonItem {
  label: string
  roles: Rol[]
}

const SOON: SoonItem[] = [
  { label: 'Picking', roles: ['administrador', 'jefe_bodega', 'operario_bodega'] },
  { label: 'Despacho', roles: ['administrador', 'jefe_bodega'] },
  { label: 'Devoluciones', roles: ['administrador', 'jefe_bodega', 'operario_bodega'] },
]

interface Props {
  user: User
  page: Page
  navigate: (p: Page) => void
  logout: () => void
}

export function Sidebar({ user, page, navigate, logout }: Props) {
  const items = NAV.filter(i => i.roles.includes(user.rol))
  const soon = SOON.filter(i => i.roles.includes(user.rol))
  const iniciales = user.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">LC</div>
        <div>
          <div className="sidebar__brand-name">Grupo LC</div>
          <div className="sidebar__brand-sub">Trazabilidad</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map(i => (
          <button
            key={i.id}
            className={`nav-item ${page === i.id ? 'nav-item--active' : ''}`}
            onClick={() => navigate(i.id)}
          >
            {i.label}
          </button>
        ))}

        {soon.length > 0 && <div className="sidebar__section">Próximamente</div>}
        {soon.map(i => (
          <div key={i.label} className="nav-item nav-item--soon">
            {i.label}
            <span className="nav-pill">Pronto</span>
          </div>
        ))}
      </nav>

      <div className="sidebar__user">
        <div className="sidebar__avatar">{iniciales}</div>
        <div className="sidebar__user-info">
          <div className="sidebar__user-name">{user.nombre}</div>
          <div className="sidebar__user-rol">{ROL_LABELS[user.rol]}</div>
        </div>
        <button className="sidebar__logout" onClick={logout} title="Cerrar sesión">Salir</button>
      </div>
    </aside>
  )
}
