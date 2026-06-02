import { useEffect, useState } from 'react'
import './App.css'
import type { Page, Producto, Receta, Solicitud, User } from './types'
import { api, getToken } from './services/api'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { NuevaSolicitudPage } from './pages/NuevaSolicitudPage'
import { SolicitudesPage } from './pages/SolicitudesPage'
import { StockPage } from './pages/StockPage'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('dashboard')
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [stock, setStock] = useState<Producto[]>([])
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [booting, setBooting] = useState(true)

  async function loadData() {
    const [sols, stk, recs] = await Promise.all([
      api.listSolicitudes(),
      api.listStock(),
      api.listRecetas(),
    ])
    setSolicitudes(sols)
    setStock(stk)
    setRecetas(recs)
  }

  // Restaurar sesión si hay token guardado
  useEffect(() => {
    async function restore() {
      if (!getToken()) {
        setBooting(false)
        return
      }
      try {
        const me = await api.me()
        setUser(me)
        await loadData()
      } catch {
        api.logout()
      } finally {
        setBooting(false)
      }
    }
    restore()
  }, [])

  async function handleLoggedIn() {
    const me = await api.me()
    setUser(me)
    await loadData()
  }

  function logout() {
    api.logout()
    setUser(null)
    setPage('dashboard')
    setSolicitudes([])
    setStock([])
    setRecetas([])
  }

  async function refresh() {
    try {
      await loadData()
    } catch {
      /* se ignora: el error ya se mostró en la acción que lo originó */
    }
  }

  if (booting) {
    return (
      <div className="login">
        <div className="login__brand">
          <div className="login__logo">🏭</div>
          <p className="login__sub">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage onLoggedIn={handleLoggedIn} />

  const navigate = (p: Page) => setPage(p)

  switch (page) {
    case 'dashboard':
      return <DashboardPage user={user} solicitudes={solicitudes} stock={stock} navigate={navigate} logout={logout} />
    case 'solicitudes':
      return <SolicitudesPage user={user} solicitudes={solicitudes} navigate={navigate} logout={logout} />
    case 'nueva-solicitud':
      return <NuevaSolicitudPage user={user} recetas={recetas} stock={stock} onCreated={refresh} navigate={navigate} logout={logout} />
    case 'stock':
      return <StockPage user={user} stock={stock} navigate={navigate} logout={logout} />
  }
}

export default App
