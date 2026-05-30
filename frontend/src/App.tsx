import { useState } from 'react'
import './App.css'
import { User, Solicitud, StockItem, Page, SOLICITUDES_INICIAL, STOCK_INICIAL } from './mock'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { NuevaSolicitudPage } from './pages/NuevaSolicitudPage'
import { SolicitudesPage } from './pages/SolicitudesPage'
import { StockPage } from './pages/StockPage'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('dashboard')
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(SOLICITUDES_INICIAL)
  const [stock, setStock] = useState<StockItem[]>(STOCK_INICIAL)

  if (!user) return <LoginPage onLogin={setUser} />

  const navigate = (p: Page) => setPage(p)
  const logout = () => { setUser(null); setPage('dashboard') }
  const addSolicitud = (s: Solicitud) => setSolicitudes(prev => [s, ...prev])

  switch (page) {
    case 'dashboard':
      return <DashboardPage user={user} solicitudes={solicitudes} stock={stock} navigate={navigate} logout={logout} />
    case 'solicitudes':
      return <SolicitudesPage user={user} solicitudes={solicitudes} navigate={navigate} logout={logout} />
    case 'nueva-solicitud':
      return <NuevaSolicitudPage user={user} stock={stock} setStock={setStock} onConfirm={addSolicitud} navigate={navigate} logout={logout} />
    case 'stock':
      return <StockPage user={user} stock={stock} navigate={navigate} logout={logout} />
  }
}

export default App
