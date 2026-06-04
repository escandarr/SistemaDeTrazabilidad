import type { ReactNode } from 'react'
import type { Page, User } from '../types'
import { Sidebar } from './Sidebar'

const TITLES: Record<Page, string> = {
  dashboard: 'Inicio',
  solicitudes: 'Solicitudes',
  'nueva-solicitud': 'Nueva solicitud',
  stock: 'Inventario',
  usuarios: 'Usuarios',
}

interface Props {
  user: User
  page: Page
  navigate: (p: Page) => void
  logout: () => void
  children: ReactNode
}

export function Layout({ user, page, navigate, logout, children }: Props) {
  return (
    <div className="shell">
      <Sidebar user={user} page={page} navigate={navigate} logout={logout} />
      <div className="shell__main">
        <header className="topbar">
          <h1 className="topbar__title">{TITLES[page]}</h1>
          <div className="topbar__user">
            <span className="topbar__user-name">{user.nombre}</span>
            <span className="topbar__user-email">{user.email}</span>
          </div>
        </header>
        <main className="shell__content">{children}</main>
      </div>
    </div>
  )
}
