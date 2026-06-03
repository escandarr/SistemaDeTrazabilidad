import { Header } from '../components/Header'
import type { Page, Producto, Rol, Solicitud, User } from '../types'
import { ESTADO_LABELS } from '../types'

interface Module {
  id: string
  name: string
  desc: string
  roles: Rol[]
  navigable: boolean
}

const MODULES: Module[] = [
  { id: 'nueva-solicitud', name: 'Nueva Solicitud', desc: 'Crear pedido de materiales', roles: ['administrador', 'supervisor'], navigable: true },
  { id: 'solicitudes', name: 'Solicitudes', desc: 'Ver y gestionar pedidos', roles: ['administrador', 'supervisor', 'jefe_bodega'], navigable: true },
  { id: 'picking', name: 'Picking', desc: 'Alistar y pesar materiales', roles: ['administrador', 'jefe_bodega', 'operario_bodega'], navigable: false },
  { id: 'despacho', name: 'Despacho', desc: 'Confirmar envío y generar guía', roles: ['administrador', 'jefe_bodega'], navigable: false },
  { id: 'devoluciones', name: 'Devoluciones', desc: 'Registrar sobrantes con pesaje', roles: ['administrador', 'jefe_bodega', 'operario_bodega'], navigable: false },
  { id: 'stock', name: 'Inventario', desc: 'Stock actual y alertas', roles: ['administrador', 'supervisor', 'jefe_bodega'], navigable: true },
]

const PENDIENTES: Solicitud['estado'][] = ['borrador', 'enviada', 'en_picking']

function getStockAlerts(stock: Producto[]) {
  return stock.filter(s => s.stock_actual < s.stock_minimo)
}

interface Props {
  user: User
  solicitudes: Solicitud[]
  stock: Producto[]
  navigate: (p: Page) => void
  logout: () => void
}

export function DashboardPage({ user, solicitudes, stock, navigate, logout }: Props) {
  const alerts = getStockAlerts(stock)
  const available = MODULES.filter(m => m.roles.includes(user.rol))
  const recent = solicitudes.slice(0, 3)
  const pendientes = solicitudes.filter(s => PENDIENTES.includes(s.estado)).length
  const hoy = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  function handleModule(m: Module) {
    if (!m.navigable) return
    navigate(m.id as Page)
  }

  return (
    <div className="app">
      <Header title="Grupo LC" user={user} onLogout={logout} />

      <div className="page">
        {alerts.length > 0 && (
          <div className="alert alert--warning" style={{ cursor: 'pointer' }} onClick={() => navigate('stock')}>
            {alerts.length} material{alerts.length > 1 ? 'es' : ''} bajo stock mínimo — ver inventario →
          </div>
        )}

        <div className="dashboard__header">
          <div className="dashboard__greeting">Hola, {user.nombre.split(' ')[0]}</div>
          <div className="dashboard__date" style={{ textTransform: 'capitalize' }}>{hoy}</div>
        </div>

        <div className="dashboard__grid">
          {available.map(m => (
            <div
              key={m.id}
              className={`module-card ${!m.navigable ? 'module-card--inactive' : ''}`}
              onClick={() => handleModule(m)}
            >
              <div>
                <div className="module-card__name">{m.name}</div>
                <div className="module-card__desc">{m.desc}</div>
              </div>
              {m.id === 'stock' && alerts.length > 0 && (
                <span className="badge badge--critical">{alerts.length} alertas</span>
              )}
              {m.id === 'solicitudes' && pendientes > 0 && (
                <span className="badge badge--pendiente">{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>
              )}
              {!m.navigable && <span className="badge badge--coming">Próximamente</span>}
            </div>
          ))}
        </div>

        {recent.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', margin: 0 }}>Solicitudes recientes</h3>
              <button
                className="btn btn--secondary"
                style={{ padding: '6px 12px', fontSize: 13 }}
                onClick={() => navigate('solicitudes')}
              >
                Ver todas
              </button>
            </div>
            {recent.map(s => (
              <div key={s.id} className="solicitud-row">
                <div>
                  <div className="solicitud-row__id">SOL-{String(s.id).padStart(3, '0')} · {s.creado_at.split('T')[0]}</div>
                  <div className="solicitud-row__obra">{s.obra}</div>
                  <div className="solicitud-row__meta">{s.sistema} · {s.m2} m²</div>
                </div>
                <span className={`badge badge--${s.estado}`}>{ESTADO_LABELS[s.estado]}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
