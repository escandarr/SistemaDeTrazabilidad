import { useEffect, useState } from 'react'
import './App.css'
import type { Page, Producto, Receta, Solicitud, User } from './types'
import { api, getToken } from './services/api'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { NuevaSolicitudPage } from './pages/NuevaSolicitudPage'
import { SolicitudesPage } from './pages/SolicitudesPage'
import { StockPage } from './pages/StockPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { PickingPage } from './pages/PickingPage'
import { DespachoPage } from './pages/DespachoPage'
import { DevolucionesPage } from './pages/DevolucionesPage'

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
      /* el error ya se mostró en la acción que lo originó */
    }
  }

  if (booting) {
    return (
      <div className="login">
        <div className="login__brand">
          <p className="login__sub">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage onLoggedIn={handleLoggedIn} />

  const navigate = (p: Page) => setPage(p)

  let content
  switch (page) {
    case 'dashboard':
      content = <DashboardPage user={user} solicitudes={solicitudes} stock={stock} navigate={navigate} />
      break
    case 'solicitudes':
      content = <SolicitudesPage user={user} solicitudes={solicitudes} navigate={navigate} />
      break
    case 'nueva-solicitud':
      content = <NuevaSolicitudPage recetas={recetas} stock={stock} onCreated={refresh} navigate={navigate} />
      break
    case 'stock':
      content = <StockPage stock={stock} />
      break
    case 'usuarios':
      content = <UsuariosPage currentUserId={user.id} />
      break
    case 'picking':
      content = <PickingPage user={user} onChanged={refresh} />
      break
    case 'despacho':
      content = <DespachoPage onChanged={refresh} />
      break
    case 'devoluciones':
      content = <DevolucionesPage onChanged={refresh} />
      break
  }

  return (
    <Layout user={user} page={page} navigate={navigate} logout={logout}>
      {content}
    </Layout>
  )
}

export default App
