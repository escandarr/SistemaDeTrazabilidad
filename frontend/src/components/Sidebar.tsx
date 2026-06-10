import type { ComponentType, SVGProps } from 'react'
import type { Page, Rol, User } from '../types'
import { ROL_LABELS } from '../types'
import {
  ClipboardIcon,
  FilePlusIcon,
  HomeIcon,
  PackageIcon,
  ReturnIcon,
  ScaleIcon,
  TruckIcon,
  UsersIcon,
} from './icons'

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

interface NavItem {
  id: Page
  label: string
  roles: Rol[]
  Icon: IconType
}

interface NavGroup {
  label: string | null
  items: NavItem[]
}

// El orden de los grupos refleja el flujo real del material:
// obra solicita → bodega prepara, despacha y recibe de vuelta.
const GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { id: 'dashboard', label: 'Inicio', roles: ['administrador', 'supervisor', 'operario_bodega', 'jefe_bodega'], Icon: HomeIcon },
      { id: 'solicitudes', label: 'Solicitudes', roles: ['administrador', 'supervisor', 'jefe_bodega'], Icon: ClipboardIcon },
      { id: 'nueva-solicitud', label: 'Nueva solicitud', roles: ['administrador', 'supervisor'], Icon: FilePlusIcon },
      { id: 'stock', label: 'Inventario', roles: ['administrador', 'supervisor', 'jefe_bodega'], Icon: PackageIcon },
    ],
  },
  {
    label: 'Bodega',
    items: [
      { id: 'picking', label: 'Picking', roles: ['administrador', 'jefe_bodega', 'operario_bodega'], Icon: ScaleIcon },
      { id: 'despacho', label: 'Despacho', roles: ['administrador', 'jefe_bodega'], Icon: TruckIcon },
      { id: 'devoluciones', label: 'Devoluciones', roles: ['administrador', 'jefe_bodega', 'operario_bodega'], Icon: ReturnIcon },
    ],
  },
  {
    label: 'Administración',
    items: [
      { id: 'usuarios', label: 'Usuarios', roles: ['administrador'], Icon: UsersIcon },
    ],
  },
]

interface Props {
  user: User
  page: Page
  navigate: (p: Page) => void
  logout: () => void
}

export function Sidebar({ user, page, navigate, logout }: Props) {
  const iniciales = user.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const grupos = GROUPS.map(g => ({ ...g, items: g.items.filter(i => i.roles.includes(user.rol)) }))
    .filter(g => g.items.length > 0)

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">LC</div>
        <div>
          <div className="sidebar__brand-name">Grupo LC</div>
          <div className="sidebar__brand-sub">Trazabilidad</div>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Navegación principal">
        {grupos.map(g => (
          <div key={g.label ?? 'principal'} className="sidebar__group">
            {g.label && <div className="sidebar__section">{g.label}</div>}
            {g.items.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`nav-item ${page === id ? 'nav-item--active' : ''}`}
                onClick={() => navigate(id)}
                aria-current={page === id ? 'page' : undefined}
              >
                <span className="nav-item__left"><Icon size={18} /> {label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__user">
        <div className="sidebar__avatar">{iniciales}</div>
        <div className="sidebar__user-info">
          <div className="sidebar__user-name">{user.nombre}</div>
          <div className="sidebar__user-rol">{ROL_LABELS[user.rol]}</div>
        </div>
        <button className="sidebar__logout" onClick={logout}>Salir</button>
      </div>
    </aside>
  )
}
