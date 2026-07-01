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
import { MaterialesPage } from './pages/MaterialesPage'
import { PickingPage } from './pages/PickingPage'
import { DespachoPage } from './pages/DespachoPage'
import { DevolucionesPage } from './pages/DevolucionesPage'
import { AceptarInvitacionPage } from './pages/AceptarInvitacionPage'
import { TutorialesPage } from './pages/TutorialesPage'
import { Tour } from './components/Tour'
import type { TourStep } from './tours'
import { BIENVENIDA, TODOS } from './tours'

// Tutorial más relevante para el botón "Ver tutorial" de cada página.
const PAGE_TUTORIAL: Partial<Record<Page, string>> = {
  dashboard: 'bienvenida',
  solicitudes: 'caso1',
  'nueva-solicitud': 'caso1',
  stock: 'caso2',
  picking: 'caso1',
  despacho: 'caso1',
  devoluciones: 'caso1',
  materiales: 'caso4',
  usuarios: 'caso3',
}

const WELCOME_KEY = 'grupolc_welcome_seen'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('dashboard')
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [stock, setStock] = useState<Producto[]>([])
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [booting, setBooting] = useState(true)
  const [tourSteps, setTourSteps] = useState<TourStep[] | null>(null)
  // Enlace público de invitación: /aceptar-invitacion?token=…
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    if (!window.location.pathname.includes('aceptar-invitacion')) return null
    return new URLSearchParams(window.location.search).get('token')
  })

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

  // Tour de bienvenida automático la primera vez (por navegador).
  useEffect(() => {
    if (user && !localStorage.getItem(WELCOME_KEY)) {
      localStorage.setItem(WELCOME_KEY, '1')
      setTourSteps(BIENVENIDA.steps)
    }
  }, [user])

  function startTutorial(id: string) {
    const t = TODOS.find(x => x.id === id)
    if (t) setTourSteps(t.steps)
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

  if (inviteToken) {
    return (
      <AceptarInvitacionPage
        token={inviteToken}
        onDone={() => {
          window.history.replaceState({}, '', '/')
          setInviteToken(null)
        }}
      />
    )
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
    case 'materiales':
      content = <MaterialesPage />
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
    case 'tutoriales':
      content = <TutorialesPage onStart={t => setTourSteps(t.steps)} />
      break
  }

  const tutorialId = PAGE_TUTORIAL[page]

  return (
    <>
      <Layout
        user={user}
        page={page}
        navigate={navigate}
        logout={logout}
        onTutorial={tutorialId ? () => startTutorial(tutorialId) : undefined}
      >
        {content}
      </Layout>
      {tourSteps && (
        <Tour steps={tourSteps} navigate={navigate} onClose={() => setTourSteps(null)} />
      )}
    </>
  )
}

export default App
